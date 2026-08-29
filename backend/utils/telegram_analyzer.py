import re
import time
import concurrent.futures
from typing import List, Dict, Any, Optional
from backend.utils.telegram_reader import TelegramChannelReader

_CACHE_STORE: Dict[str, Any] = {}
_CACHE_TIMESTAMP: Dict[str, float] = {}
CACHE_TTL_SECONDS = 300.0  # 5 minutes cache

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

    def _fetch_all_channels_parallel(self, limit_per_channel: int = 10) -> List[Dict[str, Any]]:
        all_posts = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(self.channels))) as executor:
            future_to_ch = {
                executor.submit(self.reader.fetch_recent_posts, ch, limit_per_channel): ch
                for ch in self.channels
            }
            done, _ = concurrent.futures.wait(future_to_ch.keys(), timeout=2.5)
            for future in done:
                try:
                    posts = future.result()
                    if posts:
                        all_posts.extend(posts)
                except Exception:
                    pass
        return all_posts

    def analyze_market_sentiment(self, limit_per_channel: int = 10) -> Dict[str, Any]:
        """
        Cào bài viết song song từ các Kênh Telegram và lưu cache 5 phút để phản hồi siêu tốc.
        """
        cache_key = "MARKET_SENTIMENT"
        now = time.time()
        if cache_key in _CACHE_STORE and (now - _CACHE_TIMESTAMP.get(cache_key, 0) < CACHE_TTL_SECONDS):
            return _CACHE_STORE[cache_key]

        all_posts = self._fetch_all_channels_parallel(limit_per_channel)

        if not all_posts:
            res = {
                "total_messages": 0,
                "bullish_count": 0,
                "bearish_count": 0,
                "sentiment_score": 0.15,
                "euphoria_index": 45.0,
                "sentiment_label": "TRUNG TÍNH (NEUTRAL)",
                "risk_level": "TRUNG BÌNH (NORMAL)",
                "contrarian_signal": "THEO DÕI TÍCH LŨY",
                "gatekeeper_verdict": "ĐỦ ĐIỀU KIỆN AN TOÀN",
                "mention_velocity": "BÌNH THƯỜNG",
                "channels_scraped": self.channels,
                "posts": []
            }
            _CACHE_STORE[cache_key] = res
            _CACHE_TIMESTAMP[cache_key] = now
            return res

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

        result = {
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

        _CACHE_STORE[cache_key] = result
        _CACHE_TIMESTAMP[cache_key] = now
        return result

    def analyze_stock_sentiment(self, symbol: str, limit_per_channel: int = 15) -> Dict[str, Any]:
        """
        Lọc riêng các thảo luận có nhắc tới mã cổ phiếu cụ thể (VD: FPT, TCB, HPG, TCH) trên Telegram
        từ cả CSDL PostgreSQL và tin nhắn Live mới nhất với bộ nhớ đệm cache 5 phút.
        """
        cache_key = f"STOCK_SENTIMENT_{symbol.upper()}"
        now = time.time()
        if cache_key in _CACHE_STORE and (now - _CACHE_TIMESTAMP.get(cache_key, 0) < CACHE_TTL_SECONDS):
            return _CACHE_STORE[cache_key]

        from backend.db.postgres import PostgresDBManager
        db = PostgresDBManager()

        all_posts = []
        
        # 1. Truy vấn các tin nhắn từ PostgreSQL
        try:
            db_posts = db.get_telegram_messages(symbol=symbol, limit=20)
            all_posts.extend(db_posts)
        except Exception:
            pass

        # 2. Cào tin nhắn live song song
        live_posts = self._fetch_all_channels_parallel(limit_per_channel)
        if live_posts:
            try:
                db.upsert_telegram_messages(live_posts)
            except Exception:
                pass
            for p in live_posts:
                if symbol.upper() in p.get("text", "").upper():
                    if not any(existing.get("text") == p.get("text") for existing in all_posts):
                        all_posts.append(p)

        if not all_posts:
            market_res = dict(self.analyze_market_sentiment())
            market_res["symbol"] = symbol
            market_res["note"] = f"Dựa trên chỉ số tâm lý Telegram chung cho {symbol}"
            _CACHE_STORE[cache_key] = market_res
            _CACHE_TIMESTAMP[cache_key] = now
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

        result = {
            "symbol": symbol,
            "total_messages": len(all_posts),
            "matched_keywords_count": total_matched,
            "bullish_count": bullish_count,
            "bearish_count": bearish_count,
            "sentiment_score": round(sentiment_score, 2),
            "sentiment_label": "TÍCH CỰC (BULLISH)" if sentiment_score > 0.2 else "TIÊU CỰC (BEARISH)" if sentiment_score < -0.2 else "TRUNG TÍNH (NEUTRAL)",
            "euphoria_percentage": euphoria_index,
            "panic_percentage": round(100.0 - euphoria_index, 1),
            "risk_assessment": "CẢNH BÁO BÓNG BÓNG FOMO" if euphoria_index >= 75 else "AN TOÀN" if euphoria_index <= 50 else "THEO DÕI",
            "contrarian_signal": contrarian_signal,
            "gatekeeper_verdict": gatekeeper_verdict,
            "mention_velocity": mention_velocity,
            "summary": f"Cộng đồng Telegram thảo luận sôi nổi về {symbol} với {len(all_posts)} tin nhắn, chỉ số hưng phấn {euphoria_index}%.",
            "sample_messages": all_posts[:5]
        }

        _CACHE_STORE[cache_key] = result
        _CACHE_TIMESTAMP[cache_key] = now
        return result
