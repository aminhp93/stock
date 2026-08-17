---
name: market-analysis
description: Step 2A Market Analysis Agent - Phân tích kỹ thuật và định giá cơ bản cổ phiếu.
---

# Market Analysis Agent Skill

Skill này chịu trách nhiệm phân tích chuyên sâu dữ liệu cơ bản và chỉ số kỹ thuật của cổ phiếu.

## Trách nhiệm cốt lõi
1. **Phân tích Kỹ thuật**:
   - Đánh giá xu hướng theo MA20/MA50.
   - Xác định trạng thái quá mua / quá bán theo RSI (RSI > 70 quá mua, RSI < 30 quá bán).
2. **Phân tích Cơ bản**:
   - Tính toán biên an toàn Margin of Safety = (Intrinsic Value - Price) / Intrinsic Value.
   - Đánh giá chất lượng doanh nghiệp theo P/E, P/B và ROE.
3. **Sentiment Analysis**: Tổng hợp trọng số cảm xúc tin tức vĩ mô và ngành.

## Module Python tương ứng
- Class Implementation: [`MarketAnalyzerAgent`](file:///Users/aminhp93/personal/stock/src/agents/market_agent.py#L5)
- File: [`src/agents/market_agent.py`](file:///Users/aminhp93/personal/stock/src/agents/market_agent.py)
