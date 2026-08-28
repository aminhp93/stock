from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class ActionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"
    PANIC_SELL = "PANIC_SELL"
    FOMO_BUY = "FOMO_BUY"

class PersonaProfile(BaseModel):
    id: str
    name: str
    category: str
    horizon: str
    risk_tolerance: float
    news_sensitivity: float
    technical_weight: float
    fundamental_weight: float
    herd_instinct: float
    panic_threshold: float
    description: str

class PersonaDecision(BaseModel):
    persona_id: str
    persona_name: str
    action: ActionType
    confidence: float  # 0.0 to 1.0
    sentiment_score: float  # -1.0 to 1.0
    expected_target_price: Optional[float] = None
    reasoning: str

class SimulationConsensus(BaseModel):
    timestamp: str
    total_agents: int
    buy_percentage: float
    sell_percentage: float
    hold_percentage: float
    panic_percentage: float
    overall_sentiment_score: float  # -1.0 (Extreme Fear) to +1.0 (Extreme Greed)
    consensus_summary: str
    individual_decisions: List[PersonaDecision]
