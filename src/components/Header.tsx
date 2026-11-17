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
  LogOut, 
  Settings,
  FileText,
  ZoomIn,
  ZoomOut,
  Type
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';
  const { 
    syncStatus, 
    refreshData, 
    darkMode, 
    setDarkMode, 
    setIsSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    fontScale,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize
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

          {/* Cụm điều khiển Zoom Màn hình (áp dụng toàn dashboard, toàn task) */}
          <div 
            className="flex items-center bg-slate-800/90 border border-slate-700/70 rounded-md p-0.5 text-[11px] shadow-2xs"
            title={`Phóng to / Thu nhỏ toàn bộ màn hình dashboard (Hiện tại: ${zoomLevel}%). Bấm % để đặt lại 100%.`}
          >
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoomLevel <= 70}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Thu nhỏ toàn màn hình (Tối thiểu 70%)"
              aria-label="Thu nhỏ màn hình"
            >
              <ZoomOut className="w-3 h-3 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-1 py-0.5 font-mono text-[10px] font-bold text-orange-400 hover:text-orange-300 hover:bg-slate-700/70 rounded cursor-pointer transition-colors whitespace-nowrap"
              title="Bấm để đặt lại Zoom 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoomLevel >= 150}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Phóng to toàn màn hình (Tối đa 150%)"
              aria-label="Phóng to màn hình"
            >
              <ZoomIn className="w-3 h-3 text-slate-300" />
            </button>
          </div>

          {/* Cụm điều khiển Cỡ chữ toàn Dashboard (áp dụng toàn dashboard, toàn task) */}
          <div 
            className="flex items-center bg-slate-800/90 border border-slate-700/70 rounded-md p-0.5 text-[11px] shadow-2xs"
            title={`Tăng / Giảm kích thước chữ toàn dashboard (Hiện tại: ${fontScale}%). Bấm % để đặt lại 100%.`}
          >
            <button
              type="button"
              onClick={decreaseFontSize}
              disabled={fontScale <= 75}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Giảm kích thước chữ toàn dashboard (Tối thiểu 75%)"
              aria-label="Giảm kích thước chữ"
            >
              A-
            </button>
            <button
              type="button"
              onClick={resetFontSize}
              className="px-1 py-0.5 font-mono text-[10px] font-bold text-sky-400 hover:text-sky-300 hover:bg-slate-700/70 rounded flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap"
              title="Bấm để đặt lại cỡ chữ 100%"
            >
              <Type className="w-2.5 h-2.5" />
              <span>{fontScale}%</span>
            </button>
            <button
              type="button"
              onClick={increaseFontSize}
              disabled={fontScale >= 135}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Tăng kích thước chữ toàn dashboard (Tối đa 135%)"
              aria-label="Tăng kích thước chữ"
            >
              A+
            </button>
          </div>

          {/* Nút Xem Lại Hướng Dẫn Vận Hành cho Phân Hệ Nhân Viên */}
          {isStaff && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-staff-notice-modal'))}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 transition-all cursor-pointer"
              title="Mở lại bảng Thông báo & Hướng dẫn sử dụng Dashboard"
            >
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden md:inline">Hướng dẫn</span>
            </button>
          )}

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
          {!isStaff && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-google-sheets-lock'))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors hidden lg:flex items-center gap-1 text-[11px] cursor-pointer"
              title="Mở Google Sheets gốc (Yêu cầu mật khẩu quản trị để bảo vệ dữ liệu)"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span>Nguồn Sheets</span>
            </button>
          )}

          {/* Thư mục Drive: yêu cầu xác nhận và kiểm tra vai trò trước khi mở */}
          {!isStaff && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-google-drive-lock'))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors hidden xl:flex items-center gap-1 text-[11px] cursor-pointer"
              title="Mở thư mục lưu trữ GHN (yêu cầu xác nhận quyền truy cập)"
            >
              <FolderOpen className="w-3 h-3 text-emerald-400" />
              <span>Thư mục Drive</span>
            </button>
          )}

          {/* Cài đặt kết nối: Link nguồn, Drive, Apps Script, ID & Token */}
          {!isStaff && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-settings-modal'))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Cài đặt kết nối (Link nguồn, Drive, Apps Script, ID & Token)"
              aria-label="Mở cài đặt kết nối"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

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
              <span className="text-[10px] font-bold text-white leading-tight">
                {isStaff ? (currentUser?.displayName || currentUser?.assignedPostOffice || 'Bưu Cục') : 'AM Huy (ĐNB)'}
              </span>
              <span className="text-[8px] text-emerald-400 font-semibold leading-tight">
                {isStaff ? `${currentUser?.postOfficeCode || 'Bưu Cục'} • Phân Hệ` : 'Area Manager • Long An'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-1 px-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
              title="Đăng xuất khỏi hệ thống"
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
