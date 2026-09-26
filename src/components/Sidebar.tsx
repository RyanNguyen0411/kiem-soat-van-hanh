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
  const { activeTab, setActiveTab, operationsData } = useDashboard();
  const criticalCount = operationsData.filter(item => item.status === 'Critical').length;

  return (
    <nav className="nav flex flex-col justify-between">
      <div>
        {/* Logo Branding */}
        <div className="flex items-center pb-4 mb-3 border-b border-neutral-200 dark:border-neutral-700 gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white shadow-xs">
            <PackageCheck className="w-5 h-5 text-white" />
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
        <ul className="space-y-1.5 list-none p-0 m-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'alerts' && criticalCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                      {criticalCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer / Version */}
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span>v1.0.0</span>
          <span className="text-emerald-500 flex items-center gap-1 font-sans">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Sẵn sàng
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
