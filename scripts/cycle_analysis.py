"""
Phân tích chu kỳ VN-Index (bull/bear) từ dữ liệu PostgreSQL + ghép với các mốc
đảo chiều chính sách lãi suất của NHNN.

Quy tắc chu kỳ:
- Bear: drawdown >= 20% từ đỉnh đã xác lập.
- Bull: phục hồi >= 20% từ đáy đã xác lập.
- Thuật toán alternating swing (Bry-Boschan rút gọn).

CHỈ SELECT, không ghi DB.
Chạy:  PYTHONPATH=. python3 scripts/cycle_analysis.py
"""
import datetime as dt
import statistics
from backend.db.postgres import PostgresDBManager


# --- Các mốc đảo chiều / thay đổi lãi suất điều hành NHNN (nguồn: web, xem doc) ---
# (ngày hiệu lực, mô tả ngắn, hướng: 'cut' | 'hike' | 'hold-cut-cycle')
RATE_EVENTS = [
    ("2019-09-16", "Cắt: tái cấp vốn 6.25->6.0", "cut"),
    ("2020-03-17", "Cắt (Covid #1): tái cấp vốn 6.0->5.0", "cut"),
    ("2020-05-13", "Cắt (Covid #2): tái cấp vốn 5.0->4.5", "cut"),
    ("2020-10-01", "Cắt (Covid #3): tái cấp vốn 4.5->4.0", "cut"),
    ("2022-09-23", "Tăng #1: tái cấp vốn 4.0->5.0", "hike"),
    ("2022-10-25", "Tăng #2: tái cấp vốn 5.0->6.0", "hike"),
    ("2023-03-15", "Cắt #1/2023: tái chiết khấu 4.5->3.5", "cut"),
    ("2023-04-03", "Cắt #2/2023: tái cấp vốn 6.0->5.5", "cut"),
    ("2023-05-25", "Cắt #3/2023: tái cấp vốn 5.5->5.0", "cut"),
    ("2023-06-19", "Cắt #4/2023: tái cấp vốn 5.0->4.5", "cut"),
]


def load_series(symbol="VNINDEX"):
    db = PostgresDBManager()
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT trading_date, close_price FROM stock_prices "
            "WHERE symbol=%s ORDER BY trading_date", (symbol,)
        )
        rows = [(d, float(c)) for d, c in cur.fetchall()]
    finally:
        db._release(conn)
    return rows


def detect_cycles(series, threshold=0.20):
    vals = [v for _, v in series]
    n = len(series)
    phases = []
    state = "bull"
    anchor_i = 0
    ext_i = 0
    for i in range(1, n):
        v = vals[i]
        if state == "bull":
            if v > vals[ext_i]:
                ext_i = i
            elif v <= vals[ext_i] * (1 - threshold):
                phases.append(dict(type="bull", start_i=anchor_i, end_i=ext_i))
                state = "bear"
                anchor_i = ext_i
                ext_i = i
        else:
            if v < vals[ext_i]:
                ext_i = i
            elif v >= vals[ext_i] * (1 + threshold):
                phases.append(dict(type="bear", start_i=anchor_i, end_i=ext_i))
                state = "bull"
                anchor_i = ext_i
                ext_i = i
    phases.append(dict(type=state, start_i=anchor_i, end_i=ext_i, ongoing=True))
    return phases


def max_drawdown(vals, a, b):
    peak = vals[a]
    mdd = 0.0
    for v in vals[a:b + 1]:
        peak = max(peak, v)
        mdd = min(mdd, (v - peak) / peak)
    return mdd


def months_between(d1, d2):
    return (d2 - d1).days / 30.44


def nearest_close(series, target_date, tol_days=7):
    """Trả về (date, close) của phiên gần target_date nhất, trong phạm vi +/- tol_days.
    Nếu target nằm ngoài khoảng dữ liệu -> None."""
    if target_date < series[0][0] - dt.timedelta(days=tol_days):
        return None
    if target_date > series[-1][0] + dt.timedelta(days=tol_days):
        return None
    best = None
    for d, v in series:
        if best is None or abs((d - target_date).days) < abs((best[0] - target_date).days):
            best = (d, v)
    return best


