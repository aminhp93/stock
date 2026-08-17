import numpy as np
from typing import List, Tuple

def calculate_rsi(prices: List[float], period: int = 14) -> float:
    """Calculate Relative Strength Index (RSI)"""
    if len(prices) < period + 1:
        return 50.0  # Neutral default
    
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return float(round(rsi, 2))

def calculate_kelly_criterion(win_rate: float, win_loss_ratio: float) -> float:
    """
    Calculate Kelly Criterion position sizing percentage:
    f* = (b*p - q) / b
    where p = win rate, q = 1 - p, b = win/loss ratio
    """
    if win_loss_ratio <= 0:
        return 0.0
    p = win_rate
    q = 1.0 - p
    b = win_loss_ratio
    kelly_fraction = (b * p - q) / b
    # Use fractional Kelly (50% Half-Kelly) for safety in stocks
    half_kelly = max(0.0, kelly_fraction * 0.5)
    return float(round(half_kelly, 4))

def calculate_risk_reward_ratio(entry: float, stop_loss: float, take_profit: float) -> float:
    """Calculate Risk/Reward Ratio"""
    risk = abs(entry - stop_loss)
    reward = abs(take_profit - entry)
    if risk == 0:
        return 0.0
    return float(round(reward / risk, 2))

def calculate_margin_of_safety(current_price: float, intrinsic_value: float) -> float:
    """Calculate Margin of Safety percentage"""
    if intrinsic_value <= 0:
        return 0.0
    mos = (intrinsic_value - current_price) / intrinsic_value
    return float(round(mos, 4))
