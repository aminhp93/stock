"""
Seed 60-Day Benchmark Dataset for CFA99 Retail Sentiment Observation
Period: 2026-06-30 to 2026-08-30
Tied with actual stock_prices in PostgreSQL stock_db.
"""

import math
import random
import datetime
import numpy as np
import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

SAMPLE_TICKERS = [
    "FPT", "HPG", "VIC", "VCB", "NVL", "SSI", "VIX", "MWG", 
    "TCB", "MBB", "DGC", "STB", "VND", "PVD", "KDH", "VHM"
]

SAMPLE_QUESTIONS = [
    "FPT đang tăng mạnh quá, giờ mua còn kịp không anh?",
    "HPG đợt này có vượt đỉnh cũ được không admin?",
    "NVL giảm sâu quá rồi có nên bắt đáy hay cắt lỗ ạ?",
    "SSI dòng chứng khoán mai vào giá nào đẹp anh ơi?",
    "VIC tin tốt ra nhiều mà sao giá chưa bứt phá?",
    "VCB tạo đáy chưa anh, em gom tích sản được không?",
    "VIX hôm nay vol khủng quá có bị phân phối không anh?",
    "Thị trường chuẩn bị chỉnh chưa anh, em full margin run quá!",
    "DGC mục tiêu bao nhiêu ạ admin cho em xin target với?",
    "MWG bán lẻ hồi phục thật hay chỉ là bẫy bull trap?",
]

SAMPLE_BULLISH = [
    "FPT dẫn sóng công nghệ AI quá khủng, target 160 thẳng tiến!",
    "HPG quý này sản lượng xuất khẩu tăng vọt, múc gom không phải nghĩ.",
    "Thị trường thanh khoản 25k tỷ dòng tiền cuồn cuộn vào chứng khoán!",
    "SSI vượt cản rồi, anh em hold chặt tay đừng để rơi hàng.",
    "VCB đỡ trụ thị trường quá đẹp, VN-Index hướng về 1350.",
]

SAMPLE_BEARISH = [
    "Cảnh báo anh em cẩn thận bẫy bull trap, kéo xả trụ rõ ràng.",
    "NVL thủng hỗ trợ cứng rồi, bán gấp bảo toàn vốn đi anh em.",
    "Tây lông xả ròng liên tục, thị trường sắp có nhịp rũ mạnh 50 điểm.",
    "Khối lượng giảm mà giá tăng ảo quá, cẩn thận phân phối đỉnh ngắn hạn.",
]

SAMPLE_FEAR = [
    "Sợ quá admin ơi, tài khoản đang âm 8% có nên hạ margin không?",
    "Thấy thị trường rung lắc ghê quá em lỡ bán non sạch hàng rồi.",
    "Sợ đu đọt quá, mấy phiên nay thanh khoản đuối dần rồi.",
]

SAMPLE_FOMO = [
    "Không mua hôm nay là mất cơ hội cả năm, all-in thôi anh em!",
    "Sốt ruột quá cả làng khoe lãi mà mình cầm tiền mặt!",
    "FPT tăng điên cuồng, sợ lỡ sóng quá em vừa múc giá trần luôn.",
]

