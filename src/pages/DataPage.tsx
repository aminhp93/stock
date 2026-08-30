import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStocks, fetchDataStats, fetchNavHistory } from "../services/api";
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

// ─── Shared SVG Line Chart ───────────────────────────────────────────────────
interface LinePoint {
  x: number;
  y: number;
  label: string;
  value: number;
}

const SvgLineChart: React.FC<{
  points: LinePoint[];
  title: string;
  yUnit?: string;
  yMin?: number;
  yMax?: number;
  color?: string;
  height?: number;
}> = ({
  points,
  title,
  yUnit = "",
  yMin,
  yMax,
  color = "#3b82f6",
  height = 220,
}) => {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!points.length) return null;

  const PAD = { top: 20, right: 20, bottom: 40, left: 52 };
  const W = 900;
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const vals = points.map((p) => p.value);
  const dataMin = yMin ?? Math.min(...vals);
  const dataMax = yMax ?? Math.max(...vals);
  const range = dataMax - dataMin || 1;

  const toX = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const toY = (v: number) =>
    PAD.top + innerH - ((v - dataMin) / range) * innerH;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L${toX(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  // Y grid lines (5 ticks)
  const yTicks = Array.from({ length: 6 }, (_, i) => dataMin + (range / 5) * i);
  // X labels: show every N-th to avoid clutter
  const step = Math.ceil(points.length / 10);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      let best = 0,
        bestDist = Infinity;
      points.forEach((_, i) => {
        const d = Math.abs(toX(i) - mx);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const p = points[best];
      setTooltip({
        x: toX(best),
        y: toY(p.value),
        label: p.label,
        value: p.value,
      });
    },
    [points],
  );

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12.5px",
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: "10px",
        }}
      >
        {title}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: "100%",
            minWidth: "320px",
            height: `${height}px`,
            cursor: "crosshair",
            display: "block",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient
              id={`grad-${color.replace("#", "")}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={toY(v)}
                x2={PAD.left + innerW}
                y2={toY(v)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
              >
                {v % 1 === 0 ? v : v.toFixed(1)}
                {yUnit}
              </text>
            </g>
          ))}
          {/* Area */}
          <path d={areaPath} fill={`url(#grad-${color.replace("#", "")})`} />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* X labels */}
          {points.map((p, i) =>
            i % step === 0 || i === points.length - 1 ? (
              <text
                key={i}
                x={toX(i)}
                y={PAD.top + innerH + 16}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                {p.label}
              </text>
            ) : null,
          )}
          {/* Dots on key points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={toX(i)}
              cy={toY(p.value)}
              r="3"
              fill={color}
              opacity="0.7"
            />
          ))}
          {/* Tooltip */}
          {tooltip && (
            <g>
              <line
                x1={tooltip.x}
                y1={PAD.top}
                x2={tooltip.x}
                y2={PAD.top + innerH}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="4,3"
              />
              <circle
                cx={tooltip.x}
                cy={tooltip.y}
                r="5"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />
              <rect
                x={Math.min(tooltip.x + 8, W - 90)}
                y={tooltip.y - 28}
                width="84"
                height="26"
                rx="5"
                fill="#1e293b"
                opacity="0.9"
              />
              <text
                x={Math.min(tooltip.x + 50, W - 48)}
                y={tooltip.y - 19}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                {tooltip.label}
              </text>
              <text
                x={Math.min(tooltip.x + 50, W - 48)}
                y={tooltip.y - 7}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#fff"
              >
                {tooltip.value.toLocaleString("vi-VN", {
                  maximumFractionDigits: 2,
                })}
                {yUnit}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

// ─── Lãi Suất Tab ─────────────────────────────────────────────────────────────
const laiSuatRaw = [
  { period: "01/21", rate12: 5.5 },
  { period: "06/21", rate12: 5.5 },
  { period: "12/21", rate12: 5.5 },
  { period: "06/22", rate12: 5.6 },
  { period: "09/22", rate12: 6.4 },
  { period: "12/22", rate12: 7.4 },
  { period: "03/23", rate12: 7.4 },
  { period: "04/23", rate12: 7.2 },
  { period: "06/23", rate12: 6.3 },
  { period: "09/23", rate12: 5.5 },
  { period: "12/23", rate12: 4.8 },
  { period: "06/24", rate12: 4.7 },
  { period: "12/24", rate12: 4.7 },
  { period: "06/25", rate12: 4.7 },
  { period: "12/25", rate12: 4.7 },
  { period: "03/26", rate12: 5.5 },
  { period: "08/26", rate12: 7.4 },
];

const LaiSuatTab: React.FC = () => {
  const current = laiSuatRaw[laiSuatRaw.length - 1];
  const min = Math.min(...laiSuatRaw.map((d) => d.rate12));
  const max = Math.max(...laiSuatRaw.map((d) => d.rate12));
  const linePoints: LinePoint[] = laiSuatRaw.map((d) => ({
    x: 0,
    y: 0,
    label: d.period,
    value: d.rate12,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "10px",
        }}
      >
        {[
          {
            label: "LS 12T hiện tại",
            value: `${current.rate12}%`,
            sub: "8/2026",
            color: "#ef4444",
            bg: "#fff1f2",
          },
          {
            label: "Đỉnh 5 năm",
            value: `${max}%`,
            sub: "12/2022",
            color: "#dc2626",
            bg: "#fef2f2",
          },
          {
            label: "Đáy 5 năm",
            value: `${min}%`,
            sub: "2024–2025",
            color: "#3b82f6",
            bg: "#eff6ff",
          },
          {
            label: "Chu kỳ",
            value: "~2–3 năm",
            sub: "đỉnh → đáy",
            color: "#7c3aed",
            bg: "#f5f3ff",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg,
              border: `1px solid ${kpi.color}25`,
              borderRadius: "10px",
              padding: "12px 14px",
            }}
          >
            <span
              style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}
            >
              {kpi.label}
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: kpi.color,
                fontFamily: "monospace",
                lineHeight: 1.2,
              }}
            >
              {kpi.value}
            </div>
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>
              {kpi.sub}
            </span>
          </div>
        ))}
      </div>

      <SvgLineChart
        points={linePoints}
        title="Lãi suất tiết kiệm VCB kỳ hạn 12 tháng (%/năm)"
        yUnit="%"
        yMin={4}
        yMax={8}
        color="#3b82f6"
        height={230}
      />

      {/* Table */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px",
        }}
      >
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: "10px",
          }}
        >
          📋 Bảng chi tiết lãi suất VCB 12T
        </div>
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
                {["Giai đoạn", "LS 12T", "Mức"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "7px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laiSuatRaw.map((d, i) => {
                const isHigh = d.rate12 >= 7.0;
                const isLow = d.rate12 <= 4.8;
                const color = isHigh
                  ? "#ef4444"
                  : isLow
                    ? "#3b82f6"
                    : "#f59e0b";
                const isLatest = i === laiSuatRaw.length - 1;
                return (
                  <tr
                    key={d.period}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isLatest
                        ? "#fff1f2"
                        : i % 2 === 0
                          ? "#fff"
                          : "#f8fafc",
                    }}
                  >
                    <td
                      style={{
                        padding: "6px 12px",
                        fontFamily: "monospace",
                        fontWeight: isLatest ? 800 : 500,
                        color: isLatest ? color : "#334155",
                      }}
                    >
                      {d.period}
                      {isLatest ? " ◄" : ""}
                    </td>
                    <td
                      style={{
                        padding: "6px 12px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {d.rate12}%/năm
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: isHigh
                            ? "#fee2e2"
                            : isLow
                              ? "#dbeafe"
                              : "#fef9c3",
                          color,
                        }}
                      >
                        {isHigh ? "Cao" : isLow ? "Thấp" : "TB"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          style={{
            marginTop: "10px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "9px 12px",
            fontSize: "12px",
            color: "#166534",
          }}
        >
          💡 LS VCB đi vòng tròn: đỉnh 7,4% (12/2022) → đáy 4,7% (2024–25) → nay
          quay lại 7,4% (8/2026). Khóa 7,4–7,8% đáo hạn 8/2027 —{" "}
          <strong>đúng vùng đỉnh chu kỳ</strong>.
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            marginBottom: "6px",
            fontWeight: 700,
          }}
        >
          Nguồn:
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
// Fmarket product IDs: VCBF-BCF = 48  (verify at https://fmarket.vn/quy/VCBFBCF)
const CCQ_PRODUCTS = [
  {
    id: 48,
    name: "VCBF-BCF",
    color: "#10b981",
    note: "Quỹ cổ phiếu bluechip VCBF",
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
  { label: "LN bình quân từ lập quỹ", value: "~13,1%/năm" },
];

const ChungChiQuyTab: React.FC = () => {
  const [navPoints, setNavPoints] = useState<LinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(CCQ_PRODUCTS[0].id);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchNavHistory(selectedId)
      .then((data) => {
        const histories =
          data?.navHistories ?? (data as any)?.data?.navHistories ?? [];
        if (!histories.length) throw new Error("Không có dữ liệu NAV");
        // Sample to keep chart readable (max 300 points)
        const sampled =
          histories.length > 300
            ? histories.filter(
                (_: any, i: number) =>
                  i % Math.ceil(histories.length / 300) === 0,
              )
            : histories;
        const pts: LinePoint[] = sampled.map((h: any) => {
          const d = new Date(h.navDate);
          const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
          return { x: 0, y: 0, label, value: Math.round(h.nav) };
        });
        setNavPoints(pts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const product = CCQ_PRODUCTS.find((p) => p.id === selectedId)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          Dữ liệu NAV thực tế từ Fmarket API — cập nhật theo ngày giao dịch.
        </em>
      </div>

      {/* Fund selector */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {CCQ_PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1.5px solid",
              borderColor: selectedId === p.id ? p.color : "#e2e8f0",
              background: selectedId === p.id ? p.color : "#fff",
              color: selectedId === p.id ? "#fff" : "#64748b",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Fund info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: "8px",
        }}
      >
        {bcfInfo.map((item) => (
          <div
            key={item.label}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "9px 12px",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                color: "#64748b",
                display: "block",
                marginBottom: "2px",
              }}
            >
              {item.label}
            </span>
            <div
              style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b" }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* NAV Line Chart */}
      {loading && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          ⏳ Đang tải NAV history từ Fmarket...
        </div>
      )}
      {error && (
        <div
          style={{
            padding: "16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "12.5px",
          }}
        >
          ❌ {error} — kiểm tra server backend đang chạy và productId đúng.
        </div>
      )}
      {!loading && !error && navPoints.length > 0 && (
        <SvgLineChart
          points={navPoints}
          title={`NAV lịch sử — ${product.name} (đồng/chứng chỉ quỹ)`}
          yUnit=" đ"
          color={product.color}
          height={250}
        />
      )}

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
        vốn dài hạn ≥3–5 năm, nên vào DCA, giữ &gt;2 năm để tránh phí bán 3%.
      </div>

      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            marginBottom: "6px",
            fontWeight: 700,
          }}
        >
          Nguồn:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            {
              label: "Fmarket – VCBF-BCF",
              url: "https://fmarket.vn/quy/VCBFBCF",
            },
            {
              label: "VCBF – Trang quỹ BCF",
              url: "https://www.vcbf.com/quy-mo/cac-quy-mo/quy-dau-tu-co-phieu-hang-dau-vcbf/",
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
                          navigate(`/finance/stock/chart?symbol=${s.symbol}`)
                        }
                        className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-colors shadow-sm"
                      >
                        Biểu Đồ
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/finance/stock/analysis?symbol=${s.symbol}`)
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
