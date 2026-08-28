import os
import sys
import time
import requests
import concurrent.futures
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from vnstock import stock_historical_data
from backend.db.postgres import PostgresDBManager
from backend.utils.metrics import calculate_rsi

def fetch_all_vietnam_stock_tickers() -> List[Dict[str, Any]]:
    """Lấy danh sách TOÀN BỘ hơn 1.400 cổ phiếu niêm yết trên 3 sàn HOSE, HNX, UPCoM"""
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

def process_and_enrich_prices(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []
    
    df['time'] = pd.to_datetime(df['time'])
    df = df.sort_values('time').reset_index(drop=True)
    
    close_prices = df['close'].astype(float).tolist()
    records = []
    
    for idx, row in df.iterrows():
        sub_prices = close_prices[:idx+1]
        rsi_val = calculate_rsi(sub_prices)
        ma20_val = float(np.mean(sub_prices[-20:])) if len(sub_prices) >= 20 else None
        ma50_val = float(np.mean(sub_prices[-50:])) if len(sub_prices) >= 50 else None
        
        records.append({
            "date": row['time'].strftime('%Y-%m-%d'),
            "open": float(row['open']),
            "high": float(row['high']),
            "low": float(row['low']),
            "close": float(row['close']),
            "volume": float(row['volume']),
            "rsi_14": rsi_val,
            "ma20": round(ma20_val, 2) if ma20_val else None,
            "ma50": round(ma50_val, 2) if ma50_val else None
        })
        
    return records

def fetch_single_stock_history(s: Dict[str, Any], start_date: str, end_date: str) -> Optional[Dict[str, Any]]:
    sym = s["symbol"]
    try:
        df = stock_historical_data(sym, start_date, end_date, "1D")
        if df is not None and not df.empty:
            prices_data = process_and_enrich_prices(df)
            return {"symbol": sym, "prices": prices_data}
    except Exception:
        pass
    return None

def sync_5year_stock_history(start_year: int = 2021, end_year: int = 2025):
    start_time = time.time()
    start_date = f"{start_year}-01-01"
    end_date = f"{end_year}-12-31"
    
    print("================================================================================")
    print(f"🚀 BẮT ĐẦU THU THẬP & ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU VIỆT NAM 5 NĂM ({start_year} - {end_year}) VÀO POSTGRESQL")
    print("================================================================================\n")
    
    db = PostgresDBManager()
    db.init_schema()
    
    stocks_list = fetch_all_vietnam_stock_tickers()
        
    print(f"📦 Đang lưu danh mục {len(stocks_list):,} mã cổ phiếu vào bảng 'stocks'...")
    db.upsert_stocks(stocks_list)
    print("✅ Đã cập nhật xong bảng danh mục 'stocks'.\n")
    
    print(f"📈 Đang cào nến giá OHLCV từ {start_date} đến {end_date} cho {len(stocks_list):,} mã (Parallel Workers)...")
    
    success_count = 0
    total_bars_synced = 0
    
    # Process in parallel workers
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        future_to_stock = {
            executor.submit(fetch_single_stock_history, s, start_date, end_date): s
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
                    if idx % 25 == 0 or idx == len(stocks_list):
                        print(f"  [Progress: {idx}/{len(stocks_list)}] ✓ {sym:<5}: Đã lưu {bars_count} nến giá ({start_year}-{end_year}).")
            except Exception as e:
                pass
                
    elapsed = time.time() - start_time
    print("\n================================================================================")
    print(f"🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU VIỆT NAM GIAI ĐOẠN {start_year} - {end_year}!")
    print(f"Tổng số mã cổ phiếu đã xử lý thành công: {success_count:,} / {len(stocks_list):,} mã.")
    print(f"Tổng số nến giá 5 năm đã lưu trong PostgreSQL: {total_bars_synced:,} phiên.")
    print(f"Thời gian hoàn thành: {elapsed:.2f} giây.")
    print("Bạn có thể mở TablePlus kết nối PostgreSQL (localhost:5432) để truy vấn bảng 'stock_prices'!")
    print("================================================================================\n")

if __name__ == "__main__":
    sync_5year_stock_history(2021, 2025)
