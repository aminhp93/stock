import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStocks, fetchDataStats } from "../services/api";
import { StockItem, DataStats } from "../types";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table,
  BarChart2,
  TrendingUp,
  Database,
} from "lucide-react";
import { RawDataModal } from "../components/RawDataModal";

const PAGE_SIZE = 10;

// ─── Lãi Suất Tab ─────────────────────────────────────────────────────────────
const laiSuatData = [
  { period: "2021", rate12: 5.5, rate6: 4.5, note: "Lãi suất thấp thời COVID" },
  {
    period: "6/2022",
    rate12: 5.6,
    rate6: 4.7,
    note: "Bắt đầu áp lực lạm phát",
  },
  {
    period: "9/2022",
    rate12: 6.4,
    rate6: 5.5,
    note: "SBV tăng lãi suất điều hành",
  },
  {
    period: "12/2022",
    rate12: 7.4,
    rate6: 6.0,
    note: "Đỉnh — căng thanh khoản, khủng hoảng TPDN",
  },
  { period: "3/2023", rate12: 7.4, rate6: 6.0, note: "" },
  {
    period: "4/2023",
    rate12: 7.2,
    rate6: 5.8,
    note: "SBV bắt đầu hạ lãi suất",
  },
  { period: "6/2023", rate12: 6.3, rate6: 5.2, note: "" },
  { period: "9/2023", rate12: 5.5, rate6: 4.4, note: "" },
  { period: "12/2023", rate12: 4.8, rate6: 3.8, note: "" },
  {
    period: "2024",
    rate12: 4.7,
    rate6: 3.0,
    note: "VCB nhóm thấp nhất hệ thống",
  },
  { period: "2025", rate12: 4.7, rate6: 3.0, note: "Ổn định ở đáy" },
  { period: "Q1/2026", rate12: 5.5, rate6: 4.5, note: "Huy động bắt đầu tăng" },
  { period: "8/2026", rate12: 7.4, rate6: 5.8, note: "Áp lực tỷ giá + Hormuz" },
];

