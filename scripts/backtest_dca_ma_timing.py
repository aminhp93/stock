"""Kiểm định giả thiết: DCA đều đặn vào chứng chỉ quỹ, có/không lớp lọc MA50.

Giả thiết: mỗi tháng có 10 triệu, đầu tư liên tục ~10 năm vào 1 quỹ mở.

  TH1 — DCA thuần : đầu tháng mua đủ 10tr theo NAV ngày đó.
  TH2 — Lọc MA50  : nếu VN-Index > MA50(50 phiên) -> chỉ mua 8tr, để 2tr vào "quỹ dự
                    phòng". Nếu VN-Index <= MA50 -> mua 10tr + rút thêm tối đa 2tr từ
                    quỹ dự phòng (nếu còn). Ý tưởng: gom tiền lúc thị trường "đắt"
                    (trên MA50) để giải ngân mạnh hơn lúc thị trường "rẻ" (dưới MA50).

So sánh công bằng bằng XIRR (lợi suất theo dòng tiền thực) vì 2 kịch bản có lịch
trình rót vốn khác nhau; và tính cả tiền còn kẹt trong quỹ dự phòng vào giá trị
cuối (cùng ngân sách 10tr/tháng).

Đo "độ chính xác của giả thiết":
  - TH2 có thắng TH1 không, chênh bao nhiêu (giá trị cuối, XIRR)?
  - Có nhất quán qua nhiều quỹ / nhiều tham số (MA, tỷ lệ tách) không?
  - Chất lượng tín hiệu: tháng "dưới MA50" thì forward-return của quỹ có thực sự
    cao hơn trung bình không (đây mới là lõi quyết định lớp lọc có "biết" gì không)?

    python3 scripts/backtest_dca_ma_timing.py            # in bảng tóm tắt
    python3 scripts/backtest_dca_ma_timing.py --json     # xuất JSON cho trang web
"""

from __future__ import annotations

import json
import sys
from datetime import date

import psycopg2

DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

MONTHLY_CASH = 10_000_000.0
DEFAULT_HOLD = 8_000_000.0        # TH2: rót lúc trên MA50
DEFAULT_RESERVE_ADD = 2_000_000.0  # để dành lúc trên MA50
DEFAULT_RESERVE_PULL = 2_000_000.0  # rút thêm lúc dưới MA50
MA_WINDOW = 50

FUNDS = ["VCBF-BCF", "VCBF-TBF", "VEOF", "VESAF", "SSISCA", "DCDS", "DCDE"]
FUND_LABEL = {
    "VCBF-BCF": "VCBF Blue-Chip (cổ phiếu)",
    "VCBF-TBF": "VCBF Cân Bằng (cổ phiếu + TP)",
    "VEOF": "VinaCapital VEOF (cổ phiếu)",
    "VESAF": "VinaCapital VESAF (vốn hoá vừa & nhỏ)",
    "SSISCA": "SSI SCA (cổ phiếu)",
    "DCDS": "DC DCDS (cổ phiếu, từ 2004)",
    "DCDE": "DC DCDE (doanh nghiệp hàng đầu)",
}


def load_vnindex(cur) -> list[tuple[date, float, float | None]]:
    cur.execute("SELECT trading_date, close_price FROM stock_prices WHERE symbol='VNINDEX' ORDER BY trading_date")
    rows = [(d, float(c)) for d, c in cur.fetchall()]
    out = []
    closes = [c for _, c in rows]
    for i, (d, c) in enumerate(rows):
        ma = sum(closes[i - MA_WINDOW + 1:i + 1]) / MA_WINDOW if i + 1 >= MA_WINDOW else None
        out.append((d, c, ma))
    return out


def index_state_asof(vni: list, d: date) -> str | None:
    """'above' / 'below' / None (chưa đủ dữ liệu MA)."""
    prev = [row for row in vni if row[0] <= d]
    if not prev:
        return None
    _, close, ma = prev[-1]
    if ma is None:
        return None
    return "above" if close > ma else "below"


