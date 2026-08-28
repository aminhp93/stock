import psycopg2
from psycopg2 import pool as pg_pool
from psycopg2.extras import execute_values
from typing import List, Dict, Any, Optional

from contextlib import contextmanager

class PostgresDBManager:
    _pool: Optional[pg_pool.ThreadedConnectionPool] = None  # class-level shared pool

    def __init__(self, host: str = "localhost", port: int = 5432, dbname: str = "stock_db", user: str = "postgres", password: str = "postgres"):
        self.config = {
            "host": host,
            "port": port,
            "dbname": dbname,
            "user": user,
            "password": password
        }
        if PostgresDBManager._pool is None:
            try:
                PostgresDBManager._pool = pg_pool.ThreadedConnectionPool(
                    minconn=2, maxconn=50, **self.config
                )
            except Exception as e:
                print(f"⚠️ Connection pool init failed ({e}), will use direct connections.")

    def get_connection(self):
        if PostgresDBManager._pool:
            return PostgresDBManager._pool.getconn()
        return psycopg2.connect(**self.config)

    def _release(self, conn):
        """Return connection to pool or close if pool unavailable."""
        if conn is None:
            return
        try:
            if PostgresDBManager._pool:
                PostgresDBManager._pool.putconn(conn)
            else:
                conn.close()
        except Exception:
            pass

    @contextmanager
    def get_connection_ctx(self):
        """Context manager đảm bảo connection luôn được trả về pool an toàn"""
        conn = self.get_connection()
        try:
            yield conn
        finally:
            self._release(conn)

    def init_schema(self):
        """Khởi tạo cấu trúc các bảng PostgreSQL chuẩn hóa"""
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
                revenue_growth_yoy NUMERIC(10, 2) DEFAULT 15.0,
                eps NUMERIC(14, 2),
                intrinsic_value_dcf NUMERIC(16, 2),
                debt_to_equity NUMERIC(10, 2) DEFAULT 0.5,
                CONSTRAINT unique_symbol_quarter UNIQUE (symbol, year, quarter)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS macro_news (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(10),
                publish_date DATE NOT NULL,
                headline VARCHAR(500) NOT NULL,
                sentiment_score NUMERIC(4, 2) NOT NULL,
                category VARCHAR(50) DEFAULT 'Macro',
                importance NUMERIC(4, 2) DEFAULT 0.5
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS telegram_messages (
                id SERIAL PRIMARY KEY,
                channel_name VARCHAR(100) NOT NULL,
                message_id BIGINT,
                sender_name VARCHAR(100),
                text TEXT NOT NULL,
                published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_channel_msg UNIQUE (channel_name, message_id)
            );
            """
        ]
        
        try:
            conn = self.get_connection()
            try:
                with conn.cursor() as cur:
                    for cmd in commands:
                        cur.execute(cmd)
                conn.commit()
                print("✅ Đã khởi tạo Schema PostgreSQL chuẩn hóa (stocks, stock_prices, financial_metrics, macro_news).")
            except Exception as e:
                conn.rollback()
                print(f"❌ Lỗi khởi tạo Schema PostgreSQL: {e}")
                raise e
            finally:
                self._release(conn)
        except Exception as e:
            print(f"❌ Không thể kết nối PostgreSQL: {e}")

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
        
        try:
            conn = self.get_connection()
            try:
                with conn.cursor() as cur:
                    execute_values(cur, query, records)
                conn.commit()
            finally:
                self._release(conn)
        except Exception as e:
            print(f"⚠️ Lỗi upsert stocks: {e}")

    def upsert_prices(self, symbol: str, prices_data: List[Dict[str, Any]]):
        """Chèn / Cập nhật dữ liệu giá lịch sử của 1 mã cổ phiếu"""
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
        
        try:
            conn = self.get_connection()
            try:
                with conn.cursor() as cur:
                    execute_values(cur, query, records)
                conn.commit()
            finally:
                self._release(conn)
        except Exception as e:
            print(f"⚠️ Lỗi upsert prices: {e}")

    def get_financial_metrics(self, symbol: str, year: int = 2025, quarter: int = 4) -> Optional[Dict[str, Any]]:
        """Truy vấn động chỉ số tài chính Point-In-Time theo symbol, year, quarter từ CSDL"""
        try:
            conn = self.get_connection()
            try:
                query = """
                    SELECT pe_ratio, pb_ratio, roe, profit_margin, revenue_growth_yoy, eps, intrinsic_value_dcf, debt_to_equity
                    FROM financial_metrics
                    WHERE symbol = %s AND (year < %s OR (year = %s AND quarter <= %s))
                    ORDER BY year DESC, quarter DESC
                    LIMIT 1;
                """
                with conn.cursor() as cur:
                    cur.execute(query, (symbol, year, year, quarter))
                    row = cur.fetchone()
                    if row:
                        return {
                            "pe_ratio": float(row[0]),
                            "pb_ratio": float(row[1]),
                            "roe": float(row[2]),
                            "profit_margin": float(row[3]),
                            "revenue_growth_yoy": float(row[4]),
                            "eps": float(row[5]),
                            "intrinsic_value_dcf": float(row[6]),
                            "debt_to_equity": float(row[7])
                        }
            finally:
                self._release(conn)
        except Exception as e:
            print(f"⚠️ Lỗi đọc financial_metrics cho {symbol}: {e}")
        return None

    def get_macro_news(self, symbol: str, end_date: str) -> List[Dict[str, Any]]:
        """Truy vấn tin tức vĩ mô Point-In-Time đến trước mốc end_date"""
        try:
            conn = self.get_connection()
            try:
                query = """
                    SELECT headline, sentiment_score, category, importance
                    FROM macro_news
                    WHERE (symbol = %s OR symbol IS NULL OR symbol = 'ALL') AND publish_date <= %s
                    ORDER BY publish_date DESC
                    LIMIT 5;
                """
                with conn.cursor() as cur:
                    cur.execute(query, (symbol, end_date))
                    rows = cur.fetchall()
                    if rows:
                        return [
                            {
                                "headline": r[0],
                                "sentiment_score": float(r[1]),
                                "category": r[2],
                                "importance": float(r[3])
                            }
                            for r in rows
                        ]
            finally:
                self._release(conn)
        except Exception as e:
            print(f"⚠️ Lỗi đọc macro_news cho {symbol}: {e}")
        return []

    def upsert_telegram_messages(self, messages: List[Dict[str, Any]]):
        """Lưu / Cập nhật tin nhắn thu thập từ Telegram vào CSDL PostgreSQL"""
        if not messages:
            return
        
        query = """
            INSERT INTO telegram_messages (channel_name, message_id, sender_name, text, published_at)
            VALUES %s
            ON CONFLICT (channel_name, message_id) DO UPDATE SET
                text = EXCLUDED.text,
                published_at = EXCLUDED.published_at;
        """
        records = [
            (
                m.get("channel", "canslim01"),
                m.get("message_id", hash(m.get("text", "")) % (10**9)),
                m.get("sender_name", "Member"),
                m.get("text", ""),
                m.get("published_at")
            )
            for m in messages if m.get("text")
        ]
        
        try:
            conn = self.get_connection()
            try:
                with conn.cursor() as cur:
                    execute_values(cur, query, records)
                conn.commit()
            finally:
                self._release(conn)
        except Exception as e:
            print(f"⚠️ Lỗi upsert telegram_messages: {e}")

    def get_telegram_messages(self, channel: Optional[str] = None, symbol: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Truy vấn các tin nhắn Telegram đã thu thập theo Kênh hoặc Theo Mã Cổ Phiếu"""
        try:
            conn = self.get_connection()
            try:
                sql = "SELECT channel_name, text, published_at, sender_name FROM telegram_messages WHERE 1=1"
                params = []
                if channel:
                    sql += " AND channel_name = %s"
                    params.append(channel)
                if symbol:
                    sql += " AND text ILIKE %s"
                    params.append(f"%{symbol}%")
                sql += " ORDER BY published_at DESC LIMIT %s;"
                params.append(limit)

                with conn.cursor() as cur:
                    cur.execute(sql, tuple(params))
                    rows = cur.fetchall()
                    if rows:
                        return [
                            {
                                "channel": r[0],
                                "text": r[1],
                                "published_at": str(r[2]),
                                "sender_name": r[3],
                                "url": f"https://t.me/{r[0]}"
                            }
                            for r in rows
                        ]
            finally:
                self._release(conn)
        except Exception as e:
            print(f"⚠️ Lỗi đọc telegram_messages từ DB: {e}")
        return []

    def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch company_name and sector from the stocks table."""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT company_name, sector FROM stocks WHERE symbol = %s",
                    (symbol,)
                )
                row = cur.fetchone()
                if row:
                    return {"company_name": row[0], "sector": row[1]}
        except Exception as e:
            print(f"⚠️ Lỗi đọc stock info cho {symbol}: {e}")
        finally:
            self._release(conn)
        return None

