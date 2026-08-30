"""Market internals THẬT cho Vietnam Market Psychology Dashboard.

Tính từ stock_prices (1.398 mã, 2021→nay) — KHÔNG mô phỏng:
  - Breadth: % mã > MA20 / MA50 / MA200, advance/decline, new 52w high/low
  - Volume: khối lượng VN-Index / trung bình 20 phiên
  - Volatility: realized volatility 20 phiên (annualized)
  - Drawdown: so với đỉnh 52 tuần

Ghi vào bảng market_internals (trading_date PK). Chạy sau fetch_vnindex_history.py.

    python3 scripts/compute_market_internals.py [start_date=2026-01-01]
"""

from __future__ import annotations

import math
import sys

import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

DDL = """
CREATE TABLE IF NOT EXISTS market_internals (
    trading_date          DATE PRIMARY KEY,
    n_stocks              INTEGER,
    pct_above_ma20        DOUBLE PRECISION,
    pct_above_ma50        DOUBLE PRECISION,
    pct_above_ma200       DOUBLE PRECISION,
    advancers             INTEGER,
    decliners             INTEGER,
    unchanged             INTEGER,
    adv_dec_ratio         DOUBLE PRECISION,
    new_high_52w          INTEGER,
    new_low_52w           INTEGER,
    nh_nl_diff            INTEGER,
    vnindex_close         DOUBLE PRECISION,
    vnindex_ret_1d        DOUBLE PRECISION,
    vnindex_volume        BIGINT,
    vol_ratio_20d         DOUBLE PRECISION,
    realized_vol_20d      DOUBLE PRECISION,
    drawdown_52w          DOUBLE PRECISION,
    computed_at           TIMESTAMPTZ DEFAULT NOW()
);
"""

BREADTH_SQL = """
WITH base AS (
    SELECT
        symbol, trading_date, close_price, ma20, ma50,
        LAG(close_price)                                      OVER w AS prev_close,
        AVG(close_price) OVER (PARTITION BY symbol ORDER BY trading_date
                               ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS ma200,
        MAX(close_price) OVER (PARTITION BY symbol ORDER BY trading_date
                               ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) AS hi_52w,
        MIN(close_price) OVER (PARTITION BY symbol ORDER BY trading_date
                               ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) AS lo_52w,
        COUNT(*)         OVER (PARTITION BY symbol ORDER BY trading_date
                               ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) AS hist_len
    FROM stock_prices
    WHERE symbol <> 'VNINDEX'
    WINDOW w AS (PARTITION BY symbol ORDER BY trading_date)
)
SELECT
    trading_date,
    COUNT(*) AS n_stocks,
    100.0 * AVG(CASE WHEN ma20  IS NOT NULL THEN (close_price > ma20)::int  END)  AS pct_above_ma20,
    100.0 * AVG(CASE WHEN ma50  IS NOT NULL THEN (close_price > ma50)::int  END)  AS pct_above_ma50,
    100.0 * AVG(CASE WHEN hist_len >= 200   THEN (close_price > ma200)::int END)  AS pct_above_ma200,
    COUNT(*) FILTER (WHERE prev_close IS NOT NULL AND close_price > prev_close)   AS advancers,
    COUNT(*) FILTER (WHERE prev_close IS NOT NULL AND close_price < prev_close)   AS decliners,
    COUNT(*) FILTER (WHERE prev_close IS NOT NULL AND close_price = prev_close)   AS unchanged,
    COUNT(*) FILTER (WHERE hist_len >= 252 AND close_price >= hi_52w)             AS new_high_52w,
    COUNT(*) FILTER (WHERE hist_len >= 252 AND close_price <= lo_52w)             AS new_low_52w
FROM base
WHERE trading_date >= %s
GROUP BY trading_date
ORDER BY trading_date
"""


def compute_vnindex_metrics(cur, start_date: str) -> dict:
    """vol_ratio_20d, realized_vol_20d, drawdown_52w, ret_1d theo ngày (cần lookback)."""
    cur.execute("""
        SELECT trading_date, close_price, volume
        FROM stock_prices WHERE symbol = 'VNINDEX' ORDER BY trading_date
    """)
    rows = cur.fetchall()
    if not rows:
        raise RuntimeError("Thiếu VNINDEX: chạy scripts/fetch_vnindex_history.py")

    dates = [r[0] for r in rows]
    close = [float(r[1]) for r in rows]
    vol = [int(r[2] or 0) for r in rows]
    logret = [None] + [math.log(close[i] / close[i - 1]) for i in range(1, len(close))]

    out = {}
    for i, d in enumerate(dates):
        if d.isoformat() < start_date:
            continue
        ret_1d = round((close[i] / close[i - 1] - 1) * 100, 2) if i > 0 else None

        v20 = vol[max(0, i - 19): i + 1]
        vr = round(vol[i] / (sum(v20) / len(v20)), 2) if v20 and sum(v20) else None

        r20 = [x for x in logret[max(1, i - 19): i + 1] if x is not None]
        if len(r20) >= 5:
            mean = sum(r20) / len(r20)
            var = sum((x - mean) ** 2 for x in r20) / (len(r20) - 1)
            rv = round(math.sqrt(var) * math.sqrt(252) * 100, 1)
        else:
            rv = None

        hi_52w = max(close[max(0, i - 251): i + 1])
        dd = round((close[i] / hi_52w - 1) * 100, 2) if hi_52w else None

        out[d] = dict(close=close[i], ret_1d=ret_1d, volume=vol[i],
                      vol_ratio=vr, rvol=rv, drawdown=dd)
    return out


def main():
    start_date = sys.argv[1] if len(sys.argv) > 1 else "2026-01-01"
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(DDL)

            print(f"Tính breadth từ stock_prices (từ {start_date})...")
            cur.execute(BREADTH_SQL, (start_date,))
            breadth = cur.fetchall()
            print(f"  {len(breadth)} phiên")

            vni = compute_vnindex_metrics(cur, start_date)

            rows = []
            for (d, n, p20, p50, p200, adv, dec, unch, nh, nl) in breadth:
                m = vni.get(d, {})
                adr = round(adv / dec, 2) if dec else None
                rows.append((
                    d, n,
                    round(p20, 1) if p20 is not None else None,
                    round(p50, 1) if p50 is not None else None,
                    round(p200, 1) if p200 is not None else None,
                    adv, dec, unch, adr, nh, nl, nh - nl,
                    m.get("close"), m.get("ret_1d"), m.get("volume"),
                    m.get("vol_ratio"), m.get("rvol"), m.get("drawdown"),
                ))

            cur.execute("TRUNCATE market_internals")
            execute_values(cur, """
                INSERT INTO market_internals (
                    trading_date, n_stocks, pct_above_ma20, pct_above_ma50, pct_above_ma200,
                    advancers, decliners, unchanged, adv_dec_ratio,
                    new_high_52w, new_low_52w, nh_nl_diff,
                    vnindex_close, vnindex_ret_1d, vnindex_volume,
                    vol_ratio_20d, realized_vol_20d, drawdown_52w
                ) VALUES %s
            """, rows)
            print(f"✅ Ghi {len(rows)} phiên vào market_internals")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
