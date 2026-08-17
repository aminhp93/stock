import sys
from src.workflow.engine import InvestmentWorkflowEngine
from src.workflow.backtester import TimeStepBacktester

def main():
    print("""
    ====================================================================
      HỆ THỐNG MULTI-AGENT ĐẦU TƯ CHỨNG KHOÁN & GIẢ LẬP 10 NHÀ ĐẦU TƯ
    ====================================================================
    """)
    
    symbol = "FPT"
    
    # 1. Run single pipeline snapshot execution
    engine = InvestmentWorkflowEngine()
    result = engine.run_pipeline(symbol=symbol, timestamp="2026-08-17", current_price=135000.0, verbose=True)
    
    # 2. Run large scale simulation test (10,000 Agents)
    print("\n--------------------------------------------------------------------------------")
    print("🔥 KIỂM THỬ THÍ ĐIỂM: MỞ RỘNG QUY MÔ GIẢ LẬP LÊN 10,000 AGENTS NHÀ ĐẦU TƯ")
    print("--------------------------------------------------------------------------------")
    large_scale_res = engine.simulator.run_large_scale_simulation(
        ctx=result["market_context"],
        analysis=result["market_analysis"],
        count=10000
    )
    print(f"Tổng số Agent giả lập: {large_scale_res['total_agents']:,}")
    print(f"Kết quả Phân bổ: MUA={large_scale_res['buy_pct']}% | BÁN={large_scale_res['sell_pct']}% | GIỮ={large_scale_res['hold_pct']}% | HOẢNG LOẠN={large_scale_res['panic_pct']}%")
    print(f"Trạng thái Thị trường Tổng thể: {large_scale_res['market_state']}")
    print("--------------------------------------------------------------------------------\n")
    
    # 3. Run Historical Time-Series Backtest across 3 Checkpoints
    backtester = TimeStepBacktester()
    checkpoints = [
        {"timestamp": "2026-01-15", "price": 105000.0, "market_condition": "Đáy hoảng loạn chiết khấu sâu"},
        {"timestamp": "2026-04-20", "price": 120000.0, "market_condition": "Tích lũy bứt phá MA20"},
        {"timestamp": "2026-08-17", "price": 135000.0, "market_condition": "Đỉnh ngắn hạn hưng phấn"}
    ]
    backtester.run_time_series_test(symbol=symbol, checkpoints=checkpoints)

if __name__ == "__main__":
    main()
