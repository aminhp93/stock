"""Nạp lịch sử NAV/chứng chỉ quỹ mở từ Fmarket vào PostgreSQL.

Bảng fund_nav (fund_code, nav_date) PK — dùng cho backtest DCA/Value Averaging.

Fmarket productId: VCBF-BCF=32 · VCBF-TBF=31 · VCBF-FIF=33 · VCBF-MGF=46 · VCBF-AIF=82

    python3 scripts/fetch_fund_nav.py                 # mặc định VCBF-BCF
    python3 scripts/fetch_fund_nav.py VCBF-TBF 31
"""

from __future__ import annotations

import sys

import psycopg2
import requests
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
URL = "https://api.fmarket.vn/res/product/get-nav-history"
HEADERS = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}

DDL = """
CREATE TABLE IF NOT EXISTS fund_nav (
    fund_code   VARCHAR(20) NOT NULL,
    nav_date    DATE NOT NULL,
    nav         DOUBLE PRECISION NOT NULL,
    fmarket_id  INTEGER,
    fetched_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (fund_code, nav_date)
);
CREATE INDEX IF NOT EXISTS fund_nav_date_idx ON fund_nav (nav_date);
"""


def fetch(fmarket_id: int) -> list[dict]:
    body = {"isAllData": 1, "productId": fmarket_id,
            "fromDate": "2010-01-01", "toDate": "2100-01-01"}
    r = requests.post(URL, headers=HEADERS, json=body, timeout=40)
    r.raise_for_status()
    rows = r.json().get("data") or []
    out, seen = [], set()
    for x in rows:
        d = x.get("navDate")
        nav = x.get("nav")
        if not d or nav is None or d in seen:
            continue
        seen.add(d)
        out.append({"nav_date": d, "nav": float(nav)})
    out.sort(key=lambda z: z["nav_date"])
    return out


def main():
    fund_code = sys.argv[1] if len(sys.argv) > 1 else "VCBF-BCF"
    fmarket_id = int(sys.argv[2]) if len(sys.argv) > 2 else 32

    print(f"🚀 Nạp NAV {fund_code} (Fmarket id={fmarket_id})")
    rows = fetch(fmarket_id)
    if not rows:
        print("❌ Không lấy được dữ liệu.")
        sys.exit(1)
    print(f"   {len(rows)} điểm NAV · {rows[0]['nav_date']} → {rows[-1]['nav_date']} "
          f"(mới nhất {rows[-1]['nav']:,.2f})")

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(DDL)
            execute_values(cur, """
                INSERT INTO fund_nav (fund_code, nav_date, nav, fmarket_id)
                VALUES %s
                ON CONFLICT (fund_code, nav_date) DO UPDATE SET
                    nav = EXCLUDED.nav, fmarket_id = EXCLUDED.fmarket_id, fetched_at = NOW()
            """, [(fund_code, r["nav_date"], r["nav"], fmarket_id) for r in rows])
        print(f"✅ Ghi {len(rows)} dòng vào fund_nav")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
