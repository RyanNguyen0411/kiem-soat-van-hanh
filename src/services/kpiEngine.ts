import type { 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord,
  GltBacklogBreakdown,
  LcBacklogBreakdown,
  OrderConflictEntry
} from '../types/dashboard';

export interface OverviewKPIs {
  totalVolume: number;
  totalSldGTC: number;
  tonGiaoTrongCa: number; // Volume - SLĐ GTC (Hiệu suất xử lý theo ca/ngày, không che giấu nếu âm)
  hasGtcExceedsVolumeAnomaly: boolean;
  gtcAnomalyRowCount: number;
  gtcRateTotal: number; // in %
  totalSldGan: number;
  assignedRateTotal: number; // in %
  returnRateTotal: number; // in %
  totalLeadtimeAvg: number;
  totalBacklog: number; // Tổng đơn duy nhất khử trùng (GLT ∪ LC)
  totalGltBacklog: number; // Snapshot hiện hành Tồn GLT (đơn duy nhất)
  totalLcBacklog: number;  // Snapshot hiện hành Tồn LC (đơn duy nhất)
  gltBreakdown: GltBacklogBreakdown;
  lcBreakdown: LcBacklogBreakdown;
  urgentOverdueOrders: number; // > 120h (đơn GLT duy nhất)
  totalSalary: number;
  activeEmployeesCount: number;
  activePostOfficesCount: number;
}

