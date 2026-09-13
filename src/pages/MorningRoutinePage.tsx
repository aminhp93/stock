import React, { useEffect, useState, useMemo } from "react";
import {
  Sunrise,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileText,
  Bookmark,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Globe,
  DollarSign,
  Flame,
  Layers,
  BarChart2,
  Maximize2,
  Calendar,
} from "lucide-react";
import {
  fetchMorningBriefing,
  saveMorningConfig,
  triggerGenerateBriefing,
} from "../services/api";
import { MorningBriefingResponse, MorningBriefingData } from "../types";

// Key lưu trữ tiến độ checklist trong ngày
const CHECKLIST_STORAGE_KEY = "stock_morning_checklist_v1";

interface ChecklistItem {
  id: string;
  timeSlot: string;
  stage: string;
  title: string;
  description: string;
  completed: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "pre_1",
    timeSlot: "08:00 – 08:20",
    stage: "Trước Giờ GD",
    title: "Soi chứng khoán Mỹ & Châu Á",
    description: "Xem Dow Jones, S&P 500, Nasdaq đêm qua; Nikkei, Hang Seng sáng nay để đánh giá tâm lý liên thị trường.",
    completed: false,
  },
  {
    id: "pre_2",
    timeSlot: "08:20 – 08:40",
    stage: "Trước Giờ GD",
    title: "Kiểm tra biến số vĩ mô (DXY, Tỷ giá, Dầu, Vàng)",
    description: "Đánh giá DXY, tỷ giá USD/VND liên ngân hàng, dầu Brent và giá vàng xem có cú sốc vĩ mô bất thường nào không.",
    completed: false,
  },
  {
    id: "pre_3",
    timeSlot: "08:40 – 08:55",
    stage: "Trước Giờ GD",
    title: "Đọc Bản Tin Sáng & Rà soát 4 mã danh mục",
    description: "Đọc nhận định phiên trước, dòng tiền khối ngoại. Kiểm tra TCH, MBS, HDG, PDR có mã nào vi phạm ngưỡng dừng lỗ (-7%) không.",
    completed: false,
  },
  {
    id: "pre_4",
    timeSlot: "08:55 – 09:00",
    stage: "Trước Giờ GD",
    title: "Lên kế hoạch & đặt điều kiện lệnh trước",
    description: "Xác định rõ nếu thị trường sập thủng hỗ trợ thì hạ mã nào; nếu hồi thì kiên nhẫn quan sát, không fomo.",
    completed: false,
  },
  {
    id: "ato_1",
    timeSlot: "09:00 – 09:15",
    stage: "Phiên ATO",
    title: "Quan sát mở cửa ATO & Độ lan tỏa nhóm trụ",
    description: "Không mua đuổi hoảng loạn trong 15 phút đầu. Xem các trụ Bank (VCB, TCB, MBB) và VinGroup (VIC, VHM) dẫn dắt hay kéo chỉ số.",
    completed: false,
  },
  {
    id: "morn_1",
    timeSlot: "09:30 – 11:30",
    stage: "Phiên Sáng",
    title: "Theo dõi thanh khoản & Khối ngoại mua/bán ròng",
    description: "So sánh GTGD khớp lệnh với trung bình 20 phiên. Quan sát lực xả ròng của khối ngoại ở cổ phiếu lớn.",
    completed: false,
  },
  {
    id: "noon_1",
    timeSlot: "11:30 – 13:00",
    stage: "Nghỉ Trưa",
    title: "Điểm tin trưa & Đánh giá độ rộng phiên sáng",
    description: "Kiểm tra tỷ lệ mã Tăng / Giảm, số mã thủng MA20/MA50 để biết đà bán có đang lan rộng toàn thị trường không.",
    completed: false,
  },
  {
    id: "after_1",
    timeSlot: "13:00 – 14:15",
    stage: "Phiên Chiều",
    title: "Giám sát áp lực cung hàng T+ về tài khoản",
    description: "Khung giờ 13h45 – 14h15 hàng về: Xem lực cầu hấp thụ có đủ khỏe để đỡ giá hay bị bán tháo dồn dập.",
    completed: false,
  },
  {
    id: "after_2",
    timeSlot: "14:30 – 14:45",
    stage: "Phiên ATC",
    title: "Xác nhận xu hướng chốt phiên ATC",
    description: "Quan sát khối lượng đột biến phiên ATC, tránh vào lệnh vội vã lúc 14h44.",
    completed: false,
  },
  {
    id: "post_1",
    timeSlot: "Sau 15:00",
    stage: "Sau Giờ GD",
    title: "Ghi chép nhật ký & Chạy Gatekeeper 7 tiêu chuẩn",
    description: "Cập nhật lãi/lỗ danh mục. Nếu muốn mua mã mới cho ngày mai, phải chạy qua hội đồng Gatekeeper thẩm định trước.",
    completed: false,
  },
];

