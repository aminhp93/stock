#!/usr/bin/env python3
"""Kiểm định giả thiết: "Cổ phiếu / VN-Index mở gap thì LUÔN lấp gap".

CHỈ ĐỌC (SELECT). Script không bao giờ ghi vào DB.

Phương pháp (xem README trong docstring từng hàm):

1. Hai định nghĩa gap, test cả hai:
   - true gap  : open[t] > high[t-1]  (gap up)  |  open[t] < low[t-1]   (gap down)
   - common gap: open[t] > close[t-1] (gap up)  |  open[t] < close[t-1] (gap down)

2. "Lấp gap":
   - gap up  : có phiên sau (kể cả chính phiên gap) với low  <= high[t-1]  (true gap)
               hoặc low <= close[t-1] (common gap)  -> chạm lại mép gap.
   - gap down: có phiên sau với high >= low[t-1]  (true gap)
               hoặc high >= close[t-1] (common gap).
   Đo bằng SỐ PHIÊN GIAO DỊCH kể từ ngày gap:
       bars_to_fill = 0  -> lấp ngay trong phiên gap (intraday)
       bars_to_fill = k  -> lấp ở phiên thứ k sau ngày gap
   "Lấp trong N phiên"  <=>  bars_to_fill <= N.

3. Censoring: gap chưa lấp tính đến hết dữ liệu là RIGHT-CENSORED, giữ lại trong mẫu.
   censor_bars = số phiên từ ngày gap đến phiên cuối cùng có dữ liệu.
   Dùng Kaplan-Meier để ước lượng phân phối thời gian lấp mà không bỏ nhóm censored.

4. Thống kê tách: VN-Index vs cổ phiếu, gap up vs gap down, theo nhóm độ lớn gap.

5. Lọc nhiễu:
   - Giá trong DB LÀ GIÁ ĐÃ ĐIỀU CHỈNH cổ tức/chia tách, neo về nến gần nhất
     (xem backend/utils/price_ingest.py). Do đó gap down do ngày GDKHQ phần lớn
     đã được làm phẳng -> nhiễu cổ tức thấp. Vẫn cảnh giác gap rất lớn.
   - Bỏ mã thanh khoản thấp: median giá trị khớp lệnh ngày < NGUONG_GTGD.
   - Bỏ nến giá < NGUONG_GIA_SAN (penny) -> nhiễu làm tròn.
   - Bỏ gap > NGUONG_GAP_LOI (%) : gần như chắc chắn là lỗi dữ liệu / hợp nhất
     nến sau chuỗi ngừng giao dịch / corporate action sót.
"""

from __future__ import annotations

import argparse
import sys
import warnings

import numpy as np
import pandas as pd
import psycopg2

warnings.filterwarnings("ignore", message="pandas only supports SQLAlchemy")

DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

INDEX_SYMBOL = "VNINDEX"

# --- ngưỡng lọc nhiễu ---
NGUONG_GIA_SAN = 3000.0          # VND, bỏ nến close < mức này (penny / lỗi làm tròn)
NGUONG_GTGD = 1_000_000_000.0    # median (close*volume) >= 1 tỷ VND/phiên
NGUONG_MIN_PHIEN = 250           # mã phải có >= 250 phiên dữ liệu
NGUONG_GAP_LOI = 25.0            # bỏ gap có |open/close[t-1]-1| > 25% (nghi lỗi/CA)

PHIEN_MOC = [1, 5, 20, 60]
NHOM_DOLON = [(0.0, 1.0), (1.0, 3.0), (3.0, 5.0), (5.0, NGUONG_GAP_LOI)]


