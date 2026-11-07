import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Coins, 
  Search, 
  TrendingUp, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  AlertTriangle, 
  PackageCheck, 
  Truck, 
  DollarSign, 
  Sparkles, 
  CalendarCheck,
  BarChart3,
  Eye,
  EyeOff,
  Activity,
  Flame,
  Building2,
  Users,
  Clock,
  Calendar,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import type { DailySalaryRecord } from '../types/dashboard';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { sortDatesDesc, extractMonths, extractWeeks } from '../utils/dateEngine';
import type { MonthFilterOption, WeekFilterOption } from '../utils/dateEngine';

// Danh sách bưu cục chuẩn & mã màu nhận diện
const PO_ORDER = [
  '(LAN) Rạch Kiến',
  '(LAN) Phước Lý',
  '(LAN) Cần Giuộc',
  '(LAN) Cần Đước',
  '(LAN) Tầm Vu',
  '(LAN) Cần Đước 1'
];

const PO_COLOR_MAP: Record<string, { stroke: string; fill: string; short: string }> = {
  '(LAN) Rạch Kiến': { stroke: '#F97316', fill: '#FED7AA', short: 'Rạch Kiến' }, // Cam GHN
  '(LAN) Phước Lý': { stroke: '#8B5CF6', fill: '#DDD6FE', short: 'Phước Lý' },   // Tím
  '(LAN) Cần Giuộc': { stroke: '#10B981', fill: '#A7F3D0', short: 'Cần Giuộc' }, // Xanh lục
  '(LAN) Cần Đước': { stroke: '#3B82F6', fill: '#BFDBFE', short: 'Cần Đước' },   // Xanh dương
  '(LAN) Tầm Vu': { stroke: '#EC4899', fill: '#FBCFE8', short: 'Tầm Vu' },       // Hồng
  '(LAN) Cần Đước 1': { stroke: '#EAB308', fill: '#FEF08A', short: 'Cần Đước 1' } // Vàng
};

// =========================================================================
// COMPONENT: BỘ LỌC TÁCH RỜI RIÊNG BIỆT (INDIVIDUAL FILTER DROPDOWN)
// =========================================================================
interface IndividualFilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (newValues: string[]) => void;
  searchPlaceholder?: string;
  minWidth?: string;
  compact?: boolean;
}

