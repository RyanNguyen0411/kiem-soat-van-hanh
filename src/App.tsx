import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GlobalFilter from './components/GlobalFilter';
import OperationsTab from './pages/OperationsTab';
import EmployeeTab from './pages/EmployeeTab';
import SalaryTab from './pages/SalaryTab';
import AlertsTab from './pages/AlertsTab';
import ReportsTab from './pages/ReportsTab';
import SettingsTab from './pages/SettingsTab';

const DashboardContent: React.FC = () => {
  const { activeTab } = useDashboard();

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header />
        <GlobalFilter />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'operations' && <OperationsTab />}
          {activeTab === 'employee' && <EmployeeTab />}
          {activeTab === 'salary' && <SalaryTab />}
          {activeTab === 'alerts' && <AlertsTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
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
