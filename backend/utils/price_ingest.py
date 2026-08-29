"""Unified price ingestion helper.

Single source of truth for turning VNDirect Finfo OHLCV data into the row
shape stored in `stock_prices`. Both the bulk backfill script
(`scripts/fetch_vn_stocks_history.py`) and the live `/api/data/sync` endpoint
in `server.py` MUST go through here so the historical series can never diverge
between the two paths (that divergence was the cause of the "phantom holiday
row" corruption).

Design notes
------------
* Series is dividend/split adjusted BUT **anchored to the latest bar** so the
  most recent close equals the real market quote, while history is scaled back
  for continuity. Formula per bar: ``adj = raw * (adClose_i/close_i) / (adClose_last/close_last)``.
  Raw prices produce fake -50% single-day drops on ex-rights dates; VNDirect's
  own ``adClose`` is anchored to a *future* factor so "today" wouldn't match a
  broker screen. Anchoring to the last bar fixes both.
* Prices are quoted by Finfo in thousands of VND -> multiply by 1000 and round
  to whole VND (VN exchanges never tick below 1 VND).
* RSI-14 / MA20 / MA50 are computed point-in-time (only past+current bars).
* Every row is validated: OHLC present & positive, low <= open/close <= high,
  no weekend dates. Bad rows are dropped, not stored.
"""

from __future__ import annotations

import datetime as _dt
from typing import Any, Dict, List, Optional

import numpy as np
import requests

from backend.utils.metrics import calculate_rsi

FINFO_URL = "https://api-finfo.vndirect.com.vn/v4/stock_prices"
_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
DEFAULT_START = "2021-01-01"


def _valid_ohlc(o: float, h: float, l: float, c: float, v: float) -> bool:
    if None in (o, h, l, c):
        return False
    if min(o, h, l, c) <= 0:
        return False
    if h < l:
        return False
    if not (l - 1 <= o <= h + 1) or not (l - 1 <= c <= h + 1):
        return False
    if v is None or v < 0:
        return False
    return True


def _enrich(sub_closes: List[float]) -> Dict[str, Optional[float]]:
    """Point-in-time indicators from the close series up to and incl. current bar."""
    rsi_val = calculate_rsi(sub_closes)
    ma20 = float(np.mean(sub_closes[-20:])) if len(sub_closes) >= 20 else None
    ma50 = float(np.mean(sub_closes[-50:])) if len(sub_closes) >= 50 else None
    return {
        "rsi_14": rsi_val,
        "ma20": round(ma20, 2) if ma20 is not None else None,
        "ma50": round(ma50, 2) if ma50 is not None else None,
    }


def _anchor_factor(rows: List[Dict[str, Any]]) -> float:
    """adClose/close of the most recent bar that has both -> the anchor divisor."""
    for row in reversed(rows):
        c, ac = row.get("close"), row.get("adClose")
        if c and ac and float(c) > 0:
            return float(ac) / float(c)
    return 1.0


def build_rows_from_finfo(raw_data: List[Dict[str, Any]], *, adjusted: bool = True) -> List[Dict[str, Any]]:
    """Turn a Finfo `data` array into validated, indicator-enriched price rows."""
    if not raw_data:
        return []

    rows = sorted(raw_data, key=lambda x: x["date"])
    norm = _anchor_factor(rows) if adjusted else 1.0

    def _px(row: Dict[str, Any], key: str, factor: float) -> Optional[float]:
        val = row.get(key)
        if val is None:
            return None
        return round(float(val) * factor * 1000)

    prepared: List[Dict[str, Any]] = []
    closes: List[float] = []
    for row in rows:
        d_str = row["date"]
        # weekday guard (Finfo shouldn't return weekends, but be defensive)
        try:
            if _dt.date.fromisoformat(d_str).weekday() >= 5:
                continue
        except (ValueError, TypeError):
            continue

        # per-bar dividend/split factor, anchored so the latest bar stays raw
        if adjusted and row.get("close") and row.get("adClose") and float(row["close"]) > 0:
            factor = (float(row["adClose"]) / float(row["close"])) / norm
        else:
            factor = 1.0

        o = _px(row, "open", factor)
        h = _px(row, "high", factor)
        l = _px(row, "low", factor)
        c = _px(row, "close", factor)
        v = row.get("nmVolume")
        if v is None:
            v = row.get("volume") or 0.0
        v = float(v)

        if not _valid_ohlc(o, h, l, c, v):
            continue

        closes.append(c)
        ind = _enrich(closes)
        prepared.append({
            "date": d_str,
            "open": o,
            "high": h,
            "low": l,
            "close": c,
            "volume": v,
            **ind,
        })

    return prepared


def fetch_price_history(symbol: str, start_date: str = DEFAULT_START, *,
                        adjusted: bool = True, timeout: int = 15) -> List[Dict[str, Any]]:
    """Fetch full adjusted OHLCV history for `symbol` from VNDirect Finfo.

    Returns [] on any network / parse error (caller decides how to react).
    """
    params = {"sort": "date", "q": f"code:{symbol}~date:gte:{start_date}", "size": 4000}
    try:
        r = requests.get(FINFO_URL, params=params, headers=_HEADERS, timeout=timeout)
        if r.status_code != 200:
            return []
        payload = r.json().get("data", [])
    except Exception:
        return []
    return build_rows_from_finfo(payload, adjusted=adjusted)
