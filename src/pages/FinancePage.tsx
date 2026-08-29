import React, { useState, useMemo } from 'react';
import { Calculator } from '../components/Calculator';
import { Wallet, Table2, BarChart2, ShieldCheck, Target, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FinanceRow {
  id: string; date: string;
  vang_so_luong: number; vang_gia: number;
  ck: number;
  tiet_kiem_vcb: number; tiet_kiem_tcb: number;
  cash_vcb: number; cash_tcb: number; cash_tpb: number;
  credit_tcb_spent: number; credit_tcb_instal: number;
  vay_vcb: number;
}
interface CKHolding {
  id: string; symbol: string;
  tong_sl: number; gia_von: number; gia_tt: number;
}
interface TietKiemDetail {
  id: string; bank: string; amount: number; rate: number;
  start_date: string; end_date: string;
}
interface VayDetail {
  id: string; bank: string; so_tien: number; thoi_gian: string; lai_suat: string;
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const defaultRows: FinanceRow[] = [
  { id: '1', date: '2026-08-20', vang_so_luong: 3.1, vang_gia: 143, ck: 276, tiet_kiem_vcb: 5, tiet_kiem_tcb: 5, cash_vcb: 0.3, cash_tcb: 30.6, cash_tpb: 0, credit_tcb_spent: 3.3, credit_tcb_instal: 30.2, vay_vcb: 1836 },
  { id: '2', date: '2026-08-29', vang_so_luong: 3.1, vang_gia: 145.7, ck: 303, tiet_kiem_vcb: 5, tiet_kiem_tcb: 5, cash_vcb: 5.6, cash_tcb: 79.3, cash_tpb: 0, credit_tcb_spent: 7.8, credit_tcb_instal: 27.2, vay_vcb: 1836 },
];
const defaultCK: CKHolding[] = [
  { id: '1', symbol: 'C4G',  tong_sl: 60,    gia_von: 20869,  gia_tt: 5600 },
  { id: '2', symbol: 'HDG',  tong_sl: 1980,  gia_von: 26727,  gia_tt: 16650 },
  { id: '3', symbol: 'HHV',  tong_sl: 4,     gia_von: 11366,  gia_tt: 10050 },
  { id: '4', symbol: 'IDI',  tong_sl: 16,    gia_von: 0,      gia_tt: 5000 },
  { id: '5', symbol: 'MBS',  tong_sl: 4841,  gia_von: 26351,  gia_tt: 17900 },
  { id: '6', symbol: 'PDR',  tong_sl: 3200,  gia_von: 16000,  gia_tt: 12400 },
  { id: '7', symbol: 'TCH',  tong_sl: 11236, gia_von: 18304,  gia_tt: 12200 },
];
const defaultTietKiem: TietKiemDetail[] = [
  { id: '1', bank: 'VCB', amount: 5, rate: 7.40, start_date: '2026-08-04', end_date: '2027-08-04' },
  { id: '2', bank: 'TCB', amount: 5, rate: 7.80, start_date: '2026-08-04', end_date: '2027-08-04' },
];
const defaultVay: VayDetail[] = [
  { id: '1', bank: 'VCB', so_tien: 1900, thoi_gian: '7/8/2025 - 9/8/2055', lai_suat: '5.5% / 3 năm đầu' },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
function load<T>(key: string, def: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
}
function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)); }

const fmt = (n: number, d = 1) => n.toLocaleString('vi-VN', { maximumFractionDigits: d });
const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

