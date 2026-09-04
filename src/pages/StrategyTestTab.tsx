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

const StrategyCard: React.FC<{
  s: StrategyListItem;
  active: boolean;
  onSelect: () => void;
  onRunBacktest: () => void;
  running: boolean;
}> = ({ s, active, onSelect, onRunBacktest, running }) => {
  const bt = s.latest_backtest;
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
        ) : (
          <EdgeBadge edge={bt?.edge_5d} hit={bt?.hit_rate_5d} />
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
          {bt.n_samples} mẫu · {bt.sample_start} → {bt.sample_end}
        </div>
      )}
      {bt?.status === "error" && (
        <div style={{ marginTop: "6px", fontSize: "10.5px", color: "var(--bear-red)" }}>Lỗi: {bt.error}</div>
      )}
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
    loadRank(active, dateInput || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
          Mỗi chiến lược chấm điểm 0–100 cho toàn bộ cổ phiếu đủ thanh khoản, xếp hạng, và{" "}
          <b>kiểm định lịch sử</b> (backtest): so return 5 phiên sau của top-20 mã điểm cao nhất với
          return trung bình toàn thị trường. <b>Edge dương</b> = mô hình có lợi thế dự báo thật;{" "}
          <b>edge âm/gần 0</b> = mô hình không dự báo được, chỉ là mô tả trạng thái hiện tại.
          Output là công cụ nghiên cứu, không phải khuyến nghị đầu tư.
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

      {activeStrategy?.latest_backtest?.status === "done" &&
        (activeStrategy.latest_backtest.edge_5d ?? 0) <= 0.15 && (
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
            {fmtPct(activeStrategy.latest_backtest.edge_5d)}, thắng{" "}
            {activeStrategy.latest_backtest.hit_rate_5d?.toFixed(0)}%). Bảng xếp hạng dưới đây mô tả
            "mã nào đang mạnh nhất/yếu nhất theo mô hình" — không phải dự báo đáng tin cậy.
          </div>
        )}

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
    </div>
  );
};
