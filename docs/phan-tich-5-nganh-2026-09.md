# Phân tích 5 nhóm ngành: Chứng khoán, Ngân hàng, Bất động sản, Thép, Đầu tư công

**Ngày phân tích:** 01/09/2026
**Nguồn dữ liệu giá:** PostgreSQL `stock_db` (localhost), giá điều chỉnh, phiên gần nhất **28/08/2026**, khoảng dữ liệu 04/01/2021 → 28/08/2026, ~1.399 mã.
**Script tái lập:** [`scripts/sector_momentum_analysis.py`](../scripts/sector_momentum_analysis.py) (chỉ SELECT, không ghi DB).

> ⚠️ **ĐÂY LÀ PHÂN TÍCH DỮ LIỆU, KHÔNG PHẢI TƯ VẤN ĐẦU TƯ.** Báo cáo không đưa khuyến nghị mua/bán/nắm giữ, không đặt giá mục tiêu. Người đọc tự chịu trách nhiệm quyết định và nên tham khảo chuyên gia tư vấn được cấp phép. Hiệu suất quá khứ không dự báo tương lai.

---

## 0. Phương pháp & giới hạn (đọc trước)

| Vấn đề | Cách xử lý |
|---|---|
| DB **không có** trường phân ngành chuẩn (cột `sector` chỉ là tên gọi tắt công ty) | Rổ ngành được **dựng thủ công** theo danh sách mã. **Không phải** chỉ số ngành chính thức (ICB/GICS/VNAllShare). |
| DB **không có** vốn hóa / khối lượng niêm yết | Chỉ số ngành = **bình quân giản đơn (equal-weight)** giá điều chỉnh đã chuẩn hóa: mỗi mã rebase = 100 tại phiên chung đầu tiên, rồi lấy trung bình cộng ngang quyền. Mã nhỏ có trọng số bằng mã lớn → chỉ số này **không** phản ánh đúng biến động "tiền thật" của ngành theo vốn hóa. |
| C4G, HT1 không có trong DB | Loại khỏi rổ Đầu tư công. |
| Đáy ngành | Giá trị nhỏ nhất của chỉ số ngành trong toàn khoảng dữ liệu DB. Mỗi ngành có đáy riêng (không dùng chung đáy VN-Index). |
| "Đỉnh lịch sử" | Chỉ trong phạm vi dữ liệu DB (từ 2021), không phải đỉnh mọi thời đại tuyệt đối. |
| Nhóm Ngân hàng | Đáy chỉ số rơi vào 28/01/2021 — đây là **hiện tượng kỹ thuật do điều chỉnh cổ tức/chia tách** dồn về đầu chuỗi dữ liệu, không phải "đáy thị giá" thực. Báo cáo trình bày **cả** mốc 15/11/2022 (đáy thị trường chung) để so sánh nhất quán. |

**Rổ mã tự dựng:**

- **Chứng khoán (12):** SSI, VND, VCI, HCM, VIX, SHS, MBS, FTS, BSI, CTS, AGR, ORS
- **Ngân hàng (18):** VCB, BID, CTG, TCB, MBB, VPB, ACB, HDB, STB, VIB, TPB, SHB, LPB, MSB, OCB, EIB, SSB, NAB
- **Bất động sản nhà ở (12):** VHM, VIC, VRE, NVL, PDR, DXG, KDH, NLG, DIG, CEO, HDC, IJC
- **BĐS Khu công nghiệp (3):** KBC, SZC, IDC *(tách riêng — động lực khác BĐS nhà ở)*
- **Thép (8):** HPG, HSG, NKG, TVN, SMC, POM, VGS, TLH
- **Đầu tư công (10):** VCG, HHV, LCG, FCN, CII, KSB, PLC, DHA, BCC, BTS *(xây dựng hạ tầng + đá + xi măng)*

---

## 1. PHẦN 1 — Hiệu suất đo từ dữ liệu thật (DB)

### 1.1. Tham chiếu VN-Index (số liệu DB)

| Chỉ tiêu | Giá trị |
|---|---|
| VN-Index hiện tại (28/08/2026) | **1.832,1** |
| Đáy trong DB | 911,9 — ngày **15/11/2022** |
| Đỉnh trong DB | 1.927,9 — ngày **18/05/2026** |
| Cách đỉnh DB | **−5,0%** |
| Tăng từ đáy 15/11/2022 | **+100,9%** (≈ 45 tháng) |
| Hiệu suất 1 tháng | +7,5% |
| Hiệu suất 3 tháng | −1,7% |
| Hiệu suất 6 tháng | −2,6% |
| Hiệu suất 1 năm | +9,0% |
| YTD 2026 | +2,7% |

> Đọc nhanh: VN-Index đang **đi ngang/tích lũy dưới đỉnh** (chỉ cách đỉnh 5%), bật +7,5% trong tháng gần nhất nhưng 3–6 tháng vẫn âm nhẹ. Thị trường chung chưa breakout.

### 1.2. Bảng tổng hợp chỉ số ngành (equal-weight, rebase 100)

**A. Mức tăng từ đáy & vị trí so với đỉnh**

| Ngành | Đáy (ngày) | Chỉ số đáy → hiện tại | % từ đáy | Số tháng | VN-Index cùng kỳ | Alpha (điểm %) | Đỉnh DB | Cách đỉnh DB |
|---|---|---|---|---|---|---|---|---|
| Chứng khoán | 15/11/2022 | 75,2 → 248,1 | **+229,8%** | 45,4 | +100,9% | **+128,9** | 04/09/2025 | **−35,1%** |
| Ngân hàng | 28/01/2021¹ | 81,7 → 237,7 | **+191,1%** | 67,0 | +78,9% | +112,2 | 21/08/2025 | **−8,6%** |
| — Ngân hàng (từ 15/11/2022) | 15/11/2022 | 90,8 → 237,7 | **+161,9%** | 45,4 | +100,9% | +61,0 | — | — |
| BĐS nhà ở² | 15/11/2022 | 71,2 → 133,1 | **+86,9%** | 45,4 | +100,9% | **−14,0** | 07/01/2022 | **−50,1%** |
| BĐS Khu công nghiệp | 15/11/2022 | 76,7 → 137,4 | **+79,1%** | 45,4 | +100,9% | **−21,8** | 03/03/2022 | **−39,9%** |
| Thép | 15/11/2022 | 49,2 → 107,9 | **+119,1%** | 45,4 | +100,9% | +18,2 | 28/10/2021 | **−59,7%** |
| Đầu tư công | 15/11/2022 | 49,9 → 88,1 | **+76,5%** | 45,4 | +100,9% | **−24,5** | 11/01/2022 | **−55,9%** |

¹ Đáy 28/01/2021 là hiện tượng do điều chỉnh cổ tức (xem mục 0). Dòng dưới dùng mốc 15/11/2022 để so sánh nhất quán với các ngành khác.
² Chỉ số BĐS nhà ở bị chi phối rất mạnh bởi **VIC (+1.083% từ đáy 12/02/2025)** và **VHM (+339% từ đáy 05/08/2024)**. Bỏ 2 mã này, phần còn lại của rổ (NVL, PDR, DXG, KDH, DIG, CEO, HDC…) vẫn **rất gần đáy** — xem bảng 1.4.

