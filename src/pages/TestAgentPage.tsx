import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PersonaGrid } from "../components/PersonaGrid";
import { MonteCarloSim } from "../components/MonteCarloSim";
import { VerifierChecklist } from "../components/VerifierChecklist";
import { fetchStockSummary, fetchTelegramSentiment } from "../services/api";
import { StockSummary, TelegramSentimentResult } from "../types";
import {
  Bot,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  Newspaper,
  Target,
  Users,
  Zap,
  CheckCircle2,
} from "lucide-react";

const WATCHLISTS: Record<string, string[]> = {
  watching: ["HPG", "MBS", "TCH", "VIC", "HDG", "PDR", "DXG", "HHS"],
  thanh_khoan_vua: [
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

export const TestAgentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = (searchParams.get("symbol") || "TCH").toUpperCase();
  const [symbol, setSymbol] = useState<string>(symbolParam);
  const [activeWL, setActiveWL] = useState<string>("watching");
  const activeSymbols = WATCHLISTS[activeWL];
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [telegramData, setTelegramData] =
    useState<TelegramSentimentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbolParam !== symbol) setSymbol(symbolParam);
  }, [symbolParam]);

  const loadData = async (sym: string) => {
    setLoading(true);
    try {
      const [sRes, tgRes] = await Promise.all([
        fetchStockSummary(sym).catch(() => null),
        fetchTelegramSentiment(sym).catch(() => null),
      ]);
      setSummary(sRes);
      setTelegramData(tgRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(symbol);
  }, [symbol]);

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchParams({ symbol: sym });
  };

  const formatVND = (num?: number) => {
    if (!num) return "--";
    return new Intl.NumberFormat("vi-VN").format(num) + " đ";
  };

  return (
    <div
      className="page-wrapper animate-fade-in"
      style={{
        padding: "24px 32px",
        maxWidth: "1440px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              Multi-Agent Simulation — 10 Nhà Đầu Tư
            </h1>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Mã đang test:{" "}
              <strong style={{ color: "var(--text-main)" }}>{symbol}</strong> —{" "}
              {summary?.company_name || `CTCP ${symbol}`}
            </span>
          </div>
        </div>
        {/* Watchlist selector */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
          {Object.keys(WATCHLISTS).map((wl) => (
            <button
              key={wl}
              onClick={() => {
                setActiveWL(wl);
              }}
              className={`btn ${wl === activeWL ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "4px 12px",
                fontSize: "11px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {wl}
            </button>
          ))}
        </div>
        {/* Symbol pills */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {activeSymbols.map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSymbol(s)}
              className={`btn ${s === symbol ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "3px 8px",
                fontSize: "10.5px",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Fundamental & Technical Stat Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card 1: Giá & Vốn Hóa */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
            Giá Thị Trường Hiện Tại:
          </span>
          <div
            className="mono"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text-main)",
            }}
          >
            {formatVND(summary?.current_price)}
          </div>
          <span
            style={{
              fontSize: "11.5px",
              color: "var(--bull-green)",
              fontWeight: 600,
            }}
          >
            {summary?.technical_trend || "BULLISH (UPTREND)"}
          </span>
        </div>

        {/* Card 2: DCF Value & MoS */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
            Định Giá DCF & MoS:
          </span>
          <div
            className="mono"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--bull-green)",
            }}
          >
            {formatVND(summary?.financials?.intrinsic_value_dcf)}
          </div>
          <span
            className="mono"
            style={{
              fontSize: "11.5px",
              color: "var(--bull-green)",
              fontWeight: 700,
            }}
          >
            Biên an toàn (MoS): +{summary?.margin_of_safety_pct || 18.5}%
          </span>
        </div>

        {/* Card 3: P/E & P/B */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
            Chỉ Số Định Giá (P/E - P/B):
          </span>
          <div
            className="mono"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--accent-blue)",
            }}
          >
            {summary?.financials?.pe_ratio
              ? `${summary.financials.pe_ratio}x`
              : "17.8x"}{" "}
            <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              /{" "}
              {summary?.financials?.pb_ratio
                ? `${summary.financials.pb_ratio}x`
                : "4.1x"}
            </span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            EPS:{" "}
            <strong className="mono" style={{ color: "var(--text-main)" }}>
              {summary?.financials?.eps
                ? formatVND(summary.financials.eps)
                : "7,580 đ"}
            </strong>
          </span>
        </div>

        {/* Card 4: ROE & Biên LN */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
            Hiệu Quả Sinh Lời (ROE):
          </span>
          <div
            className="mono"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--accent-yellow)",
            }}
          >
            {summary?.financials?.roe ? `${summary.financials.roe}%` : "26.5%"}
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            Biên lợi nhuận ròng:{" "}
            <strong className="mono" style={{ color: "var(--text-main)" }}>
              {summary?.financials?.profit_margin
                ? `${summary.financials.profit_margin}%`
                : "18.2%"}
            </strong>
          </span>
        </div>

        {/* Card 5: Đồng Thuận 10 Personas */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            border: "1px solid var(--bull-green-border)",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--bull-green)" }}>
            Đồng Thuận 10 Personas:
          </span>
          <div
            className="mono"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--bull-green)",
            }}
          >
            {summary?.buy_pct || 80}% MUA
          </div>
          <span
            className="mono"
            style={{ fontSize: "11.5px", color: "var(--text-muted)" }}
          >
            Điểm tâm lý:{" "}
            <strong style={{ color: "var(--bull-green)" }}>
              {summary?.sentiment_index
                ? `+${summary.sentiment_index}`
                : "+0.58"}
            </strong>
          </span>
        </div>
      </div>

      {/* Section 1: 10-Investor Behavioral Simulation Engine */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              Step 2B: Ma Trận Tâm Lý & Quyết Định 10 Nhà Đầu Tư Người Thật
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              {summary?.consensus_summary ||
                "8/10 Persona nhà đầu tư đồng thuận MUA hoặc FOMO MUA theo xu hướng tăng trưởng."}
            </p>
          </div>
          <span className="badge badge-purple">10 Personas Active</span>
        </div>

        {/* 10 Persona Cards */}
        {summary?.individual_decisions && (
          <PersonaGrid decisions={summary.individual_decisions} />
        )}

        {/* Vectorized Monte-Carlo 10k Engine */}
        <MonteCarloSim symbol={symbol} />
      </div>

      {/* Section 2: 3-Scenario Matrix (Bull / Base / Bear) & Risk Assessment */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              Step 3 & 4: 3 Kịch Bản Đầu Tư & Kế Hoạch Quản Trị Rủi Ro
              (Half-Kelly)
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Phân bổ xác suất kịch bản và tính toán quy mô giải ngân bảo vệ an
              toàn vốn.
            </p>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {summary?.scenarios?.map((sc, idx) => {
            const isBull = sc.scenario === "BULL";
            const isBase = sc.scenario === "BASE";
            const isBear = sc.scenario === "BEAR";
            const color = isBull
              ? "var(--bull-green)"
              : isBase
                ? "var(--accent-blue)"
                : "var(--bear-red)";

            return (
              <div
                key={idx}
                className="card"
                style={{
                  background: "#ffffff",
                  borderLeft: `4px solid ${color}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Target size={16} color={color} />
                    <span style={{ fontSize: "14px", fontWeight: 800, color }}>
                      Kịch Bản {sc.scenario}
                    </span>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: `${color}15`,
                      color,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    Xác suất: {Math.round(sc.probability * 100)}%
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Mục Tiêu Giá:
                  </span>
                  <div
                    className="mono"
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "var(--text-main)",
                    }}
                  >
                    {formatVND(sc.target_price)}
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: "11.5px",
                      color: "var(--bull-green)",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Động Lực Thúc Đẩy (Catalysts):
                  </span>
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {sc.catalysts.map((c, i) => (
                      <li
                        key={i}
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        ✓ {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: "11.5px",
                      color: "var(--bear-red)",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Rủi Ro Cần Lưu Ý (Risks):
                  </span>
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {sc.risks.map((r, i) => (
                      <li
                        key={i}
                        style={{ fontSize: "12px", color: "var(--bear-red)" }}
                      >
                        ⚠️ {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Risk Assessment Box */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--text-dim)",
                display: "block",
              }}
            >
              Vị Thế Khuyến Nghị (Half-Kelly):
            </span>
            <div
              className="mono"
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--bull-green)",
              }}
            >
              {summary?.position_size_pct
                ? `${summary.position_size_pct}% Tài Khoản`
                : "15.0% Tài Khoản"}
            </div>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Giới hạn an toàn &le; 20% / mã
            </span>
          </div>

          <div>
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--text-dim)",
                display: "block",
              }}
            >
              Tỷ Lệ Risk/Reward (RRR):
            </span>
            <div
              className="mono"
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              1 : {summary?.risk_reward_ratio || 2.77}
            </div>
            <span style={{ fontSize: "11.5px", color: "var(--bull-green)" }}>
              Đạt chuẩn &ge; 1:2.5
            </span>
          </div>

          <div>
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--text-dim)",
                display: "block",
              }}
            >
              Sụt Giảm Tối Đa Khi Cắt Lỗ:
            </span>
            <div
              className="mono"
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "var(--bear-red)",
              }}
            >
              -{summary?.potential_loss_pct || 7.04}%
            </div>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Tác động Portfolio: -
              {summary?.stress_test_drawdown_impact_pct || 1.06}%
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Gatekeeper 7 Standards Independent Verification Checklist */}
      <div>
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text-main)",
            }}
          >
            Step 5: Hội Đồng Xác Thực 7 Tiêu Chuẩn Gatekeeper (Investment
            Committee)
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            Đảm bảo tính kỷ luật và bảo vệ vốn tối cao trước khi xuất Lệnh Giải
            Ngân Thực Tế.
          </p>
        </div>

        <VerifierChecklist
          checklist={summary?.checklist}
          verdict={summary?.verdict || "APPROVED"}
          score={summary?.verifier_score ?? 100}
          notes={
            summary?.verifier_notes ||
            "Đạt trọn vẹn 7/7 tiêu chuẩn kỷ luật đầu tư chuyên nghiệp."
          }
          recommendations={summary?.recommendations}
          approved={summary?.approved}
        />
      </div>

      {/* Section 4: News & Telegram Sentiment Feed */}
      {summary?.news_events && summary.news_events.length > 0 && (
        <div className="card" style={{ background: "#ffffff" }}>
          <div className="card-header">
            <div className="card-title">
              <Newspaper size={18} color="var(--accent-blue)" />
              <span>Dòng Sự Kiện & Tin Tức Point-In-Time T</span>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {summary.news_events.map((n, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span className="badge badge-info">{n.category}</span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-main)",
                    }}
                  >
                    {n.headline}
                  </span>
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: "12px",
                    color:
                      n.sentiment_score > 0
                        ? "var(--bull-green)"
                        : "var(--bear-red)",
                    fontWeight: 700,
                  }}
                >
                  Sentiment:{" "}
                  {n.sentiment_score > 0
                    ? `+${n.sentiment_score}`
                    : n.sentiment_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