def seed():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print("[1/6] Cleaning existing observation tables...")
    cur.execute("""
        TRUNCATE yt_comment_classifications, yt_comments, yt_transcripts, 
                 yt_transcript_classifications, yt_ticker_mentions, 
                 yt_daily_metrics, yt_videos CASCADE;
    """)
    conn.commit()

    # Get trading dates from stock_prices between 2026-06-30 and 2026-08-30
    cur.execute("""
        SELECT DISTINCT trading_date 
        FROM stock_prices 
        WHERE trading_date BETWEEN '2026-06-30' AND '2026-08-30'
        ORDER BY trading_date ASC
    """)
    trading_dates = [r[0] for r in cur.fetchall()]
    if not trading_dates:
        # Fallback generate weekdays
        cur_d = datetime.date(2026, 6, 30)
        end_d = datetime.date(2026, 8, 30)
        while cur_d <= end_d:
            if cur_d.weekday() < 5:
                trading_dates.append(cur_d)
            cur_d += datetime.timedelta(days=1)

    print(f"Found {len(trading_dates)} trading dates in 60-day window.")

    # 1. Create Videos
    print("[2/6] Generating 45 Livestream videos...")
    videos_data = []
    video_records = []
    random.seed(42)
    np.random.seed(42)

    base_views = 8500
    for idx, d in enumerate(trading_dates):
        vid_id = f"cfa99_2026_{d.strftime('%m%d')}"
        title = f"CFA99 Nhận định thị trường {d.strftime('%d/%m/%Y')} | Dòng tiền & Cổ phiếu dẫn sóng"
        start_time = datetime.datetime.combine(d, datetime.time(15, 0))
        dur_sec = random.randint(3600, 7200) # 1 to 2 hours
        end_time = start_time + datetime.timedelta(seconds=dur_sec)
        
        # market trend swing
        trend_factor = 1.0 + 0.5 * math.sin(idx / 4.0) + random.uniform(-0.2, 0.3)
        views = int(base_views * trend_factor)
        likes = int(views * random.uniform(0.06, 0.12))
        comments = int(views * random.uniform(0.07, 0.15))
        
        videos_data.append((
            vid_id, "UCpP-7oBCw_e8vbJKQAVQiZA", "CFA99", title,
            f"Livestream phân tích thị trường chứng khoán ngày {d.strftime('%d/%m/%Y')}",
            start_time, start_time, end_time, dur_sec, views, likes, comments,
            start_time, False
        ))
        video_records.append({
            "video_id": vid_id, "date": d, "views": views, "likes": likes,
            "comments": comments, "dur_sec": dur_sec
        })

    execute_values(cur, """
        INSERT INTO yt_videos (
            video_id, channel_id, channel_name, title, description,
            published_at, start_time, end_time, duration_sec, views, likes, comments,
            snapshot_at, is_live
        ) VALUES %s
    """, videos_data)
    conn.commit()

    # 2. Create Comments & Classifications
    print("[3/6] Generating ~12,000 Raw Comments & AI Classifications...")
    all_comments = []
    all_clf = []
    comment_counter = 1

    for v in video_records:
        vid_id = v["video_id"]
        v_date = v["date"]
        # Generate ~150 sample comments per video
        n_sample_comments = min(180, max(60, v["comments"] // 8))
        
        for c_idx in range(n_sample_comments):
            c_id = f"c_{vid_id}_{comment_counter}"
            comment_counter += 1
            author = f"user_{random.randint(1000, 9999)}"
            c_time = datetime.datetime.combine(v_date, datetime.time(15, 5)) + datetime.timedelta(minutes=random.randint(1, 100))
            c_likes = random.choices([0, 1, 2, 5, 12, 35], weights=[60, 20, 10, 5, 3, 2])[0]
            
            # Select comment type
            r_type = random.random()
            ticker = random.choice(SAMPLE_TICKERS)
            
            if r_type < 0.35:
                # Question
                text = random.choice(SAMPLE_QUESTIONS).replace("FPT", ticker)
                sentiment = "NEUTRAL"
                emotion = random.choice(["UNCERTAINTY", "FOMO", "FEAR"])
                intent = "QUESTION"
            elif r_type < 0.65:
                # Bullish
                text = random.choice(SAMPLE_BULLISH).replace("FPT", ticker)
                sentiment = "BULLISH"
                emotion = random.choice(["FOMO", "NONE", "NONE"])
                intent = "BUY"
            elif r_type < 0.85:
                # Bearish
                text = random.choice(SAMPLE_BEARISH).replace("NVL", ticker)
                sentiment = "BEARISH"
                emotion = random.choice(["FEAR", "NONE"])
                intent = "SELL"
            else:
                # Fear / FOMO
                if random.random() < 0.5:
                    text = random.choice(SAMPLE_FOMO).replace("FPT", ticker)
                    sentiment = "BULLISH"
                    emotion = "FOMO"
                    intent = "BUY"
                else:
                    text = random.choice(SAMPLE_FEAR).replace("FPT", ticker)
                    sentiment = "BEARISH"
                    emotion = "FEAR"
                    intent = "SELL"

            all_comments.append((
                c_id, vid_id, None, c_time, c_time, author, text, c_likes
            ))
            all_clf.append((
                c_id, vid_id, sentiment, emotion, intent, [ticker], 0.92, "gemini-2.5-flash"
            ))

    execute_values(cur, """
        INSERT INTO yt_comments (
            comment_id, video_id, parent_comment_id, published_at, updated_at,
            author_channel_id, text_original, like_count
        ) VALUES %s
    """, all_comments)

    execute_values(cur, """
        INSERT INTO yt_comment_classifications (
            comment_id, video_id, sentiment, emotion, intent, tickers, confidence, model
        ) VALUES %s
    """, all_clf)
    conn.commit()

    # 3. Create Transcripts & Creator Classifications
    print("[4/6] Generating Transcripts & Creator Sentiments...")
    all_trans = []
    all_trans_clf = []
    topics = ["VNINDEX", "TECH", "STEEL", "BANK", "SECURITIES", "REAL_ESTATE", "RETAIL"]

    for v in video_records:
        vid_id = v["video_id"]
        # create 8 segments per video
        for s_i in range(8):
            start_s = float(s_i * 600)
            topic = topics[s_i % len(topics)]
            ticker = SAMPLE_TICKERS[s_i % len(SAMPLE_TICKERS)]
            text = f"Phân tích chuyên sâu nhóm ngành {topic}, xu hướng dòng tiền mã {ticker} trong giai đoạn tới."
            all_trans.append((vid_id, start_s, 600.0, text, "vi"))
            
            # Creator sentiment
            if ticker in ["FPT", "HPG", "VCB", "DGC"]:
                c_sent = "BULLISH"
                rec = "BUY"
            elif ticker in ["NVL", "VIC"]:
                c_sent = "BEARISH"
                rec = "HOLD"
            else:
                c_sent = random.choice(["BULLISH", "NEUTRAL", "BEARISH"])
                rec = random.choice(["BUY", "HOLD", "WATCH"])

            all_trans_clf.append((
                vid_id, start_s, topic, [ticker], c_sent, rec
            ))

    execute_values(cur, """
        INSERT INTO yt_transcripts (video_id, start_sec, duration_sec, text, language)
        VALUES %s
    """, all_trans)

    execute_values(cur, """
        INSERT INTO yt_transcript_classifications (
            video_id, segment_start, topic, tickers, analyst_sentiment, recommendation
        ) VALUES %s
    """, all_trans_clf)
    conn.commit()

    # 4. Aggregates: yt_ticker_mentions
    print("[5/6] Calculating Ticker Mention aggregates...")
    cur.execute("""
        INSERT INTO yt_ticker_mentions (
            video_id, date, ticker, mentions, questions, bullish_count, bearish_count, fomo_count, fear_count, neutral_count
        )
        SELECT 
            v.video_id,
            v.published_at::date,
            t.ticker,
            COUNT(*) as mentions,
            COUNT(*) FILTER (WHERE c.intent = 'QUESTION') as questions,
            COUNT(*) FILTER (WHERE c.sentiment = 'BULLISH') as bullish_count,
            COUNT(*) FILTER (WHERE c.sentiment = 'BEARISH') as bearish_count,
            COUNT(*) FILTER (WHERE c.emotion = 'FOMO') as fomo_count,
            COUNT(*) FILTER (WHERE c.emotion = 'FEAR') as fear_count,
            COUNT(*) FILTER (WHERE c.sentiment = 'NEUTRAL') as neutral_count
        FROM yt_videos v
        JOIN yt_comment_classifications c ON v.video_id = c.video_id
        CROSS JOIN LATERAL unnest(c.tickers) AS t(ticker)
        GROUP BY v.video_id, v.published_at::date, t.ticker
        ON CONFLICT (video_id, ticker) DO UPDATE SET
            mentions = EXCLUDED.mentions,
            questions = EXCLUDED.questions,
            bullish_count = EXCLUDED.bullish_count,
            bearish_count = EXCLUDED.bearish_count,
            fomo_count = EXCLUDED.fomo_count,
            fear_count = EXCLUDED.fear_count,
            neutral_count = EXCLUDED.neutral_count;
    """)
    conn.commit()

    # 5. Aggregates: yt_daily_metrics with Z-scores & forward returns
    print("[6/6] Computing Daily Metrics, Z-Scores and Forward Returns...")
    daily_rows = []

    # VN-Index THẬT từ stock_prices (nạp bằng scripts/fetch_vnindex_history.py).
    # Lấy cả lịch sử để tính % thay đổi phiên trước và forward return sau ngày cuối.
    cur.execute("""
        SELECT trading_date, open_price, high_price, low_price, close_price, volume
        FROM stock_prices
        WHERE symbol = 'VNINDEX'
        ORDER BY trading_date ASC
    """)
    vn_series = [
        dict(date=r[0], open=float(r[1]), high=float(r[2]), low=float(r[3]),
             close=float(r[4]), volume=int(r[5] or 0))
        for r in cur.fetchall()
    ]
    if not vn_series:
        raise RuntimeError(
            "Không có dữ liệu VN-Index trong stock_prices (symbol='VNINDEX'). "
            "Chạy trước: python3 scripts/fetch_vnindex_history.py"
        )
    vn_pos = {row["date"]: i for i, row in enumerate(vn_series)}

    def _vn_fwd_ret(i: int, n: int):
        """Forward return n phiên (%), None nếu chưa đủ dữ liệu tương lai."""
        if i + n >= len(vn_series):
            return None
        base = vn_series[i]["close"]
        return round((vn_series[i + n]["close"] / base - 1.0) * 100.0, 2) if base else None

    # Calculate rolling metrics
    all_views = [v["views"] for v in video_records]
    all_fomo = []
    all_fear = []
    all_unc = []

    for idx, v in enumerate(video_records):
        d = v["date"]
        vid_id = v["video_id"]
        
        # Look back previous 20 videos for median views
        lookback_views = all_views[max(0, idx-20):idx] if idx > 0 else [v["views"]]
        med_views = float(np.median(lookback_views)) if lookback_views else float(v["views"])
        view_ratio = round(v["views"] / (med_views or 1.0), 2)
        
        # Comments intensity & velocity
        tot_comments = v["comments"]
        comm_intensity = round(tot_comments / (v["views"] / 1000.0), 1)
        comm_velocity = round(tot_comments / (v["dur_sec"] / 3600.0), 1)
        
        # Counts from classifications
        cur.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE sentiment='BULLISH'),
                COUNT(*) FILTER (WHERE sentiment='BEARISH'),
                COUNT(*) FILTER (WHERE sentiment='NEUTRAL'),
                COUNT(*) FILTER (WHERE intent='QUESTION'),
                COUNT(*) FILTER (WHERE emotion='FOMO'),
                COUNT(*) FILTER (WHERE emotion='FEAR'),
                COUNT(*) FILTER (WHERE emotion='UNCERTAINTY'),
                COUNT(*)
            FROM yt_comment_classifications
            WHERE video_id = %s
        """, (vid_id,))
        row = cur.fetchone()
        bull_c, bear_c, neut_c, q_c, fomo_c, fear_c, unc_c, total_c = row
        total_c = max(1, total_c)

        bull_pct = round(bull_c / total_c * 100.0, 1)
        bear_pct = round(bear_c / total_c * 100.0, 1)
        q_intensity = round(q_c / (v["views"] / 1000.0), 1)

        all_fomo.append(fomo_c)
        all_fear.append(fear_c)
        all_unc.append(unc_c)

        # 30D rolling mean and std
        lb_fomo = all_fomo[max(0, idx-30):idx+1]
        lb_fear = all_fear[max(0, idx-30):idx+1]
        lb_unc  = all_unc[max(0, idx-30):idx+1]

        fomo_mean = float(np.mean(lb_fomo))
        fomo_std = float(np.std(lb_fomo)) or 1.0
        fomo_z = round((fomo_c - fomo_mean) / fomo_std, 2)

        fear_mean = float(np.mean(lb_fear))
        fear_std = float(np.std(lb_fear)) or 1.0
        fear_z = round((fear_c - fear_mean) / fear_std, 2)

        unc_mean = float(np.mean(lb_unc))
        unc_std = float(np.std(lb_unc)) or 1.0
        unc_z = round((unc_c - unc_mean) / unc_std, 2)

        # VN-Index THẬT: giá phiên d + % thay đổi so phiên trước + forward returns
        i_vn = vn_pos.get(d)
        if i_vn is None:
            raise RuntimeError(
                f"Thiếu VN-Index cho phiên {d} trong stock_prices. "
                "Chạy lại: python3 scripts/fetch_vnindex_history.py"
            )
        vn_bar = vn_series[i_vn]
        vn_open, vn_high, vn_low, vn_close = vn_bar["open"], vn_bar["high"], vn_bar["low"], vn_bar["close"]
        vn_vol = vn_bar["volume"]
        vn_prev_close = vn_series[i_vn - 1]["close"] if i_vn > 0 else vn_close
        vn_change_pct = round((vn_close / vn_prev_close - 1.0) * 100.0, 2) if vn_prev_close else 0.0

        ret_1d = _vn_fwd_ret(i_vn, 1)
        ret_3d = _vn_fwd_ret(i_vn, 3)
        ret_5d = _vn_fwd_ret(i_vn, 5)
        ret_10d = _vn_fwd_ret(i_vn, 10)

        # Market breadth & foreign flow: chưa có nguồn thật -> mô phỏng (không dùng
        # cho tín hiệu; divergence/backtest chỉ dựa trên vnindex_ret_* thật ở trên)
        breadth_adv = random.randint(140, 320)
        breadth_dec = 450 - breadth_adv
        breadth_unch = random.randint(40, 80)
        foreign_buy = round(random.uniform(800, 1800), 1)
        foreign_sell = round(random.uniform(700, 1900), 1)
        foreign_net = round(foreign_buy - foreign_sell, 1)

        daily_rows.append((
            d, v["views"], view_ratio, tot_comments, comm_intensity, comm_velocity,
            q_c, q_intensity, bull_c, bear_c, neut_c, bull_pct, bear_pct,
            fomo_c, round(fomo_mean, 1), round(fomo_std, 1), fomo_z,
            fear_c, round(fear_mean, 1), round(fear_std, 1), fear_z,
            unc_c, round(unc_mean, 1), round(unc_std, 1), unc_z,
            vn_open, vn_high, vn_low, vn_close,
            vn_change_pct, vn_vol, breadth_adv, breadth_dec, breadth_unch,
            foreign_buy, foreign_sell, foreign_net,
            ret_1d, ret_3d, ret_5d, ret_10d
        ))

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
        ON CONFLICT (date) DO UPDATE SET
            total_views = EXCLUDED.total_views,
            view_ratio = EXCLUDED.view_ratio,
            bullish_pct = EXCLUDED.bullish_pct,
            fomo_z = EXCLUDED.fomo_z,
            fear_z = EXCLUDED.fear_z;
    """, daily_rows)

    # Update collection log status
    cur.execute("""
        UPDATE yt_collection_log
        SET status = 'done', items_count = 45, finished_at = NOW()
        WHERE phase = 1;
        UPDATE yt_collection_log
        SET status = 'done', items_count = 12000, finished_at = NOW()
        WHERE phase = 2;
        UPDATE yt_collection_log
        SET status = 'done', items_count = 45, finished_at = NOW()
        WHERE phase = 3;
    """)
    conn.commit()
    conn.close()
    print("✅ Benchmark dataset seeded successfully!")

if __name__ == "__main__":
    seed()
