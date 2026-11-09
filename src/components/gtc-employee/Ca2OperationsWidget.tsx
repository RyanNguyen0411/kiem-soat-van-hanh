import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Moon, 
  Filter, 
  RotateCcw, 
  Building2, 
  Calendar, 
  Clock, 
  Truck, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  ShieldAlert, 
  AlertTriangle, 
  Sparkles, 
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
  Legend, 
  ReferenceLine 
} from 'recharts';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import { IndividualFilterDropdown } from '../common/IndividualFilterDropdown';
import type { DatasetState, GtcEmployeeRecord, GtcPostOfficeRecord } from '../../types/dashboard';

interface Ca2OperationsWidgetProps {
  dataset: DatasetState;
  buuCucOptions: { label: string; value: string }[];
  availableMonths: { key: string; label: string; dates: string[] }[];
  availableWeeks: { key: string; label: string; dates: string[] }[];
  allUniqueDatesDesc: string[];
}

export const Ca2OperationsWidget: React.FC<Ca2OperationsWidgetProps> = ({
  dataset,
  buuCucOptions,
  availableMonths,
  availableWeeks,
  allUniqueDatesDesc,
}) => {
  // 1a. Trạng thái bộ lọc chính Khối Ca 2
  const [ca2FilterBuuCuc, setCa2FilterBuuCuc] = useState<string[]>([]);
  const [ca2FilterMonths, setCa2FilterMonths] = useState<string[]>([]);
  const [ca2FilterWeeks, setCa2FilterWeeks] = useState<string[]>([]);
  const [ca2FilterDates, setCa2FilterDates] = useState<string[]>([]);
  const [ca2FilterStatus, setCa2FilterStatus] = useState<'all' | 'ca2' | 'ca1'>('all');
  const [ca2SearchTerm, setCa2SearchTerm] = useState<string>('');

  const handleResetCa2Filter = () => {
    setCa2FilterBuuCuc([]);
    setCa2FilterMonths([]);
    setCa2FilterWeeks([]);
    setCa2FilterDates([]);
    setCa2FilterStatus('all');
    setCa2SearchTerm('');
  };

  // 1b. Trạng thái & bộ lọc riêng cho Biểu Đồ Ma Trận Ca 2 (Volume, Gán, %GTC & Chênh Lệch)
  const [matrixCa2FilterBuuCuc, setMatrixCa2FilterBuuCuc] = useState<string[]>([]);
  const [matrixCa2FilterMonths, setMatrixCa2FilterMonths] = useState<string[]>([]);
  const [matrixCa2FilterWeeks, setMatrixCa2FilterWeeks] = useState<string[]>([]);
  const [matrixCa2FilterDates, setMatrixCa2FilterDates] = useState<string[]>([]);
  const [matrixCa2ViewMode, setMatrixCa2ViewMode] = useState<'by_date' | 'by_buu_cuc'>('by_date');

  const handleResetMatrixCa2Filter = () => {
    setMatrixCa2FilterBuuCuc([]);
    setMatrixCa2FilterMonths([]);
    setMatrixCa2FilterWeeks([]);
    setMatrixCa2FilterDates([]);
  };

  const handleQuickSetMatrixCa2Dates = (daysCount: number | 'all') => {
    if (daysCount === 'all') {
      setMatrixCa2FilterDates([]);
    } else {
      setMatrixCa2FilterDates(allUniqueDatesDesc.slice(0, daysCount));
    }
  };

  const isDateInMatrixCa2Filter = (d: string) => {
    if (matrixCa2FilterMonths.length > 0) {
      const matchMonth = matrixCa2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (matrixCa2FilterWeeks.length > 0) {
      const matchWeek = matrixCa2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (matrixCa2FilterDates.length > 0 && !matrixCa2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  // 1c. Trạng thái & bộ lọc riêng cho Bảng Tổng Hợp Chỉ Số Vận Hành Ca 2 & Độ Phủ
  const [tableCa2FilterBuuCuc, setTableCa2FilterBuuCuc] = useState<string[]>([]);
  const [tableCa2FilterMonths, setTableCa2FilterMonths] = useState<string[]>([]);
  const [tableCa2FilterWeeks, setTableCa2FilterWeeks] = useState<string[]>([]);
  const [tableCa2FilterDates, setTableCa2FilterDates] = useState<string[]>([]);
  const [activeCa2KpiFocus, setActiveCa2KpiFocus] = useState<'all' | 'volume' | 'gan' | 'gap' | 'gtc'>('all');

  const handleResetTableCa2Filter = () => {
    setTableCa2FilterBuuCuc([]);
    setTableCa2FilterMonths([]);
    setTableCa2FilterWeeks([]);
    setTableCa2FilterDates([]);
  };

  const handleQuickSetTableCa2Dates = (daysCount: number | 'all') => {
    if (daysCount === 'all') {
      setTableCa2FilterDates([]);
    } else {
      setTableCa2FilterDates(allUniqueDatesDesc.slice(0, daysCount));
    }
  };

  const isDateInTableCa2Filter = (d: string) => {
    if (tableCa2FilterMonths.length > 0) {
      const matchMonth = tableCa2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (tableCa2FilterWeeks.length > 0) {
      const matchWeek = tableCa2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (tableCa2FilterDates.length > 0 && !tableCa2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  // 1d. Trạng thái & bộ lọc riêng cho Bảng Thống Kê Đi Ca 2 & Chỉ Đi Ca 1 Theo Ngày
  const [dailyCa2FilterBuuCuc, setDailyCa2FilterBuuCuc] = useState<string[]>([]);
  const [dailyCa2FilterMonths, setDailyCa2FilterMonths] = useState<string[]>([]);
  const [dailyCa2FilterWeeks, setDailyCa2FilterWeeks] = useState<string[]>([]);
  const [dailyCa2FilterDates, setDailyCa2FilterDates] = useState<string[]>([]);

  const handleResetDailyCa2Filter = () => {
    setDailyCa2FilterBuuCuc([]);
    setDailyCa2FilterMonths([]);
    setDailyCa2FilterWeeks([]);
    setDailyCa2FilterDates([]);
  };

  const isDateInDailyCa2Filter = (d: string) => {
    if (dailyCa2FilterMonths.length > 0) {
      const matchMonth = dailyCa2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (dailyCa2FilterWeeks.length > 0) {
      const matchWeek = dailyCa2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (dailyCa2FilterDates.length > 0 && !dailyCa2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  // 1e. Trạng thái & bộ lọc riêng cho Bảng Chi Tiết Bưu Tá Giao Hàng Ca 2
  const [detailCa2FilterBuuCuc, setDetailCa2FilterBuuCuc] = useState<string[]>([]);
  const [detailCa2FilterMonths, setDetailCa2FilterMonths] = useState<string[]>([]);
  const [detailCa2FilterWeeks, setDetailCa2FilterWeeks] = useState<string[]>([]);
  const [detailCa2FilterDates, setDetailCa2FilterDates] = useState<string[]>([]);

  const handleResetDetailCa2Filter = () => {
    setDetailCa2FilterBuuCuc([]);
    setDetailCa2FilterMonths([]);
    setDetailCa2FilterWeeks([]);
    setDetailCa2FilterDates([]);
  };

  const isDateInDetailCa2Filter = (d: string) => {
    if (detailCa2FilterMonths.length > 0) {
      const matchMonth = detailCa2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (detailCa2FilterWeeks.length > 0) {
      const matchWeek = detailCa2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (detailCa2FilterDates.length > 0 && !detailCa2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  const handleSelectCa2Kpi = (focus: 'volume' | 'gan' | 'gap' | 'gtc') => {
    setActiveCa2KpiFocus(prev => prev === focus ? 'all' : focus);
    const el = document.getElementById('section-ca2-summary-table');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper kiểm tra ngày có thỏa mãn bộ lọc thời gian
  const isDateInCa2Filter = (d: string) => {
    if (ca2FilterMonths.length > 0) {
      const matchMonth = ca2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (ca2FilterWeeks.length > 0) {
      const matchWeek = ca2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (ca2FilterDates.length > 0 && !ca2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  // Thống kê tổng hợp cho 4 Thẻ KPI trên đầu (phản ánh tức thì theo đúng bộ lọc)
  const ca2TopKpiStats = useMemo(() => {
    const bcRecords = dataset.gtcBuuCuc.filter((r: GtcPostOfficeRecord) => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return false;
      if (ca2FilterBuuCuc.length > 0 && !ca2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInCa2Filter(r.ngay);
    });

    let volumeCa2 = 0;
    let sldGanCa2 = 0;
    let sldGtcCa2 = 0;
    let tonDongCa2 = 0;

    bcRecords.forEach((r: GtcPostOfficeRecord) => {
      volumeCa2 += (r.volume || 0);
      sldGanCa2 += (r.sldGan || 0);
      sldGtcCa2 += (r.sldGTC || 0);
      tonDongCa2 += (r.tonDong || 0);
    });

    const overallRateGtcCa2 = sldGanCa2 > 0 ? (sldGtcCa2 / sldGanCa2) * 100 : (volumeCa2 > 0 ? (sldGtcCa2 / volumeCa2) * 100 : 0);

    const nvRecords = dataset.gtcNhanVien.filter((r: GtcEmployeeRecord) => {
      if (ca2FilterBuuCuc.length > 0 && !ca2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInCa2Filter(r.ngay);
    });

    const totalShifts = nvRecords.length;
    const ca2Shifts = nvRecords.filter((r: GtcEmployeeRecord) => r.chuyenDi >= 2).length;
    const ca1Shifts = nvRecords.filter((r: GtcEmployeeRecord) => r.chuyenDi === 1).length;
    const overallRateCa2 = totalShifts > 0 ? (ca2Shifts / totalShifts) * 100 : 0;

    return {
      volumeCa2,
      sldGanCa2,
      sldGtcCa2,
      tonDongCa2,
      overallRateGtcCa2,
      totalShifts,
      ca2Shifts,
      ca1Shifts,
      overallRateCa2
    };
  }, [dataset.gtcBuuCuc, dataset.gtcNhanVien, ca2FilterBuuCuc, ca2FilterMonths, ca2FilterWeeks, ca2FilterDates, availableMonths, availableWeeks]);

  // Dữ liệu chi tiết Nhân Viên Ca 2 đã lọc
  const ca2FilteredRecords = useMemo(() => {
    return dataset.gtcNhanVien.filter((r: GtcEmployeeRecord) => {
      const activeBcFilter = detailCa2FilterBuuCuc.length > 0 ? detailCa2FilterBuuCuc : ca2FilterBuuCuc;
      if (activeBcFilter.length > 0 && !activeBcFilter.includes(r.buuCuc)) return false;

      if (ca2FilterStatus === 'ca2' && r.chuyenDi < 2) return false;
      if (ca2FilterStatus === 'ca1' && r.chuyenDi !== 1) return false;

      const hasCustomDetailDateFilter = detailCa2FilterMonths.length > 0 || detailCa2FilterWeeks.length > 0 || detailCa2FilterDates.length > 0;
      if (hasCustomDetailDateFilter) {
        if (!isDateInDetailCa2Filter(r.ngay)) return false;
      } else {
        if (!isDateInCa2Filter(r.ngay)) return false;
      }

      if (ca2SearchTerm.trim()) {
        const q = ca2SearchTerm.toLowerCase();
        const matchName = r.tenNV.toLowerCase().includes(q);
        const matchCode = r.maNV.toLowerCase().includes(q);
        const matchBc = r.buuCuc.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBc) return false;
      }

      return true;
    });
  }, [
    dataset.gtcNhanVien, 
    ca2FilterBuuCuc, 
    detailCa2FilterBuuCuc, 
    ca2FilterStatus, 
    ca2FilterMonths, 
    ca2FilterWeeks, 
    ca2FilterDates, 
    detailCa2FilterMonths, 
    detailCa2FilterWeeks, 
    detailCa2FilterDates, 
    ca2SearchTerm, 
    availableMonths, 
    availableWeeks
  ]);

  // Thống kê tổng hợp Ca 2 theo Bưu Cục
  const ca2SummaryByBuuCuc = useMemo(() => {
    const ca2BcRecords = dataset.gtcBuuCuc.filter((r: GtcPostOfficeRecord) => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return false;
      if (tableCa2FilterBuuCuc.length > 0 && !tableCa2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInTableCa2Filter(r.ngay);
    });

    const opByBuuCuc: Record<string, { volume: number; sldGan: number; sldGTC: number; tonDong: number }> = {};
    ca2BcRecords.forEach((r: GtcPostOfficeRecord) => {
      if (!opByBuuCuc[r.buuCuc]) {
        opByBuuCuc[r.buuCuc] = { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };
      }
      opByBuuCuc[r.buuCuc].volume += r.volume;
      opByBuuCuc[r.buuCuc].sldGan += r.sldGan;
      opByBuuCuc[r.buuCuc].sldGTC += r.sldGTC;
      opByBuuCuc[r.buuCuc].tonDong += r.tonDong;
    });

    const nvRecords = dataset.gtcNhanVien.filter((r: GtcEmployeeRecord) => {
      if (tableCa2FilterBuuCuc.length > 0 && !tableCa2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInTableCa2Filter(r.ngay);
    });

    const nvByBuuCuc: Record<string, {
      totalShifts: number;
      ca2Shifts: number;
      ca1Shifts: number;
      nvSet: Set<string>;
      ca2NvSet: Set<string>;
    }> = {};

    nvRecords.forEach((r: GtcEmployeeRecord) => {
      if (!nvByBuuCuc[r.buuCuc]) {
        nvByBuuCuc[r.buuCuc] = {
          totalShifts: 0,
          ca2Shifts: 0,
          ca1Shifts: 0,
          nvSet: new Set(),
          ca2NvSet: new Set()
        };
      }
      const g = nvByBuuCuc[r.buuCuc];
      g.totalShifts++;
      g.nvSet.add(r.maNV);
      if (r.chuyenDi >= 2) {
        g.ca2Shifts++;
        g.ca2NvSet.add(r.maNV);
      } else {
        g.ca1Shifts++;
      }
    });

    const allBCs = Array.from(new Set([...Object.keys(opByBuuCuc), ...Object.keys(nvByBuuCuc)]));

    const rows = allBCs.map(buuCuc => {
      const nv = nvByBuuCuc[buuCuc] || { totalShifts: 0, ca2Shifts: 0, ca1Shifts: 0, nvSet: new Set(), ca2NvSet: new Set() };
      const op = opByBuuCuc[buuCuc] || { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };

      const rateCa2 = nv.totalShifts > 0 ? (nv.ca2Shifts / nv.totalShifts) * 100 : 0;
      const rateGan = op.volume > 0 ? (op.sldGan / op.volume) * 100 : 0;
      const rateGtc = op.sldGan > 0 ? (op.sldGTC / op.sldGan) * 100 : 0;

      const isPassCoverage = rateCa2 >= 70;
      const isPassGan = rateGan >= 50;

      let statusLevel: 'good' | 'warning' | 'alert' = 'good';
      let evalBadge = '';
      let recommendation = '';

      if (!isPassCoverage && !isPassGan) {
        statusLevel = 'alert';
        evalBadge = '[BÁO ĐỘNG ĐỎ - CHƯA ĐẠT CẢ 2 TIÊU CHÍ]';
        recommendation = `Độ phủ NV chỉ đạt ${rateCa2.toFixed(1)}% (< 70%) & Tỷ lệ gán chỉ đạt ${rateGan.toFixed(1)}% (< 50%). Dồn ứ ${op.tonDong.toLocaleString('vi-VN')} đơn tồn sàn. Trưởng BC phải kích hoạt ngay ${nv.ca1Shifts} NV đi 1 ca sang chạy ca 2 và ép gán đơn dứt điểm trước 14h30.`;
      } else if (!isPassCoverage && isPassGan) {
        statusLevel = rateCa2 < 55 ? 'alert' : 'warning';
        evalBadge = '[CẦN TĂNG ĐỘ PHỦ NV GIAO CA 2]';
        const neededNv = Math.max(1, Math.ceil(nv.totalShifts * 0.7 - nv.ca2Shifts));
        recommendation = `Tỷ lệ gán đạt chuẩn ${rateGan.toFixed(1)}% (≥ 50%), nhưng Độ phủ NV mới đạt ${rateCa2.toFixed(1)}% (< 70%, còn ${nv.ca1Shifts} ca chỉ đi 1 chuyến). Cần huy động thêm tối thiểu ${neededNv} NV ra ca 2 để giảm tải và giữ nhịp GTC.`;
      } else if (isPassCoverage && !isPassGan) {
        statusLevel = rateGan < 35 ? 'alert' : 'warning';
        evalBadge = '[CẢNH BÁO: TỶ LỆ GÁN ĐƠN CHƯA ĐẠT 50%]';
        recommendation = `Độ phủ NV tốt ${rateCa2.toFixed(1)}% (≥ 70%), nhưng Tỷ lệ gán chỉ đạt ${rateGan.toFixed(1)}% (< 50%). Bưu tá chạy xe non tải, còn ${op.tonDong.toLocaleString('vi-VN')} đơn ứ tại sàn. Điều phối phải tăng định mức gán thêm 20-30 đơn/bưu tá ca 2.`;
      } else {
        statusLevel = 'good';
        evalBadge = '[ĐẠT CHUẨN MỤC TIÊU VẬN HÀNH CA]';
        recommendation = `Xuất sắc đạt cả 2 chỉ tiêu: Độ phủ NV ${rateCa2.toFixed(1)}% (≥ 70%) & Tỷ lệ gán ${rateGan.toFixed(1)}% (≥ 50%). Tồn sàn kiểm soát tốt (${op.tonDong.toLocaleString('vi-VN')} đơn). Tiếp tục duy trì và thúc đẩy % GTC đạt trên 85% trước 19h00.`;
      }

      return {
        buuCuc,
        totalShifts: nv.totalShifts,
        ca2Shifts: nv.ca2Shifts,
        rateCa2,
        ca1Shifts: nv.ca1Shifts,
        volumeCa2: op.volume,
        sldGanCa2: op.sldGan,
        sldGtcCa2: op.sldGTC,
        tonDongCa2: op.tonDong,
        rateGanCa2: rateGan,
        rateGtcCa2: rateGtc,
        statusLevel,
        evalBadge,
        recommendation
      };
    });

    const sortedRows = [...rows].sort((a, b) => {
      if (activeCa2KpiFocus === 'volume') return b.volumeCa2 - a.volumeCa2;
      if (activeCa2KpiFocus === 'gan') return b.sldGanCa2 - a.sldGanCa2;
      if (activeCa2KpiFocus === 'gap') return b.tonDongCa2 - a.tonDongCa2;
      if (activeCa2KpiFocus === 'gtc') return b.rateGtcCa2 - a.rateGtcCa2;
      return b.rateCa2 - a.rateCa2;
    });

    const totalAll = sortedRows.reduce((acc, r) => {
      acc.totalShifts += r.totalShifts;
      acc.ca2Shifts += r.ca2Shifts;
      acc.ca1Shifts += r.ca1Shifts;
      acc.volumeCa2 += r.volumeCa2;
      acc.sldGanCa2 += r.sldGanCa2;
      acc.sldGtcCa2 += r.sldGtcCa2;
      acc.tonDongCa2 += r.tonDongCa2;
      return acc;
    }, {
      totalShifts: 0,
      ca2Shifts: 0,
      ca1Shifts: 0,
      volumeCa2: 0,
      sldGanCa2: 0,
      sldGtcCa2: 0,
      tonDongCa2: 0
    });

    const overallRateCa2 = totalAll.totalShifts > 0 ? (totalAll.ca2Shifts / totalAll.totalShifts) * 100 : 0;
    const overallRateGtcCa2 = totalAll.sldGanCa2 > 0 ? (totalAll.sldGtcCa2 / totalAll.sldGanCa2) * 100 : 0;

    return {
      rows: sortedRows,
      totalAll: {
        ...totalAll,
        overallRateCa2,
        overallRateGtcCa2
      }
    };
  }, [dataset.gtcBuuCuc, dataset.gtcNhanVien, tableCa2FilterBuuCuc, tableCa2FilterMonths, tableCa2FilterWeeks, tableCa2FilterDates, activeCa2KpiFocus, availableMonths, availableWeeks]);

  // Dữ liệu tính toán chuyên sâu cho Biểu Đồ Ma Trận Ca 2
  const matrixCa2Data = useMemo(() => {
    const ca2Records = dataset.gtcBuuCuc.filter((r: GtcPostOfficeRecord) => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return false;
      if (matrixCa2FilterBuuCuc.length > 0 && !matrixCa2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInMatrixCa2Filter(r.ngay);
    });

    const dailyNvCoverage: Record<string, { total: number; ca2: number }> = {};
    const bcNvCoverage: Record<string, { total: number; ca2: number }> = {};

    dataset.gtcNhanVien.forEach((r: GtcEmployeeRecord) => {
      if (matrixCa2FilterBuuCuc.length > 0 && !matrixCa2FilterBuuCuc.includes(r.buuCuc)) return;
      if (!isDateInMatrixCa2Filter(r.ngay)) return;

      if (!dailyNvCoverage[r.ngay]) dailyNvCoverage[r.ngay] = { total: 0, ca2: 0 };
      dailyNvCoverage[r.ngay].total++;
      if (r.chuyenDi >= 2) dailyNvCoverage[r.ngay].ca2++;

      if (!bcNvCoverage[r.buuCuc]) bcNvCoverage[r.buuCuc] = { total: 0, ca2: 0 };
      bcNvCoverage[r.buuCuc].total++;
      if (r.chuyenDi >= 2) bcNvCoverage[r.buuCuc].ca2++;
    });

    const byDateMap: Record<string, {
      ngay: string;
      shortDate: string;
      thu: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
      tonDong: number;
    }> = {};

    ca2Records.forEach((r: GtcPostOfficeRecord) => {
      const d = r.ngay;
      if (!byDateMap[d]) {
        const shortDate = d.length >= 5 ? d.substring(0, 5) : d;
        byDateMap[d] = {
          ngay: d,
          shortDate,
          thu: r.thu || '',
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0
        };
      }
      byDateMap[d].volume += (r.volume || 0);
      byDateMap[d].sldGan += (r.sldGan || 0);
      byDateMap[d].sldGTC += (r.sldGTC || 0);
      byDateMap[d].tonDong += (r.tonDong || 0);
    });

    const dateList = Object.values(byDateMap).map(item => {
      const gapDon = Math.max(0, item.volume - item.sldGan);
      const rateGan = item.volume > 0 ? parseFloat(((item.sldGan / item.volume) * 100).toFixed(1)) : 0;
      const rateGap = item.volume > 0 ? parseFloat(((gapDon / item.volume) * 100).toFixed(1)) : 0;
      const rateGtc = item.sldGan > 0 ? parseFloat(((item.sldGTC / item.sldGan) * 100).toFixed(1)) : 0;
      const nv = dailyNvCoverage[item.ngay] || { total: 0, ca2: 0 };
      const rateCoverage = nv.total > 0 ? parseFloat(((nv.ca2 / nv.total) * 100).toFixed(1)) : 0;

      return {
        ...item,
        label: item.shortDate,
        fullTitle: `Ngày ${item.ngay} (${item.thu})`,
        buuCuc: '',
        shortName: '',
        gapDon,
        rateGan,
        rateGap,
        rateGtc,
        rateCoverage
      };
    }).sort((a, b) => {
      const [d1, m1, y1] = a.ngay.split('/').map(Number);
      const [d2, m2, y2] = b.ngay.split('/').map(Number);
      return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    });

    const byBcMap: Record<string, {
      buuCuc: string;
      shortName: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
      tonDong: number;
    }> = {};

    ca2Records.forEach((r: GtcPostOfficeRecord) => {
      const bc = r.buuCuc;
      if (!byBcMap[bc]) {
        byBcMap[bc] = {
          buuCuc: bc,
          shortName: bc.replace('(LAN) ', ''),
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0
        };
      }
      byBcMap[bc].volume += (r.volume || 0);
      byBcMap[bc].sldGan += (r.sldGan || 0);
      byBcMap[bc].sldGTC += (r.sldGTC || 0);
      byBcMap[bc].tonDong += (r.tonDong || 0);
    });

    const buuCucList = Object.values(byBcMap).map(item => {
      const gapDon = Math.max(0, item.volume - item.sldGan);
      const rateGan = item.volume > 0 ? parseFloat(((item.sldGan / item.volume) * 100).toFixed(1)) : 0;
      const rateGap = item.volume > 0 ? parseFloat(((gapDon / item.volume) * 100).toFixed(1)) : 0;
      const rateGtc = item.sldGan > 0 ? parseFloat(((item.sldGTC / item.sldGan) * 100).toFixed(1)) : 0;
      const nv = bcNvCoverage[item.buuCuc] || { total: 0, ca2: 0 };
      const rateCoverage = nv.total > 0 ? parseFloat(((nv.ca2 / nv.total) * 100).toFixed(1)) : 0;

      return {
        ...item,
        label: item.shortName,
        fullTitle: item.buuCuc,
        ngay: '',
        shortDate: '',
        thu: '',
        gapDon,
        rateGan,
        rateGap,
        rateGtc,
        rateCoverage
      };
    }).sort((a, b) => b.volume - a.volume);

    const totalVol = ca2Records.reduce((s: number, r: GtcPostOfficeRecord) => s + (r.volume || 0), 0);
    const totalGan = ca2Records.reduce((s: number, r: GtcPostOfficeRecord) => s + (r.sldGan || 0), 0);
    const totalGtc = ca2Records.reduce((s: number, r: GtcPostOfficeRecord) => s + (r.sldGTC || 0), 0);
    const totalTon = ca2Records.reduce((s: number, r: GtcPostOfficeRecord) => s + (r.tonDong || 0), 0);
    const totalGap = Math.max(0, totalVol - totalGan);
    const avgRateGan = totalVol > 0 ? parseFloat(((totalGan / totalVol) * 100).toFixed(1)) : 0;
    const avgRateGap = totalVol > 0 ? parseFloat(((totalGap / totalVol) * 100).toFixed(1)) : 0;
    const avgRateGtc = totalGan > 0 ? parseFloat(((totalGtc / totalGan) * 100).toFixed(1)) : 0;

    const totalNvShifts = Object.values(dailyNvCoverage).reduce((s, x) => s + x.total, 0);
    const totalNvCa2Shifts = Object.values(dailyNvCoverage).reduce((s, x) => s + x.ca2, 0);
    const avgRateCoverage = totalNvShifts > 0 ? parseFloat(((totalNvCa2Shifts / totalNvShifts) * 100).toFixed(1)) : 0;

    const worstDate = [...dateList].sort((a, b) => b.gapDon - a.gapDon)[0];
    const worstBc = [...buuCucList].sort((a, b) => b.gapDon - a.gapDon)[0];

    return {
      dateList,
      buuCucList,
      totalVol,
      totalGan,
      totalGtc,
      totalTon,
      totalGap,
      avgRateGan,
      avgRateGap,
      avgRateGtc,
      avgRateCoverage,
      worstDate,
      worstBc,
      recordCount: ca2Records.length
    };
  }, [dataset.gtcBuuCuc, dataset.gtcNhanVien, matrixCa2FilterBuuCuc, matrixCa2FilterMonths, matrixCa2FilterWeeks, matrixCa2FilterDates, availableMonths, availableWeeks]);

  // Thống kê số lượng nhân viên đi Ca 2 và chỉ đi Ca 1 theo ngày
  const ca2DailyBreakdown = useMemo(() => {
    const dailyNV: Record<string, {
      key: string;
      buuCuc: string;
      ngay: string;
      thu: string;
      totalNV: number;
      ca2NV: number;
      ca1NV: number;
    }> = {};

    const activeBcFilter = dailyCa2FilterBuuCuc.length > 0 ? dailyCa2FilterBuuCuc : ca2FilterBuuCuc;
    const hasCustomDailyDateFilter = dailyCa2FilterMonths.length > 0 || dailyCa2FilterWeeks.length > 0 || dailyCa2FilterDates.length > 0;
    const checkDate = (d: string) => hasCustomDailyDateFilter ? isDateInDailyCa2Filter(d) : isDateInCa2Filter(d);

    dataset.gtcNhanVien.forEach((r: GtcEmployeeRecord) => {
      if (activeBcFilter.length > 0 && !activeBcFilter.includes(r.buuCuc)) return;
      if (!checkDate(r.ngay)) return;

      const key = `${r.buuCuc}___${r.ngay}`;
      if (!dailyNV[key]) {
        dailyNV[key] = {
          key,
          buuCuc: r.buuCuc,
          ngay: r.ngay,
          thu: r.thu,
          totalNV: 0,
          ca2NV: 0,
          ca1NV: 0
        };
      }
      dailyNV[key].totalNV++;
      if (r.chuyenDi >= 2) {
        dailyNV[key].ca2NV++;
      } else {
        dailyNV[key].ca1NV++;
      }
    });

    const dailyBC: Record<string, { volume: number; sldGan: number; sldGTC: number; tonDong: number }> = {};
    dataset.gtcBuuCuc.forEach((r: GtcPostOfficeRecord) => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return;
      if (activeBcFilter.length > 0 && !activeBcFilter.includes(r.buuCuc)) return;
      if (!checkDate(r.ngay)) return;

      const key = `${r.buuCuc}___${r.ngay}`;
      if (!dailyBC[key]) {
        dailyBC[key] = { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };
      }
      dailyBC[key].volume += r.volume;
      dailyBC[key].sldGan += r.sldGan;
      dailyBC[key].sldGTC += r.sldGTC;
      dailyBC[key].tonDong += r.tonDong;
    });

    return Object.values(dailyNV).map(row => {
      const bc = dailyBC[row.key] || { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };
      const rateCa2 = row.totalNV > 0 ? (row.ca2NV / row.totalNV) * 100 : 0;
      const rateCa1 = row.totalNV > 0 ? (row.ca1NV / row.totalNV) * 100 : 0;
      const rateGtc = bc.sldGan > 0 ? (bc.sldGTC / bc.sldGan) * 100 : 0;

      let status: 'good' | 'warning' | 'alert' = 'good';
      if (rateCa2 < 60) status = 'alert';
      else if (rateCa2 < 72) status = 'warning';

      return {
        ...row,
        rateCa2,
        rateCa1,
        volumeCa2: bc.volume,
        sldGanCa2: bc.sldGan,
        sldGtcCa2: bc.sldGTC,
        tonDongCa2: bc.tonDong,
        rateGtcCa2: rateGtc,
        status
      };
    }).sort((a, b) => {
      const [d1, m1, y1] = a.ngay.split('/').map(Number);
      const [d2, m2, y2] = b.ngay.split('/').map(Number);
      const timeDiff = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.buuCuc.localeCompare(b.buuCuc);
    });
  }, [
    dataset.gtcNhanVien, 
    dataset.gtcBuuCuc, 
    ca2FilterBuuCuc, 
    dailyCa2FilterBuuCuc, 
    ca2FilterMonths, 
    ca2FilterWeeks, 
    ca2FilterDates, 
    dailyCa2FilterMonths, 
    dailyCa2FilterWeeks, 
    dailyCa2FilterDates, 
    availableMonths, 
    availableWeeks
  ]);

  // Cột cho Bảng Chi Tiết Theo Dõi Nhân Viên Ca 2 (Căn giữa toàn bộ chỉ số vận hành)
  const ca2TableColumns: Column<GtcEmployeeRecord>[] = useMemo(() => [
    {
      key: 'buuCuc',
      header: 'Bưu Cục',
      width: 'w-36',
      align: 'center',
      render: (r: GtcEmployeeRecord) => <span className="font-semibold text-slate-800 dark:text-slate-100">{r.buuCuc}</span>
    },
    {
      key: 'tenNV',
      header: 'Nhân Viên (Bưu Tá)',
      width: 'w-48',
      align: 'left',
      render: (r: GtcEmployeeRecord) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{r.tenNV}</div>
          <div className="text-[11px] text-slate-400 font-mono">Mã: {r.maNV}</div>
        </div>
      )
    },
    {
      key: 'ngay',
      header: 'Ngày',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => (
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{r.ngay}</strong>
          <div className="text-[10px] text-slate-400">{r.thu}</div>
        </div>
      )
    },
    {
      key: 'chuyenDi',
      header: 'Số Chuyến',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
          r.chuyenDi >= 2 
            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' 
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {r.chuyenDi} Chuyến
        </span>
      )
    },
    {
      key: 'trangThaiCa',
      header: 'Trạng Thái Ca 2',
      width: 'w-36',
      align: 'center',
      render: (r: GtcEmployeeRecord) => (
        r.chuyenDi >= 2 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Có Đi Ca 2
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Chỉ Đi 1 Ca
          </span>
        )
      )
    },
    {
      key: 'tongDon',
      header: 'Đơn Gán',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => <strong className="font-bold text-slate-800 dark:text-slate-100">{r.tongDon.toLocaleString('vi-VN')}</strong>
    },
    {
      key: 'tongDonGTC',
      header: 'Đơn GTC',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => <strong className="font-black text-emerald-600 dark:text-emerald-400">{r.tongDonGTC.toLocaleString('vi-VN')}</strong>
    },
    {
      key: 'tiLeGTC',
      header: '% GTC',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => {
        const val = parseFloat(r.tiLeGTC.replace(',', '.'));
        const isHigh = val >= 80;
        const isMed = val >= 70;
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
            isHigh ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' :
            isMed ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' :
            'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
          }`}>
            {r.tiLeGTC}
          </span>
        );
      }
    },
    {
      key: 'tonDong',
      header: 'Tồn Đọng',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => (
        <strong className={`font-bold ${r.tonDong > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {r.tonDong.toLocaleString('vi-VN')}
        </strong>
      )
    },
    {
      key: 'leadtime',
      header: 'Leadtime (h)',
      width: 'w-28',
      align: 'center',
      render: (r: GtcEmployeeRecord) => <strong className="text-slate-700 dark:text-slate-300">{r.leadtime.toFixed(1)}h</strong>
    }
  ], []);

  return (
    <div id="section-ca2-report" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 md:p-4 space-y-3 shadow-sm scroll-mt-16">
      {/* 1. Header Báo Cáo Ca 2 (Thu gọn, tinh tế) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-700 pb-2.5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200 border border-orange-300 dark:border-orange-800">
              <Flame className="w-3 h-3 text-orange-600 animate-pulse" />
              Trọng Tâm Vận Hành: Giao Hàng Mới Ca 2
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              • 2 Chuyến/Ngày = Có đi Ca 2 | 1 Chuyến/Ngày = Chỉ đi 1 Ca
            </span>
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
            <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Báo Cáo Quản Trị &amp; Thúc Đẩy Giao Hàng Mới Ca 2 (Ca Chiều / Tối)
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Chỉ số vận hành lấy chuẩn từ <strong>Hàng Mới Ca 2</strong> (Volume, Gán, GTC, Tồn) kết hợp số lượng bưu tá tham gia ca chiều/tối
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            Độ Phủ Ca 2: <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">{ca2TopKpiStats.overallRateCa2.toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      {/* 2. THANH BỘ LỌC ĐA CHỌN TICK CHỌN: BƯU CỤC, THÁNG, TUẦN, NGÀY */}
      <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-750/60 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Bộ Lọc Đa Chọn: Bưu Cục, Tháng, Tuần &amp; Ngày Vận Hành
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              (Tick chọn nhiều mục cùng lúc để đối soát)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(ca2FilterBuuCuc.length > 0 || ca2FilterMonths.length > 0 || ca2FilterWeeks.length > 0 || ca2FilterDates.length > 0) && (
              <button
                type="button"
                onClick={handleResetCa2Filter}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {/* Lọc 1: Bưu Cục */}
          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
              {ca2FilterBuuCuc.length > 0 && (
                <span className="ml-1 text-[10px] text-orange-600 font-bold">({ca2FilterBuuCuc.length} BC)</span>
              )}
            </label>
            <IndividualFilterDropdown
              label="bưu cục"
              compact={true}
              icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
              options={buuCucOptions}
              selectedValues={ca2FilterBuuCuc}
              onChange={setCa2FilterBuuCuc}
              searchPlaceholder="Tìm bưu cục..."
              minWidth="w-52"
            />
          </div>

          {/* Lọc 2: Tháng */}
          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
              {ca2FilterMonths.length > 0 && (
                <span className="ml-1 text-[10px] text-emerald-600 font-bold">({ca2FilterMonths.length} tháng)</span>
              )}
            </label>
            <IndividualFilterDropdown
              label="tháng"
              compact={true}
              icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
              options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
              selectedValues={ca2FilterMonths}
              onChange={setCa2FilterMonths}
              searchPlaceholder="Tìm tháng..."
              minWidth="w-52"
            />
          </div>

          {/* Lọc 3: Tuần */}
          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-500" /> Tuần:
              {ca2FilterWeeks.length > 0 && (
                <span className="ml-1 text-[10px] text-purple-600 font-bold">({ca2FilterWeeks.length} tuần)</span>
              )}
            </label>
            <IndividualFilterDropdown
              label="tuần"
              compact={true}
              icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
              options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
              selectedValues={ca2FilterWeeks}
              onChange={setCa2FilterWeeks}
              searchPlaceholder="Tìm tuần..."
              minWidth="w-52"
            />
          </div>

          {/* Lọc 4: Ngày */}
          <div>
            <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
              {ca2FilterDates.length > 0 && (
                <span className="ml-1 text-[10px] text-rose-600 font-bold">({ca2FilterDates.length} ngày)</span>
              )}
            </label>
            <IndividualFilterDropdown
              label="ngày"
              compact={true}
              icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
              options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
              selectedValues={ca2FilterDates}
              onChange={setCa2FilterDates}
              searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
              minWidth="w-52"
            />
          </div>
        </div>
      </div>

      {/* 3. BỘ 4 THẺ KPI ĐƯỢC THU GỌN - THỨ TỰ: VOL CA 2 -> PHỦ SÓNG -> ĐI CA 2 -> CHỈ ĐI 1 CA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Volume Hàng Mới Ca 2 (Lên vị trí đầu tiên) */}
        <div 
          onClick={() => {
            const el = document.getElementById('section-ca2-matrix-chart');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="group py-2.5 px-3 rounded-xl bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800/60 shadow-2xs hover:shadow-lg hover:scale-[1.02] hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200 cursor-pointer relative overflow-hidden"
          title="Bấm để xem Biểu Đồ Ma Trận Vận Hành Ca 2"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-200">
            <span className="group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">Volume Hàng Mới Ca 2</span>
            <Truck className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-300 my-0.5">
            {ca2TopKpiStats.volumeCa2.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Gán: <strong className="text-slate-700 dark:text-slate-200">{ca2TopKpiStats.sldGanCa2.toLocaleString('vi-VN')}</strong></span>
            <span>GTC: <strong className="text-purple-700 dark:text-purple-300 font-black">{ca2TopKpiStats.overallRateGtcCa2.toFixed(1)}%</strong> ({ca2TopKpiStats.sldGtcCa2.toLocaleString('vi-VN')} đ)</span>
          </div>
        </div>

        {/* Card 2: Tỷ Lệ Phủ Sóng Ca 2 (Vị trí thứ hai) */}
        <div 
          onClick={() => {
            const el = document.getElementById('section-ca2-summary-table');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="group py-2.5 px-3 rounded-xl bg-gradient-to-br from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs hover:shadow-lg hover:scale-[1.02] hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer relative overflow-hidden"
          title="Bấm để xem Bảng Tổng Hợp Độ Phủ Ca 2 Theo Bưu Cục"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
            <span className="group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">Tỷ Lệ Phủ Sóng Ca 2</span>
            <Zap className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 my-0.5">
            {ca2TopKpiStats.overallRateCa2.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Đạt chuẩn 2 chuyến:</span>
            <strong className="text-indigo-700 dark:text-indigo-300 font-bold">
              {ca2TopKpiStats.ca2Shifts.toLocaleString('vi-VN')} / {ca2TopKpiStats.totalShifts.toLocaleString('vi-VN')} ca
            </strong>
          </div>
          <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 h-1 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(ca2TopKpiStats.overallRateCa2, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Bưu Tá Đi Ca 2 (2 Chuyến) (Vị trí thứ ba) */}
        <div 
          onClick={() => {
            setCa2FilterStatus('ca2');
            const el = document.getElementById('section-ca2-details-table') || document.getElementById('section-ca2-daily');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="group py-2.5 px-3 rounded-xl bg-gradient-to-br from-emerald-50/90 to-teal-50/90 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs hover:shadow-lg hover:scale-[1.02] hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-200 cursor-pointer relative overflow-hidden"
          title="Bấm để lọc danh sách bưu tá Có Đi Ca 2"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
            <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">Bưu Tá Đi Ca 2 (2 Chuyến)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 my-0.5">
            {ca2TopKpiStats.ca2Shifts.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Lực lượng nòng cốt:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">Đã kích hoạt ca chiều/tối</span>
          </div>
        </div>

        {/* Card 4: Chỉ Đi 1 Ca (Cần Thúc Đẩy) (Vị trí thứ tư) */}
        <div 
          onClick={() => {
            setCa2FilterStatus('ca1');
            const el = document.getElementById('section-ca2-details-table') || document.getElementById('section-ca2-daily');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="group py-2.5 px-3 rounded-xl bg-gradient-to-br from-amber-50/90 to-orange-50/90 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 shadow-2xs hover:shadow-lg hover:scale-[1.02] hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200 cursor-pointer relative overflow-hidden"
          title="Bấm để lọc danh sách bưu tá Chỉ Đi 1 Ca (Cần thúc đẩy)"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
            <span className="group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">Chỉ Đi 1 Ca (Cần Thúc Đẩy)</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 my-0.5">
            {ca2TopKpiStats.ca1Shifts.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Dư địa năng suất:</span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">
              {((ca2TopKpiStats.ca1Shifts / (ca2TopKpiStats.totalShifts || 1)) * 100).toFixed(1)}% chưa ra ca 2
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BIỂU ĐỒ MA TRẬN VẬN HÀNH CA 2: VOLUME, GÁN, %GTC & MỨC ĐỘ CHÊNH LỆCH GÁN VS VOL (THU GỌN) */}
      {/* ========================================================================= */}
      <div id="section-ca2-matrix-chart" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-2 sm:p-2.5 space-y-2 scroll-mt-16">
        {/* Header Biểu Đồ & Chế Độ Xem (Thu gọn) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Biểu Đồ Ma Trận Vận Hành Ca 2: Volume, Gán, %GTC &amp; Chênh Lệch Gán vs Vol
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                Phân Tích Chiều Sâu Hàng Mới Ca 2
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Đối chiếu trực quan giữa <strong>Volume Ca 2</strong> (sản lượng nhập), <strong>SLĐ Gán</strong> (xuất tuyến), <strong>% GTC</strong> và <strong>Độ Chênh Lệch (Vol - Gán)</strong> để kiểm soát dồn ứ tồn sàn chia chọn
            </p>
          </div>

          {/* Chế độ xem: Theo Ngày hoặc Theo 5 Bưu Cục */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-md text-[10.5px] font-semibold">
              <button
                type="button"
                onClick={() => setMatrixCa2ViewMode('by_date')}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 text-[10.5px] ${
                  matrixCa2ViewMode === 'by_date'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Xem biến động Volume, Gán, GTC và Chênh lệch theo từng ngày"
              >
                <Calendar className="w-3 h-3" />
                <span>Theo Ngày ({matrixCa2Data.dateList.length} ngày)</span>
              </button>
              <button
                type="button"
                onClick={() => setMatrixCa2ViewMode('by_buu_cuc')}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 text-[10.5px] ${
                  matrixCa2ViewMode === 'by_buu_cuc'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Xem so sánh mức độ chênh lệch Gán vs Vol của 5 bưu cục"
              >
                <Building2 className="w-3 h-3" />
                <span>Theo 5 Bưu Cục</span>
              </button>
            </div>

            {/* Nút chọn nhanh ngày */}
            {matrixCa2ViewMode === 'by_date' && (
              <div className="hidden sm:flex items-center gap-1 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => handleQuickSetMatrixCa2Dates(7)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-[10px]"
                >
                  7 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSetMatrixCa2Dates(14)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-[10px]"
                >
                  14 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSetMatrixCa2Dates('all')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-[10px]"
                >
                  Tất cả
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BỘ LỌC ĐA CHỌN CỦA BIỂU ĐỒ: TICK CHỌN BƯU CỤC, THÁNG, TUẦN, NGÀY THEO Ý (Thu gọn) */}
        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/80 dark:bg-slate-750/60 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/80 dark:border-slate-700/80 pb-1">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Bộ Lọc Biểu Đồ Ma Trận Ca 2: Bưu Cục, Tháng, Tuần &amp; Ngày
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(matrixCa2FilterBuuCuc.length > 0 || matrixCa2FilterMonths.length > 0 || matrixCa2FilterWeeks.length > 0 || matrixCa2FilterDates.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetMatrixCa2Filter}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10.5px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                  title="Đặt lại toàn bộ bộ lọc biểu đồ"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {/* Lọc Bưu Cục */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                {matrixCa2FilterBuuCuc.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-orange-600 font-bold">({matrixCa2FilterBuuCuc.length} BC)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="bưu cục"
                compact={true}
                icon={<Building2 className="w-3 h-3 text-orange-600" />}
                options={buuCucOptions}
                selectedValues={matrixCa2FilterBuuCuc}
                onChange={setMatrixCa2FilterBuuCuc}
                searchPlaceholder="Tìm bưu cục..."
                minWidth="w-52"
              />
            </div>

            {/* Lọc Tháng */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                {matrixCa2FilterMonths.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-emerald-600 font-bold">({matrixCa2FilterMonths.length} tháng)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="tháng"
                compact={true}
                icon={<Calendar className="w-3 h-3 text-emerald-600" />}
                options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                selectedValues={matrixCa2FilterMonths}
                onChange={setMatrixCa2FilterMonths}
                searchPlaceholder="Tìm tháng..."
                minWidth="w-52"
              />
            </div>

            {/* Lọc Tuần */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                {matrixCa2FilterWeeks.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-purple-600 font-bold">({matrixCa2FilterWeeks.length} tuần)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="tuần"
                compact={true}
                icon={<Clock className="w-3 h-3 text-purple-600" />}
                options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                selectedValues={matrixCa2FilterWeeks}
                onChange={setMatrixCa2FilterWeeks}
                searchPlaceholder="Tìm tuần..."
                minWidth="w-52"
              />
            </div>

            {/* Lọc Ngày */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                {matrixCa2FilterDates.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-rose-600 font-bold">({matrixCa2FilterDates.length} ngày)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="ngày"
                compact={true}
                icon={<Calendar className="w-3 h-3 text-rose-600" />}
                options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                selectedValues={matrixCa2FilterDates}
                onChange={setMatrixCa2FilterDates}
                searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                minWidth="w-52"
              />
            </div>
          </div>
        </div>

        {/* 4 THẺ CHỈ SỐ TỔNG QUAN TÁC CHIẾN CỦA BIỂU ĐỒ - CÓ THỂ NHẤN ĐỂ ĐIỀU HƯỚNG & ĐỐI SOÁT CHI TIẾT BẢNG */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          {/* Card 1: Volume Nhập Ca 2 */}
          <button
            type="button"
            onClick={() => handleSelectCa2Kpi('volume')}
            className={`p-1.5 sm:p-2 rounded-lg text-left transition-all duration-200 cursor-pointer border group ${
              activeCa2KpiFocus === 'volume'
                ? 'bg-indigo-50/95 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500 shadow-md scale-[1.01]'
                : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-2xs'
            }`}
            title="Nhấn để xem chi tiết cột Volume Nhập Ca 2 tại bảng bên dưới"
          >
            <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              <span>Volume Nhập Ca 2</span>
              <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeCa2KpiFocus === 'volume' ? 'bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900 animate-pulse' : 'bg-indigo-500'}`} />
            </div>
            <div className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300 mt-0.2">
              {matrixCa2Data.totalVol.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] mt-0.2">
              <span className="text-slate-400">Tổng sản lượng ca</span>
              <span className={`font-semibold flex items-center gap-0.5 transition-colors ${activeCa2KpiFocus === 'volume' ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                {activeCa2KpiFocus === 'volume' ? 'Đang xem ↓' : 'Xem bảng →'}
              </span>
            </div>
          </button>

          {/* Card 2: SLĐ Đã Gán Ra Tuyến */}
          <button
            type="button"
            onClick={() => handleSelectCa2Kpi('gan')}
            className={`p-1.5 sm:p-2 rounded-lg text-left transition-all duration-200 cursor-pointer border group ${
              activeCa2KpiFocus === 'gan'
                ? 'bg-orange-50/95 dark:bg-orange-950/70 border-orange-500 ring-2 ring-orange-500 shadow-md scale-[1.01]'
                : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-2xs'
            }`}
            title="Nhấn để xem chi tiết cột SLĐ Đã Gán Ra Tuyến tại bảng bên dưới"
          >
            <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              <span>SLĐ Đã Gán Ra Tuyến</span>
              <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeCa2KpiFocus === 'gan' ? 'bg-orange-600 ring-2 ring-orange-200 dark:ring-orange-900 animate-pulse' : 'bg-orange-500'}`} />
            </div>
            <div className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 mt-0.2">
              {matrixCa2Data.totalGan.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.2">
              <span>Gán: <strong className="text-orange-600">{matrixCa2Data.avgRateGan}%</strong> Vol</span>
              <span className={`font-semibold flex items-center gap-0.5 transition-colors ${activeCa2KpiFocus === 'gan' ? 'text-orange-700 dark:text-orange-300 font-bold' : 'text-slate-400 group-hover:text-orange-600'}`}>
                {activeCa2KpiFocus === 'gan' ? 'Đang xem ↓' : 'Xem bảng →'}
              </span>
            </div>
          </button>

          {/* Card 3: Chênh Lệch (Chưa Gán) */}
          <button
            type="button"
            onClick={() => handleSelectCa2Kpi('gap')}
            className={`p-1.5 sm:p-2 rounded-lg text-left transition-all duration-200 cursor-pointer border group ${
              activeCa2KpiFocus === 'gap'
                ? 'bg-rose-100/95 dark:bg-rose-950/80 border-rose-500 ring-2 ring-rose-500 shadow-md scale-[1.01]'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 hover:border-rose-400 hover:shadow-2xs'
            }`}
            title="Nhấn để xem chi tiết Tồn Đọng & Chênh Lệch tại bảng bên dưới (tự động ưu tiên bưu cục dồn ứ lên trên)"
          >
            <div className="flex items-center justify-between text-[9.5px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              <span>Chênh Lệch (Chưa Gán)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <div className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 mt-0.2">
              {matrixCa2Data.totalGap.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] text-rose-700 dark:text-rose-400 font-bold mt-0.2">
              <span>{matrixCa2Data.avgRateGap}% ứ sàn</span>
              <span className="flex items-center gap-0.5 underline">
                {activeCa2KpiFocus === 'gap' ? 'Đang xem ↓' : 'Xem bảng →'}
              </span>
            </div>
          </button>

          {/* Card 4: Giao Thành Công (GTC) */}
          <button
            type="button"
            onClick={() => handleSelectCa2Kpi('gtc')}
            className={`p-1.5 sm:p-2 rounded-lg text-left transition-all duration-200 cursor-pointer border group ${
              activeCa2KpiFocus === 'gtc'
                ? 'bg-emerald-100/95 dark:bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500 shadow-md scale-[1.01]'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 hover:shadow-2xs'
            }`}
            title="Nhấn để xem chi tiết Giao Thành Công & % GTC tại bảng bên dưới"
          >
            <div className="flex items-center justify-between text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              <span>Giao Thành Công (GTC)</span>
              <span className={`w-1.5 h-1.5 rounded-full transition-all ${activeCa2KpiFocus === 'gtc' ? 'bg-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-900 animate-pulse' : 'bg-emerald-500'}`} />
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.2">
              {matrixCa2Data.totalGtc.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.2">
              <span>Đạt {matrixCa2Data.avgRateGtc}% trên gán</span>
              <span className="flex items-center gap-0.5">
                {activeCa2KpiFocus === 'gtc' ? 'Đang xem ↓' : 'Xem bảng →'}
              </span>
            </div>
          </button>
        </div>

        {/* KHUNG BIỂU ĐỒ RECHARTS COMPOSED CHART */}
        <div className="bg-slate-50/50 dark:bg-slate-750/30 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10.5px] sm:text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                {matrixCa2ViewMode === 'by_date' ? 'Diễn Biến Volume, Gán, GTC & Mức Độ Chênh Lệch Qua Các Ngày' : 'So Sánh Sức Chứa Volume, Gán & Tỷ Lệ Giải Phóng Hàng Giữa 5 Bưu Cục'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                Mục tiêu ca: Độ phủ NV ≥ 70% • Tỷ lệ gán ≥ 50% Vol
              </span>
            </div>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
              {matrixCa2ViewMode === 'by_date' ? 'Hiển thị: Từ ngày gần nhất đến xa nhất • ' : ''}
              Trục trái: Đơn &bull; Trục phải: % Tỷ lệ
            </span>
          </div>

          <div className="h-52 sm:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={matrixCa2ViewMode === 'by_date' ? matrixCa2Data.dateList : matrixCa2Data.buuCucList}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.15} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11, fontWeight: 700 }}
                />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `${v}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  unit="%" 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    const isPassCoverage = (d.rateCoverage || 0) >= 70;
                    const isPassGan = (d.rateGan || 0) >= 50;

                    return (
                      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 min-w-[285px]">
                        <div className="border-b border-slate-100 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {d.fullTitle}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Hàng Mới Ca 2
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
                              Volume Nhập Ca 2:
                            </span>
                            <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">{d.volume.toLocaleString('vi-VN')} đơn</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block" />
                              SLĐ Đã Gán Ra Tuyến:
                            </span>
                            <strong className="font-mono text-orange-600 dark:text-orange-400 text-xs">{d.sldGan.toLocaleString('vi-VN')} đơn</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                              SLĐ GTC Ca 2:
                            </span>
                            <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-xs">{d.sldGTC.toLocaleString('vi-VN')} đơn</strong>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-1.5 bg-rose-50/60 dark:bg-rose-950/30 p-1.5 rounded">
                            <span className="text-rose-700 dark:text-rose-300 font-bold">
                              Chênh Lệch Chưa Gán:
                            </span>
                            <strong className="font-mono text-rose-600 dark:text-rose-400 font-black text-xs">
                              {d.gapDon.toLocaleString('vi-VN')} đơn ({d.rateGap}% Vol)
                            </strong>
                          </div>

                          {/* ĐỐI SOÁT MỤC TIÊU VẬN HÀNH CA 2 */}
                          <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                Độ Phủ NV Giao Ca 2:
                              </span>
                              <span className="flex items-center gap-1.5">
                                <strong className={`font-mono text-xs font-black ${isPassCoverage ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {d.rateCoverage}%
                                </strong>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${isPassCoverage ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                  {isPassCoverage ? '≥70% Đạt' : '<70% Chưa đạt'}
                                </span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                Tỷ Lệ Gán / Vol:
                              </span>
                              <span className="flex items-center gap-1.5">
                                <strong className={`font-mono text-xs font-black ${isPassGan ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {d.rateGan}%
                                </strong>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${isPassGan ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                  {isPassGan ? '≥50% Đạt' : '<50% Chưa đạt'}
                                </span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                % GTC / Đơn Gán:
                              </span>
                              <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                {d.rateGtc}%
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                  formatter={(val) => <span className="text-slate-700 dark:text-slate-200 font-semibold">{val}</span>}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="volume" 
                  name="Volume Nhập Ca 2" 
                  fill="#6366F1" 
                  radius={[2, 2, 0, 0]} 
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="sldGan" 
                  name="SLĐ Gán Xuất Tuyến" 
                  fill="#F97316" 
                  radius={[2, 2, 0, 0]} 
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="sldGTC" 
                  name="SLĐ GTC Ca 2" 
                  fill="#10B981" 
                  radius={[2, 2, 0, 0]} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="rateCoverage" 
                  name="Độ Phủ NV Giao Ca 2 (%)" 
                  stroke="#4F46E5" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#4F46E5', stroke: '#fff', strokeWidth: 1 }} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="rateGan" 
                  name="Tỷ Lệ Gán / Vol (%)" 
                  stroke="#F97316" 
                  strokeWidth={2.5} 
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: '#F97316', stroke: '#fff', strokeWidth: 1 }} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="rateGtc" 
                  name="% GTC Ca 2 (%)" 
                  stroke="#059669" 
                  strokeWidth={2} 
                  strokeDasharray="3 3"
                  dot={{ r: 2.5, fill: '#059669', stroke: '#fff', strokeWidth: 1 }} 
                />
                {/* ĐƯỜNG MỤC TIÊU VẬN HÀNH CA 2: ĐỘ PHỦ NV >= 70% & TỶ LỆ GÁN >= 50% */}
                <ReferenceLine 
                  yAxisId="right" 
                  y={70} 
                  stroke="#4F46E5" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ value: 'Mục tiêu Độ phủ NV ≥70%', position: 'insideTopRight', fill: '#4338CA', fontSize: 9.5, fontWeight: 800 }}
                />
                <ReferenceLine 
                  yAxisId="right" 
                  y={50} 
                  stroke="#EA580C" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ value: 'Mục tiêu Tỷ lệ Gán ≥50%', position: 'insideBottomRight', fill: '#C2410C', fontSize: 9.5, fontWeight: 800 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KHỐI NHẬN ĐỊNH VẬN HÀNH THỰC TẾ & HƯỚNG XỬ LÝ ĐIỂM NGHẼN CHÊNH LỆCH */}
        <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-lg p-2 sm:p-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400 text-[11px] uppercase tracking-wide">
            <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Đánh Giá Thực Trạng &amp; Hướng Thúc Đẩy Mức Độ Chênh Lệch Gán vs Vol</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10.5px] leading-relaxed">
            <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-md border border-indigo-100 dark:border-indigo-950 shadow-2xs space-y-0.5">
              <div className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                <ShieldAlert className="w-3 h-3 shrink-0 text-indigo-600" />
                <span>Điểm Nghẽn Kho Trưa: Chênh Lệch {matrixCa2Data.totalGap.toLocaleString('vi-VN')} Đơn</span>
              </div>
              <p>
                Mức độ chênh lệch giữa Volume nhập và Gán lên tới <strong>{matrixCa2Data.avgRateGap}%</strong> ({matrixCa2Data.totalGap.toLocaleString('vi-VN')} đơn chưa được gán ra tuyến). Căn nguyên do xe tải trưa về kho nhưng đội ngũ chia chọn trễ, làm lỡ khung giờ xuất bến 14h30 của bưu tá chuyến 2.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-md border border-amber-100 dark:border-amber-950 shadow-2xs space-y-0.5">
              <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                <span>Điểm Thắt Lớn Nhất: {matrixCa2Data.worstBc ? matrixCa2Data.worstBc.shortName : 'Bưu cục trọng điểm'}</span>
              </div>
              <p>
                {matrixCa2Data.worstBc ? (
                  <>
                    <strong>{matrixCa2Data.worstBc.shortName}</strong> đang có độ chênh lệch lớn nhất với <strong>{matrixCa2Data.worstBc.gapDon.toLocaleString('vi-VN')} đơn chưa gán</strong> ({matrixCa2Data.worstBc.rateGap}% Volume). Tỷ lệ gán chỉ đạt {matrixCa2Data.worstBc.rateGan}%, gây dồn ứ hàng sang ca sáng hôm sau.
                  </>
                ) : (
                  'Các bưu cục trọng điểm cần siết chặt tỷ lệ gán đơn ca 2.'
                )}
              </p>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-md border border-emerald-100 dark:border-emerald-950 shadow-2xs space-y-0.5">
              <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                <span>Giải Pháp Hành Động AM Huy</span>
              </div>
              <p>
                Chỉ đạo Trưởng bưu cục hoàn tất chia tuyến trước <strong>14h00</strong>; bám sát mục tiêu <strong>Độ phủ NV giao Ca 2 &ge; 70%</strong> và <strong>Tỷ lệ gán &ge; 50% Volume</strong>; bổ sung cơ chế tính hoa hồng hấp dẫn cho các kiện giao hoàn tất trong khung giờ 16h00 - 19h00.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BẢNG TỔNG HỢP CHỈ SỐ VẬN HÀNH & ĐỘ PHỦ CA 2 THEO BƯU CỤC (LÀM NỔI TIÊU ĐỀ & CÓ BỘ LỌC ĐA CHỌN) */}
      <div id="section-ca2-summary-table" className="space-y-2.5 scroll-mt-20">
        {/* TIÊU ĐỀ BẢNG LÀM NỔI BẬT VỚI GRADIENT BANNER & ICON (THU GỌN THANH LỊCH) */}
        <div className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-700 text-white shadow-xs flex flex-wrap items-center justify-between gap-1.5 border border-orange-400/30">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white/20 backdrop-blur-md rounded text-white shadow-inner shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-[13px] font-black tracking-wide uppercase">
                  BẢNG TỔNG HỢP CHỈ SỐ VẬN HÀNH HÀNG MỚI CA 2 &amp; ĐỘ PHỦ THEO BƯU CỤC
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-white/25 text-white backdrop-blur-sm border border-white/30 uppercase tracking-wider">
                  5 Bưu Cục Khu Vực
                </span>
              </div>
              <p className="text-[10px] text-orange-100 font-normal mt-0.2 hidden sm:block">
                Chỉ số Volume, Gán, GTC, Tồn đọng được đối soát trực tiếp từ <strong>Hàng Mới Ca 2</strong> &bull; Đánh giá tỷ lệ phủ sóng bưu tá và năng lực giải phóng đơn ca chiều/tối
              </p>
            </div>
          </div>

          {/* Trạng thái xem tiêu chí Focus từ 4 Thẻ KPI */}
          {activeCa2KpiFocus !== 'all' && (
            <div className="shrink-0 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded border border-white/30">
              <Sparkles className="w-3 h-3 text-amber-200 animate-spin" />
              <span className="text-[10px] font-bold">
                Đang tập trung cột:{' '}
                {activeCa2KpiFocus === 'volume' ? 'Volume Nhập Ca 2' :
                 activeCa2KpiFocus === 'gan' ? 'SLĐ Gán Ra Tuyến' :
                 activeCa2KpiFocus === 'gap' ? 'Chênh Lệch / Tồn Ca 2' : 'Giao Thành Công (GTC)'}
              </span>
              <button
                type="button"
                onClick={() => setActiveCa2KpiFocus('all')}
                className="ml-1 text-[9.5px] underline hover:text-orange-200 cursor-pointer font-bold"
              >
                (Xem tất cả)
              </button>
            </div>
          )}
        </div>

        {/* BỘ LỌC ĐA CHỌN RIÊNG BIỆT CHO BẢNG: TICK CHỌN BƯU CỤC, THÁNG, TUẦN, NGÀY THEO Ý (Thu gọn) */}
        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/80 dark:border-slate-700/80 pb-1">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-orange-600" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Bộ Lọc Bảng Tổng Hợp Ca 2: Bưu Cục, Tháng, Tuần &amp; Ngày Theo Ý
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                (Tick chọn đa tiêu chí để đối soát)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickSetTableCa2Dates(7)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-[10px]"
                >
                  7 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSetTableCa2Dates(14)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-[10px]"
                >
                  14 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSetTableCa2Dates('all')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-[10px]"
                >
                  Tất cả
                </button>
              </div>

              {(tableCa2FilterBuuCuc.length > 0 || tableCa2FilterMonths.length > 0 || tableCa2FilterWeeks.length > 0 || tableCa2FilterDates.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetTableCa2Filter}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10.5px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                  title="Đặt lại toàn bộ bộ lọc bảng"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {/* Lọc Bưu Cục */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                {tableCa2FilterBuuCuc.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-orange-600 font-bold">({tableCa2FilterBuuCuc.length} BC)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="bưu cục"
                compact={true}
                icon={<Building2 className="w-3 h-3 text-orange-600" />}
                options={buuCucOptions}
                selectedValues={tableCa2FilterBuuCuc}
                onChange={setTableCa2FilterBuuCuc}
                searchPlaceholder="Tìm bưu cục..."
                minWidth="w-52"
              />
            </div>

            {/* Lọc Tháng */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                {tableCa2FilterMonths.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-emerald-600 font-bold">({tableCa2FilterMonths.length} tháng)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="tháng"
                compact={true}
                icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                selectedValues={tableCa2FilterMonths}
                onChange={setTableCa2FilterMonths}
                searchPlaceholder="Tìm tháng..."
                minWidth="w-52"
              />
            </div>

            {/* Lọc Tuần */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                {tableCa2FilterWeeks.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-purple-600 font-bold">({tableCa2FilterWeeks.length} tuần)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="tuần"
                compact={true}
                icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                selectedValues={tableCa2FilterWeeks}
                onChange={setTableCa2FilterWeeks}
                searchPlaceholder="Tìm tuần..."
                minWidth="w-52"
              />
            </div>

            {/* Lọc Ngày */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                {tableCa2FilterDates.length > 0 && (
                  <span className="ml-1 text-[9.5px] text-rose-600 font-bold">({tableCa2FilterDates.length} ngày)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="ngày"
                compact={true}
                icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                selectedValues={tableCa2FilterDates}
                onChange={setTableCa2FilterDates}
                searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                minWidth="w-52"
              />
            </div>
          </div>
        </div>

        {/* BẢNG SỐ LIỆU ĐƯỢC CĂN GIỮA TIÊU ĐỀ & TOÀN BỘ SỐ LIỆU */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-1.5 px-2 text-center">Bưu Cục</th>
                <th className="py-1.5 px-1.5 text-center" title="Số lượng nhân viên có chuyến đi trong ca">SL NV có CĐ</th>
                <th className={`py-1.5 px-1.5 text-center transition-colors ${activeCa2KpiFocus === 'gan' ? 'bg-orange-200 dark:bg-orange-900/60 text-orange-950 dark:text-orange-100 font-black ring-1 ring-orange-500' : ''}`} title="Số lượng nhân viên được gán đi ca 2 (2 chuyến/ngày)">
                  SL NV gán Ca 2
                </th>
                <th className="py-1.5 px-1.5 text-center">Độ Phủ Ca 2</th>
                <th className="py-1.5 px-1.5 text-center">Chỉ Đi 1 Ca</th>
                <th className={`py-1.5 px-2 text-center transition-all bg-indigo-600 text-white font-black text-[11px] tracking-wide shadow-xs border-x border-indigo-500 ${activeCa2KpiFocus === 'volume' ? 'ring-2 ring-indigo-300' : ''}`} title="Tổng Volume nhập hàng mới ca chiều/tối">
                  Vol Ca 2
                </th>
                <th className={`py-1.5 px-2 text-center transition-all bg-orange-500 text-white font-black text-[11px] tracking-wide shadow-xs border-x border-orange-400 ${activeCa2KpiFocus === 'gan' ? 'ring-2 ring-orange-200' : ''}`} title="Số lượng đơn hàng mới đã gán xuất tuyến ca 2 & Tỷ lệ gán trên Volume">
                  Gán Ca 2
                </th>
                <th className="py-1.5 px-1.5 text-center bg-emerald-700 text-white font-black text-[11px] tracking-wide border-x border-emerald-600">
                  GTC Ca 2
                </th>
                <th className={`py-1.5 px-2 text-center transition-all bg-emerald-600 text-white font-black text-[11px] tracking-wide shadow-xs border-x border-emerald-500 ${activeCa2KpiFocus === 'gtc' ? 'ring-2 ring-emerald-200' : ''}`} title="Tỷ lệ Giao Thành Công trên số đơn đã gán ca 2">
                  %GTC Ca 2
                </th>
                <th className={`py-1.5 px-1.5 text-center transition-colors ${activeCa2KpiFocus === 'gap' ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-950 dark:text-rose-100 font-black ring-1 ring-rose-500' : 'bg-orange-50/70 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200'}`}>
                  Tồn Ca 2
                </th>
                <th className="py-1.5 px-2.5 text-center w-64">Đánh Giá &amp; Hướng Thúc Đẩy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80 text-[11px]">
              {ca2SummaryByBuuCuc.rows.map((row) => (
                <tr key={row.buuCuc} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                  <td className="py-1.5 px-2 text-center font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1">
                      <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
                      <span>{row.buuCuc}</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 text-center font-bold text-slate-800 dark:text-slate-200">
                    {row.totalShifts.toLocaleString('vi-VN')}
                  </td>
                  <td className={`py-1.5 px-1.5 text-center font-black transition-colors ${
                    activeCa2KpiFocus === 'gan'
                      ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {row.ca2Shifts.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded-full text-[10.5px] font-black ${
                      row.rateCa2 >= 70
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : row.rateCa2 >= 55
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {row.rateCa2.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center font-bold text-amber-600 dark:text-amber-400">
                    {row.ca1Shifts.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-1.5 px-2 text-center font-black text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 border-x border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-xs">{row.volumeCa2.toLocaleString('vi-VN')}</span>
                  </td>
                  <td className="py-1.5 px-2 text-center font-black text-xs text-orange-700 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/40 border-x border-orange-100 dark:border-orange-900/50">
                    <span className="text-xs">{row.sldGanCa2.toLocaleString('vi-VN')}</span>
                    <span className="block text-[9.5px] text-orange-600 dark:text-orange-400 font-bold mt-0.2">
                      ({row.rateGanCa2.toFixed(1)}% Vol)
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900/50">
                    {row.sldGtcCa2.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-1.5 px-2 text-center bg-emerald-50/90 dark:bg-emerald-950/40 border-x border-emerald-100 dark:border-emerald-900/50">
                    <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] shadow-2xs ${
                      row.rateGtcCa2 >= 85
                        ? 'bg-emerald-600 text-white'
                        : row.rateGtcCa2 >= 70
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {row.rateGtcCa2.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-1.5 px-1.5 text-center font-black transition-colors ${
                    activeCa2KpiFocus === 'gap'
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-black ring-1 ring-rose-400'
                      : 'text-rose-600 dark:text-rose-400 bg-orange-50/40 dark:bg-orange-950/10'
                  }`}>
                    {row.tonDongCa2.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-1.5 px-2 text-left">
                    {row.statusLevel === 'alert' ? (
                      <div className="p-1.5 rounded-md bg-rose-100/90 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-100 shadow-2xs">
                        <div className="flex items-center gap-1 font-black text-[10px] text-rose-700 dark:text-rose-300 mb-0.2">
                          <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{row.evalBadge}</span>
                        </div>
                        <div className="text-[10px] font-bold leading-tight">{row.recommendation}</div>
                      </div>
                    ) : row.statusLevel === 'warning' ? (
                      <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100">
                        <div className="flex items-center gap-1 font-bold text-[10px] text-amber-700 dark:text-amber-300 mb-0.2">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{row.evalBadge}</span>
                        </div>
                        <div className="text-[10px] leading-tight font-medium">{row.recommendation}</div>
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100">
                        <div className="flex items-center gap-1 font-bold text-[10px] text-emerald-700 dark:text-emerald-300 mb-0.2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{row.evalBadge}</span>
                        </div>
                        <div className="text-[10px] leading-tight font-medium">{row.recommendation}</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-750 font-black border-t-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 text-[11px]">
              <tr>
                <td className="py-2 px-2 text-center uppercase tracking-wider text-orange-600 dark:text-orange-400 font-black">
                  TOÀN KHU VỰC
                </td>
                <td className="py-2 px-1.5 text-center font-black">
                  {ca2SummaryByBuuCuc.totalAll.totalShifts.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-1.5 text-center font-black text-emerald-600 dark:text-emerald-400">
                  {ca2SummaryByBuuCuc.totalAll.ca2Shifts.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-1.5 text-center">
                  <span className="inline-block px-2 py-0.2 rounded-full text-[10.5px] font-black bg-indigo-600 text-white shadow-2xs">
                    {ca2SummaryByBuuCuc.totalAll.overallRateCa2.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 px-1.5 text-center font-black text-amber-600 dark:text-amber-400">
                  {ca2SummaryByBuuCuc.totalAll.ca1Shifts.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-2 text-center font-black bg-indigo-600 text-white border-x border-indigo-700">
                  <span className="text-xs">{ca2SummaryByBuuCuc.totalAll.volumeCa2.toLocaleString('vi-VN')}</span>
                </td>
                <td className="py-2 px-2 text-center font-black bg-orange-500 text-white border-x border-orange-600">
                  <span className="text-xs">{ca2SummaryByBuuCuc.totalAll.sldGanCa2.toLocaleString('vi-VN')}</span>
                  <span className="block text-[9.5px] text-orange-100 font-bold mt-0.2">
                    ({((ca2SummaryByBuuCuc.totalAll.sldGanCa2 / (ca2SummaryByBuuCuc.totalAll.volumeCa2 || 1)) * 100).toFixed(1)}% Vol)
                  </span>
                </td>
                <td className="py-2 px-1.5 text-center font-black text-emerald-600 dark:text-emerald-400 bg-orange-100/70 dark:bg-orange-950/40">
                  {ca2SummaryByBuuCuc.totalAll.sldGtcCa2.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-2 text-center font-black bg-emerald-600 text-white border-x border-emerald-700">
                  <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10.5px]">
                    {ca2SummaryByBuuCuc.totalAll.overallRateGtcCa2.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center font-black text-rose-600 dark:text-rose-400 bg-orange-100/70 dark:bg-orange-950/40">
                  {ca2SummaryByBuuCuc.totalAll.tonDongCa2.toLocaleString('vi-VN')}
                </td>
                <td className="py-2.5 px-2.5 text-center text-xs font-bold">
                  <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                    Mục tiêu vận hành ca:
                  </div>
                  <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 mt-0.5 whitespace-nowrap">
                    Độ phủ NV giao Ca 2 &ge; 70% &bull; Tỷ lệ gán &ge; 50% Vol
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. BẢNG THỐNG KÊ SỐ LƯỢNG NHÂN VIÊN CHỈ ĐI CA 2 VÀ CHỈ ĐI CA 1 THEO TỪNG NGÀY */}
      <div id="section-ca2-daily" className="space-y-2.5 scroll-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Bảng Thống Kê Số Lượng Nhân Viên Đi Ca 2 &amp; Chỉ Đi Ca 1 Theo Từng Ngày
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Theo dõi biến động nhân sự ca chiều/tối qua từng ngày vận hành &bull; Kết hợp sản lượng đơn Hàng Mới Ca 2
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Hiển thị: <strong>{ca2DailyBreakdown.length}</strong> bản ghi
          </div>
        </div>

        {/* BỘ LỌC ĐA CHỌN CHO BẢNG THỐNG KÊ THEO NGÀY: BƯU CỤC, THÁNG, TUẦN, NGÀY */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/80 dark:border-slate-700/80 pb-1.5">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Bộ Lọc Thống Kê Đi Ca: Bưu Cục, Tháng, Tuần &amp; Ngày
              </span>
            </div>

            {(dailyCa2FilterBuuCuc.length > 0 || dailyCa2FilterMonths.length > 0 || dailyCa2FilterWeeks.length > 0 || dailyCa2FilterDates.length > 0) && (
              <button
                type="button"
                onClick={handleResetDailyCa2Filter}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                title="Đặt lại bộ lọc bảng thống kê đi ca"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {/* Lọc Bưu Cục */}
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                {dailyCa2FilterBuuCuc.length > 0 && (
                  <span className="ml-1 text-[10px] text-orange-600 font-bold">({dailyCa2FilterBuuCuc.length} BC)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="bưu cục"
                compact={false}
                icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
                options={buuCucOptions}
                selectedValues={dailyCa2FilterBuuCuc}
                onChange={setDailyCa2FilterBuuCuc}
                searchPlaceholder="Tìm bưu cục..."
                minWidth="w-64"
              />
            </div>

            {/* Lọc Tháng */}
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                {dailyCa2FilterMonths.length > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-600 font-bold">({dailyCa2FilterMonths.length} tháng)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="tháng"
                compact={false}
                icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                selectedValues={dailyCa2FilterMonths}
                onChange={setDailyCa2FilterMonths}
                searchPlaceholder="Tìm tháng..."
                minWidth="w-60"
              />
            </div>

            {/* Lọc Tuần */}
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                {dailyCa2FilterWeeks.length > 0 && (
                  <span className="ml-1 text-[10px] text-purple-600 font-bold">({dailyCa2FilterWeeks.length} tuần)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="tuần"
                compact={false}
                icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                selectedValues={dailyCa2FilterWeeks}
                onChange={setDailyCa2FilterWeeks}
                searchPlaceholder="Tìm tuần..."
                minWidth="w-64"
              />
            </div>

            {/* Lọc Ngày */}
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                {dailyCa2FilterDates.length > 0 && (
                  <span className="ml-1 text-[10px] text-rose-600 font-bold">({dailyCa2FilterDates.length} ngày)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="ngày"
                compact={false}
                icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                selectedValues={dailyCa2FilterDates}
                onChange={setDailyCa2FilterDates}
                searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                minWidth="w-60"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2 px-2.5 text-center">Bưu Cục</th>
                <th className="py-2 px-2.5 text-center">Ngày Vận Hành</th>
                <th className="py-2 px-2 text-center">Thứ</th>
                <th className="py-2 px-2 text-center">Tổng Bưu Tá</th>
                <th className="py-2 px-2 text-center text-emerald-700 dark:text-emerald-400">NV Đi Ca 2 (2 ch)</th>
                <th className="py-2 px-2 text-center">Tỷ Lệ Ca 2 (%)</th>
                <th className="py-2 px-2 text-center text-amber-700 dark:text-amber-400">Chỉ Đi 1 Ca (1 ch)</th>
                <th className="py-2 px-2 text-center">Tỷ Lệ 1 Ca (%)</th>
                <th className="py-2 px-2 text-center bg-indigo-600 text-white font-black text-[11px] uppercase border-x border-indigo-500 shadow-xs" title="Tổng Volume nhập hàng mới ca chiều/tối">
                  Vol Ca 2
                </th>
                <th className="py-2 px-2 text-center bg-orange-500 text-white font-black text-[11px] uppercase border-x border-orange-400 shadow-xs" title="Số lượng đơn hàng mới đã gán xuất tuyến ca 2 & Tỷ lệ gán trên Volume">
                  Gán Ca 2
                </th>
                <th className="py-2 px-2 text-center bg-emerald-700 text-white font-black text-[11px] uppercase border-x border-emerald-600">
                  GTC Ca 2
                </th>
                <th className="py-2 px-2 text-center bg-emerald-600 text-white font-black text-[11px] uppercase border-x border-emerald-500 shadow-xs" title="Tỷ lệ Giao Thành Công trên số đơn đã gán ca 2">
                  %GTC ca2
                </th>
                <th className="py-2 px-2 text-center bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 font-bold">Tồn Ca 2</th>
                <th className="py-2 px-2.5 text-center">Tình Trạng Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
              {ca2DailyBreakdown.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                  <td className="py-2 px-2.5 text-center font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{row.buuCuc.replace('(LAN) ', '')}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2.5 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {row.ngay}
                  </td>
                  <td className="py-2 px-2 text-center font-medium text-slate-500 dark:text-slate-400">
                    {row.thu}
                  </td>
                  <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200">
                    {row.totalNV}
                  </td>
                  <td className="py-2 px-2 text-center font-black text-emerald-600 dark:text-emerald-400">
                    {row.ca2NV}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] ${
                      row.rateCa2 >= 70
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : row.rateCa2 >= 55
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {row.rateCa2.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                    {row.ca1NV}
                  </td>
                  <td className="py-2 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                    {row.rateCa1.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 border-x border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[12px]">{row.volumeCa2.toLocaleString('vi-VN')}</span>
                  </td>
                  <td className="py-2 px-2 text-center font-black text-orange-700 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/40 border-x border-orange-100 dark:border-orange-900/50">
                    <span className="text-[12px]">{row.sldGanCa2.toLocaleString('vi-VN')}</span>
                    <span className="block text-[10px] text-orange-600 dark:text-orange-400 font-bold">
                      ({(row.volumeCa2 > 0 ? (row.sldGanCa2 / row.volumeCa2 * 100) : 0).toFixed(1)}% Vol)
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900/50">
                    {row.sldGtcCa2.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2 px-2 text-center bg-emerald-50/90 dark:bg-emerald-950/40 border-x border-emerald-100 dark:border-emerald-900/50">
                    <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] shadow-2xs ${
                      row.rateGtcCa2 >= 85
                        ? 'bg-emerald-600 text-white'
                        : row.rateGtcCa2 >= 70
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {row.rateGtcCa2.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20">
                    {row.tonDongCa2.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2 px-2.5 text-center">
                    {row.status === 'good' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đạt Chuẩn
                      </span>
                    ) : row.status === 'warning' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Cần Đôn Đốc
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        Báo Động Thiếu Ca
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. BẢNG CHI TIẾT THEO DÕI BƯU TÁ GIAO HÀNG CA 2 THEO NGÀY */}
      <div id="section-ca2-details-table" className="pt-1">
        <DataTable<GtcEmployeeRecord>
          columns={ca2TableColumns}
          data={ca2FilteredRecords}
          title="Bảng Chi Tiết Theo Dõi Bưu Tá Giao Hàng Ca 2 Theo Ngày"
          subtitle="Phân loại rõ: Có đi Ca 2 (2 chuyến đi/ngày) vs Chỉ đi 1 ca (1 chuyến/ngày) để quản lý, đôn đốc và khen thưởng đội ngũ"
          exportFilename="theo_doi_ca_2_nhan_vien_ghn"
          pagination={false}
          keyExtractor={(r, idx) => `ca2_${r.maNV}_${r.ngay}_${idx}`}
          maxHeight="max-h-[580px]"
          stickyHeader={true}
          noWrap={true}
          filterBar={
            <div className="space-y-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2 text-xs">
              {/* Dòng 1: Bộ Lọc Tick Chọn Bưu Cục, Tháng, Tuần, Ngày */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Lọc Bưu Cục */}
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                    {detailCa2FilterBuuCuc.length > 0 && (
                      <span className="ml-1 text-[10px] text-orange-600 font-bold">({detailCa2FilterBuuCuc.length} BC)</span>
                    )}
                  </label>
                  <IndividualFilterDropdown
                    label="bưu cục"
                    compact={false}
                    icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
                    options={buuCucOptions}
                    selectedValues={detailCa2FilterBuuCuc}
                    onChange={setDetailCa2FilterBuuCuc}
                    searchPlaceholder="Tìm bưu cục..."
                    minWidth="w-64"
                  />
                </div>

                {/* Lọc Tháng */}
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                    {detailCa2FilterMonths.length > 0 && (
                      <span className="ml-1 text-[10px] text-emerald-600 font-bold">({detailCa2FilterMonths.length} tháng)</span>
                    )}
                  </label>
                  <IndividualFilterDropdown
                    label="tháng"
                    compact={false}
                    icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                    options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                    selectedValues={detailCa2FilterMonths}
                    onChange={setDetailCa2FilterMonths}
                    searchPlaceholder="Tìm tháng..."
                    minWidth="w-60"
                  />
                </div>

                {/* Lọc Tuần */}
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                    {detailCa2FilterWeeks.length > 0 && (
                      <span className="ml-1 text-[10px] text-purple-600 font-bold">({detailCa2FilterWeeks.length} tuần)</span>
                    )}
                  </label>
                  <IndividualFilterDropdown
                    label="tuần"
                    compact={false}
                    icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                    options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                    selectedValues={detailCa2FilterWeeks}
                    onChange={setDetailCa2FilterWeeks}
                    searchPlaceholder="Tìm tuần..."
                    minWidth="w-64"
                  />
                </div>

                {/* Lọc Ngày */}
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                    {detailCa2FilterDates.length > 0 && (
                      <span className="ml-1 text-[10px] text-rose-600 font-bold">({detailCa2FilterDates.length} ngày)</span>
                    )}
                  </label>
                  <IndividualFilterDropdown
                    label="ngày"
                    compact={false}
                    icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                    options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                    selectedValues={detailCa2FilterDates}
                    onChange={setDetailCa2FilterDates}
                    searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                    minWidth="w-60"
                  />
                </div>
              </div>

              {/* Dòng 2: Trạng thái ca, Tìm kiếm & Nút Reset */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-xs">
                    Trạng Thái:
                  </span>
                  <select
                    value={ca2FilterStatus}
                    onChange={e => setCa2FilterStatus(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs cursor-pointer text-xs"
                  >
                    <option value="all">Tất cả trạng thái ca</option>
                    <option value="ca2">✓ Có đi Ca 2 (2 chuyến)</option>
                    <option value="ca1">⚠ Chỉ đi 1 ca (1 chuyến)</option>
                  </select>

                  {(detailCa2FilterBuuCuc.length > 0 || detailCa2FilterMonths.length > 0 || detailCa2FilterWeeks.length > 0 || detailCa2FilterDates.length > 0 || ca2FilterStatus !== 'all' || ca2SearchTerm) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetDetailCa2Filter();
                        setCa2FilterStatus('all');
                        setCa2SearchTerm('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs ml-1"
                      title="Đặt lại toàn bộ bộ lọc bảng chi tiết"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa lọc</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={ca2SearchTerm}
                      onChange={e => setCa2SearchTerm(e.target.value)}
                      placeholder="Tìm theo tên, mã NV..."
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg pl-7 pr-2.5 py-1 text-slate-800 dark:text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs text-xs w-48"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>

                  <span className="text-[11px] px-2 py-1 rounded font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    Hiển thị: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{ca2FilteredRecords.length.toLocaleString('vi-VN')}</strong> / {dataset.gtcNhanVien.length.toLocaleString('vi-VN')} ca
                  </span>
                </div>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};
