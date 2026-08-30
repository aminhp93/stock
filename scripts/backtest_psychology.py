"""Lead/lag: các tín hiệu tâm lý/nội tại có dự báo được return VN-Index không?

Với mỗi tín hiệu: đếm số phiên khớp, return trung bình VN-Index 1/3/5/10 phiên
sau đó, win-rate, so với baseline (toàn bộ phiên). Đọc từ market_psychology_daily.

LƯU Ý: cửa sổ dữ liệu ngắn (internals ~162 phiên, retail CFA99 ~42 phiên) nên kết
quả chỉ mang tính THAM KHẢO/gợi ý giả thuyết, chưa đủ mẫu để kết luận thống kê.

    python3 scripts/backtest_psychology.py
"""

from __future__ import annotations

import statistics

import psycopg2

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

# (tên, mô tả, hàm điều kiện trên dict 1 phiên)
SIGNALS = [
    ("Attention+FOMO cao (retail hưng phấn)",
     "idx_retail_attention > 0.8 hoặc idx_fomo > 1",
     lambda r: r["has_retail"] and ((r["idx_retail_attention"] or 0) > 0.8 or (r["idx_fomo"] or 0) > 1)),

    ("Fear + phiên giảm mạnh (khả năng capitulation)",
     "idx_fear_capitulation > 0.5 và vnindex_ret_1d < -1%",
     lambda r: r["has_retail"] and (r["idx_fear_capitulation"] or 0) > 0.5 and (r["vnindex_ret_1d"] or 0) < -1),

    ("Phân kỳ nội tại: chỉ số xanh nhưng breadth âm",
     "vnindex_ret_1d > 0 và adv_dec_ratio < 0.9",
     lambda r: (r["vnindex_ret_1d"] or 0) > 0 and (r["adv_dec_ratio"] or 99) < 0.9),

    ("Nhịp tăng hẹp: gauge Greed + ít mã trên MA200",
     "psychology_gauge >= 60 và pct_above_ma200 < 35",
     lambda r: (r["psychology_gauge"] or 0) >= 60 and (r["pct_above_ma200"] or 99) < 35),

    ("Khối ngoại bán ròng mạnh (5 phiên)",
     "foreign_net_5d_bn < -1500 tỷ",
     lambda r: (r["foreign_net_5d_bn"] or 0) < -1500),

    ("Khối ngoại mua ròng mạnh (5 phiên)",
     "foreign_net_5d_bn > 800 tỷ",
     lambda r: (r["foreign_net_5d_bn"] or 0) > 800),

    ("Biến động thực cao (hoảng loạn)",
     "realized_vol_20d > 22",
     lambda r: (r["realized_vol_20d"] or 0) > 22),

    ("Biến động thực thấp (complacency)",
     "realized_vol_20d < 16",
     lambda r: (r["realized_vol_20d"] or 99) < 16 and r["realized_vol_20d"] is not None),

    ("Gauge Extreme Fear",
     "psychology_gauge < 40",
     lambda r: (r["psychology_gauge"] or 50) < 40),

    ("Gauge Greed/Extreme Greed",
     "psychology_gauge >= 60",
     lambda r: (r["psychology_gauge"] or 50) >= 60),
]

COLS = ["trading_date", "has_retail", "vnindex_ret_1d", "fwd_ret_1d", "fwd_ret_3d",
        "fwd_ret_5d", "fwd_ret_10d", "realized_vol_20d", "adv_dec_ratio",
        "pct_above_ma200", "foreign_net_5d_bn", "psychology_gauge",
        "idx_retail_attention", "idx_fomo", "idx_fear_capitulation"]


def _stats(rows, key):
    vals = [r[key] for r in rows if r.get(key) is not None]
    if not vals:
        return None, None
    return round(statistics.fmean(vals), 2), round(100 * sum(1 for v in vals if v > 0) / len(vals))


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute(f"SELECT {', '.join(COLS)} FROM market_psychology_daily ORDER BY trading_date")
        recs = [dict(zip(COLS, row)) for row in cur.fetchall()]
    conn.close()

    base = {n: _stats(recs, n) for n in ("fwd_ret_1d", "fwd_ret_3d", "fwd_ret_5d", "fwd_ret_10d")}
    print(f"\nBASELINE (n={len(recs)} phiên)")
    print(f"  fwd 1d {base['fwd_ret_1d'][0]:+}%  3d {base['fwd_ret_3d'][0]:+}%  "
          f"5d {base['fwd_ret_5d'][0]:+}%  10d {base['fwd_ret_10d'][0]:+}%   "
          f"(win5d {base['fwd_ret_5d'][1]}%)")
    print("=" * 88)

    for name, desc, cond in SIGNALS:
        hits = [r for r in recs if cond(r)]
        if not hits:
            print(f"\n▸ {name}\n  {desc}\n  → 0 phiên khớp")
            continue
        m1, _ = _stats(hits, "fwd_ret_1d")
        m3, _ = _stats(hits, "fwd_ret_3d")
        m5, w5 = _stats(hits, "fwd_ret_5d")
        m10, w10 = _stats(hits, "fwd_ret_10d")
        edge5 = round(m5 - base["fwd_ret_5d"][0], 2) if m5 is not None else None
        print(f"\n▸ {name}")
        print(f"  {desc}")
        print(f"  n={len(hits)}  fwd: 1d {m1:+}%  3d {m3:+}%  5d {m5:+}%  10d {m10:+}%"
              f"   win5d {w5}%   edge5d vs baseline {edge5:+}%")

    print("\n" + "=" * 88)
    print("Cửa sổ ngắn — coi là gợi ý giả thuyết, chưa phải bằng chứng thống kê.")


if __name__ == "__main__":
    main()
