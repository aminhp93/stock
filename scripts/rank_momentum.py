"""CLI cho các chiến lược xếp hạng "xác suất tăng" — logic dùng chung với API
nằm ở backend/utils/strategy_rank.py.

    python3 scripts/rank_momentum.py                              # top cho ngày mới nhất, chiến lược momentum
    python3 scripts/rank_momentum.py 2026-08-28 5                  # top 5 tính đến ngày đó
    python3 scripts/rank_momentum.py --strategy contra             # chiến lược ngược chiều
    python3 scripts/rank_momentum.py --strategy moneyflow          # PP2: đầu tư dòng tiền
    python3 scripts/rank_momentum.py --backtest --strategy contra  # kiểm định lịch sử
    python3 scripts/rank_momentum.py --backtest --save-run 12      # + ghi kết quả vào strategy_backtest_runs id=12
"""

from __future__ import annotations

import os
import sys

import psycopg2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.utils.strategy_rank import DB_CONFIG, STRATEGIES, rank, run_backtest, save_backtest_run  # noqa: E402


def _strategy_from_argv() -> str:
    if "--strategy" in sys.argv:
        return sys.argv[sys.argv.index("--strategy") + 1]
    if "--contra" in sys.argv:      # tương thích ngược
        return "contra"
    return "momentum"


def main():
    strategy = _strategy_from_argv()
    if strategy not in STRATEGIES:
        print(f"Không rõ chiến lược '{strategy}'. Có: {list(STRATEGIES)}")
        sys.exit(1)

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            if "--backtest" in sys.argv:
                result = run_backtest(cur, strategy)
                if "n_samples" in result and result["n_samples"] == 0:
                    print(f"⚠️  {result.get('error')}")
                if "--save-run" in sys.argv:
                    run_id = int(sys.argv[sys.argv.index("--save-run") + 1])
                    save_backtest_run(conn, run_id, result)
                    print(f"Đã lưu strategy_backtest_runs id={run_id}")
                return

            pos = [a for a in sys.argv[1:] if not a.startswith("-")
                   and a not in (strategy,)]  # loại giá trị của --strategy khỏi vị trí
            asof = pos[0] if pos else None
            topn = int(pos[1]) if len(pos) > 1 else 15
            if not asof:
                cur.execute("SELECT max(trading_date) FROM stock_prices WHERE symbol<>'VNINDEX'")
                asof = cur.fetchone()[0].isoformat()

            res = rank(cur, strategy, asof, topn)
            ranked = res["results"]
            label = STRATEGIES[strategy]["label"]
            print(f"\nXẾP HẠNG [{label}] — tính đến {asof} · {res['universe_size']} mã qua lọc")
            if not ranked:
                note = "" if res["universe_size"] else " (chiến lược có thể chưa kích hoạt hôm nay, vd VN-Index < MA50)"
                print(f"Không có mã nào đạt điều kiện.{note}")
                return
            print("=" * 100)
            metric_labels = [m["label"] for m in ranked[0]["metrics"]]
            header = f"{'#':<3}{'Mã':<7}{'Điểm':>6}{'Giá':>10}  " + "  ".join(f"{lb:<18}" for lb in metric_labels)
            print(header)
            print("-" * 100)
            for i, r in enumerate(ranked, 1):
                vals = "  ".join(f"{m['value']:<18}" for m in r["metrics"])
                print(f"{i:<3}{r['symbol']:<7}{r['score']:>6.0f}{r['close']:>10,.0f}  {vals}")
            print("-" * 100)
            print("⚠️  Output cơ học — tự kiểm tra cơ bản & tin tức trước khi làm gì.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