def load_fund_monthly(cur, fund: str) -> list[tuple[date, float]]:
    """NAV đầu tiên của mỗi tháng (mô phỏng lệnh mua đầu tháng)."""
    cur.execute(
        "SELECT nav_date, nav FROM fund_nav WHERE fund_code=%s ORDER BY nav_date", (fund,)
    )
    by_month: dict[tuple[int, int], tuple[date, float]] = {}
    for d, nav in cur.fetchall():
        key = (d.year, d.month)
        if key not in by_month:
            by_month[key] = (d, float(nav))
    return [by_month[k] for k in sorted(by_month)]


def load_fund_nav_series(cur, fund: str) -> list[tuple[date, float]]:
    cur.execute("SELECT nav_date, nav FROM fund_nav WHERE fund_code=%s ORDER BY nav_date", (fund,))
    return [(d, float(n)) for d, n in cur.fetchall()]


def nav_asof(series: list[tuple[date, float]], d: date) -> float:
    prev = [n for dd, n in series if dd <= d]
    return prev[-1] if prev else series[0][1]


def xirr(flows: list[tuple[date, float]], guess: float = 0.10) -> float | None:
    """flows: (date, amount). Âm = chi ra, dương = giá trị nhận về. Newton + bisection."""
    if not flows or all(a >= 0 for _, a in flows) or all(a <= 0 for _, a in flows):
        return None
    t0 = flows[0][0]
    yrs = [(d - t0).days / 365.0 for d, _ in flows]
    amts = [a for _, a in flows]

    def npv(r):
        return sum(a / (1 + r) ** t for a, t in zip(amts, yrs))

    def dnpv(r):
        return sum(-t * a / (1 + r) ** (t + 1) for a, t in zip(amts, yrs))

    r = guess
    for _ in range(100):
        f = npv(r)
        d = dnpv(r)
        if abs(d) < 1e-9:
            break
        r2 = r - f / d
        if abs(r2 - r) < 1e-8:
            return r2
        r = r2
    lo, hi = -0.95, 5.0
    flo, fhi = npv(lo), npv(hi)
    if flo * fhi > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2
        fm = npv(mid)
        if abs(fm) < 1e-3:
            return mid
        if flo * fm < 0:
            hi = mid
        else:
            lo, flo = mid, fm
    return (lo + hi) / 2


