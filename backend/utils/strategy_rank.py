"""Xếp hạng cơ học "xác suất tăng" ngắn hạn + backtest — dùng chung cho CLI
(scripts/rank_momentum.py) và API (server.py /api/strategy/*).

KHÔNG phải khuyến nghị đầu tư. Đăng ký thêm chiến lược mới vào STRATEGIES ở
cuối file để tự động xuất hiện trên tab "Test Chiến Lược".
"""

from __future__ import annotations

import statistics
from typing import Any, Callable

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
MIN_TURNOVER_BN = 10.0

SNAPSHOT_SQL = """
WITH px AS (
    SELECT symbol, trading_date, close_price, high_price, volume, ma20, ma50, rsi_14,
           AVG(close_price) OVER w200 AS ma200,
           MAX(high_price)  OVER w60  AS hi60,
           close_price / NULLIF(LAG(close_price, 20) OVER wsym, 0) - 1 AS ret20,
           close_price / NULLIF(LAG(close_price, 60) OVER wsym, 0) - 1 AS ret60,
           AVG(close_price*volume) OVER w20 AS turn20,
           AVG(volume) OVER w20 AS vol20,
           AVG(volume) OVER w5  AS vol5,
           COUNT(*) OVER wsym AS n,
           ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trading_date DESC) AS rn
    FROM stock_prices
    WHERE symbol <> 'VNINDEX'
      AND trading_date <= %(asof)s
      AND trading_date >= (%(asof)s::date - 400)
    WINDOW
        wsym AS (PARTITION BY symbol ORDER BY trading_date),
        w200 AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW),
        w60  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 59  PRECEDING AND CURRENT ROW),
        w20  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 19  PRECEDING AND CURRENT ROW),
        w5   AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 4   PRECEDING AND CURRENT ROW)
),
vni AS (
    SELECT close_price / NULLIF(LAG(close_price,20) OVER (ORDER BY trading_date),0) - 1 AS vni_ret20,
           ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
    FROM stock_prices WHERE symbol='VNINDEX'
      AND trading_date <= %(asof)s AND trading_date >= (%(asof)s::date - 120)
)
SELECT p.symbol, p.close_price, p.ma20, p.ma50, p.ma200, p.hi60, p.ret20, p.ret60,
       p.turn20, p.vol5, p.vol20, p.n, p.rsi_14,
       (SELECT vni_ret20 FROM vni WHERE rn=1) AS vni_ret20
FROM px p WHERE p.rn = 1 AND p.n >= 120
"""

MONEYFLOW_SQL = """
WITH px AS (
    SELECT symbol, trading_date, close_price, high_price, low_price, volume, ma20, ma50, rsi_14,
           MAX(high_price) OVER w60     AS hi60,
           MAX(high_price) OVER w5      AS hi5,
           MIN(low_price)  OVER w5      AS lo5,
           AVG(volume)     OVER w5      AS vol5,
           AVG(volume)     OVER w20     AS vol20,
           AVG(volume)     OVER wfirst3 AS vol_first3,
           AVG(volume)     OVER wlast2  AS vol_last2,
           AVG(close_price*volume) OVER w20 AS turn20,
           COUNT(*) OVER wsym AS n,
           ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trading_date DESC) AS rn
    FROM stock_prices
    WHERE symbol <> 'VNINDEX'
      AND trading_date <= %(asof)s
      AND trading_date >= (%(asof)s::date - 400)
    WINDOW
        wsym    AS (PARTITION BY symbol ORDER BY trading_date),
        w60     AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 59 PRECEDING AND CURRENT ROW),
        w5      AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 4  PRECEDING AND CURRENT ROW),
        w20     AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW),
        wfirst3 AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 4  PRECEDING AND 2 PRECEDING),
        wlast2  AS (PARTITION BY symbol ORDER BY trading_date ROWS BETWEEN 1  PRECEDING AND CURRENT ROW)
)
SELECT symbol, close_price, ma20, ma50, rsi_14, hi60, hi5, lo5, vol5, vol20, vol_first3, vol_last2, turn20, n
FROM px WHERE rn = 1 AND n >= 60
"""