**B. Hiệu suất nhiều khung & trạng thái kỹ thuật (trên chỉ số ngành)**

| Ngành | 1T | 3T | 6T | 1 năm | YTD 2026 | Giá/MA50 | Giá/MA200 | RSI(14) | Biến động 60p (năm hóa) |
|---|---|---|---|---|---|---|---|---|---|
| Chứng khoán | +8,7% | −3,4% | −12,8% | **−32,7%** | −11,4% | −1,5% | −6,7% | 54,2 | **36,3%** |
| Ngân hàng | +4,8% | +0,4% | +0,7% | −4,5% | **+4,6%** | +0,4% | +2,9% | 58,3 | **15,1%** |
| BĐS nhà ở | +9,6% | −6,1% | −2,2% | −12,3% | −10,7% | +2,2% | −3,3% | 61,8 | 25,9% |
| BĐS KCN | +2,7% | −12,6% | −28,5% | −27,7% | −16,4% | −2,9% | −16,3% | 45,5 | 23,5% |
| Thép | +3,7% | −13,7% | −19,5% | −20,8% | −14,8% | −2,8% | −12,5% | 49,7 | 23,2% |
| Đầu tư công | +5,5% | −7,3% | −17,6% | −23,2% | **−20,5%** | −1,6% | −12,6% | 48,6 | 17,4% |

**C. Thanh khoản — dòng tiền đang vào hay ra (GTGD bình quân, tỷ đồng/phiên)**

| Ngành | GTGD 20 phiên | GTGD 252 phiên | Chênh lệch 20p/1năm |
|---|---|---|---|
| Ngân hàng | 3.771 | 5.644 | **−33,2%** |
| BĐS nhà ở | 2.676 | 2.839 | **−5,7%** |
| Chứng khoán | 1.897 | 2.921 | **−35,1%** |
| Thép | 514 | 1.078 | **−52,3%** |
| Đầu tư công | 235 | 685 | **−65,7%** |
| BĐS KCN | 84 | 249 | **−66,1%** |

> Đọc nhanh: **Toàn bộ 6 rổ đều đang có thanh khoản 20 phiên thấp hơn bình quân 1 năm** — dòng tiền rút khỏi các ngành này trên diện rộng trong ~1 tháng qua. Rút mạnh nhất: BĐS KCN, Đầu tư công, Thép (nhóm vốn hóa vừa/nhỏ). Rút nhẹ nhất: BĐS nhà ở (nhờ VIC/VHM giữ dòng tiền).

### 1.3. Diễn giải Phần 1

- **Chứng khoán:** tăng mạnh nhất từ đáy 2022 (+230%) và outperform VN-Index tuyệt đối, **nhưng** đã tạo đỉnh 09/2025 và hiện **−35% so với đỉnh đó**, −32,7% trong 1 năm, YTD âm. Đây là ngành "beta cao" — biến động năm hóa 36%, gấp ~2,4 lần ngân hàng. Đang hồi kỹ thuật trong tháng 8 (+8,7%) nhưng vẫn dưới MA50 & MA200.
- **Ngân hàng:** là ngành **khỏe nhất về trạng thái hiện tại** — chỉ cách đỉnh DB 8,6%, nằm **trên** cả MA50 và MA200, dương YTD, biến động thấp nhất. Đây là nhóm giữ VN-Index. Phân hóa lớn: STB (+408% từ đáy), MSB, LPB, HDB gần đỉnh; VIB, TPB, SHB, EIB còn cách đỉnh 30–44%.
- **BĐS nhà ở:** chỉ số ngành "đẹp" (+87%) là **ảo giác thống kê** do VIC/VHM. Loại 2 mã đó, nhóm còn lại nằm trong vùng đáy nhiều năm (xem 1.4).
- **BĐS Khu công nghiệp & Đầu tư công & Thép:** đều **lag VN-Index** từ đáy 2022 (alpha −18 đến −25 điểm %), đều đang dưới MA200, YTD giảm 15–20%, thanh khoản bốc hơi 50–66%. Đây là các nhóm **bị bỏ lại** trong sóng phục hồi 2023–2026.

### 1.4. Chi tiết từng mã (số liệu DB)

**Chứng khoán**

| Mã | Giá | Đáy (ngày) | % từ đáy | % 1 năm | % YTD | Cách đỉnh DB | Giá/MA50 | Giá/MA200 | RSI |
|---|---|---|---|---|---|---|---|---|---|
| SSI | 21.350 | 10/11/2022 | +188% | −28% | −12% | −29% | +5,7% | −5,9% | 62,9 |
| VND | 16.650 | 01/02/2021 | +287% | −31% | −12% | −40% | −2,8% | −4,1% | 49,1 |
| VCI | 22.850 | 01/02/2021 | +150% | −32% | −11% | −35% | +1,9% | −8,7% | 59,5 |
| HCM | 26.050 | 15/11/2022 | +304% | +9% | +37% | −2% | +4,3% | +18,5% | 55,4 |
| VIX | 14.100 | 15/11/2022 | +400% | −54% | −22% | −56% | +1,9% | −15,6% | 58,3 |
| SHS | 15.800 | 15/11/2022 | +246% | −42% | −23% | −46% | −4,7% | −13,8% | 50,3 |
| MBS | 17.900 | 01/02/2021 | +318% | −36% | −9% | −39% | −2,3% | −7,9% | 52,0 |
| FTS | 22.750 | 02/02/2021 | +337% | −35% | −23% | −45% | −4,6% | −12,7% | 51,8 |
| BSI | 29.200 | 01/02/2021 | +301% | −39% | −15% | −44% | −5,4% | −12,0% | 50,8 |
| CTS | 23.300 | 15/11/2022 | +466% | −28% | −10% | −34% | −3,4% | −2,4% | 53,5 |
| AGR | 13.450 | 15/11/2022 | +171% | −25% | −16% | −44% | −2,9% | −10,3% | 52,9 |
| ORS | 13.850 | 28/01/2021 | +150% | −10% | +5% | −47% | +0,1% | +2,2% | 48,5 |

**Ngân hàng**

