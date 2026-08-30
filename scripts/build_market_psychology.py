"""Vietnam Market Psychology — bảng hợp nhất `market_psychology_daily`.

Gộp mọi tầng thành 1 bảng theo ngày để dashboard đọc thẳng:

    PRICE      : VN-Index, return, forward return 1/3/5/10 phiên
    INTERNALS  : % mã > MA20/50/200, adv/decline, new high-low, volume ratio,
                 realized volatility, drawdown          (market_internals)
    POSITIONING: mua/bán ròng khối ngoại + luỹ kế 5/20 phiên   (foreign_flow)
    RETAIL     : views / comments / questions / bull% / bear% / FOMO / FEAR
                 từ livestream CFA99                    (yt_daily_metrics)

5 chỉ số retail (z-score trên cửa sổ có dữ liệu):
    idx_retail_attention   = mean z(views, comments, questions)
    idx_retail_sentiment   = z(bull% - bear%)
    idx_fomo               = z(FOMO keyword hits)
    idx_fear_capitulation  = z(FEAR keyword hits)
    idx_stock_attention    = z(số mã được nhắc / ngày)

psychology_composite_z : tổ hợp z-score, + = tham lam/hưng phấn, - = sợ hãi
psychology_gauge       : 0-100  (Extreme Fear ... Extreme Greed) — thang riêng VN

Chạy SAU: fetch_vnindex_history · compute_market_internals · fetch_foreign_flow · classify_cfa99

    python3 scripts/build_market_psychology.py
"""

from __future__ import annotations

import statistics

import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

DDL = """
DROP TABLE IF EXISTS market_psychology_daily;
CREATE TABLE market_psychology_daily (
    trading_date            DATE PRIMARY KEY,
    has_retail              BOOLEAN,
    vnindex_close           DOUBLE PRECISION,
    vnindex_ret_1d          DOUBLE PRECISION,
    fwd_ret_1d              DOUBLE PRECISION,
    fwd_ret_3d              DOUBLE PRECISION,
    fwd_ret_5d              DOUBLE PRECISION,
    fwd_ret_10d             DOUBLE PRECISION,
    realized_vol_20d        DOUBLE PRECISION,
    drawdown_52w            DOUBLE PRECISION,
    vol_ratio_20d           DOUBLE PRECISION,
    pct_above_ma20          DOUBLE PRECISION,
    pct_above_ma50          DOUBLE PRECISION,
    pct_above_ma200         DOUBLE PRECISION,
    adv_dec_ratio           DOUBLE PRECISION,
    nh_nl_diff              INTEGER,
    foreign_net_bn          DOUBLE PRECISION,
    foreign_net_5d_bn       DOUBLE PRECISION,
    foreign_net_20d_bn      DOUBLE PRECISION,
    retail_views            BIGINT,
    retail_view_ratio       DOUBLE PRECISION,
    retail_comments         INTEGER,
    retail_questions        INTEGER,
    retail_bull_pct         DOUBLE PRECISION,
    retail_bear_pct         DOUBLE PRECISION,
    retail_fomo_raw         INTEGER,
    retail_fear_raw         INTEGER,
    n_tickers_mentioned     INTEGER,
    gt_chung_khoan          INTEGER,
    gt_co_phieu             INTEGER,
    idx_retail_attention    DOUBLE PRECISION,
    idx_retail_sentiment    DOUBLE PRECISION,
    idx_fomo                DOUBLE PRECISION,
    idx_fear_capitulation   DOUBLE PRECISION,
    idx_stock_attention     DOUBLE PRECISION,
    psychology_composite_z  DOUBLE PRECISION,
    psychology_gauge        INTEGER,
    psychology_label        VARCHAR(20),
    built_at                TIMESTAMPTZ DEFAULT NOW()
);
"""


def zscores(vals: list) -> list:
    """z-score theo mẫu; None giữ nguyên None. Trả toàn 0 nếu <5 điểm hoặc std=0."""
    present = [v for v in vals if v is not None]
    if len(present) < 5:
        return [0.0 if v is not None else None for v in vals]
    mean = statistics.fmean(present)
    sd = statistics.pstdev(present)
    if sd == 0:
        return [0.0 if v is not None else None for v in vals]
    return [round((v - mean) / sd, 2) if v is not None else None for v in vals]


