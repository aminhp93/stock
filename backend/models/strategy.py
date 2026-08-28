from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class ScenarioType(str, Enum):
    BULL = "BULL"
    BASE = "BASE"
    BEAR = "BEAR"

class ScenarioDetail(BaseModel):
    scenario: ScenarioType
    probability: float  # e.g., 0.3, 0.5, 0.2
    target_price: float
    catalysts: List[str]
    risks: List[str]

class TradingPlan(BaseModel):
    symbol: str
    entry_zone_min: float
    entry_zone_max: float
    stop_loss_price: float
    take_profit_target_1: float
    take_profit_target_2: float
    recommended_holding_period: str
    allocation_pct: float  # Percentage of portfolio (e.g., 15%)
    risk_reward_ratio: float
    scenarios: List[ScenarioDetail]
    thesis_summary: str

class RiskAssessment(BaseModel):
    is_position_size_safe: bool
    recommended_kelly_position_pct: float
    potential_loss_pct: float
    risk_reward_ratio_valid: bool
    stress_test_drawdown_impact_pct: float
    risk_warnings: List[str]

class VerificationCheckItem(BaseModel):
    criterion: str
    passed: bool
    details: str

class VerificationVerdict(BaseModel):
    approved: bool
    verdict_code: str  # APPROVED, REJECTED, REVISE_REQUIRED
    overall_score: float  # 0 to 100
    checklist: List[VerificationCheckItem]
    feedback_notes: str
    recommendations: List[str]
