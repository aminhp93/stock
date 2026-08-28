import re
from typing import List, Dict, Any
from backend.utils.telegram_reader import TelegramChannelReader

class TelegramSentimentAnalyzer:
    """
    Phân tích Sắc thái Cộng đồng (Crowd Sentiment) và Chỉ số Rủi ro Hưng phấn Thị trường (Market Euphoria Risk Index)
    từ dữ liệu thảo luận trên các Kênh/Nhóm Telegram Chứng khoán Việt Nam.
    """

    DEFAULT_CHANNELS = ["canslim01", "cafef_official", "vneconomy", "chungkhoanvietnam"]

    BULLISH_KEYWORDS = [
        "múc", "tím", "trần", "x2", "sóng lớn", "tất tay", "mua gấp", "breakout", 
        "fomo", "vọt đỉnh", "bứt phá", "bùng nổ", "gom mạnh", "vào hàng", "siêu cổ",
        "tăng trần", "dòng tiền mạnh", "múc gấp", "khỏe nhất", "vào sóng"
    ]

    BEARISH_KEYWORDS = [
        "sập", "cắt lỗ", "tháo chạy", "call margin", "xả hàng", "thủng đáy", "bán gấp", 
        "đáy mới", "xả mạnh", "bán bằng mọi giá", "sợ hãi", "rủi ro lớn", "chạy ngay", 
        "phân phối", "bắt đáy hụt", "bay tài khoản", "vỡ trận", "xả"
    ]

    def __init__(self, channels: List[str] = None):
        self.reader = TelegramChannelReader()
        self.channels = channels or self.DEFAULT_CHANNELS

    def analyze_market_sentiment(self, limit_per_channel: int = 10) -> Dict[str, Any]:
        """
        Cào bài viết từ toàn bộ danh sách Kênh Telegram và tính toán Chỉ số Cảm xúc & Hưng phấn Thị trường Chung.
        """
        all_posts = []
        for ch in self.channels:
            posts = self.reader.fetch_recent_posts(ch, limit=limit_per_channel)
            all_posts.extend(posts)

        if not all_posts:
            # Fallback nếu không cào được dữ liệu web
            return {
                "total_messages": 0,
                "bullish_count": 0,
                "bearish_count": 0,
                "sentiment_score": 0.15,
                "euphoria_index": 45.0,
                "sentiment_label": "TRUNG TÍNH (NEUTRAL)",
                "risk_level": "TRUNG BÌNH (NORMAL)"
            }

        bullish_count = 0
        bearish_count = 0
        total_matched = 0

        for p in all_posts:
            text = p.get("text", "").lower()
            
            # Đếm số lượng từ khóa hưng phấn / sợ hãi
            bull_matches = sum(1 for kw in self.BULLISH_KEYWORDS if kw in text)
            bear_matches = sum(1 for kw in self.BEARISH_KEYWORDS if kw in text)

            bullish_count += bull_matches
            bearish_count += bear_matches
            total_matched += (bull_matches + bear_matches)

        if total_matched == 0:
            sentiment_score = 0.10
            euphoria_index = 40.0
        else:
            sentiment_score = (bullish_count - bearish_count) / total_matched
            sentiment_score = max(-1.0, min(1.0, sentiment_score))
            euphoria_index = round((bullish_count / total_matched) * 100, 1)

        if euphoria_index >= 80.0:
            sentiment_label = "HƯNG PHẤN CỰC ĐỘ (EXTREME EUPHORIA)"
            risk_level = "CẢNH BÁO BÓNG BÓNG (HIGH RISK)"
        elif euphoria_index >= 60.0:
            sentiment_label = "TÍCH CỰC (BULLISH)"
            risk_level = "AN TOÀN TRUNG BÌNH"
        elif euphoria_index <= 30.0:
            sentiment_label = "HOẢNG LOẠN (EXTREME FEAR)"
            risk_level = "VÙNG ĐÁY MUA GOM (LOW RISK)"
        else:
            sentiment_label = "TRUNG TÍNH (NEUTRAL)"
            risk_level = "BÌNH THƯỜNG"

        contrarian_signal = "BÁN PHÂN PHỐI (BẪY HƯNG PHẤN)" if euphoria_index >= 80 else "MUA GOM TÍCH TRỮ (VÙNG ĐÁY)" if euphoria_index <= 30 else "THEO DÕI TÍCH LŨY"
        gatekeeper_verdict = "CẤM MUA ĐUỔI (HIGH RISK BLOCK)" if euphoria_index >= 85 else "ĐỦ ĐIỀU KIỆN AN TOÀN"
        mention_velocity = "TĂNG BÙNG NỔ (RETAIL MOMENTUM)" if len(all_posts) >= 15 else "BÌNH THƯỜNG"

        return {
            "total_messages": len(all_posts),
            "matched_keywords_count": total_matched,
            "bullish_count": bullish_count,
            "bearish_count": bearish_count,
            "sentiment_score": round(sentiment_score, 2),
            "euphoria_index": euphoria_index,
            "sentiment_label": sentiment_label,
            "risk_level": risk_level,
            "contrarian_signal": contrarian_signal,
            "gatekeeper_verdict": gatekeeper_verdict,
            "mention_velocity": mention_velocity,
            "channels_scraped": self.channels,
            "posts": all_posts[:10]
        }

    def analyze_stock_sentiment(self, symbol: str, limit_per_channel: int = 15) -> Dict[str, Any]:
        """
        Lọc riêng các thảo luận có nhắc tới mã cổ phiếu cụ thể (VD: FPT, TCB, HPG, TCH) trên Telegram
        từ cả CSDL PostgreSQL (lưu từ trước) và tin nhắn Live mới nhất.
        """
        from backend.db.postgres import PostgresDBManager
        db = PostgresDBManager()

        all_posts = []
        
        # 1. Truy vấn các tin nhắn đã thu thập từ trước trong CSDL PostgreSQL
        db_posts = db.get_telegram_messages(symbol=symbol, limit=20)
        all_posts.extend(db_posts)

        # 2. Cào/Lắng nghe thêm tin nhắn live mới
        for ch in self.channels:
            posts = self.reader.fetch_recent_posts(ch, limit=limit_per_channel)
            if posts:
                db.upsert_telegram_messages(posts)
                for p in posts:
                    if symbol.upper() in p.get("text", "").upper():
                        # Tránh trùng lặp
                        if not any(existing.get("text") == p.get("text") for existing in all_posts):
                            all_posts.append(p)

        if not all_posts:
            # Fallback nếu chưa có thảo luận trực tiếp
            market_res = self.analyze_market_sentiment()
            market_res["symbol"] = symbol
            market_res["note"] = f"Dựa trên chỉ số tâm lý Telegram chung cho {symbol}"
            return market_res

        bullish_count = 0
        bearish_count = 0
        total_matched = 0

        for p in all_posts:
            text = p.get("text", "").lower()
            bull_matches = sum(1 for kw in self.BULLISH_KEYWORDS if kw in text)
            bear_matches = sum(1 for kw in self.BEARISH_KEYWORDS if kw in text)
            bullish_count += bull_matches
            bearish_count += bear_matches
            total_matched += (bull_matches + bear_matches)

        if total_matched == 0:
            sentiment_score = 0.20
            euphoria_index = 50.0
        else:
            sentiment_score = (bullish_count - bearish_count) / total_matched
            sentiment_score = max(-1.0, min(1.0, sentiment_score))
            euphoria_index = round((bullish_count / total_matched) * 100, 1)

        contrarian_signal = "BÁN PHÂN PHỐI (BẪY HƯNG PHẤN)" if euphoria_index >= 80 else "MUA GOM TÍCH TRỮ (VÙNG ĐÁY)" if euphoria_index <= 30 else "THEO DÕI TÍCH LŨY"
        gatekeeper_verdict = "CẤM MUA ĐUỔI (HIGH RISK BLOCK)" if euphoria_index >= 85 else "ĐỦ ĐIỀU KIỆN AN TOÀN"
        mention_velocity = "TĂNG BÙNG NỔ (RETAIL MOMENTUM)" if len(all_posts) >= 5 else "BÌNH THƯỜNG"

        return {
            "symbol": symbol,
            "total_messages": len(all_posts),
            "matched_keywords_count": total_matched,
            "bullish_count": bullish_count,
            "bearish_count": bearish_count,
            "sentiment_score": round(sentiment_score, 2),
            "euphoria_index": euphoria_index,
            "sentiment_label": "HƯNG PHẤN CỰC ĐỘ" if euphoria_index >= 80 else "TÍCH CỰC" if euphoria_index >= 60 else "TRUNG TÍNH",
            "risk_level": "RỦI RO CAO (EUPHORIA)" if euphoria_index >= 80 else "BÌNH THƯỜNG",
            "contrarian_signal": contrarian_signal,
            "gatekeeper_verdict": gatekeeper_verdict,
            "mention_velocity": mention_velocity,
            "channels_scraped": self.channels,
            "posts": all_posts[:10]
        }
