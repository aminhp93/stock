-- ============================================================
-- CFA99 Observation Schema — Phase 1 Collection
-- Run: psql -U postgres -d stock_db -f scripts/setup_observation_schema.sql
-- ============================================================

-- DATA 1: Livestream video metadata
CREATE TABLE IF NOT EXISTS yt_videos (
    video_id        VARCHAR(20) PRIMARY KEY,
    channel_id      VARCHAR(50),
    channel_name    VARCHAR(100) DEFAULT 'CFA99',
    title           TEXT,
    description     TEXT,
    published_at    TIMESTAMPTZ,
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    duration_sec    INTEGER,
    views           BIGINT,
    likes           BIGINT,
    comments        BIGINT,
    url             TEXT GENERATED ALWAYS AS ('https://youtube.com/watch?v=' || video_id) STORED,
    snapshot_at     TIMESTAMPTZ DEFAULT NOW(),  -- when we fetched (important: YouTube changed viewCount update behavior on 2026-08-24)
    is_live         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- DATA 2: Raw comments
CREATE TABLE IF NOT EXISTS yt_comments (
    comment_id          VARCHAR(100) PRIMARY KEY,
    video_id            VARCHAR(20) REFERENCES yt_videos(video_id) ON DELETE CASCADE,
    parent_comment_id   VARCHAR(100),           -- NULL = top-level
    published_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    author_channel_id   VARCHAR(100),
    text_original       TEXT,
    like_count          INTEGER DEFAULT 0,
    is_reply            BOOLEAN GENERATED ALWAYS AS (parent_comment_id IS NOT NULL) STORED,
    fetched_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS yt_comments_video_idx ON yt_comments(video_id);
CREATE INDEX IF NOT EXISTS yt_comments_published_idx ON yt_comments(published_at);

-- DATA 3: AI comment classifications (Phase 2)
CREATE TABLE IF NOT EXISTS yt_comment_classifications (
    id              SERIAL PRIMARY KEY,
    comment_id      VARCHAR(100) REFERENCES yt_comments(comment_id) ON DELETE CASCADE,
    video_id        VARCHAR(20),
    -- Sentiment
    sentiment       VARCHAR(10) CHECK (sentiment IN ('BULLISH','BEARISH','NEUTRAL')),
    -- Emotion
    emotion         VARCHAR(20) CHECK (emotion IN ('FEAR','FOMO','UNCERTAINTY','NONE')),
    -- Intent
    intent          VARCHAR(20) CHECK (intent IN ('BUY','SELL','HOLD','QUESTION','NONE')),
    -- Tickers mentioned in this comment (array)
    tickers         TEXT[],
    -- Confidence
    confidence      FLOAT,
    -- Model used
    model           VARCHAR(50),
    classified_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS yt_clf_comment_idx ON yt_comment_classifications(comment_id);
CREATE INDEX IF NOT EXISTS yt_clf_video_idx ON yt_comment_classifications(video_id);

-- DATA 4: Ticker mentions (aggregated per video per ticker)
CREATE TABLE IF NOT EXISTS yt_ticker_mentions (
    id              SERIAL PRIMARY KEY,
    video_id        VARCHAR(20) REFERENCES yt_videos(video_id) ON DELETE CASCADE,
    date            DATE,
    ticker          VARCHAR(20),
    mentions        INTEGER DEFAULT 0,
    questions       INTEGER DEFAULT 0,
    bullish_count   INTEGER DEFAULT 0,
    bearish_count   INTEGER DEFAULT 0,
    fomo_count      INTEGER DEFAULT 0,
    fear_count      INTEGER DEFAULT 0,
    neutral_count   INTEGER DEFAULT 0,
    UNIQUE(video_id, ticker)
);
CREATE INDEX IF NOT EXISTS yt_ticker_date_idx ON yt_ticker_mentions(date, ticker);

-- DATA 5: Transcripts (Phase 1 — raw)
CREATE TABLE IF NOT EXISTS yt_transcripts (
    id          SERIAL PRIMARY KEY,
    video_id    VARCHAR(20) REFERENCES yt_videos(video_id) ON DELETE CASCADE,
    start_sec   FLOAT,
    duration_sec FLOAT,
    text        TEXT,
    language    VARCHAR(10) DEFAULT 'vi',
    fetched_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, start_sec)
);
CREATE INDEX IF NOT EXISTS yt_transcript_video_idx ON yt_transcripts(video_id);

-- DATA 5b: Transcript AI classifications (Phase 2 — creator sentiment)
CREATE TABLE IF NOT EXISTS yt_transcript_classifications (
    id              SERIAL PRIMARY KEY,
    video_id        VARCHAR(20),
    segment_start   FLOAT,
    topic           VARCHAR(50),   -- VNINDEX, BANK, SECURITIES, REAL_ESTATE, STEEL, TECH, OIL, OTHER
    tickers         TEXT[],
    analyst_sentiment VARCHAR(10) CHECK (analyst_sentiment IN ('BULLISH','BEARISH','NEUTRAL')),
    recommendation  VARCHAR(10)  CHECK (recommendation IN ('BUY','HOLD','SELL','WATCH','NONE')),
    classified_at   TIMESTAMPTZ DEFAULT NOW()
);

-- DATA 6 & 7: Daily aggregated metrics (Phase 3)
CREATE TABLE IF NOT EXISTS yt_daily_metrics (
    date                DATE PRIMARY KEY,
    -- Attention
    total_views         BIGINT,
    view_ratio          FLOAT,       -- views / median(prev_20)
    total_comments      INTEGER,
    comment_intensity   FLOAT,       -- comments / views * 1000
    comment_velocity    FLOAT,       -- comments / duration_hr
    total_questions     INTEGER,
    question_intensity  FLOAT,
    -- Sentiment
    bullish_count       INTEGER,
    bearish_count       INTEGER,
    neutral_count       INTEGER,
    bullish_pct         FLOAT,
    bearish_pct         FLOAT,
    -- Emotion Z-scores
    fomo_raw            INTEGER,
    fomo_mean_30d       FLOAT,
    fomo_std_30d        FLOAT,
    fomo_z              FLOAT,
    fear_raw            INTEGER,
    fear_mean_30d       FLOAT,
    fear_std_30d        FLOAT,
    fear_z              FLOAT,
    uncertainty_raw     INTEGER,
    uncertainty_mean_30d FLOAT,
    uncertainty_std_30d FLOAT,
    uncertainty_z       FLOAT,
    -- Market (VN-Index)
    vnindex_open        FLOAT,
    vnindex_high        FLOAT,
    vnindex_low         FLOAT,
    vnindex_close       FLOAT,
    vnindex_change_pct  FLOAT,
    vnindex_volume      BIGINT,
    breadth_adv         INTEGER,
    breadth_dec         INTEGER,
    breadth_unch        INTEGER,
    foreign_buy         FLOAT,
    foreign_sell        FLOAT,
    foreign_net         FLOAT,
    -- Forward returns (filled in next day)
    vnindex_ret_1d      FLOAT,
    vnindex_ret_3d      FLOAT,
    vnindex_ret_5d      FLOAT,
    vnindex_ret_10d     FLOAT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- yt_collection_log: track fetch progress
CREATE TABLE IF NOT EXISTS yt_collection_log (
    id          SERIAL PRIMARY KEY,
    phase       INTEGER,
    task        VARCHAR(100),
    status      VARCHAR(20) DEFAULT 'pending',  -- pending, running, done, error
    detail      TEXT,
    items_count INTEGER DEFAULT 0,
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial log entries
INSERT INTO yt_collection_log (phase, task, status) VALUES
  (1, 'fetch_video_list',   'pending'),
  (1, 'fetch_comments',     'pending'),
  (1, 'fetch_transcripts',  'pending'),
  (2, 'classify_comments',  'pending'),
  (2, 'classify_transcripts','pending'),
  (3, 'aggregate_metrics',  'pending'),
  (3, 'backtest_signals',   'pending')
ON CONFLICT DO NOTHING;

SELECT 'Schema created OK' AS status;
