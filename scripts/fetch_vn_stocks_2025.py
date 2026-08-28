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

def fetch_vietnam_stock_tickers() -> List[Dict[str, Any]]:
    print("📡 Đang truy vấn danh mục mã cổ phiếu từ VNDirect Finfo API...")
    url = "https://api-finfo.vndirect.com.vn/v4/stocks?q=type:STOCK~status:listed&size=1000&page=1"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        r = requests.get(url, headers=headers, timeout=10).json()
        stocks = r.get('data', [])
        valid_stocks = []
        for s in stocks:
            code = s.get('code', '').strip().upper()
            if len(code) == 3 and code.isalpha():
                valid_stocks.append({
                    "symbol": code,
                    "company_name": s.get('companyName', f"CTCP {code}"),
                    "exchange": s.get('floor', 'HOSE'),
                    "sector": s.get('shortName', 'Chứng khoán Việt Nam')
                })
        print(f"✅ Đã tải danh sách {len(valid_stocks)} mã cổ phiếu!")
        return valid_stocks
    except Exception as e:
        print(f"❌ Lỗi truy vấn danh mục cổ phiếu: {e}")
        return []

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

def fetch_single_stock(s: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    sym = s["symbol"]
    try:
        df = stock_historical_data(sym, "2025-01-01", "2025-12-31", "1D")
        if df is not None and not df.empty:
            prices_data = process_and_enrich_prices(df)
            return {"symbol": sym, "prices": prices_data}
    except Exception as e:
        print(f"⚠️ Lỗi cào nến giá cho {sym}: {e}")
    return None

def sync_stock_data_2025():
    start_time = time.time()
    db = PostgresDBManager()
    db.init_schema()
    
    stocks_list = fetch_vietnam_stock_tickers()
    if not stocks_list:
        return
        
    db.upsert_stocks(stocks_list)
    print(f"📈 Đang cào dữ liệu nến giá năm 2025 cho {len(stocks_list)} mã cổ phiếu...")
    
    success_count = 0
    total_bars_synced = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_stock = {executor.submit(fetch_single_stock, s): s for s in stocks_list}
        for future in concurrent.futures.as_completed(future_to_stock):
            s = future_to_stock[future]
            try:
                res = future.result()
                if res and res["prices"]:
                    db.upsert_prices(res["symbol"], res["prices"])
                    bars_count = len(res["prices"])
                    total_bars_synced += bars_count
                    success_count += 1
            except Exception as e:
                print(f"❌ Lỗi ghi CSDL cho {s['symbol']}: {e}")
                
    elapsed = time.time() - start_time
    print(f"🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU VIỆT NAM NĂM 2025!")
    print(f"Tổng số mã thành công: {success_count}/{len(stocks_list)} | Tổng nến: {total_bars_synced:,} phiên | Thời gian: {elapsed:.2f}s")

if __name__ == "__main__":
    sync_stock_data_2025()
