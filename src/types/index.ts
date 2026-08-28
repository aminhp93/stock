export interface StockItem {
  symbol: string;
  company_name: string;
  exchange: string;
  sector: string;
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number | null;
  ma20?: number | null;
  ma50?: number | null;
}

export interface ChartResponse {
  symbol: string;
  data: ChartDataPoint[];
}

export interface RawPriceRow {
  trading_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi_14?: number | null;
  ma20?: number | null;
  ma50?: number | null;
}

export interface RawPricesResponse {
  symbol: string;
  total_rows: number;
  rows: RawPriceRow[];
}

export interface DataStats {
  total_stocks: number;
  total_candles: number;
  exchanges: Record<string, number>;
  date_range: string;
  status: string;
}

export interface SyncResult {
  status: string;
  symbol: string;
  message: string;
  synced_bars: number;
  latest_date: string;
  sync_time: string;
}

export interface PersonaDecision {
  persona_id: string;
  persona_name: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'PANIC_SELL' | 'FOMO_BUY';
  confidence: number;
  sentiment_score: number;
  expected_target_price?: number;
  reasoning: string;
}

export interface ScenarioDetail {
  scenario: 'BULL' | 'BASE' | 'BEAR';
  probability: number;
  target_price: number;
  catalysts: string[];
  risks: string[];
}

export interface VerificationCheckItem {
  criterion: string;
  passed: boolean;
  details: string;
}

export interface FinancialMetrics {
  pe_ratio: number;
  pb_ratio: number;
  roe: number;
  profit_margin: number;
  revenue_growth_yoy: number;
  eps: number;
  intrinsic_value_dcf: number;
  debt_to_equity: number;
}

export interface MacroNews {
  headline: string;
  sentiment_score: number;
  category: string;
  importance: number;
}

export interface StockSummary {
  symbol: string;
  current_price: number;
  company_name: string;
  sector?: string;
  timestamp?: string;
  market_index_change_pct?: number;
  technical_trend: string;
  is_uptrend?: boolean;
  is_undervalued?: boolean;
  is_overbought?: boolean;
  is_oversold?: boolean;
  rsi?: number;
  margin_of_safety_pct: number;
  news_sentiment_score?: number;
  market_analysis_summary?: string;

  sentiment_index: number;
  buy_pct: number;
  sell_pct: number;
  hold_pct: number;
  panic_pct: number;
  consensus_summary?: string;
  individual_decisions?: PersonaDecision[];

  recommendation: string;
  entry_zone: [number, number];
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number;
  recommended_holding_period?: string;
  allocation_pct?: number;
  risk_reward_ratio: number;
  thesis_summary?: string;
  scenarios?: ScenarioDetail[];

  position_size_pct: number;
  potential_loss_pct?: number;
  risk_reward_ratio_valid?: boolean;
  stress_test_drawdown_impact_pct?: number;
  risk_warnings?: string[];

  approved?: boolean;
  verdict: string;
  verifier_score: number;
  verifier_notes: string;
  recommendations?: string[];
  checklist?: VerificationCheckItem[];

  financials?: FinancialMetrics;
  news_events?: MacroNews[];
  error?: string;
}

export interface SimulationResult {
  total_agents: number;
  buy_pct: number;
  sell_pct: number;
  hold_pct: number;
  panic_pct: number;
  market_state: string;
}

export interface TelegramSentimentResult {
  sentiment_score: number;
  sentiment_label: string;
  euphoria_percentage: number;
  panic_percentage: number;
  total_messages: number;
  risk_assessment: string;
  summary: string;
  error?: string;
}
