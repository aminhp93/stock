import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StockChart } from "../components/StockChart";
import { TelegramModal } from "../components/TelegramModal";
import {
  fetchChartData,
  fetchStockSummary,
  fetchTelegramSentiment,
  fetchFullResync,
  fetchTickerSignals,
  TickerSignals,
} from "../services/api";
import {
  ChartDataPoint,
  StockSummary,
  TelegramSentimentResult,
} from "../types";
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Send,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const WATCHLIST = {
  id: 4611155,
  name: "watching",
  symbols: ["HPG", "MBS", "TCH", "VIC", "HDG", "PDR", "DXG", "HHS"],
};

const WATCHLIST_THANH_KHOAN_VUA = {
  id: 4609911,
  name: "thanh_khoan_vua",
  symbols: [
    "AAA",
    "AAS",
    "ACB",
    "ACV",
    "AGR",
    "ANV",
    "BAF",
    "BCM",
    "BID",
    "BMI",
    "BSR",
    "BVB",
    "BVH",
    "CEO",
    "CII",
    "CSV",
    "CTD",
    "CTG",
    "CTI",
    "CTR",
    "CTS",
    "DBC",
    "DCM",
    "DDV",
    "DGC",
    "DGW",
    "DIG",
    "DPG",
    "DPM",
    "DPR",
    "DXG",
    "DXS",
    "E1VFVN30",
    "EIB",
    "ELC",
    "EVF",
    "EVG",
    "FCN",
    "FPT",
    "FTS",
    "GAS",
    "GEL",
    "GEX",
    "GMD",
    "GVR",
    "HAG",
    "HAH",
    "HBC",
    "HCM",
    "HDB",
    "HDC",
    "HDG",
    "HHP",
    "HHS",
    "HHV",
    "HPG",
    "HPX",
    "HQC",
    "HSG",
    "HT1",
    "HUT",
    "HVN",
    "IDC",
    "IDI",
    "IJC",
    "KBC",
    "KDH",
    "KHG",
    "KSB",
    "LAS",
    "LCG",
    "LPB",
    "MBB",
    "MBS",
    "MSB",
    "MSN",
    "MSR",
    "MWG",
    "NAB",
    "NKG",
    "NLG",
    "NT2",
    "NVL",
    "OCB",
    "OIL",
    "ORS",
    "PAN",
    "PC1",
    "PDR",
    "PET",
    "PLC",
    "PLX",
    "PNJ",
    "POW",
    "PVC",
    "PVD",
    "PVP",
    "PVS",
    "PVT",
    "SAB",
    "SCR",
    "SHB",
    "SHI",
    "SHS",
    "SSB",
    "SSI",
    "STB",
    "SZC",
    "TCB",
    "TCH",
    "TCM",
    "TCX",
    "TNG",
    "TPB",
    "TTF",
    "TV2",
    "TVN",
    "VCB",
    "VCG",
    "VCI",
    "VCK",
    "VDS",
    "VEA",
    "VFS",
    "VGC",
    "VGI",
    "VGS",
    "VGT",
    "VHC",
    "VHM",
    "VIB",
    "VIC",
    "VIX",
    "VJC",
    "VND",
    "VNM",
    "VOS",
    "VPB",
    "VPI",
    "VPX",
    "VRE",
    "VSC",
    "VTP",
    "VTZ",
    "YEG",
  ],
};

const GAUGE_C = (g: number) =>
  g < 20 ? "#b91c1c" : g < 40 ? "#ea580c" : g < 60 ? "#64748b" : g < 80 ? "#16a34a" : "#15803d";
const GAUGE_VN = (l: string) =>
  ({ EXTREME_FEAR: "Sợ hãi tột độ", FEAR: "Sợ hãi", NEUTRAL: "Trung tính", GREED: "Tham lam", EXTREME_GREED: "Tham lam tột độ" } as Record<string, string>)[l] || l;
const vnd = (n?: number | null) => (n == null ? "--" : n.toLocaleString("vi-VN"));

