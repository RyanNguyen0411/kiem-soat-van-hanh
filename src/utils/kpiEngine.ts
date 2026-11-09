/**
 * GHN Area Manager Dashboard - Centralized KPI & Business Logic Engine
 * Phase 03: KPI Engine & Business Logic Standardization
 *
 * Strict Business Rules:
 * 1. %GTC Tổng = SUM(SLĐ GTC) / SUM(Volume) * 100% (KHÔNG bao giờ tính trung bình cộng tỷ lệ %).
 * 2. Tồn đọng Bưu cục = Volume - SLĐ GTC (Đơn chưa giao thành công).
 * 3. GTC Nhân viên sử dụng độc lập Tổng đơn / Tổng đơn GTC từ sheet GTC Nhân viên, KHÔNG thay thế bằng Volume Bưu cục.
 * 4. Tồn đọng GLT và LC là 2 tập dữ liệu và định nghĩa nghiệp vụ độc lập, KHÔNG được cộng gộp tùy tiện.
 * 5. Mẫu số = 0 phải xử lý an toàn qua safeDivide (trả về 0 hoặc N/A, không sinh ra NaN/Infinity).
 */

import { safeDivide } from './calculation.utils.ts';
import type { 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord 
} from '../types/dashboard';

// ============================================================================
// 1. GTC BƯU CỤC (Sheet: GTC Bưu cục)
// ============================================================================

export interface GtcPoAggregatedResult {
  totalVolume: number;
  totalSldGan: number;
  totalSldGTC: number;
  totalTonDong: number;
  tiLeGan: number;       // SUM(SLĐ Gán) / SUM(Volume) * 100
  tiLeGTC: number;       // SUM(SLĐ GTC) / SUM(Volume) * 100
  avgLeadtime: number;   // Weighted by volume
  avgReturnRate: number; // Weighted by volume
  rowCount: number;
}

/**
 * Tính toán tổng hợp KPI GTC Bưu cục
 * Chuẩn nghiệp vụ: SUM các chỉ số số tuyệt đối trước, sau đó mới chia tỷ lệ phần trăm
 */
export function calculateGtcPostOfficeMetrics(records: GtcPostOfficeRecord[]): GtcPoAggregatedResult {
  if (!records || records.length === 0) {
    return {
      totalVolume: 0,
      totalSldGan: 0,
      totalSldGTC: 0,
      totalTonDong: 0,
      tiLeGan: 0,
      tiLeGTC: 0,
      avgLeadtime: 0,
      avgReturnRate: 0,
      rowCount: 0
    };
  }

  let totalVolume = 0;
  let totalSldGan = 0;
  let totalSldGTC = 0;
  let weightedLtSum = 0;
  let weightedRetSum = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const vol = r.volume || 0;
    const gan = r.sldGan || 0;
    const gtc = r.sldGTC || 0;
    const lt = r.leadtime || 0;
    
    // Parse tỷ lệ chuyển trả nếu có
    let retRate = 0;
    if (typeof r.tiLeChuyenTra === 'number') {
      retRate = r.tiLeChuyenTra;
    } else if (typeof r.tiLeChuyenTra === 'string') {
      retRate = parseFloat(r.tiLeChuyenTra.replace('%', '').replace(',', '.')) || 0;
    }

    totalVolume += vol;
    totalSldGan += gan;
    totalSldGTC += gtc;
    weightedLtSum += lt * vol;
    weightedRetSum += retRate * vol;
  }

  // Tồn đọng = Volume - SLĐ GTC
  const totalTonDong = totalVolume - totalSldGTC;

  // Tỷ lệ % tổng: Bắt buộc lấy Tổng tử số / Tổng mẫu số * 100%
  const tiLeGan = safeDivide(totalSldGan, totalVolume, 0, true);
  const tiLeGTC = safeDivide(totalSldGTC, totalVolume, 0, true);
  const avgLeadtime = safeDivide(weightedLtSum, totalVolume, 0, false);
  const avgReturnRate = safeDivide(weightedRetSum, totalVolume, 0, false);

  return {
    totalVolume,
    totalSldGan,
    totalSldGTC,
    totalTonDong,
    tiLeGan: Number(tiLeGan.toFixed(2)),
    tiLeGTC: Number(tiLeGTC.toFixed(2)),
    avgLeadtime: Number(avgLeadtime.toFixed(2)),
    avgReturnRate: Number(avgReturnRate.toFixed(2)),
    rowCount: records.length
  };
}

