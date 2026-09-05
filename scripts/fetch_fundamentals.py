"""Nạp dữ liệu CƠ BẢN thật (P/E, P/B, ROE, ROA, biên lợi nhuận, tăng trưởng,
nợ/vốn CSH, thanh khoản tài chính, sở hữu...) từ CÙNG nguồn VNDirect Finfo đang
dùng cho giá/khối lượng — endpoint `v4/ratios` (khác `v4/stock_prices`).

Endpoint này KHÔNG dùng cú pháp filter như stock_prices (`code:X~date:gte:Y`
qua param `q`) mà chỉ đáng tin khi lọc theo `code` — filter theo `ratioCode`
kèm nhiều giá trị hoặc theo ngày cụ thể trả kết quả sai (VNDirect bug/hạn chế).
Cách chắc ăn: lấy `size=5000` bản ghi mới nhất (sort=reportDate:desc, không lọc
ngày) rồi tự lọc phía client — vì các chỉ số quý (ROE, nợ/vốn...) được đóng dấu
đúng ngày công bố (không lặp lại mỗi ngày như P/E), nằm rải trong 5000 dòng gần
nhất là đủ để bắt được giá trị mới nhất của từng chỉ số.

Ghi vào 2 bảng:
    fundamentals_snapshot  — 1 dòng/mã, giá trị MỚI NHẤT của ~25 chỉ số (để lọc/join nhanh)
    fundamentals_raw       — lịch sử điểm dữ liệu đã lấy (để dò lại theo thời gian)

    python3 scripts/fetch_fundamentals.py            # toàn bộ mã trong bảng stocks
    python3 scripts/fetch_fundamentals.py HPG FPT     # chỉ vài mã (test nhanh)
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
PAGE_SIZE = 5000

# ratioCode VNDirect -> (cột trong fundamentals_snapshot, nhãn tiếng Việt)
CURATED_RATIOS = {
    "PRICE_TO_EARNINGS":        ("pe", "P/E"),
    "PRICE_TO_BOOK":            ("pb", "P/B"),
    "PRICE_TO_SALES":           ("ps", "P/S"),
    "DIVIDEND_YIELD":           ("dividend_yield", "Tỷ suất cổ tức"),
    "MARKETCAP":                ("marketcap", "Vốn hóa"),
    "EPS_TR":                   ("eps_ttm", "EPS 4 quý gần nhất"),
    "EPS_TR_GRYOY":             ("eps_growth_yoy", "Tăng trưởng EPS YoY"),
    "BVPS_CR":                  ("bvps", "Giá trị sổ sách/CP"),
    "NET_MARGIN_TR":            ("net_margin_ttm", "Biên LN ròng TTM"),
    "GROSS_MARGIN_TR":          ("gross_margin_ttm", "Biên LN gộp TTM"),
    "OPERATING_EBITDA_MARGIN_TR": ("ebitda_margin_ttm", "Biên EBITDA TTM"),
    "ROAE_TR_AVG4Q":            ("roe", "ROE (TB 4 quý)"),
    "ROAA_TR_AVG4Q":            ("roa", "ROA (TB 4 quý)"),
    "ROIC_TR_AVG4Q":            ("roic", "ROIC (TB 4 quý)"),
    "NET_SALES_TR_GRYOY":       ("revenue_growth_yoy", "Tăng trưởng DT YoY"),
    "NET_PROFIT_TR_GRYOY":      ("profit_growth_yoy", "Tăng trưởng LNST YoY"),
    "DEBT_TO_EQUITY_AQ":        ("debt_to_equity", "Nợ/Vốn CSH"),
    "CURRENT_RATIO_AQ":         ("current_ratio", "Thanh khoản hiện hành"),
    "QUICK_RATIO_AQ":           ("quick_ratio", "Thanh khoản nhanh"),
    "INTEREST_COVERAGE_TR":     ("interest_coverage", "Khả năng trả lãi vay"),
    "DEBT_EBITDA":              ("debt_to_ebitda", "Nợ/EBITDA"),
    "CFO_TO_SALES_TR":          ("cfo_to_sales", "Dòng tiền HĐKD/DT"),
    "FOREIGN_OWNERSHIP":        ("foreign_ownership", "Sở hữu khối ngoại"),
    "STATE_OWNERSHIP":          ("state_ownership", "Sở hữu nhà nước"),
    "FREEFLOAT":                ("freefloat", "Tỷ lệ freefloat"),
    "BETA":                     ("beta", "Beta"),
}

SNAPSHOT_COLS = [c for c, _ in CURATED_RATIOS.values()]

DDL = f"""
CREATE TABLE IF NOT EXISTS fundamentals_raw (
    symbol       VARCHAR(10) NOT NULL,
    report_date  DATE NOT NULL,
    ratio_code   VARCHAR(60) NOT NULL,
    value        DOUBLE PRECISION,
    fetched_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (symbol, report_date, ratio_code)
);
CREATE INDEX IF NOT EXISTS fundamentals_raw_symbol_idx ON fundamentals_raw (symbol, ratio_code);

