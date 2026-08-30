"""Rule-based (keyword) classifier for CFA99 observation data.

Chọn cách rule-based thay vì LLM vì:
  - Lượng comment thật của CFA99 rất nhỏ (2-10/video) trong khi transcript rất
    lớn -> gọi LLM mỗi lần chạy pipeline không đáng chi phí.
  - Từ lóng chứng khoán VN đậm đặc keyword ("múc", "tím", "call margin",
    "đu đỉnh"...) -> match từ khóa cho kết quả đủ dùng.
  - Deterministic, miễn phí, chạy lại được hằng ngày. Có thể nâng lên LLM sau.

Dùng:
    from backend.utils.cfa99_classify import CommentClassifier, TranscriptClassifier
    cc = CommentClassifier(valid_tickers)          # valid_tickers: set[str]
    cc.classify("VCB gom tích sản được chưa anh?")  # -> dict

API ổn định:
    classify_comment(text)  -> {sentiment, emotion, intent, tickers, confidence}
    classify_segment(text)  -> {topic, tickers, analyst_sentiment, recommendation}
"""

from __future__ import annotations

import re
from typing import Dict, Iterable, List, Optional, Set

# ── Lexicons (mở rộng từ backend/utils/telegram_analyzer.py) ──────────────────

BULLISH_KW = [
    "múc", "múc mạnh", "múc gấp", "tím", "trần", "tăng trần", "kịch trần", "x2", "x3",
    "sóng lớn", "vào sóng", "tất tay", "mua gấp", "breakout", "break out", "bứt phá",
    "bùng nổ", "gom", "gom mạnh", "gom hàng", "vào hàng", "siêu cổ", "khỏe nhất",
    "dẫn sóng", "dòng tiền mạnh", "tích sản", "vượt đỉnh", "vượt cản", "cửa trên",
    "về bờ", "kèo thơm", "tăng điểm", "hồi phục", "khả quan", "tích cực", "lạc quan",
    "canh mua", "kê mua", "uptrend", "đảo chiều tăng", "tạo đáy", "bắt đáy",
]

BEARISH_KW = [
    "sập", "sàn", "giảm sàn", "nằm sàn", "cắt lỗ", "cutloss", "tháo chạy", "call margin",
    "force sell", "xả", "xả hàng", "xả mạnh", "bán tháo", "thủng đáy", "đáy mới",
    "bán gấp", "bán bằng mọi giá", "phân phối", "phân phối đỉnh", "bulltrap",
    "bull trap", "bẫy tăng giá", "bẫy bull", "downtrend", "lao dốc", "đỏ lửa",
    "đu đỉnh", "kẹp hàng", "gãy trend", "thủng hỗ trợ", "rũ hàng", "rũ bỏ", "đạp",
    "đạp sàn", "bán ròng", "tây xả", "khối ngoại xả", "điều chỉnh", "giảm điểm",
    "rơi", "chốt lời", "hạ tỷ trọng", "thận trọng", "rủi ro lớn",
]

FEAR_KW = [
    "sợ", "sợ quá", "hoảng", "hoảng loạn", "panic", "lo", "lo lắng", "bất an",
    "bán non", "âm nặng", "âm sâu", "cháy tài khoản", "bay tài khoản", "cháy tk",
    "mất tết", "gồng lỗ", "gồng không nổi", "toang", "sml", "cứu", "bắt dao rơi",
    "lỗ nặng", "chết chắc", "không dám", "đu đỉnh",
]

FOMO_KW = [
    "fomo", "sợ lỡ", "sợ mất hàng", "đu theo", "vào luôn", "mua đuổi", "all in",
    "full margin", "tất tay", "múc cho kịp", "xuống tiền", "giải ngân hết",
    "hưng phấn", "kịp không", "còn kịp", "vào kịp", "mua bằng được", "hốt",
]

UNCERTAINTY_KW = [
    "phân vân", "hoang mang", "chưa rõ", "khó đoán", "lình xình", "đi ngang",
    "sideway", "chờ", "quan sát", "đứng ngoài", "chưa chắc", "liệu có", "không biết",
    "sao giờ", "thế nào", "nên hay không", "băn khoăn", "lưỡng lự",
]

QUESTION_KW = [
    "có nên", "nên mua", "nên bán", "giá nào", "bao nhiêu", "sao ạ", "được không",
    "ko ạ", "k ạ", "admin ơi", "anh ơi", "cho hỏi", "tư vấn", "xin ý kiến",
    "mai vào", "vào giá nào", "còn kịp", "có kịp", "thế nào ạ",
]

