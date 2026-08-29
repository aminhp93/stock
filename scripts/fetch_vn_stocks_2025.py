"""DEPRECATED — dùng scripts/fetch_vn_stocks_history.py.

Trước đây script này cào riêng năm 2025 qua thư viện `vnstock` (giá THÔ, chưa
điều chỉnh cổ tức) và ghi đè lên cùng bảng `stock_prices` mà bulk-sync dùng
nguồn khác -> gây lệch chuỗi lịch sử ("nến ma" ngày lễ). Toàn bộ đường nạp giá
giờ đi qua một helper duy nhất: backend/utils/price_ingest.py.
"""

import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.fetch_vn_stocks_history import sync_full_stock_history

if __name__ == "__main__":
    print("⚠️  fetch_vn_stocks_2025.py đã ngừng dùng — chạy đồng bộ FULL (đã điều chỉnh) thay thế.\n")
    sync_full_stock_history()
