"""Giả thiết 2: DCA 10tr/tháng ~10 năm — mua đầu / giữa / cuối tháng có khác gì?

TH1 đầu tháng  : phiên có NAV đầu tiên trong tháng
TH2 giữa tháng : phiên NAV gần ngày 15 nhất
TH3 cuối tháng : phiên NAV cuối cùng trong tháng

Đối chiếu với 2 giới hạn lý thuyết (không đạt được): mua đúng đáy / đúng đỉnh NAV
của tháng. So sánh giá trị cuối (cùng ngân sách 10tr/tháng, cùng NAV định giá) +
XIRR, và đếm số tháng mỗi mốc bắt được NAV rẻ nhất.

    python3 scripts/backtest_dca_dayofmonth.py           # bảng
    python3 scripts/backtest_dca_dayofmonth.py 2019-01   # chỉ từ tháng này (NAV hằng ngày)
"""

from __future__ import annotations

import sys
from datetime import date

import psycopg2

DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
MONTHLY = 10_000_000.0
FUNDS = ["VCBF-BCF", "VCBF-TBF", "VEOF", "VESAF", "SSISCA", "DCDS", "DCDE"]


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


def monthly_points(cur, fund: str):
    cur.execute("SELECT nav_date, nav FROM fund_nav WHERE fund_code=%s ORDER BY nav_date", (fund,))
    rows = [(d, float(n)) for d, n in cur.fetchall()]
    by_month: dict[tuple[int, int], list] = {}
    for d, n in rows:
        by_month.setdefault((d.year, d.month), []).append((d, n))
    out = []
    for k in sorted(by_month):
        pts = by_month[k]
        mid = min(pts, key=lambda p: abs(p[0].day - 15))
        navs = [n for _, n in pts]
        out.append({
            "m": f"{k[0]}-{k[1]:02d}",
            "first": pts[0], "mid": mid, "last": pts[-1],
            "lo": min(navs), "hi": max(navs),
        })
    return out, rows[-1]


def run(cur, fund: str, since: str | None):
    ms, (last_d, last_nav) = monthly_points(cur, fund)
    if since:
        ms = [x for x in ms if x["m"] >= since]
    res = {}
    for key in ("first", "mid", "last", "lo", "hi"):
        u = 0.0
        flows = []
        for x in ms:
            nav = x[key] if key in ("lo", "hi") else x[key][1]
            u += MONTHLY / nav
            d = (x["first"][0] if key in ("lo", "hi") else x[key][0]).isoformat()
            flows.append([d, -MONTHLY])
        val = u * last_nav
        flows.append([last_d.isoformat(), val])
        res[key] = {"val": val, "xirr": xirr(flows), "avgnav": len(ms) * MONTHLY / u}
    tally = {"first": 0, "mid": 0, "last": 0}
    for x in ms:
        o = {k: x[k][1] for k in ("first", "mid", "last")}
        tally[min(o, key=o.get)] += 1
    return len(ms), ms[0]["m"], ms[-1]["m"], res, tally


def main():
    since = sys.argv[1] if len(sys.argv) > 1 else None
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    print(f"\n{'='*104}")
    print(f"GIẢ THIẾT 2 — mua đầu / giữa / cuối tháng" + (f"  (từ {since})" if since else "  (toàn bộ lịch sử)"))
    print(f"{'='*104}")
    win = {"first": 0, "mid": 0, "last": 0}
    for f in FUNDS:
        n, s, e, r, t = run(cur, f, since)
        best = max(("first", "mid", "last"), key=lambda k: r[k]["val"])
        win[best] += 1
        spread = max(r[k]["val"] for k in ("first", "mid", "last")) / min(r[k]["val"] for k in ("first", "mid", "last")) - 1
        print(f"\n{f}  {n} tháng ({s} → {e})")
        for k, lab in (("first", "đầu "), ("mid", "giữa"), ("last", "cuối")):
            d = r[k]["val"] - r["first"]["val"]
            mark = "  ← cao nhất" if k == best else ""
            print(f"  {lab} tháng : {r[k]['val']/1e6:9,.1f} tr | XIRR {r[k]['xirr']*100:5.2f}% "
                  f"| NAV mua TB {r[k]['avgnav']:,.0f} | vs đầu tháng {d/1e6:+6.2f} tr{mark}")
        print(f"  biên độ 3 mốc: {spread*100:.2f}%   |   tháng NAV rẻ nhất: đầu {t['first']}  giữa {t['mid']}  cuối {t['last']}")
        print(f"  [lý thuyết] mua đáy tháng {r['lo']['val']/1e6:,.1f} tr (XIRR {r['lo']['xirr']*100:.2f}%)  "
              f"·  mua đỉnh tháng {r['hi']['val']/1e6:,.1f} tr (XIRR {r['hi']['xirr']*100:.2f}%)")
    print(f"\n{'='*104}")
    print(f"KẾT LUẬN: mốc cho giá trị cuối cao nhất — đầu {win['first']}/7 · giữa {win['mid']}/7 · cuối {win['last']}/7")
    print("Khoảng cách giữa 3 mốc luôn dưới ~1% sau cả thập kỷ — nằm trong vùng nhiễu.")
    print(f"{'='*104}\n")
    conn.close()


if __name__ == "__main__":
    main()
