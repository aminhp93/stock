"""Backtest chiến lược góp định kỳ vào VCBF-BCF (dữ liệu NAV thật trong fund_nav).

So sánh:
  A. DCA cố định           — góp B mỗi tháng, không đổi
  B. Value Averaging        — điều chỉnh khoản góp để giá trị danh mục bám mục tiêu
  C. DCA + gia tăng khi giảm — góp B, cộng thêm từ quỹ dự phòng khi VN-Index
                               giảm sâu từ đỉnh 52 tuần (chỉ tăng, không bao giờ giảm)
  D. Lump sum               — bỏ toàn bộ vốn (bằng tổng đã góp của A) vào ngày đầu
  E. Chạy theo đám đông      — bỏ góp khi thị trường giảm >10%, gấp đôi khi đỉnh mới

Chỉ số: tổng đã góp · giá trị cuối · lời/lỗ % · IRR (annualized, money-weighted) ·
        drawdown danh mục lớn nhất · số CCQ · giá vốn TB.

    python3 scripts/backtest_dca.py [B=10000000] [buy_day=7] [start=2017-10-01]
"""

from __future__ import annotations

import datetime as dt
import sys

import psycopg2

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")


def load_series(cur, sql, params=()):
    cur.execute(sql, params)
    return [(r[0], float(r[1])) for r in cur.fetchall()]


def nearest_on_or_after(series, target):
    """series: list[(date, value)] tăng dần. Trả (date, value) đầu tiên >= target."""
    for d, v in series:
        if d >= target:
            return d, v
    return None


def irr(cashflows: list[tuple[dt.date, float]], guess=0.10) -> float | None:
    """IRR năm từ chuỗi (ngày, dòng tiền). Âm = chi ra, dương = nhận về."""
    if len(cashflows) < 2:
        return None
    t0 = cashflows[0][0]
    times = [(d - t0).days / 365.25 for d, _ in cashflows]
    amts = [a for _, a in cashflows]

    def npv(rate):
        return sum(a / (1 + rate) ** t for a, t in zip(amts, times))

    lo, hi = -0.95, 5.0
    if npv(lo) * npv(hi) > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2
        v = npv(mid)
        if abs(v) < 1e-3:
            return mid
        if npv(lo) * v < 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def month_iter(start: dt.date, end: dt.date):
    y, m = start.year, start.month
    while dt.date(y, m, 1) <= end:
        yield y, m
        m += 1
        if m > 12:
            m, y = 1, y + 1


class Book:
    """Sổ đơn giản: mua/bán CCQ theo NAV, theo dõi dòng tiền cho IRR."""

    def __init__(self):
        self.units = 0.0
        self.invested = 0.0          # tổng tiền TỰ BỎ VÀO (net, đã trừ tiền bán rút ra)
        self.gross_in = 0.0
        self.cashflows: list[tuple[dt.date, float]] = []
        self.value_path: list[float] = []

    def contribute(self, d: dt.date, amount: float, nav: float):
        if amount == 0:
            return
        self.units += amount / nav
        self.invested += amount
        if amount > 0:
            self.gross_in += amount
        self.cashflows.append((d, -amount))   # bỏ tiền vào = dòng tiền âm

    def mark(self, nav: float):
        self.value_path.append(self.units * nav)

    def finish(self, d: dt.date, nav: float):
        val = self.units * nav
        self.cashflows.append((d, val))
        return val


def max_drawdown(path: list[float]) -> float:
    peak, mdd = 0.0, 0.0
    for v in path:
        peak = max(peak, v)
        if peak > 0:
            mdd = min(mdd, v / peak - 1)
    return mdd * 100


