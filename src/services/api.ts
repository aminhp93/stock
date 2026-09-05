import {
  StockItem,
  ChartResponse,
  StockSummary,
  SimulationResult,
  TelegramSentimentResult,
  DataStats,
  RawPricesResponse,
  SyncResult,
} from "../types";

const API_BASE = "/api";

export async function fetchStocks(): Promise<StockItem[]> {
  const res = await fetch(`${API_BASE}/stocks`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: "Không thể kết nối cơ sở dữ liệu PostgreSQL (Bảng stocks).",
    }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchDataStats(): Promise<DataStats> {
  const res = await fetch(`${API_BASE}/data/stats`);
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Không thể kết nối cơ sở dữ liệu PostgreSQL." }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchRawPrices(
  symbol: string,
  limit: number = 100,
): Promise<RawPricesResponse> {
  const res = await fetch(
    `${API_BASE}/data/raw-prices?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: `Không thể tải nến giá cho mã ${symbol} từ PostgreSQL.`,
    }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function syncStockData(symbol: string): Promise<SyncResult> {
  const res = await fetch(
    `${API_BASE}/data/sync?symbol=${encodeURIComponent(symbol)}`,
    {
      method: "POST",
    },
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: `Không thể đồng bộ nến giá cho mã ${symbol}.` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchChartData(
  symbol: string,
  startDate: string = "2021-01-01",
): Promise<ChartResponse> {
  const res = await fetch(
    `${API_BASE}/chart?symbol=${encodeURIComponent(symbol)}&start_date=${encodeURIComponent(startDate)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: `Không thể tải nến giá đồ thị cho mã ${symbol} từ PostgreSQL.`,
    }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export interface TickerSignals {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  as_of: string;
  price: number;
  reward_risk: {
    support: number;
    resistance_near: number;
    resistance_far: number;
    risk_pct: number | null;
    reward_pct: number | null;
    reward_far_pct: number | null;
    rr: number | null;
    rr_far: number | null;
    valid: boolean;
  };
  technical: {
    ma20: number | null;
    ma50: number | null;
    ma200: number | null;
    above_ma20: boolean;
    above_ma50: boolean;
    above_ma200: boolean;
    rsi_14: number | null;
    high_52w: number;
    low_52w: number;
    pct_from_high_52w: number | null;
    pct_from_low_52w: number | null;
    dist_to_ma50_pct: number | null;
  };
  liquidity: { turnover_20d_bn: number };
  cfa99: {
    mentions_60d: number;
    questions_60d: number;
    bullish_60d: number;
    bearish_60d: number;
    fomo_60d: number;
    fear_60d: number;
    net_bull_pct: number | null;
  };
  foreign: {
    trading_date?: string;
    net_val_bn?: number;
    net_5d_bn?: number;
    room_left_pct?: number | null;
  };
  fundamentals: {
    pe?: number | null; pb?: number | null; ps?: number | null;
    dividend_yield?: number | null; eps_ttm?: number | null; eps_growth_yoy?: number | null;
    net_margin_ttm?: number | null; gross_margin_ttm?: number | null;
    roe?: number | null; roa?: number | null; roic?: number | null;
    revenue_growth_yoy?: number | null; profit_growth_yoy?: number | null;
    debt_to_equity?: number | null; current_ratio?: number | null;
    interest_coverage?: number | null; foreign_ownership?: number | null; beta?: number | null;
    as_of_date?: string | null;
    risk_flags?: string[];
    not_too_risky?: boolean;
  };
  sentiment: {
    technical_score: number;
    composite_gauge: number;
    label: string;
  };
  error?: string;
}

export async function fetchTickerSignals(
  symbol: string,
): Promise<TickerSignals> {
  const res = await fetch(
    `${API_BASE}/ticker-signals?symbol=${encodeURIComponent(symbol)}`,
  );
  return res.json();
}

// ─── Strategy Test (tab "Test Chiến Lược") ───────────────────────────────────
export interface StrategyBacktestResult {
  run_id: number;
  status: "running" | "done" | "error" | "none";
  started_at: string | null;
  finished_at: string | null;
  sample_start: string | null;
  sample_end: string | null;
  n_samples: number | null;
  top20_ret5d: number | null;
  universe_ret5d: number | null;
  edge_5d: number | null;
  top20_ret10d: number | null;
  hit_rate_5d: number | null;
  error: string | null;
}

export interface TradeBacktestBlock {
  n: number;
  win_rate: number;
  avg_ret_pct: number;
  avg_r: number;
  profit_factor: number | null;
}

export interface TradeBacktestResult {
  run_id: number;
  status: "running" | "done" | "error" | "none";
  started_at: string | null;
  finished_at: string | null;
  sample_start: string | null;
  sample_end: string | null;
  n_trades: number | null;
  n_symbols: number | null;
  win_rate: number | null;
  avg_ret_pct: number | null;
  avg_r: number | null;
  profit_factor: number | null;
  avg_hold_days: number | null;
  avg_risk_pct: number | null;
  max_concurrent: number | null;
  exit_reasons: Record<string, number> | null;
  year_breakdown: Record<string, TradeBacktestBlock> | null;
  fund_all: TradeBacktestBlock | null;
  fund_ok: TradeBacktestBlock | null;
  fund_risky: TradeBacktestBlock | null;
  error: string | null;
}

export interface StrategyListItem {
  code: string;
  kind: "rank" | "trade";
  label: string;
  desc: string;
  latest_backtest: StrategyBacktestResult | TradeBacktestResult | null;
}

export interface StrategyMetric {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}

export interface StrategyRankRow {
  symbol: string;
  score: number;
  close: number;
  turn_bn: number;
  metrics: StrategyMetric[];
}

export interface StrategyRankResult {
  strategy: string;
  as_of: string;
  universe_size: number;
  results: StrategyRankRow[];
  error?: string;
}

export async function fetchStrategyList(): Promise<{ strategies: StrategyListItem[] }> {
  const res = await fetch(`${API_BASE}/strategy/list`);
  return res.json();
}

export async function fetchStrategyRank(
  strategy: string,
  topn = 15,
  asof?: string,
): Promise<StrategyRankResult> {
  const q = new URLSearchParams({ strategy, topn: String(topn) });
  if (asof) q.set("asof", asof);
  const res = await fetch(`${API_BASE}/strategy/rank?${q.toString()}`);
  return res.json();
}

export async function triggerStrategyBacktest(strategy: string): Promise<{
  status: string;
  run_id: number;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/strategy/backtest?strategy=${encodeURIComponent(strategy)}`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchStrategyBacktestStatus(
  strategy: string,
): Promise<{ status: "running" | "done" | "error" | "none"; error: string | null }> {
  const res = await fetch(`${API_BASE}/strategy/backtest-status?strategy=${encodeURIComponent(strategy)}`);
  return res.json();
}

export async function fetchStockSummary(symbol: string): Promise<StockSummary> {
  const res = await fetch(
    `${API_BASE}/summary?symbol=${encodeURIComponent(symbol)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: `Không thể chạy pipeline phân tích cho mã ${symbol}.`,
    }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function runSimulation(
  symbol: string,
  count: number = 10000,
): Promise<SimulationResult> {
  const res = await fetch(
    `${API_BASE}/simulation?symbol=${encodeURIComponent(symbol)}&count=${count}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: `Không thể chạy mô phỏng Monte Carlo cho mã ${symbol}.`,
    }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchTelegramSentiment(
  symbol?: string,
): Promise<TelegramSentimentResult> {
  const url = symbol
    ? `${API_BASE}/telegram-sentiment?symbol=${encodeURIComponent(symbol)}`
    : `${API_BASE}/telegram-sentiment`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Không thể phân tích sentiment Telegram." }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchNavHistory(
  productId: number,
): Promise<{ navHistories?: { navDate: string; nav: number }[] }> {
  const res = await fetch(`${API_BASE}/nav-history?productId=${productId}`);
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Không thể tải NAV history." }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const payload = await res.json();
  let rawHistories: any[] = [];

  if (Array.isArray(payload?.navHistories)) {
    rawHistories = payload.navHistories;
  } else if (Array.isArray(payload?.data?.navHistories)) {
    rawHistories = payload.data.navHistories;
  } else if (Array.isArray(payload?.data)) {
    rawHistories = payload.data;
  } else if (Array.isArray(payload)) {
    rawHistories = payload;
  }

  const navHistories = rawHistories
    .filter((item: any) => item?.navDate && item?.nav != null)
    .map((item: any) => ({
      navDate: String(item.navDate),
      nav: Number(item.nav),
    }))
    .filter((item: { navDate: string; nav: number }) =>
      Number.isFinite(item.nav),
    );

  return { navHistories };
}

export async function fetchFullResync(symbol: string): Promise<{
  status: string;
  message: string;
  inserted_bars: number;
  deleted_bars: number;
}> {
  const res = await fetch(
    `${API_BASE}/data/full-resync?symbol=${encodeURIComponent(symbol)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Lỗi full resync." }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Observation API ─────────────────────────────────────────────────────────
export interface ObsCollectionTask {
  phase: number;
  task: string;
  status: "pending" | "running" | "done" | "error";
  detail: string;
  items: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface ObsVideo {
  video_id: string;
  title: string;
  published_at: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_sec: number;
  views: number;
  likes: number;
  comments: number;
  snapshot_at: string | null;
}

export interface ObsStats {
  videos: number;
  comments: number;
  transcript_segments: number;
  classifications: number;
  ticker_mention_rows: number;
}

export interface ObsDailyMetric {
  date: string;
  total_views: number;
  view_ratio: number;
  total_comments: number;
  comment_intensity: number;
  comment_velocity: number;
  total_questions: number;
  question_intensity: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  bullish_pct: number;
  bearish_pct: number;
  fomo_raw: number;
  fomo_mean_30d: number;
  fomo_std_30d: number;
  fomo_z: number;
  fear_raw: number;
  fear_mean_30d: number;
  fear_std_30d: number;
  fear_z: number;
  uncertainty_raw: number;
  uncertainty_mean_30d: number;
  uncertainty_std_30d: number;
  uncertainty_z: number;
  vnindex_open: number;
  vnindex_high: number;
  vnindex_low: number;
  vnindex_close: number;
  vnindex_change_pct: number;
  vnindex_volume: number;
  breadth_adv: number;
  breadth_dec: number;
  breadth_unch: number;
  foreign_buy: number;
  foreign_sell: number;
  foreign_net: number;
  vnindex_ret_1d: number;
  vnindex_ret_3d: number;
  vnindex_ret_5d: number;
  vnindex_ret_10d: number;
}

export interface ObsTickerMention {
  ticker: string;
  mentions: number;
  questions: number;
  bullish_count: number;
  bearish_count: number;
  fomo_count: number;
  fear_count: number;
  sentiment: number;
  delta_attn: number;
  avg_mentions: number;
}

export interface ObsDivergence {
  ticker: string;
  creator: number;
  recommendation: string;
  audience: number;
  divergence: number;
  consensus: string;
  summary: string;
  mentions: number;
}

export interface ObsSignalStat {
  signal: string;
  desc: string;
  n_obs: number;
  r1d: number;
  r3d: number;
  r5d: number;
  r10d: number;
  win_rate: number;
}

export interface ObsComment {
  comment_id: string;
  video_id: string;
  published_at: string | null;
  text: string;
  likes: number;
  sentiment: string;
  emotion: string;
  intent: string;
  tickers: string[];
}

export async function fetchObsStatus(): Promise<{
  tasks: ObsCollectionTask[];
}> {
  const res = await fetch(`${API_BASE}/observation/status`);
  return res.json();
}

export async function fetchObsVideos(): Promise<{
  videos: ObsVideo[];
  total: number;
}> {
  const res = await fetch(`${API_BASE}/observation/videos`);
  return res.json();
}

export async function fetchObsStats(): Promise<ObsStats> {
  const res = await fetch(`${API_BASE}/observation/stats`);
  return res.json();
}

export async function fetchObsDailyMetrics(): Promise<{
  metrics: ObsDailyMetric[];
  total: number;
}> {
  const res = await fetch(`${API_BASE}/observation/daily-metrics`);
  return res.json();
}

export async function fetchObsTickerMentions(): Promise<{
  tickers: ObsTickerMention[];
  total: number;
}> {
  const res = await fetch(`${API_BASE}/observation/ticker-mentions`);
  return res.json();
}

export async function fetchObsDivergence(): Promise<{
  divergence: ObsDivergence[];
}> {
  const res = await fetch(`${API_BASE}/observation/divergence`);
  return res.json();
}

export async function fetchObsSignalBacktest(): Promise<{
  signals: ObsSignalStat[];
}> {
  const res = await fetch(`${API_BASE}/observation/backtest`);
  return res.json();
}

export interface ObsPsychologyDay {
  trading_date: string;
  has_retail: boolean;
  vnindex_close: number | null;
  vnindex_ret_1d: number | null;
  fwd_ret_1d: number | null;
  fwd_ret_5d: number | null;
  fwd_ret_10d: number | null;
  realized_vol_20d: number | null;
  drawdown_52w: number | null;
  vol_ratio_20d: number | null;
  pct_above_ma20: number | null;
  pct_above_ma50: number | null;
  pct_above_ma200: number | null;
  adv_dec_ratio: number | null;
  nh_nl_diff: number | null;
  foreign_net_bn: number | null;
  foreign_net_5d_bn: number | null;
  foreign_net_20d_bn: number | null;
  retail_views: number | null;
  retail_view_ratio: number | null;
  retail_comments: number | null;
  retail_questions: number | null;
  retail_bull_pct: number | null;
  retail_bear_pct: number | null;
  retail_fomo_raw: number | null;
  retail_fear_raw: number | null;
  n_tickers_mentioned: number | null;
  gt_chung_khoan: number | null;
  gt_co_phieu: number | null;
  idx_retail_attention: number | null;
  idx_retail_sentiment: number | null;
  idx_fomo: number | null;
  idx_fear_capitulation: number | null;
  idx_stock_attention: number | null;
  psychology_composite_z: number | null;
  psychology_gauge: number | null;
  psychology_label: string | null;
}

export async function fetchObsPsychology(): Promise<{
  series: ObsPsychologyDay[];
  total: number;
  latest: ObsPsychologyDay;
  gauge: number | null;
  label: string | null;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/observation/psychology`);
  return res.json();
}

export async function fetchObsComments(
  ticker?: string,
  limit = 50,
): Promise<{
  comments: ObsComment[];
  total: number;
}> {
  const q = ticker
    ? `?ticker=${encodeURIComponent(ticker)}&limit=${limit}`
    : `?limit=${limit}`;
  const res = await fetch(`${API_BASE}/observation/comments${q}`);
  return res.json();
}

export async function triggerObsCollect(): Promise<{
  status: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/observation/collect`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function triggerObsSeedSample(): Promise<{
  status: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/observation/seed-sample`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