# ----------------------------------------------------------------------------
# Tải dữ liệu
# ----------------------------------------------------------------------------
def load_prices(conn) -> dict[str, pd.DataFrame]:
    """Trả về {symbol: df OHLCV sắp theo ngày}. CHỈ SELECT."""
    q = """
        SELECT symbol, trading_date,
               open_price::float8, high_price::float8,
               low_price::float8, close_price::float8, volume::float8
        FROM stock_prices
        WHERE open_price IS NOT NULL AND high_price IS NOT NULL
          AND low_price IS NOT NULL AND close_price IS NOT NULL
        ORDER BY symbol, trading_date
    """
    df = pd.read_sql(q, conn)
    out: dict[str, pd.DataFrame] = {}
    for sym, g in df.groupby("symbol", sort=False):
        g = g.reset_index(drop=True)
        out[sym] = g
    return out


def passes_liquidity(df: pd.DataFrame) -> bool:
    if len(df) < NGUONG_MIN_PHIEN:
        return False
    turnover = (df["close_price"] * df["volume"]).median()
    if not np.isfinite(turnover) or turnover < NGUONG_GTGD:
        return False
    if df["close_price"].median() < NGUONG_GIA_SAN:
        return False
    return True


# ----------------------------------------------------------------------------
# Phát hiện gap + đo thời gian lấp
# ----------------------------------------------------------------------------
def detect_gaps(df: pd.DataFrame, mode: str) -> list[dict]:
    """mode in {'true','common'}. Trả về list bản ghi gap.

    Mỗi bản ghi:
      dir       : 'up' | 'down'
      idx       : vị trí phiên gap trong df
      gap_pct   : (open/close[t-1]-1)*100  (dấu theo hướng, lưu trị tuyệt đối ở cột abs_pct)
      abs_pct   : |gap_pct|
      edge      : mức giá mép gap phải chạm lại
      bars_to_fill : int hoặc None (chưa lấp)
      censored  : bool
      censor_bars  : số phiên quan sát được nếu censored
    """
    o = df["open_price"].to_numpy()
    h = df["high_price"].to_numpy()
    lo = df["low_price"].to_numpy()
    c = df["close_price"].to_numpy()
    dates = df["trading_date"].to_numpy()
    # MA200 point-in-time (chỉ dùng nến quá khứ + hiện tại) để phân loại xu hướng
    ma200 = pd.Series(c).rolling(200, min_periods=200).mean().to_numpy()
    n = len(df)
    recs: list[dict] = []

    for t in range(1, n):
        pc, ph, pl = c[t - 1], h[t - 1], lo[t - 1]
        if pc <= 0:
            continue

        prev_ma200 = ma200[t - 1]
        if np.isnan(prev_ma200):
            trend = "n/a"
        else:
            trend = "uptrend" if pc >= prev_ma200 else "downtrend"

        if mode == "true":
            up = o[t] > ph
            down = o[t] < pl
            up_edge, down_edge = ph, pl
        else:  # common
            up = o[t] > pc
            down = o[t] < pc
            up_edge, down_edge = pc, pc

        for direction, is_gap, edge in (("up", up, up_edge), ("down", down, down_edge)):
            if not is_gap:
                continue
            abs_pct = abs(o[t] / pc - 1.0) * 100.0
            if abs_pct > NGUONG_GAP_LOI:
                continue

            def first_fill(start: int):
                for j in range(start, n):
                    if direction == "up" and lo[j] <= edge:
                        return j - t
                    if direction == "down" and h[j] >= edge:
                        return j - t
                return None

            b_incl = first_fill(t)      # kể cả chính phiên gap (intraday fill)
            b_excl = first_fill(t + 1)  # chỉ tính các phiên SAU ngày gap

            rec = dict(
                dir=direction,
                idx=t,
                date=pd.Timestamp(dates[t]).date(),
                trend=trend,
                abs_pct=abs_pct,
                edge=edge,
                bars_to_fill=b_incl,
                censored=b_incl is None,
                censor_bars=(n - 1 - t) if b_incl is None else None,
                bars_to_fill_excl=b_excl,
                censored_excl=b_excl is None,
                censor_bars_excl=(n - 1 - t) if b_excl is None else None,
            )
            recs.append(rec)
    return recs


