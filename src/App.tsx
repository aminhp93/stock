import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { DataPage } from './pages/DataPage';
import { ChartPage } from './pages/ChartPage';
import { DashboardPage } from './pages/DashboardPage';
import { FinancePage } from './pages/FinancePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/data" replace />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="*" element={<Navigate to="/data" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