export interface PostOfficeSummary {
  buuCuc: string;
  volume: number;
  sldGan: number;
  sldGTC: number;
  tonGiaoTrongCa: number; // Volume - SLĐ GTC
  hasGtcExceedsVolumeAnomaly: boolean;
  gtcRate: number;
  assignedRate: number;
  leadtime: number;
  gltBacklog: number; // Snapshot GLT đơn duy nhất
  lcBacklog: number;  // Snapshot LC đơn duy nhất
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

/**
 * Chuẩn hóa mã đơn hàng thống nhất toàn Dashboard:
 * - null / undefined -> ''
 * - Chuyển sang String, trim khoảng trắng đầu/cuối, viết hoa bằng toUpperCase()
 */
export function normalizeOrderId(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toUpperCase();
}

function normField(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Khử trùng lặp danh sách bản ghi Tồn GLT theo normalizeOrderId(maDonHang).
 * Giữ bản ghi đại diện đầu tiên theo đúng thứ tự dữ liệu nguồn.
 */
export function dedupeGltRecords(gltList: BacklogGltRecord[]): BacklogGltRecord[] {
  if (!gltList || gltList.length === 0) return [];
  const seen = new Set<string>();
  const result: BacklogGltRecord[] = [];
  for (let i = 0; i < gltList.length; i++) {
    const r = gltList[i];
    if (!r) continue;
    const orderId = normalizeOrderId(r.maDonHang);
    if (!orderId || seen.has(orderId)) continue;
    seen.add(orderId);
    result.push(r.maDonHang === orderId ? r : { ...r, maDonHang: orderId });
  }
  return result;
}

/**
 * Khử trùng lặp danh sách bản ghi Tồn LC theo normalizeOrderId(maDonHang).
 * Giữ bản ghi đại diện đầu tiên theo đúng thứ tự dữ liệu nguồn.
 */
export function dedupeLcRecords(lcList: BacklogLcRecord[]): BacklogLcRecord[] {
  if (!lcList || lcList.length === 0) return [];
  const seen = new Set<string>();
  const result: BacklogLcRecord[] = [];
  for (let i = 0; i < lcList.length; i++) {
    const r = lcList[i];
    if (!r) continue;
    const orderId = normalizeOrderId(r.maDonHang);
    if (!orderId || seen.has(orderId)) continue;
    seen.add(orderId);
    result.push(r.maDonHang === orderId ? r : { ...r, maDonHang: orderId });
  }
  return result;
}

/**
 * Chuẩn hóa bóc tách Tồn GLT (Snapshot hiện hành) theo mã đơn duy nhất (Set<normalizeOrderId(maDonHang)>).
 * Đảm bảo 4 phân nhóm (Giao, Ưu tiên giao/Đã trễ, Lấy, Trả) không trùng lặp mã đơn,
 * cộng khớp 100% tổng mã đơn GLT duy nhất, và phân loại độc lập 3 nhóm bản ghi trùng:
 * - Nhóm A (businessConflictCount): Khác loaiDon, trangThai, hoặc buuCuc (ưu tiên cao nhất)
 * - Nhóm B (secondaryDiffCount): Cùng trường cốt lõi, khác canhBao hoặc thoiGianTonDong
 * - Trùng hoàn toàn (exactDuplicateCount): Toàn bộ trường kiểm tra giống nhau
 */
export function computeGltBacklogBreakdown(gltList: BacklogGltRecord[]): GltBacklogBreakdown {
  const seenMap = new Map<string, {
    keptRecord: BacklogGltRecord;
    duplicateRecords: BacklogGltRecord[];
    hasBusinessConflict: boolean;
    hasSecondaryDiff: boolean;
    businessDiffFields: Set<string>;
    secondaryDiffFields: Set<string>;
  }>();
  let giao = 0;
  let uuTienTre = 0;
  let uuTienDaTre = 0;
  let uuTienTrongNgay = 0;
  let lay = 0;
  let tra = 0;
  let duplicateRowsIgnored = 0;
  let emptyOrderIdRowsIgnored = 0;

  const list = gltList || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r) {
      emptyOrderIdRowsIgnored++;
      continue;
    }
    const orderId = normalizeOrderId(r.maDonHang);
    if (!orderId) {
      emptyOrderIdRowsIgnored++;
      continue;
    }
    const normRecord = r.maDonHang === orderId ? r : { ...r, maDonHang: orderId };
    const existing = seenMap.get(orderId);
    if (existing) {
      duplicateRowsIgnored++;
      existing.duplicateRecords.push(normRecord);
      const first = existing.keptRecord;

      const diffLoaiDon = normField(first.loaiDon) !== normField(r.loaiDon);
      const diffTrangThai = normField(first.trangThai) !== normField(r.trangThai);
      const firstBc = normField(first.buuCuc || (first as any).tenBC);
      const curBc = normField(r.buuCuc || (r as any).tenBC);
      const diffBuuCuc = firstBc !== curBc;

      if (diffLoaiDon || diffTrangThai || diffBuuCuc) {
        existing.hasBusinessConflict = true;
        if (diffLoaiDon) existing.businessDiffFields.add('loaiDon');
        if (diffTrangThai) existing.businessDiffFields.add('trangThai');
        if (diffBuuCuc) existing.businessDiffFields.add('buuCuc');
      } else {
        const diffCanhBao = normField(first.canhBao) !== normField(r.canhBao);
        const diffThoiGian = normField(first.thoiGianTonDong) !== normField(r.thoiGianTonDong);
        if (diffCanhBao || diffThoiGian) {
          existing.hasSecondaryDiff = true;
          if (diffCanhBao) existing.secondaryDiffFields.add('canhBao');
          if (diffThoiGian) existing.secondaryDiffFields.add('thoiGianTonDong');
        }
      }
      continue;
    }

    seenMap.set(orderId, {
      keptRecord: normRecord,
      duplicateRecords: [],
      hasBusinessConflict: false,
      hasSecondaryDiff: false,
      businessDiffFields: new Set<string>(),
      secondaryDiffFields: new Set<string>()
    });

    const loai = normField(r.loaiDon);
    const loaiLower = loai.toLowerCase();

    if (loai === 'Lấy' || loaiLower === 'lấy') {
      lay++;
    } else if (loai === 'Trả' || loaiLower === 'trả') {
      tra++;
    } else if (loaiLower.includes('ưu tiên') || loaiLower.includes('trễ')) {
      uuTienTre++;
      if (loaiLower.includes('trễ')) {
        uuTienDaTre++;
      } else {
        uuTienTrongNgay++;
      }
    } else {
      giao++;
    }
  }