| Mã | Giá | Đáy (ngày) | % từ đáy | % 1 năm | % YTD | Cách đỉnh DB | Giá/MA50 | Giá/MA200 | RSI |
|---|---|---|---|---|---|---|---|---|---|
| VCB | 60.100 | 11/10/2022 | +74% | −12% | +5% | −20% | +2,0% | −0,9% | 58,3 |
| BID | 36.850 | 11/10/2022 | +93% | −5% | +2% | −28% | +0,6% | −4,6% | 56,0 |
| CTG | 31.950 | 11/10/2022 | +167% | −8% | −9% | −22% | +0,2% | −6,8% | 53,0 |
| TCB | 33.400 | 15/11/2022 | +249% | −12% | −2% | −17% | +6,1% | +3,1% | 63,3 |
| MBB | 21.050 | 01/02/2021 | +257% | −3% | +4% | −9% | +5,5% | +2,8% | 65,9 |
| VPB | 27.800 | 28/01/2021 | +192% | −17% | −1% | −27% | +6,9% | +3,3% | 71,2 |
| ACB | 22.650 | 28/01/2021 | +174% | −5% | +10% | −11% | +0,7% | +6,8% | 54,6 |
| HDB | 27.800 | 28/01/2021 | +293% | +11% | −6% | −6% | +4,7% | +5,6% | 62,4 |
| STB | 75.500 | 24/10/2022 | +408% | +38% | +30% | −2% | +3,8% | +17,5% | 58,3 |
| VIB | 14.950 | 01/02/2021 | +81% | −29% | −11% | −33% | −1,7% | −7,6% | 54,5 |
| TPB | 14.650 | 28/01/2021 | +82% | −26% | −14% | −30% | −2,9% | −9,9% | 49,5 |
| SHB | 12.200 | 15/11/2022 | +158% | −33% | −24% | −35% | −1,6% | −15,9% | 55,2 |
| LPB | 49.950 | 24/10/2022 | +949%³ | +18% | +26% | −11% | −4,6% | +9,2% | 42,9 |
| MSB | 13.350 | 28/01/2021 | +161% | +10% | +29% | −2% | +0,4% | +18,6% | 53,2 |
| OCB | 11.000 | 11/10/2022 | +111% | −7% | +6% | −15% | +2,1% | +6,5% | 59,6 |
| EIB | 17.300 | 29/01/2021 | +58% | −41% | −19% | −44% | −7,1% | −18,2% | 40,3 |
| SSB | 17.100 | 24/03/2021 | +107% | −4% | +18% | −23% | +9,1% | +17,3% | 78,2 |
| NAB | 11.550 | 15/11/2022 | +275% | −13% | −3% | −18% | −6,9% | −3,1% | 33,7 |

³ % từ đáy của LPB bị thổi phồng bởi điều chỉnh cổ tức/phát hành.

**Bất động sản nhà ở**

| Mã | Giá | Đáy (ngày) | % từ đáy | % 1 năm | % YTD | Cách đỉnh DB | Giá/MA50 | Giá/MA200 | RSI |
|---|---|---|---|---|---|---|---|---|---|
| VHM | 73.000 | 05/08/2024 | +339% | +45% | +22% | −8% | +1,0% | +18,7% | 53,7 |
| VIC | 236.000 | 12/02/2025 | +1.083% | +263% | +39% | 0% | +8,8% | +33,1% | 68,7 |
| VRE | 26.100 | 14/01/2025 | +68% | −12% | −20% | −38% | +2,1% | −8,4% | 58,7 |
| NVL | 13.050 | 09/04/2025 | +73% | −16% | +5% | **−85%** | +1,2% | −0,9% | 46,4 |
| PDR | 12.400 | 28/02/2023 | +47% | −49% | −34% | **−80%** | −4,5% | −24,6% | 49,1 |
| DXG | 12.100 | 15/11/2022 | +108% | −40% | −19% | −62% | +4,8% | −9,1% | 62,1 |
| KDH | 18.200 | 10/11/2022 | +27% | −49% | −42% | −53% | −4,4% | −28,8% | 48,8 |
| NLG | 24.300 | 15/11/2022 | +60% | −39% | −19% | −56% | +1,8% | −12,3% | 58,2 |
| DIG | 11.400 | 15/11/2022 | +31% | −46% | −32% | **−87%** | +0,1% | −22,3% | 55,9 |
| CEO | 13.000 | 19/07/2021 | +160% | −44% | −35% | −78% | +0,1% | −23,0% | 55,0 |
| HDC | 12.100 | 27/07/2026 | +11% | −56% | −39% | −74% | −6,9% | −28,5% | 46,8 |
| IJC | 7.410 | 14/11/2022 | +54% | −35% | −27% | −61% | −6,0% | −22,0% | 46,4 |

> 8/12 mã BĐS nhà ở đang cách đỉnh DB 50–87% và dưới MA200. HDC vừa lập đáy mới 27/07/2026. Ngành này (trừ VIC/VHM) **chưa hồi phục**.

**BĐS Khu công nghiệp**

| Mã | Giá | Đáy (ngày) | % từ đáy | % 1 năm | % YTD | Cách đỉnh DB | Giá/MA50 | Giá/MA200 | RSI |
|---|---|---|---|---|---|---|---|---|---|
| KBC | 27.400 | 10/11/2022 | +96% | −32% | −22% | −41% | −2,8% | −14,5% | 43,7 |
| SZC | 19.700 | 15/11/2022 | +39% | −43% | −32% | −63% | −1,8% | −26,9% | 51,2 |
| IDC | 32.500 | 19/07/2021 | +113% | −11% | +2% | −34% | −3,6% | −11,3% | 43,7 |

**Thép**

| Mã | Giá | Đáy (ngày) | % từ đáy | % 1 năm | % YTD | Cách đỉnh DB | Giá/MA50 | Giá/MA200 | RSI |
|---|---|---|---|---|---|---|---|---|---|
| HPG | 22.100 | 10/11/2022 | +170% | −9% | −6% | −26% | −0,3% | −6,5% | 53,5 |
| HSG | 10.900 | 15/11/2022 | +110% | −23% | −10% | −63% | −1,5% | −8,5% | 51,0 |
| NKG | 10.950 | 15/11/2022 | +109% | −24% | −19% | −66% | −2,9% | −15,0% | 47,6 |
| TVN | 9.500 | 15/11/2022 | +170% | +16% | +28% | −51% | −4,9% | +4,6% | 49,2 |
| SMC | 10.300 | 09/04/2025 | +81% | −18% | −22% | −77% | −0,7% | −14,1% | 49,4 |
| POM | 3.500 | 28/04/2025 | +150% | +59% | −34% | −83% | +1,3% | −20,1% | 61,8 |
| VGS | 18.300 | 15/11/2022 | +285% | −36% | −26% | −48% | −4,4% | −20,5% | 47,8 |
| TLH | 3.950 | 15/11/2022 | +3% | −30% | −17% | −81% | −4,1% | −14,7% | 33,9 |

> HPG vững nhất nhóm (chỉ −9% trong 1 năm, sát MA50). Phần còn lại (HSG, NKG, VGS, TLH…) cách đỉnh 48–81%, dưới MA200.

**Đầu tư công**

