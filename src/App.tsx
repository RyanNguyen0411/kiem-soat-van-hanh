import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Users, 
  PackageX, 
  Menu 
} from 'lucide-react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { GlobalSpotlightSearch } from './components/common/GlobalSpotlightSearch';
import { GeminiAiDrawer } from './components/common/GeminiAiDrawer';
import { OperationalCalendarDrawer } from './components/common/OperationalCalendarDrawer';
import { ExecutiveDirectoryModal } from './components/common/ExecutiveDirectoryModal';
import { ExecutiveBreadcrumbBar } from './components/common/ExecutiveBreadcrumbBar';
import { TelegramReportModal } from './components/common/TelegramReportModal';
import { DataQualityModal } from './components/common/DataQualityModal';
import { GoogleSheetsLockModal } from './components/common/GoogleSheetsLockModal';
import { GoogleDriveExportToast } from './components/common/GoogleDriveExportToast';
import { SettingsModal } from './components/common/SettingsModal';

// 9 Required Tabs
import OverviewTab from './pages/OverviewTab';
import GtcPostOfficeTab from './pages/GtcPostOfficeTab';
import BaoCaoGtcBcTab from './pages/BaoCaoGtcBcTab';
import GtcEmployeeTab from './pages/GtcEmployeeTab';
import NhanSuTab from './pages/NhanSuTab';
import NghiViecTab from './pages/NghiViecTab';
import DailySalaryTab from './pages/DailySalaryTab';
import ReturnRateTab from './pages/ReturnRateTab';
import BacklogGltTab from './pages/BacklogGltTab';
import BacklogLcTab from './pages/BacklogLcTab';

const DashboardContent: React.FC = () => {
  const { activeTab, setActiveTab, setIsSidebarOpen } = useDashboard();

  return (
    <div className="h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-orange-500 selection:text-white overflow-hidden">
      {/* Executive Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Content Area with smooth scrolling */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-100/70 dark:bg-slate-900/90 pb-20 lg:pb-12 scroll-smooth">
          {/* Executive Breadcrumb & Highlighted Active View Banner */}
          <ExecutiveBreadcrumbBar />

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'gtc_buu_cuc' && <GtcPostOfficeTab />}
          {activeTab === 'bao_cao_gtc_bc' && <BaoCaoGtcBcTab />}
          {activeTab === 'gtc_nhan_vien' && <GtcEmployeeTab />}
          {activeTab === 'nhan_su' && <NhanSuTab />}
          {activeTab === 'ns_nghi_viec' && <NghiViecTab />}
          {activeTab === 'hoa_hong_ngay' && <DailySalaryTab />}
          {activeTab === 'ty_le_tra_hang' && <ReturnRateTab />}
          {activeTab === 'ton_dong_glt' && <BacklogGltTab />}
          {activeTab === 'ton_dong_lc' && <BacklogLcTab />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Tối ưu trải nghiệm bấm ngón cái trên Điện Thoại & iPad) */}
      <nav 
        aria-label="Thanh điều hướng di động"
        className="lg:hidden shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 z-30 px-1 py-1 flex items-center justify-around shadow-2xl safe-bottom"
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] ${
            activeTab === 'overview' 
              ? 'text-orange-500 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bao_cao_gtc_bc')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] relative ${
            activeTab === 'bao_cao_gtc_bc' 
              ? 'text-orange-500 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Báo cáo BC</span>
          <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gtc_nhan_vien')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] ${
            activeTab === 'gtc_nhan_vien' 
              ? 'text-orange-500 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Bưu tá</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ton_dong_glt')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] ${
            activeTab === 'ton_dong_glt' 
              ? 'text-orange-500 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageX className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Tồn GLT</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] text-slate-400 hover:text-orange-400"
        >
          <Menu className="w-5 h-5 mb-0.5 text-orange-400" />
          <span className="text-[10px] leading-tight font-medium text-orange-400">Tất cả Menu</span>
        </button>
      </nav>

      {/* Global Executive Status Bar Footer (Desktop Only) */}
      <footer className="hidden lg:flex shrink-0 bg-slate-900 border-t border-slate-800 text-slate-400 text-[11px] px-4 py-2 flex-row items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-2">
          <span className="font-bold text-orange-500">GHN Express</span>
          <span>&bull;</span>
          <span>Hệ thống Quản trị & Phân tích Vận hành Khu vực Long An</span>
          <span>&bull;</span>
          <span className="text-slate-300 font-semibold">AM Huy (ĐNB)</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span>Nguồn: Google Sheets (1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY)</span>
          <span>&bull;</span>
          <span className="text-emerald-400 font-medium">Bảo toàn dữ liệu & Loại trừ trùng lặp</span>
        </div>
      </footer>

      {/* Global Spotlight Search Widget */}
      <GlobalSpotlightSearch />

      {/* GHN Gemini AI Copilot */}
      <GeminiAiDrawer />

      {/* GHN Operational Calendar & E-commerce Forecast */}
      <OperationalCalendarDrawer />

      {/* Sơ Đồ Cây Cơ Cấu & Menu Tổng Hợp Dashboard (Ctrl+M) */}
      <ExecutiveDirectoryModal />

      {/* Báo Cáo Telegram Tồn Đọng GLT (120h & 192h) và Tồn LC */}
      <TelegramReportModal />

      {/* Trung Tâm Kiểm Định Dữ Liệu & Đối Chiếu Vận Hành (DQ Audit Center) */}
      <DataQualityModal />

      {/* Modal Bảo Vệ Link Nguồn Google Sheets (Yêu cầu mật khẩu dashboard) */}
      <GoogleSheetsLockModal />

      {/* Thông báo & Quản lý Xuất Dữ Liệu Lưu Trữ Google Drive */}
      <GoogleDriveExportToast />

      {/* Cài đặt kết nối: cập nhật link nguồn, Drive, Apps Script, ID & Token */}
      <SettingsModal />
    </div>
  );
};

const RootContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  );
}