def pct(a, b):
    return (b / a - 1) * 100 if a else float("nan")


def print_phase_table(series, phases, threshold):
    dates = [d for d, _ in series]
    vals = [v for _, v in series]
    bull_m, bear_m = [], []
    print(f"\n### Ngưỡng {int(threshold*100)}%")
    print(f"{'Pha':<7} {'Bắt đầu':<12} {'Kết thúc':<12} {'Phiên':>6} {'Tháng':>7} "
          f"{'Đầu':>9} {'Cuối':>9} {'Biên độ %':>10} {'MaxDD %':>9}")
    for p in phases:
        a, b = p["start_i"], p["end_i"]
        d0, d1 = dates[a], dates[b]
        v0, v1 = vals[a], vals[b]
        tag = p["type"].upper() + ("*" if p.get("ongoing") else "")
        print(f"{tag:<7} {str(d0):<12} {str(d1):<12} {b-a:>6} {months_between(d0,d1):>7.1f} "
              f"{v0:>9.1f} {v1:>9.1f} {pct(v0,v1):>+10.1f} {max_drawdown(vals,a,b)*100:>9.1f}")
        if not p.get("ongoing"):
            (bull_m if p["type"] == "bull" else bear_m).append(months_between(d0, d1))
    for name, xs in [("BULL", bull_m), ("BEAR", bear_m)]:
        if xs:
            print(f"  {name}: n={len(xs)} mean={statistics.mean(xs):.1f}th "
                  f"median={statistics.median(xs):.1f}th range=[{min(xs):.1f},{max(xs):.1f}]")


def rate_event_reactions(series):
    print("\n## Phản ứng VN-Index quanh các mốc lãi suất NHNN")
    print("(VN-Index tại T; và % thay đổi so với T ở các mốc -12,-6,-3,-1,+1,+3,+6,+12 tháng)")
    hdr = f"{'Ngày (T)':<12} {'Sự kiện':<40} {'VNI(T)':>8} " + \
          " ".join(f"{k:>7}" for k in ["-12m", "-6m", "-3m", "-1m", "+1m", "+3m", "+6m", "+12m"])
    print(hdr)
    for ds, desc, direction in RATE_EVENTS:
        t = dt.date.fromisoformat(ds)
        base = nearest_close(series, t)
        if not base:
            continue
        _, v_t = base
        cells = []
        for off in [-12, -6, -3, -1, 1, 3, 6, 12]:
            td = t + dt.timedelta(days=int(off * 30.44))
            nc = nearest_close(series, td)
            if nc and series[0][0] <= td <= series[-1][0]:
                cells.append(f"{pct(v_t, nc[1]):>+7.1f}")
            else:
                cells.append(f"{'n/a':>7}")
        print(f"{ds:<12} {desc[:40]:<40} {v_t:>8.1f} " + " ".join(cells))


def month_end_series(series):
    print("\n## VN-Index cuối tháng (từ DB)")
    seen = {}
    for d, v in series:
        seen[(d.year, d.month)] = (d, v)
    for (y, m), (d, v) in sorted(seen.items()):
        print(f"  {y}-{m:02d}  {d}  {v:.1f}")


def main():
    series = load_series("VNINDEX")
    print("# Phân tích chu kỳ VN-Index từ DB PostgreSQL (stock_db, symbol=VNINDEX)")
    print(f"Khoảng dữ liệu: {series[0][0]} -> {series[-1][0]} ({len(series)} phiên)")

    for thr in (0.20, 0.10):
        print_phase_table(series, detect_cycles(series, thr), thr)

    rate_event_reactions(series)
    month_end_series(series)


if __name__ == "__main__":
    main()
