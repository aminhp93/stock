"""Bản Tin Sáng — dựng bản tin thị trường buổi sáng từ dữ liệu hệ thống.

    python3 scripts/ban_tin_sang.py                 # dựng cho phiên chốt gần nhất -> artifacts/ban-tin-sang-YYYY-MM-DD.html
    python3 scripts/ban_tin_sang.py 2026-09-09      # dựng cho 1 phiên cụ thể
    python3 scripts/ban_tin_sang.py --data          # in JSON toàn bộ số liệu (không render)
    python3 scripts/ban_tin_sang.py --narrative narr.json   # dùng phần nhận định do người viết

`narr.json` = {"market": ["<p>...</p>", ...], "portfolio": ["<p>...</p>", ...]}
Nếu không có, script tự sinh nhận định cơ học (rule-based) để bản tin vẫn chạy độc lập.

Dùng qua skill: /ban-tin-sang  (xem .claude/skills/ban-tin-sang/SKILL.md)
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime

import psycopg2

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
_HEADERS = {"User-Agent": "Mozilla/5.0"}
_WD = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]

# nhóm để nhận diện ngành trong phần nhận định cơ học
BANKS = set("VCB BID CTG TCB MBB VPB ACB HDB STB SHB LPB VIB TPB EIB MSB OCB NAB SSB".split())
BROKERS = set("SSI VND VCI HCM VIX SHS MBS FTS BSI CTS ORS VDS AGR BVS TVB SBS".split())


def _fetch_index(symbol: str, sess: date):
    """(close phiên `sess`, % thay đổi so với phiên trước) từ VNDirect dchart. None nếu lỗi."""
    try:
        import requests
        to = int((datetime.combine(sess, datetime.min.time()).timestamp())) + 86400
        frm = to - 40 * 86400
        r = requests.get("https://dchart-api.vndirect.com.vn/dchart/history",
                         params={"symbol": symbol, "resolution": "D", "from": frm, "to": to},
                         headers=_HEADERS, timeout=10).json()
        if r.get("s") == "ok" and len(r.get("c", [])) >= 2:
            t, c = r["t"], r["c"]
            dts = [date.fromtimestamp(ti) for ti in t]
            # ưu tiên bar đúng ngày `sess`; nếu không có, bar gần nhất KHÔNG vượt quá sess
            idx = next((i for i in range(len(dts) - 1, -1, -1) if dts[i] == sess), None)
            if idx is None:
                idx = next((i for i in range(len(dts) - 1, -1, -1) if dts[i] <= sess), None)
            if idx is not None and idx >= 1:
                return round(c[idx], 2), round((c[idx] / c[idx - 1] - 1) * 100, 2)
    except Exception:
        pass
    return None, None


def _foreign_by_stock(d: str):
    """[(code, netVal_ty), ...] cho 1 ngày, sắp xếp giảm dần."""
    try:
        import requests
        rows = requests.get("https://api-finfo.vndirect.com.vn/v4/foreigns",
                            params={"sort": "tradingDate", "q": f"type:STOCK~tradingDate:{d}", "size": 2000},
                            headers=_HEADERS, timeout=20).json().get("data", [])
        out = [(x["code"], x.get("netVal", 0) / 1e9) for x in rows
               if x.get("tradingDate") == d and x.get("type") == "STOCK"]
        out.sort(key=lambda x: x[1], reverse=True)
        return out
    except Exception:
        return []


def gather(as_of: str | None = None) -> dict:
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    cur.execute("SELECT DISTINCT trading_date FROM stock_prices WHERE symbol<>'VNINDEX' ORDER BY trading_date DESC LIMIT 10")
    dates = [r[0] for r in cur.fetchall()]
    sess = date.fromisoformat(as_of) if as_of else dates[0]
    if sess not in dates:
        raise SystemExit(f"Không có dữ liệu cho phiên {sess}. Phiên gần nhất: {dates[0]}")
    prev = next(d for d in dates if d < sess)
    S, P = sess.isoformat(), prev.isoformat()

    # ── VN-Index / HNX ────────────────────────────────────────────────
    cur.execute("SELECT trading_date, close_price FROM stock_prices WHERE symbol='VNINDEX' AND trading_date<=%s ORDER BY trading_date DESC LIMIT 2", (S,))
    vni = cur.fetchall()
    vni_close = float(vni[0][1])
    vni_ret = round((vni_close / float(vni[1][1]) - 1) * 100, 2)
    hnx_close, hnx_ret = _fetch_index("HNX", sess)

    # VN-Index MA20/MA50 (mốc theo dõi)
    cur.execute("""
        SELECT AVG(close_price) FILTER (WHERE rn<=20), AVG(close_price) FILTER (WHERE rn<=50) FROM (
          SELECT close_price, ROW_NUMBER() OVER (ORDER BY trading_date DESC) rn
          FROM stock_prices WHERE symbol='VNINDEX' AND trading_date<=%s) t
    """, (S,))
    _r = cur.fetchone()
    vni_ma20 = round(float(_r[0])) if _r and _r[0] else None
    vni_ma50 = round(float(_r[1])) if _r and _r[1] else None

    # ── GTGD + độ rộng theo sàn ───────────────────────────────────────
    cur.execute("""
      WITH d AS (
        SELECT sp.symbol, sp.trading_date, sp.close_price, sp.volume, s.exchange,
          LAG(sp.close_price) OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date) pv
        FROM stock_prices sp JOIN stocks s ON s.symbol=sp.symbol
        WHERE s.exchange IN ('HOSE','HNX') AND sp.trading_date IN (%s,%s))
      SELECT trading_date, exchange, round(sum(close_price*volume)/1e9) gtgd,
             count(*) FILTER (WHERE close_price>pv) up, count(*) FILTER (WHERE close_price<pv) dn
      FROM d GROUP BY 1,2
    """, (P, S))
    ex = {}
    for d, x, g, u, n in cur.fetchall():
        ex.setdefault(x, {})[d.isoformat()] = dict(gtgd=int(g), up=u, dn=n)

    # ── khối ngoại (market-wide) ─────────────────────────────────────
    cur.execute("SELECT trading_date, round(net_val_vnd/1e9) FROM foreign_flow WHERE trading_date<=%s ORDER BY trading_date DESC LIMIT 5", (S,))
    ff = [(d.isoformat(), int(v)) for d, v in cur.fetchall()]

    # ── market_internals + psychology ───────────────────────────────
    cur.execute("""SELECT pct_above_ma20, pct_above_ma50, pct_above_ma200, adv_dec_ratio, nh_nl_diff,
        realized_vol_20d, vol_ratio_20d, drawdown_52w FROM market_internals WHERE trading_date=%s""", (S,))
    mi = cur.fetchone()
    internals = dict(zip(
        ["pct_ma20", "pct_ma50", "pct_ma200", "adv_dec", "nh_nl", "rvol", "vol_ratio", "drawdown"],
        [float(x) if x is not None else None for x in mi])) if mi else {}
    cur.execute("SELECT psychology_gauge, psychology_label, psychology_composite_z FROM market_psychology_daily WHERE trading_date=%s", (S,))
    pg = cur.fetchone()
    psych = dict(gauge=pg[0], label=pg[1], z=float(pg[2])) if pg else {}

    # ── large-cap movers (GTGD >= 100 tỷ) ────────────────────────────
    cur.execute("""
      WITH w AS (
        SELECT sp.symbol, s.company_name, sp.close_price, sp.volume,
          sp.close_price/NULLIF(LAG(sp.close_price) OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date),0)-1 chg,
          ROW_NUMBER() OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date DESC) rn
        FROM stock_prices sp JOIN stocks s ON s.symbol=sp.symbol
        WHERE s.exchange IN ('HOSE','HNX') AND sp.trading_date>=%s)
      SELECT symbol, close_price*volume/1e9 gtgd, chg*100 FROM w
      WHERE rn=1 AND chg IS NOT NULL AND close_price*volume/1e9 >= 100 ORDER BY chg DESC
    """, (P,))
    movers = [(s, round(float(g)), round(float(c), 1)) for s, g, c in cur.fetchall()]

    # ── top mạnh 5 phiên ────────────────────────────────────────────
    cur.execute("""
      WITH w AS (
        SELECT sp.symbol, s.company_name, s.exchange, sp.close_price, sp.rsi_14,
          sp.close_price/NULLIF(LAG(sp.close_price,5) OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date),0)-1 r5,
          AVG(sp.close_price*sp.volume) OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) t20,
          ROW_NUMBER() OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date DESC) rn
        FROM stock_prices sp JOIN stocks s ON s.symbol=sp.symbol
        WHERE s.exchange IN ('HOSE','HNX') AND sp.symbol<>'VNINDEX' AND sp.trading_date>=(%s::date - 40))
      SELECT symbol, company_name, close_price, r5*100, rsi_14, t20/1e9 FROM w
      WHERE rn=1 AND t20>=30e9 AND r5 IS NOT NULL AND rsi_14<78 AND rsi_14>0
      ORDER BY r5 DESC LIMIT 5
    """, (S,))
    strong = [dict(sym=s, name=n, price=float(p), r5=round(float(r), 1), rsi=round(float(x)), turn=round(float(t)))
              for s, n, p, r, x, t in cur.fetchall()]

    # ── sàng lọc reward/risk ────────────────────────────────────────
    cur.execute("""
      WITH w AS (
        SELECT sp.symbol, s.company_name, sp.close_price, sp.ma50, sp.rsi_14,
          MIN(sp.low_price)  OVER p20  AS lo20,
          MAX(sp.high_price) OVER p120 AS hi120,
          AVG(sp.close_price*sp.volume) OVER p20 AS turn20,
          COUNT(*) OVER p120 AS n,
          ROW_NUMBER() OVER (PARTITION BY sp.symbol ORDER BY sp.trading_date DESC) rn
        FROM stock_prices sp JOIN stocks s ON s.symbol=sp.symbol
        WHERE sp.symbol<>'VNINDEX' AND sp.trading_date<=%s
        WINDOW p20  AS (PARTITION BY sp.symbol ORDER BY sp.trading_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW),
               p120 AS (PARTITION BY sp.symbol ORDER BY sp.trading_date ROWS BETWEEN 119 PRECEDING AND CURRENT ROW))
      SELECT w.symbol, w.company_name, w.close_price, w.ma50, w.rsi_14, w.lo20, w.hi120, w.turn20,
             f.roe, f.debt_to_equity, f.revenue_growth_yoy, f.net_margin_ttm, f.pe
      FROM w LEFT JOIN fundamentals_snapshot f ON f.symbol=w.symbol
      WHERE w.rn=1 AND w.n>=120
    """, (S,))
    rr = []
    for sym, name, px, ma50, rsi, lo20, hi120, turn, roe, de, revg, nm, pe in cur.fetchall():
        if not (px and lo20 and hi120 and ma50):
            continue
        px, lo20, hi120, ma50 = float(px), float(lo20), float(hi120), float(ma50)
        rsi = float(rsi) if rsi else 50.0
        turn_bn = float(turn or 0) / 1e9
        if px <= lo20 or hi120 <= px * 1.03:
            continue
        risk = (px - lo20) / px
        reward = (hi120 - px) / px
        if not (0.03 <= risk <= 0.18) or turn_bn < 20 or px < ma50 * 0.97 or rsi >= 72:
            continue
        rrr = reward / risk
        if rrr < 2.5:
            continue
        # cơ bản không quá rủi ro
        if nm is not None and float(nm) <= 0:
            continue
        if de is not None and float(de) > 2.0:
            continue
        if revg is not None and float(revg) < -0.20:
            continue
        fac = []
        if px > ma50:
            fac.append("trên MA50")
        if roe is not None and float(roe) >= 0.15:
            fac.append(f"ROE {float(roe)*100:.0f}%")
        if pe is not None and 0 < float(pe) <= 10:
            fac.append(f"PE {float(pe):.1f}")
        if revg is not None and float(revg) >= 0.15:
            fac.append(f"DT +{float(revg)*100:.0f}%")
        rr.append(dict(sym=sym, name=name, price=px, buy_lo=lo20, target=hi120, stop=lo20 * 0.97,
                       rr=round(rrr, 1), rsi=round(rsi), factors=" · ".join(fac[:3]) or "trên/sát MA50"))
    rr.sort(key=lambda x: -x["rr"])
    rr = rr[:6]

    # ── khối ngoại theo mã ──────────────────────────────────────────
    fbs = _foreign_by_stock(S)
    top_buy = [(c, round(v, 1)) for c, v in fbs[:5]]
    top_sell = [(c, round(v, 1)) for c, v in fbs[-5:][::-1]]
    fmap = {c: v for c, v in fbs}

    # ── danh mục ────────────────────────────────────────────────────
    cur.execute("SELECT symbol, tong_sl, gia_von FROM finance_ck_holdings ORDER BY symbol")
    holds = {s: (float(q), float(v)) for s, q, v in cur.fetchall()}
    port_rows, tot_cost, tot_val, tot_valp = [], 0.0, 0.0, 0.0
    for sym, (q, von) in holds.items():
        cur.execute("""
          WITH w AS (SELECT close_price, ma20, ma50, rsi_14,
            LAG(close_price) OVER (ORDER BY trading_date) pv,
            AVG(close_price) OVER (ORDER BY trading_date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) ma200,
            ROW_NUMBER() OVER (ORDER BY trading_date DESC) rn
            FROM stock_prices WHERE symbol=%s AND trading_date<=%s)
          SELECT close_price, pv, ma20, ma50, ma200, rsi_14 FROM w WHERE rn=1
        """, (sym, S))
        row = cur.fetchone()
        if not row:
            port_rows.append(dict(sym=sym, qty=q, cost_nav=von, price=None, in_db=False, weight=q * von))
            tot_cost += q * von
            continue
        px, pv, ma20, ma50, ma200, rsi = (float(x) if x is not None else None for x in row)
        pv = pv or px
        above = [n for n, m in (("MA20", ma20), ("MA50", ma50), ("MA200", ma200)) if m and px > m]
        tech = ("trên " + "/".join(above)) if above else "dưới mọi MA"
        cost, val, valp = q * von, q * px, q * pv
        tot_cost += cost
        tot_val += val
        tot_valp += valp
        port_rows.append(dict(sym=sym, qty=q, cost_nav=von, price=px, in_db=True,
                              day_pct=round((px / pv - 1) * 100, 2), vs_cost_pct=round((px / von - 1) * 100, 1) if von else None,
                              pnl=round(val - cost), tech=tech + (f" · RSI {rsi:.0f}" if rsi else ""),
                              weight=cost, foreign=round(fmap.get(sym, 0.0), 1) if sym in fmap else None))
    for r in port_rows:
        r["weight_pct"] = round(r["weight"] / tot_cost * 100) if tot_cost else 0
    port_rows.sort(key=lambda x: -x["weight"])

    conn.close()
    return dict(
        session=S, prev=P, weekday=_WD[sess.weekday()], today=date.today().isoformat(),
        vnindex=dict(close=vni_close, ret=vni_ret, ma20=vni_ma20, ma50=vni_ma50),
        hnx=dict(close=hnx_close, ret=hnx_ret),
        exchanges=ex, foreign_flow=ff, internals=internals, psychology=psych,
        movers_up=movers[:6], movers_down=movers[-6:][::-1],
        top_foreign_buy=top_buy, top_foreign_sell=top_sell,
        strong=strong, reward_risk=rr,
        portfolio=dict(rows=port_rows, total_cost=round(tot_cost), total_value=round(tot_val),
                       pnl=round(tot_val - tot_cost), pnl_pct=round((tot_val / tot_cost - 1) * 100, 1) if tot_cost else None,
                       day_change=round(tot_val - tot_valp), day_pct=round((tot_val / tot_valp - 1) * 100, 2) if tot_valp else None),
    )


# ── nhận định cơ học (fallback khi không có narr.json) ──────────────────
def mechanical_narrative(d: dict) -> dict:
    v, it, ps = d["vnindex"], d["internals"], d["psychology"]
    hs = d["exchanges"].get("HOSE", {}).get(d["session"], {})
    hp = d["exchanges"].get("HOSE", {}).get(d["prev"], {})
    ff = d["foreign_flow"]
    dm = f"{d['session'][8:10]}/{d['session'][5:7]}"

    move = "tăng" if v["ret"] > 0.3 else "giảm" if v["ret"] < -0.3 else "gần như đi ngang"
    gt = ""
    if hs.get("gtgd") and hp.get("gtgd"):
        pc = hs["gtgd"] / hp["gtgd"] - 1
        w = "nhích lên" if pc > 0.05 else "giảm còn" if pc < -0.05 else "ở"
        gt = f", thanh khoản HOSE {w} {_fmt(hs['gtgd'])} tỷ"
    m_up = ", ".join(f"{s} {_sign(c, 1)}" for s, _, c in d["movers_up"][:4])
    m_dn = ", ".join(f"{s} {_sign(c, 1)}" for s, _, c in d["movers_down"][:3])
    p1 = (f'<p class="lead">Phiên {dm} <b>{move}</b> ({_sign(v["ret"])}){gt}. '
          f"Dẫn dắt: <b>{m_up}</b>; kéo lùi: <b>{m_dn}</b>.</p>")

    breadth = "yếu" if (it.get("pct_ma50") or 50) < 45 or (it.get("adv_dec") or 1) < 0.9 else "tương đối cân bằng"
    p2 = (f"<p><b>Độ rộng {breadth}.</b> HOSE {hs.get('up','?')} mã tăng / {hs.get('dn','?')} mã giảm "
          f"(adv/dec {_vn(it.get('adv_dec') or 0, 2)}), {it.get('pct_ma50') or 0:.0f}% cổ phiếu trên MA50, "
          f"chênh đỉnh–đáy 52 tuần {_sign(it.get('nh_nl') or 0, 0, '')}.</p>")

    net = ff[0][1] if ff else 0
    trend = "bán ròng" if net < 0 else "mua ròng"
    seq = " → ".join(_sign(x, 0, "") for _, x in ff[:4][::-1])
    tb = ", ".join(f"{c} ({_sign(x, 0, '')})" for c, x in d["top_foreign_buy"][:3])
    ts = ", ".join(f"{c} ({_sign(x, 0, '')})" for c, x in d["top_foreign_sell"][:3])
    p3 = (f"<p><b>Khối ngoại {trend} {_fmt(abs(net))} tỷ</b> (chuỗi gần đây: {seq}). "
          f"Mua: {tb}. Bán: {ts}.</p>")

    rvol = it.get("rvol") or 0
    p4 = (f"<p><b>Gauge tâm lý {ps.get('gauge','?')} — "
          f"{({'EXTREME_FEAR':'Sợ hãi cực độ','FEAR':'Sợ hãi','NEUTRAL':'Trung tính','GREED':'Tham lam','EXTREME_GREED':'Tham lam cực độ'}).get(ps.get('label'), ps.get('label','?'))}</b> "
          f"(z {_sign(ps.get('z') or 0, 2, '')}). Biến động thực 20 phiên {_vn(rvol, 1)}"
          + (" — chưa chạm ngưỡng 22 vốn là tín hiệu mua tốt trong quá khứ." if rvol < 22 else " — vùng biến động cao.")
          + "</p>")

    lo, hi = round(v["close"] * 0.994), round(v["close"] * 1.007)
    p5 = (f"<p><b>Kịch bản phiên tới:</b> giằng co quanh <b>{_vn(lo)}–{_vn(hi)}</b>. "
          f"Mốc theo dõi: MA20/MA50 của VN-Index quanh <b>{_vn(min(v['ma20'] or 0, v['ma50'] or 0))}"
          f"–{_vn(max(v['ma20'] or 0, v['ma50'] or 0))}</b> — thủng vùng này kèm khối lượng sẽ tắt "
          "bộ lọc thị trường của các chiến lược.</p>")

    pf = d["portfolio"]
    held = [r for r in pf["rows"] if r.get("in_db") and r["weight_pct"] >= 1]
    pp = []
    if pf.get("day_pct") is not None:
        cmp = ("cùng thị trường" if abs(pf["day_pct"] - v["ret"]) < 0.4
               else "mạnh hơn" if pf["day_pct"] > v["ret"] else "yếu hơn")
        pp.append(f"<p><b>Tác động phiên {dm}:</b> danh mục {_sign(pf['day_pct'])} "
                  f"({_sign(pf['day_change'] / 1e6, 2, ' tr')}) — {cmp} (VN-Index {_sign(v['ret'])}).</p>")
    if held:
        best = max(held, key=lambda r: r["day_pct"])
        worst = min(held, key=lambda r: r["day_pct"])
        fx = [r for r in held if r.get("foreign") is not None and abs(r["foreign"]) >= 3]
        s = (f"<p><b>{best['sym']}</b> ({best['weight_pct']}% DM) khỏe nhất phiên "
             f"({_sign(best['day_pct'])}, {best['tech']}); <b>{worst['sym']}</b> yếu nhất "
             f"({_sign(worst['day_pct'])}, {worst['tech']}).")
        if fx:
            s += " Khối ngoại: " + ", ".join(f"{r['sym']} {_sign(r['foreign'], 1, ' tỷ')}" for r in fx) + "."
        pp.append(s + "</p>")
    if pf.get("pnl_pct") is not None:
        pp.append(f"<p><b>Tổng:</b> vốn {_fmt(pf['total_cost'] / 1e6)} tr → giá trị "
                  f"{_fmt(pf['total_value'] / 1e6)} tr, lãi/lỗ tạm tính "
                  f"{_sign(pf['pnl'] / 1e6, 0, ' tr')} ({_sign(pf['pnl_pct'], 1)}).</p>")

    return dict(market=[p1, p2, p3, p4, p5], portfolio=pp)


# ── render HTML ────────────────────────────────────────────────────────
def _css() -> str:
    p = os.path.join(os.path.dirname(__file__), "..", ".claude", "skills", "ban-tin-sang", "style.css")
    if os.path.exists(p):
        return open(p, encoding="utf-8").read()
    return ""  # style.css bắt buộc — xem skill dir


def _vn(n, dec=0):
    """Số kiểu Việt Nam: 1.234,56"""
    if n is None:
        return "—"
    s = f"{n:,.{dec}f}"                       # 1,234.56
    return s.replace(",", " ").replace(".", ",").replace(" ", ".")


def _fmt(n, suffix=""):
    return _vn(n, 0) + suffix if n is not None else "—"


def _cls(x):
    return "up" if (x or 0) > 0 else "down" if (x or 0) < 0 else ""


def _sign(x, d=2, suf="%"):
    return (f"+{_vn(x, d)}" if x >= 0 else f"−{_vn(abs(x), d)}") + suf if x is not None else "—"


def render(d: dict, narrative: dict) -> str:
    S = d["session"]
    dd, mm = S[8:10], S[5:7]
    hose_s = d["exchanges"].get("HOSE", {}).get(S, {})
    hose_p = d["exchanges"].get("HOSE", {}).get(d["prev"], {})
    hnx_s = d["exchanges"].get("HNX", {}).get(S, {})
    v, it, ps = d["vnindex"], d["internals"], d["psychology"]
    ff_today = d["foreign_flow"][0][1] if d["foreign_flow"] else None

    def gtgd_chg(cur, prv):
        if cur and prv:
            return f' <span class="{_cls(cur-prv)}">{_sign((cur/prv-1)*100, 1)}</span>'
        return ""

    rows_html = "".join(
        f'<tr><td>{z["sym"]} <span class="co">{z["name"][:22]}</span></td><td>{_fmt(z["price"])}</td>'
        f'<td class="up">+{_vn(z["r5"],1)}%</td><td>{z["rsi"]}</td><td>{_fmt(z["turn"])}</td></tr>'
        for z in d["strong"]
    )
    rr_html = "".join(
        f'<tr><td>{z["sym"]} <span class="co">{z["name"][:20]}</span></td>'
        f'<td>{_vn(z["buy_lo"]/1000,1)}–{_vn(z["price"]/1000,1)}k</td><td>{_vn(z["target"]/1000)}k</td>'
        f'<td>{_vn(z["stop"]/1000,1)}k</td><td>{_vn(z["rr"],1)}</td><td class="co">{z["factors"]}</td></tr>'
        for z in d["reward_risk"]
    )
    buy_html = "".join(f'<tr><td>{c}</td><td class="up">+{_vn(v,1)}</td></tr>' for c, v in d["top_foreign_buy"])
    sell_html = "".join(f'<tr><td>{c}</td><td class="down">−{_vn(abs(v),1)}</td></tr>' for c, v in d["top_foreign_sell"])

    pf = d["portfolio"]
    prow_html = ""
    cost_note = []
    dust = [r["sym"] for r in pf["rows"] if r.get("in_db") and r["weight_pct"] < 1]
    for r in pf["rows"]:
        if r["sym"] in dust:
            continue
        cost_note.append(f'{r["sym"]} {_fmt(r["cost_nav"])}')
        if not r.get("in_db"):
            prow_html += (f'<tr><td>{r["sym"]} <span class="co">ngoài DB giá</span></td>'
                          f'<td>{r["weight_pct"]}%</td><td>—</td><td class="down">~lỗ</td>'
                          f'<td>—</td><td>—</td><td>—</td></tr>')
            continue
        f = r.get("foreign")
        fcell = ("~0" if f is None or abs(f) < 0.5
                 else f'<span class="{_cls(f)}">{_sign(f, 1, " tỷ")}</span>')
        prow_html += (f'<tr><td>{r["sym"]}</td><td>{r["weight_pct"]}%</td><td>{_fmt(r["price"])}</td>'
                      f'<td class="down">{_sign(r["pnl"]/1e6,1,"tr")} · {_sign(r["vs_cost_pct"],0)}</td>'
                      f'<td class="{_cls(r["day_pct"])}">{_sign(r["day_pct"])}</td>'
                      f'<td>{r["tech"]}</td><td>{fcell}</td></tr>')

    mkt_paras = "\n      ".join(narrative.get("market", []))
    pf_paras = "\n      ".join(narrative.get("portfolio", []))
    pf_section = ""
    if pf_paras or pf["rows"]:
        pf_section = f"""
  <section id="danh-muc">
    <h2>Danh mục của bạn</h2>
    <p class="sub">{len(pf['rows'])} mã · nguồn finance_ck_holdings · giá chốt {dd}/{mm}</p>
    <div class="pstats">
      <div class="pstat"><span class="pk">Vốn đã bỏ ra</span><span class="pv">{_vn(pf['total_cost']/1e6,1)} tr</span></div>
      <div class="pstat"><span class="pk">Giá trị {dd}/{mm}</span><span class="pv">{_vn(pf['total_value']/1e6,1)} tr</span></div>
      <div class="pstat"><span class="pk">Lãi/lỗ tạm tính</span><span class="pv {_cls(pf['pnl'])}">{_sign(pf['pnl']/1e6,1,' tr')} · {_sign(pf['pnl_pct'],1)}</span></div>
      <div class="pstat"><span class="pk">Thay đổi phiên {dd}/{mm}</span><span class="pv {_cls(pf['day_change'])}">{_sign(pf['day_change']/1e6,2,' tr')} · {_sign(pf['day_pct'])}</span><span class="pn">VN-Index {_sign(v['ret'])}</span></div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Mã</th><th>% DM</th><th>Giá {dd}/{mm}</th><th>Lãi/lỗ vs vốn</th><th>Phiên</th><th>Kỹ thuật</th><th>KN {dd}/{mm}</th></tr></thead>
      <tbody>{prow_html}</tbody>
    </table></div>
    <p class="sub" style="margin-top:8px">Giá vốn: {' · '.join(cost_note)}.{(' ' + ', '.join(dust) + ' là phần lẻ, bỏ qua.') if dust else ''}</p>
    <div class="prose" style="margin-top:14px">
      {pf_paras}
    </div>
    <div class="callout">Mô tả trạng thái kỹ thuật &amp; dòng tiền của các mã đang nắm giữ — <b>không phải khuyến nghị mua/bán/giữ</b>.</div>
  </section>"""

    html = f"""<title>Bản Tin Sáng {dd}/{mm}</title>
