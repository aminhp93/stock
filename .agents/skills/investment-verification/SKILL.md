---
name: investment-verification
description: Step 5 Investment Verifier Gatekeeper Agent - Hội đồng kiểm định 7 tiêu chuẩn đầu tư chuyên nghiệp trước khi phê duyệt.
---

# Investment Verifier Gatekeeper Skill

Skill này đóng vai trò như Hội đồng Đầu tư (Investment Committee Gatekeeper) độc lập, đánh giá khách quan toàn bộ kế hoạch trước khi phát lệnh giải ngân.

## 7 Tiêu chuẩn Kiểm định
1. **Dữ liệu đầu vào**: Đầy đủ Point-In-Time price bars & báo cáo tài chính.
2. **Luận điểm đầu tư**: Có 3 kịch bản Bull/Base/Bear rõ ràng.
3. **Tiêu chuẩn RRR**: Tỷ lệ Risk/Reward Ratio $\ge 1:2.5$.
4. **An toàn vị thế**: Tỷ trọng $\le 20\%$ tài khoản.
5. **Sanity Check tâm lý đám đông**: Không nhảy vào ngọn sóng hoảng loạn / đua mua hưng phấn tột độ.
6. **Kỷ luật Stop Loss**: Điểm cắt lỗ được xác định rõ ràng.
7. **Quyết định phê duyệt**: Đạt $\ge 5/6$ tiêu chuẩn để được duyệt `APPROVED`.

## Module Python tương ứng
- Class Implementation: [`InvestmentVerifierAgent`](file:///Users/aminhp93/personal/stock/src/agents/verify_agent.py#L8)
- File: [`src/agents/verify_agent.py`](file:///Users/aminhp93/personal/stock/src/agents/verify_agent.py)