# ----------------------------------------------------------------------------
# Kaplan-Meier
# ----------------------------------------------------------------------------
def kaplan_meier(event_times: np.ndarray, observed: np.ndarray):
    """event_times: thời gian (số phiên) đến lúc lấp hoặc đến lúc bị cắt.
    observed: True nếu quan sát được biến cố (đã lấp), False nếu censored.

    Trả về (t_grid, S) với S là hàm sống sót (xác suất CHƯA lấp sau t phiên).
    """
    et = np.asarray(event_times, dtype=float)
    ev = np.asarray(observed, dtype=bool)
    order = np.argsort(et)
    et, ev = et[order], ev[order]
    n_total = len(et)

    uniq = np.unique(et[ev])  # chỉ các thời điểm có biến cố
    S = 1.0
    t_grid, S_grid = [0.0], [1.0]
    for t in uniq:
        at_risk = np.sum(et >= t)
        d = np.sum((et == t) & ev)
        if at_risk == 0:
            continue
        S *= (1.0 - d / at_risk)
        t_grid.append(float(t))
        S_grid.append(S)
    return np.array(t_grid), np.array(S_grid), n_total


def km_prob_filled_by(t_grid, S_grid, t):
    """Xác suất đã lấp trong <= t phiên = 1 - S(t)."""
    idx = np.searchsorted(t_grid, t, side="right") - 1
    idx = max(idx, 0)
    return 1.0 - S_grid[idx]


def km_quantile(t_grid, S_grid, q):
    """Phân vị q của thời gian lấp: t nhỏ nhất sao cho (1-S(t)) >= q.
    Trả về None nếu đường KM không bao giờ đạt tới q (censoring quá nặng)."""
    target = 1.0 - q
    below = np.where(S_grid <= target + 1e-12)[0]
    if len(below) == 0:
        return None
    return t_grid[below[0]]


