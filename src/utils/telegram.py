import os
import requests
from typing import Dict, Any, Optional
from config.settings import settings

class TelegramNotifier:
    """Utility class phục vụ việc gửi thông báo tín hiệu đầu tư & báo cáo xác thực về Telegram"""

    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = bot_token or settings.telegram_bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = chat_id or settings.telegram_chat_id or os.getenv("TELEGRAM_CHAT_ID", "")

    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """
        Gửi tin nhắn văn bản về Telegram Channel / Group.
        """
        if not self.is_configured():
            print("⚠️ TelegramNotifier chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.")
            return False

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }

        try:
            response = requests.post(url, json=payload, timeout=10)
            data = response.json()
            if data.get("ok"):
                print("✅ Đã gửi thông báo Telegram thành công.")
                return True
            else:
                print(f"❌ Telegram API Error: {data.get('description')}")
                return False
        except Exception as e:
            print(f"❌ Lỗi gửi Telegram message: {e}")
            return False

    def send_pipeline_alert(self, pipeline_result: Dict[str, Any]) -> bool:
        """
        Đóng gói và gửi Báo cáo Xác thực Đầu tư 5 Bước đẹp mắt về Telegram.
        """
        try:
            ctx = pipeline_result["market_context"]
            analysis = pipeline_result["market_analysis"]
            consensus = pipeline_result["simulation_consensus"]
            plan = pipeline_result["trading_plan"]
            risk = pipeline_result["risk_assessment"]
            verdict = pipeline_result["verification_verdict"]

            status_icon = "✅ APPROVED" if verdict.approved else "❌ REJECTED"
            trend_str = "BULLISH (TĂNG GIÁ)" if analysis.is_uptrend else "BEARISH / SIDEWAYS"

            msg = f"""<b>📊 BÁO CÁO KẾT QUẢ ĐẦU TƯ MULTI-AGENT</b>
━━━━━━━━━━━━━━━━━━━━
<b>Mã cổ phiếu:</b> <code>{ctx.symbol}</code> ({ctx.company_name})
<b>Thời điểm:</b> <code>{ctx.timestamp}</code>
<b>Giá hiện tại:</b> <code>{ctx.current_price:,.0f} VND</code>

<b>1. Phân tích Thị trường & Tâm lý:</b>
- Xu hướng Kỹ thuật: <b>{trend_str}</b>
- Biên an toàn định giá: <b>{analysis.margin_of_safety * 100:.1f}%</b>
- Đồng thuận 10 Personas: MUA <b>{consensus.buy_percentage:.0f}%</b> | BÁN <b>{consensus.sell_percentage:.0f}%</b> | GIỮ <b>{consensus.hold_percentage:.0f}%</b>
- Chỉ số Cảm xúc: <b>{consensus.overall_sentiment_score:+.2f}</b>

<b>2. Kế hoạch Giao dịch (Strategy):</b>
- Mức giá Mua (Entry Zone): <code>{plan.entry_zone_min:,.0f} - {plan.entry_zone_max:,.0f} VND</code>
- Dừng lỗ (Hard Stop Loss): <code>{plan.stop_loss_price:,.0f} VND</code>
- Chốt lời (Take Profit 1): <code>{plan.take_profit_target_1:,.0f} VND</code>
- Tỷ lệ Risk/Reward (RRR): <b>1:{plan.risk_reward_ratio:.2f}</b>

<b>3. Quản trị Rủi ro & Phê duyệt:</b>
- Quy mô vị thế khuyến nghị: <b>{risk.recommended_kelly_position_pct * 100:.1f}% tài khoản</b>
- Điểm Kỷ luật Xác thực: <b>{verdict.overall_score:.1f} / 100</b>
- Quyết định Hội đồng: <b>{status_icon}</b>
━━━━━━━━━━━━━━━━━━━━
<i>Nhận xét: {verdict.feedback_notes}</i>
"""
            return self.send_message(msg, parse_mode="HTML")
        except Exception as e:
            print(f"❌ Lỗi đóng gói thông báo Telegram: {e}")
            return False
