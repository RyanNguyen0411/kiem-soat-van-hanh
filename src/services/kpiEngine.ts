import type { 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord 
} from '../types/dashboard';

export interface OverviewKPIs {
  totalVolume: number;
  totalSldGTC: number;
  gtcRateTotal: number; // in %
  totalSldGan: number;
  assignedRateTotal: number; // in %
  returnRateTotal: number; // in %
  totalLeadtimeAvg: number;
  totalBacklog: number;
  totalGltBacklog: number;
  totalLcBacklog: number;
  urgentOverdueOrders: number; // > 120h
  totalSalary: number;
  activeEmployeesCount: number;
  activePostOfficesCount: number;
}

export interface PostOfficeSummary {
  buuCuc: string;
  volume: number;
  sldGan: number;
  sldGTC: number;
  gtcRate: number;
  assignedRate: number;
  leadtime: number;
  gltBacklog: number;
  lcBacklog: number;
  totalBacklog: number;
  totalSalary: number;
  status: 'Critical' | 'Warning' | 'Good' | 'Excellent';
}

export interface EmployeeSummary {
  maNV: string;
  tenNV: string;
  buuCuc: string;
  tongDon: number;
  tongDonGTC: number;
  gtcRate: number;
  leadtime: number;
  chuyenDi: number;
  workDays: number;
  tongLuong: number;
  status: 'Critical' | 'Warning' | 'Good' | 'Excellent';
}

export interface DailyTrendPoint {
  ngay: string;
  displayDate: string;
  volume: number;
  sldGTC: number;
  sldGan: number;
  gtcRate: number;
  giaoTinhLuong?: number;
  luongNgay?: number;
}

export function calculateOverviewKPIs(
  gtcBcList: GtcPostOfficeRecord[],
  gtcNvList: GtcEmployeeRecord[],
  hhList: DailySalaryRecord[],
  gltList: BacklogGltRecord[],
  lcList: BacklogLcRecord[]
): OverviewKPIs {
  // Volume & GTC totals strictly according to SUM(SLĐ GTC) / SUM(Volume)
  const totalVolume = gtcBcList.reduce((acc, r) => acc + (r.volume || 0), 0);
  const totalSldGTC = gtcBcList.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
  const totalSldGan = gtcBcList.reduce((acc, r) => acc + (r.sldGan || 0), 0);

  const gtcRateTotal = totalVolume > 0 ? (totalSldGTC / totalVolume) * 100 : 0;
  const assignedRateTotal = totalVolume > 0 ? (totalSldGan / totalVolume) * 100 : 0;

  // Leadtime average weighted by volume
  const totalWeightedLt = gtcBcList.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
  const totalLeadtimeAvg = totalVolume > 0 ? totalWeightedLt / totalVolume : 0;

  // Approximate return rate from GTC Bưu cục
  const totalReturnVol = gtcBcList.reduce((acc, r) => {
    const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
    return acc + (r.volume * pct);
  }, 0);
  const returnRateTotal = totalVolume > 0 ? (totalReturnVol / totalVolume) * 100 : 0;

  // Backlogs: Count unique orders
  const gltUnique = new Set(gltList.map(r => r.maDonHang)).size;
  const lcUnique = new Set(lcList.map(r => r.maDonHang)).size;
  const totalBacklog = gltUnique + lcUnique;

  // Urgent overdue orders (> 120h)
  const urgentOverdueOrders = gltList.filter(
    r => r.thoiGianTonDong === '120_192' || r.thoiGianTonDong === '192'
  ).length;

  // Salary
  const totalSalary = hhList.reduce((acc, r) => acc + (r.tongLuong || 0), 0);

  // Active employees and post offices
  const activeEmployeesCount = new Set(gtcNvList.map(r => r.maNV || r.tenNV)).size;
  const activePostOfficesCount = new Set(gtcBcList.map(r => r.buuCuc)).size;

  return {
    totalVolume,
    totalSldGTC,
    gtcRateTotal,
    totalSldGan,
    assignedRateTotal,
    returnRateTotal,
    totalLeadtimeAvg,
    totalBacklog,
    totalGltBacklog: gltUnique,
    totalLcBacklog: lcUnique,
    urgentOverdueOrders,
    totalSalary,
    activeEmployeesCount,
    activePostOfficesCount
  };
}

