from typing import Dict, Any
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext
from src.utils.metrics import calculate_margin_of_safety

class MarketAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_02a_market",
            name="Market Analysis Agent",
            role="Phân tích Cơ bản & Kỹ thuật thị trường cổ phiếu"
        )

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "market_context": MarketContext }
        Output: { "market_analysis": Dict[str, Any] }
        """
        ctx: MarketContext = inputs["market_context"]
        
        # Fundamental Analysis
        mos = calculate_margin_of_safety(ctx.current_price, ctx.financials.intrinsic_value_dcf)
        is_undervalued = mos > 0.10  # >10% discount
        
        # Technical Analysis
        latest_bar = ctx.historical_bars[-1]
        rsi = latest_bar.rsi or 50.0
        ma20 = latest_bar.ma20 or ctx.current_price
        
        is_uptrend = ctx.current_price > ma20
        is_overbought = rsi > 70.0
        is_oversold = rsi < 30.0
        
        # News Sentiment
        total_sentiment = sum([n.sentiment_score * n.importance for n in ctx.news_events])
        avg_sentiment = total_sentiment / len(ctx.news_events) if ctx.news_events else 0.0
        
        analysis = {
            "symbol": ctx.symbol,
            "current_price": ctx.current_price,
            "margin_of_safety": mos,
            "is_undervalued": is_undervalued,
            "rsi": rsi,
            "is_uptrend": is_uptrend,
            "is_overbought": is_overbought,
            "is_oversold": is_oversold,
            "news_sentiment_score": avg_sentiment,
            "summary": (
                f"{ctx.symbol} đang ở xu hướng {'TĂNG' if is_uptrend else 'GIẢM'} (RSI={rsi:.1f}). "
                f"Margin of Safety DCF: {mos*100:.1f}%. Sentiment tin tức: {avg_sentiment:+.2f}."
            )
        }
        
        return {"market_analysis": analysis}
