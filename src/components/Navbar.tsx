import React from "react";
import { NavLink } from "react-router-dom";
import { Database, BarChart3, Bot, Wallet } from "lucide-react";

export const Navbar: React.FC = () => {
  const getLinkClass = (isActive: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
      isActive
        ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-200"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 h-14 flex items-center px-6">
      <div className="w-full max-w-7xl mx-auto flex items-center">
        <nav className="flex items-center gap-2">
          <NavLink
            to="/finance/data"
            className={({ isActive }) => getLinkClass(isActive)}
          >
            <Database size={15} />
            <span>1. Dữ Liệu</span>
          </NavLink>
          <NavLink
            to="/finance/chart"
            className={({ isActive }) => getLinkClass(isActive)}
          >
            <BarChart3 size={15} />
            <span>2. Biểu Đồ</span>
          </NavLink>
          <NavLink
            to="/finance/dashboard"
            className={({ isActive }) => getLinkClass(isActive)}
          >
            <Bot size={15} />
            <span>3. Giả Lập</span>
          </NavLink>
          <NavLink
            to="/finance/personal"
            className={({ isActive }) => getLinkClass(isActive)}
          >
            <Wallet size={15} />
            <span>4. Tài Chính Cá Nhân</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
