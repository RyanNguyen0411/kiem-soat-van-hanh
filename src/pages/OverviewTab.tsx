import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Coins, 
  Users, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert,
  Flame,
  ChevronRight,
  ChevronDown,
  Calendar,
  RotateCcw,
  Filter,
  X,
  Check,
  FileSpreadsheet,
  Target,
  Compass,
  HeartPulse
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { 
  calculateOverviewKPIs, 
  calculatePostOfficeSummaries, 
  calculateEmployeeSummaries, 
  calculateDailyTrends
} from '../services/kpiEngine';
import { PeriodicComparisonSection } from '../components/common/PeriodicComparisonSection';
import { 
  sortDatesDesc, 
  extractMonths, 
  extractWeeks 
} from '../utils/dateEngine';

export const OverviewTab: React.FC = () => {
  const { 
    dataset, 
    setActiveTab, 
    navigateToTab, 
    selectedBuuCucGlobal, 
    setSelectedBuuCucGlobal 
  } = useDashboard();
  const [selectedBuuCuc, setSelectedBuuCuc] = useState<string | null>(null);

  // =========================================================================
  // UNIFIED GLOBAL FILTER STATE CHO TOÀN BỘ DATA TRONG TASK TỔNG QUAN
  // =========================================================================
  const [filterBuuCuc, setFilterBuuCuc] = useState<string>(() => selectedBuuCucGlobal || 'all');

  // Tự động đồng bộ khi chuyển tab với bưu cục được chọn từ các task khác
  useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterBuuCuc(selectedBuuCucGlobal);
    }
  }, [selectedBuuCucGlobal]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterDates, setFilterDates] = useState<string[]>([]);
  const [filterLoaiHang, setFilterLoaiHang] = useState<string>('all');

  // Popover dạng sổ tick chọn ngày
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Tự động thu gọn popover ngày khi nhấn ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    if (isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen]);

  // Extract all available dates sorted from newest to oldest (Gần nhất -> Xa nhất)
  const allUniqueDatesDesc = useMemo(() => {
    const rawDates = dataset.gtcBuuCuc.map(r => r.ngay).filter(Boolean);
    const unique = [...new Set(rawDates)];
    return sortDatesDesc(unique); // Newest to oldest
  }, [dataset.gtcBuuCuc]);

  // Extract available months and weeks
  const availableMonths = useMemo(() => {
    return extractMonths(allUniqueDatesDesc);
  }, [allUniqueDatesDesc]);

  const availableWeeks = useMemo(() => {
    return extractWeeks(allUniqueDatesDesc);
  }, [allUniqueDatesDesc]);

  // Handle Month Selection
  const handleSelectMonth = (monthKey: string) => {
    setFilterMonth(monthKey);
    setFilterWeek('all'); // reset week
    setFilterDates([]); // clear custom date ticks
  };

  // Handle Week Selection
  const handleSelectWeek = (weekKey: string) => {
    setFilterWeek(weekKey);
    setFilterDates([]); // clear custom date ticks
  };

  // Toggle single date tick
  const handleToggleDate = (dateStr: string) => {
    setFilterDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  // Reset all filters to default
  const handleResetAllFilters = () => {
    setFilterBuuCuc('all');
    setFilterMonth('all');
    setFilterWeek('all');
    setFilterDates([]);
    setFilterLoaiHang('all');
    setIsDatePickerOpen(false);
  };

  // Check if any filter is actively applied
  const isFilterActive = useMemo(() => {
    return (
      filterBuuCuc !== 'all' ||
      filterMonth !== 'all' ||
      filterWeek !== 'all' ||
      filterDates.length > 0 ||
      filterLoaiHang !== 'all'
    );
  }, [filterBuuCuc, filterMonth, filterWeek, filterDates, filterLoaiHang]);

  // Calculate Effective Dates based on priority: Custom ticked dates > Week dates > Month dates > All
  const effectiveDates = useMemo(() => {
    if (filterDates.length > 0) return filterDates;
    if (filterWeek !== 'all') {
      const w = availableWeeks.find(x => x.key === filterWeek);
      if (w) return w.dates;
    }
    if (filterMonth !== 'all') {
      const m = availableMonths.find(x => x.key === filterMonth);
      if (m) return m.dates;
    }
    return []; // Empty means all available dates
  }, [filterDates, filterWeek, filterMonth, availableWeeks, availableMonths]);

  // Filter options for dropdowns
  const buuCucOptions = useMemo(() => {
    const list = [...new Set(dataset.gtcBuuCuc.map(r => r.buuCuc))].filter(Boolean);
    return list;
  }, [dataset.gtcBuuCuc]);

  const loaiHangOptions = useMemo(() => {
    const list = [...new Set(dataset.gtcBuuCuc.map(r => r.loaiHang))].filter(Boolean);
    return list;
  }, [dataset.gtcBuuCuc]);

  // Apply filters uniformly to all datasets in Overview Tab
  const filteredGtcBc = useMemo(() => {
    return dataset.gtcBuuCuc.filter(r => {
      if (filterBuuCuc !== 'all' && r.buuCuc !== filterBuuCuc) return false;
      if (effectiveDates.length > 0 && !effectiveDates.includes(r.ngay)) return false;
      if (filterLoaiHang !== 'all' && r.loaiHang !== filterLoaiHang) return false;
      return true;
    });
  }, [dataset.gtcBuuCuc, filterBuuCuc, effectiveDates, filterLoaiHang]);

  const filteredGtcNv = useMemo(() => {
    return dataset.gtcNhanVien.filter(r => {
      if (filterBuuCuc !== 'all' && r.buuCuc !== filterBuuCuc) return false;
      if (effectiveDates.length > 0 && !effectiveDates.includes(r.ngay)) return false;
      return true;
    });
  }, [dataset.gtcNhanVien, filterBuuCuc, effectiveDates]);

  const filteredHh = useMemo(() => {
    return dataset.hoaHongNgay.filter(r => {
      if (filterBuuCuc !== 'all' && r.tenBC !== filterBuuCuc) return false;
      if (effectiveDates.length > 0 && !effectiveDates.includes(r.ngay)) return false;
      return true;
    });
  }, [dataset.hoaHongNgay, filterBuuCuc, effectiveDates]);

  const filteredGlt = useMemo(() => {
    return dataset.tonDongGlt.filter(r => {
      if (filterBuuCuc !== 'all' && r.buuCuc !== filterBuuCuc) return false;
      return true;
    });
  }, [dataset.tonDongGlt, filterBuuCuc]);

  const filteredLc = useMemo(() => {
    return dataset.tonDongLc.filter(r => {
      if (filterBuuCuc !== 'all' && r.tenBC !== filterBuuCuc) return false;
      return true;
    });
  }, [dataset.tonDongLc, filterBuuCuc]);

  // Compute KPIs
  const kpis = useMemo(() => {
    return calculateOverviewKPIs(filteredGtcBc, filteredGtcNv, filteredHh, filteredGlt, filteredLc);
  }, [filteredGtcBc, filteredGtcNv, filteredHh, filteredGlt, filteredLc]);

  const poSummaries = useMemo(() => {
    return calculatePostOfficeSummaries(filteredGtcBc, filteredHh, filteredGlt, filteredLc);
  }, [filteredGtcBc, filteredHh, filteredGlt, filteredLc]);

  const empSummaries = useMemo(() => {
    return calculateEmployeeSummaries(filteredGtcNv, filteredHh);
  }, [filteredGtcNv, filteredHh]);

  // =========================================================================
  // MA TRẬN SỨC KHỎE VẬN HÀNH TOÀN DIỆN 5 BƯU CỤC (OPERATIONAL BALANCED SCORECARD)
  // LOGIC CHUYÊN SÂU DATA ANALYST: TỔNG HỢP GTC, TỒN KHO, NHÂN SỰ, CA 2
  // =========================================================================
  const operationalScorecard = useMemo(() => {
    const targetPos = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];

    return targetPos.map(po => {
      const poGtc = filteredGtcBc.filter(r => r.buuCuc === po);
      const poGlt = filteredGlt.filter(r => r.buuCuc === po);
      const poLc = filteredLc.filter(r => r.tenBC === po);
      const poNs = dataset.nhanSu.filter(r => r.buuCuc === po);
      const poGtcNv = filteredGtcNv.filter(r => r.buuCuc === po);

      const totalVol = poGtc.reduce((a, b) => a + (b.volume || 0), 0);
      const totalGan = poGtc.reduce((a, b) => a + (b.sldGan || 0), 0);
      const totalGtc = poGtc.reduce((a, b) => a + (b.sldGTC || 0), 0);
      const gtcRate = totalVol > 0 ? (totalGtc / totalVol) * 100 : 0;
      const assignedRate = totalVol > 0 ? (totalGan / totalVol) * 100 : 0;
      const gtcGap = gtcRate - 70; // So sánh với mục tiêu chuẩn GHN 70%

      const gltCount = poGlt.length;
      const lcCount = poLc.length;
      const totalBacklog = gltCount + lcCount;
      const backlogRate = totalVol > 0 ? (totalBacklog / totalVol) * 100 : 0;

      // Nhân sự
      const totalStaff = poNs.length;
      const activeStaffInPeriod = new Set(poGtcNv.map(r => r.maNV)).size;
      const attendanceRate = totalStaff > 0 ? Math.min(100, (activeStaffInPeriod / totalStaff) * 100) : 0;

      // Ca 2
      const ca2Records = poGtc.filter(r => r.loaiHang === 'Hàng Mới Ca 2');
      const ca2Vol = ca2Records.reduce((a, b) => a + (b.volume || 0), 0);
      const ca2Gtc = ca2Records.reduce((a, b) => a + (b.sldGTC || 0), 0);
      const ca2Rate = ca2Vol > 0 ? (ca2Gtc / ca2Vol) * 100 : 0;

      // Điểm sức khỏe vận hành tổng hợp (0 - 100)
      const gtcScore = Math.min(45, (gtcRate / 70) * 45);
      const backlogScore = Math.max(0, 25 - (backlogRate * 3.5));
      const ganScore = Math.min(15, (assignedRate / 95) * 15);
      const ca2Score = Math.min(15, (ca2Rate / 60) * 15);
      const healthScore = Math.min(100, Math.max(0, Math.round(gtcScore + backlogScore + ganScore + ca2Score)));

      let tier: 'A' | 'B' | 'C' | 'D' = 'B';
      let tierLabel = 'Hạng B • Ổn Định';
      let tierBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700';

      if (healthScore >= 75) {
        tier = 'A';
        tierLabel = 'Hạng A • Xuất Sắc';
        tierBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      } else if (healthScore >= 65) {
        tier = 'B';
        tierLabel = 'Hạng B • Ổn Định';
        tierBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      } else if (healthScore >= 55) {
        tier = 'C';
        tierLabel = 'Hạng C • Cần Cải Thiện';
        tierBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      } else {
        tier = 'D';
        tierLabel = 'Hạng D • Báo Động';
        tierBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      }

      // Phân loại Phân Vùng 4 Ô Chiến Lược (Strategic Quadrant)
      const isHighVol = totalVol >= 48000;
      const isHighGtc = gtcRate >= 66;

      let quadrant = '';
      let quadrantDesc = '';
      let actionDirective = '';

      if (isHighVol && isHighGtc) {
        quadrant = 'Khu Vực Dẫn Đầu (Leader)';
        quadrantDesc = 'Sản lượng lớn, tỷ lệ giao tốt. Bưu cục trụ cột của khu vực.';
        actionDirective = 'Duy trì năng suất, kiểm soát tồn cuối ngày.';
      } else if (isHighVol && !isHighGtc) {
        quadrant = 'Điểm Nghẽn Tải (Bottleneck)';
        quadrantDesc = 'Sản lượng quá tải, tồn kho cao dẫn tới tỷ lệ GTC bị kéo giảm.';
        actionDirective = 'Cần tăng tốc độ gán hàng mới Ca 2, san tải tuyến và hỗ trợ bưu tá.';
      } else if (!isHighVol && isHighGtc) {
        quadrant = 'Tinh Gọn (Agile / Efficient)';
        quadrantDesc = 'Tuyến giao gọn gàng, tỷ lệ hoàn tất cao.';
        actionDirective = 'Có thể hỗ trợ nhận tải hoặc chia sẻ tuyến cho bưu cục lân cận.';
      } else {
        quadrant = 'Cần Giám Sát (At Risk)';
        quadrantDesc = 'Sản lượng trung bình nhưng tỷ lệ hoàn tất chưa đạt chuẩn.';
        actionDirective = 'Rà soát bưu tá OFF, năng lực giao ca 2 và thời gian xử lý đơn.';
      }

      return {
        buuCuc: po,
        totalVol,
        totalGan,
        assignedRate,
        totalGtc,
        gtcRate,
        gtcGap,
        totalBacklog,
        gltCount,
        lcCount,
        backlogRate,
        totalStaff,
        activeStaffInPeriod,
        attendanceRate,
        ca2Vol,
        ca2Gtc,
        ca2Rate,
        healthScore,
        tier,
        tierLabel,
        tierBadge,
        quadrant,
        quadrantDesc,
        actionDirective
      };
    }).sort((a, b) => b.healthScore - a.healthScore);
  }, [filteredGtcBc, filteredGlt, filteredLc, dataset.nhanSu, filteredGtcNv]);

  // DAILY TRENDS (SORTED GẦN NHẤT ĐẾN XA NHẤT)
  const dailyTrends = useMemo(() => {
    return calculateDailyTrends(filteredGtcBc, filteredHh);
  }, [filteredGtcBc, filteredHh]);

  // CA 2 OPERATIONAL DATA FOR OVERVIEW TAB (GẦN NHẤT ĐẾN XA NHẤT)
  const ca2OperationalData = useMemo(() => {
    const dailyMap: Record<string, {
      ngay: string;
      displayDate: string;
      thu: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
    }> = {};

    dataset.gtcBuuCuc.forEach(r => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return;
      if (filterBuuCuc !== 'all' && r.buuCuc !== filterBuuCuc) return;
      if (effectiveDates.length > 0 && !effectiveDates.includes(r.ngay)) return;

      const d = r.ngay;
      if (!dailyMap[d]) {
        dailyMap[d] = {
          ngay: d,
          displayDate: d.slice(0, 5),
          thu: r.thu || '',
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
        };
      }
      dailyMap[d].volume += r.volume || 0;
      dailyMap[d].sldGan += r.sldGan || 0;
      dailyMap[d].sldGTC += r.sldGTC || 0;
    });

    const list = Object.values(dailyMap).map(item => {
      const chenhLech = Math.max(0, item.volume - item.sldGan);
      const rateGan = item.volume > 0 ? Number(((item.sldGan / item.volume) * 100).toFixed(1)) : 0;
      const rateGtc = item.sldGan > 0 ? Number(((item.sldGTC / item.sldGan) * 100).toFixed(1)) : 0;
      return {
        ...item,
        chenhLech,
        rateGan,
        rateGtc,
      };
    });

    return list.sort((a, b) => {
      const [d1, m1, y1] = a.ngay.split('/').map(Number);
      const [d2, m2, y2] = b.ngay.split('/').map(Number);
      return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    });
  }, [dataset.gtcBuuCuc, filterBuuCuc, effectiveDates]);

  // Ca 2 Total Summary for KPI cards
  const ca2SummaryTotals = useMemo(() => {
    const totalVolume = ca2OperationalData.reduce((acc, r) => acc + r.volume, 0);
    const totalSldGan = ca2OperationalData.reduce((acc, r) => acc + r.sldGan, 0);
    const totalChenhLech = Math.max(0, totalVolume - totalSldGan);
    const totalSldGTC = ca2OperationalData.reduce((acc, r) => acc + r.sldGTC, 0);
    const rateGan = totalVolume > 0 ? (totalSldGan / totalVolume) * 100 : 0;
    const rateGtc = totalSldGan > 0 ? (totalSldGTC / totalSldGan) * 100 : 0;

    return {
      totalVolume,
      totalSldGan,
      totalChenhLech,
      totalSldGTC,
      rateGan,
      rateGtc
    };
  }, [ca2OperationalData]);

  // Aging distribution for chart 8
  const agingData = useMemo(() => {
    const buckets: Record<string, number> = {
      '0_6h (Mới)': 0,
      '6_12h': 0,
      '12_24h': 0,
      '24_48h': 0,
      '48_72h': 0,
      '72_120h (Cảnh báo)': 0,
      '> 120h (Khẩn cấp)': 0
    };

    dataset.tonDongGlt.forEach(r => {
      const a = r.thoiGianTonDong;
      if (a === '0_6') buckets['0_6h (Mới)']++;
      else if (a === '6_12') buckets['6_12h']++;
      else if (a === '12_24') buckets['12_24h']++;
      else if (a === '24_36' || a === '36_48') buckets['24_48h']++;
      else if (a === '48_72') buckets['48_72h']++;
      else if (a === '72_96' || a === '96_120') buckets['72_120h (Cảnh báo)']++;
      else if (a === '120_192' || a === '192') buckets['> 120h (Khẩn cấp)']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [dataset.tonDongGlt]);

  const AGING_COLORS = ['#10B981', '#34D399', '#38BDF8', '#FBBF24', '#F97316', '#EF4444', '#991B1B'];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* =========================================================================
          CỐ ĐỊNH & THU GỌN: HEADER ĐIỀU HÀNH & BỘ LỌC TOÀN DIỆN CHO TASK TỔNG QUAN
          ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-md border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-3.5 py-2 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Cụm Tiêu Đề Gọn Nhẹ */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
              <h2 className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap">
                BẢNG ĐIỀU HÀNH TỔNG HỢP KHU VỰC
              </h2>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 rounded-md shrink-0">
              {filterBuuCuc === 'all' ? '6 Bưu cục Long An' : filterBuuCuc}
            </span>
          </div>

          {/* Cụm Bộ Lọc Inline Thu Gọn (1 Hàng Tiện Ích) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
              <Filter className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Lọc:</span>
            </div>

            {/* 1. Lọc Bưu Cục */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] hidden lg:inline">BC:</span>
              <select
                value={filterBuuCuc}
                onChange={e => {
                  const val = e.target.value;
                  setFilterBuuCuc(val);
                  setSelectedBuuCucGlobal(val);
                }}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer shadow-2xs"
                title="Lọc theo bưu cục"
              >
                <option value="all">Tất cả 5 bưu cục</option>
                {buuCucOptions.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Lọc Tháng */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] hidden lg:inline">Tháng:</span>
              <select
                value={filterMonth}
                onChange={e => handleSelectMonth(e.target.value)}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer shadow-2xs"
                title="Lọc theo tháng"
              >
                <option value="all">Tất cả các tháng</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.dates.length} ngày)
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Lọc Tuần */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] hidden lg:inline">Tuần:</span>
              <select
                value={filterWeek}
                onChange={e => handleSelectWeek(e.target.value)}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer shadow-2xs"
                title="Lọc theo tuần"
              >
                <option value="all">Tất cả các tuần</option>
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>
                    {w.label} ({w.dates.length} ngày)
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Dropdown Dạng Sổ: Tick Chọn Ngày Vận Hành */}
            <div className="relative inline-block text-left" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  filterDates.length > 0
                    ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-900 dark:text-orange-200 ring-1 ring-orange-500 font-bold'
                    : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:bg-white'
                }`}
                title="Nhấn để mở danh sách dạng sổ và tick chọn ngày"
              >
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {filterDates.length === 0
                    ? effectiveDates.length > 0 && effectiveDates.length < allUniqueDatesDesc.length
                      ? `${effectiveDates.length} ngày`
                      : 'Tất cả các ngày'
                    : `Đã tick ${filterDates.length} ngày`}
                </span>
                {filterDates.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-600 text-white shrink-0">
                    {filterDates.length}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDatePickerOpen ? 'rotate-180 text-orange-600' : ''}`} />
              </button>

              {/* Menu Dạng Sổ Xuống */}
              {isDatePickerOpen && (
                <div className="absolute right-0 sm:left-0 mt-1.5 w-[320px] sm:w-[480px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                        Tick Chọn Ngày Vận Hành
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Gần nhất &rarr; Xa nhất)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                      title="Đóng bảng sổ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Nút hành động nhanh */}
                  <div className="flex items-center justify-between gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-750 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDates(allUniqueDatesDesc.slice(0, 7));
                          setFilterMonth('all');
                          setFilterWeek('all');
                        }}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-orange-700 dark:text-orange-300 font-semibold hover:border-orange-400 transition-colors cursor-pointer"
                        title="Chọn nhanh 7 ngày gần nhất"
                      >
                        7 ngày gần nhất
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDates([...allUniqueDatesDesc]);
                          setFilterMonth('all');
                          setFilterWeek('all');
                        }}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 font-semibold hover:border-blue-400 transition-colors cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDates([]);
                      }}
                      className="text-slate-500 hover:text-orange-600 dark:text-slate-400 font-medium underline cursor-pointer"
                    >
                      Mặc định (Tất cả)
                    </button>
                  </div>

                  {/* Danh sách các ô tick ngày (Sắp xếp từ ngày gần nhất đến xa nhất) */}
                  <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {allUniqueDatesDesc.map(d => {
                      return (
                        <label
                          key={d}
                          onClick={() => {
                            if (filterDates.length === 0) {
                              setFilterDates([d]);
                              setFilterMonth('all');
                              setFilterWeek('all');
                            } else {
                              handleToggleDate(d);
                            }
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            filterDates.includes(d)
                              ? 'bg-orange-500 text-white font-bold border-orange-600 shadow-2xs'
                              : filterDates.length === 0
                              ? 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-orange-300'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={filterDates.length === 0 ? false : filterDates.includes(d)}
                            onChange={() => {}}
                            className="sr-only"
                          />
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            filterDates.includes(d)
                              ? 'bg-white text-orange-600 border-white'
                              : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'
                          }`}>
                            {filterDates.includes(d) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{d}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Lọc Loại Hàng / Ca */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] hidden lg:inline">Ca:</span>
              <select
                value={filterLoaiHang}
                onChange={e => setFilterLoaiHang(e.target.value)}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer shadow-2xs"
                title="Lọc loại hàng / ca"
              >
                <option value="all">Tất cả loại hàng</option>
                {loaiHangOptions.map(lh => (
                  <option key={lh} value={lh}>
                    {lh}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Nút Xóa Lọc Nhanh */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer shadow-2xs"
                title="Xóa tất cả các bộ lọc đang chọn"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operational Alerts Box (Phát hiện điểm nóng vận hành) */}
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
        <div className="flex items-start gap-3">
          <Flame className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 text-xs text-slate-800 dark:text-slate-200 space-y-1.5">
            <div className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-2">
              <span>Cảnh Báo Vận Hành Trọng Yếu Dành Cho Area Manager</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded">Ưu tiên xử lý</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-red-200 dark:border-red-900/50">
                <div className="font-bold text-slate-900 dark:text-white">🔴 Điểm Nóng: Bưu Cục (LAN) Rạch Kiến</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Volume cao nhất (81.229 đơn) nhưng <b>%GTC thấp nhất khu vực (60,11%)</b>. Chiếm tới <b>4.428 đơn tồn GLT (40,5%)</b> và <b>207 đơn tồn LC (72,9%)</b>!
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/50">
                <div className="font-bold text-slate-900 dark:text-white">⚠️ 167 Đơn Tồn Khẩn Cấp Quá Hạn &gt; 120h</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Tại Sheet Tồn đọng GLT có 162 đơn từ 120-192h và 5 đơn &gt; 192h chưa được giải phóng. Cần yêu cầu bưu cục trưởng kiểm tra ngay.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-orange-200 dark:border-orange-900/50">
                <div className="font-bold text-slate-900 dark:text-white">👷 Nhân Viên Hiệu Suất Thấp (&lt; 60% GTC)</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Trần Anh Tuấn (27,5%), Nguyễn Lê Tuấn Anh (57,1%), Lương Trọng Đức (57,7%) tại Rạch Kiến đang có tỷ lệ giao rất thấp, cần đôn đốc lộ trình phát.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 12 Executive KPI Cards Grid (Căn giữa số liệu vận hành & kích thước chuẩn) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Tổng Volume */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng Volume</span>
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 text-center">
            {kpis.totalVolume.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Đơn nhập vận hành</div>
        </div>

        {/* KPI 2: Tổng SLĐ GTC */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng SLĐ GTC</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 text-center">
            {kpis.totalSldGTC.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Giao thành công</div>
        </div>

        {/* KPI 3: %GTC tổng (CHÍNH THỨC) */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-3.5 rounded-xl shadow-md text-center">
          <div className="flex items-center justify-between text-orange-100 text-xs font-bold">
            <span>%GTC TỔNG</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-black mt-1 text-center">
            {kpis.gtcRateTotal.toFixed(2)}%
          </div>
          <div className="text-[10px] text-orange-100 mt-0.5 font-medium text-center">
            SUM(GTC) / SUM(Vol)
          </div>
        </div>

        {/* KPI 4: Tổng SLĐ Gán */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng SLĐ Gán</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 text-center">
            {kpis.totalSldGan.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Đơn đã chia bưu tá</div>
        </div>

        {/* KPI 5: Tỷ lệ Gán */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tỷ Lệ Gán</span>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 text-center">
            {kpis.assignedRateTotal.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Tỷ lệ phân bổ ca</div>
        </div>

        {/* KPI 6: Tỷ lệ chuyển trả */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>% Chuyển Trả</span>
            <ArrowDownRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 text-center">
            {kpis.returnRateTotal.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Trích xuất GTC BC</div>
        </div>

        {/* KPI 7: Tổng Backlog */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng Tồn Đọng</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 text-center">
            {kpis.totalBacklog.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">GLT ({kpis.totalGltBacklog.toLocaleString('vi-VN')}) + LC ({kpis.totalLcBacklog})</div>
        </div>

        {/* KPI 8: Tồn GLT */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tồn GLT</span>
            <Package className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 text-center">
            {kpis.totalGltBacklog.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Giao - Lấy - Trả</div>
        </div>

        {/* KPI 9: Tồn LC */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tồn LC</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 text-center">
            {kpis.totalLcBacklog.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Luân chuyển kho</div>
        </div>

        {/* KPI 10: Tồn quá hạn khẩn cấp */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-red-300 dark:border-red-800 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tồn &gt; 120h</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1 text-center">
            {kpis.urgentOverdueOrders.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Quá hạn khẩn cấp</div>
        </div>

        {/* KPI 11: Tổng Hoa hồng */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng Hoa Hồng</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 text-center">
            {(kpis.totalSalary / 1e9).toFixed(2)} tỷ
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">Tháng 10/2026</div>
        </div>

        {/* KPI 12: Tổng Bưu tá */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Nhân Viên</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 text-center">
            {kpis.activeEmployeesCount} bưu tá
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 text-center">6 Bưu cục hoạt động</div>
        </div>
      </div>

      {/* =========================================================================
          KHU VỰC: CHỈ SỐ & BIỂU ĐỒ HỖN HỢP VẬN HÀNH HÀNG MỚI CA 2 (CỘT + ĐƯỜNG)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Chỉ Số & Biểu Đồ Diễn Biến Vận Hành Hàng Mới Ca 2
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Ca Chiều / Tối
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              So sánh Volume nhập sàn, tiến độ gán ra tuyến, mức độ chênh lệch chưa gán và tỷ lệ giao thành công theo ngày (Gần nhất &rarr; Xa nhất)
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-lg text-amber-800 dark:text-amber-200 text-xs font-semibold self-start sm:self-auto shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span>Mục tiêu vận hành ca: <strong>Độ phủ NV giao Ca 2 ≥ 70% • Tỷ lệ gán ≥ 50% Vol</strong></span>
          </div>
        </div>

        {/* 4 Cards Chỉ số Ca 2 (Căn giữa số liệu & Trực quan theo đúng thiết kế) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Volume nhập Ca 2 */}
          <div className="bg-slate-50/60 dark:bg-slate-750/60 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 relative overflow-hidden text-center">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
              <span>VOLUME NHẬP CA 2</span>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            </div>
            <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 my-1 text-center">
              {ca2SummaryTotals.totalVolume.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Tổng sản lượng ca chiều/tối
            </div>
          </div>

          {/* Card 2: SLĐ đã gán */}
          <div className="bg-slate-50/60 dark:bg-slate-750/60 p-4 rounded-xl border border-orange-100 dark:border-slate-700 relative overflow-hidden text-center">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
              <span>SLĐ ĐÃ GÁN RA TUYẾN</span>
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 my-1 text-center">
              {ca2SummaryTotals.totalSldGan.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Tỷ lệ gán: <strong className={ca2SummaryTotals.rateGan >= 50 ? 'text-emerald-600 font-bold' : 'text-orange-600 font-bold'}>{ca2SummaryTotals.rateGan.toFixed(1)}%</strong> Volume
            </div>
          </div>

          {/* Card 3: Chênh lệch (Chưa gán) */}
          <div className="bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 relative overflow-hidden text-center">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider mb-1">
              <span>CHÊNH LỆCH (CHƯA GÁN)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 my-1 text-center">
              {ca2SummaryTotals.totalChenhLech.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400 text-center">
              {ca2SummaryTotals.totalVolume > 0 ? ((ca2SummaryTotals.totalChenhLech / ca2SummaryTotals.totalVolume) * 100).toFixed(1) : '0'}% Volume ứ tại sàn chia
            </div>
          </div>

          {/* Card 4: Giao thành công (GTC) */}
          <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 relative overflow-hidden text-center">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <span>GIAO THÀNH CÔNG (GTC)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 my-1 text-center">
              {ca2SummaryTotals.totalSldGTC.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400 text-center">
              Đạt <strong className={ca2SummaryTotals.rateGtc >= 70 ? 'font-bold' : 'text-amber-600 font-bold'}>{ca2SummaryTotals.rateGtc.toFixed(1)}%</strong> trên đơn gán
            </div>
          </div>
        </div>

        {/* Biểu đồ Cột kết hợp Đường (ComposedChart: Volume, Gán, GTC & %Gán, %GTC) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Biểu Đồ Ma Trận: Volume, Gán, GTC & Tỷ Lệ Giao Ca 2 Qua Các Ngày
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Hiển thị từ ngày gần nhất &rarr; xa nhất
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={ca2OperationalData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={v => `${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={v => `${v}%`} 
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0]?.payload;
                    if (!item) return null;
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 min-w-[210px]">
                        <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1 flex justify-between">
                          <span>Ngày {item.ngay} ({item.thu})</span>
                          <span className="text-[10px] text-indigo-600 font-bold">Ca 2</span>
                        </div>
                        <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                          <span>Volume nhập:</span>
                          <strong>{item.volume.toLocaleString('vi-VN')} đơn</strong>
                        </div>
                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                          <span>SLĐ đã gán:</span>
                          <strong>{item.sldGan.toLocaleString('vi-VN')} đơn ({item.rateGan}%)</strong>
                        </div>
                        <div className="flex justify-between text-rose-600 dark:text-rose-400">
                          <span>Chênh lệch (chưa gán):</span>
                          <strong>{item.chenhLech.toLocaleString('vi-VN')} đơn</strong>
                        </div>
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>SLĐ GTC:</span>
                          <strong>{item.sldGTC.toLocaleString('vi-VN')} đơn ({item.rateGtc}%)</strong>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] flex items-center justify-between">
                          <span className="text-slate-400">Đánh giá ca:</span>
                          <span className={`font-bold ${item.rateGan >= 50 && item.rateGtc >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {item.rateGan >= 50 && item.rateGtc >= 70 ? '✓ Đạt mục tiêu' : '⚠ Cần thúc đẩy'}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <ReferenceLine 
                  yAxisId="right" 
                  y={50} 
                  stroke="#F97316" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Target Gán ≥50%', fill: '#EA580C', fontSize: 10, position: 'insideTopLeft' }} 
                />
                <ReferenceLine 
                  yAxisId="right" 
                  y={70} 
                  stroke="#10B981" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Target GTC ≥70%', fill: '#059669', fontSize: 10, position: 'insideTopRight' }} 
                />
                <Bar yAxisId="left" dataKey="volume" name="Volume Ca 2" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar yAxisId="left" dataKey="sldGan" name="SLĐ Đã Gán" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar yAxisId="left" dataKey="sldGTC" name="SLĐ GTC" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="rateGan" name="Tỷ lệ gán (% Vol)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="rateGtc" name="% GTC (% Đơn gán)" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 1 Charts: Volume Trend, GTC Trend, and Rate Trend (SẮP XẾP NGÀY GẦN NHẤT ĐẾN XA NHẤT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 1: Xu hướng Volume theo ngày */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1. Xu Hướng Volume Theo Ngày
              </h4>
              <p className="text-[11px] text-slate-400">Từ ngày gần nhất &rarr; xa nhất</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">Đơn</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString('vi-VN')} đơn`, 'Volume']}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                />
                <Bar dataKey="volume" fill="#F26522" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 2: Xu hướng SLĐ GTC theo ngày */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Xu Hướng SLĐ GTC Theo Ngày
              </h4>
              <p className="text-[11px] text-slate-400">Từ ngày gần nhất &rarr; xa nhất</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">Đơn GTC</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends}>
                <defs>
                  <linearGradient id="gtcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString('vi-VN')} đơn`, 'SLĐ GTC']}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                />
                <Area type="monotone" dataKey="sldGTC" stroke="#10B981" strokeWidth={2} fill="url(#gtcGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 3: Xu hướng %GTC tổng theo ngày */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                3. Xu Hướng %GTC Tổng Theo Ngày
              </h4>
              <p className="text-[11px] text-slate-400">Từ ngày gần nhất &rarr; xa nhất</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold">%GTC</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} />
                <YAxis domain={[40, 90]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, '%GTC tổng']}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                />
                <Line type="monotone" dataKey="gtcRate" stroke="#002D72" strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Post Office Comparisons, Backlog, Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 4: So sánh %GTC giữa 6 Bưu cục */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                4. So Sánh %GTC Giữa 6 Bưu Cục
              </h4>
              <p className="text-[11px] text-slate-400">Hiệu suất giao thành công tích lũy</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poSummaries} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="buuCuc" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, '%GTC']} />
                <Bar 
                  dataKey="gtcRate" 
                  radius={[0, 4, 4, 0]}
                  fill="#002D72"
                  onClick={(entry: any) => {
                    if (entry?.buuCuc) setSelectedBuuCuc(entry.buuCuc);
                  }}
                >
                  {poSummaries.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.gtcRate < 62 ? '#EF4444' : entry.gtcRate < 67 ? '#F59E0B' : '#10B981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 7: Tồn GLT và LC theo bưu cục */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                7. Tồn GLT & LC Theo Bưu Cục
              </h4>
              <p className="text-[11px] text-slate-400">Phân loại tồn Giao/Lấy/Trả và Luân chuyển</p>
            </div>
            <span className="text-[10px] text-red-600 font-bold bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded">
              Điểm nóng
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poSummaries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="buuCuc" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
                <Bar dataKey="gltBacklog" name="Tồn GLT" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="lcBacklog" name="Tồn LC" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 8: Cơ cấu tồn đọng theo thời gian (Aging) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                8. Cơ Cấu Tuổi Tồn GLT
              </h4>
              <p className="text-[11px] text-slate-400">Phân bố 10.928 đơn tồn theo khung giờ</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {agingData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} đơn`, 'Số lượng']} />
                <Legend wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 Charts: Volume ranking, Salary breakdown, and Salary vs GTC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 5: Xếp hạng sản lượng 6 bưu cục */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                5. Xếp Hạng Sản Lượng 6 Bưu Cục
              </h4>
              <p className="text-[11px] text-slate-400">Volume tháng 10/2026</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poSummaries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="buuCuc" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} đơn`, 'Volume']} />
                <Bar dataKey="volume" fill="#F26522" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 10: Chi phí hoa hồng theo bưu cục */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                10. Chi Phí Hoa Hồng Theo Bưu Cục
              </h4>
              <p className="text-[11px] text-slate-400">Tổng quỹ lương thực trả (VNĐ)</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poSummaries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="buuCuc" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(0)}tr`} />
                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} VNĐ`, 'Tổng lương']} />
                <Bar dataKey="totalSalary" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ 11: So sánh Hiệu suất (%GTC) vs Chi phí Lương */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                11. Hiệu Suất vs Chi Phí
              </h4>
              <p className="text-[11px] text-slate-400">%GTC so với Ngân sách Lương theo Bưu cục</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={poSummaries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="buuCuc" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(0)}tr`} />
                <YAxis yAxisId="right" orientation="right" domain={[50, 80]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
                <Bar yAxisId="left" dataKey="totalSalary" name="Tổng lương (VNĐ)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="gtcRate" name="%GTC" stroke="#F26522" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Biểu đồ 9 - Xếp hạng Nhân viên Top/Bottom */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              9. Bảng Xếp Hạng Hiệu Suất Bưu Tá (Top & Bottom GTC)
            </h4>
            <p className="text-[11px] text-slate-400">
              Đối chiếu năng suất giao và %GTC của từng nhân viên toàn khu vực
            </p>
          </div>
          <button
            onClick={() => setActiveTab('gtc_nhan_vien')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Xem chi tiết TAB Nhân viên</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top 5 Best Performers */}
          <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 bg-emerald-50/20 dark:bg-emerald-950/20">
            <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center justify-between">
              <span>🏆 Top 5 Bưu Tá Giao Thành Công Cao Nhất</span>
              <span className="text-[10px] text-slate-400">SLĐ GTC</span>
            </h5>
            <div className="space-y-2">
              {empSummaries.slice(0, 5).map((e, idx) => (
                <div key={e.maNV} className="flex items-center justify-between text-xs p-1.5 rounded bg-white dark:bg-slate-800 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{e.tenNV}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({e.buuCuc})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {e.tongDonGTC.toLocaleString('vi-VN')} đơn
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">({e.gtcRate.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 5 Need Support */}
          <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-3 bg-red-50/20 dark:bg-red-950/20">
            <h5 className="text-xs font-bold text-red-700 dark:text-red-400 mb-2 flex items-center justify-between">
              <span>⚠️ Top 5 Bưu Tá Có %GTC Thấp Cần Hỗ Trợ</span>
              <span className="text-[10px] text-slate-400">%GTC</span>
            </h5>
            <div className="space-y-2">
              {empSummaries
                .filter(e => e.tongDon > 100)
                .sort((a, b) => a.gtcRate - b.gtcRate)
                .slice(0, 5)
                .map((e, idx) => (
                  <div key={e.maNV} className="flex items-center justify-between text-xs p-1.5 rounded bg-white dark:bg-slate-800 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{e.tenNV}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({e.buuCuc})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {e.gtcRate.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">({e.tongDonGTC}/{e.tongDon} đơn)</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MA TRẬN SỨC KHỎE VẬN HÀNH TOÀN DIỆN 5 BƯU CỤC (OPERATIONAL BALANCED SCORECARD)
          LOGIC CHUYÊN SÂU DATA ANALYST: TỔNG HỢP GTC, TỒN KHO, NHÂN SỰ, CA 2
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-3 p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <HeartPulse className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Ma Trận Sức Khỏe Vận Hành Toàn Diện 5 Bưu Cục (Operational Balanced Scorecard)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Phân tích đa chiều chuyên sâu Data Analyst: Tỷ lệ GTC chuẩn &bull; Áp lực Tồn kho &bull; Tỷ lệ Chuyên cần theo Task Nhân Sự &bull; Năng suất Ca 2 &amp; Tốc độ giao
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              Chuẩn GHN: GTC &ge; 70% &bull; Tồn &lt; 3%
            </span>
          </div>
        </div>

        {/* 4 Chỉ số KPI Vùng Tổng Hợp */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Điểm Sức Khỏe TB Khu Vực</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{Math.round(operationalScorecard.reduce((acc, p) => acc + p.healthScore, 0) / (operationalScorecard.length || 1))}</span>
              <span className="text-xs text-slate-400 font-semibold">/100 (Hạng B)</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
              3/5 Bưu cục duy trì Hạng B ổn định
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tỷ Lệ GTC Trung Bình</span>
            <div className="text-xl font-black text-orange-600 dark:text-orange-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{kpis.gtcRateTotal.toFixed(2)}%</span>
              <span className="text-xs text-rose-500 font-semibold">(-{(70 - kpis.gtcRateTotal).toFixed(1)}% vs Target)</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
              Mục tiêu toàn diện: 70.0%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tổng Đơn Tồn (GLT + LC)</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {(dataset.tonDongGlt.length + dataset.tonDongLc.length).toLocaleString('vi-VN')}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
              {dataset.tonDongGlt.length.toLocaleString('vi-VN')} GLT &bull; {dataset.tonDongLc.length} Luân chuyển
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Quy Mô Nhân Sự Realtime</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {dataset.nhanSu.length || 81} <span className="text-xs text-slate-400 font-normal">Nhân sự</span>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block">
              Đồng bộ dữ liệu Task Nhân Sự
            </span>
          </div>
        </div>

        {/* Bảng Chi Tiết Ma Trận Sức Khỏe */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Bưu Cục &amp; Xếp Hạng</th>
                <th className="py-2.5 px-3 text-center">Volume &amp; % Gán</th>
                <th className="py-2.5 px-3 text-center">% GTC &amp; Khoảng Cách</th>
                <th className="py-2.5 px-3 text-center">Tồn Đọng (GLT + LC)</th>
                <th className="py-2.5 px-3 text-center">Nhân Sự &amp; Chuyên Cần</th>
                <th className="py-2.5 px-3 text-center">Hiệu Quả Ca 2</th>
                <th className="py-2.5 px-3 text-left">Chỉ Đạo Điều Hành Khuyến Nghị</th>
                <th className="py-2.5 px-3 text-center">Điều Hướng Nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {operationalScorecard.map((item) => (
                <tr key={item.buuCuc} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{item.buuCuc}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${item.tierBadge}`}>
                        {item.tierLabel}
                      </span>
                      <span className="font-mono font-bold text-[11px] text-slate-600 dark:text-slate-400">
                        {item.healthScore}/100đ
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.totalVol.toLocaleString('vi-VN')}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Gán: <strong className="text-blue-600">{item.assignedRate.toFixed(1)}%</strong>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {item.gtcRate.toFixed(2)}%
                    </div>
                    <div className={`text-[10px] font-bold ${item.gtcGap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.gtcGap >= 0 ? `+${item.gtcGap.toFixed(1)}% vượt chuẩn` : `${item.gtcGap.toFixed(1)}% vs chuẩn`}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className={`font-bold ${item.totalBacklog > 2000 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.totalBacklog.toLocaleString('vi-VN')} đơn
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {item.gltCount.toLocaleString('vi-VN')} GLT &bull; {item.lcCount} LC ({item.backlogRate.toFixed(1)}% Vol)
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.totalStaff} NV
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {item.activeStaffInPeriod} NV đi làm ({item.attendanceRate.toFixed(0)}%)
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="font-bold text-indigo-600 dark:text-indigo-400">
                      {item.ca2Rate.toFixed(1)}% GTC
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Vol: {item.ca2Vol.toLocaleString('vi-VN')} đơn
                    </div>
                  </td>

                  <td className="py-3 px-3 text-left max-w-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="font-bold text-orange-600 dark:text-orange-400 mb-0.5 flex items-center gap-1">
                        <Target className="w-3 h-3 shrink-0" />
                        <span>{item.quadrant}</span>
                      </div>
                      <div>{item.actionDirective}</div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col gap-1 w-28 mx-auto">
                      <button
                        onClick={() => navigateToTab('bao_cao_gtc_bc', { buuCuc: item.buuCuc })}
                        className="px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        title={`Xem chi tiết Báo Cáo GTC BC ${item.buuCuc}`}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Báo Cáo BC</span>
                      </button>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => navigateToTab('gtc_nhan_vien', { buuCuc: item.buuCuc })}
                          className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-[9px] font-bold transition-all cursor-pointer"
                          title="Xem Bưu tá"
                        >
                          Bưu tá
                        </button>
                        <button
                          onClick={() => navigateToTab('ton_dong_glt', { buuCuc: item.buuCuc })}
                          className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-[9px] font-bold transition-all cursor-pointer"
                          title="Xem Tồn GLT"
                        >
                          Tồn kho
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MA TRẬN 4 PHÂN VÙNG CHIẾN LƯỢC VẬN HÀNH (4-QUADRANT STRATEGIC OPERATIONS MATRIX)
          TRỤC TỌA ĐỘ: VOLUME (SẢN LƯỢNG) x % GTC (CHẤT LƯỢNG GIAO)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Compass className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Ma Trận Phân Vùng Năng Lực Vận Hành (4-Quadrant Strategic Operations Matrix)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Định vị vị thế vận hành của 5 Bưu cục trên ma trận 2 chiều: Trục Hoành (Sản lượng Volume) &times; Trục Tung (Chất lượng GTC)
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400 self-start sm:self-auto">
            Phân vị chuẩn: Volume trung vị 48K đơn &bull; Ngưỡng GTC chuẩn 66% - 70%
          </span>
        </div>

        {/* 4 Quadrants 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Ô 1: DẪN ĐẦU VẬN HÀNH (High Vol, High GTC) */}
          <div className="p-4 rounded-xl border-2 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
                <span>🏆 PHÂN VÙNG I: DẪN ĐẦU VẬN HÀNH</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                Vol Cao &bull; GTC Cao
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Sản lượng lớn, kiểm soát tốt tỷ lệ hoàn tất. Bưu cục trụ cột giữ nhịp vận hành toàn khu vực.
            </p>
            <div className="space-y-2 pt-1">
              {operationalScorecard.filter(p => p.totalVol >= 48000 && p.gtcRate >= 66).map(po => (
                <div key={po.buuCuc} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{po.buuCuc}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vol: <strong>{po.totalVol.toLocaleString()}</strong> &bull; GTC: <strong className="text-emerald-600">{po.gtcRate.toFixed(1)}%</strong> &bull; Tồn: {po.totalBacklog}
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToTab('bao_cao_gtc_bc', { buuCuc: po.buuCuc })}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
              {operationalScorecard.filter(p => p.totalVol >= 48000 && p.gtcRate >= 66).length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Hiện chưa có bưu cục nào đạt đồng thời Volume &ge; 48K và GTC &ge; 66%
                </div>
              )}
            </div>
          </div>

          {/* Ô 2: ĐIỂM NGHẼN QUÁ TẢI (High Vol, Low GTC) */}
          <div className="p-4 rounded-xl border-2 border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-xs uppercase tracking-wider">
                <span>⚠️ PHÂN VÙNG II: ĐIỂM NGHẼN QUÁ TẢI</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                Vol Cao &bull; GTC Cần Cứu
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Volume dồn ứ cục bộ, tồn GLT tăng cao kéo tỷ lệ hoàn tất giảm. Trọng tâm ưu tiên hỗ trợ nguồn lực của AM Huy!
            </p>
            <div className="space-y-2 pt-1">
              {operationalScorecard.filter(p => p.totalVol >= 48000 && p.gtcRate < 66).map(po => (
                <div key={po.buuCuc} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{po.buuCuc}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vol: <strong>{po.totalVol.toLocaleString()}</strong> &bull; GTC: <strong className="text-amber-600">{po.gtcRate.toFixed(1)}%</strong> &bull; Tồn: <strong className="text-rose-600">{po.totalBacklog}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToTab('bao_cao_gtc_bc', { buuCuc: po.buuCuc })}
                    className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ô 3: TINH GỌN & HIỆU QUẢ (Low Vol, High GTC) */}
          <div className="p-4 rounded-xl border-2 border-sky-300 dark:border-sky-800/80 bg-sky-50/40 dark:bg-sky-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-black text-xs uppercase tracking-wider">
                <span>⚡ PHÂN VÙNG III: TINH GỌN &amp; HIỆU QUẢ</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                Vol Gọn &bull; GTC Cao
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Tuyến giao gọn gàng, xử lý dứt điểm đơn trong ngày. Có dư địa hỗ trợ san sẻ tải cho các bưu cục lân cận.
            </p>
            <div className="space-y-2 pt-1">
              {operationalScorecard.filter(p => p.totalVol < 48000 && p.gtcRate >= 66).map(po => (
                <div key={po.buuCuc} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{po.buuCuc}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vol: <strong>{po.totalVol.toLocaleString()}</strong> &bull; GTC: <strong className="text-sky-600">{po.gtcRate.toFixed(1)}%</strong> &bull; Tồn: {po.totalBacklog}
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToTab('bao_cao_gtc_bc', { buuCuc: po.buuCuc })}
                    className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ô 4: CẦN GIÁM SÁT SÁT SAO (Low Vol, Low GTC) */}
          <div className="p-4 rounded-xl border-2 border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-black text-xs uppercase tracking-wider">
                <span>🚨 PHÂN VÙNG IV: CẦN GIÁM SÁT SÁT SAO</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                Vol Vừa &bull; GTC Thấp
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Sản lượng không quá cao nhưng tỷ lệ hoàn tất dưới chuẩn. Cần kiểm tra bưu tá OFF, năng lực giao ca 2 và độ dài tuyến.
            </p>
            <div className="space-y-2 pt-1">
              {operationalScorecard.filter(p => p.totalVol < 48000 && p.gtcRate < 66).map(po => (
                <div key={po.buuCuc} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{po.buuCuc}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vol: <strong>{po.totalVol.toLocaleString()}</strong> &bull; GTC: <strong className="text-rose-600">{po.gtcRate.toFixed(1)}%</strong> &bull; Tồn: {po.totalBacklog}
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToTab('bao_cao_gtc_bc', { buuCuc: po.buuCuc })}
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
              {operationalScorecard.filter(p => p.totalVol < 48000 && p.gtcRate < 66).length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Không có bưu cục nào rơi vào vùng rủi ro kép này
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PERIODIC COMPARISON SECTION (SO SÁNH THEO TUẦN VÀ THEO THÁNG) */}
      <PeriodicComparisonSection
        gtcBcList={dataset.gtcBuuCuc}
        gtcNvList={dataset.gtcNhanVien}
        hhList={dataset.hoaHongNgay}
        availableWeeks={availableWeeks}
        availableMonths={availableMonths}
      />

      {/* Post Office Master Ranking & Inline Expansion Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/60 dark:bg-slate-750">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng Tổng Hợp Vận Hành 5 Bưu Cục (Nhấn Để Mở Rộng Chi Tiết)
            </h3>
            <p className="text-[11px] text-slate-400">
              Cung cấp khả năng drill-down trực tiếp xuống danh sách nhân viên, cơ cấu ca hàng và đơn tồn
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="px-3 py-2.5">Bưu Cục</th>
                <th className="px-3 py-2.5 text-center">Volume</th>
                <th className="px-3 py-2.5 text-center">SLĐ Gán</th>
                <th className="px-2.5 py-2.5 text-center">% Gán</th>
                <th className="px-3 py-2.5 text-center">SLĐ GTC</th>
                <th className="px-3 py-2.5 text-center">% GTC (Chuẩn)</th>
                <th className="px-3 py-2.5 text-center">Tồn GLT</th>
                <th className="px-2.5 py-2.5 text-center">Tồn LC</th>
                <th className="px-3 py-2.5 text-center">Tổng Lương (VNĐ)</th>
                <th className="px-3 py-2.5 text-center">Trạng Thái</th>
                <th className="px-3 py-2.5 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {poSummaries.map((po) => {
                const isSelected = selectedBuuCuc === po.buuCuc;
                return (
                  <React.Fragment key={po.buuCuc}>
                    <tr 
                      className={`hover:bg-orange-50/40 dark:hover:bg-slate-750 cursor-pointer transition-colors ${
                        isSelected ? 'bg-orange-50 dark:bg-slate-750 font-semibold' : ''
                      }`}
                      onClick={() => setSelectedBuuCuc(isSelected ? null : po.buuCuc)}
                    >
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-600" />
                        <span>{po.buuCuc}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">{po.volume.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{po.sldGan.toLocaleString('vi-VN')}</td>
                      <td className="px-2.5 py-2.5 text-center font-medium text-blue-600">{po.assignedRate.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{po.sldGTC.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2.5 text-center font-black text-slate-900 dark:text-white">
                        <span className={`px-2 py-0.5 rounded-full inline-flex items-center justify-center ${
                          po.gtcRate < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                          po.gtcRate < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {po.gtcRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-rose-600">{po.gltBacklog.toLocaleString('vi-VN')}</td>
                      <td className="px-2.5 py-2.5 text-center font-bold text-blue-600">{po.lcBacklog}</td>
                      <td className="px-3 py-2.5 text-center font-medium text-emerald-600">{po.totalSalary.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          po.status === 'Critical' ? 'bg-red-500 text-white' :
                          po.status === 'Warning' ? 'bg-amber-500 text-white' :
                          po.status === 'Excellent' ? 'bg-emerald-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {po.status === 'Critical' ? 'Báo động' : po.status === 'Warning' ? 'Cần chú ý' : 'Tốt'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-bold"
                        >
                          {isSelected ? 'Thu gọn' : 'Mở rộng'}
                        </button>
                      </td>
                    </tr>

                    {/* Inline Expanded Details for Post Office */}
                    {isSelected && (
                      <tr className="bg-slate-50 dark:bg-slate-850">
                        <td colSpan={11} className="p-4 border-y border-orange-200 dark:border-slate-700">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                              <h4 className="text-xs font-bold text-orange-600 uppercase flex items-center gap-2">
                                <span>Chi tiết vận hành nội bộ: {po.buuCuc}</span>
                              </h4>
                              <button
                                onClick={() => setSelectedBuuCuc(null)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                              >
                                ✕ Đóng chi tiết
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Ca Hàng Breakdown */}
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Cơ cấu ca hàng</h5>
                                {['Hàng Mới Ca 1', 'Hàng Mới Ca 2', 'Hàng Tồn'].map(cat => {
                                  const rows = dataset.gtcBuuCuc.filter(r => r.buuCuc === po.buuCuc && r.loaiHang === cat);
                                  const vol = rows.reduce((acc, r) => acc + r.volume, 0);
                                  const gtc = rows.reduce((acc, r) => acc + r.sldGTC, 0);
                                  const rate = vol > 0 ? (gtc / vol * 100).toFixed(1) : '0';
                                  return (
                                    <div key={cat} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <span className="text-slate-600 dark:text-slate-400">{cat}:</span>
                                      <span className="font-bold">{vol.toLocaleString('vi-VN')} đơn (GTC: {rate}%)</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Top Nhân Viên Của Bưu Cục */}
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Nhân viên bưu cục ({empSummaries.filter(e => e.buuCuc === po.buuCuc).length} NV)</h5>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                  {empSummaries.filter(e => e.buuCuc === po.buuCuc).slice(0, 5).map(e => (
                                    <div key={e.maNV} className="flex justify-between text-[11px]">
                                      <span className="truncate">{e.tenNV}:</span>
                                      <span className="font-bold text-emerald-600">{e.tongDonGTC} đơn ({e.gtcRate.toFixed(1)}%)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Tồn đọng & Hành động */}
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Hành động điều hành đề xuất</h5>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                                  Hiện có {po.gltBacklog} đơn GLT và {po.lcBacklog} đơn LC đang tồn tại bưu cục này.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => navigateToTab('bao_cao_gtc_bc', { buuCuc: po.buuCuc })}
                                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                  >
                                    <FileSpreadsheet className="w-3 h-3" />
                                    <span>Báo cáo GTC BC</span>
                                  </button>
                                  <button
                                    onClick={() => navigateToTab('gtc_nhan_vien', { buuCuc: po.buuCuc })}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                  >
                                    <Users className="w-3 h-3" />
                                    <span>Bưu tá</span>
                                  </button>
                                  <button
                                    onClick={() => navigateToTab('ton_dong_glt', { buuCuc: po.buuCuc })}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                  >
                                    <Package className="w-3 h-3" />
                                    <span>Tồn GLT</span>
                                  </button>
                                  <button
                                    onClick={() => navigateToTab('nhan_su', { buuCuc: po.buuCuc })}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                  >
                                    <span>Nhân sự</span>
                                  </button>
                                </div>
                              </div>
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
    </div>
  );
};

export default OverviewTab;
