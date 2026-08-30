"""
Phase 1 — CFA99 Livestream Data Collection
==========================================
Thu thập toàn bộ livestream CFA99: 30/06/2026 → 30/08/2026

Usage:
    export YOUTUBE_API_KEY="AIza..."
    python3 scripts/collect_cfa99_phase1.py

Requires:
    pip install google-api-python-client youtube-transcript-api

Tables populated:
    yt_videos, yt_comments, yt_transcripts, yt_collection_log
"""

from __future__ import annotations

import os
import sys
import time
import datetime
import psycopg2
from psycopg2.extras import execute_values
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

_YTA = YouTubeTranscriptApi()  # youtube-transcript-api >= 1.0 uses instance .fetch()

# ─── Config ──────────────────────────────────────────────────────────────────
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
CFA99_CHANNEL_ID = "UCYXsn0LBvnxYRjwNlwTILKQ"   # CFA99 — Vũ Viết Anh (verified 2026-08-30)
DATE_START = "2026-06-30T00:00:00Z"
DATE_END   = "2026-08-30T23:59:59Z"
MAX_COMMENTS_PER_VIDEO = 2000   # YouTube quota: 1 unit/page, ~100 comments/page → 20 pages max per video
COMMENT_SLEEP = 0.2             # throttle between comment pages
QUOTA_SLEEP   = 0.5             # throttle between video fetches

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

# ─── DB helpers ──────────────────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(**DB_CONFIG)

def log_task(conn, task: str, status: str, detail: str = "", items: int = 0):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE yt_collection_log
            SET status=%s, detail=%s, items_count=items_count+%s,
                started_at = CASE WHEN status='running' AND started_at IS NULL THEN NOW() ELSE started_at END,
                finished_at = CASE WHEN %s IN ('done','error') THEN NOW() ELSE NULL END
            WHERE phase=1 AND task=%s
        """, (status, detail, items, status, task))
        conn.commit()
    print(f"[LOG] {task} → {status}  {detail}")

# ─── YouTube API ─────────────────────────────────────────────────────────────
def build_youtube():
    if not YOUTUBE_API_KEY:
        raise ValueError("YOUTUBE_API_KEY env var not set. Run: export YOUTUBE_API_KEY='AIza...'")
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

def fetch_livestream_list(yt) -> list[dict]:
    """Fetch all CFA99 livestreams in date range via search + videos.list."""
    print(f"\n[1/3] Fetching video list: {DATE_START[:10]} → {DATE_END[:10]}")
    video_ids = []
    page_token = None

    while True:
        params = dict(
            part="id",
            channelId=CFA99_CHANNEL_ID,
            type="video",
            eventType="completed",     # finished livestreams
            publishedAfter=DATE_START,
            publishedBefore=DATE_END,
            maxResults=50,
            pageToken=page_token,
        )
        resp = yt.search().list(**params).execute()
        items = resp.get("items", [])
        video_ids.extend(i["id"]["videoId"] for i in items)
        print(f"  · Found {len(items)} videos (total so far: {len(video_ids)})")
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
        time.sleep(QUOTA_SLEEP)

    print(f"  Total video IDs: {len(video_ids)}")

    # Get full metadata in batches of 50
    videos = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        resp = yt.videos().list(
            part="snippet,statistics,liveStreamingDetails,contentDetails",
            id=",".join(batch),
        ).execute()
        for item in resp.get("items", []):
            vid = parse_video(item)
            if vid:
                videos.append(vid)
        time.sleep(QUOTA_SLEEP)

    print(f"  Parsed {len(videos)} livestream videos")
    return videos

def parse_video(item: dict) -> dict | None:
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    live = item.get("liveStreamingDetails", {})
    cd = item.get("contentDetails", {})

    # Parse ISO 8601 duration → seconds
    dur_str = cd.get("duration", "PT0S")
    duration_sec = parse_duration(dur_str)

    start = live.get("actualStartTime") or snippet.get("publishedAt")
    end   = live.get("actualEndTime")

    return {
        "video_id":    item["id"],
        "channel_id":  snippet.get("channelId"),
        "channel_name": snippet.get("channelTitle", "CFA99"),
        "title":       snippet.get("title"),
        "description": snippet.get("description", "")[:4000],
        "published_at": snippet.get("publishedAt"),
        "start_time":  start,
        "end_time":    end,
        "duration_sec": duration_sec,
        "views":       int(stats.get("viewCount", 0)),
        "likes":       int(stats.get("likeCount", 0)),
        "comments":    int(stats.get("commentCount", 0)),
    }

def parse_duration(iso: str) -> int:
    """PT1H30M45S → seconds"""
    import re
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not m:
        return 0
    h, mn, s = (int(m.group(i) or 0) for i in (1, 2, 3))
    return h * 3600 + mn * 60 + s

def save_videos(conn, videos: list[dict]) -> int:
    if not videos:
        return 0
    rows = [(
        v["video_id"], v["channel_id"], v["channel_name"], v["title"],
        v["description"], v["published_at"], v["start_time"], v["end_time"],
        v["duration_sec"], v["views"], v["likes"], v["comments"],
        datetime.datetime.utcnow(),
    ) for v in videos]
    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO yt_videos
              (video_id, channel_id, channel_name, title, description,
               published_at, start_time, end_time, duration_sec,
               views, likes, comments, snapshot_at)
            VALUES %s
            ON CONFLICT (video_id) DO UPDATE SET
              views=EXCLUDED.views, likes=EXCLUDED.likes,
              comments=EXCLUDED.comments, snapshot_at=EXCLUDED.snapshot_at
        """, rows)
    conn.commit()
    return len(rows)

