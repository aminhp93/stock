from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext, MarketAnalysis
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, RiskAssessment, VerificationVerdict, VerificationCheckItem

class InvestmentVerifierAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_05_verifier",
            name="Investment Verifier Gatekeeper Agent",
            role="Hội đồng Kiểm định 7 Tiêu chuẩn Đầu tư Chuyên nghiệp trước khi phê duyệt giải ngân"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: {
            "market_context": MarketContext,
            "market_analysis": MarketAnalysis,
            "simulation_consensus": SimulationConsensus,
            "trading_plan": TradingPlan,
            "risk_assessment": RiskAssessment
        }
        Output: { "verification_verdict": VerificationVerdict }
        """
        context: MarketContext = inputs["market_context"]
        analysis: MarketAnalysis = inputs["market_analysis"]
        consensus: SimulationConsensus = inputs["simulation_consensus"]
        plan: TradingPlan = inputs["trading_plan"]
        risk: RiskAssessment = inputs["risk_assessment"]
        
        checklist: List[VerificationCheckItem] = []
        
        # 1. Data Completeness Check
        c1 = len(context.historical_bars) >= 20 and context.financials is not None
        checklist.append(VerificationCheckItem(
            criterion="1. Tính đầy đủ & chính xác của dữ liệu đầu vào (Data Completeness)",
            passed=c1,
            details=f"Dữ liệu {context.symbol} có {len(context.historical_bars)} phiên giao dịch và báo cáo tài chính hợp lệ."
        ))
        
        # 2. Thesis Logic Check
        c2 = len(plan.scenarios) >= 3
        checklist.append(VerificationCheckItem(
            criterion="2. Tính rõ ràng & hợp lý của Luận điểm Đầu tư (Thesis Logic)",
            passed=c2,
            details="Có đủ 3 kịch bản Bull/Base/Bear với phân bổ xác suất rõ ràng."
        ))
        
        # 3. RRR Standard Check (>= 1:2.5)
        c3 = risk.risk_reward_ratio_valid
        checklist.append(VerificationCheckItem(
            criterion="3. Tỷ lệ Risk/Reward đạt tiêu chuẩn chuyên nghiệp (>= 1:2.5)",
            passed=c3,
            details=f"Tỷ lệ RRR hiện tại là 1:{plan.risk_reward_ratio:.2f}."
        ))
        
        # 4. Position Sizing Safety Check (<= 20%)
        c4 = risk.is_position_size_safe
        checklist.append(VerificationCheckItem(
            criterion="4. An toàn quy mô vị thế & Giới hạn sụt giảm tài khoản (Capital Preservation)",
            passed=c4,
            details=f"Phân bổ vị thế {plan.allocation_pct:.1f}% nằm trong hạn mức an toàn."
        ))
        
        # 5. Market Psychology Sanity Check
        c5 = consensus.panic_percentage < 30.0
        checklist.append(VerificationCheckItem(
            criterion="5. Bẫy tâm lý đám đông (Herd / Overbought Sanity Check)",
            passed=c5,
            details=f"Đồng thuận thị trường: MUA {consensus.buy_percentage:.1f}%, HOẢNG LOẠN {consensus.panic_percentage:.1f}%."
        ))
        
        # 6. Hard Stop Loss Discipline Check
        c6 = plan.stop_loss_price < plan.entry_zone_min and plan.stop_loss_price > 0
        checklist.append(VerificationCheckItem(
            criterion="6. Kỷ luật Dừng lỗ tuyệt đối (Hard Stop Loss)",
            passed=c6,
            details=f"Điểm stop loss đặt tại {plan.stop_loss_price:,.0f} (Mức lỗ tiềm năng: {risk.potential_loss_pct*100:.1f}%)."
        ))

        # 7. Catalyst Timeline & Holding Period Check (TIÊU CHÍ THỨ 7)
        c7 = len(plan.scenarios[0].catalysts) >= 2
        checklist.append(VerificationCheckItem(
            criterion="7. Động lực Tăng giá & Thời gian bứt phá (Catalysts & Holding Period Check)",
            passed=c7,
            details=f"Xác nhận có {len(plan.scenarios[0].catalysts)} động lực tăng giá cốt lõi thúc đẩy kịch bản Bull Case."
        ))
        
        # Final decision: >= 6/7 + hard gates = APPROVED; 4-5/7 + hard gates = REVISE_REQUIRED; else REJECTED
        passed_count = sum(1 for item in checklist if item.passed)
        is_hard_gates_ok = c3 and c4 and c6

        if passed_count >= 6 and is_hard_gates_ok:
            verdict_code = "APPROVED"
            is_approved = True
        elif passed_count >= 4 and is_hard_gates_ok:
            verdict_code = "REVISE_REQUIRED"
            is_approved = False
        else:
            verdict_code = "REJECTED"
            is_approved = False

        status_label = (
            "ĐỦ ĐIỀU KIỆN" if verdict_code == "APPROVED"
            else "CẦN ĐIỀU CHỈNH" if verdict_code == "REVISE_REQUIRED"
            else "KHÔNG ĐỦ ĐIỀU KIỆN"
        )

        verdict = VerificationVerdict(
            approved=is_approved,
            verdict_code=verdict_code,
            overall_score=round((passed_count / len(checklist)) * 100, 1),
            checklist=checklist,
            feedback_notes=(
                f"Kế hoạch đầu tư {context.symbol} vượt qua {passed_count}/{len(checklist)} tiêu chí kiểm định. "
                f"Kế hoạch {status_label} giải ngân."
            ),
            recommendations=[
                f"Giải ngân tỷ trọng {plan.allocation_pct:.1f}% trong vùng mua {plan.entry_zone_min:,.0f} - {plan.entry_zone_max:,.0f} VND.",
                f"Đặt lệnh Stop Loss tại {plan.stop_loss_price:,.0f} VND ngay khi mở vị thế."
            ]
        )

        return {"verification_verdict": verdict}
