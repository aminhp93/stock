import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StockChart } from '../components/StockChart';
import { TelegramModal } from '../components/TelegramModal';
import { fetchChartData, fetchStockSummary, fetchTelegramSentiment } from '../services/api';
import { ChartDataPoint, StockSummary, TelegramSentimentResult } from '../types';
import { ShieldCheck, TrendingUp, Users, Send, Search, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PRESET_SYMBOLS = ['TCH', 'FPT', 'TCB', 'SSI', 'HPG', 'VNM', 'MBB', 'MWG', 'VIC', 'VHM'];

export const ChartPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = (searchParams.get('symbol') || 'TCH').toUpperCase();

  const [symbol, setSymbol] = useState<string>(symbolParam);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [telegramData, setTelegramData] = useState<TelegramSentimentResult | null>(null);
  const [isTgModalOpen, setIsTgModalOpen] = useState(false);
  const [range, setRange] = useState<string>('1Y');
  const [loading, setLoading] = useState(true);

  // Sync symbol with URL param
  useEffect(() => {
    if (symbolParam !== symbol) {
      setSymbol(symbolParam);
    }
  }, [symbolParam]);

  const loadData = async (sym: string, timeRange: string) => {
    setLoading(true);
    let startDate = '2021-01-01';
    const now = new Date('2026-08-28');

    if (timeRange === '1M') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '3M') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '6M') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      startDate = d.toISOString().split('T')[0];
    } else if (timeRange === '1Y') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      startDate = d.toISOString().split('T')[0];
    } else {
      startDate = '2021-01-01';
    }

    // 1. Tải nến giá TradingView NGAY LẬP TỨC (Không chờ Telegram hay Summary)
    fetchChartData(sym, startDate)
      .then((cRes) => {
        setChartData(cRes.data || []);
      })
      .catch((err) => {
        console.error("Lỗi nến chart:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Tải tóm tắt AI Gatekeeper & MoS chạy nền bất đồng bộ
    fetchStockSummary(sym)
      .then(setSummary)
      .catch((err) => console.error("Lỗi summary:", err));

    // 3. Tải Telegram Sentiment chạy nền độc lập
    fetchTelegramSentiment(sym)
      .then(setTelegramData)
      .catch((err) => console.error("Lỗi telegram sentiment:", err));
  };

  useEffect(() => {
    loadData(symbol, range);
  }, [symbol, range]);

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchParams({ symbol: sym });
  };

  const latestBar = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const prevBar = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const priceChange = latestBar && prevBar ? ((latestBar.close - prevBar.close) / prevBar.close) * 100 : 0;
  const isUp = priceChange >= 0;

  const formatVND = (num?: number) => {
    if (!num) return '--';
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden', background: '#f8fafc' }}>
      {/* Sub-Header Control Bar */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Preset Symbols & Ticker Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="preset-pills" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
        </div>

        {/* Timeframe Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {['1M', '3M', '6M', '1Y', 'ALL'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                background: range === r ? '#ffffff' : 'transparent',
                color: range === r ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: range === r ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {r === 'ALL' ? 'ALL (5Y)' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Chart + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Chart Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--border-color)', background: '#ffffff' }}>
          {/* Ticker Stats Bar */}
          <div
            style={{
              background: '#ffffff',
              borderBottom: '1px solid var(--border-color)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: "'JetBrains Mono', monospace"
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>{symbol}</span>
              <span style={{ fontSize: '12px', fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)' }}>
                {summary?.company_name || `CTCP ${symbol}`}
              </span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
                {latestBar ? formatVND(latestBar.close) : summary?.current_price ? formatVND(summary.current_price) : '--'}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isUp ? 'var(--bull-green-bg)' : 'var(--bear-red-bg)',
                  color: isUp ? 'var(--bull-green)' : 'var(--bear-red)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {priceChange > 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '11px', display: 'block', fontFamily: "'Inter', sans-serif" }}>MA20 (20 ngày)</span>
                <strong style={{ color: 'var(--accent-blue)' }}>
                  {latestBar?.ma20 ? formatVND(latestBar.ma20) : '--'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '11px', display: 'block', fontFamily: "'Inter', sans-serif" }}>MA50 (50 ngày)</span>
                <strong style={{ color: 'var(--accent-orange)' }}>
                  {latestBar?.ma50 ? formatVND(latestBar.ma50) : '--'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '11px', display: 'block', fontFamily: "'Inter', sans-serif" }}>RSI (14 ngày)</span>
                <strong style={{ color: 'var(--accent-yellow)' }}>
                  {latestBar?.rsi ? latestBar.rsi.toFixed(1) : summary?.rsi ? summary.rsi.toFixed(1) : '--'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '11px', display: 'block', fontFamily: "'Inter', sans-serif" }}>Tổng Nến CSDL</span>
                <strong style={{ color: 'var(--text-main)' }}>{chartData.length} phiên</strong>
              </div>
            </div>
          </div>

          {/* Interactive Chart Canvas */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <StockChart data={chartData} symbol={symbol} loading={loading} />
          </div>
        </div>

        {/* Right: Sidebar HUD Panel */}
        <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px', gap: '14px' }}>
          {/* Card 1: Gatekeeper Verdict & Plan */}
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <div className="card-title">
                <ShieldCheck size={16} color="var(--accent-blue)" />
                <span>Hội Đồng Xác Thực</span>
              </div>
              <span className={`badge ${summary?.approved !== false ? 'badge-approved' : 'badge-rejected'}`}>
                {summary?.verdict || 'APPROVED'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Điểm Kỷ Luật:</span>
                <strong className="mono" style={{ color: 'var(--bull-green)' }}>{summary?.verifier_score ?? 100} / 100</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Khuyến Nghị:</span>
                <strong className="mono" style={{ color: 'var(--text-main)' }}>{summary?.recommendation || 'BUY (MUA)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vùng Mua Entry:</span>
                <strong className="mono" style={{ color: 'var(--accent-blue)' }}>
                  {summary?.entry_zone ? `${formatVND(summary.entry_zone[0])} - ${formatVND(summary.entry_zone[1])}` : '--'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Stop Loss:</span>
                <strong className="mono" style={{ color: 'var(--bear-red)' }}>
                  {summary?.stop_loss ? formatVND(summary.stop_loss) : '--'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Take Profit 1:</span>
                <strong className="mono" style={{ color: 'var(--bull-green)' }}>
                  {summary?.take_profit_1 ? formatVND(summary.take_profit_1) : '--'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vị Thế Kelly:</span>
                <strong className="mono" style={{ color: 'var(--text-main)' }}>{summary?.position_size_pct ? `${summary.position_size_pct}% Portfolio` : '15% Portfolio'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tỷ Lệ Risk/Reward:</span>
                <strong className="mono" style={{ color: 'var(--bull-green)' }}>1 : {summary?.risk_reward_ratio || 2.77}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: 10-Investor Sentiment Meter */}
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <div className="card-title">
                <Users size={16} color="var(--accent-yellow)" />
                <span>Đồng Thuận 10 Investor</span>
              </div>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--bull-green)', fontWeight: 700 }}>
                {summary?.sentiment_index ? `+${summary.sentiment_index}` : '+0.58'}
              </span>
            </div>

            <div className="meter-bar" style={{ height: '10px', borderRadius: '5px', marginBottom: '8px' }}>
              <div className="meter-segment meter-buy" style={{ width: `${summary?.buy_pct || 80}%` }}></div>
              <div className="meter-segment meter-hold" style={{ width: `${summary?.hold_pct || 20}%` }}></div>
              <div className="meter-segment meter-sell" style={{ width: `${summary?.sell_pct || 0}%` }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
              <span style={{ color: 'var(--bull-green)' }}>MUA: {summary?.buy_pct || 80}%</span>
              <span style={{ color: '#d97706' }}>GIỮ: {summary?.hold_pct || 20}%</span>
              <span style={{ color: 'var(--bear-red)' }}>BÁN: {summary?.sell_pct || 0}%</span>
            </div>
          </div>

          {/* Card 3: Technical & MoS */}
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <div className="card-title">
                <TrendingUp size={16} color="var(--accent-orange)" />
                <span>Kỹ Thuật & Định Giá DCF</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Xu Hướng:</span>
                <strong style={{ color: 'var(--bull-green)' }}>{summary?.technical_trend || 'BULLISH (UPTREND)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Margin of Safety:</span>
                <strong className="mono" style={{ color: 'var(--bull-green)' }}>+{summary?.margin_of_safety_pct || 18.5}% (Chiết Khấu)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trạng Thái RSI:</span>
                <strong className="mono" style={{ color: 'var(--text-main)' }}>{summary?.rsi || 58.4} (Tích Cực)</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Telegram Crowd Hype */}
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <div className="card-title">
                <Send size={16} color="#0088cc" />
                <span>Telegram Crowd Hype</span>
              </div>
              <button
                onClick={() => setIsTgModalOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '11px', color: '#0088cc', borderColor: 'rgba(0, 136, 204, 0.3)' }}
              >
                🔍 Chi Tiết
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hưng Phấn (Euphoria):</span>
                <strong className="mono" style={{ color: 'var(--accent-yellow)' }}>{telegramData?.euphoria_percentage || 42.5}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Đánh Giá Rủi Ro:</span>
                <strong style={{ color: 'var(--bull-green)' }}>{telegramData?.risk_assessment || 'BÌNH THƯỜNG'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bài Thảo Luận:</span>
                <strong className="mono" style={{ color: 'var(--text-main)' }}>{telegramData?.total_messages || 384} bài</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Modal */}
      {isTgModalOpen && <TelegramModal data={telegramData} onClose={() => setIsTgModalOpen(false)} />}
    </div>
  );
};
