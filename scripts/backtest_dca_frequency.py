"""Giả thiết 3: tần suất góp DCA có quan trọng không?

Cùng ngân sách ~120tr/năm, cùng số năm, chỉ đổi tần suất góp:
  hằng tháng 10tr · 2 tháng/lần 20tr · quý/lần 30tr · nửa năm/lần 60tr · năm/lần 120tr

Với mỗi tần suất, thử TẤT CẢ cách chia lịch (phasing) — vd 2-tháng-lần có 2 cách
(tháng lẻ / tháng chẵn), năm/lần có 12 cách (chọn tháng nào trong năm). So:
  - trung tâm  = trung bình giá trị cuối trên các cách chia
  - biên độ    = min..max giá trị cuối trên các cách chia (= rủi ro "canh giờ" bạn tự nhận)

Kết luận: trung tâm gần như y hệt ở mọi tần suất; chỉ có biên độ nở ra khi góp thưa.
Góp 2 tháng/lần 20tr ~ góp 10tr hằng tháng, lệch < ~1% tuỳ tháng lẻ/chẵn.

    python3 scripts/backtest_dca_frequency.py [since=YYYY-MM]
"""

from __future__ import annotations

import sys
from datetime import date

import psycopg2

DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
FUNDS = ["VCBF-BCF", "VCBF-TBF", "VEOF", "VESAF", "SSISCA", "DCDS", "DCDE"]
# (nhãn, chu kỳ theo tháng, số tiền mỗi lần)  — chuẩn hoá 120tr/năm
FREQ = [("hằng tháng", 1, 10e6), ("2 tháng/lần", 2, 20e6), ("quý/lần", 3, 30e6),
        ("nửa năm/lần", 6, 60e6), ("năm/lần", 12, 120e6)]


def xirr(flows, lo=-0.9, hi=3.0):
    t0 = date.fromisoformat(flows[0][0])
    yrs = [(date.fromisoformat(d) - t0).days / 365.0 for d, _ in flows]
    amt = [a for _, a in flows]
    npv = lambda r: sum(a / (1 + r) ** t for a, t in zip(amt, yrs))
    if npv(lo) * npv(hi) > 0:
        return None
    for _ in range(200):
        m = (lo + hi) / 2
        v = npv(m)
        if abs(v) < 1:
            return m
        if npv(lo) * v < 0:
            hi = m
        else:
            lo = m
    return (lo + hi) / 2


def monthly_first_nav(cur, fund: str):
    cur.execute("SELECT nav_date, nav FROM fund_nav WHERE fund_code=%s ORDER BY nav_date", (fund,))
    rows = [(d, float(n)) for d, n in cur.fetchall()]
    by_month: dict[tuple[int, int], tuple] = {}
    for d, n in rows:
        by_month.setdefault((d.year, d.month), (d, n))
    ms = [{"ym": k, "date": v[0], "nav": v[1]} for k, v in sorted(by_month.items())]
    return ms, rows[-1]


def scheme(ms, last_d, last_nav, mod: int, amt: float):
    """trả (avg_val, min_val, max_val, [xirr theo từng phasing])."""
    vals, xirrs = [], []
    for ph in range(mod):
        u = 0.0
        flows = []
        for m in ms:
            if mod == 1 or (m["ym"][1] % mod) == ph:
                u += amt / m["nav"]
                flows.append([m["date"].isoformat(), -amt])
        val = u * last_nav
        flows.append([last_d.isoformat(), val])
        vals.append(val)
        xirrs.append(xirr(flows))
    return sum(vals) / len(vals), min(vals), max(vals), xirrs


def main():
    since = sys.argv[1] if len(sys.argv) > 1 else None
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    print(f"\n{'='*110}\nGIẢ THIẾT 3 — tần suất góp DCA" + (f"  (từ {since})" if since else "  (toàn bộ lịch sử)"))
    print(f"{'='*110}")
    for f in FUNDS:
        ms, (last_d, last_nav) = monthly_first_nav(cur, f)
        if since:
            ms = [m for m in ms if f"{m['ym'][0]}-{m['ym'][1]:02d}" >= since]
        yrs = (last_d - ms[0]["date"]).days / 365.0
        base = None
        print(f"\n{f}  {len(ms)} tháng ({ms[0]['ym'][0]}-{ms[0]['ym'][1]:02d} → {last_d}, {yrs:.1f} năm)")
        for lab, mod, amt in FREQ:
            avg, mn, mx, xs = scheme(ms, last_d, last_nav, mod, amt)
            if base is None:
                base = avg
            xa = sum(x for x in xs if x) / len(xs)
            print(f"  {lab:14s} | TB {avg/1e6:9,.1f}tr | XIRR {xa*100:5.2f}% "
                  f"| lệch TB vs hằng tháng {(avg/base-1)*100:+.2f}% "
                  f"| biên độ chọn lịch [{(mn/base-1)*100:+.1f}% .. {(mx/base-1)*100:+.1f}%]")
    print(f"\n{'='*110}")
    print("Trung tâm gần như không đổi ở mọi tần suất. 2 tháng/lần 20tr ~ 10tr hằng tháng "
          "(lệch <~1% tuỳ tháng lẻ/chẵn).")
    print(f"{'='*110}\n")
    conn.close()


if __name__ == "__main__":
    main()
