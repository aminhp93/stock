import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Database, BarChart3, Bot, Wallet, Search, Zap } from 'lucide-react';

interface NavbarProps {
  currentSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentSymbol = 'TCH', onSelectSymbol }) => {
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = searchInput.trim().toUpperCase();
    if (sym) {
      if (onSelectSymbol) {
        onSelectSymbol(sym);
      }
      navigate(`/chart?symbol=${sym}`);
      setSearchInput('');
    }
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <NavLink to="/data" className="nav-brand">
          <div className="brand-icon-box">
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 800 }}>Stock Multi-Agent</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 500, letterSpacing: '0.2px' }}>
              Professional AI Investment System
            </span>
          </div>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/data" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <Database size={15} />
            <span>1. Dữ Liệu</span>
          </NavLink>
          <NavLink to="/chart" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <BarChart3 size={15} />
            <span>2. Biểu Đồ</span>
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <Bot size={15} />
            <span>3. Giả Lập</span>
          </NavLink>
          <NavLink to="/finance" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <Wallet size={15} />
            <span>4. Tài Chính Cá Nhân</span>
          </NavLink>
        </nav>
      </div>

      <div className="nav-actions">
        <form onSubmit={handleSearch} className="quick-search">
          <Search size={14} className="quick-search-icon" />
          <input
            type="text"
            placeholder={currentSymbol || 'MÃ CP...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="status-pill">
          <span className="pulse-dot"></span>
          <span>POSTGRES ONLINE</span>
        </div>
      </div>
    </header>
  );
};