VNINDEX_MA50_SQL = """
WITH v AS (
    SELECT trading_date, close_price,
           AVG(close_price) OVER (ORDER BY trading_date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) AS ma50
    FROM stock_prices WHERE symbol='VNINDEX' AND trading_date <= %(asof)s
)
SELECT close_price, ma50 FROM v ORDER BY trading_date DESC LIMIT 1
"""


def vnindex_above_ma50(cur, asof: str) -> bool:
    """Bộ lọc thị trường: chỉ tham gia khi VN-Index đang trên MA50 (regime tăng)."""
    cur.execute(VNINDEX_MA50_SQL, {"asof": asof})
    row = cur.fetchone()
    if not row or row[1] is None:
        return False
    return float(row[0]) > float(row[1])


def score_moneyflow(cur, asof: str) -> list[dict]:
    """Phương pháp 2 — Đầu tư dòng tiền (tích lũy chặt trước breakout):
    (1) VN-Index > MA50 (chỉ tham gia khi thị trường chung đang tăng)
    (2) Giá tích lũy hẹp 3-5 phiên gần nhất (biên độ nhỏ), khối lượng nhỏ/co lại
        (vol càng nhỏ, càng co so với TB 20 phiên thì càng tốt)
    (3) R/R > 2 tính từ giá hiện tại tới hỗ trợ (đáy nền tích lũy) và kháng cự
        (đỉnh 60 phiên) — lọc cứng, không đạt thì loại.
    Không có gì qua lọc khi thị trường dưới MA50 -> trả về [] (chiến lược không kích hoạt)."""
    if not vnindex_above_ma50(cur, asof):
        return []

    cur.execute(MONEYFLOW_SQL, {"asof": asof})
    cols = [c[0] for c in cur.description]
    recs = [dict(zip(cols, r)) for r in cur.fetchall()]

    out = []
    for r in recs:
        if not r["turn20"] or float(r["turn20"]) / 1e9 < MIN_TURNOVER_BN:
            continue
        close = float(r["close_price"])
        ma20 = float(r["ma20"]) if r["ma20"] else None
        ma50 = float(r["ma50"]) if r["ma50"] else None
        if not ma50 or close <= ma50:            # chỉ mua cổ phiếu cũng đang trên xu hướng tăng
            continue
        hi5, lo5, hi60 = float(r["hi5"]), float(r["lo5"]), float(r["hi60"])
        range5_pct = (hi5 - lo5) / close if close else 1.0
        if range5_pct > 0.12:                      # không phải nền tích lũy chặt
            continue

        support = lo5
        resistance = hi60 if hi60 > close * 1.02 else close * 1.15
        risk_pct = (close - support) / close
        if risk_pct <= 0.005:                       # giá đã thủng/sát đáy nền -> không còn hợp lệ
            continue
        reward_pct = (resistance - close) / close
        rr = reward_pct / risk_pct
        if rr < 2:                                   # lọc cứng theo yêu cầu
            continue

        vol20 = float(r["vol20"]) if r["vol20"] else None
        vol_ratio = (float(r["vol5"]) / vol20) if vol20 else 1.0
        vf3 = float(r["vol_first3"]) if r["vol_first3"] else None
        vl2 = float(r["vol_last2"]) if r["vol_last2"] else None
        contracting = bool(vf3 and vl2 and vl2 < vf3)
        rsi = float(r["rsi_14"]) if r["rsi_14"] is not None else 50.0

        s = 0.0
        # độ chặt của nền (tối đa 25) — càng hẹp càng tốt
        if range5_pct <= 0.03: s += 25
        elif range5_pct <= 0.05: s += 18
        elif range5_pct <= 0.07: s += 10
        else: s += 4
        # khối lượng nhỏ so với TB 20 phiên (tối đa 20) — càng nhỏ càng tốt
        if vol_ratio <= 0.5: s += 20
        elif vol_ratio <= 0.7: s += 14
        elif vol_ratio <= 0.9: s += 8
        elif vol_ratio <= 1.1: s += 2
        else: s -= 8
        # khối lượng đang co lại trong chính nền (thêm)
        if contracting: s += 10
        # bối cảnh xu hướng
        if ma20 and close > ma20: s += 8
        if ma20 and ma20 > ma50: s += 7
        # RSI chưa quá mua
        if 45 <= rsi <= 65: s += 8
        elif rsi > 75: s -= 8
        # thưởng thêm cho R/R cao hơn ngưỡng 2 (chặn để không chỉ thắng vì risk siêu nhỏ)
        s += max(0.0, min(12.0, (rr - 2) * 4))

        out.append(dict(
            symbol=r["symbol"], score=round(50 + s, 1), close=close,
            turn_bn=round(float(r["turn20"]) / 1e9, 1),
            metrics=[
                _m("Biên độ nền 5 phiên", f"{range5_pct*100:.1f}%", "up" if range5_pct <= 0.05 else "neutral"),
                _m("Khối lượng ×TB20", f"{vol_ratio:.2f}", "up" if vol_ratio <= 0.7 else "down" if vol_ratio > 1.1 else "neutral"),
                _m("Vol đang co lại", "Có" if contracting else "Chưa", "up" if contracting else "neutral"),
                _m("Hỗ trợ (đáy nền)", f"{support:,.0f}", "neutral"),
                _m("Kháng cự (đỉnh 60p)", f"{resistance:,.0f}", "neutral"),
                _m("Risk / Reward", f"−{risk_pct*100:.1f}% / +{reward_pct*100:.1f}%", "neutral"),
                _m("R/R", f"{rr:.1f}x", "up"),
                _m("RSI", f"{rsi:.0f}", "down" if rsi > 75 else "neutral"),
            ],
        ))
    out.sort(key=lambda x: -x["score"])
    return out