# ─── Comments ────────────────────────────────────────────────────────────────
def fetch_comments_for_video(yt, video_id: str) -> list[dict]:
    comments = []
    page_token = None
    try:
        while len(comments) < MAX_COMMENTS_PER_VIDEO:
            params = dict(
                part="snippet,replies",
                videoId=video_id,
                maxResults=100,
                order="time",
                pageToken=page_token,
            )
            resp = yt.commentThreads().list(**params).execute()
            for thread in resp.get("items", []):
                top = thread["snippet"]["topLevelComment"]
                comments.append(parse_comment(top, video_id, None))
                for reply in thread.get("replies", {}).get("comments", []):
                    comments.append(parse_comment(reply, video_id, top["id"]))
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
            time.sleep(COMMENT_SLEEP)
    except Exception as e:
        print(f"    ⚠ comments error for {video_id}: {e}")
    return comments

def parse_comment(item: dict, video_id: str, parent_id) -> dict:
    s = item["snippet"]
    return {
        "comment_id":        item["id"],
        "video_id":          video_id,
        "parent_comment_id": parent_id,
        "published_at":      s.get("publishedAt"),
        "updated_at":        s.get("updatedAt"),
        "author_channel_id": s.get("authorChannelId", {}).get("value", ""),
        "text_original":     s.get("textOriginal", s.get("textDisplay", "")),
        "like_count":        int(s.get("likeCount", 0)),
    }

def save_comments(conn, comments: list[dict]) -> int:
    if not comments:
        return 0
    rows = [(
        c["comment_id"], c["video_id"], c["parent_comment_id"],
        c["published_at"], c["updated_at"], c["author_channel_id"],
        c["text_original"][:2000], c["like_count"],
    ) for c in comments]
    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO yt_comments
              (comment_id, video_id, parent_comment_id, published_at,
               updated_at, author_channel_id, text_original, like_count)
            VALUES %s
            ON CONFLICT (comment_id) DO NOTHING
        """, rows)
    conn.commit()
    return len(rows)

# ─── Transcripts ─────────────────────────────────────────────────────────────
def fetch_transcript_for_video(video_id: str) -> list[dict]:
    try:
        fetched = _YTA.fetch(video_id, languages=["vi", "vi-VN", "en"])
        return [
            {"video_id": video_id, "start_sec": s.start,
             "duration_sec": s.duration, "text": s.text}
            for s in fetched
        ]
    except (NoTranscriptFound, TranscriptsDisabled):
        return []
    except Exception as e:
        print(f"    ⚠ transcript error for {video_id}: {e}")
        return []

def save_transcripts(conn, segments: list[dict]) -> int:
    if not segments:
        return 0
    rows = [(s["video_id"], s["start_sec"], s["duration_sec"], s["text"]) for s in segments]
    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO yt_transcripts (video_id, start_sec, duration_sec, text)
            VALUES %s
            ON CONFLICT (video_id, start_sec) DO NOTHING
        """, rows)
    conn.commit()
    return len(rows)

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print(" CFA99 Phase 1 — Data Collection")
    print(f" {DATE_START[:10]} → {DATE_END[:10]}")
    print("=" * 60)

    conn = get_conn()
    yt   = build_youtube()

    # ── Step 1: Videos ──
    log_task(conn, "fetch_video_list", "running")
    try:
        videos = fetch_livestream_list(yt)
        n = save_videos(conn, videos)
        log_task(conn, "fetch_video_list", "done", f"{n} videos saved", n)
    except Exception as e:
        log_task(conn, "fetch_video_list", "error", str(e))
        print(f"[ERROR] fetch_video_list: {e}")
        raise

    # ── Step 2: Comments ──
    log_task(conn, "fetch_comments", "running")
    with conn.cursor() as cur:
        cur.execute("SELECT video_id FROM yt_videos ORDER BY published_at")
        video_ids = [r[0] for r in cur.fetchall()]

    total_comments = 0
    for idx, vid in enumerate(video_ids):
        print(f"\n[2/3] Comments {idx+1}/{len(video_ids)}: {vid}")
        comments = fetch_comments_for_video(yt, vid)
        n = save_comments(conn, comments)
        total_comments += n
        print(f"  Saved {n} comments")
        time.sleep(QUOTA_SLEEP)

    log_task(conn, "fetch_comments", "done", f"{total_comments} comments total", total_comments)

    # ── Step 3: Transcripts ──
    log_task(conn, "fetch_transcripts", "running")
    total_segments = 0
    for idx, vid in enumerate(video_ids):
        print(f"\n[3/3] Transcript {idx+1}/{len(video_ids)}: {vid}")
        segments = fetch_transcript_for_video(vid)
        n = save_transcripts(conn, segments)
        total_segments += n
        print(f"  Saved {n} transcript segments")
        time.sleep(0.3)

    log_task(conn, "fetch_transcripts", "done", f"{total_segments} segments total", total_segments)

    conn.close()
    print("\n" + "=" * 60)
    print(" Phase 1 Collection COMPLETE")
    print(f" Videos: {len(videos)} | Comments: {total_comments} | Transcript segments: {total_segments}")
    print("=" * 60)

if __name__ == "__main__":
    main()
