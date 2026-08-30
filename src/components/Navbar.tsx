import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Wallet, ChevronRight } from "lucide-react";

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isStock = location.pathname.startsWith("/finance/stock");
  const isPersonal = location.pathname.startsWith("/finance/personal");
  const currentIcon = isPersonal ? <Wallet size={14} /> : <BarChart3 size={14} />;
  const currentLabel = isPersonal ? "Tài Chính" : "CK";

  return (
    <div style={{ position: 'fixed', top: '12px', left: '12px', zIndex: 1000 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 10px 5px 8px',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          fontSize: '12px', fontWeight: 700, color: '#1e293b',
        }}
      >
        {currentIcon}
        <span>{currentLabel}</span>
        <ChevronRight size={11} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#94a3b8' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(8px)', overflow: 'hidden', minWidth: '170px',
        }}>
          {[
            { to: '/finance/stock', label: 'Chứng Khoán', icon: <BarChart3 size={13} />, active: isStock },
            { to: '/finance/personal', label: 'Tài Chính Cá Nhân', icon: <Wallet size={13} />, active: isPersonal },
          ].map(item => (
            <button key={item.to} onClick={() => { navigate(item.to); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '9px 14px',
                background: item.active ? '#eff6ff' : 'transparent',
                color: item.active ? '#2563eb' : '#374151',
                border: 'none', cursor: 'pointer',
                fontSize: '12.5px', fontWeight: item.active ? 800 : 600,
                textAlign: 'left',
              }}
            >
              {item.icon}{item.label}
              {item.active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
