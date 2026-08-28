import React from 'react';
import { PersonaDecision } from '../types';
import { Bot, UserCheck, Flame, ShieldAlert, Sparkles, Brain, Compass, Award, Banknote, Globe } from 'lucide-react';

interface PersonaGridProps {
  decisions: PersonaDecision[];
}

const PERSONA_ICONS: Record<string, any> = {
  p01_fomo_retailer: Flame,
  p02_deep_value: Award,
  p03_swing_trader: Compass,
  p04_panic_seller: ShieldAlert,
  p05_quant_fund: Brain,
  p06_dividend_growth: Banknote,
  p07_contrarian: Sparkles,
  p08_scalper_tplus: Flame,
  p09_smart_money: UserCheck,
  p10_macro_strategist: Globe,
};

export const PersonaGrid: React.FC<PersonaGridProps> = ({ decisions }) => {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'FOMO_BUY':
        return <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>🔥 FOMO BUY</span>;
      case 'BUY':
        return <span className="badge badge-approved">⚡ BUY (MUA)</span>;
      case 'PANIC_SELL':
        return <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>🚨 PANIC SELL</span>;
      case 'SELL':
        return <span className="badge badge-rejected">🔻 SELL (BÁN)</span>;
      default:
        return <span className="badge badge-warning">⏸️ HOLD (QUAN SÁT)</span>;
    }
  };

  const formatVND = (num?: number) => {
    if (!num) return '--';
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
      {decisions.map((d) => {
        const IconComponent = PERSONA_ICONS[d.persona_id] || Bot;
        return (
          <div
            key={d.persona_id}
            className="card"
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComponent size={18} color="var(--accent-blue)" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>{d.persona_name}</h4>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>ID: {d.persona_id}</span>
                  </div>
                </div>
                {getActionBadge(d.action)}
              </div>

              {/* Reasoning */}
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', lineHeight: '1.5' }}>
                "{d.reasoning}"
              </p>
            </div>

            {/* Metrics Footer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block' }}>Độ Tự Tin:</span>
                <strong className="mono" style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{Math.round(d.confidence * 100)}%</strong>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block' }}>Tâm Lý:</span>
                <strong
                  className="mono"
                  style={{
                    fontSize: '12.5px',
                    color: d.sentiment_score > 0 ? 'var(--bull-green)' : d.sentiment_score < 0 ? 'var(--bear-red)' : 'var(--accent-yellow)'
                  }}
                >
                  {d.sentiment_score > 0 ? `+${d.sentiment_score}` : d.sentiment_score}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block' }}>Kỳ Vọng Giá:</span>
                <strong className="mono" style={{ fontSize: '12.5px', color: 'var(--accent-blue)' }}>{formatVND(d.expected_target_price)}</strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
