"""CFA99 Observation — Phase 2 (classify) + Phase 3 (aggregate).

Chạy SAU khi `collect_cfa99_phase1.py` đã nạp raw (yt_videos, yt_comments,
yt_transcripts). Script này KHÔNG gọi API ngoài — phân loại bằng rule keyword
(backend/utils/cfa99_classify.py), rồi dựng các bảng tổng hợp mà dashboard đọc:

    yt_comment_classifications      (Phase 2a)
    yt_transcript_classifications   (Phase 2b, gom transcript thành cửa sổ ~120s)
    yt_ticker_mentions              (Phase 3a — SQL thuần từ classifications)
    yt_daily_metrics                (Phase 3b — attention + sentiment + z-score
                                     + VN-Index thật + forward returns)

VN-Index lấy từ stock_prices symbol='VNINDEX' (nạp bằng fetch_vnindex_history.py).
breadth/foreign flow: chưa có nguồn -> để NULL (không mô phỏng).

    python3 scripts/classify_cfa99.py
"""

from __future__ import annotations

import os
import statistics
import sys

import psycopg2
from psycopg2.extras import execute_values

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.utils.cfa99_classify import (
    CommentClassifier,
    TranscriptClassifier,
    is_low_signal,
)

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
SEGMENT_WINDOW_SEC = 120.0


def _log(cur, task: str, status: str, detail: str = "", items: int = 0):
    cur.execute(
        """
        UPDATE yt_collection_log
        SET status=%s, detail=%s, items_count=%s, finished_at=NOW()
        WHERE task=%s
        """,
        (status, detail, items, task),
    )


def load_valid_tickers(cur) -> set[str]:
    cur.execute("SELECT symbol FROM stocks WHERE symbol !~ '[^A-Z]'")
    return {r[0] for r in cur.fetchall() if len(r[0]) == 3}


# ── Phase 2a: comments ───────────────────────────────────────────────────────
def classify_comments(cur, cc: CommentClassifier) -> int:
    cur.execute("SELECT comment_id, video_id, text_original FROM yt_comments")
    rows = cur.fetchall()
    out, skipped = [], 0
    for cid, vid, text in rows:
        if is_low_signal(text):          # rác / quảng cáo môi giới / link / emoji
            skipped += 1
            continue
        r = cc.classify(text or "")
        out.append((cid, vid, r["sentiment"], r["emotion"], r["intent"],
                    r["tickers"], r["confidence"], "rule-kw-v1"))
    cur.execute("TRUNCATE yt_comment_classifications RESTART IDENTITY")
    if out:
        execute_values(cur, """
            INSERT INTO yt_comment_classifications
                (comment_id, video_id, sentiment, emotion, intent, tickers, confidence, model)
            VALUES %s
        """, out)
    print(f"     (bỏ qua {skipped} comment rác/link/emoji)")
    return len(out)


# ── Phase 2b: transcripts (gom thành cửa sổ ~120s) ───────────────────────────
def classify_transcripts(cur, tc: TranscriptClassifier) -> int:
    cur.execute("""
        SELECT video_id, start_sec, text
        FROM yt_transcripts
        ORDER BY video_id, start_sec
    """)
    rows = cur.fetchall()
    windows: list[tuple] = []  # (video_id, seg_start, text)
    cur_vid = None
    w_start = 0.0
    w_texts: list[str] = []

    def flush():
        if cur_vid is not None and w_texts:
            windows.append((cur_vid, w_start, " ".join(w_texts)))

    for vid, start, text in rows:
        start = float(start or 0.0)
        if vid != cur_vid:
            flush()
            cur_vid, w_start, w_texts = vid, start, []
        if start - w_start >= SEGMENT_WINDOW_SEC and w_texts:
            windows.append((cur_vid, w_start, " ".join(w_texts)))
            w_start, w_texts = start, []
        w_texts.append(text or "")
    flush()

    out = []
    for vid, seg_start, text in windows:
        r = tc.classify(text)
        out.append((vid, seg_start, r["topic"], r["tickers"],
                    r["analyst_sentiment"], r["recommendation"]))
    cur.execute("TRUNCATE yt_transcript_classifications RESTART IDENTITY")
    if out:
        execute_values(cur, """
            INSERT INTO yt_transcript_classifications
                (video_id, segment_start, topic, tickers, analyst_sentiment, recommendation)
            VALUES %s
        """, out)
    return len(out)


