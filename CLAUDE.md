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
- Base Agent: [src/agents/base_agent.py](file:///Users/aminhp93/personal/stock/src/agents/base_agent.py)
- Simulation Engine: [src/agents/simulator.py](file:///Users/aminhp93/personal/stock/src/agents/simulator.py)
- Verification Gatekeeper: [src/agents/verify_agent.py](file:///Users/aminhp93/personal/stock/src/agents/verify_agent.py)
- Workflow Orchestrator: [src/workflow/engine.py](file:///Users/aminhp93/personal/stock/src/workflow/engine.py)
- Time-Series Backtester: [src/workflow/backtester.py](file:///Users/aminhp93/personal/stock/src/workflow/backtester.py)
