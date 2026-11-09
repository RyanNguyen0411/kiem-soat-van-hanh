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
  | 'ton_dong_lc';

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
