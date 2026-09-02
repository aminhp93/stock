import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Database,
  BarChart3,
  Bot,
  Briefcase,
  Zap,
  Youtube,
} from "lucide-react";

const SUB_TABS = [
  { to: "/finance/stock/data", label: "Dữ Liệu", icon: <Database size={13} /> },
  {
    to: "/finance/stock/chart",
    label: "Biểu Đồ",
    icon: <BarChart3 size={13} />,
  },
  {
    to: "/finance/stock/watchlist",
    label: "Danh Mục",
    icon: <Bot size={13} />,
  },
  {
    to: "/finance/stock/current-watchlist",
    label: "Mã Đang Cầm",
    icon: <Briefcase size={13} />,
  },
  {
    to: "/finance/stock/test-agent",
    label: "Test Agent",
    icon: <Zap size={13} />,
  },
  {
    to: "/finance/stock/observation",
    label: "CFA99 Observation",
    icon: <Youtube size={13} />,
  },
];

export const StockLayout: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Sub-tab bar — with left padding to avoid overlapping floating button */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px 0 120px",
          display: "flex",
          alignItems: "flex-end",
          gap: "2px",
          flexShrink: 0,
        }}
      >
        {SUB_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: isActive ? "var(--accent-blue, #2563eb)" : "#64748b",
              borderBottom: isActive
                ? "2px solid var(--accent-blue, #2563eb)"
                : "2px solid transparent",
              background: isActive ? "#eff6ff" : "transparent",
              textDecoration: "none",
              borderRadius: "6px 6px 0 0",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            })}
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </div>
      {/* Page content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
};
