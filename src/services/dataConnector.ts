import type { 
  DatasetState, 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord,
  NhanSuRecord,
  NghiViecRecord
} from '../types/dashboard';
import { isValidDateDDMMYYYY } from '../utils/dateEngine';

// Import audited local snapshots as safe fallback
import gtcBuuCucSnapshot from '../data/snapshots/gtc_buu_cuc.json';
import gtcNhanVienSnapshot from '../data/snapshots/gtc_nhan_vien.json';
import hoaHongNgaySnapshot from '../data/snapshots/hoa_hong_ngay.json';
import tyLeTraHangSnapshot from '../data/snapshots/ty_le_tra_hang.json';
import tonDongGltSnapshot from '../data/snapshots/ton_dong_glt.json';
import tonDongLcSnapshot from '../data/snapshots/ton_dong_lc.json';
import nhanSuSnapshot from '../data/snapshots/nhan_su.json';
import nghiViecSnapshot from '../data/snapshots/nghi_viec.json';

export const SPREADSHEET_ID = '1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY';

// Danh sách nhân sự không còn là bưu tá - loại bỏ khỏi toàn bộ báo cáo và tính toán
export const EXCLUDED_STAFF_IDS = new Set(['3175777']);

// Chuẩn hóa tên Bưu cục khu vực Long An (ĐNB) - Đồng nhất hoàn toàn '(LAN) Cần Đước' vào '(LAN) Cần Đước 1'
export function normalizePostOfficeName(bc?: string): string {
  if (!bc) return '';
  const trimmed = bc.trim();
  // (LAN) Cần Đước 1 tên trước đây là (LAN) Cần Đước, mã bưu cục là 23220000
  if (
    trimmed === '(LAN) Cần Đước' || 
    trimmed === 'Cần Đước' ||
    trimmed === '(LAN) Cần Đước 1' ||
    trimmed === 'Cần Đước 1' ||
    trimmed.includes('Cần Đước') ||
    trimmed === '2278' ||
    trimmed === '23220000'
  ) {
    return '(LAN) Cần Đước 1';
  }
  return trimmed;
}

// Chuẩn hóa mã bưu cục - (LAN) Cần Đước 1 có mã bưu cục chuẩn duy nhất là 23220000
export function normalizePostOfficeCode(code?: string, bcName?: string): string {
  const trimmedCode = (code || '').trim();
  const trimmedName = (bcName || '').trim();
  if (
    trimmedCode === '2278' || 
    trimmedCode === '23220000' || 
    trimmedName.includes('Cần Đước')
  ) {
    return '23220000';
  }
  return trimmedCode;
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
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m, d);
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

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let curVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
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

