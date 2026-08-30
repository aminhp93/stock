import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { StockLayout } from "./pages/StockLayout";
import { DataPage } from "./pages/DataPage";
import { ChartPage } from "./pages/ChartPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TestAgentPage } from "./pages/TestAgentPage";
import { FinancePage } from "./pages/FinancePage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/finance/personal" replace />}
          />
          <Route path="/finance/stock" element={<StockLayout />}>
            <Route index element={<Navigate to="data" replace />} />
            <Route path="data" element={<DataPage />} />
            <Route path="chart" element={<ChartPage />} />
            <Route path="analysis" element={<DashboardPage />} />
            <Route path="test-agent" element={<TestAgentPage />} />
          </Route>
          {/* legacy redirects */}
          <Route
            path="/finance/data"
            element={<Navigate to="/finance/stock/data" replace />}
          />
          <Route
            path="/finance/chart"
            element={<Navigate to="/finance/stock/chart" replace />}
          />
          <Route
            path="/finance/dashboard"
            element={<Navigate to="/finance/stock/analysis" replace />}
          />
          <Route path="/finance/personal" element={<FinancePage />} />
          <Route
            path="*"
            element={<Navigate to="/finance/personal" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