// ─── Raw Data Tab ─────────────────────────────────────────────────────────────
const RawDataTab: React.FC = () => {
  const [rows, setRows] = useState<FinanceRow[]>(() => load('finance_rows', defaultRows));
  const [ckHoldings, setCkHoldings] = useState<CKHolding[]>(() => load('finance_ck', defaultCK));
  const [tietKiem, setTietKiem] = useState<TietKiemDetail[]>(() => load('finance_tietkiem', defaultTietKiem));
  const [vay, setVay] = useState<VayDetail[]>(() => load('finance_vay', defaultVay));

  // Main log helpers
  const updateRow = (id: string, field: keyof FinanceRow, val: string) => {
    const u = rows.map(r => r.id === id ? { ...r, [field]: field === 'date' || field === 'id' ? val : Number(val) } : r);
    setRows(u); save('finance_rows', u);
  };
  const addRow = () => {
    const u = [...rows, { id: Date.now().toString(), date: new Date().toISOString().slice(0,10), vang_so_luong:0, vang_gia:0, ck:0, tiet_kiem_vcb:0, tiet_kiem_tcb:0, cash_vcb:0, cash_tcb:0, cash_tpb:0, credit_tcb_spent:0, credit_tcb_instal:0, vay_vcb:0 }];
    setRows(u); save('finance_rows', u);
  };
  const delRow = (id: string) => { const u = rows.filter(r=>r.id!==id); setRows(u); save('finance_rows',u); };

  // CK helpers
  const updateCK = (id: string, field: keyof CKHolding, val: string) => {
    const u = ckHoldings.map(r => r.id===id ? {...r,[field]: field==='symbol'||field==='id' ? val : Number(val)} : r);
    setCkHoldings(u); save('finance_ck', u);
  };
  const addCK = () => { const u=[...ckHoldings,{id:Date.now().toString(),symbol:'',tong_sl:0,gia_von:0,gia_tt:0}]; setCkHoldings(u); save('finance_ck',u); };
  const delCK = (id: string) => { const u=ckHoldings.filter(r=>r.id!==id); setCkHoldings(u); save('finance_ck',u); };

  // Tiet kiem helpers
  const updateTK = (id: string, field: keyof TietKiemDetail, val: string) => {
    const u = tietKiem.map(r => r.id===id ? {...r,[field]: ['id','bank','start_date','end_date'].includes(field) ? val : Number(val)} : r);
    setTietKiem(u); save('finance_tietkiem', u);
  };
  const addTK = () => { const u=[...tietKiem,{id:Date.now().toString(),bank:'',amount:0,rate:0,start_date:'',end_date:''}]; setTietKiem(u); save('finance_tietkiem',u); };
  const delTK = (id: string) => { const u=tietKiem.filter(r=>r.id!==id); setTietKiem(u); save('finance_tietkiem',u); };

  // Vay helpers
  const updateVay = (id: string, field: keyof VayDetail, val: string) => {
    const u = vay.map(r => r.id===id ? {...r,[field]: field==='so_tien' ? Number(val) : val} : r);
    setVay(u); save('finance_vay', u);
  };
  const addVay = () => { const u=[...vay,{id:Date.now().toString(),bank:'',so_tien:0,thoi_gian:'',lai_suat:''}]; setVay(u); save('finance_vay',u); };
  const delVay = (id: string) => { const u=vay.filter(r=>r.id!==id); setVay(u); save('finance_vay',u); };

  const hcell = (label: string, span=1, bg='#e2e8f0') => (
    <th colSpan={span} style={{background:bg,padding:'6px 8px',fontSize:'11px',fontWeight:700,textAlign:'center',borderRight:'1px solid #cbd5e1',whiteSpace:'nowrap'}}>{label}</th>
  );
  const numInput = (val: number, onChange: (v:string)=>void, bg='white') => (
    <input type="number" value={val} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',border:'none',background:'transparent',textAlign:'right',fontSize:'12px',fontFamily:'monospace',color:'var(--text-main)',outline:'none'}} />
  );
  const textInput = (val: string, onChange: (v:string)=>void) => (
    <input type="text" value={val} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',border:'none',background:'transparent',fontSize:'12px',fontFamily:'monospace',color:'var(--text-main)',outline:'none'}} />
  );

  const sectionHeader = (title: string, onAdd: ()=>void, addLabel='Thêm') => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px',marginTop:'24px'}}>
      <h3 style={{fontSize:'14px',fontWeight:800,color:'var(--text-main)'}}>{title}</h3>
      <button onClick={onAdd} style={{display:'flex',alignItems:'center',gap:'5px',background:'var(--bull-green)',color:'#fff',border:'none',padding:'5px 10px',borderRadius:'5px',fontSize:'11px',fontWeight:700,cursor:'pointer'}}>
        <Plus size={11}/> {addLabel}
      </button>
    </div>
  );

  const delBtn = (id: string, fn: (id:string)=>void) => (
    <td style={{padding:'4px 8px',textAlign:'center'}}>
      <button onClick={()=>fn(id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444'}}><Trash2 size={12}/></button>
    </td>
  );

  return (
    <div style={{overflowX:'auto'}}>
      {/* ── Section 1: Main Log ── */}
      {sectionHeader('📋 Nhật Ký Tài Chính Theo Ngày', addRow, 'Thêm Dòng')}
      <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px',border:'1px solid #cbd5e1'}}>
        <thead>
          <tr>{hcell('Ngày',1,'#f1f5f9')}{hcell('Vàng (triệu)',3,'#fef9c3')}{hcell('CK',1,'#dcfce7')}{hcell('Tiết Kiệm',2,'#dbeafe')}{hcell('Cash',3,'#fef9c3')}{hcell('Credit',2,'#fee2e2')}{hcell('Vay',1,'#fecaca')}{hcell('',1,'#f1f5f9')}</tr>
          <tr>{hcell('',1,'#f1f5f9')}{hcell('SL (cây)',1,'#fef9c3')}{hcell('Giá (nghìn)',1,'#fef9c3')}{hcell('Tổng',1,'#fef9c3')}{hcell('(tr)',1,'#dcfce7')}{hcell('VCB',1,'#dbeafe')}{hcell('TCB',1,'#dbeafe')}{hcell('VCB',1,'#fef9c3')}{hcell('TCB',1,'#fef9c3')}{hcell('TPB',1,'#fef9c3')}{hcell('TCB spent',1,'#fee2e2')}{hcell('TCB instal',1,'#fee2e2')}{hcell('VCB',1,'#fecaca')}{hcell('Xóa',1,'#f1f5f9')}</tr>
        </thead>
        <tbody>
          {rows.map((r,i) => {
            const bg = i%2===0?'#fff':'#f8fafc';
            return (
              <tr key={r.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                <td style={{background:bg,padding:'4px 6px',minWidth:'108px'}}>
                  <input type="date" value={r.date} onChange={e=>updateRow(r.id,'date',e.target.value)} style={{border:'none',background:'transparent',fontSize:'12px',color:'var(--text-main)',outline:'none'}}/>
                </td>
                <td style={{background:'#fffde7',padding:'4px 6px',minWidth:'64px',textAlign:'right'}}>{numInput(r.vang_so_luong,v=>updateRow(r.id,'vang_so_luong',v),'#fffde7')}</td>
                <td style={{background:'#fffde7',padding:'4px 6px',minWidth:'64px',textAlign:'right'}}>{numInput(r.vang_gia,v=>updateRow(r.id,'vang_gia',v))}</td>
                <td style={{background:'#fffde7',padding:'4px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:'#b45309',minWidth:'64px'}}>{fmt(r.vang_so_luong*r.vang_gia)}</td>
                <td style={{background:'#f0fdf4',padding:'4px 6px',minWidth:'64px',textAlign:'right'}}>{numInput(r.ck,v=>updateRow(r.id,'ck',v))}</td>
                <td style={{background:'#eff6ff',padding:'4px 6px',minWidth:'56px',textAlign:'right'}}>{numInput(r.tiet_kiem_vcb,v=>updateRow(r.id,'tiet_kiem_vcb',v))}</td>
                <td style={{background:'#eff6ff',padding:'4px 6px',minWidth:'56px',textAlign:'right'}}>{numInput(r.tiet_kiem_tcb,v=>updateRow(r.id,'tiet_kiem_tcb',v))}</td>
                <td style={{background:'#fffde7',padding:'4px 6px',minWidth:'56px',textAlign:'right'}}>{numInput(r.cash_vcb,v=>updateRow(r.id,'cash_vcb',v))}</td>
                <td style={{background:'#fffde7',padding:'4px 6px',minWidth:'56px',textAlign:'right'}}>{numInput(r.cash_tcb,v=>updateRow(r.id,'cash_tcb',v))}</td>
                <td style={{background:'#fffde7',padding:'4px 6px',minWidth:'56px',textAlign:'right'}}>{numInput(r.cash_tpb,v=>updateRow(r.id,'cash_tpb',v))}</td>
                <td style={{background:'#fff1f2',padding:'4px 6px',minWidth:'72px',textAlign:'right'}}>{numInput(r.credit_tcb_spent,v=>updateRow(r.id,'credit_tcb_spent',v))}</td>
                <td style={{background:'#fff1f2',padding:'4px 6px',minWidth:'72px',textAlign:'right'}}>{numInput(r.credit_tcb_instal,v=>updateRow(r.id,'credit_tcb_instal',v))}</td>
                <td style={{background:'#fee2e2',padding:'4px 6px',minWidth:'64px',textAlign:'right'}}>{numInput(r.vay_vcb,v=>updateRow(r.id,'vay_vcb',v))}</td>
                {delBtn(r.id,delRow)}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Section 2: CK Holdings ── */}
      {sectionHeader('📊 Danh Mục Cổ Phiếu (CK Holdings)', addCK, 'Thêm Mã')}
      <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px',border:'1px solid #cbd5e1'}}>
        <thead>
          <tr>{hcell('Mã CK',1,'#dcfce7')}{hcell('Tổng SL',1,'#dcfce7')}{hcell('Giá Vốn (đ)',1,'#fef9c3')}{hcell('Giá TT (đ)',1,'#dbeafe')}{hcell('Giá Trị Vốn (tr)',1,'#fef9c3')}{hcell('Giá Trị TT (tr)',1,'#dbeafe')}{hcell('Lãi/Lỗ (tr)',1,'#f1f5f9')}{hcell('% Lãi/Lỗ',1,'#f1f5f9')}{hcell('Xóa',1,'#f1f5f9')}</tr>
        </thead>
        <tbody>
          {ckHoldings.map((r,i) => {
            const gtvon = r.tong_sl * r.gia_von / 1000000;
            const gttt = r.tong_sl * r.gia_tt / 1000000;
            const laiLo = gttt - gtvon;
            const pct = gtvon > 0 ? (laiLo/gtvon)*100 : 0;
            const bg = i%2===0?'#fff':'#f8fafc';
            const lc = laiLo>=0?'var(--bull-green)':'#ef4444';
            return (
              <tr key={r.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                <td style={{background:'#f0fdf4',padding:'4px 8px',minWidth:'60px',fontWeight:700}}>{textInput(r.symbol,v=>updateCK(r.id,'symbol',v))}</td>
                <td style={{background:bg,padding:'4px 6px',textAlign:'right'}}>{numInput(r.tong_sl,v=>updateCK(r.id,'tong_sl',v))}</td>
                <td style={{background:'#fffde7',padding:'4px 6px',textAlign:'right'}}>{numInput(r.gia_von,v=>updateCK(r.id,'gia_von',v))}</td>
                <td style={{background:'#eff6ff',padding:'4px 6px',textAlign:'right'}}>{numInput(r.gia_tt,v=>updateCK(r.id,'gia_tt',v))}</td>
                <td style={{background:'#fffde7',padding:'4px 8px',textAlign:'right',fontFamily:'monospace',color:'#92400e'}}>{fmt(gtvon,3)}</td>
                <td style={{background:'#eff6ff',padding:'4px 8px',textAlign:'right',fontFamily:'monospace',color:'#1e40af'}}>{fmt(gttt,3)}</td>
                <td style={{background:bg,padding:'4px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:lc}}>{laiLo>=0?'+':''}{fmt(laiLo,3)}</td>
                <td style={{background:bg,padding:'4px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:lc}}>{pct>=0?'+':''}{pct.toFixed(2)}%</td>
                {delBtn(r.id,delCK)}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{borderTop:'2px solid #cbd5e1',background:'#f8fafc'}}>
            <td colSpan={4} style={{padding:'6px 8px',fontSize:'11px',fontWeight:700,color:'var(--text-muted)'}}>TỔNG</td>
            {(() => {
              const totalVon = ckHoldings.reduce((s,r)=>s+r.tong_sl*r.gia_von/1000000,0);
              const totalTT = ckHoldings.reduce((s,r)=>s+r.tong_sl*r.gia_tt/1000000,0);
              const ll = totalTT-totalVon;
              const pct = totalVon>0?(ll/totalVon)*100:0;
              const c = ll>=0?'var(--bull-green)':'#ef4444';
              return (<>
                <td style={{padding:'6px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:'#92400e'}}>{fmt(totalVon,3)}</td>
                <td style={{padding:'6px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:'#1e40af'}}>{fmt(totalTT,3)}</td>
                <td style={{padding:'6px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:c}}>{ll>=0?'+':''}{fmt(ll,3)}</td>
                <td style={{padding:'6px 8px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:c}}>{pct>=0?'+':''}{pct.toFixed(2)}%</td>
                <td/>
              </>);
            })()}
          </tr>
        </tfoot>
      </table>

      {/* ── Section 3: Tiet Kiem ── */}
      {sectionHeader('🏦 Tiết Kiệm', addTK, 'Thêm')}
      <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px',border:'1px solid #cbd5e1'}}>
        <thead><tr>{hcell('Ngân Hàng',1,'#dbeafe')}{hcell('Số Tiền (tr)',1,'#dbeafe')}{hcell('Lãi Suất (%/năm)',1,'#dbeafe')}{hcell('Ngày Mở',1,'#f1f5f9')}{hcell('Ngày Đến Hạn',1,'#f1f5f9')}{hcell('Xóa',1,'#f1f5f9')}</tr></thead>
        <tbody>
          {tietKiem.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:'1px solid #e2e8f0',background:i%2===0?'#fff':'#f8fafc'}}>
              <td style={{background:'#eff6ff',padding:'4px 8px',fontWeight:700}}>{textInput(r.bank,v=>updateTK(r.id,'bank',v))}</td>
              <td style={{background:'#eff6ff',padding:'4px 6px',textAlign:'right'}}>{numInput(r.amount,v=>updateTK(r.id,'amount',v))}</td>
              <td style={{background:'#eff6ff',padding:'4px 6px',textAlign:'right'}}>{numInput(r.rate,v=>updateTK(r.id,'rate',v))}</td>
              <td style={{padding:'4px 8px'}}><input type="date" value={r.start_date} onChange={e=>updateTK(r.id,'start_date',e.target.value)} style={{border:'none',background:'transparent',fontSize:'12px',outline:'none'}}/></td>
              <td style={{padding:'4px 8px'}}><input type="date" value={r.end_date} onChange={e=>updateTK(r.id,'end_date',e.target.value)} style={{border:'none',background:'transparent',fontSize:'12px',outline:'none'}}/></td>
              {delBtn(r.id,delTK)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Section 4: Vay ── */}
      {sectionHeader('🏠 Vay', addVay, 'Thêm')}
      <table style={{borderCollapse:'collapse',width:'100%',fontSize:'12px',border:'1px solid #cbd5e1'}}>
        <thead><tr>{hcell('Ngân Hàng',1,'#fecaca')}{hcell('Số Tiền (tr)',1,'#fecaca')}{hcell('Thời Gian',1,'#f1f5f9')}{hcell('Lãi Suất',1,'#f1f5f9')}{hcell('Xóa',1,'#f1f5f9')}</tr></thead>
        <tbody>
          {vay.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:'1px solid #e2e8f0',background:i%2===0?'#fff':'#f8fafc'}}>
              <td style={{background:'#fff1f2',padding:'4px 8px',fontWeight:700}}>{textInput(r.bank,v=>updateVay(r.id,'bank',v))}</td>
              <td style={{background:'#fff1f2',padding:'4px 6px',textAlign:'right'}}>{numInput(r.so_tien,v=>updateVay(r.id,'so_tien',v))}</td>
              <td style={{padding:'4px 8px'}}>{textInput(r.thoi_gian,v=>updateVay(r.id,'thoi_gian',v))}</td>
              <td style={{padding:'4px 8px'}}>{textInput(r.lai_suat,v=>updateVay(r.id,'lai_suat',v))}</td>
              {delBtn(r.id,delVay)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Visualize Tab ────────────────────────────────────────────────────────────
const VisualizeTab: React.FC = () => {
  const rows = load<FinanceRow[]>('finance_rows', defaultRows);
  const ckHoldings = load<CKHolding[]>('finance_ck', defaultCK);
  const tietKiem = load<TietKiemDetail[]>('finance_tietkiem', defaultTietKiem);
  const vay = load<VayDetail[]>('finance_vay', defaultVay);

  const totalAssets = (r: FinanceRow) =>
    r.vang_so_luong*r.vang_gia + r.ck + r.tiet_kiem_vcb + r.tiet_kiem_tcb + r.cash_vcb + r.cash_tcb + r.cash_tpb;
  const totalLiabilities = (r: FinanceRow) => r.credit_tcb_spent + r.credit_tcb_instal + r.vay_vcb;
  const netWorth = (r: FinanceRow) => totalAssets(r) - totalLiabilities(r);

  if (!rows.length) return <p style={{textAlign:'center',color:'var(--text-muted)',marginTop:'40px'}}>Chưa có dữ liệu.</p>;

  const latest = rows[rows.length-1];
  const prev = rows.length>=2 ? rows[rows.length-2] : null;
  const nwLatest = netWorth(latest);
  const nwPrev = prev ? netWorth(prev) : null;
  const nwChange = nwPrev !== null ? nwLatest - nwPrev : null;
  const totalA = totalAssets(latest);
  const totalL = totalLiabilities(latest);

  // CK totals
  const ckTotalVon = ckHoldings.reduce((s,r)=>s+r.tong_sl*r.gia_von/1000000,0);
  const ckTotalTT  = ckHoldings.reduce((s,r)=>s+r.tong_sl*r.gia_tt/1000000,0);
  const ckLL = ckTotalTT - ckTotalVon;

  const assetSegments = [
    { label: 'Vàng', value: latest.vang_so_luong*latest.vang_gia, color: '#f59e0b' },
    { label: 'Cổ Phiếu (TT)', value: latest.ck, color: '#10b981' },
    { label: 'Tiết Kiệm', value: latest.tiet_kiem_vcb+latest.tiet_kiem_tcb, color: '#3b82f6' },
    { label: 'Cash', value: latest.cash_vcb+latest.cash_tcb+latest.cash_tpb, color: '#06b6d4' },
  ].filter(s=>s.value>0);

  const liabSegments = [
    { label: 'Credit TCB spent', value: latest.credit_tcb_spent, color: '#f87171' },
    { label: 'Credit TCB instal', value: latest.credit_tcb_instal, color: '#fb923c' },
    { label: 'Vay VCB', value: latest.vay_vcb, color: '#ef4444' },
  ].filter(s=>s.value>0);

  const barChart = (segments: {label:string;value:number;color:string}[], total: number) => (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {segments.map(s=>(
        <div key={s.label}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11.5px',marginBottom:'3px'}}>
            <span style={{color:'var(--text-main)',fontWeight:600}}>{s.label}</span>
            <span style={{color:s.color,fontFamily:'monospace',fontWeight:700}}>{fmt(s.value)} tr ({((s.value/total)*100).toFixed(1)}%)</span>
          </div>
          <div style={{height:'8px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden'}}>
            <div style={{width:`${(s.value/total)*100}%`,height:'100%',background:s.color,borderRadius:'4px'}}/>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>
      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px'}}>
        {[
          {label:'Tổng Tài Sản',value:`${fmt(totalA)} tr`,color:'var(--bull-green)',bg:'var(--bull-green-bg)'},
          {label:'Tổng Nợ',value:`${fmt(totalL)} tr`,color:'#ef4444',bg:'#fff1f2'},
          {label:'Tài Sản Ròng',value:`${fmt(nwLatest)} tr`,color:'#6366f1',bg:'#f0f0ff'},
          {label:'Thay Đổi kỳ trước',value:nwChange===null?'—':`${nwChange>=0?'+':''}${fmt(nwChange)} tr`,color:(nwChange??0)>=0?'var(--bull-green)':'#ef4444',bg:(nwChange??0)>=0?'var(--bull-green-bg)':'#fff1f2'},
          {label:'CK Lãi/Lỗ',value:`${ckLL>=0?'+':''}${fmt(ckLL,2)} tr`,color:ckLL>=0?'var(--bull-green)':'#ef4444',bg:ckLL>=0?'var(--bull-green-bg)':'#fff1f2'},
        ].map(kpi=>(
          <div key={kpi.label} style={{background:kpi.bg,border:`1px solid ${kpi.color}30`,borderRadius:'10px',padding:'12px 14px'}}>
            <span style={{fontSize:'10.5px',color:'var(--text-muted)',display:'block',marginBottom:'4px'}}>{kpi.label}</span>
            <div style={{fontSize:'18px',fontWeight:800,color:kpi.color,fontFamily:'monospace'}}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Asset & Liability breakdown */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
        <div className="card" style={{padding:'18px'}}>
          <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--text-main)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
            <TrendingUp size={14} color="var(--bull-green)"/> Phân Bổ Tài Sản ({latest.date})
          </h3>
          {barChart(assetSegments,totalA)}
        </div>
        <div className="card" style={{padding:'18px'}}>
          <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--text-main)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
            <TrendingDown size={14} color="#ef4444"/> Phân Bổ Nợ ({latest.date})
          </h3>
          {barChart(liabSegments,totalL)}
          <div style={{marginTop:'12px',paddingTop:'10px',borderTop:'1px solid var(--border-color)',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
            <span style={{color:'var(--text-muted)'}}>Tỷ lệ Nợ/Tài sản:</span>
            <strong style={{color:'#ef4444',fontFamily:'monospace'}}>{((totalL/totalA)*100).toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* CK Holdings breakdown */}
      <div className="card" style={{padding:'18px'}}>
        <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--text-main)',marginBottom:'14px'}}>📊 Chi Tiết Danh Mục Cổ Phiếu</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
            <thead>
              <tr style={{background:'#f0fdf4',borderBottom:'2px solid #bbf7d0'}}>
                {['Mã','SL','Giá Vốn','Giá TT','GT Vốn (tr)','GT TT (tr)','Lãi/Lỗ (tr)','%'].map(h=>(
                  <th key={h} style={{padding:'7px 10px',textAlign:'right',fontSize:'11px',fontWeight:700,color:'#166534'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ckHoldings.map((r,i)=>{
                const gtvon=r.tong_sl*r.gia_von/1000000;
                const gttt=r.tong_sl*r.gia_tt/1000000;
                const ll=gttt-gtvon;
                const pct=gtvon>0?(ll/gtvon)*100:0;
                const c=ll>=0?'var(--bull-green)':'#ef4444';
                return (
                  <tr key={r.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#f8fafc'}}>
                    <td style={{padding:'7px 10px',fontWeight:800,color:'var(--text-main)',fontFamily:'monospace'}}>{r.symbol}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace'}}>{r.tong_sl.toLocaleString()}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',color:'#92400e'}}>{r.gia_von.toLocaleString()}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',color:'#1e40af'}}>{r.gia_tt.toLocaleString()}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',color:'#92400e'}}>{fmt(gtvon,3)}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',color:'#1e40af'}}>{fmt(gttt,3)}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:c}}>{ll>=0?'+':''}{fmt(ll,3)}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:c}}>{pct>=0?'+':''}{pct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'2px solid #bbf7d0',background:'#f0fdf4'}}>
                <td colSpan={4} style={{padding:'7px 10px',fontWeight:800,fontSize:'11px',color:'#166534'}}>TỔNG</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:'#92400e'}}>{fmt(ckTotalVon,3)}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:'#1e40af'}}>{fmt(ckTotalTT,3)}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:ckLL>=0?'var(--bull-green)':'#ef4444'}}>{ckLL>=0?'+':''}{fmt(ckLL,3)}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:800,color:ckLL>=0?'var(--bull-green)':'#ef4444'}}>{ckTotalVon>0?`${((ckLL/ckTotalVon)*100)>=0?'+':''}${((ckLL/ckTotalVon)*100).toFixed(2)}%`:'—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* CK bar chart */}
        <div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {ckHoldings.map(r=>{
            const gttt=r.tong_sl*r.gia_tt/1000000;
            const ll=(r.gia_tt-r.gia_von)*r.tong_sl/1000000;
            const pct=r.gia_von>0?((r.gia_tt-r.gia_von)/r.gia_von)*100:0;
            const c=pct>=0?'var(--bull-green)':'#ef4444';
            const maxTT=Math.max(...ckHoldings.map(x=>x.tong_sl*x.gia_tt/1000000));
            return (
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{minWidth:'36px',fontFamily:'monospace',fontWeight:800,fontSize:'11px',color:'var(--text-main)'}}>{r.symbol}</span>
                <div style={{flex:1,height:'16px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden',position:'relative'}}>
                  <div style={{width:`${(gttt/maxTT)*100}%`,height:'100%',background:pct>=0?'#bbf7d0':'#fecaca',borderRadius:'4px'}}/>
                </div>
                <span style={{minWidth:'60px',fontFamily:'monospace',fontSize:'11px',color:'#1e40af',textAlign:'right'}}>{fmt(gttt,1)} tr</span>
                <span style={{minWidth:'60px',fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:c,textAlign:'right'}}>{pct>=0?'+':''}{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tiet kiem + Vay */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
        <div className="card" style={{padding:'18px'}}>
          <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--text-main)',marginBottom:'12px'}}>🏦 Tiết Kiệm</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {tietKiem.map(tk=>(
              <div key={tk.id} style={{background:'#eff6ff',borderRadius:'8px',padding:'10px 12px',border:'1px solid #bfdbfe'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontWeight:800,color:'#1e40af',fontSize:'13px'}}>{tk.bank}</span>
                  <span style={{fontFamily:'monospace',fontWeight:800,color:'#1e40af',fontSize:'14px'}}>{tk.amount} tr</span>
                </div>
                <div style={{fontSize:'11.5px',color:'var(--text-muted)',display:'flex',gap:'12px'}}>
                  <span>Lãi suất: <strong style={{color:'var(--bull-green)'}}>{tk.rate}%/năm</strong></span>
                  <span>{tk.start_date} → {tk.end_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{padding:'18px'}}>
          <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--text-main)',marginBottom:'12px'}}>🏠 Vay</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {vay.map(v=>(
              <div key={v.id} style={{background:'#fff1f2',borderRadius:'8px',padding:'10px 12px',border:'1px solid #fecaca'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontWeight:800,color:'#991b1b',fontSize:'13px'}}>{v.bank}</span>
                  <span style={{fontFamily:'monospace',fontWeight:800,color:'#ef4444',fontSize:'14px'}}>{v.so_tien} tr</span>
                </div>
                <div style={{fontSize:'11.5px',color:'var(--text-muted)',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                  <span>Lãi suất: <strong style={{color:'#ef4444'}}>{v.lai_suat}</strong></span>
                  <span>{v.thoi_gian}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="card" style={{padding:'18px'}}>
        <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--text-main)',marginBottom:'14px'}}>📈 Lịch Sử Tài Sản & Nợ</h3>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
          <thead>
            <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
              {['Ngày','Tổng Tài Sản','Tổng Nợ','Tài Sản Ròng','Thay Đổi'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:'right',fontSize:'11px',fontWeight:700,color:'var(--text-muted)'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              const ta=totalAssets(r), tl=totalLiabilities(r), nw=netWorth(r);
              const pnw=i>0?netWorth(rows[i-1]):null;
              const ch=pnw!==null?nw-pnw:null;
              return (
                <tr key={r.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'8px 12px',fontFamily:'monospace',fontWeight:700,color:'var(--text-main)'}}>{r.date}</td>
                  <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'monospace',color:'var(--bull-green)',fontWeight:700}}>{fmt(ta)} tr</td>
                  <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'monospace',color:'#ef4444',fontWeight:700}}>{fmt(tl)} tr</td>
                  <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'monospace',color:'#6366f1',fontWeight:800}}>{fmt(nw)} tr</td>
                  <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:ch===null?'#94a3b8':ch>=0?'var(--bull-green)':'#ef4444'}}>
                    {ch===null?'—':`${ch>=0?'+':''}${fmt(ch)} tr`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Tool Tab ─────────────────────────────────────────────────────────────────
const ToolTab: React.FC = () => {
  const [monthlyExpense, setMonthlyExpense] = useState(20000000);
  const [riskTolerance, setRiskTolerance] = useState<'conservative'|'moderate'|'aggressive'>('moderate');
  const annualExpense = monthlyExpense*12;
  const fireTarget = annualExpense*25;
  const emergencyFundTarget = monthlyExpense*6;
  const allocation = useMemo(()=>{
    switch(riskTolerance){
      case 'conservative': return {equity:30,etf:30,cash:30,gold:10,expectedReturn:10.5};
      case 'aggressive': return {equity:60,etf:25,cash:10,gold:5,expectedReturn:18.0};
      default: return {equity:45,etf:35,cash:15,gold:5,expectedReturn:14.5};
    }
  },[riskTolerance]);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'32px'}}>
      <div>
        <h2 style={{fontSize:'16px',fontWeight:800,color:'var(--text-main)',marginBottom:'4px'}}>Mô Phỏng & So Sánh 3 Chiến Lược Tích Sản</h2>
        <p style={{fontSize:'12.5px',color:'var(--text-muted)',marginBottom:'14px'}}>Lump Sum vs DCA vs Tiết Kiệm — mô phỏng sức mạnh lãi kép.</p>
        <Calculator/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))',gap:'20px'}}>
        <div className="card" style={{display:'flex',flexDirection:'column',gap:'16px',padding:'20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid var(--border-color)',paddingBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}><Target size={18} color="var(--accent-purple)"/><h3 style={{fontSize:'15px',fontWeight:700,color:'var(--text-main)'}}>Mục Tiêu Tự Do Tài Chính (FIRE)</h3></div>
            <span className="badge badge-info">Quy tắc 4%</span>
          </div>
          <div>
            <label style={{fontSize:'11.5px',color:'var(--text-muted)',display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
              <span>Chi tiêu sinh hoạt hàng tháng:</span><strong className="mono" style={{color:'var(--text-main)'}}>{fmtVND(monthlyExpense)}/tháng</strong>
            </label>
            <input type="range" min="5000000" max="100000000" step="1000000" value={monthlyExpense} onChange={e=>setMonthlyExpense(Number(e.target.value))} style={{width:'100%',accentColor:'var(--accent-purple)',cursor:'pointer'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',background:'#f8fafc',padding:'12px',borderRadius:'6px',border:'1px solid var(--border-color)'}}>
            <div><span style={{fontSize:'11px',color:'var(--text-dim)',display:'block'}}>Chi tiêu 1 năm:</span><div className="mono" style={{fontSize:'15px',fontWeight:700,color:'var(--text-main)'}}>{fmtVND(annualExpense)}</div></div>
            <div><span style={{fontSize:'11px',color:'var(--text-dim)',display:'block'}}>Cột mốc FIRE:</span><div className="mono" style={{fontSize:'17px',fontWeight:800,color:'var(--accent-purple)'}}>{fmtVND(fireTarget)}</div></div>
          </div>
          <p style={{fontSize:'12px',color:'var(--text-muted)',lineHeight:'1.4'}}>�� <em>Khi tài sản đạt {fmtVND(fireTarget)}, rút 4%/năm = {fmtVND(annualExpense)} mà danh mục vẫn sinh trưởng.</em></p>
        </div>
        <div className="card" style={{display:'flex',flexDirection:'column',gap:'16px',padding:'20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid var(--border-color)',paddingBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}><ShieldCheck size={18} color="var(--bull-green)"/><h3 style={{fontSize:'15px',fontWeight:700,color:'var(--text-main)'}}>Quỹ An Toàn & Phân Bổ Danh Mục</h3></div>
            <div style={{display:'flex',gap:'4px'}}>
              {(['conservative','moderate','aggressive'] as const).map(r=>(
                <button key={r} onClick={()=>setRiskTolerance(r)} style={{background:riskTolerance===r?'var(--bull-green)':'#f1f5f9',color:riskTolerance===r?'#fff':'var(--text-muted)',border:'none',padding:'3px 8px',borderRadius:'4px',fontSize:'10.5px',fontWeight:700,cursor:'pointer'}}>
                  {r==='conservative'?'Thận trọng':r==='moderate'?'Cân bằng':'Tăng trưởng'}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',textAlign:'center'}}>
            {[{label:'Cổ Phiếu',val:allocation.equity,c:'var(--bull-green)',bg:'var(--bull-green-bg)',b:'var(--bull-green-border)'},{label:'Quỹ ETF',val:allocation.etf,c:'var(--accent-blue)',bg:'var(--accent-blue-bg)',b:'var(--accent-blue-border)'},{label:'Tiết Kiệm',val:allocation.cash,c:'var(--accent-yellow)',bg:'var(--accent-yellow-bg)',b:'var(--accent-yellow-border)'},{label:'Vàng/Khác',val:allocation.gold,c:'var(--accent-purple)',bg:'var(--accent-purple-bg)',b:'var(--accent-purple-border)'}].map(item=>(
              <div key={item.label} style={{background:item.bg,border:`1px solid ${item.b}`,padding:'8px',borderRadius:'6px'}}>
                <span style={{fontSize:'10.5px',color:item.c,fontWeight:600}}>{item.label}</span>
                <div className="mono" style={{fontSize:'16px',fontWeight:800,color:item.c}}>{item.val}%</div>
              </div>
            ))}
          </div>
          <div style={{background:'#f8fafc',padding:'12px',borderRadius:'6px',border:'1px solid var(--border-color)',display:'flex',flexDirection:'column',gap:'6px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'var(--text-muted)'}}>Quỹ dự phòng khẩn cấp (6 tháng):</span><strong className="mono" style={{color:'var(--text-main)'}}>{fmtVND(emergencyFundTarget)}</strong></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span style={{color:'var(--text-muted)'}}>Tỷ suất kỳ vọng danh mục:</span><strong className="mono" style={{color:'var(--bull-green)'}}>~{allocation.expectedReturn}% / năm</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = 'tool'|'raw'|'visual';
const TABS: {id:Tab;label:string;icon:React.ReactNode}[] = [
  {id:'tool',label:'1. Công Cụ Tài Chính',icon:<Wallet size={14}/>},
  {id:'raw',label:'2. Dữ Liệu Thô',icon:<Table2 size={14}/>},
  {id:'visual',label:'3. Trực Quan Hoá',icon:<BarChart2 size={14}/>},
];

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('raw');
  return (
    <div className="page-wrapper animate-fade-in" style={{padding:'28px 32px',maxWidth:'1440px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'24px'}}>
      <div style={{display:'flex',gap:'4px',borderBottom:'2px solid var(--border-color)'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
            display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',fontSize:'13px',fontWeight:700,
            border:'none',borderBottom:activeTab===tab.id?'2px solid var(--accent-blue)':'2px solid transparent',
            marginBottom:'-2px',background:activeTab===tab.id?'var(--accent-blue-bg)':'transparent',
            color:activeTab===tab.id?'var(--accent-blue)':'var(--text-muted)',
            cursor:'pointer',borderRadius:'6px 6px 0 0',transition:'all 0.15s'
          }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab==='tool' && <ToolTab/>}
        {activeTab==='raw' && <RawDataTab/>}
        {activeTab==='visual' && <VisualizeTab/>}
      </div>
    </div>
  );
};