// Dải Reward/Risk + Tâm lý theo mã — luôn cập nhật theo symbol đang chọn
const SignalStrip: React.FC<{ s: TickerSignals | null }> = ({ s }) => {
  if (!s) {
    return (
      <div style={{ padding: "8px 20px", fontSize: "11px", color: "var(--text-dim)", borderBottom: "1px solid var(--border-color)", background: "#fbfbfa" }}>
        Đang tính reward/risk & tâm lý…
      </div>
    );
  }
  const rr = s.reward_risk, t = s.technical, se = s.sentiment;
  // vị trí giá giữa hỗ trợ và kháng cự gần
  const span = rr.resistance_near - rr.support;
  const pos = span > 0 ? Math.max(0, Math.min(1, (s.price - rr.support) / span)) : 0.5;
  const Badge: React.FC<{ ok: boolean; children: React.ReactNode }> = ({ ok, children }) => (
    <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: ok ? "var(--bull-green-bg)" : "#f1f5f9", color: ok ? "var(--bull-green)" : "#94a3b8" }}>{children}</span>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", padding: "9px 20px", borderBottom: "1px solid var(--border-color)", background: "#fbfbfa", fontFamily: "'Inter', sans-serif" }}>
      {/* Tâm lý mã */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-dim)", fontWeight: 700 }}>TÂM LÝ MÃ</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 900, color: GAUGE_C(se.composite_gauge) }}>{Math.round(se.composite_gauge)}</span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: GAUGE_C(se.composite_gauge) }}>{GAUGE_VN(se.label)}</span>
        <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>(kỹ thuật {se.technical_score}{s.cfa99.mentions_60d >= 3 ? ` + CFA99 ${s.cfa99.net_bull_pct! > 0 ? "+" : ""}${s.cfa99.net_bull_pct}%` : ""})</span>
      </div>
      {/* R/R */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-dim)", fontWeight: 700 }}>R/R</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 800, color: rr.valid ? "var(--bull-green)" : "var(--bear-red)" }}>
          1 : {rr.rr ?? "--"}
        </span>
        <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>→ xa 1 : {rr.rr_far ?? "--"}</span>
        <Badge ok={rr.valid}>{rr.valid ? "≥ 2 ✓" : "< 2"}</Badge>
      </div>
      {/* mini R/R bar */}
      <div style={{ flex: "1 1 220px", minWidth: "180px" }}>
        <div style={{ position: "relative", height: "8px", borderRadius: "4px", background: "linear-gradient(90deg,#fecaca,#e2e8f0,#bbf7d0)" }}>
          <div style={{ position: "absolute", left: `${pos * 100}%`, top: "-3px", width: "2px", height: "14px", background: "#0f172a" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--text-dim)", marginTop: "2px", fontFamily: "'JetBrains Mono', monospace" }}>
          <span>HT {vnd(rr.support)} (−{rr.risk_pct}%)</span>
          <span>KC {vnd(rr.resistance_near)} (+{rr.reward_pct}%)</span>
        </div>
      </div>
      {/* posture */}
      <div style={{ display: "flex", gap: "4px" }}>
        <Badge ok={t.above_ma20}>MA20</Badge>
        <Badge ok={t.above_ma50}>MA50</Badge>
        <Badge ok={t.above_ma200}>MA200</Badge>
      </div>
      <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
        đỉnh 52T {t.pct_from_high_52w}% · GTGD {s.liquidity.turnover_20d_bn} tỷ
        {s.foreign?.room_left_pct != null && ` · room NN ${s.foreign.room_left_pct}%`}
        <span style={{ marginLeft: "6px", color: "#cbd5e1" }}>· {s.as_of}</span>
      </div>
    </div>
  );
};

// nút "Chi tiết" cho từng thẻ + block liệt kê số liệu thô để review/verify
const DetailToggle: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
  <button
    onClick={onClick}
    style={{
      fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px",
      border: "1px solid var(--border-color)", background: open ? "#eef2ff" : "#fff",
      color: open ? "#4338ca" : "var(--text-muted)", cursor: "pointer",
    }}
  >
    {open ? "Ẩn ▲" : "Chi tiết ▾"}
  </button>
);

const KV: React.FC<{ k: string; v: React.ReactNode; warn?: boolean }> = ({ k, v, warn }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px dotted var(--border-color)", fontSize: "11.5px" }}>
    <span style={{ color: "var(--text-muted)" }}>{k}</span>
    <span className="mono" style={{ fontWeight: 700, color: warn ? "var(--bear-red)" : "var(--text-main)" }}>{v}</span>
  </div>
);

const DetailBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginTop: "10px", padding: "10px 12px", background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
    <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-dim)", marginBottom: "4px", letterSpacing: "0.04em" }}>
      SỐ LIỆU THÔ ĐỂ ĐỐI CHIẾU
    </div>
    {children}
  </div>
);

export const ChartPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = (searchParams.get("symbol") || "TCH").toUpperCase();

  const [symbol, setSymbol] = useState<string>(symbolParam);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [signals, setSignals] = useState<TickerSignals | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [telegramData, setTelegramData] =
    useState<TelegramSentimentResult | null>(null);
  const [isTgModalOpen, setIsTgModalOpen] = useState(false);
  const [range, setRange] = useState<string>("1Y");
  const [loading, setLoading] = useState(true);
  const [showMA20, setShowMA20] = useState(false);
  const [showMA50, setShowMA50] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");

  const handleFullResync = async () => {
    setResyncing(true);
    setResyncMsg(null);
    try {
      const res = await fetchFullResync(symbol);
      setResyncMsg(`✅ ${res.message}`);
      loadData(symbol, range);
    } catch (e: any) {
      setResyncMsg(`❌ ${e.message}`);
    } finally {
      setResyncing(false);
      setTimeout(() => setResyncMsg(null), 8000);
    }
  };

  // Sync symbol with URL param
  useEffect(() => {
    if (symbolParam !== symbol) {
      setSymbol(symbolParam);
    }
  }, [symbolParam]);

  const loadData = async (sym: string, timeRange: string) => {
    setLoading(true);
    const now = new Date();
    let startDate = "2018-01-01";

    if (timeRange === "1M") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "3M") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "6M") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "1Y") {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "3Y") {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 3);
      startDate = d.toISOString().split("T")[0];
    } else if (timeRange === "5Y") {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      startDate = d.toISOString().split("T")[0];
    } else {
      startDate = "2018-01-01"; // ALL
    }

    // 1. Tải nến giá TradingView NGAY LẬP TỨC (Không chờ Telegram hay Summary)
    fetchChartData(sym, startDate)
      .then((cRes) => {
        setChartData(cRes.data || []);
      })
      .catch((err) => {
        console.error("Lỗi nến chart:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Tải tóm tắt AI Gatekeeper & MoS chạy nền bất đồng bộ
    setSummary(null);
    fetchStockSummary(sym)
      .then(setSummary)
      .catch((err) => console.error("Lỗi summary:", err));

    // 2b. Reward/Risk + Tâm lý theo mã (dữ liệu thật) — cập nhật theo symbol
    setSignals(null);
    fetchTickerSignals(sym)
      .then((s) => setSignals(s && !s.error ? s : null))
      .catch((err) => console.error("Lỗi ticker-signals:", err));

    // 3. Tải Telegram Sentiment chạy nền độc lập
    fetchTelegramSentiment(sym)
      .then(setTelegramData)
      .catch((err) => console.error("Lỗi telegram sentiment:", err));
  };

  useEffect(() => {
    loadData(symbol, range);
  }, [symbol, range]);

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchParams({ symbol: sym });
    setSearchInput(sym);
  };

  const filteredThanhKhoanVua = WATCHLIST_THANH_KHOAN_VUA.symbols
    .filter((s) => s.includes(searchInput.trim().toUpperCase()))
    .slice(0, 18);

  const latestBar =
    chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const prevBar = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const priceChange =
    latestBar && prevBar
      ? ((latestBar.close - prevBar.close) / prevBar.close) * 100
      : 0;
  const isUp = priceChange >= 0;

  const formatVND = (num?: number) => {
    if (!num) return "--";
    return new Intl.NumberFormat("vi-VN").format(num) + " đ";
  };

  return (
    <div
      className="page-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
        overflow: "hidden",
        background: "#f8fafc",
      }}
    >
      {/* Sub-Header Control Bar */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid var(--border-color)",
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Watchlist + Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Hardcode Watchlist (watching) */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {WATCHLIST.symbols.map((s) => (
              <button
                key={s}
                onClick={() => handleSelectSymbol(s)}
                className={`btn ${s === symbol ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  borderColor: s === symbol ? undefined : "#ddd6fe",
                  color: s === symbol ? undefined : "#7c3aed",
                  background: s === symbol ? undefined : "#faf5ff",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search from watchlist thanh_khoan_vua */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                color="#64748b"
                style={{ position: "absolute", left: "8px", top: "7px" }}
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredThanhKhoanVua.length > 0) {
                    handleSelectSymbol(filteredThanhKhoanVua[0]);
                  }
                }}
                placeholder="Search mã... (VD: HPG)"
                style={{
                  width: "190px",
                  height: "28px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "7px",
                  padding: "0 10px 0 28px",
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "#ffffff",
                }}
              />

              {searchInput.trim() && (
                <div
                  style={{
                    position: "absolute",
                    top: "32px",
                    left: 0,
                    width: "280px",
                    maxHeight: "240px",
                    overflowY: "auto",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.12)",
                    zIndex: 30,
                    padding: "6px",
                  }}
                >
                  {filteredThanhKhoanVua.length > 0 ? (
                    filteredThanhKhoanVua.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSelectSymbol(s)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          background: s === symbol ? "#eff6ff" : "transparent",
                          color: s === symbol ? "#2563eb" : "#0f172a",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          fontSize: "12px",
                          padding: "7px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))
                  ) : (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        padding: "8px",
                      }}
                    >
                      Không có mã phù hợp trong watchlist.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeframe Range Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "#f1f5f9",
              padding: "3px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
            }}
          >
            {["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  background: range === r ? "#ffffff" : "transparent",
                  color:
                    range === r ? "var(--accent-blue)" : "var(--text-muted)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow:
                    range === r ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                }}
              >
                {r === "ALL" ? "ALL (5Y)" : r}
              </button>
            ))}
          </div>
          {/* Full Resync button — cần sau khi cổ phiếu chia cổ tức */}
          <button
            onClick={handleFullResync}
            disabled={resyncing}
            title="Xóa & tải lại toàn bộ dữ liệu đã điều chỉnh cổ tức từ VNDirect"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 700,
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: resyncing ? "#f1f5f9" : "#fff",
              color: resyncing ? "#94a3b8" : "#dc2626",
              cursor: resyncing ? "not-allowed" : "pointer",
            }}
          >
            {resyncing ? "⏳" : "🔄"} {resyncing ? "Đang resync..." : "Resync"}
          </button>
          {resyncMsg && (
            <span
              style={{
                fontSize: "11px",
                color: resyncMsg.startsWith("✅") ? "#16a34a" : "#dc2626",
                maxWidth: "260px",
              }}
            >
              {resyncMsg}
            </span>
          )}
        </div>
      </div>

      {/* Main Split Layout: Chart + Sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left: Chart Workspace */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            borderRight: "1px solid var(--border-color)",
            background: "#ffffff",
          }}
        >
          {/* Ticker Stats Bar */}
          <div
            style={{
              background: "#ffffff",
              borderBottom: "1px solid var(--border-color)",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "14px" }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "var(--text-main)",
                }}
              >
                {symbol}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--text-muted)",
                }}
              >
                {summary?.company_name || `CTCP ${symbol}`}
              </span>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                }}
              >
                {latestBar
                  ? formatVND(latestBar.close)
                  : summary?.current_price
                    ? formatVND(summary.current_price)
                    : "--"}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: isUp
                    ? "var(--bull-green-bg)"
                    : "var(--bear-red-bg)",
                  color: isUp ? "var(--bull-green)" : "var(--bear-red)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                {isUp ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownRight size={14} />
                )}
                {priceChange > 0
                  ? `+${priceChange.toFixed(2)}%`
                  : `${priceChange.toFixed(2)}%`}
              </span>
            </div>

            <div style={{ display: "flex", gap: "20px", fontSize: "12px" }}>
              <div>
                <span
                  style={{
                    color: "var(--text-dim)",
                    fontSize: "11px",
                    display: "block",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  MA20 (20 ngày)
                </span>
                <strong style={{ color: "var(--accent-blue)" }}>
                  {latestBar?.ma20 ? formatVND(latestBar.ma20) : "--"}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--text-dim)",
                    fontSize: "11px",
                    display: "block",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  MA50 (50 ngày)
                </span>
                <strong style={{ color: "var(--accent-orange)" }}>
                  {latestBar?.ma50 ? formatVND(latestBar.ma50) : "--"}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--text-dim)",
                    fontSize: "11px",
                    display: "block",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  RSI (14 ngày)
                </span>
                <strong style={{ color: "var(--accent-yellow)" }}>
                  {latestBar?.rsi
                    ? latestBar.rsi.toFixed(1)
                    : summary?.rsi
                      ? summary.rsi.toFixed(1)
                      : "--"}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--text-dim)",
                    fontSize: "11px",
                    display: "block",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Tổng Nến CSDL
                </span>
                <strong style={{ color: "var(--text-main)" }}>
                  {chartData.length} phiên
                </strong>
              </div>
            </div>
          </div>

          {/* Reward/Risk + Tâm lý theo mã */}
          <SignalStrip s={signals} />

          {/* Interactive Chart Canvas */}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {/* Indicator toggles */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "12px",
                zIndex: 10,
                display: "flex",
                gap: "6px",
              }}
            >
              {(
                [
                  {
                    label: "MA20",
                    active: showMA20,
                    toggle: () => setShowMA20((v) => !v),
                    color: "#2563eb",
                  },
                  {
                    label: "MA50",
                    active: showMA50,
                    toggle: () => setShowMA50((v) => !v),
                    color: "#ea580c",
                  },
                  {
                    label: "RSI",
                    active: showRSI,
                    toggle: () => setShowRSI((v) => !v),
                    color: "#d97706",
                  },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.toggle}
                  style={{
                    padding: "3px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    borderRadius: "5px",
                    cursor: "pointer",
                    border: `1.5px solid ${btn.color}`,
                    background: btn.active ? btn.color : "#fff",
                    color: btn.active ? "#fff" : btn.color,
                    transition: "all 0.15s",
                    opacity: btn.active ? 1 : 0.6,
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <StockChart
              data={chartData}
              symbol={symbol}
              loading={loading}
              showMA20={showMA20}
              showMA50={showMA50}
              showRSI={showRSI}
            />
          </div>
        </div>

        {/* Right: Sidebar HUD Panel */}
        <div
          style={{
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            padding: "16px",
            gap: "14px",
          }}
        >
          {/* Card 1: Gatekeeper Verdict & Plan */}
          <div
            className="card"
            style={{ padding: "16px", background: "#ffffff" }}
          >
            <div className="card-header" style={{ marginBottom: "12px" }}>
              <div className="card-title">
                <ShieldCheck size={16} color="var(--accent-blue)" />
                <span>Hội Đồng Xác Thực</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  className={`badge ${summary?.approved ? "badge-approved" : "badge-rejected"}`}
                >
                  {summary?.verdict || (summary ? "—" : "…")}
                </span>
                <DetailToggle open={openCard === "verdict"} onClick={() => setOpenCard(openCard === "verdict" ? null : "verdict")} />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Điểm Kỷ Luật:
                </span>
                <strong className="mono" style={{ color: "var(--bull-green)" }}>
                  {summary?.verifier_score ?? 100} / 100
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Khuyến Nghị:</span>
                <strong className="mono" style={{ color: "var(--text-main)" }}>
                  {summary?.recommendation || "BUY (MUA)"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Vùng Mua Entry:
                </span>
                <strong
                  className="mono"
                  style={{ color: "var(--accent-blue)" }}
                >
                  {summary?.entry_zone
                    ? `${formatVND(summary.entry_zone[0])} - ${formatVND(summary.entry_zone[1])}`
                    : "--"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Stop Loss:</span>
                <strong className="mono" style={{ color: "var(--bear-red)" }}>
                  {summary?.stop_loss ? formatVND(summary.stop_loss) : "--"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Take Profit 1:
                </span>
                <strong className="mono" style={{ color: "var(--bull-green)" }}>
                  {summary?.take_profit_1
                    ? formatVND(summary.take_profit_1)
                    : "--"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Vị Thế Kelly:
                </span>
                <strong className="mono" style={{ color: "var(--text-main)" }}>
                  {summary?.position_size_pct
                    ? `${summary.position_size_pct}% Portfolio`
                    : "15% Portfolio"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Tỷ Lệ Risk/Reward:
                </span>
                <strong
                  className="mono"
                  style={{ color: (summary?.risk_reward_ratio ?? 0) >= 2 ? "var(--bull-green)" : "var(--bear-red)" }}
                >
                  1 : {summary?.risk_reward_ratio ?? "--"}
                </strong>
              </div>
            </div>

            {openCard === "verdict" && (
              <DetailBox>
                <KV k="Nguồn plan" v="strategy_agent · dữ liệu đến" />
                <KV k="Ngày dữ liệu" v={signals?.as_of ?? summary?.timestamp ?? "--"} />
                <KV k="Giá hiện tại" v={vnd(signals?.price ?? summary?.current_price)} />
                <KV k="Hỗ trợ (đáy 20 phiên)" v={vnd(signals?.reward_risk.support)} />
                <KV k="Kháng cự gần (đỉnh 60 phiên)" v={vnd(signals?.reward_risk.resistance_near)} />
                <KV k="Kháng cự xa (đỉnh 120 phiên)" v={vnd(signals?.reward_risk.resistance_far)} />
                <KV k="Risk %" v={signals?.reward_risk.risk_pct != null ? `−${signals.reward_risk.risk_pct}%` : "--"} warn />
                <KV k="Reward % (gần / xa)" v={`+${signals?.reward_risk.reward_pct ?? "--"}% / +${signals?.reward_risk.reward_far_pct ?? "--"}%`} />
                <KV k="R/R gần → xa" v={`1:${signals?.reward_risk.rr ?? "--"} → 1:${signals?.reward_risk.rr_far ?? "--"}`} warn={!signals?.reward_risk.valid} />
                <KV k="Điểm kỷ luật" v={`${summary?.verifier_score ?? "--"} / 100`} />
                {(summary?.checklist || []).map((c: any, i: number) => (
                  <KV key={i} k={c.criterion} v={c.passed ? "OK" : "FAIL"} warn={!c.passed} />
                ))}
              </DetailBox>
            )}
          </div>

          {/* Card 2: 10-Investor Sentiment Meter */}
          <div
            className="card"
            style={{ padding: "16px", background: "#ffffff" }}
          >
            <div className="card-header" style={{ marginBottom: "10px" }}>
              <div className="card-title">
                <Users size={16} color="var(--accent-yellow)" />
                <span>Đồng Thuận 10 Investor</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  className="mono"
                  style={{
                    fontSize: "11px",
                    color: (summary?.sentiment_index ?? 0) >= 0 ? "var(--bull-green)" : "var(--bear-red)",
                    fontWeight: 700,
                  }}
                >
                  {summary?.sentiment_index != null
                    ? `${summary.sentiment_index > 0 ? "+" : ""}${summary.sentiment_index}`
                    : "…"}
                </span>
                <DetailToggle open={openCard === "consensus"} onClick={() => setOpenCard(openCard === "consensus" ? null : "consensus")} />
              </div>
            </div>

            <div
              className="meter-bar"
              style={{
                height: "10px",
                borderRadius: "5px",
                marginBottom: "8px",
              }}
            >
              <div
                className="meter-segment meter-buy"
                style={{ width: `${summary?.buy_pct || 80}%` }}
              ></div>
              <div
                className="meter-segment meter-hold"
                style={{ width: `${summary?.hold_pct || 20}%` }}
              ></div>
              <div
                className="meter-segment meter-sell"
                style={{ width: `${summary?.sell_pct || 0}%` }}
              ></div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--bull-green)" }}>
                MUA: {summary?.buy_pct ?? "--"}%
              </span>
              <span style={{ color: "#d97706" }}>
                GIỮ: {summary?.hold_pct ?? "--"}%
              </span>
              <span style={{ color: "var(--bear-red)" }}>
                BÁN: {summary?.sell_pct ?? "--"}%
              </span>
            </div>

            {openCard === "consensus" && (
              <DetailBox>
                <KV k="Panic %" v={`${summary?.panic_pct ?? "--"}%`} warn={(summary?.panic_pct ?? 0) > 20} />
                {(summary?.individual_decisions || []).map((d: any, i: number) => (
                  <KV
                    key={i}
                    k={`${d.persona_name}`}
                    v={`${d.action} · tin cậy ${d.confidence} · target ${d.expected_target_price ? vnd(d.expected_target_price) : "—"}`}
                    warn={String(d.action).toUpperCase().includes("SELL") || String(d.action).toUpperCase().includes("BÁN")}
                  />
                ))}
              </DetailBox>
            )}
          </div>

          {/* Card 3: Technical & MoS */}
          <div
            className="card"
            style={{ padding: "16px", background: "#ffffff" }}
          >
            <div className="card-header" style={{ marginBottom: "10px" }}>
              <div className="card-title">
                <TrendingUp size={16} color="var(--accent-orange)" />
                <span>Kỹ Thuật & Định Giá DCF</span>
              </div>
              <DetailToggle open={openCard === "tech"} onClick={() => setOpenCard(openCard === "tech" ? null : "tech")} />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Xu Hướng:</span>
                <strong style={{ color: summary?.is_uptrend ? "var(--bull-green)" : "var(--bear-red)" }}>
                  {summary?.technical_trend || "…"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Margin of Safety:
                </span>
                <strong
                  className="mono"
                  style={{ color: (summary?.margin_of_safety_pct ?? 0) >= 0 ? "var(--bull-green)" : "var(--bear-red)" }}
                >
                  {summary?.margin_of_safety_pct != null
                    ? `${summary.margin_of_safety_pct > 0 ? "+" : ""}${summary.margin_of_safety_pct}%`
                    : "--"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Trạng Thái RSI:
                </span>
                <strong className="mono" style={{ color: "var(--text-main)" }}>
                  {signals?.technical.rsi_14 ?? summary?.rsi ?? "--"}
                  {signals?.technical.rsi_14 != null &&
                    ` (${signals.technical.rsi_14 > 70 ? "Quá mua" : signals.technical.rsi_14 < 30 ? "Quá bán" : "Trung tính"})`}
                </strong>
              </div>
            </div>

            {openCard === "tech" && (
              <DetailBox>
                <KV k="Giá / MA20 / MA50 / MA200" v={`${vnd(signals?.price)} / ${vnd(signals?.technical.ma20)} / ${vnd(signals?.technical.ma50)} / ${vnd(signals?.technical.ma200)}`} />
                <KV k="Trên MA20 / 50 / 200" v={`${signals?.technical.above_ma20 ? "✓" : "✗"} / ${signals?.technical.above_ma50 ? "✓" : "✗"} / ${signals?.technical.above_ma200 ? "✓" : "✗"}`} warn={!signals?.technical.above_ma50} />
                <KV k="Đỉnh / Đáy 52 tuần" v={`${vnd(signals?.technical.high_52w)} / ${vnd(signals?.technical.low_52w)}`} />
                <KV k="Cách đỉnh / đáy 52T" v={`${signals?.technical.pct_from_high_52w ?? "--"}% / +${signals?.technical.pct_from_low_52w ?? "--"}%`} />
                <KV k="P/E · P/B" v={`${summary?.financials?.pe_ratio ?? "--"} · ${summary?.financials?.pb_ratio ?? "--"}`} />
                <KV k="ROE · Biên LN" v={`${summary?.financials?.roe ?? "--"} · ${summary?.financials?.profit_margin ?? "--"}`} />
                <KV k="Giá trị nội tại DCF" v={vnd(summary?.financials?.intrinsic_value_dcf)} />
                <KV k="Nợ / Vốn CSH" v={summary?.financials?.debt_to_equity ?? "--"} />
              </DetailBox>
            )}
          </div>

          {/* Card 4: Telegram Crowd Hype */}
          <div
            className="card"
            style={{ padding: "16px", background: "#ffffff" }}
          >
            <div className="card-header" style={{ marginBottom: "10px" }}>
              <div className="card-title">
                <Send size={16} color="#0088cc" />
                <span>Telegram Crowd Hype</span>
              </div>
              <button
                onClick={() => setIsTgModalOpen(true)}
                className="btn btn-secondary"
                style={{
                  padding: "2px 8px",
                  fontSize: "11px",
                  color: "#0088cc",
                  borderColor: "rgba(0, 136, 204, 0.3)",
                }}
              >
                🔍 Chi Tiết
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Hưng Phấn (Euphoria):
                </span>
                <strong
                  className="mono"
                  style={{ color: "var(--accent-yellow)" }}
                >
                  {telegramData?.euphoria_percentage || 42.5}%
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed var(--border-color)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  Đánh Giá Rủi Ro:
                </span>
                <strong style={{ color: "var(--bull-green)" }}>
                  {telegramData?.risk_assessment || "BÌNH THƯỜNG"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Bài Thảo Luận:
                </span>
                <strong className="mono" style={{ color: "var(--text-main)" }}>
                  {telegramData?.total_messages || 384} bài
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Modal */}
      {isTgModalOpen && (
        <TelegramModal
          data={telegramData}
          onClose={() => setIsTgModalOpen(false)}
        />
      )}
    </div>
  );
};
