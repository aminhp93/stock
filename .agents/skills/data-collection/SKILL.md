---
name: data-collection
description: Step 1 Data Collection Agent - Thu thập & đóng gói dữ liệu thị trường Point-In-Time cho cổ phiếu.
---

# Data Collection Agent Skill

Skill này quy định trách nhiệm và quy trình thu thập dữ liệu thị trường Point-In-Time tại mốc thời gian $T$.

## Trách nhiệm cốt lõi
1. **Giá & Thanh khoản**: Dữ liệu OHLCV, khối lượng giao dịch, các chỉ số kỹ thuật (RSI, MA20, MA50).
2. **Báo cáo Tài chính**: P/E, P/B, ROE, Biên lợi nhuận, Doanh thu YoY, Giá trị thực DCF.
3. **Tin tức Vĩ mô & Ngành**: Tin tức cập nhật, sentiment score (-1.0 đến +1.0).
4. **Quy tắc tuyệt đối**: Tuyệt đối không sử dụng dữ liệu tương lai $T+1$ (Chống Lookahead Bias).

## Module Python tương ứng
- Class Implementation: [`DataCollectorAgent`](file:///Users/aminhp93/personal/stock/src/agents/data_agent.py#L7)
- File: [`src/agents/data_agent.py`](file:///Users/aminhp93/personal/stock/src/agents/data_agent.py)
