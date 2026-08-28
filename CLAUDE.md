# CLAUDE.md - Stock Investment Multi-Agent System Guidelines

Tài liệu hướng dẫn phát triển cho Claude / Gemini / AI Assistants trên codebase dự án Chứng khoán.

Vui lòng tham khảo chi tiết kiến trúc và quy định tại file [AGENTS.md](file:///Users/aminhp93/personal/stock/AGENTS.md).

---

## ⚡ Quick Reference Commands

```bash
# Running main workflow & behavioral simulation tests
python3 main.py
```

## 🧱 Key Project Paths

- Core Rulebook: [AGENTS.md](file:///Users/aminhp93/personal/stock/AGENTS.md)
- Persona Definitions: [config/personas.json](file:///Users/aminhp93/personal/stock/config/personas.json)
- Base Agent: [backend/agents/base_agent.py](file:///Users/aminhp93/personal/stock/backend/agents/base_agent.py)
- Simulation Engine: [backend/agents/simulator.py](file:///Users/aminhp93/personal/stock/backend/agents/simulator.py)
- Verification Gatekeeper: [backend/agents/verify_agent.py](file:///Users/aminhp93/personal/stock/backend/agents/verify_agent.py)
- Workflow Orchestrator: [backend/workflow/engine.py](file:///Users/aminhp93/personal/stock/backend/workflow/engine.py)
- Time-Series Backtester: [backend/workflow/backtester.py](file:///Users/aminhp93/personal/stock/backend/workflow/backtester.py)
