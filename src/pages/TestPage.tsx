import React, { useState } from "react";
import { Bot, FlaskConical } from "lucide-react";
import { TestAgentPage } from "./TestAgentPage";
import { StrategyTestTab } from "./StrategyTestTab";

const TABS = [
  { id: "agent", label: "Test Agent", icon: <Bot size={13} /> },
  { id: "strategy", label: "Test Chiến Lược", icon: <FlaskConical size={13} /> },
] as const;

export const TestPage: React.FC = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("agent");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "#fff",
          padding: "6px",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
          maxWidth: "1440px",
          margin: "16px auto 0",
          width: "calc(100% - 64px)",
        }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                fontSize: "12.5px",
                fontWeight: 700,
                borderRadius: "7px",
                border: "none",
                background: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#fff" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "agent" && <TestAgentPage />}
      {tab === "strategy" && (
        <div
          className="page-wrapper animate-fade-in"
          style={{ padding: "0 32px 24px", maxWidth: "1440px", margin: "0 auto" }}
        >
          <StrategyTestTab />
        </div>
      )}
    </div>
  );
};
