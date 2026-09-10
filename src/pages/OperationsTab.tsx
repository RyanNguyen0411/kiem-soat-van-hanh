import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { ChevronDown, ChevronRight, Calendar, CheckSquare, Square, BarChart2 } from 'lucide-react';
import { getCurrentDate, getDateRangeContext, formatDateDDMMYYYY } from '../utils/dateEngine';
import { safeDivide } from '../utils/calculations';
import { parse, isValid, startOfWeek, endOfWeek, isWithinInterval, compareDesc, format, subDays, startOfMonth } from 'date-fns';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const translateStatus = (status: string): string => {
  switch (status) {
    case 'Critical': return 'Nguy động';
    case 'Warning': return 'Cảnh báo';
    case 'Good': return 'Tốt';
    case 'Excellent': return 'Xuất sắc';
    default: return 'Ổn định';
  }
};

const parseDateString = (dateStr: string): Date => {
  const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : new Date(0);
};

export default function OperationsTab() {
  const { operationsData, filters } = useDashboard();
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  
  // Bộ lọc cho Bảng Tổng hợp theo Bưu cục
  const [selectedN1Dates, setSelectedN1Dates] = useState<Record<string, boolean>>({});
  const [showN1DatePicker, setShowN1DatePicker] = useState<boolean>(false);

  // Bộ lọc cho Biểu đồ 1 (Theo bưu cục)
  const [chart1ModeFilter, setChart1ModeFilter] = useState<'day' | 'week' | 'month'>('week');
  const [chart1BranchFilter, setChart1BranchFilter] = useState<string>('all');
  const [chart1CategoryFilter, setChart1CategoryFilter] = useState<string>('all');

  // Bộ lọc cho Biểu đồ 2 (Theo ngày)
  const [chart2TimeFilter, setChart2TimeFilter] = useState<'week' | 'month' | 'all'>('week');
  const [chart2BranchFilter, setChart2BranchFilter] = useState<string>('all');
  const [chart2CategoryFilter, setChart2CategoryFilter] = useState<string>('all');
  const [selectedChart2Dates, setSelectedChart2Dates] = useState<Record<string, boolean>>({});
  const [showChart2DatePicker, setShowChart2DatePicker] = useState<boolean>(false);

  // Bộ lọc cho Ma trận bưu cục & ngày
  const [chart3BranchFilter, setChart3BranchFilter] = useState<string>('all');
  const [chart3CategoryFilter, setChart3CategoryFilter] = useState<string>('all');
  const [chart3ModeFilter, setChart3ModeFilter] = useState<'day' | 'week' | 'month'>('week');
  const [selectedChart3Months, setSelectedChart3Months] = useState<Record<string, boolean>>({});
  const [showChart3MonthPicker, setShowChart3MonthPicker] = useState<boolean>(false);

  // Bộ lọc cho Bảng Chi tiết bưu cục
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>({});
  const [showDatePickerDropdown, setShowDatePickerDropdown] = useState<boolean>(false);

  const toggleBranch = (branch: string) => {
    setExpandedBranches(prev => ({ ...prev, [branch]: !prev[branch] }));
  };

  const dateContext = getDateRangeContext(getCurrentDate());
  const n1Str = formatDateDDMMYYYY(dateContext.n1);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    operationsData.forEach(r => { if (r.date) set.add(r.date); });
    return Array.from(set).sort((a, b) => {
      const dateA = parseDateString(a);
      const dateB = parseDateString(b);
      return compareDesc(dateA, dateB);
    });
  }, [operationsData]);

  // Lấy danh sách các tháng có sẵn trong data (giảm dần)
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    operationsData.forEach(r => {
      if (r.date) {
        const p = parseDateString(r.date);
        if (isValid(p)) {
          const mKey = format(p, 'MM/yyyy');
          const mLabel = `Tháng ${format(p, 'MM/yyyy')}`;
          map.set(mKey, mLabel);
        }
      }
    });
    return Array.from(map.entries()).sort((a, b) => {
      const dateA = parse(a[0], 'MM/yyyy', new Date());
      const dateB = parse(b[0], 'MM/yyyy', new Date());
      return compareDesc(dateA, dateB);
    }).map(([key, label]) => ({ key, label }));
  }, [operationsData]);

  const toggleMonthSelection = (monthKey: string) => {
    setSelectedChart3Months(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // 1. DỮ LIỆU BẢNG TỔNG HỢP THEO BƯU CỤC
  const filteredN1DataRaw = useMemo(() => {
    const hasSelected = Object.values(selectedN1Dates).some(v => v);
    return operationsData.filter(row => {
      if (hasSelected) {
        return !!selectedN1Dates[row.date];
      }
      return row.date === n1Str;
    });
  }, [operationsData, selectedN1Dates, n1Str]);

  const n1ByBranchAndCategory = useMemo(() => {
    const map: Record<string, Record<string, typeof operationsData[0]>> = {};
    const categories = ['Hàng mới ca 1', 'Hàng mới ca 2', 'Hàng tồn'];

    filteredN1DataRaw.forEach(row => {
      const b = row.branch || 'Khác';
      if (b.toLowerCase() === 'khác') return;
      if (!map[b]) {
        map[b] = {};
        categories.forEach(c => {
          map[b][c] = {
            date: n1Str,
            branch: b,
            category: c,
            volume: 0,
            assignedRate: 0,
            gtcRate: 0,
            assignedVolume: 0,
            gtcVolume: 0,
            backlog: 0,
            status: 'Good'
          };
        });
      }
      const matchedCat = categories.find(c => c.toLowerCase() === row.category.toLowerCase()) || row.category;
      if (!map[b][matchedCat]) {
        map[b][matchedCat] = { ...row };
      } else {
        const item = map[b][matchedCat];
        item.volume += row.volume;
        item.assignedVolume += row.assignedVolume;
        item.gtcVolume += row.gtcVolume;
      }
    });

    Object.keys(map).forEach(b => {
      Object.keys(map[b]).forEach(c => {
        const item = map[b][c];
        item.assignedRate = safeDivide(item.assignedVolume, item.volume);
        item.gtcRate = safeDivide(item.gtcVolume, item.volume);
        item.backlog = Math.max(0, item.volume - item.gtcVolume);
      });
    });

    return map;
  }, [filteredN1DataRaw, n1Str]);

  const branchSummaryMap = useMemo(() => {
    const summary: Record<string, { totalVol: number; totalGtcVol: number; branchGtcRate: number }> = {};
    Object.entries(n1ByBranchAndCategory).forEach(([branch, categories]) => {
      let totalVol = 0;
      let totalGtcVol = 0;
      Object.values(categories).forEach(item => {
        totalVol += item.volume;
        totalGtcVol += item.gtcVolume;
      });
      const branchGtcRate = safeDivide(totalGtcVol, totalVol);
      summary[branch] = { totalVol, totalGtcVol, branchGtcRate };
    });
    return summary;
  }, [n1ByBranchAndCategory]);

  const n1GlobalSummary = useMemo(() => {
    const volume = filteredN1DataRaw.reduce((sum, r) => sum + r.volume, 0);
    const assignedVol = filteredN1DataRaw.reduce((sum, r) => sum + r.assignedVolume, 0);
    const gtcVol = filteredN1DataRaw.reduce((sum, r) => sum + r.gtcVolume, 0);
    return {
      volume,
      assignedRate: safeDivide(assignedVol, volume),
      assignedVolume: assignedVol,
      gtcRate: safeDivide(gtcVol, volume),
      gtcVolume: gtcVol,
      backlog: volume - gtcVol,
    };
  }, [filteredN1DataRaw]);

  // 2. DỮ LIỆU CHO BIỂU ĐỒ 1 (Theo bưu cục)
  const chart1Data = useMemo(() => {
    const currentDate = dateContext.n1;
    const weekAgo = subDays(currentDate, 7);
    const monthStart = startOfMonth(currentDate);

    const filtered = operationsData.filter(row => {
      if (row.branch.toLowerCase() === 'khác') return false;
      if (chart1BranchFilter !== 'all' && row.branch !== chart1BranchFilter) return false;
      if (chart1CategoryFilter !== 'all' && row.category.toLowerCase() !== chart1CategoryFilter.toLowerCase()) return false;
      
      const rowDate = parseDateString(row.date);
      if (!isValid(rowDate)) return false;

      if (chart1ModeFilter === 'day') {
        return row.date === n1Str;
      } else if (chart1ModeFilter === 'week') {
        return rowDate >= weekAgo && rowDate <= currentDate;
      } else if (chart1ModeFilter === 'month') {
        return rowDate >= monthStart && rowDate <= currentDate;
      }
      return true;
    });

    const map: Record<string, { branch: string; Volume: number; 'SLĐ Gán': number; 'SLĐ GTC': number; totalVol: number; totalGtc: number }> = {};

    filtered.forEach(row => {
      const b = row.branch || 'Khác';
      if (!map[b]) {
        map[b] = { branch: b, Volume: 0, 'SLĐ Gán': 0, 'SLĐ GTC': 0, totalVol: 0, totalGtc: 0 };
      }
      map[b].Volume += row.volume;
      map[b]['SLĐ Gán'] += row.assignedVolume;
      map[b]['SLĐ GTC'] += row.gtcVolume;
      map[b].totalVol += row.volume;
      map[b].totalGtc += row.gtcVolume;
    });

    return Object.values(map).map(item => ({
      ...item,
      '%GTC': Number((safeDivide(item.totalGtc, item.totalVol) * 100).toFixed(1)),
    }));
  }, [operationsData, chart1ModeFilter, chart1BranchFilter, chart1CategoryFilter, dateContext.n1, n1Str]);

  const allBranchesList = useMemo(() => {
    const set = new Set<string>();
    operationsData.forEach(r => { if (r.branch && r.branch.toLowerCase() !== 'khác') set.add(r.branch); });
    return Array.from(set);
  }, [operationsData]);

  // 3. DỮ LIỆU CHO BIỂU ĐỒ 2 (Theo ngày)
  const chart2Data = useMemo(() => {
    const currentDate = dateContext.n1;
    const weekAgo = subDays(currentDate, 7);
    const monthStart = startOfMonth(currentDate);
    const hasSelected = Object.values(selectedChart2Dates).some(v => v);

    const filtered = operationsData.filter(row => {
      if (row.branch.toLowerCase() === 'khác') return false;
      if (chart2BranchFilter !== 'all' && row.branch !== chart2BranchFilter) return false;
      if (chart2CategoryFilter !== 'all' && row.category.toLowerCase() !== chart2CategoryFilter.toLowerCase()) return false;

      const rowDate = parseDateString(row.date);

      if (hasSelected) {
        return !!selectedChart2Dates[row.date];
      } else {
        if (!isValid(rowDate)) return false;
        if (chart2TimeFilter === 'week') {
          return rowDate >= weekAgo && rowDate <= currentDate;
        } else if (chart2TimeFilter === 'month') {
          return rowDate >= monthStart && rowDate <= currentDate;
        }
      }
      return true;
    });

    const map: Record<string, { rawDate: string; displayDate: string; Volume: number; 'SLĐ Gán': number; 'SLĐ GTC': number; totalVol: number; totalGtc: number }> = {};

    filtered.forEach(row => {
      const dStr = row.date;
      if (!dStr) return;
      
      const parsed = parseDateString(dStr);
      const displayDate = isValid(parsed) ? format(parsed, 'dd/MM') : dStr;

      if (!map[dStr]) {
        map[dStr] = { rawDate: dStr, displayDate, Volume: 0, 'SLĐ Gán': 0, 'SLĐ GTC': 0, totalVol: 0, totalGtc: 0 };
      }
      map[dStr].Volume += row.volume;
      map[dStr]['SLĐ Gán'] += row.assignedVolume;
      map[dStr]['SLĐ GTC'] += row.gtcVolume;
      map[dStr].totalVol += row.volume;
      map[dStr].totalGtc += row.gtcVolume;
    });

    return Object.values(map)
      .sort((a, b) => parseDateString(a.rawDate).getTime() - parseDateString(b.rawDate).getTime())
      .map(item => ({
        ...item,
        '%GTC': Number((safeDivide(item.totalGtc, item.totalVol) * 100).toFixed(1)),
      }));
  }, [operationsData, chart2TimeFilter, chart2BranchFilter, chart2CategoryFilter, selectedChart2Dates, dateContext.n1]);

  // 5. DỮ LIỆU CHO BẢNG MA TRẬN BƯU CỤC & NGÀY
  const matrixDates = useMemo(() => {
    const currentDate = dateContext.n1;
    const weekAgo = subDays(currentDate, 7);
    const monthStart = startOfMonth(currentDate);
    const hasSelectedMonths = Object.values(selectedChart3Months).some(v => v);

    return availableDates.filter(dStr => {
      const rowDate = parseDateString(dStr);
      if (!isValid(rowDate)) return false;

      if (hasSelectedMonths) {
        const mKey = format(rowDate, 'MM/yyyy');
        return !!selectedChart3Months[mKey];
      } else {
        if (chart3ModeFilter === 'day') {
          return dStr === n1Str;
        } else if (chart3ModeFilter === 'week') {
          return rowDate >= weekAgo && rowDate <= currentDate;
        } else if (chart3ModeFilter === 'month') {
          return rowDate >= monthStart && rowDate <= currentDate;
        }
      }
      return true;
    });
  }, [availableDates, chart3ModeFilter, selectedChart3Months, dateContext.n1, n1Str]);

  const matrixBranches = useMemo(() => {
    const set = new Set<string>();
    operationsData.forEach(r => { if (r.branch && r.branch.toLowerCase() !== 'khác') set.add(r.branch); });
    let list = Array.from(set);
    if (chart3BranchFilter !== 'all') {
      list = list.filter(b => b === chart3BranchFilter);
    }
    return list; 
  }, [operationsData, chart3BranchFilter]);

  const matrixDataMap = useMemo(() => {
    const map: Record<string, Record<string, { volume: number; ca1: number; ca2: number; backlog: number; gtcRate: number }>> = {};
    
    operationsData.forEach(row => {
      const b = row.branch || 'Khác';
      if (b.toLowerCase() === 'khác') return;
      if (chart3CategoryFilter !== 'all' && row.category.toLowerCase() !== chart3CategoryFilter.toLowerCase()) return;

      const d = row.date || '';
      if (!map[b]) map[b] = {};
      if (!map[b][d]) {
        map[b][d] = { volume: 0, ca1: 0, ca2: 0, backlog: 0, gtcRate: 0 };
      }
      
      map[b][d].volume += row.volume;
      
      const cat = row.category.toLowerCase();
      if (cat.includes('ca 1')) map[b][d].ca1 += row.volume;
      else if (cat.includes('ca 2')) map[b][d].ca2 += row.volume;
      else if (cat.includes('tồn')) map[b][d].backlog += row.volume;
    });

    operationsData.forEach(row => {
      const b = row.branch || 'Khác';
      if (b.toLowerCase() === 'khác') return;
      if (chart3CategoryFilter !== 'all' && row.category.toLowerCase() !== chart3CategoryFilter.toLowerCase()) return;

      const d = row.date || '';
      if (map[b] && map[b][d]) {
        const rowsForCell = operationsData.filter(r => r.branch === b && r.date === d && (chart3CategoryFilter === 'all' || r.category.toLowerCase() === chart3CategoryFilter.toLowerCase()));
        const totalV = rowsForCell.reduce((s, r) => s + r.volume, 0);
        const totalG = rowsForCell.reduce((s, r) => s + r.gtcVolume, 0);
        map[b][d].gtcRate = safeDivide(totalG, totalV) * 100;
        
        const totalB = rowsForCell.reduce((s, r) => s + r.backlog, 0);
        map[b][d].backlog = totalB;
      }
    });

    return map;
  }, [operationsData, chart3CategoryFilter]);

  // BẢNG ĐÁNH GIÁ & KHUYẾN NGHỊ THEO TIÊU CHÍ MỚI
  const matrixEvaluationList = useMemo(() => {
    const evaluation = matrixBranches.map(branch => {
      let totalVolBranch = 0;
      let totalCa1Branch = 0;
      let totalCa2Branch = 0;
      let totalBacklogBranch = 0;
      let totalGtcVolBranch = 0;

      matrixDates.forEach(dStr => {
        const cell = matrixDataMap[branch]?.[dStr];
        if (cell && cell.volume > 0) {
          totalVolBranch += cell.volume;
          totalCa1Branch += cell.ca1;
          totalCa2Branch += cell.ca2;
          totalBacklogBranch += cell.backlog;
          totalGtcVolBranch += (cell.gtcRate / 100) * cell.volume;
        }
      });

      const avgGtcRate = safeDivide(totalGtcVolBranch, totalVolBranch) * 100;
      const ca1Ratio = safeDivide(totalCa1Branch, totalVolBranch) * 100;
      const ca2Ratio = safeDivide(totalCa2Branch, totalVolBranch) * 100;
      const backlogRatio = safeDivide(totalBacklogBranch, totalVolBranch) * 100;

      // Đánh giá %GTC
      let gtcStatus = '';
      let gtcColor = 'text-neutral-700 bg-neutral-200 border-neutral-300';
      if (avgGtcRate <= 40) {
        gtcStatus = 'Nguy kịch';
        gtcColor = 'text-red-700 bg-red-100 border-red-300';
      } else if (avgGtcRate > 40 && avgGtcRate <= 50) {
        gtcStatus = 'Nguy hiểm';
        gtcColor = 'text-red-700 bg-red-100 border-red-300';
      } else if (avgGtcRate > 50 && avgGtcRate < 60) {
        gtcStatus = 'Cảnh báo';
        gtcColor = 'text-amber-700 bg-amber-100 border-amber-300';
      } else if (avgGtcRate >= 60 && avgGtcRate <= 65) {
        gtcStatus = 'An toàn';
        gtcColor = 'text-blue-700 bg-blue-100 border-blue-300';
      } else if (avgGtcRate > 65 && avgGtcRate <= 70) {
        gtcStatus = 'Tốt';
        gtcColor = 'text-emerald-700 bg-emerald-100 border-emerald-300';
      } else if (avgGtcRate > 70 && avgGtcRate < 80) {
        gtcStatus = 'Rất tốt';
        gtcColor = 'text-emerald-800 bg-emerald-200 border-emerald-400';
      } else {
        gtcStatus = 'Tuyên dương';
        gtcColor = 'text-amber-800 bg-amber-200 border-amber-400';
      }

      // Đánh giá Hàng tồn
      let backlogStatus = '';
      let backlogColor = 'text-neutral-700 bg-neutral-200 border-neutral-300';
      if (backlogRatio >= 10 && backlogRatio <= 20) {
        backlogStatus = 'Xem xét xử lý';
        backlogColor = 'text-amber-700 bg-amber-100 border-amber-300';
      } else if (backlogRatio > 20 && backlogRatio <= 40) {
        backlogStatus = 'Cảnh báo tồn cao';
        backlogColor = 'text-orange-700 bg-orange-100 border-orange-300';
      } else if (backlogRatio > 40 && backlogRatio <= 50) {
        backlogStatus = 'Nguy cơ bể kho';
        backlogColor = 'text-red-700 bg-red-100 border-red-300';
      } else if (backlogRatio > 50 && backlogRatio <= 60) {
        backlogStatus = 'Khẩn cấp';
        backlogColor = 'text-red-800 bg-red-200 border-red-400';
      } else if (backlogRatio > 60) {
        backlogStatus = 'Bể vận hành';
        backlogColor = 'text-white bg-red-600 border-red-700';
      } else {
        backlogStatus = 'Bình thường';
        backlogColor = 'text-emerald-700 bg-emerald-100 border-emerald-300';
      }

      return {
        branch,
        totalVol: totalVolBranch,
        ca1: totalCa1Branch,
        ca1Ratio,
        ca2: totalCa2Branch,
        ca2Ratio,
        backlog: totalBacklogBranch,
        backlogRatio,
        avgGtcRate,
        gtcStatus,
        gtcColor,
        backlogStatus,
        backlogColor,
      };
    });

    return evaluation;
  }, [matrixBranches, matrixDates, matrixDataMap]);

  // 4. DỮ LIỆU CHI TIẾT BƯU CỤC
  const toggleDateSelection = (dateStr: string) => {
    setSelectedDates(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const toggleN1DateSelection = (dateStr: string) => {
    setSelectedN1Dates(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const toggleChart2DateSelection = (dateStr: string) => {
    setSelectedChart2Dates(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  
  const isDateInWeekOfN1 = (dateStr: string) => {
    const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (!isValid(parsedDate)) return false;
    const weekStart = startOfWeek(dateContext.n1, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(dateContext.n1, { weekStartsOn: 1 });
    return isWithinInterval(parsedDate, { start: weekStart, end: weekEnd });
  };

  const filteredBranchData = useMemo(() => {
    const hasSelectedDates = Object.values(selectedDates).some(v => v);

    return operationsData.filter(row => {
      if (row.branch.toLowerCase() === 'khác') return false;
      if (filters.branch !== 'all' && row.branch !== filters.branch) return false;
      if (filters.category !== 'all' && row.category !== filters.category) return false;

      if (hasSelectedDates) {
        if (!selectedDates[row.date]) return false;
      } else {
        if (timeFilter === 'day') {
          if (row.date !== n1Str) return false;
        } else if (timeFilter === 'week') {
          if (!isDateInWeekOfN1(row.date)) return false;
        } else if (timeFilter === 'month') {
          const p = parse(row.date, 'dd/MM/yyyy', new Date());
          if (isValid(p)) {
            if (p.getMonth() !== dateContext.n1.getMonth() || p.getFullYear() !== dateContext.n1.getFullYear()) return false;
          }
        }
      }
      return true;
    });
  }, [operationsData, filters, timeFilter, selectedDates, n1Str, dateContext.n1]);

  const computeSummary = (dataList: typeof operationsData) => {
    const totalVolume = dataList.reduce((sum, r) => sum + r.volume, 0);
    const totalAssignedVol = dataList.reduce((sum, r) => sum + r.assignedVolume, 0);
    const totalGTCVol = dataList.reduce((sum, r) => sum + r.gtcVolume, 0);
    const totalBacklog = totalVolume - totalGTCVol;

    return {
      volume: totalVolume,
      assignedRate: safeDivide(totalAssignedVol, totalVolume),
      assignedVolume: totalAssignedVol,
      gtcRate: safeDivide(totalGTCVol, totalVolume),
      gtcVolume: totalGTCVol,
      backlog: totalBacklog,
    };
  };

  const branchGrouped = useMemo(() => {
    const map: Record<string, typeof operationsData> = {};
    filteredBranchData.forEach(row => {
      const branchName = row.branch || 'Chưa phân bổ';
      if (!map[branchName]) map[branchName] = [];
      map[branchName].push(row);
    });

    return Object.entries(map).map(([branch, rows]) => {
      const summary = computeSummary(rows);
      const sortedRows = rows.sort((a, b) => {
        return compareDesc(parseDateString(a.date), parseDateString(b.date));
      });
      return { branch, rows: sortedRows, summary };
    });
  }, [filteredBranchData]);

  const activeN1Count = Object.values(selectedN1Dates).filter(Boolean).length;
  const currentN1Label = activeN1Count > 0 ? `Đã chọn (${activeN1Count} ngày)` : `Ngày N-1 (${n1Str})`;

  const activeChart2Count = Object.values(selectedChart2Dates).filter(Boolean).length;
  const currentChart2Label = activeChart2Count > 0 ? `Đã chọn (${activeChart2Count} ngày)` : 'Chọn ngày tùy ý';

  const activeChart3MonthCount = Object.values(selectedChart3Months).filter(Boolean).length;
  const currentChart3MonthLabel = activeChart3MonthCount > 0 ? `Đã chọn (${activeChart3MonthCount} tháng)` : 'Chọn tháng tùy ý';

  const branchKeys = Object.keys(n1ByBranchAndCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">TỔNG HỢP VẬN HÀNH</h1>
        <div className="text-sm text-neutral-500">
          Ngày hiện tại: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{n1Str}</span>
        </div>
      </div>

      {/* MA TRẬN BƯU CỤC & NGÀY (Nền #DDDDDD, tiêu đề nền #FFFF33 chữ to, tên bưu cục màu đỏ #FF0000, có khoảng cách rõ ràng với bảng dưới) */}
      <div className="bg-[#DDDDDD] text-neutral-900 rounded-xl shadow-md border border-neutral-300 p-4 space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-300">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-700" />
              {/* Tiêu đề tô màu nền #FFFF33, chữ to đậm */}
              <h2 className="font-extrabold text-base uppercase text-neutral-900 bg-[#FFFF33] px-2 py-1 rounded shadow-sm">
                Ma trận hiệu suất vận hành theo bưu cục & ngày
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Bộ lọc Loại hàng */}
              <select 
                value={chart3CategoryFilter} 
                onChange={(e) => setChart3CategoryFilter(e.target.value)}
                className="bg-white text-neutral-900 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm"
              >
                <option value="all">Tất cả loại hàng</option>
                <option value="Hàng mới ca 1">Hàng mới ca 1</option>
                <option value="Hàng mới ca 2">Hàng mới ca 2</option>
                <option value="Hàng tồn">Hàng tồn</option>
              </select>

              {/* Bộ lọc Bưu cục */}
              <select 
                value={chart3BranchFilter} 
                onChange={(e) => setChart3BranchFilter(e.target.value)}
                className="bg-white text-neutral-900 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm"
              >
                <option value="all">Tất cả bưu cục</option>
                {allBranchesList.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Bộ lọc chọn Tháng */}
              <div className="relative">
                <button 
                  onClick={() => setShowChart3MonthPicker(!showChart3MonthPicker)}
                  className="flex items-center gap-1.5 bg-white text-neutral-900 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  <span>{currentChart3MonthLabel}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>

                {showChart3MonthPicker && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-neutral-300 rounded-lg shadow-xl z-50 p-3 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-neutral-200 text-xs">
                      <span className="font-semibold text-neutral-800">Chọn tháng (Giảm dần)</span>
                      <button 
                        onClick={() => setSelectedChart3Months({})} 
                        className="text-blue-700 hover:underline text-[11px]"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {availableMonths.map(({ key, label }) => {
                        const isChecked = !!selectedChart3Months[key];
                        return (
                          <div 
                            key={key} 
                            onClick={() => toggleMonthSelection(key)}
                            className="flex items-center gap-2 text-xs p-1 rounded hover:bg-neutral-100 cursor-pointer text-neutral-800"
                          >
                            {isChecked ? <CheckSquare className="w-4 h-4 text-blue-700" /> : <Square className="w-4 h-4 text-neutral-400" />}
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bộ lọc dạng bung sổ: Ngày, Tuần, Tháng */}
              <div className="inline-flex rounded-lg border border-neutral-300 p-0.5 bg-white text-xs shadow-sm">
                <button 
                  onClick={() => { setChart3ModeFilter('day'); setSelectedChart3Months({}); }} 
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart3ModeFilter === 'day' && Object.values(selectedChart3Months).every(v => !v) ? 'bg-blue-700 text-white shadow-sm' : 'text-neutral-700'}`}
                >
                  Ngày (N-1)
                </button>
                <button 
                  onClick={() => { setChart3ModeFilter('week'); setSelectedChart3Months({}); }} 
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart3ModeFilter === 'week' && Object.values(selectedChart3Months).every(v => !v) ? 'bg-blue-700 text-white shadow-sm' : 'text-neutral-700'}`}
                >
                  Tuần
                </button>
                <button 
                  onClick={() => { setChart3ModeFilter('month'); setSelectedChart3Months({}); }} 
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart3ModeFilter === 'month' && Object.values(selectedChart3Months).every(v => !v) ? 'bg-blue-700 text-white shadow-sm' : 'text-neutral-700'}`}
                >
                  Tháng
                </button>
              </div>
            </div>
          </div>

          {/* Khung cuộn ngang (Scroll X) không dùng thanh trượt dọc */}
          <div className="overflow-x-auto rounded-lg border border-neutral-300 bg-white">
            <table className="w-full border-collapse text-xs text-left">
              <thead className="bg-neutral-200 sticky top-0 z-20 text-neutral-800 uppercase font-bold text-sm">
                <tr>
                  <th className="p-3 sticky left-0 z-30 bg-neutral-200 border-r border-neutral-300 w-48 shadow-md text-center text-sm">Bưu Cục</th>
                  {matrixDates.map(dStr => {
                    const parsed = parseDateString(dStr);
                    const headerTitle = isValid(parsed) ? format(parsed, 'dd.MM.yy') + ' ' + format(parsed, 'EEE') : dStr;
                    return (
                      <th key={dStr} className="p-2.5 text-center border-r border-neutral-300 min-w-[130px] bg-neutral-200 font-bold">
                        {headerTitle}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-medium">
                {matrixBranches.length === 0 ? (
                  <tr>
                    <td colSpan={matrixDates.length + 1} className="p-6 text-center text-neutral-500">Không có dữ liệu bưu cục.</td>
                  </tr>
                ) : (
                  matrixBranches.map((branch, bIdx) => (
                    <tr key={branch} className="hover:bg-neutral-50">
                      {/* Tên các Bưu cục chữ to, màu đỏ #FF0000 */}
                      <td className="p-3 sticky left-0 z-10 bg-neutral-100 font-extrabold text-sm border-r border-neutral-300 shadow-md text-[#FF0000] text-center">
                        {bIdx + 1}. {branch}
                      </td>
                      {matrixDates.map(dStr => {
                        const cell = matrixDataMap[branch]?.[dStr];
                        const vol = cell?.volume || 0;
                        const ca1 = cell?.ca1 || 0;
                        const ca2 = cell?.ca2 || 0;
                        const backlog = cell?.backlog || 0;
                        const gtc = cell?.gtcRate || 0;
                        const isLow = gtc < 60;

                        return (
                          <td key={dStr} className="p-2.5 text-center border-r border-neutral-200 align-middle">
                            {vol > 0 ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${isLow ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'}`}>
                                  {gtc.toFixed(1)}%
                                </span>
                                <div className="text-[11px] text-neutral-800 flex flex-wrap justify-center gap-x-2 gap-y-0.5 bg-neutral-100 px-1.5 py-1 rounded w-full font-semibold">
                                  <span><strong className="text-neutral-500">Vol:</strong> {vol.toFixed(1)}</span>
                                  <span><strong className="text-amber-600">Ca 1:</strong> {ca1.toFixed(1)}</span>
                                  <span><strong className="text-cyan-600">Ca 2:</strong> {ca2.toFixed(1)}</span>
                                  <span><strong className="text-rose-600">Tồn:</strong> {backlog.toFixed(1)}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BẢNG ĐÁNH GIÁ & KHUYẾN NGHỊ (Có khoảng cách phân biệt rõ ràng và tô màu nền tiêu đề #FFFF33) */}
        <div className="pt-6 border-t border-neutral-300">
          <div className="mb-3">
            <h3 className="font-extrabold text-sm uppercase text-neutral-900 bg-[#FFFF33] px-2 py-1 rounded shadow-sm inline-block">
              Bảng đánh giá & Khuyến nghị chi tiết theo %GTC & Tỷ trọng tồn đọng
            </h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-neutral-300 bg-white">
            <table className="w-full text-center border-collapse text-xs">
              <thead className="bg-neutral-200 text-neutral-900 uppercase font-bold text-sm">
                <tr>
                  <th className="p-2.5 border-r border-neutral-300">Bưu cục</th>
                  <th className="p-2.5 border-r border-neutral-300">Tổng Volume</th>
                  <th className="p-2.5 border-r border-neutral-300">Tỷ trọng Ca 1</th>
                  <th className="p-2.5 border-r border-neutral-300">Tỷ trọng Ca 2</th>
                  <th className="p-2.5 border-r border-neutral-300">Tỷ trọng Tồn</th>
                  <th className="p-2.5 border-r border-neutral-300">%GTC Trung bình</th>
                  <th className="p-2.5 border-r border-neutral-300">Trạng thái %GTC</th>
                  <th className="p-2.5">Trạng thái Hàng Tồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-medium">
                {matrixEvaluationList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="p-2.5 font-extrabold text-sm text-[#FF0000] border-r border-neutral-200">{item.branch}</td>
                    <td className="p-2.5 font-bold border-r border-neutral-200">{item.totalVol.toFixed(1)}</td>
                    <td className="p-2.5 border-r border-neutral-200">{item.ca1.toFixed(1)} ({item.ca1Ratio.toFixed(1)}%)</td>
                    <td className="p-2.5 border-r border-neutral-200">{item.ca2.toFixed(1)} ({item.ca2Ratio.toFixed(1)}%)</td>
                    <td className="p-2.5 text-red-600 font-bold border-r border-neutral-200">{item.backlog.toFixed(1)} ({item.backlogRatio.toFixed(1)}%)</td>
                    <td className="p-2.5 font-bold text-emerald-600 border-r border-neutral-200">{item.avgGtcRate.toFixed(1)}%</td>
                    <td className="p-2.5 border-r border-neutral-200">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${item.gtcColor}`}>
                        {item.gtcStatus}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${item.backlogColor}`}>
                        {item.backlogStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ 1: HIỆU SUẤT THEO BƯU CỤC */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm uppercase">Biểu đồ hiệu suất vận hành theo bưu cục</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={chart1CategoryFilter} 
              onChange={(e) => setChart1CategoryFilter(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="Hàng mới ca 1">Hàng mới ca 1</option>
              <option value="Hàng mới ca 2">Hàng mới ca 2</option>
              <option value="Hàng tồn">Hàng tồn</option>
            </select>

            <select 
              value={chart1BranchFilter} 
              onChange={(e) => setChart1BranchFilter(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
            >
              <option value="all">Tất cả bưu cục</option>
              {allBranchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs">
              <button 
                onClick={() => setChart1ModeFilter('day')} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart1ModeFilter === 'day' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Ngày (N-1)
              </button>
              <button 
                onClick={() => setChart1ModeFilter('week')} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart1ModeFilter === 'week' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Tuần
              </button>
              <button 
                onClick={() => setChart1ModeFilter('month')} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart1ModeFilter === 'month' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Tháng
              </button>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart1Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="branch" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#888888" fontSize={12} tickLine={false} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
                formatter={(value: any, name: any) => [
                  name === '%GTC' ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(1), 
                  name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="Volume" fill="#3b82f6" name="Volume" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="SLĐ Gán" fill="#10b981" name="SLĐ Gán" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="SLĐ GTC" fill="#f59e0b" name="SLĐ GTC" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="%GTC" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} name="%GTC" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BIỂU ĐỒ 2: HIỆU SUẤT THEO NGÀY */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm uppercase">Biểu đồ hiệu suất vận hành theo ngày</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={chart2CategoryFilter} 
              onChange={(e) => setChart2CategoryFilter(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="Hàng mới ca 1">Hàng mới ca 1</option>
              <option value="Hàng mới ca 2">Hàng mới ca 2</option>
              <option value="Hàng tồn">Hàng tồn</option>
            </select>

            <select 
              value={chart2BranchFilter} 
              onChange={(e) => setChart2BranchFilter(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
            >
              <option value="all">Tất cả bưu cục</option>
              {allBranchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <div className="relative">
              <button 
                onClick={() => setShowChart2DatePicker(!showChart2DatePicker)}
                className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{currentChart2Label}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>

              {showChart2DatePicker && (
                <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl z-50 p-3 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-700 text-xs">
                    <span className="font-semibold">Tick chọn ngày</span>
                    <button 
                      onClick={() => setSelectedChart2Dates({})} 
                      className="text-primary hover:underline text-[11px]"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {availableDates.map(d => {
                      const isChecked = !!selectedChart2Dates[d];
                      return (
                        <div 
                          key={d} 
                          onClick={() => toggleChart2DateSelection(d)}
                          className="flex items-center gap-2 text-xs p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-neutral-400" />}
                          <span>{d}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs">
              <button 
                onClick={() => { setChart2TimeFilter('week'); setSelectedChart2Dates({}); }} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart2TimeFilter === 'week' && Object.values(selectedChart2Dates).every(v => !v) ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                7 Ngày gần nhất
              </button>
              <button 
                onClick={() => { setChart2TimeFilter('month'); setSelectedChart2Dates({}); }} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${chart2TimeFilter === 'month' && Object.values(selectedChart2Dates).every(v => !v) ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Tháng này
              </button>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart2Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="displayDate" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#888888" fontSize={12} tickLine={false} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
                formatter={(value: any, name: any) => [
                  name === '%GTC' ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(1), 
                  name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="Volume" fill="#8b5cf6" name="Volume" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="SLĐ Gán" fill="#06b6d4" name="SLĐ Gán" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="SLĐ GTC" fill="#ec4899" name="SLĐ GTC" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="%GTC" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} name="%GTC" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BẢNG TỔNG HỢP THEO BƯU CỤC */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden w-full">
        <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="font-semibold text-xs uppercase">BÁO CÁO TỔNG HỢP THEO BƯU CỤC</h2>
          
          <div className="relative">
            <button 
              onClick={() => setShowN1DatePicker(!showN1DatePicker)}
              className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{currentN1Label}</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            {showN1DatePicker && (
              <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl z-50 p-3 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-700 text-xs">
                  <span className="font-semibold">Tick chọn ngày (Giảm dần)</span>
                  <button 
                    onClick={() => setSelectedN1Dates({})} 
                    className="text-primary hover:underline text-[11px]"
                  >
                    Mặc định (N-1)
                  </button>
                </div>
                <div className="space-y-1.5">
                  {availableDates.map(d => {
                    const isChecked = !!selectedN1Dates[d];
                    return (
                      <div 
                        key={d} 
                        onClick={() => toggleN1DateSelection(d)}
                        className="flex items-center gap-2 text-xs p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-neutral-400" />}
                        <span>{d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs font-bold">
            <thead className="bg-[#0000FF] text-white sticky top-0 z-10 uppercase font-bold text-sm">
              <tr>
                <th className="p-2 border-r border-blue-400">Tên bưu cục</th>
                <th className="p-2 border-r border-blue-400">Loại hàng</th>
                <th className="p-2 border-r border-blue-400">Volume</th>
                <th className="p-2 border-r border-blue-400">% Gán</th>
                <th className="p-2 border-r border-blue-400">SLĐ Gán</th>
                <th className="p-2 border-r border-blue-400">% GTC</th>
                <th className="p-2 border-r border-blue-400">SLĐ GTC</th>
                <th className="p-2 border-r border-blue-400">Tồn đọng</th>
                <th className="p-2 w-36 text-base font-extrabold">Tổng %GTC & Ghi chú</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {branchKeys.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-neutral-500 font-bold">Không có dữ liệu cho các ngày đã chọn</td>
                </tr>
              ) : (
                branchKeys.map((branch, bIdx) => {
                  const categories = n1ByBranchAndCategory[branch];
                  const bMeta = branchSummaryMap[branch] || { branchGtcRate: 0 };
                  const isLowGtc = bMeta.branchGtcRate < 0.60;
                  const catValues = Object.values(categories);
                  const isLastBranch = bIdx === branchKeys.length - 1;

                  return catValues.map((row, idx) => {
                    let rowBgClass = '';
                    const catLower = row.category.toLowerCase();
                    if (catLower.includes('ca 1')) rowBgClass = 'bg-[#FFCC99]/30 dark:bg-[#FFCC99]/10';
                    else if (catLower.includes('ca 2')) rowBgClass = 'bg-[#CCFFCC]/30 dark:bg-[#CCFFCC]/10';
                    else if (catLower.includes('tồn')) rowBgClass = 'bg-[#FF99CC]/30 dark:bg-[#FF99CC]/10';

                    const isCa1LowAssigned = catLower.includes('ca 1') && row.assignedRate < 0.85;
                    const isLastRowOfBranch = idx === catValues.length - 1;

                    const borderStyle = isLastRowOfBranch && !isLastBranch 
                      ? 'border-b-4 border-double border-neutral-400 dark:border-neutral-500' 
                      : 'border-b border-neutral-200 dark:border-neutral-800';

                    return (
                      <tr key={`${branch}-${idx}`} className={`hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 ${rowBgClass} ${borderStyle}`}>
                        {idx === 0 ? (
                          <td className="p-2 font-bold text-sm align-middle border-r border-neutral-200 dark:border-neutral-700 bg-[#880000] text-white" rowSpan={3}>
                            {branch}
                          </td>
                        ) : null}
                        <td className="p-2 font-bold border-r border-neutral-200 dark:border-neutral-700">{row.category}</td>
                        <td className="p-2 font-bold border-r border-neutral-200 dark:border-neutral-700">{row.volume.toFixed(1)}</td>
                        <td className={`p-2 font-bold border-r border-neutral-200 dark:border-neutral-700 ${isCa1LowAssigned ? 'text-[#FF0000]' : ''}`}>
                          {(row.assignedRate * 100).toFixed(1)}%
                        </td>
                        <td className="p-2 font-bold border-r border-neutral-200 dark:border-neutral-700">{row.assignedVolume.toFixed(1)}</td>
                        <td className="p-2 font-bold border-r border-neutral-200 dark:border-neutral-700">{(row.gtcRate * 100).toFixed(1)}%</td>
                        <td className="p-2 font-bold border-r border-neutral-200 dark:border-neutral-700">{row.gtcVolume.toFixed(1)}</td>
                        <td className="p-2 font-bold border-r border-neutral-200 dark:border-neutral-700 text-red-600">{row.backlog.toFixed(1)}</td>
                        
                        {idx === 0 ? (
                          <td className="p-2 align-middle bg-white dark:bg-neutral-900" rowSpan={3}>
                            <div className={`font-black text-lg ${isLowGtc ? 'text-[#FF0000]' : ''}`}>
                              {(bMeta.branchGtcRate * 100).toFixed(1)}%
                            </div>
                            {isLowGtc && <div className="text-xs text-[#FF0000] font-bold leading-tight">Cảnh báo</div>}
                          </td>
                        ) : null}
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
            {branchKeys.length > 0 && (
              <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold sticky bottom-0 z-10 text-sm border-t-2 border-neutral-400">
                <tr>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 font-bold text-center" colSpan={2}>TỔNG CỘNG TOÀN HỆ THỐNG</td>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 font-bold text-center">{n1GlobalSummary.volume.toFixed(1)}</td>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 font-bold text-center">{(n1GlobalSummary.assignedRate * 100).toFixed(1)}%</td>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 font-bold text-center">{n1GlobalSummary.assignedVolume.toFixed(1)}</td>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 font-bold text-center">{(n1GlobalSummary.gtcRate * 100).toFixed(1)}%</td>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 font-bold text-center">{n1GlobalSummary.gtcVolume.toFixed(1)}</td>
                  <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-700 text-red-600 font-bold text-center">{n1GlobalSummary.backlog.toFixed(1)}</td>
                  <td className="p-2.5"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CHI TIẾT HIỆU SUẤT TỪNG BƯU CỤC */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <h2 className="font-semibold text-xs uppercase">CHI TIẾT HIỆU SUẤT TỪNG BƯU CỤC</h2>
          
          <div className="flex flex-wrap items-center gap-2 relative">
            <div className="relative">
              <button 
                onClick={() => setShowDatePickerDropdown(!showDatePickerDropdown)}
                className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>
                  {Object.values(selectedDates).filter(Boolean).length > 0 
                    ? `Đã chọn (${Object.values(selectedDates).filter(Boolean).length} ngày)` 
                    : 'Chọn ngày tùy ý'}
                </span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>

              {showDatePickerDropdown && (
                <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl z-50 p-3 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800 text-xs">
                    <span className="font-semibold">Tick chọn ngày (Giảm dần)</span>
                    <button 
                      onClick={() => setSelectedDates({})} 
                      className="text-primary hover:underline text-[11px]"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {availableDates.map(d => {
                      const isChecked = !!selectedDates[d];
                      return (
                        <div 
                          key={d} 
                          onClick={() => toggleDateSelection(d)}
                          className="flex items-center gap-2 text-xs p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-neutral-400" />}
                          <span>{d}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs">
              <button 
                onClick={() => { setTimeFilter('all'); setSelectedDates({}); }} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'all' && Object.values(selectedDates).every(v => !v) ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => { setTimeFilter('month'); setSelectedDates({}); }} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'month' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Tháng
              </button>
              <button 
                onClick={() => { setTimeFilter('week'); setSelectedDates({}); }} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'week' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Tuần (T2-CN)
              </button>
              <button 
                onClick={() => { setTimeFilter('day'); setSelectedDates({}); }} 
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'day' ? 'bg-white dark:bg-neutral-900 shadow-sm text-primary' : 'text-neutral-600 dark:text-neutral-400'}`}
              >
                Ngày N-1
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {branchGrouped.length === 0 ? (
            <div className="p-6 text-center text-neutral-500 text-sm">Không tìm thấy dữ liệu bưu cục phù hợp.</div>
          ) : (
            branchGrouped.map(({ branch, rows, summary }) => {
              const isExpanded = !!expandedBranches[branch];
              return (
                <div key={branch} className="transition-colors">
                  <div 
                    onClick={() => toggleBranch(branch)}
                    className="flex items-center justify-between p-3 bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer select-none text-xs"
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                      <span className="text-base font-extrabold text-[#FF0000]">{branch}</span>
                      <span className="font-normal px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                        {rows.length} dòng
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>Vol: <span className="font-semibold">{summary.volume.toFixed(1)}</span></div>
                      <div>% Gán: <span className="font-semibold">{(summary.assignedRate * 100).toFixed(1)}%</span></div>
                      <div>% GTC: <span className="font-semibold text-emerald-600">{(summary.gtcRate * 100).toFixed(1)}%</span></div>
                      <div>Tồn: <span className="font-semibold text-red-600">{summary.backlog.toFixed(1)}</span></div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-white dark:bg-neutral-900">
                      <div className="overflow-x-auto max-h-[350px] border border-neutral-200 dark:border-neutral-800 rounded-lg">
                        <table className="w-full text-center border-collapse text-xs">
                          <thead className="bg-[#0000FF] text-white sticky top-0 z-10 uppercase font-bold text-sm">
                            <tr>
                              <th className="p-2 border-r border-blue-400">Ngày</th>
                              <th className="p-2 border-r border-blue-400">Loại hàng</th>
                              <th className="p-2 border-r border-blue-400">Volume</th>
                              <th className="p-2 border-r border-blue-400">% Gán</th>
                              <th className="p-2 border-r border-blue-400">SLĐ Gán</th>
                              <th className="p-2 border-r border-blue-400">% GTC</th>
                              <th className="p-2 border-r border-blue-400">SLĐ GTC</th>
                              <th className="p-2 border-r border-blue-400">Tồn đọng</th>
                              <th className="p-2">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-bold">
                            {rows.map((item, i) => {
                              const vnStatus = translateStatus(item.status);
                              return (
                                <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 font-bold">
                                  <td className="p-2 font-bold">{item.date}</td>
                                  <td className="p-2 font-bold">{item.category}</td>
                                  <td className="p-2 font-bold">{item.volume.toFixed(1)}</td>
                                  <td className="p-2 font-bold">{(item.assignedRate * 100).toFixed(1)}%</td>
                                  <td className="p-2 font-bold">{item.assignedVolume.toFixed(1)}</td>
                                  <td className="p-2 font-bold">{(item.gtcRate * 100).toFixed(1)}%</td>
                                  <td className="p-2 font-bold">{item.gtcVolume.toFixed(1)}</td>
                                  <td className="p-2 font-bold text-red-600">{item.backlog.toFixed(1)}</td>
                                  <td className="p-2 font-bold">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                      item.status === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      item.status === 'Warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                      {vnStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
