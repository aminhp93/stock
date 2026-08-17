---
name: trading-strategy
description: Step 3 Trading Strategy Agent - Lập kịch bản đầu tư Bull/Base/Bear và kế hoạch giao dịch chi tiết.
---

# Trading Strategy Agent Skill

Skill này lập kế hoạch giao dịch dựa trên dữ liệu phân tích và đồng thuận từ engine giả lập tâm lý.

## Trách nhiệm cốt lõi
1. **Thiết lập 3 Kịch bản**:
   - **Bull Case** (Tích cực - 35% xác suất): Giá mục tiêu Take Profit 2.
   - **Base Case** (Cơ sở - 50% xác suất): Giá mục tiêu Take Profit 1.
   - **Bear Case** (Tiêu cực - 15% xác suất): Giá chạm ngưỡng Stop Loss.
2. **Kế hoạch Giao dịch (Trading Plan)**:
   - Vùng giá mua (Entry zone min - max).
   - Điểm cắt lỗ tuyệt đối (Hard Stop Loss).
   - Điểm chốt lời (Take Profit 1, Take Profit 2).
   - Tỷ trọng khuyến nghị (% tài khoản).

## Module Python tương ứng
- Class Implementation: [`StrategyAgent`](file:///Users/aminhp93/personal/stock/src/agents/strategy_agent.py#L8)
- File: [`src/agents/strategy_agent.py`](file:///Users/aminhp93/personal/stock/src/agents/strategy_agent.py)
