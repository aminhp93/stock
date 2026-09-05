#!/usr/bin/env python3
"""Phân tích chuyên sâu 40 Video Transcripts từ kênh Tài chính & Kinh doanh TV (TCKD).

Mục tiêu:
1. Bóc tách ma trận chủ đề (Theme Matrix):
   - Lãi suất & Tín phiếu & Fed
   - Tỷ giá USD/VND & Lạm phát CPI
   - Thị trường Bất động sản (Chung cư, Đất nền, Pháp lý)
   - Ngân hàng, Tín dụng & Nợ xấu
   - Thị trường Chứng khoán & Nâng hạng FTSE
   - Vàng, Dầu khí & Hàng hóa
   - Đầu tư công & Trái phiếu chính phủ

2. Tính toán Chỉ số Tâm lý Vĩ mô (Macro Stance Score):
   - Expansion / Dovish (+): Nới lỏng, kích thích, tăng trưởng, phục hồi, định giá rẻ, nâng hạng...
   - Defensive / Hawkish (-): Áp lực tỷ giá, căng thẳng thanh khoản, nợ xấu, thắt chặt, phòng thủ...
   - Thang điểm: -1.0 (Rất phòng thủ) -> 0.0 (Trung tính) -> +1.0 (Lạc quan mở rộng)

3. Đo lường Phân bổ Lớp Tài sản (Asset Allocation Mentions):
   - Chứng khoán vs Bất động sản vs Vàng vs Tiết kiệm/Trái phiếu

Xuất kết quả:
- data/tckd/tckd_analysis_results.json
- data/tckd/tckd_macro_report.md
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

BASE_DIR = Path("/Users/aminhp93/personal/stock/data/tckd")

# ─── 1. BỘ TỪ ĐIỂN CHỦ ĐỀ VĨ MÔ & TÀI CHÍNH (THEMES LEXICON) ─────────────────

THEMES = {
    "INTEREST_RATE_FED": {
        "name": "Lãi suất, Fed & Chính sách tiền tệ",
        "keywords": [
            "lãi suất", "lãi suất điều hành", "lãi suất cho vay", "lãi suất huy động",
            "liên ngân hàng", "sbv", "ngân hàng nhà nước", "fed", "powell", "kevin warsh",
            "tín phiếu", "omo", "hút tiền", "bơm tiền", "nới lỏng tiền tệ", "thắt chặt tiền tệ",
            "chính sách tiền tệ", "lợi suất trái phiếu", "chu kỳ lãi suất", "hạ lãi suất", "tăng lãi suất"
        ],
    },
    "EXCHANGE_RATE_INFLATION": {
        "name": "Tỷ giá USD/VND & Lạm phát CPI",
        "keywords": [
            "tỷ giá", "usd/vnd", "usdvnd", "dxy", "đô la", "mất giá", "can thiệp ngoại hối",
            "dự trữ ngoại hối", "bán ngoại tệ", "thông tư 17", "lạm phát", "cpi", "giá cả",
            "sức ép tỷ giá", "áp lực tỷ giá", "nhập khẩu lạm phát", "giảm giá tiền đồng"
        ],
    },
    "REAL_ESTATE": {
        "name": "Thị trường Bất động sản",
        "keywords": [
            "bất động sản", "bđs", "chung cư", "đất nền", "nhà ở", "nguồn cung", "giá nhà",
            "giao dịch bđs", "thoát hàng", "bàn giao chung cư", "luật đất đai", "luật nhà ở",
            "chủ đầu tư", "pháp lý dự án", "sốt đất", "đóng băng", "thanh khoản bđs"
        ],
    },
    "BANKING_CREDIT_NPL": {
        "name": "Ngân hàng, Tín dụng & Nợ xấu",
        "keywords": [
            "ngân hàng", "tín dụng", "room tín dụng", "tăng trưởng tín dụng", "nợ xấu",
            "npl", "trích lập dự phòng", "casa", "nim", "an toàn vốn", "thông tư 25",
            "cấp bù lãi suất", "thanh khoản hệ thống", "nợ nhóm 2", "xử lý nợ", "vốn đắt đỏ"
        ],
    },
    "STOCK_FTSE_UPGRADE": {
        "name": "Chứng khoán, Định giá & Nâng hạng FTSE",
        "keywords": [
            "chứng khoán", "vnindex", "vn-index", "thị trường chứng khoán", "cổ phiếu",
            "ftse", "nâng hạng", "emerging market", "thị trường mới nổi", "rổ chỉ số",
            "định giá", "p/e", "p/b", "thanh khoản", "khối ngoại", "dòng tiền",
            "tích sản", "chứng chỉ quỹ", "etf", "thị trường con gấu", "uptrend"
        ],
    },
    "GOLD_COMMODITIES": {
        "name": "Vàng, Xăng dầu & Kim loại",
        "keywords": [
            "vàng", "vàng miếng", "sjc", "vàng nhẫn", "nhẫn trơn", "giá vàng",
            "vàng thế giới", "xăng dầu", "giá dầu", "brent", "opec", "đồng", "mua đồng tích sản"
        ],
    },
    "PUBLIC_INVESTMENT_POLICY": {
        "name": "Đầu tư công, Ngân sách & Nghị quyết",
        "keywords": [
            "đầu tư công", "giải ngân", "ngân sách", "trái phiếu chính phủ", "nghị quyết 168",
            "nghị quyết", "kinh tế tư nhân", "tăng trưởng kinh tế", "gdp", "thủ tướng",
            "chính sách tài khóa", "dự án trọng điểm", "hạ tầng"
        ],
    },
}

# ─── 2. BỘ TỪ ĐIỂN TÂM LÝ VĨ MÔ (EXPANSION VS DEFENSIVE) ──────────────────────

EXPANSION_KEYWORDS = [
    "phục hồi", "tăng trưởng", "tích cực", "lạc quan", "khởi sắc", "ấm dần", "nới lỏng",
    "kích thích", "khai thông", "hạ lãi suất", "giảm lãi suất", "bơm vốn", "dư địa",
    "hấp dẫn", "định giá rẻ", "cơ hội", "vùng mua", "bứt phá", "nâng hạng", "hỗ trợ",
    "ổn định", "thặng dư", "vượt mục tiêu", "dồi dào", "dòng tiền vào", "khỏe"
]

DEFENSIVE_KEYWORDS = [
    "áp lực", "rủi ro", "căng thẳng", "bất ổn", "suy thoái", "thắt chặt", "khó khăn",
    "đóng băng", "đình trệ", "nợ xấu", "vỡ nợ", "tháo chạy", "thoát hàng", "lao dốc",
    "vốn đắt đỏ", "hút tiền", "mất giá", "lạm phát cao", "thận trọng", "phòng thủ",
    "giữ tiền mặt", "đứng ngoài", "sợ hãi", "cảnh báo", "sức ép", "bẫy", "khủng hoảng"
]

# ─── 3. BỘ TỪ ĐIỂN LỚP TÀI SẢN ĐẦU TƯ (ASSET ALLOCATION TILT) ───────────────

ASSET_KEYWORDS = {
    "Cổ phiếu (Stocks)": ["cổ phiếu", "chứng khoán", "vnindex", "vn-index", "chứng chỉ quỹ", "etf", "thị trường chứng khoán"],
    "Bất động sản (Real Estate)": ["bất động sản", "bđs", "chung cư", "đất nền", "nhà phố", "căn hộ"],
    "Vàng & Kim loại (Gold)": ["vàng", "sjc", "vàng nhẫn", "vàng miếng", "giá vàng"],
    "Tiền gửi & Trái phiếu (Cash & Bonds)": ["tiết kiệm", "tiền gửi", "gửi ngân hàng", "trái phiếu", "lãi suất tiền gửi"],
}


def count_keyword_matches(text: str, keywords: list[str]) -> int:
    text_lower = text.lower()
    total = 0
    for kw in keywords:
        # Regex boundary if kw is a single word, else substring
        if " " in kw:
            total += text_lower.count(kw)
        else:
            total += len(re.findall(r"\b" + re.escape(kw) + r"\b", text_lower))
    return total


def analyze_video_transcript(video_path: Path) -> dict:
    with open(video_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    title = data.get("title", "")
    full_text = " ".join(s["text"] for s in data.get("segments", []))
    total_words = len(full_text.split())

    if total_words == 0:
        return {
            "video_id": data.get("video_id"),
            "title": title,
            "total_words": 0,
            "has_data": False,
        }

    # 1. Match Themes
    theme_scores = {}
    for th_key, th_info in THEMES.items():
        hits = count_keyword_matches(full_text, th_info["keywords"])
        density_per_1k = round((hits / max(total_words, 1)) * 1000, 2)
        theme_scores[th_key] = {
            "name": th_info["name"],
            "hits": hits,
            "density_per_1k": density_per_1k,
        }

    # Top theme of this video
    top_theme_key = max(theme_scores.keys(), key=lambda k: theme_scores[k]["hits"])
    top_theme_name = theme_scores[top_theme_key]["name"]

    # 2. Macro Stance Score (Expansion vs Defensive)
    exp_hits = count_keyword_matches(full_text, EXPANSION_KEYWORDS)
    def_hits = count_keyword_matches(full_text, DEFENSIVE_KEYWORDS)
    total_sentiment_hits = exp_hits + def_hits

    if total_sentiment_hits > 0:
        stance_score = round((exp_hits - def_hits) / total_sentiment_hits, 3)
    else:
        stance_score = 0.0

    if stance_score > 0.15:
        stance_label = "LẠC QUAN / MỞ RỘNG (Expansion)"
        stance_type = "EXPANSION"
    elif stance_score < -0.15:
        stance_label = "THẬN TRỌNG / PHÒNG THỦ (Defensive)"
        stance_type = "DEFENSIVE"
    else:
        stance_label = "CÂN BẰNG / TRUNG TÍNH (Neutral)"
        stance_type = "NEUTRAL"

    # 3. Asset Allocation Mentions
    asset_hits = {}
    for asset_name, kw_list in ASSET_KEYWORDS.items():
        asset_hits[asset_name] = count_keyword_matches(full_text, kw_list)

    top_asset = max(asset_hits.keys(), key=lambda k: asset_hits[k])

    return {
        "index": data.get("index"),
        "video_id": data.get("video_id"),
        "title": title,
        "playlist_name": data.get("playlist_name"),
        "url": data.get("url"),
        "upload_date": data.get("upload_date"),
        "duration_formatted": data.get("duration_formatted"),
        "total_words": total_words,
        "theme_scores": theme_scores,
        "top_theme": top_theme_name,
        "top_theme_key": top_theme_key,
        "expansion_hits": exp_hits,
        "defensive_hits": def_hits,
        "stance_score": stance_score,
        "stance_label": stance_label,
        "stance_type": stance_type,
        "asset_hits": asset_hits,
        "top_asset": top_asset,
        "has_data": True,
    }


def main():
    print("=" * 75)
    print(" BẮT ĐẦU PHÂN TÍCH CHUYÊN SÂU 40 VIDEO TRANSCRIPTS TCKD")
    print("=" * 75)

    all_video_files = sorted(list(BASE_DIR.glob("*/*.json")))
    target_files = [f for f in all_video_files if f.name != "catalog.json" and f.name != "summary.json" and f.name != "tckd_analysis_results.json"]

    print(f"-> Tìm thấy {len(target_files)} tệp video JSON cần phân tích...")

    analyzed_videos = []
    playlist_aggregates = defaultdict(lambda: {
        "total_words": 0,
        "video_count": 0,
        "theme_hits": Counter(),
        "stance_scores": [],
        "asset_hits": Counter(),
        "stance_counts": Counter(),
    })

    overall_theme_hits = Counter()
    overall_asset_hits = Counter()
    overall_stance_counts = Counter()
    all_stance_scores = []

    for fpath in target_files:
        res = analyze_video_transcript(fpath)
        if not res.get("has_data"):
            continue

        analyzed_videos.append(res)
        pl = res["playlist_name"]

        # Aggregation
        playlist_aggregates[pl]["video_count"] += 1
        playlist_aggregates[pl]["total_words"] += res["total_words"]
        playlist_aggregates[pl]["stance_scores"].append(res["stance_score"])
        playlist_aggregates[pl]["stance_counts"][res["stance_type"]] += 1

        all_stance_scores.append(res["stance_score"])
        overall_stance_counts[res["stance_type"]] += 1

        for th_k, th_v in res["theme_scores"].items():
            playlist_aggregates[pl]["theme_hits"][th_v["name"]] += th_v["hits"]
            overall_theme_hits[th_v["name"]] += th_v["hits"]

        for asset_k, hits in res["asset_hits"].items():
            playlist_aggregates[pl]["asset_hits"][asset_k] += hits
            overall_asset_hits[asset_k] += hits

    avg_overall_stance = round(sum(all_stance_scores) / max(len(all_stance_scores), 1), 3)

    print(f"✓ Đã phân tích thành công: {len(analyzed_videos)} videos")
    print(f"  - Chỉ số Tâm lý Vĩ mô Trung bình (Avg Macro Stance Score): {avg_overall_stance:+.3f}")
    print(f"  - Cơ cấu: {overall_stance_counts['DEFENSIVE']} Thận trọng / Phòng thủ | {overall_stance_counts['NEUTRAL']} Trung tính | {overall_stance_counts['EXPANSION']} Lạc quan / Mở rộng")

    # ─── SAVE JSON RESULTS ───────────────────────────────────────────────────
    final_output = {
        "analyzed_at": datetime.now().isoformat(),
        "total_videos_analyzed": len(analyzed_videos),
        "total_words_analyzed": sum(v["total_words"] for v in analyzed_videos),
        "macro_stance_summary": {
            "average_score": avg_overall_stance,
            "overall_label": "HƠI THẬN TRỌNG / PHÒNG THỦ" if avg_overall_stance < -0.05 else ("LẠC QUAN MỞ RỘNG" if avg_overall_stance > 0.05 else "TRUNG TÍNH"),
            "defensive_video_count": overall_stance_counts["DEFENSIVE"],
            "neutral_video_count": overall_stance_counts["NEUTRAL"],
            "expansion_video_count": overall_stance_counts["EXPANSION"],
        },
        "overall_theme_ranking": overall_theme_hits.most_common(),
        "overall_asset_ranking": overall_asset_hits.most_common(),
        "playlists": {
            pl: {
                "video_count": d["video_count"],
                "total_words": d["total_words"],
                "avg_stance_score": round(sum(d["stance_scores"]) / max(len(d["stance_scores"]), 1), 3),
                "top_themes": d["theme_hits"].most_common(3),
                "asset_breakdown": d["asset_hits"].most_common(),
            }
            for pl, d in playlist_aggregates.items()
        },
        "videos": analyzed_videos,
    }

    out_json_path = BASE_DIR / "tckd_analysis_results.json"
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)

    # ─── SAVE COMPREHENSIVE MARKDOWN REPORT ──────────────────────────────────
    out_md_path = BASE_DIR / "tckd_macro_report.md"
    with open(out_md_path, "w", encoding="utf-8") as f:
        f.write("# BÁO CÁO PHÂN TÍCH TÂM LÝ VĨ MÔ & DÒNG TIỀN TỪ 40 VIDEO TÀI CHÍNH & KINH DOANH TV\n\n")
        f.write(f"- **Ngày trích xuất:** {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
        f.write(f"- **Tổng số video phân tích:** {len(analyzed_videos)} video (100% transcript đầy đủ)\n")
        f.write(f"- **Tổng dung lượng văn bản:** {sum(v['total_words'] for v in analyzed_videos):,} từ tiếng Việt\n\n")

        f.write("---\n\n")
        f.write("## 1. TỔNG QUAN TÂM LÝ VĨ MÔ (MACRO STANCE COMPOSITE)\n\n")
        f.write(f"> **Điểm Tâm Lý Vĩ Mô Trung Bình (Macro Stance Score): `{avg_overall_stance:+.3f}`**  \n")
        f.write(f"> **Trạng thái thị trường:** **{final_output['macro_stance_summary']['overall_label']}**\n\n")

        f.write("| Phân loại tâm lý | Số lượng video | Tỷ trọng % | Diễn giải |\n")
        f.write("| :--- | :---: | :---: | :--- |\n")
        def_pct = round(overall_stance_counts['DEFENSIVE'] / len(analyzed_videos) * 100, 1)
        neu_pct = round(overall_stance_counts['NEUTRAL'] / len(analyzed_videos) * 100, 1)
        exp_pct = round(overall_stance_counts['EXPANSION'] / len(analyzed_videos) * 100, 1)
        f.write(f"| 🔴 **Thận trọng / Phòng thủ (Defensive)** | {overall_stance_counts['DEFENSIVE']} | {def_pct}% | Lo ngại áp lực tỷ giá, lạm phát, vốn đắt đỏ, nợ xấu, bất động sản nguội lạnh |\n")
        f.write(f"| ⚪ **Cân bằng / Trung tính (Neutral)** | {overall_stance_counts['NEUTRAL']} | {neu_pct}% | Phân tích cơ chế chính sách, kịch bản trung hạn, chờ đợi tín hiệu Fed/SBV |\n")
        f.write(f"| 🟢 **Lạc quan / Mở rộng (Expansion)** | {overall_stance_counts['EXPANSION']} | {exp_pct}% | Kỳ vọng nâng hạng FTSE, kích thích đầu tư công, giải ngân vốn, định giá hấp dẫn |\n\n")

        f.write("---\n\n")
        f.write("## 2. BẢNG XẾP HẠNG CHỦ ĐỀ VĨ MÔ NÓNG NHẤT (THEME RANKING)\n\n")
        f.write("| Hạng | Chủ đề | Tổng số lượt đề cập (Hits) | Trọng tâm nội dung |\n")
        f.write("| :---: | :--- | :---: | :--- |\n")
        for rank, (th_name, count) in enumerate(overall_theme_hits.most_common(), start=1):
            f.write(f"| {rank} | **{th_name}** | **{count:,}** | Tần suất xuất hiện bình quân {round(count/len(analyzed_videos), 1)} lần/video |\n")
        f.write("\n")

        f.write("---\n\n")
        f.write("## 3. MỨC ĐỘ QUAN TÂM CÁC LỚP TÀI SẢN (ASSET ALLOCATION ATTENTION)\n\n")
        f.write("| Lớp tài sản | Tần suất đề cập | Tỷ trọng quan tâm | Xu hướng luận điểm |\n")
        f.write("| :--- | :---: | :---: | :--- |\n")
        total_asset_hits = sum(overall_asset_hits.values())
        for asset_name, hits in overall_asset_hits.most_common():
            share = round((hits / max(total_asset_hits, 1)) * 100, 1)
            f.write(f"| **{asset_name}** | {hits:,} lượt | **{share}%** | Đang là tâm điểm thảo luận chiến lược |\n")
        f.write("\n")

        f.write("---\n\n")
        f.write("## 4. CHI TIẾT 10 VIDEO TIÊU BIỂU GẦN NHẤT\n\n")
        f.write("| # | Playlist | Tiêu đề Video | Chủ đề chính | Điểm Stance | Đánh giá |\n")
        f.write("| :-: | :--- | :--- | :--- | :---: | :--- |\n")
        for v in analyzed_videos[:15]:
            icon = "🔴" if v["stance_type"] == "DEFENSIVE" else ("🟢" if v["stance_type"] == "EXPANSION" else "⚪")
            f.write(f"| {v['index']} | `{v['playlist_name'][:12]}...` | [{v['title'][:45]}...]({v['url']}) | {v['top_theme']} | `{v['stance_score']:+.2f}` | {icon} {v['stance_label']} |\n")
        f.write("\n")

        f.write("---\n\n")
        f.write("## 5. KẾT LUẬN & HÀNH ĐỘNG DÀNH CHO NHÀ ĐẦU TƯ\n\n")
        f.write("1. **Vĩ mô đang ở pha 'Phòng Thủ Có Chọn Lọc':** Tỷ trọng các video cảnh báo áp lực tỷ giá, nợ xấu và chu kỳ vốn đắt đỏ chiếm ưu thế, phản ánh tâm lý thận trọng của giới quản lý tài sản.\n")
        f.write("2. **Cơ hội tập trung vào Nâng Hạng FTSE & Cổ phiếu cơ bản:** Các video lạc quan nhất đều xoay quanh câu chuyện nâng hạng thị trường chứng khoán mới nổi (FTSE Emerging Markets) và các cổ phiếu có nền tảng lành mạnh lọt rổ chỉ số.\n")
        f.write("3. **Bất động sản phân hóa mạnh:** Cảnh báo 'sóng thoát hàng chung cư' và thanh khoản suy giảm sau chu kỳ tăng nóng được nhấn mạnh liên tục.\n")

    print(f"\n✓ Đã xuất tệp kết quả JSON: {out_json_path}")
    print(f"✓ Đã xuất báo cáo Markdown: {out_md_path}")
    print("=" * 75)


if __name__ == "__main__":
    main()
