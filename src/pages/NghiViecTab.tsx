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
  RotateCcw, 
  FileText, 
  Sparkles, 
  CheckCircle2,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers
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
  Cell, 
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
  '(LAN) Rạch Kiến': '#EF4444',  // Red / Hotspot
  '(LAN) Tầm Vu': '#3B82F6'      // Blue
};

const REASON_COLORS: Record<string, string> = {
  'Vi phạm kỷ luật & COD': '#DC2626',     // Đỏ đậm
  'Không phù hợp / Nghỉ ngang': '#EA580C', // Cam đậm
  'Cộng tác viên (Thời vụ)': '#8B5CF6',   // Tím
  'Việc gia đình / Cá nhân': '#3B82F6',   // Xanh dương
  'Sức khỏe & Lý do thể lực': '#10B981'   // Xanh lục
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

const TENURE_COLORS: Record<string, string> = {
  'G01: Dưới 1 tháng': '#DC2626',
  'G02: Trên 1 - 3 tháng': '#EA580C',
  'G03: Trên 3 - 6 tháng': '#F59E0B',
  'G04: Trên 6 tháng - 1 năm': '#10B981',
  'G05: Trên 1 - 1,5 năm': '#06B6D4',
  'G06: Trên 1,5 -2 năm': '#3B82F6',
  'G07: Trên 2 - 3 năm': '#6366F1',
  'G08: Trên 3 - 4 năm': '#8B5CF6',
  'G09: Trên 4 - 5 năm': '#A855F7',
  'G10: Trên 5 năm': '#475569'
};

type TimeFilterMode = 'all' | 'month' | 'week';
type ActiveKpiType = 'all' | 'early' | 'days' | 'cod' | 'hotspot' | null;
type MatrixGranularity = 'month' | 'week' | 'day';
type MatrixViewMode = 'volume' | 'impact';

export default function NghiViecTab() {
  const { dataset, setActiveTab } = useDashboard();
  const rawList = dataset.nghiViec || [];

  // =========================================================================
  // STATE: BỘ LỌC ĐIỀU HÀNH
  // =========================================================================
  const [selectedPostOffice, setSelectedPostOffice] = useState<string>('all');
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedTenure, setSelectedTenure] = useState<string>('all');
  const [selectedReasonGroup, setSelectedReasonGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // =========================================================================
  // STATE: BỘ LỌC RIÊNG CỦA MA TRẬN THỜI GIAN & SỨC ẢNH HƯỞNG BƯU CỤC
  // =========================================================================
  const [matrixGranularity, setMatrixGranularity] = useState<MatrixGranularity>('month');
  const [matrixSelectedPos, setMatrixSelectedPos] = useState<string[]>(OFFICIAL_POST_OFFICES);
  const [matrixViewMode, setMatrixViewMode] = useState<MatrixViewMode>('volume');
  const [matrixExpandedPeriod, setMatrixExpandedPeriod] = useState<string | null>(null);

  const toggleMatrixPo = (po: string) => {
    setMatrixSelectedPos(prev => {
      if (prev.includes(po)) {
        if (prev.length === 1) return prev; // Giữ tối thiểu 1 bưu cục
        return prev.filter(p => p !== po);
      } else {
        return [...prev, po];
      }
    });
  };

  const toggleAllMatrixPos = () => {
    if (matrixSelectedPos.length === OFFICIAL_POST_OFFICES.length) {
      setMatrixSelectedPos([OFFICIAL_POST_OFFICES[0]]);
    } else {
      setMatrixSelectedPos(OFFICIAL_POST_OFFICES);
    }
  };

  // Active KPI card interact
  const [activeKpiCard, setActiveKpiCard] = useState<ActiveKpiType>(null);

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
  // DỮ LIỆU ĐÃ LỌC (SẮP XẾP TỪ NGÀY GẦN NHẤT ĐẾN NGÀY XA NHẤT)
  // =========================================================================
  const filteredList = useMemo(() => {
    const list = rawList.filter(r => {
      if (selectedPostOffice !== 'all' && r.buuCuc !== selectedPostOffice) return false;
      if (timeFilterMode === 'month' && selectedMonth !== 'all' && r.thangNghiViec !== selectedMonth) return false;
      if (timeFilterMode === 'week' && selectedWeek !== 'all' && r.tuanNghiViec !== selectedWeek) return false;
      if (selectedTenure !== 'all' && r.nhomThamNien !== selectedTenure) return false;
      if (selectedReasonGroup !== 'all' && r.nhomLyDo !== selectedReasonGroup) return false;
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

    // Sắp xếp chuẩn xác từ ngày gần nhất đến ngày xa nhất (Newest -> Oldest)
    const parseDate = (dStr: string) => {
      if (!dStr) return 0;
      const [d, m, y] = dStr.split('/').map(Number);
      return new Date(y, m - 1, d).getTime();
    };
    return list.sort((a, b) => parseDate(b.ngayNghiViec) - parseDate(a.ngayNghiViec));
  }, [rawList, selectedPostOffice, timeFilterMode, selectedMonth, selectedWeek, selectedTenure, selectedReasonGroup, searchQuery]);

  // =========================================================================
  // CHỈ SỐ CỐT LÕI (KPIS)
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
  // 1. DỮ LIỆU BẢNG KÊ & ĐỒ THỊ 5 BƯU CỤC
  // =========================================================================
  const postOfficeMatrix = useMemo(() => {
    return OFFICIAL_POST_OFFICES.map(bc => {
      const items = filteredList.filter(r => r.buuCuc === bc);
      const total = items.length;
      const g01 = items.filter(r => r.nhomThamNien.includes('G01')).length;
      const g02 = items.filter(r => r.nhomThamNien.includes('G02')).length;
      const under3M = g01 + g02;
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
        under3M,
        under3MRate: total > 0 ? ((under3M / total) * 100).toFixed(1) : '0',
        cod,
        unfit,
        ctv,
        avgDays,
        avgVol,
        avgSalary
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredList]);

  const poChartData = useMemo(() => {
    return postOfficeMatrix.map(p => ({
      name: p.buuCuc.replace('(LAN) ', ''),
      'Tổng Nghỉ': p.total,
      'Nghỉ Sớm <3T': p.under3M,
      '% Nghỉ Sớm': parseFloat(p.under3MRate)
    }));
  }, [postOfficeMatrix]);

  // =========================================================================
  // DỮ LIỆU MA TRẬN THEO THỜI GIAN (THÁNG/TUẦN/NGÀY) & SỨC ẢNH HƯỞNG BƯU CỤC
  // Sắp xếp từ ngày/chu kỳ gần nhất đến xa nhất (Newest -> Oldest)
  // =========================================================================
  const timePeriods = useMemo(() => {
    if (matrixGranularity === 'month') {
      const set = new Set<string>();
      rawList.forEach(r => { if (r.thangNghiViec) set.add(r.thangNghiViec); });
      return Array.from(set).sort((a, b) => {
        const [m1, y1] = a.split('/').map(Number);
        const [m2, y2] = b.split('/').map(Number);
        return y2 !== y1 ? y2 - y1 : m2 - m1;
      });
    } else if (matrixGranularity === 'week') {
      const set = new Set<string>();
      rawList.forEach(r => { if (r.tuanNghiViec) set.add(r.tuanNghiViec); });
      return Array.from(set).sort((a, b) => {
        const n1 = parseInt(a.replace('Tuần ', ''), 10) || 0;
        const n2 = parseInt(b.replace('Tuần ', ''), 10) || 0;
        return n2 - n1;
      });
    } else {
      const set = new Set<string>();
      rawList.forEach(r => { if (r.ngayNghiViec) set.add(r.ngayNghiViec); });
      return Array.from(set).sort((a, b) => {
        const [d1, m1, y1] = a.split('/').map(Number);
        const [d2, m2, y2] = b.split('/').map(Number);
        const time1 = new Date(y1, m1 - 1, d1).getTime();
        const time2 = new Date(y2, m2 - 1, d2).getTime();
        return time2 - time1;
      });
    }
  }, [rawList, matrixGranularity]);

  const timeMatrixRows = useMemo(() => {
    const grandTotal = rawList.length || 1;
    const parseDate = (dStr: string) => {
      if (!dStr) return 0;
      const [d, m, y] = dStr.split('/').map(Number);
      return new Date(y, m - 1, d).getTime();
    };

    return timePeriods.map(period => {
      const items = rawList.filter(r => {
        if (matrixGranularity === 'month') return r.thangNghiViec === period;
        if (matrixGranularity === 'week') return r.tuanNghiViec === period;
        return r.ngayNghiViec === period;
      }).sort((a, b) => parseDate(b.ngayNghiViec) - parseDate(a.ngayNghiViec));

      const periodAreaTotal = items.length;
      const poCounts: Record<string, number> = {};
      let selectedTotal = 0;
      let topPo = '';
      let topPoCount = 0;

      OFFICIAL_POST_OFFICES.forEach(po => {
        const c = items.filter(r => r.buuCuc === po).length;
        poCounts[po] = c;
        if (matrixSelectedPos.includes(po)) {
          selectedTotal += c;
        }
        if (c > topPoCount) {
          topPoCount = c;
          topPo = po.replace('(LAN) ', '');
        }
      });

      const impactShareGrand = ((periodAreaTotal / grandTotal) * 100).toFixed(1);

      return {
        period,
        label: matrixGranularity === 'month' ? `Tháng ${period}` : (matrixGranularity === 'week' ? period : `Ngày ${period}`),
        shortLabel: matrixGranularity === 'month' ? `T${period.split('/')[0]}` : (matrixGranularity === 'week' ? period.replace('Tuần ', 'W') : period.slice(0, 5)),
        poCounts,
        selectedTotal,
        periodAreaTotal,
        topPo: topPo ? `${topPo} (${topPoCount})` : '-',
        topPoName: topPo,
        topPoCount,
        impactShareGrand,
        items
      };
    });
  }, [rawList, timePeriods, matrixGranularity, matrixSelectedPos]);

  const timeMatrixChartData = useMemo(() => {
    return timeMatrixRows.map(row => {
      const entry: Record<string, string | number> = {
        name: row.shortLabel,
        fullName: row.label,
        'Tổng Kỳ': row.selectedTotal,
        'Tổng Toàn Khu Vực': row.periodAreaTotal
      };

      OFFICIAL_POST_OFFICES.forEach(po => {
        if (matrixSelectedPos.includes(po)) {
          const short = po.replace('(LAN) ', '');
          const count = row.poCounts[po] || 0;
          if (matrixViewMode === 'volume') {
            entry[short] = count;
          } else {
            entry[short] = row.selectedTotal > 0 ? Number(((count / row.selectedTotal) * 100).toFixed(1)) : 0;
          }
        }
      });

      return entry;
    });
  }, [timeMatrixRows, matrixSelectedPos, matrixViewMode]);

  const cumulativePoImpact = useMemo(() => {
    const total = rawList.length || 1;
    return OFFICIAL_POST_OFFICES.map(po => {
      const count = rawList.filter(r => r.buuCuc === po).length;
      const share = ((count / total) * 100).toFixed(1);
      let level = 'Rất thấp';
      let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
      
      const monthCounts: Record<string, number> = {};
      rawList.filter(r => r.buuCuc === po).forEach(r => {
        monthCounts[r.thangNghiViec] = (monthCounts[r.thangNghiViec] || 0) + 1;
      });
      let maxMonth = '';
      let maxMonthCount = 0;
      Object.entries(monthCounts).forEach(([m, c]) => {
        if (c > maxMonthCount) {
          maxMonthCount = c;
          maxMonth = `T${m.split('/')[0]} (${c} ca)`;
        }
      });

      if (parseFloat(share) >= 35) {
        level = 'Cực cao (Điểm nóng số 1)';
        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
      } else if (parseFloat(share) >= 30) {
        level = 'Rất cao (Điểm nóng số 2)';
        badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300';
      } else if (parseFloat(share) >= 20) {
        level = 'Cao (Bùng phát Q3)';
        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
      } else if (parseFloat(share) >= 5) {
        level = 'Thấp (Ổn định)';
        badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
      } else {
        level = 'Rất thấp (Vững chắc)';
        badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
      }

      return {
        buuCuc: po,
        shortName: po.replace('(LAN) ', ''),
        count,
        share,
        level,
        badgeColor,
        peakPeriod: maxMonth || '-',
        color: PO_COLORS[po] || '#94A3B8'
      };
    }).sort((a, b) => b.count - a.count);
  }, [rawList]);

  // =========================================================================
  // 2. DỮ LIỆU BẢNG KÊ & ĐỒ THỊ NHÓM THÂM NIÊN (G01 - G10)
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
        shortCode: tenure.split(':')[0],
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

  const tenureChartData = useMemo(() => {
    return tenureSummary.map(t => ({
      name: t.shortCode,
      fullName: t.tenure,
      'Số Ca Nghỉ': t.count,
      'Số Ngày Làm TB': t.avgDays,
      fill: TENURE_COLORS[t.tenure] || '#64748B'
    }));
  }, [tenureSummary]);

  // =========================================================================
  // 3. DỮ LIỆU BẢNG KÊ & ĐỒ THỊ NHÓM LÝ DO NGHỈ
  // =========================================================================
  const reasonSummary = useMemo(() => {
    const groups = Object.keys(REASON_COLORS);
    return groups.map(groupName => {
      const items = filteredList.filter(r => r.nhomLyDo === groupName);
      const count = items.length;
      const share = filteredList.length > 0 ? ((count / filteredList.length) * 100).toFixed(1) : '0';

      const totalDays = items.reduce((s, r) => s + r.soNgayLam, 0);
      const avgDays = count > 0 ? Math.round(totalDays / count) : 0;

      const poCountMap: Record<string, number> = {};
      items.forEach(r => {
        poCountMap[r.buuCuc] = (poCountMap[r.buuCuc] || 0) + 1;
      });
      let topPo = '-';
      let maxPoCount = 0;
      Object.entries(poCountMap).forEach(([bc, c]) => {
        if (c > maxPoCount) {
          maxPoCount = c;
          topPo = `${bc.replace('(LAN) ', '')} (${c})`;
        }
      });

      return {
        groupName,
        count,
        share,
        avgDays,
        topPo,
        color: REASON_COLORS[groupName] || '#94A3B8'
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredList]);

  const reasonChartData = useMemo(() => {
    return reasonSummary.filter(r => r.count > 0).map(r => ({
      name: r.groupName,
      value: r.count,
      color: r.color
    }));
  }, [reasonSummary]);

  // =========================================================================
  // PHÂN TRANG BẢNG CHI TIẾT
  // =========================================================================
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  const resetFilters = () => {
    setSelectedPostOffice('all');
    setTimeFilterMode('all');
    setSelectedMonth('all');
    setSelectedWeek('all');
    setSelectedTenure('all');
    setSelectedReasonGroup('all');
    setSearchQuery('');
    setActiveKpiCard(null);
    setCurrentPage(1);
  };

  // =========================================================================
  // TƯƠNG TÁC THẺ KPI: NỔI LÊN & CUỘN ĐẾN BẢNG LIÊN QUAN
  // =========================================================================
  const handleKpiClick = (type: ActiveKpiType, targetId: string) => {
    setActiveKpiCard(type);
    setCurrentPage(1);

    if (type === 'all') {
      setSelectedPostOffice('all');
      setSelectedTenure('all');
      setSelectedReasonGroup('all');
    } else if (type === 'early') {
      setSelectedTenure('G01: Dưới 1 tháng');
      setExpandedTenureGroup('G01: Dưới 1 tháng');
    } else if (type === 'days') {
      setSelectedTenure('all');
    } else if (type === 'cod') {
      setSelectedReasonGroup('Vi phạm kỷ luật & COD');
    } else if (type === 'hotspot') {
      if (metrics.topPo && metrics.topPo !== 'Chưa có') {
        setSelectedPostOffice(metrics.topPo);
      }
    }

    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
  // EXECUTIVE OPERATIONAL ADVICE (ĐẶT Ở CUỐI TRANG)
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
  // RENDER
  // =========================================================================
  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
      
      {/* =========================================================================
          1. HEADER GỘP THU GỌN VỚI TÌM KIẾM & BỘ LỌC ĐIỀU HÀNH (TỐI ƯU SIÊU NHỎ GỌN)
          ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-2 sm:p-2.5 shadow-xs transition-all space-y-1.5">
        
        {/* Hàng 1: Tiêu đề, Badges và Các nút thao tác nhanh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-md shrink-0">
              <UserMinus className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <h1 className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
              PHÂN HỆ QUẢN TRỊ NHÂN SỰ NGHỈ VIỆC KHU VỰC LONG AN
            </h1>
            <span className="px-1.5 py-0.2 text-[9.5px] font-black rounded-full bg-rose-600 text-white shadow-2xs shrink-0">
              {rawList.length} Đã Nghỉ
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 shrink-0">
              AM Huy (ĐNB)
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('nhan_su')}
              className="h-7 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer"
              title="Chuyển sang xem danh sách bưu tá đang làm việc"
            >
              <Users className="w-3 h-3 text-indigo-500" />
              <span className="hidden sm:inline">Nhân Sự Hiện Hữu ({dataset.nhanSu.length || 81} NV)</span>
              <span className="sm:hidden">Hiện Hữu</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer"
              title="Xuất file Excel / CSV danh sách nhân sự nghỉ việc đã lọc"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Xuất Báo Cáo</span>
              <span className="sm:hidden">Xuất</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Thanh tìm kiếm gộp chung cùng Bộ lọc điều hành (Tối ưu nhỏ gọn trên 1 dòng) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
          
          {/* 1. Ô tìm kiếm thu nhỏ */}
          <div className="relative w-36 sm:w-44 shrink-0">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm bưu tá, mã NV..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-7 pl-6 pr-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-[11px] focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          {/* 2. Lọc Bưu Cục */}
          <div className="flex items-center gap-1 shrink-0">
            <Building2 className="w-3 h-3 text-orange-600 shrink-0" />
            <select
              value={selectedPostOffice}
              onChange={e => {
                setSelectedPostOffice(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0 font-bold text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả 5 bưu cục ({rawList.length} ca)</option>
              {OFFICIAL_POST_OFFICES.map(bc => {
                const cnt = rawList.filter(r => r.buuCuc === bc).length;
                return (
                  <option key={bc} value={bc}>{bc} ({cnt} ca)</option>
                );
              })}
            </select>
          </div>

          {/* 3. Lọc Chu Kỳ */}
          <div className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="text-slate-400 text-[10.5px] font-bold hidden sm:inline">Chu Kỳ:</span>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md font-semibold text-[10.5px]">
              <button
                type="button"
                onClick={() => setTimeFilterMode('all')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  timeFilterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Toàn Bộ
              </button>
              <button
                type="button"
                onClick={() => setTimeFilterMode('month')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  timeFilterMode === 'month'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tháng
              </button>
              <button
                type="button"
                onClick={() => setTimeFilterMode('week')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  timeFilterMode === 'week'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tuần
              </button>
            </div>

            {timeFilterMode === 'month' && (
              <select
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-7 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả tháng ({availableMonths.length})</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            )}

            {timeFilterMode === 'week' && (
              <select
                value={selectedWeek}
                onChange={e => {
                  setSelectedWeek(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-7 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả tuần ({availableWeeks.length})</option>
                {availableWeeks.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Lọc Thâm Niên */}
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <select
              value={selectedTenure}
              onChange={e => {
                setSelectedTenure(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0 font-medium text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all">10 nhóm (G01 - G10)</option>
              {TENURE_LABELS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 5. Lọc Nhóm Lý Do */}
          <div className="flex items-center gap-1 shrink-0">
            <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
            <select
              value={selectedReasonGroup}
              onChange={e => {
                setSelectedReasonGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0 font-medium text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả nguyên nhân</option>
              {Object.keys(REASON_COLORS).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 6. Reset lọc */}
          {(selectedPostOffice !== 'all' || timeFilterMode !== 'all' || selectedTenure !== 'all' || selectedReasonGroup !== 'all' || searchQuery || activeKpiCard) && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-7 ml-auto px-2 text-[10.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-md flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Xóa lọc</span>
            </button>
          )}

        </div>
      </div>

      {/* =========================================================================
          2. 5 THẺ CHỈ SỐ CỐT LÕI (INTERACTIVE: NHẤN VÀO NỔI LÊN & CUỘN ĐẾN BẢNG LIÊN QUAN)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Card 1: Tổng ca nghỉ */}
        <div 
          onClick={() => handleKpiClick('all', 'section-overview-po')}
          className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-1 ${
            activeKpiCard === 'all'
              ? 'ring-2 ring-orange-500 border-orange-400 shadow-md -translate-y-1 bg-orange-50/20 dark:bg-slate-750'
              : 'border-slate-200 dark:border-slate-700 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs'
          }`}
          title="Nhấn để xem bảng kê và đồ thị tổng quan 5 bưu cục"
        >
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

        {/* Card 2: Nghỉ sớm G01 (<1T) */}
        <div 
          onClick={() => handleKpiClick('early', 'section-tenure')}
          className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-1 ${
            activeKpiCard === 'early'
              ? 'ring-2 ring-amber-500 border-amber-400 shadow-md -translate-y-1 bg-amber-50/20 dark:bg-slate-750'
              : 'border-amber-200 dark:border-amber-800/80 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs'
          }`}
          title="Nhấn để xem bảng kê nhóm thâm niên G01 và danh sách bưu tá nghỉ sớm"
        >
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

        {/* Card 3: Ngày làm TB */}
        <div 
          onClick={() => handleKpiClick('days', 'section-tenure')}
          className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-1 ${
            activeKpiCard === 'days'
              ? 'ring-2 ring-indigo-500 border-indigo-400 shadow-md -translate-y-1 bg-indigo-50/20 dark:bg-slate-750'
              : 'border-slate-200 dark:border-slate-700 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs'
          }`}
          title="Nhấn để xem phân tầng số ngày làm việc theo nhóm thâm niên"
        >
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

        {/* Card 4: Kỷ luật & COD */}
        <div 
          onClick={() => handleKpiClick('cod', 'section-reasons')}
          className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-1 ${
            activeKpiCard === 'cod'
              ? 'ring-2 ring-rose-500 border-rose-400 shadow-md -translate-y-1 bg-rose-50/20 dark:bg-slate-750'
              : 'border-rose-200 dark:border-rose-900/60 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs'
          }`}
          title="Nhấn để xem bảng kê nhóm lý do nghỉ và danh sách vi phạm COD"
        >
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

        {/* Card 5: Điểm nóng nhất */}
        <div 
          onClick={() => handleKpiClick('hotspot', 'section-overview-po')}
          className={`col-span-2 sm:col-span-1 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-1 ${
            activeKpiCard === 'hotspot'
              ? 'ring-2 ring-orange-500 border-orange-400 shadow-md -translate-y-1 bg-orange-50/20 dark:bg-slate-750'
              : 'border-slate-200 dark:border-slate-700 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs'
          }`}
          title="Nhấn để xem bảng kê và đồ thị của bưu cục điểm nóng biến động"
        >
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
          KHỐI 1 (MỚI): BẢNG THỐNG KÊ NGHỈ VIỆC THEO THÁNG/CHU KỲ CỦA CÁC BƯU CỤC (TRÁI)
          VÀ SONG SONG BÊN PHẢI LÀ ĐỒ THỊ MA TRẬN SỨC ẢNH HƯỞNG SO VỚI TOÀN KHU VỰC
          ========================================================================= */}
      <div id="section-time-matrix" className="space-y-3.5 scroll-mt-28">
        
        {/* THANH ĐIỀU HÀNH BỘ LỌC RIÊNG CỦA MA TRẬN (TICK NGÀY, TICK TUẦN, TICK THÁNG, TICK BƯU CỤC) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Activity className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                    MA TRẬN NGHỈ VIỆC THEO THỜI GIAN &amp; SỨC ẢNH HƯỞNG 5 BƯU CỤC
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                    Toàn Khu Vực Long An
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  Phân tích động thái biến động nhân sự qua từng tháng/tuần/ngày và đo lường tỷ trọng sức ảnh hưởng của từng bưu cục
                </p>
              </div>
            </div>

            {/* Chế độ xem đồ thị (Khối lượng ca / % Sức ảnh hưởng chuẩn hóa 100%) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-750 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setMatrixViewMode('volume')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  matrixViewMode === 'volume'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Khối Lượng (Ca Nghỉ)
              </button>
              <button
                type="button"
                onClick={() => setMatrixViewMode('impact')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  matrixViewMode === 'impact'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                % Sức Ảnh Hưởng (100%)
              </button>
            </div>
          </div>

          {/* Dòng điều khiển: Tick Chu Kỳ & Tick Bưu Cục */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* 1. Tick Chu kỳ: Ngày / Tuần / Tháng */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Chu Kỳ:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-750 p-0.5 rounded-lg font-semibold text-[11px]">
                <button
                  type="button"
                  onClick={() => setMatrixGranularity('month')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    matrixGranularity === 'month'
                      ? 'bg-orange-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Theo Tháng</span>
                  <span className="text-[9.5px] opacity-80 font-mono">(10T)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixGranularity('week')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    matrixGranularity === 'week'
                      ? 'bg-orange-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Theo Tuần</span>
                  <span className="text-[9.5px] opacity-80 font-mono">(33W)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixGranularity('day')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    matrixGranularity === 'day'
                      ? 'bg-orange-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Theo Ngày</span>
                  <span className="text-[9.5px] opacity-80 font-mono">(60D)</span>
                </button>
              </div>
            </div>

            {/* 2. Tick Bưu Cục */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-orange-500" />
                Tick Bưu Cục:
              </span>
              
              <button
                type="button"
                onClick={toggleAllMatrixPos}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                  matrixSelectedPos.length === OFFICIAL_POST_OFFICES.length
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                {matrixSelectedPos.length === OFFICIAL_POST_OFFICES.length ? 'Tất Cả 5 BC' : 'Chọn Hết'}
              </button>

              {OFFICIAL_POST_OFFICES.map(po => {
                const isChecked = matrixSelectedPos.includes(po);
                const short = po.replace('(LAN) ', '');
                return (
                  <button
                    key={po}
                    type="button"
                    onClick={() => toggleMatrixPo(po)}
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isChecked
                        ? 'bg-white dark:bg-slate-750 border-orange-400 text-slate-900 dark:text-white ring-1 ring-orange-400/40 shadow-2xs'
                        : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span 
                      className={`w-2 h-2 rounded-full ${isChecked ? '' : 'opacity-30'}`}
                      style={{ backgroundColor: PO_COLORS[po] }}
                    />
                    <span>{short}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SONG SONG: BẢNG KÊ THỐNG KÊ (TRÁI) // ĐỒ THỊ MA TRẬN SỨC ẢNH HƯỞNG (PHẢI) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* CỘT TRÁI: BẢNG THỐNG KÊ NGHỈ VIỆC THEO THỜI GIAN CỦA CÁC BƯU CỤC */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                    BẢNG THỐNG KÊ NGHỈ VIỆC {matrixGranularity === 'month' ? 'THEO THÁNG' : (matrixGranularity === 'week' ? 'THEO TUẦN' : 'THEO NGÀY')}
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Click hàng để xem chi tiết
                </span>
              </div>

              <div className="overflow-x-auto max-h-[380px] overflow-y-auto mt-2 pr-0.5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/90 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px] sticky top-0 z-10">
                    <tr>
                      <th className="p-2 w-[18%]">Chu Kỳ</th>
                      {OFFICIAL_POST_OFFICES.map(po => {
                        if (!matrixSelectedPos.includes(po)) return null;
                        const short = po.replace('(LAN) ', '');
                        return (
                          <th key={po} className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PO_COLORS[po] }} />
                              <span>{short}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-2 text-right w-[14%]">Tổng Kỳ</th>
                      <th className="p-2 text-center w-[16%]">Điểm Nóng</th>
                      <th className="p-2 text-right w-[14%]">% Toàn Khu Vực</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                    {timeMatrixRows.map((row) => {
                      const isExpanded = matrixExpandedPeriod === row.period;
                      return (
                        <tr
                          key={row.period}
                          onClick={() => setMatrixExpandedPeriod(isExpanded ? null : row.period)}
                          className={`hover:bg-indigo-50/50 dark:hover:bg-slate-750/70 transition-all cursor-pointer ${
                            isExpanded ? 'bg-indigo-50/80 dark:bg-indigo-950/40 font-semibold' : ''
                          }`}
                        >
                          <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">
                            {row.label}
                          </td>
                          {OFFICIAL_POST_OFFICES.map(po => {
                            if (!matrixSelectedPos.includes(po)) return null;
                            const count = row.poCounts[po] || 0;
                            const isHot = count > 0 && count === row.topPoCount;
                            return (
                              <td key={po} className="p-2 text-right font-mono">
                                {count > 0 ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    isHot 
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black' 
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                            {row.selectedTotal}
                          </td>
                          <td className="p-2 text-center">
                            {row.topPo !== '-' ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 truncate max-w-[100px] inline-block">
                                {row.topPo}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {row.impactShareGrand}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100/95 dark:bg-slate-750 font-black text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-600 sticky bottom-0 z-10 text-[11px]">
                    <tr>
                      <td className="p-2 uppercase">TỔNG CỘNG</td>
                      {OFFICIAL_POST_OFFICES.map(po => {
                        if (!matrixSelectedPos.includes(po)) return null;
                        const sum = timeMatrixRows.reduce((s, r) => s + (r.poCounts[po] || 0), 0);
                        return (
                          <td key={po} className="p-2 text-right font-mono font-bold">
                            {sum}
                          </td>
                        );
                      })}
                      <td className="p-2 text-right text-rose-600 font-mono font-black text-xs">
                        {timeMatrixRows.reduce((s, r) => s + r.selectedTotal, 0)}
                      </td>
                      <td className="p-2 text-center text-slate-400">-</td>
                      <td className="p-2 text-right font-mono text-indigo-600">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Accordion mở rộng chi tiết các bưu tá nghỉ việc trong kỳ đang chọn */}
              {matrixExpandedPeriod && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Chi tiết {timeMatrixRows.find(r => r.period === matrixExpandedPeriod)?.label} ({timeMatrixRows.find(r => r.period === matrixExpandedPeriod)?.selectedTotal || 0} ca nghỉ đang chọn)
                    </span>
                    <button
                      type="button"
                      onClick={() => setMatrixExpandedPeriod(null)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {timeMatrixRows.find(r => r.period === matrixExpandedPeriod)?.items
                      .filter(p => matrixSelectedPos.includes(p.buuCuc))
                      .map(p => (
                        <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                          <div>
                            <strong className="text-slate-900 dark:text-white">{p.ten}</strong>
                            <span className="text-slate-400 font-mono ml-1.5">({p.id})</span>
                            <span className="text-slate-500 ml-1.5">&bull; {p.buuCuc}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono">{p.nhomThamNien.split(':')[0]}</span>
                            <span className="font-mono text-indigo-600 font-bold">{p.soNgayLam}d</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400 flex items-center justify-between">
              <span>Đang tick chọn: <strong>{matrixSelectedPos.length}/5 bưu cục</strong></span>
              <span>Tổng số mốc thời gian: <strong>{timeMatrixRows.length} {matrixGranularity === 'month' ? 'tháng' : (matrixGranularity === 'week' ? 'tuần' : 'ngày')}</strong></span>
            </div>
          </div>

          {/* CỘT PHẢI: ĐỒ THỊ MA TRẬN SỨC ẢNH HƯỞNG & ĐÁNH GIÁ TÍCH LŨY TOÀN KHU VỰC */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  ĐỒ THỊ MA TRẬN SỨC ẢNH HƯỞNG 5 BƯU CỤC
                </h4>
                <span className="text-[10px] text-slate-400">
                  {matrixViewMode === 'volume' ? 'Cột xếp chồng khối lượng ca nghỉ' : 'Cột chuẩn hóa 100% tỷ trọng sức ảnh hưởng'}
                </span>
              </div>

              {/* Đồ thị Recharts Stacked Bar */}
              <div className="h-60 sm:h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeMatrixChartData} margin={{ top: 10, right: 15, bottom: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                    <YAxis 
                      unit={matrixViewMode === 'impact' ? '%' : ''} 
                      domain={matrixViewMode === 'impact' ? [0, 100] : ['auto', 'auto']}
                      tick={{ fontSize: 10 }} 
                    />
                    <Tooltip 
                      formatter={(val, name) => [
                        matrixViewMode === 'impact' ? `${val}%` : `${val} ca`,
                        name
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) return payload[0].payload.fullName || label;
                        return label;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
                    {OFFICIAL_POST_OFFICES.map(po => {
                      if (!matrixSelectedPos.includes(po)) return null;
                      const short = po.replace('(LAN) ', '');
                      return (
                        <Bar 
                          key={po} 
                          dataKey={short} 
                          stackId="impactMatrixStack" 
                          fill={PO_COLORS[po] || '#94A3B8'} 
                          radius={matrixViewMode === 'impact' ? [0, 0, 0, 0] : [2, 2, 0, 0]} 
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BẢNG ĐÁNH GIÁ SỨC ẢNH HƯỞNG TÍCH LŨY TOÀN KHU VỰC (CUMULATIVE AREA IMPACT) */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1 text-orange-600">
                  <Layers className="w-3.5 h-3.5" />
                  Xếp Hạng Sức Ảnh Hưởng Toàn Khu Vực (81 Ca Nghỉ):
                </span>
                <span className="text-[10px] text-slate-400">
                  Tỷ trọng % so với tổng thể khu vực
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                {cumulativePoImpact.map(item => (
                  <div 
                    key={item.buuCuc} 
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-750/70 space-y-0.5 text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                        {item.shortName}
                      </span>
                    </div>
                    <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                      {item.count} <span className="text-[9.5px] font-normal text-slate-400">ca</span>
                    </div>
                    <div className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {item.share}%
                    </div>
                    <div className={`text-[8.5px] font-bold px-1 py-0.2 rounded border truncate ${item.badgeColor}`}>
                      {item.level.split('(')[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* =========================================================================
          KHỐI 2: BẢNG KÊ TỔNG QUAN BÊN TRÁI & SONG SONG BÊN PHẢI ĐỒ THỊ MA TRẬN 5 BƯU CỤC
          ========================================================================= */}
      <div id="section-overview-po" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch scroll-mt-28">
        
        {/* BÊN TRÁI: BẢNG KÊ TỔNG QUAN 5 BƯU CỤC */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  BẢNG KÊ TỔNG QUAN 5 BƯU CỤC LONG AN
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Click hàng để lọc
              </span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 w-[30%]">Bưu Cục</th>
                    <th className="p-2 text-right w-[14%]">Tổng Nghỉ</th>
                    <th className="p-2 text-right w-[14%]">Tỷ Trọng</th>
                    <th className="p-2 text-right w-[14%]">&lt;1T (G01)</th>
                    <th className="p-2 text-right w-[14%]">&lt;3 Tháng</th>
                    <th className="p-2 text-right w-[14%]">Vi Phạm COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {postOfficeMatrix.map((item) => {
                    const isSelected = selectedPostOffice === item.buuCuc;
                    return (
                      <tr
                        key={item.buuCuc}
                        onClick={() => {
                          setSelectedPostOffice(isSelected ? 'all' : item.buuCuc);
                          setCurrentPage(1);
                        }}
                        className={`hover:bg-orange-50/60 dark:hover:bg-slate-750/70 transition-all cursor-pointer ${
                          isSelected ? 'bg-orange-50/90 dark:bg-orange-950/40 font-semibold' : ''
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: PO_COLORS[item.buuCuc] || '#94A3B8' }} 
                            />
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {item.buuCuc}
                            </span>
                            {isSelected && (
                              <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-orange-600 text-white shrink-0">
                                Đang chọn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right font-black text-rose-600 dark:text-rose-400 font-mono">
                          {item.total}
                        </td>
                        <td className="p-2 text-right font-semibold font-mono text-slate-600 dark:text-slate-300">
                          {item.share}%
                        </td>
                        <td className="p-2 text-right font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {item.g01} ca
                        </td>
                        <td className="p-2 text-right font-mono">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.under3M}</span>
                          <span className="text-[10px] text-slate-400 ml-0.5">({item.under3MRate}%)</span>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {item.cod > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                              {item.cod} ca
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100/90 dark:bg-slate-750 font-black text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-600">
                  <tr>
                    <td className="p-2 uppercase text-[11px]">TỔNG TOÀN KHU VỰC</td>
                    <td className="p-2 text-right text-rose-600 font-mono text-xs">{metrics.total}</td>
                    <td className="p-2 text-right font-mono text-[11px]">100%</td>
                    <td className="p-2 text-right text-amber-600 font-mono text-[11px]">{metrics.g01Count} ca</td>
                    <td className="p-2 text-right font-mono text-[11px]">{metrics.under3MCount} ca ({metrics.under3MRate}%)</td>
                    <td className="p-2 text-right text-red-600 font-mono text-[11px]">{metrics.codViolations} ca</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400 flex items-center justify-between">
            <span>Bình quân ngày làm: <strong>{metrics.avgDaysWorked} ngày</strong></span>
            <span>Sản lượng TB: <strong>{metrics.avgVol} đơn/ngày</strong></span>
          </div>
        </div>

        {/* BÊN PHẢI: ĐỒ THỊ MA TRẬN TOÀN KHU VỰC */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
            <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              ĐỒ THỊ MA TRẬN 5 BƯU CỤC KHU VỰC
            </h4>
            <span className="text-[10px] text-slate-400">
              Cột: Tổng nghỉ &bull; Đường: % Nghỉ sớm
            </span>
          </div>

          <div className="h-64 sm:h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={poChartData} margin={{ top: 10, right: 15, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fontWeight: 600 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10.5 }} />
                <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 10.5 }} domain={[0, 100]} />
                <Tooltip 
                  formatter={(val, name) => [
                    name === '% Nghỉ Sớm' ? `${val}%` : `${val} ca`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '6px' }} />
                <Bar yAxisId="left" dataKey="Tổng Nghỉ" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar yAxisId="left" dataKey="Nghỉ Sớm <3T" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="% Nghỉ Sớm" stroke="#6366F1" strokeWidth={2.2} dot={{ r: 3.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            * Phước Lý &amp; Rạch Kiến là 2 bưu cục có tỷ trọng nghỉ cao nhất toàn khu vực.
          </div>
        </div>

      </div>

      {/* =========================================================================
          KHỐI 2: BẢNG KÊ NHÓM THÂM NIÊN BÊN TRÁI & SONG SONG BÊN PHẢI ĐỒ THỊ MA TRẬN
          ========================================================================= */}
      <div id="section-tenure" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch scroll-mt-28">
        
        {/* BÊN TRÁI: BẢNG KÊ 10 NHÓM THÂM NIÊN (G01 - G10) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  BẢNG KÊ 10 NHÓM THÂM NIÊN (G01 - G10)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Click nhóm để xem chi tiết
              </span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 w-[34%]">Nhóm Thâm Niên</th>
                    <th className="p-2 text-right w-[15%]">Số Ca Nghỉ</th>
                    <th className="p-2 text-right w-[15%]">Tỷ Trọng</th>
                    <th className="p-2 text-right w-[18%]">Ngày Làm TB</th>
                    <th className="p-2 text-right w-[18%]">Lương TB/Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {tenureSummary.map((t) => {
                    const isExpanded = expandedTenureGroup === t.tenure;
                    const isHigh = t.shortCode === 'G01' || t.shortCode === 'G02';

                    return (
                      <tr
                        key={t.tenure}
                        onClick={() => setExpandedTenureGroup(isExpanded ? null : t.tenure)}
                        className={`hover:bg-orange-50/60 dark:hover:bg-slate-750/70 transition-all cursor-pointer ${
                          isExpanded ? 'bg-orange-50/90 dark:bg-orange-950/40 font-semibold' : ''
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className={`w-4 h-4 rounded text-[9.5px] font-black text-white flex items-center justify-center shrink-0 ${
                                isHigh ? 'bg-rose-600' : 'bg-slate-700'
                              }`}
                            >
                              {t.shortCode.replace('G', '')}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {t.tenure}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-right font-black text-rose-600 dark:text-rose-400 font-mono">
                          {t.count} ca
                        </td>
                        <td className="p-2 text-right font-semibold font-mono text-slate-600 dark:text-slate-300">
                          {t.share}%
                        </td>
                        <td className="p-2 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {t.avgDays} ngày
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-600">
                          {t.avgSalary.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Khối hiển thị chi tiết nhóm thâm niên đang được mở */}
            {expandedTenureGroup && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-orange-200 dark:border-orange-800/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-orange-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Chi tiết nhóm: {expandedTenureGroup} ({tenureSummary.find(t => t.tenure === expandedTenureGroup)?.count || 0} nhân sự)
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedTenureGroup(null)}
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    Đóng
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {tenureSummary.find(t => t.tenure === expandedTenureGroup)?.items.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <div>
                        <strong className="text-slate-900 dark:text-white">{p.ten}</strong>
                        <span className="text-slate-400 font-mono ml-1.5">({p.id})</span>
                        <span className="text-slate-500 ml-1.5">&bull; {p.buuCuc}</span>
                      </div>
                      <div className="font-mono text-indigo-600 font-bold">
                        {p.soNgayLam} ngày
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            * Nhóm G01 + G02 chiếm tới {metrics.under3MRate}% tổng ca nghỉ toàn khu vực.
          </div>
        </div>

        {/* BÊN PHẢI: ĐỒ THỊ MA TRẬN THÂM NIÊN (G01 - G10) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
            <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              ĐỒ THỊ MA TRẬN PHÂN BỔ THÂM NIÊN (G01 - G10)
            </h4>
            <span className="text-[10px] text-slate-400">
              Phát hiện điểm đứt gãy giữ chân bưu tá
            </span>
          </div>

          <div className="h-64 sm:h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenureChartData} margin={{ top: 10, right: 15, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10.5 }} />
                <Tooltip 
                  formatter={(val, _name, props) => [
                    `${val} nhân sự`,
                    props.payload.fullName
                  ]}
                />
                <Bar dataKey="Số Ca Nghỉ" radius={[4, 4, 0, 0]} barSize={22}>
                  {tenureChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            * Cột đỏ (G01) thể hiện số lượng nghỉ việc cao nhất ngay trong 30 ngày đầu công tác.
          </div>
        </div>

      </div>

      {/* =========================================================================
          KHỐI 3: BẢNG KÊ NHÓM LÝ DO NGHỈ BÊN TRÁI & SONG SONG BÊN PHẢI ĐỒ THỊ MA TRẬN
          ========================================================================= */}
      <div id="section-reasons" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch scroll-mt-28">
        
        {/* BÊN TRÁI: BẢNG KÊ 5 NHÓM LÝ DO THÔI VIỆC */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  BẢNG KÊ 5 NHÓM LÝ DO THÔI VIỆC
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Click nhóm để lọc
              </span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 w-[34%]">Nhóm Lý Do</th>
                    <th className="p-2 text-right w-[15%]">Số Ca Nghỉ</th>
                    <th className="p-2 text-right w-[15%]">Tỷ Trọng</th>
                    <th className="p-2 text-right w-[18%]">Ngày Làm TB</th>
                    <th className="p-2 w-[18%]">Điểm Nóng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {reasonSummary.map((item) => {
                    const isSelected = selectedReasonGroup === item.groupName;
                    return (
                      <tr
                        key={item.groupName}
                        onClick={() => {
                          setSelectedReasonGroup(isSelected ? 'all' : item.groupName);
                          setCurrentPage(1);
                        }}
                        className={`hover:bg-orange-50/60 dark:hover:bg-slate-750/70 transition-all cursor-pointer ${
                          isSelected ? 'bg-orange-50/90 dark:bg-orange-950/40 font-semibold' : ''
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {item.groupName}
                            </span>
                            {isSelected && (
                              <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-orange-600 text-white shrink-0">
                                Đang chọn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right font-black text-rose-600 dark:text-rose-400 font-mono">
                          {item.count} ca
                        </td>
                        <td className="p-2 text-right font-semibold font-mono text-slate-600 dark:text-slate-300">
                          {item.share}%
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {item.avgDays} ngày
                        </td>
                        <td className="p-2 text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                          {item.topPo}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            * Nhóm "Vi phạm kỷ luật &amp; COD" chiếm 24.7% (20 ca) cần theo dõi chặt chẽ dòng tiền COD.
          </div>
        </div>

        {/* BÊN PHẢI: ĐỒ THỊ MA TRẬN CƠ CẤU LÝ DO */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
            <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieChartIcon className="w-4 h-4 text-emerald-500" />
              ĐỒ THỊ MA TRẬN CƠ CẤU LÝ DO NGHỈ VIỆC
            </h4>
            <span className="text-[10px] text-slate-400">
              Biểu đồ phân bổ tỷ trọng %
            </span>
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
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {reasonChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} ca (${((Number(val)/metrics.total)*100).toFixed(1)}%)`, name]} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute text-center pointer-events-none">
              <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Tổng Nghỉ</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block font-mono">
                {metrics.total}
              </span>
              <span className="text-[9px] text-rose-600 font-bold block">nhân sự</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10.5px] text-slate-400">
            * Tỷ lệ nghỉ do "Không phù hợp" và "Vi phạm COD" chiếm đa số nguyên nhân thôi việc.
          </div>
        </div>

      </div>

      {/* =========================================================================
          KHỐI 4: BẢNG KÊ CHI TIẾT 100% NHÂN SỰ NGHỈ VIỆC
          ========================================================================= */}
      <div id="section-detail-table" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4 sm:p-5 space-y-3.5 scroll-mt-28">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">
              BẢNG KÊ CHI TIẾT NHÂN SỰ NGHỈ VIỆC ({filteredList.length} Bản Ghi)
            </h3>
            {filteredList.length !== rawList.length && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Đang lọc {filteredList.length}/{rawList.length}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            Hiển thị ngày vào, ngày nghỉ, số ngày làm cụ thể, sản lượng &amp; mức lương TB
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
              <tr>
                <th className="p-2.5 text-center w-[4%]">STT</th>
                <th className="p-2.5 w-[8%]">Mã NV</th>
                <th className="p-2.5 w-[14%]">Họ và Tên</th>
                <th className="p-2.5 w-[13%]">Bưu Cục</th>
                <th className="p-2.5 w-[10%]">Thâm Niên</th>
                <th className="p-2.5 text-center w-[9%]">Ngày Vào</th>
                <th className="p-2.5 text-center w-[9%]">Ngày Nghỉ</th>
                <th className="p-2.5 text-right w-[9%]">Số Ngày Làm</th>
                <th className="p-2.5 text-right w-[8%]">Sản Lượng TB</th>
                <th className="p-2.5 text-right w-[9%]">Mức Lương TB</th>
                <th className="p-2.5 w-[16%]">Lý Do Nghỉ Việc</th>
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

        {/* Pagination */}
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
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-750 font-bold"
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
                      : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-750 font-bold"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          KHỐI 5: "NHẬN ĐỊNH ĐIỀU HÀNH BIẾN ĐỘNG NHÂN SỰ TOÀN KHU VỰC LONG AN" (Ở VỊ TRÍ CUỐI CÙNG!)
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

    </div>
  );
}
