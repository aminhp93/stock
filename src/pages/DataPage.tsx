import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStocks, fetchDataStats } from '../services/api';
import { StockItem, DataStats } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Table } from 'lucide-react';
import { RawDataModal } from '../components/RawDataModal';

const PAGE_SIZE = 20;

export const DataPage: React.FC = () => {
  const navigate = useNavigate();

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);

  // Search & Filters for Stocks Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('ALL');

  // Pagination State
  const [stockPage, setStockPage] = useState(1);

  // Popup Modal State for Raw Data
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  useEffect(() => {
    fetchStocks().then(setStocks).catch(console.error);
    fetchDataStats().then(setStats).catch(console.error);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setStockPage(1);
  };

  const handleExchangeChange = (ex: string) => {
    setSelectedExchange(ex);
    setStockPage(1);
  };

  const filteredStocks = stocks.filter((s) => {
    const matchSearch = s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchExch = selectedExchange === 'ALL' || s.exchange.toUpperCase() === selectedExchange.toUpperCase();
    return matchSearch && matchExch;
  });

  const totalStockPages = Math.ceil(filteredStocks.length / PAGE_SIZE) || 1;
  const paginatedStocks = filteredStocks.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-7 flex flex-col gap-6 animate-fade-in">
      {/* Database Overview Metric Counters */}
      <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Tổng Số Mã Cổ Phiếu:</span>
            <div className="font-mono text-2xl font-extrabold text-slate-900">
              {stats?.total_stocks.toLocaleString() || '1,403'} <span className="text-xs font-medium text-slate-400">mã</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Tổng Số Nến Giá OHLCV:</span>
            <div className="font-mono text-2xl font-extrabold text-emerald-600">
              {stats?.total_candles.toLocaleString() || '14,750'} <span className="text-xs font-medium text-emerald-600">nến</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Khung Thời Gian Cập Nhật:</span>
            <div className="font-mono text-sm font-bold text-slate-800 mt-1">
              {stats?.date_range || '01/01/2021 ➔ 28/08/2026'}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Trạng Thái Kết Nối:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <strong className="font-mono text-xs font-bold text-emerald-600">{stats?.status || 'ONLINE (POSTGRESQL)'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Danh Mục Cổ Phiếu Table with 20 rows Pagination */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã, tên công ty, ngành..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 mr-1" />
            <span className="text-xs text-slate-500 mr-1">Sàn:</span>
            {['ALL', 'HOSE', 'HNX', 'UPCOM'].map((ex) => (
              <button
                key={ex}
                onClick={() => handleExchangeChange(ex)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors border ${
                  selectedExchange === ex
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full border-collapse text-[13px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11.5px] uppercase font-semibold">
                <th className="px-4 py-2.5">Mã CP</th>
                <th className="px-4 py-2.5">Tên Doanh Nghiệp</th>
                <th className="px-4 py-2.5">Sàn</th>
                <th className="px-4 py-2.5">Ngành Nghề</th>
                <th className="px-4 py-2.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStocks.map((s) => (
                <tr
                  key={s.symbol}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <strong className="font-mono text-sm font-bold text-blue-600">
                      {s.symbol}
                    </strong>
                  </td>
                  <td className="px-4 py-2.5 text-slate-800 font-medium">{s.company_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                      {s.exchange}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{s.sector}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedStock(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                        title={`Xem bảng nến giá thô của ${s.symbol}`}
                      >
                        <Table size={12} className="text-blue-600" />
                        <span>Xem Data</span>
                      </button>
                      <button
                        onClick={() => navigate(`/chart?symbol=${s.symbol}`)}
                        className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-colors shadow-sm"
                      >
                        Biểu Đồ
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard?symbol=${s.symbol}`)}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                      >
                        Giả Lập
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStocks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    Không tìm thấy mã cổ phiếu nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stock Pagination Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
          <span className="text-xs text-slate-500">
            Hiển thị <strong className="font-mono text-slate-800">{paginatedStocks.length > 0 ? (stockPage - 1) * PAGE_SIZE + 1 : 0}</strong> - <strong className="font-mono text-slate-800">{Math.min(stockPage * PAGE_SIZE, filteredStocks.length)}</strong> trên tổng số <strong className="font-mono text-slate-800">{filteredStocks.length.toLocaleString()}</strong> mã
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStockPage(1)}
              disabled={stockPage <= 1}
              className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
              title="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setStockPage((p) => Math.max(p - 1, 1))}
              disabled={stockPage <= 1}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>

            <span className="font-mono text-xs font-bold px-2 text-slate-800">
              {stockPage} / {totalStockPages}
            </span>

            <button
              onClick={() => setStockPage((p) => Math.min(p + 1, totalStockPages))}
              disabled={stockPage >= totalStockPages}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setStockPage(totalStockPages)}
              disabled={stockPage >= totalStockPages}
              className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
              title="Trang cuối"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Raw Data Popup Modal */}
      {selectedStock && (
        <RawDataModal
          symbol={selectedStock.symbol}
          companyName={selectedStock.company_name}
          exchange={selectedStock.exchange}
          sector={selectedStock.sector}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
};
