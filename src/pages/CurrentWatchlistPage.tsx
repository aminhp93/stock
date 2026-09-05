import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Search } from "lucide-react";
import {
  fetchChartData,
  fetchTickerSignals,
  TickerSignals,
} from "../services/api";
import { ChartDataPoint } from "../types";

const HOLDING_SYMBOLS = ["MBS", "TCH", "HDG", "PDR"];
const WIN = 5;

/** Universe quét mã tiềm năng 1–2 tháng tới: mã đang cầm + peer cùng ngành (chứng khoán, BĐS). */
const SCAN_SYMBOLS = [
  "MBS",
  "TCH",
  "HDG",
  "PDR",
  "SSI",
  "VCI",
  "HCM",
  "VND",
  "VIX",
  "FTS",
  "SHS",
  "NLG",
  "KDH",
  "DXG",
  "DIG",
  "NVL",
  "KBC",
  "HDC",
];

interface SRResult {
  close: number;
  support: number | null;
  resistance: number | null;
  supportPct: number | null;
  resistancePct: number | null;
  rr: number | null;
  signal: "BUY" | "SELL" | "HOLD" | "WATCH";
  reason: string;
}

function calcSR(data: ChartDataPoint[]): SRResult | null {
  if (data.length < WIN * 2 + 1) return null;
  const current = data[data.length - 1].close;
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = WIN; i < data.length - WIN; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - WIN; j <= i + WIN; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isHigh = false;
      if (data[j].low <= data[i].low) isLow = false;
    }
    if (isHigh) highs.push(data[i].high);
    if (isLow) lows.push(data[i].low);
  }

  const cluster = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const merged: number[] = [];
    for (const value of sorted) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(value - last) / last < 0.015)
        merged[merged.length - 1] = (last + value) / 2;
      else merged.push(value);
    }
    return merged;
  };

  const resistances = cluster(highs)
    .filter((v) => v > current)
    .sort((a, b) => a - b);
  const supports = cluster(lows)
    .filter((v) => v < current)
    .sort((a, b) => b - a);

  const support = supports[0] ?? null;
  const resistance = resistances[0] ?? null;
  const supportPct =
    support == null ? null : ((support - current) / current) * 100;
  const resistancePct =
    resistance == null ? null : ((resistance - current) / current) * 100;
  const rr =
    supportPct != null && resistancePct != null && Math.abs(supportPct) > 0
      ? Math.abs(resistancePct) / Math.abs(supportPct)
      : null;

  let signal: SRResult["signal"] = "WATCH";
  let reason = "Chưa rõ cấu trúc";
  if (supportPct != null && resistancePct != null) {
    if (supportPct > -6 && (rr ?? 0) >= 2) {
      signal = "BUY";
      reason = `Gần hỗ trợ, R/R ${(rr ?? 0).toFixed(1)}x`;
    } else if (resistancePct < 5) {
      signal = "SELL";
      reason = "Gần kháng cự gần";
    } else if (resistancePct < 10) {
      signal = "HOLD";
      reason = "Đang ở vùng giữa";
    }
  }

  return {
    close: current,
    support,
    resistance,
    supportPct,
    resistancePct,
    rr,
    signal,
    reason,
  };
}

interface Row {
  symbol: string;
  loading: boolean;
  data: SRResult | null;
}

const SIGNAL_COLOR: Record<
  Row["data"] extends infer T
    ? T extends SRResult
      ? T["signal"]
      : never
    : never,
  string
> = {
  BUY: "#059669",
  SELL: "#dc2626",
  HOLD: "#d97706",
  WATCH: "#64748b",
};

/** Chấm điểm 1 mã để tìm cơ hội 1–2 tháng tới: R/R + cấu trúc MA + RSI. */
function scoreCandidate(s: TickerSignals) {
  const rr = s.reward_risk.rr ?? 0;
  const rsi = s.technical.rsi_14 ?? 50;
  let score = rr * 10;
  if (s.technical.above_ma20) score += 6;
  if (s.technical.above_ma50) score += 6;
  if (s.technical.above_ma200) score += 4;
  if (rsi > 70) score -= 12; // quá mua — hạn chế mua đuổi
  if (rsi < 30) score -= 4; // quá bán sâu — rủi ro gãy đáy tiếp
  return Math.round(score * 10) / 10;
}

