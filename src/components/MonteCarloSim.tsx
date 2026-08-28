import React, { useState } from 'react';
import { Bot, Play, Sparkles, Zap, Users2 } from 'lucide-react';
import { runSimulation } from '../services/api';
import { SimulationResult } from '../types';

interface MonteCarloSimProps {
  symbol: string;
}

export const MonteCarloSim: React.FC<MonteCarloSimProps> = ({ symbol }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [agentCount, setAgentCount] = useState<number>(10000);

  const handleRun = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await runSimulation(symbol, agentCount);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      const end = performance.now();
      setExecTime(Math.round(end - start));
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid var(--accent-blue-border)' }}>
      <div className="card-header">
        <div className="card-title">
          <Sparkles size={18} color="var(--accent-blue)" />
          <span>Mở Rộng Giả Lập 10.000 Agents Vectorized (Monte-Carlo Engine)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={agentCount}
            onChange={(e) => setAgentCount(Number(e.target.value))}
            style={{ background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
          >
            <option value={1000}>1,000 Agents</option>
            <option value={5000}>5,000 Agents</option>
            <option value={10000}>10,000 Agents (Chuẩn)</option>
            <option value={50000}>50,000 Agents (Stress Test)</option>
          </select>

          <button
            onClick={handleRun}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            {loading ? <Zap size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{loading ? 'Đang chạy ma trận...' : 'Khởi Chạy Mô Phỏng'}</span>
          </button>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
        Tạo ngẫu nhiên phân bổ trọng số rủi ro, tin tức, kỹ thuật và bầy đàn trên tập {agentCount.toLocaleString()} nhà đầu tư độc lập để dự phóng bức tranh thanh khoản và tâm lý toàn thị trường.
      </p>

      {result ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users2 size={18} color="var(--bull-green)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Kết Quả: {result.total_agents.toLocaleString()} Agents Giả Lập
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-purple">{result.market_state}</span>
              {execTime && <span className="mono" style={{ fontSize: '11px', color: 'var(--bull-green)' }}>⚡ {execTime} ms</span>}
            </div>
          </div>

          {/* Distribution Bar */}
          <div>
            <div className="meter-bar" style={{ height: '12px', borderRadius: '6px' }}>
              <div className="meter-segment meter-buy" style={{ width: `${result.buy_pct}%` }}></div>
              <div className="meter-segment meter-hold" style={{ width: `${result.hold_pct}%` }}></div>
              <div className="meter-segment meter-sell" style={{ width: `${result.sell_pct}%` }}></div>
              <div className="meter-segment meter-panic" style={{ width: `${result.panic_pct}%` }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--bull-green)', display: 'block', fontWeight: 700 }}>MUA (BUY)</span>
                <strong className="mono" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{result.buy_pct}%</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ color: '#d97706', display: 'block', fontWeight: 700 }}>GIỮ (HOLD)</span>
                <strong className="mono" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{result.hold_pct}%</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--bear-red)', display: 'block', fontWeight: 700 }}>BÁN (SELL)</span>
                <strong className="mono" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{result.sell_pct}%</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--accent-purple)', display: 'block', fontWeight: 700 }}>PANIC SELL</span>
                <strong className="mono" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{result.panic_pct}%</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            Nhấn <strong>"Khởi Chạy Mô Phỏng"</strong> để sinh ma trận Monte-Carlo 10.000 Agents cho mã {symbol}.
          </p>
        </div>
      )}
    </div>
  );
};
