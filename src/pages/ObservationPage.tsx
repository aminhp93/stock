import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Eye,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart2,
  Users,
  Youtube,
  Database,
  Activity,
  ChevronRight,
  FlaskConical,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Layers,
  Sparkles,
  Zap,
  BookOpen,
  MessageCircle,
  Compass,
} from "lucide-react";
import {
  fetchObsStatus,
  fetchObsVideos,
  fetchObsStats,
  fetchObsDailyMetrics,
  fetchObsTickerMentions,
  fetchObsDivergence,
  fetchObsSignalBacktest,
  fetchObsPsychology,
  fetchObsComments,
  triggerObsCollect,
  triggerObsSeedSample,
  ObsCollectionTask,
  ObsVideo,
  ObsStats,
  ObsDailyMetric,
  ObsTickerMention,
  ObsDivergence,
  ObsSignalStat,
  ObsPsychologyDay,
  ObsComment,
} from "../services/api";

// ─── Reusable Metric Card ──────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  color?: string;
  bg?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  sub,
  badge,
  badgeColor = "#2563eb",
  color = "#2563eb",
  bg = "#eff6ff",
}) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      flex: "1 1 180px",
      minWidth: "160px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "7px",
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { size: 14, color })}
        </div>
        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
          {label}
        </span>
      </div>
      {badge && (
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "4px",
            background: `${badgeColor}15`,
            color: badgeColor,
            border: `1px solid ${badgeColor}33`,
          }}
        >
          {badge}
        </span>
      )}
    </div>
    <div
      style={{
        fontSize: "22px",
        fontWeight: 900,
        color: "#0f172a",
        fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
        letterSpacing: "-0.5px",
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
        {sub}
      </div>
    )}
  </div>
);