export function calculatePostOfficeSummaries(
  gtcBcList: GtcPostOfficeRecord[],
  hhList: DailySalaryRecord[],
  gltList: BacklogGltRecord[],
  lcList: BacklogLcRecord[]
): PostOfficeSummary[] {
  const normBc = (bc?: string): string => {
    if (!bc) return '';
    const trimmed = bc.trim();
    if (trimmed === '(LAN) Cần Đước' || trimmed === 'Cần Đước') return '(LAN) Cần Đước 1';
    return trimmed;
  };

  const map: Record<string, {
    volume: number;
    sldGan: number;
    sldGTC: number;
    weightedLeadtime: number;
  }> = {};

  gtcBcList.forEach(r => {
    const po = normBc(r.buuCuc);
    if (!po) return;
    if (!map[po]) {
      map[po] = { volume: 0, sldGan: 0, sldGTC: 0, weightedLeadtime: 0 };
    }
    map[po].volume += r.volume || 0;
    map[po].sldGan += r.sldGan || 0;
    map[po].sldGTC += r.sldGTC || 0;
    map[po].weightedLeadtime += (r.leadtime || 0) * (r.volume || 0);
  });

  // GLT Backlog by Post office
  const gltMap: Record<string, number> = {};
  gltList.forEach(r => {
    const po = normBc(r.buuCuc);
    if (po) gltMap[po] = (gltMap[po] || 0) + 1;
  });

  // LC Backlog by Post office
  const lcMap: Record<string, number> = {};
  lcList.forEach(r => {
    const po = normBc(r.tenBC);
    if (po) lcMap[po] = (lcMap[po] || 0) + 1;
  });

  // Salary by Post office
  const salaryMap: Record<string, number> = {};
  hhList.forEach(r => {
    const po = normBc(r.tenBC);
    if (po) salaryMap[po] = (salaryMap[po] || 0) + (r.tongLuong || 0);
  });

  return Object.entries(map).map(([buuCuc, data]) => {
    const gtcRate = data.volume > 0 ? (data.sldGTC / data.volume) * 100 : 0;
    const assignedRate = data.volume > 0 ? (data.sldGan / data.volume) * 100 : 0;
    const leadtime = data.volume > 0 ? data.weightedLeadtime / data.volume : 0;
    const gltBacklog = gltMap[buuCuc] || 0;
    const lcBacklog = lcMap[buuCuc] || 0;
    const totalBacklog = gltBacklog + lcBacklog;
    const totalSalary = salaryMap[buuCuc] || 0;

    let status: PostOfficeSummary['status'] = 'Good';
    if (gtcRate < 62 || gltBacklog > 3000) status = 'Critical';
    else if (gtcRate < 66 || gltBacklog > 1500) status = 'Warning';
    else if (gtcRate >= 70) status = 'Excellent';

    return {
      buuCuc,
      volume: data.volume,
      sldGan: data.sldGan,
      sldGTC: data.sldGTC,
      gtcRate,
      assignedRate,
      leadtime,
      gltBacklog,
      lcBacklog,
      totalBacklog,
      totalSalary,
      status
    };
  }).sort((a, b) => b.volume - a.volume);
}