# ----------------------------------------------------------------------------
# Tổng hợp & in
# ----------------------------------------------------------------------------
def summarize(recs: list[dict], label: str, mode: str):
    if not recs:
        print(f"\n[{label}] ({mode} gap)  — không có gap nào sau khi lọc.")
        return

    df = pd.DataFrame(recs)
    lines = []
    lines.append(f"\n{'='*78}\n[{label}]  định nghĩa: {mode.upper()} GAP\n{'='*78}")

    for direction in ("up", "down"):
        sub = df[df["dir"] == direction]
        if sub.empty:
            continue
        total = len(sub)
        filled = int((~sub["censored"]).sum())
        censored = int(sub["censored"].sum())
        pct_filled = 100.0 * filled / total

        lines.append(f"\n--- GAP {direction.upper()}  ---")
        lines.append(f"Tổng số gap            : {total:,}")
        lines.append(f"Đã lấp (quan sát được): {filled:,}  ({pct_filled:.2f}%)")
        lines.append(f"Chưa lấp (right-censored): {censored:,}  ({100.0*censored/total:.2f}%)")

        if censored:
            cb = sub.loc[sub["censored"], "censor_bars"].astype(float)
            lines.append(
                f"  Nhóm chưa lấp đã 'treo': median {cb.median():.0f} phiên, "
                f"max {cb.max():.0f}, >=60 phiên: {int((cb>=60).sum())}, "
                f">=250 phiên: {int((cb>=250).sum())}"
            )

        # --- naive: chỉ trên nhóm đã lâp (có survivorship bias, in để đối chiếu) ---
        f = sub.loc[~sub["censored"], "bars_to_fill"].astype(float)
        if len(f):
            lines.append(
                "  [Naive, chỉ nhóm đã lấp — CÓ bias]  "
                f"min {f.min():.0f} | p25 {f.quantile(.25):.0f} | "
                f"median {f.median():.0f} | mean {f.mean():.1f} | "
                f"p75 {f.quantile(.75):.0f} | p90 {f.quantile(.90):.0f} | "
                f"p95 {f.quantile(.95):.0f} | max {f.max():.0f}"
            )
            intraday = int((f == 0).sum())
            lines.append(f"  Lấp NGAY trong phiên gap (bars=0): {intraday:,} "
                         f"({100.0*intraday/total:.1f}% tổng gap)")

        # --- Kaplan-Meier (xử lý censoring đúng) ---
        et = np.where(sub["censored"], sub["censor_bars"].astype(float),
                      sub["bars_to_fill"].astype(float))
        obs = ~sub["censored"].to_numpy()
        tg, sg, _ = kaplan_meier(et, obs)
        S_end = sg[-1]
        lines.append(f"  [Kaplan-Meier]  ước lượng tỉ lệ lấp cuối cùng "
                     f"(1 - S_cuối): {100.0*(1.0-S_end):.2f}%  "
                     f"(S_cuối = {S_end:.4f}, tại t={tg[-1]:.0f} phiên)")
        km_line = "  [Kaplan-Meier]  P(lấp trong <= N phiên): " + " | ".join(
            f"{N}p: {100.0*km_prob_filled_by(tg,sg,N):.1f}%" for N in PHIEN_MOC
        )
        lines.append(km_line)
        qs = []
        for q in (0.25, 0.5, 0.75, 0.90, 0.95):
            v = km_quantile(tg, sg, q)
            qs.append(f"p{int(q*100)}: " + ("—" if v is None else f"{v:.0f}"))
        lines.append("  [Kaplan-Meier]  phân vị thời gian lấp (phiên): " + " | ".join(qs))

        # --- định nghĩa NGHIÊM: chỉ tính lấp ở phiên SAU ngày gap (bỏ intraday) ---
        s_filled = int((~sub["censored_excl"]).sum())
        s_et = np.where(sub["censored_excl"], sub["censor_bars_excl"].astype(float),
                        sub["bars_to_fill_excl"].astype(float))
        s_obs = ~sub["censored_excl"].to_numpy()
        stg, ssg, _ = kaplan_meier(s_et, s_obs)
        s_qmed = km_quantile(stg, ssg, 0.5)
        lines.append(
            "  [Định nghĩa NGHIÊM, bỏ lấp intraday]  "
            f"lấp quan sát {100.0*s_filled/total:.2f}% | "
            f"KM lấp cuối {100.0*(1.0-ssg[-1]):.2f}% | "
            "KM P(<=N): " + " ".join(
                f"{N}p {100.0*km_prob_filled_by(stg,ssg,N):.0f}%" for N in PHIEN_MOC
            ) + f" | KM median {'—' if s_qmed is None else f'{s_qmed:.0f}p'}"
        )

        # --- phân nhóm theo độ lớn gap ---
        lines.append("  Theo độ lớn gap (|open/close[t-1]-1|):")
        for lo_b, hi_b in NHOM_DOLON:
            m = (sub["abs_pct"] >= lo_b) & (sub["abs_pct"] < hi_b)
            g = sub[m]
            if g.empty:
                continue
            g_total = len(g)
            g_filled = int((~g["censored"]).sum())
            g_et = np.where(g["censored"], g["censor_bars"].astype(float),
                            g["bars_to_fill"].astype(float))
            g_obs = ~g["censored"].to_numpy()
            gtg, gsg, _ = kaplan_meier(g_et, g_obs)
            g_med = km_quantile(gtg, gsg, 0.5)
            name = f"{lo_b:g}-{hi_b:g}%" if hi_b < NGUONG_GAP_LOI else f">{lo_b:g}%"
            lines.append(
                f"    {name:<9}: n={g_total:<6,} | lấp quan sát {100.0*g_filled/g_total:5.1f}% "
                f"| KM lấp cuối {100.0*(1.0-gsg[-1]):5.1f}% "
                f"| KM P(<=20p) {100.0*km_prob_filled_by(gtg,gsg,20):5.1f}% "
                f"| KM median {'—' if g_med is None else f'{g_med:.0f}p'}"
            )

    print("\n".join(lines))
    return df


