import React, { useState } from 'react';
import { Database, TrendingUp, Users, Target, ShieldAlert, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface StepInfo {
  id: string;
  step: string;
  title: string;
  icon: any;
  color: string;
  badge: string;
  description: string;
  inputs: string[];
  outputs: string[];
  rules: string[];
}

const STEPS: StepInfo[] = [
  {
    id: 's1',
    step: 'Step 1',
    title: 'Data Collection Agent',
    icon: Database,
    color: '#2563eb',
    badge: 'Point-In-Time',
    description: 'Thu thập OHLCV, chỉ số tài chính & vĩ mô Point-In-Time.',
    inputs: ['Symbol & Timestamp T', 'PostgreSQL DB (464k nến)'],
    outputs: ['PriceBar[]', 'FinancialMetrics (DCF, PE, PB, ROE)', 'MacroNews[]'],
    rules: ['Bảo đảm Point-In-Time, không rò rỉ dữ liệu T+1']
  },
  {
    id: 's2a',
    step: 'Step 2A',
    title: 'Market Analysis Agent',
    icon: TrendingUp,
    color: '#059669',
    badge: 'Tech & Fundamentals',
    description: 'Phân tích MA20/MA50, RSI 14 & định giá DCF Margin of Safety.',
    inputs: ['MarketContext từ Step 1'],
    outputs: ['is_uptrend, RSI, Margin of Safety %, Sentiment Score'],
    rules: ['MoS = (Intrinsic Value DCF - Price) / Intrinsic Value']
  },
  {
    id: 's2b',
    step: 'Step 2B',
    title: 'Behavioral Simulator',
    icon: Users,
    color: '#d97706',
    badge: '10 Personas & 10k MC',
    description: 'Giả lập 10 Personas người thật & Monte-Carlo 10.000 agents.',
    inputs: ['MarketContext', 'MarketAnalysis'],
    outputs: ['Buy/Sell/Hold/Panic %', '10 Persona Decisions', 'Sentiment Index'],
    rules: ['Monte-Carlo vectorized 10k agents < 0.2s']
  },
  {
    id: 's3',
    step: 'Step 3',
    title: 'Trading Strategy Agent',
    icon: Target,
    color: '#7c3aed',
    badge: '3 Scenarios',
    description: 'Lập 3 kịch bản Bull/Base/Bear, Entry Zone, SL, TP1/2.',
    inputs: ['MarketAnalysis', 'SimulationConsensus'],
    outputs: ['Entry Zone, Hard Stop-Loss, TP1 & TP2, Target RRR'],
    rules: ['Bắt buộc có Stop-Loss rõ ràng', 'RRR kỳ vọng ≥ 1:2.5']
  },
  {
    id: 's4',
    step: 'Step 4',
    title: 'Risk Manager Agent',
    icon: ShieldAlert,
    color: '#dc2626',
    badge: 'Half-Kelly Sizing',
    description: 'Định cỡ Half-Kelly (≤20%), RRR ≥ 1:2.5 & stress test drawdown.',
    inputs: ['TradingPlan', 'SimulationConsensus'],
    outputs: ['Kelly Allocation %, Potential Loss %, Stress Test Impact'],
    rules: ['Vị thế tối đa ≤ 20% portfolio / 1 mã cổ phiếu']
  },
  {
    id: 's5',
    step: 'Step 5',
    title: 'Investment Gatekeeper',
    icon: CheckCircle2,
    color: '#0891b2',
    badge: '7 Standards',
    description: 'Hội đồng kiểm định 7 tiêu chuẩn độc lập duyệt lệnh.',
    inputs: ['Kết quả Step 1 ➔ Step 4'],
    outputs: ['Verdict (APPROVED/REJECTED)', 'Discipline Score 0-100', 'Checklist'],
    rules: ['Phải đạt ≥ 5/6 tiêu chuẩn & vị thế Kelly an toàn']
  }
];

export const PipelineFlow: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<StepInfo | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              onClick={() => setSelectedStep(s)}
              className="card"
              style={{
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                borderLeft: `4px solid ${s.color}`,
                transition: 'all 0.2s ease',
                background: '#ffffff',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: s.color, letterSpacing: '0.5px' }}>
                  {s.step.toUpperCase()}
                </span>
                <span className="badge" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                  {s.badge}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={s.color} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{s.title}</h3>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {s.description}
              </p>

              <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Xem chi tiết schema</span>
                <ChevronRight size={13} color="var(--text-dim)" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detail for Node */}
      {selectedStep && (
        <div className="modal-backdrop" onClick={() => setSelectedStep(null)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: `${selectedStep.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <selectedStep.icon size={18} color={selectedStep.color} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedStep.step}: {selectedStep.title}
                  </h3>
                  <span style={{ fontSize: '11.5px', color: selectedStep.color, fontWeight: 600 }}>
                    {selectedStep.badge}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStep(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <h4 style={{ fontSize: '11.5px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                  Nhiệm Vụ Cốt Lõi
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {selectedStep.description}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '11.5px', color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                    Inputs
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedStep.inputs.map((inp, i) => (
                      <li key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        👉 {inp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: '11.5px', color: 'var(--bull-green)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                    Outputs
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedStep.outputs.map((out, i) => (
                      <li key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        ✅ {out}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '11.5px', color: 'var(--bear-red)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                  Kỷ Luật Bắt Buộc
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedStep.rules.map((r, i) => (
                    <li key={i} style={{ fontSize: '12px', color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                      ⚠️ {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
