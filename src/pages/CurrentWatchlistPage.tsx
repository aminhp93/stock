import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, RefreshCw } from "lucide-react";
import {
  fetchChartData,
  fetchTickerSignals,
  TickerSignals,
} from "../services/api";
import { ChartDataPoint } from "../types";

const HOLDING_SYMBOLS = ["MBS", "TCH", "HDG", "PDR"];
const WIN = 5;

/** Nhận định đã ghi trước đó — dùng để đối chiếu với số liệu hiện tại. */
const RECORDED_THESIS: Record<
  string,
  { stance: string; rrNoted: number; entry: string; note: string }
> = {
  MBS: {
    stance: "Giữ / mua tích lũy",
    rrNoted: 3.24,
    entry: "16.8k–17.5k",
    note: "Tỷ trọng lõi ~30%",
  },
  HDG: {
    stance: "Mua có kỷ luật",
    rrNoted: 5.0,
    entry: "15.6k–16.4k",
    note: "R/R tốt nhất nhóm, tăng dần lên 20%",
  },
  PDR: {
    stance: "Giữ + mua thăm dò",
    rrNoted: 3.21,
    entry: "11.45k–12.2k",
    note: "Tăng nhẹ có kiểm soát lên 15%",
  },
  TCH: {
    stance: "Chưa add — canh giảm tỷ trọng",
    rrNoted: 1.28,
    entry: "—",
    note: "R/R chưa đạt chuẩn, giảm 46% → 25%",
  },
};

/** Cập nhật lại nhận định từng mã dựa trên số liệu hiện tại. */
function reviseStance(s: TickerSignals | null | undefined): {
  action: string;
  tone: "pos" | "warn" | "neg" | "muted";
  why: string;
} {
  if (!s) return { action: "Đang tải…", tone: "muted", why: "—" };
  const rr = s.reward_risk.rr ?? 0;
  const rsi = s.technical.rsi_14 ?? 50;
  const aboveMa20 = s.technical.above_ma20;
  const aboveMa50 = s.technical.above_ma50;

  if (rr >= 2 && aboveMa20 && aboveMa50)
    return {
      action: "Giải ngân từng phần theo kế hoạch",
      tone: "pos",
      why: `R/R 1:${rr.toFixed(2)} · giá trên MA20 & MA50`,
    };
  if (rr >= 2 && aboveMa20)
    return {
      action: "Mua thăm dò nhỏ, chờ xác nhận MA50",
      tone: "pos",
      why: `R/R 1:${rr.toFixed(2)} · mới lấy lại MA20`,
    };
  if (rr >= 2)
    return {
      action: "Chờ xác nhận xu hướng trước khi mua",
      tone: "warn",
      why: `R/R tốt (1:${rr.toFixed(2)}) nhưng chưa vượt MA20`,
    };
  if (rr < 1.5)
    return {
      action: "Không add — ưu tiên giảm tỷ trọng khi hồi",
      tone: "neg",
      why: `R/R chỉ 1:${rr.toFixed(2)} · RSI ${rsi}`,
    };
  return {
    action: "Giữ nguyên, không hành động mới",
    tone: "warn",
    why: `R/R 1:${rr.toFixed(2)} · chưa đủ lợi thế`,
  };
}

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

const TONE_STYLE: Record<
  "pos" | "warn" | "neg" | "muted",
  { bg: string; border: string; color: string }
