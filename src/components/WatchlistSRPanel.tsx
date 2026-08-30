import React, { useEffect, useState } from "react";
import { fetchChartData } from "../services/api";
import { ChartDataPoint } from "../types";

interface SRLevel {
  price: number;
  pct: number;
}
interface SymbolSR {
  symbol: string;
  close: number;
  s1: SRLevel | null;
  s2: SRLevel | null;
  r1: SRLevel | null;
  r2: SRLevel | null;
  loading: boolean;
  error?: string;
}

const WIN = 5;

function calcSR(data: ChartDataPoint[]): {
  s1: SRLevel | null;
  s2: SRLevel | null;
  r1: SRLevel | null;
  r2: SRLevel | null;
  close: number;
} {
  if (data.length < WIN * 2 + 1)
    return { s1: null, s2: null, r1: null, r2: null, close: 0 };

  const currentClose = data[data.length - 1].close;
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = WIN; i < data.length - WIN; i++) {
    const h = data[i].high;
    const l = data[i].low;
    let isHigh = true,
      isLow = true;
    for (let j = i - WIN; j <= i + WIN; j++) {
      if (j === i) continue;
      if (data[j].high >= h) isHigh = false;
      if (data[j].low <= l) isLow = false;
    }
    if (isHigh) swingHighs.push(h);
    if (isLow) swingLows.push(l);
  }

  const cluster = (levels: number[]) => {
    const sorted = [...levels].sort((a, b) => a - b);
    const merged: number[] = [];
    for (const v of sorted) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(v - last) / last < 0.015) {
        merged[merged.length - 1] = (last + v) / 2;
      } else {
        merged.push(v);
      }
    }
    return merged;
  };

  const toLevel = (price: number): SRLevel => ({
    price,
    pct: ((price - currentClose) / currentClose) * 100,
  });

  const rLevels = cluster(swingHighs)
    .filter((v) => v > currentClose)
    .sort((a, b) => a - b);
  const sLevels = cluster(swingLows)
    .filter((v) => v < currentClose)
    .sort((a, b) => b - a);

  return {
    close: currentClose,
    r1: rLevels[0] != null ? toLevel(rLevels[0]) : null,
    r2: rLevels[1] != null ? toLevel(rLevels[1]) : null,
    s1: sLevels[0] != null ? toLevel(sLevels[0]) : null,
    s2: sLevels[1] != null ? toLevel(sLevels[1]) : null,
  };
}

const fmt = (n: number) => n.toLocaleString("vi-VN");
const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

interface Props {
  watchlistSymbols: string[];
  activeSymbol: string;
  onSelectSymbol: (s: string) => void;
}

export const WatchlistSRPanel: React.FC<Props> = ({
  watchlistSymbols,
  activeSymbol,
  onSelectSymbol,
}) => {
  const [rows, setRows] = useState<SymbolSR[]>(
    watchlistSymbols.map((s) => ({
      symbol: s,
      close: 0,
      s1: null,
      s2: null,
      r1: null,
      r2: null,
      loading: true,
    })),
  );

  useEffect(() => {
    // reset
    setRows(
      watchlistSymbols.map((s) => ({
        symbol: s,
        close: 0,
        s1: null,
        s2: null,
        r1: null,
        r2: null,
        loading: true,
      })),
    );

    const now = new Date();
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    const startDate = d.toISOString().split("T")[0];

    watchlistSymbols.forEach((symbol) => {
      fetchChartData(symbol, startDate)
        .then((res) => {
          const data = res.data || [];
          const sr = calcSR(data);
          setRows((prev) =>
            prev.map((r) =>
              r.symbol === symbol ? { ...r, ...sr, loading: false } : r,
            ),
          );
        })
        .catch((e) => {
          setRows((prev) =>
            prev.map((r) =>
              r.symbol === symbol
                ? { ...r, loading: false, error: e.message }
                : r,
            ),
          );
        });
    });
  }, [watchlistSymbols.join(",")]);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div
        style={{
          fontSize: "11.5px",
          fontWeight: 800,
          color: "#1e293b",
          marginBottom: "4px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span>⭐</span> Watchlist S/R{" "}
        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>
          1 năm
        </span>
      </div>

      {rows.map((row) => {
        const isActive = row.symbol === activeSymbol;
        return (
          <div
            key={row.symbol}
            onClick={() => onSelectSymbol(row.symbol)}
            style={{
              background: isActive ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${isActive ? "#bfdbfe" : "#e2e8f0"}`,
              borderRadius: "7px",
              padding: "7px 9px",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: "12px",
                  color: isActive ? "#2563eb" : "#1e293b",
                }}
              >
                {row.symbol}
              </span>
              {row.loading ? (
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>⏳</span>
              ) : row.error ? (
                <span style={{ fontSize: "10px", color: "#ef4444" }}>lỗi</span>
              ) : (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  {fmt(row.close)}
                </span>
              )}
            </div>

            {!row.loading && !row.error && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "3px",
                }}
              >
                {/* Resistance */}
                {[row.r1, row.r2].map((r, i) =>
                  r ? (
                    <div
                      key={`r${i}`}
                      style={{
                        background: i === 0 ? "#fef2f2" : "#fff5f5",
                        borderRadius: "4px",
                        padding: "2px 5px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        R{i + 1} {fmtPct(r.pct)}
                      </div>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: "10px",
                          color: "#7f1d1d",
                        }}
                      >
                        {fmt(r.price)}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`r${i}`}
                      style={{
                        background: "#f8fafc",
                        borderRadius: "4px",
                        padding: "2px 5px",
                      }}
                    >
                      <div style={{ fontSize: "9px", color: "#94a3b8" }}>
                        R{i + 1} —
                      </div>
                    </div>
                  ),
                )}
                {/* Support */}
                {[row.s1, row.s2].map((s, i) =>
                  s ? (
                    <div
                      key={`s${i}`}
                      style={{
                        background: i === 0 ? "#f0fdf4" : "#f7fef9",
                        borderRadius: "4px",
                        padding: "2px 5px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#059669",
                          fontWeight: 700,
                        }}
                      >
                        S{i + 1} {fmtPct(s.pct)}
                      </div>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: "10px",
                          color: "#064e3b",
                        }}
                      >
                        {fmt(s.price)}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`s${i}`}
                      style={{
                        background: "#f8fafc",
                        borderRadius: "4px",
                        padding: "2px 5px",
                      }}
                    >
                      <div style={{ fontSize: "9px", color: "#94a3b8" }}>
                        S{i + 1} —
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
