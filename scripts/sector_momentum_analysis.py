"""
Phân tích hiệu suất 5 nhóm ngành từ dữ liệu PostgreSQL (stock_db).

Ngành: Chứng khoán, Ngân hàng, Bất động sản (nhà ở), BĐS Khu công nghiệp,
       Thép, Đầu tư công.

Phương pháp:
- DB KHÔNG có trường phân ngành chuẩn (cột `sector` chỉ là tên gọi tắt công ty).
  => Rổ ngành được DỰNG THỦ CÔNG theo danh sách mã bên dưới. Đây KHÔNG phải
  chỉ số ngành chính thức (ICB/GICS/VNAllShare).
- DB KHÔNG có vốn hóa / khối lượng niêm yết => chỉ số ngành = BÌNH QUÂN GIẢN ĐƠN
  giá điều chỉnh đã chuẩn hóa (mỗi mã rebase = 100 tại phiên gốc chung), rồi lấy
  trung bình cộng ngang quyền (equal-weight).
- Đáy ngành: giá trị nhỏ nhất của chỉ số ngành trong toàn bộ lịch sử DB
  (2021-01-04 .. phiên gần nhất). Mỗi ngành có đáy riêng.
- Thanh khoản: GTGD/phiên = tổng(close * volume) các mã trong rổ.

CHỈ SELECT. Không ghi DB.
Chạy:  PYTHONPATH=. python3 scripts/sector_momentum_analysis.py
"""
import datetime as dt
import numpy as np
import pandas as pd
from backend.db.postgres import PostgresDBManager

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 40)

BASKETS = {
    "Chứng khoán": ["SSI", "VND", "VCI", "HCM", "VIX", "SHS", "MBS", "FTS", "BSI", "CTS", "AGR", "ORS"],
    "Ngân hàng": ["VCB", "BID", "CTG", "TCB", "MBB", "VPB", "ACB", "HDB", "STB", "VIB",
                   "TPB", "SHB", "LPB", "MSB", "OCB", "EIB", "SSB", "NAB"],
    "Bất động sản (nhà ở)": ["VHM", "VIC", "VRE", "NVL", "PDR", "DXG", "KDH", "NLG", "DIG", "CEO", "HDC", "IJC"],
    "BĐS Khu công nghiệp": ["KBC", "SZC", "IDC"],
    "Thép": ["HPG", "HSG", "NKG", "TVN", "SMC", "POM", "VGS", "TLH"],
    # C4G, HT1 không có trong DB -> loại khỏi rổ, ghi chú trong báo cáo
    "Đầu tư công": ["VCG", "HHV", "LCG", "FCN", "CII", "KSB", "PLC", "DHA", "BCC", "BTS"],
}

MISSING_NOTE = ["C4G", "HT1"]  # không có dữ liệu trong DB


def load_prices(symbols):
    db = PostgresDBManager()
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT symbol, trading_date, close_price, volume "
            "FROM stock_prices WHERE symbol = ANY(%s) ORDER BY trading_date",
            (list(symbols),),
        )
        rows = cur.fetchall()
    finally:
        db._release(conn)
    df = pd.DataFrame(rows, columns=["symbol", "date", "close", "volume"])
    df["date"] = pd.to_datetime(df["date"])
    df["close"] = df["close"].astype(float)
    df["volume"] = df["volume"].astype(float)
    return df


def build_index(df, symbols):
    """Equal-weight, rebase 100 tại phiên chung đầu tiên."""
    wide = df[df.symbol.isin(symbols)].pivot(index="date", columns="symbol", values="close").sort_index()
    wide = wide.reindex(columns=[s for s in symbols if s in wide.columns])
    # phiên gốc = phiên đầu tiên mà TẤT CẢ mã trong rổ đều có giá
    base_row = wide.dropna().index.min()
    norm = wide.divide(wide.loc[base_row]) * 100.0
    idx = norm.mean(axis=1, skipna=True)
    return idx, base_row, wide


def turnover_series(df, symbols):
    sub = df[df.symbol.isin(symbols)].copy()
    sub["turnover"] = sub["close"] * sub["volume"]
    return sub.groupby("date")["turnover"].sum().sort_index()


def rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss
    return 100 - 100 / (1 + rs)


def nearest_on_or_before(series, target_date):
    s = series[series.index <= target_date]
    if s.empty:
        return None, None
    return s.index[-1], s.iloc[-1]


def pct(a, b):
    return (a / b - 1.0) * 100.0


def analyze_index(name, idx, turn, vnindex):
    last_date = idx.index[-1]
    last_val = idx.iloc[-1]

    trough_val = idx.min()
    trough_date = idx.idxmin()
    months_since = (last_date - trough_date).days / 30.44

    peak_val = idx.max()
    peak_date = idx.idxmax()

    # VN-Index cùng kỳ từ đáy ngành
    _, vni_at_trough = nearest_on_or_before(vnindex, trough_date)
    vni_last = vnindex.iloc[-1]
    vni_since_trough = pct(vni_last, vni_at_trough)

    out = {
        "Ngành": name,
        "Đáy (ngày)": trough_date.date().isoformat(),
        "Chỉ số đáy": round(trough_val, 1),
        "Hiện tại": round(last_val, 1),
        "% từ đáy": round(pct(last_val, trough_val), 1),
        "Số tháng từ đáy": round(months_since, 1),
        "VN-Index cùng kỳ %": round(vni_since_trough, 1),
        "Alpha vs VNI (điểm %)": round(pct(last_val, trough_val) - vni_since_trough, 1),
        "Đỉnh LS (ngày)": peak_date.date().isoformat(),
        "Cách đỉnh LS %": round(pct(last_val, peak_val), 1),
    }

    # hiệu suất theo khung
    windows = {"1 tháng": 30, "3 tháng": 91, "6 tháng": 182, "1 năm": 365}
    for label, days in windows.items():
        _, v = nearest_on_or_before(idx, last_date - pd.Timedelta(days=days))
        out[label] = round(pct(last_val, v), 1) if v else None
    # YTD
    _, v_ytd = nearest_on_or_before(idx, pd.Timestamp("2025-12-31"))
    out["YTD 2026"] = round(pct(last_val, v_ytd), 1) if v_ytd else None

    # kỹ thuật trên chỉ số ngành
    ma50 = idx.rolling(50).mean().iloc[-1]
    ma200 = idx.rolling(200).mean().iloc[-1]
    out["Giá/MA50 %"] = round(pct(last_val, ma50), 1)
    out["Giá/MA200 %"] = round(pct(last_val, ma200), 1)
    out["RSI(14)"] = round(rsi(idx).iloc[-1], 1)
    logret = np.log(idx / idx.shift(1)).dropna()
    vol60_daily = logret.iloc[-60:].std() * 100
    out["Biến động 60p (%/ngày)"] = round(vol60_daily, 2)
    out["Biến động 60p (năm hóa %)"] = round(vol60_daily * np.sqrt(252), 1)

    # thanh khoản
    t20 = turn.iloc[-20:].mean()
    t252 = turn.iloc[-252:].mean()
    out["GTGD 20p (tỷ đ)"] = round(t20 / 1e9, 0)
    out["GTGD 252p (tỷ đ)"] = round(t252 / 1e9, 0)
    out["Dòng tiền 20p/1năm %"] = round(pct(t20, t252), 1)
    return out


def per_stock_table(df, symbols):
    last_date = df["date"].max()
    recs = []
    for s in symbols:
        ss = df[df.symbol == s].set_index("date")["close"].sort_index()
        if ss.empty:
            continue
        last = ss.iloc[-1]
        trough = ss.min(); trough_d = ss.idxmin()
        _, ytd = nearest_on_or_before(ss, pd.Timestamp("2025-12-31"))
        _, y1 = nearest_on_or_before(ss, last_date - pd.Timedelta(days=365))
        ma50 = ss.rolling(50).mean().iloc[-1]
        ma200 = ss.rolling(200).mean().iloc[-1]
        recs.append({
            "Mã": s,
            "Giá hiện tại": round(last, 2),
            "Đáy": round(trough, 2),
            "Ngày đáy": trough_d.date().isoformat(),
            "% từ đáy": round(pct(last, trough), 0),
            "% 1 năm": round(pct(last, y1), 0) if y1 else None,
            "% YTD": round(pct(last, ytd), 0) if ytd else None,
            "Cách đỉnh LS %": round(pct(last, ss.max()), 0),
            "Ngày đỉnh": ss.idxmax().date().isoformat(),
            "Giá/MA50 %": round(pct(last, ma50), 1),
            "Giá/MA200 %": round(pct(last, ma200), 1),
            "RSI(14)": round(rsi(ss).iloc[-1], 1),
        })
    return pd.DataFrame(recs)