export function calculateEmployeeSummaries(
  gtcNvList: GtcEmployeeRecord[],
  hhList: DailySalaryRecord[]
): EmployeeSummary[] {
  const map: Record<string, {
    maNV: string;
    tenNV: string;
    buuCuc: string;
    tongDon: number;
    tongDonGTC: number;
    weightedLeadtime: number;
    chuyenDi: number;
    daysCount: number;
  }> = {};

  gtcNvList.forEach(r => {
    const key = r.maNV || r.tenNV;
    if (!map[key]) {
      map[key] = {
        maNV: r.maNV,
        tenNV: r.tenNV,
        buuCuc: r.buuCuc,
        tongDon: 0,
        tongDonGTC: 0,
        weightedLeadtime: 0,
        chuyenDi: 0,
        daysCount: 0
      };
    }
    map[key].tongDon += r.tongDon || 0;
    map[key].tongDonGTC += r.tongDonGTC || 0;
    map[key].weightedLeadtime += (r.leadtime || 0) * (r.tongDon || 0);
    map[key].chuyenDi += r.chuyenDi || 0;
    map[key].daysCount++;
  });

  // Match salary by maNV
  const salaryMap: Record<string, { tongLuong: number; workDays: number }> = {};
  hhList.forEach(r => {
    if (!salaryMap[r.maNV]) {
      salaryMap[r.maNV] = { tongLuong: 0, workDays: 0 };
    }
    salaryMap[r.maNV].tongLuong += r.tongLuong || 0;
    salaryMap[r.maNV].workDays += r.soNgayDiLam || 1;
  });

  return Object.values(map).map(e => {
    const gtcRate = e.tongDon > 0 ? (e.tongDonGTC / e.tongDon) * 100 : 0;
    const leadtime = e.tongDon > 0 ? e.weightedLeadtime / e.tongDon : 0;
    const salaryInfo = salaryMap[e.maNV] || { tongLuong: 0, workDays: e.daysCount };

    let status: EmployeeSummary['status'] = 'Good';
    if (gtcRate < 60) status = 'Critical';
    else if (gtcRate < 72) status = 'Warning';
    else if (gtcRate >= 82) status = 'Excellent';

    return {
      maNV: e.maNV,
      tenNV: e.tenNV,
      buuCuc: e.buuCuc,
      tongDon: e.tongDon,
      tongDonGTC: e.tongDonGTC,
      gtcRate,
      leadtime,
      chuyenDi: e.chuyenDi,
      workDays: salaryInfo.workDays,
      tongLuong: salaryInfo.tongLuong,
      status
    };
  }).sort((a, b) => b.tongDonGTC - a.tongDonGTC);
}

export function calculateDailyTrends(
  gtcBcList: GtcPostOfficeRecord[],
  hhList: DailySalaryRecord[]
): DailyTrendPoint[] {
  const map: Record<string, {
    volume: number;
    sldGTC: number;
    sldGan: number;
  }> = {};

  gtcBcList.forEach(r => {
    if (!r.ngay) return;
    if (!map[r.ngay]) {
      map[r.ngay] = { volume: 0, sldGTC: 0, sldGan: 0 };
    }
    map[r.ngay].volume += r.volume || 0;
    map[r.ngay].sldGTC += r.sldGTC || 0;
    map[r.ngay].sldGan += r.sldGan || 0;
  });

  const salaryMap: Record<string, { giaoTL: number; luong: number }> = {};
  hhList.forEach(r => {
    if (!r.ngay) return;
    if (!salaryMap[r.ngay]) {
      salaryMap[r.ngay] = { giaoTL: 0, luong: 0 };
    }
    salaryMap[r.ngay].giaoTL += r.donGiaoTinhLuong || 0;
    salaryMap[r.ngay].luong += r.tongLuong || 0;
  });

  // Sort dates dd/MM/yyyy: GẦN NHẤT ĐẾN XA NHẤT (Newest to Oldest) theo yêu cầu
  const parseDate = (d: string) => {
    const parts = d.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    }
    return 0;
  };

  return Object.keys(map)
    .sort((a, b) => parseDate(b) - parseDate(a)) // GẦN NHẤT ĐẾN XA NHẤT
    .map(ngay => {
      const data = map[ngay];
      const sal = salaryMap[ngay] || { giaoTL: 0, luong: 0 };
      const gtcRate = data.volume > 0 ? (data.sldGTC / data.volume) * 100 : 0;
      return {
        ngay,
        displayDate: ngay.slice(0, 5), // '15/10'
        volume: data.volume,
        sldGTC: data.sldGTC,
        sldGan: data.sldGan,
        gtcRate: parseFloat(gtcRate.toFixed(2)),
        giaoTinhLuong: sal.giaoTL,
        luongNgay: sal.luong
      };
    });
}

// =========================================================================
// PHÂN HỆ NGHIỆP VỤ 1: GIAO THÀNH CÔNG BƯU CỤC (TỔNG HỢP & MA TRẬN)
// =========================================================================

export interface GtcDeliveryDailyItem {
  id: string;
  buuCuc: string;
  ngay: string;
  volume: number;
  sldGan: number;
  tiLeGan: number;
  sldGTC: number;
  tiLeGTC: number;
  tonDong: number;
}

export interface GtcDeliveryFilterOptions {
  managedPos?: string[];
  selectedDates?: string[];
  selectedWeeks?: string[];
  selectedLoaiHangs?: string[];
  weekDateMap?: Record<string, string[]>;
}

