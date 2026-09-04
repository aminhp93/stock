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

        out.append(dict(symbol=r["symbol"], score=round(50 + s, 1), close=close, rsi=round(rsi, 1),
                        ret20=round(float(r["ret20"]) * 100, 1), ret60=round(float(r["ret60"]) * 100, 1),
                        rs20=round((float(r["ret20"]) - vni20) * 100, 1),
                        vol_surge=round(vol_surge, 2), gap_to_hi60=round(gap_hi * 100, 1),
                        turn_bn=round(float(r["turn20"]) / 1e9, 1),
                        above_ma200=(ma200 is not None and close > ma200)))
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
        out.append(dict(symbol=r["symbol"], score=round(50 + s, 1), close=close, rsi=round(rsi, 1),
                        ret20=round(ret20 * 100, 1), ret60=round(ret60 * 100, 1), rs20=0.0,
                        vol_surge=round(vol_climax, 2),
                        gap_to_hi60=round((close / lo - 1) * 100, 1) if lo else 0.0,
                        turn_bn=round(float(r["turn20"]) / 1e9, 1),
                        above_ma200=(ma200 is not None and close > ma200)))
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
    phiên cuối để có forward return), so return 5/10 phiên sau của top-20 vs
    toàn universe. Trả dict kết quả có cấu trúc (để lưu DB / trả API)."""
    scorer = get_scorer(strategy)

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
    for d in sample:
        ranked = scorer(cur, d.isoformat())
        if len(ranked) < 40:
            continue
        top = ranked[:20]
        t5 = [x for x in (fwd(r["symbol"], d, 5) for r in top) if x is not None]
        t10 = [x for x in (fwd(r["symbol"], d, 10) for r in top) if x is not None]
        u5 = [x for x in (fwd(r["symbol"], d, 5) for r in ranked) if x is not None]
        if not t5 or not u5:
            continue
        mt5, mu5 = statistics.fmean(t5), statistics.fmean(u5)
        agg["t5"].append(mt5); agg["u5"].append(mu5)
        agg["t10"].append(statistics.fmean(t10) if t10 else 0.0)
        agg["tot"] += 1
        agg["hit5"] += mt5 > mu5

    n = agg["tot"]
    if n == 0:
        return {"strategy": strategy, "n_samples": 0, "error": "Không đủ dữ liệu mẫu"}
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
