"""Chạy toàn bộ pipeline Vietnam Market Psychology theo đúng thứ tự phụ thuộc.

    python3 scripts/run_psychology_pipeline.py [--skip-collect]

Bước:
  1. fetch_vnindex_history.py     — VN-Index thật -> stock_prices
  2. fetch_foreign_flow.py        — mua/bán ròng khối ngoại HOSE -> foreign_flow
  3. compute_market_internals.py  — breadth / volatility / volume -> market_internals
  4. collect_cfa99_phase1.py      — livestream CFA99 (cần YOUTUBE_API_KEY); --skip-collect để bỏ qua
  5. classify_cfa99.py            — phân loại + yt_daily_metrics
  6. build_market_psychology.py   — hợp nhất -> market_psychology_daily
  7. backtest_psychology.py       — in kết quả lead/lag

Endpoint: /api/observation/psychology  (nhớ restart server.py sau lần chạy đầu)
"""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

STEPS = [
    ("fetch_vnindex_history.py", []),
    ("fetch_foreign_flow.py", []),
    ("fetch_google_trends.py", []),
    ("compute_market_internals.py", []),
    ("collect_cfa99_phase1.py", [], "collect"),
    ("classify_cfa99.py", []),
    ("build_market_psychology.py", []),
    ("backtest_psychology.py", []),
]


def main():
    skip_collect = "--skip-collect" in sys.argv
    if not skip_collect and not os.getenv("YOUTUBE_API_KEY"):
        print("⚠️  YOUTUBE_API_KEY chưa set — bỏ qua bước collect (dùng dữ liệu CFA99 hiện có).")
        skip_collect = True

    for step in STEPS:
        name, args = step[0], step[1]
        if len(step) == 3 and step[2] == "collect" and skip_collect:
            print(f"\n⏭  bỏ qua {name}")
            continue
        print(f"\n{'=' * 70}\n▶ {name}\n{'=' * 70}")
        rc = subprocess.call([sys.executable, os.path.join(HERE, name), *args], cwd=ROOT)
        if rc != 0:
            print(f"\n❌ {name} lỗi (exit {rc}) — dừng pipeline.")
            sys.exit(rc)
    print("\n✅ Pipeline hoàn tất.")


if __name__ == "__main__":
    main()
