import React from 'react';
import './App.css';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Aside from './components/Aside';
import OperationsTab from './pages/OperationsTab';
import EmployeeTab from './pages/EmployeeTab';
import SalaryTab from './pages/SalaryTab';
import AlertsTab from './pages/AlertsTab';
import ReportsTab from './pages/ReportsTab';
import SettingsTab from './pages/SettingsTab';

const DashboardContent: React.FC = () => {
  const { activeTab } = useDashboard();

  return (
    <div className="page">
      {/* Header: Thanh tiêu đề, logo, thông tin user */}
      <Header />

      {/* Nav: Thanh menu điều hướng bên trái */}
      <Sidebar />

      {/* Main: Khu vực hiển thị biểu đồ, bảng số liệu chính */}
      <main className="main">
        {activeTab === 'operations' && <OperationsTab />}
        {activeTab === 'employee' && <EmployeeTab />}
        {activeTab === 'salary' && <SalaryTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Aside: Khu vực thông báo phụ, lịch sử, hoặc bộ lọc nhanh bên phải */}
      <Aside />

      {/* Footer: Chân trang */}
      <footer className="footer">
        <p>&copy; 2026 - Báo cáo hệ thống GHN Express | Giám sát & Điều hành Vận hành Bưu cục</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
