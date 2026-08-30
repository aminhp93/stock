import React, { useState, useMemo } from "react";
import { Calculator } from "../components/Calculator";
import {
  Wallet,
  Table2,
  BarChart2,
  ShieldCheck,
  Target,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Building2,
  Award,
  Calendar,
  CheckCircle2,
  HelpCircle,
  FileText,
} from "lucide-react";
import {
  INSURANCE_RAW_DATA,
  getInsuranceCalculations,
} from "../data/insurance_raw";

// ─── Types ───────────────────────────────────────────────────────────────────
interface FinanceRow {
  id: string;
  date: string;
  vang_so_luong: number;
  vang_gia: number;
  ck: number;
  tiet_kiem_vcb: number;
  tiet_kiem_tcb: number;
  cash_vcb: number;
  cash_tcb: number;
  cash_tpb: number;
  credit_tcb_spent: number;
  credit_tcb_instal: number;
  vay_vcb: number;
}
interface CKHolding {
  id: string;
  symbol: string;
  tong_sl: number;
  gia_von: number;
  gia_tt: number;
}
interface TietKiemDetail {
  id: string;
  bank: string;
  amount: number;
  rate: number;
  start_date: string;
  end_date: string;
}
interface VayDetail {
  id: string;
  bank: string;
  so_tien: number;
  thoi_gian: string;
  lai_suat: string;
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const defaultRows: FinanceRow[] = [
  {
    id: "1",
    date: "2026-08-20",
    vang_so_luong: 3.1,
    vang_gia: 143,
    ck: 276,
    tiet_kiem_vcb: 5,
    tiet_kiem_tcb: 5,
    cash_vcb: 0.3,
    cash_tcb: 30.6,
    cash_tpb: 0,
    credit_tcb_spent: 3.3,
    credit_tcb_instal: 30.2,
    vay_vcb: 1836,
  },
  {
    id: "2",
    date: "2026-08-29",
    vang_so_luong: 3.1,
    vang_gia: 145.7,
    ck: 303,
    tiet_kiem_vcb: 5,
    tiet_kiem_tcb: 5,
    cash_vcb: 5.6,
    cash_tcb: 79.3,
    cash_tpb: 0,
    credit_tcb_spent: 7.8,
    credit_tcb_instal: 27.2,
    vay_vcb: 1836,
  },
];
const defaultCK: CKHolding[] = [
  { id: "1", symbol: "C4G", tong_sl: 60, gia_von: 20869, gia_tt: 5600 },
  { id: "2", symbol: "HDG", tong_sl: 1980, gia_von: 26727, gia_tt: 16650 },
  { id: "3", symbol: "HHV", tong_sl: 4, gia_von: 11366, gia_tt: 10050 },
  { id: "4", symbol: "IDI", tong_sl: 16, gia_von: 0, gia_tt: 5000 },
  { id: "5", symbol: "MBS", tong_sl: 4841, gia_von: 26351, gia_tt: 17900 },
  { id: "6", symbol: "PDR", tong_sl: 3200, gia_von: 16000, gia_tt: 12400 },
  { id: "7", symbol: "TCH", tong_sl: 11236, gia_von: 18304, gia_tt: 12200 },
];
const defaultTietKiem: TietKiemDetail[] = [
  {
    id: "1",
    bank: "VCB",
    amount: 5,
    rate: 7.4,
    start_date: "2026-08-04",
    end_date: "2027-08-04",
  },
  {
    id: "2",
    bank: "TCB",
    amount: 5,
    rate: 7.8,
    start_date: "2026-08-04",
    end_date: "2027-08-04",
  },
];
const defaultVay: VayDetail[] = [
  {
    id: "1",
    bank: "VCB",
    so_tien: 1900,
    thoi_gian: "7/8/2025 - 9/8/2055",
    lai_suat: "5.5% / 3 năm đầu",
  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
function load<T>(key: string, def: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : def;
  } catch {
    return def;
  }
}
function save<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

const fmt = (n: number, d = 1) =>
  n.toLocaleString("vi-VN", { maximumFractionDigits: d });
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Raw Data Tab ─────────────────────────────────────────────────────────────
// ─── Raw Data Tab (View Only) ──────────────────────────────────────────────────
export const RawDataTab: React.FC = () => {
  const rows = load<FinanceRow[]>("finance_rows", defaultRows);
  const ckHoldings = load<CKHolding[]>("finance_ck", defaultCK);
  const tietKiem = load<TietKiemDetail[]>("finance_tietkiem", defaultTietKiem);
  const vay = load<VayDetail[]>("finance_vay", defaultVay);

  // Latest snapshot metrics
  const latest = rows.length > 0 ? rows[rows.length - 1] : null;
  const vangTotal = latest ? latest.vang_so_luong * latest.vang_gia : 0;
  const ckTotal = latest ? latest.ck : 0;
  const tkTotal = latest ? latest.tiet_kiem_vcb + latest.tiet_kiem_tcb : 0;
  const cashTotal = latest ? latest.cash_vcb + latest.cash_tcb + latest.cash_tpb : 0;
  const grossAssets = vangTotal + ckTotal + tkTotal + cashTotal;
  const debtTotal = latest ? latest.credit_tcb_spent + latest.credit_tcb_instal + latest.vay_vcb : 0;
  const netWorth = grossAssets - debtTotal;

  const hcell = (label: string, span = 1, bg = "#f1f5f9", align: "left" | "center" | "right" = "center") => (
    <th
      colSpan={span}
      style={{
        background: bg,
        padding: "8px 10px",
        fontSize: "11px",
        fontWeight: 700,
        textAlign: align,
        borderRight: "1px solid #cbd5e1",
        color: "#334155",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </th>
  );

  const sectionHeader = (title: string, subtitle?: string, icon?: React.ReactNode) => (
    <div style={{ marginBottom: "12px", marginTop: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {icon}
        <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", margin: 0 }}>
          {title}
        </h3>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            background: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #e2e8f0",
          }}
        >
          Chế độ xem (View Only)
        </span>
      </div>
      {subtitle && <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>{subtitle}</div>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Summary Snapshot Cards ── */}
      {latest && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              flex: "1 1 200px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              🏦 Tài Sản Ròng (Net Worth)
            </span>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: netWorth >= 0 ? "#059669" : "#dc2626",
                fontFamily: "monospace",
              }}
            >
              {netWorth >= 0 ? "+" : ""}{fmt(netWorth)} tr
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Tổng TS: {fmt(grossAssets)} tr · Tổng Nợ: {fmt(debtTotal)} tr
            </span>
          </div>

          <div
            style={{
              flex: "1 1 180px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              🟡 Vàng ({latest.vang_so_luong} cây)
            </span>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#b45309", fontFamily: "monospace" }}>
              {fmt(vangTotal)} tr
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Giá: {latest.vang_gia} tr/lượng
            </span>
          </div>

          <div
            style={{
              flex: "1 1 180px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              📈 Chứng Khoán ({ckHoldings.length} mã)
            </span>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#2563eb", fontFamily: "monospace" }}>
              {fmt(ckTotal)} tr
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Giá trị danh mục cổ phiếu
            </span>
          </div>

          <div
            style={{
              flex: "1 1 180px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              💵 Tiền Mặt & Tiết Kiệm
            </span>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#0891b2", fontFamily: "monospace" }}>
              {fmt(cashTotal + tkTotal)} tr
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Cash: {fmt(cashTotal)} tr · TK: {fmt(tkTotal)} tr
            </span>
          </div>

          <div
            style={{
              flex: "1 1 180px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              💳 Tổng Dư Nợ & Vay
            </span>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#dc2626", fontFamily: "monospace" }}>
              {fmt(debtTotal)} tr
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Vay VCB: {fmt(latest.vay_vcb)} tr · Thẻ: {fmt(latest.credit_tcb_spent + latest.credit_tcb_instal)} tr
            </span>
          </div>
        </div>
      )}

      {/* ── Section 1: Main Log (View Only) ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
        {sectionHeader("📋 Nhật Ký Tài Chính Theo Ngày", "Lịch sử ghi nhận biến động giá trị tài sản và dư nợ theo từng mốc thời gian")}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "12px",
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr>
                {hcell("Ngày", 1, "#f1f5f9")}
                {hcell("Vàng (triệu)", 3, "#fef9c3")}
                {hcell("CK", 1, "#dcfce7")}
                {hcell("Tiết Kiệm", 2, "#dbeafe")}
                {hcell("Tiền Mặt (Cash)", 3, "#fef9c3")}
                {hcell("Thẻ Tín Dụng", 2, "#fee2e2")}
                {hcell("Vay", 1, "#fecaca")}
                {hcell("Tổng TS", 1, "#dcfce7")}
                {hcell("Tổng Nợ", 1, "#fee2e2")}
                {hcell("Tài Sản Ròng", 1, "#eff6ff")}
              </tr>
              <tr>
                {hcell("", 1, "#f1f5f9")}
                {hcell("SL (cây)", 1, "#fef9c3")}
                {hcell("Giá (tr)", 1, "#fef9c3")}
                {hcell("Tổng (tr)", 1, "#fef9c3")}
                {hcell("CK (tr)", 1, "#dcfce7")}
                {hcell("VCB (tr)", 1, "#dbeafe")}
                {hcell("TCB (tr)", 1, "#dbeafe")}
                {hcell("VCB (tr)", 1, "#fef9c3")}
                {hcell("TCB (tr)", 1, "#fef9c3")}
                {hcell("TPB (tr)", 1, "#fef9c3")}
                {hcell("Đã Tiêu", 1, "#fee2e2")}
                {hcell("Trả Góp", 1, "#fee2e2")}
                {hcell("VCB (tr)", 1, "#fecaca")}
                {hcell("(tr)", 1, "#dcfce7")}
                {hcell("(tr)", 1, "#fee2e2")}
                {hcell("Net Worth", 1, "#eff6ff")}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
                const rowVang = r.vang_so_luong * r.vang_gia;
                const rowTS = rowVang + r.ck + r.tiet_kiem_vcb + r.tiet_kiem_tcb + r.cash_vcb + r.cash_tcb + r.cash_tpb;
                const rowNo = r.credit_tcb_spent + r.credit_tcb_instal + r.vay_vcb;
                const rowNet = rowTS - rowNo;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ background: bg, padding: "8px 10px", fontFamily: "monospace", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>
                      {r.date}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {r.vang_so_luong}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {fmt(r.vang_gia)}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#b45309" }}>
                      {fmt(rowVang)}
                    </td>
                    <td style={{ background: "#f0fdf4", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#15803d" }}>
                      {fmt(r.ck)}
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {fmt(r.tiet_kiem_vcb)}
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {fmt(r.tiet_kiem_tcb)}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {fmt(r.cash_vcb)}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {fmt(r.cash_tcb)}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {fmt(r.cash_tpb)}
                    </td>
                    <td style={{ background: "#fff1f2", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>
                      {fmt(r.credit_tcb_spent)}
                    </td>
                    <td style={{ background: "#fff1f2", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#b91c1c" }}>
                      {fmt(r.credit_tcb_instal)}
                    </td>
                    <td style={{ background: "#fee2e2", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#b91c1c" }}>
                      {fmt(r.vay_vcb)}
                    </td>
                    <td style={{ background: "#f0fdf4", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#15803d" }}>
                      {fmt(rowTS)}
                    </td>
                    <td style={{ background: "#fee2e2", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#b91c1c" }}>
                      {fmt(rowNo)}
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: rowNet >= 0 ? "#059669" : "#dc2626" }}>
                      {rowNet >= 0 ? "+" : ""}{fmt(rowNet)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: CK Holdings (View Only) ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
        {sectionHeader("📊 Danh Mục Cổ Phiếu Nắm Giữ", "Bảng thống kê chi tiết khối lượng, giá vốn và tỷ suất sinh lời từng mã cổ phiếu")}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "12px",
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {hcell("Mã CK", 1, "#dcfce7", "left")}
                {hcell("Tổng Khối Lượng", 1, "#dcfce7", "right")}
                {hcell("Giá Vốn (đ)", 1, "#fef9c3", "right")}
                {hcell("Giá Thị Trường (đ)", 1, "#dbeafe", "right")}
                {hcell("Giá Trị Vốn (tr)", 1, "#fef9c3", "right")}
                {hcell("Giá Trị TT (tr)", 1, "#dbeafe", "right")}
                {hcell("Lãi/Lỗ (tr)", 1, "#f1f5f9", "right")}
                {hcell("% Lãi/Lỗ", 1, "#f1f5f9", "right")}
              </tr>
            </thead>
            <tbody>
              {ckHoldings.map((r, i) => {
                const gtvon = (r.tong_sl * r.gia_von) / 1000000;
                const gttt = (r.tong_sl * r.gia_tt) / 1000000;
                const laiLo = gttt - gtvon;
                const pct = gtvon > 0 ? (laiLo / gtvon) * 100 : 0;
                const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
                const isProfitable = laiLo >= 0;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ background: "#f0fdf4", padding: "8px 12px" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 900,
                          fontSize: "13px",
                          color: "#166534",
                          background: "#dcfce7",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {r.symbol}
                      </span>
                    </td>
                    <td style={{ background: bg, padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                      {r.tong_sl.toLocaleString()}
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 12px", textAlign: "right", fontFamily: "monospace" }}>
                      {r.gia_von.toLocaleString()} đ
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#1e40af" }}>
                      {r.gia_tt.toLocaleString()} đ
                    </td>
                    <td style={{ background: "#fffde7", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", color: "#92400e" }}>
                      {fmt(gtvon, 3)} tr
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#1e40af" }}>
                      {fmt(gttt, 3)} tr
                    </td>
                    <td style={{ background: bg, padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: isProfitable ? "#15803d" : "#dc2626" }}>
                      {isProfitable ? "+" : ""}{fmt(laiLo, 3)} tr
                    </td>
                    <td style={{ background: bg, padding: "8px 12px", textAlign: "right" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          fontSize: "11.5px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: isProfitable ? "#f0fdf4" : "#fef2f2",
                          color: isProfitable ? "#15803d" : "#dc2626",
                        }}
                      >
                        {isProfitable ? "+" : ""}{pct.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #cbd5e1", background: "#f8fafc" }}>
                <td colSpan={4} style={{ padding: "10px 12px", fontSize: "12px", fontWeight: 800, color: "#334155" }}>
                  TỔNG DANH MỤC CỔ PHIẾU
                </td>
                {(() => {
                  const totalVon = ckHoldings.reduce((s, r) => s + (r.tong_sl * r.gia_von) / 1000000, 0);
                  const totalTT = ckHoldings.reduce((s, r) => s + (r.tong_sl * r.gia_tt) / 1000000, 0);
                  const ll = totalTT - totalVon;
                  const pct = totalVon > 0 ? (ll / totalVon) * 100 : 0;
                  const isPos = ll >= 0;
                  return (
                    <>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#92400e" }}>
                        {fmt(totalVon, 3)} tr
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#1e40af" }}>
                        {fmt(totalTT, 3)} tr
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: isPos ? "#15803d" : "#dc2626" }}>
                        {isPos ? "+" : ""}{fmt(ll, 3)} tr
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: isPos ? "#15803d" : "#dc2626" }}>
                        {isPos ? "+" : ""}{pct.toFixed(2)}%
                      </td>
                    </>
                  );
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Section 3: Tiet Kiem (View Only) ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
        {sectionHeader("🏦 Sổ Tiết Kiệm Ngân Hàng", "Chi tiết các khoản tiền gửi kỳ hạn và lãi suất dự kiến")}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "12px",
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {hcell("Ngân Hàng", 1, "#dbeafe", "left")}
                {hcell("Số Tiền Gửi (tr)", 1, "#dbeafe", "right")}
                {hcell("Lãi Suất (%/năm)", 1, "#dbeafe", "right")}
                {hcell("Ngày Mở Sổ", 1, "#f1f5f9")}
                {hcell("Ngày Đến Hạn", 1, "#f1f5f9")}
                {hcell("Tiền Lãi Dự Kiến (tr)", 1, "#f0fdf4", "right")}
              </tr>
            </thead>
            <tbody>
              {tietKiem.map((r, i) => {
                const interest = (r.amount * r.rate) / 100;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ background: "#eff6ff", padding: "8px 12px", fontWeight: 800, color: "#1e40af" }}>
                      {r.bank}
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>
                      {fmt(r.amount)} tr
                    </td>
                    <td style={{ background: "#eff6ff", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", color: "#2563eb" }}>
                      {r.rate}%
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "monospace", color: "#64748b" }}>
                      {r.start_date}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "monospace", color: "#64748b" }}>
                      {r.end_date}
                    </td>
                    <td style={{ background: "#f0fdf4", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#15803d" }}>
                      +{fmt(interest, 2)} tr
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #cbd5e1", background: "#f8fafc" }}>
                <td style={{ padding: "10px 12px", fontSize: "12px", fontWeight: 800, color: "#334155" }}>
                  TỔNG TIẾT KIỆM
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#1e40af" }}>
                  {fmt(tietKiem.reduce((s, r) => s + r.amount, 0))} tr
                </td>
                <td colSpan={3} />
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#15803d" }}>
                  +{fmt(tietKiem.reduce((s, r) => s + (r.amount * r.rate) / 100, 0), 2)} tr
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Section 4: Vay (View Only) ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
        {sectionHeader("🏠 Dư Nợ Vay & Khoản Nợ Dài Hạn", "Bảng thống kê các khoản vay ngân hàng, kỳ hạn và lãi suất cam kết")}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "12px",
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {hcell("Ngân Hàng", 1, "#fecaca", "left")}
                {hcell("Dư Nợ Gốc (tr)", 1, "#fecaca", "right")}
                {hcell("Thời Gian Vay", 1, "#f1f5f9")}
                {hcell("Lãi Suất & Ghi Chú", 1, "#f1f5f9")}
                {hcell("Ước Tính Lãi/Tháng (tr)", 1, "#fee2e2", "right")}
              </tr>
            </thead>
            <tbody>
              {vay.map((r, i) => {
                // Approximate monthly interest (5.5% annual rate)
                const monthlyInterest = (r.so_tien * 0.055) / 12;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ background: "#fff1f2", padding: "8px 12px", fontWeight: 800, color: "#b91c1c" }}>
                      {r.bank}
                    </td>
                    <td style={{ background: "#fff1f2", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#b91c1c" }}>
                      {fmt(r.so_tien)} tr
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "monospace", color: "#475569" }}>
                      {r.thoi_gian}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#475569" }}>
                      {r.lai_suat}
                    </td>
                    <td style={{ background: "#fee2e2", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#b91c1c" }}>
                      ~{fmt(monthlyInterest, 2)} tr/tháng
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #cbd5e1", background: "#f8fafc" }}>
                <td style={{ padding: "10px 12px", fontSize: "12px", fontWeight: 800, color: "#334155" }}>
                  TỔNG DƯ NỢ VAY
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#b91c1c" }}>
                  {fmt(vay.reduce((s, r) => s + r.so_tien, 0))} tr
                </td>
                <td colSpan={2} />
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#b91c1c" }}>
                  ~{fmt(vay.reduce((s, r) => s + (r.so_tien * 0.055) / 12, 0), 2)} tr/tháng
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Section 5: Luong, BHXH, BHTN (Dữ liệu VssID) ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
        {sectionHeader("💼 Quá Trình Đóng BHXH, BHTN & Lịch Sử Thu Nhập Lương", "Dữ liệu đối chiếu từ ứng dụng VssID - Bảo hiểm Xã hội Việt Nam")}
        
        {/* Profile metadata bar */}
        {(() => {
          const calc = getInsuranceCalculations(INSURANCE_RAW_DATA);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#64748b" }}>Người lao động:</span>
                    <strong style={{ color: "#0f172a", fontSize: "13px" }}>{INSURANCE_RAW_DATA.employee_name}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#64748b" }}>Mã số BHXH:</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                      {INSURANCE_RAW_DATA.social_insurance_code}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Building2 size={13} color="#64748b" />
                    <span style={{ color: "#334155", fontWeight: 600 }}>{INSURANCE_RAW_DATA.company_name}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "4px", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} /> {INSURANCE_RAW_DATA.total_formatted}
                  </span>
                  <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "4px", fontSize: "11px" }}>
                    Chậm đóng: <strong>{INSURANCE_RAW_DATA.late_payment_months} tháng</strong>
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                    Cập nhật: {INSURANCE_RAW_DATA.last_updated}
                  </span>
                </div>
              </div>

              {/* 4 KPI Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                    💰 Tổng Thu Nhập Lương Đã Nhận
                  </span>
                  <div style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", fontFamily: "monospace", marginTop: "4px" }}>
                    {fmtVND(calc.totalSalaryActual)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Trung bình: <strong>{fmtVND(Math.round(calc.avgSalaryActual))}/tháng</strong>
                  </div>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "11px", color: "#1e40af", fontWeight: 700 }}>
                    🛡️ Tổng Quỹ BHXH + BHYT + BHTN (32%)
                  </span>
                  <div style={{ fontSize: "19px", fontWeight: 900, color: "#1e40af", fontFamily: "monospace", marginTop: "4px" }}>
                    {fmtVND(calc.grandTotal)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px" }}>
                    Cá nhân (10.5%): {fmt(calc.totalEmployeeDeducted / 1000000, 1)} tr · Cty (21.5%): {fmt(calc.totalEmployerContributed / 1000000, 1)} tr
                  </div>
                </div>

                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>
                    🎁 Ước Tính BHXH 1 Lần ({calc.bhxh1LanYears} Năm)
                  </span>
                  <div style={{ fontSize: "19px", fontWeight: 900, color: "#15803d", fontFamily: "monospace", marginTop: "4px" }}>
                    ~{fmtVND(Math.round(calc.estimatedBHXH1Lan))}
                  </div>
                  <div style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>
                    2 tháng × {calc.bhxh1LanYears} năm × Mbq {fmt(calc.avgSalaryBHXH / 1000000, 1)} tr (Chưa nhân trượt giá CPI, thực tế ~350–355 tr)
                  </div>
                </div>

                <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "8px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "11px", color: "#854d0e", fontWeight: 700 }}>
                    🏖️ Trợ Cấp Thất Nghiệp (BHTN {calc.bhtnBenefitMonths} Tháng)
                  </span>
                  <div style={{ fontSize: "19px", fontWeight: 900, color: "#b45309", fontFamily: "monospace", marginTop: "4px" }}>
                    {fmtVND(Math.round(calc.estimatedMonthlyBHTN))}/tháng
                  </div>
                  <div style={{ fontSize: "11px", color: "#854d0e", marginTop: "2px" }}>
                    Tổng nhận {calc.bhtnBenefitMonths} tháng: <strong>{fmtVND(Math.round(calc.estimatedTotalBHTN))}</strong> (Áp trần 5× LTTV vùng I 2026: 26.55 tr/tháng)
                  </div>
                </div>
              </div>

              {/* Detailed Insurance Table */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {hcell("Kỳ Đóng (Từ → Đến)", 1, "#f1f5f9", "left")}
                      {hcell("Số Tháng", 1, "#f1f5f9", "center")}
                      {hcell("Mức Lương Thực Tế (đ)", 1, "#dcfce7", "right")}
                      {hcell("Lương Đóng BHXH (đ)", 1, "#dbeafe", "right")}
                      {hcell("Lương Đóng BHTN (đ)", 1, "#fef9c3", "right")}
                      {hcell("Ghi Chú Mức Trần Áp Dụng", 1, "#f8fafc", "left")}
                    </tr>
                  </thead>
                  <tbody>
                    {INSURANCE_RAW_DATA.records.map((r, i) => {
                      const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0", background: bg }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#1e293b" }}>
                            {r.period_from} → {r.period_to}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#475569" }}>
                            {r.months} tháng
                          </td>
                          <td style={{ background: "#f0fdf4", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#15803d" }}>
                            {r.salary_actual.toLocaleString()} đ
                          </td>
                          <td style={{ background: "#eff6ff", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#1e40af" }}>
                            {r.salary_bhxh.toLocaleString()} đ
                          </td>
                          <td style={{ background: "#fffde7", padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#92400e" }}>
                            {r.salary_bhtn.toLocaleString()} đ
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: "11px", color: "#64748b" }}>
                            {r.base_salary_cap_note}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #cbd5e1", background: "#f8fafc" }}>
                      <td style={{ padding: "10px 12px", fontSize: "12px", fontWeight: 800, color: "#334155" }}>
                        TỔNG CỘNG ({INSURANCE_RAW_DATA.total_months} THÁNG)
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 900, color: "#15803d" }}>
                        {INSURANCE_RAW_DATA.total_months} tháng
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#15803d" }}>
                        {calc.totalSalaryActual.toLocaleString()} đ
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#1e40af" }}>
                        {calc.totalSalaryBHXH.toLocaleString()} đ
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#92400e" }}>
                        {calc.totalSalaryBHTN.toLocaleString()} đ
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "11px", color: "#15803d", fontWeight: 700 }}>
                        Đã nạp đủ 100% không nợ đọng
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Policy note & explanation */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "11.5px",
                  color: "#475569",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <HelpCircle size={13} color="#2563eb" /> Quy định về trần đóng, bảo hiểm 1 lần & trợ cấp thất nghiệp:
                </div>
                <div style={{ lineHeight: 1.6 }}>
                  • <strong>Trần đóng BHXH & BHYT</strong>: Tối đa 20 lần mức lương cơ sở (Trước 07/2023: 29.8 tr; Từ 07/2023: 36.0 tr; Từ 07/2024: 46.8 tr). Do đó các mức lương 50tr, 70tr hay 80tr đều áp mức đóng trần 46.8 tr.
                  <br />
                  • <strong>Trợ cấp thất nghiệp (Áp trần 5× LTTV vùng I)</strong>: 60% bình quân 6 tháng gần nhất (60% × 70tr = 42tr) nhưng bị khống chế tối đa không quá 5 lần mức lương tối thiểu vùng I (<strong>5 × 5.310.000 = 26.550.000 đ/tháng</strong> theo Nghị định 293/2025/NĐ-CP). Với 49 tháng đóng, được hưởng <strong>4 tháng</strong> (3 tháng cho 36 tháng đầu + 1 tháng cho 12 tháng tiếp theo; 1 tháng lẻ bảo lưu), tổng nhận: <strong>106.200.000 đ</strong>.
                  <br />
                  • <strong>Ước tính BHXH 1 lần</strong>: 49 tháng đóng = 4.5 năm tính hưởng (lẻ 1-6 tháng tính nửa năm). Mức tối thiểu: 2 tháng × 4.5 năm × Mbq (38.33 tr) = <strong>344.957.143 đ</strong>. Khi tính thực tế có nhân hệ số trượt giá CPI từng năm ước đạt <strong>~350–355 triệu đồng</strong>.
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ─── Visualize Tab ────────────────────────────────────────────────────────────
export const VisualizeTab: React.FC = () => {
  const rows = load<FinanceRow[]>("finance_rows", defaultRows);
  const ckHoldings = load<CKHolding[]>("finance_ck", defaultCK);
  const tietKiem = load<TietKiemDetail[]>("finance_tietkiem", defaultTietKiem);
  const vay = load<VayDetail[]>("finance_vay", defaultVay);

  const totalAssets = (r: FinanceRow) =>
    r.vang_so_luong * r.vang_gia +
    r.ck +
    r.tiet_kiem_vcb +
    r.tiet_kiem_tcb +
    r.cash_vcb +
    r.cash_tcb +
    r.cash_tpb;
  const totalLiabilities = (r: FinanceRow) =>
    r.credit_tcb_spent + r.credit_tcb_instal + r.vay_vcb;
  const netWorth = (r: FinanceRow) => totalAssets(r) - totalLiabilities(r);

  if (!rows.length)
    return (
      <p
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          marginTop: "40px",
        }}
      >
        Chưa có dữ liệu.
      </p>
    );

  const latest = rows[rows.length - 1];
  const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
  const nwLatest = netWorth(latest);
  const nwPrev = prev ? netWorth(prev) : null;
  const nwChange = nwPrev !== null ? nwLatest - nwPrev : null;
  const totalA = totalAssets(latest);
  const totalL = totalLiabilities(latest);

  // CK totals
  const ckTotalVon = ckHoldings.reduce(
    (s, r) => s + (r.tong_sl * r.gia_von) / 1000000,
    0,
  );
  const ckTotalTT = ckHoldings.reduce(
    (s, r) => s + (r.tong_sl * r.gia_tt) / 1000000,
    0,
  );
  const ckLL = ckTotalTT - ckTotalVon;

  const assetSegments = [
    {
      label: "Vàng",
      value: latest.vang_so_luong * latest.vang_gia,
      color: "#f59e0b",
    },
    { label: "Cổ Phiếu (TT)", value: latest.ck, color: "#10b981" },
    {
      label: "Tiết Kiệm",
      value: latest.tiet_kiem_vcb + latest.tiet_kiem_tcb,
      color: "#3b82f6",
    },
    {
      label: "Cash",
      value: latest.cash_vcb + latest.cash_tcb + latest.cash_tpb,
      color: "#06b6d4",
    },
  ].filter((s) => s.value > 0);

  const liabSegments = [
    {
      label: "Credit TCB spent",
      value: latest.credit_tcb_spent,
      color: "#f87171",
    },
    {
      label: "Credit TCB instal",
      value: latest.credit_tcb_instal,
      color: "#fb923c",
    },
    { label: "Vay VCB", value: latest.vay_vcb, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  const barChart = (
    segments: { label: string; value: number; color: string }[],
    total: number,
  ) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {segments.map((s) => (
        <div key={s.label}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11.5px",
              marginBottom: "3px",
            }}
          >
            <span style={{ color: "var(--text-main)", fontWeight: 600 }}>
              {s.label}
            </span>
            <span
              style={{
                color: s.color,
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              {fmt(s.value)} tr ({((s.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
          <div
            style={{
              height: "8px",
              background: "#f1f5f9",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(s.value / total) * 100}%`,
                height: "100%",
                background: s.color,
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            label: "Tổng Tài Sản",
            value: `${fmt(totalA)} tr`,
            color: "var(--bull-green)",
            bg: "var(--bull-green-bg)",
          },
          {
            label: "Tổng Nợ",
            value: `${fmt(totalL)} tr`,
            color: "#ef4444",
            bg: "#fff1f2",
          },
          {
            label: "Tài Sản Ròng",
            value: `${fmt(nwLatest)} tr`,
            color: "#6366f1",
            bg: "#f0f0ff",
          },
          {
            label: "Thay Đổi kỳ trước",
            value:
              nwChange === null
                ? "—"
                : `${nwChange >= 0 ? "+" : ""}${fmt(nwChange)} tr`,
            color: (nwChange ?? 0) >= 0 ? "var(--bull-green)" : "#ef4444",
            bg: (nwChange ?? 0) >= 0 ? "var(--bull-green-bg)" : "#fff1f2",
          },
          {
            label: "CK Lãi/Lỗ",
            value: `${ckLL >= 0 ? "+" : ""}${fmt(ckLL, 2)} tr`,
            color: ckLL >= 0 ? "var(--bull-green)" : "#ef4444",
            bg: ckLL >= 0 ? "var(--bull-green-bg)" : "#fff1f2",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg,
              border: `1px solid ${kpi.color}30`,
              borderRadius: "10px",
              padding: "12px 14px",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {kpi.label}
            </span>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: kpi.color,
                fontFamily: "monospace",
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Asset & Liability breakdown */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div className="card" style={{ padding: "18px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <TrendingUp size={14} color="var(--bull-green)" /> Phân Bổ Tài Sản (
            {latest.date})
          </h3>
          {barChart(assetSegments, totalA)}
        </div>
        <div className="card" style={{ padding: "18px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <TrendingDown size={14} color="#ef4444" /> Phân Bổ Nợ ({latest.date}
            )
          </h3>
          {barChart(liabSegments, totalL)}
          <div
            style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              Tỷ lệ Nợ/Tài sản:
            </span>
            <strong style={{ color: "#ef4444", fontFamily: "monospace" }}>
              {((totalL / totalA) * 100).toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* CK Holdings breakdown */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          📊 Chi Tiết Danh Mục Cổ Phiếu
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f0fdf4",
                  borderBottom: "2px solid #bbf7d0",
                }}
              >
                {[
                  "Mã",
                  "SL",
                  "Giá Vốn",
                  "Giá TT",
                  "GT Vốn (tr)",
                  "GT TT (tr)",
                  "Lãi/Lỗ (tr)",
                  "%",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#166534",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ckHoldings.map((r, i) => {
                const gtvon = (r.tong_sl * r.gia_von) / 1000000;
                const gttt = (r.tong_sl * r.gia_tt) / 1000000;
                const ll = gttt - gtvon;
                const pct = gtvon > 0 ? (ll / gtvon) * 100 : 0;
                const c = ll >= 0 ? "var(--bull-green)" : "#ef4444";
                return (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "#fff" : "#f8fafc",
                    }}
                  >
                    <td
                      style={{
                        padding: "7px 10px",
                        fontWeight: 800,
                        color: "var(--text-main)",
                        fontFamily: "monospace",
                      }}
                    >
                      {r.symbol}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                      }}
                    >
                      {r.tong_sl.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "#92400e",
                      }}
                    >
                      {r.gia_von.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "#1e40af",
                      }}
                    >
                      {r.gia_tt.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "#92400e",
                      }}
                    >
                      {fmt(gtvon, 3)}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "#1e40af",
                      }}
                    >
                      {fmt(gttt, 3)}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: c,
                      }}
                    >
                      {ll >= 0 ? "+" : ""}
                      {fmt(ll, 3)}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: c,
                      }}
                    >
                      {pct >= 0 ? "+" : ""}
                      {pct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: "2px solid #bbf7d0",
                  background: "#f0fdf4",
                }}
              >
                <td
                  colSpan={4}
                  style={{
                    padding: "7px 10px",
                    fontWeight: 800,
                    fontSize: "11px",
                    color: "#166534",
                  }}
                >
                  TỔNG
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 800,
                    color: "#92400e",
                  }}
                >
                  {fmt(ckTotalVon, 3)}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 800,
                    color: "#1e40af",
                  }}
                >
                  {fmt(ckTotalTT, 3)}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 800,
                    color: ckLL >= 0 ? "var(--bull-green)" : "#ef4444",
                  }}
                >
                  {ckLL >= 0 ? "+" : ""}
                  {fmt(ckLL, 3)}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 800,
                    color: ckLL >= 0 ? "var(--bull-green)" : "#ef4444",
                  }}
                >
                  {ckTotalVon > 0
                    ? `${(ckLL / ckTotalVon) * 100 >= 0 ? "+" : ""}${((ckLL / ckTotalVon) * 100).toFixed(2)}%`
                    : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* CK bar chart */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {ckHoldings.map((r) => {
            const gttt = (r.tong_sl * r.gia_tt) / 1000000;
            const ll = ((r.gia_tt - r.gia_von) * r.tong_sl) / 1000000;
            const pct =
              r.gia_von > 0 ? ((r.gia_tt - r.gia_von) / r.gia_von) * 100 : 0;
            const c = pct >= 0 ? "var(--bull-green)" : "#ef4444";
            const maxTT = Math.max(
              ...ckHoldings.map((x) => (x.tong_sl * x.gia_tt) / 1000000),
            );
            return (
              <div
                key={r.id}
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{
                    minWidth: "36px",
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: "11px",
                    color: "var(--text-main)",
                  }}
                >
                  {r.symbol}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "16px",
                    background: "#f1f5f9",
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: `${(gttt / maxTT) * 100}%`,
                      height: "100%",
                      background: pct >= 0 ? "#bbf7d0" : "#fecaca",
                      borderRadius: "4px",
                    }}
                  />
                </div>
                <span
                  style={{
                    minWidth: "60px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#1e40af",
                    textAlign: "right",
                  }}
                >
                  {fmt(gttt, 1)} tr
                </span>
                <span
                  style={{
                    minWidth: "60px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: c,
                    textAlign: "right",
                  }}
                >
                  {pct >= 0 ? "+" : ""}
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tiet kiem + Vay */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div className="card" style={{ padding: "18px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: "12px",
            }}
          >
            🏦 Tiết Kiệm
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {tietKiem.map((tk) => (
              <div
                key={tk.id}
                style={{
                  background: "#eff6ff",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      color: "#1e40af",
                      fontSize: "13px",
                    }}
                  >
                    {tk.bank}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "#1e40af",
                      fontSize: "14px",
                    }}
                  >
                    {tk.amount} tr
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <span>
                    Lãi suất:{" "}
                    <strong style={{ color: "var(--bull-green)" }}>
                      {tk.rate}%/năm
                    </strong>
                  </span>
                  <span>
                    {tk.start_date} → {tk.end_date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: "18px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: "12px",
            }}
          >
            🏠 Vay
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {vay.map((v) => (
              <div
                key={v.id}
                style={{
                  background: "#fff1f2",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  border: "1px solid #fecaca",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      color: "#991b1b",
                      fontSize: "13px",
                    }}
                  >
                    {v.bank}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "#ef4444",
                      fontSize: "14px",
                    }}
                  >
                    {v.so_tien} tr
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    Lãi suất:{" "}
                    <strong style={{ color: "#ef4444" }}>{v.lai_suat}</strong>
                  </span>
                  <span>{v.thoi_gian}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          📈 Lịch Sử Tài Sản & Nợ
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              {[
                "Ngày",
                "Tổng Tài Sản",
                "Tổng Nợ",
                "Tài Sản Ròng",
                "Thay Đổi",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ta = totalAssets(r),
                tl = totalLiabilities(r),
                nw = netWorth(r);
              const pnw = i > 0 ? netWorth(rows[i - 1]) : null;
              const ch = pnw !== null ? nw - pnw : null;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "var(--text-main)",
                    }}
                  >
                    {r.date}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "var(--bull-green)",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(ta)} tr
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(tl)} tr
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#6366f1",
                      fontWeight: 800,
                    }}
                  >
                    {fmt(nw)} tr
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color:
                        ch === null
                          ? "#94a3b8"
                          : ch >= 0
                            ? "var(--bull-green)"
                            : "#ef4444",
                    }}
                  >
                    {ch === null ? "—" : `${ch >= 0 ? "+" : ""}${fmt(ch)} tr`}
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
export const ToolTab: React.FC = () => {
  const [monthlyExpense, setMonthlyExpense] = useState(20000000);
  const [riskTolerance, setRiskTolerance] = useState<
    "conservative" | "moderate" | "aggressive"
  >("moderate");
  const annualExpense = monthlyExpense * 12;
  const fireTarget = annualExpense * 25;
  const emergencyFundTarget = monthlyExpense * 6;
  const allocation = useMemo(() => {
    switch (riskTolerance) {
      case "conservative":
        return {
          equity: 30,
          etf: 30,
          cash: 30,
          gold: 10,
          expectedReturn: 10.5,
        };
      case "aggressive":
        return { equity: 60, etf: 25, cash: 10, gold: 5, expectedReturn: 18.0 };
      default:
        return { equity: 45, etf: 35, cash: 15, gold: 5, expectedReturn: 14.5 };
    }
  }, [riskTolerance]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "4px",
          }}
        >
          Mô Phỏng & So Sánh 3 Chiến Lược Tích Sản
        </h2>
        <p
          style={{
            fontSize: "12.5px",
            color: "var(--text-muted)",
            marginBottom: "14px",
          }}
        >
          Lump Sum vs DCA vs Tiết Kiệm — mô phỏng sức mạnh lãi kép.
        </p>
        <Calculator />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
          gap: "20px",
        }}
      >
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} color="var(--accent-purple)" />
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                Mục Tiêu Tự Do Tài Chính (FIRE)
              </h3>
            </div>
            <span className="badge badge-info">Quy tắc 4%</span>
          </div>
          <div>
            <label
              style={{
                fontSize: "11.5px",
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>Chi tiêu sinh hoạt hàng tháng:</span>
              <strong className="mono" style={{ color: "var(--text-main)" }}>
                {fmtVND(monthlyExpense)}/tháng
              </strong>
            </label>
            <input
              type="range"
              min="5000000"
              max="100000000"
              step="1000000"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "var(--accent-purple)",
                cursor: "pointer",
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              background: "#f8fafc",
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  display: "block",
                }}
              >
                Chi tiêu 1 năm:
              </span>
              <div
                className="mono"
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                {fmtVND(annualExpense)}
              </div>
            </div>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  display: "block",
                }}
              >
                Cột mốc FIRE:
              </span>
              <div
                className="mono"
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "var(--accent-purple)",
                }}
              >
                {fmtVND(fireTarget)}
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: "1.4",
            }}
          >
            ��{" "}
            <em>
              Khi tài sản đạt {fmtVND(fireTarget)}, rút 4%/năm ={" "}
              {fmtVND(annualExpense)} mà danh mục vẫn sinh trưởng.
            </em>
          </p>
        </div>
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} color="var(--bull-green)" />
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                Quỹ An Toàn & Phân Bổ Danh Mục
              </h3>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["conservative", "moderate", "aggressive"] as const).map(
                (r) => (
                  <button
                    key={r}
                    onClick={() => setRiskTolerance(r)}
                    style={{
                      background:
                        riskTolerance === r ? "var(--bull-green)" : "#f1f5f9",
                      color: riskTolerance === r ? "#fff" : "var(--text-muted)",
                      border: "none",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {r === "conservative"
                      ? "Thận trọng"
                      : r === "moderate"
                        ? "Cân bằng"
                        : "Tăng trưởng"}
                  </button>
                ),
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "8px",
              textAlign: "center",
            }}
          >
            {[
              {
                label: "Cổ Phiếu",
                val: allocation.equity,
                c: "var(--bull-green)",
                bg: "var(--bull-green-bg)",
                b: "var(--bull-green-border)",
              },
              {
                label: "Quỹ ETF",
                val: allocation.etf,
                c: "var(--accent-blue)",
                bg: "var(--accent-blue-bg)",
                b: "var(--accent-blue-border)",
              },
              {
                label: "Tiết Kiệm",
                val: allocation.cash,
                c: "var(--accent-yellow)",
                bg: "var(--accent-yellow-bg)",
                b: "var(--accent-yellow-border)",
              },
              {
                label: "Vàng/Khác",
                val: allocation.gold,
                c: "var(--accent-purple)",
                bg: "var(--accent-purple-bg)",
                b: "var(--accent-purple-border)",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: item.bg,
                  border: `1px solid ${item.b}`,
                  padding: "8px",
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{ fontSize: "10.5px", color: item.c, fontWeight: 600 }}
                >
                  {item.label}
                </span>
                <div
                  className="mono"
                  style={{ fontSize: "16px", fontWeight: 800, color: item.c }}
                >
                  {item.val}%
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: "#f8fafc",
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                Quỹ dự phòng khẩn cấp (6 tháng):
              </span>
              <strong className="mono" style={{ color: "var(--text-main)" }}>
                {fmtVND(emergencyFundTarget)}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                Tỷ suất kỳ vọng danh mục:
              </span>
              <strong className="mono" style={{ color: "var(--bull-green)" }}>
                ~{allocation.expectedReturn}% / năm
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Recommendation Tab ──────────────────────────────────────────────────────
export const RecommendationTab: React.FC = () => {
  const ckRows = [
    {
      symbol: "TCH",
      nganh: "BĐS / hạ tầng",
      gtvon: 205.7,
      gttt: 137.1,
      ll: -33,
      weight: 45,
      alert: true,
    },
    {
      symbol: "MBS",
      nganh: "Chứng khoán",
      gtvon: 127.6,
      gttt: 86.7,
      ll: -32,
      weight: 29,
      alert: true,
    },
    {
      symbol: "HDG",
      nganh: "BĐS / năng lượng",
      gtvon: 52.9,
      gttt: 33.0,
      ll: -38,
      weight: 11,
      alert: false,
    },
    {
      symbol: "PDR",
      nganh: "BĐS",
      gtvon: 51.2,
      gttt: 39.7,
      ll: -23,
      weight: 13,
      alert: false,
    },
    {
      symbol: "C4G/HHV/IDI",
      nganh: "Xây dựng",
      gtvon: 1.3,
      gttt: 0.4,
      ll: 0,
      weight: 0,
      alert: false,
    },
    {
      symbol: "Tiền mặt TK",
      nganh: "—",
      gtvon: 6.0,
      gttt: 6.0,
      ll: 0,
      weight: 2,
      alert: false,
    },
  ];

  const issues = [
    {
      num: 1,
      severity: "high",
      title: "Tập trung cực đoan",
      desc: "2 mã (TCH + MBS) = 74% danh mục. Nguyên tắc chung: 1 mã ≤ 10–15%, 1 ngành ≤ 25–30%.",
    },
    {
      num: 2,
      severity: "high",
      title: "Chỉ một chủ đề duy nhất",
      desc: 'TCH, HDG, PDR đều là BĐS; MBS/C4G/HHV tăng giảm cùng chu kỳ lãi suất + BĐS. Đây không phải "đa dạng" — đây là một cú đặt cược đòn bẩy vào chu kỳ BĐS VN đang sai.',
    },
    {
      num: 3,
      severity: "medium",
      title: "Không có lớp phòng thủ trong CK",
      desc: "Không bluechip, không ngân hàng, không quỹ chỉ số, không tiêu dùng thiết yếu.",
    },
  ];

  const priorities = [
    {
      num: 1,
      color: "#ef4444",
      bg: "#fff1f2",
      title: "Giảm rủi ro danh mục CK",
      desc: "Đưa về ≤15%/mã, ≤30%/ngành. Phần rút ra → bluechip/quỹ chỉ số (VN30, VNINDEX ETF) hoặc tiền gửi — làm dần theo niềm tin từng mã.",
    },
    {
      num: 2,
      color: "#f59e0b",
      bg: "#fffde7",
      title: "Hạ vàng từ 53% về 15–25%",
      desc: "Đã hưởng trọn sóng (đỉnh ~$5.600 → nay ~$4.400). Chốt một phần = khóa lãi + giảm lệ thuộc tài sản biến động mạnh, dự báo phân tán rộng.",
    },
    {
      num: 3,
      color: "#3b82f6",
      bg: "#eff6ff",
      title: "Tiền từ vàng → 3 kênh",
      desc: "(a) Đệm reset 2028 — gửi kỳ hạn 6–12T tích lũy. (b) Gửi kỳ hạn 7,5%. (c) Rải dần vào cổ phiếu đa dạng ngành.",
    },
    {
      num: 4,
      color: "var(--bull-green)",
      bg: "var(--bull-green-bg)",
      title: "Xây lớp thu nhập cố định",
      desc: "Tiền gửi / trái phiếu — hiện gần như bằng 0. Mục tiêu: 30–40% tổng tài sản đầu tư.",
    },
  ];

  const targetAlloc = [
    {
      label: "Cổ phiếu (đa dạng)",
      pct: "35–45%",
      color: "#10b981",
      bg: "#f0fdf4",
    },
    {
      label: "Tiền gửi / Thu nhập cố định",
      pct: "30–40%",
      color: "#3b82f6",
      bg: "#eff6ff",
    },
    { label: "Vàng", pct: "15–20%", color: "#f59e0b", bg: "#fffde7" },
    { label: "Tiền mặt đệm", pct: "5–10%", color: "#94a3b8", bg: "#f8fafc" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Disclaimer */}
      <div
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          color: "#713f12",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ⚠️{" "}
        <em>
          Phân tích cơ cấu tài chính,{" "}
          <strong>không phải khuyến nghị mua/bán từng mã.</strong>
        </em>
      </div>

      {/* Section 1: Full picture */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          📋 Bức Tranh Đầy Đủ
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                {["Khoản", "Chi tiết"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Vay VCB",
                  val: "Gốc 1.900 tr, còn 1.836 tr. Kỳ hạn 30 năm (8/2025–8/2055). Lãi 5,5% cố định 3 năm đầu → thả nổi từ ~8/2028.",
                },
                {
                  label: "Trả nợ/tháng (ước tính)",
                  val: "~10,8 tr/tháng trong 3 năm đầu → khi thả nổi (~10–11%) sẽ nhảy lên ~16–17 tr/tháng từ 2028.",
                },
                {
                  label: "Tiết kiệm",
                  val: "VCB 5 tr @ 7,4%, TCB 5 tr @ 7,8%, đáo hạn 8/2027.",
                },
                {
                  label: "Chứng khoán",
                  val: "Giá vốn ~444 tr, giá trị nay 303 tr → lỗ tạm tính ~142 tr (−32%).",
                },
              ].map((r, i) => (
                <tr
                  key={r.label}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 12px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      whiteSpace: "nowrap",
                      minWidth: "180px",
                    }}
                  >
                    {r.label}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      fontSize: "12.5px",
                      color: "var(--text-main)",
                      lineHeight: "1.6",
                    }}
                  >
                    {r.val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            marginTop: "12px",
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            padding: "12px 14px",
            fontSize: "12.5px",
            color: "#78350f",
            lineHeight: "1.7",
          }}
        >
          ⚡ <strong>Điểm mấu chốt:</strong> Khoản vay hiện <em>rẻ</em> (5,5%),
          nhưng <strong>cú sốc lãi suất năm 2028</strong> (tiền trả tăng ~60%)
          là rủi ro tài chính lớn nhất. Mọi quyết định phân bổ nên xoay quanh
          việc chuẩn bị cho thời điểm đó.
        </div>
      </div>

      {/* Section 2: CK portfolio analysis */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          📊 Danh Mục Cổ Phiếu — Chỗ Cần Xử Lý Nhất
        </h3>
        <div style={{ overflowX: "auto", marginBottom: "16px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f0fdf4",
                  borderBottom: "2px solid #bbf7d0",
                }}
              >
                {[
                  "Mã",
                  "Ngành",
                  "GT Vốn (tr)",
                  "GT TT (tr)",
                  "L/L",
                  "Tỷ trọng DM",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#166534",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ckRows.map((r, i) => (
                <tr
                  key={r.symbol}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: r.alert
                      ? "#fff7ed"
                      : i % 2 === 0
                        ? "#fff"
                        : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "7px 10px",
                      fontWeight: 800,
                      fontFamily: "monospace",
                      color: "var(--text-main)",
                    }}
                  >
                    {r.symbol}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      fontSize: "11.5px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {r.nganh}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#92400e",
                    }}
                  >
                    {r.gtvon}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#1e40af",
                    }}
                  >
                    {r.gttt}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: r.ll < 0 ? "#ef4444" : "var(--bull-green)",
                    }}
                  >
                    {r.ll !== 0 ? `${r.ll}%` : "—"}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "60px",
                          height: "8px",
                          background: "#f1f5f9",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${r.weight}%`,
                            height: "100%",
                            background: r.alert ? "#f97316" : "#10b981",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: r.alert ? "#f97316" : "var(--text-main)",
                        }}
                      >
                        {r.weight}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "center" }}>
                    {r.alert && (
                      <span
                        style={{
                          background: "#fff7ed",
                          color: "#c2410c",
                          border: "1px solid #fdba74",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 700,
                        }}
                      >
                        ⚠ CAO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {issues.map((issue) => (
            <div
              key={issue.num}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                background: issue.severity === "high" ? "#fff7ed" : "#fefce8",
                border: `1px solid ${issue.severity === "high" ? "#fdba74" : "#fde047"}`,
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            >
              <span
                style={{
                  background: issue.severity === "high" ? "#ef4444" : "#f59e0b",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {issue.num}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 800,
                    color: issue.severity === "high" ? "#c2410c" : "#92400e",
                    marginBottom: "3px",
                  }}
                >
                  {issue.title}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-main)",
                    lineHeight: "1.6",
                  }}
                >
                  {issue.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Spread differential */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "10px",
          }}
        >
          💰 Gửi Kỳ Hạn (7,5%) &gt; Lãi Vay (5,5%) — Tận Dụng "Chênh Lệch Dương"
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          {[
            {
              icon: "✅",
              title: "Chưa nên tất toán trước hạn",
              desc: "Để tiền trong tiết kiệm 7,4–7,8% hơn là trả khoản vay 5,5%.",
              color: "var(--bull-green)",
              bg: "var(--bull-green-bg)",
            },
            {
              icon: "💡",
              title: "85 tr tiền mặt đang nằm không",
              desc: "Chuyển phần lớn (giữ ~30–40 tr đệm chi tiêu) sang gửi 6–12T → thêm ~4–5 tr/năm không tăng rủi ro.",
              color: "#3b82f6",
              bg: "#eff6ff",
            },
            {
              icon: "⚡",
              title: "Phép tính đảo chiều năm 2028",
              desc: 'Lãi vay ~10–11% > lãi gửi → khi ấy trả bớt gốc là "lợi suất phi rủi ro" tốt nhất.',
              color: "#f59e0b",
              bg: "#fffde7",
            },
            {
              icon: "🎯",
              title: 'Mục tiêu: gom "đệm reset 2028"',
              desc: "Đủ để trả trước một phần gốc lớn năm 2028, hoặc chịu được 17 tr/tháng trong 6–12 tháng.",
              color: "#6366f1",
              bg: "#f0f0ff",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: item.bg,
                border: `1px solid ${item.color}30`,
                borderRadius: "8px",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: item.color,
                  marginBottom: "5px",
                }}
              >
                {item.icon} {item.title}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-main)",
                  lineHeight: "1.6",
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Restructuring priorities */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          🎯 Hướng Cơ Cấu — Thứ Tự Ưu Tiên
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {priorities.map((p) => (
            <div
              key={p.num}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                background: p.bg,
                border: `1px solid ${p.color}30`,
                borderRadius: "8px",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: p.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {p.num}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: p.color,
                    marginBottom: "3px",
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-main)",
                    lineHeight: "1.6",
                  }}
                >
                  {p.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <h4
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "10px",
          }}
        >
          Cơ Cấu Tham Chiếu (người có đòn bẩy nhà lớn)
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: "10px",
          }}
        >
          {targetAlloc.map((a) => (
            <div
              key={a.label}
              style={{
                background: a.bg,
                border: `1px solid ${a.color}30`,
                borderRadius: "8px",
                padding: "12px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "4px",
                }}
              >
                {a.label}
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: a.color,
                  fontFamily: "monospace",
                }}
              >
                {a.pct}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Macro */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "12px",
          }}
        >
          🌍 Vĩ Mô Liên Quan Trực Tiếp
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            {
              tag: "Lãi suất VND",
              text: "SBV giữ 4,5%, lạm phát ~4,5%, tiền gửi 12T quanh 7,5%. Môi trường thuận cho việc đỗ tiền ở kênh tiền gửi trong lúc chờ.",
            },
            {
              tag: "BĐS Việt Nam",
              text: "Danh mục CK của bạn nặng nhóm này. VN-Index ~1.830 hồi từ đáy nhưng nhiều CTCK cho rằng trung hạn vẫn là đỉnh/đáy thấp dần từ 5/2026 — chưa xác nhận đảo chiều. Rủi ro tập trung ngành vẫn hiện hữu.",
            },
            {
              tag: "Vàng thế giới",
              text: 'Đã giảm ~20% từ đỉnh, +10% riêng tháng 8 nhờ kỳ vọng Fed bớt "diều hâu". NHTW vẫn mua ròng; căng thẳng eo Hormuz giữ phần bù rủi ro. Vai trò phòng thủ còn, nhưng không phải vùng giá để tăng tỷ trọng.',
            },
          ].map((item) => (
            <div
              key={item.tag}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                background: "#f8fafc",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  background: "#e2e8f0",
                  color: "var(--text-main)",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {item.tag}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-main)",
                  lineHeight: "1.6",
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6: Need more info */}
      <div
        style={{
          background: "#f0f0ff",
          border: "1px solid #a5b4fc",
          borderRadius: "10px",
          padding: "16px 18px",
        }}
      >
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "#4338ca",
            marginBottom: "10px",
          }}
        >
          🔍 Cần Thêm Để Tính Chính Xác Kịch Bản 2028
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            "Thu nhập ròng/tháng của hộ gia đình → tính tỷ lệ trả nợ/thu nhập hiện tại và sau reset 2028.",
            'Giá trị căn nhà mua bằng khoản vay → có tài sản ròng thực (hiện bảng đang thiếu, nhìn như "âm").',
            "Chi phí sinh hoạt/tháng → tính mức đệm cần thiết.",
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                fontSize: "12.5px",
                color: "#3730a3",
              }}
            >
              <span style={{ fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ lineHeight: "1.6" }}>{item}</span>
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#4338ca",
            marginTop: "10px",
            fontStyle: "italic",
          }}
        >
          Có 3 số này → dựng bảng kịch bản "2028 reset": tiền trả mới, tỷ lệ
          DTI, và cần gom bao nhiêu "đệm reset" mỗi tháng từ giờ.
        </p>
      </div>
    </div>
  );
};

// ─── Assessment Tab ───────────────────────────────────────────────────────────
export const AssessmentTab: React.FC = () => {
  const channels = [
    {
      name: "Bất động sản",
      returns: "TB–cao (dài hạn)",
      risk: "Cao + kém thanh khoản",
      liquidity: "Rất thấp",
      signal: "Phân hóa, giá neo cao, sức mua yếu",
      signalType: "neutral",
    },
    {
      name: "Vàng",
      returns: "Giữ giá trị (không dòng tiền)",
      risk: "TB–cao, vùng giá cao",
      liquidity: "Cao",
      signal: "Đã điều chỉnh −21% từ đỉnh; bất định lớn",
      signalType: "neutral",
    },
    {
      name: "Cổ phiếu (tự chọn)",
      returns: "Cao",
      risk: "Rất cao (mid/small-cap)",
      liquidity: "Cao (blue-chip) → thấp (mã nhỏ)",
      signal: "Hồi từ đáy; xúc tác FTSE; trung hạn chưa xác nhận",
      signalType: "neutral",
    },
    {
      name: "Quỹ VCBF-BCF",
      returns: "≈ VN-Index bluechip",
      risk: "Cao nhưng thấp hơn tự chọn",
      liquidity: "Trung bình (T+2–3)",
      signal: "Cùng nhịp thị trường; YTD ~+2,6%",
      signalType: "positive",
    },
    {
      name: "Tiết kiệm",
      returns: "7–9,5%/năm, cố định",
      risk: "Gần như bằng 0",
      liquidity: "Cao (rút trước mất lãi)",
      signal: "LS đang tăng → cơ hội khóa kỳ hạn dài",
      signalType: "positive",
    },
    {
      name: "Tiền mặt",
      returns: "~0%",
      risk: "Mất giá ~4,5%/năm (lạm phát)",
      liquidity: "Tức thì",
      signal: "Chỉ nên giữ ở mức đệm",
      signalType: "negative",
    },
  ];

  const priorities = [
    {
      num: 1,
      title: "Gom đệm cho reset 2028",
      desc: "Gửi tiết kiệm lãi cao (7–9,5%) → chuẩn bị cho kỳ điều chỉnh lãi vay năm 2028.",
      color: "var(--bull-green)",
      bg: "var(--bull-green-bg)",
    },
    {
      num: 2,
      title: "Giảm tập trung danh mục CK",
      desc: "Chuyển dần từ mid/small-cap lệch sang quỹ bluechip như BCF (đa dạng ngành, quản lý chuyên nghiệp).",
      color: "#3b82f6",
      bg: "#eff6ff",
    },
    {
      num: 3,
      title: "Hạ vàng về 15–25%",
      desc: "Vàng đã đi hết phần lớn con sóng, ở vùng giá cao — vai trò phòng thủ còn nhưng không tăng tỷ trọng.",
      color: "#f59e0b",
      bg: "#fffde7",
    },
    {
      num: 4,
      title: "Chưa vội trả trước khoản vay",
      desc: 'Lãi suất vay 5,5% < lãi tiết kiệm 7–9,5% → "chênh lệch dương", giữ tiền đầu tư hợp lý hơn.',
      color: "#6366f1",
      bg: "#f0f0ff",
    },
  ];

  const sources = [
    {
      label: "VCBF – Quỹ BCF",
      url: "https://www.vcbf.com/quy-mo/cac-quy-mo/quy-dau-tu-co-phieu-hang-dau-vcbf/",
    },
    { label: "Fmarket – VCBF-BCF", url: "https://fmarket.vn/quy/VCBFBCF" },
    {
      label: "VnEconomy – Lãi suất tiết kiệm tháng 8/2026",
      url: "https://vneconomy.vn/lai-suat-tiet-kiem-ngan-hang-nao-cao-nhat-thang-82026.htm",
    },
    {
      label: "24h – Lãi suất tiền gửi tháng 8/2026",
      url: "https://www.24h.com.vn/kinh-doanh/lai-suat-tien-gui-tiet-kiem-thang-8-2026-tang-manh-c161a1788469.html",
    },
    {
      label: "Thời báo Tài chính VN – CK tuần cuối tháng 8/2026",
      url: "https://thoibaotaichinhvietnam.vn/chung-khoan-tuan-cuoi-thang-8-2026-dong-tien-tro-lai-vn-index-se-tai-thu-suc-moc-1-800-diem-202776.html",
    },
    {
      label: "World Gold Council – Mid-Year Outlook 2026",
      url: "https://www.gold.org/goldhub/research/gold-mid-year-outlook-2026",
    },
    {
      label: "Bloomberg – Vietnam 2026 GDP/CPI survey",
      url: "https://www.bloomberg.com/news/articles/2026-07-09/vietnam-2026-gdp-seen-at-7-3-cpi-at-4-8-survey",
    },
    {
      label: "VnEconomy – Kinh tế thế giới tuần 8–15/8/2026",
      url: "https://vneconomy.vn/dau-an-kinh-te-the-gioi-tuan-8-1582026-eo-bien-hormuz-van-dong-ky-vong-lai-suat-fed-dich-chuyen.htm",
    },
  ];

  const signalColor = (t: string) =>
    t === "positive"
      ? "var(--bull-green)"
      : t === "negative"
        ? "#ef4444"
        : "#f59e0b";
  const signalBg = (t: string) =>
    t === "positive"
      ? "var(--bull-green-bg)"
      : t === "negative"
        ? "#fff1f2"
        : "#fffde7";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Disclaimer */}
      <div
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          color: "#713f12",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ⚠️{" "}
        <em>
          Tổng hợp thông tin thị trường,{" "}
          <strong>không phải khuyến nghị mua/bán.</strong> Cập nhật: cuối tháng
          8/2026.
        </em>
      </div>

      {/* Channel comparison table */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          📊 So Sánh Nhanh 6 Kênh Đầu Tư
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                {[
                  "Kênh",
                  "Lợi nhuận kỳ vọng",
                  "Rủi ro / biến động",
                  "Thanh khoản",
                  "Tín hiệu hiện tại",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr
                  key={c.name}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 12px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "var(--text-main)",
                      fontSize: "11.5px",
                    }}
                  >
                    {c.returns}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "var(--text-muted)",
                      fontSize: "11.5px",
                    }}
                  >
                    {c.risk}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "var(--text-muted)",
                      fontSize: "11.5px",
                    }}
                  >
                    {c.liquidity}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <span
                      style={{
                        background: signalBg(c.signalType),
                        color: signalColor(c.signalType),
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {c.signal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VCBF-BCF */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          🏦 VCBF-BCF Nằm Ở Đâu Trong Bức Tranh?
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            {
              icon: "📌",
              text: "Đây là quỹ cổ phiếu (≈100% vốn hóa lớn: ngân hàng, tiêu dùng, bán lẻ…), không phải kênh phòng thủ hay thay thế tiền gửi. Mua BCF = tăng tỷ trọng cổ phiếu.",
            },
            {
              icon: "⚡",
              text: "Khác danh mục hiện tại: BCF đa dạng ngành, toàn bluechip, quản lý chuyên nghiệp, lịch sử ~13,6%/năm và vượt chỉ số tham chiếu ~3%/năm. Danh mục tự chọn đang 74% ở 2 mã, một ngành, lỗ ~32%.",
            },
            {
              icon: "🎯",
              text: 'BCF phù hợp vai trò "lõi cổ phiếu" (core, 60–80%) — phần nền ổn định. Chọn mã riêng lẻ là phần "vệ tinh" nhỏ (20–40%).',
            },
            {
              icon: "💡",
              text: "Lưu ý phí: ~1,5–2%/năm phí quản lý + phí mua/bán (miễn nếu giữ >2 năm). DCA định kỳ hàng tháng là cách phổ biến.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                background: "#f8fafc",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <span style={{ fontSize: "16px", flexShrink: 0 }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: "12.5px",
                  color: "var(--text-main)",
                  lineHeight: "1.6",
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Macro context */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "6px",
          }}
        >
          🌍 Bức Tranh Vĩ Mô — Chủ Đề Xuyên Suốt
        </h3>
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "14px",
            fontSize: "12.5px",
            color: "#78350f",
            lineHeight: "1.7",
          }}
        >
          <strong>"Lãi suất cao lâu hơn + rủi ro địa chính trị"</strong> — Eo
          Hormuz đóng đẩy giá dầu và lạm phát toàn cầu dai dẳng; Fed do dự;
          trong nước lãi suất huy động tăng phản ánh thanh khoản căng và áp lực
          tỷ giá.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: "12px",
          }}
        >
          {[
            {
              title: "✅ Tiền gửi — hưởng lợi rõ nhất",
              color: "var(--bull-green)",
              bg: "var(--bull-green-bg)",
              text: "7–9,5% cố định, rủi ro ~0. Bạn còn khoản vay 5,5% → chênh lệch dương khi gửi tiết kiệm.",
            },
            {
              title: "⚖️ Cổ phiếu VN — hai lực ngược",
              color: "#3b82f6",
              bg: "#eff6ff",
              text: "Xúc tác nâng hạng FTSE (21/9/2026) tích cực trung hạn; nhưng định giá và dòng tiền cần xác nhận. Vào từ từ, ưu tiên bluechip/quỹ.",
            },
            {
              title: "⚠️ Vàng — đã qua phần lớn sóng",
              color: "#f59e0b",
              bg: "#fffde7",
              text: "Đang ở vùng giá cao, dự báo phân tán rộng. Vai trò phòng thủ còn, nhưng không phải điểm tăng tỷ trọng.",
            },
            {
              title: "🚫 BĐS — chu kỳ sàng lọc",
              color: "#ef4444",
              bg: "#fff1f2",
              text: "Giá neo cao, thanh khoản thấp. Đã có 1 căn thế chấp → thêm BĐS đầu tư = rủi ro tập trung + đòn bẩy chồng.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: item.bg,
                border: `1px solid ${item.color}30`,
                borderRadius: "8px",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: item.color,
                  marginBottom: "6px",
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-main)",
                  lineHeight: "1.6",
                }}
              >
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority order */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "14px",
          }}
        >
          🎯 Thứ Tự Ưu Tiên Hợp Lý
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {priorities.map((p) => (
            <div
              key={p.num}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                background: p.bg,
                border: `1px solid ${p.color}30`,
                borderRadius: "8px",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: p.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {p.num}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: p.color,
                    marginBottom: "3px",
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-main)",
                    lineHeight: "1.6",
                  }}
                >
                  {p.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sources */}
      <div
        style={{
          borderTop: "1px solid var(--border-color)",
          paddingTop: "16px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginBottom: "8px",
            fontWeight: 700,
          }}
        >
          Nguồn tham khảo:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "11px",
                color: "var(--accent-blue)",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "3px 8px",
                borderRadius: "4px",
                textDecoration: "none",
              }}
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "tool" | "raw" | "visual" | "assess" | "recommend";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "tool", label: "1. Công Cụ Tài Chính", icon: <Wallet size={14} /> },
  { id: "raw", label: "2. Dữ Liệu Thô", icon: <Table2 size={14} /> },
  { id: "visual", label: "3. Trực Quan Hoá", icon: <BarChart2 size={14} /> },
  { id: "assess", label: "4. Đánh Giá Chung", icon: <TrendingUp size={14} /> },
  { id: "recommend", label: "5. Khuyến Nghị", icon: <Target size={14} /> },
];

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("raw");
  return (
    <div
      className="page-wrapper animate-fade-in"
      style={{
        padding: "28px 32px",
        maxWidth: "1440px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "2px solid var(--border-color)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--accent-blue)"
                  : "2px solid transparent",
              marginBottom: "-2px",
              background:
                activeTab === tab.id ? "var(--accent-blue-bg)" : "transparent",
              color:
                activeTab === tab.id
                  ? "var(--accent-blue)"
                  : "var(--text-muted)",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              transition: "all 0.15s",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === "tool" && <ToolTab />}
        {activeTab === "raw" && <RawDataTab />}
        {activeTab === "visual" && <VisualizeTab />}
        {activeTab === "assess" && <AssessmentTab />}
        {activeTab === "recommend" && <RecommendationTab />}
      </div>
    </div>
  );
};
