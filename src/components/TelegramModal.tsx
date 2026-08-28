import React from 'react';
import { X, Send, AlertTriangle, MessageSquare, Flame } from 'lucide-react';
import { TelegramSentimentResult } from '../types';

interface TelegramModalProps {
  data: TelegramSentimentResult | null;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 136, 204, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} color="#0088cc" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Telegram Community Sentiment & Crowd Hype
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                Dữ liệu quét từ các nhóm chứng khoán hàng đầu
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Top Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Chỉ Số Tâm Lý:</span>
              <strong className="mono" style={{ fontSize: '18px', color: data.sentiment_score >= 0 ? 'var(--bull-green)' : 'var(--bear-red)' }}>
                {data.sentiment_label} ({data.sentiment_score >= 0 ? `+${data.sentiment_score}` : data.sentiment_score})
              </strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Tỷ Lệ Hưng Phấn:</span>
              <strong className="mono" style={{ fontSize: '18px', color: 'var(--accent-yellow)' }}>
                {data.euphoria_percentage}%
              </strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Tổng Bài Thảo Luận:</span>
              <strong className="mono" style={{ fontSize: '18px', color: 'var(--accent-blue)' }}>
                {data.total_messages.toLocaleString()} bài
              </strong>
            </div>
          </div>

          {/* Risk Warning Box */}
          <div style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Flame size={20} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                Đánh Giá Rủi Ro F0 & Bầy Đàn:
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {data.risk_assessment}
              </p>
            </div>
          </div>

          {/* Summary text */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <MessageSquare size={14} color="var(--text-dim)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Tóm Tắt Xu Hướng Thảo Luận:</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {data.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