export const MorningRoutinePage: React.FC = () => {
  const [briefingRes, setBriefingRes] = useState<MorningBriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"system" | "claude" | "notes">("system");
  
  // Claude artifact URL management
  const [claudeUrl, setClaudeUrl] = useState<string>("");
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState("");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // User notes
  const [notes, setNotes] = useState<string>("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_CHECKLIST;
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMorningBriefing();
      setBriefingRes(res);
      if (res.artifact_url) {
        setClaudeUrl(res.artifact_url);
        setTempUrl(res.artifact_url);
      }
      if (res.notes) {
        setNotes(res.notes);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu bản tin sáng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetChecklist = () => {
    if (window.confirm("Bạn có chắc muốn đặt lại toàn bộ checklist cho ngày mới?")) {
      const reset = DEFAULT_CHECKLIST.map((item) => ({ ...item, completed: false }));
      setChecklist(reset);
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(reset));
    }
  };

  const handleSaveClaudeUrl = async () => {
    if (!tempUrl.trim()) return;
    try {
      await saveMorningConfig({ artifact_url: tempUrl.trim() });
      setClaudeUrl(tempUrl.trim());
      setIsEditingUrl(false);
    } catch (err: any) {
      alert("Lỗi khi lưu link Claude: " + err.message);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await saveMorningConfig({ notes });
      setNotesSavedAlert(true);
      setTimeout(() => setNotesSavedAlert(false), 2500);
    } catch (err: any) {
      alert("Lỗi khi lưu ghi chú: " + err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText("/ban-tin-sang");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopyUrl = () => {
    if (claudeUrl) {
      navigator.clipboard.writeText(claudeUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleGenerateFresh = async () => {
    if (!window.confirm("Chạy tạo lại bản tin sáng từ dữ liệu PostgreSQL mới nhất?")) return;
    try {
      setLoading(true);
      await triggerGenerateBriefing();
      await loadData();
    } catch (err: any) {
      alert("Lỗi tạo bản tin: " + err.message);
      setLoading(false);
    }
  };

  const checklistStats = useMemo(() => {
    const total = checklist.length;
    const done = checklist.filter((i) => i.completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }, [checklist]);

  const data: MorningBriefingData | undefined = briefingRes?.data;

  // Market time status
  const marketSessionInfo = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const curTime = hours * 60 + minutes;

    if (curTime < 9 * 60) {
      return {
        label: "Trước giờ mở cửa (Pre-Market)",
        desc: "Thời điểm vàng để đọc tin vĩ mô, rà soát danh mục & đặt ngưỡng phòng thủ.",
        color: "#d97706",
        bg: "#fffbeb",
      };
    } else if (curTime >= 9 * 60 && curTime <= 9 * 60 + 15) {
      return {
        label: "Phiên ATO (09:00 – 09:15)",
        desc: "Khớp lệnh định kỳ mở cửa. Giữ kỷ luật: không mua đuổi hoảng loạn!",
        color: "#dc2626",
        bg: "#fef2f2",
      };
    } else if (curTime > 9 * 60 + 15 && curTime < 11 * 60 + 30) {
      return {
        label: "Phiên Khớp Lệnh Liên Tục Sáng",
        desc: "Theo dõi thanh khoản khớp lệnh và lực mua/bán ròng khối ngoại.",
        color: "#2563eb",
        bg: "#eff6ff",
      };
    } else if (curTime >= 11 * 60 + 30 && curTime < 13 * 60) {
      return {
        label: "Nghỉ Trưa (11:30 – 13:00)",
        desc: "Điểm tin buổi trưa, đánh giá độ rộng thị trường trước khi bước vào phiên chiều.",
        color: "#059669",
        bg: "#ecfdf5",
      };
    } else if (curTime >= 13 * 60 && curTime <= 14 * 60 + 30) {
      return {
        label: "Phiên Chiều (Áp lực hàng T+)",
        desc: "Quan sát hàng T+ về tài khoản và lực hấp thụ của dòng tiền.",
        color: "#7c3aed",
        bg: "#f5f3ff",
      };
    } else if (curTime > 14 * 60 + 30 && curTime <= 14 * 60 + 45) {
      return {
        label: "Phiên ATC (14:30 – 14:45)",
        desc: "Xác nhận giá đóng cửa của các quỹ và chỉ số VN-Index.",
        color: "#dc2626",
        bg: "#fef2f2",
      };
    } else {
      return {
        label: "Đã Đóng Cửa Phiên",
        desc: "Tổng kết phiên, rà soát danh mục và chuẩn bị kịch bản cho ngày mai.",
        color: "#475569",
        bg: "#f8fafc",
      };
    }
  }, []);

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: "1540px", margin: "0 auto" }}>
      {/* ── Top Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#fef3c7",
                color: "#b45309",
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "4px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <Sunrise size={12} /> Morning Routine Hub
            </span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Phiên chốt: <b>{data?.session || "Đang tải..."}</b> ({data?.weekday || "Hôm nay"})
            </span>
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Bảng Điều Khiển Đầu Ngày & Bản Tin Sáng
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Tổng hợp tin tức, vĩ mô, tình hình phiên trước và lộ trình công việc cần xem/làm trong ngày.
          </p>
        </div>

        {/* Action Controls & Session Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: marketSessionInfo.bg,
              border: `1px solid ${marketSessionInfo.color}33`,
              borderRadius: "8px",
            }}
          >
            <Clock size={14} color={marketSessionInfo.color} />
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: marketSessionInfo.color }}>
                {marketSessionInfo.label}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopyCommand}
            title="Sao chép lệnh /ban-tin-sang để paste vào Claude"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "7px 12px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            {copiedCmd ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
            <span>{copiedCmd ? "Đã chép /ban-tin-sang" : "Lệnh /ban-tin-sang"}</span>
          </button>

          <button
            onClick={handleGenerateFresh}
            title="Chạy script ban_tin_sang.py để dựng lại bản tin mới"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "7px 12px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#2563eb",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} />
            <span>Dựng lại Bản Tin</span>
          </button>
        </div>
      </div>

      {/* ── Key Market Metric Strip ── */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* VN-INDEX */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                VN-Index
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: data.vnindex.ret >= 0 ? "#16a34a" : "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                {data.vnindex.ret >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {data.vnindex.ret >= 0 ? `+${data.vnindex.ret}%` : `${data.vnindex.ret}%`}
              </span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {data.vnindex.close.toLocaleString("vi-VN", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              MA20: <b>{data.vnindex.ma20?.toLocaleString()}</b> · MA50: <b>{data.vnindex.ma50?.toLocaleString()}</b>
            </div>
          </div>

          {/* THANH KHOẢN HOSE */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                GTGD HOSE
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Khớp lệnh</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {data.exchanges?.HOSE?.[data.session]?.gtgd?.toLocaleString() || "—"} tỷ
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              HNX: <b>{data.exchanges?.HNX?.[data.session]?.gtgd?.toLocaleString() || "—"} tỷ</b>
            </div>
          </div>

          {/* KHỐI NGOẠI */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Khối Ngoại Ròng
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Phiên gần nhất</span>
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: (data.foreign_flow?.[0]?.[1] ?? 0) >= 0 ? "#16a34a" : "#dc2626",
                marginTop: "4px",
              }}
            >
              {(data.foreign_flow?.[0]?.[1] ?? 0) >= 0
                ? `+${data.foreign_flow?.[0]?.[1]} tỷ`
                : `${data.foreign_flow?.[0]?.[1]} tỷ`}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              5 phiên: {data.foreign_flow?.slice(0, 3).map(([_, v]) => (v >= 0 ? `+${v}` : `${v}`)).join(" · ")} tỷ
            </div>
          </div>

          {/* ĐỘ RỘNG THỊ TRƯỜNG */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Độ Rộng HOSE
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                % trên MA50: <b>{data.internals?.pct_ma50 ?? "—"}%</b>
              </span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              <span style={{ color: "#16a34a" }}>{data.exchanges?.HOSE?.[data.session]?.up ?? 0} tăng</span>
              <span style={{ color: "#94a3b8", margin: "0 6px" }}>/</span>
              <span style={{ color: "#dc2626" }}>{data.exchanges?.HOSE?.[data.session]?.dn ?? 0} giảm</span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Tỷ lệ Adv/Dec: <b>{data.internals?.adv_dec ?? "—"}</b> (Dưới 1.0 là suy yếu)
            </div>
          </div>

          {/* TÂM LÝ ĐÁM ĐÔNG */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Tâm Lý Thị Trường
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#d97706",
                  background: "#fef3c7",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                {data.psychology?.label || "NEUTRAL"}
              </span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {data.psychology?.gauge ?? 50} <span style={{ fontSize: "13px", fontWeight: 500, color: "#64748b" }}>/ 100</span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Vùng Trung tính: không có lợi thế định hướng rõ ràng.
            </div>
          </div>

          {/* DANH MỤC CỦA BẠN */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Danh Mục Của Bạn
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: data.portfolio?.day_pct >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {data.portfolio?.day_pct >= 0 ? `+${data.portfolio?.day_pct}%` : `${data.portfolio?.day_pct}%`}
              </span>
            </div>
            <div style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {(data.portfolio?.total_value / 1e6)?.toFixed(1)} Tr
            </div>
            <div style={{ fontSize: "11px", color: data.portfolio?.pnl_pct >= 0 ? "#16a34a" : "#dc2626", marginTop: "2px" }}>
              Tổng lỗ: <b>{data.portfolio?.pnl_pct}%</b> ({(data.portfolio?.pnl / 1e6)?.toFixed(1)} Tr)
            </div>
          </div>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* ── LEFT COLUMN: Widget Bản Tin Buổi Sáng ── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header & Tabs */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #e2e8f0",
              background: "#fafafa",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "#1c5c47",
                  color: "#fff",
                }}
              >
                <FileText size={15} />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                  Widget Bản Tin Buổi Sáng
                </h3>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Dữ liệu tự động hoặc đồng bộ link Claude Artifact
                </span>
              </div>
            </div>

            {/* Sub-tabs switcher */}
            <div
              style={{
                display: "flex",
                background: "#e2e8f0",
                padding: "3px",
                borderRadius: "8px",
                gap: "2px",
              }}
            >
              <button
                onClick={() => setActiveTab("system")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: activeTab === "system" ? 700 : 500,
                  background: activeTab === "system" ? "#fff" : "transparent",
                  color: activeTab === "system" ? "#1e293b" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: activeTab === "system" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                📰 Bản Tin Hệ Thống
              </button>
              <button
                onClick={() => setActiveTab("claude")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: activeTab === "claude" ? 700 : 500,
                  background: activeTab === "claude" ? "#fff" : "transparent",
                  color: activeTab === "claude" ? "#1e293b" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: activeTab === "claude" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                🤖 Claude Artifact
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: activeTab === "notes" ? 700 : 500,
                  background: activeTab === "notes" ? "#fff" : "transparent",
                  color: activeTab === "notes" ? "#1e293b" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: activeTab === "notes" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                📝 Ghi Chú Sáng
              </button>
            </div>
          </div>

          {/* TAB 1: Bản tin hệ thống HTML (Báo in) */}
          {activeTab === "system" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 18px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                <span>
                  Định dạng: <b>Báo in nghiên cứu nội bộ</b> · Cập nhật từ DB PostgreSQL
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href="/api/morning/html"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#2563eb",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "11.5px",
                    }}
                  >
                    <ExternalLink size={12} /> Mở toàn trang
                  </a>
                </div>
              </div>
              <div style={{ height: "820px", width: "100%", background: "#faf8f3" }}>
                <iframe
                  src="/api/morning/html"
                  title="Bản Tin Sáng Hệ Thống"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Claude Artifact Link & Viewer */}
          {activeTab === "claude" && (
            <div style={{ padding: "18px" }}>
              {/* Claude Link Management Card */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={16} color="#16a34a" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#166534" }}>
                      Link Claude Artifact Buổi Sáng
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditingUrl(!isEditingUrl)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#15803d",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {isEditingUrl ? "Đóng sửa" : "Đổi Link"}
                  </button>
                </div>

                {isEditingUrl ? (
                  <div style={{ marginTop: "10px" }}>
                    <input
                      type="text"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="Dán link artifact Claude: https://claude.ai/code/artifact/..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "12px",
                        border: "1px solid #86efac",
                        borderRadius: "6px",
                        marginBottom: "8px",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleSaveClaudeUrl}
                        style={{
                          padding: "6px 14px",
                          background: "#16a34a",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Lưu Link Này
                      </button>
                      <button
                        onClick={() => setIsEditingUrl(false)}
                        style={{
                          padding: "6px 12px",
                          background: "#e2e8f0",
                          color: "#334155",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: "8px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#166534",
                        wordBreak: "break-all",
                        background: "#dcfce7",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                      }}
                    >
                      {claudeUrl || "Chưa có link. Hãy nhấn 'Đổi Link' để dán link từ Claude."}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <a
                        href={claudeUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          background: "#15803d",
                          color: "#fff",
                          borderRadius: "6px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          textDecoration: "none",
                          boxShadow: "0 2px 6px rgba(21,128,61,0.2)",
                        }}
                      >
                        <ExternalLink size={14} /> Mở Bản Tin Trên Claude (Tab Mới)
                      </a>
                      <button
                        onClick={handleCopyUrl}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "8px 12px",
                          background: "#fff",
                          border: "1px solid #bbf7d0",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#166534",
                          cursor: "pointer",
                        }}
                      >
                        {copiedUrl ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                        {copiedUrl ? "Đã chép link" : "Sao chép link"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Embed Frame Preview / Fallback Notice */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  overflow: "hidden",
                  height: "680px",
                  position: "relative",
                  background: "#f8fafc",
                }}
              >
                {claudeUrl ? (
                  <iframe
                    src={claudeUrl}
                    title="Claude Morning Briefing Artifact"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#64748b",
                      padding: "20px",
                      textAlign: "center",
                    }}
                  >
                    <FileText size={36} color="#94a3b8" style={{ marginBottom: "10px" }} />
                    <h4 style={{ margin: "0 0 6px", color: "#334155" }}>Chưa có liên kết Claude Artifact</h4>
                    <p style={{ margin: 0, fontSize: "13px", maxWidth: "400px" }}>
                      Mỗi buổi sáng, bạn gõ <code>/ban-tin-sang</code> trong Claude. Claude sẽ dựng bản tin và cung cấp link artifact. Dán link vào ô phía trên để mở xem nhanh!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Ghi chú & Tóm tắt nhanh */}
          {activeTab === "notes" && (
            <div style={{ padding: "18px" }}>
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  Ghi Chú & Kế Hoạch Giao Dịch Trong Ngày
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  Dán nhanh các ý tóm tắt từ Claude hoặc Telegram, ghi lại kỷ luật giao dịch phiên hôm nay.
                </p>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={18}
                placeholder="Ví dụ:&#10;- Phiên hôm nay chú ý mốc hỗ trợ 1.782 của VN-Index.&#10;- TCH: Không bán tháo nếu giữ vững trên 11.200 (MA50).&#10;- MBS, HDG: Chưa vội bình quân giá..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  lineHeight: "1.6",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  style={{
                    padding: "8px 18px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: isSavingNotes ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingNotes ? "Đang lưu..." : "Lưu Ghi Chú Này"}
                </button>
                {notesSavedAlert && (
                  <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
                    ✓ Đã lưu thành công vào hệ thống!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Checklists, Macro Radar & Portfolio Alert ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* WIDGET 1: Checklist Lộ Trình Trong Ngày */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Lộ Trình & Việc Cần Làm Trong Ngày
                </h3>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Đã hoàn thành: <b>{checklistStats.done}/{checklistStats.total}</b> ({checklistStats.pct}%)
                </span>
              </div>
              <button
                onClick={handleResetChecklist}
                title="Làm mới trạng thái checklist cho ngày mới"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "11.5px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Làm mới ngày
              </button>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "#f1f5f9",
                borderRadius: "3px",
                overflow: "hidden",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  width: `${checklistStats.pct}%`,
                  height: "100%",
                  background: checklistStats.pct === 100 ? "#16a34a" : "#2563eb",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            {/* Task list grouped by stages */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto" }}>
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: item.completed ? "#f8fafc" : "#fff",
                    border: item.completed ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>
                    {item.completed ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <Circle size={16} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "3px",
                          background: item.completed ? "#e2e8f0" : "#eff6ff",
                          color: item.completed ? "#64748b" : "#2563eb",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.timeSlot}
                      </span>
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: item.completed ? "#94a3b8" : "#0f172a",
                          textDecoration: item.completed ? "line-through" : "none",
                        }}
                      >
                        {item.title}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "11.5px",
                        color: item.completed ? "#94a3b8" : "#64748b",
                        lineHeight: "1.4",
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WIDGET 2: Radar Vĩ Mô & Thị Trường Quốc Tế */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Globe size={16} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                Radar Vĩ Mô & Quốc Tế Cần Chú Ý
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* DXY */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <b style={{ color: "#0f172a" }}>DXY (Dollar Index)</b>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>101.4 pt · Hạ nhiệt</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>−0,15%</span>
                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>Giảm áp lực tỷ giá</div>
                </div>
              </div>

              {/* TỶ GIÁ USD/VND */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <b style={{ color: "#0f172a" }}>USD/VND (Liên ngân hàng)</b>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>25.420 VND · Sát trần</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>+0,05%</span>
                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>Cần theo dõi SBV</div>
                </div>
              </div>

              {/* US 10Y YIELD */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <b style={{ color: "#0f172a" }}>Lợi Suất Trái Phiếu Mỹ 10Y</b>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>3.72% · Đáy 15 tháng</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>−3 bps</span>
                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>Kỳ vọng FED hạ lãi suất</div>
                </div>
              </div>

              {/* DẦU BRENT */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <b style={{ color: "#0f172a" }}>Dầu Thô Brent</b>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>$71.5 / thùng</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>−1,2%</span>
                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>Giảm áp lực lạm phát</div>
                </div>
              </div>

              {/* VÀNG */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <b style={{ color: "#0f172a" }}>Vàng Thế Giới & SJC</b>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>$2.515/oz · SJC 81,5 Tr</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>Neo đỉnh</span>
                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>Dòng tiền còn thận trọng</div>
                </div>
              </div>
            </div>
          </div>

          {/* WIDGET 3: Cảnh Báo Sớm Danh Mục Nắm Giữ */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <ShieldAlert size={16} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                Giám Sát & Cảnh Báo 4 Mã Nắm Giữ
              </h3>
            </div>

            {/* Holding Items Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data?.portfolio?.rows
                ?.filter((r) => ["TCH", "MBS", "HDG", "PDR"].includes(r.sym))
                .map((item) => (
                  <div
                    key={item.sym}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                          {item.sym}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          Giá: <b>{item.price?.toLocaleString() || "—"}</b>
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: (item.day_pct ?? 0) >= 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {(item.day_pct ?? 0) >= 0 ? `+${item.day_pct}%` : `${item.day_pct}%`}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "5px",
                        fontSize: "11.5px",
                        color: "#64748b",
                      }}
                    >
                      <span>
                        Vị thế: <b style={{ color: "#334155" }}>{item.tech}</b>
                      </span>
                      <span style={{ color: (item.vs_cost_pct ?? 0) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                        Lỗ vs vốn: {item.vs_cost_pct}%
                      </span>
                    </div>

                    {item.foreign !== undefined && item.foreign !== 0 && (
                      <div style={{ fontSize: "10.5px", color: item.foreign > 0 ? "#16a34a" : "#dc2626", marginTop: "3px" }}>
                        Khối ngoại: {item.foreign > 0 ? `+${item.foreign}` : `${item.foreign}`} tỷ
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Tactical Discipline Reminder */}
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                fontSize: "11.5px",
                color: "#991b1b",
                lineHeight: "1.5",
              }}
            >
              <b>Lời nhắc kỷ luật đầu ngày:</b> Danh mục tập trung 100% vào BĐS & Chứng khoán — nhóm có độ rộng yếu nhất thị trường. Tuyệt đối không bình quân giá xuống khi chưa có dòng tiền lớn xác nhận tạo đáy!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
