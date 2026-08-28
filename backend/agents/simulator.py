import os
import json
import numpy as np
from typing import Dict, Any, List
from backend.agents.base_agent import BaseAgent
from backend.models.market_data import MarketContext, MarketAnalysis
from backend.models.persona import PersonaProfile, PersonaDecision, SimulationConsensus, ActionType

class BehavioralSimulationEngine(BaseAgent):
    def __init__(self, personas_file: str = "config/personas.json"):
        super().__init__(
            agent_id="agent_02b_simulator",
            name="Behavioral Simulation Engine",
            role="Giả lập tâm lý 10 Nhà đầu tư người thật & mở rộng ma trận Monte-Carlo 10.000 Agents"
        )
        self.personas = self._load_personas(personas_file)

    def _load_personas(self, filepath: str) -> List[PersonaProfile]:
        if not os.path.exists(filepath):
            filepath = os.path.join(os.path.dirname(__file__), "..", "..", filepath)
            
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [PersonaProfile(**p) for p in data]

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "market_context": MarketContext, "market_analysis": MarketAnalysis }
        Output: { "simulation_consensus": SimulationConsensus }
        """
        context: MarketContext = inputs["market_context"]
        analysis: MarketAnalysis = inputs["market_analysis"]
        
        decisions: List[PersonaDecision] = []
        for persona in self.personas:
            dec = self._evaluate_persona(persona, context, analysis)
            decisions.append(dec)
            
        consensus = self._aggregate_consensus(context.symbol, context.timestamp, decisions)
        return {"simulation_consensus": consensus}

    def _evaluate_persona(self, persona: PersonaProfile, ctx: MarketContext, analysis: MarketAnalysis) -> PersonaDecision:
        current_price = ctx.current_price
        rsi = analysis.rsi
        mos = analysis.margin_of_safety  # percentage, e.g. 13.5 means 13.5%
        sentiment = analysis.news_sentiment_score

        action = ActionType.HOLD
        confidence = 0.5
        sent_val = 0.0
        target_price = current_price
        reasoning = ""

        pid = persona.id

        if pid == "p01_fomo_retailer":
            if sentiment > 0.3 or rsi > 60:
                action = ActionType.FOMO_BUY
                confidence = 0.85
                sent_val = 0.90
                target_price = current_price * 1.15
                reasoning = "Tin tức quá tốt và giá đang bay mạnh, mua ngay kẻo lỡ tàu (FOMO)!"
            elif rsi < 40 or sentiment < -0.3:
                action = ActionType.PANIC_SELL
                confidence = 0.90
                sent_val = -0.90
                target_price = current_price * 0.85
                reasoning = "Thị trường xấu và giá sụt giảm mạnh, cắt lỗ tháo chạy!"
            else:
                action = ActionType.HOLD
                confidence = 0.50
                reasoning = "Chưa có tín hiệu rõ ràng để hành động."

        elif pid == "p02_deep_value":
            if mos >= 15.0:
                action = ActionType.BUY
                confidence = 0.90
                sent_val = 0.70
                target_price = ctx.financials.intrinsic_value_dcf
                reasoning = f"Định giá DCF chiết khấu tốt ({mos:.1f}% Margin of Safety). Mua tích trữ."
            else:
                action = ActionType.HOLD
                confidence = 0.60
                reasoning = f"Biên an toàn MoS chưa đủ hấp dẫn ({mos:.1f}% < 15%). Kiên nhẫn chờ giá chiết khấu sâu hơn."

        elif pid == "p03_swing_trader":
            if analysis.is_uptrend and rsi < 68:
                action = ActionType.BUY
                confidence = 0.80
                sent_val = 0.60
                target_price = current_price * 1.08
                reasoning = f"Giá trên MA20 và RSI ({rsi:.1f}) còn dư địa tăng. Vào lệnh lướt sóng."
            elif rsi >= 70:
                action = ActionType.SELL
                confidence = 0.85
                sent_val = -0.60
                target_price = current_price * 0.95
                reasoning = f"RSI ({rsi:.1f}) chìm trong vùng quá mua. Chốt lời vùng đỉnh ngắn hạn."
            else:
                action = ActionType.HOLD
                confidence = 0.50
                reasoning = "Chờ đợi tín hiệu tích lũy breakout rõ ràng hơn."

        elif pid == "p04_panic_seller":
            if rsi < 35 or sentiment < -0.2:
                action = ActionType.PANIC_SELL
                confidence = 0.95
                sent_val = -0.95
                target_price = current_price * 0.80
                reasoning = "Xuất hiện rủi ro ngắn hạn, chốt hoảng loạn bảo vệ tiền vốn mặt."
            else:
                action = ActionType.HOLD
                confidence = 0.40
                sent_val = -0.10
                target_price = current_price * 0.95
                reasoning = "Thị trường tạm yên ổn, giữ nhưng sẵn sàng bấm nút bán."

        elif pid == "p05_quant_fund":
            # Algo: mean-reversion in uptrend; exit on overbought or trend break
            if analysis.is_uptrend and 30 <= rsi <= 50:
                action = ActionType.BUY
                confidence = 0.82
                sent_val = 0.55
                target_price = current_price * 1.10
                reasoning = f"Thuật toán: Uptrend + RSI ({rsi:.1f}) vùng hồi phục. Xác suất thống kê nghiêng về BUY."
            elif rsi >= 70 or (not analysis.is_uptrend and rsi > 60):
                action = ActionType.SELL
                confidence = 0.80
                sent_val = -0.55
                target_price = current_price * 0.93
                reasoning = f"Thuật toán: RSI ({rsi:.1f}) quá mua hoặc xu hướng đảo chiều. Thoát vị thế."
            else:
                action = ActionType.HOLD
                confidence = 0.65
                reasoning = "Tín hiệu thống kê chưa đủ mạnh để triển khai vị thế."

        elif pid == "p06_dividend_growth":
            fin = ctx.financials
            strong_fundamentals = fin.roe >= 18.0 and fin.profit_margin >= 12.0 and fin.debt_to_equity <= 0.8
            if strong_fundamentals and mos >= 5.0:
                action = ActionType.BUY
                confidence = 0.78
                sent_val = 0.60
                target_price = fin.intrinsic_value_dcf
                reasoning = f"ROE {fin.roe:.1f}%, Biên LN {fin.profit_margin:.1f}%, D/E {fin.debt_to_equity:.2f} – nền tảng cổ tức ổn định."
            elif fin.debt_to_equity > 1.5 or fin.roe < 12.0:
                action = ActionType.SELL
                confidence = 0.72
                sent_val = -0.45
                target_price = current_price * 0.95
                reasoning = "Chỉ số nền tảng suy yếu (ROE thấp / nợ cao). Giảm tỷ trọng."
            else:
                action = ActionType.HOLD
                confidence = 0.70
                reasoning = "Nền tảng ổn, tiếp tục nắm giữ để nhận cổ tức."

        elif pid == "p07_contrarian":
            if rsi >= 72:
                action = ActionType.SELL
                confidence = 0.88
                sent_val = -0.80
                target_price = current_price * 0.90
                reasoning = "Đám đông đang hưng phấn cực độ (RSI > 72). Bán chốt lời đi ngược đám đông!"
            elif rsi <= 32:
                action = ActionType.BUY
                confidence = 0.88
                sent_val = 0.80
                target_price = current_price * 1.20
                reasoning = "Đám đông hoảng loạn tháo chạy (RSI < 32). Mua gom khi thị trường sợ hãi nhất!"
            else:
                action = ActionType.HOLD
                confidence = 0.55
                reasoning = f"RSI ({rsi:.1f}) chưa đạt vùng cực đoan. Chờ tín hiệu đảo chiều rõ hơn."

        elif pid == "p08_aggressive_scalper":
            # Pure momentum, ultra-short T+, tight exits
            if analysis.is_uptrend and 45 <= rsi <= 70:
                action = ActionType.FOMO_BUY
                confidence = 0.88
                sent_val = 0.75
                target_price = current_price * 1.05
                reasoning = f"Momentum mạnh (RSI {rsi:.1f}), đang uptrend. Vào lệnh lướt T+."
            elif rsi > 72 or not analysis.is_uptrend:
                action = ActionType.SELL
                confidence = 0.90
                sent_val = -0.70
                target_price = current_price * 0.97
                reasoning = f"Gãy momentum hoặc RSI ({rsi:.1f}) quá mua. Thoát lệnh ngay lập tức."
            else:
                action = ActionType.HOLD
                confidence = 0.45
                reasoning = "Không có tín hiệu momentum rõ ràng. Đứng ngoài chờ cơ hội."

        elif pid == "p09_smart_money":
            # Tracks institutional/foreign flows via index movement + sentiment
            idx_positive = ctx.market_index_change_pct > 0
            if idx_positive and analysis.is_uptrend and sentiment > 0.2:
                action = ActionType.BUY
                confidence = 0.83
                sent_val = 0.65
                target_price = current_price * 1.15
                reasoning = "VN-Index tích cực, dòng tiền lớn đang tích lũy. Theo chân smart money."
            elif not idx_positive and sentiment < -0.2:
                action = ActionType.SELL
                confidence = 0.80
                sent_val = -0.60
                target_price = current_price * 0.92
                reasoning = "Dòng tiền lớn rút lui, VN-Index điều chỉnh. Giảm tỷ trọng."
            else:
                action = ActionType.HOLD
                confidence = 0.65
                reasoning = "Tín hiệu dòng tiền lớn chưa rõ chiều hướng. Quan sát thêm."

        elif pid == "p10_macro_strategist":
            # Top-down: macro sentiment + cycle positioning
            strong_macro = sentiment > 0.4 and ctx.market_index_change_pct > 0
            weak_macro = sentiment < -0.3 or ctx.market_index_change_pct < -1.5
            if strong_macro and analysis.is_uptrend:
                action = ActionType.BUY
                confidence = 0.80
                sent_val = 0.70
                target_price = current_price * 1.20
                reasoning = f"Tín hiệu vĩ mô tích cực (Sentiment: {sentiment:.2f}), chu kỳ tăng trưởng thuận lợi."
            elif weak_macro:
                action = ActionType.SELL
                confidence = 0.78
                sent_val = -0.65
                target_price = current_price * 0.90
                reasoning = f"Môi trường vĩ mô bất lợi (Sentiment: {sentiment:.2f}). Giảm tỷ trọng phòng thủ."
            else:
                action = ActionType.HOLD
                confidence = 0.68
                reasoning = "Vĩ mô chưa có tín hiệu đột biến. Duy trì vị thế trung tính."

        else:
            # Fallback generic weighted scoring for any unrecognised persona
            score = (
                persona.technical_weight * (1.0 if analysis.is_uptrend else -0.5) +
                persona.fundamental_weight * (1.0 if analysis.is_undervalued else -0.2) +
                persona.news_sensitivity * sentiment
            )
            if score > 0.35:
                action = ActionType.BUY
                confidence = min(0.95, 0.65 + score * 0.3)
                sent_val = round(score, 2)
                target_price = current_price * (1.0 + score * 0.1)
                reasoning = f"Tiêu chuẩn {persona.name} thỏa mãn tín hiệu Mua (Score: {score:.2f})."
            elif score < -0.35:
                action = ActionType.SELL
                confidence = min(0.95, 0.65 - score * 0.3)
                sent_val = round(score, 2)
                target_price = current_price * (1.0 + score * 0.1)
                reasoning = f"Tiêu chuẩn {persona.name} vi phạm ngưỡng an toàn (Score: {score:.2f})."
            else:
                action = ActionType.HOLD
                confidence = 0.60
                reasoning = f"Biến động trong biên độ chấp nhận của {persona.name}."

        return PersonaDecision(
            persona_id=persona.id,
            persona_name=persona.name,
            action=action,
            confidence=round(confidence, 2),
            sentiment_score=round(sent_val, 2),
            expected_target_price=round(target_price, 0),
            reasoning=reasoning
        )

    def _aggregate_consensus(self, symbol: str, timestamp: str, decisions: List[PersonaDecision]) -> SimulationConsensus:
        total = len(decisions)
        buys = sum(1 for d in decisions if d.action in [ActionType.BUY, ActionType.FOMO_BUY])
        sells = sum(1 for d in decisions if d.action == ActionType.SELL)
        holds = sum(1 for d in decisions if d.action == ActionType.HOLD)
        panics = sum(1 for d in decisions if d.action == ActionType.PANIC_SELL)
        
        buy_pct = (buys / total) * 100
        sell_pct = (sells / total) * 100
        hold_pct = (holds / total) * 100
        panic_pct = (panics / total) * 100
        
        avg_sentiment = float(np.mean([d.sentiment_score for d in decisions]))
        
        if avg_sentiment > 0.3:
            sentiment_label = "TÍCH CỰC (BULLISH)"
        elif avg_sentiment < -0.3:
            sentiment_label = "TIÊU CỰC (BEARISH)"
        else:
            sentiment_label = "TRUNG TÍNH (NEUTRAL)"
            
        summary = (
            f"Thị trường có sự phân hóa: {buys}/{total} Agent chọn MUA, "
            f"{sells+panics}/{total} Agent chọn BÁN. Tâm lý chung: {sentiment_label.split()[0]}."
        )
        
        return SimulationConsensus(
            timestamp=timestamp,
            total_agents=total,
            buy_percentage=round(buy_pct, 1),
            sell_percentage=round(sell_pct, 1),
            hold_percentage=round(hold_pct, 1),
            panic_percentage=round(panic_pct, 1),
            overall_sentiment_score=round(avg_sentiment, 2),
            consensus_summary=summary,
            individual_decisions=decisions
        )

    def run_large_scale_simulation(self, ctx: MarketContext, analysis: MarketAnalysis, count: int = 10000) -> Dict[str, Any]:
        """Sample randomized persona weights across `count` agents to estimate market distribution."""
        print(f"🚀 Đang khởi chạy mô phỏng quy mô lớn với {count:,} Agents giả lập...")

        rng = np.random.default_rng(seed=42)  # fixed seed for reproducibility
        tech_weights = rng.uniform(0.1, 0.8, count)
        fund_weights = rng.uniform(0.1, 0.8, count)
        news_sens = rng.uniform(0.1, 0.9, count)
        herd_instincts = rng.uniform(0.1, 0.95, count)
        panic_thresholds = rng.uniform(0.03, 0.25, count)

        uptrend_val = 1.0 if analysis.is_uptrend else -0.5
        undervalued_val = 1.0 if analysis.is_undervalued else -0.2
        sent_val = analysis.news_sentiment_score
        rsi_signal = 0.5 if analysis.rsi > 60 else (-0.5 if analysis.rsi < 40 else 0.0)

        scores = (
            tech_weights * uptrend_val +
            fund_weights * undervalued_val +
            news_sens * sent_val +
            herd_instincts * rsi_signal
        )

        # Panic agents: triggered by extreme fear conditions
        panic_condition = (analysis.rsi < 35) or (sent_val < -0.5)
        if panic_condition:
            panic_mask = rng.random(count) < panic_thresholds
            panics = int(np.sum(panic_mask))
            active_scores = scores[~panic_mask]
        else:
            panics = 0
            active_scores = scores

        buys = int(np.sum(active_scores > 0.35))
        sells = int(np.sum(active_scores < -0.35))
        holds = count - buys - sells - panics

        return {
            "total_agents": count,
            "buy_pct": round((buys / count) * 100, 2),
            "sell_pct": round((sells / count) * 100, 2),
            "hold_pct": round(max(0, holds / count) * 100, 2),
            "panic_pct": round((panics / count) * 100, 2),
            "market_state": (
                "HƯNG PHẤN BẦY ĐÀN" if buys > count * 0.6
                else "ĐIỀU CHỈNH HOẢNG LOẠN" if (sells + panics) > count * 0.5
                else "TÍCH LŨY PHÂN HÓA"
            )
        }
