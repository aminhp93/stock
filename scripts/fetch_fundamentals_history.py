"""Nạp LỊCH SỬ ĐIỂM THỜI GIAN (point-in-time) của 6 chỉ số cơ bản có đủ dữ liệu
sâu (~35 quý, từ 2019) — để lọc "cơ bản không quá risk" ĐÚNG THỜI ĐIỂM khi
backtest, tránh nhìn trước tương lai (lookahead bias) như dùng snapshot hiện tại.

Chỉ 6 chỉ số này có lịch sử đủ dài qua v4/ratios (loại AVG4Q như ROE/ROA/ROIC
chỉ có ~12 quý gần đây nên KHÔNG dùng được cho backtest xa hơn 2023):
    NET_MARGIN_TR         Biên lợi nhuận ròng TTM   (dương = có lãi)
    NET_PROFIT_TR_GRYOY   Tăng trưởng LNST YoY
    NET_SALES_TR_GRYOY    Tăng trưởng doanh thu YoY
    DEBT_TO_EQUITY_AQ     Nợ/Vốn chủ sở hữu
    CURRENT_RATIO_AQ      Thanh khoản hiện hành
    INTEREST_COVERAGE_TR  Khả năng trả lãi vay

Ghi vào CÙNG bảng fundamentals_raw (đã tạo ở fetch_fundamentals.py).

    python3 scripts/fetch_fundamentals_history.py               # universe thanh khoản >= 10 tỷ
    python3 scripts/fetch_fundamentals_history.py HPG FPT TCH    # vài mã cụ thể
"""

from __future__ import annotations

import concurrent.futures
import sys
import time

import psycopg2
import requests
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
URL = "https://api-finfo.vndirect.com.vn/v4/ratios"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
MIN_TURNOVER_BN = 10.0

METRICS = [
    "NET_MARGIN_TR", "NET_PROFIT_TR_GRYOY", "NET_SALES_TR_GRYOY",
    "DEBT_TO_EQUITY_AQ", "CURRENT_RATIO_AQ", "INTEREST_COVERAGE_TR",
]


def liquid_universe(cur) -> list[str]:
    cur.execute("""
        WITH t AS (
            SELECT symbol, AVG(close_price * volume) OVER (
                PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
            ) AS turn20,
            ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trading_date DESC) AS rn
            FROM stock_prices WHERE symbol <> 'VNINDEX'
        )
        SELECT symbol FROM t WHERE rn = 1 AND turn20 >= %s
    """, (MIN_TURNOVER_BN * 1e9,))
    return [r[0] for r in cur.fetchall()]


def fetch_metric(symbol: str, ratio_code: str) -> list[tuple]:
    try:
        r = requests.get(URL, params={"q": f"code:{symbol}~ratioCode:{ratio_code}", "size": 60,
                                       "sort": "reportDate:desc"}, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        rows = r.json().get("data") or []
    except Exception:
        return []
    return [(symbol, row["reportDate"], ratio_code, row.get("value")) for row in rows if row.get("reportDate")]


def main():
    only = [s.upper() for s in sys.argv[1:]]
    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        symbols = only or liquid_universe(cur)
    conn.close()

    jobs = [(s, m) for s in symbols for m in METRICS]
    print(f"🚀 Nạp lịch sử {len(METRICS)} chỉ số cơ bản cho {len(symbols)} mã ({len(jobs)} lượt gọi)")
    t0 = time.time()
    all_rows, done, empty = [], 0, 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(fetch_metric, s, m): (s, m) for s, m in jobs}
        for i, fut in enumerate(concurrent.futures.as_completed(futs), 1):
            rows = fut.result()
            if rows:
                all_rows.extend(rows)
                done += 1
            else:
                empty += 1
            if i % 400 == 0 or i == len(jobs):
                print(f"  [{i}/{len(jobs)}] có dữ liệu={done} rỗng={empty} · {len(all_rows):,} điểm")

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            if all_rows:
                execute_values(cur, """
                    INSERT INTO fundamentals_raw (symbol, report_date, ratio_code, value)
                    VALUES %s
                    ON CONFLICT (symbol, report_date, ratio_code) DO UPDATE SET value = EXCLUDED.value
                """, all_rows)
        print(f"✅ Ghi {len(all_rows):,} điểm lịch sử vào fundamentals_raw trong {time.time()-t0:.0f}s")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
