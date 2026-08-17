---
name: behavioral-simulation
description: Step 2B Behavioral Simulation Engine - Giả lập tâm lý 10 nhà đầu tư mô phỏng người thật và hỗ trợ mở rộng 10.000 agents.
---

# Behavioral Simulation Engine Skill

Skill này chịu trách nhiệm giả lập tâm lý đám đông và hành vi giao dịch của các nhóm nhà đầu tư khác nhau trên thị trường.

## 10 Persona Nhà đầu tư Mô phỏng Người thật
1. **F0 FOMO Retailer**: Đua lệnh khi xanh, hoảng loạn cắt lỗ khi đỏ.
2. **Deep Value Investor**: Mua tích trữ khi Margin of Safety cao ($\ge 15\%$).
3. **Technical Swing Trader**: Giao dịch tuân thủ đồ thị (RSI, MA20).
4. **Loss-Averse Panic Seller**: Sợ rủi ro, vọt bán tháo khi có biến động âm.
5. **Quant Algo Fund**: Mua bán theo thuật toán xác suất không cảm xúc.
6. **Dividend Growth**: Mua tích trữ cổ tức tiền mặt doanh nghiệp tốt.
7. **Contrarian Investor**: Đi ngược đám đông (Mua khi sợ hãi, bán khi hưng phấn).
8. **Aggressive Scalper**: Lướt sóng T+ cực nhanh theo xung lực dòng tiền.
9. **Smart Money Watcher**: Thu gom cổ phiếu cùng khối ngoại và tự doanh.
10. **Macro Top-Down Strategist**: Mua bán theo chu kỳ kinh tế và lãi suất vĩ mô.

## Mở rộng Quy mô (Scalability to 10,000 Agents)
- Sử dụng thuật toán **Vectorized Monte-Carlo Decision Matrix** để tính toán phân bổ Mua/Bán/Giữ/Hoảng loạn của 10.000 agents trong thời gian thực.

## Module Python tương ứng
- Class Implementation: [`BehavioralSimulationEngine`](file:///Users/aminhp93/personal/stock/src/agents/simulator.py#L14)
- File: [`src/agents/simulator.py`](file:///Users/aminhp93/personal/stock/src/agents/simulator.py)
- Configuration: [`config/personas.json`](file:///Users/aminhp93/personal/stock/config/personas.json)