BUY_KW = ["mua", "gom", "múc", "vào hàng", "giải ngân", "canh mua", "kê mua", "bắt đáy"]
SELL_KW = ["bán", "xả", "cắt lỗ", "chốt", "chốt lời", "thoát hàng", "hạ tỷ trọng", "call margin"]
HOLD_KW = ["giữ", "gồng", "hold", "nắm giữ", "ôm hàng", "kiên nhẫn", "nắm chặt"]

# Analyst / recommendation (transcript speak)
REC_BUY_KW = ["khuyến nghị mua", "canh mua", "giải ngân", "mở vị thế", "gia tăng tỷ trọng", "mua vào"]
REC_SELL_KW = ["khuyến nghị bán", "chốt lời", "hạ tỷ trọng", "bán ra", "giảm tỷ trọng", "thoát vị thế"]
REC_HOLD_KW = ["nắm giữ", "tiếp tục nắm giữ", "giữ nguyên tỷ trọng"]
REC_WATCH_KW = ["theo dõi", "quan sát", "canh", "chờ tín hiệu", "đứng ngoài", "thận trọng quan sát"]

TOPIC_KW = {
    "BANK": ["ngân hàng", "tín dụng", "room tín dụng", "nợ xấu", "nhóm bank", "cổ phiếu vua"],
    "SECURITIES": ["công ty chứng khoán", "nhóm chứng khoán", "dư nợ margin", "cho vay margin", "nhóm sec"],
    "REAL_ESTATE": ["bất động sản", "bđs", "bds", "khu công nghiệp", "pháp lý dự án", "mở bán dự án"],
    "STEEL": ["thép", "giá thép", "tôn mạ", "quặng", "hrc"],
    "TECH": ["công nghệ", "phần mềm", "bán dẫn", "chip", "chuyển đổi số", "ai "],
    "OIL": ["dầu khí", "giá dầu", "brent", "wti", "opec", "lọc hóa dầu"],
    "VNINDEX": ["vnindex", "vn-index", "vn index", "chỉ số", "thị trường chung", "thanh khoản",
                "dòng tiền", "phiên hôm nay", "phiên nay", "điểm số", "toàn thị trường"],
}

# Các token viết hoa 3 ký tự KHÔNG phải mã CK (giảm nhiễu khi tách ticker)
TICKER_STOPWORDS: Set[str] = {
    "NHN", "TTC", "NDT", "NĐT", "GDP", "CPI", "USD", "EUR", "FED", "ETF", "IPO",
    "ATM", "ATC", "ATO", "EPS", "ROE", "ROA", "PBR", "PER", "DCA", "YOLO", "FOM",
    "SML", "CTC", "BCT", "KQK", "CPH", "HCM", "HAN", "TPP", "GDP", "VND",
    "USD", "CEO", "CFO", "OK", "OKE", "VÌ", "CÁC", "CÒN", "CHO", "CÓ", "VÀO",
    "MUA", "BÁN", "GỒ", "SÀN", "TÍM", "XẢ", "ĐU", "LÊN", "AE", "ACE",
    "TIN", "VIN", "VPS", "TOP", "COM", "NEO", "ISO", "SEC", "NDT", "NAV",
    "ATH", "ROOM", "FDI", "PMI", "NHÀ",
}

_TICKER_RE = re.compile(r"\b([A-Za-z]{3})\b")
_CURRENCY_NEAR_RE = re.compile(r"(tỷ|triệu|nghìn|đồng|vnđ)", re.IGNORECASE)
_URL_RE = re.compile(r"https?://\S+|\b\S+\.(?:com|vn|net|org|me|io)\b\S*", re.IGNORECASE)

# Comment rác / quảng cáo môi giới (chiếm tỉ lệ lớn trong comment CFA99)
_SPAM_MARKERS = (
    "mở tài khoản", "openaccount", "mktid", "t.me/", "zalo", "kèo", "room vip",
    "tín hiệu miễn phí", "liên hệ zalo", "nhận khuyến nghị", "tham gia nhóm",
    "đăng ký nhận", "utm_source",
)


def is_low_signal(text: str) -> bool:
    """True nếu comment là rác/quảng cáo/link -> loại khỏi phân tích tâm lý."""
    if not text or not text.strip():
        return True
    low = text.lower()
    if "http" in low or _URL_RE.search(text):
        return True
    if any(m in low for m in _SPAM_MARKERS):
        return True
    if len(re.sub(r"[^\w\s]", "", low).split()) < 2:  # 0-1 từ (emoji, "👍", "hay")
        return True
    return False


_WORD_SPLIT_RE = re.compile(r"[^\w]+", re.UNICODE)