DDL = """
CREATE TABLE IF NOT EXISTS strategy_backtest_runs (
    id            SERIAL PRIMARY KEY,
    strategy      VARCHAR(30) NOT NULL,
    status        VARCHAR(20) DEFAULT 'running',
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    finished_at   TIMESTAMPTZ,
    sample_start  DATE,
    sample_end    DATE,
    n_samples     INTEGER,
    top20_ret5d   DOUBLE PRECISION,
    universe_ret5d DOUBLE PRECISION,
    edge_5d       DOUBLE PRECISION,
    top20_ret10d  DOUBLE PRECISION,
    hit_rate_5d   DOUBLE PRECISION,
    error         TEXT
);
"""


def _snapshot(cur, asof: str) -> list[dict]:
    cur.execute(SNAPSHOT_SQL, {"asof": asof})
    cols = [c[0] for c in cur.description]
    recs = [dict(zip(cols, r)) for r in cur.fetchall()]
    return [r for r in recs if r["turn20"] and float(r["turn20"]) / 1e9 >= MIN_TURNOVER_BN
            and r["ma20"] and r["ma50"] and r["ret20"] is not None and r["ret60"] is not None]


def _zscore(vals: list[float | None]) -> list[float]:
    v = [x for x in vals if x is not None]
    if len(v) < 5:
        return [0.0] * len(vals)
    m, s = statistics.fmean(v), (statistics.pstdev(v) or 1.0)
    return [(x - m) / s if x is not None else 0.0 for x in vals]


def _m(label: str, value: str, tone: str = "neutral") -> dict:
    """1 chỉ số hiển thị trên bảng xếp hạng. tone: up/down/neutral -> màu ở frontend."""
    return {"label": label, "value": value, "tone": tone}