// ============================================================================
// 2. GTC NHÂN VIÊN (Sheet: GTC Nhân viên)
// ============================================================================

export interface GtcEmployeeAggregatedResult {
  totalDon: number;
  totalDonGTC: number;
  totalChuyenDi: number;
  tiLeGTC: number;       // SUM(Tổng đơn GTC) / SUM(Tổng đơn) * 100
  totalTonDong: number;  // Tổng đơn - Tổng đơn GTC
  avgLeadtime: number;   // Weighted by tổng đơn
  activeStaffCount: number;
  rowCount: number;
}

/**
 * Tính toán tổng hợp KPI GTC Nhân viên
 * Độc lập 100% với Volume của Bưu cục; sử dụng Tổng đơn của nhân viên
 */
export function calculateGtcEmployeeMetrics(records: GtcEmployeeRecord[]): GtcEmployeeAggregatedResult {
  if (!records || records.length === 0) {
    return {
      totalDon: 0,
      totalDonGTC: 0,
      totalChuyenDi: 0,
      tiLeGTC: 0,
      totalTonDong: 0,
      avgLeadtime: 0,
      activeStaffCount: 0,
      rowCount: 0
    };
  }

  let totalDon = 0;
  let totalDonGTC = 0;
  let totalChuyenDi = 0;
  let weightedLtSum = 0;
  const uniqueStaff = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const don = r.tongDon || 0;
    const gtc = r.tongDonGTC || 0;
    const chuyen = r.chuyenDi || 0;
    const lt = r.leadtime || 0;

    totalDon += don;
    totalDonGTC += gtc;
    totalChuyenDi += chuyen;
    weightedLtSum += lt * don;
    if (r.maNV) uniqueStaff.add(r.maNV);
  }

  const totalTonDong = totalDon - totalDonGTC;
  const tiLeGTC = safeDivide(totalDonGTC, totalDon, 0, true);
  const avgLeadtime = safeDivide(weightedLtSum, totalDon, 0, false);

  return {
    totalDon,
    totalDonGTC,
    totalChuyenDi,
    tiLeGTC: Number(tiLeGTC.toFixed(2)),
    totalTonDong,
    avgLeadtime: Number(avgLeadtime.toFixed(2)),
    activeStaffCount: uniqueStaff.size,
    rowCount: records.length
  };
}

// ============================================================================
// 3. HOA HỒNG NGÀY & LƯƠNG NHÂN VIÊN (Sheet: Hoa hồng ngày)
// ============================================================================

export interface DailySalaryAggregatedResult {
  totalLuong: number;
  totalLuongHH: number;
  totalLuongDamBao: number;
  totalGiaoTL: number;
  totalLayTL: number;
  totalGanGiao: number;
  totalGanLay: number;
  totalNgayCong: number;
  avgSalaryPerDay: number; // Tổng lương / Tổng ngày công
  avgCostPerOrder: number; // Tổng lương / (Đơn giao TL + Đơn lấy TL)
  tiLeLayTC: number;       // Tổng đơn lấy TL / Tổng đơn gán lấy * 100
  activeStaffCount: number;
  rowCount: number;
}

/**
 * Tính toán tổng hợp KPI Hoa hồng ngày & Lương bưu tá
 * Kiểm tra khử trùng lặp theo Nhân viên + Ngày vận hành
 */
