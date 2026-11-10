import type { 
  DatasetState, 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord,
  NhanSuRecord,
  NghiViecRecord,
  SheetHealthStatus,
  SheetSyncDetail
} from '../types/dashboard';
import { 
  createHeaderReader,
  lookupPostOffice,
  normalizePostOfficeName,
  normalizePostOfficeCode,
  normalizeDate,
  parseNumber,
  normalizeStaffIdentity,
  cleanVietnameseText,
  stripVietnameseDiacritics
} from '../utils/normalizationEngine.ts';

// Import audited local snapshots as safe fallback
import gtcBuuCucSnapshot from '../data/snapshots/gtc_buu_cuc.json';
import gtcNhanVienSnapshot from '../data/snapshots/gtc_nhan_vien.json';
import hoaHongNgaySnapshot from '../data/snapshots/hoa_hong_ngay.json';
import tyLeTraHangSnapshot from '../data/snapshots/ty_le_tra_hang.json';
import tonDongGltSnapshot from '../data/snapshots/ton_dong_glt.json';
import tonDongLcSnapshot from '../data/snapshots/ton_dong_lc.json';
import nhanSuSnapshot from '../data/snapshots/nhan_su.json';
import nghiViecSnapshot from '../data/snapshots/nghi_viec.json';
import { SPREADSHEET_ID } from '../config/dashboard.config';
import { getSpreadsheetId } from './settingsService';

// Re-exports
export { SPREADSHEET_ID, normalizePostOfficeName, normalizePostOfficeCode, lookupPostOffice };
export type { SheetHealthStatus, SheetSyncDetail };

// Danh sách nhân sự bị loại bỏ khỏi 100% dữ liệu dashboard theo chỉ đạo của AM Huy (ĐNB)
// Logic: Các nhân viên này không thuộc bất kỳ bưu cục nào thuộc AM Huy quản lý:
// 1. Lê Thị Hà, 2. Đặng Ngọc Hiếu, 3. Lương Văn Lợi, 4. Đàm Quang Đạt, 5. Phạm Duy Cao Nguyên, 6. Huỳnh Tuấn Hải
export const EXCLUDED_STAFF_NAMES = [
  'Lê Thị Hà',
  'Đặng Ngọc Hiếu',
  'Lương Văn Lợi',
  'Đàm Quang Đạt',
  'Phạm Duy Cao Nguyên',
  'Huỳnh Tuấn Hải'
];

export const EXCLUDED_STAFF_IDS = new Set(['3175777', '3103251', '3183963']);

export function normalizePersonName(name?: string): string {
  if (!name) return '';
  return stripVietnameseDiacritics(name);
}

const EXCLUDED_NORMALIZED_NAMES = EXCLUDED_STAFF_NAMES.map(n => normalizePersonName(n));

export function isExcludedStaff(nameOrRaw?: string, id?: string): boolean {
  if (id && EXCLUDED_STAFF_IDS.has(id.trim())) return true;
  if (!nameOrRaw) return false;
  const norm = normalizePersonName(nameOrRaw);
  for (const ex of EXCLUDED_NORMALIZED_NAMES) {
    if (norm.includes(ex)) return true;
  }
  return false;
}

export const SHEET_NAMES = {
  GTC_BUU_CUC: 'GTC Bưu cục',
  GTC_NHAN_VIEN: 'GTC Nhân viên',
  HOA_HONG_NGAY: 'Hoa hồng ngày',
  TY_LE_TRA_HANG: 'Tỷ lệ trả hàng',
  TON_DONG_GLT: 'Tồn đọng GLT',
  TON_DONG_LC: 'Tồn đọng LC',
  NHAN_SU: 'Nhân sự',
  NGHI_VIEC: 'Nghỉ việc'
};

export function classifyResignationReason(reason?: string): string {
  const r = (reason || '').toLowerCase();
  if (r.includes('chiếm dụng') || r.includes('xoay cod') || r.includes('gối đầu') || r.includes('nộp cod trễ') || r.includes('thiếu trung thực') || r.includes('sai pod')) {
    return 'Vi phạm kỷ luật & COD';
  }
  if (r.includes('cộng tác viên') || r.includes('ctv')) {
    return 'Cộng tác viên (Thời vụ)';
  }
  if (r.includes('sức khoẻ') || r.includes('sức khỏe') || r.includes('tai nạn') || r.includes('gãy chân')) {
    return 'Sức khỏe & Lý do thể lực';
  }
  if (r.includes('gia đình') || r.includes('việc nhà') || r.includes('về quê') || r.includes('con nhỏ') || r.includes('vợ kinh doanh') || r.includes('riêng')) {
    return 'Việc gia đình / Cá nhân';
  }
  return 'Không phù hợp / Nghỉ ngang';
}

function parseDateDDMMYYYYHelper(str?: string): Date | null {
  if (!str) return null;
  const d = normalizeDate(str);
  return d.isValid ? d.dateObj : null;
}

