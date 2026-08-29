import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { DataPage } from "./pages/DataPage";
import { ChartPage } from "./pages/ChartPage";
import { DashboardPage } from "./pages/DashboardPage";
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
          <Route path="/finance/data" element={<DataPage />} />
          <Route path="/finance/chart" element={<ChartPage />} />
          <Route path="/finance/dashboard" element={<DashboardPage />} />
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
