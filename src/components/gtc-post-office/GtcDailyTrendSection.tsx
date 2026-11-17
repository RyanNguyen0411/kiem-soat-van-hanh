import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Calendar, 
  Layers, 
  RotateCcw, 
  TrendingUp, 
  Info, 
  AlertTriangle,
  Award,
  Clock,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
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
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import type { DatasetState } from '../../types/dashboard';
import { useAuth } from '../../context/AuthContext';

// Bảng màu nhận diện thương hiệu chuẩn từng bưu cục GHN
export const PO_PALETTE: Record<string, { main: string; light: string; border: string }> = {
  '(LAN) Cần Đước 1': { main: '#06B6D4', light: '#ECFEFF', border: '#A5F3FC' }, // Cyan
  '(LAN) Cần Giuộc':  { main: '#3B82F6', light: '#EFF6FF', border: '#BFDBFE' }, // Blue
  '(LAN) Phước Lý':   { main: '#8B5CF6', light: '#F5F3FF', border: '#DDD6FE' }, // Purple
  '(LAN) Rạch Kiến':  { main: '#F26522', light: '#FFF7ED', border: '#FFEDD5' }, // GHN Orange
  '(LAN) Tầm Vu':    { main: '#10B981', light: '#ECFDF5', border: '#A7F3D0' }  // Emerald
};

interface GtcDailyTrendSectionProps {
  dataset: DatasetState;
  selectedBuuCucGlobal?: string;
  selectedDateGlobal?: string;
  className?: string;
}