def simulate(cur, fund: str, hold=DEFAULT_HOLD, res_add=DEFAULT_RESERVE_ADD,
             res_pull=DEFAULT_RESERVE_PULL, start: date | None = None):
    vni = load_vnindex(cur)
    months = load_fund_monthly(cur, fund)
    navs = load_fund_nav_series(cur, fund)
    # chỉ giữ tháng có trạng thái MA hợp lệ
    months = [(d, nav) for d, nav in months if index_state_asof(vni, d) is not None]
    if start:
        months = [(d, nav) for d, nav in months if d >= start]
    if len(months) < 24:
        return None

    last_date = navs[-1][0]
    last_nav = navs[-1][1]

    # ── TH1: DCA thuần ──────────────────────────────────────────────
    u1 = 0.0
    flows1: list[tuple[date, float]] = []
    for d, nav in months:
        u1 += MONTHLY_CASH / nav
        flows1.append((d, -MONTHLY_CASH))
    val1 = u1 * last_nav
    flows1.append((last_date, val1))

    # ── TH2: lọc MA50 + quỹ dự phòng ────────────────────────────────
    u2 = 0.0
    reserve = 0.0
    flows2: list[tuple[date, float]] = []
    n_above = n_below = 0
    invested2 = 0.0
    for d, nav in months:
        state = index_state_asof(vni, d)
        if state == "above":
            put = hold
            reserve += res_add
            n_above += 1
        else:  # below
            pull = min(res_pull, reserve)
            put = MONTHLY_CASH + pull
            reserve -= pull
            n_below += 1
        u2 += put / nav
        invested2 += put
        # dòng tiền ra thực = tiền rời túi tháng đó = luôn 10tr (8 mua + 2 để dành, hoặc 10 mua +
        # phần rút ra là tiền các tháng trước đã rời túi rồi) -> để so XIRR công bằng, coi mỗi
        # tháng chi đúng 10tr, và cộng reserve còn lại vào giá trị cuối.
        flows2.append((d, -MONTHLY_CASH))
    val2_fund = u2 * last_nav
    val2_total = val2_fund + reserve   # tiền chưa giải ngân vẫn là của mình
    flows2.append((last_date, val2_total))

    # ── chất lượng tín hiệu: forward return quỹ sau tháng dưới/trên MA50 ──
    fwd_below, fwd_above = [], []
    for i, (d, nav) in enumerate(months[:-1]):
        nxt_nav = months[i + 1][1]
        r = nxt_nav / nav - 1
        if index_state_asof(vni, d) == "below":
            fwd_below.append(r)
        else:
            fwd_above.append(r)
    # forward 3 tháng
    fwd3_below, fwd3_above = [], []
    for i, (d, nav) in enumerate(months[:-3]):
        r = months[i + 3][1] / nav - 1
        if index_state_asof(vni, d) == "below":
            fwd3_below.append(r)
        else:
            fwd3_above.append(r)

    def avg(xs):
        return sum(xs) / len(xs) if xs else None

    total_cash = len(months) * MONTHLY_CASH
    return {
        "fund": fund,
        "label": FUND_LABEL.get(fund, fund),
        "months": len(months),
        "start": months[0][0].isoformat(),
        "end": last_date.isoformat(),
        "total_cash_budget": total_cash,
        "n_above_ma50": n_above,
        "n_below_ma50": n_below,
        "th1": {
            "units": round(u1, 2),
            "invested": total_cash,
            "final_value": round(val1),
            "profit": round(val1 - total_cash),
            "roi_pct": round((val1 / total_cash - 1) * 100, 1),
            "xirr_pct": round((xirr(flows1) or 0) * 100, 2),
            "avg_cost_nav": round(total_cash / u1, 0) if u1 else None,
        },
        "th2": {
            "units": round(u2, 2),
            "invested_in_fund": round(invested2),
            "reserve_left": round(reserve),
            "final_value_fund": round(val2_fund),
            "final_value_total": round(val2_total),
            "profit": round(val2_total - total_cash),
            "roi_pct": round((val2_total / total_cash - 1) * 100, 1),
            "xirr_pct": round((xirr(flows2) or 0) * 100, 2),
            "avg_cost_nav": round(invested2 / u2, 0) if u2 else None,
        },
        "delta": {
            "final_value": round(val2_total - val1),
            "final_value_pct": round((val2_total / val1 - 1) * 100, 2),
            "xirr_pp": round(((xirr(flows2) or 0) - (xirr(flows1) or 0)) * 100, 2),
        },
        "signal": {
            "fwd1m_below_ma50": round((avg(fwd_below) or 0) * 100, 2),
            "fwd1m_above_ma50": round((avg(fwd_above) or 0) * 100, 2),
            "fwd1m_edge_pp": round(((avg(fwd_below) or 0) - (avg(fwd_above) or 0)) * 100, 2),
            "fwd3m_below_ma50": round((avg(fwd3_below) or 0) * 100, 2),
            "fwd3m_above_ma50": round((avg(fwd3_above) or 0) * 100, 2),
            "fwd3m_edge_pp": round(((avg(fwd3_below) or 0) - (avg(fwd3_above) or 0)) * 100, 2),
        },
    }


def build_timeseries(cur, fund: str):
    """Chuỗi giá trị danh mục theo tháng cho 2 kịch bản (để vẽ)."""
    vni = load_vnindex(cur)
    months = load_fund_monthly(cur, fund)
    months = [(d, nav) for d, nav in months if index_state_asof(vni, d) is not None]
    u1 = u2 = reserve = 0.0
    series = []
    for d, nav in months:
        u1 += MONTHLY_CASH / nav
        state = index_state_asof(vni, d)
        if state == "above":
            put = DEFAULT_HOLD
            reserve += DEFAULT_RESERVE_ADD
        else:
            pull = min(DEFAULT_RESERVE_PULL, reserve)
            put = MONTHLY_CASH + pull
            reserve -= pull
        u2 += put / nav
        series.append({
            "date": d.isoformat(),
            "nav": round(nav),
            "state": state,
            "invested_cum": None,  # điền dưới
            "th1_value": round(u1 * nav),
            "th2_value": round(u2 * nav + reserve),
            "reserve": round(reserve),
        })
    for i, s in enumerate(series):
        s["invested_cum"] = (i + 1) * MONTHLY_CASH
    return series


