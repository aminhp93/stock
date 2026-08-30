"""Nạp dòng tiền khối ngoại toàn sàn HOSE (THẬT) từ VNDirect.

Endpoint v4/foreigns với code=VNINDEX trả về tổng mua/bán/ròng của khối ngoại
trên HOSE theo ngày (VND). Ghi vào bảng foreign_flow (trading_date PK).

    python3 scripts/fetch_foreign_flow.py [start_date=2024-01-01]
"""

from __future__ import annotations

import sys
import time

import psycopg2
import requests
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
URL = "https://api-finfo.vndirect.com.vn/v4/foreigns"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

DDL = """
CREATE TABLE IF NOT EXISTS foreign_flow (
    trading_date  DATE PRIMARY KEY,
    buy_val_vnd   DOUBLE PRECISION,
    sell_val_vnd  DOUBLE PRECISION,
    net_val_vnd   DOUBLE PRECISION,
    buy_vol       DOUBLE PRECISION,
    sell_vol      DOUBLE PRECISION,
    net_vol       DOUBLE PRECISION,
    fetched_at    TIMESTAMPTZ DEFAULT NOW()
);
"""


def fetch(start_date: str) -> list[dict]:
    rows, page = [], 1
    while True:
        params = {
            "sort": "tradingDate",
            "q": f"code:VNINDEX~tradingDate:gte:{start_date}",
            "size": 1000,
            "page": page,
        }
        r = requests.get(URL, params=params, headers=HEADERS, timeout=20)
        r.raise_for_status()
        payload = r.json()
        data = payload.get("data", [])
        rows.extend(data)
        if page >= payload.get("totalPages", 1) or not data:
            break
        page += 1
        time.sleep(0.3)
    # dedupe theo ngày (giữ bản ghi cuối)
    by_date = {d["tradingDate"]: d for d in rows}
    return [by_date[k] for k in sorted(by_date)]


def main():
    start_date = sys.argv[1] if len(sys.argv) > 1 else "2024-01-01"
    print(f"🚀 Nạp dòng tiền khối ngoại HOSE từ VNDirect ({start_date} → nay)")
    data = fetch(start_date)
    if not data:
        print("❌ Không lấy được dữ liệu.")
        sys.exit(1)
    print(f"   {len(data)} phiên. Gần nhất {data[-1]['tradingDate']}: "
          f"ròng {data[-1]['netVal'] / 1e9:.1f} tỷ")

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(DDL)
            execute_values(cur, """
                INSERT INTO foreign_flow
                    (trading_date, buy_val_vnd, sell_val_vnd, net_val_vnd, buy_vol, sell_vol, net_vol)
                VALUES %s
                ON CONFLICT (trading_date) DO UPDATE SET
                    buy_val_vnd=EXCLUDED.buy_val_vnd, sell_val_vnd=EXCLUDED.sell_val_vnd,
                    net_val_vnd=EXCLUDED.net_val_vnd, buy_vol=EXCLUDED.buy_vol,
                    sell_vol=EXCLUDED.sell_vol, net_vol=EXCLUDED.net_vol, fetched_at=NOW()
            """, [
                (d["tradingDate"], d.get("buyVal"), d.get("sellVal"), d.get("netVal"),
                 d.get("buyVol"), d.get("sellVol"), d.get("netVol"))
                for d in data
            ])
        print(f"✅ Ghi {len(data)} phiên vào foreign_flow")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
