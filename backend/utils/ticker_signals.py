"""Tín hiệu theo mã: reward/risk + tâm lý (psychology) tính từ dữ liệu THẬT.

Dùng cho ChartPage — mọi thẻ bên phải + dải header cập nhật theo symbol đang chọn.
Nguồn: stock_prices (giá/MA/RSI), yt_ticker_mentions (CFA99), VNDirect foreigns
(room khối ngoại, tuỳ chọn).

    from backend.utils.ticker_signals import compute_ticker_signals
    compute_ticker_signals("HPG")
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import psycopg2
import requests

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
_FOREIGN_URL = "https://api-finfo.vndirect.com.vn/v4/foreigns"
_HEADERS = {"User-Agent": "Mozilla/5.0"}


def _gauge_label(g: float) -> str:
    if g < 20:
        return "EXTREME_FEAR"
    if g < 40:
        return "FEAR"
    if g < 60:
        return "NEUTRAL"
    if g < 80:
        return "GREED"
    return "EXTREME_GREED"


def _pct(a: float, b: float) -> Optional[float]:
    return round((a / b - 1) * 100, 2) if b else None


def _technical_score(price, ma20, ma50, ma200, rsi, hi52) -> float:
    s = 0.0
    if ma20 and price > ma20:
        s += 20
    if ma50 and price > ma50:
        s += 20
    if ma200 and price > ma200:
        s += 25
    if rsi is not None:
        if 45 <= rsi <= 60:
            s += 15
        elif 35 <= rsi < 45 or 60 < rsi <= 70:
            s += 8
        elif rsi < 35:
            s += 12  # oversold — tiềm năng hồi
        # rsi > 70: +0 (quá mua)
    if hi52 and price:
        gap = (hi52 - price) / hi52
        if gap <= 0.15:
            s += 20
        elif gap <= 0.30:
            s += 10
    return round(max(0.0, min(100.0, s)), 1)


def _fetch_foreign(symbol: str) -> Dict[str, Any]:
    try:
        r = requests.get(
            _FOREIGN_URL,
            params={"sort": "tradingDate", "q": f"code:{symbol}", "size": 5},
            headers=_HEADERS, timeout=8,
        )
        data = r.json().get("data", [])
        if not data:
            return {}
        data.sort(key=lambda x: x["tradingDate"])
        last = data[-1]
        room_pct = None
        if last.get("totalRoom"):
            room_pct = round(last["currentRoom"] / last["totalRoom"] * 100, 1)
        net_5d = round(sum(d.get("netVal", 0) for d in data) / 1e9, 1)
        return {
            "trading_date": last["tradingDate"],
            "net_val_bn": round(last.get("netVal", 0) / 1e9, 2),
            "net_5d_bn": net_5d,
            "room_left_pct": room_pct,
        }
    except Exception:
        return {}


def compute_ticker_signals(symbol: str) -> Dict[str, Any]:
    symbol = symbol.upper().strip()
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH w AS (
                    SELECT
                        trading_date, close_price, ma20, ma50, rsi_14, volume,
                        AVG(close_price) OVER (ORDER BY trading_date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS ma200,
                        MIN(low_price)   OVER (ORDER BY trading_date ROWS BETWEEN 19  PRECEDING AND CURRENT ROW) AS lo20,
                        MAX(high_price)  OVER (ORDER BY trading_date ROWS BETWEEN 59  PRECEDING AND CURRENT ROW) AS hi60,
                        MAX(high_price)  OVER (ORDER BY trading_date ROWS BETWEEN 119 PRECEDING AND CURRENT ROW) AS hi120,
                        MAX(high_price)  OVER (ORDER BY trading_date ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) AS hi252,
                        MIN(low_price)   OVER (ORDER BY trading_date ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) AS lo252,
                        AVG(close_price * volume) OVER (ORDER BY trading_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS turn20,
                        COUNT(*) OVER (ORDER BY trading_date) AS n
                    FROM stock_prices WHERE symbol = %s
                )
                SELECT * FROM w ORDER BY trading_date DESC LIMIT 1
                """,
                (symbol,),
            )
            row = cur.fetchone()
            if not row:
                return {"error": f"Không có dữ liệu giá cho {symbol}"}
            cols = [c[0] for c in cur.description]
            d = dict(zip(cols, row))

            cur.execute("SELECT company_name, sector FROM stocks WHERE symbol = %s", (symbol,))
            meta = cur.fetchone() or (None, None)

            # Cơ bản thật (VNDirect v4/ratios) — xem fetch_fundamentals.py
            cur.execute(
                """
                SELECT pe, pb, ps, dividend_yield, eps_ttm, eps_growth_yoy,
                       net_margin_ttm, gross_margin_ttm, roe, roa, roic,
                       revenue_growth_yoy, profit_growth_yoy, debt_to_equity,
                       current_ratio, interest_coverage, foreign_ownership, beta, as_of_date
                FROM fundamentals_snapshot WHERE symbol = %s
                """,
                (symbol,),
            )
            frow = cur.fetchone()
            fcols = [c[0] for c in cur.description] if frow else []

            # CFA99 mentions (30/60 ngày gần nhất trong dữ liệu observation)
            cur.execute(
                """
                SELECT
                    COALESCE(SUM(mentions), 0), COALESCE(SUM(questions), 0),
                    COALESCE(SUM(bullish_count), 0), COALESCE(SUM(bearish_count), 0),
                    COALESCE(SUM(fomo_count), 0), COALESCE(SUM(fear_count), 0)
                FROM yt_ticker_mentions
                WHERE ticker = %s
                  AND date >= (SELECT COALESCE(MAX(date), '1900-01-01') - INTERVAL '60 days' FROM yt_ticker_mentions)
                """,
                (symbol,),
            )
            m = cur.fetchone() or (0, 0, 0, 0, 0, 0)
    finally:
        conn.close()

    price = float(d["close_price"])
    ma20 = float(d["ma20"]) if d["ma20"] is not None else None
    ma50 = float(d["ma50"]) if d["ma50"] is not None else None
    ma200 = float(d["ma200"]) if d["ma200"] is not None and d["n"] >= 200 else None
    rsi = float(d["rsi_14"]) if d["rsi_14"] is not None else None
    lo20 = float(d["lo20"]); hi60 = float(d["hi60"]); hi120 = float(d["hi120"])
    hi252 = float(d["hi252"]) if d["n"] >= 200 else hi120
    lo252 = float(d["lo252"]) if d["n"] >= 200 else lo20

    support = lo20
    res_near = hi60 if hi60 > price * 1.02 else hi120
    res_far = hi120
    risk_pct = round((price - support) / price * 100, 2) if price else None
    reward_pct = round((res_near - price) / price * 100, 2) if price else None
    reward_far_pct = round((res_far - price) / price * 100, 2) if price else None
    rr = round(reward_pct / risk_pct, 2) if (risk_pct and risk_pct > 0) else None
    rr_far = round(reward_far_pct / risk_pct, 2) if (risk_pct and risk_pct > 0) else None

    mentions, questions, bull, bear, fomo, fear = (int(x) for x in m)
    net_bull_pct = round((bull - bear) / mentions * 100, 1) if mentions else None

    tech = _technical_score(price, ma20, ma50, ma200, rsi, hi252)
    if mentions >= 3 and net_bull_pct is not None:
        gauge = round(0.7 * tech + 0.3 * max(0, min(100, 50 + net_bull_pct * 0.5)), 1)
    else:
        gauge = tech

    foreign = _fetch_foreign(symbol)

    fund: Dict[str, Any] = dict(zip(fcols, frow)) if frow else {}
    for k, v in list(fund.items()):
        if k != "as_of_date" and v is not None:
            fund[k] = round(float(v), 4)
    if "as_of_date" in fund and fund["as_of_date"] is not None:
        fund["as_of_date"] = str(fund["as_of_date"])
    # Cờ rủi ro cơ bản đơn giản: có lãi, không đòn bẩy quá cao, doanh thu không sập
    risk_flags = []
    if fund.get("net_margin_ttm") is not None and fund["net_margin_ttm"] <= 0:
        risk_flags.append("Biên LN ròng âm (đang lỗ)")
    if fund.get("debt_to_equity") is not None and fund["debt_to_equity"] > 2.0:
        risk_flags.append(f"Nợ/VCSH cao ({fund['debt_to_equity']:.1f}x)")
    if fund.get("revenue_growth_yoy") is not None and fund["revenue_growth_yoy"] < -0.20:
        risk_flags.append(f"Doanh thu giảm sâu YoY ({fund['revenue_growth_yoy']*100:.0f}%)")
    if fund.get("current_ratio") is not None and fund["current_ratio"] < 1.0:
        risk_flags.append(f"Thanh khoản hiện hành < 1 ({fund['current_ratio']:.2f})")
    fund["risk_flags"] = risk_flags
    fund["not_too_risky"] = len(risk_flags) == 0 and bool(fund)

    return {
        "symbol": symbol,
        "company_name": meta[0],
        "sector": meta[1],
        "as_of": str(d["trading_date"]),
        "price": price,
        "reward_risk": {
            "support": round(support),
            "resistance_near": round(res_near),
            "resistance_far": round(res_far),
            "risk_pct": risk_pct,
            "reward_pct": reward_pct,
            "reward_far_pct": reward_far_pct,
            "rr": rr,
            "rr_far": rr_far,
            "valid": bool(rr is not None and rr >= 2.0),
        },
        "technical": {
            "ma20": round(ma20) if ma20 else None,
            "ma50": round(ma50) if ma50 else None,
            "ma200": round(ma200) if ma200 else None,
            "above_ma20": bool(ma20 and price > ma20),
            "above_ma50": bool(ma50 and price > ma50),
            "above_ma200": bool(ma200 and price > ma200),
            "rsi_14": round(rsi, 1) if rsi is not None else None,
            "high_52w": round(hi252),
            "low_52w": round(lo252),
            "pct_from_high_52w": _pct(price, hi252),
            "pct_from_low_52w": _pct(price, lo252),
            "dist_to_ma50_pct": _pct(price, ma50) if ma50 else None,
        },
        "liquidity": {
            "turnover_20d_bn": round(float(d["turn20"] or 0) / 1e9, 1),
        },
        "cfa99": {
            "mentions_60d": mentions,
            "questions_60d": questions,
            "bullish_60d": bull,
            "bearish_60d": bear,
            "fomo_60d": fomo,
            "fear_60d": fear,
            "net_bull_pct": net_bull_pct,
        },
        "foreign": foreign,
        "fundamentals": fund,
        "sentiment": {
            "technical_score": tech,
            "composite_gauge": gauge,
            "label": _gauge_label(gauge),
        },
    }
