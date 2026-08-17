import os
import json
import numpy as np
from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext, MarketAnalysis
from src.models.persona import PersonaProfile, PersonaDecision, SimulationConsensus, ActionType

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
        mos = analysis.margin_of_safety
        sentiment = analysis.news_sentiment_score
        
        target_price = current_price
        reasoning = ""
        action = ActionType.HOLD
        confidence = 0.5
        sent_val = 0.0

        if persona.id == "p1_fomo_retailer":
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

        elif persona.id == "p2_deep_value":
            if mos >= 15.0:
                action = ActionType.BUY
                confidence = 0.90
                sent_val = 0.70
                target_price = ctx.financials.intrinsic_value_dcf
                reasoning = f"Định giá DCF chiết khấu tốt ({mos:.1f}% Margin of Safety). Mua tích trữ."
            else:
                action = ActionType.HOLD
                confidence = 0.60
                reasoning = "Biên an toàn MoS chưa đủ hấp dẫn (< 15%). Kiên nhẫn chờ giá chiết khấu sâu hơn."

        elif persona.id == "p3_swing_trader":
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

        elif persona.id == "p4_panic_seller":
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

        elif persona.id == "p7_contrarian":
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

        if action == ActionType.HOLD and (persona.id not in ["p1_fomo_retailer", "p2_deep_value", "p3_swing_trader", "p4_panic_seller", "p7_contrarian"]):
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
                reasoning = f"Tiêu chuẩn chiến lược {persona.name} thỏa mãn tín hiệu Mua (Score: {score:.2f})."
            elif score < -0.35:
                action = ActionType.SELL
                confidence = min(0.95, 0.65 - score * 0.3)
                sent_val = round(score, 2)
                target_price = current_price * (1.0 + score * 0.1)
                reasoning = f"Tiêu chuẩn chiến lược {persona.name} vi phạm ngưỡng an toàn (Score: {score:.2f})."
            else:
                action = ActionType.HOLD
                confidence = 0.60
                sent_val = 0.0
                target_price = current_price * 1.0
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
        """Mô phỏng 10,000 Agents đồng nhất công thức với 10 Personas"""
        print(f"🚀 Đang khởi chạy mô phỏng quy mô lớn với {count:,} Agents giả lập...")
        
        tech_weights = np.random.uniform(0.1, 0.8, count)
        fund_weights = np.random.uniform(0.1, 0.8, count)
        news_sens = np.random.uniform(0.1, 0.9, count)
        herd_instincts = np.random.uniform(0.1, 0.95, count)
        
        uptrend_val = 1.0 if analysis.is_uptrend else -0.5
        undervalued_val = 1.0 if analysis.is_undervalued else -0.2
        sent_val = analysis.news_sentiment_score
        
        scores = (
            tech_weights * uptrend_val +
            fund_weights * undervalued_val +
            news_sens * sent_val +
            herd_instincts * (0.5 if analysis.rsi > 60 else -0.5 if analysis.rsi < 40 else 0)
        )
        
        buys = np.sum(scores > 0.35)
        sells = np.sum(scores < -0.35)
        holds = count - (buys + sells)
        
        return {
            "total_agents": count,
            "buy_pct": round((buys / count) * 100, 2),
            "sell_pct": round((sells / count) * 100, 2),
            "hold_pct": round((holds / count) * 100, 2),
            "panic_pct": 0.0,
            "market_state": "HƯNG PHẤN BẦY ĐÀN" if buys > 6000 else "ĐIỀU CHỈNH HOẢNG LOẠN" if sells > 5000 else "TÍCH LŨY PHÂN HÓA"
        }
