"""Nghiên cứu có hệ thống: yếu tố nào (nếu có) thực sự dự báo được cổ phiếu tăng
trong 5-10 phiên tới? Test trên toàn bộ lịch sử 2021-2026 (~5,7 năm, đủ chu kỳ
tăng 2021 / sập 2022 / lình xình 2023-25 / hồi 2026), KHÔNG chỉ 400 ngày gần nhất
như rank_momentum.py — để biết edge (nếu có) có bền qua nhiều chu kỳ hay chỉ ăn may.

6 yếu tố test độc lập:
  F1 Momentum thuần         — ret20/ret60 cao, RSI lành mạnh (giống rank_momentum)
  F2 Mean-reversion thuần   — RSI thấp, gần đáy 20 phiên, xu hướng dài hạn còn nguyên
  F3 Sức mạnh tương đối NGÀNH — mạnh hơn trung vị ngành mình, ngành đang khỏe
  F4 Breakout có volume     — sát đỉnh 60 phiên + khối lượng xác nhận >=1.3x
  F5 Pullback trong uptrend — trên MA50 & MA200 (xu hướng), RSI lùi về 40-52 (chỉnh ngắn)
  F6 Momentum chất lượng    — ret60 cao NHƯNG biến động hàng ngày thấp (tăng "mượt")

Với mỗi yếu tố: chọn top-20 mỗi lần lấy mẫu, so return 5/10 phiên sau với toàn
universe, tính theo TỪNG NĂM để thấy edge có ổn định qua các chu kỳ hay không.

    python3 scripts/research_factors.py
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
import psycopg2

warnings.filterwarnings("ignore")

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
MIN_TURNOVER_BN = 10.0
SAMPLE_EVERY = 6     # phiên
FWD = (5, 10)


def load_data():
    conn = psycopg2.connect(**DB_CONFIG)
    px = pd.read_sql("""
        SELECT symbol, trading_date AS date, close_price AS close, high_price AS high,
               low_price AS low, volume
        FROM stock_prices WHERE symbol <> 'VNINDEX' ORDER BY symbol, trading_date
    """, conn, parse_dates=["date"])
    sect = pd.read_sql("SELECT symbol, sector FROM stocks", conn)
    vni = pd.read_sql("""
        SELECT trading_date AS date, close_price AS close
        FROM stock_prices WHERE symbol='VNINDEX' ORDER BY trading_date
    """, conn, parse_dates=["date"])
    conn.close()
    return px, sect, vni


def build_features(px: pd.DataFrame, sect: pd.DataFrame, vni: pd.DataFrame) -> pd.DataFrame:
    px = px.merge(sect, on="symbol", how="left")
    px["sector"] = px["sector"].fillna("KHAC")
    g = px.groupby("symbol", group_keys=False)

    px["ma20"] = g["close"].transform(lambda s: s.rolling(20).mean())
    px["ma50"] = g["close"].transform(lambda s: s.rolling(50).mean())
    px["ma200"] = g["close"].transform(lambda s: s.rolling(200).mean())
    px["hi60"] = g["high"].transform(lambda s: s.rolling(60).max())
    px["lo20"] = g["low"].transform(lambda s: s.rolling(20).min())
    px["ret5"] = g["close"].transform(lambda s: s.pct_change(5))
    px["ret20"] = g["close"].transform(lambda s: s.pct_change(20))
    px["ret60"] = g["close"].transform(lambda s: s.pct_change(60))
    px["dret"] = g["close"].transform(lambda s: s.pct_change())
    px["vol20d"] = g["dret"].transform(lambda s: s.rolling(20).std())          # biến động hàng ngày
    px["turn20"] = (px["close"] * px["volume"]).groupby(px["symbol"]).transform(lambda s: s.rolling(20).mean())
    px["vol5"] = g["volume"].transform(lambda s: s.rolling(5).mean())
    px["vol20"] = g["volume"].transform(lambda s: s.rolling(20).mean())
    px["vol_surge"] = px["vol5"] / px["vol20"]

    # RSI-14 (Wilder, xấp xỉ bằng rolling mean)
    gain = g["dret"].transform(lambda s: s.clip(lower=0))
    loss = g["dret"].transform(lambda s: (-s).clip(lower=0))
    ag = gain.groupby(px["symbol"]).transform(lambda s: s.rolling(14).mean())
    al = loss.groupby(px["symbol"]).transform(lambda s: s.rolling(14).mean())
    px["rsi"] = 100 - 100 / (1 + ag / al.replace(0, np.nan))
    px["rsi"] = px["rsi"].fillna(50)

    # forward returns (nhìn tương lai — CHỈ dùng để đánh giá, không dùng để chọn)
    for n in FWD:
        px[f"fwd{n}"] = g["close"].transform(lambda s, n=n: s.shift(-n) / s - 1) * 100

    # VN-Index ret20 theo ngày, để tính sức mạnh tương đối
    vni = vni.sort_values("date").copy()
    vni["vni_ret20"] = vni["close"].pct_change(20)
    px = px.merge(vni[["date", "vni_ret20"]], on="date", how="left")
    px["rs20"] = px["ret20"] - px["vni_ret20"]

    # trung vị ret20 theo ngành mỗi ngày (đo "ngành có khỏe không")
    sec_med = px.groupby(["date", "sector"])["ret20"].transform("median")
    px["sector_ret20_med"] = sec_med
    px["rs_sector"] = px["ret20"] - px["sector_ret20_med"]

    px["n_hist"] = g["close"].cumcount() + 1
    return px


FACTORS = {}


def factor(name):
    def deco(fn):
        FACTORS[name] = fn
        return fn
    return deco


@factor("F1 Momentum thuần")
def f_momentum(d: pd.DataFrame) -> pd.Series:
    s = pd.Series(0.0, index=d.index)
    s += (d["close"] > d["ma20"]).astype(float) * 8
    s += (d["ma20"] > d["ma50"]).astype(float) * 6
    s += d["ret20"].clip(-0.1, 0.3) * 30
    s += d["ret60"].clip(-0.1, 0.5) * 15
    s += ((d["rsi"] >= 45) & (d["rsi"] <= 65)).astype(float) * 8
    s -= ((d["rsi"] > 75).astype(float)) * 12
    return s


@factor("F2 Mean-reversion thuần")
def f_contra(d: pd.DataFrame) -> pd.Series:
    s = pd.Series(0.0, index=d.index)
    s += ((d["rsi"] >= 25) & (d["rsi"] <= 42)).astype(float) * 16
    s += (d["close"] > d["ma200"]).astype(float) * 14
    s -= (d["close"] < d["ma200"] * 0.9).astype(float) * 20
    s += (d["close"] <= d["lo20"] * 1.05).astype(float) * 12
    s += ((d["ret20"] < -0.03) & (d["ret60"] > 0)).astype(float) * 10
    s += (d["vol_surge"] >= 1.5).astype(float) * 8
    return s


@factor("F3 Mạnh hơn ngành + ngành khỏe")
def f_sector(d: pd.DataFrame) -> pd.Series:
    s = pd.Series(0.0, index=d.index)
    s += d["rs_sector"].clip(-0.2, 0.4) * 25
    s += (d["sector_ret20_med"] > 0).astype(float) * 15
    s += (d["close"] > d["ma50"]).astype(float) * 10
    s += ((d["rsi"] >= 40) & (d["rsi"] <= 68)).astype(float) * 8
    return s


@factor("F4 Breakout có volume")
def f_breakout(d: pd.DataFrame) -> pd.Series:
    gap = (d["hi60"] - d["close"]) / d["close"]
    s = pd.Series(0.0, index=d.index)
    s += (gap <= 0.02).astype(float) * 20
    s += (d["vol_surge"] >= 1.3).astype(float) * 15
    s += (d["close"] > d["ma50"]).astype(float) * 8
    s += (d["ret5"] > 0).astype(float) * 6
    return s


@factor("F5 Pullback trong uptrend")
def f_pullback(d: pd.DataFrame) -> pd.Series:
    s = pd.Series(0.0, index=d.index)
    uptrend = (d["close"] > d["ma50"]) & (d["ma50"] > d["ma200"])
    s += uptrend.astype(float) * 18
    s += ((d["rsi"] >= 40) & (d["rsi"] <= 52)).astype(float) * 16
    s += (d["ret5"] < 0).astype(float) * 8
    s += (d["ret60"] > 0.05).astype(float) * 8
    return s


@factor("F6 Momentum chất lượng (tăng mượt)")
def f_quality(d: pd.DataFrame) -> pd.Series:
    s = pd.Series(0.0, index=d.index)
    s += d["ret60"].clip(0, 0.5) * 20
    s -= d["vol20d"].rank(pct=True) * 15          # biến động thấp = điểm cao hơn
    s += (d["close"] > d["ma200"]).astype(float) * 10
    s += ((d["rsi"] >= 42) & (d["rsi"] <= 65)).astype(float) * 8
    return s


def run():
    print("Đang tải + tính đặc trưng toàn bộ lịch sử (mất khoảng 30-60s)...")
    px, sect, vni = load_data()
    df = build_features(px, sect, vni)

    liquid = df["turn20"] >= MIN_TURNOVER_BN * 1e9
    enough_hist = df["n_hist"] >= 210
    base = df[liquid & enough_hist].copy()

    dates = sorted(base["date"].unique())
    sample_dates = dates[::SAMPLE_EVERY]
    sample_dates = [d for d in sample_dates if d <= dates[-1] - pd.Timedelta(days=18)]  # chừa để có fwd10

    print(f"{len(sample_dates)} ngày mẫu, {base['symbol'].nunique()} mã (thanh khoản >= {MIN_TURNOVER_BN} tỷ), "
          f"{dates[0].date()} → {dates[-1].date()}\n")

    results = {name: [] for name in FACTORS}
    for d in sample_dates:
        day = base[base["date"] == d]
        if len(day) < 40:
            continue
        uni5 = day["fwd5"].mean()
        year = d.year
        for name, fn in FACTORS.items():
            score = fn(day)
            top = day.loc[score.sort_values(ascending=False).index[:20]]
            if top["fwd5"].notna().sum() < 10:
                continue
            t5, t10 = top["fwd5"].mean(), top["fwd10"].mean()
            results[name].append({"year": year, "edge5": t5 - uni5, "t5": t5, "u5": uni5,
                                  "t10": t10, "win": t5 > uni5})

    # bảng tổng: cả kỳ + theo năm
    years = sorted(set(r["year"] for rows in results.values() for r in rows))
    print(f"{'Yếu tố':<32}{'Edge 5p (toàn kỳ)':>18}{'Thắng%':>8}  | Edge 5p theo năm: " + " ".join(f"{y}" for y in years))
    print("-" * (60 + 7 * len(years)))
    for name, rows in results.items():
        if not rows:
            print(f"{name:<32}{'n/a':>18}")
            continue
        r = pd.DataFrame(rows)
        overall_edge = r["edge5"].mean()
        win = r["win"].mean() * 100
        by_year = r.groupby("year")["edge5"].mean()
        yearstr = " ".join(f"{by_year.get(y, float('nan')):+5.2f}" for y in years)
        print(f"{name:<32}{overall_edge:>+17.2f}%{win:>7.0f}%  | {yearstr}")

    print("\nEdge = (return 5 phiên của top-20) − (return 5 phiên trung bình toàn universe), đơn vị %.")
    print("Số dương & ổn định qua nhiều năm = có tiềm năng thật. Số bấp bênh/đổi dấu = không đáng tin, dễ do khớp ngẫu nhiên với 1 giai đoạn.")


if __name__ == "__main__":
    run()