// ─── Interactive Dual-Axis Chart: Attention vs VN-Index ───────────────────
const AttentionChart: React.FC<{ data: ObsDailyMetric[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: "240px", background: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "12px" }}>
        Đang tải dữ liệu biểu đồ...
      </div>
    );
  }

  const width = 800;
  const height = 240;
  const padL = 50;
  const padR = 60;
  const padT = 20;
  const padB = 35;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const minVn = Math.min(...data.map((d) => d.vnindex_close)) * 0.995;
  const maxVn = Math.max(...data.map((d) => d.vnindex_close)) * 1.005;
  const maxViews = Math.max(...data.map((d) => d.total_views)) * 1.15;

  const getX = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const getYVn = (val: number) => padT + plotH - ((val - minVn) / (maxVn - minVn || 1)) * plotH;
  const getYViews = (val: number) => padT + plotH - (val / (maxViews || 1)) * plotH;

  const pointsVn = data.map((d, i) => `${getX(i)},${getYVn(d.vnindex_close)}`).join(" ");
  const barWidth = Math.max(3, plotW / data.length - 4);

  const activeItem = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b" }}>
            Tương quan Attention (Views & View Ratio) vs VN-Index
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            Cột xanh: Lượt xem livestream CFA99 &nbsp;·&nbsp; Đường tím: Chỉ số VN-Index đóng cửa
          </div>
        </div>
        {activeItem && (
          <div style={{ display: "flex", gap: "12px", background: "#f8fafc", padding: "4px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11.5px" }}>
            <span>Ngày: <strong>{activeItem.date}</strong></span>
            <span>Views: <strong style={{ color: "#2563eb" }}>{activeItem.total_views.toLocaleString()}</strong> ({activeItem.view_ratio}x)</span>
            <span>VN-Index: <strong style={{ color: "#7c3aed" }}>{activeItem.vnindex_close.toFixed(1)}</strong> ({activeItem.vnindex_change_pct > 0 ? "+" : ""}{activeItem.vnindex_change_pct}%)</span>
          </div>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "240px", minWidth: "500px" }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, k) => {
            const y = padT + p * plotH;
            const vnVal = maxVn - p * (maxVn - minVn);
            const viewVal = Math.round(maxViews - p * maxViews);
            return (
              <g key={k}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                  {viewVal.toLocaleString()}
                </text>
                <text x={width - padR + 6} y={y + 3} textAnchor="start" fontSize="9" fill="#7c3aed" fontFamily="monospace">
                  {vnVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Attention Bars (Views) */}
          {data.map((d, i) => {
            const x = getX(i) - barWidth / 2;
            const y = getYViews(d.total_views);
            const h = padT + plotH - y;
            const isSpike = d.view_ratio >= 1.3;
            const isHovered = hoverIdx === i;
            return (
              <rect
                key={`bar-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, h)}
                fill={isHovered ? "#1d4ed8" : isSpike ? "#38bdf8" : "#93c5fd"}
                rx="2"
                opacity={isHovered ? 1 : 0.85}
              />
            );
          })}

          {/* VN-Index Line */}
          <polyline
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.5"
            points={pointsVn}
          />

          {/* Points & Interactive Rects */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getYVn(d.vnindex_close);
            const isHovered = hoverIdx === i;
            return (
              <g key={`pt-${i}`}>
                {isHovered && (
                  <>
                    <line x1={cx} y1={padT} x2={cx} y2={padT + plotH} stroke="#cbd5e1" strokeDasharray="2,2" />
                    <circle cx={cx} cy={cy} r="5" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
                  </>
                )}
                {/* Invisible hover trigger */}
                <rect
                  x={cx - plotW / data.length / 2}
                  y={padT}
                  width={plotW / data.length}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) {
              const x = getX(i);
              return (
                <text key={`x-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="monospace">
                  {d.date.slice(5)}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
};

// ─── Interactive Sentiment vs Market Chart ────────────────────────────────
const SentimentMarketChart: React.FC<{ data: ObsDailyMetric[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 240;
  const padL = 45;
  const padR = 55;
  const padT = 20;
  const padB = 35;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const minVn = Math.min(...data.map((d) => d.vnindex_close)) * 0.995;
  const maxVn = Math.max(...data.map((d) => d.vnindex_close)) * 1.005;

  const getX = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const getYPct = (val: number) => padT + plotH - (val / 100) * plotH;
  const getYVn = (val: number) => padT + plotH - ((val - minVn) / (maxVn - minVn || 1)) * plotH;

  const pointsBull = data.map((d, i) => `${getX(i)},${getYPct(d.bullish_pct)}`).join(" ");
  const pointsBear = data.map((d, i) => `${getX(i)},${getYPct(d.bearish_pct)}`).join(" ");
  const pointsVn = data.map((d, i) => `${getX(i)},${getYVn(d.vnindex_close)}`).join(" ");

  const activeItem = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b" }}>
            Tâm Lý Retail (Bullish % vs Bearish %) vs VN-Index
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            <span style={{ color: "#059669", fontWeight: 700 }}>■ Lạc quan (Bullish)</span> &nbsp;·&nbsp;{" "}
            <span style={{ color: "#dc2626", fontWeight: 700 }}>■ Bi quan (Bearish)</span> &nbsp;·&nbsp;{" "}
            <span style={{ color: "#2563eb", fontWeight: 700 }}>― VN-Index</span>
          </div>
        </div>
        {activeItem && (
          <div style={{ display: "flex", gap: "12px", background: "#f8fafc", padding: "4px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11.5px" }}>
            <span>Ngày: <strong>{activeItem.date}</strong></span>
            <span>Bullish: <strong style={{ color: "#059669" }}>{activeItem.bullish_pct}%</strong></span>
            <span>Bearish: <strong style={{ color: "#dc2626" }}>{activeItem.bearish_pct}%</strong></span>
            <span>VN-Index: <strong style={{ color: "#2563eb" }}>{activeItem.vnindex_close.toFixed(1)}</strong></span>
          </div>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "240px", minWidth: "500px" }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Grid lines 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = getYPct(pct);
            return (
              <g key={pct}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* 50% Neutral baseline */}
          <line x1={padL} y1={getYPct(50)} x2={width - padR} y2={getYPct(50)} stroke="#e2e8f0" strokeWidth="1.5" />

          {/* Bullish line */}
          <polyline fill="none" stroke="#059669" strokeWidth="2.2" points={pointsBull} />
          {/* Bearish line */}
          <polyline fill="none" stroke="#dc2626" strokeWidth="2.2" points={pointsBear} />
          {/* VN-Index line */}
          <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="4,2" points={pointsVn} />

          {/* Crosshair & Hover triggers */}
          {data.map((d, i) => {
            const cx = getX(i);
            const isHovered = hoverIdx === i;
            return (
              <g key={`sh-${i}`}>
                {isHovered && (
                  <>
                    <line x1={cx} y1={padT} x2={cx} y2={padT + plotH} stroke="#cbd5e1" strokeDasharray="2,2" />
                    <circle cx={cx} cy={getYPct(d.bullish_pct)} r="4" fill="#059669" stroke="#fff" strokeWidth="2" />
                    <circle cx={cx} cy={getYPct(d.bearish_pct)} r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />
                    <circle cx={cx} cy={getYVn(d.vnindex_close)} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                  </>
                )}
                <rect
                  x={cx - plotW / data.length / 2}
                  y={padT}
                  width={plotW / data.length}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) {
              const x = getX(i);
              return (
                <text key={`x-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="monospace">
                  {d.date.slice(5)}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
};

// ─── Interactive Z-Score Chart (FOMO vs Fear with Standard Deviations) ───
const ZScoreChart: React.FC<{ data: ObsDailyMetric[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 240;
  const padL = 45;
  const padR = 45;
  const padT = 20;
  const padB = 35;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const minZ = -2.5;
  const maxZ = 3.5;

  const getX = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const getYZ = (val: number) => padT + plotH - ((val - minZ) / (maxZ - minZ)) * plotH;

  const pointsFomo = data.map((d, i) => `${getX(i)},${getYZ(d.fomo_z)}`).join(" ");
  const pointsFear = data.map((d, i) => `${getX(i)},${getYZ(d.fear_z)}`).join(" ");

  const activeItem = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b" }}>
            Độ lệch Chuẩn Hóa Cảm Xúc (Z-Score FOMO & Fear)
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            Vùng xám: &lt;1σ (Bình thường) &nbsp;·&nbsp; Vùng vàng: 1–2σ (Tăng cao) &nbsp;·&nbsp; Vùng đỏ/cam: &gt;2σ (Cực đoan)
          </div>
        </div>
        {activeItem && (
          <div style={{ display: "flex", gap: "12px", background: "#f8fafc", padding: "4px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11.5px" }}>
            <span>Ngày: <strong>{activeItem.date}</strong></span>
            <span>FOMO Z: <strong style={{ color: activeItem.fomo_z >= 1.5 ? "#d97706" : "#2563eb" }}>{activeItem.fomo_z > 0 ? "+" : ""}{activeItem.fomo_z}σ</strong></span>
            <span>Fear Z: <strong style={{ color: activeItem.fear_z >= 1.5 ? "#dc2626" : "#64748b" }}>{activeItem.fear_z > 0 ? "+" : ""}{activeItem.fear_z}σ</strong></span>
          </div>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "240px", minWidth: "500px" }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Bands */}
          {/* Extreme Zone > +2.0 */}
          <rect x={padL} y={getYZ(3.5)} width={plotW} height={getYZ(2.0) - getYZ(3.5)} fill="#fef2f2" opacity="0.7" />
          {/* Elevated Zone 1.0 -> 2.0 */}
          <rect x={padL} y={getYZ(2.0)} width={plotW} height={getYZ(1.0) - getYZ(2.0)} fill="#fffbeb" opacity="0.7" />
          {/* Normal Zone -1.0 -> 1.0 */}
          <rect x={padL} y={getYZ(1.0)} width={plotW} height={getYZ(-1.0) - getYZ(1.0)} fill="#f8fafc" opacity="0.7" />

          {/* Reference Lines */}
          {[2.0, 1.0, 0.0, -1.0, -2.0].map((zVal) => {
            const y = getYZ(zVal);
            return (
              <g key={zVal}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke={zVal === 0 ? "#94a3b8" : "#cbd5e1"} strokeDasharray={zVal === 0 ? "none" : "3,3"} strokeWidth={zVal === 0 ? 1.5 : 1} />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">
                  {zVal > 0 ? `+${zVal}` : zVal}σ
                </text>
              </g>
            );
          })}

          {/* FOMO Z Line */}
          <polyline fill="none" stroke="#d97706" strokeWidth="2.5" points={pointsFomo} />
          {/* Fear Z Line */}
          <polyline fill="none" stroke="#dc2626" strokeWidth="2.2" strokeDasharray="3,2" points={pointsFear} />

          {/* Hover triggers */}
          {data.map((d, i) => {
            const cx = getX(i);
            const isHovered = hoverIdx === i;
            return (
              <g key={`zh-${i}`}>
                {isHovered && (
                  <>
                    <line x1={cx} y1={padT} x2={cx} y2={padT + plotH} stroke="#94a3b8" strokeDasharray="2,2" />
                    <circle cx={cx} cy={getYZ(d.fomo_z)} r="5" fill="#d97706" stroke="#fff" strokeWidth="2" />
                    <circle cx={cx} cy={getYZ(d.fear_z)} r="5" fill="#dc2626" stroke="#fff" strokeWidth="2" />
                  </>
                )}
                <rect
                  x={cx - plotW / data.length / 2}
                  y={padT}
                  width={plotW / data.length}
                  height={plotH}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) {
              const x = getX(i);
              return (
                <text key={`x-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="monospace">
                  {d.date.slice(5)}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
};

// ─── Vietnam Market Psychology Gauge ─────────────────────────────────────────
const GAUGE_ZONES = [
  { max: 20, label: "Extreme Fear", color: "#b91c1c" },
  { max: 40, label: "Fear", color: "#ea580c" },
  { max: 60, label: "Neutral", color: "#64748b" },
  { max: 80, label: "Greed", color: "#16a34a" },
  { max: 100, label: "Extreme Greed", color: "#15803d" },
];
const zoneColor = (g: number) => (GAUGE_ZONES.find((z) => g <= z.max) || GAUGE_ZONES[2]).color;

const MiniZBar: React.FC<{ label: string; z: number | null }> = ({ label, z }) => {
  const v = z ?? 0;
  const pct = Math.max(-2, Math.min(2, v)) / 2; // -1..1
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px" }}>
      <span style={{ minWidth: "140px", color: "#64748b", fontWeight: 700 }}>{label}</span>
      <div style={{ flex: 1, height: "8px", background: "#f1f5f9", borderRadius: "4px", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "#cbd5e1" }} />
        <div
          style={{
            position: "absolute",
            left: pct >= 0 ? "50%" : `${50 + pct * 50}%`,
            width: `${Math.abs(pct) * 50}%`,
            top: 0,
            bottom: 0,
            background: v >= 0 ? "#16a34a" : "#ea580c",
            borderRadius: "4px",
          }}
        />
      </div>
      <span style={{ minWidth: "42px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: v >= 0 ? "#16a34a" : "#ea580c" }}>
        {z == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(2)}
      </span>
    </div>
  );
};

const MarketPsychologyPanel: React.FC<{ data: ObsPsychologyDay[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data || data.length === 0) {
    return (
      <div style={{ height: "200px", background: "#f8fafc", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "12px" }}>
        Chưa có dữ liệu — chạy scripts/build_market_psychology.py rồi restart server.
      </div>
    );
  }
  const view = data.slice(-45);
  const active = hoverIdx != null ? view[hoverIdx] : view[view.length - 1];
  const g = active.psychology_gauge ?? 50;

  // semicircle gauge geometry
  const cx = 130, cy = 130, r = 100;
  const angForG = (val: number) => Math.PI - (val / 100) * Math.PI; // 100 -> 0rad (right), 0 -> PI (left)
  const arc = (from: number, to: number) => {
    const a0 = angForG(from), a1 = angForG(to);
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const needleA = angForG(g);
  const nx = cx + (r - 14) * Math.cos(needleA), ny = cy - (r - 14) * Math.sin(needleA);

  // time-series chart
  const W = 760, H = 190, pL = 44, pR = 48, pT = 14, pB = 26;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const gauges = view.map((d) => d.psychology_gauge ?? 50);
  const vnis = view.map((d) => d.vnindex_close ?? 0);
  const minV = Math.min(...vnis) * 0.998, maxV = Math.max(...vnis) * 1.002;
  const gx = (i: number) => pL + (i / (view.length - 1)) * plotW;
  const gyG = (v: number) => pT + plotH - (v / 100) * plotH;
  const gyV = (v: number) => pT + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;
  const gaugeLine = view.map((d, i) => `${gx(i)},${gyG(d.psychology_gauge ?? 50)}`).join(" ");
  const vniLine = view.map((d, i) => `${gx(i)},${gyV(d.vnindex_close ?? 0)}`).join(" ");

  const fmtBn = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v)} tỷ`);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
      <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Activity size={15} color="#2563eb" />
        Vietnam Market Psychology Gauge — {active.trading_date}
      </div>
      <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "14px" }}>
        Composite z-score: retail attention/sentiment/FOMO/fear (CFA99 + Google Trends) + breadth + realized vol + drawdown + foreign flow
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px", alignItems: "center" }}>
        {/* Gauge */}
        <svg viewBox="0 0 260 160" style={{ width: "100%", maxWidth: "260px" }}>
          {GAUGE_ZONES.map((z, i) => {
            const from = i === 0 ? 0 : GAUGE_ZONES[i - 1].max;
            return <path key={z.label} d={arc(from, z.max)} fill="none" stroke={z.color} strokeWidth="16" strokeLinecap="butt" opacity={0.85} />;
          })}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="#0f172a" />
          <text x={cx} y={cy - 26} textAnchor="middle" style={{ fontSize: "30px", fontWeight: 900, fill: zoneColor(g), fontFamily: "monospace" }}>{Math.round(g)}</text>
          <text x={cx} y={cy + 2} textAnchor="middle" style={{ fontSize: "12px", fontWeight: 800, fill: "#475569" }}>
            {(active.psychology_label || "").replace("_", " ")}
          </text>
        </svg>

        {/* 5 retail indices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          <MiniZBar label="Retail Attention" z={active.idx_retail_attention} />
          <MiniZBar label="Retail Sentiment" z={active.idx_retail_sentiment} />
          <MiniZBar label="FOMO" z={active.idx_fomo} />
          <MiniZBar label="Fear / Capitulation" z={active.idx_fear_capitulation} />
          <MiniZBar label="Stock Attention" z={active.idx_stock_attention} />
        </div>
      </div>

      {/* Internals strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", margin: "14px 0 4px" }}>
        {[
          ["% mã > MA200", active.pct_above_ma200 == null ? "—" : `${active.pct_above_ma200.toFixed(0)}%`],
          ["Adv/Decline", active.adv_dec_ratio == null ? "—" : active.adv_dec_ratio.toFixed(2)],
          ["New H − L", active.nh_nl_diff == null ? "—" : String(active.nh_nl_diff)],
          ["Realized Vol 20D", active.realized_vol_20d == null ? "—" : `${active.realized_vol_20d.toFixed(0)}%`],
          ["Vol Ratio", active.vol_ratio_20d == null ? "—" : `${active.vol_ratio_20d.toFixed(2)}x`],
          ["Foreign net 5D", fmtBn(active.foreign_net_5d_bn)],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>{k}</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", fontFamily: "monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* time-series */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", marginTop: "6px" }} onMouseLeave={() => setHoverIdx(null)}>
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <line key={t} x1={pL} y1={gyG(t)} x2={W - pR} y2={gyG(t)} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        <polyline points={gaugeLine} fill="none" stroke="#2563eb" strokeWidth="2" />
        <polyline points={vniLine} fill="none" stroke="#f59e0b" strokeWidth="2" />
        {view.map((d, i) => (
          <rect key={i} x={gx(i) - plotW / view.length / 2} y={pT} width={plotW / view.length} height={plotH} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
        ))}
        {hoverIdx != null && <line x1={gx(hoverIdx)} y1={pT} x2={gx(hoverIdx)} y2={pT + plotH} stroke="#cbd5e1" strokeWidth="1" />}
        <text x={pL} y={H - 8} style={{ fontSize: "9px", fill: "#94a3b8" }}>{view[0].trading_date}</text>
        <text x={W - pR} y={H - 8} textAnchor="end" style={{ fontSize: "9px", fill: "#94a3b8" }}>{view[view.length - 1].trading_date}</text>
        <text x={6} y={gyG(100) + 3} style={{ fontSize: "9px", fill: "#2563eb", fontWeight: 700 }}>100</text>
        <text x={6} y={gyG(0) + 3} style={{ fontSize: "9px", fill: "#2563eb", fontWeight: 700 }}>0</text>
      </svg>
      <div style={{ display: "flex", gap: "16px", fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
        <span><span style={{ color: "#2563eb", fontWeight: 800 }}>■</span> Psychology Gauge</span>
        <span><span style={{ color: "#f59e0b", fontWeight: 800 }}>■</span> VN-Index</span>
        {!active.has_retail && <span style={{ color: "#ea580c" }}>· phiên này chưa có dữ liệu retail CFA99</span>}
      </div>
    </div>
  );
};

// ─── Main Observation Page ───────────────────────────────────────────────────
export const ObservationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [tasks, setTasks] = useState<ObsCollectionTask[]>([]);
  const [videos, setVideos] = useState<ObsVideo[]>([]);
  const [stats, setStats] = useState<ObsStats | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<ObsDailyMetric[]>([]);
  const [tickers, setTickers] = useState<ObsTickerMention[]>([]);
  const [divergence, setDivergence] = useState<ObsDivergence[]>([]);
  const [signals, setSignals] = useState<ObsSignalStat[]>([]);
  const [psychology, setPsychology] = useState<ObsPsychologyDay[]>([]);
  
  // Comments inspection modal
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [tickerComments, setTickerComments] = useState<ObsComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Status & Actions
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionType, setActionType] = useState<"success" | "error" | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, v, st, m, t, d, sig, p] = await Promise.all([
        fetchObsStatus().catch(() => ({ tasks: [] })),
        fetchObsVideos().catch(() => ({ videos: [], total: 0 })),
        fetchObsStats().catch(() => null),
        fetchObsDailyMetrics().catch(() => ({ metrics: [], total: 0 })),
        fetchObsTickerMentions().catch(() => ({ tickers: [], total: 0 })),
        fetchObsDivergence().catch(() => ({ divergence: [] })),
        fetchObsSignalBacktest().catch(() => ({ signals: [] })),
        fetchObsPsychology().catch(() => ({ series: [] as ObsPsychologyDay[] })),
      ]);
      setTasks(s.tasks);
      setVideos(v.videos);
      setStats(st);
      setDailyMetrics(m.metrics);
      setTickers(t.tickers);
      setDivergence(d.divergence);
      setSignals(sig.signals);
      setPsychology((p as { series: ObsPsychologyDay[] }).series || []);
    } catch (e) {
      console.error("Error refreshing observation data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Load comments when selected ticker changes
  useEffect(() => {
    if (!selectedTicker) return;
    setLoadingComments(true);
    fetchObsComments(selectedTicker, 25)
      .then((res) => setTickerComments(res.comments))
      .catch(() => setTickerComments([]))
      .finally(() => setLoadingComments(false));
  }, [selectedTicker]);

  const handleSeedBenchmark = async () => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await triggerObsSeedSample();
      setActionType("success");
      setActionMsg(res.message);
      await refreshAll();
    } catch (e: any) {
      setActionType("error");
      setActionMsg("❌ " + (e.message || "Lỗi khi tạo dữ liệu mẫu"));
    } finally {
      setLoading(false);
    }
  };

  const handleLiveCollect = async () => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await triggerObsCollect();
      setActionType("success");
      setActionMsg(res.message);
      await refreshAll();
    } catch (e: any) {
      setActionType("error");
      setActionMsg("❌ " + (e.message || "Lỗi khi trigger YouTube Data API"));
    } finally {
      setLoading(false);
    }
  };

  // Filter tickers
  const filteredTickers = useMemo(() => {
    if (!searchTerm.trim()) return tickers;
    return tickers.filter((t) => t.ticker.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tickers, searchTerm]);

  // Latest metrics snapshot
  const latest = dailyMetrics.length > 0 ? dailyMetrics[dailyMetrics.length - 1] : null;

  const SECTIONS = [
    { id: "psychology", label: "0. Market Psychology Gauge", icon: <Activity size={13} /> },
    { id: "overview", label: "Tổng Quan 3 Tầng", icon: <Layers size={13} /> },
    { id: "attention", label: "1. Market Attention", icon: <Eye size={13} /> },
    { id: "sentiment", label: "2. Retail Sentiment", icon: <TrendingUp size={13} /> },
    { id: "fomo", label: "3. FOMO / Fear (Z-Score)", icon: <AlertTriangle size={13} /> },
    { id: "heatmap", label: "4. Stock Heatmap & Top Movers", icon: <BarChart2 size={13} /> },
    { id: "divergence", label: "5. Analyst vs Audience", icon: <Users size={13} /> },
    { id: "backtest", label: "6. Signal Backtest (60D)", icon: <FlaskConical size={13} /> },
    { id: "raw_data", label: "Raw Data & DB", icon: <Database size={13} /> },
  ];

  return (
    <div
      className="page-wrapper animate-fade-in"
      style={{
        padding: "20px 28px 48px",
        maxWidth: "1480px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* ── Header Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)",
          borderRadius: "14px",
          padding: "22px 26px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
              flexShrink: 0,
            }}
          >
            <Youtube size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "19px", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", margin: 0 }}>
                CFA99 Retail Sentiment Monitor
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "#22c55e22",
                  color: "#4ade80",
                  border: "1px solid #22c55e44",
                }}
              >
                MVP 60 Ngày (30/06 → 30/08/2026)
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              Test Hypothesis: <em>“YouTube retail sentiment có liên quan/predict VN-Index hoặc cổ phiếu không?”</em>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Kênh: <strong style={{ color: "#93c5fd" }}>CFA99</strong> &nbsp;·&nbsp; Snapshot viewCount tracking &nbsp;·&nbsp; 3 Tầng: Raw Data → Sentiment Metrics → Market Relationship
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleSeedBenchmark}
            disabled={loading}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(6px)",
            }}
          >
            <Sparkles size={13} color="#facc15" />
            Tái Nạp Dữ Liệu Mẫu 60D
          </button>
          <button
            onClick={handleLiveCollect}
            disabled={loading}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#dc2626",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
            }}
          >
            <Play size={13} />
            Chạy Thu Thập Live API
          </button>
          <button
            onClick={refreshAll}
            style={{
              padding: "7px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMsg && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: actionType === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${actionType === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: actionType === "success" ? "#15803d" : "#b91c1c",
          }}
        >
          <span>{actionMsg}</span>
          <button
            onClick={() => setActionMsg("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Key Metrics HUD (10–15 Metrics) ── */}
      {latest && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <StatCard
            icon={<Eye />}
            label="Daily Views (T)"
            value={latest.total_views.toLocaleString()}
            sub={`Attention: ${latest.view_ratio}x median 20D`}
            badge={latest.view_ratio >= 1.3 ? "Hưng Phấn" : "Bình Thường"}
            badgeColor={latest.view_ratio >= 1.3 ? "#d97706" : "#2563eb"}
            color="#2563eb"
            bg="#eff6ff"
          />
          <StatCard
            icon={<MessageSquare />}
            label="Comment Intensity"
            value={`${latest.comment_intensity}`}
            sub="Comments / 1,000 Views"
            color="#0891b2"
            bg="#ecfeff"
          />
          <StatCard
            icon={<HelpCircle />}
            label="Question Intensity"
            value={`${latest.question_intensity}`}
            sub="Questions / 1,000 Views"
            color="#7c3aed"
            bg="#f5f3ff"
          />
          <StatCard
            icon={<TrendingUp />}
            label="Retail Bullish %"
            value={`${latest.bullish_pct}%`}
            sub={`Bearish: ${latest.bearish_pct}%`}
            badge={latest.bullish_pct > 50 ? "BULLISH" : "BEARISH"}
            badgeColor={latest.bullish_pct > 50 ? "#059669" : "#dc2626"}
            color="#059669"
            bg="#f0fdf4"
          />
          <StatCard
            icon={<AlertTriangle />}
            label="FOMO Z-Score"
            value={`${latest.fomo_z > 0 ? "+" : ""}${latest.fomo_z}σ`}
            sub={`Raw: ${latest.fomo_raw} | Fear: ${latest.fear_z}σ`}
            badge={Math.abs(latest.fomo_z) >= 2 ? "EXTREME" : Math.abs(latest.fomo_z) >= 1 ? "ELEVATED" : "NORMAL"}
            badgeColor={latest.fomo_z >= 1.5 ? "#d97706" : "#64748b"}
            color="#d97706"
            bg="#fff7ed"
          />
          <StatCard
            icon={<Activity />}
            label="VN-Index"
            value={`${latest.vnindex_close.toFixed(1)}`}
            sub={`Thay đổi: ${latest.vnindex_change_pct > 0 ? "+" : ""}${latest.vnindex_change_pct}%`}
            color="#2563eb"
            bg="#eff6ff"
          />
        </div>
      )}

      {/* ── Sub-Navigation Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          flexWrap: "wrap",
          background: "#fff",
          padding: "6px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
        }}
      >
        {SECTIONS.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "7px",
                border: "none",
                background: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#fff" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {s.icon}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════ TAB 0: MARKET PSYCHOLOGY GAUGE ══════════════════ */}
      {activeSection === "psychology" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <MarketPsychologyPanel data={psychology} />
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px", fontSize: "12px", color: "#475569", lineHeight: "1.7" }}>
            <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>Cách đọc</div>
            <div>· <b>Extreme Fear</b> (gauge &lt; 40) trong lịch sử ngắn đi kèm return VN-Index 5 phiên sau cao hơn baseline (~+1,2%, win 71%) — vùng gần capitulation.</div>
            <div>· <b>Greed</b> (gauge ≥ 60), nhất là khi đi cùng breadth yếu (&lt; 35% mã trên MA200), đi kèm return 5 phiên sau <b>âm</b> (~−1 đến −2%) — nhịp tăng hẹp.</div>
            <div>· Nguồn dữ liệu retail (CFA99) chỉ ~42 phiên nên FOMO/Fear index còn mỏng — composite hiện dựa nhiều vào breadth + volatility + foreign flow.</div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB: OVERVIEW (3-Layer Architecture) ══════════════════ */}
      {activeSection === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Architecture 3 Tầng Card */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={16} color="#2563eb" />
              Kiến Trúc Phân Tích 3 Tầng (3-Layer Quantitative Architecture)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#2563eb", marginBottom: "4px" }}>TẦNG 1</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>Raw Data Collection</div>
                <div style={{ fontSize: "11.5px", color: "#64748b", lineHeight: "1.6" }}>
                  Thu thập 44 livestream CFA99 (30/06 → 30/08/2026): Video metadata, ~12.000 raw comments, raw transcripts có timestamp và snapshot date.
                </div>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#7c3aed", marginBottom: "4px" }}>TẦNG 2</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>Sentiment & Attention Metrics</div>
                <div style={{ fontSize: "11.5px", color: "#64748b", lineHeight: "1.6" }}>
                  Chuẩn hóa Attention Ratio (views/median 20D), Comment intensity, phân loại 6 nhãn (Bullish, Bearish, FOMO, Fear, Uncertainty, Buy/Sell/Question), Z-score ±1σ/±2σ.
                </div>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#059669", marginBottom: "4px" }}>TẦNG 3</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>Market Relationship & Backtest</div>
                <div style={{ fontSize: "11.5px", color: "#64748b", lineHeight: "1.6" }}>
                  Đo lường phân kỳ Analyst vs Audience Divergence, kiểm định tương quan và tỷ suất sinh lời kỳ vọng 1D, 3D, 5D, 10D sau các tín hiệu cảm xúc cực đoan.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Dual Charts */}
          <AttentionChart data={dailyMetrics} />
          <SentimentMarketChart data={dailyMetrics} />
        </div>
      )}

      {/* ══════════════════ TAB 1: MARKET ATTENTION ══════════════════ */}
      {activeSection === "attention" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <AttentionChart data={dailyMetrics} />
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
              Công Thức Đo Lường Attention (Attention Metrics Formula)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", fontSize: "12px", color: "#475569" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong>A. View Attention Ratio:</strong>
                <div style={{ fontFamily: "monospace", color: "#2563eb", marginTop: "4px" }}>
                  View Ratio = Today's Views / Median(prev 20 streams)
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Ví dụ: &gt; 1.5x → sự quan tâm đột biến</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong>B. Comment Intensity:</strong>
                <div style={{ fontFamily: "monospace", color: "#0891b2", marginTop: "4px" }}>
                  Intensity = Comments / (Views / 1,000)
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Đo mức độ tương tác chủ động của viewer</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong>C. Comment Velocity:</strong>
                <div style={{ fontFamily: "monospace", color: "#7c3aed", marginTop: "4px" }}>
                  Velocity = Comments / Duration (hours)
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Chuẩn hóa theo độ dài livestream (1h vs 3h)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: RETAIL SENTIMENT ══════════════════ */}
      {activeSection === "sentiment" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <SentimentMarketChart data={dailyMetrics} />
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
              Quy Trình Phân Loại Bình Luận (Comment Classification Schema)
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.6" }}>
              Mỗi bình luận được AI bóc tách đa nhãn (Multi-label):
              <br />
              • <strong>Sentiment</strong>: BULLISH, BEARISH, NEUTRAL
              <br />
              • <strong>Emotion</strong>: FOMO, FEAR, UNCERTAINTY
              <br />
              • <strong>Intent</strong>: BUY, SELL, HOLD, QUESTION
              <br />
              • <strong>Ticker Detection</strong>: Tự động trích xuất mã cổ phiếu liên quan (FPT, HPG, NVL, VCB, VIC...).
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 3: FOMO / FEAR (Z-SCORE) ══════════════════ */}
      {activeSection === "fomo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <ZScoreChart data={dailyMetrics} />
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 18px", fontSize: "12px", color: "#92400e" }}>
            <strong>💡 Phương pháp chuẩn hóa Z-Score:</strong> Lưu trữ giá trị thực cùng 30D Rolling Mean và 30D Rolling Std.
            <div style={{ fontFamily: "monospace", marginTop: "4px" }}>
              Z = (Today's Value − 30D Mean) / 30D Std
            </div>
            Ngưỡng quy ước: <strong>Normal</strong> (&lt; 1σ), <strong>Elevated</strong> (1–2σ), <strong>Extreme</strong> (&gt; 2σ).
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 4: STOCK HEATMAP & TOP MOVERS ══════════════════ */}
      {activeSection === "heatmap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>
                  Bảng Quan Tâm Cổ Phiếu & Top Movers (Ticker Mentions Heatmap)
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Nhấn vào mã cổ phiếu để xem chi tiết bình luận và phân loại AI
                </div>
              </div>
              <div style={{ position: "relative", width: "220px" }}>
                <Search size={13} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "9px" }} />
                <input
                  type="text"
                  placeholder="Tìm mã (FPT, HPG...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Ticker", "Tổng Mentions", "Questions", "Bullish", "Bearish", "FOMO", "Fear", "Sentiment Score", "Δ Attention %", "Hành Động"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTickers.map((t) => {
                    const isPos = t.sentiment >= 0;
                    const isAttnUp = t.delta_attn > 0;
                    return (
                      <tr
                        key={t.ticker}
                        style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                        onClick={() => setSelectedTicker(t.ticker)}
                      >
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 900,
                              fontSize: "13px",
                              color: "#2563eb",
                              background: "#eff6ff",
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            {t.ticker}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700 }}>
                          {t.mentions.toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#64748b" }}>
                          {t.questions}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#059669", fontWeight: 700 }}>
                          {t.bullish_count}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>
                          {t.bearish_count}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#d97706" }}>
                          {t.fomo_count}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#ef4444" }}>
                          {t.fear_count}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "5px",
                              background: isPos ? "#f0fdf4" : "#fef2f2",
                              color: isPos ? "#059669" : "#dc2626",
                            }}
                          >
                            {isPos ? "+" : ""}{t.sentiment}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: "12px",
                              color: isAttnUp ? "#059669" : "#dc2626",
                            }}
                          >
                            {isAttnUp ? "+" : ""}{t.delta_attn}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicker(t.ticker);
                            }}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "5px",
                              border: "1px solid #e2e8f0",
                              background: "#f8fafc",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#2563eb",
                              cursor: "pointer",
                            }}
                          >
                            Xem Bình Luận
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 5: ANALYST VS AUDIENCE (DIVERGENCE) ══════════════════ */}
      {activeSection === "divergence" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "10px", padding: "14px 18px", fontSize: "12px", color: "#164e63" }}>
            <strong>Đo Lường Phân Kỳ Quan Điểm:</strong> Tách bạch <strong>Creator Sentiment</strong> (CFA99 nhận định gì trong transcript) vs <strong>Audience Sentiment</strong> (Viewer thảo luận trong comment). Khi xuất hiện phân kỳ lớn (Divergence &gt; 50), thường báo hiệu cơ hội bắt đáy hoặc rủi ro phân phối ngắn hạn.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "14px" }}>
            {divergence.map((row) => {
              const isHighDiverge = row.divergence >= 50;
              return (
                <div
                  key={row.ticker}
                  style={{
                    background: "#fff",
                    border: `1px solid ${isHighDiverge ? "#fed7aa" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    boxShadow: isHighDiverge ? "0 2px 8px rgba(217, 119, 6, 0.08)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "16px", color: "#1e293b" }}>
                      {row.ticker}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "5px",
                        background: isHighDiverge ? "#fff7ed" : "#f1f5f9",
                        color: isHighDiverge ? "#c2410c" : "#64748b",
                        border: `1px solid ${isHighDiverge ? "#fdba74" : "#e2e8f0"}`,
                      }}
                    >
                      Divergence: {row.divergence} {isHighDiverge && "⚠️ PHÂN KỲ"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Creator score */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>CFA99 (Creator):</span>
                      <span style={{ fontWeight: 800, color: row.creator >= 0 ? "#059669" : "#dc2626" }}>
                        {row.creator > 0 ? "+" : ""}{row.creator} (Khuyến nghị: {row.recommendation})
                      </span>
                    </div>
                    {/* Audience score */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>Audience (Viewer):</span>
                      <span style={{ fontWeight: 800, color: row.audience >= 0 ? "#059669" : "#dc2626" }}>
                        {row.audience > 0 ? "+" : ""}{row.audience} ({row.mentions} mentions)
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: "11.5px", color: "#475569", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    {row.summary}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 6: SIGNAL BACKTEST ══════════════════ */}
      {activeSection === "backtest" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "14px 18px", fontSize: "12px", color: "#581c87" }}>
            <strong>⚠ Lưu ý phương pháp luận:</strong> 60 ngày là bộ dữ liệu thăm dò ban đầu (Exploratory Testing) nhằm tìm ra hướng liên hệ giữa tâm lý retail và biến động giá, chưa phải là một chiến lược hoàn chỉnh khi chưa đủ 200+ observations.
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", marginBottom: "12px" }}>
              Bảng Thống Kê Hiệu Suất Tín Hiệu Forward Returns (1D, 3D, 5D, 10D)
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Tín Hiệu (Signal)", "Mô Tả", "Số Mẫu (N)", "Avg 1D Return", "Avg 3D Return", "Avg 5D Return", "Avg 10D Return", "Win Rate (5D)"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s) => (
                    <tr key={s.signal} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 800, color: "#1e293b" }}>
                        {s.signal}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "11.5px", color: "#64748b" }}>
                        {s.desc}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>
                        {s.n_obs}
                      </td>
                      {[s.r1d, s.r3d, s.r5d, s.r10d].map((val, idx) => (
                        <td key={idx} style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 800, color: val >= 0 ? "#059669" : "#dc2626" }}>
                          {val > 0 ? "+" : ""}{val}%
                        </td>
                      ))}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "5px",
                            background: s.win_rate >= 50 ? "#f0fdf4" : "#fef2f2",
                            color: s.win_rate >= 50 ? "#059669" : "#dc2626",
                          }}
                        >
                          {s.win_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 7: RAW DATA & POSTGRESQL DB ══════════════════ */}
      {activeSection === "raw_data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", marginBottom: "14px" }}>
              Danh Sách Video Livestream Thu Thập Được ({videos.length} videos)
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Video ID", "Tiêu Đề", "Ngày Phát", "Thời Lượng", "Views", "Likes", "Comments", "Snapshot"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {videos.slice(0, 15).map((v) => (
                    <tr key={v.video_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#2563eb" }}>
                        {v.video_id}
                      </td>
                      <td style={{ padding: "8px 12px", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.title}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#64748b" }}>
                        {v.published_at ? v.published_at.slice(0, 10) : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                        {Math.floor(v.duration_sec / 3600)}h{Math.floor((v.duration_sec % 3600) / 60)}m
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700 }}>
                        {v.views.toLocaleString()}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#059669" }}>
                        {v.likes.toLocaleString()}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#2563eb" }}>
                        {v.comments.toLocaleString()}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "10.5px", color: "#94a3b8" }}>
                        {v.snapshot_at ? v.snapshot_at.slice(0, 10) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ticker Comments Inspector ── */}
      {selectedTicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedTicker(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageCircle size={18} color="#2563eb" />
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>
                  Bình Luận Gốc Liên Quan Đến Mã {selectedTicker}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicker(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {loadingComments ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Đang tải bình luận...
                </div>
              ) : tickerComments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  Không tìm thấy bình luận nào nhắc tới {selectedTicker}.
                </div>
              ) : (
                tickerComments.map((c) => (
                  <div
                    key={c.comment_id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ fontSize: "12.5px", color: "#1e293b", lineHeight: "1.5" }}>
                      "{c.text}"
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: c.sentiment === "BULLISH" ? "#f0fdf4" : c.sentiment === "BEARISH" ? "#fef2f2" : "#f1f5f9",
                          color: c.sentiment === "BULLISH" ? "#15803d" : c.sentiment === "BEARISH" ? "#b91c1c" : "#475569",
                        }}
                      >
                        {c.sentiment}
                      </span>
                      {c.emotion !== "NONE" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "#fff7ed",
                            color: "#c2410c",
                          }}
                        >
                          {c.emotion}
                        </span>
                      )}
                      {c.intent !== "NONE" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                          }}
                        >
                          {c.intent}
                        </span>
                      )}
                      <span style={{ fontSize: "10.5px", color: "#94a3b8", marginLeft: "auto" }}>
                        👍 {c.likes} · {c.published_at ? c.published_at.slice(0, 16).replace("T", " ") : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
