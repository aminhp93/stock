"""Đồng bộ dữ liệu hàng ngày — chạy sau giờ đóng cửa (~16:00, ngày làm việc).

Các bước (mỗi bước độc lập; lỗi 1 bước không chặn các bước sau):
  1. Giá + KLGD toàn bộ mã   — incremental ~100 ngày gần nhất, upsert (không xoá lịch sử)
  2. Vá chỉ báo kỹ thuật      — ma20/ma50 (SQL) + rsi_14 (Wilder, point-in-time) cho
                                các phiên gần đây, tính lại từ chuỗi giá trong DB, KHÔNG gọi API
                                (bản incremental để lại ma/rsi rỗng ở đầu cửa sổ fetch)
  3. Pipeline tâm lý thị trường — VN-Index, khối ngoại, Google Trends, market_internals,
                                phân loại CFA99, market_psychology_daily, backtest edges
                                (bỏ qua bước thu thập livestream nếu chưa có YOUTUBE_API_KEY)

Bảo vệ: nếu chạy TRƯỚC 15:15 (giờ máy) vào ngày làm việc, script sẽ BỎ QUA để
không nạp dữ liệu giữa phiên (giá/khối ngoại/tâm lý sẽ sai). Dùng --force/--full
để bỏ qua bảo vệ này.

    python3 scripts/sync_daily.py            # đồng bộ hàng ngày (chỉ chạy sau giờ đóng cửa)
    python3 scripts/sync_daily.py --force    # đồng bộ ngay dù phiên chưa kết thúc
    python3 scripts/sync_daily.py --full     # + re-sync giá đầy đủ từ 2021 (chậm, dễ bị rate-limit)

Lịch cron gợi ý (T2–T6, 16:00):
    0 16 * * 1-5 cd /Users/aminhp93/personal/stock && /usr/bin/python3 scripts/sync_daily.py \
        >> /Users/aminhp93/personal/stock/logs/sync_daily.log 2>&1
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from datetime import date, datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
INCREMENTAL_DAYS = 100      # cửa sổ fetch giá incremental
BACKFILL_DAYS = 80          # vá chỉ báo cho các phiên trong khoảng này
CLOSE_HH, CLOSE_MM = 15, 15  # sau giờ này (giờ máy) mới coi dữ liệu phiên hôm nay là chốt


def log(msg: str) -> None:
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def market_closed(now: datetime | None = None) -> bool:
    """True nếu phiên hôm nay đã kết thúc (hoặc hôm nay là cuối tuần → không có phiên)."""
    now = now or datetime.now()
    if now.weekday() >= 5:
        return True
    return (now.hour, now.minute) >= (CLOSE_HH, CLOSE_MM)


def step_prices(full: bool) -> None:
    from scripts.fetch_vn_stocks_history import sync_full_stock_history

    start = "2021-01-01" if full else (date.today() - timedelta(days=INCREMENTAL_DAYS)).isoformat()
    log(f"[1/3] Giá cổ phiếu — đồng bộ từ {start}")
    sync_full_stock_history(start)


def step_indicators() -> None:
    """Vá ma20/ma50/rsi_14 các phiên gần đây từ chuỗi giá đầy đủ trong DB."""
    import psycopg2

    from backend.utils.metrics import calculate_rsi

    cut = (date.today() - timedelta(days=BACKFILL_DAYS)).isoformat()
    log(f"[2/3] Vá chỉ báo kỹ thuật cho phiên >= {cut}")
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    # ma20/ma50 = SMA giá đóng cửa 20/50 phiên — khớp backend/utils/price_ingest._enrich
    cur.execute(
        """
        WITH w AS (
            SELECT symbol, trading_date,
                CASE WHEN COUNT(*) OVER w20 = 20 THEN AVG(close_price) OVER w20 END AS ma20,
                CASE WHEN COUNT(*) OVER w50 = 50 THEN AVG(close_price) OVER w50 END AS ma50
            FROM stock_prices
            WHERE symbol <> 'VNINDEX'
            WINDOW w20 AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW),
                   w50 AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)
        )
        UPDATE stock_prices sp
        SET ma20 = ROUND(w.ma20::numeric, 2), ma50 = ROUND(w.ma50::numeric, 2)
        FROM w
        WHERE sp.symbol = w.symbol AND sp.trading_date = w.trading_date
          AND sp.symbol <> 'VNINDEX' AND sp.trading_date >= %s
          AND (sp.ma20 IS DISTINCT FROM ROUND(w.ma20::numeric, 2)
               OR sp.ma50 IS DISTINCT FROM ROUND(w.ma50::numeric, 2))
        """,
        (cut,),
    )
    n_ma = cur.rowcount

    # rsi_14: tính lại các mã có phiên gần đây đang mang giá trị mặc định 50 (do fetch
    # incremental không đủ lịch sử) — dùng đúng hàm Wilder của pipeline nạp giá.
    cur.execute(
        "SELECT DISTINCT symbol FROM stock_prices "
        "WHERE symbol <> 'VNINDEX' AND trading_date >= %s AND (rsi_14 = 50.00 OR rsi_14 IS NULL)",
        (cut,),
    )
    syms = [r[0] for r in cur.fetchall()]
    n_rsi = 0
    for s in syms:
        cur.execute(
            "SELECT trading_date, close_price FROM stock_prices WHERE symbol = %s ORDER BY trading_date",
            (s,),
        )
        rows = cur.fetchall()
        closes = [float(x[1]) for x in rows]
        ups = [
            (round(calculate_rsi(closes[: i + 1]), 2), s, d)
            for i, (d, _) in enumerate(rows)
            if d.isoformat() >= cut
        ]
        if ups:
            cur.executemany(
                "UPDATE stock_prices SET rsi_14 = %s WHERE symbol = %s AND trading_date = %s", ups
            )
            n_rsi += 1

    conn.commit()
    conn.close()
    log(f"      ma20/ma50: {n_ma} dòng cập nhật · rsi_14: {n_rsi} mã tính lại")


def step_psychology() -> None:
    log("[3/3] Pipeline tâm lý thị trường (run_psychology_pipeline.py --skip-collect)")
    rc = subprocess.call(
        [sys.executable, os.path.join(HERE, "run_psychology_pipeline.py"), "--skip-collect"],
        cwd=ROOT,
    )
    if rc != 0:
        raise RuntimeError(f"run_psychology_pipeline exit {rc}")


def main() -> int:
    full = "--full" in sys.argv
    force = "--force" in sys.argv or full

    if not force and not market_closed():
        log(f"⏸  Phiên giao dịch hôm nay chưa kết thúc ({datetime.now():%H:%M}) — bỏ qua để "
            f"tránh nạp dữ liệu trong phiên. Chạy sau {CLOSE_HH:02d}:{CLOSE_MM:02d}, hoặc "
            f"thêm --force / --full để đồng bộ ngay.")
        return 0

    t0 = time.time()
    log(f"════ SYNC HÀNG NGÀY — {date.today()} {'(FULL)' if full else ''} ════")

    failures: list[str] = []
    for name, fn in (
        ("giá cổ phiếu", lambda: step_prices(full)),
        ("chỉ báo kỹ thuật", step_indicators),
        ("pipeline tâm lý", step_psychology),
    ):
        try:
            fn()
        except Exception as e:  # noqa: BLE001 — cron: ghi log, chạy tiếp bước sau
            failures.append(name)
            log(f"❌ Lỗi bước '{name}': {e!r}")

    dt = (time.time() - t0) / 60
    if failures:
        log(f"════ XONG (có lỗi: {', '.join(failures)}) trong {dt:.1f} phút ════")
        return 1
    log(f"════ XONG trong {dt:.1f} phút ════")
    return 0


if __name__ == "__main__":
    sys.exit(main())
