import React from 'react';
import {
  ChevronRight, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Building2, 
  Users, 
  PackageX, 
  Truck, 
  RotateCcw, 
  UserCheck, 
  UserMinus, 
  Coins,
  Send,
  ShieldCheck
} from 'lucide-react';
import { useDashboard, useTab } from '../../context/DashboardContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeOrderId } from '../../services/kpiEngine';
import type { TabType } from '../../types/dashboard';

interface TabMeta {
  id: TabType;
  title: string;
  categoryName: string;
  categoryShort: string;
  categoryIcon: React.ComponentType<{ className?: string }>;
  icon: React.ComponentType<{ className?: string }>;
  subTitle: string;
  badge: string;
  badgeColor: string;
  accentGradient: string;
  siblings: { id: TabType; label: string; badge?: string }[];
}

export const ExecutiveBreadcrumbBar: React.FC = () => {
  const { activeTab } = useTab();
  const { setActiveTab, dataset } = useDashboard();
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';

  const uniqueCouriers = new Set(dataset.gtcNhanVien.map(r => r.maNV)).size || 72;
  const uniqueGltCount = new Set(dataset.tonDongGlt.map(r => normalizeOrderId(r.maDonHang)).filter(Boolean)).size;
  const uniqueLcCount = new Set(dataset.tonDongLc.map(r => normalizeOrderId(r.maDonHang)).filter(Boolean)).size;
  const activeStaffTotal = dataset.nhanSu.length || 81;
  const resignedStaffTotal = dataset.nghiViec?.length || 81;

  // Tra cứu siêu dữ liệu của tab hiện tại để render Breadcrumb & Highlight Tiêu Đề
  const tabMetaMap: Record<TabType, TabMeta> = {
    overview: {
      id: 'overview',
      title: 'TỔNG QUAN (BI CONTROL CENTER)',
      categoryName: 'VẬN HÀNH & GTC',
      categoryShort: 'Vận Hành',
      categoryIcon: LayoutDashboard,
      icon: LayoutDashboard,
      subTitle: 'Trung tâm chỉ huy điều hành vĩ mô & cảnh báo trọng yếu 5 bưu cục Long An',
      badge: 'BI Center',
      badgeColor: 'bg-orange-600 text-white',
      accentGradient: 'from-orange-500/20 via-amber-500/10 to-transparent border-orange-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo Ngày', badge: 'Live' },
        { id: 'gtc_buu_cuc', label: 'GTC Bưu Cục', badge: '5 BC' },
        { id: 'gtc_nhan_vien', label: 'GTC Bưu Tá', badge: `${uniqueCouriers} NV` }
      ]
    },
    bao_cao_gtc_bc: {
      id: 'bao_cao_gtc_bc',
      title: 'BÁO CÁO NGÀY',
      categoryName: 'VẬN HÀNH & GTC',
      categoryShort: 'Vận Hành',
      categoryIcon: LayoutDashboard,
      icon: FileSpreadsheet,
      subTitle: 'Chi tiết sản lượng gán, tỷ lệ GTC Ca 1, Ca 2 và đối soát bưu cục theo ngày',
      badge: 'Live Hot',
      badgeColor: 'bg-emerald-600 text-white',
      accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo Ngày' },
        { id: 'gtc_buu_cuc', label: 'GTC Bưu Cục' },
        { id: 'gtc_nhan_vien', label: 'GTC Bưu Tá' }
      ]
    },
    gtc_buu_cuc: {
      id: 'gtc_buu_cuc',
      title: 'GTC 5 BƯU CỤC KHU VỰC LONG AN',
      categoryName: 'VẬN HÀNH & GTC',
      categoryShort: 'Vận Hành',
      categoryIcon: LayoutDashboard,
      icon: Building2,
      subTitle: 'So sánh hiệu suất giao thành công, tỷ lệ gán và ngày trũng trong tuần',
      badge: '5 Bưu Cục',
      badgeColor: 'bg-blue-600 text-white',
      accentGradient: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo Ngày' },
        { id: 'gtc_buu_cuc', label: 'GTC Bưu Cục' },
        { id: 'gtc_nhan_vien', label: 'GTC Bưu Tá' }
      ]
    },
    gtc_nhan_vien: {
      id: 'gtc_nhan_vien',
      title: 'GTC BƯU TÁ & NĂNG SUẤT CA ĐI',
      categoryName: 'VẬN HÀNH & GTC',
      categoryShort: 'Vận Hành',
      categoryIcon: LayoutDashboard,
      icon: Users,
      subTitle: `Bảng xếp hạng ${uniqueCouriers} bưu tá, khoanh vùng nhóm rủi ro (<60% GTC) và năng suất`,
      badge: `${uniqueCouriers} Bưu Tá`,
      badgeColor: 'bg-indigo-600 text-white',
      accentGradient: 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo Ngày' },
        { id: 'gtc_buu_cuc', label: 'GTC Bưu Cục' },
        { id: 'gtc_nhan_vien', label: 'GTC Bưu Tá' }
      ]
    },
    ton_dong_glt: {
      id: 'ton_dong_glt',
      title: 'TỒN ĐỌNG GIAO - LẤY - TRẢ (GLT)',
      categoryName: 'TỒN ĐỌNG & XỬ LÝ SLA',
      categoryShort: 'Tồn Đọng & SLA',
      categoryIcon: PackageX,
      icon: PackageX,
      subTitle: 'Quản trị và giải phóng tồn kho, cảnh báo khẩn cấp >120h và >192h',
      badge: `${uniqueGltCount.toLocaleString('vi-VN')} Đơn Tồn`,
      badgeColor: 'bg-rose-600 text-white',
      accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent border-rose-500/30',
      siblings: [
        { id: 'ton_dong_glt', label: 'Tồn Đọng GLT', badge: `${uniqueGltCount.toLocaleString('vi-VN')}` },
        { id: 'ton_dong_lc', label: 'Tồn Đọng LC', badge: `${uniqueLcCount.toLocaleString('vi-VN')}` },
        { id: 'ty_le_tra_hang', label: 'Tỷ Lệ Trả Hàng', badge: 'SLA' }
      ]
    },
    ton_dong_lc: {
      id: 'ton_dong_lc',
      title: 'TỒN ĐỌNG LUÂN CHUYỂN (LC)',
      categoryName: 'TỒN ĐỌNG & XỬ LÝ SLA',
      categoryShort: 'Tồn Đọng & SLA',
      categoryIcon: PackageX,
      icon: Truck,
      subTitle: `Giám sát ${uniqueLcCount.toLocaleString('vi-VN')} đơn hàng trung chuyển luân chuyển kho & phòng ngừa tắc bưu cục`,
      badge: `${uniqueLcCount.toLocaleString('vi-VN')} Đơn LC`,
      badgeColor: 'bg-blue-600 text-white',
      accentGradient: 'from-blue-500/20 via-cyan-500/10 to-transparent border-blue-500/30',
      siblings: [
        { id: 'ton_dong_glt', label: 'Tồn Đọng GLT' },
        { id: 'ton_dong_lc', label: 'Tồn Đọng LC' },
        { id: 'ty_le_tra_hang', label: 'Tỷ Lệ Trả Hàng' }
      ]
    },
    ty_le_tra_hang: {
      id: 'ty_le_tra_hang',
      title: 'TỶ LỆ TRẢ HÀNG & CHUYỂN HOÀN',
      categoryName: 'TỒN ĐỌNG & XỬ LÝ SLA',
      categoryShort: 'Tồn Đọng & SLA',
      categoryIcon: PackageX,
      icon: RotateCcw,
      subTitle: 'Kiểm soát tỷ lệ hàng hủy, phân tích nguyên nhân và nâng cao chuẩn cam kết SLA',
      badge: 'Kiểm Soát SLA',
      badgeColor: 'bg-amber-600 text-white',
      accentGradient: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30',
      siblings: [
        { id: 'ton_dong_glt', label: 'Tồn Đọng GLT' },
        { id: 'ton_dong_lc', label: 'Tồn Đọng LC' },
        { id: 'ty_le_tra_hang', label: 'Tỷ Lệ Trả Hàng' }
      ]
    },
    nhan_su: {
      id: 'nhan_su',
      title: 'PHÂN HỆ QUẢN TRỊ NHÂN SỰ HIỆN HỮU',
      categoryName: 'NHÂN SỰ & QUỸ LƯƠNG',
      categoryShort: 'Nhân Sự & Lương',
      categoryIcon: Users,
      icon: UserCheck,
      subTitle: 'Phân tầng 10 nhóm thâm niên (G01 - G10), chi tiết nhân viên & rủi ro nghỉ việc',
      badge: `${activeStaffTotal} Nhân Sự`,
      badgeColor: 'bg-indigo-600 text-white',
      accentGradient: 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/30',
      siblings: [
        { id: 'nhan_su', label: 'Task Nhân Sự', badge: `${activeStaffTotal} NV` },
        { id: 'ns_nghi_viec', label: 'NS Nghỉ Việc', badge: `${resignedStaffTotal} Đã Nghỉ` },
        { id: 'hoa_hong_ngay', label: 'Hoa Hồng Ngày', badge: 'Quỹ Lương' }
      ]
    },
    ns_nghi_viec: {
      id: 'ns_nghi_viec',
      title: 'PHÂN HỆ QUẢN TRỊ NHÂN SỰ NGHỈ VIỆC KHU VỰC LONG AN',
      categoryName: 'NHÂN SỰ & QUỸ LƯƠNG',
      categoryShort: 'Nhân Sự & Lương',
      categoryIcon: Users,
      icon: UserMinus,
      subTitle: `Phân tích ma trận thâm niên, cơ cấu lý do thôi việc, bảng kê ${resignedStaffTotal} nhân sự & nhận định điều hành`,
      badge: `${resignedStaffTotal} Đã Nghỉ`,
      badgeColor: 'bg-rose-600 text-white',
      accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent border-rose-500/30',
      siblings: [
        { id: 'nhan_su', label: 'Task Nhân Sự', badge: `${activeStaffTotal} NV` },
        { id: 'ns_nghi_viec', label: 'NS Nghỉ Việc', badge: `${resignedStaffTotal} Đã Nghỉ` },
        { id: 'hoa_hong_ngay', label: 'Hoa Hồng Ngày', badge: 'Quỹ Lương' }
      ]
    },
    hoa_hong_ngay: {
      id: 'hoa_hong_ngay',
      title: 'HOA HỒNG NGÀY & QUỸ LƯƠNG BƯU TÁ',
      categoryName: 'NHÂN SỰ & QUỸ LƯƠNG',
      categoryShort: 'Nhân Sự & Lương',
      categoryIcon: Users,
      icon: Coins,
      subTitle: 'Kiểm soát quỹ lương, đơn giá tính lương và thu nhập bình quân đội ngũ giao hàng',
      badge: 'Quỹ Lương',
      badgeColor: 'bg-emerald-600 text-white',
      accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30',
      siblings: [
        { id: 'nhan_su', label: 'Task Nhân Sự' },
        { id: 'ns_nghi_viec', label: 'NS Nghỉ Việc' },
        { id: 'hoa_hong_ngay', label: 'Hoa Hồng Ngày' }
      ]
    },
    quan_ly_buu_cuc: {
      id: 'quan_ly_buu_cuc',
      title: 'PHÂN HỆ QUẢN TRỊ & BẢO MẬT BƯU CỤC',
      categoryName: 'QUẢN TRỊ & PHÂN HỆ',
      categoryShort: 'Quản Trị Bưu Cục',
      categoryIcon: ShieldCheck,
      icon: ShieldCheck,
      subTitle: 'Quản lý tài khoản 5 bưu cục, khóa 5 lần sai, cấp đổi mật khẩu & cây sơ đồ phân quyền dữ liệu',
      badge: 'Bảo Mật',
      badgeColor: 'bg-emerald-600 text-white',
      accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'quan_ly_buu_cuc', label: 'Phân Hệ Bưu Cục', badge: '5 BC' }
      ]
    }
  };

  const currentMeta = tabMetaMap[activeTab] || tabMetaMap.overview;
  const TabIcon = currentMeta.icon;
  const CatIcon = currentMeta.categoryIcon;

  return (
    <div className="sticky top-0 z-30 px-3 sm:px-4 pt-2 pb-1.5 shrink-0 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md transition-all">
      <div className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 shadow-xs transition-all ${currentMeta.accentGradient}`}>
        
        {/* HÀNG 1: BREADCRUMB & NÚT MỞ SƠ ĐỒ CÂY CƠ CẤU */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
          
          {/* Breadcrumb Path */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
              GHN Khu Vực Long An
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <CatIcon className="w-3 h-3 text-orange-500" />
              {currentMeta.categoryName}
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400" />

            <span className="text-orange-600 dark:text-orange-400 font-extrabold flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.2 rounded border border-orange-200 dark:border-orange-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping"></span>
              {currentMeta.title.split('(')[0].trim()}
            </span>
          </nav>

          {/* Quick Actions: Telegram Báo Cáo (Ẩn hoàn toàn đối với tài khoản phân hệ nhân viên) */}
          <div className="flex items-center gap-1.5">
            {!isStaff && (activeTab === 'ton_dong_glt' || activeTab === 'ton_dong_lc') && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-telegram-report', { 
                  detail: { reportType: activeTab === 'ton_dong_glt' ? 'glt' : 'lc' } 
                }))}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#229ED9] hover:bg-[#1e8ec3] text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer border border-[#229ED9]/50"
                title="Bắn báo cáo Telegram 5 bưu cục"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>{activeTab === 'ton_dong_glt' ? 'Báo Cáo Telegram' : 'Báo Cáo Telegram LC'}</span>
              </button>
            )}
          </div>
        </div>

        {/* HÀNG 2: HIGHLIGHT TIÊU ĐỀ NỔI BẬT & BỘ NÚT CHUYỂN TAB CÙNG CỤM */}
        <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Tiêu Đề Nổi Bật Được Highlight */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
              <TabIcon className="w-4 h-4 stroke-[2.3]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {currentMeta.title}
                </h1>
                
                {/* Status Badge: Đang View */}
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  LIVE
                </span>

                {/* Realtime Metric Badge */}
                <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${currentMeta.badgeColor}`}>
                  {currentMeta.badge}
                </span>
              </div>

              <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight line-clamp-1">
                {currentMeta.subTitle}
              </p>
            </div>
          </div>

          {/* Sibling Tabs Switcher (Chuyển nhanh các phân hệ trong cùng Cụm nghiệp vụ) */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full text-xs font-bold shrink-0">
            <span className="text-[10px] text-slate-400 mr-1 hidden xl:inline">Cùng nhóm:</span>
            {currentMeta.siblings.map(sib => {
              const isCurrent = sib.id === activeTab;
              return (
                <button
                  key={sib.id}
                  type="button"
                  onClick={() => setActiveTab(sib.id)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isCurrent
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{sib.label}</span>
                  {sib.badge && !isCurrent && (
                    <span className="px-1 py-0.1 rounded text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {sib.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
