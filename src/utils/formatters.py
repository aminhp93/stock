from tabulate import tabulate
from src.models.market_data import MarketContext, MarketAnalysis
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, VerificationVerdict

def format_market_context_summary(context: MarketContext) -> str:
    lines = [
        "=" * 80,
        f"  DỮ LIỆU THỊ TRƯỜNG POINT-IN-TIME: {context.symbol} ({context.company_name})",
        "=" * 80,
        f"Mốc thời gian: {context.timestamp} | Giá hiện tại: {context.current_price:,.0f} VND",
        f"Số lượng nến lịch sử: {len(context.historical_bars)} phiên",
        f"Chỉ số định giá DCF: {context.financials.intrinsic_value_dcf:,.0f} VND | P/E: {context.financials.pe_ratio}x | ROE: {context.financials.roe}%",
        "=" * 80
    ]
    return "\n".join(lines)

def format_market_analysis_summary(analysis: MarketAnalysis) -> str:
    lines = [
        "=" * 80,
        f"  KẾT QUẢ PHÂN TÍCH KỸ THUẬT & ĐỊNH GIÁ: {analysis.symbol}",
        "=" * 80,
        analysis.summary,
        "=" * 80
    ]
    return "\n".join(lines)

def format_consensus_report(consensus: SimulationConsensus) -> str:
    sentiment_label = "TÍCH CỰC (BULLISH)" if consensus.overall_sentiment_score > 0.3 else "TIÊU CỰC (BEARISH)" if consensus.overall_sentiment_score < -0.3 else "TRUNG TÍNH (NEUTRAL)"
    lines = [
        "=" * 80,
        f"  GIẢ LẬP TÂM LÝ & HÀNH VI 10 NHÀ ĐẦU TƯ TẠI MỐC THỜI GIAN: {consensus.timestamp}",
        "=" * 80,
        f"Tổng số Agent giả lập: {consensus.total_agents}",
        f"MUA (BUY): {consensus.buy_percentage}%  |  BÁN (SELL): {consensus.sell_percentage}%  |  GIỮ (HOLD): {consensus.hold_percentage}%  |  HOẢNG LOẠN (PANIC): {consensus.panic_percentage}%",
        f"Chỉ số Cảm xúc Thị trường (Sentiment Index): {consensus.overall_sentiment_score:+.2f} ({sentiment_label})",
        f"Tóm tắt Đồng thuận: {consensus.consensus_summary}",
        "\nCHI TIẾT QUYẾT ĐỊNH CỦA 10 PERSONA:"
    ]
    
    table_data = []
    for d in consensus.individual_decisions:
        target_p = f"{d.expected_target_price:,.0f}" if d.expected_target_price else "N/A"
        table_data.append([
            d.persona_name,
            d.action,
            f"{d.confidence*100:.0f}%",
            d.sentiment_score,
            target_p,
            d.reasoning[:60] + "..." if len(d.reasoning) > 60 else d.reasoning
        ])
        
    headers = ["Persona Nhà Đầu Tư", "Hành Động", "Độ Tin Cậy", "Sentiment", "Giá Kỳ Vọng", "Lý Do Cốt Lõi"]
    table_str = tabulate(table_data, headers=headers, tablefmt="github")
    lines.append(table_str)
    lines.append("=" * 80)
    return "\n".join(lines)

def format_trading_plan(plan: TradingPlan) -> str:
    lines = [
        "=" * 80,
        f"  KẾ HOẠCH GIAO DỊCH CHI TIẾT (TRADING PLAN): {plan.symbol}",
        "=" * 80,
        f"Vùng Mua (Entry Zone): {plan.entry_zone_min:,.0f} - {plan.entry_zone_max:,.0f} VND",
        f"Điểm Dừng Lỗ (Stop Loss): {plan.stop_loss_price:,.0f} VND",
        f"Mục Tiêu Chốt Lời (Take Profit): TP1: {plan.take_profit_target_1:,.0f} | TP2: {plan.take_profit_target_2:,.0f} VND",
        f"Tỷ Lệ Risk/Reward Ratio: 1:{plan.risk_reward_ratio:.2f}",
        "=" * 80
    ]
    return "\n".join(lines)

def format_verification_verdict(verdict: VerificationVerdict) -> str:
    if verdict.verdict_code == "APPROVED":
        icon = "✅"
        label = "(ĐÃ PHÊ DUYỆT)"
    elif verdict.verdict_code == "REVISE_REQUIRED":
        icon = "⚠️"
        label = "(CẦN ĐIỀU CHỈNH)"
    else:
        icon = "❌"
        label = "(TỪ CHỐI)"
    lines = [
        "=" * 80,
        f"  BÁO CÁO XÁC THỰC ĐẦU TƯ (INVESTMENT COMMITTEE VERIFICATION VERDICT)",
        "=" * 80,
        f"Quyết định cuối cùng: {icon} {verdict.verdict_code} {label}",
        f"Điểm Đánh Giá Kỷ Luật (Score): {verdict.overall_score:.1f} / 100",
        "\nCHECKLIST 7 TIÊU CHUẨN XÁC THỰC:"
    ]
    
    table_data = []
    for item in verdict.checklist:
        status_str = "PASS" if item.passed else "FAIL"
        table_data.append([status_str, item.criterion, item.details])
        
    headers = ["Kết Quả", "Tiêu Chí Kiểm Định (7 Standards)", "Chi Tiết Đánh Giá"]
    table_str = tabulate(table_data, headers=headers, tablefmt="github")
    lines.append(table_str)
    lines.append(f"\nNhận xét từ Hội đồng Xác thực: {verdict.feedback_notes}")
    lines.append("=" * 80)
    return "\n".join(lines)
