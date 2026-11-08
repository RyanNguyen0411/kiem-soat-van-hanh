import React from 'react';
import { 
  FolderTree, 
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
  Coins 
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
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
  const { activeTab, setActiveTab, dataset } = useDashboard();

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
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo GTC BC', badge: 'Live' },
        { id: 'gtc_buu_cuc', label: 'GTC Bưu Cục', badge: '5 BC' },
        { id: 'gtc_nhan_vien', label: 'GTC Bưu Tá', badge: '74 NV' }
      ]
    },
    bao_cao_gtc_bc: {
      id: 'bao_cao_gtc_bc',
      title: 'BÁO CÁO GTC BƯU CỤC NGÀY',
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
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo GTC BC' },
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
      subTitle: 'So sánh hiệu suất, tỷ lệ đạt Target GTC >= 92% và ngày trũng trong tuần',
      badge: '5 Bưu Cục',
      badgeColor: 'bg-blue-600 text-white',
      accentGradient: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo GTC BC' },
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
      subTitle: 'Bảng xếp hạng 74 bưu tá, khoanh vùng nhóm rủi ro (<60% GTC) và năng suất',
      badge: `${new Set(dataset.gtcNhanVien.map(r => r.maNV)).size || 74} Bưu Tá`,
      badgeColor: 'bg-indigo-600 text-white',
      accentGradient: 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/30',
      siblings: [
        { id: 'overview', label: 'Tổng Quan' },
        { id: 'bao_cao_gtc_bc', label: 'Báo Cáo GTC BC' },
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
      badge: `${dataset.tonDongGlt.length.toLocaleString('vi-VN')} Đơn Tồn`,
      badgeColor: 'bg-rose-600 text-white',
      accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent border-rose-500/30',
      siblings: [
        { id: 'ton_dong_glt', label: 'Tồn Đọng GLT', badge: `${dataset.tonDongGlt.length}` },
        { id: 'ton_dong_lc', label: 'Tồn Đọng LC', badge: `${dataset.tonDongLc.length}` },
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
      subTitle: 'Giám sát 302 đơn hàng trung chuyển luân chuyển kho & phòng ngừa tắc bưu cục',
      badge: `${dataset.tonDongLc.length} Đơn LC`,
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
      badge: `${dataset.nhanSu.length || 81} Nhân Sự`,
      badgeColor: 'bg-indigo-600 text-white',
      accentGradient: 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/30',
      siblings: [
        { id: 'nhan_su', label: 'Task Nhân Sự', badge: `${dataset.nhanSu.length || 81} NV` },
        { id: 'ns_nghi_viec', label: 'NS Nghỉ Việc', badge: `${dataset.nghiViec?.length || 81} Đã Nghỉ` },
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
      subTitle: 'Phân tích ma trận thâm niên, cơ cấu lý do thôi việc, bảng kê 81 nhân sự & nhận định điều hành',
      badge: `${dataset.nghiViec?.length || 81} Đã Nghỉ`,
      badgeColor: 'bg-rose-600 text-white',
      accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent border-rose-500/30',
      siblings: [
        { id: 'nhan_su', label: 'Task Nhân Sự', badge: `${dataset.nhanSu.length || 81} NV` },
        { id: 'ns_nghi_viec', label: 'NS Nghỉ Việc', badge: `${dataset.nghiViec?.length || 81} Đã Nghỉ` },
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
    }
  };

  const currentMeta = tabMetaMap[activeTab] || tabMetaMap.overview;
  const TabIcon = currentMeta.icon;
  const CatIcon = currentMeta.categoryIcon;

  const handleOpenTree = () => {
    window.dispatchEvent(new CustomEvent('open-executive-directory'));
  };

  return (
    <div className="px-3 pt-3 pb-1 sm:px-4 sm:pt-3 shrink-0">
      <div className={`p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-850 border shadow-xs transition-all ${currentMeta.accentGradient}`}>
        
        {/* HÀNG 1: BREADCRUMB & NÚT MỞ SƠ ĐỒ CÂY CƠ CẤU */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          
          {/* Breadcrumb Path */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
              GHN Khu Vực Long An
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            
            <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
              <CatIcon className="w-3.5 h-3.5 text-orange-500" />
              {currentMeta.categoryName}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <span className="text-orange-600 dark:text-orange-400 font-extrabold flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping"></span>
              {currentMeta.title.split('(')[0].trim()}
            </span>
          </nav>

          {/* Quick Action: Mở Cây Cơ Cấu [Ctrl+M] */}
          <button
            type="button"
            onClick={handleOpenTree}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer border border-slate-700 hover:border-orange-500/50 group"
            title="Mở Sơ Đồ Cây Cơ Cấu & Menu Tổng Hợp Dashboard (Ctrl+M)"
          >
            <FolderTree className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
            <span>Cây Cơ Cấu (Menu Tổng Hợp)</span>
            <kbd className="hidden sm:inline px-1 rounded bg-slate-800 text-[9px] font-mono text-orange-400 border border-slate-700">
              Ctrl+M
            </kbd>
          </button>
        </div>

        {/* HÀNG 2: HIGHLIGHT TIÊU ĐỀ NỔI BẬT & BỘ NÚT CHUYỂN TAB CÙNG CỤM */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          
          {/* Tiêu Đề Nổi Bật Được Highlight */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shrink-0">
              <TabIcon className="w-5 h-5 stroke-[2.3]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {currentMeta.title}
                </h1>
                
                {/* Status Badge: Đang View */}
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-2xs flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  ĐANG VIEW
                </span>

                {/* Realtime Metric Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black ${currentMeta.badgeColor}`}>
                  {currentMeta.badge}
                </span>
              </div>

              <p className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                {currentMeta.subTitle}
              </p>
            </div>
          </div>

          {/* Sibling Tabs Switcher (Chuyển nhanh các phân hệ trong cùng Cụm nghiệp vụ) */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full text-xs font-bold pt-1 sm:pt-0">
            <span className="text-[10px] text-slate-400 mr-1 hidden md:inline">Cùng nhóm:</span>
            {currentMeta.siblings.map(sib => {
              const isCurrent = sib.id === activeTab;
              return (
                <button
                  key={sib.id}
                  type="button"
                  onClick={() => setActiveTab(sib.id)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isCurrent
                      ? 'bg-orange-600 text-white shadow-xs'
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
