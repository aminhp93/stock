from typing import Dict, Any
from backend.agents.base_agent import BaseAgent
from backend.models.market_data import MarketContext, MarketAnalysis
from backend.models.persona import SimulationConsensus
from backend.models.strategy import TradingPlan, ScenarioDetail, ScenarioType
from backend.utils.metrics import calculate_risk_reward_ratio as calculate_rrr

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

        last_bar = context.historical_bars[-1] if context.historical_bars else None
        ma50 = last_bar.ma50 if (last_bar and last_bar.ma50 is not None) else None
        ma20 = last_bar.ma20 if (last_bar and last_bar.ma20 is not None) else None

        # Stop loss: 3% below MA50 technical support; fallback hard floor at -6.5%
        if ma50 is not None and ma50 < current_price:
            stop_loss = round(ma50 * 0.97, 0)
        else:
            stop_loss = round(current_price * 0.935, 0)

        # Entry zone: near MA20 pullback if price above it, else tight near current price
        if ma20 is not None and ma20 < current_price:
            entry_min = round(ma20 * 0.995, 0)
            entry_max = round(current_price * 1.00, 0)
        else:
            entry_min = round(current_price * 0.985, 0)
            entry_max = round(current_price * 1.00, 0)

        take_profit_1 = round(current_price * 1.18, 0)
        take_profit_2 = round(current_price * 1.30, 0)

        rrr = calculate_rrr(entry_max, stop_loss, take_profit_1)

        # Consensus-adjusted scenario probabilities
        buy_factor = consensus.buy_percentage / 100.0
        panic_factor = consensus.panic_percentage / 100.0
        sell_factor = (consensus.sell_percentage + consensus.panic_percentage) / 100.0

        bull_prob = round(min(0.60, max(0.15, 0.35 + (buy_factor - 0.5) * 0.3)), 2)
        bear_prob = round(min(0.40, max(0.05, 0.15 + sell_factor * 0.3)), 2)
        base_prob = round(max(0.20, 1.0 - bull_prob - bear_prob), 2)

        # Allocation: reduce exposure when panic > 20% or sell dominates
        base_allocation = 15.0
        if panic_factor > 0.20 or sell_factor > 0.50:
            allocation = round(base_allocation * 0.7, 1)  # reduce by 30%
        elif buy_factor > 0.70:
            allocation = round(min(20.0, base_allocation * 1.2), 1)  # allow up to 20%
        else:
            allocation = base_allocation

        scenarios = [
            ScenarioDetail(
                scenario=ScenarioType.BULL,
                probability=bull_prob,
                target_price=round(take_profit_2, 0),
                catalysts=[f"Doanh thu {context.symbol} tăng trưởng > 25%", "Dòng vốn ngoại tiếp tục gia tăng mua ròng"],
                risks=["Áp lực chốt lời ngắn hạn khi vượt đỉnh"]
            ),
            ScenarioDetail(
                scenario=ScenarioType.BASE,
                probability=base_prob,
                target_price=round(take_profit_1, 0),
                catalysts=[f"Doanh thu {context.symbol} tăng trưởng 15% - 20%", "Thị trường duy trì xu hướng MA20"],
                risks=["Đi ngang tích lũy tích tụ năng lượng"]
            ),
            ScenarioDetail(
                scenario=ScenarioType.BEAR,
                probability=bear_prob,
                target_price=round(stop_loss, 0),
                catalysts=["Biến động vĩ mô bất lợi"],
                risks=["Gãy mốc hỗ trợ cứng MA50"]
            )
        ]
        
        plan = TradingPlan(
            symbol=context.symbol,
            entry_zone_min=entry_min,
            entry_zone_max=entry_max,
            stop_loss_price=stop_loss,
            take_profit_target_1=take_profit_1,
            take_profit_target_2=take_profit_2,
            recommended_holding_period="3 - 6 tháng",
            allocation_pct=allocation,
            risk_reward_ratio=round(rrr, 2),
            scenarios=scenarios,
            thesis_summary=(
                f"Kế hoạch đầu tư {context.symbol}: RRR 1:{rrr:.2f} | "
                f"Phân bổ xác suất Bull {bull_prob*100:.0f}% / Base {base_prob*100:.0f}% / Bear {bear_prob*100:.0f}% "
                f"(dựa trên đồng thuận {consensus.buy_percentage:.0f}% MUA từ 10 Personas)."
            )
        )
        
        return {"trading_plan": plan}
