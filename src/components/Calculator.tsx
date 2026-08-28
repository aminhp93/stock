import React, { useState, useMemo } from 'react';
import { Calculator as CalcIcon, TrendingUp, Landmark, PieChart } from 'lucide-react';

export const Calculator: React.FC = () => {
  const [initialCapital, setInitialCapital] = useState<number>(500000000); // 500M VND
  const [monthlyDCA, setMonthlyDCA] = useState<number>(10000000); // 10M VND
  const [years, setYears] = useState<number>(5);
  const [stockFundRate, setStockFundRate] = useState<number>(16.5); // 16.5% p.a
  const [bankRate, setBankRate] = useState<number>(5.5); // 5.5% p.a
  const [inflationRate, setInflationRate] = useState<number>(3.5); // 3.5%

  const calculations = useMemo(() => {
    // 1. Bank Lump Sum: P * (1 + r)^t
    const bankLumpSum = initialCapital * Math.pow(1 + bankRate / 100, years);
    const bankProfit = bankLumpSum - initialCapital;

    // 2. Stock Fund Lump Sum: P * (1 + r)^t
    const stockLumpSum = initialCapital * Math.pow(1 + stockFundRate / 100, years);
    const stockLumpSumProfit = stockLumpSum - initialCapital;

    // 3. Stock Fund DCA (500M / months + monthlyDCA)
    const totalMonths = years * 12;
    const monthlyRate = stockFundRate / 100 / 12;
    let dcaBalance = initialCapital;
    let totalInvested = initialCapital;

    for (let m = 1; m <= totalMonths; m++) {
      dcaBalance = (dcaBalance + monthlyDCA) * (1 + monthlyRate);
      totalInvested += monthlyDCA;
    }
    const dcaProfit = dcaBalance - totalInvested;

    // Real values after inflation
    const inflationFactor = Math.pow(1 + inflationRate / 100, years);
    const realStockLumpSum = stockLumpSum / inflationFactor;
    const realBankLumpSum = bankLumpSum / inflationFactor;

    return {
      bankLumpSum,
      bankProfit,
      stockLumpSum,
      stockLumpSumProfit,
      dcaBalance,
      totalInvested,
      dcaProfit,
      realStockLumpSum,
      realBankLumpSum,
      extraGain: stockLumpSum - bankLumpSum
    };
  }, [initialCapital, monthlyDCA, years, stockFundRate, bankRate, inflationRate]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#ffffff' }}>
      <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: 0 }}>
        <div className="card-title">
          <CalcIcon size={18} color="var(--accent-blue)" />
          <span>So Sánh 3 Chiến Lược Đầu Tư (2021 – 2026)</span>
        </div>
        <span className="badge badge-info">Lãi Kép {years} Năm</span>
      </div>

      {/* Sliders Input Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <div>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Vốn Ban Đầu:</span>
            <strong className="mono" style={{ color: 'var(--text-main)' }}>{formatVND(initialCapital)}</strong>
          </label>
          <input
            type="range"
            min="100000000"
            max="2000000000"
            step="50000000"
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Tích Sản Hàng Tháng:</span>
            <strong className="mono" style={{ color: 'var(--text-main)' }}>{formatVND(monthlyDCA)}</strong>
          </label>
          <input
            type="range"
            min="0"
            max="50000000"
            step="2000000"
            value={monthlyDCA}
            onChange={(e) => setMonthlyDCA(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--bull-green)', cursor: 'pointer' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Kỳ Hạn:</span>
            <strong className="mono" style={{ color: 'var(--text-main)' }}>{years} Năm</strong>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Lợi Nhuận Quỹ CP:</span>
            <strong className="mono" style={{ color: 'var(--bull-green)' }}>{stockFundRate}% / năm</strong>
          </label>
          <input
            type="range"
            min="5"
            max="30"
            step="0.5"
            value={stockFundRate}
            onChange={(e) => setStockFundRate(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--bull-green)', cursor: 'pointer' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Lãi Suất Tiết Kiệm:</span>
            <strong className="mono" style={{ color: 'var(--accent-yellow)' }}>{bankRate}% / năm</strong>
          </label>
          <input
            type="range"
            min="3"
            max="10"
            step="0.25"
            value={bankRate}
            onChange={(e) => setBankRate(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-yellow)', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* 3 Comparative Outcome Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {/* Strategy 1: Tiết Kiệm Ngân Hàng */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Landmark size={16} color="var(--accent-yellow)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Tiết Kiệm Ngân Hàng</span>
            </div>
            <span className="badge badge-warning">{bankRate}%</span>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tổng Tài Sản:</span>
            <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-yellow)' }}>
              {formatVND(calculations.bankLumpSum)}
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
            Tiền lãi: <strong className="mono" style={{ color: 'var(--text-main)' }}>+{formatVND(calculations.bankProfit)}</strong>
          </div>
        </div>

        {/* Strategy 2: Lump Sum Đầu Tư Quỹ */}
        <div style={{ background: '#ffffff', border: '1px solid var(--bull-green-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} color="var(--bull-green)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Đầu Tư 1 Lần (Lump Sum)</span>
            </div>
            <span className="badge badge-approved">{stockFundRate}%</span>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tổng Tài Sản:</span>
            <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bull-green)' }}>
              {formatVND(calculations.stockLumpSum)}
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
            Lợi nhuận: <strong className="mono" style={{ color: 'var(--bull-green)' }}>+{formatVND(calculations.stockLumpSumProfit)}</strong>
          </div>
        </div>

        {/* Strategy 3: DCA Định Kỳ Hàng Tháng */}
        <div style={{ background: '#ffffff', border: '1px solid var(--accent-blue-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieChart size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Tích Sản Định Kỳ (DCA)</span>
            </div>
            <span className="badge badge-info">+{formatVND(monthlyDCA)}/th</span>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tổng Tích Lũy:</span>
            <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-blue)' }}>
              {formatVND(calculations.dcaBalance)}
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
            Lãi sinh ra: <strong className="mono" style={{ color: 'var(--accent-blue)' }}>+{formatVND(calculations.dcaProfit)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
