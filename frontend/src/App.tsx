import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Payments from './pages/Payments';
import SettingsPage from './pages/Settings';
import FinancialReport from './reports/FinancialReport';
import VacancyTracker from './reports/VacancyTracker';

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/reports/financial" element={<FinancialReport />} />
        <Route path="/reports/vacancy" element={<VacancyTracker />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
