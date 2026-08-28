# Phiên Làm Việc #01: Viết Lại Ứng Dụng Bằng Vite, Tái Cấu Trúc Tuyến Đường & Thêm Phân Hệ Tài Chính Cá Nhân

- **Thời gian**: 2026-08-28
- **Tác vụ chính**:
  1. Viết lại toàn bộ frontend sang Vite + React (TypeScript) theo Minimalist Light Theme.
  2. Tái cấu trúc các tuyến đường (routes) thành **4 phân hệ chuyên biệt**:
     - `📁 1. Dữ Liệu (/data)`: Tra cứu 1,403 mã, xem bảng nến giá thô OHLCV và nút Đồng Bộ Dữ Liệu.
     - `📈 2. Biểu Đồ (/chart)`: TradingView Visualizer với nến, volume, MA20/50, RSI 14 và Gatekeeper HUD.
     - `🎛️ 3. Giả Lập (/dashboard)`: Simulation Control Room với 10 Personas người thật, Monte-Carlo 10k agents, Bull/Base/Bear, Half-Kelly, Gatekeeper 7.
     - `💰 4. Tài Chính Cá Nhân (/finance)`: Tách phần So Sánh Đầu Tư 500Tr thành trang riêng, bổ sung mục tiêu Tự Do Tài Chính (FIRE Planner 4% Rule) và Phân bổ danh mục quỹ khẩn cấp 6 tháng.
  3. Cập nhật `server.py` bổ sung `/api/data/stats`, `/api/data/raw-prices`, `/api/data/sync` và hỗ trợ đa luồng `ThreadingHTTPServer`.
  4. Cập nhật `.gitignore` và `AGENTS.md`.

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
```

---

## 🛠️ Danh Sách 4 Phân Hệ Sau Khi Tách

| Route | Tên Phân Hệ | Chức Năng Chính |
|---|---|---|
| `/data` | **1. Dữ Liệu (Data Hub)** | Thống kê 1,403 mã CP, 464k nến giá, xem bảng raw OHLCV, nút Sync on-demand |
| `/chart` | **2. Biểu Đồ (TradingView)** | Đồ thị nến tương tác, Volume, MA20/MA50, RSI 14, Sidebar Gatekeeper |
| `/dashboard` | **3. Giả Lập (Simulation)** | 10 Personas người thật, Monte-Carlo 10k agents, Bull/Base/Bear, Half-Kelly, Gatekeeper 7 |
| `/finance` | **4. Tài Chính Cá Nhân** | Mô phỏng lãi kép 500Tr, Kế hoạch FIRE (Quy tắc 4%), Quỹ khẩn cấp 6 tháng & Phân bổ tài sản |

---

## 🔍 Kết Quả Kiểm Thử (Verification)

- `pnpm run build` ➔ Thành công 100% (1,610 modules, 0 errors).
- Các API endpoints đều hoạt động ổn định trên `ThreadingHTTPServer`.
- Dev servers: `http://localhost:5173/finance`
