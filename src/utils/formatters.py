from tabulate import tabulate
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, RiskAssessment, VerificationVerdict

def format_consensus_report(consensus: SimulationConsensus) -> str:
    """Format 10-Investor Simulation Consensus into clean ASCII/Markdown string"""
    lines = []
    lines.append("================================================================================")
    lines.append(f"  GIẢ LẬP TÂM LÝ & HÀNH VI 10 NHÀ ĐẦU TƯ TẠI MỐC THỜI GIAN: {consensus.timestamp}")
    lines.append("================================================================================")
    lines.append(f"Tổng số Agent giả lập: {consensus.total_agents}")
    lines.append(f"MUA (BUY): {consensus.buy_percentage:.1f}%  |  BÁN (SELL): {consensus.sell_percentage:.1f}%  |  GIỮ (HOLD): {consensus.hold_percentage:.1f}%  |  HOẢNG LOẠN (PANIC): {consensus.panic_percentage:.1f}%")
    
    # Sentiment bar representation
    score = consensus.overall_sentiment_score
    sentiment_label = "TRUNG LẬP"
    if score > 0.5: sentiment_label = "HƯNG PHẤN CỰC ĐỘ (EXTREME GREED)"
    elif score > 0.2: sentiment_label = "TÍCH CỰC (BULLISH)"
    elif score < -0.5: sentiment_label = "HOẢNG LOẠN CỰC ĐỘ (EXTREME FEAR)"
    elif score < -0.2: sentiment_label = "TIÊU CỰC (BEARISH)"
    
    lines.append(f"Chỉ số Cảm xúc Thị trường (Sentiment Index): {score:+.2f} ({sentiment_label})")
    lines.append(f"Tóm tắt Đồng thuận: {consensus.consensus_summary}")
    lines.append("\nCHI TIẾT QUYẾT ĐỊNH CỦA 10 PERSONA:")
    
    table_data = []
    for d in consensus.individual_decisions:
        target_str = f"{d.expected_target_price:,.0f}" if d.expected_target_price else "N/A"
        table_data.append([
            d.persona_name,
            d.action.value,
            f"{d.confidence*100:.0f}%",
            f"{d.sentiment_score:+.2f}",
            target_str,
            d.reasoning[:60] + "..." if len(d.reasoning) > 60 else d.reasoning
        ])
    
    headers = ["Persona Nhà Đầu Tư", "Hành Động", "Độ Tin Cậy", "Sentiment", "Giá Kỳ Vọng", "Lý Do Cốt Lõi"]
    lines.append(tabulate(table_data, headers=headers, tablefmt="github"))
    lines.append("================================================================================\n")
    return "\n".join(lines)

def format_verification_report(verdict: VerificationVerdict, plan: TradingPlan, risk: RiskAssessment) -> str:
    """Format final Investment Committee Verification Verdict"""
    lines = []
    lines.append("================================================================================")
    lines.append(f"  BÁO CÁO XÁC THỰC ĐẦU TƯ (INVESTMENT COMMITTEE VERIFICATION VERDICT)")
    lines.append("================================================================================")
    
    status_icon = "✅ ĐÃ PHÊ DUYỆT (APPROVED)" if verdict.approved else "❌ TỪ CHỐI (REJECTED / REVISE)"
    lines.append(f"Quyết định cuối cùng: {status_icon}")
    lines.append(f"Điểm Đánh Giá Kỷ Luật (Score): {verdict.overall_score:.1f} / 100")
    lines.append(f"Mã Chứng Khoán: {plan.symbol}")
    lines.append(f"Vùng Mua: {plan.entry_zone_min:,.0f} - {plan.entry_zone_max:,.0f} | Dừng Lỗ: {plan.stop_loss_price:,.0f} | Chốt Lời: {plan.take_profit_target_1:,.0f}")
    lines.append(f"Tỷ lệ Risk/Reward: 1:{plan.risk_reward_ratio:.2f} | Tỷ trọng đề xuất: {plan.allocation_pct*100:.1f}% tài khoản")
    lines.append(f"Vị thế Kelly khuyến nghị: {risk.recommended_kelly_position_pct*100:.1f}%")
    lines.append("\nCHECKLIST 7 TIÊU CHUẨN XÁC THỰC:")
    
    check_table = []
    for item in verdict.checklist:
        icon = "PASS" if item.passed else "FAIL"
        check_table.append([icon, item.criterion, item.details])
    
    headers = ["Kết Quả", "Tiêu Chí Kiểm Định", "Chi Tiết Đánh Giá"]
    lines.append(tabulate(check_table, headers=headers, tablefmt="github"))
    
    lines.append(f"\nNhận xét từ Hội đồng Xác thực: {verdict.feedback_notes}")
    if verdict.recommendations:
        lines.append("Khuyến nghị điều chỉnh:")
        for rec in verdict.recommendations:
            lines.append(f"  - {rec}")
    lines.append("================================================================================\n")
    return "\n".join(lines)
