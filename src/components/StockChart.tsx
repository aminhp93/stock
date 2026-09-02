import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  CrosshairMode,
} from "lightweight-charts";
import { ChartDataPoint } from "../types";

/** Số nến trống chừa bên phải để nhãn R1/R2/S1/S2 không đè lên giá. */
const RIGHT_OFFSET_BARS = 30;

interface StockChartProps {
  data: ChartDataPoint[];
  symbol: string;
  loading?: boolean;
  showMA20?: boolean;
  showMA50?: boolean;
  showRSI?: boolean;
}

export const StockChart: React.FC<StockChartProps> = ({
  data,
  symbol,
  loading,
  showMA20 = true,
  showMA50 = true,
  showRSI = true,
}) => {
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartContainerRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!mainChartContainerRef.current || !rsiChartContainerRef.current) return;

    // 1. Create Main Candlestick Chart
    const mainChart = createChart(mainChartContainerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#64748b",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: true,
        rightOffset: RIGHT_OFFSET_BARS,
      },
    });

    const candleSeries = mainChart.addCandlestickSeries({
      upColor: "#059669",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#059669",
      wickDownColor: "#dc2626",
    });

    const volumeSeries = mainChart.addHistogramSeries({
      color: "#10b981",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    mainChart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const ma20Series = mainChart.addLineSeries({
      color: "#2563eb",
      lineWidth: 1,
      title: "MA20",
    });

    const ma50Series = mainChart.addLineSeries({
      color: "#ea580c",
      lineWidth: 1,
      title: "MA50",
    });

    // 2. Create RSI Sub-Chart
    const rsiChart = createChart(rsiChartContainerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#64748b",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: true,
        rightOffset: RIGHT_OFFSET_BARS,
      },
    });

    const rsiSeries = rsiChart.addLineSeries({
      color: "#d97706",
      lineWidth: 2,
      title: "RSI(14)",
    });

    // RSI Reference lines
    const overboughtLine = rsiChart.addLineSeries({
      color: "rgba(220, 38, 38, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
    });
    const oversoldLine = rsiChart.addLineSeries({
      color: "rgba(5, 150, 105, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
    });

    mainChartRef.current = mainChart;
    rsiChartRef.current = rsiChart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ma20SeriesRef.current = ma20Series;
    ma50SeriesRef.current = ma50Series;
    rsiSeriesRef.current = rsiSeries;

    // Synchronize Time Scales
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
    });
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) mainChart.timeScale().setVisibleLogicalRange(range);
    });

    // Resize Observer
    const handleResize = () => {
      if (mainChartContainerRef.current && mainChartRef.current) {
        mainChartRef.current.applyOptions({
          width: mainChartContainerRef.current.clientWidth,
          height: mainChartContainerRef.current.clientHeight,
        });
      }
      if (rsiChartContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({
          width: rsiChartContainerRef.current.clientWidth,
          height: rsiChartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (mainChartContainerRef.current)
      resizeObserver.observe(mainChartContainerRef.current);
    if (rsiChartContainerRef.current)
      resizeObserver.observe(rsiChartContainerRef.current);

    handleResize();

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
      rsiChart.remove();
    };
  }, []);

  // Update Data when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;

    const candleData: CandlestickData[] = [];
    const volData: HistogramData[] = [];
    const ma20Data: LineData[] = [];
    const ma50Data: LineData[] = [];
    const rsiData: LineData[] = [];
    const obData: LineData[] = [];
    const osData: LineData[] = [];

    data.forEach((d) => {
      candleData.push({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      });

      volData.push({
        time: d.time,
        value: d.volume,
        color:
          d.close >= d.open
            ? "rgba(5, 150, 105, 0.5)"
            : "rgba(220, 38, 38, 0.5)",
      });

      if (d.ma20 !== null && d.ma20 !== undefined) {
        ma20Data.push({ time: d.time, value: d.ma20 });
      }
      if (d.ma50 !== null && d.ma50 !== undefined) {
        ma50Data.push({ time: d.time, value: d.ma50 });
      }
      if (d.rsi !== null && d.rsi !== undefined) {
        rsiData.push({ time: d.time, value: d.rsi });
        obData.push({ time: d.time, value: 70 });
        osData.push({ time: d.time, value: 30 });
      }
    });

    if (candleSeriesRef.current) candleSeriesRef.current.setData(candleData);
    if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volData);
    if (ma20SeriesRef.current) ma20SeriesRef.current.setData(ma20Data);
    if (ma50SeriesRef.current) ma50SeriesRef.current.setData(ma50Data);
    if (rsiSeriesRef.current) rsiSeriesRef.current.setData(rsiData);

    // Mark highest high and lowest low within the data range
    if (candleSeriesRef.current && candleData.length > 0) {
      let highBar = candleData[0],
        lowBar = candleData[0];
      for (const bar of candleData) {
        if (bar.high > highBar.high) highBar = bar;
        if (bar.low < lowBar.low) lowBar = bar;
      }
      const markers: any[] = [];
      if (highBar.time !== lowBar.time) {
        markers.push({
          time: highBar.time,
          position: "aboveBar",
          color: "#059669",
          shape: "arrowDown",
          text: `H: ${highBar.high.toLocaleString("vi-VN")}`,
          size: 1,
        });
        markers.push({
          time: lowBar.time,
          position: "belowBar",
          color: "#dc2626",
          shape: "arrowUp",
          text: `L: ${lowBar.low.toLocaleString("vi-VN")}`,
          size: 1,
        });
      } else {
        // same bar — just mark high
        markers.push({
          time: highBar.time,
          position: "aboveBar",
          color: "#059669",
          shape: "arrowDown",
          text: `H: ${highBar.high.toLocaleString("vi-VN")} / L: ${lowBar.low.toLocaleString("vi-VN")}`,
          size: 1,
        });
      }
      markers.sort((a, b) => (a.time < b.time ? -1 : 1));
      candleSeriesRef.current.setMarkers(markers);
    }

    // ── Support / Resistance price lines ──────────────────────────────────
    // Algorithm: find swing pivots (window=5), cluster nearby levels,
    // pick top-2 resistance (above current close) & top-2 support (below).
    if (candleSeriesRef.current && candleData.length >= 10) {
      const WIN = 5;
      const currentClose = candleData[candleData.length - 1].close as number;

      // collect swing highs / lows
      const swingHighs: number[] = [];
      const swingLows: number[] = [];
      for (let i = WIN; i < candleData.length - WIN; i++) {
        const bar = candleData[i];
        const h = bar.high as number;
        const l = bar.low as number;
        let isHigh = true,
          isLow = true;
        for (let j = i - WIN; j <= i + WIN; j++) {
          if (j === i) continue;
          if ((candleData[j].high as number) >= h) isHigh = false;
          if ((candleData[j].low as number) <= l) isLow = false;
        }
        if (isHigh) swingHighs.push(h);
        if (isLow) swingLows.push(l);
      }

      // cluster nearby levels (within 1.5% of each other → keep the strongest)
      const cluster = (levels: number[]) => {
        const sorted = [...levels].sort((a, b) => a - b);
        const merged: number[] = [];
        for (const v of sorted) {
          const last = merged[merged.length - 1];
          if (last && Math.abs(v - last) / last < 0.015) {
            merged[merged.length - 1] = (last + v) / 2; // average
          } else {
            merged.push(v);
          }
        }
        return merged;
      };

      const resistanceLevels = cluster(swingHighs)
        .filter((v) => v > currentClose)
        .sort((a, b) => a - b) // nearest first
        .slice(0, 2);

      const supportLevels = cluster(swingLows)
        .filter((v) => v < currentClose)
        .sort((a, b) => b - a) // nearest first
        .slice(0, 2);

      // remove old price lines by recreating — store refs on series object
      const series = candleSeriesRef.current as any;
      if (series._srLines) {
        series._srLines.forEach((pl: any) => {
          try {
            series.removePriceLine(pl);
          } catch (_) {}
        });
      }
      series._srLines = [];

      resistanceLevels.forEach((price, idx) => {
        const pct = (((price - currentClose) / currentClose) * 100).toFixed(1);
        const pl = series.createPriceLine({
          price,
          color: idx === 0 ? "#dc2626" : "#f87171",
          lineWidth: idx === 0 ? 1.5 : 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `R${idx + 1} +${pct}% (${price.toLocaleString("vi-VN")})`,
        });
        series._srLines.push(pl);
      });

      supportLevels.forEach((price, idx) => {
        const pct = (((price - currentClose) / currentClose) * 100).toFixed(1);
        const pl = series.createPriceLine({
          price,
          color: idx === 0 ? "#059669" : "#34d399",
          lineWidth: idx === 0 ? 1.5 : 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `S${idx + 1} ${pct}% (${price.toLocaleString("vi-VN")})`,
        });
        series._srLines.push(pl);
      });
    }

    // Khung nhìn mặc định: ~150 phiên gần nhất + chừa RIGHT_OFFSET_BARS nến trống
    // bên phải để nhìn rõ R1/R2/S1/S2. Không dùng fitContent() (bỏ qua rightOffset).
    // Người dùng vẫn cuộn/zoom ra xem toàn bộ lịch sử được.
    if (data.length > 0) {
      const visibleBars = Math.min(data.length, 150);
      const range = {
        from: data.length - visibleBars,
        to: data.length - 1 + RIGHT_OFFSET_BARS,
      };
      mainChartRef.current?.timeScale().setVisibleLogicalRange(range);
      rsiChartRef.current?.timeScale().setVisibleLogicalRange(range);
    }
  }, [data]);

  // Toggle visibility of indicators
  useEffect(() => {
    if (ma20SeriesRef.current)
      ma20SeriesRef.current.applyOptions({ visible: showMA20 });
  }, [showMA20]);
  useEffect(() => {
    if (ma50SeriesRef.current)
      ma50SeriesRef.current.applyOptions({ visible: showMA50 });
  }, [showMA50]);
  useEffect(() => {
    if (rsiChartContainerRef.current) {
      rsiChartContainerRef.current.style.display = showRSI ? "" : "none";
    }
  }, [showRSI]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        background: "#ffffff",
      }}
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid rgba(37, 99, 235, 0.2)",
                borderTopColor: "var(--accent-blue)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Đang nạp nến giá {symbol} từ PostgreSQL...
            </span>
          </div>
        </div>
      )}

      {/* Floating Legend */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "16px",
          zIndex: 5,
          display: "flex",
          gap: "12px",
          background: "rgba(255, 255, 255, 0.92)",
          padding: "4px 12px",
          borderRadius: "6px",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(6px)",
          fontSize: "12px",
          pointerEvents: "none",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent-blue)",
            }}
          ></span>
          <span
            className="mono"
            style={{ color: "var(--text-main)", fontWeight: 600 }}
          >
            MA20
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent-orange)",
            }}
          ></span>
          <span
            className="mono"
            style={{ color: "var(--text-main)", fontWeight: 600 }}
          >
            MA50
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--bull-green)",
            }}
          ></span>
          <span
            className="mono"
            style={{ color: "var(--text-main)", fontWeight: 600 }}
          >
            Volume
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent-yellow)",
            }}
          ></span>
          <span
            className="mono"
            style={{ color: "var(--text-main)", fontWeight: 600 }}
          >
            RSI(14)
          </span>
        </div>
      </div>

      <div
        ref={mainChartContainerRef}
        style={{ flex: 3, width: "100%", minHeight: "340px" }}
      />
      <div style={{ height: "1px", background: "var(--border-color)" }} />
      <div
        ref={rsiChartContainerRef}
        style={{ flex: 1, width: "100%", minHeight: "120px" }}
      />
    </div>
  );
};
