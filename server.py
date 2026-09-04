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

_SHARED_TELEGRAM_ANALYZER = None
STRATEGY_DB = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

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
        elif path == "/api/nav-history":
            product_id = int(query.get("productId", [48])[0])
            self.handle_nav_history(product_id)
        elif path == "/api/data/raw-prices":
            symbol = query.get("symbol", ["TCH"])[0].upper()
            limit = int(query.get("limit", [100])[0])
            self.handle_api_data_raw_prices(symbol, limit)
        elif path == "/api/data/sync":
            symbol = query.get("symbol", ["TCH"])[0].upper()
            self.handle_api_data_sync(symbol)
        elif path == "/api/data/full-resync":
            symbol = query.get("symbol", ["TCH"])[0].upper()
            self.handle_api_full_resync(symbol)
        elif path == "/api/observation/status":
            self.handle_observation_status()
        elif path == "/api/observation/videos":
            self.handle_observation_videos()
        elif path == "/api/observation/stats":
            self.handle_observation_stats()
        elif path == "/api/observation/daily-metrics":
            self.handle_observation_daily_metrics()
        elif path == "/api/observation/ticker-mentions":
            self.handle_observation_ticker_mentions()
        elif path == "/api/observation/divergence":
            self.handle_observation_divergence()
        elif path == "/api/observation/backtest":
            self.handle_observation_backtest()
        elif path == "/api/observation/psychology":
            self.handle_observation_psychology()
        elif path == "/api/ticker-signals":
            symbol = query.get("symbol", ["HPG"])[0].upper()
            self.handle_api_ticker_signals(symbol)
        elif path == "/api/observation/comments":
            ticker = query.get("ticker", [None])[0]
            limit = int(query.get("limit", [50])[0])
            self.handle_observation_comments(ticker, limit)
        elif path == "/api/strategy/list":
            self.handle_strategy_list()
        elif path == "/api/strategy/rank":
            strategy = query.get("strategy", ["momentum"])[0]
            asof = query.get("asof", [None])[0]
            topn = int(query.get("topn", [15])[0])
            self.handle_strategy_rank(strategy, asof, topn)
        elif path == "/api/strategy/backtest-status":
            strategy = query.get("strategy", ["momentum"])[0]
            self.handle_strategy_backtest_status(strategy)
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
        elif path == "/api/observation/collect":
            self.handle_observation_collect()
        elif path == "/api/observation/seed-sample":
            self.handle_observation_seed_sample()
        elif path == "/api/strategy/backtest":
            strategy = query.get("strategy", ["momentum"])[0]
            self.handle_strategy_backtest_start(strategy)
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

                    cur.execute("SELECT COUNT(DISTINCT symbol) FROM stock_prices;")
                    symbols_with_prices = cur.fetchone()[0]

                    cur.execute("SELECT exchange, COUNT(*) FROM stocks GROUP BY exchange;")
                    exch_rows = cur.fetchall()
                    exchanges = {r[0]: r[1] for r in exch_rows}

                    cur.execute("SELECT MIN(trading_date), MAX(trading_date) FROM stock_prices;")
                    min_d, max_d = cur.fetchone()

            res = {
                "total_stocks": total_stocks,
                "symbols_with_prices": symbols_with_prices,
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
            from backend.db.postgres import PostgresDBManager
            from backend.utils.price_ingest import fetch_price_history

            db = PostgresDBManager()

            try:
                # Cùng một helper với script backfill -> lịch sử không bao giờ lệch nguồn.
                prices = fetch_price_history(symbol, adjusted=True)
                if prices:
                    db.upsert_prices(symbol, prices)
                    latest_d = prices[-1]['date']
                    latest_c = prices[-1]['close']
                    res = {
                        "status": "SUCCESS",
                        "symbol": symbol,
                        "message": f"Đã đồng bộ {len(prices):,} nến giá đã điều chỉnh từ VNDirect (Giá mới nhất: {latest_c:,.0f} đ, ngày {latest_d}).",
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

    def handle_strategy_list(self):
        """Danh sách chiến lược khả dụng (tab 'Test Chiến Lược') + kết quả backtest gần nhất."""
        try:
            from backend.utils.strategy_rank import STRATEGIES, DDL
            conn = psycopg2.connect(**STRATEGY_DB)
            with conn.cursor() as cur:
                cur.execute(DDL)
                conn.commit()
                out = []
                for code, meta in STRATEGIES.items():
                    cur.execute("""
                        SELECT id, status, started_at, finished_at, sample_start, sample_end, n_samples,
                               top20_ret5d, universe_ret5d, edge_5d, top20_ret10d, hit_rate_5d, error
                        FROM strategy_backtest_runs WHERE strategy=%s ORDER BY id DESC LIMIT 1
                    """, (code,))
                    row = cur.fetchone()
                    latest = None
                    if row:
                        (rid, status, started, finished, sstart, send, n, t5, u5, edge, t10, hit, err) = row
                        latest = {
                            "run_id": rid, "status": status,
                            "started_at": started.isoformat() if started else None,
                            "finished_at": finished.isoformat() if finished else None,
                            "sample_start": sstart.isoformat() if sstart else None,
                            "sample_end": send.isoformat() if send else None,
                            "n_samples": n, "top20_ret5d": t5, "universe_ret5d": u5,
                            "edge_5d": edge, "top20_ret10d": t10, "hit_rate_5d": hit, "error": err,
                        }
                    out.append({"code": code, "label": meta["label"], "desc": meta["desc"], "latest_backtest": latest})
            conn.close()
            self.send_json_response({"strategies": out})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_strategy_rank(self, strategy: str, asof: Optional[str], topn: int):
        try:
            from backend.utils.strategy_rank import rank
            conn = psycopg2.connect(**STRATEGY_DB)
            with conn.cursor() as cur:
                if not asof:
                    cur.execute("SELECT max(trading_date) FROM stock_prices WHERE symbol<>'VNINDEX'")
                    asof = cur.fetchone()[0].isoformat()
                res = rank(cur, strategy, asof, topn)
            conn.close()
            self.send_json_response(res)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_strategy_backtest_start(self, strategy: str):
        """Tạo 1 run 'running' rồi chạy backtest trong subprocess nền (mất ~1-2 phút)."""
        import subprocess
        import sys as _sys
        try:
            from backend.utils.strategy_rank import DDL, STRATEGIES
            if strategy not in STRATEGIES:
                self.send_json_response({"error": f"Không rõ chiến lược '{strategy}'"}, 400)
                return
            conn = psycopg2.connect(**STRATEGY_DB)
            with conn.cursor() as cur:
                cur.execute(DDL)
                cur.execute("INSERT INTO strategy_backtest_runs (strategy, status) VALUES (%s, 'running') RETURNING id",
                            (strategy,))
                run_id = cur.fetchone()[0]
            conn.commit()
            conn.close()

            script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "rank_momentum.py")
            args = [_sys.executable, script, "--backtest", "--strategy", strategy, "--save-run", str(run_id)]
            subprocess.Popen(args, env={**os.environ})
            self.send_json_response({"status": "started", "run_id": run_id,
                                      "message": "Backtest đang chạy nền (~1-2 phút). Poll /api/strategy/backtest-status."})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_strategy_backtest_status(self, strategy: str):
        try:
            from backend.utils.strategy_rank import DDL
            conn = psycopg2.connect(**STRATEGY_DB)
            with conn.cursor() as cur:
                cur.execute(DDL)
                conn.commit()
                cur.execute("""
                    SELECT id, status, started_at, finished_at, sample_start, sample_end, n_samples,
                           top20_ret5d, universe_ret5d, edge_5d, top20_ret10d, hit_rate_5d, error
                    FROM strategy_backtest_runs WHERE strategy=%s ORDER BY id DESC LIMIT 1
                """, (strategy,))
                row = cur.fetchone()
            conn.close()
            if not row:
                self.send_json_response({"status": "none"})
                return
            (rid, status, started, finished, sstart, send, n, t5, u5, edge, t10, hit, err) = row
            self.send_json_response({
                "run_id": rid, "status": status,
                "started_at": started.isoformat() if started else None,
                "finished_at": finished.isoformat() if finished else None,
                "sample_start": sstart.isoformat() if sstart else None,
                "sample_end": send.isoformat() if send else None,
                "n_samples": n, "top20_ret5d": t5, "universe_ret5d": u5,
                "edge_5d": edge, "top20_ret10d": t10, "hit_rate_5d": hit, "error": err,
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_ticker_signals(self, symbol: str):
        """Reward/risk + tâm lý theo mã — tính từ dữ liệu thật (stock_prices,
        yt_ticker_mentions, VNDirect foreigns). Dùng cho ChartPage header + thẻ chi tiết."""
        try:
            from backend.utils.ticker_signals import compute_ticker_signals
            self.send_json_response(compute_ticker_signals(symbol))
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def _latest_trading_date(self) -> str:
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("SELECT MAX(trading_date) FROM stock_prices WHERE symbol <> 'VNINDEX'")
                d = cur.fetchone()[0]
            conn.close()
            return d.isoformat() if d else "2026-08-18"
        except Exception:
            return "2026-08-18"

    def handle_api_summary(self, symbol: str):
        try:
            from backend.workflow.engine import InvestmentWorkflowEngine
            engine = InvestmentWorkflowEngine()
            result = engine.run_pipeline(symbol=symbol, timestamp=self._latest_trading_date(), verbose=False)
            
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
            global _SHARED_TELEGRAM_ANALYZER
            if _SHARED_TELEGRAM_ANALYZER is None:
                from backend.utils.telegram_analyzer import TelegramSentimentAnalyzer
                _SHARED_TELEGRAM_ANALYZER = TelegramSentimentAnalyzer()

            if symbol:
                market_sent = _SHARED_TELEGRAM_ANALYZER.analyze_stock_sentiment(symbol)
            else:
                market_sent = _SHARED_TELEGRAM_ANALYZER.analyze_market_sentiment()

            res = {
                "symbol": symbol or "VN-INDEX",
                "sentiment_score": market_sent.get("sentiment_score", 0.0),
                "sentiment_label": market_sent.get("sentiment_label", "TRUNG TÍNH"),
                "euphoria_percentage": market_sent.get("euphoria_percentage") or market_sent.get("euphoria_index", 40.0),
                "panic_percentage": market_sent.get("panic_percentage", 60.0),
                "total_messages": market_sent.get("total_messages", 0),
                "risk_assessment": market_sent.get("risk_assessment") or market_sent.get("risk_level", "BÌNH THƯỜNG"),
                "summary": market_sent.get("summary") or f"Dữ liệu sentiment cộng đồng Telegram cho {symbol or 'Thị trường chung'}."
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

    def handle_api_full_resync(self, symbol: str):
        """Xóa toàn bộ dữ liệu cũ của symbol rồi fetch lại từ VNDirect.
        Cần thiết sau khi cổ phiếu chia cổ tức/thưởng để anchor điều chỉnh được reset đúng."""
        try:
            from backend.db.postgres import PostgresDBManager
            from backend.utils.price_ingest import fetch_price_history

            db = PostgresDBManager()
            prices = fetch_price_history(symbol, adjusted=True)
            if not prices:
                self.send_json_response({"error": f"Không lấy được dữ liệu từ VNDirect cho {symbol}"}, status_code=503)
                return

            with db.get_connection_ctx() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM stock_prices WHERE symbol = %s", (symbol,))
                    deleted = cur.rowcount
                conn.commit()

            db.upsert_prices(symbol, prices)
            latest = prices[-1]
            self.send_json_response({
                "status": "FULL_RESYNC_OK",
                "symbol": symbol,
                "deleted_bars": deleted,
                "inserted_bars": len(prices),
                "latest_date": latest["date"],
                "latest_close": latest["close"],
                "message": f"Đã xóa {deleted:,} nến cũ và nạp lại {len(prices):,} nến đã điều chỉnh dividend cho {symbol}."
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, status_code=500)

    def handle_nav_history(self, product_id: int):
        try:
            import urllib.request
            from datetime import datetime, timedelta
            url = "https://api.fmarket.vn/res/product/get-nav-history"
            today = datetime.now().strftime("%Y-%m-%d")
            from_date = (datetime.now() - timedelta(days=365 * 10)).strftime("%Y-%m-%d")
            payload = json.dumps({
                "isAllData": 1,
                "productId": product_id,
                "fromDate": from_date,
                "toDate": today,
            }).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json, text/plain, */*",
                    "Origin": "https://fmarket.vn",
                    "Referer": "https://fmarket.vn/",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            self.send_json_response(data)
        except Exception as e:
            self.send_json_response({"error": str(e)}, status_code=500)

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

    # ─── Observation API ──────────────────────────────────────────────────────
    def handle_observation_status(self):
        """Return collection log: phase/task/status/items_count."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT phase, task, status, detail, items_count,
                           started_at, finished_at
                    FROM yt_collection_log
                    ORDER BY phase, id
                """)
                rows = cur.fetchall()
            conn.close()
            data = [{"phase": r[0], "task": r[1], "status": r[2], "detail": r[3] or "",
                     "items": r[4] or 0,
                     "started_at": r[5].isoformat() if r[5] else None,
                     "finished_at": r[6].isoformat() if r[6] else None} for r in rows]
            self.send_json_response({"tasks": data})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_videos(self):
        """Return list of collected videos."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT video_id, title, published_at, start_time, end_time,
                           duration_sec, views, likes, comments, snapshot_at
                    FROM yt_videos
                    ORDER BY published_at DESC
                """)
                rows = cur.fetchall()
            conn.close()
            data = [{"video_id": r[0], "title": r[1],
                     "published_at": r[2].isoformat() if r[2] else None,
                     "start_time": r[3].isoformat() if r[3] else None,
                     "end_time": r[4].isoformat() if r[4] else None,
                     "duration_sec": r[5], "views": r[6], "likes": r[7],
                     "comments": r[8],
                     "snapshot_at": r[9].isoformat() if r[9] else None} for r in rows]
            self.send_json_response({"videos": data, "total": len(data)})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_stats(self):
        """Aggregate stats: total videos/comments/transcript segments."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM yt_videos")
                n_videos = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM yt_comments")
                n_comments = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM yt_transcripts")
                n_segments = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM yt_comment_classifications")
                n_clf = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM yt_ticker_mentions")
                n_tickers = cur.fetchone()[0]
            conn.close()
            self.send_json_response({
                "videos": n_videos,
                "comments": n_comments,
                "transcript_segments": n_segments,
                "classifications": n_clf,
                "ticker_mention_rows": n_tickers,
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_collect(self):
        """Trigger Phase 1 collection in background subprocess."""
        import subprocess
        import sys
        api_key = os.environ.get("YOUTUBE_API_KEY", "")
        if not api_key:
            self.send_json_response({"error": "YOUTUBE_API_KEY not set. Run: export YOUTUBE_API_KEY='AIza...'"}, 400)
            return
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "collect_cfa99_phase1.py")
        subprocess.Popen([sys.executable, script], env={**os.environ})
        self.send_json_response({"status": "started", "message": "Phase 1 collection running in background. Poll /api/observation/status for progress."})

    def handle_observation_daily_metrics(self):
        """Return daily metrics for timeseries and sentiment charts."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT date, total_views, view_ratio, total_comments, comment_intensity, comment_velocity,
                           total_questions, question_intensity, bullish_count, bearish_count, neutral_count,
                           bullish_pct, bearish_pct,
                           fomo_raw, fomo_mean_30d, fomo_std_30d, fomo_z,
                           fear_raw, fear_mean_30d, fear_std_30d, fear_z,
                           uncertainty_raw, uncertainty_mean_30d, uncertainty_std_30d, uncertainty_z,
                           vnindex_open, vnindex_high, vnindex_low, vnindex_close,
                           vnindex_change_pct, vnindex_volume, breadth_adv, breadth_dec, breadth_unch,
                           foreign_buy, foreign_sell, foreign_net,
                           vnindex_ret_1d, vnindex_ret_3d, vnindex_ret_5d, vnindex_ret_10d
                    FROM yt_daily_metrics
                    ORDER BY date ASC
                """)
                rows = cur.fetchall()
            conn.close()
            metrics = []
            for r in rows:
                metrics.append({
                    "date": str(r[0]),
                    "total_views": r[1] or 0,
                    "view_ratio": float(r[2] or 1.0),
                    "total_comments": r[3] or 0,
                    "comment_intensity": float(r[4] or 0.0),
                    "comment_velocity": float(r[5] or 0.0),
                    "total_questions": r[6] or 0,
                    "question_intensity": float(r[7] or 0.0),
                    "bullish_count": r[8] or 0,
                    "bearish_count": r[9] or 0,
                    "neutral_count": r[10] or 0,
                    "bullish_pct": float(r[11] or 0.0),
                    "bearish_pct": float(r[12] or 0.0),
                    "fomo_raw": r[13] or 0,
                    "fomo_mean_30d": float(r[14] or 0.0),
                    "fomo_std_30d": float(r[15] or 1.0),
                    "fomo_z": float(r[16] or 0.0),
                    "fear_raw": r[17] or 0,
                    "fear_mean_30d": float(r[18] or 0.0),
                    "fear_std_30d": float(r[19] or 1.0),
                    "fear_z": float(r[20] or 0.0),
                    "uncertainty_raw": r[21] or 0,
                    "uncertainty_mean_30d": float(r[22] or 0.0),
                    "uncertainty_std_30d": float(r[23] or 1.0),
                    "uncertainty_z": float(r[24] or 0.0),
                    "vnindex_open": float(r[25] or 0.0),
                    "vnindex_high": float(r[26] or 0.0),
                    "vnindex_low": float(r[27] or 0.0),
                    "vnindex_close": float(r[28] or 0.0),
                    "vnindex_change_pct": float(r[29] or 0.0),
                    "vnindex_volume": int(r[30] or 0),
                    "breadth_adv": r[31] or 0,
                    "breadth_dec": r[32] or 0,
                    "breadth_unch": r[33] or 0,
                    "foreign_buy": float(r[34] or 0.0),
                    "foreign_sell": float(r[35] or 0.0),
                    "foreign_net": float(r[36] or 0.0),
                    "vnindex_ret_1d": float(r[37] or 0.0),
                    "vnindex_ret_3d": float(r[38] or 0.0),
                    "vnindex_ret_5d": float(r[39] or 0.0),
                    "vnindex_ret_10d": float(r[40] or 0.0),
                })
            self.send_json_response({"metrics": metrics, "total": len(metrics)})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_ticker_mentions(self):
        """Return aggregated stock mentions, questions, sentiment & delta attention."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("""
                    WITH ticker_totals AS (
                        SELECT 
                            ticker,
                            SUM(mentions) as mentions,
                            SUM(questions) as questions,
                            SUM(bullish_count) as bullish,
                            SUM(bearish_count) as bearish,
                            SUM(fomo_count) as fomo,
                            SUM(fear_count) as fear,
                            SUM(neutral_count) as neutral,
                            COUNT(DISTINCT date) as days_active
                        FROM yt_ticker_mentions
                        GROUP BY ticker
                    ),
                    recent_attn AS (
                        SELECT 
                            ticker,
                            AVG(mentions) FILTER (WHERE date >= (SELECT MAX(date) - INTERVAL '7 days' FROM yt_ticker_mentions)) as recent_avg,
                            AVG(mentions) as overall_avg
                        FROM yt_ticker_mentions
                        GROUP BY ticker
                    )
                    SELECT 
                        t.ticker, t.mentions, t.questions, t.bullish, t.bearish, t.fomo, t.fear,
                        ROUND((t.bullish - t.bearish)::numeric / NULLIF(t.mentions, 0) * 100, 1) as sentiment_score,
                        COALESCE(ROUND(((r.recent_avg - r.overall_avg) / NULLIF(r.overall_avg, 0) * 100)::numeric, 1), 0.0) as delta_attn,
                        ROUND(r.overall_avg::numeric, 1) as avg_mentions
                    FROM ticker_totals t
                    LEFT JOIN recent_attn r ON t.ticker = r.ticker
                    ORDER BY t.mentions DESC
                """)
                rows = cur.fetchall()
            conn.close()
            tickers = []
            for r in rows:
                tickers.append({
                    "ticker": r[0],
                    "mentions": int(r[1] or 0),
                    "questions": int(r[2] or 0),
                    "bullish_count": int(r[3] or 0),
                    "bearish_count": int(r[4] or 0),
                    "fomo_count": int(r[5] or 0),
                    "fear_count": int(r[6] or 0),
                    "sentiment": float(r[7] or 0.0),
                    "delta_attn": float(r[8] or 0.0),
                    "avg_mentions": float(r[9] or 0.0),
                })
            self.send_json_response({"tickers": tickers, "total": len(tickers)})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_divergence(self):
        """Return Creator Sentiment vs Audience Sentiment per top ticker."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                # Get creator sentiment from transcript classifications
                cur.execute("""
                    WITH creator_scores AS (
                        SELECT 
                            t.ticker,
                            COUNT(*) as segments_count,
                            SUM(CASE WHEN tc.analyst_sentiment = 'BULLISH' THEN 100 
                                     WHEN tc.analyst_sentiment = 'BEARISH' THEN -100 
                                     ELSE 0 END) / COUNT(*) as creator_sent,
                            MODE() WITHIN GROUP (ORDER BY tc.recommendation) as rec
                        FROM yt_transcript_classifications tc
                        CROSS JOIN LATERAL unnest(tc.tickers) as t(ticker)
                        GROUP BY t.ticker
                    ),
                    audience_scores AS (
                        SELECT 
                            t.ticker,
                            SUM(mentions) as mentions,
                            ROUND((SUM(bullish_count) - SUM(bearish_count))::numeric / NULLIF(SUM(mentions), 0) * 100, 1) as audience_sent
                        FROM yt_ticker_mentions t
                        GROUP BY t.ticker
                    )
                    SELECT 
                        c.ticker,
                        c.creator_sent,
                        c.rec,
                        COALESCE(a.audience_sent, 0) as audience_sent,
                        COALESCE(a.mentions, 0) as mentions
                    FROM creator_scores c
                    LEFT JOIN audience_scores a ON c.ticker = a.ticker
                    WHERE COALESCE(a.mentions, 0) > 0
                    ORDER BY a.mentions DESC
                    LIMIT 10
                """)
                rows = cur.fetchall()
            conn.close()
            divergences = []
            for r in rows:
                c_sent = int(r[1] or 0)
                rec = r[2] or "WATCH"
                a_sent = float(r[3] or 0.0)
                diff = abs(c_sent - a_sent)
                
                # Determine consensus vs divergence
                if (c_sent > 20 and a_sent > 20):
                    consensus = "consensus_bullish"
                    summary = "Cả chuyên gia và cộng đồng đều lạc quan"
                elif (c_sent < -20 and a_sent < -20):
                    consensus = "consensus_bearish"
                    summary = "Cả chuyên gia và cộng đồng đều bi quan"
                elif (c_sent < 0 and a_sent > 30):
                    consensus = "contrarian_creator_bear"
                    summary = "Cộng đồng FOMO nhưng chuyên gia cảnh báo rủi ro"
                elif (c_sent > 30 and a_sent < 0):
                    consensus = "contrarian_creator_bull"
                    summary = "Chuyên gia đánh giá cao nhưng cộng đồng sợ hãi (Cơ hội tích sản)"
                else:
                    consensus = "neutral"
                    summary = "Quan điểm trung lập hoặc phân hóa nhẹ"

                divergences.append({
                    "ticker": r[0],
                    "creator": c_sent,
                    "recommendation": rec,
                    "audience": a_sent,
                    "divergence": round(diff, 1),
                    "consensus": consensus,
                    "summary": summary,
                    "mentions": int(r[4] or 0),
                })
            self.send_json_response({"divergence": divergences})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_backtest(self):
        """Calculate forward return stats grouped by sentiment/attention signals."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        'High Attention (View Ratio > 1.2x)' as signal,
                        'Độ chú ý của cộng đồng tăng vọt đột biến' as desc,
                        COUNT(*) as n_obs,
                        ROUND(AVG(vnindex_ret_1d)::numeric, 2) as r1d,
                        ROUND(AVG(vnindex_ret_3d)::numeric, 2) as r3d,
                        ROUND(AVG(vnindex_ret_5d)::numeric, 2) as r5d,
                        ROUND(AVG(vnindex_ret_10d)::numeric, 2) as r10d,
                        ROUND(COUNT(*) FILTER (WHERE vnindex_ret_5d > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate
                    FROM yt_daily_metrics WHERE view_ratio >= 1.2
                    UNION ALL
                    SELECT 
                        'Extreme FOMO (Z > +1.5σ)',
                        'Tâm lý hưng phấn tột độ, tranh mua giá cao',
                        COUNT(*),
                        ROUND(AVG(vnindex_ret_1d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_3d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_5d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_10d)::numeric, 2),
                        ROUND(COUNT(*) FILTER (WHERE vnindex_ret_5d > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
                    FROM yt_daily_metrics WHERE fomo_z >= 1.5
                    UNION ALL
                    SELECT 
                        'Extreme Fear (Z > +1.5σ)',
                        'Tâm lý hoảng loạn bán tháo, cắt lỗ diện rộng',
                        COUNT(*),
                        ROUND(AVG(vnindex_ret_1d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_3d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_5d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_10d)::numeric, 2),
                        ROUND(COUNT(*) FILTER (WHERE vnindex_ret_5d > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
                    FROM yt_daily_metrics WHERE fear_z >= 1.5
                    UNION ALL
                    SELECT 
                        'High Bullish Sentiment (> 55%)',
                        'Tỷ lệ bình luận lạc quan chiếm ưu thế áp đảo',
                        COUNT(*),
                        ROUND(AVG(vnindex_ret_1d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_3d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_5d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_10d)::numeric, 2),
                        ROUND(COUNT(*) FILTER (WHERE vnindex_ret_5d > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
                    FROM yt_daily_metrics WHERE bullish_pct >= 55.0
                    UNION ALL
                    SELECT 
                        'High Bearish Sentiment (> 25%)',
                        'Tỷ lệ bình luận bi quan cảnh báo rủi ro tăng cao',
                        COUNT(*),
                        ROUND(AVG(vnindex_ret_1d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_3d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_5d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_10d)::numeric, 2),
                        ROUND(COUNT(*) FILTER (WHERE vnindex_ret_5d > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
                    FROM yt_daily_metrics WHERE bearish_pct >= 25.0
                    UNION ALL
                    SELECT 
                        'High Uncertainty (Z > +1.5σ)',
                        'Nhà đầu tư hoang mang đặt nhiều câu hỏi nghi ngờ',
                        COUNT(*),
                        ROUND(AVG(vnindex_ret_1d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_3d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_5d)::numeric, 2),
                        ROUND(AVG(vnindex_ret_10d)::numeric, 2),
                        ROUND(COUNT(*) FILTER (WHERE vnindex_ret_5d > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
                    FROM yt_daily_metrics WHERE uncertainty_z >= 1.5
                """)
                rows = cur.fetchall()
            conn.close()
            signals = []
            for r in rows:
                signals.append({
                    "signal": r[0],
                    "desc": r[1],
                    "n_obs": int(r[2] or 0),
                    "r1d": float(r[3] or 0.0),
                    "r3d": float(r[4] or 0.0),
                    "r5d": float(r[5] or 0.0),
                    "r10d": float(r[6] or 0.0),
                    "win_rate": float(r[7] or 50.0),
                })
            self.send_json_response({"signals": signals})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_psychology(self):
        """Vietnam Market Psychology — chuỗi ngày hợp nhất từ market_psychology_daily.

        Nguồn: scripts/build_market_psychology.py (retail CFA99 + market internals +
        foreign flow + VN-Index). Trả series để vẽ + snapshot phiên gần nhất.
        """
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT trading_date, has_retail, vnindex_close, vnindex_ret_1d,
                           fwd_ret_1d, fwd_ret_3d, fwd_ret_5d, fwd_ret_10d,
                           realized_vol_20d, drawdown_52w, vol_ratio_20d,
                           pct_above_ma20, pct_above_ma50, pct_above_ma200,
                           adv_dec_ratio, nh_nl_diff,
                           foreign_net_bn, foreign_net_5d_bn, foreign_net_20d_bn,
                           retail_views, retail_view_ratio, retail_comments, retail_questions,
                           retail_bull_pct, retail_bear_pct, retail_fomo_raw, retail_fear_raw,
                           n_tickers_mentioned, gt_chung_khoan, gt_co_phieu,
                           idx_retail_attention, idx_retail_sentiment, idx_fomo,
                           idx_fear_capitulation, idx_stock_attention,
                           psychology_composite_z, psychology_gauge, psychology_label
                    FROM market_psychology_daily
                    ORDER BY trading_date
                """)
                cols = [c[0] for c in cur.description]
                rows = cur.fetchall()
            conn.close()

            def norm(v):
                if isinstance(v, (int, float)) or v is None or isinstance(v, bool):
                    return v
                return str(v)

            series = [{c: norm(v) for c, v in zip(cols, r)} for r in rows]
            if not series:
                self.send_json_response({"error": "market_psychology_daily rỗng — chạy scripts/build_market_psychology.py"}, 404)
                return
            latest = series[-1]
            self.send_json_response({
                "series": series,
                "total": len(series),
                "latest": latest,
                "gauge": latest.get("psychology_gauge"),
                "label": latest.get("psychology_label"),
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_comments(self, ticker=None, limit=50):
        """Return sample raw comments with classifications."""
        try:
            conn = psycopg2.connect(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")
            with conn.cursor() as cur:
                if ticker:
                    cur.execute("""
                        SELECT c.comment_id, c.video_id, c.published_at, c.text_original, c.like_count,
                               cl.sentiment, cl.emotion, cl.intent, cl.tickers
                        FROM yt_comments c
                        JOIN yt_comment_classifications cl ON c.comment_id = cl.comment_id
                        WHERE %s = ANY(cl.tickers)
                        ORDER BY c.like_count DESC, c.published_at DESC
                        LIMIT %s
                    """, (ticker, limit))
                else:
                    cur.execute("""
                        SELECT c.comment_id, c.video_id, c.published_at, c.text_original, c.like_count,
                               cl.sentiment, cl.emotion, cl.intent, cl.tickers
                        FROM yt_comments c
                        JOIN yt_comment_classifications cl ON c.comment_id = cl.comment_id
                        ORDER BY c.like_count DESC, c.published_at DESC
                        LIMIT %s
                    """, (limit,))
                rows = cur.fetchall()
            conn.close()
            comments = []
            for r in rows:
                comments.append({
                    "comment_id": r[0],
                    "video_id": r[1],
                    "published_at": r[2].isoformat() if r[2] else None,
                    "text": r[3],
                    "likes": r[4] or 0,
                    "sentiment": r[5],
                    "emotion": r[6],
                    "intent": r[7],
                    "tickers": r[8] or [],
                })
            self.send_json_response({"comments": comments, "total": len(comments)})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_observation_seed_sample(self):
        """Regenerate sample 60-day CFA99 benchmark dataset."""
        try:
            import subprocess
            import sys
            script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "seed_cfa99_sample.py")
            subprocess.run([sys.executable, script], check=True)
            self.send_json_response({"status": "success", "message": "Đã tạo xong dữ liệu mẫu 60 ngày CFA99!"})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)


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
