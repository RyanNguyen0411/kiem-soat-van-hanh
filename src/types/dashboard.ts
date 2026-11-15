export type TabType = 
  | 'overview' 
  | 'gtc_buu_cuc' 
  | 'bao_cao_gtc_bc'
  | 'gtc_nhan_vien' 
  | 'nhan_su'
  | 'ns_nghi_viec'
  | 'hoa_hong_ngay' 
  | 'ty_le_tra_hang' 
  | 'ton_dong_glt' 
  | 'ton_dong_lc'
  | 'quan_ly_buu_cuc';

export interface GtcPostOfficeRecord {
  buuCuc: string;
  loaiHang: string;
  time: string;
  volume: number;
  tiLeGan: string;
  tiLeGTC: string;
  tiLeChuyenTra: string;
  leadtime: number;
  sldGan: number;
  sldGTC: number;
  tonDong: number;
  ngay: string;
  thu: string;
}

export interface GtcEmployeeRecord {
  buuCuc: string;
  nhanVienRaw: string;
  maNV: string;
  tenNV: string;
  ngayDisplay: string;
  tongDon: number;
  tongDonGTC: number;
  tiLeGTC: string;
  leadtime: number;
  chuyenDi: number;
  tonDong: number;
  ngay: string;
  thu: string;
  ganLay?: number;
  layTC?: number;
  tiLeLTC?: string;
}

export interface DailySalaryRecord {
  nhanVienRaw: string;
  maNV: string;
  tenNV: string;
  buuCucRaw: string;
  maBC: string;
  tenBC: string;
  vung: string;
  ngayVaoLam: string;
  thamNien: string;
  thoiGian: string;
  soDonGanGiao: number;
  soDonGanLay: number;
  donGiaoTinhLuong: number;
  giaoTbNgay: number;
  donLayTinhLuong: number;
  layTbNgay: number;
  soNgayDiLam: number;
  luongHHNgay: number;
  tongLuong: number;
  luongDamBao: number;
  ngay: string;
  thu: string;
}

export interface BacklogGltRecord {
  buuCuc: string;
  maBC: string;
  maDonHang: string;
  loaiDon: string;
  khachHang: string;
  phuongXa: string;
  trangThai: string;
  thoiGianTonDong: string;
  canhBao: string;
}

export interface BacklogLcRecord {
  tenBC: string;
  maBC: string;
  maDonHang: string;
  loaiDon: string;
  khachHang: string;
  trangThai: string;
  thoiGianTonDong: string;
  canhBao: string;
}

export interface NhanSuRecord {
  maNV: string;
  tenNV: string;
  chucVu: string;
  ngayVaoLamText: string;
  ngayNghiViecText: string;
  trangThai: string;
  buuCucRaw: string;
  buuCuc: string;
  zone: string;
  am: string;
  loaiHD: string;
  tinh: string;
  vung: string;
  nhomThamNien: string;
  ngayVaoLam: string; // dd/mm/yyyy
  thamNienNgay?: number; // Days calculated from hire date to reference date
}

export interface NghiViecRecord {
  id: string; // mã NV
  ten: string;
  ngayVaoLamText: string;
  ngayNghiViecText: string;
  chucVu: string;
  buuCucRaw: string;
  buuCuc: string;
  maBC: string;
  section: string;
  am: string;
  lyDoNghiViec: string;
  nhomLyDo: string;
  nhomThamNien: string;
  ngayLamViecCuoi: string;
  ngayVaoLam: string; // dd/mm/yyyy
  ngayNghiViec: string; // dd/mm/yyyy
  soNgayLam: number; // số ngày làm việc cụ thể
  sanLuongTb: number; // sản lượng giao trung bình
  mucLuongTb: number; // mức lương trung bình
  isRealtimeLog: boolean;
  thangNghiViec: string;
  namNghiViec: string;
  tuanNghiViec: string;
}

export interface DatasetState {
  gtcBuuCuc: GtcPostOfficeRecord[];
  gtcNhanVien: GtcEmployeeRecord[];
  hoaHongNgay: DailySalaryRecord[];
  tyLeTraHang: any[];
  tonDongGlt: BacklogGltRecord[];
  tonDongLc: BacklogLcRecord[];
  nhanSu: NhanSuRecord[];
  nghiViec: NghiViecRecord[];
}

export type SheetHealthStatus = 'LIVE' | 'SNAPSHOT' | 'ERROR' | 'STALE' | 'LOADING';

export interface SheetSyncDetail {
  sheetName: string;
  status: SheetHealthStatus;
  source: 'LIVE_SHEETS' | 'CACHED_SNAPSHOT';
  lastUpdated: string;
  rowCount: number;
  error?: string | null;
  httpStatus?: number;
  durationMs?: number;
  fallbackReason?: string;
}

export interface SyncStatus {
  source: 'LIVE_SHEETS' | 'CACHED_SNAPSHOT' | 'HYBRID';
  lastUpdated: string;
  isSyncing: boolean;
  error: string | null;
  sheetStatuses?: Record<string, SheetSyncDetail>;
}

