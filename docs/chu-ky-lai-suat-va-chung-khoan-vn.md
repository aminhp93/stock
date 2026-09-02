# Nghiên cứu: Chu kỳ lãi suất và chu kỳ thị trường chứng khoán Việt Nam

**Ngày thực hiện:** 01/09/2026
**Người thực hiện:** Phân tích tự động (Claude) trên máy của aminhp93
**Nguồn dữ liệu:**
- Dữ liệu giá thật: PostgreSQL `stock_db` (localhost:5432), bảng `stock_prices`, `symbol = VNINDEX`, khoảng **04/01/2021 → 28/08/2026** (1.409 phiên). Chỉ đọc (SELECT), không ghi.
- Research web: cho phần lãi suất điều hành, lãi suất huy động, và lịch sử thị trường trước 2021. Mọi số liệu web đều ghi nguồn + ngày truy cập (01/09/2026).
- Script tính toán: [`scripts/cycle_analysis.py`](../scripts/cycle_analysis.py)

> ⚠️ **ĐÂY LÀ PHÂN TÍCH NGHIÊN CỨU – KHÔNG PHẢI KHUYẾN NGHỊ ĐẦU TƯ.**
> Tài liệu không đưa ra lời khuyên mua/bán bất kỳ cổ phiếu hay chỉ số nào. Cỡ mẫu
> chu kỳ rất nhỏ (n = 3–5 trong ~20 năm); các "quy luật" nêu ra chỉ là **quan sát mô
> tả**, không phải quy luật thống kê có ý nghĩa. Xem [Phần D](#phần-d--hiện-trạng-và-kết-luận).

---

## Tóm tắt điều hành (TL;DR)

1. **Chu kỳ lãi suất VN 2018–2026 có 3 pha rõ:** (a) nới lỏng mạnh 2020 (Covid, 3 lần cắt, tái cấp vốn 6,0% → 4,0%); (b) thắt chặt dồn dập cuối 2022 (2 lần tăng trong 1 tháng, 4,0% → 6,0%); (c) đảo chiều nới lỏng nhanh 2023 (4 lần cắt trong 3 tháng, 6,0% → 4,5%). Từ **19/06/2023 đến nay (09/2026) lãi suất điều hành đứng yên ở 4,5%** — hơn 3 năm không đổi.

2. **Chu kỳ chứng khoán (tính từ DB, quy tắc ±20%):** 1 pha bull 2021 (+36%), 1 pha bear 2022 (−40%, đáy 15/11/2022), và 1 pha bull dài đang diễn ra từ 15/11/2022 (đỉnh tạm 1.928 điểm ngày 18/05/2026, +111% từ đáy). Trong pha bull dài này có 1 cú sụt ~18–19% rất nhanh do thuế quan Mỹ (04/2025) nhưng **không đủ sâu để tính là bear theo giá đóng cửa**.

3. **Ghép 2 chu kỳ – phát hiện chính:**
   - Đỉnh chứng khoán (06/01/2022) đi **TRƯỚC** lần tăng lãi suất đầu tiên (23/09/2022) khoảng **8,5 tháng**.
   - Đáy chứng khoán (15/11/2022) đi **TRƯỚC** lần cắt lãi suất đầu tiên (15/03/2023) khoảng **4 tháng**; và xảy ra chỉ ~3 tuần **SAU** lần tăng lãi suất cuối cùng (25/10/2022).
   - Sau khi NHNN bắt đầu cắt lãi suất (2023), VN-Index +1 tháng gần như đi ngang/giảm nhẹ, nhưng **+6 tháng và +12 tháng đều tăng mạnh (+16% đến +19%)**.
   - Năm 2020 thì khác: đáy thị trường (24/03/2020) gần như **trùng** với lần cắt đầu tiên (17/03/2020).

4. **Kết luận trung thực:** Mối quan hệ "cắt lãi suất → chứng khoán tăng" ở VN **có tồn tại về mặt định hướng nhưng bằng chứng YẾU để dùng làm tín hiệu giao dịch**: (a) cỡ mẫu n = 2–3 chu kỳ đầy đủ; (b) độ trễ không ổn định (thị trường lúc thì dẫn trước 4–8 tháng, lúc thì trùng); (c) lãi suất chưa bao giờ là biến duy nhất — 2022–2023 bị chi phối nặng bởi vụ Vạn Thịnh Phát/SCB, siết trái phiếu doanh nghiệp, tỷ giá; 2025–2026 bị chi phối bởi thuế quan Mỹ và câu chuyện nâng hạng FTSE.

---

# PHẦN A — Chu kỳ lãi suất Việt Nam

## A.1. Timeline lãi suất điều hành NHNN (SBV), 2018 → 2026

Đơn vị: %/năm. "TCV" = tái cấp vốn; "TCK" = tái chiết khấu; "ON liên NH" = cho vay qua đêm trong thanh toán điện tử liên ngân hàng; "Trần HĐ <6T" = trần lãi suất tiền gửi kỳ hạn 1 tháng đến dưới 6 tháng.

| Ngày hiệu lực | Động thái | TCV | TCK | ON liên NH | Trần HĐ <6T | Pha |
|---|---|---|---|---|---|---|
| (trước 2018) | Từ 07/07/2017: TCV 6,25 / TCK 4,25 | 6,25 | 4,25 | 7,0 | 5,5 | — |
| **2018** | Không thay đổi lãi suất điều hành cả năm | 6,25 | 4,25 | 7,0 | 5,5 | Giữ |
| **16/09/2019** | Cắt (lần đầu kể từ 2017) | 6,0 | 4,0 | 6,0 | 5,5 | Nới nhẹ |
| **19/11/2019** | Giảm trần huy động ngắn hạn | 6,0 | 4,0 | 6,0 | **5,0** | Nới nhẹ |
| **17/03/2020** | Cắt mạnh #1 (Covid) | **5,0** | **3,5** | **6,0** | 4,75 | **Nới lỏng mạnh** |
| **13/05/2020** | Cắt mạnh #2 (Covid) | **4,5** | **3,0** | **5,5** | 4,25 | Nới lỏng mạnh |
| **01/10/2020** | Cắt mạnh #3 (Covid) | **4,0** | **2,5** | **5,0** | **4,0** | Nới lỏng mạnh |
| 2021 | Giữ nguyên cả năm (đáy lãi suất lịch sử) | 4,0 | 2,5 | 5,0 | 4,0 | Giữ (đáy) |
| **23/09/2022** | **Tăng #1** (lần tăng đầu kể từ 2011) | **5,0** | **3,5** | **6,0** | 5,0 | **Thắt chặt** |
| **25/10/2022** | **Tăng #2** | **6,0** | **4,5** | **7,0** | 6,0 | Thắt chặt |
| ~15/12/2022 | Các NHTM "đồng thuận" trần huy động thực tế ~9,5% (không phải QĐ NHNN) | 6,0 | 4,5 | 7,0 | 6,0 | Thắt chặt (đỉnh) |
| **15/03/2023** | **Cắt #1/2023** (giảm TCK, ON) | 6,0 | **3,5** | **6,0** | 6,0 | **Nới lỏng** |
| **03/04/2023** | Cắt #2/2023 (giảm TCV) | **5,5** | 3,5 | 6,0 | 6,0 | Nới lỏng |
| **25/05/2023** | Cắt #3/2023 | **5,0** | 3,5 | **5,5** | **5,0** | Nới lỏng |
| **19/06/2023** | Cắt #4/2023 | **4,5** | **3,0** | **5,0** | **4,75** | Nới lỏng |
| 2024 | Giữ nguyên cả năm | 4,5 | 3,0 | 5,0 | 4,75 | Giữ |
| 2025 | Giữ nguyên cả năm (dù có áp lực tỷ giá) | 4,5 | 3,0 | 5,0 | 4,75 | Giữ |
| 2026 (đến 09/2026) | Giữ nguyên; 05/2026 có kỳ vọng tăng 50 đcb nhưng **không xảy ra** | 4,5 | 3,0 | 5,0 | 4,75 | Giữ |

**Nguồn (truy cập 01/09/2026):**
- 2019: [Tuổi Trẻ – "Từ ngày 16-9, NHNN giảm một loạt lãi suất điều hành"](https://tuoitre.vn/tu-ngay-16-9-ngan-hang-nha-nuoc-giam-mot-loat-cac-lai-suat-dieu-hanh-20190913142847355.htm); trần huy động 11/2019: [Báo Đầu tư – "NHNN chính thức giảm trần lãi suất huy động và cho vay từ 19/11"](https://baodautu.vn/nhnn-chinh-thuc-giam-tran-lai-suat-huy-dong-va-cho-vay-tu-ngay-mai-1911-d111226.html) (QĐ 2415/QĐ-NHNN).
- 2020: [MOF – "Tiếp tục hạ lãi suất điều hành" (13/05/2020)](https://mof.gov.vn/webcenter/portal/vclvcstc/pages_r/l/chi-tiet-tin?dDocName=MOFUCM176577); [Tuổi Trẻ – "Trần lãi suất tiền gửi dưới 6 tháng còn 4%/năm từ 1-10"](https://tuoitre.vn/tran-lai-suat-tien-gui-duoi-6-thang-con-4-nam-tu-1-10-20200930171007691.htm).
- Tăng 2022: [Chính phủ – "SBV raises interest rates by 1% to curb inflation"](https://en.baochinhphu.vn/sbv-raises-interest-rates-by-1-to-curb-inflation-11122092317005219.htm); [Central Banking – "Vietnam raises rates for second consecutive month"](https://www.centralbanking.com/central-banks/monetary-policy/7953492/vietnam-raises-rates-for-second-consecutive-month); [LuatVietnam – "SBV: Sharply increases in interests from September 23, 2022"](https://english.luatvietnam.vn/legal-updates/sbv-sharply-increases-in-interests-from-september-23-2022-892-91508-article.html).
- Cắt 2023: [Xây dựng Chính sách/Chính phủ – "Từ 3/4/2023: NHNN giảm các mức lãi suất điều hành"](https://xaydungchinhsach.chinhphu.vn/ngan-hang-nha-nuoc-tiep-tuc-giam-lai-suat-119230401064608221.htm); [VnEconomy – "NHNN tiếp tục hạ lãi suất điều hành lần thứ 3, áp dụng từ 25/5"](https://vneconomy.vn/ngan-hang-nha-nuoc-tiep-tuc-ha-lai-suat-dieu-hanh-lan-thu-3-ap-dung-tu-25-5.htm) (QĐ 950/QĐ-NHNN); [DIV – "NHNN giảm lãi suất điều hành lần thứ 4 trong năm 2023"](https://div.gov.vn/ngan-hang-nha-nuoc-giam-lai-suat-dieu-hanh-lan-thu-4-trong-nam-2023) (QĐ 1123/QĐ-NHNN, hiệu lực 19/6/2023).
- 2025–2026: [DBS/DBSVickers – "Vietnam: Refinancing rate to hold firm... (07/07/2026)"](https://www.dbsvickers.com/vickers/aics/templatedata/article/generic/data/en/GR/macro_strategy/072026/260707_vietnam.xml); [The Investor – "Vietnam's monetary policy remains accommodative: WB"](https://theinvestor.vn/vietnams-monetary-policy-remains-accommodative-wb-d16938.html); [VietnamPlus – "SBV to keep interest rates stable: Deputy Governor"](https://en.vietnamplus.vn/sbv-to-keep-interest-rates-stable-deputy-governor-post340493.vnp).

> **Lưu ý về "trần HĐ <6T" cột 2020 & 2023:** một số quyết định giảm trần huy động không cùng ngày với quyết định giảm TCV/TCK (ví dụ 25/5/2023 giảm trần về 5,0%; 19/6/2023 giảm tiếp về 4,75%). Con số trong bảng lấy mốc gần nhất, có thể lệch ±vài ngày. Trần huy động 2020 các mốc 4,75/4,25/4,0 là xấp xỉ theo QĐ 418/419 (17/3), 918/919 (13/5), 1728/1729 (1/10).

## A.2. Lãi suất huy động 12 tháng bình quân nhóm ngân hàng lớn (Big4: VCB/BIDV/CTG/Agribank)

| Thời điểm | LS huy động 12T Big4 (%/năm) | Ghi chú & nguồn |
|---|---|---|
| Cuối 2019 | ~6,8 – 7,0 | Mặt bằng trước Covid |
| Giữa 2021 | ~5,5 – 5,6 | Đáy lịch sử, chính sách nới lỏng |
| Đầu/giữa 2022 | ~5,6 – 6,0 | Bắt đầu nhích lên |
| **Cuối 2022 / đầu 2023** | **~7,4 – 8,2** (một số NHTMCP khác 9,5 – 12,5) | Đỉnh chu kỳ. Các NHTM "đồng thuận" trần ~9,5% từ 15/12/2022. Nguồn: [VietnamNet – "Lãi suất huy động gần như 'rơi tự do' trong năm 2023"](https://vietnamnet.vn/lai-suat-huy-dong-gan-nhu-roi-tu-do-trong-nam-2023-2233386.html) |
| Cuối 07/2023 | LS huy động 12T bình quân toàn hệ thống ~6,4% (−143 đcb so với cuối 2022) | Nguồn: VietnamNet (bài trên) |
| Cuối 2023 | Big4 ~4,8 – 5,0 | "Giảm xuống mức thấp lịch sử". Nguồn: [VietnamPlus – "Lãi suất tiết kiệm tại nhóm Big4 đã giảm xuống mức thấp lịch sử"](https://www.vietnamplus.vn/lai-suat-tiet-kiem-tai-nhom-big4-da-giam-xuong-muc-thap-lich-su/895239.vnp) |
| Cả năm 2024 | Big4 ~4,7 (3/4 ngân hàng còn giảm nhẹ, trong khi NHTMCP tư nhân lại tăng) | Nguồn: [VietnamNet – "Lãi suất huy động liên tục tăng, riêng nhóm big4 biến động khác thường"](https://vietnamnet.vn/lai-suat-huy-dong-lien-tuc-tang-rieng-nhom-big4-bien-dong-khac-thuong-2355923.html) |
| 06/2025 | Agribank 4,8 (cao nhất Big4); Vietcombank 4,6 (thấp nhất) | Nguồn: [CafeF – "So sánh lãi suất tiết kiệm 12 tháng nhóm Agribank, BIDV, VietinBank và Vietcombank"](https://cafef.vn/so-sanh-lai-suat-tiet-kiem-12-thang-nhom-agribank-bidv-vietinbank-va-vietcombank-ngan-hang-nao-co-lai-suat-cao-nhat-188250610203000155.chn) |
| 08/2026 | Big4 vẫn ở vùng thấp ~4,6 – 4,8; thị trường phân hóa mạnh, một số ngân hàng nhỏ đẩy 12T lên ~6 – 7,8% | Nguồn: [CafeF – bản tin lãi suất 28/8/2026](https://cafef.vn/lai-suat-ngan-hang-28-8-tai-agribank-vietcombank-bidv-vietinbank-mb-sacombank-hdbank-188260828165800896.chn) *(số Big4 08/2026 cần đối chiếu thêm; bản tin nhấn mạnh "phân hóa")* |

> ⚠️ Các con số huy động là **xấp xỉ**, do mỗi ngân hàng có nhiều mốc điều chỉnh trong năm và cách niêm yết (quầy vs online) khác nhau. Xu hướng thì rõ: **đáy 2021 (~5,5%) → đỉnh cuối 2022 (~7,5–8% Big4, ~10%+ toàn thị trường) → giảm nhanh 2023 → vùng thấp 4,6–4,8% duy trì 2024–2026.**

## A.3. Lãi suất liên ngân hàng qua đêm (VNIBOR ON)

Không có chuỗi đầy đủ trong nghiên cứu này (cần Bloomberg/Refinitiv hoặc số liệu NHNN). Các mốc định tính từ báo chí:
- 2021: rất thấp, nhiều giai đoạn 0,5 – 1,5%/năm (thanh khoản dồi dào).
- 10–11/2022: căng thẳng thanh khoản sau vụ SCB, ON có lúc vọt lên 6 – 8%/năm.
- 2023–2024: hạ nhiệt về 0,5 – 4%/năm tùy giai đoạn.
- 2025 – nửa đầu 2026: áp lực nhích lên theo tỷ giá; các báo cáo DBS nói "interbank rate pressures to ease on cooler credit growth" (10/2026), hàm ý nửa đầu 2026 lãi suất liên NH có căng. Nguồn: [DBS – "Vietnam: Interbank rate pressures to ease..."](https://www.dbs.id/id/treasures/aics/archive/templatedata/article/generic/data/en/GR/macro_strategy/012026/261009_vietnam.xml).

## A.4. Phân pha chính sách lãi suất

| Pha | Khoảng thời gian | Hướng | Biên độ TCV |
|---|---|---|---|
| P0 – Trung tính | 2018 → 08/2019 | Giữ | 6,25% |
| P1 – Nới nhẹ | 09/2019 → 02/2020 | Cắt nhẹ | 6,25 → 6,0 |
| **P2 – Nới lỏng mạnh (Covid)** | **03/2020 → 09/2020** | **Cắt mạnh** | **6,0 → 4,0** |
| P3 – Giữ đáy | 10/2020 → 08/2022 | Giữ | 4,0% |
| **P4 – Thắt chặt** | **09/2022 → 02/2023** | **Tăng mạnh** | **4,0 → 6,0** |
| **P5 – Nới lỏng** | **03/2023 → 06/2023** | **Cắt liên tiếp** | **6,0 → 4,5** |
| P6 – Giữ (nới lỏng thụ động) | 07/2023 → nay (09/2026) | Giữ | 4,5% |

**Đặc điểm chu kỳ lãi suất VN:** rất "giật cục" – NHNN có xu hướng **không điều chỉnh trong thời gian dài rồi thay đổi dồn dập** (3 lần cắt trong 7 tháng năm 2020; 2 lần tăng trong 1 tháng cuối 2022; 4 lần cắt trong 3 tháng năm 2023). Điều này khác hẳn Fed hay ECB (điều chỉnh từng bước 25 đcb theo lịch họp). Hệ quả: khó nói về "độ trễ" chính xác vì mỗi chu kỳ điều hành chỉ kéo dài vài tháng.

---

# PHẦN B — Chu kỳ thị trường chứng khoán VN

## B.1. Các pha bull/bear tính từ DB (quy tắc ±20%)

Thuật toán: alternating swing (đỉnh–đáy so le). Bear = giảm ≥20% từ đỉnh đã xác lập; Bull = tăng ≥20% từ đáy đã xác lập. Tính trên **giá đóng cửa** VN-Index. Script: [`scripts/cycle_analysis.py`](../scripts/cycle_analysis.py).

| Pha | Bắt đầu | Kết thúc | Số phiên | Số tháng | Điểm đầu | Điểm cuối | Biên độ | Max Drawdown |
|---|---|---|---|---|---|---|---|---|
| BULL | 04/01/2021¹ | 06/01/2022 | 252 | 12,1 | 1.120,5 | 1.528,6 | **+36,4%** | −14,3% |
| **BEAR** | **06/01/2022** | **15/11/2022** | **213** | **10,3** | **1.528,6** | **911,9** | **−40,3%** | **−40,3%** |
| BULL* (đang diễn ra) | 15/11/2022 | 18/05/2026² | 869² | 42,0² | 911,9 | 1.927,9² | **+111,4%²** | −18,1% |

¹ Đây là điểm đầu chuỗi dữ liệu DB, **không phải đáy thật**. Đáy Covid thật là ~660 điểm ngày 24/03/2020 (xem B.2). Vì vậy pha bull 2021 thực chất bắt đầu từ 03/2020; nếu tính từ đáy thật thì biên độ ~ +130% đến đỉnh 06/01/2022.
² "Kết thúc" ở đây là **đỉnh tạm cao nhất** trong pha, không phải điểm đảo chiều đã xác nhận. Tính đến 28/08/2026 pha bull này **chưa kết thúc** (chưa có drawdown ≥20% theo giá đóng cửa). Sau đỉnh 1.927,9 (18/05/2026), chỉ số điều chỉnh về ~1.668 (22/07/2026, −13,5%) rồi hồi lên 1.832 (28/08/2026).

**Đỉnh/đáy quan trọng (swing points) từ DB:**
- 06/01/2022 = 1.528,6 (đỉnh — ATH theo giá đóng cửa; đỉnh nội phiên 1.536,24)
- 15/11/2022 = 911,9 (đáy)
- 18/05/2026 = 1.927,9 (đỉnh mới)

## B.2. Sóng trung gian (quy tắc ±10%) — để thấy cấu trúc bên trong

Với ngưỡng 10%, DB cho **10 nhịp tăng / 9 nhịp giảm** trong 2021–2026:

| # | Pha | Bắt đầu → Kết thúc | Tháng | Biên độ |
|---|---|---|---|---|
| 1 | BEAR | 15/01/2021 → 28/01/2021 | 0,4 | −14,3% (rung lắc đầu 2021) |
| 2 | BULL | 28/01/2021 → 02/07/2021 | 5,1 | +38,7% |
| 3 | BEAR | 02/07/2021 → 19/07/2021 | 0,6 | −12,4% (bùng Covid Delta) |
| 4 | BULL | 19/07/2021 → 06/01/2022 | 5,6 | +22,9% |
| 5 | BEAR | 06/01/2022 → 16/05/2022 | 4,3 | −23,3% |
| 6–7 | dao động | 05–07/2022 | | hồi +12%, rồi −12% |
| 8 | BEAR | 25/08/2022 → 15/11/2022 | 2,7 | −29,2% (SCB/Vạn Thịnh Phát, margin call) |
| 9 | BULL | 15/11/2022 → 06/09/2023 | 9,7 | +36,6% |
| 10 | BEAR | 06/09/2023 → 31/10/2023 | 1,8 | −17,4% (tỷ giá căng, NHNN hút tín phiếu) |
| 11 | BULL | 31/10/2023 → 17/03/2025 | 16,5 | +30,0% (bull chậm, đi ngang nhiều) |
| 12 | BEAR | 17/03/2025 → 09/04/2025 | 0,8 | −18,1% (**cú sốc thuế quan Trump**) |
| 13 | BULL | 09/04/2025 → 16/10/2025 | 6,2 | **+61,5%** (hồi phục V-shape + câu chuyện nâng hạng) |
| 14 | BEAR | 16/10/2025 → 10/11/2025 | 0,8 | −10,5% |
| 15 | BULL | 10/11/2025 → 13/01/2026 | 2,1 | +20,4% |
| 16 | BEAR | 13/01/2026 → 23/03/2026 | 2,3 | −16,4% |
| 17 | BULL | 23/03/2026 → 18/05/2026 | 1,8 | +21,2% |
| 18 | BEAR* | 18/05/2026 → 22/07/2026 | 2,1 | −13,5% (đang diễn ra / đã hồi một phần) |

**Thống kê nhịp ±10% (2021–2026):** nhịp tăng trung bình 5,0 tháng (median 3,6); nhịp giảm trung bình 1,6 tháng (median 0,9). → **Nhịp giảm ở VN thường ngắn và dốc; nhịp tăng dài và thoải hơn.**

## B.3. Các chu kỳ lớn trước 2021 (từ web research — KHÔNG có trong DB)

| Chu kỳ | Đỉnh | Đáy | Biên độ giảm | Ghi chú & nguồn |
|---|---|---|---|---|
| Bong bóng 2006–2007 | **1.170,67** (12/03/2007) | — | — | Từ ~300 điểm đầu 2006 lên 1.170; P/E thị trường >30. Nguồn: [DNSE – Lịch sử chứng khoán Việt Nam](https://www.dnse.com.vn/hoc/lich-su-chung-khoan-viet-nam) |
| Sụp đổ 2008 | 1.170,67 (03/2007) | **~235,5** (24/02/2009) | **≈ −80%** | Khủng hoảng tài chính toàn cầu + lạm phát VN 2008 ~23%, lãi suất cơ bản có lúc 14%. Cuối 2008: 315,6. Nguồn: DNSE (trên); [Finhay – Chỉ số VNIndex qua các năm](https://www.finhay.com.vn/en/chi-so-vnindex-qua-cac-nam) |
| Phục hồi 2009 | ~624 (10/2009) | 235,5 (02/2009) | +165% | Gói kích cầu, hỗ trợ lãi suất 4%. Sau đó lình xình. |
| "Thập kỷ mất mát" 2010–2012 | | **~336** (06/01/2012) | | Bất động sản đóng băng, nợ xấu ngân hàng, Bầu Kiên (08/2012). Nguồn: Finhay (trên) |
| Hồi phục dài 2012–2018 | **1.204,33** (09/04/2018) | 336 (2012) | +258% | Vĩ mô ổn định, lạm phát thấp, khối ngoại mua ròng, thoái vốn NN (VNM, SAB). Nguồn: DNSE (trên) |
| Điều chỉnh 2018–2019 | 1.204,33 (04/2018) | ~880–900 (cuối 2018) | ≈ −27% | Fed tăng lãi suất, chiến tranh thương mại Mỹ–Trung giai đoạn 1. 2019 đi ngang, đóng cửa 960,99. |
| Covid crash 2020 | ~991 (22/01/2020) | **~660** (24/03/2020; 662,26 ngày 30/03) | **≈ −33%** (−27% so với 22/01 theo một số nguồn) | Crash nhanh nhất lịch sử (~2 tháng). Nguồn: [Finhay](https://www.finhay.com.vn/en/chi-so-vnindex-qua-cac-nam) |
| Bull 2020–2022 | **1.536,24** nội phiên (06/01/2022) | 660 (03/2020) | **+133%** | Lãi suất đáy lịch sử, nhà đầu tư F0, thanh khoản có phiên >2 tỷ USD. |

> **Phân định nguồn:** Toàn bộ Phần B.1 và B.2 là **số liệu tự tính từ DB** (giá đóng cửa VN-Index thật). Phần B.3 là **trích từ web** (DNSE, Finhay) — các con số đỉnh/đáy lịch sử này được nhiều nguồn lặp lại nhưng ngày chính xác có thể lệch ±vài phiên tùy nguồn dùng giá đóng cửa hay nội phiên.

## B.4. Thống kê độ dài chu kỳ (gộp DB + web)

**Chu kỳ lớn (±20% hoặc tương đương), ~2007–2026:**

| Loại pha | Các lần | Độ dài (tháng) | Trung bình | Median |
|---|---|---|---|---|
| BULL lớn | 2009 hồi (≈8th), 2012–2018 (≈74th), 2020–2022 (≈22th), 2022–2026 (≥42th, đang chạy) | 8 / 74 / 22 / 42+ | ~36 | ~32 |
| BEAR lớn | 2007–2009 (≈24th), 2018 (≈8th), 2020 Covid (≈2th), 2022 (≈10th) | 24 / 8 / 2 / 10 | ~11 | ~9 |

**Nhận xét:** pha bull VN thường **dài gấp 3–4 lần** pha bear. Bear VN có 2 kiểu: (a) sụp nhanh do sốc bên ngoài (2020: 2 tháng; 2018: 8 tháng), (b) bào mòn do vấn đề nội tại (2007–2009: 2 năm). n rất nhỏ (4 bull + 4 bear), **không đủ để nói về "chu kỳ trung bình" một cách chắc chắn.**

---

# PHẦN C — Ghép hai chu kỳ (phần quan trọng nhất)

## C.1. Bảng phản ứng VN-Index quanh mỗi lần đảo chiều chính sách lãi suất

Số liệu tính từ DB (chỉ có từ 2021). "% Δ" = thay đổi VN-Index so với mức tại ngày sự kiện T.

| Ngày T | Sự kiện | VNI(T) | −6th | −3th | −1th | **+1th** | **+3th** | **+6th** | **+12th** |
|---|---|---|---|---|---|---|---|---|---|
| 23/09/2022 | **Tăng #1** (TCV 4,0→5,0) | 1.203 | +24% | −1,5% | +6% | **−18%** | **−15%** | **−13%** | −0,9% |
| 25/10/2022 | **Tăng #2** (TCV 5,0→6,0) | 998 | +34% | +19% | +18% | −5% | +12% | +4% | +10% |
| 15/03/2023 | Cắt #1/2023 (TCK 4,5→3,5) | 1.062 | +17% | −1% | −2% | −1% | +5% | **+17%** | **+19%** |
| 03/04/2023 | Cắt #2/2023 (TCV 6,0→5,5) | 1.079 | +1% | −3% | −5% | −4% | +4% | +7% | **+19%** |
| 25/05/2023 | Cắt #3/2023 (TCV 5,5→5,0) | 1.065 | −11% | −1% | −3% | +6% | +12% | +2% | **+19%** |
| 19/06/2023 | Cắt #4/2023 (TCV 5,0→4,5) | 1.105 | −6% | −7% | −4% | +6% | +10% | −1% | **+16%** |

**Đọc bảng:**
- **Quanh 2 lần TĂNG lãi suất (2022):** thị trường **đã giảm mạnh TRƯỚC đó rồi tiếp tục giảm** sau lần tăng #1 (−18% sau 1 tháng). Nhưng lần tăng #2 (25/10) gần như **trùng đáy** — sau đó +1 tháng chỉ −5%, +3 tháng đã +12%. Nghĩa là **đợt tăng lãi suất cuối cùng ≈ tín hiệu tạo đáy** (nhưng chỉ 1 quan sát).
- **Quanh 4 lần CẮT lãi suất (2023):** ngắn hạn (+1 tháng) thị trường **đi ngang hoặc giảm nhẹ** với 2 lần cắt đầu (thị trường đã chạy trước, và tháng 3–4/2023 lình xình). Nhưng **+6 tháng và +12 tháng đều dương mạnh (+16% đến +19%)** ở cả 4 mốc → tín hiệu trung hạn nhất quán trong chu kỳ này.
- ⚠️ 4 lần cắt 2023 chỉ cách nhau vài tuần nên **+12 tháng của cả 4 mốc gần như trùng nhau về mặt kinh tế** — thực chất chỉ là **1 quan sát**, không phải 4.

## C.2. Thị trường tạo đáy TRƯỚC hay SAU khi NHNN cắt lãi suất?

| Chu kỳ | Đáy thị trường | Lần cắt lãi suất đầu tiên của chu kỳ nới lỏng | Độ lệch |
|---|---|---|---|
| 2008–2009 | 24/02/2009 (~235) | NHNN hạ lãi suất cơ bản mạnh từ **10/2008** (14%→ giảm dần tới 7% giữa 2009) | Thị trường tạo đáy **~4 tháng SAU** khi bắt đầu cắt (cắt dẫn trước) |
| 2011–2012 | 06/01/2012 (~336) | Cắt lãi suất đầu tiên **13/03/2012** | Thị trường tạo đáy **~2 tháng TRƯỚC** lần cắt đầu |
| 2020 (Covid) | 24/03/2020 (~660) | Cắt Covid #1 **17/03/2020** | **Gần như trùng** (đáy sau lần cắt đầu ~1 tuần; còn 2 lần cắt nữa vào 5 và 10/2020 khi thị trường đã hồi mạnh) |
| 2022–2023 | 15/11/2022 (~912) | Cắt #1/2023 **15/03/2023** | Thị trường tạo đáy **~4 tháng TRƯỚC** lần cắt đầu; và ~3 tuần **SAU** lần TĂNG cuối cùng (25/10/2022) |

**Trả lời trực tiếp:**
- Trong **2/4 chu kỳ** (2012, 2022–23), thị trường tạo đáy **TRƯỚC** khi NHNN cắt lãi suất, độ trễ **~2–4 tháng**.
- Trong **1/4 chu kỳ** (2020), gần như **trùng**.
- Trong **1/4 chu kỳ** (2008–09), thị trường tạo đáy **SAU** khi bắt đầu cắt ~4 tháng.
- **"Độ trễ trung bình" ≈ thị trường dẫn trước 0–2 tháng, nhưng phương sai lớn hơn cả giá trị trung bình → con số trung bình gần như vô nghĩa với n = 4.**

Một cách diễn giải hợp lý hơn: **lần TĂNG lãi suất cuối cùng của chu kỳ thắt chặt** có vẻ trùng với vùng đáy tốt hơn là lần cắt đầu tiên (đúng cho 2022; 2008 lãi suất cơ bản đạt đỉnh 14% vào 06/2008, đáy TT 02/2009 — lệch 8 tháng, kém hơn). Vẫn chỉ 1–2 quan sát.

## C.3. Đỉnh thị trường và chu kỳ tăng lãi suất

| Chu kỳ | Đỉnh thị trường | Lần tăng lãi suất đầu tiên | Độ lệch |
|---|---|---|---|
| 2007 | 12/03/2007 (1.171) — và một đỉnh kép ~10/2007 | Thắt chặt tiền tệ VN rõ từ **đầu 2008** (dự trữ bắt buộc, tín phiếu bắt buộc 03/2008) | Thị trường tạo đỉnh **~3–10 tháng TRƯỚC** khi thắt chặt mạnh |
| 2018 | 09/04/2018 (1.204) | NHNN **không tăng** lãi suất điều hành 2018; nhưng Fed tăng 4 lần/2018 | Đỉnh VN trùng đợt Fed hawkish + căng thẳng thương mại |
| 2022 | 06/01/2022 (1.529) | Tăng #1 **23/09/2022** | Thị trường tạo đỉnh **~8,5 tháng TRƯỚC** lần tăng đầu tiên |

**Trả lời:** thị trường VN có xu hướng **tạo đỉnh TRƯỚC khi NHNN bắt đầu tăng lãi suất khá lâu (3–8 tháng)**, vì (a) NHNN thường phản ứng chậm/sau khi lạm phát & tỷ giá đã xấu, (b) thị trường đã "ngửi" thấy thanh khoản toàn cầu thắt lại (Fed) trước. Năm 2022 rất điển hình: Fed bắt đầu tăng 03/2022, VN-Index tạo đỉnh 01/2022, NHNN mới tăng 09/2022.

## C.4. Cỡ mẫu và mức độ tin cậy — PHẢI đọc

- **Số chu kỳ lãi suất đầy đủ (nới → thắt → nới) từ 2000:** chỉ khoảng **3** (2008–09, 2011–12, 2020–2023). Cộng thêm giai đoạn 2018 (Fed-driven, NHNN không đổi).
- **Số chu kỳ bull/bear lớn của VN-Index:** ~**4 cặp**.
- Với n = 3–4, **mọi con số "trung bình độ trễ", "median", "xác suất"** đều không có ý nghĩa thống kê. Khoảng tin cậy rộng hơn bản thân ước lượng.
- Những gì nêu ở C.1–C.3 là **quan sát mô tả** ("trong các lần đã xảy ra, điều X diễn ra") — **KHÔNG phải suy luận nhân quả** ("cắt lãi suất khiến thị trường tăng") và **KHÔNG phải dự báo** ("lần sau cũng vậy").
- Chỉ có **2 chu kỳ** (2020, 2022–23) nằm trong DB để tự kiểm chứng bằng dữ liệu giá thật. Phần còn lại dựa vào web, độ chính xác ngày tháng thấp hơn.

## C.5. Các yếu tố gây nhiễu (lãi suất KHÔNG phải biến duy nhất)

| Yếu tố | Giai đoạn tác động mạnh | Ảnh hưởng đến TT |
|---|---|---|
| **Tăng trưởng tín dụng & "room"** | Liên tục; đặc biệt 2022 (cạn room giữa năm), 2024–2026 (đẩy mạnh ~15–16%/năm) | Quyết định thanh khoản thực tế vào TTCK, nhiều khi mạnh hơn lãi suất chính sách |
| **Vụ Vạn Thịnh Phát / SCB** | 08–11/2022 (bắt bà Trương Mỹ Lan 08/10/2022) | Cú sốc niềm tin lớn nhất; margin call dây chuyền; đáy 15/11/2022 chủ yếu do việc này chứ không phải do lãi suất |
| **Siết trái phiếu doanh nghiệp (NĐ 65, sau đó NĐ 08)** | 2022–2023 | ~300 nghìn tỷ TPDN BĐS đáo hạn 2023–2024; khủng hoảng thanh khoản DN BĐS; kéo dài đà giảm 2022 và làm phục hồi 2023 chậm |
| **Tỷ giá USD/VND** | 2022 (VND −8–9%), 2024, 2025 (VND −3,4%), nửa đầu 2026 | NHNN nhiều lúc phải hút thanh khoản/bán USD → thắt tiền gián tiếp dù không tăng lãi suất chính sách (rõ nhất Q3/2023 và 2025) |
| **Dòng vốn ngoại** | Bán ròng kỷ lục 2024 (~3,7 tỷ USD) và **2025 (~5,1 tỷ USD)** | Áp lực bán lớn; nhưng TT vẫn tăng nhờ dòng nội → cho thấy vai trò khối ngoại giảm. Nguồn: [Techprofit](https://techprofit.vn/4-nguyen-nhan-khoi-ngoai-tiep-tuc-ban-rong/1773990967602); [Fili/Vietstock – "Áp lực tỷ giá USD/VND năm 2026"](https://fili.vn/2026/01/ap-luc-ty-gia-usdvnd-nam-2026-se-den-tu-dau-757-1385729.htm) |
| **Nâng hạng thị trường** | Kỳ vọng từ 2023; **FTSE xác nhận 07/10/2025, hiệu lực 21/09/2026** (frontier → secondary emerging) | Động lực chính của sóng tăng 2025–2026; kỳ vọng dòng vốn thụ động ~1–1,5 tỷ USD. Nguồn: [The Investor – "FTSE Russell confirms Vietnam's upgrade... from Sept 21"](https://theinvestor.vn/ftse-russell-confirms-vietnams-market-status-upgrade-to-secondary-emerging-from-sept-21-d18799.html); [LSEG – FTSE Russell country classification, 07/10/2025](https://www.lseg.com/en/media-centre/press-releases/ftse-russell/2025/ftse-russell-country-classification-september-2025) |
| **Thuế quan Mỹ (Trump)** | 02–04/2025 (đe dọa thuế 46% với VN), sau đó đàm phán | Gây cú sụt −18% trong 16 phiên (đáy 09/04/2025 ~1.094); hồi phục nhanh sau khi có tin hoãn/đàm phán. Nguồn: [The Investor – "VN-Index records sharpest fall in history..."](https://theinvestor.vn/vietnams-benchmark-vn-index-records-sharpest-fall-in-history-following-president-trumps-tax-announcement-d15138.html) |
| **Định giá & chu kỳ lợi nhuận DN** | Luôn | 2007 P/E >30 (bong bóng); 2022 và 2025 P/E ~13–15 (hợp lý) — điểm xuất phát định giá ảnh hưởng biên độ chu kỳ |

**Kết luận C.5:** trong 2 chu kỳ gần nhất nằm trong DB, **biến chi phối lớn nhất KHÔNG phải lãi suất điều hành**: 2022 là vụ SCB + TPDN; 2025–2026 là thuế quan + nâng hạng. Lãi suất là "gió xuôi/ngược" nền, không phải yếu tố quyết định thời điểm.

---

# PHẦN D — Hiện trạng và kết luận

## D.1. Vị trí hiện tại (tính đến 28/08/2026, dữ liệu DB + web)

| Chỉ báo | Trạng thái 09/2026 |
|---|---|
| **Lãi suất điều hành** | Pha **GIỮ** (nới lỏng thụ động). TCV 4,5% từ 19/06/2023 — **hơn 38 tháng không đổi**, gần đáy lịch sử. Kỳ vọng thị trường: giữ nguyên hết 2026. Rủi ro nghiêng về phía **tăng nhẹ** (tỷ giá, tín dụng nóng) hơn là cắt. |
| **Lãi suất huy động 12T Big4** | Vùng thấp ~4,6–4,8%. Thị trường phân hóa, ngân hàng nhỏ nhích lên. |
| **Tỷ giá** | VND chịu áp lực giảm giá nhẹ (2025 −3,4%); kỳ vọng 2026 dịu hơn nhờ dòng vốn nâng hạng. |
| **VN-Index** | **1.832,1** (28/08/2026). Đang trong **pha bull lớn kéo dài từ 15/11/2022** (+101% từ đáy, +42 tháng). Cách đỉnh lịch sử 1.927,9 (18/05/2026) khoảng −5%. |
| **Sóng ngắn hạn** | Vừa trải qua nhịp điều chỉnh −13,5% (18/05 → 22/07/2026, về ~1.668), sau đó hồi 7 phiên liên tiếp cuối 08/2026 (+5,5% trong tháng). Nguồn: [Thời báo Tài chính VN](https://thoibaotaichinhvietnam.vn/chung-khoan-tuan-cuoi-thang-8-2026-dong-tien-tro-lai-vn-index-se-tai-thu-suc-moc-1-800-diem-202776.html) |
| **Chất xúc tác gần** | Hiệu lực nâng hạng FTSE **21/09/2026** (đã được thị trường "định giá trước" phần lớn trong 2025–2026). |

**Diễn giải chu kỳ:** VN-Index đang ở **giai đoạn cuối/chín của một pha bull dài** xét theo thời gian (42+ tháng, dài hơn bull 2020–2022) và mức tăng (+100%+). Nhưng "chín theo thời gian" **không phải tín hiệu đảo chiều** — bull 2012–2018 kéo dài 74 tháng. Lãi suất nền vẫn thấp và ổn định, không tạo áp lực thắt chặt như cuối 2022.

## D.2. Kết luận trung thực: quan hệ lãi suất – chứng khoán VN có đủ nhất quán để làm tín hiệu giao dịch không?

**Không. Bằng chứng ở mức YẾU–TRUNG BÌNH, không đủ để dùng làm tín hiệu giao dịch cơ học.** Cụ thể:

**Những gì có cơ sở (định hướng đúng, nhất quán qua các chu kỳ):**
1. Môi trường lãi suất **giảm và thấp** đi kèm với các pha bull lớn (2009, 2020–2022, 2023–2026). Môi trường lãi suất **tăng nhanh** đi kèm bear (2008, 2022). Đây là quan hệ nền vững, phù hợp lý thuyết (chi phí vốn, chiết khấu dòng tiền, dịch chuyển tiền gửi ↔ cổ phiếu).
2. Trong chu kỳ 2022–2023: sau khi NHNN cắt lãi suất, VN-Index **+6 và +12 tháng đều dương mạnh** (+16–19%). Nhất quán — nhưng chỉ là **1 chu kỳ**.
3. Đỉnh thị trường thường **đi trước** đợt tăng lãi suất của NHNN nhiều tháng (NHNN phản ứng trễ).

**Những gì KHÔNG có cơ sở để giao dịch:**
1. **Độ trễ không ổn định:** đáy thị trường lúc trước lần cắt đầu 2–4 tháng (2012, 2022), lúc trùng (2020), lúc sau 4 tháng (2008). Không có "con số ngày" đáng tin.
2. **Cỡ mẫu n = 3–4 chu kỳ.** Không thể backtest có ý nghĩa. Bất kỳ "chiến lược" nào khớp 3 điểm dữ liệu đều là overfit.
3. **Lãi suất điều hành thường không phải biến quyết định thời điểm.** 2022 là SCB/TPDN; 2025 là thuế quan; 2018 là Fed. Nếu chỉ nhìn lãi suất NHNN sẽ bỏ lỡ nguyên nhân chính.
4. **NHNN điều hành "giật cục"** (đứng yên nhiều năm rồi đổi dồn dập) → khi có tín hiệu cắt/tăng thì thị trường thường đã phản ứng xong phần lớn.
5. **Tín hiệu tốt nhất trong quá khứ ("lần tăng lãi suất cuối cùng ≈ đáy") chỉ đúng rõ 1 lần (2022)** và **chỉ biết được là "lần cuối" khi nhìn lại**.

**Cách dùng hợp lý (trong khuôn khổ nghiên cứu, không phải khuyến nghị):** coi pha lãi suất là **bối cảnh/xác suất nền** (regime filter) — "đang nới lỏng + lãi suất thấp" là gió xuôi cho cổ phiếu, "đang thắt chặt nhanh" là gió ngược — chứ **không phải tín hiệu vào/ra lệnh theo ngày**. Và luôn kết hợp với: tăng trưởng tín dụng, tỷ giá, dòng vốn ngoại, sự kiện đặc thù, định giá.

## D.3. Giới hạn của phân tích này

- DB chỉ có VN-Index từ **01/2021**; chỉ 2 chu kỳ lãi suất nằm trong đó (2020 một phần, 2022–2023 đầy đủ).
- Phần trước 2021 hoàn toàn dựa vào web (DNSE, Finhay, báo chí) — ngày/điểm số đỉnh đáy có thể lệch ±vài phiên; không kiểm chứng được bằng dữ liệu gốc.
- Chưa đưa vào: chuỗi lạm phát CPI theo tháng, chuỗi tăng trưởng tín dụng theo tháng, chuỗi tỷ giá trung tâm, giá trị mua/bán ròng khối ngoại theo tháng, lãi suất liên ngân hàng. Đây đều là biến cần có để phân tích đa biến nghiêm túc.
- Quy tắc ±20% là một lựa chọn tùy ý; ngưỡng khác (15%, 25%) sẽ cho số pha khác.
- Số liệu lãi suất huy động Big4 là xấp xỉ, tổng hợp từ nhiều bản tin ở các thời điểm khác nhau.
- Các số liệu 2025–2026 lấy từ web tại thời điểm truy cập 01/09/2026, có thể được điều chỉnh về sau.

## D.4. Đề xuất mở rộng nghiên cứu (nếu tiếp tục)

1. Nạp thêm vào DB: CPI theo tháng, tăng trưởng tín dụng theo tháng, tỷ giá USD/VND trung tâm & tự do, giá trị ròng khối ngoại theo phiên → chạy hồi quy VN-Index return theo các biến này với độ trễ.
2. Lấy chuỗi VN-Index dài từ 2000 (nguồn ngoài) để có thêm chu kỳ 2007–2009, 2012, 2018.
3. Kiểm định event-study chuẩn: cửa sổ [−60, +120] phiên quanh mỗi quyết định lãi suất, tính CAR (cumulative abnormal return) so với một mô hình cơ sở.
4. So sánh với các thị trường frontier/EM khác trong cùng cửa sổ để tách phần "toàn cầu" khỏi phần "VN".

---

## Phụ lục: cách tái tạo kết quả

```bash
# Chỉ đọc DB, in bảng chu kỳ + bảng phản ứng lãi suất + chuỗi VN-Index cuối tháng
PYTHONPATH=. python3 scripts/cycle_analysis.py
```

Script: [`scripts/cycle_analysis.py`](../scripts/cycle_analysis.py). Không ghi vào DB. Các mốc lãi suất được hard-code trong biến `RATE_EVENTS` (nguồn ở Phần A.1).