/**
 * Tính toán bảng GIAO THÀNH CÔNG BƯU CỤC theo chuẩn nghiệp vụ:
 * - Volume = Tổng Volume (Hàng mới ca 1 + Hàng mới ca 2 + Hàng tồn)
 * - SLĐ Gán = Tổng SLĐ Gán
 * - % Gán = (SLĐ Gán) / (Volume)
 * - SLĐ GTC = Tổng SLĐ GTC
 * - % GTC = (SLĐ GTC) / (Volume)
 * - Tồn Đọng = (Volume) - (SLĐ GTC)
 */
export function calculateGtcDeliveryDaily(
  records: GtcPostOfficeRecord[],
  options?: GtcDeliveryFilterOptions
): GtcDeliveryDailyItem[] {
  const managedPos = options?.managedPos || [
    '(LAN) Cần Đước 1',
    '(LAN) Cần Giuộc',
    '(LAN) Phước Lý',
    '(LAN) Rạch Kiến',
    '(LAN) Tầm Vu'
  ];

  let weekDates: Set<string> | null = null;
  if (options?.selectedWeeks && options.selectedWeeks.length > 0 && options.weekDateMap) {
    weekDates = new Set();
    options.selectedWeeks.forEach(wKey => {
      const dates = options.weekDateMap?.[wKey] || [];
      dates.forEach(d => weekDates?.add(d));
    });
  }

  const map: Record<string, {
    buuCuc: string;
    ngay: string;
    volume: number;
    sldGan: number;
    sldGTC: number;
  }> = {};

  records.forEach(r => {
    if (!r.buuCuc || !r.ngay) return;
    if (managedPos.length > 0 && !managedPos.includes(r.buuCuc)) return;

    // Lọc theo Loại Hàng nếu có
    if (options?.selectedLoaiHangs && options.selectedLoaiHangs.length > 0) {
      if (!options.selectedLoaiHangs.includes(r.loaiHang)) return;
    }

    // Lọc theo Tuần nếu có
    if (weekDates && !weekDates.has(r.ngay)) return;

    // Lọc theo Ngày nếu có
    if (options?.selectedDates && options.selectedDates.length > 0) {
      if (!options.selectedDates.includes(r.ngay)) return;
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
    const tonDong = item.volume - item.sldGTC;

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
}

// =========================================================================
// PHÂN HỆ NGHIỆP VỤ 2: VẬN HÀNH HÀNG MỚI CA 2 (CA CHIỀU / TỐI)
// =========================================================================

export interface Ca2OperationsStats {
  volumeCa2: number;
  sldGanCa2: number;
  sldGtcCa2: number;
  tonDongCa2: number;
  chenhLechCa2: number; // Volume - SLĐ Gán
  overallRateGtcCa2: number; // (SLĐ GTC / SLĐ Gán) * 100 hoặc theo Volume
  ca2Shifts: number; // Bưu tá đi 2 chuyến
  ca1Shifts: number; // Bưu tá chỉ đi 1 ca
  totalShifts: number;
  overallRateCa2: number; // Tỷ lệ phủ sóng Ca 2
}

/**
 * Tính toán toàn bộ chỉ số KPI Vận hành Hàng Mới Ca 2
 */
export function calculateCa2OperationsKPIs(
  gtcBcRecords: GtcPostOfficeRecord[],
  gtcNvRecords: GtcEmployeeRecord[],
  filterBuuCuc: string[] = [],
  filterDates: Set<string> | null = null
): Ca2OperationsStats {
  // 1. Chỉ số sản lượng từ sheet GTC Bưu Cục với loaiHang === 'Hàng Mới Ca 2'
  const bcCa2Records = gtcBcRecords.filter(r => {
    if (r.loaiHang !== 'Hàng Mới Ca 2') return false;
    if (filterBuuCuc.length > 0 && !filterBuuCuc.includes(r.buuCuc)) return false;
    if (filterDates && !filterDates.has(r.ngay)) return false;
    return true;
  });

  let volumeCa2 = 0;
  let sldGanCa2 = 0;
  let sldGtcCa2 = 0;
  let tonDongCa2 = 0;

  bcCa2Records.forEach(r => {
    volumeCa2 += r.volume || 0;
    sldGanCa2 += r.sldGan || 0;
    sldGtcCa2 += r.sldGTC || 0;
    tonDongCa2 += r.tonDong || 0;
  });

  const chenhLechCa2 = volumeCa2 - sldGanCa2;
  const overallRateGtcCa2 = sldGanCa2 > 0 
    ? (sldGtcCa2 / sldGanCa2) * 100 
    : (volumeCa2 > 0 ? (sldGtcCa2 / volumeCa2) * 100 : 0);

  // 2. Chỉ số độ phủ nhân sự bưu tá từ sheet GTC Bưu Tá
  const nvFilteredRecords = gtcNvRecords.filter(r => {
    if (filterBuuCuc.length > 0 && !filterBuuCuc.includes(r.buuCuc)) return false;
    if (filterDates && !filterDates.has(r.ngay)) return false;
    return true;
  });

  let ca2Shifts = 0;
  let ca1Shifts = 0;

  nvFilteredRecords.forEach(r => {
    if (r.chuyenDi === 2) {
      ca2Shifts++;
    } else {
      ca1Shifts++;
    }
  });

  const totalShifts = ca2Shifts + ca1Shifts;
  const overallRateCa2 = totalShifts > 0 ? (ca2Shifts / totalShifts) * 100 : 0;

  return {
    volumeCa2,
    sldGanCa2,
    sldGtcCa2,
    tonDongCa2,
    chenhLechCa2,
    overallRateGtcCa2,
    ca2Shifts,
    ca1Shifts,
    totalShifts,
    overallRateCa2
  };
}

// =========================================================================
// PHÂN HỆ NGHIỆP VỤ 3: LIÊN KẾT GTC BƯU TÁ VỚI HOA HỒNG NGÀY (GÁN LẤY & LẤY TC)
// =========================================================================

/**
 * Bổ sung 3 cột nghiệp vụ: Gán Lấy, Lấy TC và %LTC vào danh sách GTC Bưu Tá
 * Nguồn dữ liệu đối soát: Sheet Hoa hồng ngày
 * Cách tính: %LTC = (Lấy TC) / (Gán Lấy)
 */
export function enrichEmployeeRecordsWithPickup(
  gtcNvList: GtcEmployeeRecord[],
  hhList: DailySalaryRecord[]
): GtcEmployeeRecord[] {
  // Tạo map tra cứu nhanh từ sheet Hoa hồng ngày: key = `${maNV}__${ngay}`
  const hhMap = new Map<string, DailySalaryRecord>();
  hhList.forEach(hh => {
    if (hh.maNV && hh.ngay) {
      hhMap.set(`${hh.maNV.trim().toLowerCase()}__${hh.ngay.trim()}`, hh);
    }
  });

  return gtcNvList.map(item => {
    const key = `${item.maNV.trim().toLowerCase()}__${item.ngay.trim()}`;
    const hh = hhMap.get(key);

    let ganLay: number | undefined = undefined;
    let layTC: number | undefined = undefined;
    let tiLeLTC: string | undefined = undefined;

    if (hh) {
      ganLay = hh.soDonGanLay || 0;
      layTC = hh.donLayTinhLuong || 0;
      if (ganLay > 0) {
        tiLeLTC = `${((layTC / ganLay) * 100).toFixed(1)}%`;
      } else if (layTC > 0) {
        tiLeLTC = '100.0%';
      } else {
        tiLeLTC = '0.0%';
      }
    }

    return {
      ...item,
      ganLay,
      layTC,
      tiLeLTC
    };
  });
}

// =========================================================================
// PHÂN HỆ NGHIỆP VỤ 4: BIỂU ĐỒ SỨC ẢNH HƯỞNG BƯU CỤC SO VỚI TOÀN KHU VỰC
// =========================================================================

export interface RegionalInfluenceItem {
  buuCuc: string;
  shortName: string;
  volume: number;
  sldGtc: number;
  tonDong: number;
  gtcRate: number;
  volumeShare: number;
  gtcShare: number;
  diffRate: number;
  color: string;
}

export interface RegionalInfluenceData {
  items: RegionalInfluenceItem[];
  totalRegionDon: number;
  totalRegionGtc: number;
  totalRegionTon: number;
  avgRegionGtcRate: number;
  dominantPo: { name: string; volume: number; share: number; gtcRate: number; diff: number } | null;
  topVolumePos: { names: string; volume: number; share: number } | null;
  bestGtcPo: { name: string; gtcRate: number; diff: number } | null;
}

const PO_COLORS: Record<string, string> = {
  '(LAN) Rạch Kiến': '#f97316',
  '(LAN) Phước Lý': '#0284c7',
  '(LAN) Cần Đước 1': '#10b981',
  '(LAN) Tầm Vu': '#8b5cf6',
  '(LAN) Cần Giuộc': '#ec4899',
};

/**
 * Tính toán ma trận sức ảnh hưởng và tỷ trọng đóng góp của từng bưu cục so với toàn khu vực
 */
export function calculateRegionalInfluenceMatrix(
  records: GtcPostOfficeRecord[],
  managedPos: string[] = ['(LAN) Rạch Kiến', '(LAN) Phước Lý', '(LAN) Cần Đước 1', '(LAN) Tầm Vu', '(LAN) Cần Giuộc'],
  filterDates: Set<string> | null = null
): RegionalInfluenceData {
  const filtered = records.filter(r => {
    if (!managedPos.includes(r.buuCuc)) return false;
    if (filterDates && !filterDates.has(r.ngay)) return false;
    return true;
  });

  const poMap: Record<string, { volume: number; sldGtc: number; tonDong: number }> = {};
  managedPos.forEach(po => {
    poMap[po] = { volume: 0, sldGtc: 0, tonDong: 0 };
  });

  filtered.forEach(r => {
    if (poMap[r.buuCuc]) {
      poMap[r.buuCuc].volume += (r.volume || 0);
      poMap[r.buuCuc].sldGtc += (r.sldGTC || 0);
      poMap[r.buuCuc].tonDong += (r.tonDong || 0);
    }
  });

  const totalRegionDon = Object.values(poMap).reduce((s, p) => s + p.volume, 0);
  const totalRegionGtc = Object.values(poMap).reduce((s, p) => s + p.sldGtc, 0);
  const totalRegionTon = Object.values(poMap).reduce((s, p) => s + p.tonDong, 0);
  const avgRegionGtcRate = totalRegionDon > 0 ? (totalRegionGtc / totalRegionDon) * 100 : 0;

  const items: RegionalInfluenceItem[] = managedPos.map(po => {
    const data = poMap[po];
    const gtcRate = data.volume > 0 ? (data.sldGtc / data.volume) * 100 : 0;
    const volumeShare = totalRegionDon > 0 ? (data.volume / totalRegionDon) * 100 : 0;
    const gtcShare = totalRegionGtc > 0 ? (data.sldGtc / totalRegionGtc) * 100 : 0;
    const diffRate = gtcRate - avgRegionGtcRate;
    const shortName = po.replace('(LAN) ', '');

    return {
      buuCuc: po,
      shortName,
      volume: data.volume,
      sldGtc: data.sldGtc,
      tonDong: data.tonDong,
      gtcRate,
      volumeShare,
      gtcShare,
      diffRate,
      color: PO_COLORS[po] || '#f97316'
    };
  }).sort((a, b) => b.volume - a.volume);

  let dominantPo = null;
  if (items.length > 0 && items[0].volume > 0) {
    const first = items[0];
    dominantPo = {
      name: first.shortName,
      volume: first.volume,
      share: first.volumeShare,
      gtcRate: first.gtcRate,
      diff: first.diffRate
    };
  }

  let topVolumePos = null;
  if (items.length >= 2 && totalRegionDon > 0) {
    const combinedVol = items[0].volume + items[1].volume;
    const combinedShare = (combinedVol / totalRegionDon) * 100;
    topVolumePos = {
      names: `${items[0].shortName} + ${items[1].shortName}`,
      volume: combinedVol,
      share: combinedShare
    };
  }

  let bestGtcPo = null;
  const posWithVol = items.filter(p => p.volume > 0);
  if (posWithVol.length > 0) {
    const best = [...posWithVol].sort((a, b) => b.gtcRate - a.gtcRate)[0];
    bestGtcPo = {
      name: best.shortName,
      gtcRate: best.gtcRate,
      diff: best.diffRate
    };
  }

  return {
    items,
    totalRegionDon,
    totalRegionGtc,
    totalRegionTon,
    avgRegionGtcRate,
    dominantPo,
    topVolumePos,
    bestGtcPo
  };
}
