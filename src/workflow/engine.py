from typing import Dict, Any, Optional
from src.agents.data_agent import DataCollectorAgent
from src.agents.market_agent import MarketAnalyzerAgent
from src.agents.simulator import BehavioralSimulationEngine
from src.agents.strategy_agent import StrategyAgent
from src.agents.risk_agent import RiskManagerAgent
from src.agents.verify_agent import InvestmentVerifierAgent

from src.models.market_data import MarketContext, MarketAnalysis
from src.models.persona import SimulationConsensus
from src.models.strategy import TradingPlan, RiskAssessment, VerificationVerdict
from src.utils.formatters import (
    format_market_context_summary,
    format_market_analysis_summary,
    format_consensus_report,
    format_trading_plan,
    format_verification_verdict
)

class InvestmentWorkflowEngine:
    def __init__(self):
        self.data_agent = DataCollectorAgent()
        self.market_agent = MarketAnalyzerAgent()
        self.simulator = BehavioralSimulationEngine()
        self.strategy_agent = StrategyAgent()
        self.risk_agent = RiskManagerAgent()
        self.verify_agent = InvestmentVerifierAgent()

    def run_pipeline(
        self,
        symbol: str,
        timestamp: str = "2025-12-31",
        current_price: Optional[float] = None,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Thực thi quy trình 5 bước khép kín cho một mã cổ phiếu tại mốc thời gian T
        """
        if verbose:
            print(f"\n⚡ ĐANG CHẠY QUY TRÌNH ĐẦU TƯ MULTI-AGENT CHO MÃ: {symbol} (Thời điểm: {timestamp})")
            print("-" * 80)
        
        # Step 1: Data Collection
        if verbose:
            print("[Step 1/5] 📊 DataCollectionAgent: Đang thu thập & đóng gói dữ liệu...")
        inputs_1 = {"symbol": symbol, "timestamp": timestamp}
        if current_price:
            inputs_1["current_price"] = current_price
        res_1 = self.data_agent.execute(inputs_1)
        context: MarketContext = res_1["market_context"]
        
        # Step 2A: Market Analysis
        if verbose:
            print("[Step 2A/5] 📈 MarketAnalyzerAgent: Phân tích Kỹ thuật & Định giá cơ bản...")
        res_2a = self.market_agent.execute({"market_context": context})
        analysis: MarketAnalysis = res_2a["market_analysis"]
        
        # Step 2B: Investor Behavior Simulation
        if verbose:
            print("[Step 2B/5] 🧠 SimulationEngine: Đang giả lập hành vi 10 Nhà đầu tư...")
        res_2b = self.simulator.execute({
            "market_context": context,
            "market_analysis": analysis
        })
        consensus: SimulationConsensus = res_2b["simulation_consensus"]
        if verbose:
            print(format_consensus_report(consensus))
        
        # Step 3: Strategy & Scenario Formulation
        if verbose:
            print("[Step 3/5] 🎯 StrategyAgent: Lập kịch bản Bull/Base/Bear & vùng mua...")
        res_3 = self.strategy_agent.execute({
            "market_context": context,
            "market_analysis": analysis,
            "simulation_consensus": consensus
        })
        plan: TradingPlan = res_3["trading_plan"]
        
        # Step 4: Risk Management & Position Sizing
        if verbose:
            print("[Step 4/5] 🛡️ RiskManagerAgent: Đánh giá vị thế Kelly & Drawdown...")
        res_4 = self.risk_agent.execute({
            "market_context": context,
            "trading_plan": plan
        })
        risk: RiskAssessment = res_4["risk_assessment"]
        
        # Step 5: Investment Verification Gatekeeper
        if verbose:
            print("[Step 5/5] 🔍 InvestmentVerifierAgent: Hội đồng Xác thực kiểm định 7 tiêu chí...")
        res_5 = self.verify_agent.execute({
            "market_context": context,
            "market_analysis": analysis,
            "simulation_consensus": consensus,
            "trading_plan": plan,
            "risk_assessment": risk
        })
        verdict: VerificationVerdict = res_5["verification_verdict"]
        if verbose:
            print(format_verification_verdict(verdict))
        
        return {
            "market_context": context,
            "market_analysis": analysis,
            "simulation_consensus": consensus,
            "trading_plan": plan,
            "risk_assessment": risk,
            "verification_verdict": verdict
        }
