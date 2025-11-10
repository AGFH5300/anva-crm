import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import EnquiriesPage from './pages/EnquiriesPage';
import OrdersPage from './pages/OrdersPage';
import FinancePage from './pages/FinancePage';
import LogisticsPage from './pages/LogisticsPage';
import ReportingPage from './pages/ReportingPage';
import SettingsPage from './pages/SettingsPage';

const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/enquiries" element={<EnquiriesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/logistics" element={<LogisticsPage />} />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

export default App;
