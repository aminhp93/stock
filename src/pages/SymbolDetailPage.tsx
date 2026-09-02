import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BarChart3, Activity, Users, ShieldCheck } from "lucide-react";
import { StockChart } from "../components/StockChart";
import {
  fetchChartData,
  fetchStockSummary,
  fetchTelegramSentiment,
  fetchTickerSignals,
  TickerSignals,
} from "../services/api";
import {
  ChartDataPoint,
  StockSummary,
  TelegramSentimentResult,
} from "../types";
import { WATCHLISTS } from "../data/watchlists";

type DetailTab = "overview" | "technical" | "sentiment" | "raw";

const QUICK_SYMBOLS = ["VND", "MBS", "TCH", "HDG", "PDR", "VNINDEX"];

function getStartDate(range: string): string {
  const now = new Date();
  const date = new Date(now);
  if (range === "1M") date.setMonth(date.getMonth() - 1);
  else if (range === "3M") date.setMonth(date.getMonth() - 3);
  else if (range === "6M") date.setMonth(date.getMonth() - 6);
  else if (range === "1Y") date.setFullYear(date.getFullYear() - 1);
  else if (range === "3Y") date.setFullYear(date.getFullYear() - 3);
  else if (range === "5Y") date.setFullYear(date.getFullYear() - 5);
  else return "2018-01-01";
  return date.toISOString().split("T")[0];
}

