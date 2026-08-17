import numpy as np
from typing import Dict, Any
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext, MarketAnalysis
from src.utils.metrics import calculate_margin_of_safety

class MarketAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_02a_market",
            name="Market Analyzer Agent",
            role="Phân tích Kỹ thuật (RSI, MA20/MA50) & Định giá cơ bản (Margin of Safety DCF)"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "market_context": MarketContext }
        Output: { "market_analysis": MarketAnalysis (Pydantic Model) }
        """
        context: MarketContext = inputs["market_context"]
        current_price = context.current_price
        intrinsic_value = context.financials.intrinsic_value_dcf
        
        # 1. Valuation Analysis
        mos = calculate_margin_of_safety(current_price, intrinsic_value)
        is_undervalued = mos >= 15.0  # Discount >= 15%
        
        # 2. Technical Analysis
        bars = context.historical_bars
        last_bar = bars[-1] if bars else None
        
        rsi = last_bar.rsi if (last_bar and last_bar.rsi is not None) else 50.0
        ma20 = last_bar.ma20 if (last_bar and last_bar.ma20 is not None) else current_price
        
        is_uptrend = current_price >= ma20
        is_overbought = rsi >= 70.0
        is_oversold = rsi <= 30.0
        
        # 3. Sentiment Weight Aggregation
        news_sentiment = 0.0
        if context.news_events:
            scores = [n.sentiment_score * n.importance for n in context.news_events]
            news_sentiment = float(np.mean(scores))
            
        summary = (
            f"Cổ phiếu {context.symbol}: Giá {current_price:,.0f} VND | "
            f"DCF Value {intrinsic_value:,.0f} VND (MoS: {mos:.1f}%) | "
            f"RSI: {rsi:.1f} ({'Quá Mua' if is_overbought else 'Quá Bán' if is_oversold else 'Trung Tính'}) | "
            f"Xu hướng: {'UPTREND' if is_uptrend else 'DOWNTREND'}"
        )
        
        analysis = MarketAnalysis(
            symbol=context.symbol,
            current_price=current_price,
            margin_of_safety=mos,
            is_undervalued=is_undervalued,
            rsi=rsi,
            is_uptrend=is_uptrend,
            is_overbought=is_overbought,
            is_oversold=is_oversold,
            news_sentiment_score=round(news_sentiment, 2),
            summary=summary
        )
        
        return {"market_analysis": analysis}
