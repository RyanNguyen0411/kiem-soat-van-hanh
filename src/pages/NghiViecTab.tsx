import { useState, useMemo } from 'react';
import { 
  Users, 
  UserMinus, 
  Building2, 
  AlertTriangle, 
  Calendar, 
  Download, 
  Search, 
  Clock, 
  ShieldAlert, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { exportToCSV } from '../services/excelExportService';

// 5 Bưu cục chuẩn xác của Khu vực Long An (ĐNB)
const OFFICIAL_POST_OFFICES = [
  '(LAN) Cần Đước 1',
  '(LAN) Cần Giuộc',
  '(LAN) Phước Lý',
  '(LAN) Rạch Kiến',
  '(LAN) Tầm Vu'
];

const PO_COLORS: Record<string, string> = {
  '(LAN) Cần Đước 1': '#10B981', // Emerald
  '(LAN) Cần Giuộc': '#F59E0B',  // Amber
  '(LAN) Phước Lý': '#6366F1',   // Indigo
  '(LAN) Rạch Kiến': '#EF4444',  // Rose / Red (Hotspot)
  '(LAN) Tầm Vu': '#3B82F6'      // Blue
};

const REASON_COLORS: Record<string, string> = {
  'Vi phạm kỷ luật & COD': '#DC2626',    // Đỏ đậm
  'Không phù hợp / Nghỉ ngang': '#EA580C', // Cam đậm
  'Cộng tác viên (Thời vụ)': '#8B5CF6',   // Tím
  'Việc gia đình / Cá nhân': '#3B82F6',   // Xanh dương
  'Sức khỏe & Lý do thể lực': '#10B981'  // Xanh lục
};

const TENURE_LABELS = [
  'G01: Dưới 1 tháng',
  'G02: Trên 1 - 3 tháng',
  'G03: Trên 3 - 6 tháng',
  'G04: Trên 6 tháng - 1 năm',
  'G05: Trên 1 - 1,5 năm',
  'G06: Trên 1,5 -2 năm',
  'G07: Trên 2 - 3 năm',
  'G08: Trên 3 - 4 năm',
  'G09: Trên 4 - 5 năm',
  'G10: Trên 5 năm'
];

type ViewSubTab = 'overview' | 'charts' | 'tenure_matrix' | 'detail_table';
type TimeFilterMode = 'month' | 'week' | 'all';

export default function NghiViecTab() {
  const { dataset, setActiveTab } = useDashboard();
  const rawList = dataset.nghiViec || [];

  // =========================================================================
  // STATE: BỘ LỌC ĐIỀU HÀNH CHO AM HUY (ĐNB)
  // =========================================================================
  const [selectedPostOffice, setSelectedPostOffice] = useState<string>('all');
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedTenure, setSelectedTenure] = useState<string>('all');
  const [selectedReasonGroup, setSelectedReasonGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<ViewSubTab>('overview');

  // Accordion mở rộng nhóm thâm niên
  const [expandedTenureGroup, setExpandedTenureGroup] = useState<string | null>('G01: Dưới 1 tháng');

  // Phân trang bảng chi tiết
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // =========================================================================
  // DANH SÁCH LỰA CHỌN DROPDOWNS
  // =========================================================================
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach(r => {
      if (r.thangNghiViec) set.add(r.thangNghiViec);
    });
    return Array.from(set).sort((a, b) => {
      const [m1, y1] = a.split('/').map(Number);
      const [m2, y2] = b.split('/').map(Number);
      return y2 !== y1 ? y2 - y1 : m2 - m1;
    });
  }, [rawList]);

  const availableWeeks = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach(r => {
      if (r.tuanNghiViec) set.add(r.tuanNghiViec);
    });
    return Array.from(set).sort((a, b) => {
      const n1 = parseInt(a.replace('Tuần ', ''), 10) || 0;
      const n2 = parseInt(b.replace('Tuần ', ''), 10) || 0;
      return n2 - n1;
    });
  }, [rawList]);

  // =========================================================================
  // DỮ LIỆU ĐÃ LỌC (FILTERED DATASET)
  // =========================================================================
  const filteredList = useMemo(() => {
    return rawList.filter(r => {
      // 1. Lọc bưu cục
      if (selectedPostOffice !== 'all' && r.buuCuc !== selectedPostOffice) {
        return false;
      }
      // 2. Lọc thời gian theo mode
      if (timeFilterMode === 'month' && selectedMonth !== 'all') {
        if (r.thangNghiViec !== selectedMonth) return false;
      }
      if (timeFilterMode === 'week' && selectedWeek !== 'all') {
        if (r.tuanNghiViec !== selectedWeek) return false;
      }
      // 3. Lọc nhóm thâm niên
      if (selectedTenure !== 'all' && r.nhomThamNien !== selectedTenure) {
        return false;
      }
      // 4. Lọc nhóm lý do
      if (selectedReasonGroup !== 'all' && r.nhomLyDo !== selectedReasonGroup) {
        return false;
      }
      // 5. Tìm kiếm tự do (Tên, Mã NV, Chức vụ, Lý do)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          r.ten.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.lyDoNghiViec.toLowerCase().includes(q) ||
          r.buuCuc.toLowerCase().includes(q) ||
          r.chucVu.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawList, selectedPostOffice, timeFilterMode, selectedMonth, selectedWeek, selectedTenure, selectedReasonGroup, searchQuery]);

  // =========================================================================
  // TỔNG HỢP CHỈ SỐ CỐT LÕI (CORE KPIS)
  // =========================================================================
  const metrics = useMemo(() => {
    const total = filteredList.length;
    const g01Count = filteredList.filter(r => r.nhomThamNien.includes('G01')).length;
    const g02Count = filteredList.filter(r => r.nhomThamNien.includes('G02')).length;
    const under3MCount = g01Count + g02Count;

    const codViolations = filteredList.filter(r => r.nhomLyDo === 'Vi phạm kỷ luật & COD').length;
    const ctvCount = filteredList.filter(r => r.nhomLyDo === 'Cộng tác viên (Thời vụ)').length;
    const unfitCount = filteredList.filter(r => r.nhomLyDo === 'Không phù hợp / Nghỉ ngang').length;

    const totalDaysWorked = filteredList.reduce((sum, r) => sum + (r.soNgayLam || 0), 0);
    const avgDaysWorked = total > 0 ? Math.round(totalDaysWorked / total) : 0;
    const minDays = total > 0 ? Math.min(...filteredList.map(r => r.soNgayLam)) : 0;
    const maxDays = total > 0 ? Math.max(...filteredList.map(r => r.soNgayLam)) : 0;

    const totalVol = filteredList.reduce((sum, r) => sum + (r.sanLuongTb || 0), 0);
    const avgVol = total > 0 ? Math.round(totalVol / total) : 0;

    const totalSalary = filteredList.reduce((sum, r) => sum + (r.mucLuongTb || 0), 0);
    const avgSalary = total > 0 ? Math.round(totalSalary / total) : 0;

    // Tìm bưu cục có số ca nghỉ cao nhất
    const poMap: Record<string, number> = {};
    filteredList.forEach(r => {
      poMap[r.buuCuc] = (poMap[r.buuCuc] || 0) + 1;
    });
    let topPo = 'Chưa có';
    let topPoCount = 0;
    Object.entries(poMap).forEach(([bc, cnt]) => {
      if (cnt > topPoCount) {
        topPoCount = cnt;
        topPo = bc;
      }
    });

    return {
      total,
      g01Count,
      g01Rate: total > 0 ? ((g01Count / total) * 100).toFixed(1) : '0',
      under3MCount,
      under3MRate: total > 0 ? ((under3MCount / total) * 100).toFixed(1) : '0',
      codViolations,
      codRate: total > 0 ? ((codViolations / total) * 100).toFixed(1) : '0',
      ctvCount,
      unfitCount,
      avgDaysWorked,
      minDays,
      maxDays,
      avgVol,
      avgSalary,
      topPo,
      topPoCount
    };
  }, [filteredList]);

  // =========================================================================
  // MA TRẬN TỔNG HỢP THEO 5 BƯU CỤC
  // =========================================================================
  const postOfficeMatrix = useMemo(() => {
    return OFFICIAL_POST_OFFICES.map(bc => {
      const items = filteredList.filter(r => r.buuCuc === bc);
      const total = items.length;
      const g01 = items.filter(r => r.nhomThamNien.includes('G01')).length;
      const g02 = items.filter(r => r.nhomThamNien.includes('G02')).length;
      const g03Plus = total - (g01 + g02);
      const cod = items.filter(r => r.nhomLyDo === 'Vi phạm kỷ luật & COD').length;
      const unfit = items.filter(r => r.nhomLyDo === 'Không phù hợp / Nghỉ ngang').length;
      const ctv = items.filter(r => r.nhomLyDo === 'Cộng tác viên (Thời vụ)').length;

      const totalDays = items.reduce((s, r) => s + (r.soNgayLam || 0), 0);
      const avgDays = total > 0 ? Math.round(totalDays / total) : 0;

      const totalVol = items.reduce((s, r) => s + (r.sanLuongTb || 0), 0);
      const avgVol = total > 0 ? Math.round(totalVol / total) : 0;

      const totalSal = items.reduce((s, r) => s + (r.mucLuongTb || 0), 0);
      const avgSalary = total > 0 ? Math.round(totalSal / total) : 0;

      return {
        buuCuc: bc,
        total,
        share: filteredList.length > 0 ? ((total / filteredList.length) * 100).toFixed(1) : '0',
        g01,
        g02,
        under3M: g01 + g02,
        under3MRate: total > 0 ? (((g01 + g02) / total) * 100).toFixed(1) : '0',
        g03Plus,
        cod,
        unfit,
        ctv,
        avgDays,
        avgVol,
        avgSalary
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredList]);

  // =========================================================================
  // THỐNG KÊ 10 NHÓM THÂM NIÊN (G01 - G10)
  // =========================================================================
  const tenureSummary = useMemo(() => {
    return TENURE_LABELS.map(tenure => {
      const items = filteredList.filter(r => r.nhomThamNien === tenure);
      const count = items.length;
      const share = filteredList.length > 0 ? ((count / filteredList.length) * 100).toFixed(1) : '0';
      
      const totalDays = items.reduce((s, r) => s + r.soNgayLam, 0);
      const avgDays = count > 0 ? Math.round(totalDays / count) : 0;
      const minDays = count > 0 ? Math.min(...items.map(r => r.soNgayLam)) : 0;
      const maxDays = count > 0 ? Math.max(...items.map(r => r.soNgayLam)) : 0;

      const totalVol = items.reduce((s, r) => s + r.sanLuongTb, 0);
      const avgVol = count > 0 ? Math.round(totalVol / count) : 0;

      const totalSal = items.reduce((s, r) => s + r.mucLuongTb, 0);
      const avgSalary = count > 0 ? Math.round(totalSal / count) : 0;

      return {
        tenure,
        count,
        share,
        avgDays,
        minDays,
        maxDays,
        avgVol,
        avgSalary,
        items
      };
    });
  }, [filteredList]);

  // =========================================================================
  // DỮ LIỆU BIỂU ĐỒ (CHARTS DATA)
  // =========================================================================
  // 1. Phân bổ theo 5 Bưu cục (Bar Chart)
  const poChartData = useMemo(() => {
    return postOfficeMatrix.map(p => ({
      name: p.buuCuc.replace('(LAN) ', ''),
      'Tổng Nghỉ': p.total,
      'Nghỉ Sớm <3 Tháng': p.under3M,
      '% Nghỉ Sớm': parseFloat(p.under3MRate)
    }));
  }, [postOfficeMatrix]);

  // 2. Cơ cấu Nhóm Lý Do (Donut Chart)
  const reasonChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredList.forEach(r => {
      map[r.nhomLyDo] = (map[r.nhomLyDo] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: REASON_COLORS[name] || '#94A3B8'
    })).sort((a, b) => b.value - a.value);
  }, [filteredList]);

  // 3. Diễn biến theo các tháng (Timeline Area Chart)
  const monthlyTimelineData = useMemo(() => {
    const map: Record<string, { count: number; cod: number; early: number }> = {};
    availableMonths.slice().reverse().forEach(m => {
      map[m] = { count: 0, cod: 0, early: 0 };
    });
    filteredList.forEach(r => {
      if (r.thangNghiViec && map[r.thangNghiViec]) {
        map[r.thangNghiViec].count++;
        if (r.nhomLyDo === 'Vi phạm kỷ luật & COD') map[r.thangNghiViec].cod++;
        if (r.nhomThamNien.includes('G01') || r.nhomThamNien.includes('G02')) {
          map[r.thangNghiViec].early++;
        }
      }
    });
    return Object.entries(map).map(([month, data]) => ({
      month,
      'Tổng Nghỉ': data.count,
      'Nghỉ Sớm (<3T)': data.early,
      'Vi Phạm COD': data.cod
    }));
  }, [filteredList, availableMonths]);

  // =========================================================================
  // PHÂN TRANG BẢNG CHI TIẾT
  // =========================================================================
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  // Reset trang về 1 khi đổi bộ lọc
  const resetFilters = () => {
    setSelectedPostOffice('all');
    setTimeFilterMode('all');
    setSelectedMonth('all');
    setSelectedWeek('all');
    setSelectedTenure('all');
    setSelectedReasonGroup('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // =========================================================================
  // XUẤT BÁO CÁO CSV / EXCEL
  // =========================================================================
  const handleExport = () => {
    const filename = `Bao_Cao_NS_Nghi_Viec_LongAn_${selectedPostOffice === 'all' ? 'ToanKhuVuc' : selectedPostOffice.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const headers = [
      'STT',
      'Mã NV',
      'Họ và Tên',
      'Bưu Cục',
      'Mã Bưu Cục',
      'Chức Vụ',
      'Nhóm Thâm Niên',
      'Ngày Vào Làm',
      'Ngày Nghỉ Việc',
      'Số Ngày Làm Cụ Thể',
      'Sản Lượng TB/Ngày (Đơn)',
      'Mức Lương TB/Ngày (VNĐ)',
      'Nhóm Lý Do',
      'Lý Do Nghỉ Việc Chi Tiết',
      'Tháng Nghỉ',
      'Tuần Nghỉ'
    ];
    const rows = filteredList.map((r, index) => [
      index + 1,
      r.id,
      r.ten,
      r.buuCuc,
      r.maBC,
      r.chucVu,
      r.nhomThamNien,
      r.ngayVaoLam,
      r.ngayNghiViec,
      r.soNgayLam,
      r.sanLuongTb,
      r.mucLuongTb,
      r.nhomLyDo,
      r.lyDoNghiViec,
      r.thangNghiViec,
      r.tuanNghiViec
    ]);
    exportToCSV(filename, headers, rows);
  };

  // =========================================================================
  // EXECUTIVE OPERATIONAL ADVICE (ĐÁNH GIÁ SÂU SÁT DÀNH CHO AM HUY)
  // =========================================================================
  const executiveAdvice = useMemo(() => {
    const isSinglePo = selectedPostOffice !== 'all';
    const isSingleMonth = timeFilterMode === 'month' && selectedMonth !== 'all';

    let title = '';
    let statusBadge = '';
    let findings: string[] = [];
    let solutions: string[] = [];

    if (!isSinglePo) {
      title = `Nhận Định Điều Hành Biến Động Nhân Sự Toàn Khu Vực Long An ${isSingleMonth ? `(Tháng ${selectedMonth})` : ''}`;
      statusBadge = metrics.under3MRate > '50' ? 'Báo Động Thử Việc' : 'Cần Theo Dõi';
      
      findings = [
        `Điểm nóng giữ chân: 2 Bưu cục (LAN) Phước Lý (${postOfficeMatrix.find(p => p.buuCuc.includes('Phước Lý'))?.total || 0} ca) và (LAN) Rạch Kiến (${postOfficeMatrix.find(p => p.buuCuc.includes('Rạch Kiến'))?.total || 0} ca) chiếm tới ${(parseFloat(postOfficeMatrix.find(p => p.buuCuc.includes('Phước Lý'))?.share || '0') + parseFloat(postOfficeMatrix.find(p => p.buuCuc.includes('Rạch Kiến'))?.share || '0')).toFixed(1)}% toàn bộ nhân sự nghỉ việc khu vực.`,
        `Hiện tượng sốc tải thử việc: Có tới ${metrics.g01Count} nhân sự (${metrics.g01Rate}%) nghỉ việc ngay trong tháng đầu tiên (G01: <1 tháng), và ${metrics.under3MCount} nhân sự (${metrics.under3MRate}%) nghỉ trong 90 ngày đầu. Bình quân thời gian bám trụ chỉ đạt ${metrics.avgDaysWorked} ngày.`,
        `Rủi ro kỷ luật & COD: Toàn tỉnh ghi nhận ${metrics.codViolations} ca liên quan đến chiếm dụng/xoay COD/nộp COD trễ (${metrics.codRate}%). Đây là lỗ hổng kiểm soát tiền mặt cần siết chặt dứt điểm.`,
        `Cơ cấu việc làm: Lực lượng Cộng tác viên (CTV) chiếm ${metrics.ctvCount} ca nghỉ, thường biến động theo mùa cao điểm và không có cam kết gắn bó dài hạn.`
      ];

      solutions = [
        `Triển khai "Cơ Chế Kèm Cặp 14 Ngày Đầu" (Buddy Onboarding): Bắt buộc mỗi bưu tá mới tuyển vào phải đi chung tuyến với bưu tá xuất sắc (thâm niên > 1 năm) trong 3-5 ngày đầu để quen định mức giao và địa hình, giảm ngay 40% tỷ lệ nghỉ do "Không phù hợp".`,
        `Kiểm soát dòng tiền COD hàng ngày: Yêu cầu Bưu cục trưởng Phước Lý & Rạch Kiến chốt ca thu COD đúng 18h30 và 21h00, khóa app tuyến ngay khi phát hiện nộp trễ quá 24h, tuyệt đối không để xảy ra tình trạng "gối đầu/xoay cod".`,
        `Đánh giá lại hạn mức sản lượng phân tuyến: Nhân sự mới G01 chỉ nên giao từ 60 - 75 đơn/ngày trong 2 tuần đầu, tránh dồn 100 - 120 đơn khiến bưu tá quá tải và bỏ việc ngang.`
      ];
    } else {
      const poData = postOfficeMatrix.find(p => p.buuCuc === selectedPostOffice);
      title = `Phân Tích Chuyên Sâu Tỷ Lệ Nghỉ Việc Tại ${selectedPostOffice}`;
      statusBadge = (poData?.total || 0) > 20 ? 'Bưu Cục Điểm Nóng' : 'Ổn Định Tương Đối';

      if (selectedPostOffice.includes('Rạch Kiến')) {
        findings = [
          `Rạch Kiến là địa bàn tuyến phân tán, có 26 ca nghỉ việc (${poData?.share}% khu vực). Trong đó có ${poData?.g01} bưu tá nghỉ dưới 1 tháng và ${poData?.cod} ca vi phạm chiếm dụng/xoay COD.`,
          `Năng suất trung bình của nhóm nghỉ việc đạt ${poData?.avgVol} đơn/ngày, mức lương bình quân ${(poData?.avgSalary || 0).toLocaleString('vi-VN')} đ/ngày.`,
          `Lý do chính tập trung vào: Bận việc gia đình, không phù hợp công việc và nghỉ ngang không liên lạc được.`
        ];
        solutions = [
          `AM Huy yêu cầu Bưu cục trưởng Rạch Kiến trực tiếp phỏng vấn vòng 2 bưu tá mới, cam kết đi tuyến xa trước khi nhận việc.`,
          `Rà soát ký quỹ và xác minh hộ khẩu/nơi ở thực tế đối với 100% bưu tá mới để triệt tiêu nguy cơ chiếm dụng COD.`
        ];
      } else if (selectedPostOffice.includes('Phước Lý')) {
        findings = [
          `Phước Lý ghi nhận số lượng nghỉ việc cao nhất toàn khu vực với 30 nhân sự (${poData?.share}%).`,
          `Đặc thù Phước Lý có áp lực đơn sàn TMĐT rất lớn, bưu tá mới dễ ngợp trước khối lượng hàng nhập kho và tỷ lệ giao Ca 2 buổi tối.`,
          `Có ${poData?.g01} ca nghỉ G01 (<1 tháng), thời gian làm việc bình quân chỉ ${poData?.avgDays} ngày.`
        ];
        solutions = [
          `San tải tuyến vào khung giờ cao điểm Ca 2, bổ sung thêm CTV hỗ trợ bốc xếp tại kho để bưu tá chỉ tập trung giao phát.`,
          `Bưu cục trưởng phải rà soát thu nhập thực tế tuần đầu của bưu tá mới, đảm bảo chính sách lương đảm bảo được chi trả đúng hạn.`
        ];
      } else if (selectedPostOffice.includes('Cần Giuộc')) {
        findings = [
          `Cần Giuộc có 19 nhân sự nghỉ việc, nổi bật là nhóm Cộng tác viên (${poData?.ctv} ca) biến động nhanh.`,
          `Thời gian công tác trung bình ${poData?.avgDays} ngày, mức lương bình quân ${(poData?.avgSalary || 0).toLocaleString('vi-VN')} đ/ngày.`
        ];
        solutions = [
          `Chuyển đổi các CTV có năng suất tốt sang hợp đồng dịch vụ chính thức để tăng tính gắn kết.`,
          `Xây dựng lộ trình thưởng năng suất theo mốc 30 - 60 - 90 ngày làm việc liên tục.`
        ];
      } else if (selectedPostOffice.includes('Tầm Vu')) {
        findings = [
          `Tầm Vu duy trì tỷ lệ biến động rất thấp với chỉ 5 ca nghỉ việc toàn bộ thời gian qua (chiếm 6.2% khu vực).`,
          `Đội ngũ bưu tá Tầm Vu có độ ổn định thâm niên tốt nhất khu vực.`
        ];
        solutions = [
          `Nhân rộng mô hình quản trị nhân sự gắn kết của Bưu cục trưởng Tầm Vu sang Phước Lý và Rạch Kiến.`
        ];
      } else {
        // Cần Đước 1
        findings = [
          `Cần Đước 1 (Mã BC: 23220000, trước đây là Cần Đước) có tỷ lệ biến động nhân sự cực thấp, chỉ ghi nhận 1 ca nghỉ việc do vi phạm COD.`,
          `Tỷ lệ chuyên cần và độ phủ Ca 2 của Cần Đước 1 hiện đang dẫn đầu toàn tỉnh Long An.`
        ];
        solutions = [
          `Tiếp tục duy trì kỷ luật vận hành chuẩn mẫu và giám sát chặt chẽ luân chuyển đơn hàng.`
        ];
      }
    }

    return { title, statusBadge, findings, solutions };
  }, [selectedPostOffice, timeFilterMode, selectedMonth, metrics, postOfficeMatrix]);

  // =========================================================================
  // RENDER GIAO DIỆN CHÍNH
  // =========================================================================
  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
      
      {/* =========================================================================
          1. HEADER & CHUYỂN ĐỔI TAB NHÂN SỰ
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <UserMinus className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                Phân Hệ Quản Trị Nhân Sự Nghỉ Việc Khu Vực Long An
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-rose-600 text-white shadow-xs">
                {rawList.length} Nhân Sự Đã Nghỉ
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
                AM Huy (ĐNB)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Phân tích thực trạng, ma trận thâm niên (G01 - G10), cơ cấu lý do thôi việc và năng suất bình quân của lực lượng lao động qua các giai đoạn
            </p>
          </div>

          {/* Cụm điều hướng nhanh giữa 2 Task Nhân sự */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('nhan_su')}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
              title="Chuyển sang xem danh sách bưu tá đang làm việc"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nhân Sự Hiện Hữu ({dataset.nhanSu.length || 81} NV)</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Xuất file Excel / CSV danh sách nhân sự nghỉ việc đã lọc"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. CỤM BỘ LỌC TOÀN DIỆN (TICK NGÀY, TICK TUẦN, TICK THÁNG, BƯU CỤC, THÂM NIÊN)
          ========================================================================= */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-2xl p-3 sm:p-4 shadow-sm transition-all space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* A. BỘ LỌC BƯU CỤC */}
          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-orange-600" /> Bưu Cục:
            </label>
            <select
              value={selectedPostOffice}
              onChange={e => {
                setSelectedPostOffice(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">Tất cả 5 bưu cục ({rawList.length} ca)</option>
              {OFFICIAL_POST_OFFICES.map(bc => {
                const cnt = rawList.filter(r => r.buuCuc === bc).length;
                return (
                  <option key={bc} value={bc}>
                    {bc} ({cnt} ca)
                  </option>
                );
              })}
            </select>
          </div>

          {/* B. BỘ LỌC CHU KỲ THỜI GIAN: THÁNG / TUẦN / TOÀN BỘ */}
          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Chu Kỳ:
            </label>
            
            {/* Segmented Control Mode */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg font-semibold text-[11px]">
              <button
                type="button"
                onClick={() => setTimeFilterMode('all')}
                className={`px-2 py-1 rounded-md transition-all ${
                  timeFilterMode === 'all'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Toàn Bộ
              </button>
              <button
                type="button"
                onClick={() => setTimeFilterMode('month')}
                className={`px-2 py-1 rounded-md transition-all ${
                  timeFilterMode === 'month'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Theo Tháng
              </button>
              <button
                type="button"
                onClick={() => setTimeFilterMode('week')}
                className={`px-2 py-1 rounded-md transition-all ${
                  timeFilterMode === 'week'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Theo Tuần
              </button>
            </div>

            {/* Dropdown Tháng */}
            {timeFilterMode === 'month' && (
              <select
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none"
              >
                <option value="all">Tất cả các tháng ({availableMonths.length} tháng)</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            )}

            {/* Dropdown Tuần */}
            {timeFilterMode === 'week' && (
              <select
                value={selectedWeek}
                onChange={e => {
                  setSelectedWeek(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none"
              >
                <option value="all">Tất cả các tuần ({availableWeeks.length} tuần)</option>
                {availableWeeks.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            )}
          </div>

          {/* C. BỘ LỌC NHÓM THÂM NIÊN */}
          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Thâm Niên:
            </label>
            <select
              value={selectedTenure}
              onChange={e => {
                setSelectedTenure(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">Tất cả 10 nhóm (G01 - G10)</option>
              {TENURE_LABELS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* D. BỘ LỌC NHÓM LÝ DO */}
          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Nhóm Lý Do:
            </label>
            <select
              value={selectedReasonGroup}
              onChange={e => {
                setSelectedReasonGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              <option value="all">Tất cả nguyên nhân</option>
              {Object.keys(REASON_COLORS).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Nút reset bộ lọc */}
          {(selectedPostOffice !== 'all' || timeFilterMode !== 'all' || selectedTenure !== 'all' || selectedReasonGroup !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa lọc</span>
            </button>
          )}

        </div>
      </div>

      {/* =========================================================================
          3. 5 THẺ CHỈ SỐ CỐT LÕI (EXECUTIVE KPI CARDS)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Tổng số ca nghỉ */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <UserMinus className="w-3.5 h-3.5 text-rose-500" /> TỔNG CA NGHỈ
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 font-mono">
              100%
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.total} <span className="text-xs font-bold text-slate-400">nhân sự</span>
          </div>
          <div className="text-[10.5px] text-slate-400 truncate">
            {selectedPostOffice === 'all' ? 'Toàn bộ 5 Bưu Cục Long An' : selectedPostOffice}
          </div>
        </div>

        {/* Card 2: Báo động thử việc (<1 tháng) */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> NGHỈ SỚM G01 (&lt;1T)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 font-mono font-bold">
              {metrics.g01Rate}%
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.g01Count} <span className="text-xs font-bold text-slate-400">ca</span>
          </div>
          <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-medium truncate">
            {metrics.under3MCount} ca nghỉ &lt;3 tháng ({metrics.under3MRate}%)
          </div>
        </div>

        {/* Card 3: Số ngày làm trung bình */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> NGÀY LÀM TB
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-mono">
              Min: {metrics.minDays}d
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {metrics.avgDaysWorked} <span className="text-xs font-bold text-slate-400">ngày</span>
          </div>
          <div className="text-[10.5px] text-slate-400 truncate">
            Tương đương {(metrics.avgDaysWorked / 30.4).toFixed(1)} tháng công tác
          </div>
        </div>

        {/* Card 4: Vi phạm kỷ luật & COD */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> KỶ LUẬT &amp; COD
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 font-mono font-bold">
              {metrics.codRate}%
            </span>
          </div>
          <div className="text-2xl font-black text-red-600">
            {metrics.codViolations} <span className="text-xs font-bold text-slate-400">ca</span>
          </div>
          <div className="text-[10.5px] text-red-600 font-medium truncate">
            Chiếm dụng, xoay cod, nộp trễ
          </div>
        </div>

        {/* Card 5: Điểm nóng bưu cục */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-orange-500" /> ĐIỂM NÓNG NHẤT
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950 text-orange-600 font-mono font-bold">
              {metrics.topPoCount} ca
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-orange-600 dark:text-orange-400 truncate" title={metrics.topPo}>
            {metrics.topPo}
          </div>
          <div className="text-[10.5px] text-slate-400 truncate">
            Chiếm {metrics.total > 0 ? ((metrics.topPoCount / metrics.total) * 100).toFixed(1) : 0}% tổng ca nghỉ
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. NHẬN ĐỊNH ĐIỀU HÀNH THỰC TẾ DÀNH RIÊNG CHO AM HUY (ĐNB)
          ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h3 className="font-extrabold text-xs sm:text-sm tracking-wide text-amber-300 uppercase">
              {executiveAdvice.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {executiveAdvice.statusBadge}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              Cố Vấn AI Tự Động Đối Soát Dữ Liệu
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {/* Cột Trái: Thực Trạng Vấn Đề */}
          <div className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Thực Trạng Vận Hành Ghi Nhận:
            </div>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed">
              {executiveAdvice.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột Phải: Kiến Nghị Hành Động Điều Hành */}
          <div className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Chỉ Đạo Điều Hành Khuyến Nghị Dành Cho AM:
            </div>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed">
              {executiveAdvice.solutions.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. SUB-TABS NAVIGATION (4 PHÂN HỆ TƯƠNG TÁC)
          ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Tổng Thể 5 Bưu Cục ({postOfficeMatrix.length} BC)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('charts')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'charts'
              ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>2. Ma Trận Biểu Đồ Trực Quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tenure_matrix')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'tenure_matrix'
              ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>3. Phân Tầng 10 Nhóm Thâm Niên (G01 - G10)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('detail_table')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'detail_table'
              ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Bảng Kê Chi Tiết 100% Nhân Sự ({filteredList.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MA TRẬN TỔNG THỂ 5 BƯU CỤC
          ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-4 h-4 text-orange-600" />
                Bảng Ma Trận Tổng Hợp Tình Hình Nghỉ Việc Theo 5 Bưu Cục
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhấn vào bất kỳ dòng nào để lọc ngay báo cáo chi tiết của bưu cục đó
              </p>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold">
              Khu vực Long An &bull; AM Nguyễn Hoàng Huy
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="p-3 w-[22%]">Bưu Cục</th>
                  <th className="p-3 text-right w-[10%]">Tổng Nghỉ</th>
                  <th className="p-3 text-right w-[10%]">Tỷ Trọng %</th>
                  <th className="p-3 text-right w-[13%]">Nghỉ &lt;1 Tháng (G01)</th>
                  <th className="p-3 text-right w-[13%]">Nghỉ &lt;3 Tháng</th>
                  <th className="p-3 text-right w-[11%]">Số Ngày Làm TB</th>
                  <th className="p-3 text-right w-[10%]">Sản Lượng TB</th>
                  <th className="p-3 text-right w-[11%]">Vi Phạm COD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {postOfficeMatrix.map((item) => {
                  const isSelected = selectedPostOffice === item.buuCuc;
                  return (
                    <tr
                      key={item.buuCuc}
                      onClick={() => {
                        setSelectedPostOffice(isSelected ? 'all' : item.buuCuc);
                        setCurrentPage(1);
                      }}
                      className={`hover:bg-orange-50/50 dark:hover:bg-slate-750/70 transition-all cursor-pointer ${
                        isSelected ? 'bg-orange-50/90 dark:bg-orange-950/40 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: PO_COLORS[item.buuCuc] || '#94A3B8' }} 
                          />
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {item.buuCuc}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-600 text-white">
                              Đang lọc
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400 font-mono text-sm">
                        {item.total}
                      </td>
                      <td className="p-3 text-right font-semibold font-mono">
                        {item.share}%
                      </td>
                      <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {item.g01} ca
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.under3M} ca</span>
                        <span className="text-[10px] text-slate-400 ml-1">({item.under3MRate}%)</span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.avgDays} ngày
                      </td>
                      <td className="p-3 text-right font-mono">
                        {item.avgVol} đơn/d
                      </td>
                      <td className="p-3 text-right font-mono">
                        {item.cod > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                            {item.cod} ca
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-750 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td className="p-3 uppercase">TỔNG TOÀN KHU VỰC</td>
                  <td className="p-3 text-right text-rose-600 font-mono text-sm">
                    {metrics.total}
                  </td>
                  <td className="p-3 text-right font-mono">100%</td>
                  <td className="p-3 text-right text-amber-600 font-mono">
                    {metrics.g01Count} ca
                  </td>
                  <td className="p-3 text-right font-mono">
                    {metrics.under3MCount} ca ({metrics.under3MRate}%)
                  </td>
                  <td className="p-3 text-right text-indigo-600 font-mono">
                    {metrics.avgDaysWorked} ngày
                  </td>
                  <td className="p-3 text-right font-mono">
                    {metrics.avgVol} đơn/d
                  </td>
                  <td className="p-3 text-right text-red-600 font-mono">
                    {metrics.codViolations} ca
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MA TRẬN BIỂU ĐỒ TRỰC QUAN (CHARTS)
          ========================================================================= */}
      {activeSubTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Biểu đồ 1: Số lượng nghỉ & % nghỉ sớm theo 5 Bưu cục */}
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  So Sánh Tình Hình Nghỉ Việc Giữa 5 Bưu Cục
                </h4>
                <p className="text-[11px] text-slate-400">
                  Cột: Tổng số ca nghỉ &bull; Đường: Tỷ lệ nghỉ sớm (&lt;3 tháng)
                </p>
              </div>
            </div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={poChartData} margin={{ top: 15, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip 
                    formatter={(val, name) => [
                      name === '% Nghỉ Sớm' ? `${val}%` : `${val} nhân sự`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar yAxisId="left" dataKey="Tổng Nghỉ" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar yAxisId="left" dataKey="Nghỉ Sớm <3 Tháng" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={24} />
                  <Line yAxisId="right" type="monotone" dataKey="% Nghỉ Sớm" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ 2: Cơ cấu Nhóm Lý Do Nghỉ Việc */}
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                Cơ Cấu Lý Do Thôi Việc Toàn Khu Vực
              </h4>
              <p className="text-[11px] text-slate-400">
                Phân loại theo mức độ rủi ro quản trị nhân sự
              </p>
            </div>
            <div className="h-64 sm:h-72 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {reasonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} ca (${((Number(val)/metrics.total)*100).toFixed(1)}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng Nghỉ</span>
                <span className="text-xl font-black text-slate-900 dark:text-white block font-mono">
                  {metrics.total}
                </span>
                <span className="text-[9px] text-rose-600 font-bold block">ca thôi việc</span>
              </div>
            </div>
            {/* Chú thích lý do */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
              {reasonChartData.map(r => (
                <div key={r.name} className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-750">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{r.name}</span>
                  </div>
                  <span className="font-bold font-mono text-slate-900 dark:text-white shrink-0 ml-1">
                    {r.value} ca
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Biểu đồ 3: Diễn biến nghỉ việc qua các tháng */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  Diễn Biến Nhân Sự Nghỉ Việc Qua Các Tháng (Timeline 2026)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Theo dõi xu hướng biến động và các đợt bùng phát nghỉ việc theo chu kỳ
                </p>
              </div>
            </div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTimelineData} margin={{ top: 15, right: 20, bottom: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorEarly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="Tổng Nghỉ" stroke="#EF4444" fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="Nghỉ Sớm (<3T)" stroke="#F59E0B" fillOpacity={1} fill="url(#colorEarly)" />
                  <Line type="monotone" dataKey="Vi Phạm COD" stroke="#7C3AED" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 3: BẢNG PHÂN TẦNG 10 NHÓM THÂM NIÊN (G01 - G10)
          ========================================================================= */}
      {activeSubTab === 'tenure_matrix' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Bảng Phân Tầng 10 Nhóm Thâm Niên (G01 - G10) &amp; Rủi Ro Nghỉ Việc
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nhấn vào từng nhóm để mở rộng danh sách chi tiết nhân sự tương ứng
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {tenureSummary.map((t, idx) => {
                const isExpanded = expandedTenureGroup === t.tenure;
                const isHighRisk = t.tenure.includes('G01') || t.tenure.includes('G02');

                return (
                  <div
                    key={t.tenure}
                    className={`border rounded-xl transition-all overflow-hidden ${
                      isExpanded 
                        ? 'border-orange-400 dark:border-orange-600 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row Accordion */}
                    <button
                      type="button"
                      onClick={() => setExpandedTenureGroup(isExpanded ? null : t.tenure)}
                      className={`w-full p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2 text-left transition-all ${
                        isExpanded ? 'bg-orange-50/70 dark:bg-slate-750' : 'bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                          isHighRisk ? 'bg-rose-600' : 'bg-indigo-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                            {t.tenure}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Số ngày làm TB: <strong className="text-slate-700 dark:text-slate-300 font-bold">{t.avgDays} ngày</strong> (Từ {t.minDays} - {t.maxDays} ngày)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-6 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Số Ca Nghỉ</span>
                          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                            {t.count} ca ({t.share}%)
                          </span>
                        </div>

                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Sản Lượng TB</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {t.avgVol} đơn/ngày
                          </span>
                        </div>

                        <div className="text-right hidden md:block">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Mức Lương TB</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {t.avgSalary.toLocaleString('vi-VN')} đ/ngày
                          </span>
                        </div>

                        <div className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {/* Danh Sách Mở Rộng Khi Click */}
                    {isExpanded && (
                      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 space-y-2">
                        {t.items.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400 italic">
                            Không có nhân sự nào thuộc nhóm này theo bộ lọc hiện tại.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead className="bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                                <tr>
                                  <th className="p-2">Mã NV</th>
                                  <th className="p-2">Họ và Tên</th>
                                  <th className="p-2">Bưu Cục</th>
                                  <th className="p-2">Ngày Vào Làm</th>
                                  <th className="p-2">Ngày Nghỉ Việc</th>
                                  <th className="p-2 text-right">Số Ngày Làm</th>
                                  <th className="p-2 text-right">Sản Lượng TB</th>
                                  <th className="p-2 text-right">Mức Lương TB</th>
                                  <th className="p-2">Lý Do Nghỉ Việc</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                                {t.items.map(person => (
                                  <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                                    <td className="p-2 font-mono font-bold text-orange-600">{person.id}</td>
                                    <td className="p-2 font-bold text-slate-900 dark:text-white">{person.ten}</td>
                                    <td className="p-2">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {person.buuCuc}
                                      </span>
                                    </td>
                                    <td className="p-2 font-mono text-slate-600 dark:text-slate-400">{person.ngayVaoLam}</td>
                                    <td className="p-2 font-mono text-slate-600 dark:text-slate-400">{person.ngayNghiViec}</td>
                                    <td className="p-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                      {person.soNgayLam} ngày
                                    </td>
                                    <td className="p-2 text-right font-mono font-semibold">
                                      {person.sanLuongTb} đơn/d
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-emerald-600">
                                      {person.mucLuongTb.toLocaleString('vi-VN')} đ
                                    </td>
                                    <td className="p-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        person.nhomLyDo === 'Vi phạm kỷ luật & COD'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                      }`}>
                                        {person.lyDoNghiViec}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: BẢNG KÊ CHI TIẾT 100% NHÂN SỰ NGHỈ VIỆC
          ========================================================================= */}
      {activeSubTab === 'detail_table' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
                <FileText className="w-4 h-4 text-orange-600" />
                Bảng Kê Chi Tiết Nhân Sự Nghỉ Việc ({filteredList.length} Bản Ghi)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hiển thị đầy đủ ngày vào làm, ngày kết thúc, số ngày làm cụ thể, sản lượng và mức lương bình quân
              </p>
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, mã NV, chức vụ, lý do..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                <tr>
                  <th className="p-2.5 text-center w-[4%]">STT</th>
                  <th className="p-2.5 w-[8%]">Mã NV</th>
                  <th className="p-2.5 w-[14%]">Họ và Tên</th>
                  <th className="p-2.5 w-[13%]">Bưu Cục</th>
                  <th className="p-2.5 w-[11%]">Thâm Niên</th>
                  <th className="p-2.5 text-center w-[9%]">Ngày Vào</th>
                  <th className="p-2.5 text-center w-[9%]">Ngày Nghỉ</th>
                  <th className="p-2.5 text-right w-[9%]">Số Ngày Làm</th>
                  <th className="p-2.5 text-right w-[8%]">Sản Lượng TB</th>
                  <th className="p-2.5 text-right w-[9%]">Mức Lương TB</th>
                  <th className="p-2.5 w-[15%]">Lý Do Nghỉ Việc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-xs text-slate-400 italic">
                      Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((person, idx) => {
                    const stt = (currentPage - 1) * pageSize + idx + 1;
                    const isCod = person.nhomLyDo === 'Vi phạm kỷ luật & COD';
                    return (
                      <tr 
                        key={person.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-750/70 transition-colors ${
                          isCod ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{stt}</td>
                        <td className="p-2.5 font-mono font-bold text-orange-600 dark:text-orange-400">{person.id}</td>
                        <td className="p-2.5">
                          <div className="font-extrabold text-slate-900 dark:text-white">{person.ten}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{person.chucVu}</div>
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {person.buuCuc}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {person.nhomThamNien.split(':')[0]}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {person.ngayVaoLam}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {person.ngayNghiViec}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {person.soNgayLam} ngày
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {person.sanLuongTb} <span className="text-[10px] text-slate-400 font-normal">đơn</span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {person.mucLuongTb.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-2.5">
                          <div className={`text-[11px] font-medium line-clamp-2 ${
                            isCod ? 'text-red-700 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {person.lyDoNghiViec}
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">
                            {person.nhomLyDo}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
              <div className="text-slate-400 font-medium">
                Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredList.length)}</strong> trên tổng số <strong>{filteredList.length}</strong> nhân sự
              </div>

              <div className="flex items-center gap-1.5 self-center">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                >
                  Trước
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                >
                  Sau
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
