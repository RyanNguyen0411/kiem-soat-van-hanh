import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserMinus,
  Building2, 
  Briefcase, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Download, 
  Search, 
  Clock, 
  ShieldCheck,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { exportToCSV } from '../services/excelExportService';
import { NhanSuOperationalAlertsCard } from '../components/nhan-su/NhanSuOperationalAlertsCard';

// Helper to calculate seniority days: Current/Ref Date - NgayVaoLam
function calcSeniorityDays(ngayVaoLamStr: string, refDateStr: string = '07/11/2026'): number {
  if (!ngayVaoLamStr) return 0;
  const parts = ngayVaoLamStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const hireDate = new Date(year, month, day);

    const refParts = refDateStr.split('/');
    const refDate = refParts.length === 3 
      ? new Date(parseInt(refParts[2], 10), parseInt(refParts[1], 10) - 1, parseInt(refParts[0], 10))
      : new Date();

    if (!isNaN(hireDate.getTime()) && !isNaN(refDate.getTime())) {
      const diffMs = refDate.getTime() - hireDate.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }
  return 0;
}

// 10 Nhóm thâm niên chuẩn hóa kèm định hướng quản trị giữ chân nhân sự cho AM Huy
const SENIORITY_GROUPS_DEF = [
  { 
    code: 'G01', 
    name: 'G01: Dưới 1 tháng', 
    range: '< 30 ngày', 
    risk: 'Rất cao (Tân binh)', 
    color: '#ef4444',
    guidance: 'Tân binh mới tuyển dụng. AM Huy chỉ đạo Bưu cục trưởng tổ chức kèm cặp 1-1, kiểm tra tỷ lệ kết nối người nhận và hỗ trợ san tải trong 14 ngày đầu để ngăn ngừa tỷ lệ nghỉ việc sớm.' 
  },
  { 
    code: 'G02', 
    name: 'G02: Trên 1 - 3 tháng', 
    range: '30 - 90 ngày', 
    risk: 'Cao (Hòa nhập)', 
    color: '#f97316',
    guidance: 'Giai đoạn hòa nhập văn hóa và quy trình giao nhận. Đo lường tỷ lệ hoàn tất hàng Ca 2, kiểm soát chuyên cần và tháo gỡ điểm nghẽn địa bàn tuyến.' 
  },
  { 
    code: 'G03', 
    name: 'G03: Trên 3 - 6 tháng', 
    range: '91 - 180 ngày', 
    risk: 'Trung bình (Thử thách)', 
    color: '#eab308',
    guidance: 'Vượt mốc thử việc 90 ngày. Cần rà soát mức thu nhập hoa hồng ngày, động viên bứt phá năng suất để nhân sự yên tâm gắn bó lâu dài.' 
  },
  { 
    code: 'G04', 
    name: 'G04: Trên 6 tháng - 1 năm', 
    range: '181 - 365 ngày', 
    risk: 'Thấp (Cứng tay nghề)', 
    color: '#84cc16',
    guidance: 'Tay nghề giao phát đã vững vàng. Đào tạo thêm kỹ năng xử lý khiếu nại và giao hàng cồng kềnh/tuyến nặng, chuẩn bị quy hoạch nòng cốt.' 
  },
  { 
    code: 'G05', 
    name: 'G05: Trên 1 - 1,5 năm', 
    range: '1 - 1.5 năm', 
    risk: 'Rất thấp (Vững vàng)', 
    color: '#10b981',
    guidance: 'Lực lượng ổn định trụ cột. Ghi nhận đóng góp, duy trì chính sách thu nhập tốt và tạo điều kiện tham gia các khóa đào tạo dự nguồn Bưu cục phó/trưởng.' 
  },
  { 
    code: 'G06', 
    name: 'G06: Trên 1,5 - 2 năm', 
    range: '1.5 - 2 năm', 
    risk: 'Rất thấp (Nòng cốt)', 
    color: '#06b6d4',
    guidance: 'Nhân sự nòng cốt địa phương, am hiểu tường tận địa bàn phát. Sẵn sàng điều động san tải hoặc hỗ trợ các bưu cục lân cận khi quá tải.' 
  },
  { 
    code: 'G07', 
    name: 'G07: Trên 2 - 3 năm', 
    range: '2 - 3 năm', 
    risk: 'An toàn (Kỳ cựu)', 
    color: '#3b82f6',
    guidance: 'Bưu tá kỳ cựu dày dạn kinh nghiệm. Phân công phụ trách tuyến khách hàng VIP hoặc tuyến phát trọng điểm có độ phức tạp cao.' 
  },
  { 
    code: 'G08', 
    name: 'G08: Trên 3 - 4 năm', 
    range: '3 - 4 năm', 
    risk: 'An toàn (Trụ cột)', 
    color: '#6366f1',
    guidance: 'Trụ cột vận hành bưu cục. Đóng vai trò Mentor dẫn dắt, hỗ trợ Bưu cục trưởng điều phối ca và kèm cặp tân binh.' 
  },
  { 
    code: 'G09', 
    name: 'G09: Trên 4 - 5 năm', 
    range: '4 - 5 năm', 
    risk: 'Cực kỳ trung thành', 
    color: '#8b5cf6',
    guidance: 'Nhân sự cực kỳ trung thành, gắn bó bền chặt với GHN. Gương mẫu về kỷ luật và tỷ lệ GTC, vinh danh thâm niên định kỳ.' 
  },
  { 
    code: 'G10', 
    name: 'G10: Trên 5 năm', 
    range: '> 5 năm', 
    risk: 'Cây cao bóng cả', 
    color: '#a855f7',
    guidance: 'Cây cao bóng cả (> 5 năm cống hiến). Linh hồn kinh nghiệm của bưu cục, biểu dương gương sáng toàn khu vực Long An.' 
  }
];