const IndividualFilterDropdown: React.FC<IndividualFilterDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  searchPlaceholder = 'Tìm kiếm...',
  minWidth = 'w-64',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside để tự động đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;
  const isSomeSelected = selectedValues.length > 0;

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return compact ? label : `Tất cả ${label}`;
    if (selectedValues.length === 1) {
      const found = options.find(o => o.value === selectedValues[0]);
      return found ? found.label.replace('(LAN) ', '') : selectedValues[0];
    }
    return `${label} (${selectedValues.length})`;
  }, [selectedValues, options, label, compact]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`inline-flex items-center transition-all ${
          compact
            ? 'gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md'
            : 'gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg'
        } border ${
          isSomeSelected
            ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300 shadow-xs'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
        }`}
      >
        <span className={`${isSomeSelected ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'} shrink-0`}>
          {icon}
        </span>
        <span className={`truncate ${compact ? 'max-w-[95px]' : 'max-w-[125px]'}`}>{displayText}</span>
        {isSomeSelected && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-600 text-white shrink-0">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute right-0 mt-1.5 ${minWidth} max-w-[320px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2.5 space-y-2 text-xs`}>
          {/* Header & Quick Action */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1">
              {icon}
              <span>Lọc {label}</span>
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
              >
                {isAllSelected ? 'Bỏ chọn' : 'Chọn hết'}
              </button>
              {isSomeSelected && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Search Box (nếu danh sách dài hơn 5 mục) */}
          {options.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Option list scrollable */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-slate-400 italic text-[11px]">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map(opt => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[11.5px] ${
                      checked
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10.5px] text-slate-400">
            <span>Đã chọn: <strong className="text-orange-600 font-bold">{selectedValues.length}</strong> / {options.length}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// COMPONENT: BỘ LỌC CHU KỲ PHÂN ĐOÀN (THÁNG, TUẦN, TICK CHỌN NGÀY)
// =========================================================================
interface PeriodicFilterToolbarProps {
  selectedMonth: string;
  onMonthChange: (monthKey: string) => void;
  availableMonths: MonthFilterOption[];

  selectedWeek: string;
  onWeekChange: (weekKey: string) => void;
  availableWeeks: WeekFilterOption[];

  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  availableDates: string[];

  onReset: () => void;
  hasExtraActive?: boolean;
}

const PeriodicFilterToolbar: React.FC<PeriodicFilterToolbarProps> = ({
  selectedMonth,
  onMonthChange,
  availableMonths,
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedDates,
  onDatesChange,
  availableDates,
  onReset,
  hasExtraActive = false
}) => {
  const hasActive = Boolean(selectedMonth || selectedWeek || (selectedDates && selectedDates.length > 0) || hasExtraActive);

  const dateOptions = useMemo(() => {
    let datesToShow = availableDates;
    if (selectedMonth) {
      const m = availableMonths.find(opt => opt.key === selectedMonth);
      if (m) datesToShow = m.dates;
    }
    if (selectedWeek) {
      const w = availableWeeks.find(opt => opt.key === selectedWeek);
      if (w) datesToShow = w.dates;
    }
    return datesToShow.map(d => ({ label: d, value: d }));
  }, [availableDates, selectedMonth, selectedWeek, availableMonths, availableWeeks]);

  const weeksToShow = useMemo(() => {
    if (!selectedMonth) return availableWeeks;
    const m = availableMonths.find(opt => opt.key === selectedMonth);
    if (!m) return availableWeeks;
    const mDateSet = new Set(m.dates);
    return availableWeeks.filter(w => w.dates.some(d => mDateSet.has(d)));
  }, [availableWeeks, selectedMonth, availableMonths]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {/* 1. Chọn Tháng */}
      <select
        value={selectedMonth}
        onChange={e => onMonthChange(e.target.value)}
        className={`h-7 px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
          selectedMonth
            ? 'bg-orange-50 border-orange-300 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-200'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
        }`}
      >
        <option value="">Tất cả Tháng</option>
        {availableMonths.map(m => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>

      {/* 2. Chọn Tuần */}
      <select
        value={selectedWeek}
        onChange={e => onWeekChange(e.target.value)}
        className={`h-7 px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
          selectedWeek
            ? 'bg-orange-50 border-orange-300 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-200'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
        }`}
      >
        <option value="">Tất cả Tuần</option>
        {weeksToShow.map(w => (
          <option key={w.key} value={w.key}>
            {w.label}
          </option>
        ))}
      </select>

      {/* 3. Tick chọn ngày (IndividualFilterDropdown) */}
      <IndividualFilterDropdown
        label="Ngày"
        icon={<Calendar className="w-3 h-3" />}
        options={dateOptions}
        selectedValues={selectedDates}
        onChange={onDatesChange}
        searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
        minWidth="w-56"
      />

      {/* 4. Reset nếu có filter */}
      {hasActive && (
        <button
          type="button"
          onClick={onReset}
          className="h-7 px-2 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
          title="Đặt lại bộ lọc thời gian này"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
};

// Hàm lọc dữ liệu theo kỳ thời gian
function filterRecordsByPeriod<T extends { ngay: string }>(
  records: T[],
  monthKey: string,
  weekKey: string,
  selectedDates: string[],
  availableMonths: MonthFilterOption[],
  availableWeeks: WeekFilterOption[]
): T[] {
  let res = records;
  if (monthKey) {
    const foundMonth = availableMonths.find(m => m.key === monthKey);
    if (foundMonth) {
      const monthDates = new Set(foundMonth.dates);
      res = res.filter(r => monthDates.has(r.ngay));
    }
  }
  if (weekKey) {
    const foundWeek = availableWeeks.find(w => w.key === weekKey);
    if (foundWeek) {
      const weekDates = new Set(foundWeek.dates);
      res = res.filter(r => weekDates.has(r.ngay));
    }
  }
  if (selectedDates && selectedDates.length > 0) {
    const daySet = new Set(selectedDates);
    res = res.filter(r => daySet.has(r.ngay));
  }
  return res;
}

// Hàm tính số ngày thâm niên: Ngày hiện tại đối chiếu với Ngày vào làm
const calculateSeniorityDays = (ngayVaoLamStr?: string): number | null => {
  if (!ngayVaoLamStr || !ngayVaoLamStr.trim()) return null;
  const match = ngayVaoLamStr.trim().match(/^(\d+)\s+thg\s+(\d+),\s+(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = parseInt(match[3], 10);
  const startDate = new Date(year, month, day);
  const now = new Date('2026-11-06T18:15:42+07:00'); // Thời điểm hệ thống vận hành
  const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
};

export const DailySalaryTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();

  // Independent Filter state (Đồng bộ bưu cục toàn hệ thống)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    buuCuc: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : [],
    nhanVien: [],
    thamNien: [],
    ngay: []
  }));

  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterValues(prev => ({
        ...prev,
        buuCuc: [selectedBuuCucGlobal]
      }));
    }
  }, [selectedBuuCucGlobal]);

  // Controls cho Ma Trận Thu Nhập Bưu Cục
  const [matrixRange, setMatrixRange] = useState<'7' | '14' | 'all'>('7');
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [expandedMatrixPos, setExpandedMatrixPos] = useState<Set<string>>(new Set());
  const [showMatrixChart, setShowMatrixChart] = useState<boolean>(true);
  const [matrixChartView, setMatrixChartView] = useState<'overview' | 'lines' | 'stacked'>('overview');
  const [focusedMatrixPo, setFocusedMatrixPo] = useState<string>('all');

  // Filter options
  const buuCucOptions = useMemo(() => {
    return [...new Set(dataset.hoaHongNgay.map(r => r.tenBC))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.hoaHongNgay]);

  const nhanVienOptions = useMemo(() => {
    const map = new Map<string, string>();
    dataset.hoaHongNgay.forEach(r => {
      if (r.maNV && !map.has(r.maNV)) {
        map.set(r.maNV, `${r.tenNV} (${r.maNV})`);
      }
    });
    return Array.from(map.entries()).map(([val, lbl]) => ({ label: lbl, value: val }));
  }, [dataset.hoaHongNgay]);

  const thamNienOptions = useMemo(() => {
    return [...new Set(dataset.hoaHongNgay.map(r => r.thamNien))].filter(Boolean).map(t => ({ label: t, value: t }));
  }, [dataset.hoaHongNgay]);

  const allUniqueDatesDesc = useMemo(() => {
    const dates = [...new Set(dataset.hoaHongNgay.map(r => r.ngay))].filter(Boolean);
    return sortDatesDesc(dates);
  }, [dataset.hoaHongNgay]);

  const ngayOptions = useMemo(() => {
    return allUniqueDatesDesc.map(n => ({ label: n, value: n }));
  }, [allUniqueDatesDesc]);

  const availableMonths = useMemo(() => {
    return extractMonths(allUniqueDatesDesc);
  }, [allUniqueDatesDesc]);

  const availableWeeks = useMemo(() => {
    return extractWeeks(allUniqueDatesDesc);
  }, [allUniqueDatesDesc]);

  // Bộ lọc chu kỳ cho từng phân đoạn (Section 2, 3, 4, 5, 6)
  // Section 2: Ma Trận Đối Chiếu Thu Nhập
  const [sec2Month, setSec2Month] = useState<string>('');
  const [sec2Week, setSec2Week] = useState<string>('');
  const [sec2Dates, setSec2Dates] = useState<string[]>([]);

  // Section 3: Sản Lượng Giao & Lấy
  const [sec3Month, setSec3Month] = useState<string>('');
  const [sec3Week, setSec3Week] = useState<string>('');
  const [sec3Dates, setSec3Dates] = useState<string[]>([]);

  // Section 4: Top 10 Cao & Thấp
  const [topHighMonth, setTopHighMonth] = useState<string>('');
  const [topHighWeek, setTopHighWeek] = useState<string>('');
  const [topHighDates, setTopHighDates] = useState<string[]>([]);

  const [topLowMonth, setTopLowMonth] = useState<string>('');
  const [topLowWeek, setTopLowWeek] = useState<string>('');
  const [topLowDates, setTopLowDates] = useState<string[]>([]);

  // Section 5: Thống Kê Ngày Công & Chi Tiết Nhóm
  const [sec5Month, setSec5Month] = useState<string>('');
  const [sec5Week, setSec5Week] = useState<string>('');
  const [sec5Dates, setSec5Dates] = useState<string[]>([]);
  const [selectedAttendanceGroup, setSelectedAttendanceGroup] = useState<'full' | 'mid' | 'low' | null>(null);

  // Section 6: Bảng Chi Tiết Hoa Hồng
  const [detailMonth, setDetailMonth] = useState<string>('');
  const [detailWeek, setDetailWeek] = useState<string>('');
  const [detailDates, setDetailDates] = useState<string[]>([]);
  const [detailBuuCuc, setDetailBuuCuc] = useState<string[]>([]);

  const totalActiveFilters = useMemo(() => {
    return (filterValues.buuCuc?.length || 0) +
      (filterValues.nhanVien?.length || 0) +
      (filterValues.thamNien?.length || 0) +
      (filterValues.ngay?.length || 0);
  }, [filterValues]);

  const handleResetAllFilters = () => {
    setFilterValues({
      buuCuc: [],
      nhanVien: [],
      thamNien: [],
      ngay: []
    });
  };

  const handleBuuCucChange = (vals: string[]) => {
    setFilterValues(prev => ({ ...prev, buuCuc: vals }));
  };

  const handleNhanVienChange = (vals: string[]) => {
    setFilterValues(prev => ({ ...prev, nhanVien: vals }));
  };

  const handleThamNienChange = (vals: string[]) => {
    setFilterValues(prev => ({ ...prev, thamNien: vals }));
  };

  const handleNgayChange = (vals: string[]) => {
    setFilterValues(prev => ({ ...prev, ngay: vals }));
  };

  // Apply filters
  const filteredData = useMemo(() => {
    return dataset.hoaHongNgay.filter(r => {
      if (filterValues.buuCuc?.length && !filterValues.buuCuc.includes(r.tenBC)) return false;
      if (filterValues.nhanVien?.length && !filterValues.nhanVien.includes(r.maNV)) return false;
      if (filterValues.thamNien?.length && !filterValues.thamNien.includes(r.thamNien)) return false;
      if (filterValues.ngay?.length && !filterValues.ngay.includes(r.ngay)) return false;
      return true;
    });
  }, [dataset.hoaHongNgay, filterValues]);

  // Tab KPIs
  const tabKPIs = useMemo(() => {
    const totalLuong = filteredData.reduce((acc, r) => acc + (r.tongLuong || 0), 0);
    const totalLuongHH = filteredData.reduce((acc, r) => acc + (r.luongHHNgay || 0), 0);
    const totalLuongDamBao = filteredData.reduce((acc, r) => acc + (r.luongDamBao || 0), 0);
    const totalGiaoTL = filteredData.reduce((acc, r) => acc + (r.donGiaoTinhLuong || 0), 0);
    const totalLayTL = filteredData.reduce((acc, r) => acc + (r.donLayTinhLuong || 0), 0);
    const totalGanGiao = filteredData.reduce((acc, r) => acc + (r.soDonGanGiao || 0), 0);
    const totalGanLay = filteredData.reduce((acc, r) => acc + (r.soDonGanLay || 0), 0);
    const totalNgayCong = filteredData.reduce((acc, r) => acc + (r.soNgayDiLam || 0), 0);

    const avgSalaryPerDay = totalNgayCong > 0 ? totalLuong / totalNgayCong : 0;
    const avgCostPerOrder = (totalGiaoTL + totalLayTL) > 0 ? totalLuong / (totalGiaoTL + totalLayTL) : 0;
    const layRate = totalGanLay > 0 ? (totalLayTL / totalGanLay) * 100 : 0;

    return {
      totalLuong,
      totalLuongHH,
      totalLuongDamBao,
      totalGiaoTL,
      totalLayTL,
      totalGanGiao,
      totalGanLay,
      totalNgayCong,
      avgSalaryPerDay,
      avgCostPerOrder,
      layRate
    };
  }, [filteredData]);

  // =========================================================================
  // MỤC 1: MA TRẬN THU NHẬP CỦA TỪNG BƯU CỤC QUA TỪNG NGÀY & CHI TIẾT NHÂN VIÊN
  // =========================================================================
  const matrixDates = useMemo(() => {
    if (matrixRange === '7') return allUniqueDatesDesc.slice(0, 7);
    if (matrixRange === '14') return allUniqueDatesDesc.slice(0, 14);
    return allUniqueDatesDesc;
  }, [allUniqueDatesDesc, matrixRange]);

  interface EmpMatrixSalary {
    maNV: string;
    tenNV: string;
    buuCuc: string;
    daily: Record<string, { tongLuong: number; donGiao: number; donLay: number; soCong: number }>;
    totalLuong: number;
    totalCong: number;
    avgLuongPerDay: number;
  }

  interface PoMatrixSalary {
    buuCuc: string;
    employees: Record<string, EmpMatrixSalary>;
    daily: Record<string, { tongLuong: number; donGiao: number; donLay: number; soCong: number }>;
    totalLuong: number;
    totalCong: number;
    avgLuongPerDay: number;
    staffCount: number;
  }

  const matrixData = useMemo(() => {
    const poList = [...new Set(dataset.hoaHongNgay.map(r => r.tenBC))].filter(Boolean).sort();
    const poMap: Record<string, PoMatrixSalary> = {};

    poList.forEach(po => {
      poMap[po] = {
        buuCuc: po,
        employees: {},
        daily: {},
        totalLuong: 0,
        totalCong: 0,
        avgLuongPerDay: 0,
        staffCount: 0
      };
    });

    dataset.hoaHongNgay.forEach(r => {
      const po = r.tenBC;
      if (!poMap[po]) return;

      // Nhân viên
      if (!poMap[po].employees[r.maNV]) {
        poMap[po].employees[r.maNV] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: po,
          daily: {},
          totalLuong: 0,
          totalCong: 0,
          avgLuongPerDay: 0
        };
      }
      const emp = poMap[po].employees[r.maNV];
      if (!emp.daily[r.ngay]) {
        emp.daily[r.ngay] = { tongLuong: 0, donGiao: 0, donLay: 0, soCong: 0 };
      }
      emp.daily[r.ngay].tongLuong += r.tongLuong || 0;
      emp.daily[r.ngay].donGiao += r.donGiaoTinhLuong || 0;
      emp.daily[r.ngay].donLay += r.donLayTinhLuong || 0;
      emp.daily[r.ngay].soCong += r.soNgayDiLam || 0;

      emp.totalLuong += r.tongLuong || 0;
      emp.totalCong += r.soNgayDiLam || 0;

      // Bưu cục
      if (!poMap[po].daily[r.ngay]) {
        poMap[po].daily[r.ngay] = { tongLuong: 0, donGiao: 0, donLay: 0, soCong: 0 };
      }
      poMap[po].daily[r.ngay].tongLuong += r.tongLuong || 0;
      poMap[po].daily[r.ngay].donGiao += r.donGiaoTinhLuong || 0;
      poMap[po].daily[r.ngay].donLay += r.donLayTinhLuong || 0;
      poMap[po].daily[r.ngay].soCong += r.soNgayDiLam || 0;

      poMap[po].totalLuong += r.tongLuong || 0;
      poMap[po].totalCong += r.soNgayDiLam || 0;
    });

    // Tính chỉ số bình quân
    Object.values(poMap).forEach(p => {
      p.staffCount = Object.keys(p.employees).length;
      p.avgLuongPerDay = p.totalCong > 0 ? Math.round(p.totalLuong / p.totalCong) : 0;
      Object.values(p.employees).forEach(e => {
        e.avgLuongPerDay = e.totalCong > 0 ? Math.round(e.totalLuong / e.totalCong) : 0;
      });
    });

    return poMap;
  }, [dataset.hoaHongNgay]);

  // Toggle expand/collapse bưu cục trong ma trận
  const toggleMatrixPo = (poName: string) => {
    setExpandedMatrixPos(prev => {
      const next = new Set(prev);
      if (next.has(poName)) next.delete(poName);
      else next.add(poName);
      return next;
    });
  };

  const handleExpandAllMatrix = () => {
    const allPos = Object.keys(matrixData);
    if (expandedMatrixPos.size === allPos.length) {
      setExpandedMatrixPos(new Set());
    } else {
      setExpandedMatrixPos(new Set(allPos));
    }
  };

  // Helper render badge thu nhập ma trận
  const renderSalaryCell = (luong: number, isEmployee = false) => {
    if (!luong || luong <= 0) {
      return <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">-</span>;
    }

    if (isEmployee) {
      const formattedK = luong >= 1e6 ? `${(luong / 1e6).toFixed(2)}tr` : `${Math.round(luong / 1000)}k`;
      let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      if (luong >= 1e6) {
        colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800';
      } else if (luong >= 500000) {
        colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold';
      } else if (luong < 250000) {
        colorClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-medium';
      }

      return (
        <span 
          className={`px-1.5 py-0.5 rounded text-[10.5px] inline-block font-mono ${colorClass}`}
          title={`${luong.toLocaleString('vi-VN')} VNĐ`}
        >
          {formattedK}
        </span>
      );
    }

    // Bưu cục
    const formattedTr = `${(luong / 1e6).toFixed(1)}tr`;
    return (
      <span 
        className="px-2 py-0.5 rounded text-[11px] font-bold inline-block bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-200 dark:border-orange-800"
        title={`${luong.toLocaleString('vi-VN')} VNĐ`}
      >
        {formattedTr}
      </span>
    );
  };

  // Dữ liệu đồ thị ma trận thu nhập theo thời gian (sắp xếp logic: từ ngày gần nhất đến ngày xa nhất)
  const matrixChartData = useMemo(() => {
    // Thứ tự ngày từ gần nhất đến xa nhất (Newest -> Oldest)
    const datesRecentFirst = [...matrixDates];

    return datesRecentFirst.map(date => {
      const entry: Record<string, any> = {
        date,
        shortDate: date.slice(0, 5) // "09/10"
      };

      let sumRegion = 0;
      let sumCong = 0;
      let sumDon = 0;
      let countWithVal = 0;

      PO_ORDER.forEach(po => {
        const dayData = matrixData[po]?.daily[date];
        const val = dayData?.tongLuong || 0;
        const cong = dayData?.soCong || 0;
        const don = (dayData?.donGiao || 0) + (dayData?.donLay || 0);

        const rounded = Math.round(val);
        entry[po] = rounded;
        entry[`${po}_cong`] = cong;
        entry[`${po}_don`] = don;
        entry[`${po}_avgCong`] = cong > 0 ? Math.round(val / cong) : 0;

        sumRegion += rounded;
        sumCong += cong;
        sumDon += don;
        if (rounded > 0) countWithVal++;
      });

      entry.totalRegion = sumRegion;
      entry.totalCong = sumCong;
      entry.totalDon = sumDon;
      entry.avgPo = countWithVal > 0 ? Math.round(sumRegion / countWithVal) : Math.round(sumRegion / PO_ORDER.length);
      entry.avgLuongPerCong = sumCong > 0 ? Math.round(sumRegion / sumCong) : 0;
      entry.costPerOrder = sumDon > 0 ? Math.round(sumRegion / sumDon) : 0;

      return entry;
    });
  }, [matrixDates, matrixData]);

  // Chỉ số tổng hợp toàn khu vực trong kỳ ma trận đang chọn (Executive Regional Summary)
  const regionalMatrixSummary = useMemo(() => {
    if (!matrixChartData.length) return null;

    let totalRegionSalary = 0;
    let totalRegionCong = 0;
    let totalRegionOrders = 0;

    const poBreakdown: Record<string, { totalSalary: number; totalCong: number; totalDon: number; avgPerCong: number; share: number }> = {};
    PO_ORDER.forEach(po => {
      poBreakdown[po] = { totalSalary: 0, totalCong: 0, totalDon: 0, avgPerCong: 0, share: 0 };
    });

    matrixChartData.forEach(d => {
      totalRegionSalary += d.totalRegion;
      totalRegionCong += d.totalCong;
      totalRegionOrders += d.totalDon;

      PO_ORDER.forEach(po => {
        poBreakdown[po].totalSalary += d[po] || 0;
        poBreakdown[po].totalCong += d[`${po}_cong`] || 0;
        poBreakdown[po].totalDon += d[`${po}_don`] || 0;
      });
    });

    PO_ORDER.forEach(po => {
      const item = poBreakdown[po];
      item.share = totalRegionSalary > 0 ? Number(((item.totalSalary / totalRegionSalary) * 100).toFixed(1)) : 0;
      item.avgPerCong = item.totalCong > 0 ? Math.round(item.totalSalary / item.totalCong) : 0;
    });

    const avgSalaryPerCong = totalRegionCong > 0 ? Math.round(totalRegionSalary / totalRegionCong) : 0;
    const avgCostPerOrder = totalRegionOrders > 0 ? Math.round(totalRegionSalary / totalRegionOrders) : 0;

    // Ngày đỉnh quỹ lương
    const peakDay = [...matrixChartData].sort((a, b) => b.totalRegion - a.totalRegion)[0];

    // Bưu cục dẫn đầu quỹ lương & bưu cục thấp nhất
    const sortedPos = [...PO_ORDER].sort((a, b) => poBreakdown[b].totalSalary - poBreakdown[a].totalSalary);
    const topPo = sortedPos[0];
    const lowestPo = sortedPos[sortedPos.length - 1];

    // Bưu cục có thu nhập / công cao nhất
    const sortedByAvgCong = [...PO_ORDER].sort((a, b) => poBreakdown[b].avgPerCong - poBreakdown[a].avgPerCong);
    const highestAvgPo = sortedByAvgCong[0];

    return {
      totalRegionSalary,
      totalRegionCong,
      totalRegionOrders,
      avgSalaryPerCong,
      avgCostPerOrder,
      poBreakdown,
      peakDay,
      topPo,
      lowestPo,
      highestAvgPo,
      dateCount: matrixChartData.length
    };
  }, [matrixChartData]);

  // Custom Tooltip cho đồ thị Ma Trận Thu Nhập
  const renderChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    return (
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2.5 min-w-[260px]">
        {/* Header Ngày & Tổng Quỹ Lương Khu Vực */}
        <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 dark:text-white text-xs">
              Ngày {d.date}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              Tổng Khu Vực
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Quỹ lương chi trả:</span>
            <strong className="text-orange-600 dark:text-orange-400 font-extrabold text-xs">
              {Number(d.totalRegion).toLocaleString('vi-VN')} đ
            </strong>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Thu nhập TB / ngày công:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {Number(d.avgLuongPerCong).toLocaleString('vi-VN')} đ/công
            </strong>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-slate-400">
            <span>Lực lượng & Sản lượng:</span>
            <span>{d.totalCong} bưu tá • {d.totalDon.toLocaleString('vi-VN')} đơn (G+L)</span>
          </div>
        </div>

        {/* Breakdown từng bưu cục */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Chi tiết 6 Bưu Cục trong ngày:
          </div>
          {PO_ORDER.map(po => {
            const val = d[po] || 0;
            const cong = d[`${po}_cong`] || 0;
            const avgCong = d[`${po}_avgCong`] || 0;
            const share = d.totalRegion > 0 ? ((val / d.totalRegion) * 100).toFixed(1) : '0';
            const isHighlight = focusedMatrixPo === 'all' || focusedMatrixPo === po;

            return (
              <div 
                key={po} 
                className={`flex items-center justify-between text-[11px] p-1 rounded transition-colors ${
                  isHighlight 
                    ? 'bg-slate-50 dark:bg-slate-750 font-semibold text-slate-800 dark:text-slate-200' 
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                    style={{ backgroundColor: PO_COLOR_MAP[po]?.stroke || '#94A3B8' }} 
                  />
                  <span className="truncate">{po.replace('(LAN) ', '')}</span>
                  {cong > 0 && <span className="text-[10px] text-slate-400">({cong}c)</span>}
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span>{val.toLocaleString('vi-VN')} đ</span>
                  {avgCong > 0 && (
                    <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      • {Math.round(avgCong / 1000)}k/c
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 min-w-[32px] text-right font-normal">({share}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =========================================================================
  // MỤC 2: MA TRẬN ĐỐI CHIẾU THU NHẬP SO VỚI MẶT BẰNG CHUNG BC & TOÀN KHU VỰC
  // =========================================================================
  const sec2FilteredRecords = useMemo(() => {
    return filterRecordsByPeriod(
      dataset.hoaHongNgay,
      sec2Month,
      sec2Week,
      sec2Dates,
      availableMonths,
      availableWeeks
    );
  }, [dataset.hoaHongNgay, sec2Month, sec2Week, sec2Dates, availableMonths, availableWeeks]);

  const { regionComparisonData, sec2RegionAvg } = useMemo(() => {
    const poMap: Record<string, {
      buuCuc: string;
      totalLuong: number;
      totalCong: number;
      staff: Set<string>;
      dailyLuong: Record<string, number>;
      empSalary: Record<string, { totalLuong: number; totalCong: number }>;
    }> = {};

    PO_ORDER.forEach(po => {
      poMap[po] = {
        buuCuc: po,
        totalLuong: 0,
        totalCong: 0,
        staff: new Set(),
        dailyLuong: {},
        empSalary: {}
      };
    });

    sec2FilteredRecords.forEach(r => {
      const po = r.tenBC;
      if (!poMap[po]) return;
      poMap[po].totalLuong += r.tongLuong || 0;
      poMap[po].totalCong += r.soNgayDiLam || 0;
      poMap[po].staff.add(r.maNV);
      poMap[po].dailyLuong[r.ngay] = (poMap[po].dailyLuong[r.ngay] || 0) + (r.tongLuong || 0);

      if (!poMap[po].empSalary[r.maNV]) {
        poMap[po].empSalary[r.maNV] = { totalLuong: 0, totalCong: 0 };
      }
      poMap[po].empSalary[r.maNV].totalLuong += r.tongLuong || 0;
      poMap[po].empSalary[r.maNV].totalCong += r.soNgayDiLam || 0;
    });

    const totalRegionLuong = Object.values(poMap).reduce((s, p) => s + p.totalLuong, 0);
    const totalRegionCong = Object.values(poMap).reduce((s, p) => s + p.totalCong, 0);
    const regionAvg = totalRegionCong > 0 ? Math.round(totalRegionLuong / totalRegionCong) : 0;

    const list = Object.values(poMap).map(po => {
      const avgLuongPerDay = po.totalCong > 0 ? Math.round(po.totalLuong / po.totalCong) : 0;
      const deltaVsRegion = regionAvg > 0 ? ((avgLuongPerDay - regionAvg) / regionAvg) * 100 : 0;

      const dailyVals = Object.values(po.dailyLuong).filter(v => v > 0);
      const maxDaily = dailyVals.length > 0 ? Math.max(...dailyVals) : 0;
      const minDaily = dailyVals.length > 0 ? Math.min(...dailyVals) : 0;
      const dailyVolatility = minDaily > 0 ? Math.round(((maxDaily - minDaily) / minDaily) * 100) : 0;

      const empAvgs = Object.values(po.empSalary)
        .map(e => e.totalCong > 0 ? Math.round(e.totalLuong / e.totalCong) : 0)
        .filter(v => v > 0);
      const maxEmp = empAvgs.length > 0 ? Math.max(...empAvgs) : 0;
      const minEmp = empAvgs.length > 0 ? Math.min(...empAvgs) : 0;
      const empSpread = maxEmp - minEmp;

      return {
        buuCuc: po.buuCuc,
        staffCount: po.staff.size,
        totalLuong: po.totalLuong,
        avgLuongPerDay,
        deltaVsRegion,
        maxDaily,
        minDaily,
        dailyVolatility,
        maxEmp,
        minEmp,
        empSpread
      };
    }).sort((a, b) => b.totalLuong - a.totalLuong);

    return { regionComparisonData: list, sec2RegionAvg: regionAvg };
  }, [sec2FilteredRecords]);

  // =========================================================================
  // MỤC 3: BẢNG THỐNG KÊ TỔNG THEO BƯU CỤC SẢN LƯỢNG ĐƠN GIAO VÀ LẤY (LTC)
  // =========================================================================
  const sec3FilteredRecords = useMemo(() => {
    return filterRecordsByPeriod(
      dataset.hoaHongNgay,
      sec3Month,
      sec3Week,
      sec3Dates,
      availableMonths,
      availableWeeks
    );
  }, [dataset.hoaHongNgay, sec3Month, sec3Week, sec3Dates, availableMonths, availableWeeks]);

  const { poDeliveryAndPickupStats, sec3TotalOrders } = useMemo(() => {
    const map: Record<string, {
      tenBC: string;
      staff: Set<string>;
      soCong: number;
      ganGiao: number;
      giaoTL: number;
      ganLay: number;
      layTL: number;
      tongLuong: number;
    }> = {};

    PO_ORDER.forEach(po => {
      map[po] = {
        tenBC: po,
        staff: new Set(),
        soCong: 0,
        ganGiao: 0,
        giaoTL: 0,
        ganLay: 0,
        layTL: 0,
        tongLuong: 0
      };
    });

    sec3FilteredRecords.forEach(r => {
      if (!map[r.tenBC]) {
        map[r.tenBC] = {
          tenBC: r.tenBC,
          staff: new Set(),
          soCong: 0,
          ganGiao: 0,
          giaoTL: 0,
          ganLay: 0,
          layTL: 0,
          tongLuong: 0
        };
      }
      map[r.tenBC].staff.add(r.maNV);
      map[r.tenBC].soCong += r.soNgayDiLam || 0;
      map[r.tenBC].ganGiao += r.soDonGanGiao || 0;
      map[r.tenBC].giaoTL += r.donGiaoTinhLuong || 0;
      map[r.tenBC].ganLay += r.soDonGanLay || 0;
      map[r.tenBC].layTL += r.donLayTinhLuong || 0;
      map[r.tenBC].tongLuong += r.tongLuong || 0;
    });

    const list = Object.values(map).map(b => {
      const tongSanLuong = b.giaoTL + b.layTL;
      const layRate = b.ganLay > 0 ? (b.layTL / b.ganLay) * 100 : 0;
      const giaoShare = tongSanLuong > 0 ? (b.giaoTL / tongSanLuong) * 100 : 0;
      const layShare = tongSanLuong > 0 ? (b.layTL / tongSanLuong) * 100 : 0;
      const avgSalaryPerDay = b.soCong > 0 ? Math.round(b.tongLuong / b.soCong) : 0;
      const costPerOrder = tongSanLuong > 0 ? Math.round(b.tongLuong / tongSanLuong) : 0;

      return {
        ...b,
        staffCount: b.staff.size,
        tongSanLuong,
        layRate,
        giaoShare,
        layShare,
        avgSalaryPerDay,
        costPerOrder
      };
    }).sort((a, b) => b.tongSanLuong - a.tongSanLuong);

    const totalOrders = list.reduce((sum, b) => sum + b.tongSanLuong, 0);
    return { poDeliveryAndPickupStats: list, sec3TotalOrders: totalOrders };
  }, [sec3FilteredRecords]);

  // =========================================================================
  // MỤC 4: TOP NHÂN VIÊN THU NHẬP CAO NHẤT VÀ THẤP NHẤT
  // =========================================================================
  const topEarners = useMemo(() => {
    const records = filterRecordsByPeriod(
      dataset.hoaHongNgay,
      topHighMonth,
      topHighWeek,
      topHighDates,
      availableMonths,
      availableWeeks
    );
    const empMap: Record<string, {
      maNV: string;
      tenNV: string;
      tenBC: string;
      thamNien: string;
      ngayVaoLam: string;
      tongLuong: number;
      soCong: number;
      giaoTL: number;
      layTL: number;
    }> = {};

    records.forEach(r => {
      if (!empMap[r.maNV]) {
        empMap[r.maNV] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          tenBC: r.tenBC,
          thamNien: r.thamNien,
          ngayVaoLam: r.ngayVaoLam,
          tongLuong: 0,
          soCong: 0,
          giaoTL: 0,
          layTL: 0
        };
      }
      empMap[r.maNV].tongLuong += r.tongLuong || 0;
      empMap[r.maNV].soCong += r.soNgayDiLam || 0;
      empMap[r.maNV].giaoTL += r.donGiaoTinhLuong || 0;
      empMap[r.maNV].layTL += r.donLayTinhLuong || 0;
    });

    const list = Object.values(empMap).map(e => ({
      ...e,
      avgPerDay: e.soCong > 0 ? Math.round(e.tongLuong / e.soCong) : 0,
      tongDon: e.giaoTL + e.layTL,
      thamNienDays: calculateSeniorityDays(e.ngayVaoLam)
    }));

    return list.sort((a, b) => b.tongLuong - a.tongLuong).slice(0, 10);
  }, [dataset.hoaHongNgay, topHighMonth, topHighWeek, topHighDates, availableMonths, availableWeeks]);

  const bottomEarners = useMemo(() => {
    const records = filterRecordsByPeriod(
      dataset.hoaHongNgay,
      topLowMonth,
      topLowWeek,
      topLowDates,
      availableMonths,
      availableWeeks
    );
    const empMap: Record<string, {
      maNV: string;
      tenNV: string;
      tenBC: string;
      thamNien: string;
      ngayVaoLam: string;
      tongLuong: number;
      soCong: number;
      giaoTL: number;
      layTL: number;
    }> = {};

    records.forEach(r => {
      if (!empMap[r.maNV]) {
        empMap[r.maNV] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          tenBC: r.tenBC,
          thamNien: r.thamNien,
          ngayVaoLam: r.ngayVaoLam,
          tongLuong: 0,
          soCong: 0,
          giaoTL: 0,
          layTL: 0
        };
      }
      empMap[r.maNV].tongLuong += r.tongLuong || 0;
      empMap[r.maNV].soCong += r.soNgayDiLam || 0;
      empMap[r.maNV].giaoTL += r.donGiaoTinhLuong || 0;
      empMap[r.maNV].layTL += r.donLayTinhLuong || 0;
    });

    const list = Object.values(empMap).map(e => ({
      ...e,
      avgPerDay: e.soCong > 0 ? Math.round(e.tongLuong / e.soCong) : 0,
      tongDon: e.giaoTL + e.layTL,
      thamNienDays: calculateSeniorityDays(e.ngayVaoLam)
    }));

    return list.sort((a, b) => a.tongLuong - b.tongLuong).slice(0, 10);
  }, [dataset.hoaHongNgay, topLowMonth, topLowWeek, topLowDates, availableMonths, availableWeeks]);

  // =========================================================================
  // MỤC 5: THỐNG KÊ SỐ NGÀY CÔNG & TỶ LỆ CHUYÊN CẦN
  // =========================================================================
  interface CourierAttendanceInfo {
    maNV: string;
    tenNV: string;
    tenBC: string;
    thamNien: string;
    ngayVaoLam: string;
    soCong: number;
    tongLuong: number;
    giaoTL: number;
    layTL: number;
    avgPerDay: number;
    thamNienDays: number | null;
  }

  const { attendanceStats, fullCongEmps, midCongEmps, lowCongEmps } = useMemo(() => {
    const records = filterRecordsByPeriod(
      dataset.hoaHongNgay,
      sec5Month,
      sec5Week,
      sec5Dates,
      availableMonths,
      availableWeeks
    );

    const empMap: Record<string, CourierAttendanceInfo> = {};
    records.forEach(r => {
      if (!empMap[r.maNV]) {
        empMap[r.maNV] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          tenBC: r.tenBC,
          thamNien: r.thamNien,
          ngayVaoLam: r.ngayVaoLam,
          soCong: 0,
          tongLuong: 0,
          giaoTL: 0,
          layTL: 0,
          avgPerDay: 0,
          thamNienDays: calculateSeniorityDays(r.ngayVaoLam)
        };
      }
      empMap[r.maNV].soCong += r.soNgayDiLam || 0;
      empMap[r.maNV].tongLuong += r.tongLuong || 0;
      empMap[r.maNV].giaoTL += r.donGiaoTinhLuong || 0;
      empMap[r.maNV].layTL += r.donLayTinhLuong || 0;
    });

    const emps = Object.values(empMap).map(e => ({
      ...e,
      avgPerDay: e.soCong > 0 ? Math.round(e.tongLuong / e.soCong) : 0
    }));

    const totalEmps = emps.length || 1;
    const fullCongEmps = emps.filter(e => e.soCong >= 26).sort((a, b) => b.soCong - a.soCong || b.tongLuong - a.tongLuong);
    const midCongEmps = emps.filter(e => e.soCong >= 15 && e.soCong < 26).sort((a, b) => b.soCong - a.soCong || b.tongLuong - a.tongLuong);
    const lowCongEmps = emps.filter(e => e.soCong < 15).sort((a, b) => a.soCong - b.soCong || a.tongLuong - b.tongLuong);

    const stats = {
      totalEmps: emps.length,
      fullCong: fullCongEmps.length,
      fullCongRate: ((fullCongEmps.length / totalEmps) * 100).toFixed(1),
      midCong: midCongEmps.length,
      midCongRate: ((midCongEmps.length / totalEmps) * 100).toFixed(1),
      lowCong: lowCongEmps.length,
      lowCongRate: ((lowCongEmps.length / totalEmps) * 100).toFixed(1)
    };

    return {
      attendanceStats: stats,
      fullCongEmps,
      midCongEmps,
      lowCongEmps
    };
  }, [dataset.hoaHongNgay, sec5Month, sec5Week, sec5Dates, availableMonths, availableWeeks]);

  const selectedGroupList = useMemo(() => {
    if (selectedAttendanceGroup === 'full') return fullCongEmps;
    if (selectedAttendanceGroup === 'mid') return midCongEmps;
    if (selectedAttendanceGroup === 'low') return lowCongEmps;
    return [];
  }, [selectedAttendanceGroup, fullCongEmps, midCongEmps, lowCongEmps]);

  // =========================================================================
  // MỤC 6: BẢNG CHI TIẾT HOA HỒNG BƯU TÁ THEO NGÀY (CÂN ĐỐI KHÔNG TRƯỢT NGANG)
  // =========================================================================
  const detailTableData = useMemo(() => {
    let res = filterRecordsByPeriod(
      filteredData,
      detailMonth,
      detailWeek,
      detailDates,
      availableMonths,
      availableWeeks
    );
    if (detailBuuCuc && detailBuuCuc.length > 0) {
      res = res.filter(r => detailBuuCuc.includes(r.tenBC));
    }
    return res;
  }, [filteredData, detailMonth, detailWeek, detailDates, detailBuuCuc, availableMonths, availableWeeks]);

  const columns: Column<DailySalaryRecord>[] = [
    {
      key: 'maNV',
      header: 'Mã NV',
      width: '70px',
      sortable: true,
      render: r => <span className="font-mono text-slate-500 dark:text-slate-400 font-bold text-[11px]">{r.maNV}</span>
    },
    {
      key: 'tenNV',
      header: 'Họ Tên Bưu Tá',
      width: '135px',
      sortable: true,
      render: r => (
        <span className="font-bold text-slate-900 dark:text-white truncate block max-w-[135px] text-[11px]" title={r.tenNV}>
          {r.tenNV}
        </span>
      )
    },
    {
      key: 'tenBC',
      header: 'Bưu Cục',
      width: '85px',
      sortable: true,
      render: r => (
        <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px] truncate block" title={r.tenBC}>
          {r.tenBC.replace('(LAN) ', '')}
        </span>
      )
    },
    {
      key: 'thamNien',
      header: 'Thâm Niên',
      width: '80px',
      sortable: true,
      render: r => <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate block">{r.thamNien}</span>
    },
    {
      key: 'thamNienNgay',
      header: 'Thâm Niên (Ngày)',
      width: '85px',
      align: 'right',
      sortable: true,
      render: r => {
        const days = calculateSeniorityDays(r.ngayVaoLam);
        if (days === null) {
          return <span className="text-slate-400 italic text-[10.5px]">-</span>;
        }
        return (
          <span 
            className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
              days >= 365 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            }`}
            title={`Ngày vào làm: ${r.ngayVaoLam || 'Chưa cập nhật'}`}
          >
            {days} ngày
          </span>
        );
      }
    },
    {
      key: 'ngay',
      header: 'Ngày',
      width: '75px',
      sortable: true,
      render: r => (
        <span className="text-[11px] font-medium">
          {r.ngay ? r.ngay.slice(0, 5) : ''}{' '}
          <span className="text-slate-400 font-normal">({r.thu ? r.thu.replace('Thứ ', 'T') : ''})</span>
        </span>
      )
    },
    {
      key: 'donGiaoTinhLuong',
      header: 'Giao TL',
      width: '65px',
      align: 'right',
      sortable: true,
      render: r => <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">{r.donGiaoTinhLuong}</span>
    },
    {
      key: 'donLayTinhLuong',
      header: 'Lấy LTC',
      width: '65px',
      align: 'right',
      sortable: true,
      render: r => <span className="font-bold text-purple-600 dark:text-purple-400 text-[11px]">{r.donLayTinhLuong}</span>
    },
    {
      key: 'soNgayDiLam',
      header: 'Công',
      width: '45px',
      align: 'center',
      sortable: true,
      render: r => <span className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold text-[10.5px]">{r.soNgayDiLam}</span>
    },
    {
      key: 'luongHHNgay',
      header: 'Lương HH',
      width: '80px',
      align: 'right',
      sortable: true,
      render: r => <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">{Math.round(r.luongHHNgay).toLocaleString('vi-VN')}</span>
    },
    {
      key: 'tongLuong',
      header: 'Tổng Lương',
      width: '90px',
      align: 'right',
      sortable: true,
      render: r => <span className="font-black text-orange-600 dark:text-orange-400 text-[11px]">{Math.round(r.tongLuong).toLocaleString('vi-VN')} đ</span>
    }
  ];

  return (
    <div className="relative">
      {/* =========================================================================
          CỐ ĐỊNH HEADER & BỘ LỌC CỦA TAB (TƯƠNG TỰ TAB GTC BƯU CỤC - COMPACT TỐI ƯU KHÔNG GIAN)
          (Menu của tab - cố định ở đỉnh, khi lăn để xem data thì không bị mất đi)
         ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 px-3 md:px-6 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-all">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          <div className="min-w-0 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Coins className="w-4 h-4 text-orange-600 shrink-0" />
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap">
                Phân Hệ Hoa Hồng & Lương Ngày
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xl hidden md:block">
              Quản trị quỹ lương, năng lực lấy hàng LTC, chi phí đơn và thâm niên nhân sự 6 bưu cục khu vực
            </p>
          </div>

          {/* CÁC BỘ LỌC RIÊNG BIỆT (TÁCH RỜI - COMPACT) */}
          <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 shrink-0">
            {/* 1. Lọc Bưu Cục */}
            <IndividualFilterDropdown
              label="Bưu cục"
              compact={true}
              icon={<Building2 className="w-3.5 h-3.5" />}
              options={buuCucOptions}
              selectedValues={filterValues.buuCuc || []}
              onChange={handleBuuCucChange}
              searchPlaceholder="Tìm bưu cục..."
              minWidth="w-64"
            />

            {/* 2. Lọc Nhân Viên */}
            <IndividualFilterDropdown
              label="Nhân viên"
              compact={true}
              icon={<Users className="w-3.5 h-3.5" />}
              options={nhanVienOptions}
              selectedValues={filterValues.nhanVien || []}
              onChange={handleNhanVienChange}
              searchPlaceholder="Tìm tên hoặc mã bưu tá..."
              minWidth="w-72"
            />

            {/* 3. Lọc Thâm Niên */}
            <IndividualFilterDropdown
              label="Thâm niên"
              compact={true}
              icon={<Clock className="w-3.5 h-3.5" />}
              options={thamNienOptions}
              selectedValues={filterValues.thamNien || []}
              onChange={handleThamNienChange}
              searchPlaceholder="Tìm thâm niên..."
              minWidth="w-56"
            />

            {/* 4. Lọc Ngày Vận Hành */}
            <IndividualFilterDropdown
              label="Ngày"
              compact={true}
              icon={<Calendar className="w-3.5 h-3.5" />}
              options={ngayOptions}
              selectedValues={filterValues.ngay || []}
              onChange={handleNgayChange}
              searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
              minWidth="w-64"
            />

            {/* Nút Xóa Tất Cả Lọc */}
            {totalActiveFilters > 0 && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Xóa tất cả các bộ lọc đang chọn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa lọc ({totalActiveFilters})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-md">
          <div className="text-[11px] text-emerald-100 font-bold uppercase">Tổng Lương Chi Trả</div>
          <div className="text-xl font-black mt-1">
            {(tabKPIs.totalLuong / 1e6).toFixed(1)} tr VNĐ
          </div>
          <div className="text-[10px] text-emerald-200">{Math.round(tabKPIs.totalLuong).toLocaleString('vi-VN')} đ</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Lương Đảm Bảo</div>
          <div className="text-lg font-black text-slate-700 dark:text-slate-200 mt-1">
            {Math.round(tabKPIs.totalLuongDamBao).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">100% lương theo hoa hồng</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Lương TB / Ngày Công</div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {Math.round(tabKPIs.avgSalaryPerDay).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[10px] text-slate-400">Trên {tabKPIs.totalNgayCong.toLocaleString('vi-VN')} công nhật</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Đơn Giao Tính Lương</div>
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
            {tabKPIs.totalGiaoTL.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400">Đơn giao thành công hợp lệ</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Đơn Lấy Tính Lương (LTC)</div>
          <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
            {tabKPIs.totalLayTL.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-purple-600 font-semibold">Tỷ lệ lấy: {tabKPIs.layRate.toFixed(1)}%</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Chi Phí TB / Đơn (CP)</div>
          <div className="text-lg font-black text-orange-600 dark:text-orange-400 mt-1">
            {Math.round(tabKPIs.avgCostPerOrder).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[10px] text-slate-400">Tổng lương / (Giao + Lấy)</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỤC 1: BẢNG MA TRẬN THU NHẬP CỦA TỪNG BƯU CỤC QUA TỪNG NGÀY */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-750/50">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Bảng Ma Trận Thu Nhập Bưu Cục & Chi Tiết Nhân Viên Qua Từng Ngày
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trục tung là 6 Bưu cục khu vực, Trục hoành là các ngày vận hành; bấm vào bưu cục để mở rộng xem thu nhập từng bưu tá
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tìm kiếm */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bưu cục / bưu tá..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 w-44"
              />
            </div>

            {/* Chọn số ngày */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-700 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMatrixRange('7')}
                className={`px-2.5 py-1 rounded-md transition-all ${matrixRange === '7' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                7 Ngày
              </button>
              <button
                type="button"
                onClick={() => setMatrixRange('14')}
                className={`px-2.5 py-1 rounded-md transition-all ${matrixRange === '14' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                14 Ngày
              </button>
              <button
                type="button"
                onClick={() => setMatrixRange('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${matrixRange === 'all' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Tất cả ({allUniqueDatesDesc.length} ngày)
              </button>
            </div>

            {/* Nút bung / thu gọn tất cả */}
            <button
              type="button"
              onClick={handleExpandAllMatrix}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {expandedMatrixPos.size === Object.keys(matrixData).length ? 'Thu gọn tất cả' : 'Mở rộng tất cả BC'}
            </button>

            {/* Nút Hiện / Ẩn đồ thị */}
            <button
              type="button"
              onClick={() => setShowMatrixChart(prev => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                showMatrixChart
                  ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300'
                  : 'bg-white border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
              title={showMatrixChart ? 'Ẩn đồ thị xu hướng' : 'Hiện đồ thị xu hướng'}
            >
              {showMatrixChart ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showMatrixChart ? 'Ẩn Đồ Thị' : 'Hiện Đồ Thị'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ĐỒ THỊ TRỰC QUAN & TỔNG QUAN KHU VỰC AREA MANAGER BI */}
        {/* ========================================================================= */}
        {showMatrixChart && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-850/50 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* ================================================================ */}
              {/* CỘT TRÁI (4 cols): TỔNG QUAN QUỸ LƯƠNG & CƠ CẤU 6 BƯU CỤC */}
              {/* ================================================================ */}
              <div className="lg:col-span-4 bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-md flex flex-col justify-between space-y-3.5">
                {/* Header Card */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="font-extrabold text-xs tracking-wider uppercase">Tổng Quan Quỹ Lương Khu Vực</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-600 text-white tracking-wider">
                      AREA MANAGER BI
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Kỳ phân tích:</span>
                    <strong className="text-orange-400">
                      {matrixRange === '7' ? '7 ngày gần nhất' : matrixRange === '14' ? '14 ngày gần nhất' : `Toàn bộ ${matrixDates.length} ngày`}
                    </strong>
                  </div>
                </div>

                {/* 4 Chỉ số cốt lõi toàn khu vực */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <div className="text-[10px] text-slate-400 font-medium">Tổng Quỹ Lương Kỳ</div>
                    <div className="text-base sm:text-lg font-black text-orange-400 mt-0.5 truncate" title={`${(regionalMatrixSummary?.totalRegionSalary || 0).toLocaleString('vi-VN')} đ`}>
                      {((regionalMatrixSummary?.totalRegionSalary || 0) / 1e6).toFixed(1)} tr đ
                    </div>
                    <div className="text-[9.5px] text-slate-400">Toàn bộ 6 Bưu cục</div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <div className="text-[10px] text-slate-400 font-medium">Lương TB / Ngày Công</div>
                    <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 truncate" title="Mức thu nhập bình quân trên mỗi ca làm việc của bưu tá">
                      {(regionalMatrixSummary?.avgSalaryPerCong || 0).toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[9.5px] text-emerald-400/80 font-medium">Chuẩn thu nhập bưu tá</div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <div className="text-[10px] text-slate-400 font-medium">Tổng Ngày Công Đi Làm</div>
                    <div className="text-base sm:text-lg font-black text-blue-400 mt-0.5 truncate">
                      {(regionalMatrixSummary?.totalRegionCong || 0).toLocaleString('vi-VN')} công
                    </div>
                    <div className="text-[9.5px] text-slate-400">Toàn lực lượng 6 BC</div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <div className="text-[10px] text-slate-400 font-medium">Chi Phí TB / Đơn (CP)</div>
                    <div className="text-base sm:text-lg font-black text-purple-400 mt-0.5 truncate">
                      {(regionalMatrixSummary?.avgCostPerOrder || 0).toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[9.5px] text-slate-400">Đơn Giao + Lấy (LTC)</div>
                  </div>
                </div>

                {/* Thanh Tỷ Trọng Phân Bổ 6 Bưu Cục */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Layers className="w-3 h-3 text-orange-400" />
                      Tỷ Trọng Quỹ Lương 6 Bưu Cục
                    </span>
                    {focusedMatrixPo !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setFocusedMatrixPo('all')}
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold underline cursor-pointer"
                      >
                        Bỏ lọc BC
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {PO_ORDER.map(po => {
                      const item = regionalMatrixSummary?.poBreakdown[po];
                      const isFocused = focusedMatrixPo === po;
                      const color = PO_COLOR_MAP[po]?.stroke || '#F97316';
                      const share = item?.share || 0;
                      const salaryTr = item ? (item.totalSalary / 1e6).toFixed(1) : '0';

                      return (
                        <div
                          key={po}
                          onClick={() => setFocusedMatrixPo(prev => prev === po ? 'all' : po)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                            isFocused 
                              ? 'bg-slate-800 border-orange-500 shadow-sm' 
                              : 'hover:bg-slate-800/60 border-transparent'
                          }`}
                          title={`Bấm để ${isFocused ? 'bỏ lọc' : 'làm nổi bật'} bưu cục ${po.replace('(LAN) ', '')} trên biểu đồ`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span>{po.replace('(LAN) ', '')}</span>
                            </span>
                            <span className="font-mono text-[10.5px] text-slate-300">
                              <strong style={{ color }}>{share}%</strong> ({salaryTr} tr)
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(share * 2.8, 100)}%`, backgroundColor: color }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Nhận Định AM Nhanh */}
                <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>👉 Bấm vào từng bưu cục ở trên để highlight đường xu hướng bên phải.</span>
                </div>
              </div>

              {/* ================================================================ */}
              {/* CỘT PHẢI (8 cols): BIỂU ĐỒ TRỰC QUAN ĐA TẦNG */}
              {/* ================================================================ */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {/* Header Toolbar của Biểu đồ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Biểu Đồ Trực Quan Thu Nhập Vận Hành
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline bg-slate-100 dark:bg-slate-700/80 px-1.5 py-0.5 rounded">
                      Gần nhất → Xa nhất
                    </span>
                    {focusedMatrixPo !== 'all' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                        Đang xem: {focusedMatrixPo.replace('(LAN) ', '')}
                      </span>
                    )}
                  </div>

                  {/* Chuyển đổi chế độ biểu đồ */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setMatrixChartView('overview')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
                          matrixChartView === 'overview'
                            ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                        title="Xem toàn cảnh khu vực: Cột Tổng quỹ lương kết hợp Đường Lương bình quân/ngày công"
                      >
                        <span>Toàn cảnh Khu vực</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatrixChartView('lines')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
                          matrixChartView === 'lines'
                            ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                        title="Xem đường xu hướng biến động của 6 bưu cục qua các ngày"
                      >
                        <span>6 Bưu cục</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatrixChartView('stacked')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
                          matrixChartView === 'stacked'
                            ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                        title="Xem cơ cấu đóng góp quỹ lương của 6 bưu cục từng ngày"
                      >
                        <span>Cơ cấu ngày</span>
                      </button>
                    </div>

                    {/* Dropdown Trọng tâm */}
                    <select
                      value={focusedMatrixPo}
                      onChange={e => setFocusedMatrixPo(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 text-[11px]"
                    >
                      <option value="all">Tất cả 6 Bưu cục</option>
                      {PO_ORDER.map(po => (
                        <option key={po} value={po}>
                          {po.replace('(LAN) ', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Khung Biểu Đồ Recharts */}
                <div className="h-[285px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    {matrixChartView === 'overview' ? (
                      /* CHẾ ĐỘ 1: TOÀN CẢNH KHU VỰC (CỘT TỔNG LƯƠNG & ĐƯỜNG LƯƠNG TB/CÔNG) */
                      <ComposedChart data={matrixChartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                        <defs>
                          <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EA580C" stopOpacity={0.95}/>
                            <stop offset="95%" stopColor="#FB923C" stopOpacity={0.45}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                        <XAxis 
                          dataKey="shortDate" 
                          tick={{ fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#94A3B8' }}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => `${(v / 1000000).toFixed(0)}tr`}
                          axisLine={{ stroke: '#94A3B8' }}
                          label={{ value: 'Tổng Quỹ Lương (Triệu VNĐ)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#EA580C' }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          domain={[300000, 'auto']}
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => `${Math.round(v / 1000)}k`}
                          axisLine={{ stroke: '#10B981' }}
                          label={{ value: 'Lương TB / Ngày Công', angle: 90, position: 'insideRight', fontSize: 10, fill: '#10B981' }}
                        />
                        <RechartsTooltip content={renderChartTooltip} />
                        <Legend 
                          verticalAlign="top" 
                          height={30} 
                          formatter={(val: string) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val}</span>} 
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="totalRegion" 
                          name="Tổng Quỹ Lương Khu Vực (VNĐ)" 
                          fill="url(#salaryGradient)" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="avgLuongPerCong" 
                          name="Thu Nhập TB / Ngày Công (đ/công)" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          dot={{ r: 3, fill: '#10B981', strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    ) : matrixChartView === 'lines' ? (
                      /* CHẾ ĐỘ 2: XU HƯỚNG 6 BƯU CỤC */
                      <LineChart data={matrixChartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                        <XAxis 
                          dataKey="shortDate" 
                          tick={{ fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#94A3B8' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => `${(v / 1000000).toFixed(1)}tr`}
                          axisLine={{ stroke: '#94A3B8' }}
                          label={{ value: 'Thu nhập (Triệu VNĐ)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748B' }}
                        />
                        <RechartsTooltip content={renderChartTooltip} />
                        <Legend 
                          verticalAlign="top" 
                          height={30} 
                          formatter={(val: string) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val.replace('(LAN) ', '')}</span>} 
                        />
                        {/* Đường nét đứt Bình Quân Bưu Cục */}
                        <Line 
                          type="monotone" 
                          dataKey="avgPo" 
                          name="TB Bưu Cục" 
                          stroke="#94A3B8" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5} 
                          dot={false} 
                        />
                        {/* Các đường bưu cục */}
                        {PO_ORDER.map(po => {
                          const isHighlight = focusedMatrixPo === 'all' || focusedMatrixPo === po;
                          const strokeWidth = focusedMatrixPo === po ? 4 : isHighlight ? 2 : 1;
                          const strokeOpacity = isHighlight ? 1 : 0.2;
                          return (
                            <Line
                              key={po}
                              type="monotone"
                              dataKey={po}
                              name={po.replace('(LAN) ', '')}
                              stroke={PO_COLOR_MAP[po]?.stroke || '#F97316'}
                              strokeWidth={strokeWidth}
                              strokeOpacity={strokeOpacity}
                              dot={focusedMatrixPo === po ? { r: 4 } : { r: 2 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </LineChart>
                    ) : (
                      /* CHẾ ĐỘ 3: CƠ CẤU TỶ TRỌNG CỘT CHỒNG */
                      <BarChart data={matrixChartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                        <XAxis 
                          dataKey="shortDate" 
                          tick={{ fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#94A3B8' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => `${(v / 1000000).toFixed(0)}tr`}
                          axisLine={{ stroke: '#94A3B8' }}
                          label={{ value: 'Tổng Quỹ Lương Khu Vực (Triệu VNĐ)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748B' }}
                        />
                        <RechartsTooltip content={renderChartTooltip} />
                        <Legend 
                          verticalAlign="top" 
                          height={30} 
                          formatter={(val: string) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val.replace('(LAN) ', '')}</span>} 
                        />
                        {PO_ORDER.map(po => (
                          <Bar 
                            key={po}
                            dataKey={po} 
                            name={po.replace('(LAN) ', '')} 
                            stackId="salary" 
                            fill={PO_COLOR_MAP[po]?.stroke || '#F97316'} 
                            fillOpacity={focusedMatrixPo === 'all' || focusedMatrixPo === po ? 1 : 0.25}
                          />
                        ))}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Chân biểu đồ: 3 Thẻ Thông Tin Logic Vận Hành */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 p-2 rounded-lg">
                    <div className="text-[10px] text-orange-700 dark:text-orange-400 font-semibold flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Đỉnh Quỹ Lương Khu Vực
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      Ngày {regionalMatrixSummary?.peakDay?.date || '-'}
                    </div>
                    <div className="text-[10px] text-orange-600 font-bold">
                      {Math.round((regionalMatrixSummary?.peakDay?.totalRegion || 0) / 1e6).toLocaleString('vi-VN')} triệu VNĐ
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-2 rounded-lg">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Award className="w-3 h-3" /> Bưu Cục Dẫn Đầu Chi Phí
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {regionalMatrixSummary?.topPo.replace('(LAN) ', '') || '-'}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold">
                      Chiếm {regionalMatrixSummary?.poBreakdown[regionalMatrixSummary?.topPo]?.share}% Quỹ Lương
                    </div>
                  </div>

                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 p-2 rounded-lg">
                    <div className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Bình Quân / Ngày Vận Hành
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {regionalMatrixSummary ? ((regionalMatrixSummary.totalRegionSalary / regionalMatrixSummary.dateCount) / 1e6).toFixed(1) : 0} tr/ngày
                    </div>
                    <div className="text-[10px] text-blue-600 font-bold">
                      {regionalMatrixSummary ? Math.round(regionalMatrixSummary.totalRegionCong / regionalMatrixSummary.dateCount) : 0} bưu tá làm việc/ngày
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bảng Ma Trận Scroll */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-750 px-3.5 py-2.5 font-bold uppercase tracking-wider min-w-[200px] border-r border-slate-200 dark:border-slate-700">
                  Bưu Cục / Bưu Tá
                </th>
                <th className="px-3 py-2.5 text-right font-bold min-w-[100px] border-r border-slate-200 dark:border-slate-700">
                  Tổng Lương
                </th>
                <th className="px-3 py-2.5 text-right font-bold min-w-[90px] border-r border-slate-200 dark:border-slate-700">
                  Lương TB/Ngày
                </th>
                <th className="px-2.5 py-2.5 text-center font-bold min-w-[60px] border-r border-slate-200 dark:border-slate-700">
                  Số Công
                </th>
                {matrixDates.map(date => (
                  <th key={date} className="px-2 py-2.5 text-center font-bold min-w-[75px] border-r border-slate-200 dark:border-slate-700">
                    <span className="block">{date.slice(0, 5)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {date.slice(3, 5)}/{date.slice(0, 2)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
              {Object.values(matrixData).map(po => {
                const isExpanded = expandedMatrixPos.has(po.buuCuc);
                const employeeList = Object.values(po.employees).filter(emp => {
                  if (!matrixSearch.trim()) return true;
                  const term = matrixSearch.toLowerCase();
                  return emp.tenNV.toLowerCase().includes(term) || emp.maNV.includes(term) || po.buuCuc.toLowerCase().includes(term);
                });

                return (
                  <React.Fragment key={po.buuCuc}>
                    {/* Dòng Tổng Hợp Cấp Bưu Cục */}
                    <tr className="bg-slate-50/80 dark:bg-slate-800/90 hover:bg-orange-50/50 dark:hover:bg-slate-750 font-semibold transition-colors">
                      <td className="sticky left-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 px-3.5 py-2 flex items-center justify-between border-r border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => toggleMatrixPo(po.buuCuc)}
                          className="flex items-center gap-1.5 text-left text-slate-900 dark:text-white font-bold hover:text-orange-600 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 rotate-90 shrink-0" />
                          )}
                          <span>{po.buuCuc}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {po.staffCount} bưu tá
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right font-black text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                        {(po.totalLuong / 1e6).toFixed(1)} tr
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-orange-600 dark:text-orange-400 border-r border-slate-200 dark:border-slate-700">
                        {po.avgLuongPerDay.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-2.5 py-2 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                        {po.totalCong}
                      </td>
                      {matrixDates.map(date => {
                        const dData = po.daily[date];
                        return (
                          <td key={date} className="px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-700">
                            {dData ? renderSalaryCell(dData.tongLuong, false) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Mở Rộng: Chi Tiết Nhân Viên Thuộc Bưu Cục */}
                    {isExpanded && employeeList.map(emp => (
                      <tr key={emp.maNV} className="bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] transition-colors">
                        <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-850/95 pl-8 pr-3 py-1.5 border-r border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{emp.tenNV}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-1">({emp.maNV})</span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                          {emp.totalLuong >= 1e6 ? `${(emp.totalLuong / 1e6).toFixed(2)} tr` : `${Math.round(emp.totalLuong / 1000)}k`}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                          {emp.avgLuongPerDay.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-2.5 py-1.5 text-center font-bold text-slate-500 border-r border-slate-200 dark:border-slate-700">
                          {emp.totalCong}
                        </td>
                        {matrixDates.map(date => {
                          const dData = emp.daily[date];
                          return (
                            <td key={date} className="px-1.5 py-1 text-center border-r border-slate-200 dark:border-slate-700">
                              {dData ? renderSalaryCell(dData.tongLuong, true) : (
                                <span className="text-slate-200 dark:text-slate-700 font-mono text-[10px]">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỤC 2: MA TRẬN ĐỐI CHIẾU THU NHẬP SO VỚI MẶT BẰNG CHUNG BC & TOÀN KHU VỰC */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Ma Trận Đối Chiếu Thu Nhập So Với Mặt Bằng Chung
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                So sánh mức thu nhập bình quân bưu cục với Chuẩn toàn khu vực ({sec2RegionAvg.toLocaleString('vi-VN')} đ/công) và độ phân hóa nội bộ
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodicFilterToolbar
              selectedMonth={sec2Month}
              onMonthChange={setSec2Month}
              availableMonths={availableMonths}
              selectedWeek={sec2Week}
              onWeekChange={setSec2Week}
              availableWeeks={availableWeeks}
              selectedDates={sec2Dates}
              onDatesChange={setSec2Dates}
              availableDates={allUniqueDatesDesc}
              onReset={() => { setSec2Month(''); setSec2Week(''); setSec2Dates([]); }}
            />
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              Chuẩn Khu Vực: {sec2RegionAvg.toLocaleString('vi-VN')} đ/công
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3.5 py-2 font-bold">Bưu Cục</th>
                <th className="px-3 py-2 text-right font-bold">Lương TB / Công</th>
                <th className="px-3 py-2 text-right font-bold">So Với Chuẩn KV</th>
                <th className="px-3 py-2 text-right font-bold">Ngày Đỉnh Điểm</th>
                <th className="px-3 py-2 text-right font-bold">Ngày Thấp Nhất</th>
                <th className="px-3 py-2 text-right font-bold">Biên Độ Biến Động</th>
                <th className="px-3 py-2 text-right font-bold">Khoảng Phân Hóa Bưu Tá</th>
                <th className="px-3 py-2 text-center font-bold">Trạng Thái Vận Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {regionComparisonData.map(r => {
                const isOver = r.deltaVsRegion >= 0;
                let statusBadge = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Đạt Chuẩn Ổn Định
                  </span>
                );
                if (r.deltaVsRegion >= 15) {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Thu Nhập Cao Vượt Trội
                    </span>
                  );
                } else if (r.deltaVsRegion <= -15) {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Cần Hỗ Trợ Đơn Tuyến
                    </span>
                  );
                }

                return (
                  <tr key={r.buuCuc} className="hover:bg-slate-50 dark:hover:bg-slate-750/70 transition-colors">
                    <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-white">
                      {r.buuCuc}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-100">
                      {r.avgLuongPerDay.toLocaleString('vi-VN')} đ
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${isOver ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isOver ? `+${r.deltaVsRegion.toFixed(1)}%` : `${r.deltaVsRegion.toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600 font-semibold">
                      {(r.maxDaily / 1e6).toFixed(1)} tr
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500 font-medium">
                      {(r.minDaily / 1e6).toFixed(1)} tr
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {r.dailyVolatility}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium text-purple-600 dark:text-purple-400">
                      {(r.empSpread / 1e3).toFixed(0)}k đ/công
                    </td>
                    <td className="px-3 py-2 text-center">
                      {statusBadge}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỤC 3: BẢNG THỐNG KÊ SẢN LƯỢNG ĐƠN GIAO & ĐƠN LẤY (LTC) THEO BƯU CỤC */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Bảng Thống Kê Sản Lượng Giao & Lấy (LTC) Theo Bưu Cục
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cơ cấu sản lượng, tỷ lệ lấy hàng thành công (LTC) và chi phí hoa hồng bình quân / đơn (Cost Per Parcel)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodicFilterToolbar
              selectedMonth={sec3Month}
              onMonthChange={setSec3Month}
              availableMonths={availableMonths}
              selectedWeek={sec3Week}
              onWeekChange={setSec3Week}
              availableWeeks={availableWeeks}
              selectedDates={sec3Dates}
              onDatesChange={setSec3Dates}
              availableDates={allUniqueDatesDesc}
              onReset={() => { setSec3Month(''); setSec3Week(''); setSec3Dates([]); }}
            />
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
              Tổng Sản Lượng: {sec3TotalOrders.toLocaleString('vi-VN')} đơn
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3.5 py-2 font-bold">Bưu Cục</th>
                <th className="px-2.5 py-2 text-center font-bold">Bưu Tá</th>
                <th className="px-2.5 py-2 text-center font-bold">Số Công</th>
                <th className="px-3 py-2 text-right font-bold text-blue-600">Đơn Giao TL</th>
                <th className="px-3 py-2 text-right font-bold text-purple-600">Đơn Lấy TL (LTC)</th>
                <th className="px-3 py-2 text-right font-bold">Tỷ Lệ Lấy (LTC/Gán)</th>
                <th className="px-3 py-2 text-right font-bold">Tổng Đơn Tính Lương</th>
                <th className="px-3 py-2 text-right font-bold">Tổng Quỹ Lương</th>
                <th className="px-3 py-2 text-right font-bold">Chi Phí / Đơn (CP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {poDeliveryAndPickupStats.map(b => (
                <tr key={b.tenBC} className="hover:bg-slate-50 dark:hover:bg-slate-750/70 transition-colors">
                  <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-white">
                    {b.tenBC}
                  </td>
                  <td className="px-2.5 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                    {b.staffCount}
                  </td>
                  <td className="px-2.5 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                    {b.soCong}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-blue-600 dark:text-blue-400">
                    {b.giaoTL.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-purple-600 dark:text-purple-400">
                    {b.layTL.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                      b.layRate >= 80 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {b.layRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-black text-slate-900 dark:text-white">
                    {b.tongSanLuong.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-black text-emerald-600 dark:text-emerald-400">
                    {Math.round(b.tongLuong).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-orange-600 dark:text-orange-400">
                    {b.costPerOrder.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỤC 4: TOP NHÂN VIÊN THU NHẬP CAO NHẤT VÀ THẤP NHẤT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Top 10 Cao Nhất */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Top 10 Bưu Tá Thu Nhập Cao Nhất
                </h3>
                <p className="text-[11px] text-slate-400">Nhân sự xuất sắc dẫn đầu năng suất và thu nhập</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <PeriodicFilterToolbar
                selectedMonth={topHighMonth}
                onMonthChange={setTopHighMonth}
                availableMonths={availableMonths}
                selectedWeek={topHighWeek}
                onWeekChange={setTopHighWeek}
                availableWeeks={availableWeeks}
                selectedDates={topHighDates}
                onDatesChange={setTopHighDates}
                availableDates={allUniqueDatesDesc}
                onReset={() => { setTopHighMonth(''); setTopHighWeek(''); setTopHighDates([]); }}
              />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                Vinh Danh
              </span>
            </div>
          </div>

          <div className="w-full">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-2 py-1.5 text-center font-bold w-7">#</th>
                  <th className="px-2 py-1.5 font-bold">Bưu Tá (ID & Họ Tên)</th>
                  <th className="px-2 py-1.5 font-bold w-20">Bưu Cục</th>
                  <th className="px-2 py-1.5 text-center font-bold w-12">Công</th>
                  <th className="px-2 py-1.5 text-right font-bold w-24">Lương TB/Ngày</th>
                  <th className="px-2 py-1.5 text-right font-bold text-orange-600 w-24">Tổng Lương</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {topEarners.map((emp, idx) => (
                  <tr key={emp.maNV} className="hover:bg-amber-50/40 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-2 py-1.5 text-center font-black text-amber-600 w-7">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1 truncate max-w-[210px]">
                        <span className="font-mono text-slate-400 font-bold shrink-0">[{emp.maNV}]</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate" title={emp.tenNV}>
                          {emp.tenNV}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 truncate w-20" title={emp.tenBC}>
                      {emp.tenBC.replace('(LAN) ', '')}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-slate-700 dark:text-slate-200 w-12">
                      {emp.soCong}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 w-24">
                      {emp.avgPerDay.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-2 py-1.5 text-right font-black text-orange-600 dark:text-orange-400 w-24">
                      {Math.round(emp.tongLuong).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Thấp Nhất (Cần Hỗ Trợ) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Top 10 Bưu Tá Thu Nhập Thấp Nhất
                </h3>
                <p className="text-[11px] text-slate-400">Nhân sự ít công, năng suất thấp hoặc mới vào</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <PeriodicFilterToolbar
                selectedMonth={topLowMonth}
                onMonthChange={setTopLowMonth}
                availableMonths={availableMonths}
                selectedWeek={topLowWeek}
                onWeekChange={setTopLowWeek}
                availableWeeks={availableWeeks}
                selectedDates={topLowDates}
                onDatesChange={setTopLowDates}
                availableDates={allUniqueDatesDesc}
                onReset={() => { setTopLowMonth(''); setTopLowWeek(''); setTopLowDates([]); }}
              />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                Cần Quan Tâm
              </span>
            </div>
          </div>

          <div className="w-full">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-2 py-1.5 text-center font-bold w-7">#</th>
                  <th className="px-2 py-1.5 font-bold">Bưu Tá (ID & Họ Tên)</th>
                  <th className="px-2 py-1.5 font-bold w-20">Bưu Cục</th>
                  <th className="px-2 py-1.5 text-center font-bold w-12">Công</th>
                  <th className="px-2 py-1.5 text-right font-bold w-24">Lương TB/Ngày</th>
                  <th className="px-2 py-1.5 text-right font-bold text-rose-600 w-24">Tổng Lương</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {bottomEarners.map((emp, idx) => (
                  <tr key={emp.maNV} className="hover:bg-rose-50/40 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-2 py-1.5 text-center font-bold text-rose-600 w-7">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1 truncate max-w-[210px]">
                        <span className="font-mono text-slate-400 font-bold shrink-0">[{emp.maNV}]</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate" title={emp.tenNV}>
                          {emp.tenNV}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 truncate w-20" title={emp.tenBC}>
                      {emp.tenBC.replace('(LAN) ', '')}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-rose-600 w-12">
                      {emp.soCong}c
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300 w-24">
                      {emp.avgPerDay.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-2 py-1.5 text-right font-black text-rose-600 dark:text-rose-400 w-24">
                      {Math.round(emp.tongLuong).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỤC 5: BẢNG THỐNG KÊ SỐ NGÀY CÔNG & TỶ LỆ CHUYÊN CẦN */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-700 pb-2.5">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Bảng Thống Kê Số Ngày Công & Tỷ Lệ Chuyên Cần Bưu Tá
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đánh giá tỷ lệ đi làm đều đặn của {attendanceStats.totalEmps} bưu tá toàn khu vực trong kỳ đã lọc
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodicFilterToolbar
              selectedMonth={sec5Month}
              onMonthChange={setSec5Month}
              availableMonths={availableMonths}
              selectedWeek={sec5Week}
              onWeekChange={setSec5Week}
              availableWeeks={availableWeeks}
              selectedDates={sec5Dates}
              onDatesChange={setSec5Dates}
              availableDates={allUniqueDatesDesc}
              onReset={() => { setSec5Month(''); setSec5Week(''); setSec5Dates([]); setSelectedAttendanceGroup(null); }}
            />
          </div>
        </div>

        {/* 3 Thẻ Nhóm Công Tương Tác */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Thẻ 1: Full Công */}
          <div 
            onClick={() => setSelectedAttendanceGroup(prev => prev === 'full' ? null : 'full')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedAttendanceGroup === 'full'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500 shadow-md'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Nhóm Full Công (≥ 26 công)</span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{attendanceStats.fullCongRate}%</span>
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1 flex items-baseline justify-between">
              <span>{attendanceStats.fullCong} bưu tá</span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedAttendanceGroup === 'full' ? '▼ Đang xem chi tiết' : '▶ Bấm xem danh sách'}
              </span>
            </div>
            <p className="text-[10px] text-emerald-600/80 mt-1">Lực lượng trụ cột, đi làm đều đặn, năng suất cao</p>
          </div>

          {/* Thẻ 2: Trung Bình */}
          <div 
            onClick={() => setSelectedAttendanceGroup(prev => prev === 'mid' ? null : 'mid')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedAttendanceGroup === 'mid'
                ? 'bg-blue-100 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-500 shadow-md'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Nhóm Công Trung Bình (15 - 25 công)</span>
              <span className="text-xs font-black text-blue-700 dark:text-blue-400">{attendanceStats.midCongRate}%</span>
            </div>
            <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1 flex items-baseline justify-between">
              <span>{attendanceStats.midCong} bưu tá</span>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                {selectedAttendanceGroup === 'mid' ? '▼ Đang xem chi tiết' : '▶ Bấm xem danh sách'}
              </span>
            </div>
            <p className="text-[10px] text-blue-600/80 mt-1">Nghỉ 1-2 ngày phép hoặc phụ tải bán thời gian</p>
          </div>

          {/* Thẻ 3: Công Thấp */}
          <div 
            onClick={() => setSelectedAttendanceGroup(prev => prev === 'low' ? null : 'low')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedAttendanceGroup === 'low'
                ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-500 ring-2 ring-rose-500 shadow-md'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 hover:border-rose-400 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Nhóm Công Thấp (&lt; 15 công)</span>
              <span className="text-xs font-black text-rose-700 dark:text-rose-400">{attendanceStats.lowCongRate}%</span>
            </div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1 flex items-baseline justify-between">
              <span>{attendanceStats.lowCong} bưu tá</span>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {selectedAttendanceGroup === 'low' ? '▼ Đang xem chi tiết' : '▶ Bấm xem danh sách'}
              </span>
            </div>
            <p className="text-[10px] text-rose-600/80 mt-1">Nhân sự mới vào hoặc nghỉ nhiều; nguy cơ biến động</p>
          </div>
        </div>

        {/* Bảng Kê Chi Tiết Nhân Viên Thuộc Nhóm Khi Nhấn Thẻ */}
        {selectedAttendanceGroup && (
          <div className="mt-3 p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-2.5 transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  selectedAttendanceGroup === 'full' ? 'bg-emerald-500' : selectedAttendanceGroup === 'mid' ? 'bg-blue-500' : 'bg-rose-500'
                }`} />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  Danh Sách Chi Tiết Nhân Sự: {
                    selectedAttendanceGroup === 'full' ? 'Nhóm Full Công (≥ 26 công)' :
                    selectedAttendanceGroup === 'mid' ? 'Nhóm Công Trung Bình (15 - 25 công)' :
                    'Nhóm Công Thấp (< 15 công)'
                  } ({selectedGroupList.length} bưu tá)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttendanceGroup(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700"
              >
                ✕ Đóng bảng
              </button>
            </div>

            <div className="overflow-x-auto max-h-[340px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 z-10 shadow-xs">
                  <tr>
                    <th className="px-2 py-1.5 text-center font-bold w-8">#</th>
                    <th className="px-2.5 py-1.5 font-bold">Mã NV</th>
                    <th className="px-3 py-1.5 font-bold">Họ Tên Bưu Tá</th>
                    <th className="px-2.5 py-1.5 font-bold">Bưu Cục</th>
                    <th className="px-2.5 py-1.5 text-right font-bold">Thâm Niên</th>
                    <th className="px-2.5 py-1.5 text-center font-bold">Số Công</th>
                    <th className="px-3 py-1.5 text-right font-bold">Lương TB/Ngày</th>
                    <th className="px-3 py-1.5 text-right font-bold text-orange-600">Tổng Lương</th>
                    <th className="px-2.5 py-1.5 text-right font-bold text-blue-600">Giao TL</th>
                    <th className="px-2.5 py-1.5 text-right font-bold text-purple-600">Lấy LTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {selectedGroupList.map((emp, idx) => (
                    <tr key={emp.maNV} className="hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-2 py-1.5 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-2.5 py-1.5 font-mono text-slate-500 font-semibold">{emp.maNV}</td>
                      <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-white">{emp.tenNV}</td>
                      <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300">{emp.tenBC.replace('(LAN) ', '')}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                        {emp.thamNienDays !== null ? `${emp.thamNienDays} ngày` : '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-black text-slate-800 dark:text-slate-100">{emp.soCong}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {emp.avgPerDay.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-3 py-1.5 text-right font-black text-orange-600 dark:text-orange-400">
                        {Math.round(emp.tongLuong).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-blue-600 dark:text-blue-400">{emp.giaoTL}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-purple-600 dark:text-purple-400">{emp.layTL}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MỤC 6: BÁO CÁO NHẬN XÉT, ĐÁNH GIÁ & TƯ DUY QUẢN TRỊ AREA MANAGER */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-xl shadow-md p-4 space-y-3.5 border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-orange-400">
              Nhận Xét & Đánh Giá Vận Hành Thu Nhập - Area Manager BI
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-600 text-white">
            Chiến Lược Chi Phí & Định Biên
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
          {/* Trụ cột 1 */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11.5px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. Hiệu Quả Chi Phí / Đơn Hàng (Cost Per Parcel)
            </div>
            <p className="text-slate-300 text-[11px]">
              Chi phí hoa hồng bình quân toàn khu vực đạt <strong>4.296 đ/đơn</strong> (trên tổng 311.717 đơn giao & lấy). Bưu cục <strong>Cần Giuộc</strong> dẫn đầu về tối ưu chi phí với <strong>3.265 đ/đơn</strong> nhờ cự ly phát tập trung. Trong khi <strong>Phước Lý</strong> và <strong>Cần Đước 1</strong> có chi phí lên tới <strong>4.993 đ/đơn</strong> do tuyến phát phân tán và tỷ trọng đơn nhỏ lẻ cao.
            </p>
          </div>

          {/* Trụ cột 2 */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[11.5px]">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              2. Đòn Bẩy Thu Nhập Từ Đơn Lấy Hàng (LTC)
            </div>
            <p className="text-slate-300 text-[11px]">
              Toàn khu vực phát sinh tới <strong>139.031 đơn lấy tính lương</strong>, đóng góp gần 45% tổng sản lượng tính lương. <strong>Tầm Vu</strong> xuất sắc đạt tỷ lệ lấy <strong>93.2%</strong> mang lại nguồn thu ổn định 551k/công. Ngược lại, <strong>Cần Đước</strong> tỷ lệ lấy chỉ đạt <strong>57.7%</strong> (gán 38k nhưng chỉ lấy được 22k đơn), làm mất đi 30% dư địa thu nhập của bưu tá.
            </p>
          </div>

          {/* Trụ cột 3 */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11.5px]">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              3. Chênh Lệch Thu Nhập Nội Bộ & Áp Lực Tuyến
            </div>
            <p className="text-slate-300 text-[11px]">
              Top 10 bưu tá dẫn đầu (như Võ Minh Hùng, Trần Kim Toan tại Cần Giuộc) đạt thu nhập vượt trội <strong>42 - 43 triệu/tháng</strong> (~1.2tr/ngày công). Tuy nhiên, độ phân hóa thu nhập trong nội bộ bưu cục rất lớn (chênh lệch Min-Max lên tới 800k - 1tr/ngày công). Cần rà soát lại cơ chế phân tuyến để tránh tình trạng bưu tá thâm niên ôm tuyến 'ngon' còn bưu tá mới nhận tuyến xa/hẻo lánh.
            </p>
          </div>

          {/* Trụ cột 4 */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11.5px]">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              4. Khuyến Nghị Quản Trị Nhân Sự & Thâm Niên
            </div>
            <p className="text-slate-300 text-[11px]">
              Nhóm bưu tá có thâm niên dưới 180 ngày (chiếm ~40% nhân sự) có tỷ lệ nghỉ việc cao nếu thu nhập 2 tuần đầu dưới 300k/ngày. Đề xuất: (1) Kích hoạt chính sách kèm cặp 1-1 giữa bưu tá Top thu nhập và nhân sự mới; (2) Phân bổ tối thiểu 10-15 đơn lấy cố định/ngày cho bưu tá mới để đảm bảo ngưỡng thu nhập sàn 400k/ngày.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MỤC 7: BẢNG CHI TIẾT HOA HỒNG BƯU TÁ THEO NGÀY */}
      {/* ========================================================================= */}
      <DataTable<DailySalaryRecord>
        columns={columns}
        data={detailTableData}
        title="Bảng Chi Tiết Hoa Hồng Bưu Tá Theo Ngày"
        subtitle="Dữ liệu từng công nhật; bấm vào mũi tên đầu dòng để xem chi tiết cấu phần lương và đơn lấy LTC"
        exportFilename="hoa_hong_ngay_ghn"
        keyExtractor={(r, idx) => `${r.maNV}_${r.ngay}_${idx}`}
        maxHeight="max-h-[580px]"
        stickyHeader={true}
        noWrap={true}
        showSearch={false}
        pagination={false}
        filterComponent={
          <div className="flex flex-wrap items-center gap-1.5">
            <IndividualFilterDropdown
              label="Bưu cục"
              icon={<Building2 className="w-3.5 h-3.5" />}
              options={buuCucOptions}
              selectedValues={detailBuuCuc}
              onChange={setDetailBuuCuc}
              searchPlaceholder="Tìm bưu cục..."
              minWidth="w-56"
            />
            <PeriodicFilterToolbar
              selectedMonth={detailMonth}
              onMonthChange={setDetailMonth}
              availableMonths={availableMonths}
              selectedWeek={detailWeek}
              onWeekChange={setDetailWeek}
              availableWeeks={availableWeeks}
              selectedDates={detailDates}
              onDatesChange={setDetailDates}
              availableDates={allUniqueDatesDesc}
              hasExtraActive={detailBuuCuc.length > 0}
              onReset={() => {
                setDetailMonth('');
                setDetailWeek('');
                setDetailDates([]);
                setDetailBuuCuc([]);
              }}
            />
          </div>
        }
        renderExpandedRow={(row) => {
          const days = calculateSeniorityDays(row.ngayVaoLam);
          const tyLeLay = row.soDonGanLay > 0 ? ((row.donLayTinhLuong / row.soDonGanLay) * 100).toFixed(1) : null;

          return (
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <strong className="text-slate-900 dark:text-white uppercase tracking-wide">
                    Chi Tiết Hoa Hồng & Thâm Niên: {row.tenNV}
                  </strong>
                  <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">
                    (Mã: {row.maNV})
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    {row.tenBC}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Ngày: <strong className="text-slate-800 dark:text-slate-200">{row.ngay} ({row.thu})</strong>
                  </span>
                  {days !== null && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                      Thâm niên: {days} ngày ({row.ngayVaoLam})
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10.5px]">
                {/* Khối Giao */}
                <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-blue-200 dark:border-blue-800 font-bold text-blue-700 dark:text-blue-300 text-[11px]">
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Giao Hàng</span>
                    <span>{row.donGiaoTinhLuong} đơn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đơn gán giao:</span>
                    <strong>{row.soDonGanGiao} đơn</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giao TB ngày:</span>
                    <strong>{row.giaoTbNgay} đơn</strong>
                  </div>
                </div>

                {/* Khối Lấy (LTC) */}
                <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-purple-200 dark:border-purple-800 font-bold text-purple-700 dark:text-purple-300 text-[11px]">
                    <span className="flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Lấy Hàng (LTC)</span>
                    <span className="font-black text-purple-600 dark:text-purple-400">{row.donLayTinhLuong} đơn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đơn gán lấy:</span>
                    <strong>{row.soDonGanLay} đơn</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tỷ lệ lấy:</span>
                    <strong className={tyLeLay && parseFloat(tyLeLay) >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                      {tyLeLay ? `${tyLeLay}%` : 'Không có gán'}
                    </strong>
                  </div>
                </div>

                {/* Khối Lương */}
                <div className="p-2 rounded-lg bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 space-y-1">
                  <div className="flex justify-between items-center pb-1 border-b border-orange-200 dark:border-orange-800 font-bold text-orange-700 dark:text-orange-300 text-[11px]">
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Lương Ngày</span>
                    <span className="font-black text-orange-600 dark:text-orange-400">{Math.round(row.tongLuong).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lương hoa hồng:</span>
                    <strong>{Math.round(row.luongHHNgay).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lương đảm bảo:</span>
                    <strong>{row.luongDamBao > 0 ? `${Math.round(row.luongDamBao).toLocaleString('vi-VN')} đ` : '0 đ'}</strong>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
      </div>
    </div>
  );
};

export default DailySalaryTab;