CREATE TABLE IF NOT EXISTS fundamentals_snapshot (
    symbol       VARCHAR(10) PRIMARY KEY REFERENCES stocks(symbol) ON DELETE CASCADE,
    {', '.join(f'{c} DOUBLE PRECISION' for c in SNAPSHOT_COLS)},
    as_of_date   DATE,
    fetched_at   TIMESTAMPTZ DEFAULT NOW()
);
"""


def fetch_symbol(symbol: str) -> dict | None:
    try:
        r = requests.get(URL, params={"q": f"code:{symbol}", "size": PAGE_SIZE, "sort": "reportDate:desc"},
                          headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return None
        rows = r.json().get("data") or []
    except Exception:
        return None
    if not rows:
        return None

    latest: dict[str, tuple] = {}
    for row in rows:
        rc = row.get("ratioCode")
        if rc in CURATED_RATIOS and rc not in latest:
            latest[rc] = (row.get("reportDate"), row.get("value"))

    if not latest:
        return None
    as_of = max(d for d, _ in latest.values() if d)
    snap = {"symbol": symbol, "as_of_date": as_of}
    for rc, (col, _label) in CURATED_RATIOS.items():
        snap[col] = latest[rc][1] if rc in latest else None
    raw_rows = [(symbol, d, rc, v) for rc, (d, v) in latest.items() if d]
    return {"snapshot": snap, "raw": raw_rows}


def main():
    only = [s.upper() for s in sys.argv[1:]]
    conn = psycopg2.connect(**DB_CONFIG)
    with conn, conn.cursor() as cur:
        cur.execute(DDL)
        if only:
            symbols = only
        else:
            cur.execute("SELECT symbol FROM stocks WHERE symbol <> 'VNINDEX' ORDER BY symbol")
            symbols = [r[0] for r in cur.fetchall()]
    conn.close()

    print(f"🚀 Nạp dữ liệu cơ bản cho {len(symbols)} mã từ VNDirect Finfo (v4/ratios, {len(CURATED_RATIOS)} chỉ số)")
    t0 = time.time()
    snapshots, raw_all = [], []
    ok = fail = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(fetch_symbol, s): s for s in symbols}
        for idx, fut in enumerate(concurrent.futures.as_completed(futs), 1):
            res = fut.result()
            if res:
                snapshots.append(res["snapshot"])
                raw_all.extend(res["raw"])
                ok += 1
            else:
                fail += 1
            if idx % 100 == 0 or idx == len(symbols):
                print(f"  [{idx}/{len(symbols)}] ok={ok} fail={fail}")

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            if raw_all:
                execute_values(cur, """
                    INSERT INTO fundamentals_raw (symbol, report_date, ratio_code, value)
                    VALUES %s
                    ON CONFLICT (symbol, report_date, ratio_code) DO UPDATE SET value = EXCLUDED.value
                """, raw_all)
            if snapshots:
                cols = ["symbol"] + SNAPSHOT_COLS + ["as_of_date"]
                execute_values(cur, f"""
                    INSERT INTO fundamentals_snapshot ({', '.join(cols)})
                    VALUES %s
                    ON CONFLICT (symbol) DO UPDATE SET
                        {', '.join(f'{c} = EXCLUDED.{c}' for c in SNAPSHOT_COLS)},
                        as_of_date = EXCLUDED.as_of_date, fetched_at = NOW()
                """, [tuple(s.get(c) for c in cols) for s in snapshots])
        print(f"✅ Ghi {len(snapshots)} mã vào fundamentals_snapshot, {len(raw_all)} điểm vào fundamentals_raw "
              f"trong {time.time()-t0:.0f}s ({fail} mã không có dữ liệu)")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
