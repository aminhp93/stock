"""Xếp hạng CƠ HỌC "xác suất tăng" ngắn hạn (5–10 phiên) cho toàn bộ cổ phiếu.

KHÔNG phải khuyến nghị. Điểm 0–100 tổng hợp từ: xu hướng (giá vs MA20/50/200),
động lượng 20/60 phiên, sức mạnh tương đối so VN-Index, vùng RSI lành mạnh,
khối lượng xác nhận, và khoảng cách tới đỉnh 60 phiên (sắp breakout).

    python3 scripts/rank_momentum.py                       # top cho ngày mới nhất
    python3 scripts/rank_momentum.py 2026-08-28 5          # top 5 tính đến ngày đó
    python3 scripts/rank_momentum.py --backtest            # kiểm định lịch sử
"""

from __future__ import annotations

import datetime as dt
import statistics
import sys

import psycopg2

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
MIN_TURNOVER_BN = 10.0

# Lấy mọi biến point-in-time tại 1 ngày; window bám theo trading_date <= :asof
SNAPSHOT_SQL = """
WITH px AS (
    SELECT symbol, trading_date, close_price, high_price, volume, ma20, ma50, rsi_14,
           AVG(close_price) OVER w200 AS ma200,
           MAX(high_price)  OVER w60  AS hi60,
           close_price / NULLIF(LAG(close_price, 20) OVER wsym, 0) - 1 AS ret20,
           close_price / NULLIF(LAG(close_price, 60) OVER wsym, 0) - 1 AS ret60,
           AVG(close_price*volume) OVER w20 AS turn20,
           AVG(volume) OVER w20 AS vol20,
           AVG(volume) OVER w5  AS vol5,
           COUNT(*) OVER wsym AS n,
           ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trading_date DESC) AS rn
    FROM stock_prices
    WHERE symbol <> 'VNINDEX'
      AND trading_date <= %(asof)s
      AND trading_date >= (%(asof)s::date - 400)
    WINDOW
        wsym AS (PARTITION BY symbol ORDER BY trading_date),
        w200 AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW),
        w60  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 59  PRECEDING AND CURRENT ROW),
        w20  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 19  PRECEDING AND CURRENT ROW),
        w5   AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 4   PRECEDING AND CURRENT ROW)
),
vni AS (
    SELECT close_price / NULLIF(LAG(close_price,20) OVER (ORDER BY trading_date),0) - 1 AS vni_ret20,
           ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
    FROM stock_prices WHERE symbol='VNINDEX'
      AND trading_date <= %(asof)s AND trading_date >= (%(asof)s::date - 120)
)
SELECT p.symbol, p.close_price, p.ma20, p.ma50, p.ma200, p.hi60, p.ret20, p.ret60,
       p.turn20, p.vol5, p.vol20, p.n, p.rsi_14,
       (SELECT vni_ret20 FROM vni WHERE rn=1) AS vni_ret20
FROM px p WHERE p.rn = 1 AND p.n >= 120
"""


def score_contra(cur, asof: str):
    """Xếp hạng NGƯỢC CHIỀU (mean-reversion): quá bán trong xu hướng còn nguyên,
    gần đáy ngắn hạn, có dấu hiệu bán tháo kiệt sức. Phù hợp thị trường lình xình."""
    cur.execute(SNAPSHOT_SQL, {"asof": asof})
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    recs = [dict(zip(cols, r)) for r in rows]
    recs = [r for r in recs if r["turn20"] and float(r["turn20"]) / 1e9 >= MIN_TURNOVER_BN
            and r["ma20"] and r["ma50"] and r["ret20"] is not None and r["ret60"] is not None]
    out = []
    # cần đáy 20 phiên -> lấy từ SNAPSHOT? SNAPSHOT có hi60, chưa có lo20. Tính nhanh:
    cur.execute("""
        SELECT symbol, MIN(low_price) FROM stock_prices
        WHERE symbol<>'VNINDEX' AND trading_date <= %(asof)s AND trading_date >= (%(asof)s::date - 40)
        GROUP BY symbol
    """, {"asof": asof})
    lo20 = {s: float(v) for s, v in cur.fetchall()}
    for r in recs:
        close = float(r["close_price"]); ma200 = float(r["ma200"]) if (r["ma200"] and r["n"] >= 200) else None
        rsi = float(r["rsi_14"]) if r["rsi_14"] is not None else 50.0
        ret20 = float(r["ret20"]); ret60 = float(r["ret60"])
        vol_climax = (float(r["vol5"]) / float(r["vol20"])) if r["vol20"] else 1.0
        lo = lo20.get(r["symbol"])
        s = 0.0
        if 25 <= rsi <= 42: s += 18
        elif 42 < rsi <= 50: s += 8
        elif rsi > 58: s -= 12
        if ma200 and close > ma200: s += 15
        if ma200 and close < ma200 * 0.90: s -= 20        # tránh dao rơi
        if lo and close <= lo * 1.05: s += 14              # sát đáy 20 phiên
        if ret20 < -0.03 and ret60 > 0: s += 12            # chỉnh trong xu hướng tăng
        if ret20 < -0.10: s -= 6                            # giảm quá sâu -> có vấn đề
        if vol_climax >= 1.6: s += 10
        elif vol_climax >= 1.2: s += 5
        out.append(dict(symbol=r["symbol"], score=round(50 + s, 1), close=close, rsi=round(rsi, 1),
                        ret20=round(ret20 * 100, 1), ret60=round(ret60 * 100, 1),
                        rs20=0.0, vol_surge=round(vol_climax, 2),
                        gap_to_hi60=round((close / lo - 1) * 100, 1) if lo else 0.0,
                        turn_bn=round(float(r["turn20"]) / 1e9, 1),
                        above_ma200=(ma200 is not None and close > ma200)))
    out.sort(key=lambda x: -x["score"])
    return out


