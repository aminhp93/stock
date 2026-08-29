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
} from "lucide-react";

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
const RawDataTab: React.FC = () => {
  const [rows, setRows] = useState<FinanceRow[]>(() =>
    load("finance_rows", defaultRows),
  );
  const [ckHoldings, setCkHoldings] = useState<CKHolding[]>(() =>
    load("finance_ck", defaultCK),
  );
  const [tietKiem, setTietKiem] = useState<TietKiemDetail[]>(() =>
    load("finance_tietkiem", defaultTietKiem),
  );
  const [vay, setVay] = useState<VayDetail[]>(() =>
    load("finance_vay", defaultVay),
  );

  // Main log helpers
  const updateRow = (id: string, field: keyof FinanceRow, val: string) => {
    const u = rows.map((r) =>
      r.id === id
        ? {
            ...r,
            [field]: field === "date" || field === "id" ? val : Number(val),
          }
        : r,
    );
    setRows(u);
    save("finance_rows", u);
  };
  const addRow = () => {
    const u = [
      ...rows,
      {
        id: Date.now().toString(),
        date: new Date().toISOString().slice(0, 10),
        vang_so_luong: 0,
        vang_gia: 0,
        ck: 0,
        tiet_kiem_vcb: 0,
        tiet_kiem_tcb: 0,
        cash_vcb: 0,
        cash_tcb: 0,
        cash_tpb: 0,
        credit_tcb_spent: 0,
        credit_tcb_instal: 0,
        vay_vcb: 0,
      },
    ];
    setRows(u);
    save("finance_rows", u);
  };
  const delRow = (id: string) => {
    const u = rows.filter((r) => r.id !== id);
    setRows(u);
    save("finance_rows", u);
  };

  // CK helpers
  const updateCK = (id: string, field: keyof CKHolding, val: string) => {
    const u = ckHoldings.map((r) =>
      r.id === id
        ? {
            ...r,
            [field]: field === "symbol" || field === "id" ? val : Number(val),
          }
        : r,
    );
    setCkHoldings(u);
    save("finance_ck", u);
  };
  const addCK = () => {
    const u = [
      ...ckHoldings,
      {
        id: Date.now().toString(),
        symbol: "",
        tong_sl: 0,
        gia_von: 0,
        gia_tt: 0,
      },
    ];
    setCkHoldings(u);
    save("finance_ck", u);
  };
  const delCK = (id: string) => {
    const u = ckHoldings.filter((r) => r.id !== id);
    setCkHoldings(u);
    save("finance_ck", u);
  };

  // Tiet kiem helpers
  const updateTK = (id: string, field: keyof TietKiemDetail, val: string) => {
    const u = tietKiem.map((r) =>
      r.id === id
        ? {
            ...r,
            [field]: ["id", "bank", "start_date", "end_date"].includes(field)
              ? val
              : Number(val),
          }
        : r,
    );
    setTietKiem(u);
    save("finance_tietkiem", u);
  };
  const addTK = () => {
    const u = [
      ...tietKiem,
      {
        id: Date.now().toString(),
        bank: "",
        amount: 0,
        rate: 0,
        start_date: "",
        end_date: "",
      },
    ];
    setTietKiem(u);
    save("finance_tietkiem", u);
  };
  const delTK = (id: string) => {
    const u = tietKiem.filter((r) => r.id !== id);
    setTietKiem(u);
    save("finance_tietkiem", u);
  };

  // Vay helpers
  const updateVay = (id: string, field: keyof VayDetail, val: string) => {
    const u = vay.map((r) =>
      r.id === id
        ? { ...r, [field]: field === "so_tien" ? Number(val) : val }
        : r,
    );
    setVay(u);
    save("finance_vay", u);
  };
  const addVay = () => {
    const u = [
      ...vay,
      {
        id: Date.now().toString(),
        bank: "",
        so_tien: 0,
        thoi_gian: "",
        lai_suat: "",
      },
    ];
    setVay(u);
    save("finance_vay", u);
  };
  const delVay = (id: string) => {
    const u = vay.filter((r) => r.id !== id);
    setVay(u);
    save("finance_vay", u);
  };

  const hcell = (label: string, span = 1, bg = "#e2e8f0") => (
    <th
      colSpan={span}
      style={{
        background: bg,
        padding: "6px 8px",
        fontSize: "11px",
        fontWeight: 700,
        textAlign: "center",
        borderRight: "1px solid #cbd5e1",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </th>
  );
  const numInput = (
    val: number,
    onChange: (v: string) => void,
    bg = "white",
  ) => (
    <input
      type="number"
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        border: "none",
        background: "transparent",
        textAlign: "right",
        fontSize: "12px",
        fontFamily: "monospace",
        color: "var(--text-main)",
        outline: "none",
      }}
    />
  );
  const textInput = (val: string, onChange: (v: string) => void) => (
    <input
      type="text"
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        border: "none",
        background: "transparent",
        fontSize: "12px",
        fontFamily: "monospace",
        color: "var(--text-main)",
        outline: "none",
      }}
    />
  );

  const sectionHeader = (
    title: string,
    onAdd: () => void,
    addLabel = "Thêm",
  ) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
        marginTop: "24px",
      }}
    >
      <h3
        style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-main)" }}
      >
        {title}
      </h3>
      <button
        onClick={onAdd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          background: "var(--bull-green)",
          color: "#fff",
          border: "none",
          padding: "5px 10px",
          borderRadius: "5px",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Plus size={11} /> {addLabel}
      </button>
    </div>
  );

  const delBtn = (id: string, fn: (id: string) => void) => (
    <td style={{ padding: "4px 8px", textAlign: "center" }}>
      <button
        onClick={() => fn(id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#ef4444",
        }}
      >
        <Trash2 size={12} />
      </button>
    </td>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      {/* ── Section 1: Main Log ── */}
      {sectionHeader("📋 Nhật Ký Tài Chính Theo Ngày", addRow, "Thêm Dòng")}
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
            {hcell("Cash", 3, "#fef9c3")}
            {hcell("Credit", 2, "#fee2e2")}
            {hcell("Vay", 1, "#fecaca")}
            {hcell("", 1, "#f1f5f9")}
          </tr>
          <tr>
            {hcell("", 1, "#f1f5f9")}
            {hcell("SL (cây)", 1, "#fef9c3")}
            {hcell("Giá (nghìn)", 1, "#fef9c3")}
            {hcell("Tổng", 1, "#fef9c3")}
            {hcell("(tr)", 1, "#dcfce7")}
            {hcell("VCB", 1, "#dbeafe")}
            {hcell("TCB", 1, "#dbeafe")}
            {hcell("VCB", 1, "#fef9c3")}
            {hcell("TCB", 1, "#fef9c3")}
            {hcell("TPB", 1, "#fef9c3")}
            {hcell("TCB spent", 1, "#fee2e2")}
            {hcell("TCB instal", 1, "#fee2e2")}
            {hcell("VCB", 1, "#fecaca")}
            {hcell("Xóa", 1, "#f1f5f9")}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
            return (
              <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td
                  style={{
                    background: bg,
                    padding: "4px 6px",
                    minWidth: "108px",
                  }}
                >
                  <input
                    type="date"
                    value={r.date}
                    onChange={(e) => updateRow(r.id, "date", e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: "12px",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 6px",
                    minWidth: "64px",
                    textAlign: "right",
                  }}
                >
                  {numInput(
                    r.vang_so_luong,
                    (v) => updateRow(r.id, "vang_so_luong", v),
                    "#fffde7",
                  )}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 6px",
                    minWidth: "64px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.vang_gia, (v) => updateRow(r.id, "vang_gia", v))}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 8px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#b45309",
                    minWidth: "64px",
                  }}
                >
                  {fmt(r.vang_so_luong * r.vang_gia)}
                </td>
                <td
                  style={{
                    background: "#f0fdf4",
                    padding: "4px 6px",
                    minWidth: "64px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.ck, (v) => updateRow(r.id, "ck", v))}
                </td>
                <td
                  style={{
                    background: "#eff6ff",
                    padding: "4px 6px",
                    minWidth: "56px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.tiet_kiem_vcb, (v) =>
                    updateRow(r.id, "tiet_kiem_vcb", v),
                  )}
                </td>
                <td
                  style={{
                    background: "#eff6ff",
                    padding: "4px 6px",
                    minWidth: "56px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.tiet_kiem_tcb, (v) =>
                    updateRow(r.id, "tiet_kiem_tcb", v),
                  )}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 6px",
                    minWidth: "56px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.cash_vcb, (v) => updateRow(r.id, "cash_vcb", v))}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 6px",
                    minWidth: "56px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.cash_tcb, (v) => updateRow(r.id, "cash_tcb", v))}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 6px",
                    minWidth: "56px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.cash_tpb, (v) => updateRow(r.id, "cash_tpb", v))}
                </td>
                <td
                  style={{
                    background: "#fff1f2",
                    padding: "4px 6px",
                    minWidth: "72px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.credit_tcb_spent, (v) =>
                    updateRow(r.id, "credit_tcb_spent", v),
                  )}
                </td>
                <td
                  style={{
                    background: "#fff1f2",
                    padding: "4px 6px",
                    minWidth: "72px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.credit_tcb_instal, (v) =>
                    updateRow(r.id, "credit_tcb_instal", v),
                  )}
                </td>
                <td
                  style={{
                    background: "#fee2e2",
                    padding: "4px 6px",
                    minWidth: "64px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.vay_vcb, (v) => updateRow(r.id, "vay_vcb", v))}
                </td>
                {delBtn(r.id, delRow)}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Section 2: CK Holdings ── */}
      {sectionHeader("📊 Danh Mục Cổ Phiếu (CK Holdings)", addCK, "Thêm Mã")}
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
            {hcell("Mã CK", 1, "#dcfce7")}
            {hcell("Tổng SL", 1, "#dcfce7")}
            {hcell("Giá Vốn (đ)", 1, "#fef9c3")}
            {hcell("Giá TT (đ)", 1, "#dbeafe")}
            {hcell("Giá Trị Vốn (tr)", 1, "#fef9c3")}
            {hcell("Giá Trị TT (tr)", 1, "#dbeafe")}
            {hcell("Lãi/Lỗ (tr)", 1, "#f1f5f9")}
            {hcell("% Lãi/Lỗ", 1, "#f1f5f9")}
            {hcell("Xóa", 1, "#f1f5f9")}
          </tr>
        </thead>
        <tbody>
          {ckHoldings.map((r, i) => {
            const gtvon = (r.tong_sl * r.gia_von) / 1000000;
            const gttt = (r.tong_sl * r.gia_tt) / 1000000;
            const laiLo = gttt - gtvon;
            const pct = gtvon > 0 ? (laiLo / gtvon) * 100 : 0;
            const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
            const lc = laiLo >= 0 ? "var(--bull-green)" : "#ef4444";
            return (
              <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td
                  style={{
                    background: "#f0fdf4",
                    padding: "4px 8px",
                    minWidth: "60px",
                    fontWeight: 700,
                  }}
                >
                  {textInput(r.symbol, (v) => updateCK(r.id, "symbol", v))}
                </td>
                <td
                  style={{
                    background: bg,
                    padding: "4px 6px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.tong_sl, (v) => updateCK(r.id, "tong_sl", v))}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 6px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.gia_von, (v) => updateCK(r.id, "gia_von", v))}
                </td>
                <td
                  style={{
                    background: "#eff6ff",
                    padding: "4px 6px",
                    textAlign: "right",
                  }}
                >
                  {numInput(r.gia_tt, (v) => updateCK(r.id, "gia_tt", v))}
                </td>
                <td
                  style={{
                    background: "#fffde7",
                    padding: "4px 8px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    color: "#92400e",
                  }}
                >
                  {fmt(gtvon, 3)}
                </td>
                <td
                  style={{
                    background: "#eff6ff",
                    padding: "4px 8px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    color: "#1e40af",
                  }}
                >
                  {fmt(gttt, 3)}
                </td>
                <td
                  style={{
                    background: bg,
                    padding: "4px 8px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: lc,
                  }}
                >
                  {laiLo >= 0 ? "+" : ""}
                  {fmt(laiLo, 3)}
                </td>
                <td
                  style={{
                    background: bg,
                    padding: "4px 8px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: lc,
                  }}
                >
                  {pct >= 0 ? "+" : ""}
                  {pct.toFixed(2)}%
                </td>
                {delBtn(r.id, delCK)}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #cbd5e1", background: "#f8fafc" }}>
            <td
              colSpan={4}
              style={{
                padding: "6px 8px",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              TỔNG
            </td>
            {(() => {
              const totalVon = ckHoldings.reduce(
                (s, r) => s + (r.tong_sl * r.gia_von) / 1000000,
                0,
              );
              const totalTT = ckHoldings.reduce(
                (s, r) => s + (r.tong_sl * r.gia_tt) / 1000000,
                0,
              );
              const ll = totalTT - totalVon;
              const pct = totalVon > 0 ? (ll / totalVon) * 100 : 0;
              const c = ll >= 0 ? "var(--bull-green)" : "#ef4444";
              return (
                <>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "#92400e",
                    }}
                  >
                    {fmt(totalVon, 3)}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "#1e40af",
                    }}
                  >
                    {fmt(totalTT, 3)}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: c,
                    }}
                  >
                    {ll >= 0 ? "+" : ""}
                    {fmt(ll, 3)}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: c,
                    }}
                  >
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </td>
                  <td />
                </>
              );
            })()}
          </tr>
        </tfoot>
      </table>

      {/* ── Section 3: Tiet Kiem ── */}
      {sectionHeader("🏦 Tiết Kiệm", addTK, "Thêm")}
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
            {hcell("Ngân Hàng", 1, "#dbeafe")}
            {hcell("Số Tiền (tr)", 1, "#dbeafe")}
            {hcell("Lãi Suất (%/năm)", 1, "#dbeafe")}
            {hcell("Ngày Mở", 1, "#f1f5f9")}
            {hcell("Ngày Đến Hạn", 1, "#f1f5f9")}
            {hcell("Xóa", 1, "#f1f5f9")}
          </tr>
        </thead>
        <tbody>
          {tietKiem.map((r, i) => (
            <tr
              key={r.id}
              style={{
                borderBottom: "1px solid #e2e8f0",
                background: i % 2 === 0 ? "#fff" : "#f8fafc",
              }}
            >
              <td
                style={{
                  background: "#eff6ff",
                  padding: "4px 8px",
                  fontWeight: 700,
                }}
              >
                {textInput(r.bank, (v) => updateTK(r.id, "bank", v))}
              </td>
              <td
                style={{
                  background: "#eff6ff",
                  padding: "4px 6px",
                  textAlign: "right",
                }}
              >
                {numInput(r.amount, (v) => updateTK(r.id, "amount", v))}
              </td>
              <td
                style={{
                  background: "#eff6ff",
                  padding: "4px 6px",
                  textAlign: "right",
                }}
              >
                {numInput(r.rate, (v) => updateTK(r.id, "rate", v))}
              </td>
              <td style={{ padding: "4px 8px" }}>
                <input
                  type="date"
                  value={r.start_date}
                  onChange={(e) => updateTK(r.id, "start_date", e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </td>
              <td style={{ padding: "4px 8px" }}>
                <input
                  type="date"
                  value={r.end_date}
                  onChange={(e) => updateTK(r.id, "end_date", e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </td>
              {delBtn(r.id, delTK)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Section 4: Vay ── */}
      {sectionHeader("🏠 Vay", addVay, "Thêm")}
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
            {hcell("Ngân Hàng", 1, "#fecaca")}
            {hcell("Số Tiền (tr)", 1, "#fecaca")}
            {hcell("Thời Gian", 1, "#f1f5f9")}
            {hcell("Lãi Suất", 1, "#f1f5f9")}
            {hcell("Xóa", 1, "#f1f5f9")}
          </tr>
        </thead>
        <tbody>
          {vay.map((r, i) => (
            <tr
              key={r.id}
              style={{
                borderBottom: "1px solid #e2e8f0",
                background: i % 2 === 0 ? "#fff" : "#f8fafc",
              }}
            >
              <td
                style={{
                  background: "#fff1f2",
                  padding: "4px 8px",
                  fontWeight: 700,
                }}
              >
                {textInput(r.bank, (v) => updateVay(r.id, "bank", v))}
              </td>
              <td
                style={{
                  background: "#fff1f2",
                  padding: "4px 6px",
                  textAlign: "right",
                }}
              >
                {numInput(r.so_tien, (v) => updateVay(r.id, "so_tien", v))}
              </td>
              <td style={{ padding: "4px 8px" }}>
                {textInput(r.thoi_gian, (v) => updateVay(r.id, "thoi_gian", v))}
              </td>
              <td style={{ padding: "4px 8px" }}>
                {textInput(r.lai_suat, (v) => updateVay(r.id, "lai_suat", v))}
              </td>
              {delBtn(r.id, delVay)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Visualize Tab ────────────────────────────────────────────────────────────
const VisualizeTab: React.FC = () => {
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
const ToolTab: React.FC = () => {
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
const RecommendationTab: React.FC = () => {
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
const AssessmentTab: React.FC = () => {
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