| Mã | Giá | Đáy (ngày) | % từ đáy | % 1 năm | % YTD | Cách đỉnh DB | Giá/MA50 | Giá/MA200 | RSI |
|---|---|---|---|---|---|---|---|---|---|
| VCG | 16.000 | 15/11/2022 | +110% | −30% | −20% | −49% | −3,7% | −14,3% | 48,5 |
| HHV | 10.050 | 15/11/2022 | +103% | −27% | −20% | −49% | −2,5% | −12,9% | 45,4 |
| LCG | 7.130 | 15/11/2022 | +100% | −35% | −24% | −60% | −6,6% | −19,1% | 42,2 |
| FCN | 11.450 | 15/11/2022 | +90% | −35% | −22% | −67% | +1,4% | −12,5% | 56,6 |
| CII | 14.700 | 15/11/2022 | +76% | −35% | −30% | −67% | −2,9% | −20,8% | 51,8 |
| KSB | 13.650 | 15/11/2022 | +29% | −27% | −20% | −70% | −1,9% | −15,3% | 48,1 |
| PLC | 20.100 | 15/11/2022 | +62% | −26% | −17% | −54% | +0,6% | −17,2% | 50,7 |
| DHA | 50.300 | 15/11/2022 | +204% | +12% | −20% | −23% | +3,4% | −0,8% | 53,0 |
| BCC | 5.900 | 15/11/2022 | +21% | −30% | −22% | −77% | −7,8% | −18,2% | 38,6 |
| BTS | 4.900 | 28/01/2021 | +38% | −11% | −9% | −68% | −1,7% | −5,6% | 43,2 |

> Cả nhóm dưới MA200, YTD −17 đến −30%, RSI trung tính-yếu. "Câu chuyện đầu tư công" gần như **không được phản ánh vào giá cổ phiếu** trong 12 tháng qua, dù giải ngân thực tế tăng tốc (xem Phần 2).

---

## 2. PHẦN 2 — Bối cảnh cơ bản (WebSearch, truy cập 01/09/2026)

### 2.0. Vĩ mô nền
- **GDP quý 2/2026: +8,39%** YoY; 6 tháng đầu 2026: **+8,18%** (cùng kỳ 2025: +7,63%). Công nghiệp & xây dựng +9,81%, đóng góp lớn nhất. *(Cục Thống kê, công bố 03/07/2026)*
- **Định giá VN-Index:** P/E cơ bản về ~**12,9–13 lần** (tiệm cận −1 độ lệch chuẩn lịch sử, vùng "hấp dẫn" theo VFS). VDSC dùng EPS bình quân gia quyền ~146đ, P/E mục tiêu 11,7–13,7 lần. *(bnews.vn, thoibaonganhang.vn)*
- **Thanh khoản HOSE giảm:** KLGD bình quân tháng từ ~900 triệu cp/phiên đầu năm xuống ~**600 triệu cp/phiên** — tâm lý phòng thủ, NĐT cá nhân đứng ngoài. *(thoibaonganhang.vn)* → **khớp với dữ liệu DB: cả 6 rổ ngành đều giảm thanh khoản.**

### 2.1. Chứng khoán
| Chủ đề | Nội dung (nguồn, ngày truy cập 01/09/2026) |
|---|---|
| KQKD Q2/2026 | 77 CTCK công bố BCTC: 65 lãi, 12 lỗ. Doanh thu ngành **35.093 tỷ (+35,5% YoY)**, LNST **12.300 tỷ (+51,4% YoY)**. Lần đầu có **6 CTCK lãi trước thuế > 1.000 tỷ/quý** (VPBankS, TCBS, SSI, VPS, HDS, VNDirect). VPBankS dẫn đầu LNTT 2.159 tỷ (gần gấp 4 lần cùng kỳ). *(markettimes.vn, mekongasean.vn)* |
| Dư nợ margin | **Lập kỷ lục mới** trong Q2/2026. *(markettimes.vn)* |
| Nâng hạng FTSE | FTSE Russell xác nhận nâng Việt Nam lên **Thị trường mới nổi hạng 2 (Secondary Emerging)**, **hiệu lực 21/09/2026**. Dòng vốn thụ động ~**5–6 tỷ USD** vào theo **4 đợt**, kết thúc 20/09/2027 (không vào 1 lần). Danh sách 117 mã GEIS công bố 21/08/2026. Vanguard FTSE EM ETF quản lý ~122 tỷ USD (30/06/2026). *(theinvestor.vn, vietnam-briefing.com, vietnamnews.vn)* |
| Phân hóa | Q2/2026 ngành phân hóa mạnh theo năng lực cho vay margin và mảng tự doanh; cạnh tranh lợi nhuận dự báo còn khốc liệt hơn. *(elibook.vn, stockbiz.vn)* |
| KRX | Hệ thống giao dịch mới đã vận hành (nền cho các sản phẩm mới, giao dịch trong ngày, rút ngắn thanh toán — điều kiện kỹ thuật cho nâng hạng). |

### 2.2. Ngân hàng
| Chủ đề | Nội dung (nguồn, ngày truy cập 01/09/2026) |
|---|---|
| KQKD Q2/2026 | LNTT toàn ngành **+~28% YoY**; phân hóa mạnh. VCB +58% YoY, CTG +22%, BID +20%. Động lực: tín dụng + thu ngoài lãi (phí, bảo hiểm). *(vietnamplus.vn, doanhnhan.baophapluat.vn, elibook.vn)* |
| NIM | Vẫn bị bào mòn do chi phí huy động tăng (nhiều NH nâng lãi suất tiền gửi), **nhưng hồi phục lên ~3,06–3,22%** từ đáy quý 1/2026. *(dnse.com.vn, baomoi.com)* |
| Nợ xấu | **Tỷ lệ nợ xấu ~1,97% — cao nhất ~6 năm**; nợ nhóm 2 ~1,37%; tỷ lệ bao phủ nợ xấu (LLCR) toàn ngành giảm về **~82,9%** (đầu năm ~86%). "Rủi ro bộc lộ trên diện rộng". *(doanhnhan.baophapluat.vn)* |
| Tăng trưởng tín dụng | Mục tiêu 2026 **~15%** (Chỉ thị 01/CT-NHNN); VPBankS dự báo có thể lên **16,5%**. Đến hết Q2/2026 tín dụng đã +7,41%. Room = điểm xếp hạng 2024 × hệ số 2,6%. *(thuvienphapluat.vn, baochinhphu.vn, thoibaotaichinhvietnam.vn)* |
| Chính sách | **Thông tư 25/2026/TT-NHNN** nâng tỷ lệ vốn ngắn hạn cho vay trung–dài hạn từ 30% → **40%** (nới dư địa cho vay dài hạn). *(thoibaotaichinhvietnam.vn)* |
| Định giá | Nhiều NH P/B ~1,0–1,3x (nhóm quốc doanh & TMCP lớn); riêng VCB ~2,8x P/B (số DB seed, tham khảo). |

