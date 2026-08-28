from typing import List, Dict, Any
from src.workflow.engine import InvestmentWorkflowEngine

class TimeStepBacktester:
    def __init__(self):
        self.engine = InvestmentWorkflowEngine()

    def run_time_series_test(self, symbol: str, checkpoints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Checkpoints structure:
        [
           { "timestamp": "2026-01-15", "price": 110000.0, "market_condition": "Đáy hoảng loạn (Panic Bottom)" },
           { "timestamp": "2026-04-20", "price": 122000.0, "market_condition": "Tích lũy bứt phá (Breakout)" },
           { "timestamp": "2026-08-17", "price": 135000.0, "market_condition": "Hưng phấn đỉnh ngắn hạn (FOMO Peak)" }
        ]
        """
        results = []
        print(f"\n{'='*80}")
        print(f"  CHẠY CHUỖI KIỂM THỬ THỜI GIAN (HISTORICAL TIME-SERIES BACKTEST): {symbol}")
        print(f"{'='*80}\n")

        for cp in checkpoints:
            ts = cp["timestamp"]
            pr = cp["price"]
            cond = cp["market_condition"]
            print(f"\n▶ MỐC THỜI GIAN: {ts} | Mức Giá: {pr:,.0f} VND | Trạng Thái: {cond}")
            print("-" * 80)

            res = self.engine.run_pipeline(symbol=symbol, timestamp=ts, current_price=pr, verbose=True)
            results.append({"checkpoint": cp, "pipeline_result": res})

        self._print_performance_summary(symbol, results)
        return results

    def _print_performance_summary(self, symbol: str, results: List[Dict[str, Any]]) -> None:
        """Compare APPROVED entry prices to subsequent checkpoint prices and report P&L."""
        print(f"\n{'='*80}")
        print(f"  TỔNG KẾT HIỆU SUẤT BACKTEST: {symbol}")
        print(f"{'='*80}")

        approved_count = 0
        win_count = 0
        total_return_pct = 0.0

        for i, res in enumerate(results):
            verdict = res["pipeline_result"]["verification_verdict"]
            plan = res["pipeline_result"]["trading_plan"]
            cp = res["checkpoint"]

            print(f"\n  [{cp['timestamp']}] {cp['market_condition']}")
            print(f"  Giá thị trường: {cp['price']:,.0f} VND | Verdict: {verdict.verdict_code}")

            if not verdict.approved:
                print(f"  → Bị từ chối, bỏ qua.")
                continue

            approved_count += 1
            entry_price = plan.entry_zone_max

            if i + 1 < len(results):
                next_cp = results[i + 1]["checkpoint"]
                next_price = next_cp["price"]
                return_pct = (next_price - entry_price) / entry_price * 100
                portfolio_impact_pct = return_pct * (plan.allocation_pct / 100)
                hit_tp1 = next_price >= plan.take_profit_target_1
                hit_sl = next_price <= plan.stop_loss_price

                total_return_pct += return_pct
                if hit_tp1:
                    win_count += 1
                    status = f"✅ CHẠM TP1 ({plan.take_profit_target_1:,.0f})"
                elif hit_sl:
                    status = f"❌ DỪA LỖ ({plan.stop_loss_price:,.0f})"
                else:
                    status = f"⏳ ĐANG GIỮ ({return_pct:+.1f}%)"

                print(f"  → Vào: {entry_price:,.0f} → Tiếp: {next_price:,.0f} ({next_cp['timestamp']})")
                print(f"  → Lợi nhuận: {return_pct:+.1f}% | Tác động danh mục: {portfolio_impact_pct:+.2f}% | {status}")
            else:
                print(f"  → Checkpoint cuối — chưa có giá kết quả tiếp theo.")

        print(f"\n  {'-'*76}")
        if approved_count > 0:
            win_rate = win_count / approved_count * 100
            avg_return = total_return_pct / approved_count
            print(f"  📊 Tổng giao dịch APPROVED: {approved_count}")
            print(f"  🏆 Win Rate (chạm TP1): {win_rate:.1f}% ({win_count}/{approved_count})")
            print(f"  💰 Average Return per trade: {avg_return:+.1f}%")
        else:
            print(f"  📊 Không có giao dịch nào được phê duyệt.")
        print(f"{'='*80}\n")