def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    results = [r for r in (simulate(cur, f) for f in FUNDS) if r]

    as_json = "--json" in sys.argv
    if as_json:
        payload = {
            "generated": date.today().isoformat(),
            "params": {
                "monthly_cash": MONTHLY_CASH,
                "th2_hold_when_above": DEFAULT_HOLD,
                "th2_reserve_add": DEFAULT_RESERVE_ADD,
                "th2_reserve_pull": DEFAULT_RESERVE_PULL,
                "ma_window": MA_WINDOW,
            },
            "results": results,
            "timeseries": {f: build_timeseries(cur, f) for f in FUNDS},
        }
        print(json.dumps(payload, ensure_ascii=False))
        conn.close()
        return

    print(f"\n{'='*100}")
    print("KIỂM ĐỊNH: DCA 10tr/tháng vào chứng chỉ quỹ — TH1 (đều) vs TH2 (lọc MA50)")
    print(f"{'='*100}")
    for r in results:
        print(f"\n▸ {r['fund']} — {r['label']}")
        print(f"  {r['months']} tháng ({r['start']} → {r['end']}) · trên MA50: {r['n_above_ma50']}  dưới MA50: {r['n_below_ma50']}")
        print(f"  Tổng ngân sách rót: {r['total_cash_budget']/1e6:,.0f} tr")
        t1, t2, dl = r["th1"], r["th2"], r["delta"]
        print(f"    TH1 (DCA đều)  : giá trị cuối {t1['final_value']/1e6:>8,.1f} tr | lãi {t1['profit']/1e6:>+7,.1f} tr "
              f"| ROI {t1['roi_pct']:>5.1f}% | XIRR {t1['xirr_pct']:>5.2f}% | NAV mua TB {t1['avg_cost_nav']:,.0f}")
        print(f"    TH2 (lọc MA50) : giá trị cuối {t2['final_value_total']/1e6:>8,.1f} tr | lãi {t2['profit']/1e6:>+7,.1f} tr "
              f"| ROI {t2['roi_pct']:>5.1f}% | XIRR {t2['xirr_pct']:>5.2f}% | NAV mua TB {t2['avg_cost_nav']:,.0f}")
        print(f"       (trong đó quỹ dự phòng còn lại chưa giải ngân: {t2['reserve_left']/1e6:,.1f} tr)")
        print(f"    >>> Chênh lệch  : giá trị {dl['final_value']/1e6:>+7,.2f} tr ({dl['final_value_pct']:+.2f}%) "
              f"| XIRR {dl['xirr_pp']:+.2f} điểm %")
        s = r["signal"]
        print(f"    Chất lượng tín hiệu (return quỹ SAU tháng đó):")
        print(f"      fwd 1 tháng: dưới MA50 {s['fwd1m_below_ma50']:+.2f}%  vs  trên MA50 {s['fwd1m_above_ma50']:+.2f}%  (chênh {s['fwd1m_edge_pp']:+.2f} đpt)")
        print(f"      fwd 3 tháng: dưới MA50 {s['fwd3m_below_ma50']:+.2f}%  vs  trên MA50 {s['fwd3m_above_ma50']:+.2f}%  (chênh {s['fwd3m_edge_pp']:+.2f} đpt)")

    wins = sum(1 for r in results if r["delta"]["final_value"] > 0)
    print(f"\n{'='*100}")
    print(f"KẾT LUẬN: TH2 thắng TH1 ở {wins}/{len(results)} quỹ.")
    avg_delta = sum(r["delta"]["final_value_pct"] for r in results) / len(results)
    avg_xirr = sum(r["delta"]["xirr_pp"] for r in results) / len(results)
    print(f"Chênh lệch giá trị cuối trung bình: {avg_delta:+.2f}%  ·  XIRR trung bình: {avg_xirr:+.2f} điểm %")
    print(f"{'='*100}\n")
    conn.close()


if __name__ == "__main__":
    main()