### 2.3. Bất động sản (nhà ở)
| Chủ đề | Nội dung (nguồn, ngày truy cập 01/09/2026) |
|---|---|
| KQKD Q2/2026 | Phân hóa cực mạnh. **VHM:** doanh thu ~35.103 tỷ (+85% YoY), LNST ~12.842 tỷ (+56%) nhờ Hạ Long Xanh, Hải Vân Bay. **NLG:** DT ~1.174 tỷ (+51%), LNST ~140 tỷ (+44%). **KDH:** DT ~1.123 tỷ (+7%), LNST ~348 tỷ (+77%) nhờ bàn giao Gladia. Nhiều "ông lớn" khác **sống nhờ nguồn thu tài chính/khác**, không phải bán nhà. *(doanhnhan.baophapluat.vn, vietstock.vn, mekongasean.vn)* |
| Tồn kho | Tổng tồn kho BĐS nhà ở của >70 DN niêm yết ~**430.000 tỷ đồng**; NVL, PDR, DXG có tồn kho lớn so với quy mô nợ. *(vietstock.vn, cafeland.vn)* |
| Trái phiếu đáo hạn | BĐS chiếm **~61%** cơ cấu TPDN đáo hạn (>124.700 tỷ). Riêng Q2/2026 ngành BĐS phải trả gần **46.000 tỷ** (~79% tổng đáo hạn thị trường). Áp lực dồn vào **3 tháng cuối 2026**, ~60.000 tỷ TP BĐS đáo hạn. *(baophapluat.vn, cafebiz.vn, diendandoanhnghiep.vn)* |
| Pháp lý | Bộ TN&MT tập trung ban hành văn bản hướng dẫn **Luật Đất đai sửa đổi** trong 2026 — kỳ vọng gỡ nút thắt pháp lý, "mở khóa" hàng trăm dự án đình trệ. Dòng tiền tập trung vào dự án **pháp lý sạch, nhu cầu thật**. *(24hmoney.vn)* |

### 2.4. Thép
| Chủ đề | Nội dung (nguồn, ngày truy cập 01/09/2026) |
|---|---|
| Giá thép/quặng | Giá thép xây dựng +~4% so với đầu năm; HRC +~3%. Quặng sắt dự báo về **~90 USD/tấn (bình quân 2026)**, cuối năm có thể ~84 USD/tấn (đã giảm ~25% từ đỉnh). *(vneconomy.vn, vietnambiz.vn, hct.vn)* |
| Thuế CBPG | Bộ Công Thương áp **thuế chống bán phá giá tạm thời HRC Trung Quốc ~19–28%**, tạo chênh lệch giá ~20% có lợi cho sản xuất nội địa. *(chongbanphagia.vn, elibook.vn)* |
| Dung Quất 2 | HPG vận hành **~60% công suất**; sản lượng tiêu thụ HRC đạt ~906.000 tấn/quý nhờ đóng góp DQ2. *(elibook.vn)* |
| Nhu cầu Trung Quốc | BĐS TQ (~30% nhu cầu thép) vẫn yếu; nhu cầu thép TQ dự báo **−2,5% (2025), −1,1% (2026)**. TQ dư cung nghiêm trọng → đẩy mạnh xuất khẩu, biên HRC <3%. *(hct.vn)* |
| Nội địa | Cầu nội địa (đầu tư công, BĐS hồi phục cục bộ) được kỳ vọng nâng đỡ; thanh khoản cổ phiếu thép từng "bùng nổ" quanh tin thuế CBPG. *(tapchicongthuong.vn, diendandoanhnghiep.vn)* |

### 2.5. Đầu tư công
| Chủ đề | Nội dung (nguồn, ngày truy cập 01/09/2026) |
|---|---|
| Giải ngân 2026 | Đến **06/08/2026**: giải ngân **433.454 tỷ đồng = 42,7%** kế hoạch Thủ tướng giao (KH ~995–1.000+ nghìn tỷ). Hết 31/7: 41,9%. Vốn NSTW mới đạt 32,3%, NSĐP 47,3%. → **Chậm so với tiến độ lý tưởng, dồn gánh nặng vào 4 tháng cuối năm.** *(vietstock.vn, thoibaotaichinhvietnam.vn)* |
| Long Thành | Chỉ đạo **đưa vào khai thác trong 2026** (cầu Long Thành hoàn thành Q1/2027); huy động tối đa nhân lực, thiết bị. *(baochinhphu.vn, dantri.com.vn, vietnamplus.vn)* |
| Cao tốc TP.HCM–Long Thành–Dầu Giây (mở rộng) | Kế hoạch hoàn thành **2026**. *(vov.vn)* |
| Đường sắt tốc độ cao Bắc–Nam | Vốn ~**67 tỷ USD**, dự kiến **khởi công cuối 2026**. *(nguoiquansat.vn)* |
| Bối cảnh Q3/2026 | Nhiều "siêu dự án" áp sát vạch đích cuối 2026 → kỳ vọng sóng giải ngân tăng tốc nửa cuối năm. *(vietnambiz.vn)* |

---

## 3. PHẦN 3 — Đánh giá ngắn hạn / trung hạn (bằng chứng & kịch bản)

> Trình bày dưới dạng **điều đã phản ánh vào giá / điều chưa phản ánh** + kịch bản hai chiều. **Không** phải khuyến nghị.

### 3.1. Chứng khoán

**Đã phản ánh vào giá:** đà tăng lợi nhuận Q2 (+51%), margin kỷ lục, và phần lớn kỳ vọng nâng hạng FTSE (giá đã chạy mạnh 2023–T9/2025, +230% từ đáy). Việc "có ngày hiệu lực 21/09/2026" là thông tin công khai.

**Chưa phản ánh (còn bỏ ngỏ):** quy mô và tốc độ thực tế dòng vốn ngoại giải ngân theo 4 đợt; mức độ hồi phục thanh khoản thị trường về vùng >900 triệu cp/phiên; khả năng nâng tiếp lên MSCI trong 1–2 năm tới.

**Ngắn hạn (1–3 tháng):**
- *Kỹ thuật:* chỉ số rổ dưới MA50 & MA200, RSI 54 (trung tính), vừa bật +8,7% trong tháng 8 — mới là hồi phục, chưa xác nhận đảo chiều xu hướng. Biến động năm hóa 36% → nhóm dao động biên độ rộng nhất.
- *Dòng tiền:* GTGD 20 phiên **−35%** so với bình quân năm — dòng tiền đang rút, trái ngược với "câu chuyện nâng hạng".
- *Catalyst gần:* ngày hiệu lực FTSE 21/09/2026 (đợt 1 dòng vốn thụ động); KQKD Q3 (giữa tháng 10).
- *Kịch bản thuận lợi:* dòng vốn ngoại đợt 1 + thanh khoản nội hồi phục → nhóm beta cao thường phản ứng mạnh nhất; định giá VN-Index P/E ~13 tạo dư địa.
- *Kịch bản bất lợi:* "tin ra là bán" (sell-the-news) sau 21/09 nếu dòng vốn thực nhỏ hơn kỳ vọng; thanh khoản tiếp tục teo → LN quý 3–4 giảm tốc do nền so sánh cao và tự doanh kém thuận lợi.

**Trung hạn (6–18 tháng):**
- *Vị trí chu kỳ:* hậu-đỉnh lợi nhuận ngắn hạn (Q2/2026 nền cao), nhưng ở **đầu chu kỳ cấu trúc** của việc mở rộng thị trường vốn (nâng hạng, sản phẩm mới trên KRX, số hóa tài khoản).
- *Động lực cơ bản:* nếu vốn hóa/thanh khoản thị trường mở rộng bền vững, doanh thu môi giới + margin + IB có trần cao hơn.
- *Rủi ro cấu trúc:* cạnh tranh phí về 0, biên lợi nhuận môi giới bị nén; phụ thuộc chu kỳ thị trường (đòn bẩy 2 chiều); rủi ro tự doanh/trái phiếu.

### 3.2. Ngân hàng

