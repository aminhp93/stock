import React, { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  Layers,
  Youtube,
  Search,
} from "lucide-react";
import { fetchTckdAnalysis, TckdAnalysis, TckdVideo } from "../services/api";

// ─── Small reusable stat card ───────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  bg?: string;
}> = ({ icon, label, value, sub, color = "#2563eb", bg = "#eff6ff" }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      flex: "1 1 170px",
      minWidth: "150px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "7px",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 13, color })}
      </div>
      <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>
      {value}
    </div>
    {sub && <span style={{ fontSize: "10px", color: "#94a3b8" }}>{sub}</span>}
  </div>
);

const stanceColor = (type: string) =>
  type === "EXPANSION"
    ? "#16a34a"
    : type === "DEFENSIVE"
      ? "#dc2626"
      : "#64748b";
const stanceIcon = (type: string) =>
  type === "EXPANSION" ? (
    <TrendingUp size={12} />
  ) : type === "DEFENSIVE" ? (
    <TrendingDown size={12} />
  ) : (
    <Minus size={12} />
  );

export const TckdTab: React.FC = () => {
  const [data, setData] = useState<TckdAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlistFilter, setPlaylistFilter] = useState<string>("ALL");
  const [stanceFilter, setStanceFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchTckdAnalysis()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const playlistNames = useMemo(
    () => (data ? Object.keys(data.playlists) : []),
    [data],
  );

  const filteredVideos = useMemo<TckdVideo[]>(() => {
    if (!data) return [];
    return data.videos.filter((v) => {
      if (playlistFilter !== "ALL" && v.playlist_name !== playlistFilter)
        return false;
      if (stanceFilter !== "ALL" && v.stance_type !== stanceFilter)
        return false;
      if (search && !v.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [data, playlistFilter, stanceFilter, search]);

  if (loading)
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#64748b",
          fontSize: "13px",
          background: "#f8fafc",
          borderRadius: "10px",
        }}
      >
        ⏳ Đang tải dữ liệu phân tích Tài Chính & Kinh Doanh...
      </div>
    );

  if (error || !data)
    return (
      <div
        style={{
          padding: "16px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          fontSize: "12.5px",
        }}
      >
        ❌ {error || "Không có dữ liệu"}
      </div>
    );

  const m = data.macro_stance_summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          color: "#713f12",
        }}
      >
        📊{" "}
        <em>
          Chỉ số đo lường tâm lý vĩ mô & dòng tiền, tổng hợp từ transcript{" "}
          {data.total_videos_analyzed} video kênh Tài Chính Kinh Doanh (
          {(data.total_words_analyzed / 1000).toFixed(0)}k từ) — cập nhật{" "}
          {new Date(data.analyzed_at).toLocaleDateString("vi-VN")}.
        </em>
      </div>

      {/* Overview metrics */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <StatCard
          icon={<BarChart2 />}
          label="Điểm Tâm Lý Vĩ Mô (Macro Stance)"
          value={`${m.average_score >= 0 ? "+" : ""}${m.average_score.toFixed(3)}`}
          sub={m.overall_label}
          color={
            m.average_score >= 0.1
              ? "#16a34a"
              : m.average_score <= -0.1
                ? "#dc2626"
                : "#64748b"
          }
          bg={
            m.average_score >= 0.1
              ? "#f0fdf4"
              : m.average_score <= -0.1
                ? "#fef2f2"
                : "#f1f5f9"
          }
        />
        <StatCard
          icon={<TrendingUp />}
          label="Video Lạc Quan / Mở Rộng"
          value={m.expansion_video_count}
          sub={`${((m.expansion_video_count / data.total_videos_analyzed) * 100).toFixed(0)}% tổng số`}
          color="#16a34a"
          bg="#f0fdf4"
        />
        <StatCard
          icon={<Minus />}
          label="Video Trung Tính"
          value={m.neutral_video_count}
          sub={`${((m.neutral_video_count / data.total_videos_analyzed) * 100).toFixed(0)}% tổng số`}
          color="#64748b"
          bg="#f1f5f9"
        />
        <StatCard
          icon={<TrendingDown />}
          label="Video Thận Trọng / Phòng Thủ"
          value={m.defensive_video_count}
          sub={`${((m.defensive_video_count / data.total_videos_analyzed) * 100).toFixed(0)}% tổng số`}
          color="#dc2626"
          bg="#fef2f2"
        />
      </div>

      {/* Theme + Asset ranking side by side */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 340px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Layers size={13} /> Chủ Đề Vĩ Mô Nóng Nhất
          </div>
          {data.overall_theme_ranking.map(([theme, hits], i) => {
            const max = data.overall_theme_ranking[0][1];
            return (
              <div key={theme} style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    marginBottom: "3px",
                  }}
                >
                  <span style={{ color: "#374151", fontWeight: 600 }}>
                    {i + 1}. {theme}
                  </span>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>
                    {hits}
                  </span>
                </div>
                <div
                  style={{
                    height: "6px",
                    borderRadius: "3px",
                    background: "#f1f5f9",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(hits / max) * 100}%`,
                      background: "#2563eb",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            flex: "1 1 280px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <BarChart2 size={13} /> Mức Độ Quan Tâm Lớp Tài Sản
          </div>
          {data.overall_asset_ranking.map(([asset, hits]) => {
            const max = data.overall_asset_ranking[0][1];
            return (
              <div key={asset} style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    marginBottom: "3px",
                  }}
                >
                  <span style={{ color: "#374151", fontWeight: 600 }}>
                    {asset}
                  </span>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>
                    {hits}
                  </span>
                </div>
                <div
                  style={{
                    height: "6px",
                    borderRadius: "3px",
                    background: "#f1f5f9",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(hits / max) * 100}%`,
                      background: "#f59e0b",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-playlist summary */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {Object.entries(data.playlists).map(([name, p]) => (
          <div
            key={name}
            style={{
              flex: "1 1 260px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                color: "#1e293b",
                marginBottom: "4px",
              }}
            >
              📺 {name}
            </div>
            <div style={{ fontSize: "10.5px", color: "#64748b" }}>
              {p.video_count} video · {(p.total_words / 1000).toFixed(0)}k từ ·
              điểm TB{" "}
              <span
                style={{
                  fontWeight: 800,
                  color: p.avg_stance_score >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {p.avg_stance_score >= 0 ? "+" : ""}
                {p.avg_stance_score.toFixed(3)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Video table with filters */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "12px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginRight: "auto",
            }}
          >
            <Youtube size={13} /> Danh Sách Video ({filteredVideos.length})
          </div>
          <div style={{ position: "relative" }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tiêu đề..."
              style={{
                padding: "5px 8px 5px 26px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                fontSize: "11px",
                width: "160px",
              }}
            />
          </div>
          <select
            value={playlistFilter}
            onChange={(e) => setPlaylistFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              fontSize: "11px",
            }}
          >
            <option value="ALL">Tất cả Playlist</option>
            {playlistNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={stanceFilter}
            onChange={(e) => setStanceFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              fontSize: "11px",
            }}
          >
            <option value="ALL">Tất cả Tâm Lý</option>
            <option value="EXPANSION">🟢 Lạc quan / Mở rộng</option>
            <option value="NEUTRAL">⚪ Trung tính</option>
            <option value="DEFENSIVE">🔴 Thận trọng / Phòng thủ</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "11.5px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {[
                  "Video",
                  "Chủ đề chính",
                  "Tài sản chính",
                  "Điểm",
                  "Tâm lý",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "6px 10px",
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
              {filteredVideos.map((v) => (
                <tr key={v.video_id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "7px 10px", maxWidth: "360px" }}>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#1e293b",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      {v.title}
                    </a>
                  </td>
                  <td style={{ padding: "7px 10px", color: "#374151" }}>
                    {v.top_theme}
                  </td>
                  <td style={{ padding: "7px 10px", color: "#374151" }}>
                    {v.top_asset}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      fontWeight: 800,
                      color: stanceColor(v.stance_type),
                    }}
                  >
                    {v.stance_score >= 0 ? "+" : ""}
                    {v.stance_score.toFixed(2)}
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: 800,
                        color: stanceColor(v.stance_type),
                        background:
                          v.stance_type === "EXPANSION"
                            ? "#f0fdf4"
                            : v.stance_type === "DEFENSIVE"
                              ? "#fef2f2"
                              : "#f1f5f9",
                      }}
                    >
                      {stanceIcon(v.stance_type)}
                      {v.stance_type === "EXPANSION"
                        ? "Mở rộng"
                        : v.stance_type === "DEFENSIVE"
                          ? "Phòng thủ"
                          : "Trung tính"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
