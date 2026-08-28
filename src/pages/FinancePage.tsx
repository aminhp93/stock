import React, { useState, useMemo } from 'react';
import { Calculator } from '../components/Calculator';
import { Landmark, TrendingUp, ShieldCheck, PieChart, Sparkles, AlertCircle, Target, Wallet, ArrowUpRight, DollarSign } from 'lucide-react';

export const FinancePage: React.FC = () => {
  // Monthly Expense for Emergency Fund & FIRE calculation
  const [monthlyExpense, setMonthlyExpense] = useState<number>(20000000); // 20M VND / month
  const [currentSavings, setCurrentSavings] = useState<number>(100000000); // 100M VND
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

  // FIRE Calculations (Financial Independence, Retire Early - 4% Rule)
  const annualExpense = monthlyExpense * 12;
  const fireTarget = annualExpense * 25; // 25x annual expense
  const emergencyFundTarget = monthlyExpense * 6; // 6 months safety net
  const emergencyGap = Math.max(0, emergencyFundTarget - currentSavings);

  // Asset Allocation Recommendations
  const allocation = useMemo(() => {
    switch (riskTolerance) {
      case 'conservative':
        return { equity: 30, etf: 30, cash: 30, gold: 10, expectedReturn: 10.5 };
      case 'aggressive':
        return { equity: 60, etf: 25, cash: 10, gold: 5, expectedReturn: 18.0 };
      case 'moderate':
      default:
        return { equity: 45, etf: 35, cash: 15, gold: 5, expectedReturn: 14.5 };
    }
  }, [riskTolerance]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '28px 32px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--bull-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={22} color="var(--bull-green)" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
              Quản Lý Tài Chính Cá Nhân & Kế Hoạch Đầu Tư
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Công cụ tính toán lãi kép, lập kế hoạch tích sản định kỳ và mục tiêu tự do tài chính (FIRE).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-approved" style={{ fontSize: '12px', padding: '6px 12px' }}>
            LÃI KÉP & FIRE PLANNER
          </span>
        </div>
      </div>

      {/* Section 1: 500Tr Investment Planner Component */}
      <div>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            1. Mô Phỏng & So Sánh 3 Chiến Lược Tích Sản (Lump Sum vs DCA vs Tiết Kiệm)
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Mô phỏng sức mạnh lãi kép qua các kỳ hạn với các mức tỷ suất sinh lời khác nhau.
          </p>
        </div>

        <Calculator />
      </div>

      {/* Section 2: Personal Finance Overview Cards (FIRE & Emergency Fund) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Card 1: Kế Hoạch Tự Do Tài Chính (FIRE) */}
        <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Mục Tiêu Tự Do Tài Chính (FIRE)</h3>
            </div>
            <span className="badge badge-info">Quy tắc 4%</span>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Chi tiêu sinh hoạt hàng tháng:</span>
              <strong className="mono" style={{ color: 'var(--text-main)' }}>{formatVND(monthlyExpense)}/tháng</strong>
            </label>
            <input
              type="range"
              min="5000000"
              max="100000000"
              step="1000000"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Chi tiêu 1 năm:</span>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                {formatVND(annualExpense)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Cột mốc số tiền FIRE:</span>
              <div className="mono" style={{ fontSize: '17px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                {formatVND(fireTarget)}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            💡 <em>Khi tài sản đầu tư đạt {formatVND(fireTarget)}, với tỷ suất sinh lời ròng &ge; 8%/năm, bạn có thể rút 4% ({formatVND(annualExpense)}/năm) mà danh mục gốc vẫn tiếp tục sinh trưởng bền vững.</em>
          </p>
        </div>

        {/* Card 2: Quỹ Khẩn Cấp & Phân Bổ Tài Sản */}
        <div className="card" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--bull-green)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Quỹ An Toàn & Phân Bổ Danh Mục</h3>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['conservative', 'moderate', 'aggressive'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskTolerance(r)}
                  style={{
                    background: riskTolerance === r ? 'var(--bull-green)' : '#f1f5f9',
                    color: riskTolerance === r ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {r === 'conservative' ? 'Thận trọng' : r === 'moderate' ? 'Cân bằng' : 'Tăng trưởng'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            <div style={{ background: 'var(--bull-green-bg)', border: '1px solid var(--bull-green-border)', padding: '8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--bull-green)', fontWeight: 600 }}>Cổ Phiếu</span>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--bull-green)' }}>{allocation.equity}%</div>
            </div>
            <div style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)', padding: '8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--accent-blue)', fontWeight: 600 }}>Quỹ ETF</span>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-blue)' }}>{allocation.etf}%</div>
            </div>
            <div style={{ background: 'var(--accent-yellow-bg)', border: '1px solid var(--accent-yellow-border)', padding: '8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--accent-yellow)', fontWeight: 600 }}>Tiết Kiệm</span>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-yellow)' }}>{allocation.cash}%</div>
            </div>
            <div style={{ background: 'var(--accent-purple-bg)', border: '1px solid var(--accent-purple-border)', padding: '8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--accent-purple)', fontWeight: 600 }}>Vàng/Khác</span>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-purple)' }}>{allocation.gold}%</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quỹ dự phòng khẩn cấp (6 tháng):</span>
              <strong className="mono" style={{ color: 'var(--text-main)' }}>{formatVND(emergencyFundTarget)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tỷ suất kỳ vọng danh mục:</span>
              <strong className="mono" style={{ color: 'var(--bull-green)' }}>~{allocation.expectedReturn}% / năm</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
