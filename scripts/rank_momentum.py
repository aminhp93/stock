"""CLI cho các chiến lược xếp hạng "xác suất tăng" — logic dùng chung với API
nằm ở backend/utils/strategy_rank.py.

    python3 scripts/rank_momentum.py                          # top cho ngày mới nhất, chiến lược momentum
    python3 scripts/rank_momentum.py 2026-08-28 5              # top 5 tính đến ngày đó
    python3 scripts/rank_momentum.py --contra                  # chiến lược ngược chiều
    python3 scripts/rank_momentum.py --backtest [--contra]     # kiểm định lịch sử
    python3 scripts/rank_momentum.py --backtest --save-run 12  # + ghi kết quả vào strategy_backtest_runs id=12
"""

from __future__ import annotations

import os
import sys

import psycopg2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.utils.strategy_rank import DB_CONFIG, rank, run_backtest, save_backtest_run  # noqa: E402


def main():
    strategy = "contra" if "--contra" in sys.argv else "momentum"
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            if "--backtest" in sys.argv:
                result = run_backtest(cur, strategy)
                if "--save-run" in sys.argv:
                    run_id = int(sys.argv[sys.argv.index("--save-run") + 1])
                    save_backtest_run(conn, run_id, result)
                    print(f"Đã lưu strategy_backtest_runs id={run_id}")
                return

            pos = [a for a in sys.argv[1:] if not a.startswith("-")]
            asof = pos[0] if pos else None
            topn = int(pos[1]) if len(pos) > 1 else 15
            if not asof:
                cur.execute("SELECT max(trading_date) FROM stock_prices WHERE symbol<>'VNINDEX'")
                asof = cur.fetchone()[0].isoformat()

            res = rank(cur, strategy, asof, topn)
            ranked = res["results"]
            mode = "NGƯỢC CHIỀU (mean-reversion)" if strategy == "contra" else "ĐỘNG LƯỢNG (momentum)"
            print(f"\nXẾP HẠNG {mode} — tính đến {asof} · {res['universe_size']} mã qua lọc thanh khoản")
            print("=" * 96)
            print(f"{'#':<3}{'Mã':<6}{'Điểm':>6}{'Giá':>9}{'RSI':>6}{'Ret20':>8}{'Ret60':>8}{'RS20':>7}{'Vol×':>7}{'→đỉnh60':>9}{'GTGD':>8}")
            print("-" * 96)
            for i, r in enumerate(ranked, 1):
                print(f"{i:<3}{r['symbol']:<6}{r['score']:>6.0f}{r['close']:>9,.0f}{r['rsi']:>6.0f}"
                      f"{r['ret20']:>7.1f}%{r['ret60']:>7.1f}%{r['rs20']:>6.1f}%{r['vol_surge']:>7.2f}"
                      f"{r['gap_to_hi60']:>8.1f}%{r['turn_bn']:>8.0f}")
            print("-" * 96)
            print("⚠️  Output cơ học — tự kiểm tra cơ bản & tin tức trước khi làm gì.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
