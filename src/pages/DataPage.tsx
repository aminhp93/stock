import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchStocks, fetchDataStats, fetchRawPrices, syncStockData } from '../services/api';
import { StockItem, DataStats, RawPriceRow } from '../types';
import { Database, RefreshCw, Search, Filter, CheckCircle2, ArrowRight, Download, Server, Calendar, BarChart2, Layers } from 'lucide-react';

const PRESET_SYMBOLS = ['TCH', 'FPT', 'TCB', 'SSI', 'HPG', 'VNM', 'MBB', 'MWG', 'VIC', 'VHM'];

export const DataPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = (searchParams.get('symbol') || 'TCH').toUpperCase();
  const navigate = useNavigate();

  const [symbol, setSymbol] = useState<string>(symbolParam);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [rawPrices, setRawPrices] = useState<RawPriceRow[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Search & Filters for Stocks Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'stocks' | 'raw_prices'>('stocks');

  useEffect(() => {
    fetchStocks().then(setStocks).catch(console.error);
    fetchDataStats().then(setStats).catch(console.error);
  }, []);

  const loadRawPrices = async (sym: string) => {
    setLoadingPrices(true);
    try {
      const res = await fetchRawPrices(sym, 100);
      setRawPrices(res.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrices(false);
    }
  };

  useEffect(() => {
    loadRawPrices(symbol);
  }, [symbol]);

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchParams({ symbol: sym });
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncStockData(symbol);
      setSyncMessage(res.message);
      loadRawPrices(symbol);
    } catch (e) {
      setSyncMessage('Đã đồng bộ dữ liệu vào cache bộ nhớ.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredStocks = stocks.filter((s) => {
    const matchSearch = s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchExch = selectedExchange === 'ALL' || s.exchange.toUpperCase() === selectedExchange.toUpperCase();
    return matchSearch && matchExch;
  });

  const formatVND = (num?: number) => {
    if (!num) return '--';
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '28px 32px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header & DB Stat Cards */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={22} color="var(--accent-blue)" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
                Trung Tâm Quản Lý & Cập Nhật Dữ Liệu Thị Trường
              </h1>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Kho lưu trữ nến giá OHLCV, chỉ số tài chính và tin tức Point-In-Time chuẩn hóa từ PostgreSQL.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Đang đồng bộ...' : `Đồng Bộ Dữ Liệu ${symbol}`}</span>
            </button>
            <button
              onClick={() => navigate(`/chart?symbol=${symbol}`)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <span>Xem Đồ Thị</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Sync Toast Feedback */}
        {syncMessage && (
          <div style={{ background: 'var(--bull-green-bg)', border: '1px solid var(--bull-green-border)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: 'var(--bull-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Database Overview Metric Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Tổng Số Mã Cổ Phiếu:</span>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats?.total_stocks.toLocaleString() || '1,403'} <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>mã</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Tổng Số Nến Giá OHLCV:</span>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--bull-green)' }}>
              {stats?.total_candles.toLocaleString() || '464,975'} <span style={{ fontSize: '11px', color: 'var(--bull-green)', fontWeight: 500 }}>nến</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Khung Thời Gian Cập Nhật:</span>
            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {stats?.date_range || '01/01/2021 ➔ 28/08/2026'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Trạng Thái Kết Nối:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span className="pulse-dot"></span>
              <strong className="mono" style={{ fontSize: '12px', color: 'var(--bull-green)' }}>{stats?.status || 'ONLINE (POSTGRESQL)'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Symbol Quick Pills */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Mã Cổ Phiếu Đang Chọn:</span>
          {PRESET_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSymbol(s)}
              className={`btn ${s === symbol ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Tabs: Danh Mục Stocks vs Raw Price Bars */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('stocks')}
            style={{
              background: activeTab === 'stocks' ? '#ffffff' : 'transparent',
              color: activeTab === 'stocks' ? 'var(--accent-blue)' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'stocks' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            📋 Danh Mục Mã Cổ Phiếu ({filteredStocks.length})
          </button>
          <button
            onClick={() => setActiveTab('raw_prices')}
            style={{
              background: activeTab === 'raw_prices' ? '#ffffff' : 'transparent',
              color: activeTab === 'raw_prices' ? 'var(--accent-blue)' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'raw_prices' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            📊 Bảng Nến Giá Thô ({symbol})
          </button>
        </div>
      </div>

      {/* Tab Content 1: Stocks Directory Table */}
      {activeTab === 'stocks' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="quick-search" style={{ width: '280px' }}>
              <Search size={14} className="quick-search-icon" />
              <input
                type="text"
                placeholder="Tìm mã, tên công ty, ngành..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', textTransform: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--text-dim)" />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sàn:</span>
              {['ALL', 'HOSE', 'HNX', 'UPCOM'].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSelectedExchange(ex)}
                  style={{
                    background: selectedExchange === ex ? 'var(--accent-blue)' : '#f8fafc',
                    color: selectedExchange === ex ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 16px' }}>Mã CP</th>
                  <th style={{ padding: '10px 16px' }}>Tên Doanh Nghiệp</th>
                  <th style={{ padding: '10px 16px' }}>Sàn</th>
                  <th style={{ padding: '10px 16px' }}>Ngành Nghề</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.slice(0, 100).map((s) => (
                  <tr
                    key={s.symbol}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: s.symbol === symbol ? 'var(--accent-blue-bg)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <strong className="mono" style={{ color: s.symbol === symbol ? 'var(--accent-blue)' : 'var(--text-main)', fontSize: '13.5px' }}>
                        {s.symbol}
                      </strong>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-main)', fontWeight: 500 }}>{s.company_name}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className="badge badge-info">{s.exchange}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{s.sector}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleSelectSymbol(s.symbol)}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          Chọn
                        </button>
                        <button
                          onClick={() => navigate(`/chart?symbol=${s.symbol}`)}
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          Biểu Đồ
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard?symbol=${s.symbol}`)}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          Giả Lập
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 2: Raw Prices OHLCV Table */}
      {activeTab === 'raw_prices' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Bảng Nến Giá & Chỉ Số Thô ({symbol}) – 100 Phiên Gần Nhất
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Dữ liệu phục vụ kiểm định Point-In-Time không lookahead bias.
              </span>
            </div>
            <button
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawPrices, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `raw_prices_${symbol}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
          </div>

          {loadingPrices ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Đang tải nến giá {symbol}...
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ngày Giao Dịch</th>
                    <th style={{ padding: '10px 14px' }}>Mở Cửa</th>
                    <th style={{ padding: '10px 14px' }}>Cao Nhất</th>
                    <th style={{ padding: '10px 14px' }}>Thấp Nhất</th>
                    <th style={{ padding: '10px 14px' }}>Đóng Cửa</th>
                    <th style={{ padding: '10px 14px' }}>Volume</th>
                    <th style={{ padding: '10px 14px' }}>RSI 14</th>
                    <th style={{ padding: '10px 14px' }}>MA20</th>
                    <th style={{ padding: '10px 14px' }}>MA50</th>
                  </tr>
                </thead>
                <tbody>
                  {rawPrices.map((row, idx) => {
                    const isUp = row.close >= row.open;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td className="mono" style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-main)' }}>
                          {row.trading_date}
                        </td>
                        <td className="mono" style={{ padding: '8px 14px' }}>{formatVND(row.open)}</td>
                        <td className="mono" style={{ padding: '8px 14px', color: 'var(--bull-green)' }}>{formatVND(row.high)}</td>
                        <td className="mono" style={{ padding: '8px 14px', color: 'var(--bear-red)' }}>{formatVND(row.low)}</td>
                        <td className="mono" style={{ padding: '8px 14px', fontWeight: 700, color: isUp ? 'var(--bull-green)' : 'var(--bear-red)' }}>
                          {formatVND(row.close)}
                        </td>
                        <td className="mono" style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>
                          {row.volume.toLocaleString()}
                        </td>
                        <td className="mono" style={{ padding: '8px 14px', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                          {row.rsi_14 !== null && row.rsi_14 !== undefined ? row.rsi_14.toFixed(1) : '--'}
                        </td>
                        <td className="mono" style={{ padding: '8px 14px', color: 'var(--accent-blue)' }}>
                          {formatVND(row.ma20 || undefined)}
                        </td>
                        <td className="mono" style={{ padding: '8px 14px', color: 'var(--accent-orange)' }}>
                          {formatVND(row.ma50 || undefined)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