**Đã phản ánh vào giá:** tăng trưởng LN Q2 +28%, tín dụng mạnh, GDP +8,4%. Nhóm dẫn dắt (STB, MSB, LPB, HDB, MBB, TCB) đã về sát/vượt đỉnh → định giá không còn rẻ tuyệt đối với các mã này.

**Chưa phản ánh đầy đủ:** mức độ xấu đi của chất lượng tài sản (nợ xấu 6 năm cao nhất, LLCR giảm) — thị trường đang "nhìn qua" (look-through) vì LN vẫn tăng; rủi ro trích lập tăng nếu Luật Đất đai chậm gỡ nợ BĐS; phân hóa giữa nhóm quốc doanh (P/B ~1x, còn cách đỉnh 20–28%) và nhóm đã chạy.

**Ngắn hạn (1–3 tháng):**
- *Kỹ thuật:* rổ ngân hàng **trên** MA50 & MA200, RSI 58, YTD +4,6%, biến động thấp nhất (15%). Trạng thái kỹ thuật tốt nhất trong 5 ngành.
- *Dòng tiền:* GTGD 20 phiên −33% so với bình quân năm — vẫn là nhóm hút tiền lớn nhất về tuyệt đối (3.771 tỷ/phiên) nhưng đang giảm.
- *Catalyst:* số liệu tín dụng cuối quý 3, định hướng room 2027, diễn biến lãi suất huy động.
- *Kịch bản thuận lợi:* NIM tạo đáy và hồi (đã có tín hiệu lên 3,06–3,22%); tín dụng vượt 16%; nhóm quốc doanh định giá thấp "đuổi" theo nhóm dẫn dắt.
- *Kịch bản bất lợi:* nợ xấu tăng nhanh hơn dự phòng → chi phí tín dụng bào mòn LN nửa cuối 2026; lãi suất huy động tăng tiếp ép NIM; tín dụng "chất lượng thấp" chảy vào tài sản rủi ro.

**Trung hạn (6–18 tháng):**
- *Vị trí chu kỳ:* giữa chu kỳ tín dụng nới lỏng (mục tiêu tăng trưởng cao, Thông tư 25 nới vốn dài hạn), nhưng **cuối chu kỳ chất lượng tài sản tốt** — nợ xấu đang lên.
- *Động lực:* tăng trưởng tín dụng danh nghĩa cao theo GDP danh nghĩa ~10–12%; thu ngoài lãi (bancassurance hồi phục, phí).
- *Rủi ro cấu trúc:* đệm dự phòng mỏng đi; tập trung tín dụng BĐS/hạ tầng; bộ đệm vốn (CAR) của một số TMCP; phụ thuộc chính sách room.

### 3.3. Bất động sản (nhà ở)

**Đã phản ánh vào giá:** sự phân hóa — VIC/VHM đã phản ánh gần hết câu chuyện "siêu dự án" + bàn giao (VIC về đỉnh DB, VHM cách đỉnh 8%). Phần còn lại của ngành đã phản ánh **kịch bản xấu kéo dài**: NVL −85%, DIG −87%, PDR −80%, CEO −78% so với đỉnh.

**Chưa phản ánh:** kịch bản Luật Đất đai được hướng dẫn đầy đủ và dự án được gỡ pháp lý hàng loạt (chưa xảy ra); khả năng tái cấu trúc/đảo nợ thành công đợt đáo hạn trái phiếu Q4/2026; sự trở lại của thanh khoản thị trường sơ cấp ở phân khúc trung cấp.

**Ngắn hạn (1–3 tháng):**
- *Kỹ thuật:* chỉ số rổ méo vì VIC/VHM. Nhóm còn lại: đa số dưới MA200, một số vừa lập đáy mới (HDC 27/07/2026). RSI rổ 61,8 do VIC kéo.
- *Dòng tiền:* GTGD chỉ −5,7% so với bình quân năm (tốt nhất 5 ngành) — nhưng chủ yếu tập trung ở VIC/VHM.
- *Catalyst:* tiến độ ban hành nghị định/thông tư Luật Đất đai; danh sách dự án được gỡ vướng; diễn biến đáo hạn trái phiếu tháng 10–12/2026.
- *Kịch bản thuận lợi:* gỡ pháp lý cụ thể + lãi suất thấp → nhóm giảm sâu (định giá trên sổ sách thấp) hồi phục kỹ thuật mạnh.
- *Kịch bản bất lợi:* đỉnh đáo hạn trái phiếu Q4 gây sự kiện tín dụng ở 1–2 tổ chức phát hành lớn → lây lan tâm lý; tồn kho 430.000 tỷ chưa giải phóng được.

**Trung hạn (6–18 tháng):**
- *Vị trí chu kỳ:* đáy chu kỳ ngành kéo dài từ 2022; đang chờ chất xúc tác pháp lý để chuyển sang pha phục hồi. Chưa có bằng chứng pha phục hồi đã bắt đầu (trừ nhóm Vin).
- *Động lực:* Luật Đất đai/Nhà ở/Kinh doanh BĐS mới; nhu cầu ở thực + đô thị hóa; lãi suất vay mua nhà thấp.
- *Rủi ro cấu trúc:* đòn bẩy cao, phụ thuộc kênh trái phiếu; pháp lý dự án nhiều năm; niềm tin người mua nhà.

### 3.4. Thép

**Đã phản ánh vào giá:** thuế CBPG HRC và Dung Quất 2 (giá HPG đã phục hồi +170% từ đáy, chỉ −9% trong 1 năm). Kỳ vọng cầu nội địa.

**Chưa phản ánh:** biên lợi nhuận thực tế khi DQ2 chạy 100% công suất (hiện 60%); rủi ro dư cung Trung Quốc kéo dài đè giá xuất khẩu HRC (ảnh hưởng HSG, NKG); giá quặng giảm về ~84 USD/tấn (giảm chi phí đầu vào — có thể chưa phản ánh hết vào biên gộp kỳ vọng).

**Ngắn hạn (1–3 tháng):**
- *Kỹ thuật:* rổ dưới MA50 & MA200, RSI 49,7 (trung tính-yếu), 3–6 tháng giảm 14–20%. HPG khỏe hơn phần còn lại.
- *Dòng tiền:* GTGD 20 phiên −52% — dòng tiền rút mạnh sau các đợt "bùng nổ thanh khoản" quanh tin thuế.
- *Catalyst:* quyết định thuế CBPG chính thức với HRC khổ rộng; sản lượng DQ2; số liệu tiêu thụ thép xây dựng gắn với giải ngân đầu tư công Q4.
- *Kịch bản thuận lợi:* thuế CBPG chính thức + giá quặng giảm + cầu xây dựng nội địa tăng cuối năm → cải thiện biên; HPG hưởng lợi kép (thị phần + chi phí).
- *Kịch bản bất lợi:* Trung Quốc tiếp tục xuất khẩu giá rẻ, giá HRC khu vực yếu; nhu cầu BĐS nội địa chưa hồi; POM/SMC/TLH rủi ro tài chính cao.

