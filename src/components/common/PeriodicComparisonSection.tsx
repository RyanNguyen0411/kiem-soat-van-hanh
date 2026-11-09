import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GitCompare, 
  Calendar, 
  CalendarDays,
  CalendarRange,
  TrendingUp, 
  TrendingDown, 
  Download, 
  ArrowRight,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
  X
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
import type { GtcPostOfficeRecord, GtcEmployeeRecord, DailySalaryRecord } from '../../types/dashboard';
import { sortDatesDesc, type WeekFilterOption, type MonthFilterOption } from '../../utils/dateEngine';
import { exportToCSV } from '../../services/excelExportService';

interface PeriodicComparisonProps {
  gtcBcList: GtcPostOfficeRecord[];
  gtcNvList: GtcEmployeeRecord[];
  hhList: DailySalaryRecord[];
  availableWeeks: WeekFilterOption[];
  availableMonths: MonthFilterOption[];
}

interface PeriodMetrics {
  key: string;
  label: string;
  dateRange: string;
  dates: string[];
  volume: number;
  sldGan: number;
  assignedRate: number;
  sldGTC: number;
  gtcRate: number;
  returnRate: number;
  leadtime: number;
  tonDong: number;
  totalSalary: number;
  activeStaff: number;
}

export const PeriodicComparisonSection: React.FC<PeriodicComparisonProps> = ({
  gtcBcList,
  gtcNvList,
  hhList,
  availableWeeks,
  availableMonths
}) => {
  // Mặc định hiển thị theo Tháng theo chỉ đạo của AM Huy (ĐNB)
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'day'>('month');

  // Danh sách toàn bộ các ngày duy nhất sắp xếp từ mới nhất -> cũ nhất (gần nhất -> xa nhất)
  const allUniqueDatesDesc = useMemo(() => {
    const rawDates = gtcBcList.map(r => r.ngay).filter(Boolean);
    const unique = [...new Set(rawDates)];
    return sortDatesDesc(unique);
  }, [gtcBcList]);

  // Selected weeks for comparison (default: 4 tuần gần nhất hoặc tất cả)
  const [selectedWeekKeys, setSelectedWeekKeys] = useState<string[]>(() => {
    return availableWeeks.length > 0 ? availableWeeks.slice(0, 4).map(w => w.key) : [];
  });

  // Selected months for comparison (default: Mặc định hiển thị 2 tháng gần nhất theo chỉ đạo của AM Huy)
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>(() => {
    return availableMonths.length > 0 ? availableMonths.slice(0, 2).map(m => m.key) : [];
  });

  // Selected days for comparison (default: 7 ngày gần nhất)
  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>(() => {
    return allUniqueDatesDesc.slice(0, 7);
  });

  // Đồng bộ mặc định 2 tháng gần nhất khi availableMonths load dữ liệu
  useEffect(() => {
    if (availableMonths.length > 0) {
      setSelectedMonthKeys(prev => {
        const valid = prev.filter(k => availableMonths.some(m => m.key === k));
        if (valid.length === 0) {
          return availableMonths.slice(0, 2).map(m => m.key);
        }
        return valid;
      });
    }
  }, [availableMonths]);

  // Đồng bộ mặc định tuần khi availableWeeks load dữ liệu
  useEffect(() => {
    if (availableWeeks.length > 0) {
      setSelectedWeekKeys(prev => {
        const valid = prev.filter(k => availableWeeks.some(w => w.key === k));
        if (valid.length === 0) {
          return availableWeeks.slice(0, 4).map(w => w.key);
        }
        return valid;
      });
    }
  }, [availableWeeks]);

  // Đồng bộ ngày khi allUniqueDatesDesc load dữ liệu
  useEffect(() => {
    if (allUniqueDatesDesc.length > 0) {
      setSelectedDateKeys(prev => {
        const valid = prev.filter(d => allUniqueDatesDesc.includes(d));
        if (valid.length === 0) {
          return allUniqueDatesDesc.slice(0, 7);
        }
        return valid;
      });
    }
  }, [allUniqueDatesDesc]);

  // Quản lý dropdown dạng cuộn mở (tuần, tháng, ngày)
  const [openDropdown, setOpenDropdown] = useState<'week' | 'month' | 'day' | null>(null);
  const filterSectionRef = useRef<HTMLDivElement>(null);

  // Tự động thu gọn popover khi nhấn bất kỳ nơi nào trên màn hình
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterSectionRef.current && !filterSectionRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Key of period row currently expanded to show daily breakdown
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Local independent filters for this section (Bưu cục & Loại hàng)
  const [filterBuuCuc, setFilterBuuCuc] = useState<string>('all');
  const [filterLoaiHang, setFilterLoaiHang] = useState<string>('all');

  // Options for Bưu cục and Loại hàng from the dataset
  const buuCucOptions = useMemo(() => {
    const list = [...new Set(gtcBcList.map(r => r.buuCuc))].filter(Boolean);
    return list.sort();
  }, [gtcBcList]);

  const loaiHangOptions = useMemo(() => {
    const list = [...new Set(gtcBcList.map(r => r.loaiHang))].filter(Boolean);
    return list.sort();
  }, [gtcBcList]);

  // Locally filtered datasets for this section (Hoàn toàn độc lập, không ảnh hưởng bảng khác)
  const localFilteredGtcBc = useMemo(() => {
    return gtcBcList.filter(r => {
      if (filterBuuCuc !== 'all' && r.buuCuc !== filterBuuCuc) return false;
      if (filterLoaiHang !== 'all' && r.loaiHang !== filterLoaiHang) return false;
      return true;
    });
  }, [gtcBcList, filterBuuCuc, filterLoaiHang]);

  const localFilteredGtcNv = useMemo(() => {
    return gtcNvList.filter(r => {
      if (filterBuuCuc !== 'all' && r.buuCuc !== filterBuuCuc) return false;
      return true;
    });
  }, [gtcNvList, filterBuuCuc]);

  const localFilteredHh = useMemo(() => {
    return hhList.filter(r => {
      if (filterBuuCuc !== 'all' && r.tenBC !== filterBuuCuc) return false;
      return true;
    });
  }, [hhList, filterBuuCuc]);

  // Toggle week checkbox
  const toggleWeek = (key: string) => {
    setSelectedWeekKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const selectAllWeeks = () => {
    setSelectedWeekKeys(availableWeeks.map(w => w.key));
  };

  const clearAllWeeks = () => {
    if (availableWeeks.length > 0) {
      setSelectedWeekKeys([availableWeeks[0].key]);
    }
  };

  // Toggle month checkbox
  const toggleMonth = (key: string) => {
    setSelectedMonthKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const selectAllMonths = () => {
    setSelectedMonthKeys(availableMonths.map(m => m.key));
  };

  const clearAllMonths = () => {
    if (availableMonths.length > 0) {
      setSelectedMonthKeys([availableMonths[0].key]);
    }
  };

  // Toggle day checkbox
  const toggleDay = (d: string) => {
    setSelectedDateKeys(prev => {
      if (prev.includes(d)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(k => k !== d);
      } else {
        return sortDatesDesc([...prev, d]);
      }
    });
  };

  const selectAllDays = () => {
    setSelectedDateKeys([...allUniqueDatesDesc]);
  };

  const clearAllDays = () => {
    if (allUniqueDatesDesc.length > 0) {
      setSelectedDateKeys([allUniqueDatesDesc[0]]);
    }
  };

  // Helper to compute metrics for a set of dates
  const computeMetricsForDates = (key: string, label: string, dateRange: string, dates: string[]): PeriodMetrics => {
    const datesSet = new Set(dates);
    const bcRows = localFilteredGtcBc.filter(r => datesSet.has(r.ngay));
    const nvRows = localFilteredGtcNv.filter(r => datesSet.has(r.ngay));
    const hhRows = localFilteredHh.filter(r => datesSet.has(r.ngay));

    const volume = bcRows.reduce((acc, r) => acc + (r.volume || 0), 0);
    const sldGan = bcRows.reduce((acc, r) => acc + (r.sldGan || 0), 0);
    const sldGTC = bcRows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
    const tonDong = bcRows.reduce((acc, r) => acc + (r.tonDong || 0), 0);

    const assignedRate = volume > 0 ? (sldGan / volume) * 100 : 0;
    const gtcRate = volume > 0 ? (sldGTC / volume) * 100 : 0;

    const weightedLt = bcRows.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
    const leadtime = volume > 0 ? weightedLt / volume : 0;

    const returnUnits = bcRows.reduce((acc, r) => {
      const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
      return acc + (r.volume * pct);
    }, 0);
    const returnRate = volume > 0 ? (returnUnits / volume) * 100 : 0;

    const totalSalary = hhRows.reduce((acc, r) => acc + (r.tongLuong || 0), 0);
    const activeStaff = new Set(nvRows.map(r => r.maNV)).size;

    return {
      key,
      label,
      dateRange,
      dates,
      volume,
      sldGan,
      assignedRate,
      sldGTC,
      gtcRate,
      returnRate,
      leadtime,
      tonDong,
      totalSalary,
      activeStaff
    };
  };

  // Compute daily breakdown for an expanded week/month (sorted newest to oldest)
  const getDailyMetricsForDates = (dates: string[]) => {
    return dates.map(d => {
      const bcRows = localFilteredGtcBc.filter(r => r.ngay === d);
      const nvRows = localFilteredGtcNv.filter(r => r.ngay === d);
      const hhRows = localFilteredHh.filter(r => r.ngay === d);

      const thu = bcRows[0]?.thu || nvRows[0]?.thu || hhRows[0]?.thu || '';
      const volume = bcRows.reduce((acc, r) => acc + (r.volume || 0), 0);
      const sldGan = bcRows.reduce((acc, r) => acc + (r.sldGan || 0), 0);
      const sldGTC = bcRows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
      const tonDong = bcRows.reduce((acc, r) => acc + (r.tonDong || 0), 0);

      const assignedRate = volume > 0 ? (sldGan / volume) * 100 : 0;
      const gtcRate = volume > 0 ? (sldGTC / volume) * 100 : 0;

      const weightedLt = bcRows.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
      const leadtime = volume > 0 ? weightedLt / volume : 0;

      const returnUnits = bcRows.reduce((acc, r) => {
        const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
        return acc + (r.volume * pct);
      }, 0);
      const returnRate = volume > 0 ? (returnUnits / volume) * 100 : 0;

      const totalSalary = hhRows.reduce((acc, r) => acc + (r.tongLuong || 0), 0);
      const activeStaff = new Set(nvRows.map(r => r.maNV)).size;

      return {
        date: d,
        thu,
        volume,
        sldGan,
        assignedRate,
        sldGTC,
        gtcRate,
        returnRate,
        leadtime,
        tonDong,
        totalSalary,
        activeStaff
      };
    });
  };

  // Compute metrics for all weeks
  const allWeekMetrics = useMemo(() => {
    return availableWeeks.map(w => {
      return computeMetricsForDates(w.key, w.label, `${w.startDate} - ${w.endDate}`, w.dates);
    });
  }, [availableWeeks, localFilteredGtcBc, localFilteredGtcNv, localFilteredHh]);

  // Compute metrics for all months
  const allMonthMetrics = useMemo(() => {
    return availableMonths.map(m => {
      const dates = m.dates;
      const range = dates.length > 0 ? `${dates[dates.length - 1]} - ${dates[0]}` : '';
      return computeMetricsForDates(m.key, m.label, range, dates);
    });
  }, [availableMonths, localFilteredGtcBc, localFilteredGtcNv, localFilteredHh]);

  // Compute metrics for all days (khi chọn chế độ so sánh theo ngày)
  const allDayMetrics = useMemo(() => {
    return allUniqueDatesDesc.map(d => {
      const bcRow = localFilteredGtcBc.find(r => r.ngay === d);
      const thu = bcRow?.thu || '';
      return computeMetricsForDates(d, `Ngày ${d}${thu ? ` (${thu})` : ''}`, d, [d]);
    });
  }, [allUniqueDatesDesc, localFilteredGtcBc, localFilteredGtcNv, localFilteredHh]);

  // Filtered metrics based on ticked checkboxes (Thứ tự từ kỳ gần nhất -> kỳ xa nhất)
  const displayedMetrics = useMemo(() => {
    if (viewMode === 'week') {
      return allWeekMetrics.filter(m => selectedWeekKeys.includes(m.key));
    } else if (viewMode === 'month') {
      return allMonthMetrics.filter(m => selectedMonthKeys.includes(m.key));
    } else {
      return allDayMetrics.filter(m => selectedDateKeys.includes(m.key));
    }
  }, [viewMode, allWeekMetrics, allMonthMetrics, allDayMetrics, selectedWeekKeys, selectedMonthKeys, selectedDateKeys]);

  // Calculate Variance (Chênh lệch delta) between the first two selected periods
  const variance = useMemo(() => {
    if (displayedMetrics.length < 2) return null;
    const current = displayedMetrics[0]; // newest
    const previous = displayedMetrics[1]; // previous

    const diffVol = current.volume - previous.volume;
    const pctVol = previous.volume > 0 ? (diffVol / previous.volume) * 100 : 0;

    const diffGtc = current.sldGTC - previous.sldGTC;
    const diffGtcRate = current.gtcRate - previous.gtcRate;

    const diffSalary = current.totalSalary - previous.totalSalary;
    const pctSalary = previous.totalSalary > 0 ? (diffSalary / previous.totalSalary) * 100 : 0;

    const diffReturn = current.returnRate - previous.returnRate;

    return {
      currentLabel: current.label,
      prevLabel: previous.label,
      diffVol,
      pctVol,
      diffGtc,
      diffGtcRate,
      diffSalary,
      pctSalary,
      diffReturn
    };
  }, [displayedMetrics]);

  // Export comparison table to Excel CSV
  const handleExport = () => {
    const headers = [
      'Kỳ Vận Hành',
      'Khoảng Ngày',
      'Volume',
      'SLĐ Gán',
      '% Gán',
      'SLĐ GTC',
      '% GTC (Chuẩn)',
      '% Chuyển Trả',
      'Leadtime (h)',
      'Tồn Đọng Ca',
      'Tổng Lương (VNĐ)',
      'Bưu Tá Hoạt Động'
    ];

    const rows = displayedMetrics.map(m => [
      m.label,
      m.dateRange,
      m.volume,
      m.sldGan,
      `${m.assignedRate.toFixed(2)}%`,
      m.sldGTC,
      `${m.gtcRate.toFixed(2)}%`,
      `${m.returnRate.toFixed(2)}%`,
      m.leadtime.toFixed(2),
      m.tonDong,
      m.totalSalary,
      m.activeStaff
    ]);

    exportToCSV(`so_sanh_${viewMode === 'week' ? 'theo_tuan' : 'theo_thang'}_ghn`, headers, rows);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-4 md:p-5">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng So Sánh Chỉ Số Vận Hành Theo Tuần & Tháng
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tùy ý tick chọn các tuần/tháng muốn đối chiếu để so sánh sản lượng, %GTC và biến động chi phí
          </p>
        </div>

        {/* Nút Xuất Excel */}
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Xuất Excel</span>
        </button>
      </div>

      {/* BỘ LỌC ĐỘC LẬP THU GỌN (DẠNG CUỘN CHUYÊN NGHIỆP - TỰ ĐỘNG ẨN KHI NHẤN NGOÀI) */}
      <div 
        className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700 text-xs" 
        ref={filterSectionRef}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher Tabs: Tuần / Tháng / Ngày */}
          <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700 font-semibold text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('week');
                setOpenDropdown(null);
              }}
              className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Theo tuần ({availableWeeks.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                setOpenDropdown(null);
              }}
              className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Theo tháng ({availableMonths.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('day');
                setOpenDropdown(null);
              }}
              className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Theo ngày ({allUniqueDatesDesc.length})
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

          {/* 1. Lọc Bưu Cục */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] hidden sm:inline">BC:</span>
            <select
              value={filterBuuCuc}
              onChange={e => setFilterBuuCuc(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
            >
              <option value="all">Tất cả 5 bưu cục</option>
              {buuCucOptions.map(bc => (
                <option key={bc} value={bc}>{bc}</option>
              ))}
            </select>
          </div>

          {/* 2. Lọc Loại Hàng */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Ca:</span>
            <select
              value={filterLoaiHang}
              onChange={e => setFilterLoaiHang(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
            >
              <option value="all">Tất cả loại hàng / ca</option>
              {loaiHangOptions.map(lh => (
                <option key={lh} value={lh}>{lh}</option>
              ))}
            </select>
          </div>

          {/* 3. Dropdown Dạng Cuộn: Chọn Tuần So Sánh (khi viewMode === 'week') */}
          {viewMode === 'week' && (
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'week' ? null : 'week')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  selectedWeekKeys.length > 0
                    ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-900 dark:text-orange-200 ring-1 ring-orange-500 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                title="Mở danh sách dạng cuộn để tick chọn tuần so sánh"
              >
                <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {selectedWeekKeys.length === availableWeeks.length
                    ? 'Tất cả các tuần'
                    : `Đã chọn ${selectedWeekKeys.length}/${availableWeeks.length} tuần`}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${openDropdown === 'week' ? 'rotate-180 text-orange-600' : ''}`} />
              </button>

              {openDropdown === 'week' && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                      Tick Chọn Tuần So Sánh
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Phím tắt nhanh */}
                  <div className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 dark:bg-slate-750 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={selectAllWeeks}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-600 cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={clearAllWeeks}
                      className="text-slate-500 hover:text-orange-600 dark:text-slate-400 font-medium underline cursor-pointer"
                    >
                      Chỉ tuần mới nhất
                    </button>
                  </div>

                  {/* Danh sách cuộn dọc */}
                  <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {availableWeeks.map(w => {
                      const isChecked = selectedWeekKeys.includes(w.key);
                      return (
                        <button
                          key={w.key}
                          type="button"
                          onClick={() => toggleWeek(w.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all text-left ${
                            isChecked
                              ? 'bg-orange-500 text-white font-bold border-orange-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-white text-orange-600 border-white' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="font-medium">{w.label}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isChecked ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {w.dates.length} ngày
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400">
                    <span className="italic">* Nhấn ngoài để tự động ẩn</span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      Áp dụng ({selectedWeekKeys.length} tuần)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Dropdown Dạng Cuộn: Chọn Tháng So Sánh (khi viewMode === 'month') */}
          {viewMode === 'month' && (
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'month' ? null : 'month')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  selectedMonthKeys.length > 0
                    ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-900 dark:text-orange-200 ring-1 ring-orange-500 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                title="Mở danh sách dạng cuộn để tick chọn tháng so sánh"
              >
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {selectedMonthKeys.length === availableMonths.length
                    ? 'Tất cả các tháng'
                    : `Đã chọn ${selectedMonthKeys.length}/${availableMonths.length} tháng`}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${openDropdown === 'month' ? 'rotate-180 text-orange-600' : ''}`} />
              </button>

              {openDropdown === 'month' && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                      Tick Chọn Tháng So Sánh
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Phím tắt nhanh */}
                  <div className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 dark:bg-slate-750 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKeys(availableMonths.slice(0, 2).map(m => m.key))}
                      className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800 hover:bg-orange-200 cursor-pointer text-[10px]"
                      title="Mặc định hiển thị 2 tháng gần nhất theo chỉ đạo của AM"
                    >
                      2 tháng gần nhất
                    </button>
                    <button
                      type="button"
                      onClick={selectAllMonths}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-600 cursor-pointer text-[10px]"
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={clearAllMonths}
                      className="text-slate-500 hover:text-orange-600 dark:text-slate-400 font-medium underline cursor-pointer text-[10px]"
                    >
                      1 tháng
                    </button>
                  </div>

                  {/* Danh sách cuộn dọc */}
                  <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {availableMonths.map(m => {
                      const isChecked = selectedMonthKeys.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => toggleMonth(m.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all text-left ${
                            isChecked
                              ? 'bg-orange-500 text-white font-bold border-orange-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-white text-orange-600 border-white' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="font-medium">{m.label}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isChecked ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {m.dates.length} ngày
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400">
                    <span className="italic">* Nhấn ngoài để tự động ẩn</span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      Áp dụng ({selectedMonthKeys.length} tháng)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Dropdown Dạng Cuộn: Chọn Ngày So Sánh (khi viewMode === 'day') */}
          {viewMode === 'day' && (
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'day' ? null : 'day')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  selectedDateKeys.length > 0
                    ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-900 dark:text-orange-200 ring-1 ring-orange-500 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                title="Mở danh sách dạng cuộn để tick chọn ngày so sánh"
              >
                <CalendarRange className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {selectedDateKeys.length === allUniqueDatesDesc.length
                    ? 'Tất cả các ngày'
                    : `Đã chọn ${selectedDateKeys.length}/${allUniqueDatesDesc.length} ngày`}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${openDropdown === 'day' ? 'rotate-180 text-orange-600' : ''}`} />
              </button>

              {openDropdown === 'day' && (
                <div className="absolute left-0 mt-1.5 w-[310px] sm:w-[350px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                      Tick Chọn Ngày So Sánh
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Phím tắt nhanh */}
                  <div className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 dark:bg-slate-750 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={selectAllDays}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-600 cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={clearAllDays}
                      className="text-slate-500 hover:text-orange-600 dark:text-slate-400 font-medium underline cursor-pointer"
                    >
                      Chỉ ngày mới nhất
                    </button>
                  </div>

                  {/* Danh sách cuộn dọc */}
                  <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {allUniqueDatesDesc.map(d => {
                      const isChecked = selectedDateKeys.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all text-left ${
                            isChecked
                              ? 'bg-orange-500 text-white font-bold border-orange-600 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-white text-orange-600 border-white' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="font-mono text-xs">{d}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400">
                    <span className="italic">* Nhấn ngoài để tự động ẩn</span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      Áp dụng ({selectedDateKeys.length} ngày)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset button if active */}
          {(filterBuuCuc !== 'all' || filterLoaiHang !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterBuuCuc('all');
                setFilterLoaiHang('all');
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 rounded-md transition-colors cursor-pointer"
              title="Đặt lại bộ lọc riêng của bảng này"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {/* Current Filter Pill */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="font-medium hidden sm:inline">Đang lọc riêng:</span>
          <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100/70 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
            {filterBuuCuc === 'all' ? 'Toàn khu vực' : filterBuuCuc} &bull; {filterLoaiHang === 'all' ? 'Tất cả ca' : filterLoaiHang}
          </span>
        </div>
      </div>

      {/* TÓM TẮT CHÊNH LỆCH DELTA BIẾN ĐỘNG NẾU CÓ >= 2 KỲ ĐƯỢC CHỌN */}
      {variance && (
        <div className="p-3.5 rounded-lg bg-gradient-to-r from-blue-50/60 via-slate-50 to-orange-50/40 dark:from-slate-750 dark:to-slate-800 border border-blue-200 dark:border-slate-700 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
            <span>Biến động giữa 2 kỳ gần nhất được chọn:</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{variance.currentLabel}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500">{variance.prevLabel}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[10px]">Tăng trưởng Volume:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {variance.diffVol >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`font-bold ${variance.diffVol >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {variance.diffVol >= 0 ? '+' : ''}{variance.diffVol.toLocaleString('vi-VN')} đơn ({variance.pctVol >= 0 ? '+' : ''}{variance.pctVol.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[10px]">Biến động %GTC:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {variance.diffGtcRate >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`font-bold ${variance.diffGtcRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {variance.diffGtcRate >= 0 ? '+' : ''}{variance.diffGtcRate.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[10px]">Đơn GTC Thành công:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`font-bold ${variance.diffGtc >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {variance.diffGtc >= 0 ? '+' : ''}{variance.diffGtc.toLocaleString('vi-VN')} đơn
                </span>
              </div>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[10px]">Biến động Quỹ Lương:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {variance.diffSalary >= 0 ? '+' : ''}{(variance.diffSalary / 1e6).toFixed(1)} tr ({variance.pctSalary >= 0 ? '+' : ''}{variance.pctSalary.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BẢNG SO SÁNH CHỈ SỐ VẬN HÀNH */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span>Kỳ Vận Hành</span>
                  <span className="text-[10px] font-normal text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-1.5 py-0.2 rounded">
                    Nhấn để mở rộng ngày
                  </span>
                </div>
              </th>
              <th className="px-3 py-2.5 text-right">Volume</th>
              <th className="px-3 py-2.5 text-right">SLĐ Gán</th>
              <th className="px-3 py-2.5 text-right">% Gán</th>
              <th className="px-3 py-2.5 text-right">SLĐ GTC</th>
              <th className="px-3 py-2.5 text-right">% GTC (Chuẩn)</th>
              <th className="px-3 py-2.5 text-right">% Chuyển Trả</th>
              <th className="px-3 py-2.5 text-right">Leadtime (h)</th>
              <th className="px-3 py-2.5 text-right">Tồn Ca</th>
              <th className="px-3 py-2.5 text-right">Tổng Lương (VNĐ)</th>
              <th className="px-3 py-2.5 text-center">Bưu Tá</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {displayedMetrics.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-slate-400 italic">
                  Vui lòng tick chọn ít nhất 1 tuần để xem dữ liệu so sánh
                </td>
              </tr>
            ) : (
              displayedMetrics.map((m, idx) => {
                const prev = displayedMetrics[idx + 1]; // prior period
                const volDelta = prev ? m.volume - prev.volume : 0;
                const gtcRateDelta = prev ? m.gtcRate - prev.gtcRate : 0;
                const isExpanded = expandedKey === m.key;
                const dailyList = isExpanded ? getDailyMetricsForDates(m.dates) : [];

                return (
                  <React.Fragment key={m.key}>
                    <tr 
                      onClick={() => setExpandedKey(isExpanded ? null : m.key)}
                      className={`hover:bg-orange-50/40 dark:hover:bg-slate-750 transition-colors cursor-pointer select-none ${
                        isExpanded ? 'bg-orange-50/60 dark:bg-slate-750/90 font-semibold border-l-4 border-orange-500' : ''
                      }`}
                      title="Nhấn để mở rộng hoặc thu gọn chi tiết từng ngày trong kỳ"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="p-0.5 rounded text-slate-400 group-hover:text-orange-600 transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-orange-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-orange-600" />
                              <span>{m.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 ml-5">{m.dateRange}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <span className="font-bold text-slate-900 dark:text-white">{m.volume.toLocaleString('vi-VN')}</span>
                        {prev && (
                          <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${volDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {volDelta >= 0 ? '+' : ''}{volDelta.toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300 font-medium">
                        {m.sldGan.toLocaleString('vi-VN')}
                      </td>

                      <td className="px-3 py-2.5 text-right text-blue-600 font-bold">
                        {m.assignedRate.toFixed(1)}%
                      </td>

                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {m.sldGTC.toLocaleString('vi-VN')}
                      </td>

                      <td className="px-3 py-2.5 text-right font-black">
                        <span className={`px-2 py-0.5 rounded-full inline-block ${
                          m.gtcRate < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                          m.gtcRate < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {m.gtcRate.toFixed(2)}%
                        </span>
                        {prev && (
                          <div className={`text-[10px] font-bold ${gtcRateDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {gtcRateDelta >= 0 ? '+' : ''}{gtcRateDelta.toFixed(2)}%
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-right text-amber-600 font-medium">
                        {m.returnRate.toFixed(2)}%
                      </td>

                      <td className="px-3 py-2.5 text-right font-medium">
                        {m.leadtime.toFixed(1)}
                      </td>

                      <td className="px-3 py-2.5 text-right text-rose-600 font-bold">
                        {m.tonDong.toLocaleString('vi-VN')}
                      </td>

                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">
                        {(m.totalSalary / 1e6).toFixed(1)} tr
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                          {m.activeStaff} NV
                        </span>
                      </td>
                    </tr>

                    {/* EXPANDED INLINE SUB-TABLE: CHI TIẾT TỪNG NGÀY TRONG KỲ */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-b-2 border-orange-300 dark:border-slate-700 animate-in fade-in duration-200">
                        <td colSpan={11} className="p-3 md:p-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-orange-200 dark:border-slate-700 shadow-sm space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                                <h5 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                                  Chi Tiết Vận Hành Từng Ngày: {m.label} ({m.dates.length} ngày)
                                </h5>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  (Sắp xếp từ ngày gần nhất đến ngày xa nhất)
                                </span>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                Tổng Volume: <span className="text-orange-600 font-bold">{m.volume.toLocaleString('vi-VN')} đơn</span> &bull; 
                                Tỷ lệ GTC: <span className="text-emerald-600 font-bold">{m.gtcRate.toFixed(2)}%</span> &bull; 
                                Quỹ lương: <span className="text-slate-800 dark:text-slate-100 font-bold">{(m.totalSalary / 1e6).toFixed(1)} triệu</span>
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-3 py-2">Ngày Vận Hành</th>
                                    <th className="px-2 py-2">Thứ</th>
                                    <th className="px-3 py-2 text-right">Volume</th>
                                    <th className="px-3 py-2 text-right">SLĐ Gán</th>
                                    <th className="px-2 py-2 text-right">% Gán</th>
                                    <th className="px-3 py-2 text-right">SLĐ GTC</th>
                                    <th className="px-3 py-2 text-right">% GTC (Chuẩn)</th>
                                    <th className="px-2 py-2 text-right">% Chuyển Trả</th>
                                    <th className="px-2 py-2 text-right">Leadtime (h)</th>
                                    <th className="px-3 py-2 text-right">Tồn Đọng</th>
                                    <th className="px-3 py-2 text-right">Quỹ Lương (VNĐ)</th>
                                    <th className="px-2 py-2 text-center">Bưu Tá</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                                  {dailyList.map(d => (
                                    <tr key={d.date} className="hover:bg-orange-50/30 dark:hover:bg-slate-750/70 transition-colors">
                                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-orange-500" />
                                        <span>{d.date}</span>
                                      </td>
                                      <td className="px-2 py-2 text-slate-500 dark:text-slate-400 font-medium">
                                        {d.thu || '-'}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                                        {d.volume.toLocaleString('vi-VN')}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                                        {d.sldGan.toLocaleString('vi-VN')}
                                      </td>
                                      <td className="px-2 py-2 text-right font-bold text-blue-600">
                                        {d.assignedRate.toFixed(1)}%
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                        {d.sldGTC.toLocaleString('vi-VN')}
                                      </td>
                                      <td className="px-3 py-2 text-right font-black">
                                        <span className={`px-2 py-0.5 rounded-full inline-block text-[10px] ${
                                          d.gtcRate < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                                          d.gtcRate < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        }`}>
                                          {d.gtcRate.toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-right text-amber-600 font-medium">
                                        {d.returnRate.toFixed(2)}%
                                      </td>
                                      <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">
                                        {d.leadtime.toFixed(1)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-rose-600">
                                        {d.tonDong.toLocaleString('vi-VN')}
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                                        {d.totalSalary > 0 ? d.totalSalary.toLocaleString('vi-VN') : '-'}
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        {d.activeStaff > 0 ? (
                                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                                            {d.activeStaff} NV
                                          </span>
                                        ) : '-'}
                                      </td>
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BIỂU ĐỒ TRỰC QUAN ĐỐI CHIẾU SẢN LƯỢNG & %GTC GIỮA CÁC KỲ ĐƯỢC CHỌN */}
      {displayedMetrics.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Biểu Đồ Xu Hướng So Sánh: Volume & %GTC Giữa Các Kỳ Đã Chọn
            </h4>
            <span className="text-[10px] text-slate-400">Trục trái: Volume | Trục phải: %GTC</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayedMetrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" domain={[50, 80]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                <Bar yAxisId="left" dataKey="volume" name="Volume" fill="#F26522" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="sldGTC" name="SLĐ GTC" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="gtcRate" name="%GTC (Chuẩn)" stroke="#002D72" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodicComparisonSection;
