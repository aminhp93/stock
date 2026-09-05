import React, { useEffect, useRef, useState } from "react";
import {
  FlaskConical,
  PlayCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import {
  fetchStrategyList,
  fetchStrategyRank,
  triggerStrategyBacktest,
  fetchStrategyBacktestStatus,
  StrategyListItem,
  StrategyRankRow,
  StrategyBacktestResult,
  TradeBacktestResult,
} from "../services/api";

const fmtPx = (n: number) => n.toLocaleString("vi-VN");
const fmtPct = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;

const EdgeBadge: React.FC<{ edge: number | null | undefined; hit: number | null | undefined }> = ({
  edge,
  hit,
}) => {
  if (edge == null) {
    return (
      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>
        Chưa backtest
      </span>
    );
  }
  const positive = edge > 0.15;
  const negative = edge < -0.15;
  const color = positive ? "var(--bull-green)" : negative ? "var(--bear-red)" : "#94a3b8";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: "5px",
        background: positive ? "var(--bull-green-bg)" : negative ? "var(--bear-red-bg)" : "#f1f5f9",
        color,
      }}
      title={`Edge = return top-20 5 phiên trừ return trung bình toàn universe. Thắng ${hit ?? "?"}% số lần mẫu.`}
    >
      {positive ? <TrendingUp size={11} /> : negative ? <TrendingDown size={11} /> : null}
      edge {fmtPct(edge)} · thắng {hit != null ? `${hit.toFixed(0)}%` : "?"}
    </span>
  );
};

const TradeBadge: React.FC<{ bt: TradeBacktestResult | null | undefined }> = ({ bt }) => {
  if (!bt || bt.status !== "done" || bt.win_rate == null) {
    return (
      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>
        Chưa backtest
      </span>
    );
  }
  const r = bt.avg_r ?? 0;
  const positive = r > 0.03;
  const negative = r < -0.03;
  const color = positive ? "var(--bull-green)" : negative ? "var(--bear-red)" : "#94a3b8";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: "5px",
        background: positive ? "var(--bull-green-bg)" : negative ? "var(--bear-red-bg)" : "#f1f5f9",
        color,
      }}
      title={`Win rate ${bt.win_rate.toFixed(0)}% · Profit factor ${bt.profit_factor?.toFixed(2) ?? "?"} · ${bt.n_trades} lệnh`}
    >
      {positive ? <TrendingUp size={11} /> : negative ? <TrendingDown size={11} /> : null}
      thắng {bt.win_rate.toFixed(0)}% · {r >= 0 ? "+" : ""}
      {r.toFixed(2)}R
    </span>
  );
};

