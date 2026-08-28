import React, { useState, useEffect } from 'react';
import { fetchRawPrices, syncStockData } from '../services/api';
import { RawPriceRow } from '../types';
import { X, Download, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, FileSpreadsheet } from 'lucide-react';

interface RawDataModalProps {
  symbol: string;
  companyName?: string;
  exchange?: string;
  sector?: string;
  onClose: () => void;
}

const PAGE_SIZE = 20;

export const RawDataModal: React.FC<RawDataModalProps> = ({ symbol, companyName, exchange, sector, onClose }) => {
  const [prices, setPrices] = useState<RawPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchRawPrices(symbol, 100);
      setPrices(res.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setPage(1);

    // Khóa cuộn trang nền và bắt phím ESC
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [symbol]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncStockData(symbol);
      setSyncMessage(res.message);
      await loadData();
    } catch (e) {
      setSyncMessage(`Đã cập nhật dữ liệu nến cho ${symbol}.`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prices, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `raw_prices_${symbol}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalPages = Math.ceil(prices.length / PAGE_SIZE) || 1;
  const paginatedPrices = prices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatVND = (num?: number) => {
    if (!num) return '--';
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 sm:p-6 overflow-hidden" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-fade-in my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <FileSpreadsheet size={22} className="text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black text-blue-600">
                  {symbol}
                </span>
                {exchange && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    {exchange}
                  </span>
                )}
                {sector && <span className="text-xs text-slate-400">• {sector}</span>}
              </div>
              <p className="text-xs font-medium text-slate-700 m-0">
                {companyName || 'Dữ liệu nến giá kỹ thuật Point-In-Time'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              title="Đồng bộ dữ liệu nến mới nhất"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Đang đồng bộ...' : 'Đồng Bộ'}</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              title="Xuất file JSON"
            >
              <Download size={13} />
              <span>JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Sync Toast Feedback */}
          {syncMessage && (
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Table Tab Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                📊 Bảng Nến Giá Thô (Raw OHLCV)
              </span>
              <span className="text-xs text-slate-400">
                ({prices.length} phiên giao dịch gần nhất)
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Đang tải dữ liệu nến giá {symbol}...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                <table className="w-full border-collapse text-xs text-right">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold sticky top-0 z-10">
                      <th className="px-3.5 py-2.5 text-left">Ngày Giao Dịch</th>
                      <th className="px-3.5 py-2.5">Mở Cửa</th>
                      <th className="px-3.5 py-2.5">Cao Nhất</th>
                      <th className="px-3.5 py-2.5">Thấp Nhất</th>
                      <th className="px-3.5 py-2.5">Đóng Cửa</th>
                      <th className="px-3.5 py-2.5">Volume</th>
                      <th className="px-3.5 py-2.5">RSI 14</th>
                      <th className="px-3.5 py-2.5">MA20</th>
                      <th className="px-3.5 py-2.5">MA50</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPrices.map((row, idx) => {
                      const isUp = row.close >= row.open;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="font-mono px-3.5 py-2 text-left font-bold text-slate-800">
                            {row.trading_date}
                          </td>
                          <td className="font-mono px-3.5 py-2 text-slate-700">{formatVND(row.open)}</td>
                          <td className="font-mono px-3.5 py-2 text-emerald-600 font-semibold">{formatVND(row.high)}</td>
                          <td className="font-mono px-3.5 py-2 text-red-600 font-semibold">{formatVND(row.low)}</td>
                          <td className={`font-mono px-3.5 py-2 font-extrabold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatVND(row.close)}
                          </td>
                          <td className="font-mono px-3.5 py-2 text-slate-500">
                            {row.volume.toLocaleString()}
                          </td>
                          <td className="font-mono px-3.5 py-2 text-amber-600 font-bold">
                            {row.rsi_14 !== null && row.rsi_14 !== undefined ? row.rsi_14.toFixed(1) : '--'}
                          </td>
                          <td className="font-mono px-3.5 py-2 text-blue-600 font-medium">
                            {formatVND(row.ma20 || undefined)}
                          </td>
                          <td className="font-mono px-3.5 py-2 text-orange-600 font-medium">
                            {formatVND(row.ma50 || undefined)}
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedPrices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                          Chưa có dữ liệu nến giá cho mã {symbol}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Pagination Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
                <span className="text-xs text-slate-500">
                  Hiển thị <strong className="font-mono text-slate-800">{paginatedPrices.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}</strong> - <strong className="font-mono text-slate-800">{Math.min(page * PAGE_SIZE, prices.length)}</strong> trên tổng số <strong className="font-mono text-slate-800">{prices.length}</strong> nến
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-xs font-semibold transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>Trước</span>
                  </button>

                  <span className="font-mono text-xs font-bold px-2 text-slate-800">
                    {page} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-xs font-semibold transition-colors"
                  >
                    <span>Sau</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
                    title="Trang cuối"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
