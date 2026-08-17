from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, RiskAssessment, VerificationVerdict, VerificationCheckItem

class InvestmentVerifierAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_05_verify",
            name="Investment Committee Verifier (Gatekeeper)",
            role="Hội đồng Xác thực & Kiểm định độc luật kỷ luật đầu tư trước khi giải ngân"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: {
            "market_context": MarketContext,
            "simulation_consensus": SimulationConsensus,
            "trading_plan": TradingPlan,
            "risk_assessment": RiskAssessment
        }
        Output: { "verification_verdict": VerificationVerdict }
        """
        ctx: MarketContext = inputs["market_context"]
        consensus: SimulationConsensus = inputs["simulation_consensus"]
        plan: TradingPlan = inputs["trading_plan"]
        risk: RiskAssessment = inputs["risk_assessment"]
        
        checklist: List[VerificationCheckItem] = []
        recommendations: List[str] = []
        
        # 1. Data Integrity Check
        c1 = VerificationCheckItem(
            criterion="1. Tính đầy đủ & chính xác của dữ liệu đầu vào (Data Completeness)",
            passed=len(ctx.historical_bars) >= 20 and ctx.financials is not None,
            details=f"Dữ liệu {ctx.symbol} có {len(ctx.historical_bars)} phiên giao dịch và báo cáo tài chính hợp lệ."
        )
        checklist.append(c1)
        
        # 2. Thesis Logic Check
        c2 = VerificationCheckItem(
            criterion="2. Tính rõ ràng & hợp lý của Luận điểm Đầu tư (Thesis Logic)",
            passed=bool(plan.thesis_summary and len(plan.scenarios) == 3),
            details="Có đủ 3 kịch bản Bull/Base/Bear với phân bổ xác suất rõ ràng."
        )
        checklist.append(c2)
        
        # 3. Risk/Reward Ratio Check
        c3 = VerificationCheckItem(
            criterion="3. Tỷ lệ Risk/Reward đạt tiêu chuẩn chuyên nghiệp (>= 1:2.5)",
            passed=risk.risk_reward_ratio_valid,
            details=f"Tỷ lệ RRR hiện tại là 1:{plan.risk_reward_ratio:.2f}."
        )
        checklist.append(c3)
        if not c3.passed:
            recommendations.append("Nâng điểm Take Profit hoặc hạ điểm Entry để tối ưu lại RRR.")
            
        # 4. Position Size Check
        c4 = VerificationCheckItem(
            criterion="4. An toàn quy mô vị thế & Giới hạn sụt giảm tài khoản (Capital Preservation)",
            passed=risk.is_position_size_safe,
            details=f"Phân bổ vị thế {plan.allocation_pct*100:.1f}% nằm trong hạn mức an toàn."
        )
        checklist.append(c4)
        if not c4.passed:
            recommendations.append(f"Giảm tỷ trọng vị thế về mức khuyến nghị Kelly ({risk.recommended_kelly_position_pct*100:.1f}%).")
            
        # 5. Herd Sentiment Sanity Check
        c5 = VerificationCheckItem(
            criterion="5. Bẫy tâm lý đám đông (Herd / Overbought Sanity Check)",
            passed=consensus.panic_percentage < 30.0 and consensus.buy_percentage > 25.0,
            details=f"Đồng thuận thị trường: MUA {consensus.buy_percentage}%, HOẢNG LOẠN {consensus.panic_percentage}%."
        )
        checklist.append(c5)
        if not c5.passed:
            recommendations.append("Thị trường đang có dấu hiệu hoảng loạn cao, nên hoãn mua để chờ ổn định.")
            
        # 6. Stop Loss Clarity
        c6 = VerificationCheckItem(
            criterion="6. Kỷ luật Dừng lỗ tuyệt đối (Hard Stop Loss)",
            passed=plan.stop_loss_price < plan.entry_zone_min,
            details=f"Điểm stop loss đặt tại {plan.stop_loss_price:,.0f} (Mức lỗ tối đa: {risk.potential_loss_pct*100:.1f}%)."
        )
        checklist.append(c6)
        
        # 7. Overall Verdict Score & Decision
        passed_count = sum(1 for item in checklist if item.passed)
        score = (passed_count / len(checklist)) * 100.0
        
        is_approved = passed_count >= 5 and risk.is_position_size_safe and risk.risk_reward_ratio_valid
        
        verdict_code = "APPROVED" if is_approved else "REJECTED_OR_REVISE"
        feedback = (
            f"Kế hoạch đầu tư vượt qua {passed_count}/{len(checklist)} tiêu chí kiểm định. "
            f"{'Kế hoạch ĐỦ ĐIỀU KIỆN giải ngân.' if is_approved else 'Cần điều chỉnh các tiêu chí chưa đạt trước khi phê duyệt.'}"
        )
        
        verdict = VerificationVerdict(
            approved=is_approved,
            verdict_code=verdict_code,
            overall_score=score,
            checklist=checklist,
            feedback_notes=feedback,
            recommendations=recommendations
        )
        
        return {"verification_verdict": verdict}
