import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  BarChart3, 
  Download, 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  Activity, 
  Sparkles,
  Calendar,
  Layers,
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
  Legend, 
  ReferenceLine 
} from 'recharts';
import type { DatasetState } from '../../types/dashboard';
import { IndividualFilterDropdown } from '../common/IndividualFilterDropdown';
import { sortDatesDesc, toTimestamp } from '../../utils/dateEngine';
import { exportToCSV } from '../../services/excelExportService';

interface GtcDeliveryMatrixWidgetProps {
  dataset: DatasetState;
  availableWeeks: { key: string; label: string; dates: string[] }[];
  availableMonths: { key: string; label: string; dates: string[] }[];
  allUniqueDatesDesc: string[];
}

export const GtcDeliveryMatrixWidget: React.FC<GtcDeliveryMatrixWidgetProps> = ({
  dataset,
  availableWeeks,
  availableMonths,
  allUniqueDatesDesc
}) => {
  const [gtcDeliveryFilterPo, setGtcDeliveryFilterPo] = useState<string>('all');
  const [gtcDeliverySelectedWeeks, setGtcDeliverySelectedWeeks] = useState<string[]>([]);
  const [gtcDeliverySelectedDates, setGtcDeliverySelectedDates] = useState<string[]>([]);
  const [gtcDeliverySelectedLoaiHangs, setGtcDeliverySelectedLoaiHangs] = useState<string[]>([]);
  const [gtcDeliverySearch, setGtcDeliverySearch] = useState<string>('');
  const [gtcDeliverySortField, setGtcDeliverySortField] = useState<string>('ngay');
  const [gtcDeliverySortDir, setGtcDeliverySortDir] = useState<'asc' | 'desc'>('desc');
  const [gtcDeliveryPage, setGtcDeliveryPage] = useState<number>(1);
  const [gtcDeliveryPageSize, setGtcDeliveryPageSize] = useState<number>(20);
  const [expandedGtcDeliveryRowKey, setExpandedGtcDeliveryRowKey] = useState<string | null>(null);

  // Helper breakdown theo 3 ca: Hàng mới ca 1, Hàng mới ca 2, Hàng tồn
  const getShiftBreakdownForDelivery = (buuCuc: string, ngay: string) => {
    const shifts = ['Hàng Mới Ca 1', 'Hàng Mới Ca 2', 'Hàng Tồn'];
    const matchingRows = dataset.gtcBuuCuc.filter(r => r.buuCuc === buuCuc && r.ngay === ngay);

    return shifts.map(shiftName => {
      const shiftRows = matchingRows.filter(r => r.loaiHang.toLowerCase().trim() === shiftName.toLowerCase().trim());
      const volume = shiftRows.reduce((acc, r) => acc + (r.volume || 0), 0);
      const sldGan = shiftRows.reduce((acc, r) => acc + (r.sldGan || 0), 0);
      const sldGTC = shiftRows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
      const tiLeGan = volume > 0 ? (sldGan / volume) * 100 : 0;
      const tiLeGTC = volume > 0 ? (sldGTC / volume) * 100 : 0;
      const tonDong = volume - sldGTC;

      const weightedLt = shiftRows.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
      const avgLeadtime = volume > 0 ? weightedLt / volume : 0;

      const weightedRet = shiftRows.reduce((acc, r) => {
        const p = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
        return acc + (r.volume || 0) * p;
      }, 0);
      const avgReturnRate = volume > 0 ? (weightedRet / volume) * 100 : 0;

      return {
        loaiHang: shiftName,
        volume,
        sldGan,
        tiLeGan,
        sldGTC,
        tiLeGTC,
        tonDong,
        avgLeadtime,
        avgReturnRate,
        rowCount: shiftRows.length
      };
    });
  };

  const gtcDeliveryDailyData = useMemo(() => {
    const MANAGED_POS = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    
    // Dates from selected weeks
    let weekDates: Set<string> | null = null;
    if (gtcDeliverySelectedWeeks.length > 0) {
      const targetDates = availableWeeks
        .filter(w => gtcDeliverySelectedWeeks.includes(w.key))
        .flatMap(w => w.dates);
      weekDates = new Set(targetDates);
    }

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

      // Filter by Loai Hang if selected
      if (gtcDeliverySelectedLoaiHangs.length > 0 && !gtcDeliverySelectedLoaiHangs.includes(r.loaiHang)) {
        return;
      }

      // Filter by Week if selected
      if (weekDates && !weekDates.has(r.ngay)) {
        return;
      }

      // Filter by Date if selected
      if (gtcDeliverySelectedDates.length > 0 && !gtcDeliverySelectedDates.includes(r.ngay)) {
        return;
      }

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
      const tonDong = item.volume - item.sldGTC; // strictly (Volume) - (SLĐ GTC)
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
  }, [dataset.gtcBuuCuc, gtcDeliverySelectedWeeks, gtcDeliverySelectedDates, gtcDeliverySelectedLoaiHangs, availableWeeks]);

  const filteredGtcDeliveryDaily = useMemo(() => {
    const MANAGED_POS = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    const result = gtcDeliveryDailyData.filter(item => {
      if (gtcDeliveryFilterPo !== 'all' && item.buuCuc !== gtcDeliveryFilterPo) return false;
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
  }, [gtcDeliveryDailyData, gtcDeliveryFilterPo, gtcDeliverySearch, gtcDeliverySortField, gtcDeliverySortDir]);

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
    const headers = ['Bưu Cục', 'Ngày', 'Volume', 'SLĐ Gán', '% Gán', 'SLĐ GTC', '% GTC Bưu cục', 'Tồn Đọng'];
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
  // MA TRẬN BIỂU ĐỒ TRỰC QUAN GIAO THÀNH CÔNG BƯU CỤC
  // Bộ lọc: Tick chọn Tháng, Tick chọn Tuần, Tick chọn Ngày, Tick chọn Bưu cục, Tick chọn Loại hàng
  // =========================================================================
  const [chartSelectedMonths, setChartSelectedMonths] = useState<string[]>([]);
  const [chartSelectedWeeks, setChartSelectedWeeks] = useState<string[]>([]);
  const [chartSelectedDates, setChartSelectedDates] = useState<string[]>([]);
  const [chartSelectedPos, setChartSelectedPos] = useState<string[]>([]);
  const [chartSelectedLoaiHangs, setChartSelectedLoaiHangs] = useState<string[]>([]);

  const chartFilteredRecords = useMemo(() => {
    const MANAGED_POS = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    
    let validDates: Set<string> | null = null;
    if (chartSelectedDates.length > 0) {
      validDates = new Set(chartSelectedDates);
    } else if (chartSelectedWeeks.length > 0) {
      const dates = availableWeeks
        .filter(w => chartSelectedWeeks.includes(w.key))
        .flatMap(w => w.dates);
      validDates = new Set(dates);
    } else if (chartSelectedMonths.length > 0) {
      const dates = availableMonths
        .filter(m => chartSelectedMonths.includes(m.key))
        .flatMap(m => m.dates);
      validDates = new Set(dates);
    }

    return dataset.gtcBuuCuc.filter(r => {
      if (!r.buuCuc || !r.ngay) return false;
      if (!MANAGED_POS.includes(r.buuCuc)) return false;
      if (chartSelectedPos.length > 0 && !chartSelectedPos.includes(r.buuCuc)) return false;
      if (validDates && !validDates.has(r.ngay)) return false;
      if (chartSelectedLoaiHangs.length > 0 && !chartSelectedLoaiHangs.includes(r.loaiHang)) return false;
      return true;
    });
  }, [dataset.gtcBuuCuc, chartSelectedPos, chartSelectedMonths, chartSelectedWeeks, chartSelectedDates, chartSelectedLoaiHangs, availableMonths, availableWeeks]);

  const chartDataByPo = useMemo(() => {
    const MANAGED_POS = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
    const targetPos = chartSelectedPos.length > 0 ? chartSelectedPos : MANAGED_POS;

    return targetPos.map(po => {
      const poRows = chartFilteredRecords.filter(r => r.buuCuc === po);
      const volume = poRows.reduce((acc, r) => acc + (r.volume || 0), 0);
      const sldGan = poRows.reduce((acc, r) => acc + (r.sldGan || 0), 0);
      const sldGTC = poRows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
      const tonDong = volume - sldGTC;
      const tiLeGTC = volume > 0 ? Number(((sldGTC / volume) * 100).toFixed(2)) : 0;
      const tiLeGan = volume > 0 ? Number(((sldGan / volume) * 100).toFixed(2)) : 0;

      const ca1 = poRows.filter(r => r.loaiHang.toLowerCase().includes('ca 1')).reduce((acc, r) => acc + (r.volume || 0), 0);
      const ca2 = poRows.filter(r => r.loaiHang.toLowerCase().includes('ca 2')).reduce((acc, r) => acc + (r.volume || 0), 0);
      const ton = poRows.filter(r => r.loaiHang.toLowerCase().includes('tồn')).reduce((acc, r) => acc + (r.volume || 0), 0);

      return {
        buuCuc: po.replace('(LAN) ', ''),
        buuCucFull: po,
        volume,
        sldGan,
        sldGTC,
        tonDong,
        tiLeGTC,
        tiLeGan,
        ca1,
        ca2,
        ton
      };
    });
  }, [chartFilteredRecords, chartSelectedPos]);

  const chartDataTimeline = useMemo(() => {
    const dates = [...new Set(chartFilteredRecords.map(r => r.ngay))];
    // Sắp xếp theo đúng logic: ngày gần nhất đến ngày xa nhất
    const sorted = sortDatesDesc(dates).slice(0, 14);

    return sorted.map(d => {
      const dayRows = chartFilteredRecords.filter(r => r.ngay === d);
      const dVol = dayRows.reduce((acc, r) => acc + (r.volume || 0), 0);
      const dGtc = dayRows.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
      const dTon = dVol - dGtc;
      const tiLeGTC = dVol > 0 ? Number(((dGtc / dVol) * 100).toFixed(2)) : 0;

      return {
        date: d.slice(0, 5),
        fullDate: d,
        volume: dVol,
        sldGTC: dGtc,
        tonDong: dTon,
        tiLeGTC
      };
    });
  }, [chartFilteredRecords]);

  const chartExecutiveInsight = useMemo(() => {
    const totalVol = chartDataByPo.reduce((acc, r) => acc + r.volume, 0);
    const totalGtc = chartDataByPo.reduce((acc, r) => acc + r.sldGTC, 0);
    const totalTon = totalVol - totalGtc;
    const avgGtcRate = totalVol > 0 ? (totalGtc / totalVol) * 100 : 0;

    const validPos = chartDataByPo.filter(p => p.volume > 0);
    const sortedByGtc = [...validPos].sort((a, b) => b.tiLeGTC - a.tiLeGTC);
    const bestPo = sortedByGtc[0];
    const worstPo = sortedByGtc[sortedByGtc.length - 1];

    const aboveTarget = chartDataByPo.filter(p => p.tiLeGTC >= 67).length;
    const warning = chartDataByPo.filter(p => p.tiLeGTC < 62).length;

    const totalCa1 = chartDataByPo.reduce((acc, r) => acc + r.ca1, 0);
    const totalCa2 = chartDataByPo.reduce((acc, r) => acc + r.ca2, 0);
    const totalTonShift = chartDataByPo.reduce((acc, r) => acc + r.ton, 0);

    return {
      totalVol,
      totalGtc,
      totalTon,
      avgGtcRate,
      bestPo,
      worstPo,
      aboveTarget,
      warning,
      totalCa1,
      totalCa2,
      totalTonShift
    };
  }, [chartDataByPo]);
  return (
    <>
        {/* =========================================================================
            5.1 BẢNG "GIAO THÀNH CÔNG BƯU CỤC" (TỔNG HỢP NGUỒN SHEET "GTC BƯU CỤC")
            Cột: Bưu cục, Ngày, Volume, SLĐ Gán, % Gán, SLĐ GTC, % GTC Bưu cục, Tồn Đọng
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
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tổng hợp dữ liệu theo 5 bưu cục đang quản lý và ngày vận hành (ngày gần nhất đến xa nhất). 
                Volume = Hàng mới ca 1 + Hàng mới ca 2 + Hàng tồn; % Gán = SLĐ Gán / Volume; % GTC Bưu cục = SLĐ GTC / Volume; Tồn đọng = Volume - SLĐ GTC. Nhấn vào dòng để xem chi tiết ca. Cho phép xuất toàn bộ về Excel.
              </p>
            </div>
  
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportGtcDeliveryExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-sm transition-colors cursor-pointer"
                title="Xuất bảng Giao Thành Công Bưu Cục ra file Excel, tự động lưu trữ Google Drive &amp; mở tab mới"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Excel ({filteredGtcDeliveryDaily.length})</span>
              </button>
            </div>
          </div>
  
          {/* Toolbar Bộ lọc & Tìm kiếm */}
          <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0">
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
  
                {/* 1. Tick chọn Tuần (Dropdown dạng cuộn) */}
                <IndividualFilterDropdown
                  label="Tuần"
                  icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
                  options={availableWeeks.map(w => ({ label: w.label, value: w.key }))}
                  selectedValues={gtcDeliverySelectedWeeks}
                  onChange={vals => {
                    setGtcDeliverySelectedWeeks(vals);
                    setGtcDeliveryPage(1);
                  }}
                  compact={true}
                />
  
                {/* 2. Tick chọn Ngày (Dropdown dạng cuộn) */}
                <IndividualFilterDropdown
                  label="Ngày"
                  icon={<Calendar className="w-3.5 h-3.5 text-amber-600" />}
                  options={allUniqueDatesDesc.map((d: string) => ({ label: d, value: d }))}
                  selectedValues={gtcDeliverySelectedDates}
                  onChange={vals => {
                    setGtcDeliverySelectedDates(vals);
                    setGtcDeliveryPage(1);
                  }}
                  compact={true}
                />
  
                {/* 3. Tick chọn Loại hàng (Dropdown dạng cuộn) */}
                <IndividualFilterDropdown
                  label="Loại Hàng"
                  icon={<Layers className="w-3.5 h-3.5 text-emerald-600" />}
                  options={[
                    { label: 'Hàng Mới Ca 1', value: 'Hàng Mới Ca 1' },
                    { label: 'Hàng Mới Ca 2', value: 'Hàng Mới Ca 2' },
                    { label: 'Hàng Tồn', value: 'Hàng Tồn' }
                  ]}
                  selectedValues={gtcDeliverySelectedLoaiHangs}
                  onChange={vals => {
                    setGtcDeliverySelectedLoaiHangs(vals);
                    setGtcDeliveryPage(1);
                  }}
                  compact={true}
                />
  
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
                    className="pl-8 pr-7 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none w-44 sm:w-56"
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
                {(gtcDeliveryFilterPo !== 'all' || gtcDeliverySelectedWeeks.length > 0 || gtcDeliverySelectedDates.length > 0 || gtcDeliverySelectedLoaiHangs.length > 0 || gtcDeliverySearch.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setGtcDeliveryFilterPo('all');
                      setGtcDeliverySelectedWeeks([]);
                      setGtcDeliverySelectedDates([]);
                      setGtcDeliverySelectedLoaiHangs([]);
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
                      <span>Bưu Cục (Nhấn xem ca)</span>
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
  
                  {/* 7. % GTC Bưu cục (ĐỔI TÊN THEO YÊU CẦU) */}
                  <th
                    onClick={() => handleSortGtcDelivery('tiLeGTC')}
                    className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Nhấn để sắp xếp theo % GTC Bưu cục = (SLĐ GTC / Volume)"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>% GTC Bưu cục</span>
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
                  paginatedGtcDeliveryDaily.map((row) => {
                    const isExpanded = expandedGtcDeliveryRowKey === row.id;
                    const shiftBreakdown = isExpanded ? getShiftBreakdownForDelivery(row.buuCuc, row.ngay) : [];
  
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => setExpandedGtcDeliveryRowKey(isExpanded ? null : row.id)}
                          className={`hover:bg-emerald-50/40 dark:hover:bg-slate-750/70 transition-colors cursor-pointer select-none ${
                            isExpanded ? 'bg-emerald-50/60 dark:bg-slate-750/90 font-semibold border-l-4 border-emerald-500' : ''
                          }`}
                          title="Nhấn để mở rộng / thu gọn chi tiết ca (Hàng mới ca 1, Ca 2, Hàng tồn)"
                        >
                          {/* Bưu Cục */}
                          <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
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
  
                          {/* % GTC Bưu cục */}
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
  
                        {/* CHI TIẾT MỞ RỘNG: HÀNG MỚI CA 1, HÀNG MỚI CA 2, HÀNG TỒN */}
                        {isExpanded && (
                          <tr className="bg-slate-50/95 dark:bg-slate-900/90 border-b-2 border-emerald-400 dark:border-emerald-600 animate-in fade-in duration-150">
                            <td colSpan={8} className="p-3 md:p-4">
                              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-emerald-200 dark:border-slate-700 shadow-sm space-y-2">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-600" />
                                    <h5 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase">
                                      Chi Tiết Ca Vận Hành: {row.buuCuc} &bull; Ngày {row.ngay}
                                    </h5>
                                  </div>
                                  <span className="text-[11px] text-emerald-600 font-bold">
                                    Tổng: {row.volume.toLocaleString('vi-VN')} đơn &bull; %GTC Bưu cục: {row.tiLeGTC.toFixed(2)}%
                                  </span>
                                </div>
  
                                <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700 shadow-inner">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold">
                                      <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-3 py-2">Loại Hàng / Ca</th>
                                        <th className="px-3 py-2 text-center">Volume</th>
                                        <th className="px-3 py-2 text-center">SLĐ Gán</th>
                                        <th className="px-3 py-2 text-center">% Gán</th>
                                        <th className="px-3 py-2 text-center">SLĐ GTC</th>
                                        <th className="px-3 py-2 text-center">% GTC Bưu cục</th>
                                        <th className="px-3 py-2 text-center">Tồn Đọng</th>
                                        <th className="px-3 py-2 text-center">Leadtime (h)</th>
                                        <th className="px-3 py-2 text-center">% Chuyển Trả</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {shiftBreakdown.map(shift => (
                                        <tr key={shift.loaiHang} className="hover:bg-emerald-50/30">
                                          <td className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${
                                              shift.loaiHang.includes('Ca 1') ? 'bg-sky-500' :
                                              shift.loaiHang.includes('Ca 2') ? 'bg-purple-500' : 'bg-amber-500'
                                            }`} />
                                            <span>{shift.loaiHang}</span>
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-bold text-slate-900 dark:text-white">
                                            {shift.volume.toLocaleString('vi-VN')}
                                          </td>
                                          <td className="px-3 py-1.5 text-center text-slate-600 dark:text-slate-300">
                                            {shift.sldGan.toLocaleString('vi-VN')}
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-bold text-blue-600">
                                            {shift.tiLeGan.toFixed(2)}%
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-bold text-emerald-600">
                                            {shift.sldGTC.toLocaleString('vi-VN')}
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-black">
                                            <span className={`px-2 py-0.5 rounded-full inline-flex items-center justify-center text-[10px] ${
                                              shift.tiLeGTC < 62 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                                              shift.tiLeGTC < 67 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                            }`}>
                                              {shift.tiLeGTC.toFixed(2)}%
                                            </span>
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-bold text-rose-600">
                                            {shift.tonDong.toLocaleString('vi-VN')}
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-medium">
                                            {shift.avgLeadtime > 0 ? shift.avgLeadtime.toFixed(1) : '-'}
                                          </td>
                                          <td className="px-3 py-1.5 text-center font-medium text-amber-600">
                                            {shift.avgReturnRate > 0 ? `${shift.avgReturnRate.toFixed(2)}%` : '0.00%'}
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
            5.2 MA TRẬN BIỂU ĐỒ TRỰC QUAN GIAO THÀNH CÔNG BƯU CỤC
            Bộ lọc: Tick chọn Tháng, Tick chọn Tuần, Tick chọn Ngày, Tick chọn Bưu cục, Tick chọn Loại hàng
           ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-4">
          {/* Header Ma Trận Biểu Đồ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  MA TRẬN BIỂU ĐỒ TRỰC QUAN GIAO THÀNH CÔNG BƯU CỤC
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Phân tích trực quan sản lượng Volume, SLĐ GTC, Tồn đọng, cơ cấu Loại hàng (Ca 1, Ca 2, Hàng tồn) và tỷ lệ % GTC Bưu cục so với ngưỡng chuẩn khu vực (62% cảnh báo, 67% đạt chuẩn).
              </p>
            </div>
          </div>
  
          {/* Toolbar 5 Bộ lọc Tick chọn dạng cuộn: Tháng, Tuần, Ngày, Bưu cục, Loại hàng */}
          <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" /> Bộ lọc biểu đồ:
                </span>
  
                {/* 1. Tick chọn Tháng */}
                <IndividualFilterDropdown
                  label="Tháng"
                  icon={<Calendar className="w-3.5 h-3.5 text-purple-600" />}
                  options={availableMonths.map(m => ({ label: m.label, value: m.key }))}
                  selectedValues={chartSelectedMonths}
                  onChange={setChartSelectedMonths}
                  compact={true}
                />
  
                {/* 2. Tick chọn Tuần */}
                <IndividualFilterDropdown
                  label="Tuần"
                  icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
                  options={availableWeeks.map(w => ({ label: w.label, value: w.key }))}
                  selectedValues={chartSelectedWeeks}
                  onChange={setChartSelectedWeeks}
                  compact={true}
                />
  
                {/* 3. Tick chọn Ngày */}
                <IndividualFilterDropdown
                  label="Ngày"
                  icon={<Calendar className="w-3.5 h-3.5 text-amber-600" />}
                  options={allUniqueDatesDesc.map((d: string) => ({ label: d, value: d }))}
                  selectedValues={chartSelectedDates}
                  onChange={setChartSelectedDates}
                  compact={true}
                />
  
                {/* 4. Tick chọn Bưu Cục */}
                <IndividualFilterDropdown
                  label="Bưu Cục"
                  icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
                  options={[
                    { label: '(LAN) Cần Đước 1', value: '(LAN) Cần Đước 1' },
                    { label: '(LAN) Cần Giuộc', value: '(LAN) Cần Giuộc' },
                    { label: '(LAN) Phước Lý', value: '(LAN) Phước Lý' },
                    { label: '(LAN) Rạch Kiến', value: '(LAN) Rạch Kiến' },
                    { label: '(LAN) Tầm Vu', value: '(LAN) Tầm Vu' }
                  ]}
                  selectedValues={chartSelectedPos}
                  onChange={setChartSelectedPos}
                  compact={true}
                />
  
                {/* 5. Tick chọn Loại hàng */}
                <IndividualFilterDropdown
                  label="Loại Hàng"
                  icon={<Layers className="w-3.5 h-3.5 text-emerald-600" />}
                  options={[
                    { label: 'Hàng Mới Ca 1', value: 'Hàng Mới Ca 1' },
                    { label: 'Hàng Mới Ca 2', value: 'Hàng Mới Ca 2' },
                    { label: 'Hàng Tồn', value: 'Hàng Tồn' }
                  ]}
                  selectedValues={chartSelectedLoaiHangs}
                  onChange={setChartSelectedLoaiHangs}
                  compact={true}
                />
  
                {/* Reset biểu đồ */}
                {(chartSelectedMonths.length > 0 || chartSelectedWeeks.length > 0 || chartSelectedDates.length > 0 || chartSelectedPos.length > 0 || chartSelectedLoaiHangs.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setChartSelectedMonths([]);
                      setChartSelectedWeeks([]);
                      setChartSelectedDates([]);
                      setChartSelectedPos([]);
                      setChartSelectedLoaiHangs([]);
                    }}
                    className="text-rose-600 hover:text-rose-800 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer ml-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>
  
              <div className="text-[11px] text-slate-400">
                Tổng số ca vận hành lọc: <strong className="text-slate-700 dark:text-slate-200">{chartFilteredRecords.length}</strong> ca
              </div>
            </div>
          </div>
  
          {/* Lưới 4 Biểu Đồ Trong Ma Trận */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Biểu đồ 1: So sánh Volume, SLĐ GTC & Tồn Đọng theo Bưu Cục */}
            <div className="bg-slate-50/60 dark:bg-slate-750/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>1. Sản Lượng Volume, SLĐ GTC & Tồn Đọng Theo Bưu Cục</span>
                </h4>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataByPo} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="buuCuc" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [Number(val).toLocaleString('vi-VN'), String(name || '')]}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="volume" name="Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sldGTC" name="SLĐ GTC" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tonDong" name="Tồn Đọng" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
  
            {/* Biểu đồ 2: So sánh % GTC Bưu Cục & Ngưỡng Chuẩn Khu Vực (62% Cảnh Báo, 67% Chuẩn) */}
            <div className="bg-slate-50/60 dark:bg-slate-750/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>2. % GTC Bưu Cục & Ngưỡng Chuẩn Khu Vực (62% & 67%)</span>
                </h4>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataByPo} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="buuCuc" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val}%`, String(name || '')]}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <ReferenceLine y={67} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Chuẩn Đạt: 67%', position: 'insideTopRight', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
                    <ReferenceLine y={62} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Cảnh Báo: 62%', position: 'insideBottomRight', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="tiLeGTC" name="% GTC Bưu cục" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="tiLeGan" name="% Gán" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
  
            {/* Biểu đồ 3: Cơ cấu Loại hàng (Hàng Mới Ca 1, Ca 2, Hàng Tồn) theo Bưu Cục */}
            <div className="bg-slate-50/60 dark:bg-slate-750/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>3. Phân Bổ Sản Lượng Theo Loại Hàng (Ca 1, Ca 2, Tồn)</span>
                </h4>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataByPo} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="buuCuc" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [Number(val).toLocaleString('vi-VN'), String(name || '')]}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="ca1" name="Hàng Mới Ca 1" stackId="a" fill="#0284c7" />
                    <Bar dataKey="ca2" name="Hàng Mới Ca 2" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="ton" name="Hàng Tồn" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
  
            {/* Biểu đồ 4: Diễn biến % GTC Bưu Cục & Volume theo Ngày */}
            <div className="bg-slate-50/60 dark:bg-slate-750/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>4. Xu Hướng % GTC Bưu Cục & Volume Qua Các Ngày Gần Nhất</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 normal-case bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 ml-1">
                    Ngày gần nhất &rarr; Xa nhất
                  </span>
                </h4>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [String(name || '').includes('%') ? `${val}%` : Number(val).toLocaleString('vi-VN'), String(name || '')]}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar yAxisId="left" dataKey="volume" name="Volume" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="tiLeGTC" name="% GTC Bưu cục" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
  
          {/* Khối Đánh Giá Chiến Lược & Nhận Định Vận Hành */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl border border-indigo-900 text-white space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-indigo-800/60">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Nhận Định & Đánh Giá Vận Hành Từ Ma Trận Dữ Liệu
              </h4>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Thẻ 1 */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Tỷ lệ GTC Toàn Khu Vực</span>
                <div className="text-base font-black text-emerald-400">
                  {chartExecutiveInsight.avgGtcRate.toFixed(2)}%
                </div>
                <p className="text-[11px] text-slate-300">
                  {chartExecutiveInsight.avgGtcRate >= 67
                    ? 'Vận hành đạt chuẩn mục tiêu (≥ 67%).'
                    : chartExecutiveInsight.avgGtcRate >= 62
                    ? 'Vận hành ở mức trung bình (62% - 67%). Cần đẩy mạnh giao ca 2.'
                    : 'Cảnh báo: Dưới ngưỡng sàn 62%. Cần rà soát ngay tồn đọng.'}
                </p>
              </div>
  
              {/* Thẻ 2 */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Bưu Cục Dẫn Đầu</span>
                <div className="text-base font-black text-sky-400">
                  {chartExecutiveInsight.bestPo ? chartExecutiveInsight.bestPo.buuCuc : 'N/A'}
                </div>
                <p className="text-[11px] text-slate-300">
                  Đạt <strong>{chartExecutiveInsight.bestPo ? chartExecutiveInsight.bestPo.tiLeGTC.toFixed(2) : 0}%</strong> GTC với {chartExecutiveInsight.bestPo ? chartExecutiveInsight.bestPo.volume.toLocaleString('vi-VN') : 0} đơn.
                </p>
              </div>
  
              {/* Thẻ 3 */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Bưu Cục Cần Lưu Ý</span>
                <div className="text-base font-black text-rose-400">
                  {chartExecutiveInsight.worstPo ? chartExecutiveInsight.worstPo.buuCuc : 'N/A'}
                </div>
                <p className="text-[11px] text-slate-300">
                  %GTC đạt <strong>{chartExecutiveInsight.worstPo ? chartExecutiveInsight.worstPo.tiLeGTC.toFixed(2) : 0}%</strong>. Tồn đọng {chartExecutiveInsight.worstPo ? chartExecutiveInsight.worstPo.tonDong.toLocaleString('vi-VN') : 0} đơn.
                </p>
              </div>
  
              {/* Thẻ 4 */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Cơ Cấu Hàng Ca & Tồn</span>
                <div className="text-base font-black text-amber-400">
                  {chartExecutiveInsight.totalVol > 0 ? ((chartExecutiveInsight.totalTonShift / chartExecutiveInsight.totalVol) * 100).toFixed(1) : 0}% tồn
                </div>
                <p className="text-[11px] text-slate-300">
                  Ca 1: {chartExecutiveInsight.totalCa1.toLocaleString('vi-VN')} &bull; Ca 2: {chartExecutiveInsight.totalCa2.toLocaleString('vi-VN')} &bull; Tồn: {chartExecutiveInsight.totalTonShift.toLocaleString('vi-VN')}.
                </p>
              </div>
            </div>
          </div>
        </div>
    </>
  );
};
