import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { StockLayout } from "./pages/StockLayout";
import { DataPage } from "./pages/DataPage";
import { ChartPage } from "./pages/ChartPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SymbolDetailPage } from "./pages/SymbolDetailPage";
import { CurrentWatchlistPage } from "./pages/CurrentWatchlistPage";
import { TestPage } from "./pages/TestPage";
import { MorningRoutinePage } from "./pages/MorningRoutinePage";
import { PersonalLayout } from "./pages/PersonalLayout";
import {
  RawDataTab,
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
            element={<Navigate to="/finance/personal/raw" replace />}
          />
          {/* ── Stock Subroutes ── */}
          <Route path="/finance/stock" element={<StockLayout />}>
            <Route index element={<Navigate to="morning" replace />} />
            <Route path="morning" element={<MorningRoutinePage />} />
            <Route path="routine" element={<Navigate to="morning" replace />} />
            <Route path="briefing" element={<Navigate to="morning" replace />} />
            <Route path="data" element={<DataPage />} />
            <Route path="chart" element={<ChartPage />} />
            <Route path="watchlist" element={<DashboardPage />} />
            <Route
              path="analysis"
              element={<Navigate to="../watchlist" replace />}
            />
            <Route path="symbol/:symbol" element={<SymbolDetailPage />} />
            <Route
              path="current-watchlist"
              element={<CurrentWatchlistPage />}
            />
            <Route path="test" element={<TestPage />} />
            <Route
              path="test-agent"
              element={<Navigate to="../test" replace />}
            />
            {/* CFA99 Observation is now a tab inside /finance/stock/test */}
            <Route
              path="observation"
              element={<Navigate to="../test" replace />}
            />
          </Route>

          {/* ── Personal Finance Subroutes ── */}
          <Route path="/finance/personal" element={<PersonalLayout />}>
            <Route index element={<Navigate to="raw" replace />} />
            <Route path="raw" element={<RawDataTab />} />
            <Route path="assess" element={<AssessmentTab />} />
            <Route path="recommend" element={<RecommendationTab />} />
            {/* aliases */}
            {/* "tool" and "visual" pages removed — redirect to raw data */}
            <Route path="tool" element={<Navigate to="../raw" replace />} />
            <Route path="tools" element={<Navigate to="raw" replace />} />
            <Route path="visual" element={<Navigate to="../raw" replace />} />
            <Route path="data" element={<Navigate to="raw" replace />} />
            <Route path="charts" element={<Navigate to="raw" replace />} />
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
            element={<Navigate to="/finance/stock/watchlist" replace />}
          />
          <Route
            path="*"
            element={<Navigate to="/finance/personal/raw" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
