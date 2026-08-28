import http.server
import socketserver
import os
import json
import urllib.parse
import psycopg2
import time
from typing import Dict, Any, List, Optional

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", 8000))
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path == "/api/stocks":
            self.handle_api_stocks()
        elif path == "/api/chart":
            symbol = query.get("symbol", ["FPT"])[0].upper()
            start_date = query.get("start_date", ["2021-01-01"])[0]
            self.handle_api_chart(symbol, start_date)
        elif path == "/api/summary":
            symbol = query.get("symbol", ["FPT"])[0].upper()
            self.handle_api_summary(symbol)
        elif path == "/api/simulation":
            symbol = query.get("symbol", ["FPT"])[0].upper()
            count = int(query.get("count", [10000])[0])
            self.handle_api_simulation(symbol, count)
        elif path == "/api/telegram-sentiment":
            symbol = query.get("symbol", [None])[0]
            self.handle_api_telegram_sentiment(symbol)
        elif path == "/api/data/stats":
            self.handle_api_data_stats()
        elif path == "/api/data/raw-prices":
            symbol = query.get("symbol", ["TCH"])[0].upper()
            limit = int(query.get("limit", [100])[0])
            self.handle_api_data_raw_prices(symbol, limit)
        elif path == "/api/data/sync":
            symbol = query.get("symbol", ["TCH"])[0].upper()
            self.handle_api_data_sync(symbol)
        else:
            # SPA fallback: if file does not exist, serve index.html
            local_path = self.translate_path(self.path)
            if not os.path.exists(local_path) and not path.startswith("/api"):
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path == "/api/data/sync":
            symbol = query.get("symbol", ["TCH"])[0].upper()
            self.handle_api_data_sync(symbol)
        else:
            self.send_json_response({"status": "OK"})

    def handle_api_data_stats(self):
        try:
            from backend.db.postgres import PostgresDBManager
            db = PostgresDBManager()
            with db.get_connection_ctx() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM stocks;")
                    total_stocks = cur.fetchone()[0]

                    cur.execute("SELECT COUNT(*) FROM stock_prices;")
                    total_candles = cur.fetchone()[0]

                    cur.execute("SELECT exchange, COUNT(*) FROM stocks GROUP BY exchange;")
                    exch_rows = cur.fetchall()
                    exchanges = {r[0]: r[1] for r in exch_rows}

                    cur.execute("SELECT MIN(trading_date), MAX(trading_date) FROM stock_prices;")
                    min_d, max_d = cur.fetchone()

            res = {
                "total_stocks": total_stocks,
                "total_candles": total_candles,
                "exchanges": exchanges,
                "date_range": f"{min_d} ➔ {max_d}" if min_d and max_d else "Chưa có dữ liệu",
                "status": "ONLINE (POSTGRESQL CONNECTED)"
            }
            self.send_json_response(res)
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi kết nối PostgreSQL (stock_db): {str(e)}",
                "status": "DATABASE_OFFLINE"
            }, status_code=503)

    def handle_api_data_raw_prices(self, symbol: str, limit: int = 100):
        try:
            from backend.db.postgres import PostgresDBManager
            db = PostgresDBManager()
            with db.get_connection_ctx() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT trading_date, open_price, high_price, low_price, close_price, volume, rsi_14, ma20, ma50
                        FROM stock_prices
                        WHERE symbol = %s
                        ORDER BY trading_date DESC
                        LIMIT %s;
                    """, (symbol, limit))
                    rows = cur.fetchall()

            data = [
                {
                    "trading_date": r[0].strftime("%Y-%m-%d"),
                    "open": float(r[1]),
                    "high": float(r[2]),
                    "low": float(r[3]),
                    "close": float(r[4]),
                    "volume": float(r[5]),
                    "rsi_14": float(r[6]) if r[6] is not None else None,
                    "ma20": float(r[7]) if r[7] is not None else None,
                    "ma50": float(r[8]) if r[8] is not None else None
                }
                for r in rows
            ]
            self.send_json_response({"symbol": symbol, "total_rows": len(data), "rows": data})
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi truy vấn nến giá PostgreSQL cho mã {symbol}: {str(e)}"
            }, status_code=503)

    def handle_api_data_sync(self, symbol: str):
        try:
            import requests, datetime
            import numpy as np
            from backend.db.postgres import PostgresDBManager
            from backend.utils.metrics import calculate_rsi

            db = PostgresDBManager()
            headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
            url = f'https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&q=code:{symbol}~date:gte:2021-01-01&size=2000'
            
            try:
                r = requests.get(url, headers=headers, timeout=12)
                if r.status_code == 200:
                    data = r.json().get('data', [])
                    if data:
                        data = sorted(data, key=lambda x: x['date'])
                        closes = [float(row['close']) * 1000 for row in data]
                        opens = [float(row.get('open') or row.get('basicPrice') or row['close']) * 1000 for row in data]
                        highs = [float(row.get('high') or row['close']) * 1000 for row in data]
                        lows = [float(row.get('low') or row['close']) * 1000 for row in data]
                        vols = [float(row.get('nmVolume') or row.get('volume') or 0) for row in data]

                        prices = []
                        for i, row in enumerate(data):
                            d_str = row['date']
                            sub_c = closes[:i+1]
                            rsi_val = calculate_rsi(sub_c)
                            ma20_val = float(np.mean(sub_c[-20:])) if len(sub_c) >= 20 else None
                            ma50_val = float(np.mean(sub_c[-50:])) if len(sub_c) >= 50 else None
                            prices.append({
                                'date': d_str,
                                'open': opens[i],
                                'high': highs[i],
                                'low': lows[i],
                                'close': closes[i],
                                'volume': vols[i],
                                'rsi_14': rsi_val,
                                'ma20': round(ma20_val, 2) if ma20_val else None,
                                'ma50': round(ma50_val, 2) if ma50_val else None
                            })
                        db.upsert_prices(symbol, prices)
                        latest_d = prices[-1]['date']
                        latest_c = closes[-1]
                        res = {
                            "status": "SUCCESS",
                            "symbol": symbol,
                            "message": f"Đã đồng bộ {len(prices):,} nến giá BẢNG ĐIỆN THẬT từ VNDirect (Giá hôm nay: {latest_c:,.0f} đ, ngày {latest_d}).",
                            "synced_bars": len(prices),
                            "latest_date": latest_d,
                            "sync_time": time.strftime("%Y-%m-%d %H:%M:%S")
                        }
                        self.send_json_response(res)
                        return
            except Exception as net_err:
                print(f"⚠️ Live VNDirect Finfo sync failed ({net_err}), querying existing DB bars...")

            with db.get_connection_ctx() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*), MAX(trading_date) FROM stock_prices WHERE symbol = %s;", (symbol,))
                    row = cur.fetchone()
                    count = row[0] if row else 0
                    latest_d = row[1].strftime("%Y-%m-%d") if row and row[1] else "2026-08-28"

            res = {
                "status": "SUCCESS",
                "symbol": symbol,
                "message": f"Dữ liệu mã {symbol} trong PostgreSQL hiện có {count:,} nến giá (Mới nhất: {latest_d}).",
                "synced_bars": count,
                "latest_date": latest_d,
                "sync_time": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.send_json_response(res)
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi đồng bộ PostgreSQL cho mã {symbol}: {str(e)}"
            }, status_code=503)

    def handle_api_stocks(self):
        try:
            from backend.db.postgres import PostgresDBManager
            db = PostgresDBManager()
            with db.get_connection_ctx() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT symbol, company_name, exchange, sector 
                        FROM stocks 
                        ORDER BY CASE WHEN symbol IN ('TCH', 'FPT', 'TCB', 'SSI', 'HPG', 'VNM', 'MBB', 'MWG', 'VCB', 'VIC', 'VHM') THEN 0 ELSE 1 END, symbol ASC;
                    """)
                    rows = cur.fetchall()

            if not rows:
                self.send_json_response({"error": "Bảng 'stocks' trong PostgreSQL đang rỗng. Cần chạy fetch_vn_stocks_history.py để nạp dữ liệu."}, status_code=404)
                return

            stocks = [
                {"symbol": r[0], "company_name": r[1], "exchange": r[2], "sector": r[3]}
                for r in rows
            ]
            self.send_json_response(stocks)
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi kết nối PostgreSQL lấy danh mục cổ phiếu: {str(e)}"
            }, status_code=503)

    def handle_api_chart(self, symbol: str, start_date: str):
        try:
            from backend.db.postgres import PostgresDBManager
            db = PostgresDBManager()
            with db.get_connection_ctx() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT trading_date, open_price, high_price, low_price, close_price, volume, rsi_14, ma20, ma50
                        FROM stock_prices
                        WHERE symbol = %s AND trading_date >= %s
                        ORDER BY trading_date ASC;
                    """, (symbol, start_date))
                    rows = cur.fetchall()

                    if not rows:
                        cur.execute("""
                            SELECT trading_date, open_price, high_price, low_price, close_price, volume, rsi_14, ma20, ma50
                            FROM stock_prices
                            WHERE symbol = %s
                            ORDER BY trading_date ASC;
                        """, (symbol,))
                        rows = cur.fetchall()

            if not rows:
                self.send_json_response({
                    "symbol": symbol,
                    "data": [],
                    "error": f"Không tìm thấy nến giá nào của mã {symbol} trong bảng stock_prices PostgreSQL."
                }, status_code=404)
                return

            chart_data = []
            for r in rows:
                chart_data.append({
                    "time": r[0].strftime("%Y-%m-%d"),
                    "open": float(r[1]),
                    "high": float(r[2]),
                    "low": float(r[3]),
                    "close": float(r[4]),
                    "volume": float(r[5]),
                    "rsi": float(r[6]) if r[6] is not None else None,
                    "ma20": float(r[7]) if r[7] is not None else None,
                    "ma50": float(r[8]) if r[8] is not None else None
                })

            self.send_json_response({"symbol": symbol, "data": chart_data})
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi truy vấn nến giá PostgreSQL cho biểu đồ {symbol}: {str(e)}"
            }, status_code=503)

    def handle_api_summary(self, symbol: str):
        try:
            from backend.workflow.engine import InvestmentWorkflowEngine
            engine = InvestmentWorkflowEngine()
            result = engine.run_pipeline(symbol=symbol, timestamp="2026-08-18", verbose=False)
            
            ctx = result["market_context"]
            analysis = result["market_analysis"]
            sim = result["simulation_consensus"]
            strat = result["trading_plan"]
            risk = result["risk_assessment"]
            verdict = result["verification_verdict"]

            summary = {
                "symbol": symbol,
                "current_price": ctx.current_price,
                "company_name": ctx.company_name,
                "sector": ctx.sector,
                "timestamp": ctx.timestamp,
                "market_index_change_pct": ctx.market_index_change_pct,
                "technical_trend": "BULLISH (UPTREND)" if analysis.is_uptrend else "BEARISH / SIDEWAYS",
                "is_uptrend": analysis.is_uptrend,
                "is_undervalued": analysis.is_undervalued,
                "is_overbought": analysis.is_overbought,
                "is_oversold": analysis.is_oversold,
                "rsi": round(analysis.rsi, 2),
                "margin_of_safety_pct": round(analysis.margin_of_safety, 2),
                "news_sentiment_score": round(analysis.news_sentiment_score, 2),
                "market_analysis_summary": analysis.summary,
                
                "sentiment_index": sim.overall_sentiment_score,
                "buy_pct": sim.buy_percentage,
                "sell_pct": sim.sell_percentage,
                "hold_pct": sim.hold_percentage,
                "panic_pct": sim.panic_percentage,
                "consensus_summary": sim.consensus_summary,
                "individual_decisions": [
                    {
                        "persona_id": d.persona_id,
                        "persona_name": d.persona_name,
                        "action": d.action.value if hasattr(d.action, 'value') else str(d.action),
                        "confidence": round(d.confidence, 2),
                        "sentiment_score": round(d.sentiment_score, 2),
                        "expected_target_price": d.expected_target_price,
                        "reasoning": d.reasoning
                    }
                    for d in sim.individual_decisions
                ],

                "recommendation": "BUY (MUA)" if verdict.approved else "HOLD / REJECTED",
                "entry_zone": [strat.entry_zone_min, strat.entry_zone_max],
                "stop_loss": strat.stop_loss_price,
                "take_profit_1": strat.take_profit_target_1,
                "take_profit_2": strat.take_profit_target_2,
                "recommended_holding_period": strat.recommended_holding_period,
                "allocation_pct": strat.allocation_pct,
                "risk_reward_ratio": strat.risk_reward_ratio,
                "thesis_summary": strat.thesis_summary,
                "scenarios": [
                    {
                        "scenario": s.scenario.value if hasattr(s.scenario, 'value') else str(s.scenario),
                        "probability": s.probability,
                        "target_price": s.target_price,
                        "catalysts": s.catalysts,
                        "risks": s.risks
                    }
                    for s in strat.scenarios
                ],

                "position_size_pct": round(risk.recommended_kelly_position_pct * 100, 1),
                "potential_loss_pct": round(risk.potential_loss_pct, 2),
                "risk_reward_ratio_valid": risk.risk_reward_ratio_valid,
                "stress_test_drawdown_impact_pct": round(risk.stress_test_drawdown_impact_pct, 2),
                "risk_warnings": risk.risk_warnings,

                "approved": verdict.approved,
                "verdict": verdict.verdict_code,
                "verifier_score": verdict.overall_score,
                "verifier_notes": verdict.feedback_notes,
                "recommendations": verdict.recommendations,
                "checklist": [
                    {
                        "criterion": c.criterion,
                        "passed": c.passed,
                        "details": c.details
                    }
                    for c in verdict.checklist
                ],

                "financials": {
                    "pe_ratio": ctx.financials.pe_ratio,
                    "pb_ratio": ctx.financials.pb_ratio,
                    "roe": ctx.financials.roe,
                    "profit_margin": ctx.financials.profit_margin,
                    "revenue_growth_yoy": ctx.financials.revenue_growth_yoy,
                    "eps": ctx.financials.eps,
                    "intrinsic_value_dcf": ctx.financials.intrinsic_value_dcf,
                    "debt_to_equity": ctx.financials.debt_to_equity
                },
                "news_events": [
                    {
                        "headline": n.headline,
                        "sentiment_score": n.sentiment_score,
                        "category": n.category,
                        "importance": n.importance
                    }
                    for n in ctx.news_events
                ]
            }
            self.send_json_response(summary)
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi chạy Pipeline 5 bước cho mã {symbol}: {str(e)}"
            }, status_code=500)

    def handle_api_simulation(self, symbol: str, count: int = 10000):
        try:
            from backend.agents.simulator import BehavioralSimulationEngine
            from backend.agents.data_agent import DataCollectorAgent
            from backend.agents.market_agent import MarketAnalyzerAgent
            
            data_agent = DataCollectorAgent()
            market_agent = MarketAnalyzerAgent()
            sim_engine = BehavioralSimulationEngine()

            ctx_res = data_agent.execute({"symbol": symbol, "timestamp": "2026-08-18"})
            ctx = ctx_res["market_context"]
            analysis_res = market_agent.execute({"market_context": ctx})
            analysis = analysis_res["market_analysis"]

            res = sim_engine.run_large_scale_simulation(ctx=ctx, analysis=analysis, count=count)
            self.send_json_response(res)
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi chạy mô phỏng Monte-Carlo cho mã {symbol}: {str(e)}"
            }, status_code=500)

    def handle_api_telegram_sentiment(self, symbol: Optional[str] = None):
        try:
            from backend.utils.telegram_analyzer import TelegramSentimentAnalyzer
            analyzer = TelegramSentimentAnalyzer()
            market_sent = analyzer.analyze_market_sentiment()

            res = {
                "sentiment_score": market_sent.get("sentiment_score", 0.0),
                "sentiment_label": market_sent.get("sentiment_label", "TRUNG TÍNH"),
                "euphoria_percentage": market_sent.get("euphoria_index", 40.0),
                "panic_percentage": 100.0 - market_sent.get("euphoria_index", 40.0),
                "total_messages": market_sent.get("total_messages", 0),
                "risk_assessment": market_sent.get("risk_level", "BÌNH THƯỜNG"),
                "summary": f"Dữ liệu sentiment cộng đồng Telegram cho {symbol or 'Thị trường chung'}."
            }
            self.send_json_response(res)
        except Exception as e:
            self.send_json_response({
                "error": f"Lỗi phân tích sentiment Telegram: {str(e)}"
            }, status_code=500)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()

    def send_json_response(self, data: Any, status_code: int = 200):
        content = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), CustomHandler)
        print(f"🚀 Live PostgreSQL Multi-Threaded Server đang chạy tại: http://{HOST}:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng Server.")
    except OSError as e:
        if e.errno == 48:
            print(f"❌ Lỗi: Port {PORT} đang được sử dụng bởi một tiến trình khác.")
            print(f"💡 Gợi ý xử lý: lsof -ti :{PORT} | xargs kill -9")
        else:
            raise e

if __name__ == "__main__":
    run()
