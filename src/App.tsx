import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { StockLayout } from "./pages/StockLayout";
import { DataPage } from "./pages/DataPage";
import { ChartPage } from "./pages/ChartPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TestAgentPage } from "./pages/TestAgentPage";
import { ObservationPage } from "./pages/ObservationPage";
import { PersonalLayout } from "./pages/PersonalLayout";
import {
  ToolTab,
  RawDataTab,
  VisualizeTab,
  AssessmentTab,
  RecommendationTab,
} from "./pages/FinancePage";

export const App: React.FC = () => {
  // When running as microfrontend (base=/stock), BrowserRouter needs the basename
  // so internal routes like /finance/stock resolve correctly under /stock/finance/stock
  const basename = import.meta.env.BASE_URL;
  return (
    <BrowserRouter basename={basename}>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/finance/personal/tool" replace />}
          />
          {/* ── Stock Subroutes ── */}
          <Route path="/finance/stock" element={<StockLayout />}>
            <Route index element={<Navigate to="data" replace />} />
            <Route path="data" element={<DataPage />} />
            <Route path="chart" element={<ChartPage />} />
            <Route path="analysis" element={<DashboardPage />} />
            <Route path="test-agent" element={<TestAgentPage />} />
            <Route path="observation" element={<ObservationPage />} />
          </Route>

          {/* ── Personal Finance Subroutes ── */}
          <Route path="/finance/personal" element={<PersonalLayout />}>
            <Route index element={<Navigate to="tool" replace />} />
            <Route path="tool" element={<ToolTab />} />
            <Route path="raw" element={<RawDataTab />} />
            <Route path="visual" element={<VisualizeTab />} />
            <Route path="assess" element={<AssessmentTab />} />
            <Route path="recommend" element={<RecommendationTab />} />
            {/* aliases */}
            <Route path="tools" element={<Navigate to="tool" replace />} />
            <Route path="data" element={<Navigate to="raw" replace />} />
            <Route path="charts" element={<Navigate to="visual" replace />} />
            <Route
              path="assessment"
              element={<Navigate to="assess" replace />}
            />
            <Route
              path="recommendation"
              element={<Navigate to="recommend" replace />}
            />
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
          <Route
            path="*"
            element={<Navigate to="/finance/personal/tool" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