export function calculateDailySalaryMetrics(records: DailySalaryRecord[]): DailySalaryAggregatedResult {
  if (!records || records.length === 0) {
    return {
      totalLuong: 0,
      totalLuongHH: 0,
      totalLuongDamBao: 0,
      totalGiaoTL: 0,
      totalLayTL: 0,
      totalGanGiao: 0,
      totalGanLay: 0,
      totalNgayCong: 0,
      avgSalaryPerDay: 0,
      avgCostPerOrder: 0,
      tiLeLayTC: 0,
      activeStaffCount: 0,
      rowCount: 0
    };
  }

  // Khử trùng lặp theo Khóa (maNV + ngay) nếu có bản ghi lặp
  const deduplicatedMap = new Map<string, DailySalaryRecord>();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const key = `${r.maNV || r.tenNV}__${r.ngay || i}`;
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, r);
    }
  }

  const validRecords = Array.from(deduplicatedMap.values());

  let totalLuong = 0;
  let totalLuongHH = 0;
  let totalLuongDamBao = 0;
  let totalGiaoTL = 0;
  let totalLayTL = 0;
  let totalGanGiao = 0;
  let totalGanLay = 0;
  let totalNgayCong = 0;
  const uniqueStaff = new Set<string>();

  for (let i = 0; i < validRecords.length; i++) {
    const r = validRecords[i];
    totalLuong += r.tongLuong || 0;
    totalLuongHH += r.luongHHNgay || 0;
    totalLuongDamBao += r.luongDamBao || 0;
    totalGiaoTL += r.donGiaoTinhLuong || 0;
    totalLayTL += r.donLayTinhLuong || 0;
    totalGanGiao += r.soDonGanGiao || 0;
    totalGanLay += r.soDonGanLay || 0;
    totalNgayCong += r.soNgayDiLam || 0;
    if (r.maNV) uniqueStaff.add(r.maNV);
  }

  const totalOrdersTL = totalGiaoTL + totalLayTL;
  const avgSalaryPerDay = safeDivide(totalLuong, totalNgayCong, 0, false);
  const avgCostPerOrder = safeDivide(totalLuong, totalOrdersTL, 0, false);
  const tiLeLayTC = safeDivide(totalLayTL, totalGanLay, 0, true);

  return {
    totalLuong,
    totalLuongHH,
    totalLuongDamBao,
    totalGiaoTL,
    totalLayTL,
    totalGanGiao,
    totalGanLay,
    totalNgayCong,
    avgSalaryPerDay: Math.round(avgSalaryPerDay),
    avgCostPerOrder: Math.round(avgCostPerOrder),
    tiLeLayTC: Number(tiLeLayTC.toFixed(2)),
    activeStaffCount: uniqueStaff.size,
    rowCount: validRecords.length
  };
}

// ============================================================================
// 4. TỒN ĐỌNG GLT & TỒN ĐỌNG LC (Hai phân hệ Độc lập)
// ============================================================================

export interface BacklogGltAggregatedResult {
  totalOrders: number;
  urgentOrders192: number;    // > 192 giờ
  urgentOrders120_192: number;// 120h - 192h
  overdueOrdersTotal: number; // >= 120 giờ
  normalOrdersUnder120: number;
  rowCount: number;
}

export function calculateBacklogGltMetrics(records: BacklogGltRecord[]): BacklogGltAggregatedResult {
  if (!records || records.length === 0) {
    return {
      totalOrders: 0,
      urgentOrders192: 0,
      urgentOrders120_192: 0,
      overdueOrdersTotal: 0,
      normalOrdersUnder120: 0,
      rowCount: 0
    };
  }

  let totalOrders = 0;
  let urgentOrders192 = 0;
  let urgentOrders120_192 = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    totalOrders += 1;
    if (r.thoiGianTonDong === '192') {
      urgentOrders192 += 1;
    } else if (r.thoiGianTonDong === '120_192') {
      urgentOrders120_192 += 1;
    }
  }

  const overdueOrdersTotal = urgentOrders192 + urgentOrders120_192;
  const normalOrdersUnder120 = totalOrders - overdueOrdersTotal;

  return {
    totalOrders,
    urgentOrders192,
    urgentOrders120_192,
    overdueOrdersTotal,
    normalOrdersUnder120,
    rowCount: records.length
  };
}

export interface BacklogLcAggregatedResult {
  totalOrders: number;
  totalGiao: number;
  totalTra: number;
  count36_48h: number;
  rowCount: number;
}