def run():
    B = float(sys.argv[1]) if len(sys.argv) > 1 else 10_000_000
    buy_day = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    start = dt.date.fromisoformat(sys.argv[3]) if len(sys.argv) > 3 else dt.date(2017, 10, 1)

    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        nav = load_series(cur, "SELECT nav_date, nav FROM fund_nav WHERE fund_code='VCBF-BCF' ORDER BY nav_date")
        vni = load_series(cur, "SELECT trading_date, close_price FROM stock_prices WHERE symbol='VNINDEX' ORDER BY trading_date")
    conn.close()

    nav_start = max(nav[0][0], vni[0][0])
    start = max(start, nav_start.replace(day=1))
    end = min(nav[-1][0], vni[-1][0])
    nav_last = nav[-1][1]

    # VN-Index: drawdown từ đỉnh 252 phiên, tra theo ngày
    vni_dates = [d for d, _ in vni]
    vni_vals = [v for _, v in vni]

    def vni_drawdown(d: dt.date) -> float:
        # tìm index cuối <= d
        idx = None
        for i in range(len(vni_dates) - 1, -1, -1):
            if vni_dates[i] <= d:
                idx = i
                break
        if idx is None:
            return 0.0
        window = vni_vals[max(0, idx - 251): idx + 1]
        peak = max(window)
        return (vni_vals[idx] / peak - 1) if peak else 0.0

    months = [(y, m) for y, m in month_iter(start, end)]
    buy_points = []
    for y, m in months:
        try:
            target = dt.date(y, m, buy_day)
        except ValueError:
            target = dt.date(y, m, 28)
        hit = nearest_on_or_after(nav, target)
        if hit and hit[0] <= end:
            buy_points.append(hit)  # (nav_date, nav)

    n = len(buy_points)
    total_dca = n * B

    A, Bk, C, E = Book(), Book(), Book(), Book()
    # C: quỹ dự phòng bằng 6 tháng, được "nạp" thêm 0.3B mỗi tháng (mô phỏng tiền để dành)
    reserve = 6 * B
    dip_adds = 0
    # B: mục tiêu Value Averaging, tăng 0.7%/tháng + B
    va_target = 0.0
    va_growth = 0.006
    va_sells = 0
    # E: theo dõi đỉnh VNI để biết "đỉnh mới"
    e_peak = 0.0

    for i, (d, p) in enumerate(buy_points):
        dd = vni_drawdown(d)

        # A — cố định
        A.contribute(d, B, p)

        # B — value averaging
        va_target = va_target * (1 + va_growth) + B
        cur_val = Bk.units * p
        want = va_target - cur_val
        want = max(-cur_val, min(want, 4 * B))     # cho bán, chặn mua ở 4B
        if want < 0:
            va_sells += 1
        Bk.contribute(d, want, p)
        # phần thiếu do chặn 4B -> dồn vào mục tiêu tháng sau (giữ nguyên va_target)

        # C — DCA + add on dip
        add = 0.0
        if dd <= -0.25 and reserve >= 2 * B:
            add, dip_adds = 2 * B, dip_adds + 1
        elif dd <= -0.15 and reserve >= B:
            add, dip_adds = B, dip_adds + 1
        reserve = reserve - add + 0.3 * B          # để dành thêm 0.3B/tháng
        C.contribute(d, B + add, p)

        # E — chạy theo đám đông
        idx = next((k for k in range(len(vni_dates) - 1, -1, -1) if vni_dates[k] <= d), None)
        vnow = vni_vals[idx] if idx is not None else 0.0
        e_new_high = vnow >= e_peak
        e_peak = max(e_peak, vnow)
        if dd <= -0.10:
            e_amt = 0.0                            # sợ -> bỏ góp
        elif e_new_high:
            e_amt = 2 * B                          # hưng phấn -> gấp đôi
        else:
            e_amt = B
        E.contribute(d, e_amt, p)

        for bk in (A, Bk, C, E):
            bk.mark(p)

    # D — lump sum tổng vốn A vào ngày đầu
    d0, p0 = buy_points[0]
    D = Book()
    D.contribute(d0, total_dca, p0)
    # value path xấp xỉ theo NAV các buy point
    for _, p in buy_points:
        D.mark(p)

    rows = []
    for name, bk in [("A · DCA cố định", A), ("B · Value Averaging", Bk),
                     ("C · DCA + mua khi giảm", C), ("D · Lump sum đầu kỳ", D),
                     ("E · Chạy theo đám đông", E)]:
        val = bk.finish(end, nav_last)
        net = bk.invested
        ret = (val / net - 1) * 100 if net else 0
        r = irr(bk.cashflows)
        mdd = max_drawdown(bk.value_path + [val])
        rows.append((name, bk.gross_in, net, val, ret, (r * 100 if r is not None else None),
                     mdd, bk.units, net / bk.units if bk.units else 0))

    print(f"\nBACKTEST GÓP ĐỊNH KỲ — VCBF-BCF")
    print(f"Kỳ: {buy_points[0][0]} → {end}  ({n} tháng)  ·  B = {B:,.0f}đ/tháng  ·  NAV cuối {nav_last:,.0f}")
    print("=" * 104)
    print(f"{'Chiến lược':<24}{'Đã bỏ ròng':>15}{'Giá trị cuối':>16}{'Lời/lỗ':>10}{'IRR/năm':>10}{'MaxDD':>9}{'Giá vốn TB':>13}")
    print("-" * 104)
    for name, gin, net, val, ret, r, mdd, units, avgc in rows:
        print(f"{name:<24}{net:>15,.0f}{val:>16,.0f}{ret:>9.1f}%"
              f"{(f'{r:.1f}%' if r is not None else '  n/a'):>10}{mdd:>8.1f}%{avgc:>13,.0f}")
    print("-" * 104)
    print(f"Tổng vốn kịch bản A: {total_dca:,.0f}đ  ·  C dùng thêm {dip_adds} lần từ quỹ dự phòng "
          f"·  B bán ròng {va_sells} tháng")
    print("\nGhi chú: IRR (money-weighted) là thước đo công bằng nhất vì tính cả thời điểm dòng tiền.")
    print("Lump sum (D) thường thắng nếu thị trường đi lên — đổi lại chịu MaxDD lớn hơn nhiều.")


if __name__ == "__main__":
    run()
