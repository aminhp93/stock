"""Nạp Google Trends (search interest) cho từ khóa chứng khoán VN.

Bổ sung tầng ATTENTION cho market psychology dashboard: khi search "chứng khoán" /
"cổ phiếu" / "vnindex" tăng vọt cùng lúc giá tăng -> dấu hiệu retail FOMO.

Ghi vào bảng google_trends (trading_date PK, 1 cột / từ khóa, thang 0-100).
Dữ liệu Google Trends chuẩn hóa theo lô truy vấn nên GIỮ NGUYÊN bộ từ khóa dưới.

    python3 scripts/fetch_google_trends.py [start=2026-01-01] [end=today]

Lưu ý: pytrends là API không chính thức, hay bị rate-limit (429). Script tự retry;
nếu vẫn fail thì bỏ qua (pipeline vẫn chạy, cột trends = NULL).
"""

from __future__ import annotations

import datetime as dt
import sys
import time

import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

KEYWORDS = ["chứng khoán", "cổ phiếu", "vnindex", "chốt lời", "bắt đáy"]
COL = {"chứng khoán": "kw_chung_khoan", "cổ phiếu": "kw_co_phieu", "vnindex": "kw_vnindex",
       "chốt lời": "kw_chot_loi", "bắt đáy": "kw_bat_day"}

DDL = """
CREATE TABLE IF NOT EXISTS google_trends (
    trading_date   DATE PRIMARY KEY,
    kw_chung_khoan INTEGER,
    kw_co_phieu    INTEGER,
    kw_vnindex     INTEGER,
    kw_chot_loi    INTEGER,
    kw_bat_day     INTEGER,
    is_partial     BOOLEAN,
    fetched_at     TIMESTAMPTZ DEFAULT NOW()
);
"""


def fetch(start: str, end: str, retries: int = 4):
    from pytrends.request import TrendReq
    last_err = None
    for attempt in range(retries):
        try:
            py = TrendReq(hl="vi-VN", tz=420)  # KHÔNG truyền retries/backoff — vỡ với urllib3 v2
            py.build_payload(KEYWORDS, timeframe=f"{start} {end}", geo="VN")
            df = py.interest_over_time()
            if df is None or df.empty:
                raise RuntimeError("Google Trends trả về rỗng")
            return df
        except Exception as e:  # noqa: BLE001
            last_err = e
            wait = 5 * (attempt + 1)
            print(f"   ⚠ lần {attempt + 1} lỗi ({e}); chờ {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Google Trends fail sau {retries} lần: {last_err}")


def main():
    start = sys.argv[1] if len(sys.argv) > 1 else "2026-01-01"
    end = sys.argv[2] if len(sys.argv) > 2 else dt.date.today().isoformat()
    print(f"🚀 Google Trends VN ({start} → {end}): {', '.join(KEYWORDS)}")

    try:
        df = fetch(start, end)
    except Exception as e:  # noqa: BLE001
        print(f"❌ {e}\n   Bỏ qua — pipeline vẫn chạy (google_trends không cập nhật).")
        sys.exit(0)

    rows = []
    for idx, r in df.iterrows():
        d = idx.date() if hasattr(idx, "date") else idx
        rows.append((
            d,
            int(r.get("chứng khoán", 0)), int(r.get("cổ phiếu", 0)), int(r.get("vnindex", 0)),
            int(r.get("chốt lời", 0)), int(r.get("bắt đáy", 0)),
            bool(r.get("isPartial", False)),
        ))

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(DDL)
            execute_values(cur, """
                INSERT INTO google_trends
                    (trading_date, kw_chung_khoan, kw_co_phieu, kw_vnindex,
                     kw_chot_loi, kw_bat_day, is_partial)
                VALUES %s
                ON CONFLICT (trading_date) DO UPDATE SET
                    kw_chung_khoan=EXCLUDED.kw_chung_khoan, kw_co_phieu=EXCLUDED.kw_co_phieu,
                    kw_vnindex=EXCLUDED.kw_vnindex, kw_chot_loi=EXCLUDED.kw_chot_loi,
                    kw_bat_day=EXCLUDED.kw_bat_day, is_partial=EXCLUDED.is_partial,
                    fetched_at=NOW()
            """, rows)
        print(f"✅ Ghi {len(rows)} ngày vào google_trends. "
              f"Gần nhất {rows[-1][0]}: chứng khoán={rows[-1][1]}, cổ phiếu={rows[-1][2]}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
