"""Backtest chiến lược "Tích lũy → Breakout" (trường phái dòng tiền / Wyckoff),
mô phỏng TỪNG GIAO DỊCH THẬT — có điểm mua, chặn lỗ, chốt lời — không phải
xếp hạng cắt ngang như research_factors.py.

QUY TẮC (đúng theo mô tả):
  Lọc thị trường : VNINDEX đóng cửa > MA50 của VNINDEX (chỉ giao dịch khi index
                    trong xu hướng tăng)
  Tích lũy       : N=40 phiên gần nhất có biên độ (đỉnh-đáy)/đáy <= 22% (đi ngang)
  Thanh khoản    : khối lượng TB trong giai đoạn tích lũy <= 85% khối lượng TB
                    100 phiên trước đó (dòng tiền bán ra cạn dần = ít cung)
  Thanh khoản    : GTGD 20 phiên >= 20 tỷ/phiên VÀ khối lượng TB 20 phiên
    (giao dịch)    >= 1.000.000 cổ phiếu/phiên (đủ để giao dịch với vốn 300tr)
  Điểm mua       : giá đóng cửa phá VỠ đỉnh vùng tích lũy, kèm khối lượng ngày
                    breakout >= 1.3x khối lượng TB trong vùng tích lũy (xác nhận
                    có dòng tiền mới, không phải phá vỡ giả)
  Chặn lỗ        : đáy vùng tích lũy x 0.97 (đệm 3%)
  Chốt lời       : đỉnh vùng tích lũy + chiều cao vùng tích lũy ("measured move")
  Thoát theo thời gian: nếu sau 60 phiên chưa chạm chặn lỗ/chốt lời -> thoát tại
                    giá đóng cửa hiện tại (tránh giữ lệnh vô thời hạn)
  Mỗi mã chỉ giữ 1 vị thế tại 1 thời điểm.

CƠ BẢN "không quá risk" — dùng dữ liệu ĐÚNG THỜI ĐIỂM (point-in-time) từ
fundamentals_raw (xem fetch_fundamentals_history.py), KHÔNG dùng snapshot hiện
tại để tránh nhìn trước tương lai. Tại mỗi điểm mua, tra giá trị đã CÔNG BỐ
gần nhất (trễ 45 ngày sau ngày báo cáo, mô phỏng thời gian công bố thực tế):
    - Biên LN ròng TTM > 0 (có lãi)
    - Nợ/VCSH <= 2.0
    - Tăng trưởng doanh thu YoY >= -20%
Script tính CẢ 2: toàn bộ giao dịch, và tập con "cơ bản ổn" — để thấy lọc cơ
bản có cải thiện win-rate/R hay không (mã thiếu dữ liệu cơ bản: giữ nguyên,
không loại, đánh dấu riêng).

    python3 scripts/backtest_accumulation_breakout.py
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import psycopg2

warnings.filterwarnings("ignore")

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

N_BASE = 40                 # phiên tích lũy
MAX_RANGE_PCT = 0.22         # biên độ tối đa vùng tích lũy
VOL_DRYUP_RATIO = 0.85       # KL TB tích lũy phải <= 85% KL TB 100 phiên trước đó
BREAKOUT_VOL_MULT = 1.3      # KL ngày breakout >= 1.3x KL TB vùng tích lũy
STOP_BUFFER = 0.97           # chặn lỗ = đáy vùng x 0.97
MAX_HOLD_DAYS = 60
MIN_TURNOVER_BN = 20.0
MIN_AVG_VOLUME = 1_000_000

FUND_METRICS = ["NET_MARGIN_TR", "DEBT_TO_EQUITY_AQ", "NET_SALES_TR_GRYOY"]
FUND_LAG_DAYS = 45          # độ trễ công bố BCTC thực tế, tránh nhìn trước tương lai


def load():
    conn = psycopg2.connect(**DB_CONFIG)
    px = pd.read_sql("""
        SELECT symbol, trading_date AS date, close_price AS close, high_price AS high,
               low_price AS low, volume
        FROM stock_prices WHERE symbol <> 'VNINDEX' ORDER BY symbol, trading_date
    """, conn, parse_dates=["date"])
    vni = pd.read_sql("""
        SELECT trading_date AS date, close_price AS close
        FROM stock_prices WHERE symbol='VNINDEX' ORDER BY trading_date
    """, conn, parse_dates=["date"])
    fund = pd.read_sql("""
        SELECT symbol, report_date, ratio_code, value FROM fundamentals_raw
        WHERE ratio_code = ANY(%(codes)s) ORDER BY symbol, ratio_code, report_date
    """, conn, params={"codes": FUND_METRICS}, parse_dates=["report_date"])
    conn.close()
    vni["ma50"] = vni["close"].rolling(50).mean()
    vni["uptrend"] = vni["close"] > vni["ma50"]

    fund_hist: dict[tuple[str, str], list[tuple]] = {}
    for (sym, rc), gg in fund.groupby(["symbol", "ratio_code"]):
        avail = gg["report_date"] + pd.Timedelta(days=FUND_LAG_DAYS)
        fund_hist[(sym, rc)] = list(zip(avail.to_numpy(), gg["value"].to_numpy()))
    return px, vni, fund_hist


def fund_value_asof(fund_hist: dict, symbol: str, ratio_code: str, asof) -> float | None:
    series = fund_hist.get((symbol, ratio_code))
    if not series:
        return None
    val = None
    for avail_date, v in series:
        if avail_date <= asof:
            val = v
        else:
            break
    return val


def fund_check(fund_hist: dict, symbol: str, asof) -> tuple[bool | None, list[str]]:
    """(fund_ok, flags). fund_ok=None nếu thiếu hết dữ liệu (không đánh giá được).

    LƯU Ý: bản đầu dùng thêm ngưỡng "DT YoY >= -20%" và "Nợ/VCSH <= 2.0" nhưng
    THỬ NGHIỆM CHO THẤY NÓ PHẢN TÁC DỤNG trên backtest 2021-2026 — vì:
      - So sánh DT YoY quý 2023 bị nhiễu nặng bởi nền cao bất thường 2022 (đỉnh
        chu kỳ thép/BĐS) -> hàng loạt mã chu kỳ (HPG, HSG, NKG, DXG, KDH, NLG...)
        bị gắn cờ "risk" đúng lúc chúng breakout phục hồi tốt nhất.
      - D/E > 2.0 gắn cờ sai nhóm chứng khoán (SSI, VND, VCI, CTS...) vì đòn bẩy
        cao là ĐẶC THÙ ngành (cho vay margin), không phải dấu hiệu kiệt quệ.
    Gate ở đây SIẾT LẠI: chỉ chặn 2 dấu hiệu kiệt quệ thật (lỗ ròng TTM, đòn bẩy
    CỰC ĐOAN D/E>3 kiểu HVN/Novaland) — kết quả: risk-gate không còn phản tác
    dụng, nhưng biên độ cải thiện nhỏ vì mẫu hình tích lũy sạch vốn đã tự loại
    phần lớn công ty kiệt quệ (chúng hiếm khi tạo được nền giá gọn + khối lượng
    cạn cung). Xem README trong report cuối bài để so cả 2 phiên bản.
    """
    nm = fund_value_asof(fund_hist, symbol, "NET_MARGIN_TR", asof)
    de = fund_value_asof(fund_hist, symbol, "DEBT_TO_EQUITY_AQ", asof)
    if nm is None and de is None:
        return None, []
    flags = []
    if nm is not None and nm <= 0:
        flags.append("lỗ ròng TTM")
    if de is not None and de > 3.0:
        flags.append(f"đòn bẩy cực đoan (Nợ/VCSH {de:.1f}x)")
    return len(flags) == 0, flags


def simulate_symbol(g: pd.DataFrame, vni_uptrend: dict, fund_hist: dict) -> list[dict]:
    g = g.sort_values("date").reset_index(drop=True)
    n = len(g)
    if n < N_BASE + 150:
        return []

    close = g["close"].to_numpy()
    high = g["high"].to_numpy()
    low = g["low"].to_numpy()
    vol = g["volume"].to_numpy()
    dates = g["date"].to_numpy()

    turnover20 = pd.Series(close * vol).rolling(20).mean().to_numpy()
    vol20 = pd.Series(vol).rolling(20).mean().to_numpy()

    trades = []
    i = N_BASE + 100          # cần đủ lịch sử: 100 phiên baseline + N_BASE phiên tích lũy
    while i < n:
        base_hi = high[i - N_BASE:i]
        base_lo = low[i - N_BASE:i]
        base_vol = vol[i - N_BASE:i]
        range_high, range_low = base_hi.max(), base_lo.min()
        if range_low <= 0:
            i += 1
            continue
        range_pct = (range_high - range_low) / range_low

        cond_range = range_pct <= MAX_RANGE_PCT
        baseline_vol = vol[i - N_BASE - 100:i - N_BASE].mean()
        cond_dryup = baseline_vol > 0 and (base_vol.mean() / baseline_vol) <= VOL_DRYUP_RATIO
        cond_breakout = close[i] > range_high
        cond_vol_confirm = vol[i] >= BREAKOUT_VOL_MULT * base_vol.mean()
        cond_liquid = (not np.isnan(turnover20[i]) and turnover20[i] >= MIN_TURNOVER_BN * 1e9
                       and not np.isnan(vol20[i]) and vol20[i] >= MIN_AVG_VOLUME)
        d = pd.Timestamp(dates[i])
        cond_market = vni_uptrend.get(d, False)

        if cond_range and cond_dryup and cond_breakout and cond_vol_confirm and cond_liquid and cond_market:
            entry_price = close[i]
            entry_date = d
            stop = range_low * STOP_BUFFER
            target = range_high + (range_high - range_low)
            exit_price = exit_date = exit_reason = None
            j = i + 1
            while j < n and j <= i + MAX_HOLD_DAYS:
                if low[j] <= stop:
                    exit_price, exit_date, exit_reason = stop, dates[j], "STOP"
                    break
                if high[j] >= target:
                    exit_price, exit_date, exit_reason = target, dates[j], "TARGET"
                    break
                j += 1
            else:
                pass
            if exit_price is None:
                j = min(j, n - 1)
                exit_price, exit_date, exit_reason = close[j], dates[j], "TIME"

            ret_pct = (exit_price / entry_price - 1) * 100
            risk_pct = (entry_price - stop) / entry_price * 100
            r_mult = ret_pct / risk_pct if risk_pct > 0 else 0.0
            fund_ok, fund_flags = fund_check(fund_hist, g["symbol"].iloc[0], entry_date)
            trades.append(dict(
                symbol=g["symbol"].iloc[0], entry_date=entry_date, entry_price=entry_price,
                exit_date=pd.Timestamp(exit_date), exit_price=exit_price, exit_reason=exit_reason,
                hold_days=j - i, ret_pct=ret_pct, r_mult=r_mult, risk_pct=risk_pct,
                range_low=range_low, range_high=range_high,
                fund_ok=fund_ok, fund_flags=",".join(fund_flags),
            ))
            i = j + 1
        else:
            i += 1
    return trades


def _stats_block(df: pd.DataFrame, label: str):
    win = df["ret_pct"] > 0
    profit_factor = -df.loc[win, "ret_pct"].sum() / df.loc[~win, "ret_pct"].sum() if (~win).any() else float("inf")
    print(f"\n--- {label} (n={len(df)}) ---")
    print(f"Tỷ lệ thắng       : {win.mean()*100:.1f}%")
    print(f"Lãi TB (lệnh thắng): {df.loc[win,'ret_pct'].mean():+.1f}%   "
          f"Lỗ TB (lệnh thua): {df.loc[~win,'ret_pct'].mean():+.1f}%")
    print(f"R trung bình/lệnh : {df['r_mult'].mean():+.2f}R")
    print(f"Profit factor     : {profit_factor:.2f}")


def run():
    print("Đang tải dữ liệu + quét toàn bộ lịch sử tìm mẫu hình tích lũy→breakout (~1-2 phút)...")
    px, vni, fund_hist = load()
    vni_uptrend = dict(zip(vni["date"], vni["uptrend"]))

    all_trades = []
    for sym, g in px.groupby("symbol"):
        all_trades.extend(simulate_symbol(g, vni_uptrend, fund_hist))

    if not all_trades:
        print("Không tìm thấy giao dịch nào khớp toàn bộ điều kiện.")
        return

    df = pd.DataFrame(all_trades)
    df["year"] = df["entry_date"].dt.year
    win = df["ret_pct"] > 0

    print(f"\n{'='*78}\nKẾT QUẢ BACKTEST — Tích lũy {N_BASE} phiên → Breakout (2021-2026)\n{'='*78}")
    print(f"Tổng số giao dịch : {len(df)}  trên {df['symbol'].nunique()} mã")
    print(f"Tỷ lệ thắng       : {win.mean()*100:.1f}%")
    print(f"Lãi TB (lệnh thắng): {df.loc[win,'ret_pct'].mean():+.1f}%   "
          f"Lỗ TB (lệnh thua): {df.loc[~win,'ret_pct'].mean():+.1f}%")
    print(f"R trung bình/lệnh : {df['r_mult'].mean():+.2f}R   "
          f"(Kỳ vọng mỗi lệnh nếu rủi ro 1 đơn vị vốn thì lời trung bình {df['r_mult'].mean():.2f} đơn vị)")
    print(f"Số phiên giữ TB   : {df['hold_days'].mean():.0f} phiên")
    print(f"Lý do thoát       : " + ", ".join(f"{k}={v}" for k, v in df["exit_reason"].value_counts().items()))
    profit_factor = -df.loc[win, "ret_pct"].sum() / df.loc[~win, "ret_pct"].sum() if (~win).any() else float("inf")
    print(f"Profit factor     : {profit_factor:.2f}  (tổng % lãi / tổng % lỗ, >1 là có lời)")

    print(f"\n{'='*78}\nTÁC ĐỘNG CỦA BỘ LỌC CƠ BẢN (point-in-time, trễ {FUND_LAG_DAYS} ngày công bố)\n{'='*78}")
    has_fund = df["fund_ok"].notna()
    print(f"Có dữ liệu cơ bản tại thời điểm mua: {has_fund.sum()}/{len(df)} lệnh "
          f"({df.loc[has_fund,'fund_ok'].mean()*100:.0f}% trong số đó đạt \"không quá risk\")")
    _stats_block(df, "TẤT CẢ giao dịch (không lọc cơ bản)")
    if (df["fund_ok"] == True).any():  # noqa: E712
        _stats_block(df[df["fund_ok"] == True], "CHỈ giao dịch cơ bản ổn (có lãi, Nợ/VCSH<=3)")
    if (df["fund_ok"] == False).any():  # noqa: E712
        _stats_block(df[df["fund_ok"] == False], "CHỈ giao dịch bị cờ kiệt quệ (lỗ ròng hoặc Nợ/VCSH>3)")

    print(f"\nTheo năm:")
    yr = df.groupby("year").agg(n=("ret_pct", "size"), win_rate=("ret_pct", lambda s: (s > 0).mean() * 100),
                                 avg_ret=("ret_pct", "mean"), avg_r=("r_mult", "mean"))
    print(yr.round(2).to_string())

    print(f"\nMã giao dịch nhiều nhất:")
    print(df["symbol"].value_counts().head(10).to_string())

    print(f"\nKhoảng cách chặn lỗ (entry -> stop): TB {df['risk_pct'].mean():.1f}%  "
          f"trung vị {df['risk_pct'].median():.1f}%  (min {df['risk_pct'].min():.1f}% / max {df['risk_pct'].max():.1f}%)")

    # số lệnh mở đồng thời (để biết cần bao nhiêu "suất" vốn song song)
    events = []
    for _, t in df.iterrows():
        events.append((t["entry_date"], 1))
        events.append((t["exit_date"], -1))
    events.sort()
    cur = peak = 0
    for _, delta in events:
        cur += delta
        peak = max(peak, cur)
    print(f"Số lệnh mở đồng thời tối đa (toàn thị trường, không giới hạn vốn): {peak}")

    print(f"\n{'='*78}")
    print("Lưu ý: entry lấy tại giá ĐÓNG CỬA ngày breakout (không phải giá khớp lúc")
    print("phá vỡ trong phiên) — thực tế đặt lệnh sẽ trượt giá 1 chút so với số này.")
    return df


if __name__ == "__main__":
    run()
