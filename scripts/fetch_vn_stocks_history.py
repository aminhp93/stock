import os
import sys
import time
import requests
import concurrent.futures
from typing import List, Dict, Any, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db.postgres import PostgresDBManager
from backend.utils.price_ingest import fetch_price_history, DEFAULT_START


def fetch_all_vietnam_stock_tickers() -> List[Dict[str, Any]]:
    """Lấy danh sách TOÀN BỘ hơn 1.400 cổ phiếu niêm yết trên 3 sàn HOSE, HNX, UPCoM từ VNDirect Finfo API"""
    print("📡 Đang truy vấn danh mục toàn bộ mã cổ phiếu niêm yết tại Việt Nam từ VNDirect Finfo API...")
    all_stocks = []
    page = 1
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

    while True:
        url = f"https://api-finfo.vndirect.com.vn/v4/stocks?q=type:STOCK~status:listed&size=1000&page={page}"
        try:
            r = requests.get(url, headers=headers, timeout=10).json()
            data = r.get('data', [])
            if not data:
                break
            all_stocks.extend(data)
            if len(data) < 1000:
                break
            page += 1
        except Exception as e:
            print(f"⚠️ Lỗi trang {page}: {e}")
            break

    valid_stocks = []
    seen = set()
    for s in all_stocks:
        code = s.get('code', '').strip().upper()
        if len(code) == 3 and code.isalpha() and code not in seen:
            seen.add(code)
            valid_stocks.append({
                "symbol": code,
                "company_name": s.get('companyName', f"CTCP {code}"),
                "exchange": s.get('floor', 'HOSE'),
                "sector": s.get('shortName', 'Chứng khoán Việt Nam')
            })

    print(f"✅ Đã tải thành công danh sách {len(valid_stocks):,} mã cổ phiếu trên HOSE, HNX, UPCoM!")
    return valid_stocks


def fetch_single_stock_history(s: Dict[str, Any], start_date: str) -> Optional[Dict[str, Any]]:
    """Cào toàn bộ lịch sử giá ĐÃ ĐIỀU CHỈNH (adjusted) của 1 mã qua helper dùng chung."""
    sym = s["symbol"]
    prices = fetch_price_history(sym, start_date=start_date, adjusted=True)
    if prices:
        return {"symbol": sym, "prices": prices}
    return None


def sync_full_stock_history(start_date: str = DEFAULT_START):
    start_time = time.time()

    print("================================================================================")
    print(f"🚀 BẮT ĐẦU THU THẬP & ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU THẬT (từ {start_date}) TỪ VNDIRECT VÀO POSTGRESQL")
    print("   Nguồn: VNDirect Finfo v4/stock_prices — GIÁ ĐÃ ĐIỀU CHỈNH cổ tức/chia tách (adOHLC)")
    print("================================================================================\n")

    db = PostgresDBManager()
    db.init_schema()

    stocks_list = fetch_all_vietnam_stock_tickers()

    if stocks_list:
        print(f"📦 Đang lưu danh mục {len(stocks_list):,} mã cổ phiếu vào bảng 'stocks'...")
        db.upsert_stocks(stocks_list)
        print("✅ Đã cập nhật xong bảng danh mục 'stocks'.")

    # VNDirect /v4/stocks phân trang không ổn định (có lần trả 1.090, có lần 1.398).
    # Luôn hợp nhất với danh mục đã có trong DB để không bỏ sót mã nào.
    known = {s["symbol"] for s in stocks_list}
    try:
        with db.get_connection_ctx() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT symbol FROM stocks;")
                for (sym,) in cur.fetchall():
                    if sym not in known:
                        known.add(sym)
                        stocks_list.append({"symbol": sym})
    except Exception as e:
        print(f"⚠️ Không đọc được danh mục cũ từ DB: {e}")
    print(f"📈 Tổng cộng {len(stocks_list):,} mã sẽ được đồng bộ giá.\n")

    print(f"📈 Đang cào nến giá OHLCV THẬT cho {len(stocks_list):,} mã từ VNDirect (10 Threads)...")

    success_count = 0
    empty_count = 0
    total_bars_synced = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_stock = {
            executor.submit(fetch_single_stock_history, s, start_date): s
            for s in stocks_list
        }

        for idx, future in enumerate(concurrent.futures.as_completed(future_to_stock), 1):
            s = future_to_stock[future]
            sym = s["symbol"]
            try:
                res = future.result()
                if res and res["prices"]:
                    db.upsert_prices(sym, res["prices"])
                    bars_count = len(res["prices"])
                    total_bars_synced += bars_count
                    success_count += 1
                    if idx % 50 == 0 or idx == len(stocks_list):
                        latest_close = res["prices"][-1]["close"]
                        print(f"  [Progress: {idx}/{len(stocks_list)}] ✓ {sym:<5}: {bars_count} nến (Giá: {latest_close:,.0f} đ).")
                else:
                    empty_count += 1
            except Exception:
                empty_count += 1

    elapsed = time.time() - start_time
    print("\n================================================================================")
    print("🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU THẬT VIỆT NAM!")
    print(f"Số mã có dữ liệu: {success_count:,} / {len(stocks_list):,}  (không có data: {empty_count:,})")
    print(f"Tổng số nến giá đã lưu trong PostgreSQL: {total_bars_synced:,} phiên.")
    print(f"Thời gian hoàn thành: {elapsed:.2f} giây.")
    print("================================================================================\n")


# backwards-compat alias
def sync_5year_stock_history(start_year: int = 2021, end_year: int = 2026):
    sync_full_stock_history(start_date=f"{start_year}-01-01")


if __name__ == "__main__":
    sync_full_stock_history()
