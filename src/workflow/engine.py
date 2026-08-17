from typing import Dict, Any
from src.agents.data_agent import DataCollectorAgent
from src.agents.market_agent import MarketAnalyzerAgent
from src.agents.simulator import BehavioralSimulationEngine
from src.agents.strategy_agent import StrategyAgent
from src.agents.risk_agent import RiskManagerAgent
from src.agents.verify_agent import InvestmentVerifierAgent
from src.utils.formatters import format_consensus_report, format_verification_report

class InvestmentWorkflowEngine:
    def __init__(self):
        self.data_agent = DataCollectorAgent()
        self.market_agent = MarketAnalyzerAgent()
        self.simulator = BehavioralSimulationEngine()
        self.strategy_agent = StrategyAgent()
        self.risk_agent = RiskManagerAgent()
        self.verifier = InvestmentVerifierAgent()

    def run_pipeline(self, symbol: str, timestamp: str, current_price: float, verbose: bool = True) -> Dict[str, Any]:
        """
        Execute full 5-step investment workflow pipeline
        """
        if verbose:
            print(f"\n⚡ ĐANG CHẠY QUY TRÌNH ĐẦU TƯ MULTI-AGENT CHO MÃ: {symbol} (Thời điểm: {timestamp})")
            print("--------------------------------------------------------------------------------")

        # Step 1: Data Collection
        if verbose: print("[Step 1/5] 📊 DataCollectionAgent: Đang thu thập & đóng gói dữ liệu...")
        data_res = self.data_agent.execute({"symbol": symbol, "timestamp": timestamp, "current_price": current_price})
        ctx = data_res["market_context"]

        # Step 2A: Market Analysis
        if verbose: print("[Step 2A/5] 📈 MarketAnalyzerAgent: Phân tích Kỹ thuật & Định giá cơ bản...")
        market_res = self.market_agent.execute({"market_context": ctx})
        analysis = market_res["market_analysis"]

        # Step 2B: 10-Investor Behavioral Simulation
        if verbose: print("[Step 2B/5] 🧠 SimulationEngine: Đang giả lập hành vi 10 Nhà đầu tư...")
        sim_res = self.simulator.execute({"market_context": ctx, "market_analysis": analysis})
        consensus = sim_res["simulation_consensus"]
        
        if verbose:
            print(format_consensus_report(consensus))

        # Step 3: Strategy & Trading Scenarios
        if verbose: print("[Step 3/5] 🎯 StrategyAgent: Lập kịch bản Bull/Base/Bear & vùng mua...")
        strat_res = self.strategy_agent.execute({
            "market_context": ctx,
            "market_analysis": analysis,
            "simulation_consensus": consensus
        })
        plan = strat_res["trading_plan"]

        # Step 4: Risk Management
        if verbose: print("[Step 4/5] 🛡️ RiskManagerAgent: Đánh giá vị thế Kelly & Drawdown...")
        risk_res = self.risk_agent.execute({"trading_plan": plan})
        risk = risk_res["risk_assessment"]

        # Step 5: Verification Gatekeeper
        if verbose: print("[Step 5/5] 🔍 InvestmentVerifierAgent: Hội đồng Xác thực kiểm định 7 tiêu chí...")
        verify_res = self.verifier.execute({
            "market_context": ctx,
            "simulation_consensus": consensus,
            "trading_plan": plan,
            "risk_assessment": risk
        })
        verdict = verify_res["verification_verdict"]

        if verbose:
            print(format_verification_report(verdict, plan, risk))

        return {
            "market_context": ctx,
            "market_analysis": analysis,
            "simulation_consensus": consensus,
            "trading_plan": plan,
            "risk_assessment": risk,
            "verification_verdict": verdict
        }
