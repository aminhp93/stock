import { StockItem, ChartResponse, StockSummary, SimulationResult, TelegramSentimentResult, DataStats, RawPricesResponse, SyncResult } from '../types';

const API_BASE = '/api';

export async function fetchStocks(): Promise<StockItem[]> {
  try {
    const res = await fetch(`${API_BASE}/stocks`);
    if (!res.ok) throw new Error('Failed to fetch stocks');
    return await res.json();
  } catch (err) {
    console.warn('Using default stocks list:', err);
    return [
      { symbol: 'TCH', company_name: 'CTCP Đầu tư Dịch vụ Tài chính Hoàng Huy', exchange: 'HOSE', sector: 'Bất động sản' },
      { symbol: 'FPT', company_name: 'CTCP FPT', exchange: 'HOSE', sector: 'Công nghệ' },
      { symbol: 'TCB', company_name: 'Ngân hàng Techcombank', exchange: 'HOSE', sector: 'Ngân hàng' },
      { symbol: 'SSI', company_name: 'CTCP Chứng khoán SSI', exchange: 'HOSE', sector: 'Chứng khoán' },
      { symbol: 'HPG', company_name: 'CTCP Tập đoàn Hòa Phát', exchange: 'HOSE', sector: 'Thép' },
      { symbol: 'VNM', company_name: 'CTCP Sữa Việt Nam', exchange: 'HOSE', sector: 'Thực phẩm' },
      { symbol: 'MBB', company_name: 'Ngân hàng Quân Đội', exchange: 'HOSE', sector: 'Ngân hàng' },
      { symbol: 'MWG', company_name: 'CTCP Đầu tư Thế Giới Di Động', exchange: 'HOSE', sector: 'Bán lẻ' },
      { symbol: 'VIC', company_name: 'Tập đoàn Vingroup', exchange: 'HOSE', sector: 'Bất động sản' },
    ];
  }
}

export async function fetchDataStats(): Promise<DataStats> {
  const res = await fetch(`${API_BASE}/data/stats`);
  if (!res.ok) throw new Error('Failed to fetch data stats');
  return await res.json();
}

export async function fetchRawPrices(symbol: string, limit: number = 100): Promise<RawPricesResponse> {
  const res = await fetch(`${API_BASE}/data/raw-prices?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch raw prices');
  return await res.json();
}

export async function syncStockData(symbol: string): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/data/sync?symbol=${encodeURIComponent(symbol)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to sync stock data');
  return await res.json();
}

export async function fetchChartData(symbol: string, startDate: string = '2021-01-01'): Promise<ChartResponse> {
  const res = await fetch(`${API_BASE}/chart?symbol=${encodeURIComponent(symbol)}&start_date=${encodeURIComponent(startDate)}`);
  if (!res.ok) throw new Error('Failed to fetch chart data');
  return await res.json();
}

export async function fetchStockSummary(symbol: string): Promise<StockSummary> {
  const res = await fetch(`${API_BASE}/summary?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error('Failed to fetch stock summary');
  return await res.json();
}

export async function runSimulation(symbol: string, count: number = 10000): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulation?symbol=${encodeURIComponent(symbol)}&count=${count}`);
  if (!res.ok) throw new Error('Failed to run simulation');
  return await res.json();
}

export async function fetchTelegramSentiment(symbol?: string): Promise<TelegramSentimentResult> {
  const url = symbol ? `${API_BASE}/telegram-sentiment?symbol=${encodeURIComponent(symbol)}` : `${API_BASE}/telegram-sentiment`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch telegram sentiment');
  return await res.json();
}