const LaiSuatTab: React.FC = () => {
  const maxRate = 8;
  const current = laiSuatData[laiSuatData.length - 1];
  const min = Math.min(...laiSuatData.map((d) => d.rate12));
  const max = Math.max(...laiSuatData.map((d) => d.rate12));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          color: "#713f12",
        }}
      >
        ⚠️{" "}
        <em>
          Dữ liệu tổng hợp từ VCB/báo chí. Số liệu là các mốc thay đổi chính —
          sai số ±0,1–0,2%, timing xấp xỉ.
        </em>
      </div>

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
            label: "LS 12T hiện tại (8/2026)",
            value: `${current.rate12}%`,
            color: "#ef4444",
            bg: "#fff1f2",
          },
          {
            label: "LS 6T hiện tại (8/2026)",
            value: `${current.rate6}%`,
            color: "#f97316",
            bg: "#fff7ed",
          },
          {
            label: "Đỉnh 5 năm (12/2022)",
            value: `${max}%`,
            color: "#dc2626",
            bg: "#fef2f2",
          },
          {
            label: "Đáy 5 năm (2024–2025)",
            value: `${min}%`,
            color: "#3b82f6",
            bg: "#eff6ff",
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
                color: "#64748b",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {kpi.label}
            </span>
            <div
              style={{
                fontSize: "22px",
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

      {/* Bar chart */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "16px",
          }}
        >
          📊 Lãi Suất Tiết Kiệm VCB — Kỳ Hạn 12 Tháng (2021–8/2026)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {laiSuatData.map((d, i) => {
            const pct12 = (d.rate12 / maxRate) * 100;
            const isHigh = d.rate12 >= 7.0;
            const isLow = d.rate12 <= 4.8;
            const color = isHigh ? "#ef4444" : isLow ? "#3b82f6" : "#f59e0b";
            const isLatest = i === laiSuatData.length - 1;
            return (
              <div
                key={d.period}
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{
                    minWidth: "72px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: isLatest ? 800 : 600,
                    color: isLatest ? color : "var(--text-muted)",
                    textAlign: "right",
                  }}
                >
                  {d.period}
                </span>
                <div
                  style={{
                    flex: 1,
                    position: "relative",
                    height: "20px",
                    background: "#f1f5f9",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct12}%`,
                      height: "100%",
                      background: color,
                      borderRadius: "4px",
                      transition: "width 0.5s",
                      opacity: isLatest ? 1 : 0.8,
                    }}
                  />
                </div>
                <span
                  style={{
                    minWidth: "44px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    fontWeight: 800,
                    color,
                    textAlign: "right",
                  }}
                >
                  {d.rate12}%
                </span>
                {d.note && (
                  <span
                    style={{
                      fontSize: "10.5px",
                      color: "#94a3b8",
                      maxWidth: "180px",
                      lineHeight: "1.3",
                    }}
                  >
                    {d.note}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
            flexWrap: "wrap",
          }}
        >
          {[
            { color: "#ef4444", label: "≥7% (cao)" },
            { color: "#f59e0b", label: "5–7% (trung bình)" },
            { color: "#3b82f6", label: "≤4,8% (thấp)" },
          ].map((l) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  background: l.color,
                }}
              />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "12px",
          }}
        >
          📋 Bảng Chi Tiết
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
                {["Giai đoạn", "LS 12 tháng", "LS 6 tháng", "Ghi chú"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {laiSuatData.map((d, i) => {
                const isHigh = d.rate12 >= 7.0;
                const isLow = d.rate12 <= 4.8;
                const color = isHigh
                  ? "#ef4444"
                  : isLow
                    ? "#3b82f6"
                    : "#f59e0b";
                const isLatest = i === laiSuatData.length - 1;
                return (
                  <tr
                    key={d.period}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isLatest
                        ? "#fef2f2"
                        : i % 2 === 0
                          ? "#fff"
                          : "#f8fafc",
                    }}
                  >
                    <td
                      style={{
                        padding: "7px 12px",
                        fontFamily: "monospace",
                        fontWeight: isLatest ? 800 : 600,
                        color: isLatest ? color : "var(--text-main)",
                      }}
                    >
                      {d.period}
                      {isLatest ? " ◄ hiện tại" : ""}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {d.rate12}%/năm
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        fontFamily: "monospace",
                        color: "#64748b",
                      }}
                    >
                      {d.rate6}%/năm
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        fontSize: "11.5px",
                        color: "#64748b",
                      }}
                    >
                      {d.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          style={{
            marginTop: "12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "12px",
            color: "#166534",
          }}
        >
          💡 <strong>Đọc nhanh:</strong> LS VCB đi một vòng tròn — đỉnh 7,4%
          (cuối 2022) → đáy 4,6% (2024–2025) → nay quay lại 7,4%. Bạn đang khóa
          7,4–7,8% đáo hạn 8/2027 — <strong>đúng vào vùng đỉnh chu kỳ</strong>.
        </div>
      </div>

      {/* Sources */}
      <div
        style={{
          borderTop: "1px solid var(--border-color)",
          paddingTop: "14px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            marginBottom: "8px",
            fontWeight: 700,
          }}
        >
          Nguồn tham khảo:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            {
              label: "VnEconomy – LS tiết kiệm 8/2026",
              url: "https://vneconomy.vn/lai-suat-tiet-kiem-ngan-hang-nao-cao-nhat-thang-82026.htm",
            },
            {
              label: "VietnamBiz – LS Vietcombank",
              url: "https://vietnambiz.vn/lai-suat-ngan-hang-vietcombank.html",
            },
            {
              label: "ThuVienPhapLuat – VCB 2025",
              url: "https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/lai-suat-ngan-hang-vietcombank-nam-2025-va-cong-cu-tinh-lai-tien-gui-2025-10352.html",
            },
          ].map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "11px",
                color: "#3b82f6",
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

// ─── Chứng Chỉ Quỹ Tab ────────────────────────────────────────────────────────
const bcfYearlyData = [
  {
    year: "2020",
    bcf: 17.0,
    vnindex: 14.9,
    note: "Năm COVID; đáy −31% rồi hồi mạnh",
  },
  { year: "2021", bcf: 34.0, vnindex: 35.7, note: "Thị trường bùng nổ" },
  {
    year: "2022",
    bcf: -19.0,
    vnindex: -32.8,
    note: "BCF giảm ít hơn TT nhiều",
  },
  { year: "2023", bcf: 16.7, vnindex: 12.2, note: "Vượt chỉ số +4,5%" },
  { year: "2024", bcf: 26.4, vnindex: 12.1, note: "Vượt xa chỉ số +14,3%" },
  { year: "2025", bcf: 22.8, vnindex: 18.0, note: "Q3/2025 riêng +14,5%" },
  {
    year: "2026 (8T)",
    bcf: 2.0,
    vnindex: 0.5,
    note: "YTD — thị trường biến động tháng 8",
  },
];

const bcfInfo = [
  { label: "NAV / CCQ (28/8/2026)", value: "42.753,74 đ" },
  { label: "Quy mô (7/2026)", value: "~1.528,7 tỷ đ" },
  { label: "Cơ cấu", value: "~100% cổ phiếu bluechip" },
  { label: "Phí mua", value: "0%" },
  { label: "Phí bán ≤1 năm", value: "3%" },
  { label: "Phí bán 1–2 năm", value: "0,5%" },
  { label: "Phí bán >2 năm", value: "0%" },
  { label: "LN bình quân từ lập quỹ", value: "~13,1%/năm (vs VN-Index ~8%)" },
];

const ChungChiQuyTab: React.FC = () => {
  const maxAbs = Math.max(
    ...bcfYearlyData.map((d) => Math.max(Math.abs(d.bcf), Math.abs(d.vnindex))),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          color: "#713f12",
        }}
      >
        ⚠️{" "}
        <em>
          Dữ liệu tổng hợp từ VCBF, Fmarket và báo chí. Một số mốc là ước tính —
          xem ghi chú từng năm.
        </em>
      </div>

      {/* Fund info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "10px",
        }}
      >
        {bcfInfo.map((item) => (
          <div
            key={item.label}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "10px 12px",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                color: "#64748b",
                display: "block",
                marginBottom: "3px",
              }}
            >
              {item.label}
            </span>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Annual returns chart */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "16px",
          }}
        >
          📊 Lợi Nhuận Hàng Năm: VCBF-BCF vs VN-Index
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {bcfYearlyData.map((d) => {
            const bcfPos = d.bcf >= 0;
            const vnPos = d.vnindex >= 0;
            const bcfW = (Math.abs(d.bcf) / maxAbs) * 100;
            const vnW = (Math.abs(d.vnindex) / maxAbs) * 100;
            const diff = d.bcf - d.vnindex;
            return (
              <div key={d.year}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                      minWidth: "72px",
                    }}
                  >
                    {d.year}
                  </span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {d.note}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: diff >= 0 ? "var(--bull-green)" : "#ef4444",
                      minWidth: "70px",
                      textAlign: "right",
                    }}
                  >
                    BCF {diff >= 0 ? "+" : ""}
                    {diff.toFixed(1)}% vs VNI
                  </span>
                </div>
                <div
                  style={{ display: "flex", gap: "4px", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#3b82f6",
                      minWidth: "36px",
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                  >
                    BCF
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "14px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${bcfW}%`,
                        height: "100%",
                        background: bcfPos ? "#10b981" : "#ef4444",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      minWidth: "52px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: bcfPos ? "#10b981" : "#ef4444",
                      textAlign: "right",
                    }}
                  >
                    {bcfPos ? "+" : ""}
                    {d.bcf}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                    marginTop: "3px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      minWidth: "36px",
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                  >
                    VNI
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "10px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${vnW}%`,
                        height: "100%",
                        background: vnPos ? "#86efac" : "#fca5a5",
                        borderRadius: "4px",
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      minWidth: "52px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: vnPos ? "#16a34a" : "#dc2626",
                      textAlign: "right",
                    }}
                  >
                    {vnPos ? "+" : ""}
                    {d.vnindex}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          {[
            { color: "#10b981", label: "BCF (dương)" },
            { color: "#ef4444", label: "BCF (âm)" },
            { color: "#86efac", label: "VN-Index (dương)" },
            { color: "#fca5a5", label: "VN-Index (âm)" },
          ].map((l) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10.5px",
                color: "#64748b",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: l.color,
                }}
              />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Cumulative value chart (100M invested 2020) */}
      <div className="card" style={{ padding: "18px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text-main)",
            marginBottom: "6px",
          }}
        >
          💰 Mô Phỏng 100 Triệu Đầu Tư Một Lần (Lump Sum từ đầu 2020)
        </h3>
        <p
          style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "14px" }}
        >
          Giả định mua đầu năm 2020, giữ đến 8/2026. Số liệu là ước tính cộng
          dồn từ lợi nhuận hàng năm.
        </p>
        {(() => {
          let bcfVal = 100,
            vniVal = 100;
          const rows = bcfYearlyData.map((d) => {
            bcfVal = bcfVal * (1 + d.bcf / 100);
            vniVal = vniVal * (1 + d.vnindex / 100);
            return { year: d.year, bcf: bcfVal, vni: vniVal };
          });
          const maxVal = Math.max(...rows.map((r) => Math.max(r.bcf, r.vni)));
          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {rows.map((r) => (
                <div
                  key={r.year}
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <span
                    style={{
                      minWidth: "72px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      textAlign: "right",
                    }}
                  >
                    {r.year}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: `${(r.bcf / maxVal) * 100}%`,
                          height: "16px",
                          background: "#10b981",
                          borderRadius: "4px",
                          minWidth: "4px",
                          transition: "width 0.5s",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontFamily: "monospace",
                          fontWeight: 800,
                          color: "#10b981",
                        }}
                      >
                        {r.bcf.toFixed(0)} tr
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: `${(r.vni / maxVal) * 100}%`,
                          height: "10px",
                          background: "#94a3b8",
                          borderRadius: "4px",
                          minWidth: "4px",
                          opacity: 0.7,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontFamily: "monospace",
                          color: "#64748b",
                        }}
                      >
                        {r.vni.toFixed(0)} tr
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--border-color)",
                  display: "flex",
                  gap: "16px",
                  fontSize: "11px",
                  color: "#64748b",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "2px",
                      background: "#10b981",
                    }}
                  />{" "}
                  BCF
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "2px",
                      background: "#94a3b8",
                      opacity: 0.7,
                    }}
                  />{" "}
                  VN-Index
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Quick read */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "12.5px",
          color: "#166534",
          lineHeight: "1.7",
        }}
      >
        💡 <strong>Đọc nhanh:</strong> BCF là quỹ cổ phiếu thuần — năm tốt +26
        đến +34%, năm xấu −19%. Điểm mạnh là{" "}
        <strong>giảm ít hơn thị trường khi sập</strong> (2022: −19% vs −33%) và{" "}
        <strong>vượt chỉ số đều trong 2023–2024</strong>. Rủi ro cao, chỉ hợp
        vốn dài hạn ≥3–5 năm, nên vào DCA định kỳ, giữ &gt;2 năm để tránh phí
        bán 3%.
      </div>

      {/* Sources */}
      <div
        style={{
          borderTop: "1px solid var(--border-color)",
          paddingTop: "14px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            marginBottom: "8px",
            fontWeight: 700,
          }}
        >
          Nguồn tham khảo:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            {
              label: "Fmarket – VCBF-BCF",
              url: "https://fmarket.vn/quy/VCBFBCF",
            },
            {
              label: "Fmarket – Lợi nhuận 10 năm BCF",
              url: "https://fmarket.vn/thi-truong-bien-dong-loi-nhuan-10-nam-cua-vcbf-bcf-dien-bien-ra-sao",
            },
            {
              label: "VCBF – Trang quỹ BCF",
              url: "https://www.vcbf.com/quy-mo/cac-quy-mo/quy-dau-tu-co-phieu-hang-dau-vcbf/",
            },
            {
              label: "VCBF – Hiệu suất Q2/2025",
              url: "https://www.vcbf.com/quy-mo/goc-tu-van-vcbf/goc-tu-van/thi-truong-hoi-phuc-quy-mo-vcbf-hieu-suat-dung-dau-3-nam.html",
            },
          ].map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "11px",
                color: "#3b82f6",
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