export const SymbolDetailPage: React.FC = () => {
  const params = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const paramSymbol = (params.symbol || "VND").toUpperCase();

  const [symbol, setSymbol] = useState(paramSymbol);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [signals, setSignals] = useState<TickerSignals | null>(null);
  const [telegramData, setTelegramData] =
    useState<TelegramSentimentResult | null>(null);
  const [range, setRange] = useState("1Y");
  const [tab, setTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [input, setInput] = useState(paramSymbol);

  const allSymbols = useMemo(
    () =>
      Array.from(
        new Set([...QUICK_SYMBOLS, ...WATCHLISTS.flatMap((w) => w.symbols)]),
      ),
    [],
  );

  useEffect(() => {
    setSymbol(paramSymbol);
    setInput(paramSymbol);
  }, [paramSymbol]);

  useEffect(() => {
    let cancelled = false;
    const startDate = getStartDate(range);
    setLoading(true);

    fetchChartData(symbol, startDate)
      .then((res) => {
        if (!cancelled) setChartData(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setChartData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetchStockSummary(symbol)
      .then((v) => !cancelled && setSummary(v))
      .catch(() => !cancelled && setSummary(null));
    fetchTickerSignals(symbol)
      .then((v) => !cancelled && setSignals(v && !v.error ? v : null))
      .catch(() => !cancelled && setSignals(null));
    fetchTelegramSentiment(symbol)
      .then((v) => !cancelled && setTelegramData(v))
      .catch(() => !cancelled && setTelegramData(null));

    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  const latestBar =
    chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const priceText = latestBar?.close ?? summary?.current_price;

  const formatNumber = (value?: number | null, isCurrency = false) => {
    if (value == null) return "--";
    if (symbol === "VNINDEX")
      return value.toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (isCurrency) return `${value.toLocaleString("vi-VN")} đ`;
    return value.toLocaleString("vi-VN");
  };

  const goSymbol = (next: string) => {
    const sym = next.trim().toUpperCase();
    if (!sym) return;
    navigate(`/finance/stock/symbol/${sym}`);
  };

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <div
        className="card"
        style={{
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={16} color="var(--accent-blue)" />
            <strong style={{ fontSize: "15px" }}>Chi tiết Symbol</strong>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            {symbol} · {summary?.company_name || "Đang tải thông tin"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {QUICK_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => goSymbol(s)}
              className={`btn ${s === symbol ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {s}
            </button>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && goSymbol(input)}
            list="symbol-options"
            placeholder="Nhập mã..."
            style={{
              width: "150px",
              height: "30px",
              border: "1px solid #cbd5e1",
              borderRadius: "7px",
              padding: "0 10px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
            }}
          />
          <datalist id="symbol-options">
            {allSymbols.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button
            onClick={() => goSymbol(input)}
            className="btn btn-primary"
            style={{ padding: "4px 10px", fontSize: "12px" }}
          >
            Xem
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`btn ${r === range ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 9px", fontSize: "11px" }}
            >
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setShowMA20((v) => !v)}
            className="btn btn-secondary"
            style={{ padding: "3px 8px", fontSize: "11px" }}
          >
            MA20
          </button>
          <button
            onClick={() => setShowMA50((v) => !v)}
            className="btn btn-secondary"
            style={{ padding: "3px 8px", fontSize: "11px" }}
          >
            MA50
          </button>
          <button
            onClick={() => setShowRSI((v) => !v)}
            className="btn btn-secondary"
            style={{ padding: "3px 8px", fontSize: "11px" }}
          >
            RSI
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        <StockChart
          data={chartData}
          symbol={symbol}
          range={range}
          loading={loading}
          showMA20={showMA20}
          showMA50={showMA50}
          showRSI={showRSI}
        />
      </div>

      <div className="card" style={{ padding: "12px 14px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <div style={{ fontSize: "22px", fontWeight: 800 }}>
            {formatNumber(priceText, true)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Dữ liệu nến: {chartData.length} phiên · Cập nhật:{" "}
            {summary?.timestamp || signals?.as_of || "--"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              key: "overview",
              label: "Tổng quan",
              icon: <ShieldCheck size={13} />,
            },
            {
              key: "technical",
              label: "Kỹ thuật",
              icon: <Activity size={13} />,
            },
            { key: "sentiment", label: "Tâm lý", icon: <Users size={13} /> },
            {
              key: "raw",
              label: "Nến gần nhất",
              icon: <BarChart3 size={13} />,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as DetailTab)}
              className={`btn ${tab === t.key ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                display: "inline-flex",
                gap: "5px",
                alignItems: "center",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Gatekeeper
              </div>
              <div style={{ fontWeight: 800 }}>{summary?.verdict || "--"}</div>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>
                {summary?.recommendation || "--"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  marginTop: "4px",
                  color: "var(--text-muted)",
                }}
              >
                Score: {summary?.verifier_score ?? "--"}/100
              </div>
            </div>
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Risk/Reward
              </div>
              <div style={{ fontWeight: 800 }}>
                1 : {summary?.risk_reward_ratio ?? "--"}
              </div>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>
                Entry:{" "}
                {summary?.entry_zone
                  ? `${formatNumber(summary.entry_zone[0], true)} - ${formatNumber(summary.entry_zone[1], true)}`
                  : "--"}
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Stop Loss: {formatNumber(summary?.stop_loss, true)}
              </div>
            </div>
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Định giá
              </div>
              <div style={{ fontWeight: 800 }}>
                MoS: {summary?.margin_of_safety_pct ?? "--"}%
              </div>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>
                P/E: {summary?.financials?.pe_ratio ?? "--"}
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                P/B: {summary?.financials?.pb_ratio ?? "--"}
              </div>
            </div>
          </div>
        )}

        {tab === "technical" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Moving Averages
              </div>
              <div style={{ fontSize: "12px" }}>
                MA20: {formatNumber(signals?.technical.ma20, true)}
              </div>
              <div style={{ fontSize: "12px" }}>
                MA50: {formatNumber(signals?.technical.ma50, true)}
              </div>
              <div style={{ fontSize: "12px" }}>
                MA200: {formatNumber(signals?.technical.ma200, true)}
              </div>
            </div>
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Reward / Risk
              </div>
              <div style={{ fontSize: "12px" }}>
                Support: {formatNumber(signals?.reward_risk.support, true)}
              </div>
              <div style={{ fontSize: "12px" }}>
                Resistance gần:{" "}
                {formatNumber(signals?.reward_risk.resistance_near, true)}
              </div>
              <div style={{ fontSize: "12px" }}>
                R/R: 1:{signals?.reward_risk.rr ?? "--"}
              </div>
            </div>
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Momentum
              </div>
              <div style={{ fontSize: "12px" }}>
                RSI(14): {signals?.technical.rsi_14 ?? "--"}
              </div>
              <div style={{ fontSize: "12px" }}>
                Từ đỉnh 52W: {signals?.technical.pct_from_high_52w ?? "--"}%
              </div>
              <div style={{ fontSize: "12px" }}>
                Thanh khoản 20D: {signals?.liquidity.turnover_20d_bn ?? "--"} tỷ
              </div>
            </div>
          </div>
        )}

        {tab === "sentiment" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Telegram
              </div>
              <div style={{ fontSize: "12px" }}>
                Sentiment: {telegramData?.sentiment_label || "--"}
              </div>
              <div style={{ fontSize: "12px" }}>
                Euphoria: {telegramData?.euphoria_percentage ?? "--"}%
              </div>
              <div style={{ fontSize: "12px" }}>
                Panic: {telegramData?.panic_percentage ?? "--"}%
              </div>
            </div>
            <div className="card" style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                10 Personas
              </div>
              <div style={{ fontSize: "12px" }}>
                Buy: {summary?.buy_pct ?? "--"}%
              </div>
              <div style={{ fontSize: "12px" }}>
                Hold: {summary?.hold_pct ?? "--"}%
              </div>
              <div style={{ fontSize: "12px" }}>
                Sell: {summary?.sell_pct ?? "--"}%
              </div>
            </div>
          </div>
        )}

        {tab === "raw" && (
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
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {[
                    "Ngày",
                    "Open",
                    "High",
                    "Low",
                    "Close",
                    "Volume",
                    "RSI",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        color: "#64748b",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData
                  .slice(-12)
                  .reverse()
                  .map((r) => (
                    <tr
                      key={r.time}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td
                        style={{
                          padding: "8px",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {r.time}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {formatNumber(r.open, true)}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {formatNumber(r.high, true)}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {formatNumber(r.low, true)}
                      </td>
                      <td style={{ padding: "8px", fontWeight: 700 }}>
                        {formatNumber(r.close, true)}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {formatNumber(r.volume)}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {r.rsi?.toFixed(1) ?? "--"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
