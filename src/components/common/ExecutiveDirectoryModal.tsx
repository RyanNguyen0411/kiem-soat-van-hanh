import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  FolderTree, 
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
  ArrowRight, 
  CheckCircle2, 
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import type { TabType } from '../../types/dashboard';

interface SubFeatureItem {
  id: string;
  name: string;
  description: string;
  badge?: string;
  highlight?: boolean;
}

interface DirectoryModule {
  id: TabType;
  name: string;
  codeName: string;
  subLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  badgeColor: string;
  countLabel?: string;
  subFeatures: SubFeatureItem[];
}

interface DirectoryCategory {
  id: string;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  headerGradient: string;
  modules: DirectoryModule[];
}

export const ExecutiveDirectoryModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  const { activeTab, setActiveTab, dataset } = useDashboard();

  // Listen to custom event and keyboard shortcut Ctrl+M / Cmd+M
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-executive-directory', handleOpenModal);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-executive-directory', handleOpenModal);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Cấu trúc cây cơ cấu 3 cụm nghiệp vụ & 10 phân hệ điều hành của Area Manager
  const categories: DirectoryCategory[] = useMemo(() => [
    {
      id: 'van_hanh',
      name: '1. VẬN HÀNH & HIỆU SUẤT GTC',
      shortName: 'Vận Hành & GTC',
      description: 'Giám sát sản lượng, tỷ lệ giao thành công (GTC >= 92%), ca đi và hiệu suất 5 bưu cục',
      accentColor: 'border-orange-500',
      badgeBg: 'bg-orange-500/15',
      badgeText: 'text-orange-600 dark:text-orange-400',
      headerGradient: 'from-orange-600 via-amber-600 to-orange-700',
      modules: [
        {
          id: 'overview',
          name: 'TỔNG QUAN',
          codeName: 'Executive Control Center',
          subLabel: 'Trung tâm chỉ huy điều hành vĩ mô toàn khu vực Long An',
          description: 'Cảnh báo trọng yếu AM, 5 thẻ KPI, ma trận sản lượng & GTC chạy từ ngày gần nhất -> xa nhất, 3 đồ thị xu hướng.',
          icon: LayoutDashboard,
          badge: 'BI Center',
          badgeColor: 'bg-orange-600 text-white',
          countLabel: '5 Bưu Cục',
          subFeatures: [
            { id: 'ov-alert', name: 'Cảnh Báo Vận Hành Trọng Yếu AM', description: 'Điểm nóng bưu cục, đơn tồn khẩn cấp >120h, nhân viên hiệu suất thấp', highlight: true },
            { id: 'ov-kpi', name: '5 Chỉ Số Đo Lường Vận Hành (KPI)', description: 'Sản lượng, Gán đơn, Tỷ lệ GTC (Target >= 92%), Tỷ lệ gán, Volume Ca 2' },
            { id: 'ov-matrix', name: 'Biểu Đồ Ma Trận Điều Hành Ngày', description: 'Volume, Gán, GTC & Tỷ lệ Giao Ca 2 (Xếp từ ngày gần nhất -> xa nhất)', highlight: true },
            { id: 'ov-trends', name: 'Bộ 3 Đồ Thị Xu Hướng Ngày', description: 'Xu hướng Volume, Xu hướng SLĐ GTC, Xu hướng %GTC tổng' },
            { id: 'ov-branches', name: 'Ma Trận Tổng Hợp 5 Bưu Cục', description: 'So sánh chỉ số Cần Đước 1, Cần Giuộc, Phước Lý, Rạch Kiến, Tầm Vu' }
          ]
        },
        {
          id: 'bao_cao_gtc_bc',
          name: 'Báo Cáo GTC BC',
          codeName: 'Daily Post Office GTC Report',
          subLabel: 'Chi tiết sản lượng & tỷ lệ GTC từng ngày của 5 bưu cục',
          description: 'Ma trận đối soát giao phát chi tiết theo ngày, phân tích Ca 1, Ca 2 và tỷ lệ gán đơn.',
          icon: FileSpreadsheet,
          badge: 'Live Hot',
          badgeColor: 'bg-emerald-600 text-white',
          countLabel: 'Realtime',
          subFeatures: [
            { id: 'bc-matrix', name: 'Ma Trận GTC Theo Ngày & Bưu Cục', description: 'Kiểm soát tỷ lệ giao thành công chi tiết theo từng ngày' },
            { id: 'bc-shifts', name: 'Phân Tích Ca 1 & Ca 2', description: 'Tỷ lệ hoàn thành giao ca tối và đơn chuyển ca' },
            { id: 'bc-assign', name: 'Khối Lượng Gán & Hiệu Suất', description: 'Tỷ lệ đơn đã gán trên tổng volume bưu cục' }
          ]
        },
        {
          id: 'gtc_buu_cuc',
          name: 'GTC Bưu Cục',
          codeName: 'Branch Performance Matrix',
          subLabel: 'Đánh giá & so sánh hiệu năng 5 bưu cục trong khu vực',
          description: 'Đối chiếu chéo tỷ lệ đạt chuẩn GTC >= 92%, chu kỳ tuần/tháng và ngày trong tuần.',
          icon: Building2,
          badge: '5 BC',
          badgeColor: 'bg-slate-700 text-slate-200',
          countLabel: '5 Bưu Cục',
          subFeatures: [
            { id: 'gbc-radar', name: 'Xếp Hạng & So Sánh 5 Bưu Cục', description: 'Cần Đước 1, Cần Giuộc, Phước Lý, Rạch Kiến, Tầm Vu' },
            { id: 'gbc-target', name: 'Tỷ Lệ Đạt Mục Tiêu GTC >= 92%', description: 'Tần suất vượt chuẩn và số ngày không đạt' },
            { id: 'gbc-weekdays', name: 'Hiệu Suất Theo Thứ Trong Tuần', description: 'Nhận diện ngày trũng hiệu suất từ Thứ 2 đến Chủ Nhật' }
          ]
        },
        {
          id: 'gtc_nhan_vien',
          name: 'GTC Bưu Tá',
          codeName: 'Courier Productivity & Ranking',
          subLabel: 'Năng suất giao phát và kiểm soát chất lượng bưu tá',
          description: 'Theo dõi 74 bưu tá, phân nhóm xuất sắc vs nhóm rủi ro, phân tích theo ca đi.',
          icon: Users,
          badge: `${new Set(dataset.gtcNhanVien.map(r => r.maNV)).size || 74} NV`,
          badgeColor: 'bg-indigo-600 text-white',
          countLabel: '74 Bưu Tá',
          subFeatures: [
            { id: 'gnv-rank', name: 'Bảng Xếp Hạng Bưu Tá Khu Vực', description: 'Thứ hạng năng suất giao phát toàn bộ 74 nhân viên' },
            { id: 'gnv-risk', name: 'Nhóm Rủi Ro Hiệu Suất Thấp (< 60% GTC)', description: 'Danh sách nhân sự cần đôn đốc và can thiệp kịp thời', highlight: true },
            { id: 'gnv-shifts', name: 'Phân Tích Ca Đi & Năng Suất TB', description: 'Số đơn giao bình quân mỗi ca và tỷ lệ gán' }
          ]
        }
      ]
    },
    {
      id: 'ton_kho',
      name: '2. TỒN ĐỌNG & XỬ LÝ SLA',
      shortName: 'Tồn Đọng & SLA',
      description: 'Kiểm soát đơn tồn giao - lấy - trả (GLT), đơn luân chuyển tồn kho (LC) và tỷ lệ chuyển hoàn',
      accentColor: 'border-rose-500',
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-600 dark:text-rose-400',
      headerGradient: 'from-rose-600 via-pink-600 to-rose-700',
      modules: [
        {
          id: 'ton_dong_glt',
          name: 'Tồn Đọng GLT',
          codeName: 'Giao - Lấy - Trả Inventory',
          subLabel: 'Quản trị và giải phóng đơn hàng tồn đọng kho bưu cục',
          description: 'Phân tầng 6 nhóm tuổi tồn, cảnh báo khẩn cấp >120h và >192h, bảng kê chi tiết đơn.',
          icon: PackageX,
          badge: `${dataset.tonDongGlt.length.toLocaleString('vi-VN')} Đơn`,
          badgeColor: 'bg-rose-600 text-white',
          countLabel: 'Điểm Nóng',
          subFeatures: [
            { id: 'glt-age', name: 'Phân Tầng Tuổi Tồn (6 Nhóm)', description: '<24h, 24-48h, 48-72h, 72-120h, >120h khẩn cấp, >192h vi phạm', highlight: true },
            { id: 'glt-hotspot', name: 'Điểm Nóng Tồn Kho Theo Bưu Cục', description: 'Khoanh vùng bưu cục có lượng tồn cao nhất (Phước Lý, Rạch Kiến)' },
            { id: 'glt-details', name: 'Bảng Kê Chi Tiết Đơn Hàng Tồn', description: 'Tra cứu theo mã đơn, bưu cục, bưu tá phụ trách và lý do tồn' }
          ]
        },
        {
          id: 'ton_dong_lc',
          name: 'Tồn Đọng LC',
          codeName: 'Transfer & Hub Transit Inventory',
          subLabel: 'Kiểm soát hàng luân chuyển trung chuyển giữa các bưu cục',
          description: 'Giám sát 302 đơn luân chuyển, phòng ngừa tắc kho trung chuyển và chậm chuyến xe tải.',
          icon: Truck,
          badge: `${dataset.tonDongLc.length} Đơn`,
          badgeColor: 'bg-blue-600 text-white',
          countLabel: 'Trung Chuyển',
          subFeatures: [
            { id: 'lc-aging', name: 'Giám Sát Đơn Trễ Giờ Luân Chuyển', description: 'Cảnh báo đơn trung chuyển quá thời gian tiêu chuẩn' },
            { id: 'lc-hub', name: 'Cảnh Báo Tắc Nghẽn Kho Đầu Vào/Ra', description: 'Điều phối luồng hàng về các bưu cục vệ tinh' }
          ]
        },
        {
          id: 'ty_le_tra_hang',
          name: 'Tỷ Lệ Trả Hàng',
          codeName: 'Return Rate & SLA Control',
          subLabel: 'Kiểm soát chuyển hoàn và giảm thiểu tỷ lệ hàng hủy',
          description: 'Phân tích cơ cấu lý do trả hàng (khách hủy, không nghe máy, sai địa chỉ) và tỷ lệ hoàn 5 BC.',
          icon: RotateCcw,
          badge: 'SLA',
          badgeColor: 'bg-amber-600 text-white',
          countLabel: 'Chuyển Hoàn',
          subFeatures: [
            { id: 'ret-reasons', name: 'Ma Trận Nguyên Nhân Trả Hàng', description: 'Phân loại nguyên nhân chủ quan bưu tá và khách quan' },
            { id: 'ret-branches', name: 'Tỷ Lệ Hoàn Theo Tuyến & Bưu Cục', description: 'Kiểm soát chất lượng liên hệ trước khi xuất hoàn' }
          ]
        }
      ]
    },
    {
      id: 'nhan_su',
      name: '3. NHÂN SỰ & QUỸ LƯƠNG',
      shortName: 'Nhân Sự & Quỹ Lương',
      description: 'Quản trị 81 nhân sự hiện hữu, phân tích 81 nhân sự thôi việc và điều phối ngân sách quỹ lương',
      accentColor: 'border-purple-500',
      badgeBg: 'bg-purple-500/15',
      badgeText: 'text-purple-600 dark:text-purple-400',
      headerGradient: 'from-purple-600 via-indigo-600 to-purple-700',
      modules: [
        {
          id: 'nhan_su',
          name: 'Task Nhân Sự',
          codeName: 'Active Workforce & Seniority',
          subLabel: 'Quản trị lực lượng lao động hiện hữu đang công tác',
          description: 'Phân tầng 10 nhóm thâm niên (G01 - G10), chi tiết nhân viên khi click từng nhóm, rủi ro nghỉ việc.',
          icon: UserCheck,
          badge: `${dataset.nhanSu.length || 81} NV`,
          badgeColor: 'bg-indigo-600 text-white',
          countLabel: 'Hiện Hữu',
          subFeatures: [
            { id: 'ns-g10', name: 'Phân Tầng 10 Nhóm Thâm Niên (G01 - G10)', description: 'Tỷ lệ phân bổ từ mới vào (<1T) đến thâm niên cao (>3 năm)', highlight: true },
            { id: 'ns-drilldown', name: 'Bảng Kê Chi Tiết Từng Nhóm Thâm Niên', description: 'Click vào nhóm để hiển thị danh sách nhân viên tương ứng' },
            { id: 'ns-roles', name: 'Phân Loại Cơ Cấu Chức Danh', description: 'Bưu tá giao, Nhân viên lấy hàng, Bưu cục trưởng...' },
            { id: 'ns-risk', name: 'Ma Trận Rủi Ro Biến Động & Nghỉ Việc', description: 'Đánh giá nguy cơ thiếu hụt nhân sự tại các bưu cục' }
          ]
        },
        {
          id: 'ns_nghi_viec',
          name: 'NS Nghỉ Việc',
          codeName: 'Attrition Analytics & Root Cause',
          subLabel: 'Phân tích thực trạng 81 nhân sự đã thôi việc toàn khu vực',
          description: 'Bảng kê & đồ thị ma trận song song (Tổng quan, Thâm niên, Lý do nghỉ, Theo tháng), chi tiết 81 nhân sự, nhận định điều hành.',
          icon: UserMinus,
          badge: `${dataset.nghiViec?.length || 81} Đã Nghỉ`,
          badgeColor: 'bg-rose-600 text-white',
          countLabel: 'Phân Tích Sâu',
          subFeatures: [
            { id: 'nv-overview', name: 'Bảng Tổng Quan // Đồ Thị Ma Trận Khu Vực', description: 'Tỷ lệ nghỉ toàn vùng, so sánh bưu cục và cơ cấu chung', highlight: true },
            { id: 'nv-seniority', name: 'Bảng Nhóm Thâm Niên // Đồ Thị Ma Trận', description: 'Điểm nóng nghỉ sớm G01 (<1 tháng) chiếm 46.9%' },
            { id: 'nv-reasons', name: 'Bảng Nhóm Lý Do // Đồ Thị Ma Trận', description: 'Cơ cấu lý do: Thu nhập, áp lực, kỷ luật & vi phạm COD' },
            { id: 'nv-monthly', name: 'Thống Kê Nghỉ Theo Tháng & Ma Trận Sức Ảnh Hưởng', description: 'Bộ lọc riêng: tick ngày, tick tuần, tick tháng, tick bưu cục' },
            { id: 'nv-table', name: 'Bảng Kê Chi Tiết 81 Nhân Sự Thôi Việc', description: 'Ngày vào, ngày nghỉ, số ngày làm việc, sản lượng TB, lương TB' },
            { id: 'nv-insight', name: 'Nhận Định Điều Hành Biến Động Nhân Sự AM Huy', description: 'Đánh giá thực tế, chiến lược giữ chân nhân tài và tuyển dụng' }
          ]
        },
        {
          id: 'hoa_hong_ngay',
          name: 'Hoa Hồng Ngày',
          codeName: 'Payroll & Daily Commission',
          subLabel: 'Quỹ lương bưu tá & đơn giá tính lương',
          description: 'Theo dõi chi phí lương thưởng, thu nhập bình quân và chi phí trên mỗi đơn giao phát.',
          icon: Coins,
          badge: 'Quỹ Lương',
          badgeColor: 'bg-emerald-600 text-white',
          countLabel: 'Ngân Sách',
          subFeatures: [
            { id: 'hh-budget', name: 'Tổng Hợp Quỹ Lương Theo Ngày / Tháng', description: 'Chi phí quỹ lương phân bổ cho 5 bưu cục Long An' },
            { id: 'hh-avg', name: 'Thu Nhập Bình Quân & Năng Suất', description: 'Quy đổi mức lương tương xứng với sản lượng hoàn thành' },
            { id: 'hh-cost', name: 'Chi Phí Nhân Công Trên Mỗi Đơn Hàng', description: 'Tối ưu hóa hiệu quả kinh tế trên mỗi lượt phát' }
          ]
        }
      ]
    }
  ], [dataset]);

  // Bộ lọc tìm kiếm nhanh
  const filteredCategories = useMemo(() => {
    let result = categories;
    if (selectedCatFilter !== 'all') {
      result = result.filter(c => c.id === selectedCatFilter);
    }
    if (!searchQuery.trim()) return result;

    const q = searchQuery.toLowerCase().trim();
    return result.map(cat => {
      const matchedModules = cat.modules.filter(mod => {
        const matchName = mod.name.toLowerCase().includes(q);
        const matchDesc = mod.description.toLowerCase().includes(q);
        const matchSub = mod.subLabel.toLowerCase().includes(q);
        const matchFeatures = mod.subFeatures.some(f => 
          f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
        );
        return matchName || matchDesc || matchSub || matchFeatures;
      });

      return {
        ...cat,
        modules: matchedModules
      };
    }).filter(cat => cat.modules.length > 0);
  }, [categories, selectedCatFilter, searchQuery]);

  const handleSelectModule = (tabId: TabType) => {
    setActiveTab(tabId);
    setIsOpen(false);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <div className="w-full max-w-6xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* HEADER MODAL */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shrink-0">
                <FolderTree className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white truncate">
                    SƠ ĐỒ CÂY CƠ CẤU &amp; MENU TỔNG HỢP DASHBOARD
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-600 text-white shadow-2xs">
                    3 Cụm Nghiệp Vụ &bull; 10 Phân Hệ
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
                  <span className="text-orange-400 font-bold">AM Huy (ĐNB)</span>
                  <span>&bull;</span>
                  <span>Bản đồ cấu trúc toàn bộ nội dung &amp; ma trận điều hành</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                Esc / Ctrl+M để đóng
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng sơ đồ cây cơ cấu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TOOLBAR: SEARCH & CATEGORY FILTER TABS */}
          <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh nội dung, báo cáo, biểu đồ, thâm niên, tồn kho..."
                className="w-full h-8.5 pl-9 pr-8 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full text-xs font-bold">
              <span className="text-[10.5px] text-slate-400 mr-1 hidden sm:inline flex items-center gap-1">
                <Filter className="w-3 h-3" /> Lọc Cụm:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCatFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedCatFilter === 'all'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Tất Cả (10 Phân Hệ)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCatFilter('van_hanh')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedCatFilter === 'van_hanh'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Vận Hành &amp; GTC (4)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCatFilter('ton_kho')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedCatFilter === 'ton_kho'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Tồn Đọng &amp; SLA (3)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCatFilter('nhan_su')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedCatFilter === 'nhan_su'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Nhân Sự &amp; Lương (3)
              </button>
            </div>
          </div>

          {/* MODAL BODY: HIERARCHICAL TREE VIEW (3 COLUMNS) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            
            {filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-300 animate-bounce" />
                <p className="text-sm font-bold">Không tìm thấy nội dung phù hợp với từ khóa "{searchQuery}"</p>
                <p className="text-xs text-slate-500">Vui lòng kiểm tra lại chính tả hoặc chọn tab "Tất Cả" để xem toàn bộ cây cơ cấu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {filteredCategories.map(category => (
                  <div 
                    key={category.id}
                    className="flex flex-col space-y-3 bg-slate-50/70 dark:bg-slate-850/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800"
                  >
                    {/* Category Header */}
                    <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${category.badgeBg} ${category.badgeText}`}>
                          {category.shortName}
                        </span>
                        <span className="text-[10.5px] font-bold text-slate-400">
                          {category.modules.length} Phân hệ
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-1">
                        {category.name}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {category.description}
                      </p>
                    </div>

                    {/* Modules inside category */}
                    <div className="space-y-2.5">
                      {category.modules.map(mod => {
                        const isActive = activeTab === mod.id;
                        const ModIcon = mod.icon;

                        return (
                          <div
                            key={mod.id}
                            className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                              isActive 
                                ? 'bg-white dark:bg-slate-800 border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/20' 
                                : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            {/* Module Header Bar (Clickable to switch tab) */}
                            <div 
                              onClick={() => handleSelectModule(mod.id)}
                              className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isActive 
                                  ? 'bg-orange-50/70 dark:bg-orange-950/30' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                  isActive
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  <ModIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">
                                      {mod.name}
                                    </h4>
                                    {isActive && (
                                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-orange-600 text-white flex items-center gap-0.5 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                        ĐANG VIEW
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 truncate block">
                                    {mod.subLabel}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${mod.badgeColor}`}>
                                  {mod.badge}
                                </span>
                                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-orange-500 font-bold' : 'text-slate-400'}`} />
                              </div>
                            </div>

                            {/* Sub-features list (Cây cơ cấu nội dung con bên trong) */}
                            <div className="p-2 pt-1.5 bg-slate-50/50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-750 space-y-1">
                              <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                                <Layers className="w-2.5 h-2.5 text-slate-400" />
                                Nội dung bên trong:
                              </div>

                              <ul className="space-y-1">
                                {mod.subFeatures.map(feat => (
                                  <li 
                                    key={feat.id}
                                    onClick={() => handleSelectModule(mod.id)}
                                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer flex items-start justify-between gap-1 group/feat"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-[10.5px] text-slate-800 dark:text-slate-200 flex items-center gap-1 group-hover/feat:text-orange-600 dark:group-hover/feat:text-orange-400 transition-colors">
                                        <span className="w-1 h-1 rounded-full bg-slate-400 group-hover/feat:bg-orange-500 shrink-0" />
                                        <span className="truncate">{feat.name}</span>
                                        {feat.highlight && (
                                          <span className="px-1 rounded text-[7.5px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                                            Trọng Yếu
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 line-clamp-1 ml-2 leading-tight">
                                        {feat.description}
                                      </p>
                                    </div>

                                    <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/feat:text-orange-500 shrink-0 opacity-0 group-hover/feat:opacity-100 transition-all translate-x-[-2px] group-hover/feat:translate-x-0" />
                                  </li>
                                ))}
                              </ul>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

          {/* MODAL FOOTER */}
          <div className="p-3 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 10 Phân Hệ Đã Đồng Bộ
              </span>
              <span>&bull;</span>
              <span>Nhấn vào bất kỳ mục nào để chuyển trang tức thì</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                Đóng Menu
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