// ─── Cổ Phiếu Tab (original DataPage content) ─────────────────────────────────
const CoPhieuTab: React.FC = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExchange, setSelectedExchange] = useState("ALL");
  const [stockPage, setStockPage] = useState(1);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  useEffect(() => {
    fetchStocks().then(setStocks).catch(console.error);
    fetchDataStats().then(setStats).catch(console.error);
  }, []);

  const filteredStocks = stocks.filter((s) => {
    const matchSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchExch =
      selectedExchange === "ALL" ||
      s.exchange.toUpperCase() === selectedExchange.toUpperCase();
    return matchSearch && matchExch;
  });
  const totalStockPages = Math.ceil(filteredStocks.length / PAGE_SIZE) || 1;
  const paginatedStocks = filteredStocks.slice(
    (stockPage - 1) * PAGE_SIZE,
    stockPage * PAGE_SIZE,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* DB stats */}
      <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-500 block mb-1">
              Tổng Danh Mục:
            </span>
            <div className="font-mono text-2xl font-extrabold text-slate-900">
              {stats ? stats.total_stocks.toLocaleString() : "—"}{" "}
              <span className="text-xs font-medium text-slate-400">mã</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">
              Khung Thời Gian Cập Nhật:
            </span>
            <div className="font-mono text-sm font-bold text-slate-800 mt-1">
              {stats?.date_range || "—"}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">
              Trạng Thái Kết Nối:
            </span>
            <div className="flex items-center gap-2 mt-1">
              {(() => {
                const status = stats?.status;
                const isError =
                  !status ||
                  status === "DATABASE_OFFLINE" ||
                  status.toLowerCase().includes("error") ||
                  status.toLowerCase().includes("offline");
                return (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full ${isError ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`}
                    ></span>
                    <strong
                      className={`font-mono text-xs font-bold ${isError ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {status || "DATABASE_OFFLINE"}
                    </strong>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Stock table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="relative w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm mã, tên công ty, ngành..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setStockPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 mr-1" />
            <span className="text-xs text-slate-500 mr-1">Sàn:</span>
            {["ALL", "HOSE", "HNX", "UPCOM"].map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setSelectedExchange(ex);
                  setStockPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors border ${selectedExchange === ex ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full border-collapse text-[13px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11.5px] uppercase font-semibold">
                <th className="px-4 py-2.5">Mã CP</th>
                <th className="px-4 py-2.5">Tên Doanh Nghiệp</th>
                <th className="px-4 py-2.5">Sàn</th>
                <th className="px-4 py-2.5">Ngành Nghề</th>
                <th className="px-4 py-2.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStocks.map((s) => (
                <tr
                  key={s.symbol}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <strong className="font-mono text-sm font-bold text-blue-600">
                      {s.symbol}
                    </strong>
                  </td>
                  <td className="px-4 py-2.5 text-slate-800 font-medium">
                    {s.company_name}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                      {s.exchange}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {s.sector}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedStock(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                      >
                        <Table size={12} className="text-blue-600" />
                        <span>Xem Data</span>
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/finance/chart?symbol=${s.symbol}`)
                        }
                        className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-colors shadow-sm"
                      >
                        Biểu Đồ
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/finance/dashboard?symbol=${s.symbol}`)
                        }
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                      >
                        Giả Lập
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStocks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    Không tìm thấy mã cổ phiếu nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
          <span className="text-xs text-slate-500">
            Hiển thị{" "}
            <strong className="font-mono text-slate-800">
              {paginatedStocks.length > 0 ? (stockPage - 1) * PAGE_SIZE + 1 : 0}
            </strong>{" "}
            -{" "}
            <strong className="font-mono text-slate-800">
              {Math.min(stockPage * PAGE_SIZE, filteredStocks.length)}
            </strong>{" "}
            trên{" "}
            <strong className="font-mono text-slate-800">
              {filteredStocks.length.toLocaleString()}
            </strong>{" "}
            mã
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStockPage(1)}
              disabled={stockPage <= 1}
              className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setStockPage((p) => Math.max(p - 1, 1))}
              disabled={stockPage <= 1}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>
            <span className="font-mono text-xs font-bold px-2 text-slate-800">
              {stockPage} / {totalStockPages}
            </span>
            <button
              onClick={() =>
                setStockPage((p) => Math.min(p + 1, totalStockPages))
              }
              disabled={stockPage >= totalStockPages}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold transition-colors"
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setStockPage(totalStockPages)}
              disabled={stockPage >= totalStockPages}
              className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selectedStock && (
        <RawDataModal
          symbol={selectedStock.symbol}
          companyName={selectedStock.company_name}
          exchange={selectedStock.exchange}
          sector={selectedStock.sector}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
};

// ─── Main DataPage ────────────────────────────────────────────────────────────
type DataTab = "stocks" | "laisuat" | "ccq";
const DATA_TABS: { id: DataTab; label: string; icon: React.ReactNode }[] = [
  { id: "stocks", label: "Cổ Phiếu", icon: <Database size={13} /> },
  { id: "laisuat", label: "Lãi Suất", icon: <TrendingUp size={13} /> },
  { id: "ccq", label: "Chứng Chỉ Quỹ", icon: <BarChart2 size={13} /> },
];

export const DataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataTab>("stocks");

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-7 flex flex-col gap-5 animate-fade-in">
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        {DATA_TABS.map((tab) => (
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

      {activeTab === "stocks" && <CoPhieuTab />}
      {activeTab === "laisuat" && <LaiSuatTab />}
      {activeTab === "ccq" && <ChungChiQuyTab />}
    </div>
  );
};
