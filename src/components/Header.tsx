import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { RefreshCw, Sun, Moon, Database, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Header: React.FC = () => {
  const { loading, refreshData, lastUpdated, nextUpdate, darkMode, setDarkMode, errors } = useDashboard();
  const hasErrors = Object.values(errors).some(err => err !== null);

  return (
    <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${hasErrors ? 'bg-red-400' : 'bg-emerald-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${hasErrors ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          </span>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            Kiểm Soát Vận Hành
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-primary/20 text-neutral-800 dark:text-primary border border-primary/30">
              GHN Express
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Sync Info */}
        <div className="hidden lg:flex items-center text-xs text-neutral-500 dark:text-neutral-400 gap-3 border-r border-neutral-200 dark:border-neutral-800 pr-4">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Đồng bộ: {lastUpdated ? format(lastUpdated, 'HH:mm:ss') : '--:--:--'}</span>
          </div>
          {nextUpdate && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Tiếp theo: {format(nextUpdate, 'HH:mm:ss')}</span>
            </div>
          )}
        </div>

        {/* Manual Refresh */}
        <button
          onClick={() => refreshData()}
          disabled={loading}
          title="Làm mới dữ liệu từ Google Sheets"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span className="hidden sm:inline">{loading ? 'Đang tải...' : 'Làm mới'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
