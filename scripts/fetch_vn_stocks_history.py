import os
import sys
import time
import requests
import concurrent.futures
from datetime import datetime
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db.postgres import PostgresDBManager
from backend.utils.metrics import calculate_rsi

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

def fetch_single_stock_history(s: Dict[str, Any], from_ts: int, to_ts: int) -> Optional[Dict[str, Any]]:
    sym = s["symbol"]
    headers = {'User-Agent': 'Mozilla/5.0'}
    url = f"https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol={sym}&from={from_ts}&to={to_ts}"
    try:
        r = requests.get(url, headers=headers, timeout=12)
        if r.status_code == 200:
            data = r.json()
            if 'c' in data and len(data['c']) > 0:
                timestamps = data['t']
                closes = [float(c) * 1000 for c in data['c']]
                opens = [float(o) * 1000 for o in data['o']]
                highs = [float(h) * 1000 for h in data['h']]
                lows = [float(l) * 1000 for l in data['l']]
                vols = [float(v) for v in data['v']]

                prices = []
                for i in range(len(closes)):
                    d_str = datetime.fromtimestamp(timestamps[i]).strftime('%Y-%m-%d')
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
                return {"symbol": sym, "prices": prices}
    except Exception:
        pass
    return None

def sync_5year_stock_history(start_year: int = 2021, end_year: int = 2026):
    start_time = time.time()
    from_ts = int(datetime(start_year, 1, 1).timestamp())
    to_ts = int(datetime(end_year, 12, 31).timestamp())
    
    print("================================================================================")
    print(f"🚀 BẮT ĐẦU THU THẬP & ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU THẬT ({start_year} - {end_year}) TỪ VNDIRECT VÀO POSTGRESQL")
    print("================================================================================\n")
    
    db = PostgresDBManager()
    db.init_schema()
    
    stocks_list = fetch_all_vietnam_stock_tickers()
        
    print(f"📦 Đang lưu danh mục {len(stocks_list):,} mã cổ phiếu vào bảng 'stocks'...")
    db.upsert_stocks(stocks_list)
    print("✅ Đã cập nhật xong bảng danh mục 'stocks'.\n")
    
    print(f"📈 Đang cào nến giá OHLCV THẬT cho {len(stocks_list):,} mã từ VNDirect (10 Threads)...")
    
    success_count = 0
    total_bars_synced = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_stock = {
            executor.submit(fetch_single_stock_history, s, from_ts, to_ts): s
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
                    if idx % 20 == 0 or idx == len(stocks_list):
                        latest_close = res["prices"][-1]["close"]
                        print(f"  [Progress: {idx}/{len(stocks_list)}] ✓ {sym:<5}: Đã nạp {bars_count} nến THẬT (Giá: {latest_close:,.0f} đ).")
            except Exception as e:
                pass
                
    elapsed = time.time() - start_time
    print("\n================================================================================")
    print(f"🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU CỔ PHIẾU THẬT VIỆT NAM GIAI ĐOẠN {start_year} - {end_year}!")
    print(f"Tổng số mã cổ phiếu đã xử lý thành công: {success_count:,} / {len(stocks_list):,} mã.")
    print(f"Tổng số nến giá THẬT đã lưu trong PostgreSQL: {total_bars_synced:,} phiên.")
    print(f"Thời gian hoàn thành: {elapsed:.2f} giây.")
    print("================================================================================\n")

if __name__ == "__main__":
    sync_5year_stock_history(2021, 2026)