**Trung hạn (6–18 tháng):**
- *Vị trí chu kỳ:* sau đáy lợi nhuận 2022–2023, đã phục hồi một phần; chu kỳ giá thép toàn cầu vẫn bị ghìm bởi Trung Quốc. Phân hóa: HPG (mở rộng công suất, chi phí thấp) vs nhóm tôn mạ (phụ thuộc xuất khẩu, cạnh tranh gay gắt).
- *Động lực:* đầu tư công + hồi phục xây dựng dân dụng; hàng rào thuế bảo hộ; DQ2 nâng sản lượng HRC nội địa (thay thế nhập khẩu).
- *Rủi ro cấu trúc:* thừa cung toàn cầu; tính chu kỳ cao; biến động giá nguyên liệu; rủi ro thương mại (thuế của EU/Mỹ với thép Việt).

### 3.5. Đầu tư công

**Đã phản ánh vào giá:** gần như **không có gì** được phản ánh tích cực trong 12 tháng qua — rổ −23% trong 1 năm, −20,5% YTD, cả nhóm dưới MA200, thanh khoản −66%. Thị trường đã phản ánh sự **thất vọng** về khả năng chuyển "giải ngân" thành "lợi nhuận doanh nghiệp niêm yết".

**Chưa phản ánh:** kịch bản sóng giải ngân dồn vào Q4/2026 (mới đạt 42,7% kế hoạch tính đến đầu tháng 8 → còn ~570.000 tỷ cần giải ngân trong ~5 tháng); backlog hợp đồng mới từ Long Thành, cao tốc, khởi công đường sắt cao tốc cuối 2026; cải thiện dòng tiền/công nợ của nhà thầu (điểm yếu kinh niên: CII, LCG, FCN có khoản phải thu lớn).

**Ngắn hạn (1–3 tháng):**
- *Kỹ thuật:* rổ dưới MA50 & MA200, RSI 48,6, đây là nhóm YTD **kém nhất** trong 5 ngành.
- *Dòng tiền:* GTGD 20 phiên −66% — dòng tiền gần như bỏ nhóm này.
- *Catalyst:* số liệu giải ngân tháng 9–12 (có tăng tốc như thường lệ cuối năm không); tiến độ nghiệm thu/thanh toán các gói thầu lớn; lễ khởi công đường sắt cao tốc.
- *Kịch bản thuận lợi:* áp lực chính trị "chạy về đích 2026" → giải ngân Q4 tăng vọt, nhà thầu ghi nhận doanh thu/dòng tiền; định giá thấp + vị thế quá bán → hồi phục kỹ thuật nhanh.
- *Kịch bản bất lợi:* giải ngân tiếp tục chậm (vướng GPMB, giá vật liệu, thủ tục), lợi nhuận nhà thầu 2026 vẫn mỏng; nhóm này tiếp tục là "câu chuyện kể mãi không thành".

**Trung hạn (6–18 tháng):**
- *Vị trí chu kỳ:* đầu–giữa siêu chu kỳ đầu tư hạ tầng (2026–2030: đường sắt cao tốc, sân bay, cao tốc, vành đai). Nhưng **độ trễ** từ chính sách → hợp đồng → doanh thu → lợi nhuận nhà thầu niêm yết thường 12–24 tháng.
- *Động lực:* quy mô vốn đầu tư công kỷ lục; đường sắt tốc độ cao 67 tỷ USD; phân cấp mạnh cho địa phương.
- *Rủi ro cấu trúc:* biên lợi nhuận thi công mỏng, cạnh tranh đấu thầu; rủi ro dòng tiền/công nợ; đòn bẩy; phụ thuộc vốn ngân sách và tiến độ GPMB; nhiều DN niêm yết quy mô nhỏ, quản trị yếu.

---

## 4. Tổng kết so sánh nhanh

| Tiêu chí | Chứng khoán | Ngân hàng | BĐS nhà ở | BĐS KCN | Thép | Đầu tư công |
|---|---|---|---|---|---|---|
| Tăng từ đáy 15/11/2022 | +230% | +162% | +87%¹ | +79% | +119% | +77% |
| So VN-Index (+101%) | Vượt mạnh | Vượt | Thua nhẹ¹ | Thua | Vượt nhẹ | Thua |
| Cách đỉnh DB | −35% | −9% | −50%¹ | −40% | −60% | −56% |
| YTD 2026 | −11% | +5% | −11% | −16% | −15% | −21% |
| Giá vs MA200 | Dưới | **Trên** | Hỗn hợp | Dưới | Dưới | Dưới |
| Xu hướng thanh khoản 1T | Rút (−35%) | Rút (−33%) | Ổn (−6%) | Rút mạnh (−66%) | Rút (−52%) | Rút mạnh (−66%) |
| Biến động (năm hóa) | Cao nhất 36% | Thấp nhất 15% | 26% | 24% | 23% | 17% |
| Trạng thái | Hậu đỉnh, hồi kỹ thuật | Dẫn dắt, sát đỉnh | Phân hóa cực mạnh | Vùng đáy, lag | Phục hồi 1 phần, phân hóa | Vùng đáy, bị bỏ lại |

¹ Bị chi phối bởi VIC/VHM; phần còn lại của rổ vẫn ở vùng đáy nhiều năm.

---

## 5. Giới hạn & lưu ý bắt buộc

1. **Rổ ngành là tự dựng thủ công**, không phải chỉ số ngành chính thức (VNAllShare Sector, ICB). Kết quả nhạy với việc chọn mã và với phương pháp **equal-weight** (mã nhỏ có trọng số bằng mã lớn). Chỉ số vốn hóa gia quyền (nếu có) sẽ cho bức tranh khác, đặc biệt ở BĐS (VIC/VHM chiếm tỷ trọng vốn hóa rất lớn) và ngân hàng (VCB).
2. Số liệu **Phần 1 (giá, %, RSI, MA, thanh khoản)** tính trực tiếp từ PostgreSQL `stock_db`, giá điều chỉnh, đến phiên 28/08/2026. "% từ đáy" của một số mã (LPB, VIC…) bị phóng đại do điều chỉnh cổ tức/phát hành thêm.
3. Số liệu **Phần 2 (KQKD, định giá, chính sách, giá hàng hóa)** lấy từ WebSearch ngày **01/09/2026**, từ báo chí tài chính Việt Nam và quốc tế — có độ trễ, có thể sai lệch, cần đối chiếu báo cáo gốc (BCTC doanh nghiệp, số liệu Cục Thống kê/NHNN, FTSE Russell).
4. `financial_metrics` trong DB chỉ là dữ liệu mẫu (10 dòng) → **không dùng** để tính P/E, P/B ngành; các con số định giá trong báo cáo đến từ web.
5. "Đỉnh lịch sử" trong báo cáo = đỉnh trong phạm vi dữ liệu DB (từ 2021), không phải đỉnh mọi thời đại.
6. **Hiệu suất quá khứ không dự báo tương lai.** Các "kịch bản" chỉ là khung phân tích hai chiều, không phải dự báo.

---

