import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchChartData } from "../services/api";
import { ChartDataPoint } from "../types";
import { Bot, BarChart2 } from "lucide-react";
import {
  WATCHLISTS,
  getWatchlist,
  DEFAULT_WATCHLIST,
} from "../data/watchlists";

// ─── Watchlist S/R Analysis Card ─────────────────────────────────────────────
const WIN = 5;
function calcSR(data: ChartDataPoint[]) {
  if (data.length < WIN * 2 + 1) return null;
  const cur = data[data.length - 1].close;
  const highs: number[] = [],
    lows: number[] = [];
  for (let i = WIN; i < data.length - WIN; i++) {
    let isH = true,
      isL = true;
    for (let j = i - WIN; j <= i + WIN; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isH = false;
      if (data[j].low <= data[i].low) isL = false;
    }
    if (isH) highs.push(data[i].high);
    if (isL) lows.push(data[i].low);
  }
  const cluster = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    const m: number[] = [];
    for (const v of s) {
      const last = m[m.length - 1];
      if (last && Math.abs(v - last) / last < 0.015)
        m[m.length - 1] = (last + v) / 2;
      else m.push(v);
    }
    return m;
  };
  const rs = cluster(highs)
    .filter((v) => v > cur)
    .sort((a, b) => a - b);
  const ss = cluster(lows)
    .filter((v) => v < cur)
    .sort((a, b) => b - a);
  const pct = (p: number) => ((p - cur) / cur) * 100;
  // Signal: if S1 is within -5% and R1 is >8% away → near support → BUY
  // if R1 is within +5% → near resistance → SELL / HOLD
  const s1pct = ss[0] ? pct(ss[0]) : null;
  const r1pct = rs[0] ? pct(rs[0]) : null;
  let signal: "BUY" | "SELL" | "HOLD" | "WATCH" = "WATCH";
  let reason = "";
  if (s1pct !== null && r1pct !== null) {
    const rr = Math.abs(r1pct) / Math.abs(s1pct); // reward/risk ratio
    if (s1pct > -6 && rr >= 2) {
      signal = "BUY";
      reason = `Gần S1 (${s1pct.toFixed(1)}%), R/R=${rr.toFixed(1)}x`;
    } else if (r1pct < 5) {
      signal = "SELL";
      reason = `Gần R1 (+${r1pct.toFixed(1)}%), cản mạnh`;
    } else if (r1pct < 10 && Math.abs(s1pct) > 8) {
      signal = "HOLD";
      reason = `Giữa vùng, chờ tín hiệu`;
    } else {
      signal = "WATCH";
      reason = `R/R chưa rõ`;
    }
  } else {
    reason = "Không đủ dữ liệu swing";
  }
  return {
    close: cur,
    r1: rs[0] ?? null,
    r2: rs[1] ?? null,
    s1: ss[0] ?? null,
    s2: ss[1] ?? null,
    r1pct,
    s1pct,
    signal,
    reason,
  };
}

/** Chỉ số phụ để tổng hợp bức tranh ngành: xu hướng, động lượng, quá mua/bán. */
function calcMetrics(data: ChartDataPoint[]) {
  if (!data.length) return null;
  const last = data[data.length - 1];
  const close = last.close;
  const retN = (n: number) => {
    const p = data[data.length - 1 - n];
    return p && p.close ? (close / p.close - 1) * 100 : null;
  };
  const win = data.slice(-252);
  const hi52 = Math.max(...win.map((d) => d.high));
  return {
    close,
    aboveMa20: last.ma20 != null ? close > last.ma20 : null,
    aboveMa50: last.ma50 != null ? close > last.ma50 : null,
    rsi: last.rsi ?? null,
    ret1m: retN(21),
    ret3m: retN(63),
    pctFromHigh52w: hi52 ? (close / hi52 - 1) * 100 : null,
  };
}

