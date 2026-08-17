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
        print(f"\n================================================================================")
        print(f"  CHẠY CHUỖI KIỂM THỬ THỜI GIAN (HISTORICAL TIME-SERIES BACKTEST): {symbol}")
        print(f"================================================================================\n")

        for cp in checkpoints:
            ts = cp["timestamp"]
            pr = cp["price"]
            cond = cp["market_condition"]
            print(f"\n▶ MỐC THỜI GIAN: {ts} | Mức Giá: {pr:,.0f} VND | Trạng Thái: {cond}")
            print("--------------------------------------------------------------------------------")
            
            res = self.engine.run_pipeline(symbol=symbol, timestamp=ts, current_price=pr, verbose=True)
            results.append({
                "checkpoint": cp,
                "pipeline_result": res
            })
            
        return results
