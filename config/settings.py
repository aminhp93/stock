import os
from pydantic import BaseModel

class SystemSettings(BaseModel):
    app_name: str = "Multi-Agent Stock Investment System"
    version: str = "1.0.0"
    
    # Risk Management Defaults
    max_position_size_pct: float = 0.20  # Max 20% portfolio per stock
    min_risk_reward_ratio: float = 2.5   # Min 1:2.5 RRR
    max_portfolio_drawdown_limit: float = 0.15  # Max 15% portfolio drawdown
    default_stop_loss_pct: float = 0.05  # 5% default stop loss
    
    # Simulation Defaults
    num_default_personas: int = 10
    scalable_agent_cap: int = 10000

    # Telegram Notification Settings
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "8826335100:AAGMovZALzZMN1mTiY4AAYD0AyPUBNiygPI")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "@canslim01")

settings = SystemSettings()
