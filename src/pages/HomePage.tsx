import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PipelineFlow } from '../components/PipelineFlow';
import { Calculator } from '../components/Calculator';
import { fetchStocks } from '../services/api';
import { StockItem } from '../types';
import { BarChart3, Bot } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);

  useEffect(() => {
    fetchStocks().then(setStocks).catch(console.error);
  }, []);

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '28px 32px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '820px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)', padding: '3px 10px', borderRadius: '20px', width: 'fit-content' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.5px' }}>
              MULTI-AGENT INVESTMENT ENGINE
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.25', letterSpacing: '-0.3px' }}>
            Hệ Thống Phân Tích & Giả Lập Đầu Tư Đa Đặc Vụ
          </h1>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Quy trình 5 bước Point-In-Time, kết hợp <strong>Giả lập 10 Personas (Monte-Carlo 10k)</strong> và <strong>Gatekeeper 7 Tiêu chuẩn</strong>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            <Link to="/chart?symbol=TCH" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
              <BarChart3 size={15} />
              <span>TradingView Visualizer</span>
            </Link>
            <Link to="/dashboard?symbol=TCH" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>
              <Bot size={15} />
              <span>Simulation Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Mã Cổ Phiếu:</span>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>1,403 <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>mã</span></div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Nến Giá Lịch Sử:</span>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--bull-green)' }}>464,975 <span style={{ fontSize: '11px', color: 'var(--bull-green)', fontWeight: 500 }}>nến</span></div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Personas Giả Lập:</span>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-yellow)' }}>10 <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>personas</span></div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Monte-Carlo Scale:</span>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-purple)' }}>10,000 <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>agents</span></div>
          </div>
        </div>
      </div>

      {/* Section 1: Interactive Workflow Pipeline */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            1. Quy Trình 5 Bước Multi-Agent
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Nhấp vào từng Agent để xem chi tiết I/O & quy tắc vận hành.
          </p>
        </div>

        <PipelineFlow />
      </div>

      {/* Section 2: 500Tr Investment Planner (Lump Sum vs DCA) */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            2. So Sánh Đầu Tư 500 Triệu (2021 – 2026)
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            So sánh lãi kép: Tiết Kiệm Ngân Hàng vs Đầu Tư 1 Lần vs Tích Sản DCA.
          </p>
        </div>

        <Calculator />
      </div>

      {/* Section 3: Active Agents Directory */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            3. Danh Mục Đặc Vụ (Active Agents)
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Trạng thái & phạm vi nhiệm vụ của 6 Agents cốt lõi.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {/* Agent 1 */}
          <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: 700 }}>/data-collection</span>
              <span className="badge badge-approved">ONLINE</span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Step 1: Data Collector</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Thu thập OHLCV, tài chính & tin tức Point-In-Time từ PostgreSQL (464k nến).
            </p>
          </div>

          {/* Agent 2 */}
          <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--bull-green)', fontWeight: 700 }}>/market-analysis</span>
              <span className="badge badge-approved">ONLINE</span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Step 2A: Market Analyzer</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Phân tích xu hướng MA/RSI và biên an toàn DCF Margin of Safety.
            </p>
          </div>

          {/* Agent 3 */}
          <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--accent-yellow)', fontWeight: 700 }}>/behavioral-sim</span>
              <span className="badge badge-approved">ONLINE</span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Step 2B: Investor Simulator</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Giả lập tâm lý 10 Personas người thật & Monte-Carlo 10.000 agents ({'< 0.2s'}).
            </p>
          </div>

          {/* Agent 4 */}
          <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--accent-purple)', fontWeight: 700 }}>/trading-strategy</span>
              <span className="badge badge-approved">ONLINE</span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Step 3: Strategy Planner</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Lập 3 kịch bản Bull/Base/Bear, xác định Entry Zone, Stop Loss, TP1/2.
            </p>
          </div>

          {/* Agent 5 */}
          <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--bear-red)', fontWeight: 700 }}>/risk-manager</span>
              <span className="badge badge-approved">ONLINE</span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Step 4: Risk Manager</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Định cỡ vị thế Half-Kelly (≤20%), đảm bảo RRR ≥ 1:2.5 & stress test drawdown.
            </p>
          </div>

          {/* Agent 6 */}
          <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: '11.5px', color: 'var(--accent-cyan)', fontWeight: 700 }}>/verifier-gatekeeper</span>
              <span className="badge badge-approved">ONLINE</span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Step 5: Committee Gatekeeper</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Hội đồng kiểm định 7 tiêu chuẩn độc lập, phê duyệt khi đạt ≥5/6 tiêu chí.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