def score_momentum(cur, asof: str) -> list[dict]:
    """Động lượng: xu hướng + động lượng 20/60 phiên + sức mạnh tương đối vs
    VN-Index + vùng RSI lành mạnh (phạt quá mua/parabol) + khối lượng + sắp breakout."""
    recs = _snapshot(cur, asof)
    if not recs:
        return []
    vni20 = float(recs[0]["vni_ret20"] or 0)
    zr20 = _zscore([float(r["ret20"]) for r in recs])
    zr60 = _zscore([float(r["ret60"]) for r in recs])
    zrs = _zscore([float(r["ret20"]) - vni20 for r in recs])

    out = []
    for i, r in enumerate(recs):
        close = float(r["close_price"]); ma20 = float(r["ma20"]); ma50 = float(r["ma50"])
        ma200 = float(r["ma200"]) if (r["ma200"] and r["n"] >= 200) else None
        hi60 = float(r["hi60"])
        rsi = float(r["rsi_14"]) if r["rsi_14"] is not None else 50.0
        vol_surge = (float(r["vol5"]) / float(r["vol20"])) if r["vol20"] else 1.0

        s = 0.0
        if close > ma20: s += 10
        if ma20 > ma50: s += 8
        if ma200 and close > ma200: s += 12
        s += max(-6, min(10, zr20[i] * 6))
        s += max(-4, min(8, zr60[i] * 5))
        s += max(-5, min(10, zrs[i] * 6))
        if 45 <= rsi <= 65: s += 12
        elif 35 <= rsi < 45 or 65 < rsi <= 70: s += 6
        elif rsi > 80: s -= 20
        elif rsi > 75: s -= 12
        elif rsi > 70: s -= 5
        if float(r["ret20"]) > 0.30: s -= 12
        elif float(r["ret20"]) > 0.22: s -= 6
        if vol_surge >= 1.5: s += 10
        elif vol_surge >= 1.15: s += 6
        elif vol_surge < 0.7: s -= 3
        gap_hi = (hi60 - close) / close if close else 1
        if 0 <= gap_hi <= 0.03: s += 10
        elif gap_hi <= 0.07: s += 5

        ret20p, ret60p, rs20p = float(r["ret20"]) * 100, float(r["ret60"]) * 100, (float(r["ret20"]) - vni20) * 100
        out.append(dict(
            symbol=r["symbol"], score=round(50 + s, 1), close=close,
            turn_bn=round(float(r["turn20"]) / 1e9, 1),
            metrics=[
                _m("RSI", f"{rsi:.0f}", "down" if rsi > 70 else "neutral"),
                _m("Ret20", f"{ret20p:+.1f}%", "up" if ret20p >= 0 else "down"),
                _m("Ret60", f"{ret60p:+.1f}%", "up" if ret60p >= 0 else "down"),
                _m("Sức mạnh tương đối 20p", f"{rs20p:+.1f}%", "up" if rs20p >= 0 else "down"),
                _m("Khối lượng ×TB20", f"{vol_surge:.2f}", "up" if vol_surge >= 1.15 else "neutral"),
                _m("Cách đỉnh 60p", f"{gap_hi*100:.1f}%", "neutral"),
                _m("Trên MA200", "Có" if (ma200 and close > ma200) else "Chưa", "up" if (ma200 and close > ma200) else "neutral"),
            ],
        ))
    out.sort(key=lambda x: -x["score"])
    return out


def score_contra(cur, asof: str) -> list[dict]:
    """Ngược chiều (mean-reversion): quá bán trong xu hướng còn nguyên, gần đáy
    ngắn hạn, có dấu hiệu bán tháo kiệt sức (volume climax)."""
    recs = _snapshot(cur, asof)
    if not recs:
        return []
    cur.execute("""
        SELECT symbol, MIN(low_price) FROM stock_prices
        WHERE symbol<>'VNINDEX' AND trading_date <= %(asof)s AND trading_date >= (%(asof)s::date - 40)
        GROUP BY symbol
    """, {"asof": asof})
    lo20 = {s: float(v) for s, v in cur.fetchall()}

    out = []
    for r in recs:
        close = float(r["close_price"]); ma200 = float(r["ma200"]) if (r["ma200"] and r["n"] >= 200) else None
        rsi = float(r["rsi_14"]) if r["rsi_14"] is not None else 50.0
        ret20 = float(r["ret20"]); ret60 = float(r["ret60"])
        vol_climax = (float(r["vol5"]) / float(r["vol20"])) if r["vol20"] else 1.0
        lo = lo20.get(r["symbol"])
        s = 0.0
        if 25 <= rsi <= 42: s += 18
        elif 42 < rsi <= 50: s += 8
        elif rsi > 58: s -= 12
        if ma200 and close > ma200: s += 15
        if ma200 and close < ma200 * 0.90: s -= 20
        if lo and close <= lo * 1.05: s += 14
        if ret20 < -0.03 and ret60 > 0: s += 12
        if ret20 < -0.10: s -= 6
        if vol_climax >= 1.6: s += 10
        elif vol_climax >= 1.2: s += 5
        gap_lo = (close / lo - 1) * 100 if lo else 0.0
        out.append(dict(
            symbol=r["symbol"], score=round(50 + s, 1), close=close,
            turn_bn=round(float(r["turn20"]) / 1e9, 1),
            metrics=[
                _m("RSI", f"{rsi:.0f}", "down" if rsi < 35 else "neutral"),
                _m("Ret20", f"{ret20*100:+.1f}%", "up" if ret20 >= 0 else "down"),
                _m("Ret60", f"{ret60*100:+.1f}%", "up" if ret60 >= 0 else "down"),
                _m("Khối lượng bán tháo ×TB20", f"{vol_climax:.2f}", "up" if vol_climax >= 1.2 else "neutral"),
                _m("Cách đáy 20p", f"{gap_lo:.1f}%", "neutral"),
                _m("Trên MA200", "Có" if (ma200 and close > ma200) else "Chưa", "up" if (ma200 and close > ma200) else "neutral"),
            ],
        ))
    out.sort(key=lambda x: -x["score"])
    return out


