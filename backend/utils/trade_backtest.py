"""Đăng ký các chiến lược backtest THEO TỪNG GIAO DỊCH (điểm mua/chặn lỗ/chốt
lời mô phỏng thật) — khác với backend/utils/strategy_rank.py (xếp hạng cắt
ngang top-N so với universe). Dùng chung cho API (server.py /api/strategy/*)
khi mã chiến lược thuộc TRADE_STRATEGIES.

Thêm chiến lược mới: đăng ký vào TRADE_STRATEGIES bên dưới, và script tương
ứng cần hỗ trợ `--save-run <id>` (xem scripts/backtest_accumulation_breakout.py
để tham khảo cách gọi save_trade_backtest_run()).
"""

from __future__ import annotations

import json
import os
from typing import Any

TRADE_STRATEGIES: dict[str, dict[str, Any]] = {
    "accum_breakout": {
        "label": "Tích lũy → Breakout (Wyckoff)",
        "desc": "Tích lũy 40 phiên (biên độ ≤22%, khối lượng cạn dần) rồi breakout có "
                "khối lượng xác nhận, chỉ vào lệnh khi VN-Index > MA50. Chặn lỗ = đáy "
                "nền x0.97, chốt lời = đo chiều cao nền (measured move). Có lọc cơ bản "
                "point-in-time (loại lỗ ròng / đòn bẩy cực đoan Nợ/VCSH>3).",
        "script": os.path.join("scripts", "backtest_accumulation_breakout.py"),
    },
}

DDL = """
CREATE TABLE IF NOT EXISTS trade_backtest_runs (
    id             SERIAL PRIMARY KEY,
    strategy       VARCHAR(30) NOT NULL,
    status         VARCHAR(20) DEFAULT 'running',
    started_at     TIMESTAMPTZ DEFAULT NOW(),
    finished_at    TIMESTAMPTZ,
    sample_start   DATE,
    sample_end     DATE,
    n_trades       INTEGER,
    n_symbols      INTEGER,
    win_rate       DOUBLE PRECISION,
    avg_ret_pct    DOUBLE PRECISION,
    avg_r          DOUBLE PRECISION,
    profit_factor  DOUBLE PRECISION,
    avg_hold_days  DOUBLE PRECISION,
    avg_risk_pct   DOUBLE PRECISION,
    max_concurrent INTEGER,
    exit_reasons   JSONB,
    year_breakdown JSONB,
    fund_all       JSONB,
    fund_ok        JSONB,
    fund_risky     JSONB,
    error          TEXT
);
"""


def save_trade_backtest_run(conn, run_id: int, result: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(DDL)
        if "error" in result:
            cur.execute(
                """UPDATE trade_backtest_runs
                   SET status='error', error=%s, finished_at=NOW() WHERE id=%s""",
                (result["error"], run_id),
            )
        else:
            cur.execute(
                """
                UPDATE trade_backtest_runs SET
                    status='done', finished_at=NOW(),
                    sample_start=%(sample_start)s, sample_end=%(sample_end)s,
                    n_trades=%(n_trades)s, n_symbols=%(n_symbols)s,
                    win_rate=%(win_rate)s, avg_ret_pct=%(avg_ret_pct)s, avg_r=%(avg_r)s,
                    profit_factor=%(profit_factor)s, avg_hold_days=%(avg_hold_days)s,
                    avg_risk_pct=%(avg_risk_pct)s, max_concurrent=%(max_concurrent)s,
                    exit_reasons=%(exit_reasons)s, year_breakdown=%(year_breakdown)s,
                    fund_all=%(fund_all)s, fund_ok=%(fund_ok)s, fund_risky=%(fund_risky)s
                WHERE id=%(id)s
                """,
                {
                    **result,
                    "exit_reasons": json.dumps(result["exit_reasons"]),
                    "year_breakdown": json.dumps(result["year_breakdown"]),
                    "fund_all": json.dumps(result["fund_all"]) if result.get("fund_all") else None,
                    "fund_ok": json.dumps(result["fund_ok"]) if result.get("fund_ok") else None,
                    "fund_risky": json.dumps(result["fund_risky"]) if result.get("fund_risky") else None,
                    "id": run_id,
                },
            )
    conn.commit()
