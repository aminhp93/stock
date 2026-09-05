"""
Khoi tao & seed du lieu cho cac bang tai chinh ca nhan (Personal Finance)
dung boi trang /finance/personal/raw (FinancePage.tsx -> RawDataTab).

Bang duoc tao trong cung database `stock_db` (Postgres) da dung cho phan
Stock Analysis, de co the xem/quan ly qua TablePlus voi cung 1 connection.

Chay: python3 scripts/init_finance_db.py
"""
import psycopg2

DB_CONFIG = dict(host="localhost", port=5432, dbname="stock_db", user="postgres", password="postgres")

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS finance_journal (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL UNIQUE,
    vang_so_luong NUMERIC NOT NULL DEFAULT 0,
    vang_gia NUMERIC NOT NULL DEFAULT 0,
    ck NUMERIC NOT NULL DEFAULT 0,
    tiet_kiem_vcb NUMERIC NOT NULL DEFAULT 0,
    tiet_kiem_tcb NUMERIC NOT NULL DEFAULT 0,
    cash_vcb NUMERIC NOT NULL DEFAULT 0,
    cash_tcb NUMERIC NOT NULL DEFAULT 0,
    cash_tpb NUMERIC NOT NULL DEFAULT 0,
    credit_tcb_spent NUMERIC NOT NULL DEFAULT 0,
    credit_tcb_instal NUMERIC NOT NULL DEFAULT 0,
    vay_vcb NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_ck_holdings (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    symbol TEXT NOT NULL,
    tong_sl NUMERIC NOT NULL DEFAULT 0,
    gia_von NUMERIC NOT NULL DEFAULT 0,
    gia_tt NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_savings (
    id SERIAL PRIMARY KEY,
    bank TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    rate NUMERIC NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_loans (
    id SERIAL PRIMARY KEY,
    bank TEXT NOT NULL,
    so_tien NUMERIC NOT NULL DEFAULT 0,
    thoi_gian TEXT,
    lai_suat TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

JOURNAL_SEED = [
    # entry_date, vang_so_luong, vang_gia, ck, tiet_kiem_vcb, tiet_kiem_tcb, cash_vcb, cash_tcb, cash_tpb, credit_tcb_spent, credit_tcb_instal, vay_vcb
    ("2026-08-20", 2, 82, 350, 200, 150, 20, 15, 5, 8, 12, 1900),
    ("2026-08-29", 2, 84, 360, 200, 150, 25, 10, 6, 6, 12, 1900),
]

CK_SEED = [
    ("2026-08-29", "C4G", 5000, 12000, 13500),
    ("2026-08-29", "HDG", 3000, 28000, 30000),
    ("2026-08-29", "HHV", 4000, 14000, 15200),
    ("2026-08-29", "IDI", 6000, 9000, 9500),
    ("2026-08-29", "MBS", 2000, 22000, 24000),
    ("2026-08-29", "PDR", 3000, 18000, 19500),
    ("2026-08-29", "TCH", 5000, 16000, 17800),
]

SAVINGS_SEED = [
    ("VCB", 200, 4.7, "2026-01-15", "2027-01-15"),
    ("TCB", 150, 5.5, "2026-08-04", "2027-08-04"),
]

LOAN_SEED = [
    ("VCB", 1900, "7/8/2025 - 9/8/2055", "5.5% / 3 nam dau"),
]


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_SQL)

            cur.execute("SELECT COUNT(*) FROM finance_journal;")
            if cur.fetchone()[0] == 0:
                cur.executemany(
                    """INSERT INTO finance_journal
                       (entry_date, vang_so_luong, vang_gia, ck, tiet_kiem_vcb, tiet_kiem_tcb,
                        cash_vcb, cash_tcb, cash_tpb, credit_tcb_spent, credit_tcb_instal, vay_vcb)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    JOURNAL_SEED,
                )
                print(f"Seeded {len(JOURNAL_SEED)} finance_journal rows")

            cur.execute("SELECT COUNT(*) FROM finance_ck_holdings;")
            if cur.fetchone()[0] == 0:
                cur.executemany(
                    "INSERT INTO finance_ck_holdings (entry_date, symbol, tong_sl, gia_von, gia_tt) VALUES (%s,%s,%s,%s,%s)",
                    CK_SEED,
                )
                print(f"Seeded {len(CK_SEED)} finance_ck_holdings rows")

            cur.execute("SELECT COUNT(*) FROM finance_savings;")
            if cur.fetchone()[0] == 0:
                cur.executemany(
                    "INSERT INTO finance_savings (bank, amount, rate, start_date, end_date) VALUES (%s,%s,%s,%s,%s)",
                    SAVINGS_SEED,
                )
                print(f"Seeded {len(SAVINGS_SEED)} finance_savings rows")

            cur.execute("SELECT COUNT(*) FROM finance_loans;")
            if cur.fetchone()[0] == 0:
                cur.executemany(
                    "INSERT INTO finance_loans (bank, so_tien, thoi_gian, lai_suat) VALUES (%s,%s,%s,%s)",
                    LOAN_SEED,
                )
                print(f"Seeded {len(LOAN_SEED)} finance_loans rows")

        conn.commit()
        print("OK: finance_journal / finance_ck_holdings / finance_savings / finance_loans ready in stock_db")
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    main()