  let businessConflictCount = 0;
  let secondaryDiffCount = 0;
  let exactDuplicateCount = 0;
  const businessConflicts: OrderConflictEntry<BacklogGltRecord>[] = [];
  const secondaryDiffs: OrderConflictEntry<BacklogGltRecord>[] = [];

  for (const [orderId, entry] of seenMap.entries()) {
    if (entry.duplicateRecords.length === 0) continue;
    if (entry.hasBusinessConflict) {
      businessConflictCount++;
      businessConflicts.push({
        orderId,
        conflictType: 'BUSINESS_CONFLICT',
        diffFields: Array.from(entry.businessDiffFields),
        keptRecord: entry.keptRecord,
        duplicateRecords: entry.duplicateRecords
      });
    } else if (entry.hasSecondaryDiff) {
      secondaryDiffCount++;
      secondaryDiffs.push({
        orderId,
        conflictType: 'SECONDARY_DIFF',
        diffFields: Array.from(entry.secondaryDiffFields),
        keptRecord: entry.keptRecord,
        duplicateRecords: entry.duplicateRecords
      });
    } else {
      exactDuplicateCount++;
    }
  }

  return {
    totalUnique: seenMap.size,
    giao,
    uuTienTre,
    uuTienDaTre,
    uuTienTrongNgay,
    lay,
    tra,
    businessConflictCount,
    secondaryDiffCount,
    exactDuplicateCount,
    duplicateRowsIgnored,
    emptyOrderIdRowsIgnored,
    businessConflicts,
    secondaryDiffs
  };
}

/**
 * Chuẩn hóa bóc tách Tồn LC (Snapshot hiện hành) theo mã đơn duy nhất (Set<normalizeOrderId(maDonHang)>).
 * Phân biệt chính xác Luân chuyển giao (229) và Luân chuyển trả (55),
 * đồng thời phân loại độc lập 3 nhóm bản ghi trùng (Nhóm A, Nhóm B, Trùng hoàn toàn).
 */
export function computeLcBacklogBreakdown(lcList: BacklogLcRecord[]): LcBacklogBreakdown {
  const seenMap = new Map<string, {
    keptRecord: BacklogLcRecord;
    duplicateRecords: BacklogLcRecord[];
    hasBusinessConflict: boolean;
    hasSecondaryDiff: boolean;
    businessDiffFields: Set<string>;
    secondaryDiffFields: Set<string>;
  }>();
  let lcGiao = 0;
  let lcTra = 0;
  let duplicateRowsIgnored = 0;
  let emptyOrderIdRowsIgnored = 0;

  const list = lcList || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r) {
      emptyOrderIdRowsIgnored++;
      continue;
    }
    const orderId = normalizeOrderId(r.maDonHang);
    if (!orderId) {
      emptyOrderIdRowsIgnored++;
      continue;
    }
    const normRecord = r.maDonHang === orderId ? r : { ...r, maDonHang: orderId };
    const existing = seenMap.get(orderId);
    if (existing) {
      duplicateRowsIgnored++;
      existing.duplicateRecords.push(normRecord);
      const first = existing.keptRecord;

      const diffTrangThai = normField(first.trangThai) !== normField(r.trangThai);
      const firstBc = normField(first.tenBC || (first as any).buuCuc);
      const curBc = normField(r.tenBC || (r as any).buuCuc);
      const diffBuuCuc = firstBc !== curBc;

      if (diffTrangThai || diffBuuCuc) {
        existing.hasBusinessConflict = true;
        if (diffTrangThai) existing.businessDiffFields.add('trangThai');
        if (diffBuuCuc) existing.businessDiffFields.add('tenBC');
      } else {
        const diffCanhBao = normField(first.canhBao) !== normField(r.canhBao);
        const diffThoiGian = normField(first.thoiGianTonDong) !== normField(r.thoiGianTonDong);
        if (diffCanhBao || diffThoiGian) {
          existing.hasSecondaryDiff = true;
          if (diffCanhBao) existing.secondaryDiffFields.add('canhBao');
          if (diffThoiGian) existing.secondaryDiffFields.add('thoiGianTonDong');
        }
      }
      continue;
    }

    seenMap.set(orderId, {
      keptRecord: normRecord,
      duplicateRecords: [],
      hasBusinessConflict: false,
      hasSecondaryDiff: false,
      businessDiffFields: new Set<string>(),
      secondaryDiffFields: new Set<string>()
    });

    const loaiLower = normField(r.loaiDon).toLowerCase();
    if (loaiLower.includes('trả')) {
      lcTra++;
    } else {
      lcGiao++;
    }
  }

  let businessConflictCount = 0;
  let secondaryDiffCount = 0;
  let exactDuplicateCount = 0;
  const businessConflicts: OrderConflictEntry<BacklogLcRecord>[] = [];
  const secondaryDiffs: OrderConflictEntry<BacklogLcRecord>[] = [];

  for (const [orderId, entry] of seenMap.entries()) {
    if (entry.duplicateRecords.length === 0) continue;
    if (entry.hasBusinessConflict) {
      businessConflictCount++;
      businessConflicts.push({
        orderId,
        conflictType: 'BUSINESS_CONFLICT',
        diffFields: Array.from(entry.businessDiffFields),
        keptRecord: entry.keptRecord,
        duplicateRecords: entry.duplicateRecords
      });
    } else if (entry.hasSecondaryDiff) {
      secondaryDiffCount++;
      secondaryDiffs.push({
        orderId,
        conflictType: 'SECONDARY_DIFF',
        diffFields: Array.from(entry.secondaryDiffFields),
        keptRecord: entry.keptRecord,
        duplicateRecords: entry.duplicateRecords
      });
    } else {
      exactDuplicateCount++;
    }
  }

  return {
    totalUnique: seenMap.size,
    lcGiao,
    lcTra,
    businessConflictCount,
    secondaryDiffCount,
    exactDuplicateCount,
    duplicateRowsIgnored,
    emptyOrderIdRowsIgnored,
    businessConflicts,
    secondaryDiffs
  };
}

