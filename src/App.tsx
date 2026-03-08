import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import OrdersPage from './pages/OrdersPage';
import FinancePage from './pages/FinancePage';
import LogisticsPage from './pages/LogisticsPage';
import ReportingPage from './pages/ReportingPage';
import SettingsPage from './pages/SettingsPage';
import EnquiriesListPage from './pages/dashboard/EnquiriesListPage';
import NewEnquiryPage from './pages/dashboard/NewEnquiryPage';
import EnquiryDetailPage from './pages/dashboard/EnquiryDetailPage';
import QuotationsListPage from './pages/dashboard/QuotationsListPage';
import QuotationDetailPage from './pages/dashboard/QuotationDetailPage';

const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/enquiries" element={<EnquiriesListPage />} />
        <Route path="/dashboard/enquiries/new" element={<NewEnquiryPage />} />
        <Route path="/dashboard/enquiries/:id" element={<EnquiryDetailPage />} />
        <Route path="/dashboard/quotations" element={<QuotationsListPage />} />
        <Route path="/dashboard/quotations/:id" element={<QuotationDetailPage />} />

        <Route path="/clients" element={<ClientsPage />} />
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
