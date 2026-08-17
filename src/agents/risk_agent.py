from typing import Dict, Any
from src.agents.base_agent import BaseAgent
from src.models.strategy import TradingPlan, RiskAssessment
from src.utils.metrics import calculate_kelly_criterion
from config.settings import settings

class RiskManagerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_04_risk",
            name="Risk Management Agent",
            role="Đánh giá rủi ro, quy mô vị thế Kelly Criterion và kiểm soát sụt giảm tài khoản (Drawdown)"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "trading_plan": TradingPlan }
        Output: { "risk_assessment": RiskAssessment }
        """
        plan: TradingPlan = inputs["trading_plan"]
        
        # Calculate Kelly Criterion position size recommendation
        win_rate = 0.60  # Base estimate 60% win rate for setup
        win_loss_ratio = plan.risk_reward_ratio
        kelly_size = calculate_kelly_criterion(win_rate, win_loss_ratio)
        
        # Safety rules check
        warnings = []
        is_size_safe = (plan.allocation_pct / 100.0) <= settings.max_position_size_pct
        if not is_size_safe:
            warnings.append(f"Tỷ trọng đề xuất ({plan.allocation_pct:.1f}%) vượt mức tối đa cho phép ({settings.max_position_size_pct*100:.1f}%).")
            
        rrr_valid = plan.risk_reward_ratio >= settings.min_risk_reward_ratio
        if not rrr_valid:
            warnings.append(f"Tỷ lệ Risk/Reward (1:{plan.risk_reward_ratio:.2f}) nhỏ hơn tiêu chuẩn tối thiểu (1:{settings.min_risk_reward_ratio:.2f}).")
            
        # Stress test calculation
        loss_pct = (plan.entry_zone_max - plan.stop_loss_price) / plan.entry_zone_max
        stress_portfolio_drawdown = loss_pct * plan.allocation_pct
        
        assessment = RiskAssessment(
            is_position_size_safe=is_size_safe,
            recommended_kelly_position_pct=kelly_size,
            potential_loss_pct=round(loss_pct, 4),
            risk_reward_ratio_valid=rrr_valid,
            stress_test_drawdown_impact_pct=round(stress_portfolio_drawdown, 4),
            risk_warnings=warnings
        )
        
        return {"risk_assessment": assessment}