> = {
  pos: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
  warn: { bg: "#fff7ed", border: "#fed7aa", color: "#b45309" },
  neg: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  muted: { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b" },
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

  const liveSummary = useMemo(() => {
    const list = HOLDING_SYMBOLS.map((s) => signals[s]).filter(
      (s): s is TickerSignals => !!s,
    );
    const rrs = list
      .map((s) => s.reward_risk.rr)
      .filter((x): x is number => x != null && Number.isFinite(x))
      .sort((a, b) => a - b);
    const mid = Math.floor(rrs.length / 2);
    let medianRR: number | null = null;
    if (rrs.length) {
      medianRR = rrs.length % 2 ? rrs[mid] : (rrs[mid - 1] + rrs[mid]) / 2;
    }
    const aboveMa50 = list.filter((s) => s.technical.above_ma50).length;
    const aboveMa200 = list.filter((s) => s.technical.above_ma200).length;

    let verdict =
      "Chưa đủ dữ liệu để kết luận — chờ tải xong tín hiệu của cả 4 mã.";
    if (list.length) {
      if (aboveMa50 === 0) {
        verdict =
          "Toàn bộ danh mục còn dưới MA50 — vẫn ở pha phòng thủ. Ưu tiên giữ tiền mặt, chỉ mua thăm dò tại hỗ trợ mạnh và siết stop; hạ tỷ trọng mã có R/R thấp (TCH) khi có nhịp hồi.";
      } else if (aboveMa50 === list.length && aboveMa200 >= list.length / 2) {
        verdict =
          "Cấu trúc giá đã cải thiện rõ (toàn bộ trên MA50) — có thể thực thi lộ trình tái cơ cấu về tỷ trọng mục tiêu, ưu tiên mã R/R ≥ 2.";
      } else {
        verdict = `Phân hoá: ${aboveMa50}/${list.length} mã lấy lại MA50. Chỉ giải ngân vào mã đã trên MA20/MA50 và R/R ≥ 2, chưa tăng tỷ trọng toàn danh mục.`;
      }
    }

    return { loaded: list.length, aboveMa50, aboveMa200, medianRR, verdict };
  }, [signals]);

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

      <div className="card" style={{ padding: "16px", background: "#fff" }}>
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
                  "Hỗ trợ gần",
                  "Kháng cự gần",
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

      {/* ── Rà soát nhận định: đã ghi vs hiện tại ── */}
      <div className="card" style={{ padding: "16px", background: "#fff" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <RefreshCw size={15} color="var(--accent-blue)" />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
            Rà Soát Nhận Định — Đã Ghi vs Hiện Tại
          </span>
          <span
            style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}
          >
            {Object.values(signals).filter(Boolean).length}/
            {HOLDING_SYMBOLS.length} mã · dữ liệu{" "}
            {Object.values(signals).find(Boolean)?.as_of ?? "…"}
          </span>
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
                  "Nhận định đã ghi",
                  "R/R ghi → hiện tại",
                  "Tâm lý / vị thế",
                  "Cách đỉnh 52T",
                  "Trạng thái",
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
              {HOLDING_SYMBOLS.map((sym) => {
                const th = RECORDED_THESIS[sym];
                const s = signals[sym];
                const rrNow = s?.reward_risk.rr ?? null;
                const rrFar = s?.reward_risk.rr_far ?? null;
                const drift = rrNow != null ? rrNow - th.rrNoted : null;
                // "cần xem lại" khi: R/R lệch >0.8, hoặc tín hiệu mua nhưng đã gãy MA50, hoặc RSI quá mua
                const brokeMa50 = s
                  ? !s.technical.above_ma50 && th.stance.includes("mua")
                  : false;
                const bigDrift = drift != null && Math.abs(drift) > 0.8;
                const overbought = (s?.technical.rsi_14 ?? 0) > 70;
                const stale = !s ? null : bigDrift || brokeMa50 || overbought;
                return (
                  <tr key={sym} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td
                      style={{
                        padding: "8px 9px",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 800,
                      }}
                    >
                      {sym}
                    </td>
                    <td style={{ padding: "8px 9px", color: "#475569" }}>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>
                        {th.stance}
                      </div>
                      <div style={{ fontSize: "10.5px" }}>
                        vùng {th.entry} · {th.note}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "8px 9px",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      1:{th.rrNoted.toFixed(2)} →{" "}
                      <strong
                        style={{
                          color:
                            rrNow != null && rrNow >= 2 ? "#059669" : "#dc2626",
                        }}
                      >
                        1:{rrNow?.toFixed(2) ?? "…"}
                      </strong>
                      {rrFar != null && (
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          (xa 1:{rrFar.toFixed(1)})
                        </span>
                      )}
                      {drift != null && (
                        <div
                          style={{
                            fontSize: "10px",
                            color:
                              Math.abs(drift) > 0.8 ? "#d97706" : "#94a3b8",
                          }}
                        >
                          Δ {drift > 0 ? "+" : ""}
                          {drift.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "8px 9px" }}>
                      {s ? (
                        <>
                          <span
                            style={{
                              fontWeight: 800,
                              color:
                                s.sentiment.composite_gauge < 40
                                  ? "#ea580c"
                                  : s.sentiment.composite_gauge >= 60
                                    ? "#16a34a"
                                    : "#64748b",
                            }}
                          >
                            {Math.round(s.sentiment.composite_gauge)}{" "}
                            {s.sentiment.label.replace("_", " ")}
                          </span>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            MA20 {s.technical.above_ma20 ? "✓" : "✗"} · MA50{" "}
                            {s.technical.above_ma50 ? "✓" : "✗"} · MA200{" "}
                            {s.technical.above_ma200 ? "✓" : "✗"} · RSI{" "}
                            {s.technical.rsi_14}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>…</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "8px 9px",
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "#b91c1c",
                      }}
                    >
                      {s?.technical.pct_from_high_52w != null
                        ? `${s.technical.pct_from_high_52w}%`
                        : "…"}
                    </td>
                    <td style={{ padding: "8px 9px" }}>
                      {stale == null ? (
                        <span style={{ color: "#94a3b8" }}>…</span>
                      ) : stale ? (
                        <span style={{ fontWeight: 800, color: "#d97706" }}>
                          ⚠ Cần xem lại
                        </span>
                      ) : (
                        <span style={{ fontWeight: 800, color: "#059669" }}>
                          ✓ Còn hiệu lực
                        </span>
                      )}
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
            fontSize: "11px",
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          Quy tắc "cần xem lại": R/R lệch &gt; 0.8 so với lúc ghi · hoặc nhận
          định "mua" nhưng giá đã gãy MA50 · hoặc RSI &gt; 70. Cả 4 mã đều dưới
          MA200 và gần đáy 52 tuần — nhóm BĐS/chứng khoán chu kỳ đang ở pha
          phòng thủ; các nhận định "mua tích lũy" ở đây là <b>contrarian</b>,
          cần kỷ luật stop.
        </div>
      </div>

      {/* ── Nhận định cập nhật theo số liệu hiện tại ── */}
      <div className="card" style={{ padding: "16px", background: "#fff" }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "4px",
          }}
        >
          Nhận Định Cập Nhật (tự động theo dữ liệu mới nhất)
        </div>
        <div
          style={{ fontSize: "11px", color: "#64748b", marginBottom: "10px" }}
        >
          {liveSummary.loaded}/{HOLDING_SYMBOLS.length} mã có dữ liệu ·{" "}
          {liveSummary.aboveMa50} mã trên MA50 · R/R trung vị 1:
          {liveSummary.medianRR?.toFixed(2) ?? "…"}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
            gap: "10px",
          }}
        >
          {HOLDING_SYMBOLS.map((sym) => {
            const rev = reviseStance(signals[sym]);
            const palette = TONE_STYLE[rev.tone];
            return (
              <div
                key={sym}
                style={{
                  border: `1px solid ${palette.border}`,
                  background: palette.bg,
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 800,
                    }}
                  >
                    {sym}
                  </span>
                  <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                    trước: {RECORDED_THESIS[sym].stance}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12.5px",
                    fontWeight: 800,
                    color: palette.color,
                  }}
                >
                  {rev.action}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    marginTop: "3px",
                  }}
                >
                  {rev.why}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "9px 11px",
            fontSize: "11.5px",
            color: "#475569",
            lineHeight: 1.6,
          }}
        >
          <b>Kết luận danh mục:</b> {liveSummary.verdict}
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Đánh giá danh mục hiện tại (lọc mã {"<"} 2 triệu)
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Nguồn số liệu
            </div>
            <div
              style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b" }}
            >
              finance/personal/raw trong FinancePage.tsx (defaultCK)
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Danh mục sau lọc
            </div>
            <div
              style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b" }}
            >
              MBS, TCH, HDG, PDR
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Giá trị sau lọc
            </div>
            <div
              style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b" }}
            >
              ~296.38 triệu
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Tỷ trọng</div>
            <div
              style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b" }}
            >
              TCH 46.25% · MBS 29.24% · PDR 13.39% · HDG 11.12%
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              P/L tạm tính
            </div>
            <div
              style={{ fontSize: "12.5px", fontWeight: 700, color: "#b91c1c" }}
            >
              Cả 4 mã đang âm; nặng nhất HDG (~-37.7%) và TCH (~-33.35%)
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#991b1b",
              marginBottom: "6px",
            }}
          >
            Vấn đề chính
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              color: "#7f1d1d",
              fontSize: "12.5px",
              lineHeight: 1.7,
            }}
          >
            <li>
              Concentration risk cao: Top 1 = 46%, Top 2 = 75.5%, Top 3 = 88.9%.
            </li>
            <li>
              Style/Sector risk: nghiêng nhiều vào nhóm BĐS/chu kỳ, biến động
              cùng pha.
            </li>
            <li>
              Gần như full equity trong book cổ phiếu, thiếu buffer phòng thủ.
            </li>
            <li>
              Chênh dữ liệu nhẹ: tổng theo mã ~296.84 triệu vs snapshot raw ~303
              triệu (~6.16 triệu).
            </li>
          </ul>
        </div>

        <div
          style={{
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#1e40af",
              marginBottom: "6px",
            }}
          >
            Kế hoạch mua/bán ngắn hạn (2–6 tuần)
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              color: "#1e3a8a",
              fontSize: "12.5px",
              lineHeight: 1.7,
            }}
          >
            <li>
              MBS: ưu tiên giữ/mua tích lũy khi về vùng hỗ trợ ~16.8k–17.5k, R/R
              ~3.24.
            </li>
            <li>
              HDG: mua có kỷ luật quanh hỗ trợ ~15.6k–16.4k, R/R ~5.0 (tốt nhất
              nhóm).
            </li>
            <li>PDR: giữ + mua thăm dò quanh ~11.45k–12.2k, R/R ~3.21.</li>
            <li>
              TCH: chưa add vội (R/R ~1.28 chưa đạt chuẩn), canh hồi để giảm tỷ
              trọng.
            </li>
            <li>
              Kỷ luật lệnh: chia 3 phần 40/30/30; stop cứng theo plan backend
              (MBS 16,736 · HDG 15,568 · PDR 11,594); TCH ưu tiên phòng thủ.
            </li>
          </ul>
        </div>

        <div
          style={{
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#166534",
              marginBottom: "8px",
            }}
          >
            Kế hoạch trung hạn (3–6 tháng) — target tái cấu trúc book 4 mã
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
                <tr style={{ borderBottom: "1px solid #bbf7d0" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "#166534",
                    }}
                  >
                    Mã
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "#166534",
                    }}
                  >
                    Hiện tại
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "#166534",
                    }}
                  >
                    Target gợi ý
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "#166534",
                    }}
                  >
                    Định hướng
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    symbol: "MBS",
                    current: "29.24%",
                    target: "30%",
                    action: "Giữ tỷ trọng lõi",
                  },
                  {
                    symbol: "HDG",
                    current: "11.12%",
                    target: "20%",
                    action: "Tăng dần theo nhịp hỗ trợ",
                  },
                  {
                    symbol: "PDR",
                    current: "13.39%",
                    target: "15%",
                    action: "Tăng nhẹ có kiểm soát",
                  },
                  {
                    symbol: "TCH",
                    current: "46.25%",
                    target: "25%",
                    action: "Giảm tỷ trọng khi hồi",
                  },
                ].map((item) => (
                  <tr
                    key={item.symbol}
                    style={{ borderBottom: "1px solid #dcfce7" }}
                  >
                    <td style={{ padding: "7px 8px", fontWeight: 800 }}>
                      {item.symbol}
                    </td>
                    <td style={{ padding: "7px 8px" }}>{item.current}</td>
                    <td style={{ padding: "7px 8px", fontWeight: 700 }}>
                      {item.target}
                    </td>
                    <td style={{ padding: "7px 8px" }}>{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
