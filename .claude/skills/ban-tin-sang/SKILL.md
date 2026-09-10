---
name: ban-tin-sang
description: >-
  Dựng "Bản Tin Sáng" — bản tin thị trường chứng khoán Việt Nam buổi sáng cho
  phiên chốt gần nhất, từ dữ liệu trong stock_db. Dùng khi user gõ /ban-tin-sang,
  hoặc nói "bản tin sáng", "báo cáo sáng", "morning brief", "điểm tin thị trường
  sáng nay", "hôm nay thị trường sao". Gồm: bảng HOSE/HNX, nhận định thị trường,
  đánh giá danh mục đang nắm giữ, dòng tiền khối ngoại, cổ phiếu mạnh, sàng lọc
  reward/risk. Xuất ra artifact HTML.
---

# Bản Tin Sáng

Bản tin thị trường buổi sáng. Số liệu deterministic do `scripts/ban_tin_sang.py`
lo; phần **Nhận định thị trường** và **Danh mục** do bạn (model) viết dựa trên số
liệu đó. Kết quả publish thành artifact.

## Nguyên tắc bắt buộc

- **Không phải khuyến nghị đầu tư.** Bảng reward/risk là *"đầu ra bộ lọc cơ học"*.
  Phần danh mục *mô tả trạng thái kỹ thuật & dòng tiền*, không nói "mua/bán/giữ".
  Người viết không phải chuyên viên tư vấn tài chính có chứng chỉ. Disclaimer đã
  có sẵn trong template — đừng bỏ.
- Tiếng Việt, giọng ngắn gọn, dùng đúng số trong JSON (không bịa).
- Chưa có nguồn: tin vĩ mô/ngành, tự doanh, USD, vàng, lãi suất — template đã ghi
  rõ, không cần bịa.

## Quy trình

### 1. Kiểm tra dữ liệu mới

```bash
python3 -c "import psycopg2; c=psycopg2.connect(host='localhost',port=5432,dbname='stock_db',user='postgres',password='postgres'); cur=c.cursor(); cur.execute(\"SELECT max(trading_date) FROM stock_prices WHERE symbol<>'VNINDEX'\"); print(cur.fetchone()[0])"
```

Nếu phiên gần nhất **cũ hơn phiên giao dịch gần nhất đáng lẽ phải có** (vd hôm nay
là T5, dữ liệu chỉ tới T3), báo user và hỏi có chạy đồng bộ không:

```bash
python3 scripts/sync_daily.py --force   # ~2 phút
```

(Bình thường launchd đã đồng bộ lúc 16:00 hôm trước — sáng nay dữ liệu tới phiên
hôm qua là đúng.)

### 2. Lấy số liệu

```bash
python3 scripts/ban_tin_sang.py --data > /tmp/bts_data.json
```

Đọc file. Các khối quan trọng: `vnindex`, `hnx`, `exchanges`, `foreign_flow`
(chuỗi 5 phiên), `internals`, `psychology`, `movers_up`/`movers_down`,
`top_foreign_buy`/`top_foreign_sell`, `strong`, `reward_risk`, `portfolio`
(`rows` + tổng `pnl_pct`, `day_pct`).

### 3. Viết phần nhận định → `/tmp/bts_narr.json`

```json
{
  "market": ["<p class=\"lead\">...</p>", "<p>...</p>", "<p>...</p>", "<p>...</p>", "<p>...</p>"],
  "portfolio": ["<p>...</p>", "<p>...</p>", "<p>...</p>"]
}
```

**`market`** — 4–5 đoạn `<p>` (đoạn đầu `class="lead"`):
1. Phiên hôm qua: tăng/giảm/đi ngang bao nhiêu, thanh khoản so phiên trước, mã
   dẫn dắt vs kéo lùi (từ `movers_up`/`movers_down`).
2. Độ rộng: từ `internals` (adv_dec, pct_ma50, nh_nl) + up/dn của HOSE. Yếu hay khỏe.
3. Khối ngoại: net hôm qua + xu hướng chuỗi `foreign_flow` + top mua/bán theo mã.
4. Gauge tâm lý + biến động thực; nhắc backtest (gauge trung tính = không edge;
   Extreme Fear <40 hay "biến động thực >22" mới là tín hiệu mua tốt trong quá khứ).
5. Kịch bản phiên tới: vùng dao động (± ~0,7% quanh close), mốc MA20/MA50 của
   VN-Index (`vnindex.ma20`/`ma50`) — thủng thì tắt bộ lọc thị trường.

**`portfolio`** — 2–3 đoạn `<p>` (bỏ qua nếu `portfolio.rows` rỗng):
1. Tác động phiên: danh mục `day_pct` so với VN-Index `vnindex.ret` — mạnh/yếu/ngang hơn.
2. Mã nào khỏe nhất / yếu nhất phiên trong danh mục; mã nào bị/được khối ngoại
   động vào mạnh (`row.foreign`); vị thế kỹ thuật (`row.tech`).
3. Tổng lãi/lỗ; nếu danh mục lỗ sâu hơn index — chỉ ra vì sao (tập trung ngành
   nào, có mã nào trong nhóm dẫn dắt không). Ghi tỷ trọng các mã lớn.

Giữ mỗi đoạn 1–3 câu. Bold số/mã quan trọng bằng `<b>`. Không markdown, chỉ HTML `<p>`/`<b>`.

Nếu chỉ cần bản nhanh, bỏ bước này — script tự sinh nhận định cơ học.

### 4. Render + publish

```bash
python3 scripts/ban_tin_sang.py --narrative /tmp/bts_narr.json
```

→ ghi `artifacts/ban-tin-sang-YYYY-MM-DD.html`. Publish bằng tool Artifact:
- `file_path`: đường dẫn file vừa tạo
- `title`: `Bản Tin Sáng`
- `favicon`: `📰` (chỉ lần đầu)
- `description`: một câu, vd "Bản tin thị trường sáng <ngày> — số liệu chốt phiên <phiên>."

### 5. Tóm tắt cho user

Sau khi publish, in ở terminal ~4 dòng: link artifact + 3 gạch đầu dòng chính
(VN-Index & thanh khoản, độ rộng/khối ngoại/gauge, danh mục tác động thế nào).

## Ghi chú

- File `style.css` trong thư mục skill này là CSS của bản tin — sửa ở đó nếu cần
  đổi giao diện.
- Mỗi ngày là 1 file `artifacts/ban-tin-sang-<ngày>.html` riêng (không ghi đè),
  thư mục `artifacts/` đã gitignore.
- Chạy cho phiên cũ: `python3 scripts/ban_tin_sang.py 2026-09-09`.