FINE_BUCKETS = [
    (0.0, 0.25), (0.25, 0.5), (0.5, 1.0), (1.0, 1.5),
    (1.5, 2.0), (2.0, 3.0), (3.0, 5.0), (5.0, NGUONG_GAP_LOI),
]

TTF_BINS = [
    ("0 phiên (intraday)", lambda b: b == 0),
    ("1 phiên",            lambda b: b == 1),
    ("2-3 phiên",          lambda b: 2 <= b <= 3),
    ("4-5 phiên",          lambda b: 4 <= b <= 5),
    ("6-10 phiên",         lambda b: 6 <= b <= 10),
    ("11-20 phiên",        lambda b: 11 <= b <= 20),
    ("21-60 phiên",        lambda b: 21 <= b <= 60),
    ("61-120 phiên",       lambda b: 61 <= b <= 120),
    (">120 phiên",         lambda b: b > 120),
]


def _km_sub(sub: pd.DataFrame, excl: bool = False):
    cens = "censored_excl" if excl else "censored"
    cb = "censor_bars_excl" if excl else "censor_bars"
    btf = "bars_to_fill_excl" if excl else "bars_to_fill"
    et = np.where(sub[cens], sub[cb].astype(float), sub[btf].astype(float))
    obs = ~sub[cens].to_numpy()
    return kaplan_meier(et, obs)


def _p(v):
    return "—" if v is None else f"{v:.0f}"


