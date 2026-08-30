import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Wallet, Table2, BarChart2, TrendingUp, Target } from "lucide-react";

export const PERSONAL_SUB_TABS = [
  {
    to: "/finance/personal/tool",
    label: "1. Công Cụ Tài Chính",
    icon: <Wallet size={13} />,
  },
  {
    to: "/finance/personal/raw",
    label: "2. Dữ Liệu Thô",
    icon: <Table2 size={13} />,
  },
  {
    to: "/finance/personal/visual",
    label: "3. Trực Quan Hoá",
    icon: <BarChart2 size={13} />,
  },
  {
    to: "/finance/personal/assess",
    label: "4. Đánh Giá Chung",
    icon: <TrendingUp size={13} />,
  },
  {
    to: "/finance/personal/recommend",
    label: "5. Khuyến Nghị",
    icon: <Target size={13} />,
  },
];

export const PersonalLayout: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Sub-tab bar — with left padding to avoid overlapping floating switch button */}
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
        {PERSONAL_SUB_TABS.map((tab) => (
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
        <div
          className="page-wrapper animate-fade-in"
          style={{
            padding: "24px 32px 48px",
            maxWidth: "1440px",
            margin: "0 auto",
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};