function parseNum(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function fetchCsvWithTimeout(sheetName: string, timeoutMs = 8000): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from Google Sheets`);
    }
    return await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function loadDataset(): Promise<{
  data: DatasetState;
  source: 'LIVE_SHEETS' | 'CACHED_SNAPSHOT';
  error: string | null;
}> {
  try {
    // Attempt live fetch for all sheets
    const [gtcBcText, gtcNvText, hhText, gltText, lcText, nhanSuText, nghiViecText] = await Promise.all([
      fetchCsvWithTimeout(SHEET_NAMES.GTC_BUU_CUC),
      fetchCsvWithTimeout(SHEET_NAMES.GTC_NHAN_VIEN),
      fetchCsvWithTimeout(SHEET_NAMES.HOA_HONG_NGAY),
      fetchCsvWithTimeout(SHEET_NAMES.TON_DONG_GLT),
      fetchCsvWithTimeout(SHEET_NAMES.TON_DONG_LC),
      fetchCsvWithTimeout(SHEET_NAMES.NHAN_SU),
      fetchCsvWithTimeout(SHEET_NAMES.NGHI_VIEC)
    ]);

    // 1. Parse GTC Bưu cục: Cột M (index 12)
    // Phải đúng định dạng dd/mm/yyyy và bỏ Grand Total!
    const gtcBcRows = parseCSV(gtcBcText).slice(1);
    const gtcBuuCuc: GtcPostOfficeRecord[] = gtcBcRows
      .filter(r => {
        const ngay = r[12];
        if (!isValidDateDDMMYYYY(ngay)) return false;
        if (!r[0] || r[0].toLowerCase() === 'grand total' || r[0].trim() === '') return false;
        return true;
      })
      .map(r => ({
        buuCuc: normalizePostOfficeName(r[0]),
        loaiHang: r[1] || 'Chưa phân loại',
        time: r[2] || '',
        volume: parseNum(r[3]),
        tiLeGan: r[4] || '0%',
        tiLeGTC: r[5] || '0%',
        tiLeChuyenTra: r[6] || '0%',
        leadtime: parseNum(r[7]),
        sldGan: parseNum(r[8]),
        sldGTC: parseNum(r[9]),
        tonDong: parseNum(r[10]),
        ngay: r[12].trim(), // Cột M
        thu: r[13] || ''
      }));

    // 2. Parse GTC Nhân viên: Cột J (index 9)
    // Phải đúng định dạng dd/mm/yyyy
    const gtcNvRows = parseCSV(gtcNvText).slice(1);
    const gtcNhanVien: GtcEmployeeRecord[] = gtcNvRows
      .filter(r => {
        const ngay = r[9];
        if (!isValidDateDDMMYYYY(ngay)) return false;
        if (!r[0] || !r[1] || r[0].trim() === '' || r[1].trim() === '') return false;
        const nvRaw = r[1] || '';
        const maNV = nvRaw.split('_')[0]?.trim() || '';
        if (EXCLUDED_STAFF_IDS.has(maNV) || nvRaw.includes('Trần Trọng Phú')) return false;
        return true;
      })
      .map(r => {
        const nvRaw = r[1];
        const parts = nvRaw.split('_');
        return {
          buuCuc: normalizePostOfficeName(r[0]),
          nhanVienRaw: nvRaw,
          maNV: parts[0]?.trim() || '',
          tenNV: parts.slice(1).join('_').trim() || nvRaw,
          ngayDisplay: r[2] || '',
          tongDon: parseNum(r[3]),
          tongDonGTC: parseNum(r[4]),
          tiLeGTC: r[5] || '0%',
          leadtime: parseNum(r[6]),
          chuyenDi: parseNum(r[7]),
          tonDong: parseNum(r[8]),
          ngay: r[9].trim(), // Cột J
          thu: r[10] || ''
        };
      });

    // 3. Parse Hoa hồng ngày: Cột R (index 17)
    // Phải đúng định dạng dd/mm/yyyy
    const hhRows = parseCSV(hhText).slice(1);
    const hoaHongNgay: DailySalaryRecord[] = hhRows
      .filter(r => {
        const ngay = r[17];
        if (!isValidDateDDMMYYYY(ngay)) return false;
        if (!r[0] || r[0].trim() === '') return false;
        const nvRaw = r[0] || '';
        const maNV = nvRaw.split('-')[0]?.trim() || '';
        if (EXCLUDED_STAFF_IDS.has(maNV) || nvRaw.includes('Trần Trọng Phú')) return false;
        return true;
      })
      .map(r => {
        const nvRaw = r[0];
        const nvParts = nvRaw.split('-');
        const bcRaw = r[1] || '';
        const bcParts = bcRaw.split('-');
        const rawBc = bcParts.slice(1).join('-').trim() || bcRaw;
        const tenBC = normalizePostOfficeName(rawBc);
        const maBC = normalizePostOfficeCode(bcParts[0]?.trim() || '', tenBC);
        const buuCucRaw = tenBC === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : bcRaw;
        return {
          nhanVienRaw: nvRaw,
          maNV: nvParts[0]?.trim() || '',
          tenNV: nvParts.slice(1).join('-').trim() || nvRaw,
          buuCucRaw,
          maBC,
          tenBC,
          vung: r[2] || '',
          ngayVaoLam: r[3] || '',
          thamNien: r[4] || '',
          thoiGian: r[5] || '',
          soDonGanGiao: parseNum(r[6]),
          soDonGanLay: parseNum(r[7]),
          donGiaoTinhLuong: parseNum(r[8]),
          giaoTbNgay: parseNum(r[9]),
          donLayTinhLuong: parseNum(r[10]),
          layTbNgay: parseNum(r[11]),
          soNgayDiLam: parseNum(r[12]),
          luongHHNgay: parseNum(r[13]),
          tongLuong: parseNum(r[14]),
          luongDamBao: parseNum(r[15]),
          ngay: r[17].trim(), // Cột R
          thu: r[18] || ''
        };
      });

    // 4. Parse Tồn đọng GLT
    const gltRows = parseCSV(gltText).slice(1);
    const tonDongGlt: BacklogGltRecord[] = gltRows
      .filter(r => r[0] && r[2] && r[0].trim() !== '')
      .map(r => {
        const buuCuc = normalizePostOfficeName(r[0]);
        const maBC = normalizePostOfficeCode(r[1] || '', buuCuc);
        return {
          buuCuc,
          maBC,
          maDonHang: r[2],
          loaiDon: r[3] || 'Khác',
          khachHang: r[4] || 'OTHER',
          phuongXa: r[5] || '',
          trangThai: r[6] || '',
          thoiGianTonDong: r[7] || '',
          canhBao: r[8] || ''
        };
      });

    // 5. Parse Tồn đọng LC
    const lcRows = parseCSV(lcText).slice(1);
    const tonDongLc: BacklogLcRecord[] = lcRows
      .filter(r => r[0] && r[2] && r[0].trim() !== '')
      .map(r => {
        const tenBC = normalizePostOfficeName(r[0]);
        const maBC = normalizePostOfficeCode(r[1] || '', tenBC);
        return {
          tenBC,
          maBC,
          maDonHang: r[2],
          loaiDon: r[3] || 'Luân chuyển',
          khachHang: r[4] || 'OTHER',
          trangThai: r[5] || '',
          thoiGianTonDong: r[6] || '',
          canhBao: r[7] || ''
        };
      });

    // 6. Parse Nhân sự: Sheet 'Nhân sự' (bao gồm 3175777 Trần Trọng Phú đảm nhiệm vị trí NVXL Tầm Vu)
    const nhanSuRows = parseCSV(nhanSuText).slice(1);
    const nhanSu: NhanSuRecord[] = nhanSuRows
      .filter(r => r[0] && r[0].trim() !== '')
      .map(r => {
        const maNV = r[0].trim();
        const tenNV = (r[1] || '').trim();
        const chucVu = (r[2] || '').trim();
        const ngayVaoLamText = (r[3] || '').trim();
        const ngayNghiViecText = (r[4] || '').trim();
        const trangThai = (r[5] || '').trim();
        const buuCucRaw = (r[6] || '').trim();
        const rawBcName = buuCucRaw.includes('-') ? buuCucRaw.split('-').slice(1).join('-').trim() : buuCucRaw;
        const buuCuc = normalizePostOfficeName(rawBcName);
        const stdBuuCucRaw = buuCuc === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : buuCucRaw;
        const zone = (r[7] || '').trim();
        const am = (r[8] || '').trim();
        const loaiHD = (r[9] || '').trim();
        const tinh = (r[10] || '').trim();
        const vung = (r[11] || '').trim();
        const nhomThamNien = (r[12] || '').trim();
        const ngayVaoLam = (r[13] || '').trim();

        return {
          maNV,
          tenNV,
          chucVu,
          ngayVaoLamText,
          ngayNghiViecText,
          trangThai,
          buuCucRaw: stdBuuCucRaw,
          buuCuc,
          zone,
          am,
          loaiHD,
          tinh,
          vung,
          nhomThamNien,
          ngayVaoLam
        };
      });

    // Lookups for performance and salary matching
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

    // 7. Parse Nghỉ việc: Sheet 'Nghỉ việc'
    const nghiViecRows = parseCSV(nghiViecText).slice(1);
    const nghiViec: NghiViecRecord[] = nghiViecRows
      .filter(r => r[0] && r[0].trim() !== '')
      .map(r => {
        const id = r[0].trim();
        const ten = (r[1] || '').trim();
        const ngayVaoLamText = (r[2] || '').trim();
        const ngayNghiViecText = (r[3] || '').trim();
        const chucVu = (r[4] || '').trim();
        const buuCucRaw = (r[5] || '').trim();
        const rawBcName = buuCucRaw.includes('-') ? buuCucRaw.split('-').slice(1).join('-').trim() : buuCucRaw;
        const rawBcCode = buuCucRaw.includes('-') ? buuCucRaw.split('-')[0].trim() : '';
        const buuCuc = normalizePostOfficeName(rawBcName);
        const maBC = normalizePostOfficeCode(rawBcCode, buuCuc);
        const stdBuuCucRaw = buuCuc === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : buuCucRaw;
        const section = (r[6] || 'Zone Tay Ninh').trim();
        const am = (r[7] || 'Nguyễn Hoàng Huy').trim();
        const lyDoNghiViec = (r[8] || '').trim();
        const nhomLyDo = classifyResignationReason(lyDoNghiViec);
        const nhomThamNien = (r[9] || '').trim();
        const ngayLamViecCuoi = (r[10] || '').trim();
        const ngayVaoLam = (r[11] || '').trim();
        const ngayNghiViec = (r[12] || '').trim();

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
          ngayVaoLamText,
          ngayNghiViecText,
          chucVu,
          buuCucRaw: stdBuuCucRaw,
          buuCuc,
          maBC,
          section,
          am,
          lyDoNghiViec,
          nhomLyDo,
          nhomThamNien,
          ngayLamViecCuoi,
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

    return {
      data: {
        gtcBuuCuc,
        gtcNhanVien,
        hoaHongNgay,
        tyLeTraHang: [],
        tonDongGlt,
        tonDongLc,
        nhanSu,
        nghiViec
      },
      source: 'LIVE_SHEETS',
      error: null
    };

  } catch (err: any) {
    console.warn('Live Google Sheets fetch failed. Using validated snapshot:', err.message);
    
    return {
      data: {
        gtcBuuCuc: (gtcBuuCucSnapshot as GtcPostOfficeRecord[]).map(r => ({
          ...r,
          buuCuc: normalizePostOfficeName(r.buuCuc)
        })),
        gtcNhanVien: (gtcNhanVienSnapshot as GtcEmployeeRecord[])
          .filter(r => !EXCLUDED_STAFF_IDS.has(r.maNV))
          .map(r => ({
            ...r,
            buuCuc: normalizePostOfficeName(r.buuCuc)
          })),
        hoaHongNgay: (hoaHongNgaySnapshot as DailySalaryRecord[])
          .filter(r => !EXCLUDED_STAFF_IDS.has(r.maNV))
          .map(r => {
            const tenBC = normalizePostOfficeName(r.tenBC);
            return {
              ...r,
              tenBC,
              maBC: normalizePostOfficeCode(r.maBC, tenBC),
              buuCucRaw: tenBC === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : r.buuCucRaw
            };
          }),
        tyLeTraHang: tyLeTraHangSnapshot as any[],
        tonDongGlt: (tonDongGltSnapshot as BacklogGltRecord[]).map(r => {
          const buuCuc = normalizePostOfficeName(r.buuCuc);
          return {
            ...r,
            buuCuc,
            maBC: normalizePostOfficeCode(r.maBC, buuCuc)
          };
        }),
        tonDongLc: (tonDongLcSnapshot as BacklogLcRecord[]).map(r => {
          const tenBC = normalizePostOfficeName(r.tenBC);
          return {
            ...r,
            tenBC,
            maBC: normalizePostOfficeCode(r.maBC, tenBC)
          };
        }),
        nhanSu: (nhanSuSnapshot as NhanSuRecord[]).map(r => {
          const buuCuc = normalizePostOfficeName(r.buuCuc);
          return {
            ...r,
            buuCuc,
            buuCucRaw: buuCuc === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : r.buuCucRaw
          };
        }),
        nghiViec: (nghiViecSnapshot as NghiViecRecord[]).map(r => {
          const buuCuc = normalizePostOfficeName(r.buuCuc);
          return {
            ...r,
            buuCuc,
            maBC: normalizePostOfficeCode(r.maBC, buuCuc),
            buuCucRaw: buuCuc === '(LAN) Cần Đước 1' ? '23220000 - (LAN) Cần Đước 1' : r.buuCucRaw
          };
        })
      },
      source: 'CACHED_SNAPSHOT',
      error: `Không thể kết nối trực tiếp đến Google Sheets (${err.message}). Hệ thống đang hiển thị dữ liệu kiểm toán snapshot gần nhất.`
    };
  }
}