STRATEGIES: dict[str, dict[str, Any]] = {
    "momentum": {
        "label": "Động lượng",
        "scorer": score_momentum,
        "desc": "Xu hướng (giá vs MA20/50/200) + động lượng 20/60 phiên + sức mạnh "
                "tương đối vs VN-Index + RSI vùng lành mạnh + khối lượng xác nhận + sắp breakout.",
    },
    "contra": {
        "label": "Ngược chiều (Mean-reversion)",
        "scorer": score_contra,
        "desc": "Quá bán (RSI 25-42) nhưng xu hướng dài hạn còn nguyên (trên MA200), "
                "gần đáy 20 phiên, có dấu hiệu bán tháo kiệt sức (volume climax).",
    },
    "moneyflow": {
        "label": "PP2: Đầu tư dòng tiền",
        "scorer": score_moneyflow,
        "desc": "Chỉ tham gia khi VN-Index > MA50 (thị trường chung đang tăng). Giá tích lũy "
                "hẹp 3-5 phiên, khối lượng nhỏ/co lại so TB20 (càng nhỏ càng tốt). "
                "R/R > 2 tính từ giá tới hỗ trợ (đáy nền) / kháng cự (đỉnh 60 phiên) — lọc cứng.",
        "backtest_top_n": None,     # None = dùng TOÀN BỘ mã qua lọc (không cắt top-20), vì bản thân đã lọc cứng
        "min_signals": 1,           # cần ít nhất 1 mã đạt mẫu mới tính vào backtest ngày đó
    },
}


def get_scorer(strategy: str) -> Callable:
    if strategy not in STRATEGIES:
        raise ValueError(f"Không rõ chiến lược '{strategy}'. Có: {list(STRATEGIES)}")
    return STRATEGIES[strategy]["scorer"]


def rank(cur, strategy: str, asof: str, topn: int = 15) -> dict:
    scorer = get_scorer(strategy)
    ranked = scorer(cur, asof)
    return {"strategy": strategy, "as_of": asof, "universe_size": len(ranked),
            "results": ranked[:topn]}