# ── Phase 3a: yt_ticker_mentions ─────────────────────────────────────────────
def aggregate_ticker_mentions(cur) -> int:
    cur.execute("TRUNCATE yt_ticker_mentions RESTART IDENTITY")
    cur.execute("""
        INSERT INTO yt_ticker_mentions
            (video_id, date, ticker, mentions, questions, bullish_count,
             bearish_count, fomo_count, fear_count, neutral_count)
        SELECT
            v.video_id,
            COALESCE(v.start_time, v.published_at)::date,
            t.ticker,
            COUNT(*),
            COUNT(*) FILTER (WHERE c.intent = 'QUESTION'),
            COUNT(*) FILTER (WHERE c.sentiment = 'BULLISH'),
            COUNT(*) FILTER (WHERE c.sentiment = 'BEARISH'),
            COUNT(*) FILTER (WHERE c.emotion = 'FOMO'),
            COUNT(*) FILTER (WHERE c.emotion = 'FEAR'),
            COUNT(*) FILTER (WHERE c.sentiment = 'NEUTRAL')
        FROM yt_videos v
        JOIN yt_comment_classifications c ON v.video_id = c.video_id
        CROSS JOIN LATERAL unnest(c.tickers) AS t(ticker)
        GROUP BY v.video_id, COALESCE(v.start_time, v.published_at)::date, t.ticker
        ON CONFLICT (video_id, ticker) DO NOTHING
    """)
    return cur.rowcount


# ── Phase 3b: yt_daily_metrics ───────────────────────────────────────────────
def _roll(series: list[float], i: int, win: int = 30) -> tuple[float, float]:
    lb = series[max(0, i - win + 1): i + 1]
    if not lb:
        return 0.0, 1.0
    mean = statistics.fmean(lb)
    std = statistics.pstdev(lb) if len(lb) > 1 else 0.0
    return mean, (std or 1.0)


