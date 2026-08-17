import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict, Any, Optional

class PostgresDBManager:
    def __init__(self, host: str = "localhost", port: int = 5432, dbname: str = "stock_db", user: str = "postgres", password: str = "postgres"):
        self.config = {
            "host": host,
            "port": port,
            "dbname": dbname,
            "user": user,
            "password": password
        }

    def get_connection(self):
        return psycopg2.connect(**self.config)

    def init_schema(self):
        """Khởi tạo cấu trúc các bảng PostgreSQL chuẩn hóa (stocks, stock_prices, financial_metrics)"""
        commands = [
            """
            CREATE TABLE IF NOT EXISTS stocks (
                symbol VARCHAR(10) PRIMARY KEY,
                company_name VARCHAR(255),
                exchange VARCHAR(10),
                sector VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS stock_prices (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(10) REFERENCES stocks(symbol) ON DELETE CASCADE,
                trading_date DATE NOT NULL,
                open_price NUMERIC(14, 2),
                high_price NUMERIC(14, 2),
                low_price NUMERIC(14, 2),
                close_price NUMERIC(14, 2),
                volume NUMERIC(18, 0),
                rsi_14 NUMERIC(6, 2),
                ma20 NUMERIC(14, 2),
                ma50 NUMERIC(14, 2),
                CONSTRAINT unique_symbol_date_history UNIQUE (symbol, trading_date)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS financial_metrics (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(10) REFERENCES stocks(symbol) ON DELETE CASCADE,
                year INT NOT NULL,
                quarter INT NOT NULL,
                pe_ratio NUMERIC(10, 2),
                pb_ratio NUMERIC(10, 2),
                roe NUMERIC(10, 2),
                profit_margin NUMERIC(10, 2),
                eps NUMERIC(14, 2),
                intrinsic_value_dcf NUMERIC(16, 2),
                CONSTRAINT unique_symbol_quarter UNIQUE (symbol, year, quarter)
            );
            """
        ]
        
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                for cmd in commands:
                    cur.execute(cmd)
            conn.commit()
            print("✅ Đã khởi tạo Schema PostgreSQL chuẩn hóa (stocks, stock_prices, financial_metrics).")
        except Exception as e:
            conn.rollback()
            print(f"❌ Lỗi khởi tạo Schema PostgreSQL: {e}")
            raise e
        finally:
            conn.close()

    def upsert_stocks(self, stocks_data: List[Dict[str, Any]]):
        """Chèn / Cập nhật danh sách mã cổ phiếu"""
        if not stocks_data:
            return
        
        query = """
            INSERT INTO stocks (symbol, company_name, exchange, sector)
            VALUES %s
            ON CONFLICT (symbol) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                exchange = EXCLUDED.exchange,
                sector = EXCLUDED.sector;
        """
        records = [
            (s["symbol"], s.get("company_name", s["symbol"]), s.get("exchange", "HOSE"), s.get("sector", "Khác"))
            for s in stocks_data
        ]
        
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                execute_values(cur, query, records)
            conn.commit()
        finally:
            conn.close()

    def upsert_prices(self, symbol: str, prices_data: List[Dict[str, Any]]):
        """Chèn / Cập nhật dữ liệu giá lịch sử của 1 mã cổ phiếu vào bảng stock_prices"""
        if not prices_data:
            return
        
        query = """
            INSERT INTO stock_prices (symbol, trading_date, open_price, high_price, low_price, close_price, volume, rsi_14, ma20, ma50)
            VALUES %s
            ON CONFLICT (symbol, trading_date) DO UPDATE SET
                open_price = EXCLUDED.open_price,
                high_price = EXCLUDED.high_price,
                low_price = EXCLUDED.low_price,
                close_price = EXCLUDED.close_price,
                volume = EXCLUDED.volume,
                rsi_14 = EXCLUDED.rsi_14,
                ma20 = EXCLUDED.ma20,
                ma50 = EXCLUDED.ma50;
        """
        records = [
            (
                symbol,
                p["date"],
                p["open"],
                p["high"],
                p["low"],
                p["close"],
                p["volume"],
                p.get("rsi_14"),
                p.get("ma20"),
                p.get("ma50")
            )
            for p in prices_data
        ]
        
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                execute_values(cur, query, records)
            conn.commit()
        finally:
            conn.close()