function getWeekNumberHelper(d: Date): number {
  const target = new Date(d.getTime());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
  const week1 = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

const benchmarkVolMap: Record<string, number> = {
  'G01: Dưới 1 tháng': 72,
  'G02: Trên 1 - 3 tháng': 88,
  'G03: Trên 3 - 6 tháng': 105,
  'G04: Trên 6 tháng - 1 năm': 118,
  'G05: Trên 1 - 1,5 năm': 125,
  'G06: Trên 1,5 -2 năm': 130,
  'G07: Trên 2 - 3 năm': 135,
  'G08: Trên 3 - 4 năm': 138,
  'G09: Trên 4 - 5 năm': 142,
  'G10: Trên 5 năm': 145
};

const benchmarkSalaryMap: Record<string, number> = {
  'G01: Dưới 1 tháng': 285000,
  'G02: Trên 1 - 3 tháng': 325000,
  'G03: Trên 3 - 6 tháng': 365000,
  'G04: Trên 6 tháng - 1 năm': 410000,
  'G05: Trên 1 - 1,5 năm': 430000,
  'G06: Trên 1,5 -2 năm': 445000,
  'G07: Trên 2 - 3 năm': 465000,
  'G08: Trên 3 - 4 năm': 480000,
  'G09: Trên 4 - 5 năm': 500000,
  'G10: Trên 5 năm': 520000
};

export function parseCSV(text: string): string[][] {
  if (!text) return [];

  // Strip UTF-8 Byte Order Mark (BOM) if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let curVal = '';
  
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(curVal.trim());
      curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(curVal.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      curVal = '';
    } else {
      curVal += char;
    }
  }
  if (curVal.length > 0 || row.length > 0) {
    row.push(curVal.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
}

export interface FetchCsvResult {
  text: string;
  httpStatus: number;
  durationMs: number;
}

async function fetchCsvWithTimeout(sheetName: string, timeoutMs = 8000): Promise<FetchCsvResult> {
  const url = `https://docs.google.com/spreadsheets/d/${getSpreadsheetId()}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    if (!res.ok) {
      const err: any = new Error(`HTTP ${res.status} from Google Sheets`);
      err.httpStatus = res.status;
      err.durationMs = durationMs;
      throw err;
    }
    const text = await res.text();
    if (text.includes('google.visualization.Query.setResponse') && text.includes('"status":"error"')) {
      const err: any = new Error(`Google Sheets API: Bảng tính không có sheet "${sheetName}"`);
      err.httpStatus = 200;
      err.durationMs = durationMs;
      throw err;
    }
    if (text.trim().startsWith('<!DOCTYPE html') || text.includes('<html')) {
      const err: any = new Error(`Google Sheets API: Phản hồi trả về HTML thay vì CSV cho sheet "${sheetName}"`);
      err.httpStatus = 200;
      err.durationMs = durationMs;
      throw err;
    }
    return { text, httpStatus: res.status, durationMs };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (!err.durationMs) {
      err.durationMs = Date.now() - startTime;
    }
    throw err;
  }
}

export interface DatasetLoadResult {
  data: DatasetState;
  source: 'LIVE_SHEETS' | 'CACHED_SNAPSHOT' | 'HYBRID';
  error: string | null;
  sheetStatuses: Record<string, SheetSyncDetail>;
}

export async function loadDataset(): Promise<DatasetLoadResult> {
  const sheetStatuses: Record<string, SheetSyncDetail> = {};
  const nowStr = new Date().toLocaleString('vi-VN');

  // --------------------------------------------------------------------------
  // 1. Sheet: GTC Bưu cục
  // --------------------------------------------------------------------------
  let gtcBuuCuc: GtcPostOfficeRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.GTC_BUU_CUC);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Dữ liệu GTC Bưu cục trống');
    
    const reader = createHeaderReader(rows[0]);
    gtcBuuCuc = rows.slice(1)
      .filter(r => {
        const bc = reader.getCol(r, ['bưu cục', 'buu cuc', 'tên bc']);
        if (!bc || bc.toLowerCase() === 'grand total' || bc.trim() === '') return false;
        const ngayRaw = reader.getCol(r, ['ngày', 'ngay', 'date']);
        const d = normalizeDate(ngayRaw);
        return d.isValid;
      })
      .map(r => {
        const buuCuc = normalizePostOfficeName(reader.getCol(r, ['bưu cục', 'buu cuc', 'tên bc']));
        const ngay = normalizeDate(reader.getCol(r, ['ngày', 'ngay', 'date'])).standard || '';
        return {
          buuCuc,
          loaiHang: reader.getCol(r, ['loại hàng', 'loai hang', 'ca']) || 'Chưa phân loại',
          time: reader.getCol(r, ['time', 'thời gian', 'thoi gian']),
          volume: parseNumber(reader.getCol(r, ['volume', 'sản lượng']), { fallback: 0 }) || 0,
          tiLeGan: reader.getCol(r, ['% gán', '% gan', 'tỷ lệ gán']) || '0%',
          tiLeGTC: reader.getCol(r, ['% gtc', '%gtc', 'tỷ lệ gtc']) || '0%',
          tiLeChuyenTra: reader.getCol(r, ['% chuyển trả', '% chuyen tra', 'tỷ lệ trả hàng']) || '0%',
          leadtime: parseNumber(reader.getCol(r, ['leadtime', 'lead time']), { fallback: 0 }) || 0,
          sldGan: parseNumber(reader.getCol(r, ['slđ gán', 'sld gan', 'đơn gán']), { fallback: 0 }) || 0,
          sldGTC: parseNumber(reader.getCol(r, ['slđ gtc', 'sld gtc', 'đơn gtc']), { fallback: 0 }) || 0,
          tonDong: parseNumber(reader.getCol(r, ['tồn đọng', 'ton dong', 'tồn']), { fallback: 0 }) || 0,
          ngay,
          thu: reader.getCol(r, ['thứ', 'thu']) || ''
        };
      });

    sheetStatuses[SHEET_NAMES.GTC_BUU_CUC] = {
      sheetName: SHEET_NAMES.GTC_BUU_CUC,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: gtcBuuCuc.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    gtcBuuCuc = (gtcBuuCucSnapshot as GtcPostOfficeRecord[]).map(r => ({
      ...r,
      buuCuc: normalizePostOfficeName(r.buuCuc)
    }));
    sheetStatuses[SHEET_NAMES.GTC_BUU_CUC] = {
      sheetName: SHEET_NAMES.GTC_BUU_CUC,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: gtcBuuCuc.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: err.message,
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // 2. Sheet: GTC Nhân viên
  // --------------------------------------------------------------------------
  let gtcNhanVien: GtcEmployeeRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.GTC_NHAN_VIEN);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Dữ liệu GTC Nhân viên trống');

    const reader = createHeaderReader(rows[0]);
    const dateColIndices = reader.getAllIndices(['ngày', 'ngay']);

    gtcNhanVien = rows.slice(1)
      .filter(r => {
        const bc = reader.getCol(r, ['bưu cục', 'buu cuc']);
        const nvRaw = reader.getCol(r, ['nhân viên', 'nhan vien']);
        if (!bc || !nvRaw) return false;
        
        let validDate = false;
        for (const idx of dateColIndices) {
          if (normalizeDate(r[idx]).isValid) {
            validDate = true;
            break;
          }
        }
        if (!validDate) return false;

        const staff = normalizeStaffIdentity(nvRaw);
        if (isExcludedStaff(staff.tenNV, staff.maNV) || staff.tenNV.includes('Trần Trọng Phú')) return false;
        return true;
      })
      .map(r => {
        const nvRaw = reader.getCol(r, ['nhân viên', 'nhan vien']);
        const staff = normalizeStaffIdentity(nvRaw);
        
        // Find standard DD/MM/YYYY date and display date
        let standardDate = '';
        let displayDate = '';
        for (const idx of dateColIndices) {
          const norm = normalizeDate(r[idx]);
          if (norm.isValid && !standardDate) {
            standardDate = norm.standard || '';
          }
          if (r[idx] && r[idx].includes('thg') && !displayDate) {
            displayDate = r[idx].trim();
          }
        }
        if (!displayDate) displayDate = standardDate;

        return {
          buuCuc: normalizePostOfficeName(reader.getCol(r, ['bưu cục', 'buu cuc'])),
          nhanVienRaw: nvRaw,
          maNV: staff.maNV,
          tenNV: staff.tenNV,
          ngayDisplay: displayDate,
          tongDon: parseNumber(reader.getCol(r, ['tổng đơn', 'tong don']), { fallback: 0 }) || 0,
          tongDonGTC: parseNumber(reader.getCol(r, ['tổng đơn gtc', 'tong don gtc']), { fallback: 0 }) || 0,
          tiLeGTC: reader.getCol(r, ['%gtc', '% gtc']) || '0%',
          leadtime: parseNumber(reader.getCol(r, ['lead time', 'leadtime']), { fallback: 0 }) || 0,
          chuyenDi: parseNumber(reader.getCol(r, ['chuyến đi', 'chuyen di']), { fallback: 0 }) || 0,
          tonDong: parseNumber(reader.getCol(r, ['tồn đọng', 'ton dong']), { fallback: 0 }) || 0,
          ngay: standardDate,
          thu: reader.getCol(r, ['thứ', 'thu']) || ''
        };
      });

    sheetStatuses[SHEET_NAMES.GTC_NHAN_VIEN] = {
      sheetName: SHEET_NAMES.GTC_NHAN_VIEN,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: gtcNhanVien.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    gtcNhanVien = (gtcNhanVienSnapshot as GtcEmployeeRecord[])
      .filter(r => !isExcludedStaff(r.tenNV || r.nhanVienRaw, r.maNV))
      .map(r => ({
        ...r,
        buuCuc: normalizePostOfficeName(r.buuCuc)
      }));
    sheetStatuses[SHEET_NAMES.GTC_NHAN_VIEN] = {
      sheetName: SHEET_NAMES.GTC_NHAN_VIEN,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: gtcNhanVien.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: err.message,
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // 3. Sheet: Hoa hồng ngày
  // --------------------------------------------------------------------------
  let hoaHongNgay: DailySalaryRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.HOA_HONG_NGAY);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Dữ liệu Hoa hồng ngày trống');

    const reader = createHeaderReader(rows[0]);
    hoaHongNgay = rows.slice(1)
      .filter(r => {
        const nvRaw = reader.getCol(r, ['nhân viên', 'nhan vien']);
        if (!nvRaw) return false;
        const ngayRaw = reader.getCol(r, ['ngày', 'ngay', 'date']);
        const d = normalizeDate(ngayRaw);
        if (!d.isValid) return false;

        const staff = normalizeStaffIdentity(nvRaw);
        if (isExcludedStaff(staff.tenNV, staff.maNV) || staff.tenNV.includes('Trần Trọng Phú')) return false;
        return true;
      })
      .map(r => {
        const nvRaw = reader.getCol(r, ['nhân viên', 'nhan vien']);
        const staff = normalizeStaffIdentity(nvRaw);
        const bcRaw = reader.getCol(r, ['bưu cục', 'buu cuc', 'tên bc']);
        const postOfficeMeta = lookupPostOffice(bcRaw);
        const tenBC = postOfficeMeta.standardName;
        const maBC = postOfficeMeta.standardCode;
        const buuCucRaw = tenBC === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : bcRaw;
        const ngay = normalizeDate(reader.getCol(r, ['ngày', 'ngay', 'date'])).standard || '';

        return {
          nhanVienRaw: nvRaw,
          maNV: staff.maNV,
          tenNV: staff.tenNV,
          buuCucRaw,
          maBC,
          tenBC,
          vung: reader.getCol(r, ['vùng', 'vung', 'khu vực']) || '',
          ngayVaoLam: reader.getCol(r, ['ngày vào làm', 'ngay vao lam']) || '',
          thamNien: reader.getCol(r, ['thâm niên', 'tham nien']) || '',
          thoiGian: reader.getCol(r, ['thời gian', 'thoi gian', 'time']) || '',
          soDonGanGiao: parseNumber(reader.getCol(r, ['số đơn gán giao', 'so don gan giao']), { fallback: 0 }) || 0,
          soDonGanLay: parseNumber(reader.getCol(r, ['số đơn gán lấy', 'so don gan lay']), { fallback: 0 }) || 0,
          donGiaoTinhLuong: parseNumber(reader.getCol(r, ['đơn giao tính lương', 'don giao tinh luong']), { fallback: 0 }) || 0,
          giaoTbNgay: parseNumber(reader.getCol(r, ['giao tb/ngày', 'giao tb/ngay']), { fallback: 0 }) || 0,
          donLayTinhLuong: parseNumber(reader.getCol(r, ['đơn lấy tính lương', 'don lay tinh luong']), { fallback: 0 }) || 0,
          layTbNgay: parseNumber(reader.getCol(r, ['lấy tb/ngày', 'lay tb/ngay']), { fallback: 0 }) || 0,
          soNgayDiLam: parseNumber(reader.getCol(r, ['số ngày đi làm', 'so ngay di lam']), { fallback: 0 }) || 0,
          luongHHNgay: parseNumber(reader.getCol(r, ['lương hh/ ngày', 'luong hh/ ngay', 'hoa hồng ngày']), { fallback: 0 }) || 0,
          tongLuong: parseNumber(reader.getCol(r, ['tổng lương', 'tong luong', 'lương tổng']), { fallback: 0 }) || 0,
          luongDamBao: parseNumber(reader.getCol(r, ['lương đảm bảo', 'luong dam bao']), { fallback: 0 }) || 0,
          ngay,
          thu: reader.getCol(r, ['thứ', 'thu']) || ''
        };
      });

    sheetStatuses[SHEET_NAMES.HOA_HONG_NGAY] = {
      sheetName: SHEET_NAMES.HOA_HONG_NGAY,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: hoaHongNgay.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    hoaHongNgay = (hoaHongNgaySnapshot as DailySalaryRecord[])
      .filter(r => !isExcludedStaff(r.tenNV || r.nhanVienRaw, r.maNV))
      .map(r => {
        const postOfficeMeta = lookupPostOffice({ code: r.maBC, name: r.tenBC });
        const tenBC = postOfficeMeta.standardName;
        return {
          ...r,
          tenBC,
          maBC: postOfficeMeta.standardCode,
          buuCucRaw: tenBC === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : r.buuCucRaw
        };
      });
    sheetStatuses[SHEET_NAMES.HOA_HONG_NGAY] = {
      sheetName: SHEET_NAMES.HOA_HONG_NGAY,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: hoaHongNgay.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: err.message,
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // 4. Sheet: Tồn đọng GLT
  // --------------------------------------------------------------------------
  let tonDongGlt: BacklogGltRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.TON_DONG_GLT);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Dữ liệu Tồn đọng GLT trống');

    const reader = createHeaderReader(rows[0]);
    tonDongGlt = rows.slice(1)
      .filter(r => {
        const bc = reader.getCol(r, ['bưu cục', 'buu cuc', 'tên bc']);
        const orderId = reader.getCol(r, ['mã đơn hàng', 'ma don hang']);
        return Boolean(bc && orderId);
      })
      .map(r => {
        const buuCucRaw = reader.getCol(r, ['bưu cục', 'buu cuc', 'tên bc']);
        const meta = lookupPostOffice(buuCucRaw);
        return {
          buuCuc: meta.standardName,
          maBC: meta.standardCode,
          maDonHang: cleanVietnameseText(reader.getCol(r, ['mã đơn hàng', 'ma don hang'])),
          loaiDon: reader.getCol(r, ['loại đơn', 'loai don']) || 'Khác',
          khachHang: reader.getCol(r, ['khách hàng', 'khach hang']) || 'OTHER',
          phuongXa: reader.getCol(r, ['phường/xã', 'phuong/xa']) || '',
          trangThai: reader.getCol(r, ['trạng thái', 'trang thai']) || '',
          thoiGianTonDong: reader.getCol(r, ['thời gian tồn đọng', 'thoi gian ton dong']) || '',
          canhBao: reader.getCol(r, ['cảnh báo', 'canh bao']) || ''
        };
      });

    sheetStatuses[SHEET_NAMES.TON_DONG_GLT] = {
      sheetName: SHEET_NAMES.TON_DONG_GLT,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: tonDongGlt.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    tonDongGlt = (tonDongGltSnapshot as BacklogGltRecord[]).map(r => {
      const meta = lookupPostOffice({ code: r.maBC, name: r.buuCuc });
      return {
        ...r,
        buuCuc: meta.standardName,
        maBC: meta.standardCode
      };
    });
    sheetStatuses[SHEET_NAMES.TON_DONG_GLT] = {
      sheetName: SHEET_NAMES.TON_DONG_GLT,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: tonDongGlt.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: err.message,
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // 5. Sheet: Tồn đọng LC
  // --------------------------------------------------------------------------
  let tonDongLc: BacklogLcRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.TON_DONG_LC);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Dữ liệu Tồn đọng LC trống');

    const reader = createHeaderReader(rows[0]);
    tonDongLc = rows.slice(1)
      .filter(r => {
        const bc = reader.getCol(r, ['tên bc', 'ten bc', 'bưu cục', 'buu cuc']);
        const orderId = reader.getCol(r, ['mã đơn hàng', 'ma don hang']);
        return Boolean(bc && orderId);
      })
      .map(r => {
        const bcRaw = reader.getCol(r, ['tên bc', 'ten bc', 'bưu cục', 'buu cuc']);
        const meta = lookupPostOffice(bcRaw);
        return {
          tenBC: meta.standardName,
          maBC: meta.standardCode,
          maDonHang: cleanVietnameseText(reader.getCol(r, ['mã đơn hàng', 'ma don hang'])),
          loaiDon: reader.getCol(r, ['loại đơn', 'loai don']) || 'Luân chuyển',
          khachHang: reader.getCol(r, ['khách hàng', 'khach hang']) || 'OTHER',
          trangThai: reader.getCol(r, ['trạng thái', 'trang thai']) || '',
          thoiGianTonDong: reader.getCol(r, ['thời gian tồn đọng', 'thoi gian ton dong']) || '',
          canhBao: reader.getCol(r, ['cảnh báo', 'canh bao']) || ''
        };
      });

    sheetStatuses[SHEET_NAMES.TON_DONG_LC] = {
      sheetName: SHEET_NAMES.TON_DONG_LC,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: tonDongLc.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    tonDongLc = (tonDongLcSnapshot as BacklogLcRecord[]).map(r => {
      const meta = lookupPostOffice({ code: r.maBC, name: r.tenBC });
      return {
        ...r,
        tenBC: meta.standardName,
        maBC: meta.standardCode
      };
    });
    sheetStatuses[SHEET_NAMES.TON_DONG_LC] = {
      sheetName: SHEET_NAMES.TON_DONG_LC,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: tonDongLc.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: err.message,
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // 6. Sheet: Tỷ lệ trả hàng (Xác nhận trong dữ liệu thực tế chỉ có header, 0 data)
  // --------------------------------------------------------------------------
  let tyLeTraHang: any[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.TY_LE_TRA_HANG);
    const rows = parseCSV(text);
    if (rows.length <= 1) {
      sheetStatuses[SHEET_NAMES.TY_LE_TRA_HANG] = {
        sheetName: SHEET_NAMES.TY_LE_TRA_HANG,
        status: 'SNAPSHOT',
        source: 'CACHED_SNAPSHOT',
        lastUpdated: nowStr,
        rowCount: 0,
        httpStatus,
        durationMs,
        fallbackReason: 'Nguồn Google Sheets chỉ có dòng header, 0 bản ghi số liệu.',
        error: 'Nguồn Google Sheets chỉ có dòng header, 0 bản ghi số liệu.'
      };
    } else {
      tyLeTraHang = rows.slice(1);
      sheetStatuses[SHEET_NAMES.TY_LE_TRA_HANG] = {
        sheetName: SHEET_NAMES.TY_LE_TRA_HANG,
        status: 'LIVE',
        source: 'LIVE_SHEETS',
        lastUpdated: nowStr,
        rowCount: tyLeTraHang.length,
        httpStatus,
        durationMs,
        error: null
      };
    }
  } catch (err: any) {
    tyLeTraHang = tyLeTraHangSnapshot as any[];
    sheetStatuses[SHEET_NAMES.TY_LE_TRA_HANG] = {
      sheetName: SHEET_NAMES.TY_LE_TRA_HANG,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: 0,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: 'Google Sheets chưa có dữ liệu; hệ thống sử dụng trường % Chuyển trả từ GTC Bưu cục.',
      error: 'Google Sheets chưa có dữ liệu; hệ thống sử dụng trường % Chuyển trả từ GTC Bưu cục.'
    };
  }

  // --------------------------------------------------------------------------
  // 7. Sheet: Nhân sự
  // --------------------------------------------------------------------------
  let nhanSu: NhanSuRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.NHAN_SU);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Sheet Nhân sự trống hoặc chỉ có dòng tiêu đề');

    const reader = createHeaderReader(rows[0]);

    // Kiểm tra cấu trúc tiêu đề bắt buộc
    const hasIdCol = reader.hasCol([
      'id',
      'employee id',
      'employee_id',
      'mã nv',
      'ma nv',
      'mã nhân viên',
      'ma nhan vien',
      'manv',
      'id nv'
    ]);
    const hasNameCol = reader.hasCol([
      'tên nhân viên',
      'ten nhan vien',
      'họ và tên',
      'ho va ten',
      'họ tên',
      'ho ten',
      'nhân viên',
      'nhan vien',
      'full name'
    ]);

    if (!hasIdCol || !hasNameCol) {
      const missing: string[] = [];
      if (!hasIdCol) missing.push('ID / Mã NV');
      if (!hasNameCol) missing.push('Tên nhân viên');
      const err: any = new Error(`Cấu trúc sheet Nhân sự không hợp lệ. Thiếu cột bắt buộc: ${missing.join(', ')}`);
      err.httpStatus = httpStatus;
      err.durationMs = durationMs;
      err.missingHeaders = missing;
      throw err;
    }

    nhanSu = rows.slice(1)
      .filter(r => {
        const maNV = reader.getCol(r, [
          'id',
          'employee id',
          'employee_id',
          'mã nv',
          'ma nv',
          'mã nhân viên',
          'ma nhan vien',
          'manv',
          'id nv'
        ]);
        const tenNV = reader.getCol(r, [
          'tên nhân viên',
          'ten nhan vien',
          'họ và tên',
          'ho va ten',
          'họ tên',
          'ho ten',
          'nhân viên',
          'nhan vien',
          'full name'
        ]);
        if (!maNV || maNV.toLowerCase() === 'id' || maNV.toLowerCase() === 'mã nv') return false;
        if (isExcludedStaff(tenNV, maNV)) return false;
        return true;
      })
      .map(r => {
        const maNV = reader.getCol(r, [
          'id',
          'employee id',
          'employee_id',
          'mã nv',
          'ma nv',
          'mã nhân viên',
          'ma nhan vien',
          'manv',
          'id nv'
        ]);
        const tenNV = reader.getCol(r, [
          'tên nhân viên',
          'ten nhan vien',
          'họ và tên',
          'ho va ten',
          'họ tên',
          'ho ten',
          'nhân viên',
          'nhan vien',
          'full name'
        ]);
        const buuCucRaw = reader.getCol(r, [
          'bưu cục',
          'buu cuc',
          'kho/ bưu cục',
          'kho/buu cuc',
          'kho / bưu cục',
          'tên bc',
          'ten bc',
          'tên bưu cục',
          'bưu cục làm việc',
          'bc',
          'kho',
          'post office'
        ]);
        const meta = lookupPostOffice(buuCucRaw);
        const stdBuuCucRaw = meta.standardName === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : buuCucRaw;

        return {
          maNV,
          tenNV,
          chucVu: reader.getCol(r, ['chức vụ', 'chuc vu', 'vị trí', 'vi tri', 'position', 'role']) || 'Business Development Field Executive',
          ngayVaoLamText: reader.getCol(r, ['ngày vào làm (text)', 'ngày vào làm', 'ngay vao lam']),
          ngayNghiViecText: reader.getCol(r, ['ngày nghỉ việc (text)', 'ngày nghỉ việc', 'ngay nghi viec']),
          trangThai: reader.getCol(r, ['trạng thái', 'trang thai', 'status']) || 'Đang làm việc',
          buuCucRaw: stdBuuCucRaw,
          buuCuc: meta.standardName,
          zone: reader.getCol(r, ['zone', 'khu vực', 'khu vuc']),
          am: reader.getCol(r, ['am', 'quản lý', 'quan ly', 'area manager']),
          loaiHD: reader.getCol(r, ['loại hđ', 'loai hd', 'loại hợp đồng', 'loai hop dong', 'contract type']) || 'HĐLĐ',
          tinh: reader.getCol(r, ['tỉnh', 'tinh', 'province']) || 'Long An',
          vung: reader.getCol(r, ['vùng', 'vung', 'region']) || 'DNB',
          nhomThamNien: reader.getCol(r, ['nhóm thâm niên', 'nhom tham nien', 'thâm niên', 'tham nien', 'seniority']),
          ngayVaoLam: normalizeDate(reader.getCol(r, ['ngày vào làm', 'ngay vao lam', 'start date'])).standard || ''
        };
      });

    if (nhanSu.length === 0) {
      throw new Error('Dữ liệu sheet Nhân sự không có bản ghi hợp lệ sau khi parse');
    }

    sheetStatuses[SHEET_NAMES.NHAN_SU] = {
      sheetName: SHEET_NAMES.NHAN_SU,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: nhanSu.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    const fallbackReason = err.message || 'Lỗi không xác định khi tải dữ liệu live';
    console.warn(`[DataConnector] Fallback snapshot cho sheet ${SHEET_NAMES.NHAN_SU}: ${fallbackReason} (Duration: ${err.durationMs ?? 0}ms, HTTP: ${err.httpStatus ?? 'N/A'})`);

    nhanSu = (nhanSuSnapshot as NhanSuRecord[])
      .filter(r => !isExcludedStaff(r.tenNV, r.maNV))
      .map(r => {
        const meta = lookupPostOffice(r.buuCuc);
        return {
          ...r,
          buuCuc: meta.standardName,
          buuCucRaw: meta.standardName === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : r.buuCucRaw
        };
      });
    sheetStatuses[SHEET_NAMES.NHAN_SU] = {
      sheetName: SHEET_NAMES.NHAN_SU,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: nhanSu.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason,
      error: fallbackReason
    };
  }

  // Lookups for performance and salary cross-referencing
  const gtcPerfMap: Record<string, { totalDon: number; days: number }> = {};
  gtcNhanVien.forEach(r => {
    const id = r.maNV;
    if (!gtcPerfMap[id]) gtcPerfMap[id] = { totalDon: 0, days: 0 };
    gtcPerfMap[id].totalDon += (r.tongDon || 0);
    gtcPerfMap[id].days += 1;
  });

  const hhSalaryMap: Record<string, { totalSalary: number; days: number }> = {};
  hoaHongNgay.forEach(r => {
    const id = r.maNV;
    if (!hhSalaryMap[id]) hhSalaryMap[id] = { totalSalary: 0, days: 0 };
    hhSalaryMap[id].totalSalary += (r.tongLuong || r.luongHHNgay || 0);
    hhSalaryMap[id].days += 1;
  });

  // --------------------------------------------------------------------------
  // 8. Sheet: Nghỉ việc
  // --------------------------------------------------------------------------
  let nghiViec: NghiViecRecord[] = [];
  try {
    const { text, httpStatus, durationMs } = await fetchCsvWithTimeout(SHEET_NAMES.NGHI_VIEC);
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Sheet Nghỉ việc trống');

    const reader = createHeaderReader(rows[0]);
    nghiViec = rows.slice(1)
      .filter(r => {
        const id = reader.getCol(r, ['mã nv', 'ma nv', 'id']);
        const ten = reader.getCol(r, ['họ và tên', 'ho va ten', 'tên', 'ten']);
        if (!id) return false;
        if (isExcludedStaff(ten, id)) return false;
        return true;
      })
      .map(r => {
        const id = reader.getCol(r, ['mã nv', 'ma nv', 'id']);
        const ten = reader.getCol(r, ['họ và tên', 'ho va ten', 'tên', 'ten']);
        const buuCucRaw = reader.getCol(r, ['bưu cục', 'buu cuc']);
        const meta = lookupPostOffice(buuCucRaw);
        const stdBuuCucRaw = meta.standardName === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : buuCucRaw;
        const lyDoNghiViec = reader.getCol(r, ['lý do nghỉ việc', 'ly do nghi viec']);
        const nhomLyDo = classifyResignationReason(lyDoNghiViec);
        const nhomThamNien = reader.getCol(r, ['nhóm thâm niên', 'nhom tham nien']);
        const ngayVaoLam = normalizeDate(reader.getCol(r, ['ngày vào làm', 'ngay vao lam'])).standard || '';
        const ngayNghiViec = normalizeDate(reader.getCol(r, ['ngày nghỉ việc', 'ngay nghi viec'])).standard || '';

        const dStart = parseDateDDMMYYYYHelper(ngayVaoLam);
        const dEnd = parseDateDDMMYYYYHelper(ngayNghiViec);
        let soNgayLam = 1;
        if (dStart && dEnd) {
          soNgayLam = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)));
        }

        const perf = gtcPerfMap[id];
        const sal = hhSalaryMap[id];
        const isRealtimeLog = Boolean(perf || sal);
        const sanLuongTb = perf && perf.days > 0 ? Math.round(perf.totalDon / perf.days) : (benchmarkVolMap[nhomThamNien] || 85);
        const mucLuongTb = sal && sal.days > 0 ? Math.round(sal.totalSalary / sal.days) : (benchmarkSalaryMap[nhomThamNien] || 320000);

        let thangNghiViec = '';
        let namNghiViec = '2026';
        let tuanNghiViec = 'Tuần 1';
        if (dEnd) {
          const m = (dEnd.getMonth() + 1).toString().padStart(2, '0');
          const y = dEnd.getFullYear().toString();
          thangNghiViec = `${m}/${y}`;
          namNghiViec = y;
          tuanNghiViec = `Tuần ${getWeekNumberHelper(dEnd)}`;
        }

        return {
          id,
          ten,
          ngayVaoLamText: reader.getCol(r, ['ngày vào làm (text)', 'ngày vào làm']),
          ngayNghiViecText: reader.getCol(r, ['ngày nghỉ việc (text)', 'ngày nghỉ việc']),
          chucVu: reader.getCol(r, ['chức vụ', 'chuc vu']),
          buuCucRaw: stdBuuCucRaw,
          buuCuc: meta.standardName,
          maBC: meta.standardCode,
          section: reader.getCol(r, ['zone', 'section']) || 'Zone Tay Ninh',
          am: reader.getCol(r, ['am', 'quản lý']) || 'Nguyễn Hoàng Huy',
          lyDoNghiViec,
          nhomLyDo,
          nhomThamNien,
          ngayLamViecCuoi: reader.getCol(r, ['ngày làm việc cuối', 'ngay lam viec cuoi']),
          ngayVaoLam,
          ngayNghiViec,
          soNgayLam,
          sanLuongTb,
          mucLuongTb,
          isRealtimeLog,
          thangNghiViec,
          namNghiViec,
          tuanNghiViec
        };
      });

    sheetStatuses[SHEET_NAMES.NGHI_VIEC] = {
      sheetName: SHEET_NAMES.NGHI_VIEC,
      status: 'LIVE',
      source: 'LIVE_SHEETS',
      lastUpdated: nowStr,
      rowCount: nghiViec.length,
      httpStatus,
      durationMs,
      error: null
    };
  } catch (err: any) {
    nghiViec = (nghiViecSnapshot as NghiViecRecord[])
      .filter(r => !isExcludedStaff(r.ten, r.id))
      .map(r => {
        const meta = lookupPostOffice(r.buuCuc);
        return {
          ...r,
          buuCuc: meta.standardName,
          maBC: meta.standardCode,
          buuCucRaw: meta.standardName === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : r.buuCucRaw
        };
      });
    sheetStatuses[SHEET_NAMES.NGHI_VIEC] = {
      sheetName: SHEET_NAMES.NGHI_VIEC,
      status: 'SNAPSHOT',
      source: 'CACHED_SNAPSHOT',
      lastUpdated: 'Snapshot kiểm toán',
      rowCount: nghiViec.length,
      httpStatus: err.httpStatus,
      durationMs: err.durationMs,
      fallbackReason: err.message,
      error: err.message
    };
  }

  // --------------------------------------------------------------------------
  // Determine overall status & source
  // --------------------------------------------------------------------------
  const allStatuses = Object.values(sheetStatuses);
  const liveCount = allStatuses.filter(s => s.status === 'LIVE').length;
  const snapshotCount = allStatuses.filter(s => s.status === 'SNAPSHOT').length;

  let overallSource: 'LIVE_SHEETS' | 'CACHED_SNAPSHOT' | 'HYBRID' = 'HYBRID';
  if (liveCount === allStatuses.length) {
    overallSource = 'LIVE_SHEETS';
  } else if (snapshotCount === allStatuses.length) {
    overallSource = 'CACHED_SNAPSHOT';
  } else {
    overallSource = 'HYBRID';
  }

  const failedSheets = allStatuses.filter(s => s.status === 'SNAPSHOT' && s.error && !s.error.includes('header'));
  const overallError = failedSheets.length > 0 
    ? `${failedSheets.length} sheet sử dụng snapshot an toàn (${failedSheets.map(s => s.sheetName).join(', ')})`
    : null;

  return {
    data: {
      gtcBuuCuc,
      gtcNhanVien,
      hoaHongNgay,
      tyLeTraHang,
      tonDongGlt,
      tonDongLc,
      nhanSu,
      nghiViec
    },
    source: overallSource,
    error: overallError,
    sheetStatuses
  };
}
