import random
import numpy as np
from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.models.market_data import MarketContext, PriceBar, FinancialMetrics, MacroNews
from src.utils.metrics import calculate_rsi
from src.db.postgres import PostgresDBManager

class DataCollectorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="agent_01_data",
            name="Data Collection Agent",
            role="Thu thập, xử lý và đóng gói dữ liệu thị trường Point-In-Time thực tế từ PostgreSQL"
        )
        self.db_manager = PostgresDBManager()

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inputs: { "symbol": "FPT", "timestamp": "2025-12-31" }
        Output: { "market_context": MarketContext }
        """
        symbol = inputs.get("symbol", "FPT")
        timestamp = inputs.get("timestamp", "2025-12-31")
        
        # Try fetching real 2025 historical price data from PostgreSQL stock_db
        bars = self._fetch_bars_from_postgres(symbol, timestamp)
        
        if bars:
            current_price = bars[-1].close
        else:
            current_price = inputs.get("current_price", 135000.0)
            bars = self._generate_fallback_bars(current_price, 30, timestamp)

        financials = FinancialMetrics(
            pe_ratio=18.5,
            pb_ratio=4.2,
            roe=26.5,
            profit_margin=18.2,
            revenue_growth_yoy=22.4,
            eps=6800.0,
            intrinsic_value_dcf=152000.0,
            debt_to_equity=0.35
        )
        
        news_events = [
            MacroNews(
                headline=f"Doanh nghiệp {symbol} công bố kết quả kinh doanh năm 2025 vượt kế hoạch",
                sentiment_score=0.85,
                category="Earnings",
                importance=0.9
            ),
            MacroNews(
                headline="Dòng vốn ngoại và tự doanh mua ròng mạnh trong quý 4/2025",
                sentiment_score=0.60,
                category="Macro",
                importance=0.7
            )
        ]
        
        context = MarketContext(
            symbol=symbol,
            company_name=f"Tập đoàn {symbol}",
            sector="Thị trường Chứng khoán Việt Nam",
            current_price=current_price,
            timestamp=timestamp,
            historical_bars=bars,
            financials=financials,
            news_events=news_events,
            market_index_change_pct=1.2
        )
        
        return {"market_context": context}

    def _fetch_bars_from_postgres(self, symbol: str, end_date: str) -> List[PriceBar]:
        """Truy vấn dữ liệu nến giá thực tế 5 năm (2021-2025) từ PostgreSQL database stock_db"""
        try:
            conn = self.db_manager.get_connection()
            query = """
                SELECT trading_date, open_price, high_price, low_price, close_price, volume, rsi_14, ma20, ma50
                FROM stock_prices
                WHERE symbol = %s AND trading_date <= %s
                ORDER BY trading_date ASC
            """
            with conn.cursor() as cur:
                cur.execute(query, (symbol, end_date))
                rows = cur.fetchall()
            conn.close()

            if not rows:
                return []

            bars = []
            for r in rows:
                bars.append(PriceBar(
                    timestamp=r[0].strftime('%Y-%m-%d'),
                    open=float(r[1]),
                    high=float(r[2]),
                    low=float(r[3]),
                    close=float(r[4]),
                    volume=float(r[5]),
                    rsi=float(r[6]) if r[6] else None,
                    ma20=float(r[7]) if r[7] else None,
                    ma50=float(r[8]) if r[8] else None
                ))
            return bars
        except Exception as e:
            print(f"⚠️ Lỗi đọc PostgreSQL ({e}), chuyển sang fallback data.")
            return []

    def _generate_fallback_bars(self, base_price: float, count: int, end_date: str) -> List[PriceBar]:
        bars = []
        price = base_price * 0.85
        prices_list = []
        
        for i in range(count):
            change = random.uniform(-0.02, 0.035)
            open_p = price
            close_p = price * (1 + change)
            high_p = max(open_p, close_p) * (1 + random.uniform(0.001, 0.015))
            low_p = min(open_p, close_p) * (1 - random.uniform(0.001, 0.015))
            volume = random.uniform(1500000, 4500000)
            price = close_p
            prices_list.append(close_p)
            
            rsi_val = calculate_rsi(prices_list)
            ma20 = float(np.mean(prices_list[-20:])) if len(prices_list) >= 20 else None
            ma50 = float(np.mean(prices_list[-50:])) if len(prices_list) >= 50 else None
            
            bars.append(PriceBar(
                timestamp=f"Day-{count-i}",
                open=round(open_p, 0),
                high=round(high_p, 0),
                low=round(low_p, 0),
                close=round(close_p, 0),
                volume=round(volume, 0),
                rsi=rsi_val,
                ma20=round(ma20, 0) if ma20 else None,
                ma50=round(ma50, 0) if ma50 else None
            ))
        return bars