<meta name="description" content="Bản tin thị trường sáng {d['today']} — số liệu chốt phiên {dd}/{mm}, dựng từ dữ liệu hệ thống.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
{_css()}
</style>

<div class="wrap">
  <header class="masthead">
    <div class="kicker">Nghiên cứu nội bộ · Thị trường Việt Nam</div>
    <h1>Bản Tin Sáng</h1>
    <div class="dateline">
      <span>{d['weekday']}, {d['today'][8:10]}/{d['today'][5:7]}/{d['today'][:4]}</span><span class="sep">/</span>
      <span>Số liệu chốt phiên {dd}/{mm}</span><span class="sep">/</span>
      <span>Dựng từ dữ liệu hệ thống</span>
    </div>
    <p class="disclaimer-top">Tổng hợp &amp; phân tích cơ học phục vụ nghiên cứu. Không phải khuyến nghị đầu tư; người viết không phải chuyên viên tư vấn tài chính có chứng chỉ.</p>
  </header>

  <section id="snapshot">
    <h2>Thông tin thị trường</h2>
    <p class="sub">So với phiên {d['prev'][8:10]}/{d['prev'][5:7]}</p>
    <div class="snap">
      <div class="col">
        <h3>HOSE</h3>
        <div class="row"><span class="k">VN-Index</span><span class="v"><span class="big">{_vn(v['close'],2)}</span> <span class="{_cls(v['ret'])}">{_sign(v['ret'])}</span></span></div>
        <div class="row"><span class="k">GTGD khớp lệnh</span><span class="v">{_fmt(hose_s.get('gtgd'))} tỷ{gtgd_chg(hose_s.get('gtgd'), hose_p.get('gtgd'))}</span></div>
        <div class="row"><span class="k">Độ rộng (tăng / giảm)</span><span class="v"><span class="up">{hose_s.get('up','?')}</span> / <span class="down">{hose_s.get('dn','?')}</span></span></div>
        <div class="row"><span class="k">% cổ phiếu trên MA50</span><span class="v">{it.get('pct_ma50',0):.0f}%</span></div>
        <div class="row"><span class="k">NN mua / bán ròng</span><span class="v {_cls(ff_today)}">{_sign(ff_today,0,' tỷ') if ff_today is not None else '—'}</span></div>
      </div>
      <div class="col">
        <h3>HNX</h3>
        <div class="row"><span class="k">HNX-Index</span><span class="v"><span class="big">{_vn(d['hnx']['close'],2)}</span> <span class="{_cls(d['hnx']['ret'])}">{_sign(d['hnx']['ret']) if d['hnx']['ret'] is not None else ''}</span></span></div>
        <div class="row"><span class="k">GTGD khớp lệnh</span><span class="v">{_fmt(hnx_s.get('gtgd'))} tỷ</span></div>
        <div class="row"><span class="k">Độ rộng (tăng / giảm)</span><span class="v"><span class="up">{hnx_s.get('up','?')}</span> / <span class="down">{hnx_s.get('dn','?')}</span></span></div>
        <div class="row"><span class="k">Tâm lý (gauge 0–100)</span><span class="v">{ps.get('gauge','—')} · {({'EXTREME_FEAR':'Sợ hãi cực độ','FEAR':'Sợ hãi','NEUTRAL':'Trung tính','GREED':'Tham lam','EXTREME_GREED':'Tham lam cực độ'}).get(ps.get('label'),'—')}</span></div>
        <div class="row"><span class="k">Biến động thực 20p</span><span class="v">{_vn(it.get('rvol') or 0, 1)}</span></div>
      </div>
    </div>
    <div class="callout"><b>Chưa có trong hệ thống:</b> tự doanh mua/bán ròng · tỷ giá USD/VND · giá vàng · lãi suất tiết kiệm.</div>
  </section>

  <section id="nhan-dinh">
    <h2>Nhận định thị trường</h2>
    <p class="sub">Từ độ rộng · dòng tiền · gauge tâm lý (đã backtest)</p>
    <div class="prose">
      {mkt_paras}
    </div>
  </section>
{pf_section}
  <section id="dong-tien">
    <h2>Dòng tiền khối ngoại</h2>
    <p class="sub">Giá trị ròng theo mã · phiên {dd}/{mm} · đơn vị tỷ VND</p>
    <div class="flow-grid">
      <div><h3>Mua ròng nhiều nhất</h3><div class="tbl-wrap"><table>
        <thead><tr><th>Mã</th><th>GT ròng (tỷ)</th></tr></thead><tbody>{buy_html}</tbody></table></div></div>
      <div><h3>Bán ròng nhiều nhất</h3><div class="tbl-wrap"><table>
        <thead><tr><th>Mã</th><th>GT ròng (tỷ)</th></tr></thead><tbody>{sell_html}</tbody></table></div></div>
    </div>
  </section>

  <section id="manh">
    <h2>Cổ phiếu mạnh 5 phiên</h2>
    <p class="sub">% tăng 5 phiên · GTGD ≥ 30 tỷ/phiên · RSI &lt; 78</p>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Mã</th><th>Giá</th><th>+5 phiên</th><th>RSI</th><th>GTGD tỷ</th></tr></thead>
      <tbody>{rows_html}</tbody>
    </table></div>
  </section>

  <section id="sang-loc">
    <h2>Sàng lọc reward / risk</h2>
    <p class="sub">Cơ học · R/R ≥ 2,5 · trên/sát MA50 · RSI &lt; 72 · cơ bản không quá rủi ro</p>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Mã</th><th>Vùng mua</th><th>Chốt lời</th><th>Dừng lỗ</th><th>R/R</th><th>Yếu tố</th></tr></thead>
      <tbody>{rr_html}</tbody>
    </table></div>
    <div class="callout"><b>Đầu ra bộ lọc cơ học</b>, không phải khuyến nghị mua. Vùng mua = đáy 20 phiên → giá hiện tại; chốt lời = đỉnh 120 phiên; dừng lỗ = đáy 20 phiên × 0,97. "Yếu tố" là chỉ số thô, không phải luận điểm catalyst.</div>
  </section>

  <footer>
    <p><b>Nguồn:</b> giá &amp; khối lượng — VNDirect Finfo · khối ngoại — VNDirect v4/foreigns · VN-Index/HNX-Index — VNDirect dchart · gauge tâm lý — mô hình nội bộ.</p>
    <p><b>Chưa tích hợp:</b> tin vĩ mô/ngành · tự doanh · USD · vàng · lãi suất.</p>
    <p style="margin-top:8px">Tạo bởi <span style="font-family:'IBM Plex Mono',monospace">scripts/ban_tin_sang.py</span> · repo <span style="font-family:'IBM Plex Mono',monospace">personal/stock</span>.</p>
  </footer>
</div>
"""
    return html


def main() -> None:
    args = [a for a in sys.argv[1:]]
    as_of = next((a for a in args if a[:2].isdigit() and "-" in a), None)
    narr_path = None
    if "--narrative" in args:
        narr_path = args[args.index("--narrative") + 1]

    d = gather(as_of)

    if "--data" in args:
        print(json.dumps(d, ensure_ascii=False, indent=2, default=str))
        return

    narrative = json.load(open(narr_path, encoding="utf-8")) if narr_path else mechanical_narrative(d)
    html = render(d, narrative)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"ban-tin-sang-{d['session']}.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✅ {os.path.relpath(out)}  (phiên {d['session']}, {'nhận định cơ học' if not narr_path else 'nhận định tùy chỉnh'})")


if __name__ == "__main__":
    main()