def main():
    all_syms = sorted({s for v in BASKETS.values() for s in v} | {"VNINDEX"})
    df = load_prices(all_syms)
    vnindex = df[df.symbol == "VNINDEX"].set_index("date")["close"].sort_index()

    print("=" * 100)
    print("DỮ LIỆU: PostgreSQL stock_db | phiên gần nhất:", df["date"].max().date())
    print("Mã thiếu trong DB (loại khỏi rổ):", MISSING_NOTE)
    print("=" * 100)

    # VN-Index tham chiếu
    v_last = vnindex.iloc[-1]
    v_trough = vnindex.min(); v_trough_d = vnindex.idxmin()
    v_peak = vnindex.max(); v_peak_d = vnindex.idxmax()
    print(f"\nVN-INDEX: hiện tại {v_last:.1f} | đáy DB {v_trough:.1f} ({v_trough_d.date()}) "
          f"| đỉnh DB {v_peak:.1f} ({v_peak_d.date()}) | cách đỉnh {pct(v_last, v_peak):.1f}%")
    for label, days in {"1 tháng": 30, "3 tháng": 91, "6 tháng": 182, "1 năm": 365}.items():
        _, vv = nearest_on_or_before(vnindex, vnindex.index[-1] - pd.Timedelta(days=days))
        print(f"  VN-Index {label}: {pct(v_last, vv):+.1f}%")
    _, v_ytd = nearest_on_or_before(vnindex, pd.Timestamp("2025-12-31"))
    print(f"  VN-Index YTD 2026: {pct(v_last, v_ytd):+.1f}%")

    rows = []
    for name, syms in BASKETS.items():
        have = [s for s in syms if s in set(df.symbol)]
        idx, base_row, wide = build_index(df, have)
        turn = turnover_series(df, have)
        rows.append(analyze_index(name, idx, turn, vnindex))
        print(f"\n{'-'*100}\n### {name}  (rổ {len(have)} mã, phiên gốc {base_row.date()})")
        print("Mã:", ", ".join(have))
        print(per_stock_table(df, have).to_string(index=False))

    summary = pd.DataFrame(rows)
    print("\n" + "=" * 100)
    print("BẢNG TỔNG HỢP CHỈ SỐ NGÀNH (equal-weight, rebase 100)")
    print("=" * 100)
    cols1 = ["Ngành", "Đáy (ngày)", "Chỉ số đáy", "Hiện tại", "% từ đáy", "Số tháng từ đáy",
             "VN-Index cùng kỳ %", "Alpha vs VNI (điểm %)", "Đỉnh LS (ngày)", "Cách đỉnh LS %"]
    print(summary[cols1].to_string(index=False))
    print()
    cols2 = ["Ngành", "1 tháng", "3 tháng", "6 tháng", "1 năm", "YTD 2026",
             "Giá/MA50 %", "Giá/MA200 %", "RSI(14)", "Biến động 60p (%/ngày)",
             "Biến động 60p (năm hóa %)"]
    print(summary[cols2].to_string(index=False))
    print()
    cols3 = ["Ngành", "GTGD 20p (tỷ đ)", "GTGD 252p (tỷ đ)", "Dòng tiền 20p/1năm %"]
    print(summary[cols3].to_string(index=False))

    summary.to_csv("scripts/_sector_momentum_output.csv", index=False)
    print("\n[đã lưu scripts/_sector_momentum_output.csv]")


if __name__ == "__main__":
    main()