export interface FilterOptions {
  buuCuc?: string[];
  ngay?: string[];
  loaiHang?: string[];
  nhanVien?: string[];
  loaiDon?: string[];
  trangThai?: string[];
  canhBao?: string[];
  thoiGianTonDong?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

// ============================================================================
// GHN EXECUTIVE BI - UNIFIED PICKUP, DELIVERY & RETURN DOMAIN MODELS
// ============================================================================

export type OperationType = 'PICKUP' | 'DELIVERY' | 'RETURN';

export type OperationalVerificationStatus = 
  | 'VERIFIED' 
  | 'PARTIALLY_VERIFIED' 
  | 'NOT_FOUND' 
  | 'INVALID';

export interface UnifiedOperationalMetric {
  operationType: OperationType;
  title: string;
  totalEvents: number;
  successfulEvents: number;
  successRate: number | null; // null if unverified
  backlogOrders: number;
  verificationStatus: OperationalVerificationStatus;
  sourceSheet: string;
  notes: string;
}

export interface OrderConflictEntry<T = unknown> {
  orderId: string;
  conflictType: 'BUSINESS_CONFLICT' | 'SECONDARY_DIFF';
  diffFields: string[];
  keptRecord: T;
  duplicateRecords: T[];
}

export interface GltBacklogBreakdown {
  totalUnique: number;       // 10,928 mã đơn duy nhất
  giao: number;              // 7,461 ('Giao')
  uuTienTre: number;         // 1,161 ('Ưu tiên giao/đã trễ' + 'Ưu tiên giao/trong ngày')
  uuTienDaTre: number;       // 713 ('Ưu tiên giao/đã trễ')
  uuTienTrongNgay: number;   // 448 ('Ưu tiên giao/trong ngày')
  lay: number;               // 2,040 ('Lấy')
  tra: number;               // 266 ('Trả')
  businessConflictCount: number;   // Nhóm A: Khác loaiDon, trangThai, hoặc buuCuc
  secondaryDiffCount: number;      // Nhóm B: Cùng trường cốt lõi, khác canhBao hoặc thoiGianTonDong
  exactDuplicateCount: number;     // Trùng hoàn toàn các trường kiểm tra
  duplicateRowsIgnored: number;
  emptyOrderIdRowsIgnored: number;
  businessConflicts: OrderConflictEntry<BacklogGltRecord>[];
  secondaryDiffs: OrderConflictEntry<BacklogGltRecord>[];
}

export interface LcBacklogBreakdown {
  totalUnique: number;       // 284 mã đơn duy nhất
  lcGiao: number;            // 229 ('Luân chuyển giao')
  lcTra: number;             // 55 ('Luân chuyển trả')
  businessConflictCount: number;   // Nhóm A: Khác trangThai hoặc tenBC
  secondaryDiffCount: number;      // Nhóm B: Cùng trường cốt lõi, khác canhBao hoặc thoiGianTonDong
  exactDuplicateCount: number;     // Trùng hoàn toàn các trường kiểm tra
  duplicateRowsIgnored: number;
  emptyOrderIdRowsIgnored: number;
  businessConflicts: OrderConflictEntry<BacklogLcRecord>[];
  secondaryDiffs: OrderConflictEntry<BacklogLcRecord>[];
}

export interface ShiftDeliveryBacklogMetric {
  tonGiaoTrongCa: number;    // Volume - SLĐ GTC (không dùng Math.max(0, ...) để không che giấu bất thường)
  hasGtcExceedsVolumeAnomaly: boolean; // Cảnh báo khi SLĐ GTC > Volume
  anomalyRowCount: number;   // Số dòng bản ghi có SLĐ GTC > Volume
}

export interface ExecutiveOverviewScope {
  // A. Unique Orders (Đơn hàng duy nhất - Snapshot hiện hành)
  uniqueOrders: {
    backlogTotal: number; // Tổng đơn duy nhất toàn diện (khử trùng GLT ∪ LC)
    gltTotal: number;     // 10,928 mã đơn GLT duy nhất (Snapshot hiện hành)
    lcTotal: number;      // 284 mã đơn LC duy nhất (Snapshot hiện hành)
    pickupBacklog: number; // 2,040 (GLT Lấy)
    deliveryBacklog: number; // 8,622 (GLT Giao 7,461 + GLT Ưu tiên/Trễ 1,161)
    returnBacklog: number; // 266 (GLT Trả)
    gltBreakdown: GltBacklogBreakdown;
    lcBreakdown: LcBacklogBreakdown;
    historicalCompleted: number | null; // Mark as unverified because completed events are aggregated
    verificationStatus: OperationalVerificationStatus;
  };

  // B. Operational Events (Tổng lượt nghiệp vụ theo kỳ lọc)
  operationalEvents: {
    totalEvents: number;
    pickupEvents: number;
    deliveryEvents: number;
    returnEvents: number;
    tonGiaoTrongCa: number; // Volume - SLĐ GTC
    hasGtcExceedsVolumeAnomaly: boolean;
    verificationStatus: OperationalVerificationStatus;
  };
}

