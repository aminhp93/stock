import numpy as np
from typing import List, Tuple

def calculate_rsi(prices: List[float], period: int = 14) -> float:
    """Calculate RSI using Wilder's Smoothed Moving Average (industry standard)."""
    if len(prices) < period + 1:
        return 50.0  # Neutral default

    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    # Seed with simple mean of first period, then apply Wilder's EMA
    avg_gain = float(np.mean(gains[:period]))
    avg_loss = float(np.mean(losses[:period]))

    # Wilder's smoothing: alpha = 1/period (equivalent to EMA)
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + float(gains[i])) / period
        avg_loss = (avg_loss * (period - 1) + float(losses[i])) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return float(round(100.0 - (100.0 / (1.0 + rs)), 2))

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
    """
    Calculate Margin of Safety as a PERCENTAGE (e.g. 13.5 = 13.5% discount).
    Positive = undervalued, negative = overvalued.
    """
    if intrinsic_value <= 0:
        return 0.0
    mos_pct = (intrinsic_value - current_price) / intrinsic_value * 100.0
    return float(round(mos_pct, 2))
