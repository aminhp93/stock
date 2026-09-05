"""Sàng lọc CƠ HỌC theo reward/risk trên toàn bộ stock_prices.

KHÔNG phải khuyến nghị đầu tư. Đây là bộ lọc kỹ thuật thuần: với mỗi mã tính
mức hỗ trợ (đáy 20 phiên) và mục tiêu (đỉnh 120 phiên ~ 6 tháng), rồi:

    risk   = (close - support) / close
    reward = (target  - close) / close
    R/R    = reward / risk

Lọc: R/R >= NGƯỠNG, rủi ro 3-18%, có thanh khoản, trên/sát MA50, RSI chưa quá mua.
Từ khi có `fundamentals_snapshot` (xem fetch_fundamentals.py), MẶC ĐỊNH cũng lọc
"cơ bản không quá risk": có lãi (biên LN ròng > 0), Nợ/VCSH <= 2, doanh thu
không giảm sâu (>= -20% YoY). Tắt bằng --no-fund nếu muốn xem cả mã cơ bản yếu.
Kết quả là DANH SÁCH THEO DÕI để tự nghiên cứu tiếp — không phải lệnh mua.

    python3 scripts/screen_reward_risk.py [rr_min=2.0] [min_turnover_bn=5] [--no-fund]
"""

from __future__ import annotations

import sys

import psycopg2

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

SQL = """
WITH w AS (
    SELECT
        symbol, trading_date, close_price, ma20, ma50, rsi_14,
        MIN(low_price)  OVER p20  AS lo20,
        MAX(high_price) OVER p60  AS hi60,
        MAX(high_price) OVER p120 AS hi120,
        AVG(close_price * volume) OVER p20 AS turnover20,
        COUNT(*) OVER p120 AS n,
        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trading_date DESC) AS rn
    FROM stock_prices
    WHERE symbol <> 'VNINDEX'
    WINDOW
        p20  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 19  PRECEDING AND CURRENT ROW),
        p60  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 59  PRECEDING AND CURRENT ROW),
        p120 AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 119 PRECEDING AND CURRENT ROW)
)
SELECT w.symbol, s.sector, w.trading_date, w.close_price, w.ma20, w.ma50, w.rsi_14,
       w.lo20, w.hi60, w.hi120, w.turnover20,
       f.roe, f.debt_to_equity, f.revenue_growth_yoy, f.net_margin_ttm, f.pe
FROM w LEFT JOIN stocks s ON s.symbol = w.symbol
       LEFT JOIN fundamentals_snapshot f ON f.symbol = w.symbol
WHERE w.rn = 1 AND w.n >= 120
"""


def main():
    rr_min = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
    min_turn = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0  # tỷ VND/phiên
    use_fund = "--no-fund" not in sys.argv

    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute(SQL)
        rows = cur.fetchall()
    conn.close()

    out = []
    asof = None
    n_fund_excluded = 0
    for (sym, sector, d, close, ma20, ma50, rsi, lo20, hi60, hi120, turn,
         roe, de, revg, nm, pe) in rows:
        asof = d
        if not close or not lo20 or not hi120 or not ma50:
            continue
        close, lo20, hi120, ma50 = float(close), float(lo20), float(hi120), float(ma50)
        rsi = float(rsi) if rsi is not None else 50.0
        turn_bn = float(turn or 0) / 1e9

        support = lo20
        target = hi120
        if close <= support or target <= close * 1.03:
            continue
        risk = (close - support) / close
        reward = (target - close) / close
        if risk < 0.03 or risk > 0.18:
            continue
        rr = reward / risk
        if rr < rr_min:
            continue
        if turn_bn < min_turn:
            continue
        if close < ma50 * 0.97:          # phải trên hoặc sát MA50
            continue
        if rsi >= 72:                    # tránh quá mua
            continue

        fund_flags = []
        if nm is not None and nm <= 0:
            fund_flags.append("lỗ")
        if de is not None and de > 2.0:
            fund_flags.append(f"nợ/vcsh {de:.1f}x")
        if revg is not None and revg < -0.20:
            fund_flags.append(f"DT {revg*100:.0f}%")
        if use_fund and fund_flags:
            n_fund_excluded += 1
            continue

        out.append(dict(
            sym=sym, sector=(sector or "?")[:20],
            close=close, rr=rr,
            risk_pct=risk * 100, reward_pct=reward * 100,
            support=support, target=target,
            rsi=rsi, turn_bn=turn_bn,
            above_ma50=(close / ma50 - 1) * 100,
            pe=pe, roe=roe, de=de, revg=revg,
            fund_flags=fund_flags,
        ))

    out.sort(key=lambda x: (-x["rr"], -x["turn_bn"]))

    print(f"\nSàng lọc reward/risk — dữ liệu đến {asof}")
    print(f"Điều kiện: R/R >= {rr_min} · thanh khoản >= {min_turn} tỷ/phiên · trên/sát MA50 · RSI < 72 · rủi ro 3-18%")
    if use_fund:
        print(f"Lọc cơ bản: có lãi · Nợ/VCSH <= 2.0 · DT YoY >= -20%  (đã loại {n_fund_excluded} mã không đạt; --no-fund để tắt)")
    else:
        print("Lọc cơ bản: TẮT (--no-fund) — cột PE/ROE/Nợ-VCSH/DT chỉ để tham khảo, có thể cảnh báo ⚠")
    print(f"Hỗ trợ = đáy 20 phiên · Mục tiêu = đỉnh 120 phiên (~6 tháng)")
    print("=" * 118)
    print(f"{'Mã':<6}{'Ngành':<22}{'Giá':>9}{'R/R':>6}{'Risk%':>7}{'Reward%':>9}"
          f"{'RSI':>5}{'GTGD tỷ':>9}{'PE':>7}{'ROE':>7}{'Nợ/VCSH':>9}{'DT YoY':>8}  Cơ bản")
    print("-" * 118)
    for x in out[:35]:
        pe_s = f"{x['pe']:.1f}" if x["pe"] is not None else "--"
        roe_s = f"{x['roe']*100:.0f}%" if x["roe"] is not None else "--"
        de_s = f"{x['de']:.2f}" if x["de"] is not None else "--"
        revg_s = f"{x['revg']*100:+.0f}%" if x["revg"] is not None else "--"
        flag_s = ("⚠ " + ",".join(x["fund_flags"])) if x["fund_flags"] else "ổn"
        print(f"{x['sym']:<6}{x['sector']:<22}{x['close']:>9,.0f}{x['rr']:>6.1f}"
              f"{x['risk_pct']:>7.1f}{x['reward_pct']:>9.1f}{x['rsi']:>5.0f}{x['turn_bn']:>9.1f}"
              f"{pe_s:>7}{roe_s:>7}{de_s:>9}{revg_s:>8}  {flag_s}")
    print("-" * 118)
    print(f"{len(out)} mã qua bộ lọc (hiển thị {min(35, len(out))}).")
    print("\n⚠️  Đây là output bộ lọc cơ học, KHÔNG phải khuyến nghị. Tự kiểm tra thêm")
    print("   tin tức, chất lượng ban lãnh đạo, và luận điểm đầu tư trước khi làm gì.")


if __name__ == "__main__":
    main()
