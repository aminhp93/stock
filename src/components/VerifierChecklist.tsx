import React from 'react';
import { VerificationCheckItem } from '../types';
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

interface VerifierChecklistProps {
  checklist?: VerificationCheckItem[];
  verdict: string;
  score: number;
  notes: string;
  recommendations?: string[];
  approved?: boolean;
}

export const VerifierChecklist: React.FC<VerifierChecklistProps> = ({
  checklist = [],
  verdict,
  score,
  notes,
  recommendations = [],
  approved
}) => {
  const isApproved = approved ?? (verdict === 'APPROVED');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff' }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div className="card-title">
          <ShieldCheck size={20} color={isApproved ? 'var(--bull-green)' : 'var(--bear-red)'} />
          <span>Hội Đồng Kiểm Định Độc Lập (Investment Committee Gatekeeper)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="mono" style={{ fontSize: '13px', fontWeight: 800, color: isApproved ? 'var(--bull-green)' : 'var(--bear-red)' }}>
            Điểm Kỷ Luật: {score} / 100
          </span>
          <span className={`badge ${isApproved ? 'badge-approved' : 'badge-rejected'}`} style={{ padding: '4px 12px', fontSize: '12px' }}>
            {verdict}
          </span>
        </div>
      </div>

      {/* 7 Checklist Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {checklist.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: item.passed ? 'var(--bull-green-bg)' : 'var(--bear-red-bg)',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${item.passed ? 'var(--bull-green-border)' : 'var(--bear-red-border)'}`,
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {item.passed ? (
                <CheckCircle size={16} color="var(--bull-green)" style={{ flexShrink: 0 }} />
              ) : (
                <XCircle size={16} color="var(--bear-red)" style={{ flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{item.criterion}</span>
            </div>
            <span style={{ fontSize: '12px', color: item.passed ? 'var(--bull-green)' : 'var(--bear-red)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              {item.details}
            </span>
          </div>
        ))}
      </div>

      {/* Audit Notes & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <FileText size={14} color="var(--accent-blue)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Ghi Chú Kiểm Định:</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>{notes}</p>
        </div>

        {recommendations && recommendations.length > 0 && (
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <CheckCircle2 size={14} color="var(--bull-green)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Khuyến Nghị Thực Thi:</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {recommendations.map((rec, i) => (
                <li key={i} style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                  👉 {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
