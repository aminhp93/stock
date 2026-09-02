"""Sàng lọc CƠ HỌC theo reward/risk trên toàn bộ stock_prices.

KHÔNG phải khuyến nghị đầu tư. Đây là bộ lọc kỹ thuật thuần: với mỗi mã tính
mức hỗ trợ (đáy 20 phiên) và mục tiêu (đỉnh 120 phiên ~ 6 tháng), rồi:

    risk   = (close - support) / close
    reward = (target  - close) / close
    R/R    = reward / risk

Lọc: R/R >= NGƯỠNG, rủi ro 3-18%, có thanh khoản, trên/sát MA50, RSI chưa quá mua.
Kết quả là DANH SÁCH THEO DÕI để tự nghiên cứu tiếp — không phải lệnh mua.

    python3 scripts/screen_reward_risk.py [rr_min=2.0] [min_turnover_bn=5]
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
       w.lo20, w.hi60, w.hi120, w.turnover20
FROM w LEFT JOIN stocks s ON s.symbol = w.symbol
WHERE w.rn = 1 AND w.n >= 120
"""


def main():
    rr_min = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
    min_turn = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0  # tỷ VND/phiên

    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute(SQL)
        rows = cur.fetchall()
    conn.close()

    out = []
    asof = None
    for (sym, sector, d, close, ma20, ma50, rsi, lo20, hi60, hi120, turn) in rows:
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

        out.append(dict(
            sym=sym, sector=(sector or "?")[:22],
            close=close, rr=rr,
            risk_pct=risk * 100, reward_pct=reward * 100,
            support=support, target=target,
            rsi=rsi, turn_bn=turn_bn,
            above_ma50=(close / ma50 - 1) * 100,
        ))

    out.sort(key=lambda x: (-x["rr"], -x["turn_bn"]))

    print(f"\nSàng lọc reward/risk — dữ liệu đến {asof}")
    print(f"Điều kiện: R/R >= {rr_min} · thanh khoản >= {min_turn} tỷ/phiên · trên/sát MA50 · RSI < 72 · rủi ro 3-18%")
    print(f"Hỗ trợ = đáy 20 phiên · Mục tiêu = đỉnh 120 phiên (~6 tháng)")
    print("=" * 100)
    print(f"{'Mã':<6}{'Ngành':<24}{'Giá':>9}{'R/R':>6}{'Risk%':>7}{'Reward%':>9}"
          f"{'Hỗ trợ':>10}{'Mục tiêu':>11}{'RSI':>6}{'GTGD tỷ':>9}{'>MA50%':>8}")
    print("-" * 100)
    for x in out[:35]:
        print(f"{x['sym']:<6}{x['sector']:<24}{x['close']:>9,.0f}{x['rr']:>6.1f}"
              f"{x['risk_pct']:>7.1f}{x['reward_pct']:>9.1f}{x['support']:>10,.0f}"
              f"{x['target']:>11,.0f}{x['rsi']:>6.0f}{x['turn_bn']:>9.1f}{x['above_ma50']:>8.1f}")
    print("-" * 100)
    print(f"{len(out)} mã qua bộ lọc (hiển thị {min(35, len(out))}).")
    print("\n⚠️  Đây là output bộ lọc cơ học, KHÔNG phải khuyến nghị. Tự kiểm tra cơ bản,")
    print("   tin tức, và luận điểm đầu tư cho từng mã trước khi làm gì.")


if __name__ == "__main__":
    main()