export function calculateBacklogLcMetrics(records: BacklogLcRecord[]): BacklogLcAggregatedResult {
  if (!records || records.length === 0) {
    return {
      totalOrders: 0,
      totalGiao: 0,
      totalTra: 0,
      count36_48h: 0,
      rowCount: 0
    };
  }

  let totalGiao = 0;
  let totalTra = 0;
  let count36_48h = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const loai = (r.loaiDon || '').toLowerCase();
    if (loai.includes('giao')) totalGiao += 1;
    else if (loai.includes('trả')) totalTra += 1;

    const time = (r.thoiGianTonDong || '').toLowerCase();
    if (time.includes('36') || time.includes('48')) {
      count36_48h += 1;
    }
  }

  return {
    totalOrders: records.length,
    totalGiao,
    totalTra,
    count36_48h,
    rowCount: records.length
  };
}

// ============================================================================
// 5. VẬN HÀNH CA 2 (Phân hệ GTC Nhân Viên & Bưu Cục Ca 2)
// ============================================================================

export interface Ca2OperationsAggregatedResult {
  volumeCa2: number;
  ganCa2: number;
  gtcCa2: number;
  gapVolGan: number;       // Volume Ca 2 - Gán Ca 2 (Dồn ứ sàn chia)
  tonCa2: number;          // Volume Ca 2 - GTC Ca 2
  tiLeGtcCa2: number;      // GTC Ca 2 / Volume Ca 2 * 100
  tiLeGanCa2: number;      // Gán Ca 2 / Volume Ca 2 * 100
  coverageCouriersCa2: number; // Số bưu tá đi ca 2 (2 chuyến)
  couriersOnlyCa1: number;     // Số bưu tá chỉ đi ca 1 (1 chuyến)
  rateCoverageCa2: number;     // Bưu tá đi ca 2 / Tổng bưu tá đi tuyến * 100
}

export function calculateCa2OperationsMetrics(
  poRecords: GtcPostOfficeRecord[],
  empRecords: GtcEmployeeRecord[]
): Ca2OperationsAggregatedResult {
  // 1. Chỉ số sản lượng từ Hàng Mới Ca 2 (GTC Bưu cục)
  const ca2PoRows = poRecords.filter(r => 
    (r.loaiHang || '').toLowerCase().includes('ca 2') || (r.loaiHang || '').toLowerCase().includes('ca2')
  );

  let volumeCa2 = 0;
  let ganCa2 = 0;
  let gtcCa2 = 0;

  for (let i = 0; i < ca2PoRows.length; i++) {
    volumeCa2 += ca2PoRows[i].volume || 0;
    ganCa2 += ca2PoRows[i].sldGan || 0;
    gtcCa2 += ca2PoRows[i].sldGTC || 0;
  }

  const gapVolGan = volumeCa2 - ganCa2;
  const tonCa2 = volumeCa2 - gtcCa2;
  const tiLeGtcCa2 = safeDivide(gtcCa2, volumeCa2, 0, true);
  const tiLeGanCa2 = safeDivide(ganCa2, volumeCa2, 0, true);

  // 2. Chỉ số nhân lực bưu tá từ GTC Nhân viên
  let coverageCouriersCa2 = 0;
  let couriersOnlyCa1 = 0;

  // Lọc theo từng bưu tá trong ngày
  for (let i = 0; i < empRecords.length; i++) {
    const chuyen = empRecords[i].chuyenDi || 1;
    if (chuyen >= 2) {
      coverageCouriersCa2 += 1;
    } else {
      couriersOnlyCa1 += 1;
    }
  }

  const totalCouriers = coverageCouriersCa2 + couriersOnlyCa1;
  const rateCoverageCa2 = safeDivide(coverageCouriersCa2, totalCouriers, 0, true);

  return {
    volumeCa2,
    ganCa2,
    gtcCa2,
    gapVolGan,
    tonCa2,
    tiLeGtcCa2: Number(tiLeGtcCa2.toFixed(2)),
    tiLeGanCa2: Number(tiLeGanCa2.toFixed(2)),
    coverageCouriersCa2,
    couriersOnlyCa1,
    rateCoverageCa2: Number(rateCoverageCa2.toFixed(2))
  };
}