const StrategyCard: React.FC<{
  s: StrategyListItem;
  active: boolean;
  onSelect: () => void;
  onRunBacktest: () => void;
  running: boolean;
}> = ({ s, active, onSelect, onRunBacktest, running }) => {
  const bt = s.latest_backtest;
  const rankBt = s.kind === "rank" ? (bt as StrategyBacktestResult | null) : null;
  const tradeBt = s.kind === "trade" ? (bt as TradeBacktestResult | null) : null;
  return (
    <div
      onClick={onSelect}
      className="card"
      style={{
        padding: "14px 16px",
        cursor: "pointer",
        background: active ? "#eff6ff" : "#fff",
        border: active ? "1.5px solid var(--accent-blue)" : "1px solid var(--border-color)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--text-main)" }}>{s.label}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
            {s.desc}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
        {running || bt?.status === "running" ? (
          <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            <RefreshCw size={11} className="spin" /> Đang backtest…
          </span>
        ) : s.kind === "trade" ? (
          <TradeBadge bt={tradeBt} />
        ) : (
          <EdgeBadge edge={rankBt?.edge_5d} hit={rankBt?.hit_rate_5d} />
        )}
        <button
          className="btn btn-secondary"
          style={{ padding: "3px 8px", fontSize: "10.5px" }}
          onClick={(e) => {
            e.stopPropagation();
            onRunBacktest();
          }}
          disabled={running || bt?.status === "running"}
        >
          <PlayCircle size={12} style={{ marginRight: "3px" }} />
          {bt ? "Chạy lại" : "Chạy backtest"}
        </button>
      </div>
      {bt && bt.status === "done" && (
        <div style={{ marginTop: "6px", fontSize: "10px", color: "#94a3b8" }}>
          {s.kind === "trade" ? `${tradeBt?.n_trades} lệnh` : `${rankBt?.n_samples} mẫu`} · {bt.sample_start} → {bt.sample_end}
        </div>
      )}
      {bt?.status === "error" && (
        <div style={{ marginTop: "6px", fontSize: "10.5px", color: "var(--bear-red)" }}>Lỗi: {bt.error}</div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; tone?: "up" | "down" | "neutral" }> = ({
  label,
  value,
  tone = "neutral",
}) => (
  <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", minWidth: "110px" }}>
    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "3px" }}>{label}</div>
    <div
      style={{
        fontSize: "16px",
        fontWeight: 800,
        color: tone === "up" ? "var(--bull-green)" : tone === "down" ? "var(--bear-red)" : "var(--text-main)",
      }}
    >
      {value}
    </div>
  </div>
);

const FUND_ROWS: { key: "fund_all" | "fund_ok" | "fund_risky"; label: string }[] = [
  { key: "fund_all", label: "Tất cả giao dịch" },
  { key: "fund_ok", label: "Cơ bản ổn (có lãi, Nợ/VCSH ≤ 3)" },
  { key: "fund_risky", label: "Bị cờ kiệt quệ (lỗ ròng hoặc Nợ/VCSH > 3)" },
];

const TradeResultPanel: React.FC<{ bt: TradeBacktestResult | null }> = ({ bt }) => {
  if (!bt || bt.status === "none") {
    return (
      <div className="card" style={{ padding: "20px", textAlign: "center", fontSize: "12.5px", color: "#94a3b8" }}>
        Chưa có kết quả backtest — bấm "Chạy backtest" ở thẻ chiến lược phía trên (~1-2 phút).
      </div>
    );
  }
  if (bt.status === "running") {
    return (
      <div className="card" style={{ padding: "20px", textAlign: "center", fontSize: "12.5px", color: "#d97706" }}>
        <RefreshCw size={13} className="spin" style={{ marginRight: "6px", verticalAlign: "-2px" }} />
        Đang chạy backtest mô phỏng từng giao dịch (~1-2 phút)…
      </div>
    );
  }
  if (bt.status === "error") {
    return (
      <div className="card" style={{ padding: "16px 20px", fontSize: "12.5px", color: "var(--bear-red)" }}>
        Lỗi backtest: {bt.error}
      </div>
    );
  }

  const years = Object.keys(bt.year_breakdown || {}).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="card-header" style={{ marginBottom: "10px" }}>
          <div className="card-title">
            <TrendingUp size={16} color="var(--accent-blue)" />
            <span>Kết quả backtest — mô phỏng từng giao dịch</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {bt.sample_start} → {bt.sample_end} · {bt.n_trades} lệnh trên {bt.n_symbols} mã
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <StatBox label="Tỷ lệ thắng" value={`${bt.win_rate?.toFixed(1)}%`} tone={(bt.win_rate ?? 0) >= 50 ? "up" : "down"} />
          <StatBox
            label="R trung bình/lệnh"
            value={`${(bt.avg_r ?? 0) >= 0 ? "+" : ""}${bt.avg_r?.toFixed(2)}R`}
            tone={(bt.avg_r ?? 0) > 0 ? "up" : "down"}
          />
          <StatBox
            label="Profit factor"
            value={bt.profit_factor != null ? bt.profit_factor.toFixed(2) : "—"}
            tone={(bt.profit_factor ?? 0) >= 1 ? "up" : "down"}
          />
          <StatBox label="Lãi/lỗ TB mỗi lệnh" value={`${(bt.avg_ret_pct ?? 0) >= 0 ? "+" : ""}${bt.avg_ret_pct?.toFixed(1)}%`} tone={(bt.avg_ret_pct ?? 0) >= 0 ? "up" : "down"} />
          <StatBox label="Số phiên giữ TB" value={`${bt.avg_hold_days?.toFixed(0)} phiên`} />
          <StatBox label="Khoảng cách chặn lỗ TB" value={`${bt.avg_risk_pct?.toFixed(1)}%`} />
          <StatBox label="Lệnh mở đồng thời tối đa" value={`${bt.max_concurrent}`} />
        </div>
        {bt.exit_reasons && (
          <div style={{ marginTop: "12px", fontSize: "11.5px", color: "var(--text-muted)" }}>
            Lý do thoát lệnh:{" "}
            {Object.entries(bt.exit_reasons)
              .map(([k, v]) => `${k === "TARGET" ? "Chốt lời" : k === "STOP" ? "Chặn lỗ" : "Hết thời gian"} ${v}`)
              .join(" · ")}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="card-title" style={{ marginBottom: "10px" }}>
          <span>Tác động của bộ lọc cơ bản (point-in-time, trễ công bố 45 ngày)</span>
        </div>
        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "10px" }}>
          Chỉ loại 2 dấu hiệu kiệt quệ thật: đang lỗ ròng TTM, hoặc đòn bẩy cực đoan (Nợ/VCSH &gt; 3x kiểu
          HVN/Novaland). Bản đầu có thêm điều kiện "doanh thu YoY ≥ -20%" và ngưỡng Nợ/VCSH &gt; 2 nhưng bị bỏ vì
          gắn cờ sai hàng loạt cổ phiếu chu kỳ (thép, BĐS — so sánh với nền 2022 bất thường cao) và nhóm chứng
          khoán (đòn bẩy cao là đặc thù ngành, không phải kiệt quệ).
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Nhóm", "Số lệnh", "Tỷ lệ thắng", "R trung bình", "Profit factor"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 9px", fontSize: "10.5px", color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FUND_ROWS.map(({ key, label }) => {
                const b = bt[key];
                if (!b) return null;
                return (
                  <tr key={key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 9px", fontWeight: 700 }}>{label}</td>
                    <td style={{ padding: "7px 9px" }}>{b.n}</td>
                    <td style={{ padding: "7px 9px" }}>{b.win_rate.toFixed(1)}%</td>
                    <td style={{ padding: "7px 9px", color: b.avg_r >= 0 ? "var(--bull-green)" : "var(--bear-red)" }}>
                      {b.avg_r >= 0 ? "+" : ""}
                      {b.avg_r.toFixed(2)}R
                    </td>
                    <td style={{ padding: "7px 9px" }}>{b.profit_factor != null ? b.profit_factor.toFixed(2) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {bt.fund_risky && bt.fund_risky.n < 15 && (
          <div style={{ marginTop: "8px", fontSize: "10.5px", color: "#94a3b8" }}>
            Nhóm "bị cờ kiệt quệ" chỉ có {bt.fund_risky.n} lệnh — mẫu quá nhỏ để kết luận chắc chắn. Mẫu hình tích
            lũy sạch vốn đã tự loại phần lớn công ty kiệt quệ, nên bộ lọc này chủ yếu mang tính quản trị rủi ro
            (tránh các ca như HVN/Novaland) hơn là tạo thêm lợi thế thống kê rõ rệt.
          </div>
        )}
      </div>

      {years.length > 0 && (
        <div className="card" style={{ padding: "16px 20px" }}>
          <div className="card-title" style={{ marginBottom: "10px" }}>
            <span>Theo năm (kiểm tra edge có ổn định qua các giai đoạn thị trường không)</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Năm", "Số lệnh", "Tỷ lệ thắng", "Lãi/lỗ TB", "R trung bình", "Profit factor"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 9px", fontSize: "10.5px", color: "#64748b" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((y) => {
                  const b = bt.year_breakdown![y];
                  return (
                    <tr key={y} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "7px 9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{y}</td>
                      <td style={{ padding: "7px 9px" }}>{b.n}</td>
                      <td style={{ padding: "7px 9px" }}>{b.win_rate.toFixed(1)}%</td>
                      <td style={{ padding: "7px 9px", color: b.avg_ret_pct >= 0 ? "var(--bull-green)" : "var(--bear-red)" }}>
                        {b.avg_ret_pct >= 0 ? "+" : ""}
                        {b.avg_ret_pct.toFixed(1)}%
                      </td>
                      <td style={{ padding: "7px 9px", color: b.avg_r >= 0 ? "var(--bull-green)" : "var(--bear-red)" }}>
                        {b.avg_r >= 0 ? "+" : ""}
                        {b.avg_r.toFixed(2)}R
                      </td>
                      <td style={{ padding: "7px 9px" }}>{b.profit_factor != null ? b.profit_factor.toFixed(2) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "0 4px", lineHeight: 1.6 }}>
        ⚠️ Kết quả sàng lọc/backtest kỹ thuật trên dữ liệu quá khứ — không phải khuyến nghị đầu tư. Gợi ý cỡ lệnh:
        rủi ro 1-1.5% vốn/lệnh ÷ khoảng cách chặn lỗ (~{bt.avg_risk_pct?.toFixed(0)}%) → với vốn 300 triệu, mỗi lệnh
        full-size khoảng 19-28 triệu, chia 8-10 lệnh song song là hợp lý (tối đa quan sát được:{" "}
        {bt.max_concurrent} lệnh mở đồng thời toàn thị trường).
      </div>
    </div>
  );
};

export const StrategyTestTab: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyListItem[]>([]);
  const [active, setActive] = useState<string>("momentum");
  const [rankRows, setRankRows] = useState<StrategyRankRow[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [universeSize, setUniverseSize] = useState<number>(0);
  const [loadingRank, setLoadingRank] = useState(false);
  const [runningBacktest, setRunningBacktest] = useState<Record<string, boolean>>({});
  const [dateInput, setDateInput] = useState<string>("");
  const pollRef = useRef<number | null>(null);

  const loadList = () => {
    fetchStrategyList()
      .then((r) => setStrategies(r.strategies))
      .catch(() => setStrategies([]));
  };

  useEffect(() => {
    loadList();
  }, []);

  const loadRank = (strategy: string, asof?: string) => {
    setLoadingRank(true);
    fetchStrategyRank(strategy, 15, asof || undefined)
      .then((r) => {
        setRankRows(r.results || []);
        setAsOf(r.as_of || "");
        setUniverseSize(r.universe_size || 0);
      })
      .catch(() => setRankRows([]))
      .finally(() => setLoadingRank(false));
  };

  useEffect(() => {
    const s = strategies.find((x) => x.code === active);
    if (s && s.kind === "trade") return; // chiến lược trade không có xếp hạng cắt ngang
    loadRank(active, dateInput || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, strategies]);

  const handleRunBacktest = (code: string) => {
    setRunningBacktest((p) => ({ ...p, [code]: true }));
    triggerStrategyBacktest(code)
      .then(() => {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => {
          fetchStrategyBacktestStatus(code).then((st) => {
            if (st.status === "done" || st.status === "error") {
              if (pollRef.current) window.clearInterval(pollRef.current);
              setRunningBacktest((p) => ({ ...p, [code]: false }));
              loadList();
            }
          });
        }, 3000);
      })
      .catch(() => setRunningBacktest((p) => ({ ...p, [code]: false })));
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const activeStrategy = strategies.find((s) => s.code === active);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="card-header" style={{ marginBottom: "6px" }}>
          <div className="card-title">
            <FlaskConical size={16} color="var(--accent-blue)" />
            <span>Test Chiến Lược — Xếp Hạng "Xác Suất Tăng"</span>
          </div>
        </div>
        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          Có 2 loại chiến lược. <b>Xếp hạng cắt ngang</b> (Động lượng, Ngược chiều, PP2) chấm điểm 0–100 cho toàn
          bộ cổ phiếu đủ thanh khoản rồi so return 5 phiên sau của top-20 điểm cao nhất với return trung bình toàn
          thị trường — <b>edge dương</b> là có lợi thế dự báo thật. <b>Mô phỏng từng giao dịch</b> (Tích lũy →
          Breakout) có điểm mua/chặn lỗ/chốt lời cụ thể, backtest ra tỷ lệ thắng và R trung bình/lệnh thật. Output
          là công cụ nghiên cứu, không phải khuyến nghị đầu tư.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
        {strategies.map((s) => (
          <StrategyCard
            key={s.code}
            s={s}
            active={s.code === active}
            onSelect={() => setActive(s.code)}
            onRunBacktest={() => handleRunBacktest(s.code)}
            running={!!runningBacktest[s.code]}
          />
        ))}
        {strategies.length === 0 && (
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Đang tải danh sách chiến lược…</div>
        )}
      </div>

      {activeStrategy?.kind === "rank" &&
        activeStrategy.latest_backtest?.status === "done" &&
        ((activeStrategy.latest_backtest as StrategyBacktestResult).edge_5d ?? 0) <= 0.15 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--bear-red-bg)",
              color: "var(--bear-red)",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={15} />
            Chiến lược này chưa cho thấy lợi thế dự báo trong kiểm định lịch sử (edge{" "}
            {fmtPct((activeStrategy.latest_backtest as StrategyBacktestResult).edge_5d)}, thắng{" "}
            {(activeStrategy.latest_backtest as StrategyBacktestResult).hit_rate_5d?.toFixed(0)}%). Bảng xếp hạng dưới đây mô tả
            "mã nào đang mạnh nhất/yếu nhất theo mô hình" — không phải dự báo đáng tin cậy.
          </div>
        )}

      {activeStrategy?.kind === "trade" && (
        <TradeResultPanel bt={activeStrategy.latest_backtest as TradeBacktestResult | null} />
      )}

      {activeStrategy?.kind === "rank" && (
      <div className="card" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div className="card-title" style={{ margin: 0 }}>
            <TrendingUp size={16} color="var(--accent-blue)" />
            <span>Xếp hạng — {activeStrategy?.label || active}</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {asOf && `tính đến ${asOf} · ${universeSize} mã qua lọc thanh khoản`}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              style={{ fontSize: "11.5px", padding: "4px 6px", borderRadius: "6px", border: "1px solid var(--border-color)" }}
            />
            <button
              className="btn btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11.5px" }}
              onClick={() => loadRank(active, dateInput || undefined)}
            >
              Chạy xếp hạng
            </button>
          </div>
        </div>

        {loadingRank ? (
          <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
            Đang chấm điểm {universeSize || "toàn bộ"} mã…
          </div>
        ) : rankRows.length === 0 ? (
          <div style={{ fontSize: "12.5px", color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>
            Không có mã nào đạt điều kiện ngày {asOf || "này"}.
            {universeSize === 0 && " Chiến lược có thể chưa kích hoạt hôm nay (vd điều kiện thị trường chung chưa đạt)."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["#", "Mã", "Điểm", "Giá", ...rankRows[0].metrics.map((m) => m.label), "GTGD tỷ"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 9px", fontSize: "10.5px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankRows.map((r, i) => (
                  <tr key={r.symbol} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 9px", color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ padding: "7px 9px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>
                      {r.symbol}
                    </td>
                    <td style={{ padding: "7px 9px", fontWeight: 700 }}>{r.score.toFixed(0)}</td>
                    <td style={{ padding: "7px 9px", fontFamily: "'JetBrains Mono', monospace" }}>{fmtPx(r.close)}</td>
                    {r.metrics.map((m) => (
                      <td
                        key={m.label}
                        style={{
                          padding: "7px 9px",
                          whiteSpace: "nowrap",
                          color: m.tone === "up" ? "var(--bull-green)" : m.tone === "down" ? "var(--bear-red)" : "var(--text-main)",
                        }}
                      >
                        {m.value}
                      </td>
                    ))}
                    <td style={{ padding: "7px 9px" }}>{r.turn_bn.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