def _norm(text: str) -> str:
    """Lower + thay dấu câu/emoji bằng khoảng trắng + đệm 2 đầu.

    Trả về chuỗi dạng ' token token token ' để so khớp từ khóa theo RANH GIỚI TỪ
    (`f" {kw} " in low`), tránh lỗi khớp chuỗi con (vd 'hốt' khớp trong 'chốt').
    """
    low = _WORD_SPLIT_RE.sub(" ", (text or "").lower())
    return f" {low.strip()} "


def _hits(low: str, kws: Iterable[str]) -> int:
    return sum(1 for k in kws if f" {k} " in low)


def extract_tickers(text: str, valid: Set[str]) -> List[str]:
    """Tách mã CK: token [A-Z]{3}, phải nằm trong danh sách mã hợp lệ + không phải stopword."""
    if not text:
        return []
    text = _URL_RE.sub(" ", text)  # bỏ URL trước khi tách (vps.com.vn -> COM/VPS giả)
    out: List[str] = []
    for m in _TICKER_RE.finditer(text):
        tok = m.group(1).upper()
        if tok in TICKER_STOPWORDS or tok not in valid:
            continue
        # bỏ nếu ngay cạnh là đơn vị tiền tệ (VD "300 tỷ", "USD")
        tail = text[m.end():m.end() + 8]
        if _CURRENCY_NEAR_RE.search(tail):
            continue
        if tok not in out:
            out.append(tok)
    return out


def _resolve_sentiment(bull: int, bear: int) -> str:
    if bull > bear:
        return "BULLISH"
    if bear > bull:
        return "BEARISH"
    return "NEUTRAL"


class CommentClassifier:
    def __init__(self, valid_tickers: Optional[Iterable[str]] = None):
        self.valid: Set[str] = {t.upper() for t in (valid_tickers or [])}

    def classify(self, text: str) -> Dict:
        low = _norm(text)
        bull, bear = _hits(low, BULLISH_KW), _hits(low, BEARISH_KW)
        fear, fomo, unc = _hits(low, FEAR_KW), _hits(low, FOMO_KW), _hits(low, UNCERTAINTY_KW)

        sentiment = _resolve_sentiment(bull, bear)

        emotion = "NONE"
        emo_scores = {"FEAR": fear, "FOMO": fomo, "UNCERTAINTY": unc}
        top_emo, top_val = max(emo_scores.items(), key=lambda kv: kv[1])
        if top_val > 0:
            emotion = top_emo

        is_question = ("?" in (text or "")) or _hits(low, QUESTION_KW) > 0
        if is_question:
            intent = "QUESTION"
        elif _hits(low, SELL_KW) > _hits(low, BUY_KW):
            intent = "SELL"
        elif _hits(low, BUY_KW) > 0:
            intent = "BUY"
        elif _hits(low, HOLD_KW) > 0:
            intent = "HOLD"
        else:
            intent = "NONE"

        signal = bull + bear + fear + fomo + unc
        confidence = round(min(1.0, 0.35 + 0.15 * signal), 2) if signal else 0.2

        return {
            "sentiment": sentiment,
            "emotion": emotion,
            "intent": intent,
            "tickers": extract_tickers(text, self.valid),
            "confidence": confidence,
        }


class TranscriptClassifier:
    def __init__(self, valid_tickers: Optional[Iterable[str]] = None):
        self.valid: Set[str] = {t.upper() for t in (valid_tickers or [])}

    def _topic(self, low: str, tickers: List[str]) -> str:
        best, best_n = "OTHER", 0
        for topic, kws in TOPIC_KW.items():
            n = _hits(low, kws)
            if n > best_n:
                best, best_n = topic, n
        if best_n == 0 and tickers:
            return "OTHER"
        return best

    def classify(self, text: str) -> Dict:
        low = _norm(text)
        tickers = extract_tickers(text, self.valid)
        bull = _hits(low, BULLISH_KW) + _hits(low, REC_BUY_KW)
        bear = _hits(low, BEARISH_KW) + _hits(low, REC_SELL_KW)
        analyst_sentiment = _resolve_sentiment(bull, bear)

        if _hits(low, REC_SELL_KW):
            rec = "SELL"
        elif _hits(low, REC_BUY_KW):
            rec = "BUY"
        elif _hits(low, REC_HOLD_KW):
            rec = "HOLD"
        elif _hits(low, REC_WATCH_KW):
            rec = "WATCH"
        else:
            rec = "NONE"

        return {
            "topic": self._topic(low, tickers),
            "tickers": tickers,
            "analyst_sentiment": analyst_sentiment,
            "recommendation": rec,
        }


# Convenience module-level (dùng danh sách mã rỗng -> không tách ticker)
_default_cc = CommentClassifier()
_default_tc = TranscriptClassifier()


def classify_comment(text: str) -> Dict:
    return _default_cc.classify(text)


def classify_segment(text: str) -> Dict:
    return _default_tc.classify(text)