def aggregate_daily_metrics(cur) -> int:
    # attention per ngày
    cur.execute("""
        SELECT COALESCE(start_time, published_at)::date AS d,
               SUM(views), SUM(comments), SUM(duration_sec), COUNT(*)
        FROM yt_videos
        GROUP BY 1 ORDER BY 1
    """)
    att = {r[0]: dict(views=int(r[1] or 0), comments=int(r[2] or 0),
                      dur=int(r[3] or 0), n=int(r[4])) for r in cur.fetchall()}
    dates = sorted(att)
    if not dates:
        return 0

    # sentiment/emotion per ngày (từ comment classifications)
    cur.execute("""
        SELECT COALESCE(v.start_time, v.published_at)::date AS d,
               COUNT(*) FILTER (WHERE cc.sentiment='BULLISH'),
               COUNT(*) FILTER (WHERE cc.sentiment='BEARISH'),
               COUNT(*) FILTER (WHERE cc.sentiment='NEUTRAL'),
               COUNT(*) FILTER (WHERE cc.intent='QUESTION'),
               COUNT(*) FILTER (WHERE cc.emotion='FOMO'),
               COUNT(*) FILTER (WHERE cc.emotion='FEAR'),
               COUNT(*) FILTER (WHERE cc.emotion='UNCERTAINTY'),
               COUNT(*)
        FROM yt_comment_classifications cc
        JOIN yt_videos v ON v.video_id = cc.video_id
        GROUP BY 1
    """)
    sen = {r[0]: dict(bull=r[1], bear=r[2], neut=r[3], q=r[4],
                      fomo=r[5], fear=r[6], unc=r[7], total=r[8]) for r in cur.fetchall()}

    # VN-Index thật
    cur.execute("""
        SELECT trading_date, open_price, high_price, low_price, close_price, volume
        FROM stock_prices WHERE symbol='VNINDEX' ORDER BY trading_date
    """)
    vn = [dict(date=r[0], open=float(r[1]), high=float(r[2]), low=float(r[3]),
              close=float(r[4]), volume=int(r[5] or 0)) for r in cur.fetchall()]
    if not vn:
        raise RuntimeError("Thiếu VN-Index: chạy python3 scripts/fetch_vnindex_history.py")
    vn_pos = {b["date"]: i for i, b in enumerate(vn)}

    # Market internals THẬT (breadth) từ market_internals — chạy compute_market_internals.py trước
    cur.execute("""
        SELECT trading_date, advancers, decliners, unchanged
        FROM market_internals
    """)
    internals = {r[0]: (r[1], r[2], r[3]) for r in cur.fetchall()}

    def fwd(i, n):
        if i is None or i + n >= len(vn):
            return None
        base = vn[i]["close"]
        return round((vn[i + n]["close"] / base - 1) * 100, 2) if base else None

    fomo_s = [float(sen.get(d, {}).get("fomo", 0)) for d in dates]
    fear_s = [float(sen.get(d, {}).get("fear", 0)) for d in dates]
    unc_s = [float(sen.get(d, {}).get("unc", 0)) for d in dates]
    views_s = [att[d]["views"] for d in dates]

    rows = []
    for i, d in enumerate(dates):
        a = att[d]
        s = sen.get(d, dict(bull=0, bear=0, neut=0, q=0, fomo=0, fear=0, unc=0, total=0))
        tot = max(1, s["total"])

        prev = views_s[max(0, i - 20):i]
        med = statistics.median(prev) if prev else float(a["views"])
        view_ratio = round(a["views"] / (med or 1.0), 2)

        comm_intensity = round(a["comments"] / (a["views"] / 1000.0), 2) if a["views"] else 0.0
        comm_velocity = round(a["comments"] / (a["dur"] / 3600.0), 2) if a["dur"] else 0.0
        q_intensity = round(s["q"] / (a["views"] / 1000.0), 2) if a["views"] else 0.0

        fomo_m, fomo_sd = _roll(fomo_s, i)
        fear_m, fear_sd = _roll(fear_s, i)
        unc_m, unc_sd = _roll(unc_s, i)

        i_vn = vn_pos.get(d)
        b = vn[i_vn] if i_vn is not None else None
        vn_prev = vn[i_vn - 1]["close"] if (i_vn is not None and i_vn > 0) else (b["close"] if b else None)
        chg = round((b["close"] / vn_prev - 1) * 100, 2) if (b and vn_prev) else None

        adv, dec, unch = internals.get(d, (None, None, None))

        rows.append((
            d, a["views"], view_ratio, s["total"], comm_intensity, comm_velocity,
            s["q"], q_intensity, s["bull"], s["bear"], s["neut"],
            round(s["bull"] / tot * 100, 1), round(s["bear"] / tot * 100, 1),
            s["fomo"], round(fomo_m, 2), round(fomo_sd, 2), round((s["fomo"] - fomo_m) / fomo_sd, 2),
            s["fear"], round(fear_m, 2), round(fear_sd, 2), round((s["fear"] - fear_m) / fear_sd, 2),
            s["unc"], round(unc_m, 2), round(unc_sd, 2), round((s["unc"] - unc_m) / unc_sd, 2),
            b["open"] if b else None, b["high"] if b else None,
            b["low"] if b else None, b["close"] if b else None,
            chg, b["volume"] if b else None,
            adv, dec, unch,            # breadth THẬT từ market_internals (1.398 mã)
            None, None, None,          # foreign_buy/sell/net — chưa có nguồn
            fwd(i_vn, 1), fwd(i_vn, 3), fwd(i_vn, 5), fwd(i_vn, 10),
        ))

    cur.execute("TRUNCATE yt_daily_metrics")
    execute_values(cur, """
        INSERT INTO yt_daily_metrics (
            date, total_views, view_ratio, total_comments, comment_intensity, comment_velocity,
            total_questions, question_intensity, bullish_count, bearish_count, neutral_count,
            bullish_pct, bearish_pct,
            fomo_raw, fomo_mean_30d, fomo_std_30d, fomo_z,
            fear_raw, fear_mean_30d, fear_std_30d, fear_z,
            uncertainty_raw, uncertainty_mean_30d, uncertainty_std_30d, uncertainty_z,
            vnindex_open, vnindex_high, vnindex_low, vnindex_close,
            vnindex_change_pct, vnindex_volume, breadth_adv, breadth_dec, breadth_unch,
            foreign_buy, foreign_sell, foreign_net,
            vnindex_ret_1d, vnindex_ret_3d, vnindex_ret_5d, vnindex_ret_10d
        ) VALUES %s
    """, rows)
    return len(rows)


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            valid = load_valid_tickers(cur)
            print(f"Danh sách mã hợp lệ: {len(valid)}")
            cc = CommentClassifier(valid)
            tc = TranscriptClassifier(valid)

            n = classify_comments(cur, cc)
            _log(cur, "classify_comments", "done", f"{n} comments", n)
            print(f"[2a] Phân loại {n} comment")

            n = classify_transcripts(cur, tc)
            _log(cur, "classify_transcripts", "done", f"{n} windows", n)
            print(f"[2b] Phân loại {n} cửa sổ transcript")

            n = aggregate_ticker_mentions(cur)
            print(f"[3a] {n} dòng yt_ticker_mentions")

            n = aggregate_daily_metrics(cur)
            _log(cur, "aggregate_metrics", "done", f"{n} ngày", n)
            print(f"[3b] {n} ngày yt_daily_metrics")
        print("✅ Xong Phase 2 + 3")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
