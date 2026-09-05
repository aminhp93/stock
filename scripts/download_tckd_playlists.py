#!/usr/bin/env python3
"""Download scripts (transcripts) and video content from 2 playlists of Tài chính & Kinh doanh TV.

Playlists:
1. ĐI THEO DÒNG TIỀN: PL9sQZSuWRgmr4iOpbWla2p0JiErUU5nn2
2. Góc nhìn TCKD: PL9sQZSuWRgmrrwqskC8USftSHs77gXV5Q

Downloads 20 most recent videos per playlist with:
- Video metadata (ID, Title, URL, Upload Date, Description, Duration)
- Timestamped transcript segments
- Formatted plain-text / Markdown transcript
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import yt_dlp
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)

PLAYLISTS = [
    {
        "name": "ĐI THEO DÒNG TIỀN",
        "slug": "di_theo_dong_tien",
        "url": "https://www.youtube.com/playlist?list=PL9sQZSuWRgmr4iOpbWla2p0JiErUU5nn2",
        "playlist_id": "PL9sQZSuWRgmr4iOpbWla2p0JiErUU5nn2",
    },
    {
        "name": "Góc nhìn Tài chính & Kinh doanh",
        "slug": "goc_nhin_tckd",
        "url": "https://www.youtube.com/playlist?list=PL9sQZSuWRgmrrwqskC8USftSHs77gXV5Q",
        "playlist_id": "PL9sQZSuWRgmrrwqskC8USftSHs77gXV5Q",
    },
]

MAX_VIDEOS_PER_PLAYLIST = 20
BASE_OUT_DIR = Path("/Users/aminhp93/personal/stock/data/tckd")

_YTA = YouTubeTranscriptApi()


def sanitize_filename(name: str, max_len: int = 60) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name)
    cleaned = re.sub(r"\s+", "_", cleaned).strip("._")
    return cleaned[:max_len]


def format_duration(seconds: float | int | None) -> str:
    if not seconds:
        return "N/A"
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def fetch_transcript(video_id: str) -> list[dict]:
    """Fetch transcript segments with fallback languages."""
    try:
        fetched = _YTA.fetch(video_id, languages=["vi", "vi-VN", "en"])
        segments = []
        for s in fetched:
            text = s.text if hasattr(s, "text") else s.get("text", "")
            start = s.start if hasattr(s, "start") else s.get("start", 0)
            duration = s.duration if hasattr(s, "duration") else s.get("duration", 0)
            segments.append({
                "start_sec": round(float(start), 2),
                "duration_sec": round(float(duration), 2),
                "text": text.strip()
            })
        return segments
    except (NoTranscriptFound, TranscriptsDisabled):
        return []
    except Exception as e:
        print(f"      [!] Lỗi transcript video {video_id}: {e}")
        return []


def build_readable_transcript(segments: list[dict], chunk_seconds: int = 120) -> str:
    """Group segments into readable blocks every chunk_seconds with timestamp headers."""
    if not segments:
        return "_Không có transcript khả dụng cho video này._"
    
    blocks = []
    curr_chunk_start = 0
    curr_lines = []

    for seg in segments:
        st = seg["start_sec"]
        if not curr_lines:
            curr_chunk_start = st

        curr_lines.append(seg["text"])

        if st - curr_chunk_start >= chunk_seconds:
            ts_str = format_duration(curr_chunk_start)
            blocks.append(f"### [{ts_str}]\n" + " ".join(curr_lines) + "\n")
            curr_lines = []
            curr_chunk_start = st

    if curr_lines:
        ts_str = format_duration(curr_chunk_start)
        blocks.append(f"### [{ts_str}]\n" + " ".join(curr_lines) + "\n")

    return "\n".join(blocks)


def process_playlist(pl_info: dict, limit: int = 20) -> dict:
    pl_name = pl_info["name"]
    slug = pl_info["slug"]
    pl_url = pl_info["url"]
    
    pl_dir = BASE_OUT_DIR / slug
    pl_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*70}")
    print(f"[*] Đang tải Playlist: {pl_name}")
    print(f"    URL: {pl_url}")
    print(f"    Thư mục lưu: {pl_dir}")
    print(f"{'='*70}")

    ydl_opts = {
        "extract_flat": True,
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(pl_url, download=False)
        entries = info.get("entries", [])
    
    print(f"-> Tìm thấy tổng cộng {len(entries)} videos trong playlist. Đang lấy {min(limit, len(entries))} video gần nhất...")

    saved_videos = []

    for idx, entry in enumerate(entries[:limit], start=1):
        vid = entry.get("id")
        title = entry.get("title", f"Video {vid}")
        url = f"https://www.youtube.com/watch?v={vid}"
        duration = entry.get("duration")
        view_count = entry.get("view_count")

        print(f"\n  [{idx:02d}/{limit}] {title[:65]}...")
        print(f"       ID: {vid} | Duration: {format_duration(duration)}")

        # Fetch detailed video info (description, upload_date)
        detailed_opts = {
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
        }
        description = ""
        upload_date = ""
        try:
            with yt_dlp.YoutubeDL(detailed_opts) as ydl_detail:
                detail = ydl_detail.extract_info(url, download=False)
                description = detail.get("description", "")
                upload_date = detail.get("upload_date", "")
                duration = detail.get("duration", duration)
                view_count = detail.get("view_count", view_count)
        except Exception as e:
            print(f"       [!] Warning: Không lấy được detail video: {e}")

        # Fetch transcript
        print(f"       -> Đang cào Transcript...")
        segments = fetch_transcript(vid)
        has_transcript = len(segments) > 0
        total_words = sum(len(s["text"].split()) for s in segments) if has_transcript else 0

        print(f"       ✓ Transcript: {len(segments)} segments ({total_words:,} từ)")

        readable_script = build_readable_transcript(segments)

        # Build video record
        video_record = {
            "index": idx,
            "video_id": vid,
            "title": title,
            "url": url,
            "playlist_name": pl_name,
            "playlist_id": pl_info["playlist_id"],
            "duration_seconds": duration,
            "duration_formatted": format_duration(duration),
            "upload_date": upload_date,
            "view_count": view_count,
            "description": description,
            "has_transcript": has_transcript,
            "transcript_segment_count": len(segments),
            "transcript_word_count": total_words,
            "segments": segments,
        }

        # Filename prefix
        safe_title = sanitize_filename(title)
        file_prefix = f"{idx:02d}_{vid}_{safe_title}"

        # 1. Save JSON
        json_path = pl_dir / f"{file_prefix}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(video_record, f, ensure_ascii=False, indent=2)

        # 2. Save Markdown for human & AI reading
        md_path = pl_dir / f"{file_prefix}.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n")
            f.write(f"- **Video URL:** [{url}]({url})\n")
            f.write(f"- **Video ID:** `{vid}`\n")
            f.write(f"- **Playlist:** {pl_name}\n")
            f.write(f"- **Thời lượng:** {format_duration(duration)}\n")
            f.write(f"- **Ngày đăng (upload_date):** {upload_date}\n")
            f.write(f"- **Số lượng từ transcript:** {total_words:,} từ\n\n")
            f.write("## 1. Mô tả Video (Description)\n\n")
            f.write(f"```\n{description.strip() if description else 'Không có mô tả.'}\n```\n\n")
            f.write("## 2. Kịch Bản / Lời Thoại (Transcript Script)\n\n")
            f.write(readable_script)
            f.write("\n")

        saved_videos.append({
            "index": idx,
            "video_id": vid,
            "title": title,
            "url": url,
            "upload_date": upload_date,
            "duration_formatted": format_duration(duration),
            "has_transcript": has_transcript,
            "word_count": total_words,
            "json_file": str(json_path.relative_to(BASE_OUT_DIR.parent)),
            "md_file": str(md_path.relative_to(BASE_OUT_DIR.parent)),
        })

        time.sleep(0.5)

    # Save playlist catalog
    catalog = {
        "playlist_name": pl_name,
        "playlist_id": pl_info["playlist_id"],
        "playlist_url": pl_url,
        "downloaded_at": datetime.now().isoformat(),
        "total_downloaded": len(saved_videos),
        "total_transcripts_found": sum(1 for v in saved_videos if v["has_transcript"]),
        "total_words": sum(v["word_count"] for v in saved_videos),
        "videos": saved_videos,
    }

    catalog_path = pl_dir / "catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    return catalog


def main():
    BASE_OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary_report = {
        "timestamp": datetime.now().isoformat(),
        "playlists": []
    }

    for pl in PLAYLISTS:
        cat = process_playlist(pl, limit=MAX_VIDEOS_PER_PLAYLIST)
        summary_report["playlists"].append(cat)

    master_summary_path = BASE_OUT_DIR / "summary.json"
    with open(master_summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, ensure_ascii=False, indent=2)

    print("\n" + "="*70)
    print("✓ HOÀN THÀNH DOWNLOAD TOÀN BỘ 2 PLAYLISTS!")
    print(f"  Thư mục chính: {BASE_OUT_DIR}")
    for pl in summary_report["playlists"]:
        print(f"  - {pl['playlist_name']}: {pl['total_downloaded']} videos ({pl['total_transcripts_found']} có transcript, {pl['total_words']:,} từ)")
    print(f"  Tệp tổng kết: {master_summary_path}")
    print("="*70)


if __name__ == "__main__":
    main()
