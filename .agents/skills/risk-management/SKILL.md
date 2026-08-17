---
name: risk-management
description: Step 4 Risk Manager Agent - Đánh giá rủi ro, vị thế Kelly Criterion và kiểm soát sụt giảm tài khoản.
---

# Risk Manager Agent Skill

Skill này quy định kỷ luật quản trị rủi ro nghiêm ngặt để bảo vệ nguồn vốn tài khoản.

## Các quy tắc quản trị rủi ro
1. **Quy mô Vị thế Kelly**: Tính toán Half-Kelly Criterion để đề xuất tỷ trọng vị thế tối ưu.
2. **Tỷ lệ Risk/Reward Ratio (RRR)**: Bắt buộc $RRR \ge 1:2.5$.
3. **Giới hạn Vị thế Tối đa**: Tỷ trọng 1 cổ phiếu không quá 20% tài khoản.
4. **Stress Test Drawdown**: Giả lập mức sụt giảm tài khoản tối đa nếu chạm điểm Stop Loss.

## Module Python tương ứng
- Class Implementation: [`RiskManagerAgent`](file:///Users/aminhp93/personal/stock/src/agents/risk_agent.py#L7)
- File: [`src/agents/risk_agent.py`](file:///Users/aminhp93/personal/stock/src/agents/risk_agent.py)