def score_universe(cur, asof: str):
    cur.execute(SNAPSHOT_SQL, {"asof": asof})
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    recs = [dict(zip(cols, r)) for r in rows]

    # lọc thanh khoản + đủ dữ liệu
    recs = [r for r in recs if r["turn20"] and float(r["turn20"])/1e9 >= MIN_TURNOVER_BN
            and r["ma20"] and r["ma50"] and r["ret20"] is not None and r["ret60"] is not None]
    if not recs:
        return []

    def z(vals):
        v = [x for x in vals if x is not None]
        if len(v) < 5:
            return {i: 0.0 for i in range(len(vals))}
        m, s = statistics.fmean(v), (statistics.pstdev(v) or 1.0)
        return [(x - m)/s if x is not None else 0.0 for x in vals]

    vni20 = float(recs[0]["vni_ret20"] or 0)
    zr20 = z([float(r["ret20"]) for r in recs])
    zr60 = z([float(r["ret60"]) for r in recs])
    zrs = z([float(r["ret20"]) - vni20 for r in recs])

    out = []
    for i, r in enumerate(recs):
        close = float(r["close_price"]); ma20 = float(r["ma20"]); ma50 = float(r["ma50"])
        ma200 = float(r["ma200"]) if (r["ma200"] and r["n"] >= 200) else None
        hi60 = float(r["hi60"])
        rsi = float(r["rsi_14"]) if r["rsi_14"] is not None else 50.0
        vol_surge = (float(r["vol5"]) / float(r["vol20"])) if r["vol20"] else 1.0

        s = 0.0
        # xu hướng (max 30)
        if close > ma20: s += 10
        if ma20 > ma50: s += 8
        if ma200 and close > ma200: s += 12
        # động lượng + sức mạnh tương đối (max ~28)
        s += max(-6, min(10, zr20[i] * 6))
        s += max(-4, min(8, zr60[i] * 5))
        s += max(-5, min(10, zrs[i] * 6))
        # RSI zone (max 12) — phạt nặng quá mua
        if 45 <= rsi <= 65: s += 12
        elif 35 <= rsi < 45 or 65 < rsi <= 70: s += 6
        elif rsi > 80: s -= 20
        elif rsi > 75: s -= 12
        elif rsi > 70: s -= 5
        # parabolic 20 phiên -> rủi ro đảo chiều
        if float(r["ret20"]) > 0.30: s -= 12
        elif float(r["ret20"]) > 0.22: s -= 6
        # khối lượng xác nhận (max 10)
        if vol_surge >= 1.5: s += 10
        elif vol_surge >= 1.15: s += 6
        elif vol_surge < 0.7: s -= 3
        # sắp breakout (max 10)
        gap_hi = (hi60 - close) / close if close else 1
        if 0 <= gap_hi <= 0.03: s += 10
        elif gap_hi <= 0.07: s += 5

        score = round(50 + s, 1)  # thô, không chặn trần — để xếp hạng phân biệt được
        out.append(dict(symbol=r["symbol"], score=score, close=close, rsi=round(rsi, 1),
                        ret20=round(float(r["ret20"])*100, 1), ret60=round(float(r["ret60"])*100, 1),
                        rs20=round((float(r["ret20"]) - vni20)*100, 1),
                        vol_surge=round(vol_surge, 2), gap_to_hi60=round(gap_hi*100, 1),
                        turn_bn=round(float(r["turn20"])/1e9, 1),
                        above_ma200=(ma200 is not None and close > ma200)))
    out.sort(key=lambda x: -x["score"])
    return out


