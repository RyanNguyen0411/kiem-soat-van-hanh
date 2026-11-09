import React from 'react';
import { 
  RefreshCw, 
  ExternalLink, 
  Sun, 
  Moon, 
  Menu, 
  AlertCircle,
  Sparkles,
  FolderTree,
  LogOut 
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { logout } = useAuth();
  const { 
    syncStatus, 
    refreshData, 
    darkMode, 
    setDarkMode, 
    setIsSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    spreadsheetId
  } = useDashboard();

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
            title={isSidebarCollapsed ? 'Mở rộng thanh menu (Ctrl+B)' : 'Thu gọn thanh menu (Ctrl+B)'}
          >
            <Menu className="w-5 h-5 text-orange-400" />
          </button>

          <div className="flex items-center gap-2.5">
            {/* GHN Brand Symbol */}
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-white text-base shadow-sm tracking-tighter">
              GHN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-wide text-white uppercase font-sans">
                  GHN Area Operation Control Center
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                  Area Manager BI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Hệ thống Quản trị & Phân tích Vận hành 5 Bưu cục Khu vực Long An
              </p>
            </div>
          </div>
        </div>

        {/* Right: Sync Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection Status Badge (Bấm để mở Trung Tâm Kiểm Định Dữ Liệu) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-data-quality-modal'))}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs transition-colors cursor-pointer"
            title="Bấm để xem Báo Cáo Kiểm Định & Đối Chiếu Dữ Liệu 8 Sheets (Data Quality)"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncStatus.source === 'LIVE_SHEETS' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                syncStatus.source === 'LIVE_SHEETS' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="text-[11px] font-medium hidden md:inline text-slate-300">
              {syncStatus.source === 'LIVE_SHEETS' ? 'Google Sheets Trực tiếp' : 'Dữ liệu Kiểm toán'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
              ({syncStatus.lastUpdated})
            </span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            onClick={() => refreshData()}
            disabled={syncStatus.isSyncing}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              syncStatus.isSyncing 
                ? 'bg-slate-800 text-slate-400 cursor-wait' 
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm'
            }`}
            title="Đồng bộ lại toàn bộ 6 Sheet từ Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-orange-400' : ''}`} />
            <span className="hidden sm:inline">Làm mới dữ liệu</span>
          </button>

          {/* Cây Cơ Cấu / Menu Tổng Hợp Launcher */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-executive-directory'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer"
            title="Mở Sơ Đồ Cây Cơ Cấu & Menu Tổng Hợp Dashboard (Ctrl+M)"
          >
            <FolderTree className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Cây Cơ Cấu</span>
            <kbd className="hidden xl:inline px-1 py-0.2 rounded bg-slate-900 text-[9px] font-mono text-orange-400 border border-slate-700">
              Ctrl+M
            </kbd>
          </button>

          {/* Gemini AI Copilot Launcher */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-ai'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-sm transition-all cursor-pointer"
            title="Hỏi Cố Vấn Trưởng AI Gemini (AM Huy - ĐNB)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden md:inline">Gemini AI Copilot</span>
          </button>

          {/* View Google Sheets Link */}
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden lg:flex items-center gap-1 text-xs"
            title="Mở Google Sheets gốc"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Nguồn Sheets</span>
          </a>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Logout Button */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-[11px] font-bold text-white leading-tight">AM Huy (ĐNB)</span>
              <span className="text-[9px] text-emerald-400 font-semibold leading-tight">Area Manager &bull; Long An</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Đăng xuất khỏi hệ thống quản trị"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline text-[11px] text-slate-300 hover:text-red-300">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning Alert Banner if sync error */}
      {syncStatus.error && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{syncStatus.error}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="underline font-bold text-amber-400 hover:text-amber-200 ml-4"
          >
            Thử lại
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
