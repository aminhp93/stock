import http.server
import socketserver
import os
import json
import urllib.parse
import psycopg2
from typing import Dict, Any, List, Optional

HOST = "127.0.0.1"
PORT = 8000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dashboard")

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
        elif path == "/api/telegram-sentiment":
            symbol = query.get("symbol", [None])[0]
            self.handle_api_telegram_sentiment(symbol)
        else:
            super().do_GET()

    def handle_api_stocks(self):
        try:
            from src.db.postgres import PostgresDBManager
            db = PostgresDBManager()
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT symbol, company_name, exchange, sector 
                FROM stocks 
                ORDER BY CASE WHEN symbol IN ('FPT', 'TCB', 'SSI', 'HPG', 'VNM', 'MBB', 'MWG', 'VCB') THEN 0 ELSE 1 END, symbol ASC
                LIMIT 500;
            """)
            rows = cur.fetchall()
            conn.close()
            stocks = [
                {"symbol": r[0], "company_name": r[1], "exchange": r[2], "sector": r[3]}
                for r in rows
            ]
        except Exception as e:
            stocks = [
                {"symbol": "FPT", "company_name": "CTCP FPT", "exchange": "HOSE", "sector": "Công nghệ"},
                {"symbol": "TCB", "company_name": "Ngân hàng Techcombank", "exchange": "HOSE", "sector": "Ngân hàng"},
                {"symbol": "SSI", "company_name": "CTCP Chứng khoán SSI", "exchange": "HOSE", "sector": "Chứng khoán"},
                {"symbol": "HPG", "company_name": "CTCP Tập đoàn Hòa Phát", "exchange": "HOSE", "sector": "Thép"},
                {"symbol": "VNM", "company_name": "CTCP Sữa Việt Nam", "exchange": "HOSE", "sector": "Thực phẩm"},
                {"symbol": "MBB", "company_name": "Ngân hàng Quân Đội", "exchange": "HOSE", "sector": "Ngân hàng"}
            ]
        self.send_json_response(stocks)

    def handle_api_chart(self, symbol: str, start_date: str):
        try:
            from src.db.postgres import PostgresDBManager
            db = PostgresDBManager()
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT trading_date, open_price, high_price, low_price, close_price, volume, rsi_14, ma20, ma50
                FROM stock_prices
                WHERE symbol = %s AND trading_date >= %s
                ORDER BY trading_date ASC;
            """, (symbol, start_date))
            rows = cur.fetchall()
            conn.close()

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
        except Exception as e:
            chart_data = []

        self.send_json_response({"symbol": symbol, "data": chart_data})

    def handle_api_summary(self, symbol: str):
        try:
            from src.workflow.engine import InvestmentWorkflowEngine
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
                "technical_trend": "BULLISH (UPTREND)" if analysis.is_uptrend else "BEARISH / SIDEWAYS",
                "margin_of_safety_pct": round(analysis.margin_of_safety * 100, 1),
                "sentiment_index": sim.overall_sentiment_score,
                "buy_pct": sim.buy_percentage,
                "sell_pct": sim.sell_percentage,
                "hold_pct": sim.hold_percentage,
                "panic_pct": sim.panic_percentage,
                "recommendation": "BUY (MUA)" if verdict.approved else "HOLD / REJECTED",
                "entry_zone": [strat.entry_zone_min, strat.entry_zone_max],
                "stop_loss": strat.stop_loss_price,
                "take_profit_1": strat.take_profit_target_1,
                "position_size_pct": risk.recommended_kelly_position_pct * 100,
                "risk_reward_ratio": strat.risk_reward_ratio,
                "verdict": verdict.verdict_code,
                "verifier_score": verdict.overall_score,
                "verifier_notes": verdict.feedback_notes
            }
        except Exception as e:
            summary = {
                "symbol": symbol,
                "error": str(e)
            }

        self.send_json_response(summary)

    def handle_api_telegram_sentiment(self, symbol: Optional[str] = None):
        try:
            from src.utils.telegram_analyzer import TelegramSentimentAnalyzer
            analyzer = TelegramSentimentAnalyzer()
            if symbol:
                res = analyzer.analyze_stock_sentiment(symbol.upper())
            else:
                res = analyzer.analyze_market_sentiment()
        except Exception as e:
            res = {"error": str(e)}

        self.send_json_response(res)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()

    def send_json_response(self, data: Any):
        content = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), CustomHandler) as httpd:
        print(f"🚀 Dashboard Server (TradingView Chart + Workflow API) đang chạy tại: http://{HOST}:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng Server.")

if __name__ == "__main__":
    run()
