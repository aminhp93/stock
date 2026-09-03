"""So sánh return các quỹ mở VN + backtest "chiến lược video WBN".

Chiến lược video (Phan Lê Thành Long / Nguyễn Minh Tuấn):
  - Tích sản định kỳ hàng tháng (DCA), "time in the market not timing"
  - Đẩy MẠNH mua thêm khi thị trường điều chỉnh/khó khăn
  - KHÔNG bán, trừ khi có "đảo chiều chính sách trọng yếu"
  => = DCA + gia tăng khi VN-Index giảm sâu từ đỉnh, không bao giờ bán.

So với DCA cố định thuần. Chạy trên NAV thật (fund_nav) + VN-Index.

    python3 scripts/backtest_funds.py [B=10000000] [start=2020-01-01]
"""

from __future__ import annotations

import datetime as dt
import sys

import psycopg2

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

FUND_LABELS = {
    "VCBF-BCF": "VCBF Bluechip", "DCDS": "Dragon Capital DCDS", "DCDE": "Dragon Capital cổ tức",
    "VESAF": "VinaCapital VESAF", "VEOF": "VinaCapital VEOF", "VDEF": "VinaCapital VDEF (video)",
    "SSISCA": "SSI SCA", "VCBF-TBF": "VCBF cân bằng", "VCBF-MGF": "VCBF tăng trưởng",
    "VLGF": "VinaCapital VLGF", "MAGEF": "Mirae Asset MAGEF", "VMEEF": "VinaCapital VMEEF",
    "VIBF": "VinaCapital VIBF cân bằng",
}


def irr(cfs, ):
    if len(cfs) < 2:
        return None
    t0 = cfs[0][0]
    ts = [(d - t0).days / 365.25 for d, _ in cfs]
    am = [a for _, a in cfs]
    npv = lambda r: sum(a / (1 + r) ** t for a, t in zip(am, ts))
    lo, hi = -0.95, 5.0
    if npv(lo) * npv(hi) > 0:
        return None
    for _ in range(200):
        m = (lo + hi) / 2
        if abs(npv(m)) < 1e-2:
            return m
        if npv(lo) * npv(m) < 0:
            hi = m
        else:
            lo = m
    return (lo + hi) / 2


def months(a: dt.date, b: dt.date):
    y, m = a.year, a.month
    while dt.date(y, m, 1) <= b:
        yield y, m
        m = m % 12 + 1
        if m == 1:
            y += 1


def load(cur, sql, p=()):
    cur.execute(sql, p)
    return [(r[0], float(r[1])) for r in cur.fetchall()]


def run_strategy(buy_points, dd_at, B, on_dip: bool):
    """buy_points: [(date, nav)]. dd_at: fn(date)->drawdown. Trả (net, final, irr%, mdd%, units)."""
    units = invested = 0.0
    reserve = 6 * B
    cfs = []
    path = []
    for d, nav in buy_points:
        amt = B
        if on_dip:
            dd = dd_at(d)
            add = 0.0
            if dd <= -0.25 and reserve >= 2 * B:
                add = 2 * B
            elif dd <= -0.15 and reserve >= B:
                add = B
            reserve = reserve - add + 0.3 * B
            amt += add
        units += amt / nav
        invested += amt
        cfs.append((d, -amt))
        path.append(units * nav)
    last_nav = buy_points[-1][1]
    final = units * last_nav
    cfs.append((buy_points[-1][0], final))
    r = irr(cfs)
    peak = mdd = 0.0
    for v in path + [final]:
        peak = max(peak, v)
        if peak:
            mdd = min(mdd, v / peak - 1)
    return invested, final, (r * 100 if r else None), mdd * 100, units


def main():
    B = float(sys.argv[1]) if len(sys.argv) > 1 else 10_000_000
    start_req = dt.date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else dt.date(2020, 1, 1)

    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT fund_code FROM fund_nav ORDER BY fund_code")
        codes = [r[0] for r in cur.fetchall()]
        vni = load(cur, "SELECT trading_date, close_price FROM stock_prices WHERE symbol='VNINDEX' ORDER BY trading_date")
        navs = {c: load(cur, "SELECT nav_date, nav FROM fund_nav WHERE fund_code=%s ORDER BY nav_date", (c,)) for c in codes}
    conn.close()

    vd = [d for d, _ in vni]
    vv = [v for _, v in vni]

    def dd_at(d):
        idx = next((i for i in range(len(vd) - 1, -1, -1) if vd[i] <= d), None)
        if idx is None:
            return 0.0
        w = vv[max(0, idx - 251): idx + 1]
        return vv[idx] / max(w) - 1 if w else 0.0

    end = min(max(d for d, _ in vni), max(navs[codes[0]][-1][0] for _ in [0]))
    end = min(vd[-1], max(n[-1][0] for n in navs.values()))

    results = []
    for c in codes:
        nav = navs[c]
        f_start = max(start_req, nav[0][0].replace(day=1), vd[0])
        f_end = min(end, nav[-1][0])
        if (f_end - f_start).days < 365 * 2:
            continue
        bps = []
        for y, m in months(f_start, f_end):
            tgt = dt.date(y, m, min(7, 28))
            hit = next(((d, v) for d, v in nav if d >= tgt and d <= f_end), None)
            if hit:
                bps.append(hit)
        if len(bps) < 20:
            continue
        a_net, a_val, a_irr, a_mdd, _ = run_strategy(bps, dd_at, B, on_dip=False)
        c_net, c_val, c_irr, c_mdd, _ = run_strategy(bps, dd_at, B, on_dip=True)
        results.append((c, len(bps), bps[0][0], a_net, a_val, a_irr, a_mdd, c_net, c_val, c_irr, c_mdd))

    results.sort(key=lambda x: (x[5] or -99), reverse=True)

    print(f"\nSO SÁNH QUỸ MỞ VN — góp {B:,.0f}đ/tháng, từ {start_req} (mỗi quỹ dùng lịch sử chung có sẵn)")
    print("=" * 118)
    print(f"{'Quỹ':<26}{'th':>4}{'từ':>11} │ {'DCA cố định':^26} │ {'Chiến lược video (DCA+dip)':^30}")
    print(f"{'':<26}{'':>4}{'':>11} │ {'đã bỏ':>9}{'cuối':>9}{'IRR':>7} │ {'đã bỏ':>10}{'cuối':>10}{'IRR':>7}{'MaxDD':>7}")
    print("-" * 118)
    for (c, n, d0, an, av, ai, am, cn, cv, ci, cm) in results:
        lbl = f"{c} · {FUND_LABELS.get(c, '')[:16]}"
        print(f"{lbl:<26}{n:>4}{str(d0):>11} │ {an/1e6:>8.0f}M{av/1e6:>8.0f}M"
              f"{(f'{ai:.1f}%' if ai else 'n/a'):>7} │ {cn/1e6:>9.0f}M{cv/1e6:>9.0f}M"
              f"{(f'{ci:.1f}%' if ci else 'n/a'):>7}{(f'{cm:.0f}%' if ci else ''):>7}")
    print("-" * 118)
    print("IRR = money-weighted/năm. 'Chiến lược video' = DCA + tự động mua thêm khi VN-Index")
    print("giảm ≥15%/≥25% từ đỉnh 52T (nguồn quỹ dự phòng), KHÔNG bán. So cột IRR để thấy edge.")


if __name__ == "__main__":
    main()
