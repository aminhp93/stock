# Phiên Làm Việc #01: Viết Lại Ứng Dụng Bằng Vite, Tái Cấu Trúc Tuyến Đường & Khởi Tạo PostgreSQL Thật

- **Thời gian**: 2026-08-28
- **Tác vụ chính**:
  1. Viết lại toàn bộ frontend sang Vite + React (TypeScript) theo Minimalist Light Theme.
  2. Tái cấu trúc các tuyến đường (routes) thành **4 phân hệ chuyên biệt**:
     - `📁 1. Dữ Liệu (/data)`: Tra cứu 1,398 mã, xem bảng nến giá thô OHLCV và nút Đồng Bộ Dữ Liệu.
     - `📈 2. Biểu Đồ (/chart)`: TradingView Visualizer với nến, volume, MA20/50, RSI 14 và Gatekeeper HUD.
     - `🎛️ 3. Giả Lập (/dashboard)`: Simulation Control Room với 10 Personas người thật, Monte-Carlo 10k agents, Bull/Base/Bear, Half-Kelly, Gatekeeper 7.
     - `💰 4. Tài Chính Cá Nhân (/finance)`: Tách phần So Sánh Đầu Tư 500Tr thành trang riêng, bổ sung mục tiêu Tự Do Tài Chính (FIRE Planner 4% Rule) và Phân bổ danh mục quỹ khẩn cấp 6 tháng.
  3. **Khởi tạo Database PostgreSQL Thật (`stock_db`)**:
     - Tạo role `postgres` với password `postgres`.
     - Tạo database `stock_db` và khởi tạo schema chuẩn (`stocks`, `stock_prices`, `financial_metrics`, `macro_news`, `telegram_messages`).
     - Nạp dữ liệu 1,398 mã cổ phiếu và 14,750 nến giá (2021 – 2026).
  4. **Loại bỏ 100% Mock Fallback**: Toàn bộ hệ thống backend (`server.py`) và frontend (`api.ts`) chuyển sang chế độ **Strict Mode**, ném lỗi HTTP 503 / 500 trực tiếp nếu PostgreSQL chết hoặc thiếu dữ liệu, không sinh fake data ngầm.
  5. Cập nhật `.gitignore` và `AGENTS.md`.

---

## 📝 Yêu Cầu Của Người Dùng (User Prompts)

```
Prompt 1: viet lai app dung vite cho t. co 3 page chinh /, /chart, /dashboard
Prompt 2: de theme toi gian, theme light cho t
Prompt 3: con dung cac file trong nay k, k dung thi xoa di /Users/aminhp93/personal/githubcoffee/stock/dashboard
update .gitignore 
review xem confile nao thua k
add them 1 file AGENTS.md tom tat kien truc va cac tinh nang dang co trong project. file prompts se chua lich su cac lan lam viec. vi du nhu file nay trong prompts
Prompt 4: Fix 500 (Internal Server Error) on parallel API requests
Prompt 5: phan [Workflow & Overview](http://localhost:5173/), remvoe nhung text thua, chi giu lai text y chinh thoi
Prompt 6: sap xep lai route, phan stock t thay se bao gom cac phan: 1. data (view, sync, va update du lieu raw), 2. chart, 3. simulation dashboard - tam thoi giu nhu hien tai
Prompt 7: phan 2. So Sánh Đầu Tư 500 Triệu (2021 – 2026), tach thanh page quan ly tai chinh ca nhan
Prompt 8: connection to server at "127.0.0.1", port 5432 failed: FATAL: role "postgres" does not exist
Prompt 9: neu k ket noi duoc postgres thi bao server chet chu sao lai fake data the
```

---

## 🔍 Kết Quả Kiểm Thử (Verification)

- `python3 main.py` ➔ Pipeline 5 bước, 10 Personas, Gatekeeper 7 tiêu chuẩn chạy trực tiếp trên PostgreSQL `stock_db` thành công 100%.
- `pnpm run build` ➔ Biên dịch hoàn tất không lỗi (1,610 modules, 760ms).
- `curl -i http://localhost:5173/api/data/stats` ➔ Trả về `total_stocks: 1398`, `total_candles: 14750`, `status: ONLINE (POSTGRESQL CONNECTED)`.