def vnindex_detail(df: pd.DataFrame, mode: str):
    recs = detect_gaps(df, mode)
    d = pd.DataFrame(recs)
    print(f"\n{'#'*90}\n#  VN-INDEX — {mode.upper()} GAP  (2021-01-04 → {df['trading_date'].max()})\n{'#'*90}")

    for direction in ("up", "down"):
        sub = d[d["dir"] == direction].copy()
        total = len(sub)
        filled = sub[~sub["censored"]]
        cens = sub[sub["censored"]]
        tg, sg, _ = _km_sub(sub)
        stg, ssg, _ = _km_sub(sub, excl=True)
        print(f"\n{'='*90}\nGAP {direction.upper()}  —  tổng {total} gap")
        print(f"{'='*90}")
        print(f"  Đã lấp (quan sát)      : {len(filled)}  ({100*len(filled)/total:.2f}%)")
        print(f"  Chưa lấp (right-censored): {len(cens)}  ({100*len(cens)/total:.2f}%)")
        print(f"  [KM incl. intraday] lấp cuối cùng {100*(1-sg[-1]):.2f}%  | "
              f"median {_p(km_quantile(tg,sg,.5))}p  p75 {_p(km_quantile(tg,sg,.75))}p  "
              f"p90 {_p(km_quantile(tg,sg,.9))}p  p95 {_p(km_quantile(tg,sg,.95))}p")
        print(f"  [KM strict, bỏ intraday] lấp cuối cùng {100*(1-ssg[-1]):.2f}%  | "
              f"median {_p(km_quantile(stg,ssg,.5))}p  p75 {_p(km_quantile(stg,ssg,.75))}p  "
              f"p90 {_p(km_quantile(stg,ssg,.9))}p  p95 {_p(km_quantile(stg,ssg,.95))}p")
        print(f"  P(lấp ≤ N phiên): " + " | ".join(
            f"{N}p {100*km_prob_filled_by(tg,sg,N):.1f}%" for N in (1, 5, 20, 60, 120)))

        # ---- phân phối thời gian lấp ----
        print("\n  Phân phối thời gian lấp:")
        print(f"    {'nhóm':<22}{'số gap':>9}{'% tổng':>9}{'% cộng dồn':>12}")
        bvals = filled["bars_to_fill"].astype(int).to_numpy()
        cum = 0
        for label, fn in TTF_BINS:
            k = int(np.sum([fn(b) for b in bvals])) if len(bvals) else 0
            cum += k
            print(f"    {label:<22}{k:>9,}{100*k/total:>8.1f}%{100*cum/total:>11.1f}%")
        print(f"    {'CHƯA LẤP':<22}{len(cens):>9,}{100*len(cens)/total:>8.1f}%{100.0:>11.1f}%")

        # ---- bucket độ lớn gap mịn ----
        print("\n  Theo độ lớn gap (|open/close[t-1]-1|):")
        print(f"    {'bucket':<12}{'n':>6}{'KM lấp cuối':>13}{'median':>9}{'p75':>7}"
              f"{'p90':>7}{'p95':>7}{'max thực':>10}")
        for lo_b, hi_b in FINE_BUCKETS:
            g = sub[(sub["abs_pct"] >= lo_b) & (sub["abs_pct"] < hi_b)]
            if g.empty:
                continue
            gtg, gsg, _ = _km_sub(g)
            gf = g[~g["censored"]]
            mx = int(gf["bars_to_fill"].max()) if len(gf) else None
            name = f">{lo_b:g}%" if hi_b >= NGUONG_GAP_LOI else f"{lo_b:g}-{hi_b:g}%"
            print(f"    {name:<12}{len(g):>6}{100*(1-gsg[-1]):>12.1f}%"
                  f"{_p(km_quantile(gtg,gsg,.5)):>9}{_p(km_quantile(gtg,gsg,.75)):>7}"
                  f"{_p(km_quantile(gtg,gsg,.9)):>7}{_p(km_quantile(gtg,gsg,.95)):>7}"
                  f"{('—' if mx is None else str(mx)):>10}")

        # ---- theo năm ----
        print("\n  Theo năm xảy ra gap:")
        print(f"    {'năm':<6}{'n':>6}{'đã lấp':>9}{'KM lấp cuối':>13}{'KM median':>11}{'KM p90':>9}")
        sub["year"] = pd.to_datetime(sub["date"]).dt.year
        for y in sorted(sub["year"].unique()):
            g = sub[sub["year"] == y]
            gtg, gsg, _ = _km_sub(g)
            nf = int((~g["censored"]).sum())
            print(f"    {y:<6}{len(g):>6}{100*nf/len(g):>8.1f}%{100*(1-gsg[-1]):>12.1f}%"
                  f"{_p(km_quantile(gtg,gsg,.5)):>11}{_p(km_quantile(gtg,gsg,.9)):>9}")

        # ---- theo xu hướng (close[t-1] vs MA200) ----
        print("\n  Theo xu hướng thị trường tại thời điểm gap (close[t-1] vs MA200):")
        print(f"    {'xu hướng':<12}{'n':>6}{'đã lấp':>9}{'KM lấp cuối':>13}"
              f"{'KM P(≤20p)':>12}{'KM median':>11}")
        for tr in ("uptrend", "downtrend", "n/a"):
            g = sub[sub["trend"] == tr]
            if g.empty:
                continue
            gtg, gsg, _ = _km_sub(g)
            nf = int((~g["censored"]).sum())
            print(f"    {tr:<12}{len(g):>6}{100*nf/len(g):>8.1f}%{100*(1-gsg[-1]):>12.1f}%"
                  f"{100*km_prob_filled_by(gtg,gsg,20):>11.1f}%{_p(km_quantile(gtg,gsg,.5)):>11}")

    # ---- danh sách gap chưa lấp (cả 2 hướng) ----
    cens_all = d[d["censored"]].sort_values("date")
    print(f"\n{'='*90}\nCÁC GAP VN-INDEX CHƯA LẤP tính đến {df['trading_date'].max()} "
          f"({len(cens_all)} gap)\n{'='*90}")
    print(f"  {'ngày gap':<12}{'hướng':<7}{'độ lớn':>9}{'mép cần chạm':>15}{'đã treo (phiên)':>18}")
    for _, r in cens_all.iterrows():
        print(f"  {str(r['date']):<12}{r['dir']:<7}{r['abs_pct']:>8.2f}%"
              f"{r['edge']:>15,.2f}{int(r['censor_bars']):>18,}")

    # ---- top 10 lấp lâu nhất ----
    slow = d[~d["censored"]].nlargest(10, "bars_to_fill")
    print(f"\n{'='*90}\nTOP 10 GAP LẤP LÂU NHẤT\n{'='*90}")
    print(f"  {'ngày gap':<12}{'hướng':<7}{'độ lớn':>9}{'số phiên để lấp':>18}")
    for _, r in slow.iterrows():
        print(f"  {str(r['date']):<12}{r['dir']:<7}{r['abs_pct']:>8.2f}%{int(r['bars_to_fill']):>18,}")


