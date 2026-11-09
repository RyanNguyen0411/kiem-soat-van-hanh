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
  FolderOpen,
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
    setIsSidebarCollapsed
  } = useDashboard();

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="px-3 py-1 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSidebar}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
            title={isSidebarCollapsed ? 'Mở rộng thanh menu (Ctrl+B)' : 'Thu gọn thanh menu (Ctrl+B)'}
          >
            <Menu className="w-4 h-4 text-orange-400" />
          </button>

          <div className="flex items-center gap-2">
            {/* GHN Brand Symbol */}
            <div className="w-6 h-6 rounded bg-orange-600 flex items-center justify-center font-black text-white text-xs shadow-2xs tracking-tighter shrink-0">
              GHN
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-wide text-white uppercase font-sans leading-none whitespace-nowrap">
                  GHN Operation Control
                </h1>
                <span className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full leading-tight">
                  Area Manager BI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden xl:block leading-none mt-0.5">
                Quản trị Vận hành Khu vực Long An
              </p>
            </div>
          </div>
        </div>

        {/* Right: Sync Status & Actions (Gọn, Nhỏ Lại Theo Yêu Cầu Của AM) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Connection Status Badge (Bấm để mở Trung Tâm Kiểm Định Dữ Liệu) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-data-quality-modal'))}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 text-[11px] transition-colors cursor-pointer"
            title="Bấm để xem Báo Cáo Kiểm Định & Đối Chiếu Dữ Liệu 8 Sheets (Data Quality)"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncStatus.source === 'LIVE_SHEETS' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                syncStatus.source === 'LIVE_SHEETS' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="font-medium hidden md:inline text-slate-300">
              {syncStatus.source === 'LIVE_SHEETS' ? 'Sheets Trực Tiếp' : 'Dữ Liệu Kiểm Toán'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono hidden xl:inline">
              ({syncStatus.lastUpdated.split(' ')[0]})
            </span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            onClick={() => refreshData()}
            disabled={syncStatus.isSyncing}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              syncStatus.isSyncing 
                ? 'bg-slate-800 text-slate-400 cursor-wait' 
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-2xs'
            }`}
            title="Đồng bộ lại toàn bộ dữ liệu từ Google Sheets"
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin text-orange-400' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Cây Cơ Cấu / Menu Tổng Hợp Launcher */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-executive-directory'))}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer"
            title="Mở Sơ Đồ Cây Cơ Cấu & Menu Tổng Hợp Dashboard (Ctrl+M)"
          >
            <FolderTree className="w-3 h-3 text-orange-400" />
            <span className="hidden sm:inline">Cây Cơ Cấu</span>
            <kbd className="hidden 2xl:inline px-1 py-0.2 rounded bg-slate-900 text-[8px] font-mono text-orange-400 border border-slate-700">
              Ctrl+M
            </kbd>
          </button>

          {/* Gemini AI Copilot Launcher */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-ai'))}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-2xs transition-all cursor-pointer"
            title="Hỏi Cố Vấn Trưởng AI Gemini (AM Huy - ĐNB)"
          >
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            <span className="hidden md:inline">Gemini AI</span>
          </button>

          {/* View Google Sheets Link (Được Khóa Bảo Mật - Cần Nhập Mật Khẩu Dashboard) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-google-sheets-lock'))}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors hidden lg:flex items-center gap-1 text-[11px] cursor-pointer"
            title="Mở Google Sheets gốc (Yêu cầu mật khẩu quản trị để bảo vệ dữ liệu)"
          >
            <ExternalLink className="w-3 h-3 text-amber-400" />
            <span>Nguồn Sheets</span>
          </button>

          {/* Thư mục lưu trữ Excel trên Google Drive của AM Huy */}
          <a
            href="https://drive.google.com/drive/folders/1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors hidden xl:flex items-center gap-1 text-[11px] cursor-pointer"
            title="Mở Thư mục lưu trữ file Excel xuất từ dashboard trên Google Drive"
          >
            <FolderOpen className="w-3 h-3 text-emerald-400" />
            <span>Thư mục Drive</span>
          </a>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* User Profile & Logout Button (Gọn & Nhỏ) */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/80">
            <div className="hidden xl:flex flex-col text-right leading-none">
              <span className="text-[10px] font-bold text-white leading-tight">AM Huy (ĐNB)</span>
              <span className="text-[8px] text-emerald-400 font-semibold leading-tight">Area Manager &bull; Long An</span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-1 px-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
              title="Đăng xuất khỏi hệ thống quản trị"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
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