export const NhanSuTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal, navigateToTab, setActiveTab } = useDashboard();
  
  // State quản lý xem chi tiết nhóm thâm niên
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  
  // Staff list (ID 3175777 Trần Trọng Phú là NVXL tại Tầm Vu)
  const staffList = useMemo(() => {
    return dataset.nhanSu || [];
  }, [dataset.nhanSu]);

  // Tab filter: 'all' or post office name (Đồng bộ toàn hệ thống)
  const [selectedBuuCuc, setSelectedBuuCuc] = useState<string>(() => selectedBuuCucGlobal || 'all');

  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setSelectedBuuCuc(selectedBuuCucGlobal);
    }
  }, [selectedBuuCucGlobal]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<string>('all');
  const [sortField, setSortField] = useState<'thamNien' | 'tenNV' | 'maNV' | 'ngayVaoLam'>('thamNien');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showKpis, setShowKpis] = useState<boolean>(true);

  // List of distinct post offices
  const postOfficesList = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(r => {
      if (r.buuCuc) set.add(r.buuCuc);
    });
    return Array.from(set).sort();
  }, [staffList]);

  // Enriched staff with calculated seniority days
  const enrichedStaff = useMemo(() => {
    return staffList.map(r => {
      const days = calcSeniorityDays(r.ngayVaoLam);
      return {
        ...r,
        thamNienNgay: days
      };
    });
  }, [staffList]);

  // Scoped staff based on selected post office for KPIs
  const activeStaffScope = useMemo(() => {
    return selectedBuuCuc === 'all' 
      ? staffList 
      : staffList.filter(r => r.buuCuc === selectedBuuCuc);
  }, [staffList, selectedBuuCuc]);

  const activeEnrichedScope = useMemo(() => {
    return selectedBuuCuc === 'all' 
      ? enrichedStaff 
      : enrichedStaff.filter(r => r.buuCuc === selectedBuuCuc);
  }, [enrichedStaff, selectedBuuCuc]);

  // Filtered staff list based on search & selectors
  const filteredStaff = useMemo(() => {
    return enrichedStaff.filter(r => {
      if (selectedBuuCuc !== 'all' && r.buuCuc !== selectedBuuCuc) return false;
      if (selectedRole !== 'all' && r.chucVu !== selectedRole) return false;
      if (selectedContract !== 'all' && r.loaiHD !== selectedContract) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = r.tenNV.toLowerCase().includes(q) ||
          r.maNV.toLowerCase().includes(q) ||
          r.buuCuc.toLowerCase().includes(q) ||
          r.chucVu.toLowerCase().includes(q) ||
          r.nhomThamNien.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'thamNien') {
        return sortOrder === 'desc' 
          ? (b.thamNienNgay || 0) - (a.thamNienNgay || 0) 
          : (a.thamNienNgay || 0) - (b.thamNienNgay || 0);
      }
      if (sortField === 'tenNV') {
        return sortOrder === 'desc' ? b.tenNV.localeCompare(a.tenNV) : a.tenNV.localeCompare(b.tenNV);
      }
      if (sortField === 'maNV') {
        return sortOrder === 'desc' ? b.maNV.localeCompare(a.maNV) : a.maNV.localeCompare(b.maNV);
      }
      return 0;
    });
  }, [enrichedStaff, selectedBuuCuc, selectedRole, selectedContract, searchQuery, sortField, sortOrder]);

  // Executive KPI Numbers (dynamically scoped to selectedBuuCuc)
  const kpis = useMemo(() => {
    const list = activeStaffScope;
    const enriched = activeEnrichedScope;
    const total = list.length;
    const bde = list.filter(r => r.chucVu === 'Business Development Field Executive').length;
    const oe = list.filter(r => r.chucVu === 'Operations Executive').length;
    const am = list.filter(r => r.chucVu === 'Area Manager').length;
    const hdld = list.filter(r => r.loaiHD === 'HĐLĐ').length;
    const hddv = list.filter(r => r.loaiHD === 'HĐDV').length;
    
    // Average seniority days
    const totalDays = enriched.reduce((sum, r) => sum + (r.thamNienNgay || 0), 0);
    const avgDays = total > 0 ? Math.round(totalDays / total) : 0;
    const avgMonths = (avgDays / 30.4).toFixed(1);

    // New recruits (< 90 days: G01 + G02)
    const newRecruits = enriched.filter(r => (r.thamNienNgay || 0) <= 90).length;
    // Veteran (> 1 year: G05+)
    const veterans = enriched.filter(r => (r.thamNienNgay || 0) > 365).length;

    return {
      total,
      bde,
      oe,
      am,
      hdld,
      hddv,
      hdldRate: total > 0 ? ((hdld / total) * 100).toFixed(1) : '0',
      hddvRate: total > 0 ? ((hddv / total) * 100).toFixed(1) : '0',
      avgDays,
      avgMonths,
      newRecruits,
      veterans
    };
  }, [activeStaffScope, activeEnrichedScope]);

  // Overall Post Office Matrix Table Data (cross-referenced with GTC performance)
  const postOfficeSummary = useMemo(() => {
    // Cross-reference with GtcBuuCuc to get volume and %GTC
    const gtcMap: Record<string, { vol: number; sldGTC: number; count: number }> = {};
    dataset.gtcBuuCuc.forEach(r => {
      const bc = r.buuCuc;
      if (!gtcMap[bc]) gtcMap[bc] = { vol: 0, sldGTC: 0, count: 0 };
      gtcMap[bc].vol += r.volume;
      gtcMap[bc].sldGTC += r.sldGTC;
      gtcMap[bc].count++;
    });

    return postOfficesList.map(po => {
      const staffInPo = enrichedStaff.filter(r => r.buuCuc === po);
      const total = staffInPo.length;
      const bde = staffInPo.filter(r => r.chucVu === 'Business Development Field Executive').length;
      const oe = staffInPo.filter(r => r.chucVu === 'Operations Executive').length;
      const am = staffInPo.filter(r => r.chucVu === 'Area Manager').length;
      const hdld = staffInPo.filter(r => r.loaiHD === 'HĐLĐ').length;
      const hddv = staffInPo.filter(r => r.loaiHD === 'HĐDV').length;
      
      const sumDays = staffInPo.reduce((s, r) => s + (r.thamNienNgay || 0), 0);
      const avgDays = total > 0 ? Math.round(sumDays / total) : 0;

      // Group counts
      const under3M = staffInPo.filter(r => (r.thamNienNgay || 0) <= 90).length; // G01 + G02
      const from3Mto1Y = staffInPo.filter(r => (r.thamNienNgay || 0) > 90 && (r.thamNienNgay || 0) <= 365).length; // G03 + G04
      const over1Y = staffInPo.filter(r => (r.thamNienNgay || 0) > 365).length; // G05+

      // Operational GTC metrics
      const gtcData = gtcMap[po] || { vol: 0, sldGTC: 0, count: 1 };
      const avgVol = gtcData.count > 0 ? Math.round(gtcData.vol / gtcData.count) : 0;
      const gtcRate = gtcData.vol > 0 ? ((gtcData.sldGTC / gtcData.vol) * 100).toFixed(1) : '-';
      const volPerBde = bde > 0 ? Math.round(avgVol / bde) : 0;

      return {
        buuCuc: po,
        total,
        bde,
        oe,
        am,
        hdld,
        hddv,
        hdldPct: total > 0 ? ((hdld / total) * 100).toFixed(1) : '0',
        avgDays,
        under3M,
        from3Mto1Y,
        over1Y,
        avgVol,
        gtcRate,
        volPerBde
      };
    });
  }, [postOfficesList, enrichedStaff, dataset.gtcBuuCuc]);

  // Chart 1: Stacked Bar Chart for Headcount by Position across Post Offices
  const chartPositionData = useMemo(() => {
    return postOfficeSummary.map(po => ({
      name: po.buuCuc.replace('(LAN) ', ''),
      fullName: po.buuCuc,
      'NVPTTT (Bưu tá)': po.bde,
      'NVXL (Xử lý)': po.oe,
      'Quản lý (AM)': po.am,
      'Tổng NV': po.total
    }));
  }, [postOfficeSummary]);

  // Chart 2: Contract Distribution Pie Chart
  const chartContractData = useMemo(() => {
    return [
      { name: 'Hợp đồng lao động (HĐLĐ)', value: kpis.hdld, color: '#3b82f6' },
      { name: 'Hợp đồng dịch vụ (HĐDV)', value: kpis.hddv, color: '#f97316' }
    ];
  }, [kpis]);

  // Chart 3: Seniority Group Breakdown Bar Chart (G01 to G10)
  const chartSeniorityData = useMemo(() => {
    return SENIORITY_GROUPS_DEF.map(g => {
      const count = enrichedStaff.filter(r => r.nhomThamNien.startsWith(g.code)).length;
      return {
        code: g.code,
        name: g.code,
        label: g.name,
        range: g.range,
        soLuong: count,
        color: g.color,
        risk: g.risk
      };
    });
  }, [enrichedStaff]);

  // Excel Export Handler
  const handleExport = () => {
    const filename = `Bao_Cao_Nhan_Su_${selectedBuuCuc === 'all' ? 'Toan_Khu_Vuc' : selectedBuuCuc.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const headers = [
      'STT',
      'Mã NV',
      'Họ và Tên',
      'Chức Vụ',
      'Bưu Cục',
      'Loại Hợp Đồng',
      'Ngày Vào Làm',
      'Thâm Niên (Ngày)',
      'Nhóm Thâm Niên',
      'Trạng Thái',
      'Quản Lý Trực Tiếp'
    ];
    const rows = filteredStaff.map((r, idx) => [
      idx + 1,
      r.maNV,
      r.tenNV,
      r.chucVu,
      r.buuCuc,
      r.loaiHD,
      r.ngayVaoLam,
      r.thamNienNgay || 0,
      r.nhomThamNien,
      r.trangThai,
      r.am
    ]);
    exportToCSV(filename, headers, rows);
  };

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto px-3 sm:px-5 py-3 md:py-4">
      
      {/* 1. COMPACT STICKY HEADER WITH INLINE POST OFFICE TABS & CONTROLS */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs px-3 py-2 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Left: Compact Title & Post Office Tab Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap">
                QUẢN TRỊ NHÂN SỰ
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-md">
                {selectedBuuCuc === 'all' ? `${staffList.length} NV` : `${activeStaffScope.length} NV`}
              </span>
            </div>

            {/* Post Office Tab Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => setSelectedBuuCuc('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedBuuCuc === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Tất cả</span>
                <span className={`px-1 py-0.2 text-[10px] rounded-md font-extrabold ${
                  selectedBuuCuc === 'all' ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {staffList.length}
                </span>
              </button>

              {postOfficesList.map(po => {
                const count = staffList.filter(r => r.buuCuc === po).length;
                const isSelected = selectedBuuCuc === po;
                return (
                  <button
                    key={po}
                    onClick={() => setSelectedBuuCuc(po)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{po.replace('(LAN) ', '')}</span>
                    <span className={`px-1 py-0.2 text-[10px] rounded-md font-extrabold ${
                      isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Quick Search, Export & Toggle KPI */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm mã, tên..."
                className="w-36 sm:w-44 pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
              />
            </div>

            <button
              onClick={() => setActiveTab('ns_nghi_viec')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-all whitespace-nowrap cursor-pointer"
              title="Chuyển sang phân tích nhân sự nghỉ việc"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>NS Nghỉ Việc ({dataset.nghiViec?.length || 81})</span>
            </button>

            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-all whitespace-nowrap cursor-pointer"
              title="Xuất danh sách Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <button
              onClick={() => setShowKpis(!showKpis)}
              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title={showKpis ? "Thu gọn 5 thẻ KPI để tiết kiệm không gian" : "Mở rộng 5 thẻ KPI"}
            >
              <span>{showKpis ? 'Thu gọn thẻ' : 'Xem thẻ KPI'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showKpis ? 'rotate-180' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* 2. COMPACT 5 EXECUTIVE KPI CARDS */}
      {showKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 transition-all">
          
          {/* Card 1: Tổng nhân sự */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-3.5 py-2.5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Nhân Sự</span>
              <div className="p-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {kpis.total} <span className="text-xs font-medium text-slate-400">NV</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                100% Active
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
              {selectedBuuCuc === 'all' ? '5 bưu cục • Zone Tây Ninh' : selectedBuuCuc}
            </div>
          </div>

          {/* Card 2: NVPTTT (Bưu tá giao nhận) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-3.5 py-2.5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NVPTTT (Bưu Tá)</span>
              <div className="p-1 bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-md">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                {kpis.bde} <span className="text-xs font-medium text-slate-400">NVPTTT</span>
              </span>
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                {kpis.total > 0 ? ((kpis.bde / kpis.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
              Nhân viên phát triển thị trường (tải tuyến)
            </div>
          </div>

          {/* Card 3: Quản lý & NVXL */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-3.5 py-2.5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quản Lý & NVXL</span>
              <div className="p-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {kpis.oe + kpis.am} <span className="text-xs font-medium text-slate-400">QL/XL</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                {kpis.oe} NVXL{kpis.am > 0 ? ` • ${kpis.am} AM` : ''}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
              Tỷ lệ giám sát {kpis.oe + kpis.am > 0 ? `1 : ${Math.round(kpis.bde / (kpis.oe + kpis.am))}` : '1:0'} NVPTTT
            </div>
          </div>

          {/* Card 4: Cơ cấu Hợp đồng */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-3.5 py-2.5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cơ Cấu Hợp Đồng</span>
              <div className="p-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {kpis.hdldRate}% <span className="text-xs font-medium text-slate-400">HĐLĐ</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {kpis.hdld} LĐ / {kpis.hddv} DV
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 truncate font-medium">
              Chỉ số gắn kết cao, ổn định
            </div>
          </div>

          {/* Card 5: Thâm niên bình quân */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-3.5 py-2.5 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thâm Niên Bình Quân</span>
              <div className="p-1 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-md">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {kpis.avgDays} <span className="text-xs font-medium text-slate-400">ngày</span>
              </span>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                ~{kpis.avgMonths}T
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400 truncate font-medium">
              Tân binh (≤90N): {kpis.newRecruits} NV ({kpis.total > 0 ? ((kpis.newRecruits / kpis.total) * 100).toFixed(0) : 0}%)
            </div>
          </div>

        </div>
      )}

      {/* 3. BẢNG KÊ TỔNG THỂ NHÂN SỰ THEO BƯU CỤC */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Bảng Kê Tổng Hợp Cơ Cấu Nhân Sự Theo Bưu Cục
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Đối chiếu quy mô nhân sự, phân nhóm thâm niên và hiệu suất vận hành thực tế
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 text-left font-bold">Bưu Cục</th>
                <th className="py-3 px-3 text-center font-bold">Tổng NV</th>
                <th className="py-3 px-3 text-center font-bold text-orange-600 dark:text-orange-400">NVPTTT (Bưu tá)</th>
                <th className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">NVXL (Xử lý)</th>
                <th className="py-3 px-3 text-center font-bold">HĐLĐ</th>
                <th className="py-3 px-3 text-center font-bold">HĐDV</th>
                <th className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">% HĐLĐ</th>
                <th className="py-3 px-3 text-center font-bold">Thâm Niên TB</th>
                <th className="py-3 px-3 text-center font-bold bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                  Mới (&le;90N)
                </th>
                <th className="py-3 px-3 text-center font-bold bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">
                  Phát Triển (3-12T)
                </th>
                <th className="py-3 px-3 text-center font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                  Kỳ Cựu (&gt;1N)
                </th>
                <th className="py-3 px-3 text-center font-bold text-purple-600 dark:text-purple-400">Tải Đơn TB/NVPTTT</th>
                <th className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">% GTC Vận Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
              {postOfficeSummary.map((po) => {
                const isSelected = selectedBuuCuc === po.buuCuc;
                return (
                  <tr 
                    key={po.buuCuc} 
                    onClick={() => setSelectedBuuCuc(po.buuCuc)}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                      {po.buuCuc}
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-indigo-600 text-white rounded font-bold">Đang xem</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white text-sm">
                      {po.total}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-orange-600 dark:text-orange-400 text-sm">
                      {po.bde}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                      {po.oe}{po.am > 0 ? ` (+${po.am} AM)` : ''}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {po.hdld}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {po.hddv}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                      {po.hdldPct}%
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-indigo-600 dark:text-indigo-400">
                      {po.avgDays} ngày
                    </td>
                    <td className="py-3 px-3 text-center font-black text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                      {po.under3M} <span className="text-[10px] font-normal text-slate-500">({((po.under3M / po.total)*100).toFixed(0)}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10">
                      {po.from3Mto1Y} <span className="text-[10px] font-normal text-slate-500">({((po.from3Mto1Y / po.total)*100).toFixed(0)}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                      {po.over1Y} <span className="text-[10px] font-normal text-slate-500">({((po.over1Y / po.total)*100).toFixed(0)}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-purple-600 dark:text-purple-400">
                      ~{po.volPerBde} đơn/ngày
                    </td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {po.gtcRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600 font-black text-slate-900 dark:text-white">
              <tr>
                <td className="py-3 px-4 font-black uppercase text-indigo-700 dark:text-indigo-300">
                  TỔNG TOÀN KHU VỰC
                </td>
                <td className="py-3 px-3 text-center font-black text-sm">{kpis.total}</td>
                <td className="py-3 px-3 text-center font-black text-orange-600 text-sm">{kpis.bde}</td>
                <td className="py-3 px-3 text-center font-black text-blue-600">{kpis.oe + kpis.am}</td>
                <td className="py-3 px-3 text-center font-black">{kpis.hdld}</td>
                <td className="py-3 px-3 text-center font-black">{kpis.hddv}</td>
                <td className="py-3 px-3 text-center font-black text-emerald-600">{kpis.hdldRate}%</td>
                <td className="py-3 px-3 text-center font-black text-indigo-600">{kpis.avgDays} ngày</td>
                <td className="py-3 px-3 text-center font-black text-amber-600">{kpis.newRecruits} ({((kpis.newRecruits/kpis.total)*100).toFixed(0)}%)</td>
                <td className="py-3 px-3 text-center font-black text-blue-600">
                  {staffList.filter(r => (calcSeniorityDays(r.ngayVaoLam) > 90 && calcSeniorityDays(r.ngayVaoLam) <= 365)).length}
                </td>
                <td className="py-3 px-3 text-center font-black text-emerald-600">{kpis.veterans} ({((kpis.veterans/kpis.total)*100).toFixed(0)}%)</td>
                <td className="py-3 px-3 text-center font-black text-purple-600">
                  ~{Math.round(postOfficeSummary.reduce((s, p) => s + p.avgVol, 0) / (kpis.bde || 1))} đơn/ngày
                </td>
                <td className="py-3 px-4 text-center font-black text-emerald-600 text-sm">
                  66.8%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3.1. THẺ CẢNH BÁO VẬN HÀNH NHÂN SỰ (2 BẢNG: CẢNH BÁO GÁN/GIAO THẤP & CẢNH BÁO NHÂN VIÊN OFF) */}
      <NhanSuOperationalAlertsCard 
        dataset={dataset}
        defaultBuuCuc={selectedBuuCuc}
        onNavigateToEmployeeGtc={(_maNV, buuCuc) => {
          navigateToTab('gtc_nhan_vien', { buuCuc });
        }}
      />

      {/* 4. MA TRẬN BIỂU ĐỒ NHÂN SỰ (3 CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Biểu đồ 1: Cột chồng chức vụ theo bưu cục */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Cơ Cấu Chức Vụ Theo Bưu Cục
              </h3>
              <p className="text-[11px] text-slate-500">Phân bố NVPTTT (Bưu tá) & NVXL (Xử lý)</p>
            </div>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPositionData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} nhân sự`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="NVPTTT (Bưu tá)" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="NVXL (Xử lý)" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Quản lý (AM)" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 2: Cơ cấu Loại Hợp Đồng (Donut Chart) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Tỷ Lệ Loại Hợp Đồng
              </h3>
              <p className="text-[11px] text-slate-500">HĐ Lao Động (HĐLĐ) vs HĐ Dịch Vụ (HĐDV)</p>
            </div>
            <PieChartIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="h-64 mt-3 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartContractData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartContractData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} NV (${((Number(val) / kpis.total) * 100).toFixed(1)}%)`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{kpis.hdldRate}%</span>
              <span className="text-[10px] font-bold text-slate-400">HĐLĐ Chính thức</span>
            </div>
          </div>
        </div>

        {/* Biểu đồ 3: Phân bổ 10 Nhóm Thâm Niên (G01 - G10) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Phân Bổ Thâm Niên (G01 - G10)
              </h3>
              <p className="text-[11px] text-slate-500">Phân tầng mức độ ổn định & rủi ro nghỉ việc</p>
            </div>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSeniorityData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="code" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-lg text-white text-xs">
                          <p className="font-bold text-indigo-300">{data.label}</p>
                          <p className="text-[11px] text-slate-300 mt-1">Thời gian: {data.range}</p>
                          <p className="text-sm font-black text-white mt-1">
                            {data.soLuong} nhân sự ({((data.soLuong / kpis.total) * 100).toFixed(1)}%)
                          </p>
                          <p className="text-[10px] font-semibold text-amber-400 mt-1">Đánh giá: {data.risk}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="soLuong" radius={[4, 4, 0, 0]}>
                  {chartSeniorityData.map((entry, index) => (
                    <Cell key={`cell-seniority-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 5. BẢNG PHÂN LOẠI 10 NHÓM THÂM NIÊN (G01 - G10) & DRILLDOWN BẢNG KÊ CHI TIẾT */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Bảng Phân Tầng 10 Nhóm Thâm Niên (G01 - G10) &amp; Rủi Ro Nghỉ Việc
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nhấn vào bất kỳ nhóm nào để xem <b>bảng kê chi tiết nhân sự</b> &amp; khuyến nghị giữ chân
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg">
              {selectedBuuCuc === 'all' ? 'Toàn bộ 5 bưu cục Long An' : selectedBuuCuc}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3 text-center font-bold">Mã Nhóm</th>
                <th className="py-2.5 px-4 text-left font-bold">Tên Nhóm Thâm Niên</th>
                <th className="py-2.5 px-3 text-center font-bold">Khoảng Thời Gian</th>
                <th className="py-2.5 px-3 text-center font-bold">Số Lượng NV</th>
                <th className="py-2.5 px-3 text-center font-bold">Tỷ Lệ (%)</th>
                <th className="py-2.5 px-4 text-left font-bold">Bưu Cục Tập Trung Nhiều Nhất</th>
                <th className="py-2.5 px-4 text-center font-bold">Đánh Giá Mức Độ Ổn Định &amp; Rủi Ro</th>
                <th className="py-2.5 px-3 text-center font-bold">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
              {SENIORITY_GROUPS_DEF.map((g) => {
                const members = activeEnrichedScope.filter(r => r.nhomThamNien.startsWith(g.code));
                const count = members.length;
                const totalInScope = activeEnrichedScope.length;
                const pct = totalInScope > 0 ? ((count / totalInScope) * 100).toFixed(1) : '0';
                const isExpanded = expandedGroup === g.code;
                
                // Find top post office for this group
                const poMap: Record<string, number> = {};
                members.forEach(m => {
                  poMap[m.buuCuc] = (poMap[m.buuCuc] || 0) + 1;
                });
                const topPoEntry = Object.entries(poMap).sort((a, b) => b[1] - a[1])[0];
                const topPoText = topPoEntry ? `${topPoEntry[0]} (${topPoEntry[1]} NV)` : 'Không có';

                // Risk badge style
                let riskBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                if (g.code === 'G01') riskBadgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
                else if (g.code === 'G02') riskBadgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
                else if (g.code === 'G03') riskBadgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800';
                else if (g.code === 'G04' || g.code === 'G05') riskBadgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
                else riskBadgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800';

                return (
                  <React.Fragment key={g.code}>
                    <tr 
                      onClick={() => setExpandedGroup(prev => prev === g.code ? null : g.code)}
                      className={`cursor-pointer transition-all duration-150 select-none ${
                        isExpanded 
                          ? 'bg-purple-50/90 dark:bg-purple-950/40 border-l-4 border-purple-600 font-semibold' 
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50'
                      }`}
                      title="Nhấn để xem bảng kê chi tiết nhân sự nhóm này"
                    >
                      <td className="py-2.5 px-3 text-center font-black">
                        <span className="px-2 py-0.5 rounded text-[11px] font-black text-white shadow-2xs" style={{ backgroundColor: g.color }}>
                          {g.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span>{g.name}</span>
                          {isExpanded && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.2 rounded">
                              Đang mở
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600 dark:text-slate-300">
                        {g.range}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-sm text-slate-900 dark:text-white">
                        {count}
                      </td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-indigo-600 dark:text-indigo-400">
                        {pct}%
                      </td>
                      <td className="py-2.5 px-4 text-left font-medium text-slate-600 dark:text-slate-300">
                        {topPoText}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${riskBadgeClass}`}>
                          {g.risk}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroup(prev => prev === g.code ? null : g.code);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs ${
                            isExpanded
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 dark:bg-slate-750 dark:hover:bg-purple-950/60 dark:text-slate-300'
                          }`}
                        >
                          {isExpanded ? (
                            <>
                              <span>Thu gọn</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Xem {count} NV</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* =========================================================================
                        BẢNG KÊ CHI TIẾT NHÂN SỰ THEO NHÓM THÂM NIÊN (DRILLDOWN VIEW)
                        ========================================================================= */}
                    {isExpanded && (
                      <tr className="bg-slate-50/95 dark:bg-slate-900/90 border-b-2 border-purple-500/50">
                        <td colSpan={8} className="p-3 sm:p-5">
                          <div className="bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-md p-4 space-y-3.5">
                            {/* Panel Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700">
                              <div className="flex items-start sm:items-center gap-2.5">
                                <span className="px-2.5 py-1 rounded-md text-xs font-black text-white shadow-2xs" style={{ backgroundColor: g.color }}>
                                  {g.code}
                                </span>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Bảng Kê Chi Tiết Nhân Sự Nhóm {g.name}</span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                      {members.length} nhân sự
                                    </span>
                                  </h4>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Khung thâm niên: <b>{g.range}</b> &bull; Mức độ ổn định: <b className="text-purple-600 dark:text-purple-400">{g.risk}</b> &bull; Phạm vi: <b>{selectedBuuCuc === 'all' ? 'Toàn bộ 5 bưu cục Long An' : selectedBuuCuc}</b>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {/* Nút Xuất Excel nhóm */}
                                {members.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const headers = ['Mã NV', 'Họ Tên', 'Bưu Cục', 'Chức Vụ', 'Loại HĐ', 'Ngày Vào Làm', 'Thâm Niên (Ngày)', 'Nhóm Thâm Niên', 'Trạng Thái'];
                                      const rows = members.map(m => [
                                        m.maNV,
                                        m.tenNV,
                                        m.buuCuc,
                                        m.chucVu,
                                        m.loaiHD,
                                        m.ngayVaoLam,
                                        m.thamNienNgay || 0,
                                        m.nhomThamNien,
                                        m.trangThai
                                      ]);
                                      exportToCSV(`Danh_sach_nhan_su_${g.code}_${selectedBuuCuc}.csv`, headers, rows);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-1 shadow-2xs transition-all"
                                    title="Xuất file CSV danh sách nhân sự nhóm này"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Xuất Excel</span>
                                  </button>
                                )}

                                {/* Nút đóng panel */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedGroup(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-650 dark:text-slate-300 rounded-lg transition-all"
                                >
                                  Đóng ✕
                                </button>
                              </div>
                            </div>

                            {/* Chỉ đạo quản trị nhân sự dành riêng cho AM Huy */}
                            <div className="p-2.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-start gap-2 text-[11px] text-purple-900 dark:text-purple-200">
                              <Target className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <div className="leading-relaxed">
                                <span className="font-extrabold uppercase tracking-wide">Định hướng quản trị &amp; Giữ chân của AM: </span>
                                {g.guidance}
                              </div>
                            </div>

                            {/* Bảng kê nhân sự */}
                            {members.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                Chưa có nhân sự nào thuộc nhóm <b>{g.name}</b> tại {selectedBuuCuc === 'all' ? 'khu vực này' : selectedBuuCuc}.
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                      <th className="py-2 px-3 text-center w-10">STT</th>
                                      <th className="py-2 px-3 text-center">Mã NV</th>
                                      <th className="py-2 px-4">Họ &amp; Tên</th>
                                      <th className="py-2 px-3">Bưu Cục</th>
                                      <th className="py-2 px-3">Chức Vụ</th>
                                      <th className="py-2 px-3 text-center">Loại HĐ</th>
                                      <th className="py-2 px-3 text-center">Ngày Vào Làm</th>
                                      <th className="py-2 px-3 text-center">Thâm Niên Thực Tế</th>
                                      <th className="py-2 px-3 text-center">Trạng Thái</th>
                                      <th className="py-2 px-3 text-center">Điều Hướng</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                                    {members.map((staff, idx) => {
                                      const days = staff.thamNienNgay || 0;
                                      const months = (days / 30.4).toFixed(1);

                                      return (
                                        <tr key={staff.maNV} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                          <td className="py-2 px-3 text-center text-slate-400 font-medium">
                                            {idx + 1}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
                                            {staff.maNV}
                                          </td>
                                          <td className="py-2 px-4 font-bold text-slate-900 dark:text-white">
                                            {staff.tenNV}
                                          </td>
                                          <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">
                                            {staff.buuCuc}
                                          </td>
                                          <td className="py-2 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                              staff.chucVu === 'Business Development Field Executive'
                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                                                : staff.chucVu === 'Operations Executive'
                                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                                            }`}>
                                              {staff.chucVu === 'Business Development Field Executive' 
                                                ? 'NVPTTT (Bưu tá)' 
                                                : staff.chucVu === 'Operations Executive' 
                                                  ? 'NVXL' 
                                                  : staff.chucVu}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                              {staff.loaiHD || 'HĐLĐ'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                            {staff.ngayVaoLam}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                              {days} ngày
                                            </span>
                                            <span className="text-[10px] text-slate-400 block">
                                              (~{months} tháng)
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                              {staff.trangThai || 'Đang làm việc'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigateToTab('gtc_nhan_vien', { buuCuc: staff.buuCuc });
                                              }}
                                              className="px-2 py-0.8 rounded text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all inline-flex items-center gap-1 cursor-pointer"
                                              title="Xem số liệu giao hàng GTC của nhân sự này"
                                            >
                                              <span>Xem GTC</span>
                                              <span>&rarr;</span>
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. BẢNG CHI TIẾT THEO TỪNG BƯU CỤC (CÓ CỘT THÂM NIÊN NGÀY) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Header & Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Bảng Kê Chi Tiết Nhân Sự {selectedBuuCuc === 'all' ? 'Toàn Khu Vực' : selectedBuuCuc}
              </h2>
              <span className="px-2 py-0.5 text-xs font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full">
                {filteredStaff.length} Nhân Sự
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logic Thâm niên ngày = [Ngày đối soát hiện tại 07/11/2026] - [Ngày vào làm thực tế]
            </p>
          </div>

          {/* Quick Filters inside Table */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chức vụ filter */}
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả chức vụ</option>
              <option value="Business Development Field Executive">NVPTTT (Bưu tá)</option>
              <option value="Operations Executive">NVXL (Xử lý)</option>
              <option value="Area Manager">Quản lý khu vực (AM)</option>
            </select>

            {/* Loại HĐ filter */}
            <select
              value={selectedContract}
              onChange={e => setSelectedContract(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả loại HĐ</option>
              <option value="HĐLĐ">HĐ Lao Động (HĐLĐ)</option>
              <option value="HĐDV">HĐ Dịch Vụ (HĐDV)</option>
            </select>

            {/* Sort toggle */}
            <button
              onClick={() => {
                setSortField('thamNien');
                setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
              }}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
            >
              Thâm niên: {sortOrder === 'desc' ? 'Giảm dần ↓' : 'Tăng dần ↑'}
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-3 px-3 text-center font-bold">STT</th>
                <th className="py-3 px-3 text-center font-bold">Mã NV</th>
                <th className="py-3 px-4 text-left font-bold">Họ & Tên</th>
                <th className="py-3 px-3 text-left font-bold">Chức Vụ</th>
                <th className="py-3 px-3 text-left font-bold">Bưu Cục</th>
                <th className="py-3 px-3 text-center font-bold">Loại HĐ</th>
                <th className="py-3 px-3 text-center font-bold">Ngày Vào Làm</th>
                <th className="py-3 px-3 text-center font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40">
                  Thâm Niên Ngày
                </th>
                <th className="py-3 px-3 text-center font-bold">Nhóm Thâm Niên</th>
                <th className="py-3 px-3 text-center font-bold">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff, idx) => {
                  const days = staff.thamNienNgay || 0;
                  const isNewRecruit = days <= 30; // G01
                  const isProbation = days > 30 && days <= 90; // G02
                  const isVeteran = days > 365; // G05+

                  return (
                    <tr 
                      key={staff.maNV}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                        isNewRecruit 
                          ? 'bg-rose-50/30 dark:bg-rose-950/10' 
                          : isProbation 
                            ? 'bg-amber-50/20 dark:bg-amber-950/10' 
                            : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-medium text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {staff.maNV}
                      </td>
                      <td className="py-2.5 px-4 text-left font-bold text-slate-900 dark:text-slate-100">
                        {staff.tenNV}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          staff.chucVu === 'Business Development Field Executive'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                            : staff.chucVu === 'Operations Executive'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                        }`}>
                          {staff.chucVu === 'Business Development Field Executive' 
                            ? 'NVPTTT (Bưu tá)' 
                            : staff.chucVu === 'Operations Executive' 
                              ? 'NVXL' 
                              : staff.chucVu}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        {staff.buuCuc}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          staff.loaiHD === 'HĐLĐ'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                          {staff.loaiHD}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600 dark:text-slate-300">
                        {staff.ngayVaoLam}
                      </td>
                      
                      {/* CỘT THÂM NIÊN NGÀY ĐẶC TRƯNG */}
                      <td className="py-2.5 px-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 font-black">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          isNewRecruit 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300' 
                            : isProbation
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300'
                              : isVeteran
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                        }`}>
                          {days.toLocaleString('vi-VN')} ngày
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {staff.nhomThamNien.split(':')[0]}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {staff.nhomThamNien.split(':')[1]?.trim()}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Đang làm việc
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. KHỐI NHẬN XÉT & ĐÁNH GIÁ CHUYÊN SÂU THỰC TRẠNG (CROSS-REFERENCED OPERATIONAL ASSESSMENT) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl p-6 border border-indigo-900/50">
        
        {/* Header Block */}
        <div className="flex items-center gap-3 pb-4 border-b border-indigo-800/60">
          <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-md">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-orange-400">
              Báo Cáo Nhận Xét & Đánh Giá Chuyên Sâu Tình Hình Thực Trạng Nhân Sự
            </h2>
            <p className="text-xs text-slate-300">
              Đối chiếu chéo số liệu nhân sự với hiệu suất %GTC, tải volume và tỷ lệ gắn bó • Phân tích thực tế dành cho AM Huy (ĐNB)
            </p>
          </div>
        </div>

        {/* General Assessment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          
          {/* Box 1: Tổng quan khu vực & Cơ cấu lực lượng */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4 text-indigo-400" />
              1. Tổng Quan Lực Lượng & Độ Vững Chắc Tổ Chức
            </div>
            <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
              <li>
                &bull; <strong className="text-white">Quy mô thực tế:</strong> Toàn khu vực hiện có <span className="text-emerald-400 font-bold">81 nhân sự</span> (1 AM, 8 NVXL, 72 NVPTTT). Tỷ lệ NVPTTT (bưu tá giao nhận) trực tiếp ngoài tuyến đạt <span className="text-orange-400 font-bold">88.9%</span> (72/81 NV), đảm bảo tỷ trọng tinh gọn tối đa cho nhân sự tuyến đầu.
              </li>
              <li>
                &bull; <strong className="text-white">Độ ổn định hợp đồng:</strong> Tỷ lệ HĐLĐ chính thức đạt <span className="text-emerald-400 font-bold">75.3% (61/81 NV)</span>, HĐDV chỉ chiếm 24.7% (20 NV). Đây là tỷ lệ cam kết gắn bó cao, giúp khu vực kiểm soát tốt rủi ro biến động đột ngột so với các vùng phụ thuộc nhiều vào bưu tá thời vụ.
              </li>
              <li>
                &bull; <strong className="text-white">Cột mốc thâm niên:</strong> Thâm niên bình quân toàn khu vực đạt <span className="text-indigo-300 font-bold">640 ngày (~21 tháng)</span>. Đặc biệt có đến <span className="text-purple-300 font-bold">42 nhân sự thâm niên trên 1 năm (G05 - G10, chiếm 52.5%)</span>, tạo thành bệ đỡ kinh nghiệm vững chắc cho toàn bộ địa bàn.
              </li>
            </ul>
          </div>

          {/* Box 2: Tương quan Thâm niên vs Hiệu suất %GTC */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2 text-orange-300 font-bold text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              2. Tương Quan Thâm Niên vs Hiệu Quả Giao Hàng (%GTC)
            </div>
            <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
              <li>
                &bull; <strong className="text-white">Điểm sáng Cần Giuộc & Phước Lý:</strong> Bưu cục Cần Giuộc đạt <span className="text-emerald-400 font-bold">%GTC cao nhất khu vực (68.3%)</span> và Phước Lý (<span className="text-emerald-400 font-bold">66.6%</span>). Yếu tố quyết định là cơ cấu thâm niên cân bằng: dù có tân binh nhưng đội ngũ kỳ cựu G05+ (&gt;1 năm) chiếm trên 45% làm nòng cốt kèm cặp tuyến cực kỳ hiệu quả.
              </li>
              <li>
                &bull; <strong className="text-white">Nghịch lý tại Tầm Vu:</strong> Tầm Vu có thâm niên cao nhất (10/12 NV trên 1 năm, 83.3%) và 91.7% HĐLĐ, nhưng %GTC chỉ đạt <span className="text-amber-400 font-bold">62.6%</span>. Nguyên nhân vận hành thực tế: Bưu cục chưa có NVXL trực ca riêng (AM kiêm nhiệm), dẫn đến khâu thúc giục điều phối ca 2 và xử lý tồn đọng cuối ngày chưa được siết chặt liên tục.
              </li>
              <li>
                &bull; <strong className="text-white">Nút thắt tải sản lượng tại Rạch Kiến:</strong> Rạch Kiến gánh tải volume lớn nhất khu vực (~855 đơn/ngày, ~47 đơn/NVPTTT), trong khi tỷ lệ tân binh &lt; 1 năm lên đến <span className="text-rose-400 font-bold">65% (13/20 NV)</span>. NVPTTT mới chưa thuộc đường và chưa quen xử lý đơn khó khiến %GTC chạm đáy khu vực (<span className="text-rose-400 font-bold">60.1%</span>).
              </li>
            </ul>
          </div>

        </div>

        {/* Section 3: GÓC NHÌN VẬN HÀNH, ĐÁNH GIÁ NĂNG LỰC & ĐỊNH HƯỚNG ĐỘI NGŨ NVXL */}
        <div className="mt-5 pt-5 border-t border-indigo-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-xs font-black uppercase text-blue-300 tracking-wider">
                3. Đánh Giá Năng Lực, Góc Nhìn Vận Hành & Định Hướng Đội Ngũ NVXL (8 Nhân Sự)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-300 bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-800/60">
              Khớp nối xương sống: Điều phối sàn • Gán ca 2 • Kiểm soát tồn đọng
            </span>
          </div>

          {/* Mini-Matrix 8 NVXL Cards Across 5 Post Offices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
            
            {/* Cần Giuộc: 2 NVXL */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/80">
                  <span className="text-[11px] font-black text-indigo-300">(LAN) Cần Giuộc</span>
                  <span className="text-[10px] font-bold text-emerald-400">2 NVXL</span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Phạm Thị Thu Thủy</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">HĐLĐ • 532N</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Nòng cốt sàn (G05), điều phối vững vàng</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Nguyễn Thị Như Huỳnh</span>
                      <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded">HĐDV • 11N</span>
                    </div>
                    <p className="text-[10px] text-amber-300/90 mt-0.5">Tân binh (G01), Thu Thủy kèm cặp 1-1</p>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 text-[10px] text-emerald-400 font-semibold">
                Mô hình Pairing hiệu quả cao
              </div>
            </div>

            {/* Rạch Kiến: 2 NVXL */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/80">
                  <span className="text-[11px] font-black text-indigo-300">(LAN) Rạch Kiến</span>
                  <span className="text-[10px] font-bold text-orange-400">2 NVXL</span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Nguyễn Quốc Chuẩn</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">HĐLĐ • 1.129N</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Trụ cột (&gt;3 năm, G08), gánh tải 855 đơn/N</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Nguyễn Hữu Lộc</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">HĐLĐ • 248N</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Đang lớn (G04, ~8T), phụ trách xuất ca</p>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 text-[10px] text-orange-400 font-semibold">
                Cần phân định rõ In-hub / Out-hub
              </div>
            </div>

            {/* Phước Lý: 1 NVXL */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/80">
                  <span className="text-[11px] font-black text-indigo-300">(LAN) Phước Lý</span>
                  <span className="text-[10px] font-bold text-amber-400">1 NVXL</span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Biện Hữu Tiến</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">HĐLĐ • 1.081N</span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Độc lập tác chiến (&gt;3 năm, G08), một mình gánh 15 NVPTTT. Hiệu suất top 2 khu vực.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 text-[10px] text-amber-400 font-semibold">
                Cảnh báo: Rủi ro đơn điểm (SPOF)
              </div>
            </div>

            {/* Cần Đước 1: 2 NVXL */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/80">
                  <span className="text-[11px] font-black text-indigo-300">(LAN) Cần Đước 1</span>
                  <span className="text-[10px] font-bold text-emerald-400">2 NVXL</span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Nguyễn Đăng Tuấn</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">HĐLĐ • 1.733N</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cây cao bóng cả (&gt;4.7 năm, G09), am hiểu sâu</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Trần Trung Nghĩa</span>
                      <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded">HĐDV • 60N</span>
                    </div>
                    <p className="text-[10px] text-amber-300/90 mt-0.5">Mới 2 tháng (G02), đang hoàn thiện kỹ năng</p>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 text-[10px] text-purple-400 font-semibold">
                Nguồn nhân lực chi viện tin cậy
              </div>
            </div>

            {/* Tầm Vu: 1 NVXL */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/80">
                  <span className="text-[11px] font-black text-indigo-300">(LAN) Tầm Vu</span>
                  <span className="text-[10px] font-bold text-blue-400">1 NVXL</span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Trần Trọng Phú</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-bold">HĐLĐ • 137N</span>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                      Đảm nhiệm NVXL (G03 • ~4.5T), trực tiếp điều phối sàn & gán ca 2 cho 11 NVPTTT kỳ cựu.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 text-[10px] text-blue-300 font-semibold">
                Cần nâng cao uy tín & kỷ luật ca
              </div>
            </div>

          </div>

          {/* Deep Insight Analysis & Strategic Directives for NVXL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box NVXL 1: Đánh Giá 3 Trụ Cột Năng Lực & Tác Động Vận Hành */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
                <Target className="w-4 h-4 text-blue-400" />
                3.1. Góc Nhìn Thực Trạng & Vai Trò Xương Sống Của NVXL
              </div>
              <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                <li>
                  &bull; <strong className="text-white">Quy mô toàn diện 8 NVXL (100% bưu cục có người phụ trách):</strong> Toàn khu vực hiện có 8 NVXL (6 HĐLĐ chiếm 75%, 2 HĐDV chiếm 25%). Tỷ lệ giám sát đạt mức lý tưởng 1 NVXL : 9 NVPTTT.
                </li>
                <li>
                  &bull; <strong className="text-white">Khớp nối quyết định chỉ số Ca 2:</strong> NVXL là người trực tiếp quyết định tỷ lệ gán ca 2 (mục tiêu &ge; 50% Vol) và độ phủ NVPTTT ca 2 (&ge; 70%). Bưu cục có NVXL bám sàn sát sao (như Cần Giuộc & Phước Lý) thì hàng về ca 2 được phân tuyến và xuất đi ngay, không bị ứ đọng qua đêm.
                </li>
                <li>
                  &bull; <strong className="text-white">Bài toán NVXL trẻ quản lý đội ngũ kỳ cựu tại Tầm Vu:</strong> NVXL Trần Trọng Phú (137 ngày, G03) quản lý 11 NVPTTT đều là nhân sự thâm niên cao (&gt;1 năm). Do tuổi nghề điều phối còn mới, Phú cần được hỗ trợ xây dựng uy tín điều hành để mạnh dạn thúc giục, kiểm soát giờ giấc ra tuyến ca 2 của bưu tá.
                </li>
              </ul>
            </div>

            {/* Box NVXL 2: 4 Định Hướng Chiến Lược & Hành Động Cho AM Huy */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                3.2. Bốn Định Hướng Hành Động Trọng Tâm Dành Cho AM Huy
              </div>
              <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                <li>
                  &bull; <strong className="text-blue-300">1. Kèm cặp & trao quyền cho NVXL Trần Trọng Phú (Tầm Vu):</strong> AM Huy hướng dẫn chuyên sâu phương pháp kiểm soát sàn, thiết lập deadline chốt ca 2 lúc 14h30 hàng ngày, trao thẩm quyền để Phú xử lý nghiêm các trường hợp NVPTTT chối gán hoặc về sớm.
                </li>
                <li>
                  &bull; <strong className="text-amber-300">2. Triển khai cơ chế "Key Backup" tại Phước Lý:</strong> Chỉ đạo NVXL Biện Hữu Tiến đào tạo chuyển giao quy trình cho 1 NVPTTT nòng cốt tại Phước Lý làm phó ca dự phòng, triệt tiêu rủi ro đơn điểm (Single Point of Failure).
                </li>
                <li>
                  &bull; <strong className="text-orange-300">3. Phân tách rành mạch In-hub vs Out-hub tại Rạch Kiến:</strong> Phân công NVXL Chuẩn phụ trách sàn ca 1 & xuất hàng; NVXL Lộc phụ trách điều phối ca 2, đôn đốc gán đơn, bám sát lộ trình 13 NVPTTT mới và thu hồi COD/chuyển trả.
                </li>
                <li>
                  &bull; <strong className="text-emerald-300">4. Lộ trình chuyển HĐLĐ cho 2 NVXL mới (Như Huỳnh & Trung Nghĩa):</strong> Đặt KPI rõ ràng trong 60 ngày về tỷ lệ gán ca 2 &ge; 50%; xét duyệt ký HĐLĐ chính thức sau thử thách để tạo sự an tâm cống hiến lâu dài.
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Detailed Assessment per Post Office */}
        <div className="mt-5 pt-5 border-t border-indigo-800/60">
          <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider mb-3">
            4. Đánh Giá Chi Tiết & Đề Xuất Hành Động Theo Từng Bưu Cục Cho AM Huy
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            
            {/* Cần Giuộc */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-xs text-white">(LAN) Cần Giuộc</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">%GTC: 68.3%</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  <strong className="text-orange-300">Thực trạng:</strong> 20 NV (18 NVPTTT, 2 NVXL). Có 7 tân binh &le;90N (35%) và 8 HĐDV (40% - cao nhất khu vực). Tuy nhiên tỷ lệ giao thành công vẫn số 1 khu vực nhờ 2 NVXL phân tuyến khoa học và 9 NVPTTT trụ cột gánh tải vững.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-indigo-300 font-semibold">
                &rarr; Đề xuất: Xét chuyển ký HĐLĐ cho 3-4 bạn NVPTTT HĐDV có thành tích %GTC &gt; 85% để giữ chân trước mùa cao điểm cuối năm.
              </div>
            </div>

            {/* Rạch Kiến */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-xs text-white">(LAN) Rạch Kiến</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded border border-rose-500/40">%GTC: 60.1% (Cảnh báo)</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  <strong className="text-rose-300">Thực trạng:</strong> 20 NV (18 NVPTTT, 2 NVXL). Tải sản lượng cao nhất vùng (855 đơn/ngày). Có đến 6 tân binh G01-G02 và 7 bạn G03-G04. 65% nhân sự dưới 1 năm tuổi nghề đang quá tải với sản lượng lớn, dẫn đến hụt %GTC.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-amber-300 font-semibold">
                &rarr; Đề xuất: AM Huy chỉ đạo 2 NVXL (Nguyễn Hữu Lộc, Nguyễn Quốc Chuẩn) tổ chức kèm cặp 1-1 tại tuyến; san tải đơn ca 2 cho các bạn NVPTTT kỳ cựu hỗ trợ tân binh.
              </div>
            </div>

            {/* Tầm Vu */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-xs text-white">(LAN) Tầm Vu</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-yellow-500/20 text-yellow-300 rounded border border-yellow-500/40">%GTC: 62.6%</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  <strong className="text-indigo-300">Thực trạng:</strong> 13 NV (11 NVPTTT, 1 NVXL Trần Trọng Phú, 1 AM). Đội hình NVPTTT gắn bó bậc nhất (83.3% thâm niên &gt; 1 năm), 12 HĐLĐ. Nhân sự NVXL Trần Trọng Phú (G03 • 137 ngày) đang trực tiếp vận hành sàn.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-emerald-300 font-semibold">
                &rarr; Đề xuất: NVXL Trần Trọng Phú cần quyết liệt siết giờ chốt gán ca 2, kiểm soát tồn đọng cuối ngày để khai phóng trọn vẹn sức mạnh của dàn bưu tá kỳ cựu, đẩy %GTC lên &ge; 70%.
              </div>
            </div>

            {/* Phước Lý */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-xs text-white">(LAN) Phước Lý</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">%GTC: 66.6%</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  <strong className="text-emerald-300">Thực trạng:</strong> 16 NV (15 NVPTTT, 1 NVXL). Cơ cấu tháp nhân sự lý tưởng: 7 kỳ cựu G05+ (43.8%), 6 nhân sự tích lũy G03-G04 (37.5%), 3 tân binh (18.8%). Tỷ lệ HĐLĐ 81.3%. Vận hành nhịp nhàng, hiệu suất top đầu.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-blue-300 font-semibold">
                &rarr; Đề xuất: Duy trì mô hình phân tuyến hiện tại. NVXL Biện Hữu Tiến cần chủ động bồi dưỡng thêm 1 NVPTTT hạt nhân làm dự phòng điều phối khi cao điểm.
              </div>
            </div>

            {/* Cần Đước 1 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-xs text-white">(LAN) Cần Đước 1</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">%GTC: 66.2%</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  <strong className="text-purple-300">Thực trạng:</strong> 12 NV (10 NVPTTT, 2 NVXL). Có 9 NV thâm niên trên 1 năm (75.0%), 10 HĐLĐ (83.3%). Nhân lực dồi dào kinh nghiệm (NVXL Nguyễn Đăng Tuấn thâm niên trên 4 năm).
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-purple-300 font-semibold">
                &rarr; Đề xuất: Đội hình dày dặn kinh nghiệm, có thể huy động làm cụm hỗ trợ điều động NVPTTT chi viện cho Rạch Kiến khi sản lượng đột biến.
              </div>
            </div>

            {/* Tóm tắt hành động trọng tâm */}
            <div className="bg-indigo-900/60 border border-indigo-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-700">
                  <span className="font-bold text-xs text-amber-300">Chỉ Đạo Trọng Tâm AM</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded">Tháng 11/2026</span>
                </div>
                <p className="text-[11px] text-slate-200 mt-2 leading-relaxed">
                  Tập trung <span className="text-amber-300 font-bold">18 NVPTTT mới (G01 & G02 &le;90N)</span> tại Rạch Kiến và Cần Giuộc; hỗ trợ nâng cao năng lực điều phối ca cho <span className="text-blue-300 font-bold">NVXL Trần Trọng Phú (Tầm Vu)</span> để đồng loạt kéo tỷ lệ %GTC toàn khu vực vượt mục tiêu 70%.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-indigo-700/60 text-[10px] text-emerald-400 font-bold">
                Mục tiêu: Giảm tỷ lệ nghỉ việc tân binh &lt; 5% & đẩy %GTC &ge; 70%.
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default NhanSuTab;
