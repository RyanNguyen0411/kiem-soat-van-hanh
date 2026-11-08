import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckSquare, 
  Square, 
  Download, 
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Filter,
  Building2,
  Package,
  RotateCcw
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
import type { WeekFilterOption, MonthFilterOption } from '../../utils/dateEngine';
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
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Selected weeks for comparison (default: select first 3 weeks or all)
  const [selectedWeekKeys, setSelectedWeekKeys] = useState<string[]>(() => {
    return availableWeeks.map(w => w.key);
  });

  // Selected months for comparison (default: all)
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>(() => {
    return availableMonths.map(m => m.key);
  });

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

  // Filtered metrics based on ticked checkboxes
  const displayedMetrics = useMemo(() => {
    if (viewMode === 'week') {
      return allWeekMetrics.filter(m => selectedWeekKeys.includes(m.key));
    } else {
      return allMonthMetrics.filter(m => selectedMonthKeys.includes(m.key));
    }
  }, [viewMode, allWeekMetrics, allMonthMetrics, selectedWeekKeys, selectedMonthKeys]);

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-750 p-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Theo tuần ({availableWeeks.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Theo tháng ({availableMonths.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* BỘ LỌC ĐỘC LẬP RIÊNG CỦA BẢNG SO SÁNH (BƯU CỤC & LOẠI HÀNG - KHÔNG ẢNH HƯỞNG BẢNG KHÁC) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-orange-600" />
            <span className="uppercase tracking-wider text-[11px]">Bộ lọc riêng:</span>
          </div>

          {/* Lọc Bưu Cục */}
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 dark:text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> Bưu cục:
            </label>
            <select
              value={filterBuuCuc}
              onChange={e => setFilterBuuCuc(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
            >
              <option value="all">Tất cả bưu cục (5 BC)</option>
              {buuCucOptions.map(bc => (
                <option key={bc} value={bc}>{bc}</option>
              ))}
            </select>
          </div>

          {/* Lọc Loại Hàng */}
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 dark:text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <Package className="w-3 h-3 text-slate-400" /> Loại hàng:
            </label>
            <select
              value={filterLoaiHang}
              onChange={e => setFilterLoaiHang(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs"
            >
              <option value="all">Tất cả loại hàng / ca</option>
              {loaiHangOptions.map(lh => (
                <option key={lh} value={lh}>{lh}</option>
              ))}
            </select>
          </div>

          {/* Reset button if active */}
          {(filterBuuCuc !== 'all' || filterLoaiHang !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterBuuCuc('all');
                setFilterLoaiHang('all');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 rounded-md transition-colors"
              title="Đặt lại bộ lọc riêng của bảng này"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa lọc bảng</span>
            </button>
          )}
        </div>

        {/* Current Filter Pill */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="font-medium">Đang lọc riêng:</span>
          <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100/70 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
            {filterBuuCuc === 'all' ? 'Toàn khu vực' : filterBuuCuc} &bull; {filterLoaiHang === 'all' ? 'Tất cả loại hàng' : filterLoaiHang}
          </span>
        </div>
      </div>

      {/* TICK CHỌN TUẦN / THÁNG MUỐN SO SÁNH */}
      {viewMode === 'week' && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Tick chọn các tuần muốn so sánh ({selectedWeekKeys.length}/{availableWeeks.length} tuần được chọn):</span>
            </span>
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAllWeeks}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearAllWeeks}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Chỉ chọn tuần mới nhất
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {availableWeeks.map(w => {
              const isChecked = selectedWeekKeys.includes(w.key);
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => toggleWeek(w.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isChecked
                      ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{w.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TICK CHỌN THÁNG MUỐN SO SÁNH */}
      {viewMode === 'month' && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Tick chọn các tháng muốn so sánh ({selectedMonthKeys.length}/{availableMonths.length} tháng được chọn):</span>
            </span>
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAllMonths}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearAllMonths}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Chỉ chọn tháng mới nhất
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {availableMonths.map(m => {
              const isChecked = selectedMonthKeys.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleMonth(m.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isChecked
                      ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{m.label} ({m.dates.length} ngày)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
              <ComposedChart data={[...displayedMetrics].reverse()}>
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
