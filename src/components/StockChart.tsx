import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, CrosshairMode } from 'lightweight-charts';
import { ChartDataPoint } from '../types';

interface StockChartProps {
  data: ChartDataPoint[];
  symbol: string;
  loading?: boolean;
}

export const StockChart: React.FC<StockChartProps> = ({ data, symbol, loading }) => {
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartContainerRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!mainChartContainerRef.current || !rsiChartContainerRef.current) return;

    // 1. Create Main Candlestick Chart
    const mainChart = createChart(mainChartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
      },
    });

    const candleSeries = mainChart.addCandlestickSeries({
      upColor: '#059669',
      downColor: '#dc2626',
      borderVisible: false,
      wickUpColor: '#059669',
      wickDownColor: '#dc2626',
    });

    const volumeSeries = mainChart.addHistogramSeries({
      color: '#10b981',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    mainChart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const ma20Series = mainChart.addLineSeries({
      color: '#2563eb',
      lineWidth: 2,
      title: 'MA20',
    });

    const ma50Series = mainChart.addLineSeries({
      color: '#ea580c',
      lineWidth: 2,
      title: 'MA50',
    });

    // 2. Create RSI Sub-Chart
    const rsiChart = createChart(rsiChartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
      },
    });

    const rsiSeries = rsiChart.addLineSeries({
      color: '#d97706',
      lineWidth: 2,
      title: 'RSI(14)',
    });

    // RSI Reference lines
    const overboughtLine = rsiChart.addLineSeries({
      color: 'rgba(220, 38, 38, 0.4)',
      lineWidth: 1,
      lineStyle: 2,
    });
    const oversoldLine = rsiChart.addLineSeries({
      color: 'rgba(5, 150, 105, 0.4)',
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
    if (mainChartContainerRef.current) resizeObserver.observe(mainChartContainerRef.current);
    if (rsiChartContainerRef.current) resizeObserver.observe(rsiChartContainerRef.current);

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
        color: d.close >= d.open ? 'rgba(5, 150, 105, 0.5)' : 'rgba(220, 38, 38, 0.5)',
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

    if (mainChartRef.current) mainChartRef.current.timeScale().fitContent();
    if (rsiChartRef.current) rsiChartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: '#ffffff' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(37, 99, 235, 0.2)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Đang nạp nến giá {symbol} từ PostgreSQL...</span>
          </div>
        </div>
      )}

      {/* Floating Legend */}
      <div style={{ position: 'absolute', top: '10px', left: '16px', zIndex: 5, display: 'flex', gap: '12px', background: 'rgba(255, 255, 255, 0.92)', padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backdropFilter: 'blur(6px)', fontSize: '12px', pointerEvents: 'none', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }}></span>
          <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>MA20</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-orange)' }}></span>
          <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>MA50</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--bull-green)' }}></span>
          <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Volume</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-yellow)' }}></span>
          <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>RSI(14)</span>
        </div>
      </div>

      <div ref={mainChartContainerRef} style={{ flex: 3, width: '100%', minHeight: '340px' }} />
      <div style={{ height: '1px', background: 'var(--border-color)' }} />
      <div ref={rsiChartContainerRef} style={{ flex: 1, width: '100%', minHeight: '120px' }} />
    </div>
  );
};
