import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  Clock, 
  Layers, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Search
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import type { GtcPostOfficeRecord } from '../types/dashboard';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { IndividualFilterDropdown } from '../components/common/IndividualFilterDropdown';
import { 
  sortDatesDesc, 
  extractMonths, 
  extractWeeks,
  toTimestamp
} from '../utils/dateEngine';
import { exportToCSV } from '../services/excelExportService';

export const GtcPostOfficeTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();
  const comparisonTableRef = useRef<HTMLDivElement>(null);
  const recentDaysTableRef = useRef<HTMLDivElement>(null);
  const detailedTableRef = useRef<HTMLDivElement>(null);

  // Active highlighted KPI metric from top tabs
  const [activeKpi, setActiveKpi] = useState<string | null>(null);

  const handleKpiClick = (kpiKey: string) => {
    setActiveKpi(kpiKey);
    if (detailedTableRef.current) {
      detailedTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Global Quick Time Filter State (Tháng, Tuần)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('all');

  // Global Independent Filter state (Đồng bộ với bưu cục được chọn toàn hệ thống)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    buuCuc: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : [],
    ngay: [],
    loaiHang: [],
    thu: []
  }));

  useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterValues(prev => ({
        ...prev,
        buuCuc: [selectedBuuCucGlobal]
      }));
    }
  }, [selectedBuuCucGlobal]);

  // State sắp xếp cho Bảng Toàn Bộ Nhân Viên Khu Vực (Luôn ưu tiên nhóm theo Bưu Cục)
  const [empSortField, setEmpSortField] = useState<string>('buuCuc');
  const [empSortDirection, setEmpSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSortEmp = (field: string) => {
    if (empSortField === field) {
      setEmpSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setEmpSortField(field);
      setEmpSortDirection('desc');
    }
  };

  // State bộ lọc riêng cho Bảng Chi Tiết GTC Bưu Cục (Bưu cục, Loại Hàng, Thời gian)
  const [dtFilterBuuCuc, setDtFilterBuuCuc] = useState<string>('all');
  const [dtFilterLoaiHang, setDtFilterLoaiHang] = useState<string>('all');
  const [dtFilterMonth, setDtFilterMonth] = useState<string>('all');
  const [dtFilterWeek, setDtFilterWeek] = useState<string>('all');
  const [dtFilterDate, setDtFilterDate] = useState<string>('all');

  const handleResetDetailedFilter = () => {
    setDtFilterBuuCuc('all');
    setDtFilterLoaiHang('all');
    setDtFilterMonth('all');
    setDtFilterWeek('all');
    setDtFilterDate('all');
  };

  // 1. CỘT NGÀY ĐƯỢC LẤY DỮ LIỆU THEO CỘT "J" TRONG LINK DATA GỐC Ở SHEET "GTC NHÂN VIÊN"
  const allUniqueDatesDesc = useMemo(() => {
    const datesFromNv = dataset.gtcNhanVien.map(r => r.ngay).filter(Boolean);
    const unique = [...new Set(datesFromNv)];
    return sortDatesDesc(unique); // Sắp xếp từ ngày gần nhất đến xa nhất
  }, [dataset.gtcNhanVien]);

  const availableMonths = useMemo(() => {
    return extractMonths(allUniqueDatesDesc);
  }, [allUniqueDatesDesc]);

  const availableWeeks = useMemo(() => {
    return extractWeeks(allUniqueDatesDesc);
  }, [allUniqueDatesDesc]);

  // Handle Global Quick Month Filter
  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonthKey(monthKey);
    setSelectedWeekKey('all');

    if (monthKey === 'all') {
      setFilterValues(prev => ({ ...prev, ngay: [] }));
    } else {
      const targetMonth = availableMonths.find(m => m.key === monthKey);
      if (targetMonth) {
        setFilterValues(prev => ({ ...prev, ngay: targetMonth.dates }));
      }
    }
  };

  // Handle Global Quick Week Filter
  const handleSelectWeek = (weekKey: string) => {
    setSelectedWeekKey(weekKey);

    if (weekKey === 'all') {
      if (selectedMonthKey !== 'all') {
        const targetMonth = availableMonths.find(m => m.key === selectedMonthKey);
        setFilterValues(prev => ({ ...prev, ngay: targetMonth ? targetMonth.dates : [] }));
      } else {
        setFilterValues(prev => ({ ...prev, ngay: [] }));
      }
    } else {
      const targetWeek = availableWeeks.find(w => w.key === weekKey);
      if (targetWeek) {
        setFilterValues(prev => ({ ...prev, ngay: targetWeek.dates }));
      }
    }
  };

  const handleResetAllFilters = () => {
    setSelectedMonthKey('all');
    setSelectedWeekKey('all');
    setFilterValues({ buuCuc: [], ngay: [], loaiHang: [], thu: [] });
  };

  const hasActiveFilters = Boolean(
    (filterValues.buuCuc && filterValues.buuCuc.length > 0) ||
    (filterValues.loaiHang && filterValues.loaiHang.length > 0) ||
    (filterValues.thu && filterValues.thu.length > 0) ||
    (filterValues.ngay && filterValues.ngay.length > 0) ||
    selectedMonthKey !== 'all' ||
    selectedWeekKey !== 'all'
  );

  // Filter options for IndependentFilter
  const buuCucOptions = useMemo(() => {
    return [...new Set(dataset.gtcBuuCuc.map(r => r.buuCuc))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.gtcBuuCuc]);

  const ngayOptions = useMemo(() => {
    return allUniqueDatesDesc.map(n => ({ label: n, value: n }));
  }, [allUniqueDatesDesc]);

  const loaiHangOptions = useMemo(() => {
    return [...new Set(dataset.gtcBuuCuc.map(r => r.loaiHang))].filter(Boolean).map(l => ({ label: l, value: l }));
  }, [dataset.gtcBuuCuc]);

  const thuOptions = useMemo(() => {
    const list = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    return list.map(t => ({ label: t, value: t }));
  }, []);

  // Apply global filters to GTC Bưu cục records
  const filteredGtcBc = useMemo(() => {
    return dataset.gtcBuuCuc.filter(r => {
      if (filterValues.buuCuc?.length && !filterValues.buuCuc.includes(r.buuCuc)) return false;
      if (filterValues.ngay?.length && !filterValues.ngay.includes(r.ngay)) return false;
      if (filterValues.loaiHang?.length && !filterValues.loaiHang.includes(r.loaiHang)) return false;
      if (filterValues.thu?.length && !filterValues.thu.includes(r.thu)) return false;
      return true;
    });
  }, [dataset.gtcBuuCuc, filterValues]);

  // Tab KPIs strictly according to SUM(GTC) / SUM(Volume)
  const tabKPIs = useMemo(() => {
    const totalVolume = filteredGtcBc.reduce((acc, r) => acc + (r.volume || 0), 0);
    const totalSldGTC = filteredGtcBc.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
    const totalSldGan = filteredGtcBc.reduce((acc, r) => acc + (r.sldGan || 0), 0);
    const totalTonDong = filteredGtcBc.reduce((acc, r) => acc + (r.tonDong || 0), 0);

    const gtcRate = totalVolume > 0 ? (totalSldGTC / totalVolume) * 100 : 0;
    const assignedRate = totalVolume > 0 ? (totalSldGan / totalVolume) * 100 : 0;

    const weightedLt = filteredGtcBc.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
    const avgLeadtime = totalVolume > 0 ? weightedLt / totalVolume : 0;

    return {
      totalVolume,
      totalSldGTC,
      totalSldGan,
      gtcRate,
      assignedRate,
      avgLeadtime,
      totalTonDong
    };
  }, [filteredGtcBc]);

  // =========================================================================
  // BẢNG 1: "SO SÁNH SẢN LƯỢNG VOLUME VÀ %GTC THEO BƯU CỤC" (CÓ BỘ LỌC RIÊNG BƯU CỤC & NGÀY TÙY CHỌN)
  // =========================================================================
  const [compFilterBuuCuc, setCompFilterBuuCuc] = useState<string>('all');
  const [compSelectedDates, setCompSelectedDates] = useState<string[]>([]);
  const [isCompDatePickerOpen, setIsCompDatePickerOpen] = useState<boolean>(false);
  const [compExpandedPoKey, setCompExpandedPoKey] = useState<string | null>(null);
  const [isCompGrandTotalExpanded, setIsCompGrandTotalExpanded] = useState<boolean>(false);
  const compDatePickerRef = useRef<HTMLDivElement>(null);

  // Nhấn bất kỳ nơi nào để thu gọn danh sách ngày dạng sổ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compDatePickerRef.current && !compDatePickerRef.current.contains(event.target as Node)) {
        setIsCompDatePickerOpen(false);
      }
    };
    if (isCompDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCompDatePickerOpen]);

  // Toggle single date in local comparison table filter
  const toggleCompDate = (date: string) => {
    setCompSelectedDates(prev => {
      if (prev.includes(date)) return prev.filter(d => d !== date);
      return [...prev, date];
    });
  };

  // Filtered dataset strictly for the Post Office comparison table
  const compFilteredGtcBc = useMemo(() => {
    return dataset.gtcBuuCuc.filter(r => {
      if (compFilterBuuCuc !== 'all' && r.buuCuc !== compFilterBuuCuc) return false;
      if (compSelectedDates.length > 0 && !compSelectedDates.includes(r.ngay)) return false;
      return true;
    });
  }, [dataset.gtcBuuCuc, compFilterBuuCuc, compSelectedDates]);

  const compFilteredGtcNv = useMemo(() => {
    return dataset.gtcNhanVien.filter(r => {
      if (compFilterBuuCuc !== 'all' && r.buuCuc !== compFilterBuuCuc) return false;
      if (compSelectedDates.length > 0 && !compSelectedDates.includes(r.ngay)) return false;
      return true;
    });
  }, [dataset.gtcNhanVien, compFilterBuuCuc, compSelectedDates]);

  // Summary per Post Office
  const poSummaries = useMemo(() => {
    const map: Record<string, {
      buuCuc: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
      tonDong: number;
      weightedLeadtime: number;
      weightedReturnUnits: number;
    }> = {};

    const allOffices = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    allOffices.forEach(b => {
      if (compFilterBuuCuc === 'all' || compFilterBuuCuc === b) {
        map[b] = {
          buuCuc: b,
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0,
          weightedLeadtime: 0,
          weightedReturnUnits: 0
        };
      }
    });

    compFilteredGtcBc.forEach(r => {
      if (!map[r.buuCuc]) {
        map[r.buuCuc] = {
          buuCuc: r.buuCuc,
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0,
          weightedLeadtime: 0,
          weightedReturnUnits: 0
        };
      }
      map[r.buuCuc].volume += r.volume || 0;
      map[r.buuCuc].sldGan += r.sldGan || 0;
      map[r.buuCuc].sldGTC += r.sldGTC || 0;
      map[r.buuCuc].tonDong += r.tonDong || 0;
      map[r.buuCuc].weightedLeadtime += (r.leadtime || 0) * (r.volume || 0);

      const returnPct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
      map[r.buuCuc].weightedReturnUnits += (r.volume || 0) * returnPct;
    });

    const nvMapByPo: Record<string, Set<string>> = {};
    compFilteredGtcNv.forEach(r => {
      if (!nvMapByPo[r.buuCuc]) nvMapByPo[r.buuCuc] = new Set();
      if (r.maNV) nvMapByPo[r.buuCuc].add(r.maNV);
    });

    return Object.values(map).map(item => {
      const gtcRate = item.volume > 0 ? (item.sldGTC / item.volume) * 100 : 0;
      const assignedRate = item.volume > 0 ? (item.sldGan / item.volume) * 100 : 0;
      const leadtime = item.volume > 0 ? item.weightedLeadtime / item.volume : 0;
      const returnRate = item.volume > 0 ? (item.weightedReturnUnits / item.volume) * 100 : 0;
      const staffCount = nvMapByPo[item.buuCuc]?.size || 0;
      const productivity = staffCount > 0 ? Math.round(item.volume / staffCount) : 0;

      return {
        ...item,
        gtcRate,
        assignedRate,
        leadtime,
        returnRate,
        staffCount,
        productivity
      };
    }).sort((a, b) => b.volume - a.volume);
  }, [compFilteredGtcBc, compFilteredGtcNv, compFilterBuuCuc]);

  // Grand Total for Post Office Table
  const grandTotal = useMemo(() => {
    const volume = poSummaries.reduce((acc, r) => acc + r.volume, 0);
    const sldGan = poSummaries.reduce((acc, r) => acc + r.sldGan, 0);
    const sldGTC = poSummaries.reduce((acc, r) => acc + r.sldGTC, 0);
    const tonDong = poSummaries.reduce((acc, r) => acc + r.tonDong, 0);
    const gtcRate = volume > 0 ? (sldGTC / volume) * 100 : 0;
    const assignedRate = volume > 0 ? (sldGan / volume) * 100 : 0;
    const weightedLt = poSummaries.reduce((acc, r) => acc + r.leadtime * r.volume, 0);
    const leadtime = volume > 0 ? weightedLt / volume : 0;
    const weightedRet = poSummaries.reduce((acc, r) => acc + (r.returnRate / 100) * r.volume, 0);
    const returnRate = volume > 0 ? (weightedRet / volume) * 100 : 0;
    const staffCount = new Set(compFilteredGtcNv.map(r => r.maNV)).size;
    const productivity = staffCount > 0 ? Math.round(volume / staffCount) : 0;

    return {
      volume,
      sldGan,
      assignedRate,
      sldGTC,
      gtcRate,
      returnRate,
      leadtime,
      tonDong,
      staffCount,
      productivity
    };
  }, [poSummaries, compFilteredGtcNv]);

  // Helper to get employees for an office in the comparison table
  const getEmployeesForPoComp = (poName?: string) => {
    const list = poName
      ? compFilteredGtcNv.filter(r => r.buuCuc === poName)
      : compFilteredGtcNv;

    const map: Record<string, {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      tongDon: number;
      tongDonGTC: number;
      chuyenDi: number;
      tonDong: number;
      weightedLeadtime: number;
    }> = {};

    list.forEach(r => {
      const key = r.maNV || r.tenNV;
      if (!map[key]) {
        map[key] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: r.buuCuc,
          tongDon: 0,
          tongDonGTC: 0,
          chuyenDi: 0,
          tonDong: 0,
          weightedLeadtime: 0
        };
      }
      map[key].tongDon += r.tongDon || 0;
      map[key].tongDonGTC += r.tongDonGTC || 0;
      map[key].chuyenDi += r.chuyenDi || 0;
      map[key].tonDong += r.tonDong || 0;
      map[key].weightedLeadtime += (r.leadtime || 0) * (r.tongDon || 0);
    });

    return Object.values(map).map(e => ({
      ...e,
      gtcRate: e.tongDon > 0 ? (e.tongDonGTC / e.tongDon) * 100 : 0,
      avgLeadtime: e.tongDon > 0 ? e.weightedLeadtime / e.tongDon : 0
    })).sort((a, b) => b.tongDon - a.tongDon);
  };

  const getSortedEmployeesForPoComp = (poName?: string) => {
    const raw = getEmployeesForPoComp(poName);
    return [...raw].sort((a: any, b: any) => {
      // 1. Luôn luôn nhóm và sắp xếp theo cùng Bưu cục trước
      const bcCmp = (a.buuCuc || '').localeCompare(b.buuCuc || '', 'vi', { numeric: true });
      if (bcCmp !== 0) {
        return empSortField === 'buuCuc' && empSortDirection === 'desc' ? -bcCmp : bcCmp;
      }

      // 2. Trong cùng bưu cục: sắp xếp theo trường phụ (mặc định Tổng Đơn giảm dần hoặc cột user chọn)
      const sortKey = empSortField === 'buuCuc' ? 'tongDon' : empSortField;
      const sortDir = empSortField === 'buuCuc' ? 'desc' : empSortDirection;

      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === 'string') {
        const cmp = (aVal || '').localeCompare(bVal || '', 'vi', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      aVal = aVal ?? 0;
      bVal = bVal ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  // Dữ liệu cho Bảng Chi Tiết GTC Bưu Cục theo bộ lọc riêng (Bưu cục, Loại Hàng, Thời gian)
  const detailedTableData = useMemo(() => {
    return dataset.gtcBuuCuc.filter(r => {
      if (dtFilterBuuCuc !== 'all' && r.buuCuc !== dtFilterBuuCuc) return false;
      if (dtFilterLoaiHang !== 'all' && r.loaiHang !== dtFilterLoaiHang) return false;
      if (dtFilterMonth !== 'all') {
        const targetMonth = availableMonths.find(m => m.key === dtFilterMonth);
        if (targetMonth && !targetMonth.dates.includes(r.ngay)) return false;
      }
      if (dtFilterWeek !== 'all') {
        const targetWeek = availableWeeks.find(w => w.key === dtFilterWeek);
        if (targetWeek && !targetWeek.dates.includes(r.ngay)) return false;
      }
      if (dtFilterDate !== 'all' && r.ngay !== dtFilterDate) return false;
      return true;
    });
  }, [dataset.gtcBuuCuc, dtFilterBuuCuc, dtFilterLoaiHang, dtFilterMonth, dtFilterWeek, dtFilterDate, availableMonths, availableWeeks]);

  // =========================================================================
  // BẢNG: "GIAO THÀNH CÔNG BƯU CỤC" (TỔNG HỢP SHEET GTC BƯU CỤC)
  // Các cột: Bưu cục, Ngày, Volume, SLĐ Gán, % Gán, SLĐ GTC, % GTC, Tồn Đọng
  // Lấy data từ dataset.gtcBuuCuc theo 5 bưu cục đang quản lý
  // Ngày: lọc từ ngày gần nhất đến ngày xa nhất (descending)
  // Volume = Tổng Volume (Hàng mới ca 1 + Hàng mới ca 2 + Hàng tồn)
  // SLĐ Gán = Tổng SLĐ Gán (Hàng mới ca 1 + Hàng mới ca 2 + Hàng tồn)
  // % Gán = (SLĐ Gán)/(Volume)
  // SLĐ GTC = Tổng SLĐ GTC (Hàng mới ca 1 + Hàng mới ca 2 + Hàng tồn)
  // % GTC = (SLĐ GTC)/(Volume)
  // Tồn đọng = (Volume)-(SLĐ GTC)
  // Cho phép xuất về Excel
  // =========================================================================
  const [gtcDeliveryFilterPo, setGtcDeliveryFilterPo] = useState<string>('all');
  const [gtcDeliveryFilterMonth, setGtcDeliveryFilterMonth] = useState<string>('all');
  const [gtcDeliverySearch, setGtcDeliverySearch] = useState<string>('');
  const [gtcDeliverySortField, setGtcDeliverySortField] = useState<string>('ngay');
  const [gtcDeliverySortDir, setGtcDeliverySortDir] = useState<'asc' | 'desc'>('desc');
  const [gtcDeliveryPage, setGtcDeliveryPage] = useState<number>(1);
  const [gtcDeliveryPageSize, setGtcDeliveryPageSize] = useState<number>(20);

  const gtcDeliveryDailyData = useMemo(() => {
    const MANAGED_POS = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    const map: Record<string, {
      buuCuc: string;
      ngay: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
    }> = {};

    dataset.gtcBuuCuc.forEach(r => {
      if (!r.buuCuc || !r.ngay) return;
      if (!MANAGED_POS.includes(r.buuCuc)) return;

      const key = `${r.buuCuc}__${r.ngay}`;
      if (!map[key]) {
        map[key] = {
          buuCuc: r.buuCuc,
          ngay: r.ngay,
          volume: 0,
          sldGan: 0,
          sldGTC: 0
        };
      }
      map[key].volume += r.volume || 0;
      map[key].sldGan += r.sldGan || 0;
      map[key].sldGTC += r.sldGTC || 0;
    });

    return Object.values(map).map(item => {
      const tiLeGan = item.volume > 0 ? (item.sldGan / item.volume) * 100 : 0;
      const tiLeGTC = item.volume > 0 ? (item.sldGTC / item.volume) * 100 : 0;
      const tonDong = item.volume - item.sldGTC; // strictly: (Volume) - (SLĐ GTC)
      return {
        id: `${item.buuCuc}__${item.ngay}`,
        buuCuc: item.buuCuc,
        ngay: item.ngay,
        volume: item.volume,
        sldGan: item.sldGan,
        tiLeGan,
        sldGTC: item.sldGTC,
        tiLeGTC,
        tonDong
      };
    });
  }, [dataset.gtcBuuCuc]);

  const filteredGtcDeliveryDaily = useMemo(() => {
    const MANAGED_POS = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    const result = gtcDeliveryDailyData.filter(item => {
      if (gtcDeliveryFilterPo !== 'all' && item.buuCuc !== gtcDeliveryFilterPo) return false;
      if (gtcDeliveryFilterMonth !== 'all') {
        const targetMonth = availableMonths.find(m => m.key === gtcDeliveryFilterMonth);
        if (targetMonth && !targetMonth.dates.includes(item.ngay)) return false;
      }
      if (gtcDeliverySearch.trim()) {
        const q = gtcDeliverySearch.trim().toLowerCase();
        const matchPo = item.buuCuc.toLowerCase().includes(q);
        const matchDate = item.ngay.includes(q);
        if (!matchPo && !matchDate) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (gtcDeliverySortField === 'ngay') {
        const timeDiff = toTimestamp(b.ngay) - toTimestamp(a.ngay);
        if (timeDiff !== 0) {
          return gtcDeliverySortDir === 'desc' ? timeDiff : -timeDiff;
        }
        return MANAGED_POS.indexOf(a.buuCuc) - MANAGED_POS.indexOf(b.buuCuc);
      } else if (gtcDeliverySortField === 'buuCuc') {
        const comp = a.buuCuc.localeCompare(b.buuCuc, 'vi');
        return gtcDeliverySortDir === 'asc' ? comp : -comp;
      } else {
        const valA = (a as any)[gtcDeliverySortField] ?? 0;
        const valB = (b as any)[gtcDeliverySortField] ?? 0;
        return gtcDeliverySortDir === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [gtcDeliveryDailyData, gtcDeliveryFilterPo, gtcDeliveryFilterMonth, gtcDeliverySearch, gtcDeliverySortField, gtcDeliverySortDir, availableMonths]);

  const gtcDeliverySummary = useMemo(() => {
    const totalVolume = filteredGtcDeliveryDaily.reduce((acc, r) => acc + r.volume, 0);
    const totalSldGan = filteredGtcDeliveryDaily.reduce((acc, r) => acc + r.sldGan, 0);
    const totalSldGTC = filteredGtcDeliveryDaily.reduce((acc, r) => acc + r.sldGTC, 0);
    const totalTonDong = totalVolume - totalSldGTC;
    const tiLeGan = totalVolume > 0 ? (totalSldGan / totalVolume) * 100 : 0;
    const tiLeGTC = totalVolume > 0 ? (totalSldGTC / totalVolume) * 100 : 0;

    return {
      totalVolume,
      totalSldGan,
      totalSldGTC,
      totalTonDong,
      tiLeGan,
      tiLeGTC,
      rowCount: filteredGtcDeliveryDaily.length
    };
  }, [filteredGtcDeliveryDaily]);

  const totalGtcDeliveryPages = gtcDeliveryPageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredGtcDeliveryDaily.length / gtcDeliveryPageSize));
  
  const paginatedGtcDeliveryDaily = useMemo(() => {
    if (gtcDeliveryPageSize === -1) return filteredGtcDeliveryDaily;
    const start = (gtcDeliveryPage - 1) * gtcDeliveryPageSize;
    return filteredGtcDeliveryDaily.slice(start, start + gtcDeliveryPageSize);
  }, [filteredGtcDeliveryDaily, gtcDeliveryPage, gtcDeliveryPageSize]);

  const handleSortGtcDelivery = (field: string) => {
    if (gtcDeliverySortField === field) {
      setGtcDeliverySortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setGtcDeliverySortField(field);
      setGtcDeliverySortDir(field === 'ngay' || field === 'buuCuc' ? 'asc' : 'desc');
    }
    setGtcDeliveryPage(1);
  };

  const handleExportGtcDeliveryExcel = () => {
    const headers = ['Bưu Cục', 'Ngày', 'Volume', 'SLĐ Gán', '% Gán', 'SLĐ GTC', '% GTC', 'Tồn Đọng'];
    const rows: (string | number)[][] = filteredGtcDeliveryDaily.map(r => [
      r.buuCuc,
      r.ngay,
      r.volume,
      r.sldGan,
      `${r.tiLeGan.toFixed(2)}%`,
      r.sldGTC,
      `${r.tiLeGTC.toFixed(2)}%`,
      r.tonDong
    ]);
    rows.push([
      'TỔNG CỘNG',
      `${filteredGtcDeliveryDaily.length} ngày-bưu cục`,
      gtcDeliverySummary.totalVolume,
      gtcDeliverySummary.totalSldGan,
      `${gtcDeliverySummary.tiLeGan.toFixed(2)}%`,
      gtcDeliverySummary.totalSldGTC,
      `${gtcDeliverySummary.tiLeGTC.toFixed(2)}%`,
      gtcDeliverySummary.totalTonDong
    ]);
    exportToCSV('giao_thanh_cong_buu_cuc_ghn', headers, rows);
  };

  // =========================================================================
  // BẢNG 2: "HIỂN THỊ 8 NGÀY GẦN NHẤT CHI TIẾT GÁN GIAO CỦA TỪNG BƯU CỤC" (BỘ LỌC RIÊNG TUẦN & THÁNG)
  // =========================================================================
  const [recentFilterMonth, setRecentFilterMonth] = useState<string>('all');
  const [recentFilterWeek, setRecentFilterWeek] = useState<string>('all');
  const [expandedRecentRowKey, setExpandedRecentRowKey] = useState<string | null>(null);

  // Determine dates for the 8-day section based on local filter
  const targetRecentDates = useMemo(() => {
    let dates = allUniqueDatesDesc;
    if (recentFilterWeek !== 'all') {
      const w = availableWeeks.find(x => x.key === recentFilterWeek);
      if (w) dates = w.dates;
    } else if (recentFilterMonth !== 'all') {
      const m = availableMonths.find(x => x.key === recentFilterMonth);
      if (m) dates = m.dates;
    }
    // Take the 8 most recent dates in the selected range
    return dates.slice(0, 8);
  }, [allUniqueDatesDesc, recentFilterMonth, recentFilterWeek, availableWeeks, availableMonths]);

  // Aggregate rows per (date, postOffice)
  const recentDaysRecords = useMemo(() => {
    const datesSet = new Set(targetRecentDates);
    const rows = dataset.gtcBuuCuc.filter(r => datesSet.has(r.ngay));

    const map: Record<string, {
      date: string;
      thu: string;
      buuCuc: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
      tonDong: number;
      weightedLeadtime: number;
    }> = {};

    rows.forEach(r => {
      const key = `${r.ngay}_${r.buuCuc}`;
      if (!map[key]) {
        map[key] = {
          date: r.ngay,
          thu: r.thu,
          buuCuc: r.buuCuc,
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0,
          weightedLeadtime: 0
        };
      }
      map[key].volume += r.volume || 0;
      map[key].sldGan += r.sldGan || 0;
      map[key].sldGTC += r.sldGTC || 0;
      map[key].tonDong += r.tonDong || 0;
      map[key].weightedLeadtime += (r.leadtime || 0) * (r.volume || 0);
    });

    return Object.values(map).map(item => {
      const gtcRate = item.volume > 0 ? (item.sldGTC / item.volume) * 100 : 0;
      const assignedRate = item.volume > 0 ? (item.sldGan / item.volume) * 100 : 0;
      const leadtime = item.volume > 0 ? item.weightedLeadtime / item.volume : 0;
      return {
        ...item,
        gtcRate,
        assignedRate,
        leadtime
      };
    }).sort((a, b) => {
      // Sort by date desc (first by date index in targetRecentDates)
      const dateA = targetRecentDates.indexOf(a.date);
      const dateB = targetRecentDates.indexOf(b.date);
      if (dateA !== dateB) return dateA - dateB;
      return b.volume - a.volume;
    });
  }, [dataset.gtcBuuCuc, targetRecentDates]);

  // Get employees for a specific date and post office
  const getStaffForDateAndPo = (date: string, poName: string) => {
    return dataset.gtcNhanVien
      .filter(r => r.ngay === date && r.buuCuc === poName)
      .map(r => ({
        maNV: r.maNV,
        tenNV: r.tenNV,
        tongDon: r.tongDon || 0,
        tongDonGTC: r.tongDonGTC || 0,
        gtcRate: r.tongDon > 0 ? ((r.tongDonGTC || 0) / r.tongDon) * 100 : 0,
        leadtime: r.leadtime || 0,
        chuyenDi: r.chuyenDi || 0,
        tonDong: r.tonDong || 0
      }))
      .sort((a, b) => b.tongDon - a.tongDon);
  };

  // =========================================================================
  // BẢNG 3: "SO SÁNH THEO TUẦN VÀ THÁNG CỦA TỪNG BƯU CỤC" (MỞ RỘNG CHI TIẾT)
  // =========================================================================
  const [poPeriodMode, setPoPeriodMode] = useState<'week' | 'month'>('week');
  const [poPeriodSelectedPo, setPoPeriodSelectedPo] = useState<string>('(LAN) Tầm Vu');
  const [expandedPoPeriodKey, setExpandedPoPeriodKey] = useState<string | null>(null);

  const poPeriodicMetrics = useMemo(() => {
    const periods = poPeriodMode === 'week' ? availableWeeks : availableMonths;
    const poRows = dataset.gtcBuuCuc.filter(r => r.buuCuc === poPeriodSelectedPo);

    return periods.map(p => {
      const datesSet = new Set(p.dates);
      const rows = poRows.filter(r => datesSet.has(r.ngay));

      const volume = rows.reduce((acc, r) => acc + (r.volume || 0), 0);
      const sldGan = rows.reduce((acc, r) => acc + (r.sldGan || 0), 0);
      const sldGTC = rows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
      const tonDong = rows.reduce((acc, r) => acc + (r.tonDong || 0), 0);
      const gtcRate = volume > 0 ? (sldGTC / volume) * 100 : 0;
      const assignedRate = volume > 0 ? (sldGan / volume) * 100 : 0;
      const weightedLt = rows.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
      const leadtime = volume > 0 ? weightedLt / volume : 0;

      return {
        key: p.key,
        label: p.label,
        dates: p.dates,
        dateRange: p.dates.length > 0 ? `${p.dates[p.dates.length - 1]} - ${p.dates[0]}` : '',
        volume,
        sldGan,
        assignedRate,
        sldGTC,
        gtcRate,
        leadtime,
        tonDong
      };
    });
  }, [dataset.gtcBuuCuc, poPeriodMode, poPeriodSelectedPo, availableWeeks, availableMonths]);

  // =========================================================================
  // CẢNH BÁO 1: NHÂN VIÊN PHÁT SINH >= 3 NGÀY KHÔNG CÓ GÁN GIAO TRONG TUẦN
  // =========================================================================
  const [alert1Po, setAlert1Po] = useState<string>('all');
  const [alert1WeekKey, setAlert1WeekKey] = useState<string>(availableWeeks[0]?.key || 'all');
  const [expandedAlert1NvKey, setExpandedAlert1NvKey] = useState<string | null>(null);

  const alert1Data = useMemo(() => {
    const targetWeek = availableWeeks.find(w => w.key === alert1WeekKey) || availableWeeks[0];
    if (!targetWeek) return [];

    const weekDates = targetWeek.dates; // All dates in that week
    const weekDatesSet = new Set(weekDates);

    // Filter staff in selected post office
    const staffRows = dataset.gtcNhanVien.filter(r => {
      if (alert1Po !== 'all' && r.buuCuc !== alert1Po) return false;
      return true;
    });

    // Group by employee
    const empMap: Record<string, {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      dailyRecords: Record<string, number>;
      totalAssigned: number;
      totalGtc: number;
    }> = {};

    staffRows.forEach(r => {
      const key = `${r.buuCuc}_${r.maNV}`;
      if (!empMap[key]) {
        empMap[key] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: r.buuCuc,
          dailyRecords: {},
          totalAssigned: 0,
          totalGtc: 0
        };
      }
      if (weekDatesSet.has(r.ngay)) {
        empMap[key].dailyRecords[r.ngay] = (empMap[key].dailyRecords[r.ngay] || 0) + (r.tongDon || 0);
        empMap[key].totalAssigned += r.tongDon || 0;
        empMap[key].totalGtc += r.tongDonGTC || 0;
      }
    });

    // An employee is flagged if in this week, they have >= 3 days with 0 assigned
    const flagged = Object.values(empMap).map(emp => {
      let zeroDaysCount = 0;
      const dayDetails: { date: string; assigned: number }[] = [];

      weekDates.forEach(d => {
        const assigned = empMap[`${emp.buuCuc}_${emp.maNV}`]?.dailyRecords[d] || 0;
        dayDetails.push({ date: d, assigned });
        if (assigned === 0) {
          zeroDaysCount++;
        }
      });

      return {
        ...emp,
        zeroDaysCount,
        dayDetails,
        activeDays: weekDates.length - zeroDaysCount
      };
    }).filter(emp => emp.zeroDaysCount >= 3 && emp.totalAssigned > 0); // only flag active staff who had >= 3 idle days

    return flagged.sort((a, b) => b.zeroDaysCount - a.zeroDaysCount);
  }, [dataset.gtcNhanVien, availableWeeks, alert1Po, alert1WeekKey]);

  // =========================================================================
  // CẢNH BÁO 2: TOP NHÂN VIÊN CÓ SLĐ GÁN < 30 ĐƠN VÀ SLĐ GTC < 20 ĐƠN
  // =========================================================================
  const [alert2Po, setAlert2Po] = useState<string>('all');
  const [alert2WeekKey, setAlert2WeekKey] = useState<string>(availableWeeks[0]?.key || 'all');
  const [expandedAlert2NvKey, setExpandedAlert2NvKey] = useState<string | null>(null);

  const alert2Data = useMemo(() => {
    const targetWeek = availableWeeks.find(w => w.key === alert2WeekKey) || availableWeeks[0];
    if (!targetWeek) return [];

    const weekDatesSet = new Set(targetWeek.dates);

    const staffRows = dataset.gtcNhanVien.filter(r => {
      if (alert2Po !== 'all' && r.buuCuc !== alert2Po) return false;
      return weekDatesSet.has(r.ngay);
    });

    const empMap: Record<string, {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      tongDon: number;
      tongDonGTC: number;
      tonDong: number;
      daysWorked: number;
      dailyRecords: { date: string; don: number; gtc: number }[];
    }> = {};

    staffRows.forEach(r => {
      const key = `${r.buuCuc}_${r.maNV}`;
      if (!empMap[key]) {
        empMap[key] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: r.buuCuc,
          tongDon: 0,
          tongDonGTC: 0,
          tonDong: 0,
          daysWorked: 0,
          dailyRecords: []
        };
      }
      empMap[key].tongDon += r.tongDon || 0;
      empMap[key].tongDonGTC += r.tongDonGTC || 0;
      empMap[key].tonDong += r.tonDong || 0;
      empMap[key].daysWorked++;
      empMap[key].dailyRecords.push({
        date: r.ngay,
        don: r.tongDon || 0,
        gtc: r.tongDonGTC || 0
      });
    });

    // Filter employees with assigned < 30 AND GTC < 20 in the selected week
    const flagged = Object.values(empMap).filter(emp => emp.tongDon > 0 && emp.tongDon < 30 && emp.tongDonGTC < 20);

    return flagged.sort((a, b) => a.tongDon - b.tongDon);
  }, [dataset.gtcNhanVien, availableWeeks, alert2Po, alert2WeekKey]);

  // =========================================================================
  // CẢNH BÁO 3: TOP NHÂN VIÊN CÓ TỶ LỆ GTC THẤP THEO TỪNG BƯU CỤC (< 65%)
  // =========================================================================
  const [alert3Po, setAlert3Po] = useState<string>('all');
  const [alert3WeekKey, setAlert3WeekKey] = useState<string>(availableWeeks[0]?.key || 'all');
  const [expandedAlert3NvKey, setExpandedAlert3NvKey] = useState<string | null>(null);

  const alert3Data = useMemo(() => {
    const targetWeek = availableWeeks.find(w => w.key === alert3WeekKey) || availableWeeks[0];
    if (!targetWeek) return [];

    const weekDatesSet = new Set(targetWeek.dates);

    const staffRows = dataset.gtcNhanVien.filter(r => {
      if (alert3Po !== 'all' && r.buuCuc !== alert3Po) return false;
      return weekDatesSet.has(r.ngay);
    });

    const empMap: Record<string, {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      tongDon: number;
      tongDonGTC: number;
      tonDong: number;
      leadtimeAvg: number;
      dailyRecords: { date: string; don: number; gtc: number; rate: number }[];
    }> = {};

    staffRows.forEach(r => {
      const key = `${r.buuCuc}_${r.maNV}`;
      if (!empMap[key]) {
        empMap[key] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: r.buuCuc,
          tongDon: 0,
          tongDonGTC: 0,
          tonDong: 0,
          leadtimeAvg: 0,
          dailyRecords: []
        };
      }
      empMap[key].tongDon += r.tongDon || 0;
      empMap[key].tongDonGTC += r.tongDonGTC || 0;
      empMap[key].tonDong += r.tonDong || 0;
      const rate = (r.tongDon || 0) > 0 ? ((r.tongDonGTC || 0) / r.tongDon) * 100 : 0;
      empMap[key].dailyRecords.push({
        date: r.ngay,
        don: r.tongDon || 0,
        gtc: r.tongDonGTC || 0,
        rate
      });
    });

    // Filter staff with GTC rate < 65% (and minimum 20 orders assigned to avoid noise)
    const flagged = Object.values(empMap).map(emp => {
      const gtcRate = emp.tongDon > 0 ? (emp.tongDonGTC / emp.tongDon) * 100 : 0;
      return { ...emp, gtcRate };
    }).filter(emp => emp.tongDon >= 20 && emp.gtcRate < 65);

    return flagged.sort((a, b) => a.gtcRate - b.gtcRate);
  }, [dataset.gtcNhanVien, availableWeeks, alert3Po, alert3WeekKey]);

  // Columns for detailed DataTable
  const columns: Column<GtcPostOfficeRecord>[] = [
    {
      key: 'buuCuc',
      header: 'Bưu Cục',
      render: r => <span className="font-bold text-slate-800 dark:text-slate-100">{r.buuCuc}</span>
    },
    {
      key: 'loaiHang',
      header: 'Loại Hàng',
      render: r => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
          r.loaiHang.includes('Ca 1') ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
          r.loaiHang.includes('Ca 2') ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
          'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
        }`}>
          {r.loaiHang}
        </span>
      )
    },
    {
      key: 'ngay',
      header: 'Ngày Vận Hành',
      render: r => <span className="font-medium text-slate-700 dark:text-slate-300">{r.ngay} ({r.thu})</span>
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'center',
      render: r => (
        <span className={`font-bold ${activeKpi === 'volume' ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded ring-1 ring-orange-300' : 'text-slate-900 dark:text-white'}`}>
          {r.volume.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      key: 'sldGan',
      header: 'SLĐ Gán',
      align: 'center',
      render: r => (
        <span className={activeKpi === 'sldGan' ? 'font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded ring-1 ring-blue-300' : ''}>
          {r.sldGan.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      key: 'tiLeGan',
      header: '% Gán',
      align: 'center',
      render: r => (
        <span className={`font-bold ${activeKpi === 'assignedRate' ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded ring-1 ring-blue-400' : 'text-blue-600'}`}>
          {r.tiLeGan}
        </span>
      )
    },
    {
      key: 'sldGTC',
      header: 'SLĐ GTC',
      align: 'center',
      render: r => (
        <span className={`font-bold ${activeKpi === 'sldGtc' ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded ring-1 ring-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {r.sldGTC.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      key: 'tiLeGTC',
      header: '% GTC',
      align: 'center',
      render: r => {
        const val = parseFloat(r.tiLeGTC?.replace(',', '.') || '0');
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block ${
            activeKpi === 'gtcRate' ? 'ring-2 ring-orange-500 shadow-sm ' : ''
          }${
            val < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
            val < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          }`}>
            {r.tiLeGTC}
          </span>
        );
      }
    },
    {
      key: 'tiLeChuyenTra',
      header: '% Chuyển Trả',
      align: 'center',
      render: r => <span className="text-amber-600 font-medium">{r.tiLeChuyenTra}</span>
    },
    {
      key: 'leadtime',
      header: 'Leadtime (h)',
      align: 'center',
      render: r => (
        <span className={activeKpi === 'leadtime' ? 'font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded ring-1 ring-indigo-300' : ''}>
          {r.leadtime.toFixed(1)}
        </span>
      )
    },
    {
      key: 'tonDong',
      header: 'Tồn Đọng',
      align: 'center',
      render: r => (
        <span className={`font-bold ${activeKpi === 'tonDong' ? 'text-rose-700 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded ring-1 ring-rose-400' : 'text-rose-600'}`}>
          {r.tonDong.toLocaleString('vi-VN')}
        </span>
      )
    }
  ];

  return (
    <div className="relative">
      {/* =========================================================================
          CỐ ĐỊNH MENU CỦA TAB: TỔNG VOLUME, SLĐ GÁN, SLĐ GTC, %GTC TỔNG, TỶ LỆ GÁN, LEADTIME TB, TỒN ĐỌNG CA
          (Menu của tab - cố định ở đỉnh, khi lăn để xem data thì không bị mất đi)
         ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-2 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {/* 1. Tổng Volume */}
            <button
              type="button"
              onClick={() => handleKpiClick('volume')}
              title="Nhấn để xem cột Volume trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group ${
                activeKpi === 'volume'
                  ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                <span>Tổng Volume</span>
                <span className="text-[9px] text-slate-400 group-hover:text-blue-500 transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {tabKPIs.totalVolume.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-slate-400 truncate">Đơn nhập ca</div>
            </button>

            {/* 2. SLĐ Gán */}
            <button
              type="button"
              onClick={() => handleKpiClick('sldGan')}
              title="Nhấn để xem cột SLĐ Gán trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group ${
                activeKpi === 'sldGan'
                  ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                <span>SLĐ Gán</span>
                <span className="text-[9px] text-slate-400 group-hover:text-blue-500 transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-blue-600 mt-0.5 truncate">
                {tabKPIs.totalSldGan.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-blue-500 truncate">Tỷ lệ: {tabKPIs.assignedRate.toFixed(1)}%</div>
            </button>

            {/* 3. SLĐ GTC */}
            <button
              type="button"
              onClick={() => handleKpiClick('sldGtc')}
              title="Nhấn để xem cột SLĐ GTC trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group ${
                activeKpi === 'sldGtc'
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                <span>SLĐ GTC</span>
                <span className="text-[9px] text-slate-400 group-hover:text-emerald-500 transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                {tabKPIs.totalSldGTC.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-emerald-500 truncate">Giao thành công</div>
            </button>

            {/* 4. %GTC TỔNG */}
            <button
              type="button"
              onClick={() => handleKpiClick('gtcRate')}
              title="Nhấn để xem cột % GTC trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm hover:shadow-md ${
                activeKpi === 'gtcRate'
                  ? 'border-white ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-900'
                  : 'border-orange-500'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-orange-100 font-bold uppercase tracking-tight">
                <span>%GTC TỔNG</span>
                <span className="text-[9px] text-orange-200 group-hover:text-white transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-white mt-0.5 truncate">
                {tabKPIs.gtcRate.toFixed(2)}%
              </div>
              <div className="text-[9px] text-orange-100 truncate">SUM(GTC)/SUM(Vol)</div>
            </button>

            {/* 5. Tỷ Lệ Gán */}
            <button
              type="button"
              onClick={() => handleKpiClick('assignedRate')}
              title="Nhấn để xem cột % Gán trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group ${
                activeKpi === 'assignedRate'
                  ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                <span>Tỷ Lệ Gán</span>
                <span className="text-[9px] text-slate-400 group-hover:text-blue-500 transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-blue-600 mt-0.5 truncate">
                {tabKPIs.assignedRate.toFixed(1)}%
              </div>
              <div className="text-[9px] text-slate-400 truncate">Phân bổ ca giao</div>
            </button>

            {/* 6. Leadtime TB */}
            <button
              type="button"
              onClick={() => handleKpiClick('leadtime')}
              title="Nhấn để xem cột Leadtime trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group ${
                activeKpi === 'leadtime'
                  ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                <span>Leadtime TB</span>
                <span className="text-[9px] text-slate-400 group-hover:text-indigo-500 transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                {tabKPIs.avgLeadtime.toFixed(1)} h
              </div>
              <div className="text-[9px] text-slate-400 truncate">Thời gian giao TB</div>
            </button>

            {/* 7. Tồn Đọng Ca */}
            <button
              type="button"
              onClick={() => handleKpiClick('tonDong')}
              title="Nhấn để xem cột Tồn Đọng trong Bảng Chi Tiết"
              className={`px-3 py-1.5 rounded-lg border text-left transition-all group ${
                activeKpi === 'tonDong'
                  ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900/60 hover:border-rose-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                <span>Tồn Đọng Ca</span>
                <span className="text-[9px] text-slate-400 group-hover:text-rose-500 transition-colors">Xem &#8595;</span>
              </div>
              <div className="text-sm lg:text-base font-black text-rose-600 mt-0.5 truncate">
                {tabKPIs.totalTonDong.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-rose-500 truncate">Chưa hoàn tất</div>
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-5 space-y-4 max-w-7xl mx-auto">
        {/* =========================================================================
            BỘ LỌC TỔNG HỢP GỘP LOGIC (TIẾT KIỆM KHÔNG GIAN VIEW - SIÊU GỌN GÀNG)
            • Bộ lọc trùng (Thời gian/Ngày/Tháng/Tuần) được gộp lại thành cụm thời gian 3 cấp
            • Bộ lọc không trùng (Bưu cục, Loại hàng, Thứ) được giữ nguyên độc lập
           ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-2.5 sm:px-4 sm:py-2.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Tiêu đề & Thông tin Phân Hệ GTC Bưu Cục */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap">
                Phân Hệ GTC Bưu Cục
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 rounded">
                5 Bưu cục Long An
              </span>
            </div>
          </div>

          {/* CÁC BỘ LỌC ĐÃ ĐƯỢC GỘP GỌN (COMPACT - TIẾT KIỆM KHÔNG GIAN VIEW TỐI ĐA) */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* 1. Lọc Bưu Cục (Giữ) */}
            <IndividualFilterDropdown
              label="Bưu cục"
              compact={true}
              icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
              options={buuCucOptions}
              selectedValues={filterValues.buuCuc || []}
              onChange={vals => setFilterValues(prev => ({ ...prev, buuCuc: vals }))}
              searchPlaceholder="Tìm bưu cục..."
              minWidth="w-52"
            />

            {/* 2. Lọc Loại Hàng / Ca (Giữ) */}
            <IndividualFilterDropdown
              label="Loại hàng"
              compact={true}
              icon={<Layers className="w-3.5 h-3.5 text-blue-600" />}
              options={loaiHangOptions}
              selectedValues={filterValues.loaiHang || []}
              onChange={vals => setFilterValues(prev => ({ ...prev, loaiHang: vals }))}
              searchPlaceholder="Tìm loại hàng..."
              minWidth="w-48"
            />

            {/* 3. Lọc Thứ (Giữ) */}
            <IndividualFilterDropdown
              label="Thứ"
              compact={true}
              icon={<Clock className="w-3.5 h-3.5 text-indigo-600" />}
              options={thuOptions}
              selectedValues={filterValues.thu || []}
              onChange={vals => setFilterValues(prev => ({ ...prev, thu: vals }))}
              searchPlaceholder="Tìm thứ..."
              minWidth="w-44"
            />

            {/* Vạch ngăn cách trực quan giữa Thực thể và Thời gian */}
            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* 4. Lọc Tháng (Gộp từ Bộ Lọc Thời Gian) */}
            <div className="relative">
              <select
                value={selectedMonthKey}
                onChange={e => handleSelectMonth(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg pl-2.5 pr-6 py-1.5 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer appearance-none transition-colors"
                title="Lọc theo tháng"
              >
                <option value="all">Tất cả Tháng</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.dates.length}n)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 5. Lọc Tuần (Gộp từ Bộ Lọc Thời Gian) */}
            <div className="relative">
              <select
                value={selectedWeekKey}
                onChange={e => handleSelectWeek(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg pl-2.5 pr-6 py-1.5 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer appearance-none transition-colors"
                title="Lọc theo tuần"
              >
                <option value="all">Tất cả Tuần</option>
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>
                    {w.label} ({w.dates.length}n)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 6. Lọc Ngày (Gộp từ Cột J & Thẻ Ngày) */}
            <IndividualFilterDropdown
              label="Ngày"
              compact={true}
              icon={<Calendar className="w-3.5 h-3.5 text-amber-600" />}
              options={ngayOptions}
              selectedValues={filterValues.ngay || []}
              onChange={vals => {
                setFilterValues(prev => ({ ...prev, ngay: vals }));
                if (vals.length > 0) {
                  setSelectedMonthKey('custom');
                  setSelectedWeekKey('custom');
                } else {
                  setSelectedMonthKey('all');
                  setSelectedWeekKey('all');
                }
              }}
              searchPlaceholder="Tìm ngày (Cột J)..."
              minWidth="w-56"
            />

            {/* 7. Nút Đặt Lại nếu có filter active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

      {/* 3. BIỂU ĐỒ CỘT VÀ ĐƯỜNG HIỂN THỊ ĐA TRỤC (Volume, SLĐ Gán, SLĐ GTC, %Gán, %GTC, %Trả, Tồn đọng) */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>Biểu Đồ Cột & Đường: Volume, Gán, GTC, %Gán, %GTC, %Trả & Tồn Đọng (5 Bưu Cục)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Trục trái: Số lượng đơn &bull; Trục phải: Tỷ lệ % (%Gán, %GTC, %Trả)
            </p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={poSummaries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="buuCuc" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip 
                formatter={(val: any, name: any) => {
                  if (typeof val === 'number') {
                    if (String(name).includes('%')) return [`${val.toFixed(2)}%`, name];
                    return [val.toLocaleString('vi-VN'), name];
                  }
                  return [val, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Bar yAxisId="left" dataKey="volume" name="Volume" fill="#F26522" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="sldGan" name="SLĐ Gán" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="sldGTC" name="SLĐ GTC" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="tonDong" name="Tồn đọng" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="assignedRate" name="% Gán" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="gtcRate" name="% GTC (Chuẩn)" stroke="#002D72" strokeWidth={3.5} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="returnRate" name="% Chuyển Trả" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="3 3" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. BẢNG "SO SÁNH SẢN LƯỢNG VOLUME VÀ %GTC THEO BƯU CỤC" (BỘ LỌC RIÊNG: BƯU CỤC & NGÀY TÙY CHỌN TICK CHỌN TỪNG NGÀY) */}
      <div ref={comparisonTableRef} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-visible space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                So Sánh Sản Lượng Volume và %GTC Theo Bưu Cục
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bộ lọc riêng độc lập: Chọn bưu cục và tick chọn từng ngày vận hành. Nhấn vào hàng bưu cục hoặc hàng Tổng để mở rộng chi tiết nhân viên.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const headers = ['Bưu Cục', 'Volume', 'SLĐ Gán', '% Gán', 'SLĐ GTC', '% GTC', '% Chuyển Trả', 'Leadtime', 'Tồn Đọng', 'Bưu Tá'];
                const rows = poSummaries.map(r => [r.buuCuc, r.volume, r.sldGan, `${r.assignedRate.toFixed(1)}%`, r.sldGTC, `${r.gtcRate.toFixed(2)}%`, `${r.returnRate.toFixed(1)}%`, r.leadtime.toFixed(1), r.tonDong, r.staffCount]);
                exportToCSV('so_sanh_buu_cuc_rieng_ghn', headers, rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* TOOLBAR BỘ LỌC RIÊNG CỦA BẢNG NÀY: BƯU CỤC & DROPDOWN DẠNG SỔ TICK CHỌN NGÀY */}
        <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs relative z-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-orange-600" /> Bộ lọc riêng bảng:
              </span>

              {/* Lọc Bưu Cục */}
              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 font-medium text-[11px]">Bưu cục:</label>
                <select
                  value={compFilterBuuCuc}
                  onChange={e => setCompFilterBuuCuc(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">Tất cả 5 bưu cục</option>
                  {buuCucOptions.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* DROPDOWN DẠNG SỔ: TICK CHỌN NGÀY VẬN HÀNH (THU GỌN KHI NHẤN RA NGOÀI) */}
              <div className="relative inline-block text-left" ref={compDatePickerRef}>
                <button
                  type="button"
                  onClick={() => setIsCompDatePickerOpen(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    compSelectedDates.length > 0
                      ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-500 text-orange-900 dark:text-orange-200 ring-1 ring-orange-500 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                  title="Nhấn để mở danh sách dạng sổ và tick chọn ngày"
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  <span>
                    {compSelectedDates.length === 0 ? 'Tất cả các ngày' : `Đã tick chọn ${compSelectedDates.length} ngày`}
                  </span>
                  {compSelectedDates.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-600 text-white shrink-0">
                      {compSelectedDates.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCompDatePickerOpen ? 'rotate-180 text-orange-600' : ''}`} />
                </button>

                {/* MENU DẠNG SỔ XUỐNG (DROPDOWN POPOVER - CLICK BẤT KỲ ĐÂU NGOÀI ĐỂ THU GỌN) */}
                {isCompDatePickerOpen && (
                  <div className="absolute left-0 mt-1.5 w-[330px] sm:w-[460px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header menu sổ */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                          Tick Chọn Ngày Vận Hành
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({compSelectedDates.length === 0 ? 'Mặc định: Tất cả ngày' : `Đang tick: ${compSelectedDates.length} ngày`})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCompDatePickerOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                        title="Đóng bảng sổ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Thanh phím tắt nhanh */}
                    <div className="flex items-center justify-between gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-750 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCompSelectedDates(allUniqueDatesDesc.slice(0, 7))}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-orange-700 dark:text-orange-300 font-semibold hover:border-orange-400 transition-colors cursor-pointer"
                          title="Chọn nhanh 7 ngày gần nhất"
                        >
                          7 ngày gần nhất
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompSelectedDates([...allUniqueDatesDesc])}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 font-semibold hover:border-blue-400 transition-colors cursor-pointer"
                        >
                          Chọn tất cả ({allUniqueDatesDesc.length})
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompSelectedDates([])}
                        className="text-rose-600 hover:underline font-semibold cursor-pointer text-[11px]"
                      >
                        Xóa chọn (Tất cả)
                      </button>
                    </div>

                    {/* Danh sách ngày để tick chọn dạng lưới 3 cột */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto p-1.5 bg-slate-50/60 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
                      {allUniqueDatesDesc.map(d => {
                        const isChecked = compSelectedDates.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleCompDate(d)}
                            className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] border text-left transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-orange-50 dark:bg-orange-950/70 border-orange-500 text-orange-950 dark:text-orange-200 font-bold shadow-2xs ring-1 ring-orange-500/40'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-50/40 hover:border-orange-300'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{d}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer ghi chú nhấn ra ngoài để thu gọn */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400">
                      <span className="italic">* Nhấn bất kỳ nơi nào để thu gọn</span>
                      <button
                        type="button"
                        onClick={() => setIsCompDatePickerOpen(false)}
                        className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors cursor-pointer shadow-xs text-xs"
                      >
                        Áp dụng ({compSelectedDates.length === 0 ? 'Tất cả' : `${compSelectedDates.length} ngày`})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {(compFilterBuuCuc !== 'all' || compSelectedDates.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setCompFilterBuuCuc('all');
                    setCompSelectedDates([]);
                  }}
                  className="text-rose-600 hover:text-rose-800 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc bảng</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              Phạm vi: {compFilterBuuCuc === 'all' ? 'Toàn khu vực' : compFilterBuuCuc} &bull; {compSelectedDates.length === 0 ? 'Toàn bộ ngày' : `${compSelectedDates.length} ngày đã chọn`}
            </span>
          </div>
        </div>

        {/* BẢNG SỐ LIỆU */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="px-3.5 py-2.5">Bưu Cục (Nhấn mở rộng NV)</th>
                <th className="px-3 py-2.5 text-center">Volume</th>
                <th className="px-3 py-2.5 text-center">SLĐ Gán</th>
                <th className="px-2.5 py-2.5 text-center">% Gán</th>
                <th className="px-3 py-2.5 text-center">SLĐ GTC</th>
                <th className="px-3 py-2.5 text-center">% GTC (Chuẩn)</th>
                <th className="px-2.5 py-2.5 text-center">% Chuyển Trả</th>
                <th className="px-2.5 py-2.5 text-center">Leadtime (h)</th>
                <th className="px-3 py-2.5 text-center">Tồn Đọng</th>
                <th className="px-2.5 py-2.5 text-center">Bưu Tá</th>
                <th className="px-3 py-2.5 text-center">Năng Suất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {poSummaries.map((po) => {
                const isExpanded = compExpandedPoKey === po.buuCuc;
                const poStaff = isExpanded ? getEmployeesForPoComp(po.buuCuc) : [];

                return (
                  <React.Fragment key={po.buuCuc}>
                    <tr 
                      onClick={() => setCompExpandedPoKey(isExpanded ? null : po.buuCuc)}
                      className={`hover:bg-orange-50/40 dark:hover:bg-slate-750 transition-colors cursor-pointer select-none ${
                        isExpanded ? 'bg-orange-50/60 dark:bg-slate-750/90 font-semibold border-l-4 border-orange-500' : ''
                      }`}
                      title="Nhấn để mở rộng danh sách nhân viên bưu cục này"
                    >
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{po.buuCuc}</span>
                      </td>

                      <td className="px-3 py-2.5 text-center font-bold text-slate-900 dark:text-white">
                        {po.volume.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 font-medium">
                        {po.sldGan.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2.5 py-2.5 text-center text-blue-600 font-bold">
                        {po.assignedRate.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {po.sldGTC.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black">
                        <span className={`px-2 py-0.5 rounded-full inline-flex items-center justify-center ${
                          po.gtcRate < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                          po.gtcRate < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {po.gtcRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center text-amber-600 font-medium">
                        {po.returnRate.toFixed(2)}%
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-medium">
                        {po.leadtime.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-rose-600">
                        {po.tonDong.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                          {po.staffCount} NV
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {po.productivity.toLocaleString('vi-VN')} đơn/NV
                      </td>
                    </tr>

                    {/* EXPANDED INLINE NV */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-b-2 border-orange-300 dark:border-slate-700 animate-in fade-in duration-200">
                        <td colSpan={11} className="p-3 md:p-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-orange-200 dark:border-slate-700 shadow-sm space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                              <h5 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-orange-600" />
                                <span>Danh Sách Nhân Viên: {po.buuCuc} ({poStaff.length} NV)</span>
                              </h5>
                              <span className="text-[11px] text-orange-600 font-semibold">
                                Volume: {po.volume.toLocaleString('vi-VN')} đơn &bull; %GTC: {po.gtcRate.toFixed(2)}%
                              </span>
                            </div>

                            <div className="overflow-x-auto max-h-[730px] overflow-y-auto rounded border border-slate-200 dark:border-slate-700 shadow-inner">
                              <table className="w-full text-xs text-left">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-750">
                                  <tr className="font-bold border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    <th className="px-3 py-2 text-center">Mã NV</th>
                                    <th className="px-3 py-2 text-left">Họ Tên</th>
                                    <th className="px-3 py-2 text-center">Tổng Đơn</th>
                                    <th className="px-3 py-2 text-center">Tổng Đơn GTC</th>
                                    <th className="px-3 py-2 text-center">% GTC</th>
                                    <th className="px-2.5 py-2 text-center">Leadtime</th>
                                    <th className="px-2.5 py-2 text-center">Chuyến Đi</th>
                                    <th className="px-3 py-2 text-center">Tồn Đọng</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                                  {poStaff.map(nv => (
                                    <tr key={nv.maNV} className="hover:bg-orange-50/30">
                                      <td className="px-3 py-1.5 font-mono text-[11px] font-bold text-slate-500 text-center">{nv.maNV}</td>
                                      <td className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 text-left">{nv.tenNV}</td>
                                      <td className="px-3 py-1.5 text-center font-medium">{nv.tongDon.toLocaleString('vi-VN')}</td>
                                      <td className="px-3 py-1.5 text-center font-bold text-emerald-600">{nv.tongDonGTC.toLocaleString('vi-VN')}</td>
                                      <td className="px-3 py-1.5 text-center font-black">
                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                                          nv.gtcRate < 65 ? 'bg-red-100 text-red-700' :
                                          nv.gtcRate < 75 ? 'bg-amber-100 text-amber-700' :
                                          'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {nv.gtcRate.toFixed(1)}%
                                        </span>
                                      </td>
                                      <td className="px-2.5 py-1.5 text-center font-medium">{nv.avgLeadtime.toFixed(1)}</td>
                                      <td className="px-2.5 py-1.5 text-center font-semibold">{nv.chuyenDi}</td>
                                      <td className="px-3 py-1.5 text-center font-bold text-rose-600">{nv.tonDong}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* HÀNG TỔNG TOÀN KHU VỰC */}
              <tr 
                onClick={() => setIsCompGrandTotalExpanded(!isCompGrandTotalExpanded)}
                className="bg-slate-100 dark:bg-slate-750 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-slate-700 transition-colors select-none"
              >
                <td className="px-3.5 py-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  {isCompGrandTotalExpanded ? (
                    <ChevronDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  )}
                  <span className="uppercase tracking-wider">TỔNG TOÀN KHU VỰC</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-orange-200/60 dark:bg-orange-950 text-orange-800 dark:text-orange-200 ml-1">
                    Nhấn xem tất cả NV
                  </span>
                </td>

                <td className="px-3 py-3 text-center">{grandTotal.volume.toLocaleString('vi-VN')}</td>
                <td className="px-3 py-3 text-center text-slate-700 dark:text-slate-200 font-semibold">{grandTotal.sldGan.toLocaleString('vi-VN')}</td>
                <td className="px-2.5 py-3 text-center text-blue-600 font-bold">{grandTotal.assignedRate.toFixed(1)}%</td>
                <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">{grandTotal.sldGTC.toLocaleString('vi-VN')}</td>
                <td className="px-3 py-3 text-center">
                  <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white font-black inline-flex items-center justify-center text-[11px] shadow-xs">
                    {grandTotal.gtcRate.toFixed(2)}%
                  </span>
                </td>
                <td className="px-2.5 py-3 text-center text-amber-600 font-semibold">{grandTotal.returnRate.toFixed(2)}%</td>
                <td className="px-2.5 py-3 text-center font-medium">{grandTotal.leadtime.toFixed(1)}</td>
                <td className="px-3 py-3 text-center text-rose-600 font-bold">{grandTotal.tonDong.toLocaleString('vi-VN')}</td>
                <td className="px-2.5 py-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-100 text-[10px]">
                    {grandTotal.staffCount} NV
                  </span>
                </td>
                <td className="px-3 py-3 text-center font-semibold">{grandTotal.productivity.toLocaleString('vi-VN')} đơn/NV</td>
              </tr>

              {/* MỞ RỘNG TOÀN BỘ NHÂN VIÊN */}
              {isCompGrandTotalExpanded && (
                <tr className="bg-slate-50/95 dark:bg-slate-900/95 border-b-2 border-orange-400 dark:border-slate-700 animate-in fade-in duration-200">
                  <td colSpan={11} className="p-3 md:p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-orange-300 dark:border-slate-700 shadow-sm space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-orange-600" />
                            <span>Toàn Bộ Nhân Viên Khu Vực ({getEmployeesForPoComp().length} bưu tá)</span>
                          </h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                            Cố định sắp xếp theo Bưu Cục • Khung nhìn 20 hàng
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-600 font-semibold">
                          Hoàn thành: {grandTotal.sldGTC.toLocaleString('vi-VN')} đơn &bull; %GTC: {grandTotal.gtcRate.toFixed(2)}%
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-[730px] overflow-y-auto rounded border border-slate-200 dark:border-slate-700 shadow-inner">
                        <table className="w-full text-xs text-left">
                          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-750 z-10 shadow-2xs">
                            <tr className="font-bold border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              {/* 1. Mã NV */}
                              <th 
                                onClick={() => handleSortEmp('maNV')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc A-Z hoặc Z-A theo Mã NV"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Mã NV</span>
                                  {empSortField === 'maNV' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 2. Họ & Tên */}
                              <th 
                                onClick={() => handleSortEmp('tenNV')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-left"
                                title="Nhấn để lọc A-Z hoặc Z-A theo Họ & Tên"
                              >
                                <div className="flex items-center gap-1">
                                  <span>Họ & Tên</span>
                                  {empSortField === 'tenNV' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 3. Bưu Cục */}
                              <th 
                                onClick={() => handleSortEmp('buuCuc')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc A-Z hoặc Z-A theo Bưu Cục"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Bưu Cục</span>
                                  {empSortField === 'buuCuc' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 4. Tổng Đơn */}
                              <th 
                                onClick={() => handleSortEmp('tongDon')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc số lượng Tổng Đơn (a-z hoặc z-a)"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Tổng Đơn</span>
                                  {empSortField === 'tongDon' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 5. SLĐ GTC */}
                              <th 
                                onClick={() => handleSortEmp('tongDonGTC')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc số lượng SLĐ GTC (a-z hoặc z-a)"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>SLĐ GTC</span>
                                  {empSortField === 'tongDonGTC' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 6. % GTC */}
                              <th 
                                onClick={() => handleSortEmp('gtcRate')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc tỷ lệ % GTC (a-z hoặc z-a)"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>% GTC</span>
                                  {empSortField === 'gtcRate' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 7. Leadtime */}
                              <th 
                                onClick={() => handleSortEmp('avgLeadtime')}
                                className="px-2 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc Leadtime (a-z hoặc z-a)"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Leadtime</span>
                                  {empSortField === 'avgLeadtime' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 8. Chuyến Đi */}
                              <th 
                                onClick={() => handleSortEmp('chuyenDi')}
                                className="px-2 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc Chuyến Đi (a-z hoặc z-a)"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Chuyến Đi</span>
                                  {empSortField === 'chuyenDi' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>

                              {/* 9. Tồn Đọng */}
                              <th 
                                onClick={() => handleSortEmp('tonDong')}
                                className="px-3 py-2 cursor-pointer select-none hover:bg-orange-100/60 dark:hover:bg-slate-700 transition-colors text-center"
                                title="Nhấn để lọc Tồn Đọng (a-z hoặc z-a)"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Tồn Đọng</span>
                                  {empSortField === 'tonDong' ? (
                                    empSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                  )}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                            {getSortedEmployeesForPoComp().map((nv, idx, arr) => {
                              const isNewPo = idx === 0 || nv.buuCuc !== arr[idx - 1].buuCuc;
                              return (
                                <tr 
                                  key={nv.maNV} 
                                  className={`hover:bg-orange-50/40 dark:hover:bg-slate-700/50 transition-colors ${
                                    isNewPo && idx > 0 ? 'border-t-2 border-slate-300 dark:border-slate-600' : ''
                                  }`}
                                >
                                  <td className="px-3 py-1.5 font-mono text-[11px] font-bold text-slate-500 text-center">{nv.maNV}</td>
                                  <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-white text-left">{nv.tenNV}</td>
                                  <td className="px-3 py-1.5 text-center">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                      {nv.buuCuc}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 text-center font-medium text-slate-900 dark:text-white">{nv.tongDon.toLocaleString('vi-VN')}</td>
                                  <td className="px-3 py-1.5 text-center font-bold text-emerald-600">{nv.tongDonGTC.toLocaleString('vi-VN')}</td>
                                  <td className="px-3 py-1.5 text-center font-black">
                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                                      nv.gtcRate < 65 ? 'bg-red-100 text-red-700' :
                                      nv.gtcRate < 75 ? 'bg-amber-100 text-amber-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {nv.gtcRate.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-center font-medium">{nv.avgLeadtime.toFixed(1)}</td>
                                  <td className="px-2 py-1.5 text-center font-semibold">{nv.chuyenDi}</td>
                                  <td className="px-3 py-1.5 text-center font-bold text-rose-600">{nv.tonDong}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          5.1 BẢNG "GIAO THÀNH CÔNG BƯU CỤC" (TỔNG HỢP NGUỒN SHEET "GTC BƯU CỤC")
          Cột: Bưu cục, Ngày, Volume, SLĐ Gán, % Gán, SLĐ GTC, % GTC, Tồn Đọng
          Sắp xếp ngày gần nhất đến xa nhất, hỗ trợ xuất Excel
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        {/* Header Bảng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                GIAO THÀNH CÔNG BƯU CỤC
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Sheet GTC Bưu Cục
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng hợp dữ liệu theo 5 bưu cục đang quản lý và ngày vận hành (ngày gần nhất đến xa nhất). 
              Volume = Hàng mới ca 1 + Hàng mới ca 2 + Hàng tồn; % Gán = SLĐ Gán / Volume; % GTC = SLĐ GTC / Volume; Tồn đọng = Volume - SLĐ GTC. Cho phép xuất toàn bộ về Excel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportGtcDeliveryExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-sm transition-colors cursor-pointer"
              title="Xuất bảng Giao Thành Công Bưu Cục ra định dạng Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel ({filteredGtcDeliveryDaily.length})</span>
            </button>
          </div>
        </div>

        {/* Toolbar Bộ lọc & Tìm kiếm */}
        <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-600" /> Bộ lọc bảng:
              </span>

              {/* Lọc Bưu Cục */}
              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 font-medium text-[11px]">Bưu cục:</label>
                <select
                  value={gtcDeliveryFilterPo}
                  onChange={e => {
                    setGtcDeliveryFilterPo(e.target.value);
                    setGtcDeliveryPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">Tất cả 5 bưu cục</option>
                  {['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'].map(po => (
                    <option key={po} value={po}>{po}</option>
                  ))}
                </select>
              </div>

              {/* Lọc Tháng */}
              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 font-medium text-[11px]">Tháng:</label>
                <select
                  value={gtcDeliveryFilterMonth}
                  onChange={e => {
                    setGtcDeliveryFilterMonth(e.target.value);
                    setGtcDeliveryPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">Tất cả tháng</option>
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Ô tìm kiếm ngày / bưu cục */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={gtcDeliverySearch}
                  onChange={e => {
                    setGtcDeliverySearch(e.target.value);
                    setGtcDeliveryPage(1);
                  }}
                  placeholder="Tìm ngày (dd/mm/yyyy) hoặc bưu cục..."
                  className="pl-8 pr-7 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none w-48 sm:w-64"
                />
                {gtcDeliverySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setGtcDeliverySearch('');
                      setGtcDeliveryPage(1);
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Nút reset nếu đang lọc */}
              {(gtcDeliveryFilterPo !== 'all' || gtcDeliveryFilterMonth !== 'all' || gtcDeliverySearch.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setGtcDeliveryFilterPo('all');
                    setGtcDeliveryFilterMonth('all');
                    setGtcDeliverySearch('');
                    setGtcDeliveryPage(1);
                  }}
                  className="text-rose-600 hover:text-rose-800 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>

            {/* Số dòng hiển thị & Tổng quan */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-[11px]">Hiển thị:</span>
                <select
                  value={gtcDeliveryPageSize}
                  onChange={e => {
                    setGtcDeliveryPageSize(Number(e.target.value));
                    setGtcDeliveryPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded px-2 py-0.5 font-semibold focus:outline-none"
                >
                  <option value={20}>20 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                  <option value={-1}>Tất cả</option>
                </select>
              </div>

              <span className="text-[11px] text-slate-400">
                Tổng: <strong className="text-slate-700 dark:text-slate-200">{filteredGtcDeliveryDaily.length}</strong> dòng
              </span>
            </div>
          </div>
        </div>

        {/* Bảng Dữ Liệu */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                {/* 1. Bưu Cục */}
                <th
                  onClick={() => handleSortGtcDelivery('buuCuc')}
                  className="px-3.5 py-2.5 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo Bưu Cục"
                >
                  <div className="flex items-center gap-1">
                    <span>Bưu Cục</span>
                    {gtcDeliverySortField === 'buuCuc' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 2. Ngày */}
                <th
                  onClick={() => handleSortGtcDelivery('ngay')}
                  className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp từ ngày gần nhất đến xa nhất (hoặc ngược lại)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Ngày</span>
                    {gtcDeliverySortField === 'ngay' ? (
                      gtcDeliverySortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 3. Volume */}
                <th
                  onClick={() => handleSortGtcDelivery('volume')}
                  className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo Volume (Tổng hàng mới ca 1 + ca 2 + tồn)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Volume</span>
                    {gtcDeliverySortField === 'volume' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 4. SLĐ Gán */}
                <th
                  onClick={() => handleSortGtcDelivery('sldGan')}
                  className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo SLĐ Gán"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SLĐ Gán</span>
                    {gtcDeliverySortField === 'sldGan' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 5. % Gán */}
                <th
                  onClick={() => handleSortGtcDelivery('tiLeGan')}
                  className="px-2.5 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo % Gán = (SLĐ Gán / Volume)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>% Gán</span>
                    {gtcDeliverySortField === 'tiLeGan' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 6. SLĐ GTC */}
                <th
                  onClick={() => handleSortGtcDelivery('sldGTC')}
                  className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo SLĐ GTC"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SLĐ GTC</span>
                    {gtcDeliverySortField === 'sldGTC' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 7. % GTC */}
                <th
                  onClick={() => handleSortGtcDelivery('tiLeGTC')}
                  className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo % GTC = (SLĐ GTC / Volume)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>% GTC</span>
                    {gtcDeliverySortField === 'tiLeGTC' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 8. Tồn Đọng */}
                <th
                  onClick={() => handleSortGtcDelivery('tonDong')}
                  className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Nhấn để sắp xếp theo Tồn Đọng = (Volume - SLĐ GTC)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tồn Đọng</span>
                    {gtcDeliverySortField === 'tonDong' ? (
                      gtcDeliverySortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedGtcDeliveryDaily.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy dữ liệu phù hợp với điều kiện lọc
                  </td>
                </tr>
              ) : (
                paginatedGtcDeliveryDaily.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-emerald-50/40 dark:hover:bg-slate-750/70 transition-colors"
                  >
                    {/* Bưu Cục */}
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {row.buuCuc}
                      </span>
                    </td>

                    {/* Ngày */}
                    <td className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {row.ngay}
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-2.5 text-center font-bold text-slate-900 dark:text-white">
                      {row.volume.toLocaleString('vi-VN')}
                    </td>

                    {/* SLĐ Gán */}
                    <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-300 font-medium">
                      {row.sldGan.toLocaleString('vi-VN')}
                    </td>

                    {/* % Gán */}
                    <td className="px-2.5 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                      {row.tiLeGan.toFixed(2)}%
                    </td>

                    {/* SLĐ GTC */}
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {row.sldGTC.toLocaleString('vi-VN')}
                    </td>

                    {/* % GTC */}
                    <td className="px-3 py-2.5 text-center font-black">
                      <span className={`px-2 py-0.5 rounded-full inline-flex items-center justify-center text-[10px] ${
                        row.tiLeGTC < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        row.tiLeGTC < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {row.tiLeGTC.toFixed(2)}%
                      </span>
                    </td>

                    {/* Tồn Đọng */}
                    <td className="px-3 py-2.5 text-center font-bold text-rose-600 dark:text-rose-400">
                      {row.tonDong.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}

              {/* HÀNG TỔNG CỘNG */}
              {filteredGtcDeliveryDaily.length > 0 && (
                <tr className="bg-slate-100 dark:bg-slate-750 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600">
                  <td className="px-3.5 py-3 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    TỔNG CỘNG
                  </td>
                  <td className="px-3 py-3 text-center text-[11px] text-slate-500 font-semibold">
                    {filteredGtcDeliveryDaily.length} ngày-bưu cục
                  </td>
                  <td className="px-3 py-3 text-center text-slate-900 dark:text-white">
                    {gtcDeliverySummary.totalVolume.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-800 dark:text-slate-200">
                    {gtcDeliverySummary.totalSldGan.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-3 text-center text-blue-600 dark:text-blue-400 font-black">
                    {gtcDeliverySummary.tiLeGan.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-400 font-black">
                    {gtcDeliverySummary.totalSldGTC.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-3 text-center font-black">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] shadow-xs">
                      {gtcDeliverySummary.tiLeGTC.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-rose-600 dark:text-rose-400 font-black">
                    {gtcDeliverySummary.totalTonDong.toLocaleString('vi-VN')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang (Pagination) */}
        {totalGtcDeliveryPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Hiển thị từ {((gtcDeliveryPage - 1) * (gtcDeliveryPageSize === -1 ? filteredGtcDeliveryDaily.length : gtcDeliveryPageSize)) + 1} đến{' '}
              {Math.min(gtcDeliveryPage * (gtcDeliveryPageSize === -1 ? filteredGtcDeliveryDaily.length : gtcDeliveryPageSize), filteredGtcDeliveryDaily.length)}{' '}
              trong tổng số <strong>{filteredGtcDeliveryDaily.length}</strong> dòng
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setGtcDeliveryPage(prev => Math.max(1, prev - 1))}
                disabled={gtcDeliveryPage === 1}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Trước
              </button>

              <span className="px-2 font-bold text-slate-700 dark:text-slate-200">
                {gtcDeliveryPage} / {totalGtcDeliveryPages}
              </span>

              <button
                type="button"
                onClick={() => setGtcDeliveryPage(prev => Math.min(totalGtcDeliveryPages, prev + 1))}
                disabled={gtcDeliveryPage === totalGtcDeliveryPages}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          6. BẢNG HIỂN THỊ 8 NGÀY GẦN NHẤT CHI TIẾT GÁN GIAO CỦA TỪNG BƯU CỤC
          (BỘ LỌC RIÊNG BIỆT: TUẦN VÀ THÁNG, MỞ RỘNG TỪNG NHÂN VIÊN)
         ========================================================================= */}
      <div ref={recentDaysTableRef} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Chi Tiết Gán Giao Của Từng Bưu Cục
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi gán giao 8 ngày vận hành gần nhất của 5 bưu cục. Khi nhấn vào từng dòng sẽ mở rộng chi tiết danh sách từng nhân viên bưu tá.
            </p>
          </div>

          {/* Bộ lọc Tuần & Tháng riêng của bảng này */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <label className="text-slate-500 font-medium text-[11px]">Tháng:</label>
              <select
                value={recentFilterMonth}
                onChange={e => {
                  setRecentFilterMonth(e.target.value);
                  setRecentFilterWeek('all');
                }}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value="all">Tất cả tháng</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <label className="text-slate-500 font-medium text-[11px]">Tuần:</label>
              <select
                value={recentFilterWeek}
                onChange={e => setRecentFilterWeek(e.target.value)}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value="all">Tất cả tuần</option>
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>{w.label}</option>
                ))}
              </select>
            </div>

            {(recentFilterMonth !== 'all' || recentFilterWeek !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setRecentFilterMonth('all');
                  setRecentFilterWeek('all');
                }}
                className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 ml-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Bảng 8 ngày */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-750 z-10">
              <tr className="font-bold border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <th className="px-3.5 py-2.5">Ngày Vận Hành</th>
                <th className="px-2.5 py-2.5 text-center">Thứ</th>
                <th className="px-3.5 py-2.5">Bưu Cục (Nhấn mở rộng NV)</th>
                <th className="px-3 py-2.5 text-center">Volume</th>
                <th className="px-3 py-2.5 text-center">SLĐ Gán</th>
                <th className="px-2.5 py-2.5 text-center">% Gán</th>
                <th className="px-3 py-2.5 text-center">SLĐ GTC</th>
                <th className="px-3 py-2.5 text-center">% GTC (Chuẩn)</th>
                <th className="px-2.5 py-2.5 text-center">Leadtime</th>
                <th className="px-3 py-2.5 text-center">Tồn Đọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentDaysRecords.map((row) => {
                const rowKey = `${row.date}_${row.buuCuc}`;
                const isExpanded = expandedRecentRowKey === rowKey;
                const rowStaff = isExpanded ? getStaffForDateAndPo(row.date, row.buuCuc) : [];

                return (
                  <React.Fragment key={rowKey}>
                    <tr 
                      onClick={() => setExpandedRecentRowKey(isExpanded ? null : rowKey)}
                      className={`hover:bg-orange-50/40 dark:hover:bg-slate-750 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-orange-50/60 dark:bg-slate-750/90 font-semibold border-l-4 border-orange-500' : ''
                      }`}
                      title="Nhấn để mở rộng danh sách nhân viên bưu cục trong ngày này"
                    >
                      <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-white">
                        {row.date}
                      </td>
                      <td className="px-2.5 py-2 text-slate-500 font-medium text-center">
                        {row.thu}
                      </td>
                      <td className="px-3.5 py-2 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{row.buuCuc}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{row.volume.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 font-medium">{row.sldGan.toLocaleString('vi-VN')}</td>
                      <td className="px-2.5 py-2 text-center font-bold text-blue-600">{row.assignedRate.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-600">{row.sldGTC.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2 text-center font-black">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                          row.gtcRate < 62 ? 'bg-red-100 text-red-700' :
                          row.gtcRate < 67 ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {row.gtcRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-center font-medium">{row.leadtime.toFixed(1)}</td>
                      <td className="px-3 py-2 text-center font-bold text-rose-600">{row.tonDong.toLocaleString('vi-VN')}</td>
                    </tr>

                    {/* MỞ RỘNG DANH SÁCH NHÂN VIÊN TRONG NGÀY ĐÓ */}
                    {isExpanded && (
                      <tr className="bg-slate-50/95 dark:bg-slate-900/95 border-b-2 border-orange-300 animate-in fade-in duration-200">
                        <td colSpan={10} className="p-3 md:p-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-orange-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
                              <span className="font-bold text-xs text-orange-600 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                <span>Chi tiết từng bưu tá ngày {row.date} tại {row.buuCuc} ({rowStaff.length} NV)</span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Tổng đơn gán ngày: <strong>{row.sldGan.toLocaleString('vi-VN')}</strong> &bull; GTC: <strong>{row.sldGTC.toLocaleString('vi-VN')}</strong>
                              </span>
                            </div>

                            <div className="overflow-x-auto max-h-56 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
                              <table className="w-full text-xs text-left">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-750">
                                  <tr className="font-bold border-b border-slate-200 text-slate-700 dark:text-slate-300">
                                    <th className="px-3 py-1.5 text-center">Mã NV</th>
                                    <th className="px-3 py-1.5 text-left">Họ Tên</th>
                                    <th className="px-3 py-1.5 text-center">Tổng Đơn</th>
                                    <th className="px-3 py-1.5 text-center">Tổng Đơn GTC</th>
                                    <th className="px-3 py-1.5 text-center">% GTC</th>
                                    <th className="px-2 py-1.5 text-center">Leadtime</th>
                                    <th className="px-2 py-1.5 text-center">Chuyến Đi</th>
                                    <th className="px-3 py-1.5 text-center">Tồn Đọng</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {rowStaff.map(nv => (
                                    <tr key={nv.maNV} className="hover:bg-orange-50/20">
                                      <td className="px-3 py-1 font-mono text-[11px] font-bold text-slate-500 text-center">{nv.maNV}</td>
                                      <td className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200 text-left">{nv.tenNV}</td>
                                      <td className="px-3 py-1 text-center font-medium">{nv.tongDon.toLocaleString('vi-VN')}</td>
                                      <td className="px-3 py-1 text-center font-bold text-emerald-600">{nv.tongDonGTC.toLocaleString('vi-VN')}</td>
                                      <td className="px-3 py-1 text-center font-black">
                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                                          nv.gtcRate < 65 ? 'bg-red-100 text-red-700' :
                                          nv.gtcRate < 75 ? 'bg-amber-100 text-amber-700' :
                                          'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {nv.gtcRate.toFixed(1)}%
                                        </span>
                                      </td>
                                      <td className="px-2 py-1 text-center font-medium">{nv.leadtime.toFixed(1)}</td>
                                      <td className="px-2 py-1 text-center font-semibold">{nv.chuyenDi}</td>
                                      <td className="px-3 py-1 text-center font-bold text-rose-600">{nv.tonDong.toLocaleString('vi-VN')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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

      {/* =========================================================================
          7. BẢNG SO SÁNH THEO TUẦN VÀ THÁNG CỦA TỪNG BƯU CỤC (MỞ RỘNG CHI TIẾT)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Bảng So Sánh Theo Tuần & Tháng Của Từng Bưu Cục
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi chu kỳ biến động của riêng từng bưu cục theo từng tuần hoặc tháng. Nhấn vào dòng để mở rộng chi tiết các ngày.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chế độ Theo tuần / Theo tháng */}
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-750 p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPoPeriodMode('week')}
                className={`px-3 py-1 rounded-md transition-all ${
                  poPeriodMode === 'week'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Theo tuần
              </button>
              <button
                type="button"
                onClick={() => setPoPeriodMode('month')}
                className={`px-3 py-1 rounded-md transition-all ${
                  poPeriodMode === 'month'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Theo tháng
              </button>
            </div>

            {/* Chọn bưu cục */}
            <select
              value={poPeriodSelectedPo}
              onChange={e => setPoPeriodSelectedPo(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:ring-1 focus:ring-orange-500 focus:outline-none"
            >
              {buuCucOptions.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bảng kỳ vận hành */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="px-3.5 py-2.5">Kỳ Vận Hành ({poPeriodSelectedPo})</th>
                <th className="px-3.5 py-2.5">Khoảng Ngày</th>
                <th className="px-3 py-2.5 text-center">Volume</th>
                <th className="px-3 py-2.5 text-center">SLĐ Gán</th>
                <th className="px-2.5 py-2.5 text-center">% Gán</th>
                <th className="px-3 py-2.5 text-center">SLĐ GTC</th>
                <th className="px-3 py-2.5 text-center">% GTC (Chuẩn)</th>
                <th className="px-2.5 py-2.5 text-center">Leadtime (h)</th>
                <th className="px-3 py-2.5 text-center">Tồn Đọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {poPeriodicMetrics.map(p => {
                const isExpanded = expandedPoPeriodKey === p.key;

                return (
                  <React.Fragment key={p.key}>
                    <tr 
                      onClick={() => setExpandedPoPeriodKey(isExpanded ? null : p.key)}
                      className={`hover:bg-orange-50/40 dark:hover:bg-slate-750 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-orange-50/60 dark:bg-slate-750/90 font-semibold border-l-4 border-orange-500' : ''
                      }`}
                    >
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{p.label}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500 font-medium">{p.dateRange}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900 dark:text-white">{p.volume.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 font-medium">{p.sldGan.toLocaleString('vi-VN')}</td>
                      <td className="px-2.5 py-2.5 text-center font-bold text-blue-600">{p.assignedRate.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{p.sldGTC.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2.5 text-center font-black">
                        <span className={`px-2 py-0.5 rounded-full inline-flex items-center justify-center ${
                          p.gtcRate < 62 ? 'bg-red-100 text-red-700' :
                          p.gtcRate < 67 ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.gtcRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-medium">{p.leadtime.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-rose-600">{p.tonDong.toLocaleString('vi-VN')}</td>
                    </tr>

                    {/* Mở rộng chi tiết ngày của bưu cục trong kỳ */}
                    {isExpanded && (
                      <tr className="bg-slate-50/95 dark:bg-slate-900/95 border-b-2 border-orange-300">
                        <td colSpan={9} className="p-3">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-orange-200 dark:border-slate-700 space-y-2">
                            <span className="font-bold text-xs text-orange-600">
                              Chi tiết từng ngày của {poPeriodSelectedPo} trong {p.label} ({p.dates.length} ngày)
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              {p.dates.map(d => {
                                const dayRows = dataset.gtcBuuCuc.filter(r => r.buuCuc === poPeriodSelectedPo && r.ngay === d);
                                const dVol = dayRows.reduce((acc, r) => acc + (r.volume || 0), 0);
                                const dGtc = dayRows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
                                const dRate = dVol > 0 ? (dGtc / dVol) * 100 : 0;
                                return (
                                  <div key={d} className="p-2 rounded bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{d}</div>
                                    <div className="text-[11px] text-slate-500">Volume: <strong>{dVol}</strong> đơn</div>
                                    <div className="text-[11px] font-bold text-emerald-600">%GTC: {dRate.toFixed(1)}%</div>
                                  </div>
                                );
                              })}
                            </div>
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

      {/* =========================================================================
          8. KHU VỰC CẢNH BÁO ĐIỀU HÀNH CHUYÊN SÂU (3 BẢNG CẢNH BÁO ĐỘC LẬP)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            Hệ Thống Cảnh Báo & Giám Sát Bất Thường Nhân Viên Bưu Cục
          </h3>
        </div>

        {/* CẢNH BÁO 1: NHÂN VIÊN PHÁT SINH >= 3 NGÀY KHÔNG CÓ GÁN GIAO TRONG TUẦN */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-800/60 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 dark:border-slate-700 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                  Cảnh Báo: Nhân Viên Có 3 Ngày Không Gán Giao Trong Tuần
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Nhận diện bưu tá nghỉ đột xuất, không nhận ca hoặc chuyên cần bất thường trong tuần được chọn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={alert1Po}
                onChange={e => setAlert1Po(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 text-xs rounded-lg px-2 py-1 font-semibold"
              >
                <option value="all">Tất cả bưu cục</option>
                {buuCucOptions.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>

              <select
                value={alert1WeekKey}
                onChange={e => setAlert1WeekKey(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 text-xs rounded-lg px-2 py-1 font-semibold"
              >
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {alert1Data.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300">Báo Cáo Tốt!</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Không có nhân viên nào phát sinh $\ge$ 3 ngày không gán giao trong tuần này. Tỷ lệ chuyên cần toàn diện.
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-amber-200 dark:border-amber-900/50">
              <table className="w-full text-xs text-left">
                <thead className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-center">Mã NV</th>
                    <th className="px-3 py-2">Họ & Tên Nhân Viên</th>
                    <th className="px-3 py-2 text-center">Bưu Cục</th>
                    <th className="px-3 py-2 text-center text-red-600 font-black">Số Ngày Không Gán</th>
                    <th className="px-3 py-2 text-center">Tổng Đơn Tuần</th>
                    <th className="px-3 py-2 text-center">GTC Tuần</th>
                    <th className="px-3 py-2 text-center">Hành Động Khuyến Nghị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-slate-750">
                  {alert1Data.map(emp => {
                    const isExp = expandedAlert1NvKey === emp.maNV;
                    return (
                      <React.Fragment key={emp.maNV}>
                        <tr 
                          onClick={() => setExpandedAlert1NvKey(isExp ? null : emp.maNV)}
                          className="hover:bg-amber-50/50 cursor-pointer"
                        >
                          <td className="px-3 py-2 font-mono font-bold text-slate-600 text-center">{emp.maNV}</td>
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5 text-amber-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{emp.tenNV}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-center">{emp.buuCuc}</td>
                          <td className="px-3 py-2 text-center font-black text-rose-600">
                            {emp.zeroDaysCount} ngày
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{emp.totalAssigned} đơn</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-600">{emp.totalGtc} đơn</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Kiểm tra lịch trực
                            </span>
                          </td>
                        </tr>

                        {isExp && (
                          <tr className="bg-amber-50/40">
                            <td colSpan={7} className="p-3">
                              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Chi tiết đơn gán giao từng ngày trong tuần của {emp.tenNV}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {emp.dayDetails.map(d => (
                                  <div key={d.date} className={`px-2.5 py-1 rounded text-xs border ${
                                    d.assigned === 0 ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'bg-white border-slate-200 text-slate-700'
                                  }`}>
                                    <span>{d.date}: </span>
                                    <span>{d.assigned === 0 ? '0 đơn (Không gán)' : `${d.assigned} đơn`}</span>
                                  </div>
                                ))}
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
          )}
        </div>

        {/* CẢNH BÁO 2: TOP NHÂN VIÊN CÓ SLĐ GÁN < 30 ĐƠN VÀ SLĐ GTC < 20 ĐƠN */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-rose-300 dark:border-rose-800/60 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 dark:border-slate-700 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600 animate-pulse" />
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wide">
                  Cảnh Báo: Top Nhân Viên Năng Suất Thấp (SLĐ Gán &lt; 30 Đơn &amp; SLĐ GTC &lt; 20 Đơn)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Nhân viên có sản lượng đơn gán và giao thành công dưới ngưỡng vận hành tối thiểu của GHN.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={alert2Po}
                onChange={e => setAlert2Po(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 text-xs rounded-lg px-2 py-1 font-semibold"
              >
                <option value="all">Tất cả bưu cục</option>
                {buuCucOptions.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>

              <select
                value={alert2WeekKey}
                onChange={e => setAlert2WeekKey(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 text-xs rounded-lg px-2 py-1 font-semibold"
              >
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {alert2Data.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300">Báo Cáo Tốt!</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Không có nhân viên nào có SLĐ gán &lt; 30 và GTC &lt; 20 đơn trong tuần này. Toàn bộ bưu tá đều đạt định mức.
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-rose-200 dark:border-rose-900/50">
              <table className="w-full text-xs text-left">
                <thead className="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-center">Mã NV</th>
                    <th className="px-3 py-2">Họ & Tên Nhân Viên</th>
                    <th className="px-3 py-2 text-center">Bưu Cục</th>
                    <th className="px-3 py-2 text-center font-black text-rose-600">SLĐ Gán Tuần</th>
                    <th className="px-3 py-2 text-center font-black text-rose-600">SLĐ GTC Tuần</th>
                    <th className="px-3 py-2 text-center">Tồn Đọng</th>
                    <th className="px-3 py-2 text-center">Số Ngày Đi Làm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {alert2Data.map(emp => {
                    const isExp = expandedAlert2NvKey === emp.maNV;
                    return (
                      <React.Fragment key={emp.maNV}>
                        <tr 
                          onClick={() => setExpandedAlert2NvKey(isExp ? null : emp.maNV)}
                          className="hover:bg-rose-50/50 cursor-pointer"
                        >
                          <td className="px-3 py-2 font-mono font-bold text-slate-600 text-center">{emp.maNV}</td>
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5 text-rose-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{emp.tenNV}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-center">{emp.buuCuc}</td>
                          <td className="px-3 py-2 text-center font-black text-rose-600">{emp.tongDon} đơn</td>
                          <td className="px-3 py-2 text-center font-black text-rose-600">{emp.tongDonGTC} đơn</td>
                          <td className="px-3 py-2 text-center text-rose-600 font-medium">{emp.tonDong}</td>
                          <td className="px-3 py-2 text-center">{emp.daysWorked} ngày</td>
                        </tr>

                        {isExp && (
                          <tr className="bg-rose-50/30">
                            <td colSpan={7} className="p-3">
                              <div className="text-[11px] font-semibold text-slate-700 mb-1">
                                Chi tiết đơn theo ngày của {emp.tenNV}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {emp.dailyRecords.map(d => (
                                  <div key={d.date} className="px-2 py-1 rounded bg-white border border-slate-200 text-xs">
                                    <span className="font-bold">{d.date}: </span>
                                    <span>Gán: {d.don} | GTC: {d.gtc}</span>
                                  </div>
                                ))}
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
          )}
        </div>

        {/* CẢNH BÁO 3: TOP NHÂN VIÊN CÓ TỶ LỆ GTC THẤP THEO TỪNG BƯU CỤC */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-purple-300 dark:border-purple-800/60 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 dark:border-slate-700 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wide">
                  Cảnh Báo: Top Nhân Viên Có Tỷ Lệ GTC Thấp Theo Bưu Cục (&lt; 65%)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Danh sách nhân viên giao không đạt chuẩn KPI %GTC, cần Area Manager và Trưởng bưu cục hỗ trợ tuyến đường.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={alert3Po}
                onChange={e => setAlert3Po(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 text-xs rounded-lg px-2 py-1 font-semibold"
              >
                <option value="all">Tất cả bưu cục</option>
                {buuCucOptions.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>

              <select
                value={alert3WeekKey}
                onChange={e => setAlert3WeekKey(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 text-xs rounded-lg px-2 py-1 font-semibold"
              >
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {alert3Data.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300">Báo Cáo Tốt!</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Toàn bộ nhân viên đều đạt tỷ lệ GTC trên 65% trong tuần này. Hiệu suất giao hàng ổn định.
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-purple-200 dark:border-purple-900/50">
              <table className="w-full text-xs text-left">
                <thead className="bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-center">Mã NV</th>
                    <th className="px-3 py-2">Họ & Tên Nhân Viên</th>
                    <th className="px-3 py-2 text-center">Bưu Cục</th>
                    <th className="px-3 py-2 text-center">Tổng Đơn Gán</th>
                    <th className="px-3 py-2 text-center">Tổng Đơn GTC</th>
                    <th className="px-3 py-2 text-center font-black text-rose-600">% GTC (Chuẩn NV)</th>
                    <th className="px-3 py-2 text-center">Tồn Đọng</th>
                    <th className="px-3 py-2 text-center">Đánh Giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {alert3Data.map(emp => {
                    const isExp = expandedAlert3NvKey === emp.maNV;
                    return (
                      <React.Fragment key={emp.maNV}>
                        <tr 
                          onClick={() => setExpandedAlert3NvKey(isExp ? null : emp.maNV)}
                          className="hover:bg-purple-50/50 cursor-pointer"
                        >
                          <td className="px-3 py-2 font-mono font-bold text-slate-600 text-center">{emp.maNV}</td>
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5 text-purple-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{emp.tenNV}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-center">{emp.buuCuc}</td>
                          <td className="px-3 py-2 text-center font-medium">{emp.tongDon} đơn</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-600">{emp.tongDonGTC} đơn</td>
                          <td className="px-3 py-2 text-center font-black text-rose-600">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold inline-flex items-center justify-center">
                              {emp.gtcRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-rose-600">{emp.tonDong}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Cần hỗ trợ tuyến
                            </span>
                          </td>
                        </tr>

                        {isExp && (
                          <tr className="bg-purple-50/30">
                            <td colSpan={8} className="p-3">
                              <div className="text-[11px] font-semibold text-slate-700 mb-1">
                                Biến động %GTC từng ngày của {emp.tenNV}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {emp.dailyRecords.map(d => (
                                  <div key={d.date} className="px-2 py-1 rounded bg-white border border-slate-200 text-xs">
                                    <span className="font-bold">{d.date}: </span>
                                    <span>GTC: {d.gtc}/{d.don} </span>
                                    <strong className={d.rate < 65 ? 'text-red-600' : 'text-emerald-600'}>
                                      ({d.rate.toFixed(1)}%)
                                    </strong>
                                  </div>
                                ))}
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
          )}
        </div>
      </div>

      {/* 9. BẢNG CHI TIẾT GTC BƯU CỤC (TỪNG CA VẬN HÀNH & NGÀY VẬN HÀNH) */}
      <div ref={detailedTableRef} className="scroll-mt-24">
        <DataTable<GtcPostOfficeRecord>
          columns={columns}
          data={detailedTableData}
          title="Bảng Chi Tiết GTC Bưu Cục"
          subtitle="Hiển thị chi tiết từng ca vận hành (Hàng mới ca 1, ca 2, hàng tồn) theo từng bưu cục và từng ngày"
          exportFilename="gtc_buu_cuc_chi_tiet_ghn"
          pageSizeDefault={15}
          keyExtractor={(r, idx) => `${r.buuCuc}_${r.loaiHang}_${r.time}_${r.ngay}_${idx}`}
          filterBar={
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Bộ Lọc: Bưu Cục, Loại Hàng & Thời Gian
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (Lọc trực tiếp dữ liệu bảng chi tiết)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    Hiển thị: <strong>{detailedTableData.length}</strong> / {dataset.gtcBuuCuc.length} ca vận hành
                  </span>
                  {(dtFilterBuuCuc !== 'all' || dtFilterLoaiHang !== 'all' || dtFilterMonth !== 'all' || dtFilterWeek !== 'all' || dtFilterDate !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetDetailedFilter}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50"
                      title="Đặt lại tất cả các bộ lọc của bảng"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa lọc</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                {/* 1. Bưu Cục */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                  </label>
                  <select
                    value={dtFilterBuuCuc}
                    onChange={e => setDtFilterBuuCuc(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">Tất cả bưu cục (5 BC)</option>
                    {buuCucOptions.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Loại Hàng */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-500" /> Loại Hàng:
                  </label>
                  <select
                    value={dtFilterLoaiHang}
                    onChange={e => setDtFilterLoaiHang(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">Tất cả loại hàng</option>
                    {loaiHangOptions.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Thời gian: Tháng */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" /> Thời gian (Tháng):
                  </label>
                  <select
                    value={dtFilterMonth}
                    onChange={e => {
                      setDtFilterMonth(e.target.value);
                      setDtFilterWeek('all');
                      setDtFilterDate('all');
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">Tất cả các tháng</option>
                    {availableMonths.map(m => (
                      <option key={m.key} value={m.key}>{m.label} ({m.dates.length} ngày)</option>
                    ))}
                  </select>
                </div>

                {/* 4. Thời gian: Tuần */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-500" /> Thời gian (Tuần):
                  </label>
                  <select
                    value={dtFilterWeek}
                    onChange={e => {
                      setDtFilterWeek(e.target.value);
                      setDtFilterDate('all');
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">Tất cả các tuần</option>
                    {availableWeeks.map(w => (
                      <option key={w.key} value={w.key}>{w.label} ({w.dates.length} ngày)</option>
                    ))}
                  </select>
                </div>

                {/* 5. Thời gian: Ngày vận hành (Cột J) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-rose-500" /> Thời gian (Ngày):
                  </label>
                  <select
                    value={dtFilterDate}
                    onChange={e => setDtFilterDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">Tất cả các ngày</option>
                    {allUniqueDatesDesc.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          }
          renderExpandedRow={(row) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="font-bold text-xs text-orange-600">
                  Chi tiết ngày vận hành: {row.buuCuc} — {row.ngay} ({row.thu})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Ca hàng: {row.loaiHang} | Time: {row.time || '-'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400">Hiệu suất GTC ca này:</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">{row.tiLeGTC}</div>
                  <div className="text-[10px] text-slate-400">{row.sldGTC} / {row.volume} đơn</div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400">Tỷ lệ gán bưu tá:</div>
                  <div className="text-sm font-bold text-blue-600 mt-0.5">{row.tiLeGan}</div>
                  <div className="text-[10px] text-slate-400">{row.sldGan} đơn đã gán</div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400">Tỷ lệ chuyển trả:</div>
                  <div className="text-sm font-bold text-amber-600 mt-0.5">{row.tiLeChuyenTra}</div>
                  <div className="text-[10px] text-slate-400">Đơn hàng luân chuyển trả</div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400">Tồn đọng cuối ca:</div>
                  <div className="text-sm font-bold text-rose-600 mt-0.5">{row.tonDong} đơn</div>
                  <div className="text-[10px] text-slate-400">Chuyển sang ca tiếp theo</div>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
    </div>
  );
};

export default GtcPostOfficeTab;
