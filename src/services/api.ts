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
  return await res.json();
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

export async function fetchObsComments(ticker?: string, limit = 50): Promise<{
  comments: ObsComment[];
  total: number;
}> {
  const q = ticker ? `?ticker=${encodeURIComponent(ticker)}&limit=${limit}` : `?limit=${limit}`;
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