def _label(g: int) -> str:
    if g < 20:
        return "EXTREME_FEAR"
    if g < 40:
        return "FEAR"
    if g < 60:
        return "NEUTRAL"
    if g < 80:
        return "GREED"
    return "EXTREME_GREED"


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(DDL)

            # ── date spine + price + internals ──────────────────────────────
            cur.execute("""
                SELECT mi.trading_date, mi.vnindex_close, mi.vnindex_ret_1d,
                       mi.realized_vol_20d, mi.drawdown_52w, mi.vol_ratio_20d,
                       mi.pct_above_ma20, mi.pct_above_ma50, mi.pct_above_ma200,
                       mi.adv_dec_ratio, mi.nh_nl_diff
                FROM market_internals mi ORDER BY mi.trading_date
            """)
            base = cur.fetchall()
            if not base:
                raise RuntimeError("market_internals rỗng — chạy compute_market_internals.py")
            dates = [r[0] for r in base]
            di = {d: i for i, d in enumerate(dates)}
            close = [float(r[1]) if r[1] is not None else None for r in base]

            def fwd(i, n):
                if i + n >= len(close) or close[i] is None or close[i + n] is None:
                    return None
                return round((close[i + n] / close[i] - 1) * 100, 2)

            # ── foreign flow ───────────────────────────────────────────────
            cur.execute("SELECT trading_date, net_val_vnd FROM foreign_flow ORDER BY trading_date")
            ff = {r[0]: (float(r[1]) / 1e9 if r[1] is not None else None) for r in cur.fetchall()}
            f_series = [ff.get(d) for d in dates]

            def roll_sum(series, i, n):
                w = [x for x in series[max(0, i - n + 1): i + 1] if x is not None]
                return round(sum(w), 1) if w else None

            # ── retail (CFA99) ─────────────────────────────────────────────
            cur.execute("""
                SELECT date, total_views, view_ratio, total_comments, total_questions,
                       bullish_pct, bearish_pct, fomo_raw, fear_raw
                FROM yt_daily_metrics ORDER BY date
            """)
            rt = {r[0]: r for r in cur.fetchall()}
            cur.execute("""
                SELECT date, COUNT(DISTINCT ticker)
                FROM yt_ticker_mentions GROUP BY date
            """)
            ntick = {r[0]: r[1] for r in cur.fetchall()}

            # ── Google Trends (tuỳ chọn — bảng có thể chưa tồn tại) ─────────
            gt = {}
            try:
                cur.execute("SELECT trading_date, kw_chung_khoan, kw_co_phieu FROM google_trends")
                gt = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
            except psycopg2.errors.UndefinedTable:
                conn.rollback()
                print("   (google_trends chưa có — bỏ qua tầng search interest)")

            # ── build per-day dicts ────────────────────────────────────────
            recs = []
            for i, d in enumerate(base):
                r = rt.get(d[0])
                recs.append(dict(
                    date=d[0], close=close[i], ret_1d=d[2],
                    rvol=d[3], dd=d[4], vr=d[5],
                    ma20=d[6], ma50=d[7], ma200=d[8], adr=d[9], nhnl=d[10],
                    f_net=f_series[i], f5=roll_sum(f_series, i, 5), f20=roll_sum(f_series, i, 20),
                    fwd1=fwd(i, 1), fwd3=fwd(i, 3), fwd5=fwd(i, 5), fwd10=fwd(i, 10),
                    has_retail=r is not None,
                    views=r[1] if r else None, view_ratio=r[2] if r else None,
                    comments=r[3] if r else None, questions=r[4] if r else None,
                    bull=r[5] if r else None, bear=r[6] if r else None,
                    fomo=r[7] if r else None, fear=r[8] if r else None,
                    ntick=ntick.get(d[0]),
                    gt_ck=gt.get(d[0], (None, None))[0],
                    gt_cp=gt.get(d[0], (None, None))[1],
                ))

            # ── 5 chỉ số retail (z-score trên các ngày CÓ retail) ──────────
            zv = zscores([x["views"] for x in recs])
            zc = zscores([x["comments"] for x in recs])
            zq = zscores([x["questions"] for x in recs])
            zsent = zscores([(x["bull"] - x["bear"]) if (x["bull"] is not None) else None for x in recs])
            zfomo = zscores([x["fomo"] for x in recs])
            zfear = zscores([x["fear"] for x in recs])
            ztick = zscores([x["ntick"] for x in recs])
            zgt_ck = zscores([x["gt_ck"] for x in recs])
            zgt_cp = zscores([x["gt_cp"] for x in recs])

            for k, x in enumerate(recs):
                # Retail Attention = livestream (views/comments/questions) + Google search
                att = [z for z in (zv[k], zc[k], zq[k], zgt_ck[k], zgt_cp[k]) if z is not None]
                x["idx_attention"] = round(statistics.fmean(att), 2) if att else None
                x["idx_sentiment"] = zsent[k]
                x["idx_fomo"] = zfomo[k]
                x["idx_fear"] = zfear[k]
                x["idx_stock_attn"] = ztick[k]

            # ── composite (z-score toàn cửa sổ, + = greed) ─────────────────
            z_ma20 = zscores([x["ma20"] for x in recs])
            z_rvol = zscores([x["rvol"] for x in recs])
            z_dd = zscores([x["dd"] for x in recs])        # dd âm; ít âm hơn = greed
            z_f20 = zscores([x["f20"] for x in recs])
            z_adr = zscores([x["adr"] for x in recs])

            for k, x in enumerate(recs):
                comps = [
                    (x["idx_attention"], +1.0),
                    (x["idx_sentiment"], +1.0),
                    (x["idx_fomo"], +1.0),
                    (x["idx_fear"], -1.0),
                    (z_ma20[k], +1.0),
                    (z_adr[k], +0.5),
                    (z_rvol[k], -1.0),
                    (z_dd[k], +1.0),
                    (z_f20[k], +0.5),
                ]
                used = [(v * w) for v, w in comps if v is not None]
                wsum = sum(abs(w) for v, w in comps if v is not None)
                cz = round(sum(used) / wsum, 2) if wsum else 0.0
                gauge = max(0, min(100, round(50 + 20 * cz)))
                x["cz"] = cz
                x["gauge"] = gauge
                x["label"] = _label(gauge)

            cur.execute("TRUNCATE market_psychology_daily")
            execute_values(cur, """
                INSERT INTO market_psychology_daily (
                    trading_date, has_retail, vnindex_close, vnindex_ret_1d,
                    fwd_ret_1d, fwd_ret_3d, fwd_ret_5d, fwd_ret_10d,
                    realized_vol_20d, drawdown_52w, vol_ratio_20d,
                    pct_above_ma20, pct_above_ma50, pct_above_ma200, adv_dec_ratio, nh_nl_diff,
                    foreign_net_bn, foreign_net_5d_bn, foreign_net_20d_bn,
                    retail_views, retail_view_ratio, retail_comments, retail_questions,
                    retail_bull_pct, retail_bear_pct, retail_fomo_raw, retail_fear_raw,
                    n_tickers_mentioned, gt_chung_khoan, gt_co_phieu,
                    idx_retail_attention, idx_retail_sentiment, idx_fomo,
                    idx_fear_capitulation, idx_stock_attention,
                    psychology_composite_z, psychology_gauge, psychology_label
                ) VALUES %s
            """, [(
                x["date"], x["has_retail"], x["close"], x["ret_1d"],
                x["fwd1"], x["fwd3"], x["fwd5"], x["fwd10"],
                x["rvol"], x["dd"], x["vr"],
                x["ma20"], x["ma50"], x["ma200"], x["adr"], x["nhnl"],
                x["f_net"], x["f5"], x["f20"],
                x["views"], x["view_ratio"], x["comments"], x["questions"],
                x["bull"], x["bear"], x["fomo"], x["fear"], x["ntick"],
                x["gt_ck"], x["gt_cp"],
                x["idx_attention"], x["idx_sentiment"], x["idx_fomo"],
                x["idx_fear"], x["idx_stock_attn"],
                x["cz"], x["gauge"], x["label"],
            ) for x in recs])
            print(f"✅ market_psychology_daily: {len(recs)} phiên "
                  f"({sum(1 for x in recs if x['has_retail'])} có retail)")
            last = recs[-1]
            print(f"   Gần nhất {last['date']}: gauge {last['gauge']} ({last['label']}), "
                  f"composite z {last['cz']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
