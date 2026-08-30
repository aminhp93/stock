"""Nạp lịch sử chỉ số VN-Index THẬT vào PostgreSQL (stock_prices, symbol='VNINDEX').

Vì sao cần script riêng:
  - Endpoint Finfo v4/stock_prices (dùng cho cổ phiếu) KHÔNG trả về chỉ số.
  - `stock_prices` có khóa ngoại tới `stocks`, nên phải seed 1 dòng 'VNINDEX' vào
    `stocks` trước.
  - Bộ lọc `_sanitize_price_rows` loại mọi nến có phần thập phân (đúng cho cổ phiếu
    VN vốn tick theo đồng nguyên), nhưng chỉ số có thập phân hợp lệ -> ở đây ghi
    thẳng, không đi qua sanitizer đó.

Nguồn: VNDirect dchart (https://dchart-api.vndirect.com.vn/dchart/history) — trả
OHLCV ngày của VNINDEX. Sau khi chạy script này, `seed_cfa99_sample.py` sẽ đọc
được giá chỉ số thật thay vì công thức bịa.

Dùng:
    python3 scripts/fetch_vnindex_history.py                 # từ 2021-01-01
    python3 scripts/fetch_vnindex_history.py 2024-01-01      # từ ngày chỉ định
"""

import datetime as dt
import sys
import time

import psycopg2
import requests

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

DCHART_URL = "https://dchart-api.vndirect.com.vn/dchart/history"
_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
DEFAULT_START = "2021-01-01"
INDEX_SYMBOL = "VNINDEX"


def fetch_vnindex(start_date: str, end_date: str) -> list[dict]:
    """Trả về [{date, open, high, low, close, volume}, ...] tăng dần theo ngày."""
    frm = int(dt.datetime.strptime(start_date, "%Y-%m-%d").timestamp())
    to = int(dt.datetime.strptime(end_date, "%Y-%m-%d").timestamp()) + 86400
    params = {"symbol": INDEX_SYMBOL, "resolution": "D", "from": frm, "to": to}
    r = requests.get(DCHART_URL, params=params, headers=_HEADERS, timeout=20)
    r.raise_for_status()
    p = r.json()
    if p.get("s") not in ("ok", None) or not p.get("t"):
        raise RuntimeError(f"dchart trả về trạng thái bất thường: {p.get('s')!r}")

    rows = []
    for ts, o, h, l, c, v in zip(p["t"], p["o"], p["h"], p["l"], p["c"], p["v"]):
        d = dt.datetime.utcfromtimestamp(ts).date()
        if d.weekday() >= 5:
            continue
        if None in (o, h, l, c) or min(o, h, l, c) <= 0 or h < l:
            continue
        rows.append({
            "date": d.isoformat(),
            "open": round(float(o), 2),
            "high": round(float(h), 2),
            "low": round(float(l), 2),
            "close": round(float(c), 2),
            "volume": int(v or 0),
        })
    rows.sort(key=lambda x: x["date"])
    return rows


def main() -> None:
    start_date = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_START
    end_date = dt.date.today().isoformat()

    print(f"🚀 Nạp VN-Index thật từ VNDirect dchart ({start_date} → {end_date})")
    t0 = time.time()
    rows = fetch_vnindex(start_date, end_date)
    if not rows:
        print("❌ Không lấy được dữ liệu VN-Index nào.")
        sys.exit(1)
    print(f"   Lấy được {len(rows):,} phiên. Gần nhất: {rows[-1]['date']} close={rows[-1]['close']}")

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO stocks (symbol, company_name, exchange, sector, is_active)
                VALUES (%s, %s, %s, %s, FALSE)
                ON CONFLICT (symbol) DO NOTHING
                """,
                (INDEX_SYMBOL, "Chỉ số VN-Index (HOSE)", "INDEX", "INDEX"),
            )
            cur.executemany(
                """
                INSERT INTO stock_prices
                    (symbol, trading_date, open_price, high_price, low_price, close_price, volume)
                VALUES (%(symbol)s, %(date)s, %(open)s, %(high)s, %(low)s, %(close)s, %(volume)s)
                ON CONFLICT (symbol, trading_date) DO UPDATE SET
                    open_price  = EXCLUDED.open_price,
                    high_price  = EXCLUDED.high_price,
                    low_price   = EXCLUDED.low_price,
                    close_price = EXCLUDED.close_price,
                    volume      = EXCLUDED.volume
                """,
                [dict(symbol=INDEX_SYMBOL, **row) for row in rows],
            )
        print(f"✅ Đã ghi {len(rows):,} phiên VN-Index vào stock_prices trong {time.time() - t0:.1f}s")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