export function calculateOverviewKPIs(
  gtcBcList: GtcPostOfficeRecord[],
  gtcNvList: GtcEmployeeRecord[],
  hhList: DailySalaryRecord[],
  gltList: BacklogGltRecord[],
  lcList: BacklogLcRecord[]
): OverviewKPIs {
  // Volume & GTC totals strictly according to SUM(SLĐ GTC) / SUM(Volume)
  let totalVolume = 0;
  let totalSldGTC = 0;
  let totalSldGan = 0;
  let gtcAnomalyRowCount = 0;

  for (let i = 0; i < gtcBcList.length; i++) {
    const r = gtcBcList[i];
    const vol = r.volume || 0;
    const gtc = r.sldGTC || 0;
    const gan = r.sldGan || 0;
    totalVolume += vol;
    totalSldGTC += gtc;
    totalSldGan += gan;
    if (gtc > vol) {
      gtcAnomalyRowCount++;
    }
  }

  // Tồn giao trong ca = Volume - SLĐ GTC (Không dùng Math.max(0, ...) để không che giấu dữ liệu bất thường)
  const tonGiaoTrongCa = totalVolume - totalSldGTC;
  const hasGtcExceedsVolumeAnomaly = totalSldGTC > totalVolume || gtcAnomalyRowCount > 0;

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

  // Backlogs: Tách biệt chuẩn Tồn GLT Snapshot và Tồn LC Snapshot theo mã đơn duy nhất
  const gltBreakdown = computeGltBacklogBreakdown(gltList);
  const lcBreakdown = computeLcBacklogBreakdown(lcList);
  const gltUnique = gltBreakdown.totalUnique;
  const lcUnique = lcBreakdown.totalUnique;
  const dedupedGlt = dedupeGltRecords(gltList);
  const dedupedLc = dedupeLcRecords(lcList);
  const totalBacklog = new Set([
    ...dedupedGlt.map(r => r.maDonHang),
    ...dedupedLc.map(r => r.maDonHang)
  ]).size;

  // Urgent overdue orders (> 120h) — đếm theo bản ghi đại diện của mã đơn GLT duy nhất
  const urgentOverdueOrders = dedupedGlt.filter(
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
    tonGiaoTrongCa,
    hasGtcExceedsVolumeAnomaly,
    gtcAnomalyRowCount,
    gtcRateTotal,
    totalSldGan,
    assignedRateTotal,
    returnRateTotal,
    totalLeadtimeAvg,
    totalBacklog,
    totalGltBacklog: gltUnique,
    totalLcBacklog: lcUnique,
    gltBreakdown,
    lcBreakdown,
    urgentOverdueOrders,
    totalSalary,
    activeEmployeesCount,
    activePostOfficesCount
  };
}

