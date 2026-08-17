from typing import Dict, Any
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext, MarketAnalysis
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, ScenarioDetail, ScenarioType
from src.utils.metrics import calculate_risk_reward_ratio as calculate_rrr

class StrategyAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_03_strategy",
            name="Strategy & Trading Scenario Agent",
            role="Lập kịch bản đầu tư (Bull/Base/Bear) và thiết lập Kế hoạch Giao dịch chi tiết"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: {
            "market_context": MarketContext,
            "market_analysis": MarketAnalysis,
            "simulation_consensus": SimulationConsensus
        }
        Output: { "trading_plan": TradingPlan }
        """
        context: MarketContext = inputs["market_context"]
        analysis: MarketAnalysis = inputs["market_analysis"]
        consensus: SimulationConsensus = inputs["simulation_consensus"]
        
        current_price = context.current_price
        
        entry_min = current_price * 0.985
        entry_max = current_price * 1.00
        stop_loss = current_price * 0.935
        take_profit_1 = current_price * 1.18
        take_profit_2 = current_price * 1.30
        
        rrr = calculate_rrr(entry_max, stop_loss, take_profit_1)
        
        scenarios = [
            ScenarioDetail(
                scenario=ScenarioType.BULL,
                probability=0.35,
                target_price=round(take_profit_2, 0),
                catalysts=[f"Doanh thu {context.symbol} tăng trưởng > 25%", "Dòng vốn ngoại tiếp tục gia tăng mua ròng"],
                risks=["Áp lực chốt lời ngắn hạn khi vượt đỉnh"]
            ),
            ScenarioDetail(
                scenario=ScenarioType.BASE,
                probability=0.50,
                target_price=round(take_profit_1, 0),
                catalysts=[f"Doanh thu {context.symbol} tăng trưởng 15% - 20%", "Thị trường duy trì xu hướng MA20"],
                risks=["Đi ngang tích lũy tích tụ năng lượng"]
            ),
            ScenarioDetail(
                scenario=ScenarioType.BEAR,
                probability=0.15,
                target_price=round(stop_loss, 0),
                catalysts=["Biến động vĩ mô bất lợi"],
                risks=["Gãy mốc hỗ trợ cứng MA50"]
            )
        ]
        
        plan = TradingPlan(
            symbol=context.symbol,
            entry_zone_min=round(entry_min, 0),
            entry_zone_max=round(entry_max, 0),
            stop_loss_price=round(stop_loss, 0),
            take_profit_target_1=round(take_profit_1, 0),
            take_profit_target_2=round(take_profit_2, 0),
            recommended_holding_period="3 - 6 tháng",
            allocation_pct=15.0,
            risk_reward_ratio=round(rrr, 2),
            scenarios=scenarios,
            thesis_summary=f"Kế hoạch đầu tư {context.symbol} đạt tỷ lệ RRR 1:{rrr:.2f} với 3 kịch bản phân bổ xác suất rõ ràng."
        )
        
        return {"trading_plan": plan}