def backtest(cur, scorer=None, label="momentum"):
    scorer = scorer or score_universe
    # cache toàn bộ close vào RAM để tính forward return nhanh
    cur.execute("SELECT symbol, trading_date, close_price FROM stock_prices WHERE symbol<>'VNINDEX' ORDER BY symbol, trading_date")
    cache: dict[str, list] = {}
    for sym, d, c in cur.fetchall():
        cache.setdefault(sym, []).append((d, float(c)))

    def fwd(sym, asof, nd):
        arr = cache.get(sym)
        if not arr:
            return None
        i = next((k for k, (dd, _) in enumerate(arr) if dd >= asof), None)
        if i is None or i + nd >= len(arr):
            return None
        return (arr[i + nd][1] / arr[i][1] - 1) * 100

    cur.execute("SELECT DISTINCT trading_date FROM stock_prices WHERE symbol<>'VNINDEX' ORDER BY trading_date")
    dates = [r[0] for r in cur.fetchall()]
    sample = dates[-400:-12:8]   # mỗi 8 phiên, chừa 12 phiên cuối
    print(f"Backtest [{label}]: {len(sample)} ngày mẫu ({sample[0]} → {sample[-1]})")

    agg = {"t5": [], "t10": [], "u5": [], "hit5": 0, "tot": 0}
    for d in sample:
        ranked = scorer(cur, d.isoformat())
        if len(ranked) < 40:
            continue
        top = ranked[:20]
        t5 = [x for x in (fwd(r["symbol"], d, 5) for r in top) if x is not None]
        t10 = [x for x in (fwd(r["symbol"], d, 10) for r in top) if x is not None]
        u5 = [x for x in (fwd(r["symbol"], d, 5) for r in ranked) if x is not None]
        if not t5 or not u5:
            continue
        mt5, mu5 = statistics.fmean(t5), statistics.fmean(u5)
        agg["t5"].append(mt5); agg["u5"].append(mu5)
        agg["t10"].append(statistics.fmean(t10) if t10 else 0.0)
        agg["tot"] += 1
        agg["hit5"] += mt5 > mu5

    n = agg["tot"]
    print(f"\n{'':22}{'top-20 mô hình':>16}{'toàn universe':>16}{'chênh':>10}")
    print("-" * 64)
    print(f"{'Return 5 phiên sau':22}{statistics.fmean(agg['t5']):>15.2f}%{statistics.fmean(agg['u5']):>15.2f}%"
          f"{statistics.fmean(agg['t5'])-statistics.fmean(agg['u5']):>+9.2f}%")
    print(f"{'Return 10 phiên sau':22}{statistics.fmean(agg['t10']):>15.2f}%")
    print(f"\nTop-20 thắng universe (5 phiên): {agg['hit5']}/{n} lần ({100*agg['hit5']/n:.0f}%)")
    print("Cửa sổ ngắn — kiểm định sơ bộ, không phải bằng chứng chắc chắn.")


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            contra = "--contra" in sys.argv
            scorer = score_contra if contra else score_universe
            mode = "NGƯỢC CHIỀU (mean-reversion)" if contra else "ĐỘNG LƯỢNG (momentum)"
            if "--backtest" in sys.argv:
                backtest(cur, scorer, "contra" if contra else "momentum")
                return
            pos = [a for a in sys.argv[1:] if not a.startswith("-")]
            asof = pos[0] if pos else None
            topn = int(pos[1]) if len(pos) > 1 else 15
            if not asof:
                cur.execute("SELECT max(trading_date) FROM stock_prices WHERE symbol<>'VNINDEX'")
                asof = cur.fetchone()[0].isoformat()

            ranked = scorer(cur, asof)
            print(f"\nXẾP HẠNG {mode} — tính đến {asof} · {len(ranked)} mã qua lọc thanh khoản")
            print("=" * 96)
            print(f"{'#':<3}{'Mã':<6}{'Điểm':>6}{'Giá':>9}{'RSI':>6}{'Ret20':>8}{'Ret60':>8}{'RS20':>7}{'Vol×':>7}{'→đỉnh60':>9}{'GTGD':>8}")
            print("-" * 96)
            for i, r in enumerate(ranked[:topn], 1):
                print(f"{i:<3}{r['symbol']:<6}{r['score']:>6.0f}{r['close']:>9,.0f}{r['rsi']:>6.0f}"
                      f"{r['ret20']:>7.1f}%{r['ret60']:>7.1f}%{r['rs20']:>6.1f}%{r['vol_surge']:>7.2f}"
                      f"{r['gap_to_hi60']:>8.1f}%{r['turn_bn']:>8.0f}")
            print("-" * 96)
            print("Điểm cao = xu hướng + động lượng + sức mạnh tương đối tốt, RSI lành mạnh, sắp/vừa breakout.")
            print("⚠️  Output cơ học — tự kiểm tra cơ bản & tin tức trước khi làm gì.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
