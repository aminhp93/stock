# Phiên Làm Việc #01: Viết Lại Ứng Dụng Bằng Vite, Tái Cấu Trúc Tuyến Đường, Tối Giản Navbar, Tích Hợp Tailwind CSS & Sửa Dữ Liệu Giá Bảng Điện Thật 100%

- **Thời gian**: 2026-08-28
- **Tác vụ chính**:
  1. Viết lại toàn bộ frontend sang Vite + React (TypeScript) theo Minimalist Light Theme & Tailwind CSS.
  2. **Chuẩn Hóa Giá Bảng Điện Khớp Lệnh Thật (Unadjusted Market Board Price)**:
     - **Giải thích**: Trước đó API Dchart lấy giá `adClose` (giá điều chỉnh kỹ thuật sau chia cổ tức) khiến phiên 28/08 của TCH hiển thị 12.18 (12,182 đ).
     - **Đã cập nhật**: Chuyển sang sử dụng trực tiếp **VNDirect Finfo Realtime Price API (`https://api-finfo.vndirect.com.vn/v4/stock_prices`)**, lấy chính xác **giá khớp lệnh thực tế trên bảng điện (Unadjusted Close)**:
       - **TCH (28/08)**: Mở cửa: `13,700 đ` (13.70), Cao nhất: `13,700 đ` (13.70), Thấp nhất: `13,350 đ` (13.35), Đóng cửa: **`13,400 đ` (13.40)**, Volume: `7,437,400`.
       - Đồng bộ toàn bộ các mã VN30 (`FPT`: 73,200 đ, `TCB`: 33,400 đ, `SSI`: 21,350 đ, `HPG`: 22,100 đ, `VNM`: 62,300 đ, `MWG`: 75,000 đ, `VIC`: 236,000 đ, `VCB`: 60,100 đ, `VHM`: 73,000 đ).
  3. **Tối Giản Navbar, Phân Trang & Popup Dữ Liệu**:
     - Bảng danh mục 1,398 mã với phân trang 20 dòng / trang.
     - Nút `Xem Data` mở popup Modal căn giữa, khóa cuộn màn hình, hiển thị bảng nến thật.

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
Prompt 10: update lai navbar tren cung, chi de navbar only.
Prompt 11: bo Stock Multi-Agent
Prompt 12: bo header banner tren /data
Prompt 13: bo phan Ma Co Phieu Dang Chon:
Prompt 14: bo phan nay di thoi (anh tieu de Trung Tam Quan Ly & Cap Nhat Du Lieu...)
Prompt 15: table, de pagination 20 rows
Prompt 16: sao co 500 ma, Hien thi 1 - 20 tren tong so 500 ma, co 1398 ma co ma
Prompt 17: 1. bo Bang Nen Gia & Chi So Tho o duoi, 2. button Chon doi thanh Xem Data show popup bang nen gia tho
Prompt 18: de cai dialog center, block screen
Prompt 19: dung vite vs tailwind cho class
Prompt 20: check lai tinh dung dan cua du lieu. tch hom nay la 13.40. so lieu nay o dau ra 38.523,44 đ tai sao lai le the?
Prompt 21: update lai gia ngay hom nay, 28/8 van sai
```

---

## 🔍 Kết Quả Kiểm Thử (Verification)

- `curl http://localhost:5173/api/data/raw-prices?symbol=TCH&limit=5`
  ➔ Phiên ngày **28/08/2026**: Đóng cửa chính xác **`13,400 đ` (13.40)**, Mở cửa `13,700 đ`, Thấp nhất `13,350 đ`, Cao nhất `13,700 đ`, Volume `7,437,400`.