interface WatchRow {
  symbol: string;
  data: ReturnType<typeof calcSR>;
  metrics: ReturnType<typeof calcMetrics>;
  loading: boolean;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Diễn giải ngắn các điểm đáng chú ý của ngành. */
function buildOverviewNotes(x: {
  above50: number | null;
  ret1m: number | null;
  ret3m: number | null;
  rsi: number | null;
  fromHigh: number | null;
  avgRR: number | null;
}) {
  const notes: string[] = [];
  if (x.above50 != null && x.above50 < 35)
    notes.push(`chỉ ${x.above50.toFixed(0)}% mã trên MA50 — nội tại ngành yếu`);
  else if (x.above50 != null && x.above50 > 65)
    notes.push(`${x.above50.toFixed(0)}% mã trên MA50 — xu hướng lan toả tốt`);
  if (x.ret1m != null && x.ret3m != null && x.ret1m > 0 && x.ret3m < 0)
    notes.push("hồi phục ngắn hạn trong xu hướng 3 tháng còn âm");
  if (x.ret1m != null && x.ret1m < -5)
    notes.push(`động lượng 1 tháng âm (${x.ret1m.toFixed(1)}%)`);
  if (x.rsi != null && x.rsi > 65)
    notes.push(`RSI trung vị ${x.rsi.toFixed(0)} — nhóm đang nóng`);
  if (x.rsi != null && x.rsi < 40)
    notes.push(`RSI trung vị ${x.rsi.toFixed(0)} — nhóm đang bị bán mạnh`);
  if (x.fromHigh != null && x.fromHigh < -25)
    notes.push(`trung vị còn cách đỉnh 52T ${x.fromHigh.toFixed(0)}%`);
  if (x.avgRR != null && x.avgRR >= 2)
    notes.push(`R/R trung vị ${x.avgRR.toFixed(1)}x — vị thế giá thuận lợi`);
  return notes;
}

/** Khuyến nghị hành động ở cấp danh mục theo điểm sức khoẻ. */
function stanceFromScore(score: number) {
  if (score >= 65)
    return "Ưu tiên nắm giữ và gia tăng theo nhịp điều chỉnh — ngành đang có xu hướng lan toả.";
  if (score >= 45)
    return "Giải ngân chọn lọc từng mã có R/R ≥ 2, chưa nên tăng tỷ trọng toàn ngành.";
  if (score >= 30)
    return "Phòng thủ: chỉ mua thăm dò tại hỗ trợ mạnh, siết stop và giới hạn tỷ trọng.";
  return "Rất yếu: ưu tiên bảo toàn vốn, hạn chế bắt đáy khi chưa có tín hiệu tạo nền.";
}

/** Tổng hợp tình hình cả danh mục/ngành từ các mã đã tải xong. */
function calcSectorOverview(rows: WatchRow[]) {
  const done = rows.filter((r) => !r.loading && r.metrics);
  if (done.length < 2) return null;
  const m = done.map((r) => r.metrics!);
  const pctTrue = (xs: (boolean | null)[]) => {
    const v = xs.filter((x) => x !== null) as boolean[];
    return v.length ? (v.filter(Boolean).length / v.length) * 100 : null;
  };
  const above20 = pctTrue(m.map((x) => x.aboveMa20));
  const above50 = pctTrue(m.map((x) => x.aboveMa50));
  const ret1m = median(
    m.map((x) => x.ret1m).filter((x): x is number => x != null),
  );
  const ret3m = median(
    m.map((x) => x.ret3m).filter((x): x is number => x != null),
  );
  const rsi = median(m.map((x) => x.rsi).filter((x): x is number => x != null));
  const fromHigh = median(
    m.map((x) => x.pctFromHigh52w).filter((x): x is number => x != null),
  );
  const rrs = done
    .map((r) =>
      r.data?.r1pct != null && r.data?.s1pct
        ? Math.abs(r.data.r1pct) / Math.abs(r.data.s1pct)
        : null,
    )
    .filter((x): x is number => x != null && isFinite(x));
  const avgRR = median(rrs);

  // Điểm sức khoẻ ngành 0–100: xu hướng (50) + động lượng (30) + dư địa (20)
  let score = 0;
  if (above20 != null) score += (above20 / 100) * 25;
  if (above50 != null) score += (above50 / 100) * 25;
  if (ret1m != null) score += Math.max(-15, Math.min(15, ret1m)) + 15; // -15..+15 → 0..30
  if (fromHigh != null) score += Math.max(0, Math.min(20, (fromHigh + 40) / 2)); // -40%→0, 0%→20
  score = Math.round(Math.max(0, Math.min(100, score)));

  const verdict =
    score >= 65
      ? "MẠNH"
      : score >= 45
        ? "TRUNG TÍNH"
        : score >= 30
          ? "YẾU"
          : "RẤT YẾU";

  const notes = buildOverviewNotes({
    above50,
    ret1m,
    ret3m,
    rsi,
    fromHigh,
    avgRR,
  });

  // Độ rộng tín hiệu S/R trong danh mục
  const countSig = (s: string) =>
    done.filter((r) => r.data?.signal === s).length;
  const breadth = {
    buy: countSig("BUY"),
    hold: countSig("HOLD"),
    sell: countSig("SELL"),
    watch: countSig("WATCH"),
  };

  // Dẫn dắt / tụt hậu theo động lượng 1 tháng
  const ranked = done
    .filter((r) => r.metrics?.ret1m != null)
    .sort((a, b) => (b.metrics!.ret1m ?? 0) - (a.metrics!.ret1m ?? 0));
  const tag = (r: WatchRow) =>
    `${r.symbol} ${(r.metrics!.ret1m ?? 0).toFixed(1)}%`;
  const leaders = ranked.slice(0, 3).map(tag);
  const laggards = ranked.slice(-3).reverse().map(tag);

  const stance = stanceFromScore(score);

  return {
    n: done.length,
    above20,
    above50,
    ret1m,
    ret3m,
    rsi,
    fromHigh,
    avgRR,
    score,
    verdict,
    notes,
    breadth,
    leaders,
    laggards,
    stance,
  };
}

const SIGNAL_STYLE: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  BUY: { bg: "#f0fdf4", color: "#059669", border: "#bbf7d0" },
  SELL: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  HOLD: { bg: "#fff7ed", color: "#d97706", border: "#fed7aa" },
  WATCH: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

const WatchlistAnalysisCard: React.FC<{
  title?: string;
  symbols: string[];
  activeSymbol: string;
  onSelect: (s: string) => void;
}> = ({ title = "watching", symbols, activeSymbol, onSelect }) => {
  const PAGE_SIZE = 10;
  const [rows, setRows] = useState<WatchRow[]>(
    symbols.map((s) => ({
      symbol: s,
      data: null,
      metrics: null,
      loading: true,
    })),
  );
  const [filterSignal, setFilterSignal] = useState<string>("ALL");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setRows(
      symbols.map((s) => ({
        symbol: s,
        data: null,
        metrics: null,
        loading: true,
      })),
    );
    setPage(0);
    const now = new Date();
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    const start = d.toISOString().split("T")[0];
    symbols.forEach((sym) => {
      fetchChartData(sym, start)
        .then((res) => {
          const bars = res.data || [];
          const sr = calcSR(bars);
          const metrics = calcMetrics(bars);
          setRows((prev) =>
            prev.map((r) =>
              r.symbol === sym
                ? { ...r, data: sr, metrics, loading: false }
                : r,
            ),
          );
        })
        .catch(() =>
          setRows((prev) =>
            prev.map((r) => (r.symbol === sym ? { ...r, loading: false } : r)),
          ),
        );
    });
  }, [symbols.join(",")]);

  useEffect(() => {
    setPage(0);
  }, [filterSignal]);

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const fmtP = (n: number | null) =>
    n == null ? "—" : (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

  const SIGNALS = ["ALL", "BUY", "SELL", "HOLD", "WATCH"] as const;
  const FILTER_STYLE: Record<string, { active: string; bg: string }> = {
    ALL: { active: "#2563eb", bg: "#eff6ff" },
    BUY: { active: "#059669", bg: "#f0fdf4" },
    SELL: { active: "#dc2626", bg: "#fef2f2" },
    HOLD: { active: "#d97706", bg: "#fff7ed" },
    WATCH: { active: "#64748b", bg: "#f8fafc" },
  };

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    if (!r.loading && r.data?.signal) {
      acc[r.data.signal] = (acc[r.data.signal] || 0) + 1;
    }
    return acc;
  }, {});

  const filteredRows =
    filterSignal === "ALL"
      ? rows
      : rows.filter((r) => !r.loading && r.data?.signal === filterSignal);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const overview = calcSectorOverview(rows);
  const loadedCount = rows.filter((r) => !r.loading).length;

  return (
    <div className="card" style={{ background: "#fff", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <BarChart2 size={16} color="var(--accent-blue)" />
        <span
          style={{
            fontWeight: 800,
            fontSize: "14px",
            color: "var(--text-main)",
          }}
        >
          Đánh Giá Watchlist "{title}" — Hỗ Trợ & Kháng Cự (1 năm)
        </span>
        <span
          style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}
        >
          {loadedCount}/{symbols.length} mã · swing pivot ±5 nến
        </span>
      </div>

      {/* ── Đánh giá tổng quan danh mục / ngành ── */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "14px",
          background: "#fbfcfe",
        }}
      >
        {!overview ? (
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Đang tính tổng quan ngành…
          </span>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                }}
              >
                TỔNG QUAN NGÀNH
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  padding: "2px 10px",
                  borderRadius: "6px",
                  background:
                    overview.score >= 65
                      ? "#f0fdf4"
                      : overview.score >= 45
                        ? "#eff6ff"
                        : overview.score >= 30
                          ? "#fff7ed"
                          : "#fef2f2",
                  color:
                    overview.score >= 65
                      ? "#059669"
                      : overview.score >= 45
                        ? "#2563eb"
                        : overview.score >= 30
                          ? "#d97706"
                          : "#dc2626",
                }}
              >
                {overview.verdict} · {overview.score}/100
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                (n={overview.n} mã)
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              {[
                [
                  "% mã > MA20",
                  overview.above20 == null
                    ? "—"
                    : `${overview.above20.toFixed(0)}%`,
                ],
                [
                  "% mã > MA50",
                  overview.above50 == null
                    ? "—"
                    : `${overview.above50.toFixed(0)}%`,
                ],
                ["Return 1T (trung vị)", fmtP(overview.ret1m)],
                ["Return 3T (trung vị)", fmtP(overview.ret3m)],
                [
                  "RSI (trung vị)",
                  overview.rsi == null ? "—" : overview.rsi.toFixed(0),
                ],
                ["Cách đỉnh 52T", fmtP(overview.fromHigh)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: "#fff",
                    border: "1px solid #eef2f7",
                    borderRadius: "7px",
                    padding: "6px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9.5px",
                      color: "#94a3b8",
                      fontWeight: 700,
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--text-main)",
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            {overview.notes.length > 0 && (
              <ul
                style={{
                  margin: "10px 0 0",
                  paddingLeft: "16px",
                  fontSize: "11.5px",
                  color: "#475569",
                  lineHeight: "1.6",
                }}
              >
                {overview.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}

            <div
              style={{
                marginTop: "10px",
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "#94a3b8", fontWeight: 700 }}>
                Độ rộng tín hiệu:
              </span>
              <span style={{ color: "#059669", fontWeight: 800 }}>
                BUY {overview.breadth.buy}
              </span>
              <span style={{ color: "#d97706", fontWeight: 800 }}>
                HOLD {overview.breadth.hold}
              </span>
              <span style={{ color: "#dc2626", fontWeight: 800 }}>
                SELL {overview.breadth.sell}
              </span>
              <span style={{ color: "#64748b", fontWeight: 800 }}>
                WATCH {overview.breadth.watch}
              </span>
            </div>

            <div
              style={{
                marginTop: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "8px",
                fontSize: "11.5px",
              }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #dcfce7",
                  borderRadius: "7px",
                  padding: "7px 9px",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 800 }}>
                  Dẫn dắt (1T):{" "}
                </span>
                <span style={{ color: "#14532d" }}>
                  {overview.leaders.join(" · ") || "—"}
                </span>
              </div>
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: "7px",
                  padding: "7px 9px",
                }}
              >
                <span style={{ color: "#991b1b", fontWeight: 800 }}>
                  Tụt hậu (1T):{" "}
                </span>
                <span style={{ color: "#7f1d1d" }}>
                  {overview.laggards.join(" · ") || "—"}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: "8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "7px",
                padding: "8px 10px",
                fontSize: "11.5px",
                color: "#1e3a8a",
                lineHeight: 1.6,
              }}
            >
              <b>Nhận định danh mục:</b> {overview.stance}
            </div>
          </>
        )}
      </div>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "#64748b",
            fontWeight: 600,
            marginRight: "4px",
          }}
        >
          Lọc tín hiệu:
        </span>
        {SIGNALS.map((sig) => {
          const isActive = filterSignal === sig;
          const fs = FILTER_STYLE[sig];
          const count =
            sig === "ALL"
              ? rows.filter((r) => !r.loading).length
              : counts[sig] || 0;
          return (
            <button
              key={sig}
              onClick={() => setFilterSignal(sig)}
              style={{
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                border: `1px solid ${isActive ? fs.active : "#e2e8f0"}`,
                borderRadius: "6px",
                background: isActive ? fs.bg : "#fff",
                color: isActive ? fs.active : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {sig}
              <span
                style={{
                  background: isActive ? fs.active : "#e2e8f0",
                  color: isActive ? "#fff" : "#64748b",
                  borderRadius: "999px",
                  padding: "0 5px",
                  fontSize: "10px",
                  fontWeight: 800,
                  minWidth: "16px",
                  textAlign: "center",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
        <span
          style={{ marginLeft: "auto", fontSize: "11px", color: "#94a3b8" }}
        >
          {filteredRows.length} mã · trang {page + 1}/{totalPages}
        </span>
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
                "S2",
                "S1 (gần nhất)",
                "R1 (gần nhất)",
                "R2",
                "Tín hiệu",
                "Lý do",
              ].map((h) => (
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
            {pageRows.map((row) => {
              const d = row.data;
              const isActive = row.symbol === activeSymbol;
              const sig = d?.signal ?? "WATCH";
              const ss = SIGNAL_STYLE[sig];
              return (
                <tr
                  key={row.symbol}
                  onClick={() => onSelect(row.symbol)}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: isActive ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                >
                  <td style={{ padding: "9px 12px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        color: isActive ? "#2563eb" : "#1e293b",
                        fontSize: "13px",
                      }}
                    >
                      {row.symbol}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    {row.loading ? "⏳" : d ? fmt(d.close) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "#16a34a",
                      fontFamily: "monospace",
                      fontSize: "11.5px",
                    }}
                  >
                    {row.loading ? (
                      ""
                    ) : d?.s2 ? (
                      <>
                        <div style={{ color: "#94a3b8" }}>
                          {fmtP(
                            d.s1pct != null && d.s2
                              ? ((d.s2 - d.close) / d.close) * 100
                              : null,
                          )}
                        </div>
                        <div>{fmt(d.s2)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {row.loading ? (
                      ""
                    ) : d?.s1 ? (
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "5px",
                          padding: "3px 7px",
                          display: "inline-block",
                        }}
                      >
                        <div
                          style={{
                            color: "#059669",
                            fontWeight: 700,
                            fontSize: "11px",
                          }}
                        >
                          {fmtP(d.s1pct)}
                        </div>
                        <div
                          style={{ fontFamily: "monospace", color: "#065f46" }}
                        >
                          {fmt(d.s1)}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {row.loading ? (
                      ""
                    ) : d?.r1 ? (
                      <div
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "5px",
                          padding: "3px 7px",
                          display: "inline-block",
                        }}
                      >
                        <div
                          style={{
                            color: "#dc2626",
                            fontWeight: 700,
                            fontSize: "11px",
                          }}
                        >
                          {fmtP(d.r1pct)}
                        </div>
                        <div
                          style={{ fontFamily: "monospace", color: "#7f1d1d" }}
                        >
                          {fmt(d.r1)}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "#dc2626",
                      fontFamily: "monospace",
                      fontSize: "11.5px",
                    }}
                  >
                    {row.loading ? (
                      ""
                    ) : d?.r2 ? (
                      <>
                        <div style={{ color: "#94a3b8" }}>
                          {fmtP(
                            d.r2 ? ((d.r2 - d.close) / d.close) * 100 : null,
                          )}
                        </div>
                        <div>{fmt(d.r2)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {row.loading ? (
                      <span style={{ color: "#94a3b8" }}>⏳</span>
                    ) : (
                      <span
                        style={{
                          background: ss.bg,
                          color: ss.color,
                          border: `1px solid ${ss.border}`,
                          borderRadius: "5px",
                          padding: "3px 10px",
                          fontWeight: 800,
                          fontSize: "12px",
                        }}
                      >
                        {sig}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "#64748b",
                      fontSize: "11.5px",
                      maxWidth: "180px",
                    }}
                  >
                    {row.loading ? "" : (d?.reason ?? "—")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginTop: "12px",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: 700,
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: page === 0 ? "#f8fafc" : "#fff",
              color: page === 0 ? "#cbd5e1" : "#374151",
              cursor: page === 0 ? "default" : "pointer",
            }}
          >
            ← Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: i === page ? 800 : 500,
                border: `1px solid ${i === page ? "#2563eb" : "#e2e8f0"}`,
                borderRadius: "6px",
                background: i === page ? "#eff6ff" : "#fff",
                color: i === page ? "#2563eb" : "#374151",
                cursor: "pointer",
                minWidth: "32px",
              }}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: 700,
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: page === totalPages - 1 ? "#f8fafc" : "#fff",
              color: page === totalPages - 1 ? "#cbd5e1" : "#374151",
              cursor: page === totalPages - 1 ? "default" : "pointer",
            }}
          >
            Sau →
          </button>
        </div>
      )}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 12px",
          background: "#f8fafc",
          borderRadius: "7px",
          fontSize: "11px",
          color: "#64748b",
          lineHeight: "1.6",
        }}
      >
        <strong>Phương pháp:</strong> Tìm swing high/low (cửa sổ ±5 nến),
        cluster mức gần nhau (1,5%), chọn S1/R1 gần giá nhất. Tín hiệu{" "}
        <strong style={{ color: "#059669" }}>BUY</strong>: cách S1 &lt;6% + R/R
        ≥ 2x. <strong style={{ color: "#dc2626" }}>SELL</strong>: cách R1
        &lt;5%. Chỉ mang tính tham khảo kỹ thuật, không phải khuyến nghị đầu tư.
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = (searchParams.get("symbol") || "TCH").toUpperCase();
  const wlParam = searchParams.get("wl") || DEFAULT_WATCHLIST;

  const [symbol, setSymbol] = useState<string>(symbolParam);
  const [wlName, setWlName] = useState<string>(wlParam);

  useEffect(() => {
    if (symbolParam !== symbol) setSymbol(symbolParam);
  }, [symbolParam]);
  useEffect(() => {
    if (wlParam !== wlName) setWlName(wlParam);
  }, [wlParam]);

  const activeWl = getWatchlist(wlName) || WATCHLISTS[0];

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchParams({ symbol: sym, wl: wlName });
  };
  const handleSelectWatchlist = (name: string) => {
    setWlName(name);
    setSearchParams({ symbol, wl: name });
  };

  return (
    <div
      className="page-wrapper animate-fade-in"
      style={{
        padding: "28px 32px",
        maxWidth: "1440px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      {/* Top Header & Symbol Bar */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-glow-blue)",
            }}
          >
            <Bot size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "var(--text-main)",
                }}
              >
                Danh Mục & Đánh Giá Chuyên Sâu
              </h1>
              <span className="badge badge-info">Point-In-Time T</span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {activeWl.symbols.length} mã · mã đang chọn:{" "}
              <strong style={{ color: "var(--text-main)" }}>{symbol}</strong>
            </span>
          </div>
        </div>

        {/* Watchlist selector */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {WATCHLISTS.map((w) => (
            <button
              key={w.name}
              onClick={() => handleSelectWatchlist(w.name)}
              className={`btn ${w.name === wlName ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 700 }}
              title={`${w.name} · ${w.symbols.length} mã`}
            >
              {w.label}{" "}
              <span
                style={{
                  opacity: 0.6,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {w.symbols.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Symbol pills của watchlist đang chọn */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginTop: "-16px",
        }}
      >
        {activeWl.symbols.map((s) => (
          <button
            key={s}
            onClick={() => handleSelectSymbol(s)}
            className={`btn ${s === symbol ? "btn-primary" : "btn-secondary"}`}
            style={{
              padding: "5px 10px",
              fontSize: "11.5px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Bảng phân tích S/R của watchlist đang chọn ── */}
      <WatchlistAnalysisCard
        key={activeWl.name}
        title={activeWl.label}
        symbols={activeWl.symbols}
        activeSymbol={symbol}
        onSelect={handleSelectSymbol}
      />
    </div>
  );
};