export const GtcDailyTrendSection: React.FC<GtcDailyTrendSectionProps> = ({
  dataset,
  selectedBuuCucGlobal,
  selectedDateGlobal,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';
  const assignedPo = currentUser?.assignedPostOffice;

  // Danh sách toàn bộ bưu cục cố định (Nếu là nhân viên bưu cục thì duy nhất 1 bưu cục của mình)
  const allManagedPos = useMemo(() => {
    if (isStaff && assignedPo) return [assignedPo];
    return [
      '(LAN) Cần Đước 1',
      '(LAN) Cần Giuộc',
      '(LAN) Phước Lý',
      '(LAN) Rạch Kiến',
      '(LAN) Tầm Vu'
    ];
  }, [isStaff, assignedPo]);

  // Danh sách toàn bộ loại hàng thực tế từ dữ liệu nguồn (trích xuất động, không hardcode)
  const allLoaiHangs = useMemo(() => {
    const set = new Set<string>();
    dataset.gtcBuuCuc.forEach(r => {
      if (r.loaiHang) set.add(r.loaiHang.trim());
    });
    return Array.from(set).sort();
  }, [dataset.gtcBuuCuc]);

  // Trích xuất danh sách tháng/năm có trong dữ liệu (sắp xếp mới nhất trước)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    dataset.gtcBuuCuc.forEach(r => {
      if (r.ngay && r.ngay.includes('/')) {
        const parts = r.ngay.split('/');
        if (parts.length === 3) {
          set.add(`${parts[1]}/${parts[2]}`);
        }
      }
    });
    return Array.from(set).sort((a, b) => {
      const [m1, y1] = a.split('/').map(Number);
      const [m2, y2] = b.split('/').map(Number);
      return new Date(y2, m2 - 1).getTime() - new Date(y1, m1 - 1).getTime();
    });
  }, [dataset.gtcBuuCuc]);

  // =========================================================================
  // 1. STATE BỘ LỌC ĐỘC LẬP (KHÔNG GHI ĐÈ BỘ LỌC TOÀN CỤC)
  // =========================================================================

  // A. Bộ lọc Bưu cục (Multi-select Checkbox)
  const [selectedPos, setSelectedPos] = useState<string[]>(() => {
    if (isStaff && assignedPo) return [assignedPo];
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' && allManagedPos.includes(selectedBuuCucGlobal)) {
      return [selectedBuuCucGlobal];
    }
    return allManagedPos;
  });

  // Kế thừa an toàn khi bộ lọc toàn cục thay đổi từ bên ngoài
  const lastGlobalBcRef = useRef(selectedBuuCucGlobal);
  useEffect(() => {
    if (isStaff && assignedPo) {
      setSelectedPos([assignedPo]);
      return;
    }
    if (selectedBuuCucGlobal !== lastGlobalBcRef.current) {
      lastGlobalBcRef.current = selectedBuuCucGlobal;
      if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' && allManagedPos.includes(selectedBuuCucGlobal)) {
        setSelectedPos([selectedBuuCucGlobal]);
      } else if (selectedBuuCucGlobal === 'all') {
        setSelectedPos(allManagedPos);
      }
    }
  }, [selectedBuuCucGlobal, allManagedPos, isStaff, assignedPo]);

  // B. Bộ lọc Tháng (Dropdown Tháng/Năm)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (selectedDateGlobal && selectedDateGlobal !== 'all' && selectedDateGlobal.includes('/')) {
      const parts = selectedDateGlobal.split('/');
      const mKey = `${parts[1]}/${parts[2]}`;
      if (availableMonths.includes(mKey)) return mKey;
    }
    return availableMonths[0] || '11/2026';
  });

  // C. Bộ lọc Loại hàng (Multi-select Checkbox)
  const [selectedLoaiHangs, setSelectedLoaiHangs] = useState<string[]>(() => allLoaiHangs);

  // Cập nhật khi allLoaiHangs nạp xong
  useEffect(() => {
    if (allLoaiHangs.length > 0 && selectedLoaiHangs.length === 0) {
      setSelectedLoaiHangs(allLoaiHangs);
    }
  }, [allLoaiHangs]);

  // D. Danh sách ngày thực tế có bản ghi trong tháng sau khi lọc Bưu cục và Loại hàng
  // KHÔNG hiển thị ngày tương lai hoặc tạo ngày giả (Theo đúng quy chuẩn UI/UX)
  const actualDatesInMonth = useMemo(() => {
    const dates = new Set<string>();
    dataset.gtcBuuCuc.forEach(r => {
      if (!r.ngay || !r.buuCuc) return;
      if (!selectedPos.includes(r.buuCuc)) return;
      if (!r.ngay.endsWith(selectedMonth)) return;
      if (selectedLoaiHangs.length > 0 && r.loaiHang && !selectedLoaiHangs.includes(r.loaiHang.trim())) {
        return;
      }
      dates.add(r.ngay);
    });

    // Sắp xếp ngày GIẢM DẦN (ngày gần nhất -> ngày xa nhất: 13, 12, 11, ..., 02, 01)
    return Array.from(dates).sort((a, b) => {
      const [d1, m1, y1] = a.split('/').map(Number);
      const [d2, m2, y2] = b.split('/').map(Number);
      return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    });
  }, [dataset.gtcBuuCuc, selectedPos, selectedMonth, selectedLoaiHangs]);

  // E. Bộ lọc CHỌN NGÀY dạng Popover Dropdown
  const [selectedDaysInMonth, setSelectedDaysInMonth] = useState<string[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo hoặc tự động cập nhật selectedDaysInMonth khi actualDatesInMonth thay đổi
  const prevMonthKeyRef = useRef(selectedMonth);
  useEffect(() => {
    // Nếu đổi tháng hoặc danh sách ngày rỗng -> chọn toàn bộ ngày có dữ liệu của tháng mới
    if (selectedMonth !== prevMonthKeyRef.current || selectedDaysInMonth.length === 0) {
      prevMonthKeyRef.current = selectedMonth;
      setSelectedDaysInMonth([...actualDatesInMonth]);
    } else {
      // Giữ lại các ngày còn hợp lệ trong actualDatesInMonth
      const validDays = selectedDaysInMonth.filter(d => actualDatesInMonth.includes(d));
      if (validDays.length === 0 && actualDatesInMonth.length > 0) {
        setSelectedDaysInMonth([...actualDatesInMonth]);
      } else if (validDays.length !== selectedDaysInMonth.length) {
        setSelectedDaysInMonth(validDays);
      }
    }
  }, [actualDatesInMonth, selectedMonth]);

  // Click outside để đóng popover chọn ngày
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
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

  // F. State ngày được chọn trên biểu đồ để xem chi tiết (Click-to-Inspect)
  // Helper chuẩn hoá chuỗi ngày DD/MM/YYYY
  const normalizeDateStr = (dStr: string | null | undefined): string => {
    if (!dStr) return '';
    const parts = dStr.trim().split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${d}/${m}/${y}`;
    }
    return dStr.trim();
  };

  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    if (selectedDateGlobal && selectedDateGlobal !== 'all') {
      const normGlobal = normalizeDateStr(selectedDateGlobal);
      if (normGlobal.endsWith(selectedMonth)) {
        return normGlobal;
      }
    }
    return null;
  });

  // Đồng bộ selectedDay khi selectedDateGlobal thay đổi
  useEffect(() => {
    if (selectedDateGlobal && selectedDateGlobal !== 'all') {
      const normGlobal = normalizeDateStr(selectedDateGlobal);
      if (normGlobal.endsWith(selectedMonth)) {
        setSelectedDay(normGlobal);
      }
    }
  }, [selectedDateGlobal, selectedMonth]);

  const handleSelectDay = (targetDate: string) => {
    if (!targetDate) return;
    const normalized = normalizeDateStr(targetDate);
    setSelectedDay(normalized);
  };

  // G. State thu gọn/mở rộng từng Bưu cục trong Bảng kê chi tiết
  const [collapsedPos, setCollapsedPos] = useState<Record<string, boolean>>({});

  const handleToggleCollapsePo = (po: string) => {
    setCollapsedPos(prev => ({
      ...prev,
      [po]: !prev[po]
    }));
  };

  // H. State ẩn/hiện series bưu cục trên biểu đồ (Interactive Legend)
  const [hiddenPosOnChart, setHiddenPosOnChart] = useState<Record<string, boolean>>({});

  // I. State Accordion Drill-Down cho 4 thẻ KPI (Chỉ mở 1 drill-down tại một thời điểm)
  const [activeKpiDrillDown, setActiveKpiDrillDown] = useState<'volume' | 'gtc' | 'rate' | 'tondong' | null>(null);
  const [expandedPoDrill, setExpandedPoDrill] = useState<Record<string, boolean>>({});

  const handleToggleKpiDrillDown = (type: 'volume' | 'gtc' | 'rate' | 'tondong') => {
    setActiveKpiDrillDown(prev => prev === type ? null : type);
  };

  const handleTogglePoDrillExpand = (po: string) => {
    setExpandedPoDrill(prev => ({
      ...prev,
      [po]: !prev[po]
    }));
  };

  // =========================================================================
  // 2. TÍNH TOÁN DỮ LIỆU ĐÃ LỌC & GOM NHÓM CHUẨN XÁC
  // =========================================================================

  // Xác định số ngày tối đa trong tháng đang chọn (xử lý chính xác 28, 29, 30, 31 ngày)
  const daysInSelectedMonth = useMemo(() => {
    if (!selectedMonth || !selectedMonth.includes('/')) return 31;
    const [m, y] = selectedMonth.split('/').map(Number);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);

  // Lọc dữ liệu gốc theo Tháng, Bưu cục, Loại hàng và các Ngày được chọn trong Popover
  const filteredRecords = useMemo(() => {
    return dataset.gtcBuuCuc.filter(r => {
      if (!r.ngay || !r.buuCuc) return false;
      if (!selectedPos.includes(r.buuCuc)) return false;
      if (!r.ngay.endsWith(selectedMonth)) return false;
      if (selectedLoaiHangs.length > 0 && r.loaiHang && !selectedLoaiHangs.includes(r.loaiHang.trim())) {
        return false;
      }
      // Áp dụng bộ lọc chọn ngày tức thì
      if (selectedDaysInMonth.length > 0 && !selectedDaysInMonth.includes(r.ngay)) {
        return false;
      }
      return true;
    });
  }, [dataset.gtcBuuCuc, selectedPos, selectedMonth, selectedLoaiHangs, selectedDaysInMonth]);

  // Tập hợp các ngày thực tế có bản ghi trong tập đã lọc
  const actualDatesInFiltered = useMemo(() => {
    const dates = new Set<string>();
    filteredRecords.forEach(r => dates.add(r.ngay));
    return dates;
  }, [filteredRecords]);

  // Kiểm tra ngày đang chọn để inspect còn hợp lệ hay không khi đổi bộ lọc
  useEffect(() => {
    if (selectedDay) {
      if (!actualDatesInFiltered.has(selectedDay) || !selectedDay.endsWith(selectedMonth)) {
        setSelectedDay(null);
      }
    }
  }, [selectedMonth, selectedPos, selectedLoaiHangs, selectedDaysInMonth, actualDatesInFiltered]);

  // =========================================================================
  // 3. THẺ KPI TỔNG QUAN THEO PHẠM VI LỌC (THEO ĐÚNG TRỌNG SỐ)
  // =========================================================================
  const overallKPIs = useMemo(() => {
    let volume = 0;
    let sldGTC = 0;
    let sldGan = 0;

    filteredRecords.forEach(r => {
      volume += (r.volume || 0);
      sldGTC += (r.sldGTC || 0);
      sldGan += (r.sldGan || 0);
    });

    const tonDong = volume - sldGTC;
    const gtcRate = volume > 0 ? (sldGTC / volume) * 100 : 0;
    const ganRate = volume > 0 ? (sldGan / volume) * 100 : 0;

    return {
      volume,
      sldGTC,
      sldGan,
      tonDong,
      gtcRate,
      ganRate,
      recordCount: filteredRecords.length
    };
  }, [filteredRecords]);

  // =========================================================================
  // 3B. DỮ LIỆU DRILL-DOWN CHI TIẾT TỪNG BƯU CỤC CHO 4 THẺ KPI
  // =========================================================================
  const kpiDrillDownData = useMemo(() => {
    return selectedPos.map(po => {
      const recordsOfPo = filteredRecords.filter(r => r.buuCuc === po);
      let vol = 0;
      let gan = 0;
      let gtc = 0;

      const loaiMap: Record<string, { volume: number; sldGan: number; sldGTC: number }> = {};
      recordsOfPo.forEach(r => {
        vol += (r.volume || 0);
        gan += (r.sldGan || 0);
        gtc += (r.sldGTC || 0);
        const lh = (r.loaiHang || 'Khác').trim();
        if (!loaiMap[lh]) loaiMap[lh] = { volume: 0, sldGan: 0, sldGTC: 0 };
        loaiMap[lh].volume += (r.volume || 0);
        loaiMap[lh].sldGan += (r.sldGan || 0);
        loaiMap[lh].sldGTC += (r.sldGTC || 0);
      });

      const ton = vol - gtc;
      const rate = vol > 0 ? (gtc / vol) * 100 : 0;
      const ganPct = vol > 0 ? (gan / vol) * 100 : 0;
      const tonPct = vol > 0 ? (ton / vol) * 100 : 0;

      const loaiBreakdown = Object.entries(loaiMap).map(([lh, s]) => ({
        loaiHang: lh,
        volume: s.volume,
        sldGan: s.sldGan,
        sldGTC: s.sldGTC,
        tonDong: s.volume - s.sldGTC,
        gtcRate: s.volume > 0 ? (s.sldGTC / s.volume) * 100 : 0,
        ganRate: s.volume > 0 ? (s.sldGan / s.volume) * 100 : 0
      })).sort((a, b) => b.volume - a.volume);

      return {
        buuCuc: po,
        color: PO_PALETTE[po]?.main || '#3B82F6',
        volume: vol,
        sldGan: gan,
        sldGTC: gtc,
        tonDong: ton,
        gtcRate: rate,
        ganRate: ganPct,
        tonRate: tonPct,
        shareOfVolume: overallKPIs.volume > 0 ? (vol / overallKPIs.volume) * 100 : 0,
        loaiBreakdown
      };
    });
  }, [filteredRecords, selectedPos, overallKPIs.volume]);

  // =========================================================================
  // 4. CHUẨN BỊ DỮ LIỆU BIỂU ĐỒ COMBINATION CHART THEO TỪNG NGÀY
  // =========================================================================
  const chartDailyData = useMemo(() => {
    const result: any[] = [];
    const [m, y] = selectedMonth.split('/');

    // Duyệt qua tất cả các ngày từ daysInSelectedMonth giảm dần về 1 (ngày gần nhất ở bên trái -> ngày xa nhất ở bên phải)
    for (let d = daysInSelectedMonth; d >= 1; d--) {
      const dayStr = `${d < 10 ? '0' + d : d}/${m}/${y}`;
      
      // Nếu ngày này không nằm trong danh sách ngày được tick chọn -> bỏ qua trên biểu đồ
      if (selectedDaysInMonth.length > 0 && !selectedDaysInMonth.includes(dayStr)) {
        continue;
      }

      const dayRecords = filteredRecords.filter(r => r.ngay === dayStr);

      // Phân biệt: Không có bản ghi (No Record) vs Có bản ghi
      if (dayRecords.length === 0) {
        result.push({
          date: dayStr,
          dayNumber: `${d}`,
          hasData: false,
          totalVolume: null,
          totalTonDong: null,
          totalSldGtc: null,
          totalGtcRate: null
        });
        continue;
      }

      let dayTotalVolume = 0;
      let dayTotalGtc = 0;
      let dayTotalGan = 0;

      // Phân tách số liệu theo từng bưu cục
      const poDataMap: Record<string, { volume: number; sldGTC: number; tonDong: number; gtcRate: number }> = {};
      selectedPos.forEach(po => {
        poDataMap[po] = { volume: 0, sldGTC: 0, tonDong: 0, gtcRate: 0 };
      });

      dayRecords.forEach(r => {
        dayTotalVolume += (r.volume || 0);
        dayTotalGtc += (r.sldGTC || 0);
        dayTotalGan += (r.sldGan || 0);

        if (poDataMap[r.buuCuc]) {
          poDataMap[r.buuCuc].volume += (r.volume || 0);
          poDataMap[r.buuCuc].sldGTC += (r.sldGTC || 0);
        }
      });

      const dayTotalTonDong = dayTotalVolume - dayTotalGtc;
      const dayTotalGtcRate = dayTotalVolume > 0 ? (dayTotalGtc / dayTotalVolume) * 100 : 0;

      // Tính tồn đọng và tỷ lệ GTC cho từng bưu cục
      const poPayload: Record<string, any> = {};
      selectedPos.forEach(po => {
        const item = poDataMap[po];
        item.tonDong = item.volume - item.sldGTC;
        item.gtcRate = item.volume > 0 ? (item.sldGTC / item.volume) * 100 : 0;

        poPayload[`vol_${po}`] = item.volume;
        poPayload[`ton_${po}`] = item.tonDong;
        poPayload[`gtc_${po}`] = item.sldGTC;
        poPayload[`rate_${po}`] = item.volume > 0 ? Number(item.gtcRate.toFixed(2)) : null;
      });

      result.push({
        date: dayStr,
        dayNumber: `${d}`,
        hasData: true,
        totalVolume: dayTotalVolume,
        totalTonDong: dayTotalTonDong,
        totalSldGtc: dayTotalGtc,
        totalGtcRate: Number(dayTotalGtcRate.toFixed(2)),
        ...poPayload
      });
    }

    return result;
  }, [filteredRecords, daysInSelectedMonth, selectedMonth, selectedPos, selectedDaysInMonth]);

  // =========================================================================
  // 5. PHÂN TÍCH BIẾN ĐỘNG (MIN, MAX, TỒN ĐỌNG CAO NHẤT)
  // =========================================================================
  const trendExtremes = useMemo(() => {
    const daysWithData = chartDailyData.filter(d => d.hasData && d.totalVolume > 0);
    if (daysWithData.length === 0) return null;

    let maxVolDay = daysWithData[0];
    let minVolDay = daysWithData[0];
    let maxRateDay = daysWithData[0];
    let minRateDay = daysWithData[0];
    let maxTonDay = daysWithData[0];

    daysWithData.forEach(d => {
      if (d.totalVolume > maxVolDay.totalVolume) maxVolDay = d;
      if (d.totalVolume < minVolDay.totalVolume) minVolDay = d;
      if (d.totalGtcRate > maxRateDay.totalGtcRate) maxRateDay = d;
      if (d.totalGtcRate < minRateDay.totalGtcRate) minRateDay = d;
      if (d.totalTonDong > maxTonDay.totalTonDong) maxTonDay = d;
    });

    return {
      maxVolDay,
      minVolDay,
      maxRateDay,
      minRateDay,
      maxTonDay,
      totalActiveDays: daysWithData.length
    };
  }, [chartDailyData]);

  // =========================================================================
  // 6. DỮ LIỆU BẢNG KÊ CHI TIẾT HAI CẤP (BƯU CỤC -> LOẠI HÀNG)
  // =========================================================================
  const inspectionTableData = useMemo(() => {
    if (!selectedDay) return null;
    const targetNorm = normalizeDateStr(selectedDay);

    const dayRecords = filteredRecords.filter(r => normalizeDateStr(r.ngay) === targetNorm);
    if (dayRecords.length === 0) return null;

    let grandVolume = 0;
    let grandSldGan = 0;
    let grandSldGtc = 0;

    const poGroups: {
      buuCuc: string;
      color: string;
      items: {
        loaiHang: string;
        volume: number;
        sldGan: number;
        sldGTC: number;
        gtcRate: number;
        tonDong: number;
      }[];
      totalVolume: number;
      totalSldGan: number;
      totalSldGtc: number;
      totalGtcRate: number;
      totalTonDong: number;
    }[] = [];

    selectedPos.forEach(po => {
      const recordsOfPo = dayRecords.filter(r => r.buuCuc === po);
      if (recordsOfPo.length === 0) return;

      // Gom nhóm theo loại hàng trong bưu cục này (cộng dồn nếu có nhiều bản ghi cùng loại hàng)
      const loaiMap: Record<string, { volume: number; sldGan: number; sldGTC: number }> = {};
      recordsOfPo.forEach(r => {
        const lh = (r.loaiHang || 'Khác').trim();
        if (!loaiMap[lh]) {
          loaiMap[lh] = { volume: 0, sldGan: 0, sldGTC: 0 };
        }
        loaiMap[lh].volume += (r.volume || 0);
        loaiMap[lh].sldGan += (r.sldGan || 0);
        loaiMap[lh].sldGTC += (r.sldGTC || 0);
      });

      let poVol = 0;
      let poGan = 0;
      let poGtc = 0;

      const items = Object.entries(loaiMap).map(([loaiHang, stats]) => {
        const tonDong = stats.volume - stats.sldGTC;
        const gtcRate = stats.volume > 0 ? (stats.sldGTC / stats.volume) * 100 : 0;
        poVol += stats.volume;
        poGan += stats.sldGan;
        poGtc += stats.sldGTC;

        return {
          loaiHang,
          volume: stats.volume,
          sldGan: stats.sldGan,
          sldGTC: stats.sldGTC,
          gtcRate,
          tonDong
        };
      }).sort((a, b) => b.volume - a.volume);

      const poTon = poVol - poGtc;
      const poRate = poVol > 0 ? (poGtc / poVol) * 100 : 0;

      grandVolume += poVol;
      grandSldGan += poGan;
      grandSldGtc += poGtc;

      poGroups.push({
        buuCuc: po,
        color: PO_PALETTE[po]?.main || '#F26522',
        items,
        totalVolume: poVol,
        totalSldGan: poGan,
        totalSldGtc: poGtc,
        totalGtcRate: poRate,
        totalTonDong: poTon
      });
    });

    const grandTonDong = grandVolume - grandSldGtc;
    const grandGtcRate = grandVolume > 0 ? (grandSldGtc / grandVolume) * 100 : 0;

    return {
      selectedDay,
      poGroups,
      grandVolume,
      grandSldGan,
      grandSldGtc,
      grandGtcRate,
      grandTonDong
    };
  }, [filteredRecords, selectedDay, selectedPos]);

  // Xử lý bật/tắt toàn bộ bưu cục
  const handleToggleAllPos = () => {
    if (isStaff) return;
    if (selectedPos.length === allManagedPos.length) {
      setSelectedPos([]);
    } else {
      setSelectedPos([...allManagedPos]);
    }
  };

  // Xử lý chọn đơn lẻ bưu cục
  const handleToggleSinglePo = (po: string) => {
    if (isStaff) return;
    setSelectedPos(prev => {
      if (prev.includes(po)) {
        return prev.filter(p => p !== po);
      } else {
        return [...prev, po];
      }
    });
  };

  // Xử lý bật/tắt toàn bộ loại hàng
  const handleToggleAllLoaiHangs = () => {
    if (selectedLoaiHangs.length === allLoaiHangs.length) {
      setSelectedLoaiHangs([]);
    } else {
      setSelectedLoaiHangs([...allLoaiHangs]);
    }
  };

  // Xử lý chọn đơn lẻ loại hàng
  const handleToggleSingleLoaiHang = (lh: string) => {
    setSelectedLoaiHangs(prev => {
      if (prev.includes(lh)) {
        return prev.filter(item => item !== lh);
      } else {
        return [...prev, lh];
      }
    });
  };

  // Xử lý chọn / bỏ chọn ngày trong popover
  const handleToggleDayInMonth = (dateStr: string) => {
    setSelectedDaysInMonth(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr].sort((a, b) => {
          const [d1, m1, y1] = a.split('/').map(Number);
          const [d2, m2, y2] = b.split('/').map(Number);
          return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        });
      }
    });
  };

  const handleSelectAllDays = () => {
    setSelectedDaysInMonth([...actualDatesInMonth]);
  };

  const handleDeselectAllDays = () => {
    setSelectedDaysInMonth([]);
  };

  const handleResetDays = () => {
    setSelectedDaysInMonth([...actualDatesInMonth]);
  };

  // Đặt lại toàn bộ bộ lọc xu hướng
  const handleResetTrendFilters = () => {
    setSelectedPos([...allManagedPos]);
    setSelectedLoaiHangs([...allLoaiHangs]);
    if (availableMonths.length > 0) setSelectedMonth(availableMonths[0]);
    setSelectedDaysInMonth([...actualDatesInMonth]);
    setSelectedDay(null);
    setHiddenPosOnChart({});
    setCollapsedPos({});
  };

  // Toggle ẩn/hiện bưu cục trên biểu đồ
  const handleToggleChartSeries = (po: string) => {
    setHiddenPosOnChart(prev => ({
      ...prev,
      [po]: !prev[po]
    }));
  };

  // Nhãn hiển thị trên thẻ chọn ngày
  const dateBadgeLabel = useMemo(() => {
    if (actualDatesInMonth.length === 0) return 'Không có ngày';
    if (selectedDaysInMonth.length === actualDatesInMonth.length) {
      return `Tất cả (${selectedDaysInMonth.length < 10 ? '0' + selectedDaysInMonth.length : selectedDaysInMonth.length} ngày)`;
    }
    const count = selectedDaysInMonth.length;
    return `${count < 10 ? '0' + count : count} ngày đã chọn`;
  }, [selectedDaysInMonth, actualDatesInMonth]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-3.5 space-y-2 ${className}`}>
      {/* =========================================================================
          TIÊU ĐỀ PHÂN HỆ XU HƯỚNG (COMPACT)
         ========================================================================= */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <TrendingUp className="w-3 h-3" />
          </div>
          <h3 className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span>Phân Tích Xu Hướng Daily Trend</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              Tháng {selectedMonth}
            </span>
          </h3>
        </div>
        <div className="text-[10px] text-slate-400 hidden sm:block">
          Volume, Tồn đọng &amp; %GTC theo ngày &bull; Nhấp cột biểu đồ để xem chi tiết
        </div>
      </div>

      {/* =========================================================================
          HÀNG 1: BỘ LỌC COMPACT EXECUTIVE (42-48px)
          Bưu cục | Tháng | Chọn ngày | Loại hàng | Reset
         ========================================================================= */}
      <div className="bg-slate-50 dark:bg-slate-750/60 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 min-h-[42px] max-h-none lg:max-h-[48px] overflow-x-auto overflow-y-visible">
        {/* A. Bưu cục */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">Bưu cục:</span>
          {!isStaff ? (
            <>
              <div className="flex items-center gap-1">
                {allManagedPos.map(po => {
                  const isSelected = selectedPos.includes(po);
                  const colorInfo = PO_PALETTE[po];
                  return (
                    <button
                      key={po}
                      type="button"
                      onClick={() => handleToggleSinglePo(po)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all border cursor-pointer select-none ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                          : 'bg-slate-200/60 dark:bg-slate-700 text-slate-400 border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={isSelected ? { borderColor: colorInfo?.main } : {}}
                      title={po}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: colorInfo?.main }} 
                      />
                      <span>{po.replace('(LAN) ', '')}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleToggleAllPos}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 underline shrink-0 cursor-pointer"
                title={selectedPos.length === allManagedPos.length ? 'Bỏ chọn toàn bộ' : 'Chọn tất cả 5 bưu cục'}
              >
                {selectedPos.length === allManagedPos.length ? 'Bỏ' : 'Tất cả'}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-500/50 rounded-md text-[10px] font-bold text-orange-700 dark:text-orange-300 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              <span>{assignedPo}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block" />

        {/* B. Tháng */}
        <div className="flex items-center gap-1 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Tháng:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block" />

        {/* C. Chọn ngày (Popover) */}
        <div className="relative shrink-0" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(prev => !prev)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-[10px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer transition-all"
            title="Nhấn để mở danh sách chọn ngày"
          >
            <Clock className="w-3 h-3 text-orange-600 shrink-0" />
            <span className="font-mono font-bold">{dateBadgeLabel}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Popover xổ xuống */}
          {isDatePickerOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-2.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Ngày có dữ liệu ({actualDatesInMonth.length})
                </span>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="text-orange-600 hover:underline font-semibold"
                  >
                    Tất cả
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllDays}
                    className="text-slate-500 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={handleResetDays}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Danh sách Checkbox các ngày thực tế */}
              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1 text-xs">
                {actualDatesInMonth.length === 0 ? (
                  <div className="py-3 text-center text-slate-400 italic text-[11px]">
                    Không có ngày phù hợp với bộ lọc
                  </div>
                ) : (
                  actualDatesInMonth.map(dateStr => {
                    const isChecked = selectedDaysInMonth.includes(dateStr);
                    return (
                      <label
                        key={dateStr}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDayInMonth(dateStr)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                          <span className={`font-mono text-[11px] ${isChecked ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                            {dateStr}
                          </span>
                        </div>
                        {isChecked && <Check className="w-3 h-3 text-emerald-600" />}
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer popover */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-[10px] text-slate-400">
                <span>Đã chọn: <strong className="text-orange-600 font-mono">{selectedDaysInMonth.length}</strong>/{actualDatesInMonth.length}</span>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block" />

        {/* D. Loại hàng */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Layers className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">Hàng:</span>
          <div className="flex items-center gap-1">
            {allLoaiHangs.map(lh => {
              const isSelected = selectedLoaiHangs.includes(lh);
              return (
                <button
                  key={lh}
                  type="button"
                  onClick={() => handleToggleSingleLoaiHang(lh)}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800 shadow-2xs'
                      : 'bg-slate-200/60 dark:bg-slate-700 text-slate-400 border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <span>{lh}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleToggleAllLoaiHangs}
            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 underline shrink-0 cursor-pointer"
            title={selectedLoaiHangs.length === allLoaiHangs.length ? 'Bỏ chọn toàn bộ' : 'Chọn tất cả loại hàng'}
          >
            {selectedLoaiHangs.length === allLoaiHangs.length ? 'Bỏ' : 'Tất cả'}
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block" />

        {/* E. Nút Reset */}
        <button
          type="button"
          onClick={handleResetTrendFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0 ml-auto"
          title="Đặt lại toàn bộ bộ lọc xu hướng"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* =========================================================================
          HÀNG 2: BỐN THẺ KPI COMPACT (52-60px)
         ========================================================================= */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* KPI 1: TỔNG VOLUME */}
          <button
            type="button"
            onClick={() => handleToggleKpiDrillDown('volume')}
            className={`text-left px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-800 min-h-[52px] max-h-[60px] flex flex-col justify-between ${
              activeKpiDrillDown === 'volume'
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Tổng Volume
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeKpiDrillDown === 'volume' ? 'rotate-180 text-emerald-600' : ''}`} />
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="text-[19px] font-black text-[#15803D] dark:text-emerald-400 leading-none">
                {overallKPIs.volume.toLocaleString('vi-VN')}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                %Gán: <strong className="text-emerald-700 dark:text-emerald-400">{overallKPIs.ganRate.toFixed(1)}%</strong>
              </span>
            </div>
          </button>

          {/* KPI 2: TỔNG SLĐ GTC */}
          <button
            type="button"
            onClick={() => handleToggleKpiDrillDown('gtc')}
            className={`text-left px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-800 min-h-[52px] max-h-[60px] flex flex-col justify-between ${
              activeKpiDrillDown === 'gtc'
                ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-sm bg-blue-50/20 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Tổng SLĐ GTC
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeKpiDrillDown === 'gtc' ? 'rotate-180 text-blue-600' : ''}`} />
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="text-[19px] font-black text-[#002D72] dark:text-blue-400 leading-none">
                {overallKPIs.sldGTC.toLocaleString('vi-VN')}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                GTC ca 1+2
              </span>
            </div>
          </button>

          {/* KPI 3: %GTC CỦA BC */}
          <button
            type="button"
            onClick={() => handleToggleKpiDrillDown('rate')}
            className={`text-left px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-800 min-h-[52px] max-h-[60px] flex flex-col justify-between ${
              activeKpiDrillDown === 'rate'
                ? 'border-sky-500 ring-2 ring-sky-500/30 shadow-sm bg-sky-50/20 dark:bg-sky-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-sm hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                %GTC CỦA BC
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeKpiDrillDown === 'rate' ? 'rotate-180 text-sky-600' : ''}`} />
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="text-[19px] font-black text-[#0284C7] dark:text-sky-400 leading-none">
                {overallKPIs.gtcRate.toFixed(2)}%
              </span>
              <span className={`text-[10px] font-bold whitespace-nowrap ${overallKPIs.gtcRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {overallKPIs.gtcRate >= 80 ? 'Đạt chuẩn' : 'Cần tối ưu'}
              </span>
            </div>
          </button>

          {/* KPI 4: TỔNG TỒN ĐỌNG */}
          <button
            type="button"
            onClick={() => handleToggleKpiDrillDown('tondong')}
            className={`text-left px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-800 min-h-[52px] max-h-[60px] flex flex-col justify-between ${
              activeKpiDrillDown === 'tondong'
                ? 'border-[#F97316] ring-2 ring-[#F97316]/30 shadow-sm bg-orange-50/20 dark:bg-orange-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-sm hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                Tổng Tồn Đọng
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeKpiDrillDown === 'tondong' ? 'rotate-180 text-[#F97316]' : ''}`} />
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
              <span className="text-[19px] font-black text-[#F97316] dark:text-orange-400 leading-none">
                {overallKPIs.tonDong.toLocaleString('vi-VN')}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Tồn: <strong className={overallKPIs.tonDong > 0 ? 'text-orange-600' : 'text-emerald-600'}>
                  {overallKPIs.volume > 0 ? ((overallKPIs.tonDong / overallKPIs.volume) * 100).toFixed(1) : '0.0'}%
                </strong>
              </span>
            </div>
          </button>
        </div>

        {/* ACCORDION DRILL-DOWN CONTAINER (CHỈ 1 DRILL-DOWN MỞ TẠI MỘT THỜI ĐIỂM) */}
        {activeKpiDrillDown && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-3.5 transition-all duration-300">
            {/* Header của bảng Drill-Down */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  activeKpiDrillDown === 'volume' ? 'bg-[#15803D]' :
                  activeKpiDrillDown === 'gtc' ? 'bg-[#002D72]' :
                  activeKpiDrillDown === 'rate' ? 'bg-[#0284C7]' : 'bg-[#F97316]'
                }`} />
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  {activeKpiDrillDown === 'volume' && 'Drill-Down Chi Tiết: Sản Lượng Volume & Tỷ Lệ Gán Theo Bưu Cục'}
                  {activeKpiDrillDown === 'gtc' && 'Drill-Down Chi Tiết: Sản Lượng Giao Thành Công (SLĐ GTC) Theo Bưu Cục'}
                  {activeKpiDrillDown === 'rate' && 'Drill-Down Chi Tiết: Bảng Xếp Hạng %GTC Của Bưu Cục (Chuẩn Trọng Số)'}
                  {activeKpiDrillDown === 'tondong' && 'Drill-Down Chi Tiết: Sản Lượng Tồn Đọng & Tỷ Lệ Tồn Theo Bưu Cục'}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-750 text-slate-500 font-semibold">
                  Tháng {selectedMonth} &bull; {selectedPos.length} bưu cục
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveKpiDrillDown(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                title="Đóng bảng chi tiết"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung bảng tương ứng với từng thẻ */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-center w-10">STT</th>
                    <th className="py-2 px-3 text-center">Bưu Cục</th>
                    {activeKpiDrillDown === 'volume' && (
                      <>
                        <th className="py-2 px-3 text-center">Tổng Volume</th>
                        <th className="py-2 px-3 text-center">Tỷ Trọng Vol</th>
                        <th className="py-2 px-3 text-center">SLĐ Gán</th>
                        <th className="py-2 px-3 text-center">%Gán</th>
                        <th className="py-2 px-3 text-center">Tiến Độ Gán</th>
                      </>
                    )}
                    {activeKpiDrillDown === 'gtc' && (
                      <>
                        <th className="py-2 px-3 text-center">SLĐ GTC</th>
                        <th className="py-2 px-3 text-center">Tổng Volume</th>
                        <th className="py-2 px-3 text-center">%GTC Đạt</th>
                        <th className="py-2 px-3 text-center">Đóng Góp GTC</th>
                        <th className="py-2 px-3 text-center">Hiệu Suất</th>
                      </>
                    )}
                    {activeKpiDrillDown === 'rate' && (
                      <>
                        <th className="py-2 px-3 text-center">%GTC Thực Tế</th>
                        <th className="py-2 px-3 text-center">SLĐ GTC / Volume</th>
                        <th className="py-2 px-3 text-center">Đánh Giá Chuẩn</th>
                        <th className="py-2 px-3 text-center">So Với Chuẩn 80%</th>
                      </>
                    )}
                    {activeKpiDrillDown === 'tondong' && (
                      <>
                        <th className="py-2 px-3 text-center">Số Tồn Đọng</th>
                        <th className="py-2 px-3 text-center">Tổng Volume</th>
                        <th className="py-2 px-3 text-center">Tỷ Lệ Tồn</th>
                        <th className="py-2 px-3 text-center">Mức Cảnh Báo</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {kpiDrillDownData.map((poItem, idx) => {
                    const isExpanded = !!expandedPoDrill[poItem.buuCuc];
                    const hasMultiLoai = poItem.loaiBreakdown.length > 1;

                    return (
                      <React.Fragment key={poItem.buuCuc}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: poItem.color }} />
                              <span>{poItem.buuCuc}</span>
                              {hasMultiLoai && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePoDrillExpand(poItem.buuCuc)}
                                  className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                                  title="Xem phân rã loại hàng"
                                >
                                  {isExpanded ? 'Thu gọn' : `${poItem.loaiBreakdown.length} loại`}
                                </button>
                              )}
                            </div>
                          </td>
                          {activeKpiDrillDown === 'volume' && (
                            <>
                              <td className="py-2 px-3 text-right font-black text-[#15803D] dark:text-emerald-400">
                                {poItem.volume.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                {poItem.shareOfVolume.toFixed(1)}%
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                                {poItem.sldGan.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                                {poItem.ganRate.toFixed(1)}%
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-[#15803D] h-full rounded-full" style={{ width: `${Math.min(poItem.ganRate, 100)}%` }} />
                                </div>
                              </td>
                            </>
                          )}
                          {activeKpiDrillDown === 'gtc' && (
                            <>
                              <td className="py-2 px-3 text-right font-black text-[#002D72] dark:text-blue-400">
                                {poItem.sldGTC.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                                {poItem.volume.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                {poItem.gtcRate.toFixed(2)}%
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                {overallKPIs.sldGTC > 0 ? ((poItem.sldGTC / overallKPIs.sldGTC) * 100).toFixed(1) : '0.0'}%
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  poItem.gtcRate >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  poItem.gtcRate >= 65 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {poItem.gtcRate >= 80 ? 'Đạt chuẩn' : poItem.gtcRate >= 65 ? 'Trung bình' : 'Cần cải thiện'}
                                </span>
                              </td>
                            </>
                          )}
                          {activeKpiDrillDown === 'rate' && (
                            <>
                              <td className="py-2 px-3 text-right font-black text-[#0284C7] dark:text-sky-400 text-sm">
                                {poItem.gtcRate.toFixed(2)}%
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                {poItem.sldGTC.toLocaleString('vi-VN')} / {poItem.volume.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  poItem.gtcRate >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  poItem.gtcRate >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {poItem.gtcRate >= 85 ? 'Xuất sắc (>=85%)' : poItem.gtcRate >= 70 ? 'Đạt (>=70%)' : 'Dưới chuẩn (<70%)'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-xs">
                                {poItem.gtcRate - 80 >= 0 ? (
                                  <span className="text-emerald-600">+{(poItem.gtcRate - 80).toFixed(2)}%</span>
                                ) : (
                                  <span className="text-rose-600">{(poItem.gtcRate - 80).toFixed(2)}%</span>
                                )}
                              </td>
                            </>
                          )}
                          {activeKpiDrillDown === 'tondong' && (
                            <>
                              <td className="py-2 px-3 text-right font-black text-[#F97316] dark:text-orange-400">
                                {poItem.tonDong.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                                {poItem.volume.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-orange-600 dark:text-orange-400">
                                {poItem.tonRate.toFixed(1)}%
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  poItem.tonRate <= 15 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  poItem.tonRate <= 25 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {poItem.tonRate <= 15 ? 'Tốt (<=15%)' : poItem.tonRate <= 25 ? 'Chú ý' : 'Báo động (>25%)'}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>

                        {/* Sub-rows phân rã theo loại hàng nếu bưu cục được mở rộng */}
                        {isExpanded && poItem.loaiBreakdown.map(lb => (
                          <tr key={`${poItem.buuCuc}-${lb.loaiHang}`} className="bg-slate-50/50 dark:bg-slate-750/30 text-[11px]">
                            <td className="py-1 px-3 text-center text-slate-300">&bull;</td>
                            <td className="py-1 px-3 pl-7 text-slate-600 dark:text-slate-400 italic">
                              {lb.loaiHang}
                            </td>
                            {activeKpiDrillDown === 'volume' && (
                              <>
                                <td className="py-1 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                  {lb.volume.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-right text-slate-400">
                                  {poItem.volume > 0 ? ((lb.volume / poItem.volume) * 100).toFixed(1) : 0}%
                                </td>
                                <td className="py-1 px-3 text-right text-slate-600 dark:text-slate-400">
                                  {lb.sldGan.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-right text-emerald-600">
                                  {lb.ganRate.toFixed(1)}%
                                </td>
                                <td className="py-1 px-3 text-center">-</td>
                              </>
                            )}
                            {activeKpiDrillDown === 'gtc' && (
                              <>
                                <td className="py-1 px-3 text-right font-bold text-blue-700 dark:text-blue-300">
                                  {lb.sldGTC.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-right text-slate-400">
                                  {lb.volume.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-right text-blue-600">
                                  {lb.gtcRate.toFixed(2)}%
                                </td>
                                <td className="py-1 px-3 text-right text-slate-400">-</td>
                                <td className="py-1 px-3 text-center">-</td>
                              </>
                            )}
                            {activeKpiDrillDown === 'rate' && (
                              <>
                                <td className="py-1 px-3 text-right font-bold text-sky-600">
                                  {lb.gtcRate.toFixed(2)}%
                                </td>
                                <td className="py-1 px-3 text-right text-slate-400">
                                  {lb.sldGTC.toLocaleString('vi-VN')} / {lb.volume.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-center">-</td>
                                <td className="py-1 px-3 text-right text-slate-400">-</td>
                              </>
                            )}
                            {activeKpiDrillDown === 'tondong' && (
                              <>
                                <td className="py-1 px-3 text-right font-bold text-orange-600">
                                  {lb.tonDong.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-right text-slate-400">
                                  {lb.volume.toLocaleString('vi-VN')}
                                </td>
                                <td className="py-1 px-3 text-right text-orange-500">
                                  {lb.volume > 0 ? ((lb.tonDong / lb.volume) * 100).toFixed(1) : 0}%
                                </td>
                                <td className="py-1 px-3 text-center">-</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {/* Tổng cộng footer */}
                <tfoot className="bg-slate-100/90 dark:bg-slate-750 font-bold border-t border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-left font-black uppercase text-[11px] text-slate-800 dark:text-slate-200">
                      Tổng Toàn Bộ ({selectedPos.length} bưu cục):
                    </td>
                    {activeKpiDrillDown === 'volume' && (
                      <>
                        <td className="py-2.5 px-3 text-center font-black text-[#15803D] dark:text-emerald-400">
                          {overallKPIs.volume.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">100%</td>
                        <td className="py-2.5 px-3 text-center font-semibold">
                          {overallKPIs.sldGan.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400">
                          {overallKPIs.ganRate.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-center">-</td>
                      </>
                    )}
                    {activeKpiDrillDown === 'gtc' && (
                      <>
                        <td className="py-2.5 px-3 text-center font-black text-[#002D72] dark:text-blue-400">
                          {overallKPIs.sldGTC.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {overallKPIs.volume.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                          {overallKPIs.gtcRate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">100%</td>
                        <td className="py-2.5 px-3 text-center">-</td>
                      </>
                    )}
                    {activeKpiDrillDown === 'rate' && (
                      <>
                        <td className="py-2.5 px-3 text-center font-black text-[#0284C7] dark:text-sky-400 text-sm">
                          {overallKPIs.gtcRate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {overallKPIs.sldGTC.toLocaleString('vi-VN')} / {overallKPIs.volume.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            overallKPIs.gtcRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Toàn vùng: {overallKPIs.gtcRate >= 80 ? 'Đạt' : 'Cần tối ưu'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {overallKPIs.gtcRate - 80 >= 0 ? (
                            <span className="text-emerald-600">+{(overallKPIs.gtcRate - 80).toFixed(2)}%</span>
                          ) : (
                            <span className="text-rose-600">{(overallKPIs.gtcRate - 80).toFixed(2)}%</span>
                          )}
                        </td>
                      </>
                    )}
                    {activeKpiDrillDown === 'tondong' && (
                      <>
                        <td className="py-2.5 px-3 text-center font-black text-[#F97316] dark:text-orange-400">
                          {overallKPIs.tonDong.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {overallKPIs.volume.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-orange-600 dark:text-orange-400">
                          {overallKPIs.volume > 0 ? ((overallKPIs.tonDong / overallKPIs.volume) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="py-2.5 px-3 text-center">-</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          HÀNG 3: BỐ CỤC SONG SONG THEO TỶ LỆ MỤC TIÊU 70% / 30%
          - CỘT TRÁI (70%): BIỂU ĐỒ COMBINATION CHART
          - CỘT PHẢI (30%): BẢNG KÊ CHI TIẾT GỌN GÀNG (COLLAPSIBLE GROUP)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-2.5 items-start">
        {/* =====================================================================
            CỘT TRÁI (7/10 cols = 70%): BIỂU ĐỒ COMBINATION CHART
           ===================================================================== */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                <span>Biểu Đồ Xu Hướng Ngày: Volume, Tồn Đọng &amp; %GTC</span>
                {selectedDay && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-300">
                    Đang chọn ngày: {selectedDay}
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Trục trái: Số lượng đơn &bull; Trục phải: %GTC &bull; Nhấp vào cột trên biểu đồ để xem chi tiết
              </p>
            </div>

            {/* Chú giải Interactive Legend để ẩn/hiện từng bưu cục */}
            {selectedPos.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {selectedPos.map(po => {
                  const isHidden = hiddenPosOnChart[po];
                  const color = PO_PALETTE[po]?.main;
                  return (
                    <button
                      key={po}
                      type="button"
                      onClick={() => handleToggleChartSeries(po)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        isHidden 
                          ? 'line-through opacity-40 bg-slate-100 border-slate-300 text-slate-400' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title={`Bấm để ${isHidden ? 'hiện' : 'ẩn'} đường %GTC bưu cục ${po}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>{po.replace('(LAN) ', '')}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vùng vẽ biểu đồ Recharts */}
          <div className="h-80 w-full">
            {overallKPIs.volume === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
                <Info className="w-6 h-6 mb-1 text-slate-300" />
                <span>Không có dữ liệu vận hành phù hợp với bộ lọc trong tháng {selectedMonth}.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={chartDailyData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  onClick={(e: any) => {
                    if (!e) return;
                    if (e.activePayload && e.activePayload.length > 0) {
                      const payload = e.activePayload[0].payload;
                      if (payload && payload.date) {
                        handleSelectDay(payload.date);
                        return;
                      }
                    }
                    if (typeof e.activeTooltipIndex === 'number' && chartDailyData[e.activeTooltipIndex]) {
                      const item = chartDailyData[e.activeTooltipIndex];
                      if (item && item.date) {
                        handleSelectDay(item.date);
                        return;
                      }
                    }
                    if (e.activeLabel) {
                      const labelStr = String(e.activeLabel);
                      const found = chartDailyData.find(d => d.dayNumber === labelStr || normalizeDateStr(d.date).startsWith(labelStr.padStart(2, '0')));
                      if (found && found.date) {
                        handleSelectDay(found.date);
                        return;
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis 
                    dataKey="dayNumber" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      if (!data.hasData) {
                        return (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg text-xs space-y-1">
                            <div className="font-bold text-slate-700 dark:text-slate-300">Ngày {data.date}</div>
                            <div className="text-slate-400 italic">Chưa có dữ liệu ghi nhận</div>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl text-xs space-y-1 min-w-[180px]">
                          <div className="font-extrabold text-slate-900 dark:text-white border-b pb-1 border-slate-100 dark:border-slate-700 flex justify-between">
                            <span>Ngày {data.date}</span>
                            <span className="text-blue-600 font-bold">{data.totalGtcRate}% GTC</span>
                          </div>
                          <div className="space-y-0.5 text-[11px]">
                            {/* 1. Volume */}
                            <div className="flex justify-between">
                              <span className="text-slate-500">Volume:</span>
                              <span className="font-bold text-[#15803D]">{data.totalVolume?.toLocaleString('vi-VN')}</span>
                            </div>
                            {/* 2. Tồn đọng */}
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tồn đọng:</span>
                              <span className="font-bold text-[#F97316]">{data.totalTonDong?.toLocaleString('vi-VN')}</span>
                            </div>
                            {/* 3. %GTC Tổng */}
                            <div className="flex justify-between">
                              <span className="text-slate-500">%GTC Tổng:</span>
                              <span className="font-bold text-[#002D72] dark:text-blue-400">{data.totalGtcRate}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>SLĐ GTC:</span>
                              <span className="font-mono">{data.totalSldGtc?.toLocaleString('vi-VN')}</span>
                            </div>
                          </div>

                          {/* Breakdown theo bưu cục nếu chọn nhiều hơn 1 bưu cục */}
                          {selectedPos.length > 1 && (
                            <div className="border-t pt-1 border-slate-100 dark:border-slate-700 space-y-0.5 text-[10px]">
                              {selectedPos.map(po => {
                                const vol = data[`vol_${po}`] || 0;
                                const rate = data[`rate_${po}`];
                                if (vol === 0) return null;
                                return (
                                  <div key={po} className="flex justify-between items-center">
                                    <span style={{ color: PO_PALETTE[po]?.main }} className="font-semibold truncate max-w-[100px]">
                                      {po.replace('(LAN) ', '')}:
                                    </span>
                                    <span className="font-mono">{vol} ({rate}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="text-[10px] text-blue-500 italic pt-0.5">Nhấp để xem bảng chi tiết</div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />

                  {/* Cột Tổng Volume (Màu xanh lá đậm #15803D) */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="totalVolume" 
                    name="Volume" 
                    fill="#15803D" 
                    radius={[3, 3, 0, 0]}
                    maxBarSize={26}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry && entry.date) {
                        handleSelectDay(entry.date);
                      }
                    }}
                  >
                    {chartDailyData.map((entry, index) => {
                      const isSelected = selectedDay && normalizeDateStr(entry.date) === normalizeDateStr(selectedDay);
                      return (
                        <Cell 
                          key={`vol-cell-${index}`} 
                          fill={isSelected ? '#002D72' : '#15803D'}
                          stroke={isSelected ? '#F59E0B' : undefined}
                          strokeWidth={isSelected ? 2 : 0}
                          cursor="pointer"
                          onClick={() => handleSelectDay(entry.date)}
                        />
                      );
                    })}
                  </Bar>

                  {/* Cột Tồn Đọng (Màu đỏ cam #F97316) */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="totalTonDong" 
                    name="Tồn đọng" 
                    fill="#F97316" 
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry && entry.date) {
                        handleSelectDay(entry.date);
                      }
                    }}
                  >
                    {chartDailyData.map((entry, index) => {
                      const isSelected = selectedDay && normalizeDateStr(entry.date) === normalizeDateStr(selectedDay);
                      return (
                        <Cell 
                          key={`ton-cell-${index}`} 
                          fill={isSelected ? '#C2410C' : '#F97316'}
                          stroke={isSelected ? '#F59E0B' : undefined}
                          strokeWidth={isSelected ? 2 : 0}
                          cursor="pointer"
                          onClick={() => handleSelectDay(entry.date)}
                        />
                      );
                    })}
                  </Bar>

                  {/* Đường %GTC Tổng Toàn Bộ Bưu Cục */}
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="totalGtcRate" 
                    name="%GTC Tổng" 
                    stroke="#002D72" 
                    strokeWidth={2.5} 
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />

                  {/* Khi chọn nhiều bưu cục: Vẽ thêm các đường %GTC phân biệt theo bưu cục */}
                  {selectedPos.length > 1 && selectedPos.map(po => {
                    if (hiddenPosOnChart[po]) return null;
                    const color = PO_PALETTE[po]?.main || '#3B82F6';
                    return (
                      <Line
                        key={po}
                        yAxisId="right"
                        type="monotone"
                        dataKey={`rate_${po}`}
                        name={`%GTC ${po.replace('(LAN) ', '')}`}
                        stroke={color}
                        strokeWidth={1.6}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    );
                  })}

                  {/* Highlight ngày đang chọn */}
                  {selectedDay && (
                    <ReferenceLine 
                      x={selectedDay.split('/')[0].replace(/^0/, '')} 
                      stroke="#002D72" 
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Dòng tóm tắt các điểm biến động (Extremes) */}
          {trendExtremes && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              {/* 1. Max Volume (Xanh lá) */}
              <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ArrowUp className="w-3 h-3 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="text-[9px] text-slate-500">Max Vol:</div>
                  <strong className="font-mono">{trendExtremes.maxVolDay.date}</strong> ({trendExtremes.maxVolDay.totalVolume.toLocaleString('vi-VN')})
                </div>
              </div>

              {/* 2. Max Tồn Đọng (Đỏ cam) */}
              <div className="p-1.5 rounded bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-[#F97316] shrink-0" />
                <div className="truncate">
                  <div className="text-[9px] text-slate-500">Max Tồn:</div>
                  <strong className="font-mono">{trendExtremes.maxTonDay.date}</strong> ({trendExtremes.maxTonDay.totalTonDong.toLocaleString('vi-VN')})
                </div>
              </div>

              {/* 3. Max %GTC (Xanh Navy) */}
              <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <Award className="w-3 h-3 text-[#002D72] shrink-0" />
                <div className="truncate">
                  <div className="text-[9px] text-slate-500">Max %GTC:</div>
                  <strong className="font-mono">{trendExtremes.maxRateDay.date}</strong> ({trendExtremes.maxRateDay.totalGtcRate}%)
                </div>
              </div>

              {/* 4. Min %GTC (Cảnh báo Amber) */}
              <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <ArrowDown className="w-3 h-3 text-amber-600 shrink-0" />
                <div className="truncate">
                  <div className="text-[9px] text-slate-500">Min %GTC:</div>
                  <strong className="font-mono">{trendExtremes.minRateDay.date}</strong> ({trendExtremes.minRateDay.totalGtcRate}%)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            CỘT PHẢI (3/10 cols = 30%): BẢNG KÊ CHI TIẾT NGÀY SIÊU GỌN GÀNG (COLLAPSIBLE)
           ===================================================================== */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
            <div>
              <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1">
                <span>Chi Tiết Ngày:</span>
                {selectedDay ? (
                  <span className="font-mono text-orange-600 font-black">{selectedDay}</span>
                ) : (
                  <span className="text-slate-400 font-normal italic">(Chưa chọn)</span>
                )}
              </h4>
            </div>

            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                title="Bỏ chọn ngày"
              >
                Đóng
              </button>
            )}
          </div>

          {/* Vùng Bảng Kê Chi Tiết có scroll độc lập */}
          <div className="h-80 overflow-y-auto pr-0.5">
            {!selectedDay || !inspectionTableData ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-400 text-xs space-y-1.5">
                <Clock className="w-7 h-7 text-slate-300 animate-pulse" />
                <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                  Chọn một ngày trên biểu đồ
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Nhấp trực tiếp vào cột ngày trên biểu đồ bên trái để xem bảng phân tích 2 cấp bưu cục &amp; loại hàng.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-1 px-1.5 text-center w-[36%]">Bưu Cục / Loại Hàng</th>
                      <th className="py-1 px-1 text-center w-[16%]">Vol</th>
                      <th className="py-1 px-1 text-center w-[16%]">GTC</th>
                      <th className="py-1 px-1 text-center w-[16%]">%GTC</th>
                      <th className="py-1 px-1 text-center w-[16%]">Tồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                    {inspectionTableData.poGroups.map(group => {
                      const isCollapsed = collapsedPos[group.buuCuc];

                      return (
                        <React.Fragment key={group.buuCuc}>
                          {/* HEADER NHÓM BƯU CỤC (CÓ NÚT THU GỌN / MỞ RỘNG) */}
                          <tr 
                            onClick={() => handleToggleCollapsePo(group.buuCuc)}
                            className="bg-slate-50/90 dark:bg-slate-750/70 font-bold hover:bg-slate-100/80 dark:hover:bg-slate-700/60 cursor-pointer transition-colors select-none"
                            title="Bấm để thu gọn hoặc mở rộng nhóm loại hàng"
                          >
                            <td className="py-1 px-1.5 text-slate-900 dark:text-white flex items-center gap-1 truncate">
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                              <span className="truncate">{group.buuCuc.replace('(LAN) ', '')}</span>
                            </td>
                            <td className="py-1 px-1 text-right font-mono font-bold text-orange-600">
                              {group.totalVolume.toLocaleString('vi-VN')}
                            </td>
                            <td className="py-1 px-1 text-right font-mono font-bold text-emerald-600">
                              {group.totalSldGtc.toLocaleString('vi-VN')}
                            </td>
                            <td className="py-1 px-1 text-right font-mono font-black text-blue-600">
                              {group.totalGtcRate.toFixed(1)}%
                            </td>
                            <td className="py-1 px-1 text-right font-mono font-bold text-rose-600">
                              {group.totalTonDong.toLocaleString('vi-VN')}
                            </td>
                          </tr>

                          {/* CÁC DÒNG LOẠI HÀNG BÊN TRONG (ẨN NẾU ĐANG THU GỌN) */}
                          {!isCollapsed && group.items.map(item => (
                            <tr key={`${group.buuCuc}-${item.loaiHang}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/30 text-[9.5px]">
                              <td className="py-0.5 px-2 text-slate-600 dark:text-slate-300 pl-4 truncate">
                                &bull; {item.loaiHang.replace('Hàng Mới ', '')}
                              </td>
                              <td className="py-0.5 px-1 text-right font-mono text-slate-700 dark:text-slate-300">
                                {item.volume.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-0.5 px-1 text-right font-mono text-emerald-600">
                                {item.sldGTC.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-0.5 px-1 text-right font-mono font-semibold">
                                <span className={`px-0.5 py-0.2 rounded ${
                                  item.gtcRate >= 75 ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40' :
                                  item.gtcRate >= 60 ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40' :
                                  'text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                                }`}>
                                  {item.gtcRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-0.5 px-1 text-right font-mono text-rose-600">
                                {item.tonDong.toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* DÒNG TỔNG CỘNG TẤT CẢ CÁC BƯU CỤC ĐANG CHỌN */}
                  <tfoot className="bg-slate-200/95 dark:bg-slate-700 text-slate-900 dark:text-white font-black sticky bottom-0 z-10 border-t-2 border-slate-300 dark:border-slate-600 shadow-2xs">
                    <tr>
                      <td className="py-1 px-1.5 uppercase text-[9.5px] text-orange-700 dark:text-orange-300 truncate text-left">
                        Tổng {inspectionTableData.poGroups.length} Bưu Cục:
                      </td>
                      <td className="py-1 px-1 text-center font-mono text-[10px] font-black text-orange-700 dark:text-orange-300">
                        {inspectionTableData.grandVolume.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-1 px-1 text-center font-mono text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                        {inspectionTableData.grandSldGtc.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-1 px-1 text-center font-mono text-[10px] font-black text-blue-700 dark:text-blue-300">
                        {inspectionTableData.grandGtcRate.toFixed(1)}%
                      </td>
                      <td className="py-1 px-1 text-center font-mono text-[10px] font-black text-rose-700 dark:text-rose-300">
                        {inspectionTableData.grandTonDong.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