def run_backtest(cur, strategy: str, log=print) -> dict:
    """Chạy kiểm định lịch sử: mỗi 8 phiên trong ~19 tháng gần nhất (chừa 12
    phiên cuối để có forward return), so return 5/10 phiên sau của các mã tín
    hiệu vs toàn universe thanh khoản. Trả dict kết quả có cấu trúc (để lưu
    DB / trả API).

    - Chiến lược xếp hạng thuần (momentum/contra): tín hiệu = top-20 điểm cao
      nhất; universe so sánh = chính danh sách đã lọc thanh khoản đó.
    - Chiến lược có lọc cứng (vd moneyflow, backtest_top_n=None): tín hiệu =
      TẤT CẢ mã qua lọc hôm đó (có thể 0); universe so sánh = universe thanh
      khoản chung (_snapshot), không phải chính danh sách tín hiệu."""
    meta = STRATEGIES[strategy]
    scorer = meta["scorer"]
    top_n = meta.get("backtest_top_n", 20)
    min_signals = meta.get("min_signals", 40 if top_n else 1)

    cur.execute("SELECT symbol, trading_date, close_price FROM stock_prices WHERE symbol<>'VNINDEX' ORDER BY symbol, trading_date")
    cache: dict[str, list] = {}
    for sym, d, c in cur.fetchall():
        cache.setdefault(sym, []).append((d, float(c)))

    def fwd(sym, asof, nd):
        arr = cache.get(sym)
        if not arr:
            return None
        i = next((k for k, (dd, _) in enumerate(arr) if dd >= asof), None)
        if i is None or i + nd >= len(arr):
            return None
        return (arr[i + nd][1] / arr[i][1] - 1) * 100

    cur.execute("SELECT DISTINCT trading_date FROM stock_prices WHERE symbol<>'VNINDEX' ORDER BY trading_date")
    dates = [r[0] for r in cur.fetchall()]
    sample = dates[-400:-12:8]
    log(f"Backtest [{strategy}]: {len(sample)} ngày mẫu ({sample[0]} → {sample[-1]})")

    agg = {"t5": [], "t10": [], "u5": [], "hit5": 0, "tot": 0}
    skipped_no_signal = 0
    for d in sample:
        signals = scorer(cur, d.isoformat())
        if len(signals) < min_signals:
            skipped_no_signal += 1
            continue
        picks = signals[:top_n] if top_n else signals
        baseline = signals if top_n else _snapshot(cur, d.isoformat())
        t5 = [x for x in (fwd(r["symbol"], d, 5) for r in picks) if x is not None]
        t10 = [x for x in (fwd(r["symbol"], d, 10) for r in picks) if x is not None]
        u5 = [x for x in (fwd(r["symbol"], d, 5) for r in baseline) if x is not None]
        if not t5 or not u5:
            continue
        mt5, mu5 = statistics.fmean(t5), statistics.fmean(u5)
        agg["t5"].append(mt5); agg["u5"].append(mu5)
        agg["t10"].append(statistics.fmean(t10) if t10 else 0.0)
        agg["tot"] += 1
        agg["hit5"] += mt5 > mu5

    n = agg["tot"]
    if n == 0:
        return {"strategy": strategy, "n_samples": 0,
                "error": f"Không đủ dữ liệu mẫu ({skipped_no_signal} ngày không đủ tín hiệu/thị trường không đạt điều kiện)"}
    if not top_n:
        log(f"({skipped_no_signal}/{len(sample)} ngày không có mã nào đạt điều kiện hoặc VN-Index < MA50 — bỏ qua)")
    top5 = statistics.fmean(agg["t5"]); uni5 = statistics.fmean(agg["u5"])
    result = {
        "strategy": strategy,
        "sample_start": sample[0].isoformat(), "sample_end": sample[-1].isoformat(),
        "n_samples": n,
        "top20_ret5d": round(top5, 3), "universe_ret5d": round(uni5, 3),
        "edge_5d": round(top5 - uni5, 3),
        "top20_ret10d": round(statistics.fmean(agg["t10"]), 3),
        "hit_rate_5d": round(100 * agg["hit5"] / n, 1),
    }
    log(f"Return 5 phiên: top20 {top5:+.2f}% vs universe {uni5:+.2f}%  (chênh {top5-uni5:+.2f}%)")
    log(f"Thắng universe: {agg['hit5']}/{n} ({100*agg['hit5']/n:.0f}%)")
    return result


def save_backtest_run(conn, run_id: int, result: dict):
    with conn.cursor() as cur:
        cur.execute(DDL)
        if "error" in result and result.get("n_samples", 0) == 0:
            cur.execute("""UPDATE strategy_backtest_runs
                            SET status='error', error=%s, finished_at=NOW() WHERE id=%s""",
                        (result["error"], run_id))
        else:
            cur.execute("""
                UPDATE strategy_backtest_runs SET
                    status='done', finished_at=NOW(),
                    sample_start=%(sample_start)s, sample_end=%(sample_end)s, n_samples=%(n_samples)s,
                    top20_ret5d=%(top20_ret5d)s, universe_ret5d=%(universe_ret5d)s, edge_5d=%(edge_5d)s,
                    top20_ret10d=%(top20_ret10d)s, hit_rate_5d=%(hit_rate_5d)s
                WHERE id=%(id)s
            """, {**result, "id": run_id})
    conn.commit()