> **Đây là phân tích dữ liệu, không phải tư vấn đầu tư.** Báo cáo không đưa ra khuyến nghị mua/bán/nắm giữ bất kỳ cổ phiếu nào, không đặt giá mục tiêu, không nói ngành nào "nên mua". Mọi quyết định đầu tư là của người đọc và nên được tham vấn với chuyên gia tư vấn tài chính được cấp phép.

**Tệp liên quan:** script tính toán tại [`scripts/sector_momentum_analysis.py`](../scripts/sector_momentum_analysis.py); kết quả thô tại `scripts/_sector_momentum_output.csv`.

### Nguồn (truy cập 01/09/2026)

- Lợi nhuận CTCK Q2/2026: [markettimes.vn](https://markettimes.vn/nganh-chung-khoan-lai-lon-trong-quy-2-loi-nhuan-tang-hon-50-margin-lap-ky-luc-moi-129096.html), [mekongasean.vn](https://mekongasean.vn/so-ke-loi-nhuan-nhom-cong-ty-chung-khoan-dau-nganh-57614.html), [elibook.vn](https://elibook.vn/2026/08/23/chon-co-phieu-chung-khoan-nao-cho-cau-chuyen-nang-hang-su-phan-hoa-cua-nganh-chung-khoan-trong-quy-2/)
- Nâng hạng FTSE Russell: [theinvestor.vn](https://theinvestor.vn/ftse-russell-confirms-vietnams-market-status-upgrade-to-secondary-emerging-from-sept-21-d18799.html), [vietnam-briefing.com](https://www.vietnam-briefing.com/news/vietnam-secures-ftse-emerging-market-status-upgrade.html/), [vietnamnews.vn](https://vietnamnews.vn/economy/1729462/ftse-russell-plans-inclusion-of-28-vietnamese-stocks-in-2026-market-upgrade.html)
- Ngân hàng Q2/2026: [vietnamplus.vn](https://www.vietnamplus.vn/buc-tranh-loi-nhuan-ngan-hang-quy-2-tang-truong-tich-cuc-phan-hoa-manh-post1120961.vnp), [doanhnhan.baophapluat.vn](https://doanhnhan.baophapluat.vn/nganh-ngan-hang-quy-ii-2026-loi-nhuan-tang-vot-gan-28-no-xau-boc-lo-rui-ro-tren-dien-rong.html), [dnse.com.vn](https://www.dnse.com.vn/senses/tin-tuc/ngan-hang-quy-ii2026-nim-thu-hep-va-no-xau-tang-loi-nhuan-den-tu-dau-35238917)
- Tăng trưởng tín dụng / Thông tư: [thuvienphapluat.vn](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/tai-chinh/103999/), [thoibaotaichinhvietnam.vn](https://thoibaotaichinhvietnam.vn/tin-dung-co-the-vuot-muc-tieu-len-16-5-nho-thanh-khoan-cai-thien-lai-suat-van-kho-giam-manh-202094.html), [baochinhphu.vn](https://baochinhphu.vn/tin-dung-tang-truong-741-tao-du-dia-cho-tang-truong-kinh-te-102260702120737467.htm)
- BĐS — tồn kho / trái phiếu / pháp lý: [vietstock.vn](https://vietstock.vn/2026/08/bat-dong-san-nha-o-lai-dam-quy-2-loat-ong-lon-song-nho-nguon-thu-khac-737-1481946.htm), [cafebiz.vn](https://cafebiz.vn/ap-luc-dao-han-60000-ty-dong-trai-phieu-bat-dong-san-phan-hoa-gay-gat-va-bai-toan-rui-ro-cho-ngan-hang-176260802080521637.chn), [baophapluat.vn](https://baophapluat.vn/bat-dong-san-hut-60-luong-trai-phieu-phat-hanh-quy-1-2026-ap-luc-dao-han-van-chuc-cho-47d6c24e.html), [24hmoney.vn](https://24hmoney.vn/news/co-phieu-bat-dong-san-2026-vuot-qua-vung-trung--don-dau-chu-ky-phap-ly-moi-c30a2745507.html)
- BĐS — KQKD Q2/2026: [doanhnhan.baophapluat.vn](https://doanhnhan.baophapluat.vn/vinhomes-nam-long-va-khang-dien-dan-dat-da-tang-truong-loi-nhuan-bat-dong-san-quy-ii-2026.html), [mekongasean.vn](https://mekongasean.vn/du-bao-loi-nhuan-quy-22026-nhom-doanh-nghiep-bat-dong-san-lon-56470.html)
- Thép: [vneconomy.vn](https://vneconomy.vn/du-bao-gia-thep-tiep-tuc-tang-trong-quy-2-loi-nhuan-doanh-nghiep-tang-manh.htm), [chongbanphagia.vn](https://chongbanphagia.vn/trien-vong-co-phieu-nganh-thep-nho-ap-thue-chong-ban-pha-gia-n29137.html), [elibook.vn](https://elibook.vn/2026/06/12/hpg-gia-thep-tang-20-ma-gia-co-phieu-thep-van-bo-di-ngang-lieu-con-co-hoi-tai-dinh-gia.html/), [hct.vn](https://hct.vn/tin-tuc/quang-sat-mat-hon-25-gia-tri-trien-vong-am-dam-cho-nam-2025-va-2026-2298), [tapchicongthuong.vn](https://tapchicongthuong.vn/toan-canh-nganh-thep-2026--suc-cau-noi-dia-nang-do--ky-vong-gia-phuc-hoi-450273.htm)
- Đầu tư công: [vietstock.vn](https://vietstock.vn/2026/08/giai-ngan-von-dau-tu-cong-den-het-ngay-68-dat-427-ke-hoach-thu-tuong-giao-768-1481209.htm), [thoibaotaichinhvietnam.vn](https://thoibaotaichinhvietnam.vn/), [baochinhphu.vn](https://baochinhphu.vn/day-nhanh-tien-do-thi-cong-san-bay-long-thanh-va-cao-toc-tphcm-long-thanh-dau-giay-102260525211615704.htm), [vietnambiz.vn](https://vietnambiz.vn/giai-ngan-dau-tu-cong-quy-iii-khi-cac-sieu-du-an-ap-sat-vach-dich-2026861530798.htm), [nguoiquansat.vn](https://nguoiquansat.vn/bo-xay-dung-nhan-chi-dao-tu-thu-tuong-lien-quan-du-an-duong-sat-toc-do-cao-bac-nam-san-bay-long-thanh-metro-ha-noi-tp-hcm-308247.html)
- Vĩ mô / định giá: [vneconomy.vn](https://vneconomy.vn/tang-truong-gdp-6-thang-dau-nam-2026-cua-viet-nam-dat-muc-818.htm), [xaydungchinhsach.chinhphu.vn](https://xaydungchinhsach.chinhphu.vn/gdp-quy-ii-uoc-dat-839-6-thang-dau-nam-2026-tang-truong-818-119260703184319255.htm), [bnews.vn](https://bnews.vn/vn-index-ve-p-e-11-9-lan-vdsc-du-bao-vung-1-638-1-999-diem/431860.html), [thoibaonganhang.vn](https://thoibaonganhang.vn/vn-index-thang-8-da-tich-luy-du-chi-cho-tin-hieu-de-but-pha-185739.html)