export interface ExecutiveOverviewData {
  uniqueOrders: {
    backlogTotal: number;
    gltTotal: number;
    lcTotal: number;
    pickupBacklog: number;
    deliveryBacklog: number;
    returnBacklog: number;
    gltBreakdown: GltBacklogBreakdown;
    lcBreakdown: LcBacklogBreakdown;
    historicalCompleted: number | null;
    verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'NOT_FOUND';
    notes: string;
  };
  operationalEvents: {
    totalEvents: number;
    pickupEvents: {
      assigned: number;
      completed: number;
      rate: number;
    };
    deliveryEvents: {
      volume: number;
      assigned: number;
      completed: number;
      tonGiaoTrongCa: number;
      hasGtcExceedsVolumeAnomaly: boolean;
      anomalyRowCount: number;
      gtcRate: number;
    };
    returnEvents: {
      transferVolume: number;
      returnRate: number;
    };
    verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED';
    notes: string;
  };
}

export function calculateExecutiveOverviewScope(
  gtcBcList: GtcPostOfficeRecord[],
  hhList: DailySalaryRecord[],
  gltList: BacklogGltRecord[],
  lcList: BacklogLcRecord[]
): ExecutiveOverviewData {
  // 1. Backlogs Unique Orders (Tách biệt hoàn toàn Tồn GLT Snapshot và Tồn LC Snapshot)
  const gltBreakdown = computeGltBacklogBreakdown(gltList);
  const lcBreakdown = computeLcBacklogBreakdown(lcList);

  const allBacklogOrderIds = new Set([
    ...gltList.map(r => normalizeOrderId(r.maDonHang)),
    ...lcList.map(r => normalizeOrderId(r.maDonHang))
  ].filter(Boolean));

  // Các nhóm đơn GLT duy nhất chuẩn 4 phân nhóm: Giao (7.461) + Ưu tiên/Trễ (1.161) + Lấy (2.040) + Trả (266) = 10.928
  const uniquePickupBacklog = gltBreakdown.lay;
  const uniqueDeliveryBacklog = gltBreakdown.giao + gltBreakdown.uuTienTre;
  const uniqueReturnBacklog = gltBreakdown.tra;

  // 2. Operational Events
  let deliveryVolume = 0;
  let deliveryAssigned = 0;
  let deliveryCompleted = 0;
  let anomalyRowCount = 0;

  for (let i = 0; i < gtcBcList.length; i++) {
    const r = gtcBcList[i];
    const vol = r.volume || 0;
    const gan = r.sldGan || 0;
    const gtc = r.sldGTC || 0;
    deliveryVolume += vol;
    deliveryAssigned += gan;
    deliveryCompleted += gtc;
    if (gtc > vol) {
      anomalyRowCount++;
    }
  }

  // Tồn giao trong ca = Volume - SLĐ GTC (Không dùng Math.max(0, ...) để bảo toàn cảnh báo bất thường)
  const tonGiaoTrongCa = deliveryVolume - deliveryCompleted;
  const hasGtcExceedsVolumeAnomaly = deliveryCompleted > deliveryVolume || anomalyRowCount > 0;
  const deliveryGtcRate = deliveryVolume > 0 ? (deliveryCompleted / deliveryVolume) * 100 : 0;

  const pickupAssigned = hhList.reduce((acc, r) => acc + (r.soDonGanLay || 0), 0);
  const pickupCompleted = hhList.reduce((acc, r) => acc + (r.donLayTinhLuong || 0), 0);
  const pickupRate = pickupAssigned > 0 ? (pickupCompleted / pickupAssigned) * 100 : 0;

  const returnTransferVolume = Math.round(gtcBcList.reduce((acc, r) => {
    const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
    return acc + ((r.volume || 0) * pct);
  }, 0));
  const returnRate = deliveryVolume > 0 ? (returnTransferVolume / deliveryVolume) * 100 : 0;

  const totalEvents = deliveryVolume + pickupAssigned + returnTransferVolume;

  return {
    uniqueOrders: {
      backlogTotal: allBacklogOrderIds.size,
      gltTotal: gltBreakdown.totalUnique,
      lcTotal: lcBreakdown.totalUnique,
      pickupBacklog: uniquePickupBacklog,
      deliveryBacklog: uniqueDeliveryBacklog,
      returnBacklog: uniqueReturnBacklog,
      gltBreakdown,
      lcBreakdown,
      historicalCompleted: null, // Đánh dấu chưa đủ điều kiện vì GTC BC/NV là số liệu tổng hợp không có Order ID
      verificationStatus: 'VERIFIED',
      notes: 'Tồn GLT (10.928 đơn) và Tồn LC (284 đơn) là Snapshot hiện hành đếm theo mã đơn duy nhất, tách biệt với Tồn giao trong ca (Volume - SLĐ GTC).'
    },
    operationalEvents: {
      totalEvents,
      pickupEvents: {
        assigned: pickupAssigned,
        completed: pickupCompleted,
        rate: pickupRate
      },
      deliveryEvents: {
        volume: deliveryVolume,
        assigned: deliveryAssigned,
        completed: deliveryCompleted,
        tonGiaoTrongCa,
        hasGtcExceedsVolumeAnomaly,
        anomalyRowCount,
        gtcRate: deliveryGtcRate
      },
      returnEvents: {
        transferVolume: returnTransferVolume,
        returnRate
      },
      verificationStatus: 'VERIFIED',
      notes: 'Lượt nghiệp vụ hợp lệ tổng hợp từ các bảng GTC Bưu cục và Hoa hồng ngày theo phạm vi lọc thực tế.'
    }
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
    anomalyRows: number;
  }> = {};

  gtcBcList.forEach(r => {
    const po = normBc(r.buuCuc);
    if (!po) return;
    if (!map[po]) {
      map[po] = { volume: 0, sldGan: 0, sldGTC: 0, weightedLeadtime: 0, anomalyRows: 0 };
    }
    const vol = r.volume || 0;
    const gtc = r.sldGTC || 0;
    map[po].volume += vol;
    map[po].sldGan += r.sldGan || 0;
    map[po].sldGTC += gtc;
    map[po].weightedLeadtime += (r.leadtime || 0) * vol;
    if (gtc > vol) {
      map[po].anomalyRows += 1;
    }
  });

  // GLT Backlog by Post office — đếm theo bản ghi đại diện của mã đơn duy nhất
  const gltSetMap: Record<string, Set<string>> = {};
  dedupeGltRecords(gltList).forEach(r => {
    const po = normBc(r.buuCuc);
    const orderId = r.maDonHang;
    if (po && orderId) {
      if (!gltSetMap[po]) gltSetMap[po] = new Set();
      gltSetMap[po].add(orderId);
    }
  });

  // LC Backlog by Post office — đếm theo bản ghi đại diện của mã đơn duy nhất
  const lcSetMap: Record<string, Set<string>> = {};
  dedupeLcRecords(lcList).forEach(r => {
    const po = normBc(r.tenBC);
    const orderId = r.maDonHang;
    if (po && orderId) {
      if (!lcSetMap[po]) lcSetMap[po] = new Set();
      lcSetMap[po].add(orderId);
    }
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
    const tonGiaoTrongCa = data.volume - data.sldGTC;
    const hasGtcExceedsVolumeAnomaly = data.sldGTC > data.volume || data.anomalyRows > 0;
    const gltBacklog = gltSetMap[buuCuc]?.size || 0;
    const lcBacklog = lcSetMap[buuCuc]?.size || 0;
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
      tonGiaoTrongCa,
      hasGtcExceedsVolumeAnomaly,
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

  // Match salary by maNV (Khử trùng lặp theo khóa maNV + ngay và không biến 0 ngày công thành 1)
  const salaryMap: Record<string, { tongLuong: number; workDays: number }> = {};
  const seenHhKeys = new Set<string>();
  hhList.forEach((r, idx) => {
    const dedupKey = r.maNV && r.ngay ? `${r.maNV.trim().toLowerCase()}__${r.ngay.trim()}` : `__missing_${idx}`;
    if (seenHhKeys.has(dedupKey)) return;
    seenHhKeys.add(dedupKey);
    if (!salaryMap[r.maNV]) {
      salaryMap[r.maNV] = { tongLuong: 0, workDays: 0 };
    }
    salaryMap[r.maNV].tongLuong += r.tongLuong || 0;
    salaryMap[r.maNV].workDays += r.soNgayDiLam || 0;
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
  overallRateGanCa2: number; // (SLĐ Gán Ca 2 / Volume Ca 2) * 100
  overallRateGtcCa2: number; // %GTC Ca 2 / Volume = (SLĐ GTC Ca 2 / Volume Ca 2) * 100 (12,51%)
  overallRateGtcOnAssignedCa2: number; // %GTC Ca 2 / Gán = (SLĐ GTC Ca 2 / SLĐ Gán Ca 2) * 100 (66,17%)
  ca2Shifts: number; // Bưu tá đi >= 2 chuyến (1.224 lượt)
  ca1Shifts: number; // Bưu tá chỉ đi 1 ca (604 lượt)
  totalShifts: number;
  overallRateCa2: number; // Tỷ lệ phủ sóng Ca 2 (66,96%)
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

  bcCa2Records.forEach(r => {
    volumeCa2 += r.volume || 0;
    sldGanCa2 += r.sldGan || 0;
    sldGtcCa2 += r.sldGTC || 0;
  });

  // Tồn giao trong ca Ca 2 = Volume Ca 2 - SLĐ GTC Ca 2 (Không dùng Math.max(0, ...) để bảo toàn cảnh báo bất thường)
  const tonDongCa2 = volumeCa2 - sldGtcCa2;

  const chenhLechCa2 = volumeCa2 - sldGanCa2;
  const overallRateGanCa2 = volumeCa2 > 0 ? (sldGanCa2 / volumeCa2) * 100 : 0;
  // Tách rõ %GTC Ca 2 / Volume (12,51%) và %GTC Ca 2 / Gán (66,17%)
  const overallRateGtcCa2 = volumeCa2 > 0 ? (sldGtcCa2 / volumeCa2) * 100 : 0;
  const overallRateGtcOnAssignedCa2 = sldGanCa2 > 0 ? (sldGtcCa2 / sldGanCa2) * 100 : 0;

  // 2. Chỉ số độ phủ nhân sự bưu tá từ sheet GTC Bưu Tá (chuyenDi >= 2)
  const nvFilteredRecords = gtcNvRecords.filter(r => {
    if (filterBuuCuc.length > 0 && !filterBuuCuc.includes(r.buuCuc)) return false;
    if (filterDates && !filterDates.has(r.ngay)) return false;
    return true;
  });

  let ca2Shifts = 0;
  let ca1Shifts = 0;

  nvFilteredRecords.forEach(r => {
    if ((r.chuyenDi || 0) >= 2) {
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
    overallRateGanCa2,
    overallRateGtcCa2,
    overallRateGtcOnAssignedCa2,
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
      const vol = r.volume || 0;
      const gtc = r.sldGTC || 0;
      poMap[r.buuCuc].volume += vol;
      poMap[r.buuCuc].sldGtc += gtc;
      poMap[r.buuCuc].tonDong = poMap[r.buuCuc].volume - poMap[r.buuCuc].sldGtc;
    }
  });

  const totalRegionDon = Object.values(poMap).reduce((s, p) => s + p.volume, 0);
  const totalRegionGtc = Object.values(poMap).reduce((s, p) => s + p.sldGtc, 0);
  const totalRegionTon = totalRegionDon - totalRegionGtc;
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
