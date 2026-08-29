import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict, Any, Optional

class TelegramChannelReader:
    """Utility class đọc/cào tin nhắn & tin tức mới nhất từ các Kênh Telegram Public mà không cần API key"""

    def __init__(self, user_agent: Optional[str] = None):
        self.headers = {
            "User-Agent": user_agent or "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def fetch_recent_posts(self, channel_username: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Đọc danh sách các bài đăng mới nhất từ Kênh Telegram Public.
        Tham số channel_username: Tên kênh (ví dụ: 'cafef_official', 'vneconomy', 'canslim01')
        """
        clean_username = channel_username.replace("https://t.me/s/", "").replace("https://t.me/", "").replace("@", "").strip()
        url = f"https://t.me/s/{clean_username}"

        try:
            r = requests.get(url, headers=self.headers, timeout=2.0)
            if r.status_code != 200:
                print(f"⚠️ Không thể truy cập Telegram Kênh @{clean_username} (HTTP Status {r.status_code})")
                return []

            soup = BeautifulSoup(r.text, "html.parser")
            message_widgets = soup.find_all("div", class_="tgme_widget_message")

            posts = []
            for widget in message_widgets:
                text_div = widget.find("div", class_="js-message_text")
                if not text_div:
                    continue

                text_content = text_div.get_text(separator="\n", strip=True)
                
                # Extract timestamp & link if available
                time_tag = widget.find("time", class_="time")
                date_str = time_tag["datetime"] if time_tag and time_tag.has_attr("datetime") else datetime.now().isoformat()
                
                link_tag = widget.find("a", class_="tgme_widget_message_date")
                post_url = link_tag["href"] if link_tag and link_tag.has_attr("href") else f"https://t.me/s/{clean_username}"

                posts.append({
                    "channel": clean_username,
                    "text": text_content,
                    "published_at": date_str,
                    "url": post_url
                })

            # Lấy các tin gần nhất theo limit
            if posts:
                return posts[-limit:]

            # Fallback sang Telegram Bot API getUpdates nếu cào web rỗng (đối với Group/Supergroup canslim01)
            from config.settings import settings
            bot_token = settings.telegram_bot_token
            if bot_token:
                try:
                    bot_url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
                    res = requests.get(bot_url, timeout=5).json()
                    if res.get("ok"):
                        updates = res.get("result", [])
                        bot_posts = []
                        for u in updates:
                            msg = u.get("message") or u.get("channel_post")
                            if msg:
                                text = msg.get("text", "")
                                if text:
                                    bot_posts.append({
                                        "channel": clean_username,
                                        "text": text,
                                        "published_at": datetime.fromtimestamp(msg.get("date", datetime.now().timestamp())).isoformat(),
                                        "url": f"https://t.me/{clean_username}"
                                    })
                        if bot_posts:
                            return bot_posts[-limit:]
                except Exception:
                    pass

            return []

        except Exception as e:
            print(f"❌ Lỗi đọc dữ liệu Kênh Telegram @{clean_username}: {e}")
            return []

    def extract_macro_news(self, channel_username: str, symbol: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Đọc tin nhắn từ Telegram Kênh và đóng gói thành định dạng MacroNews cho hệ thống Stock
        """
        posts = self.fetch_recent_posts(channel_username, limit=limit*2)
        news_list = []

        for p in posts:
            text = p["text"]
            # Nếu có chỉ định symbol, lọc tin có nhắc tới mã cổ phiếu
            if symbol and symbol.upper() not in text.upper():
                continue

            headline = text.split("\n")[0] if text else "Tin tức Telegram"
            if len(headline) > 120:
                headline = headline[:117] + "..."

            news_list.append({
                "headline": headline,
                "full_text": text,
                "published_at": p["published_at"],
                "url": p["url"],
                "channel": p["channel"]
            })

            if len(news_list) >= limit:
                break

        return news_list