def run(mode: str, prices: dict[str, pd.DataFrame], liquid_syms: set[str]):
    # VN-Index
    if INDEX_SYMBOL in prices:
        idx_recs = detect_gaps(prices[INDEX_SYMBOL], mode)
        summarize(idx_recs, "VN-INDEX", mode)
    else:
        print(f"⚠️  Không tìm thấy {INDEX_SYMBOL} trong DB")

    # Cổ phiếu (gộp toàn bộ mã đạt thanh khoản)
    all_recs: list[dict] = []
    for sym in liquid_syms:
        all_recs.extend(detect_gaps(prices[sym], mode))
    summarize(all_recs, f"CỔ PHIẾU (gộp {len(liquid_syms)} mã đạt thanh khoản)", mode)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["true", "common", "both", "vnindex"],
                    default="both",
                    help="vnindex = báo cáo chi tiết chỉ cho VN-Index (cả 2 định nghĩa)")
    args = ap.parse_args()

    conn = psycopg2.connect(**DB)
    conn.set_session(readonly=True, autocommit=True)  # hàng rào cứng: read-only
    try:
        print("Đang tải giá từ stock_prices ...")
        prices = load_prices(conn)
    finally:
        conn.close()

    total_bars = sum(len(v) for v in prices.values())
    print(f"Đã tải {len(prices):,} mã / {total_bars:,} nến "
          f"({min(v['trading_date'].min() for v in prices.values())} "
          f"-> {max(v['trading_date'].max() for v in prices.values())})")

    liquid = {s for s, d in prices.items()
              if s != INDEX_SYMBOL and passes_liquidity(d)}
    print(f"Số mã đạt bộ lọc thanh khoản (median GTGD >= {NGUONG_GTGD/1e9:g} tỷ, "
          f"giá >= {NGUONG_GIA_SAN:,.0f}, >= {NGUONG_MIN_PHIEN} phiên): {len(liquid):,}")

    if args.mode == "vnindex":
        if INDEX_SYMBOL not in prices:
            print(f"⚠️  Không tìm thấy {INDEX_SYMBOL} trong DB")
            return
        for m in ("true", "common"):
            vnindex_detail(prices[INDEX_SYMBOL], m)
    else:
        modes = ["true", "common"] if args.mode == "both" else [args.mode]
        for m in modes:
            run(m, prices, liquid)

    print("\n" + "#" * 78)
    print("GHI CHÚ PHƯƠNG PHÁP")
    print("#" * 78)
    print(f"""
- Giá đã điều chỉnh cổ tức/chia tách (anchored, xem backend/utils/price_ingest.py)
  => nhiễu gap-down do ngày GDKHQ phần lớn đã được khử. Không loại trừ hoàn toàn
     sai số làm tròn nến cũ; đã bù bằng bộ lọc giá sàn {NGUONG_GIA_SAN:,.0f} VND.
- Gap > {NGUONG_GAP_LOI:g}% bị loại (nghi lỗi dữ liệu / gộp nến sau ngừng GD / CA sót).
- "bars_to_fill = 0" nghĩa là lấp ngay trong phiên gap (low/high chạm lại mép ngay ngày đó).
- Kaplan-Meier: nhóm chưa lấp KHÔNG bị bỏ, được đưa vào dạng right-censored.
  "KM lấp cuối" = 1 - S tại thời điểm quan sát cuối; nếu < 100% nghĩa là DỮ LIỆU
  BÁC BỎ giả thiết "LUÔN lấp".
""")


if __name__ == "__main__":
    sys.exit(main())
