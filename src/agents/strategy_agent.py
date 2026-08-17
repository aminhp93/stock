from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, ScenarioDetail, ScenarioType
from src.utils.metrics import calculate_risk_reward_ratio

class StrategyAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_03_strategy",
            name="Strategy & Trading Scenario Agent",
            role="Lập kịch bản giao dịch (Bull/Base/Bear) và xây dựng chiến lược đầu tư chi tiết"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "market_context": MarketContext, "market_analysis": Dict, "simulation_consensus": SimulationConsensus }
        Output: { "trading_plan": TradingPlan }
        """
        ctx: MarketContext = inputs["market_context"]
        analysis: Dict[str, Any] = inputs.get("market_analysis", {})
        consensus: SimulationConsensus = inputs["simulation_consensus"]
        
        price = ctx.current_price
        
        # Determine entry zone and targets
        entry_min = round(price * 0.98, 0)
        entry_max = round(price * 1.01, 0)
        stop_loss = round(price * 0.95, 0)  # 5% hard stop loss
        tp1 = round(price * 1.15, 0)       # 15% TP1
        tp2 = round(price * 1.25, 0)       # 25% TP2
        
        rrr = calculate_risk_reward_ratio(price, stop_loss, tp1)
        
        scenarios = [
            ScenarioDetail(
                scenario=ScenarioType.BULL,
                probability=0.35,
                target_price=tp2,
                catalysts=[
                    "Doanh thu mảng AI tăng trưởng đột biến",
                    "Đồng thuận mua từ các quỹ định lượng & Smart Money"
                ],
                risks=["Tâm lý FOMO tăng cao dễ gặp nhịp rủ bỏ ngắn hạn"]
            ),
            ScenarioDetail(
                scenario=ScenarioType.BASE,
                probability=0.50,
                target_price=tp1,
                catalysts=[
                    "Tăng trưởng doanh thu và lợi nhuận duy trì ở mức 20-22%",
                    "Tín hiệu kỹ thuật duy trì xu hướng tăng MA20"
                ],
                risks=["Biến động theo chỉ số VN-Index"]
            ),
            ScenarioDetail(
                scenario=ScenarioType.BEAR,
                probability=0.15,
                target_price=stop_loss,
                catalysts=[],
                risks=[
                    "Thị trường chung điều chỉnh mạnh bất ngờ",
                    "Nhà đầu tư cá nhân hoảng loạn xả hàng"
                ]
            )
        ]
        
        thesis = (
            f"Kế hoạch đầu tư cổ phiếu {ctx.symbol}: "
            f"Tích lũy vùng giá {entry_min:,.0f} - {entry_max:,.0f}. "
            f"Dựa trên kết quả giả lập {consensus.total_agents} nhà đầu tư, "
            f"tỷ lệ đồng thuận MUA đạt {consensus.buy_percentage:.1f}%. "
            f"Tỷ lệ Risk/Reward hấp dẫn (1:{rrr:.2f})."
        )
        
        plan = TradingPlan(
            symbol=ctx.symbol,
            entry_zone_min=entry_min,
            entry_zone_max=entry_max,
            stop_loss_price=stop_loss,
            take_profit_target_1=tp1,
            take_profit_target_2=tp2,
            recommended_holding_period="3 - 6 tháng",
            allocation_pct=0.15,  # 15% allocation
            risk_reward_ratio=rrr,
            scenarios=scenarios,
            thesis_summary=thesis
        )
        
        return {"trading_plan": plan}
