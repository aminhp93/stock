from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class PriceBar(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    ma20: Optional[float] = None
    ma50: Optional[float] = None

class FinancialMetrics(BaseModel):
    pe_ratio: float
    pb_ratio: float
    roe: float  # Percentage
    profit_margin: float  # Percentage
    revenue_growth_yoy: float  # Percentage
    eps: float
    intrinsic_value_dcf: float
    debt_to_equity: float

class MacroNews(BaseModel):
    headline: str
    sentiment_score: float  # -1.0 (extremely negative) to +1.0 (extremely positive)
    category: str  # Macro, Earnings, Industry, Rumor
    importance: float  # 0.0 to 1.0

class MarketContext(BaseModel):
    symbol: str
    company_name: str
    sector: str
    current_price: float
    timestamp: str
    historical_bars: List[PriceBar]
    financials: FinancialMetrics
    news_events: List[MacroNews]
    market_index_change_pct: float

class MarketAnalysis(BaseModel):
    symbol: str
    current_price: float
    margin_of_safety: float
    is_undervalued: bool
    rsi: float
    is_uptrend: bool
    is_overbought: bool
    is_oversold: bool
    news_sentiment_score: float
    summary: str
