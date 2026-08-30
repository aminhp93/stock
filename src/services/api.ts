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

export async function fetchFullResync(
  symbol: string,
): Promise<{
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
  return await res.json();
}