/** Nhận định ngắn cho từng ứng viên tiềm năng. */
function candidateVerdict(s: TickerSignals): {
  text: string;
  tone: "pos" | "warn" | "neg";
} {
  const rr = s.reward_risk.rr ?? 0;
  const rsi = s.technical.rsi_14 ?? 50;
  if (rsi > 70)
    return { text: "Quá mua — chờ nhịp chỉnh trước khi mua", tone: "warn" };
  if (rr >= 2 && s.technical.above_ma20 && s.technical.above_ma50)
    return { text: "Đủ điều kiện mua tích luỹ", tone: "pos" };
  if (rr >= 2 && s.technical.above_ma20)
    return { text: "Mua thăm dò, chờ xác nhận MA50", tone: "pos" };
  if (rr >= 2)
    return {
      text: "R/R tốt nhưng dưới MA20 — chờ xác nhận xu hướng",
      tone: "warn",
    };
  if (rr < 1.3) return { text: "R/R yếu — chưa nên giải ngân", tone: "neg" };
  return { text: "Trung tính — theo dõi thêm", tone: "warn" };
}

const TONE_COLOR: Record<"pos" | "warn" | "neg", string> = {
  pos: "#059669",
  warn: "#d97706",
  neg: "#dc2626",
};

export const CurrentWatchlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>(
    HOLDING_SYMBOLS.map((symbol) => ({ symbol, loading: true, data: null })),
  );
  const [signals, setSignals] = useState<Record<string, TickerSignals | null>>(
    {},
  );

  useEffect(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const startDate = d.toISOString().split("T")[0];

    setRows(
      HOLDING_SYMBOLS.map((symbol) => ({ symbol, loading: true, data: null })),
    );

    HOLDING_SYMBOLS.forEach((symbol) => {
      fetchChartData(symbol, startDate)
        .then((res) => {
          const sr = calcSR(res.data || []);
          setRows((prev) =>
            prev.map((row) =>
              row.symbol === symbol
                ? { ...row, data: sr, loading: false }
                : row,
            ),
          );
        })
        .catch(() => {
          setRows((prev) =>
            prev.map((row) =>
              row.symbol === symbol ? { ...row, loading: false } : row,
            ),
          );
        });
    });

    SCAN_SYMBOLS.forEach((symbol) => {
      fetchTickerSignals(symbol)
        .then((s) =>
          setSignals((prev) => ({
            ...prev,
            [symbol]: s && !s.error ? s : null,
          })),
        )
        .catch(() => setSignals((prev) => ({ ...prev, [symbol]: null })));
    });
  }, []);

  const fmt = (n?: number | null) =>
    n == null ? "--" : n.toLocaleString("vi-VN");
  const fmtPct = (n?: number | null) => {
    if (n == null) return "--";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(1)}%`;
  };

  const summary = useMemo(() => {
    const loaded = rows.filter((r) => !r.loading && r.data);
    return {
      total: rows.length,
      loaded: loaded.length,
      buy: loaded.filter((r) => r.data?.signal === "BUY").length,
      sell: loaded.filter((r) => r.data?.signal === "SELL").length,
    };
  }, [rows]);

  /** Xếp hạng toàn bộ universe (đang cầm + peer) theo điểm cơ hội, dùng cho phần "Mã tiềm năng". */
  const candidates = useMemo(() => {
    const list = SCAN_SYMBOLS.map((symbol) => ({
      symbol,
      s: signals[symbol],
      isHeld: HOLDING_SYMBOLS.includes(symbol),
    })).filter(
      (c): c is { symbol: string; s: TickerSignals; isHeld: boolean } => !!c.s,
    );

    return list
      .map((c) => ({
        ...c,
        score: scoreCandidate(c.s),
        verdict: candidateVerdict(c.s),
      }))
      .sort((a, b) => b.score - a.score);
  }, [signals]);

  const newIdeas = candidates.filter((c) => !c.isHeld).slice(0, 8);
  const loadedCount = Object.values(signals).filter(Boolean).length;

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div
        className="card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Briefcase size={16} color="var(--accent-blue)" />
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>
              Current Watchlist
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Mã đang cầm: {HOLDING_SYMBOLS.join(", ")} · {summary.loaded}/
              {summary.total} mã đã tải
            </div>
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          BUY: <strong style={{ color: "#059669" }}>{summary.buy}</strong> ·
          SELL: <strong style={{ color: "#dc2626" }}>{summary.sell}</strong>
        </div>
      </div>

      {/* ── Điểm mua/bán cho các mã đang cầm ── */}
      <div className="card" style={{ padding: "16px", background: "#fff" }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "10px",
          }}
        >
          Điểm Mua/Bán — Danh Mục Hiện Tại (Hỗ Trợ/Kháng Cự 1 Năm)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12.5px",
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
                  "Mã",
                  "Giá hiện tại",
                  "Điểm mua (hỗ trợ)",
                  "Điểm bán (kháng cự)",
                  "R/R",
                  "Tín hiệu",
                  "Lý do",
                  "Hành động",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.loading) {
                  return (
                    <tr
                      key={row.symbol}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td
                        style={{
                          padding: "9px 10px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                        }}
                      >
                        {row.symbol}
                      </td>
                      <td
                        colSpan={7}
                        style={{ padding: "9px 10px", color: "#94a3b8" }}
                      >
                        Đang tải dữ liệu…
                      </td>
                    </tr>
                  );
                }

                const signal = row.data?.signal ?? "WATCH";
                return (
                  <tr
                    key={row.symbol}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td
                      style={{
                        padding: "9px 10px",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 800,
                      }}
                    >
                      {row.symbol}
                    </td>
                    <td style={{ padding: "9px 10px", fontWeight: 700 }}>
                      {fmt(row.data?.close)}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      {fmt(row.data?.support)} ({fmtPct(row.data?.supportPct)})
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      {fmt(row.data?.resistance)} (
                      {fmtPct(row.data?.resistancePct)})
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      1 : {row.data?.rr?.toFixed(2) ?? "--"}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <span
                        style={{ color: SIGNAL_COLOR[signal], fontWeight: 800 }}
                      >
                        {signal}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", color: "#64748b" }}>
                      {row.data?.reason || "Không đủ dữ liệu"}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() =>
                            navigate(
                              `/finance/stock/chart?symbol=${row.symbol}`,
                            )
                          }
                          className="btn btn-secondary"
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                        >
                          Chart
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/finance/stock/symbol/${row.symbol}`)
                          }
                          className="btn btn-primary"
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mã tiềm năng 1-2 tháng tới ── */}
      <div className="card" style={{ padding: "16px", background: "#fff" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <Search size={15} color="var(--accent-blue)" />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
            Mã Tiềm Năng 1–2 Tháng Tới
          </span>
          <span
            style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}
          >
            {loadedCount}/{SCAN_SYMBOLS.length} mã đã quét (chứng khoán + BĐS +
            đang cầm)
          </span>
        </div>
        <div
          style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "12px" }}
        >
          Điểm cơ hội = R/R × 10 + cộng điểm khi giá trên MA20/MA50/MA200, trừ
          điểm nếu RSI quá mua ({">"}70) hoặc quá bán sâu ({"<"}30). Danh sách
          dưới chỉ gồm mã <b>chưa nắm giữ</b> để tìm cơ hội mới.
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
                {[
                  "Mã",
                  "Điểm",
                  "Giá",
                  "Hỗ trợ (mua)",
                  "Kháng cự (bán)",
                  "R/R",
                  "MA20/50/200",
                  "RSI",
                  "Cách đỉnh 52T",
                  "Nhận định",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "7px 9px",
                      fontSize: "10.5px",
                      color: "#64748b",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {newIdeas.map((c) => (
                <tr
                  key={c.symbol}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td
                    style={{
                      padding: "8px 9px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 800,
                    }}
                  >
                    <button
                      onClick={() =>
                        navigate(`/finance/stock/symbol/${c.symbol}`)
                      }
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        color: "#1e40af",
                        textDecoration: "underline",
                      }}
                    >
                      {c.symbol}
                    </button>
                  </td>
                  <td style={{ padding: "8px 9px", fontWeight: 800 }}>
                    {c.score}
                  </td>
                  <td style={{ padding: "8px 9px" }}>{fmt(c.s.price)}</td>
                  <td style={{ padding: "8px 9px", color: "#059669" }}>
                    {fmt(c.s.reward_risk.support)}
                  </td>
                  <td style={{ padding: "8px 9px", color: "#dc2626" }}>
                    {fmt(c.s.reward_risk.resistance_near)}
                  </td>
                  <td style={{ padding: "8px 9px", fontWeight: 700 }}>
                    {c.s.reward_risk.rr != null
                      ? `1:${c.s.reward_risk.rr.toFixed(2)}`
                      : "—"}
                  </td>
                  <td style={{ padding: "8px 9px", color: "#64748b" }}>
                    {c.s.technical.above_ma20 ? "✓" : "✗"}/
                    {c.s.technical.above_ma50 ? "✓" : "✗"}/
                    {c.s.technical.above_ma200 ? "✓" : "✗"}
                  </td>
                  <td style={{ padding: "8px 9px" }}>
                    {c.s.technical.rsi_14 ?? "—"}
                  </td>
                  <td style={{ padding: "8px 9px", color: "#b91c1c" }}>
                    {c.s.technical.pct_from_high_52w != null
                      ? `${c.s.technical.pct_from_high_52w}%`
                      : "…"}
                  </td>
                  <td
                    style={{
                      padding: "8px 9px",
                      fontWeight: 700,
                      color: TONE_COLOR[c.verdict.tone],
                    }}
                  >
                    {c.verdict.text}
                  </td>
                </tr>
              ))}
              {newIdeas.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Đang tải dữ liệu quét thị trường…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
