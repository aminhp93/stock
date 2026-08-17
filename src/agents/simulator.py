import json
import os
import random
import numpy as np
from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext
from src.models.persona import (
    PersonaProfile,
    PersonaDecision,
    ActionType,
    SimulationConsensus
)

class BehavioralSimulationEngine(BaseAgent):
    def __init__(self, personas_config_path: str = "config/personas.json"):
        super().__init__(
            agent_id="agent_02b_simulator",
            name="10-Investor Behavioral Simulation Engine",
            role="Giả lập phản ứng tâm lý & hành vi giao dịch của 10 nhà đầu tư mô phỏng người thật"
        )
        self.personas = self._load_personas(personas_config_path)

    def _load_personas(self, path: str) -> List[PersonaProfile]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Không tìm thấy file config personas tại {path}")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [PersonaProfile(**item) for item in data]

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "market_context": MarketContext, "market_analysis": Dict }
        Output: { "simulation_consensus": SimulationConsensus }
        """
        ctx: MarketContext = inputs["market_context"]
        analysis: Dict[str, Any] = inputs.get("market_analysis", {})
        
        decisions: List[PersonaDecision] = []
        
        # Simulate each of the 10 core personas
        for p in self.personas:
            decision = self._evaluate_persona_response(p, ctx, analysis)
            decisions.append(decision)
            
        # Calculate Consensus Statistics
        total = len(decisions)
        buys = sum(1 for d in decisions if d.action in [ActionType.BUY, ActionType.FOMO_BUY])
        sells = sum(1 for d in decisions if d.action in [ActionType.SELL, ActionType.PANIC_SELL])
        holds = sum(1 for d in decisions if d.action == ActionType.HOLD)
        panics = sum(1 for d in decisions if d.action == ActionType.PANIC_SELL)
        
        overall_sentiment = float(np.mean([d.sentiment_score for d in decisions]))
        
        summary_text = (
            f"Thị trường có sự phân hóa: {buys}/{total} Agent chọn MUA, {sells}/{total} Agent chọn BÁN. "
            f"Tâm lý chung: {'Hưng phấn' if overall_sentiment > 0.2 else 'Thận trọng / Hoảng loạn' if overall_sentiment < -0.2 else 'Giằng co'}."
        )
        
        consensus = SimulationConsensus(
            timestamp=ctx.timestamp,
            total_agents=total,
            buy_percentage=round((buys / total) * 100, 1),
            sell_percentage=round((sells / total) * 100, 1),
            hold_percentage=round((holds / total) * 100, 1),
            panic_percentage=round((panics / total) * 100, 1),
            overall_sentiment_score=round(overall_sentiment, 2),
            consensus_summary=summary_text,
            individual_decisions=decisions
        )
        
        return {"simulation_consensus": consensus}

    def _evaluate_persona_response(self, p: PersonaProfile, ctx: MarketContext, analysis: Dict[str, Any]) -> PersonaDecision:
        """Rules & Heuristics engine simulating real human reaction for each persona"""
        rsi = analysis.get("rsi", 50.0)
        mos = analysis.get("margin_of_safety", 0.0)
        is_uptrend = analysis.get("is_uptrend", True)
        news_sentiment = analysis.get("news_sentiment_score", 0.0)
        price = ctx.current_price
        
        # Calculate persona perception score
        tech_signal = (rsi - 50.0) / 50.0  # +1 (Overbought/Uptrend), -1 (Oversold/Downtrend)
        fund_signal = mos * 2.0  # Discount score
        
        if p.herd_instinct < 0:  # Contrarian
            herd_signal = -news_sentiment
        else:
            herd_signal = news_sentiment * p.herd_instinct
            
        combined_score = (
            p.technical_weight * tech_signal +
            p.fundamental_weight * fund_signal +
            p.news_sensitivity * herd_signal
        )
        
        # Determine action and reasoning based on Persona Archetype
        if p.id == "p01_fomo_retailer":
            if news_sentiment > 0.4 or rsi > 65:
                action = ActionType.FOMO_BUY
                reason = "Tin tức quá tốt và giá đang bay mạnh, mua ngay kẻo lỡ tàu (FOMO)!"
                target = price * 1.25
                confidence = 0.85
                sentiment = 0.9
            elif news_sentiment < -0.3:
                action = ActionType.PANIC_SELL
                reason = "Tin xấu ra rầm rộ, cắt lỗ gấp!"
                target = price * 0.85
                confidence = 0.80
                sentiment = -0.8
            else:
                action = ActionType.HOLD
                reason = "Quan sát thêm chờ tín hiệu đua lệnh."
                target = price * 1.05
                confidence = 0.50
                sentiment = 0.1

        elif p.id == "p02_deep_value":
            if mos >= 0.15:  # >=15% Margin of Safety
                action = ActionType.BUY
                reason = f"Định giá DCF chiết khấu tốt ({mos*100:.1f}% Margin of Safety). Mua tích trữ dài hạn."
                target = ctx.financials.intrinsic_value_dcf
                confidence = 0.90
                sentiment = 0.7
            elif mos < -0.10:
                action = ActionType.SELL
                reason = "Thị trường đã định giá quá cao so với giá trị thực. Bán chốt lời."
                target = price * 0.9
                confidence = 0.75
                sentiment = -0.3
            else:
                action = ActionType.HOLD
                reason = "Mức giá hiện tại tiệm cận giá trị hợp lý (Fair value). Giữ vị thế."
                target = ctx.financials.intrinsic_value_dcf
                confidence = 0.60
                sentiment = 0.0

        elif p.id == "p03_swing_trader":
            if is_uptrend and rsi < 70:
                action = ActionType.BUY
                reason = f"Giá trên MA20 và RSI ({rsi:.1f}) còn dư địa tăng. Vào lệnh lướt sóng."
                target = price * 1.12
                confidence = 0.80
                sentiment = 0.6
            elif rsi >= 70:
                action = ActionType.SELL
                reason = f"RSI ở vùng quá mua ({rsi:.1f}). Chốt lời ngắn hạn."
                target = price * 0.98
                confidence = 0.70
                sentiment = -0.2
            else:
                action = ActionType.HOLD
                reason = "Chờ đợi tín hiệu tích lũy breakout rõ ràng hơn."
                target = price * 1.05
                confidence = 0.50
                sentiment = 0.0

        elif p.id == "p04_panic_seller":
            if ctx.market_index_change_pct < -0.5 or news_sentiment < 0:
                action = ActionType.PANIC_SELL
                reason = "Thị trường đỏ điểm và rủi ro tin xấu, bán tháo bảo vệ vốn!"
                target = price * 0.9
                confidence = 0.90
                sentiment = -0.9
            else:
                action = ActionType.HOLD
                reason = "Thị trường tạm yên ổn, giữ nhưng sẵn sàng bấm nút bán."
                target = price * 1.02
                confidence = 0.40
                sentiment = -0.1

        elif p.id == "p07_contrarian":
            if news_sentiment > 0.6 and rsi > 65:
                action = ActionType.SELL
                reason = "Đám đông đang hưng phấn tột độ. Đã đến lúc chốt lời đi ngược thị trường."
                target = price * 0.92
                confidence = 0.85
                sentiment = -0.6
            elif news_sentiment < -0.4 or rsi < 35:
                action = ActionType.BUY
                reason = "Đám đông hoảng loạn tột độ. Cơ hội tuyệt vời để thu gom cổ phiếu tốt giá rẻ."
                target = price * 1.20
                confidence = 0.85
                sentiment = 0.8
            else:
                action = ActionType.HOLD
                reason = "Tâm lý thị trường chưa ở mức cực đoan, kiên nhẫn chờ đợi."
                target = price * 1.0
                confidence = 0.60
                sentiment = 0.0

        else:
            # General baseline rules for remaining personas (Quant, Dividend, Scalper, Smart Money, Macro)
            if combined_score > 0.2:
                action = ActionType.BUY
                reason = f"Tiêu chuẩn chiến lược {p.name} thỏa mãn (Combined score = +{combined_score:.2f})."
                target = price * (1 + random.uniform(0.08, 0.18))
                confidence = round(min(0.95, 0.5 + combined_score), 2)
                sentiment = round(combined_score, 2)
            elif combined_score < -0.2:
                action = ActionType.SELL
                reason = f"Tín hiệu rủi ro vi phạm tiêu chuẩn của {p.name} (Combined score = {combined_score:.2f})."
                target = price * (1 - random.uniform(0.05, 0.12))
                confidence = round(min(0.95, 0.5 + abs(combined_score)), 2)
                sentiment = round(combined_score, 2)
            else:
                action = ActionType.HOLD
                reason = f"Biến động trong biên độ chấp nhận của {p.name}."
                target = price * 1.03
                confidence = 0.55
                sentiment = 0.0

        return PersonaDecision(
            persona_id=p.id,
            persona_name=p.name,
            action=action,
            confidence=confidence,
            sentiment_score=sentiment,
            expected_target_price=round(target, 0) if target else None,
            reasoning=reason
        )

    def run_large_scale_simulation(self, ctx: MarketContext, analysis: Dict[str, Any], count: int = 10000) -> Dict[str, Any]:
        """
        Engine mở rộng quy mô giả lập từ 10 lên 1.000 hoặc 10.000 Agents
        Sử dụng ma trận Monte-Carlo & Vectorized Decision Rules để đạt hiệu năng cao.
        """
        print(f"🚀 Đang khởi chạy mô phỏng quy mô lớn với {count:,} Agents giả lập...")
        
        # Distribute 10,000 agents across the 10 persona archetypes with variance
        weights = [0.25, 0.10, 0.15, 0.15, 0.05, 0.08, 0.05, 0.07, 0.05, 0.05] # Archetype distribution
        counts = np.random.multinomial(count, weights)
        
        rsi = analysis.get("rsi", 50.0)
        mos = analysis.get("margin_of_safety", 0.0)
        news_sentiment = analysis.get("news_sentiment_score", 0.0)
        
        buy_count = 0
        sell_count = 0
        hold_count = 0
        panic_count = 0
        
        for idx, p in enumerate(self.personas):
            n_agents = counts[idx]
            # Add stochastic noise to persona traits to simulate real individual humans
            herds = np.random.normal(p.herd_instinct, 0.1, n_agents)
            risks = np.random.normal(p.risk_tolerance, 0.1, n_agents)
            
            # Vectorized decision evaluation
            scores = (p.technical_weight * (rsi - 50)/50 + 
                      p.fundamental_weight * mos * 2 + 
                      p.news_sensitivity * news_sentiment * herds)
            
            buys = np.sum(scores > 0.15)
            sells = np.sum((scores < -0.15) & (risks > 0.3))
            panics = np.sum((scores < -0.15) & (risks <= 0.3))
            holds = n_agents - (buys + sells + panics)
            
            buy_count += int(buys)
            sell_count += int(sells)
            panic_count += int(panics)
            hold_count += int(holds)

        return {
            "total_agents": count,
            "buy_pct": round((buy_count / count) * 100, 2),
            "sell_pct": round((sell_count / count) * 100, 2),
            "hold_pct": round((hold_count / count) * 100, 2),
            "panic_pct": round((panic_count / count) * 100, 2),
            "market_state": "HƯNG PHẤN BẦY ĐÀN" if buy_count/count > 0.5 else "HOẢNG LOẠN XẢ HÀNG" if panic_count/count > 0.2 else "PHÂN HÓA GIẰNG CO"
        }
