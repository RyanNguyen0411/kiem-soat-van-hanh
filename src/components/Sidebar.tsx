import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import type { ActiveTab } from '../types/dashboard';
import {
  Activity,
  Users,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Settings,
  PackageCheck,
} from 'lucide-react';

interface TabItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: TabItem[] = [
  { id: 'operations', label: 'Vận hành bưu cục', icon: Activity },
  { id: 'employee', label: 'Chi tiết nhân viên', icon: Users },
  { id: 'salary', label: 'Lương & Năng suất', icon: CreditCard },
  { id: 'alerts', label: 'Cảnh báo rủi ro', icon: AlertTriangle },
  { id: 'reports', label: 'Báo cáo & Xuất file', icon: BarChart3 },
  { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
];

const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, operationsData, isSidebarOpen } = useDashboard();
  const criticalCount = operationsData.filter(item => item.status === 'Critical').length;

  return (
    <aside className={`transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0 -ml-64 border-r-0'} bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between shrink-0 shadow-xs`}>
      <div>
        {/* Logo Branding */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800 gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-black shadow-xs">
            <PackageCheck className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <div className="font-black text-sm tracking-wider text-neutral-900 dark:text-neutral-100 uppercase">
              GHN Control
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Vận hành bưu cục
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/20 dark:bg-primary/25 text-neutral-950 dark:text-primary font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950 dark:text-primary' : 'text-neutral-500 dark:text-neutral-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'alerts' && criticalCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                    {criticalCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Version */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center justify-between font-mono">
          <span>Phiên bản: 1.0.0</span>
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Online
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
