import type { 
  DatasetState, 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord,
  NhanSuRecord
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

export const SPREADSHEET_ID = '1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY';

// Danh sách nhân sự không còn là bưu tá - loại bỏ khỏi toàn bộ báo cáo và tính toán
export const EXCLUDED_STAFF_IDS = new Set(['3175777']);

// Chuẩn hóa tên Bưu cục khu vực Long An (ĐNB) - Hợp nhất '(LAN) Cần Đước' vào '(LAN) Cần Đước 1'
export function normalizePostOfficeName(bc?: string): string {
  if (!bc) return '';
  const trimmed = bc.trim();
  if (trimmed === '(LAN) Cần Đước' || trimmed === 'Cần Đước') {
    return '(LAN) Cần Đước 1';
  }
  return trimmed;
}

export const SHEET_NAMES = {
  GTC_BUU_CUC: 'GTC Bưu cục',
  GTC_NHAN_VIEN: 'GTC Nhân viên',
  HOA_HONG_NGAY: 'Hoa hồng ngày',
  TY_LE_TRA_HANG: 'Tỷ lệ trả hàng',
  TON_DONG_GLT: 'Tồn đọng GLT',
  TON_DONG_LC: 'Tồn đọng LC',
  NHAN_SU: 'Nhân sự'
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
    const [gtcBcText, gtcNvText, hhText, gltText, lcText, nhanSuText] = await Promise.all([
      fetchCsvWithTimeout(SHEET_NAMES.GTC_BUU_CUC),
      fetchCsvWithTimeout(SHEET_NAMES.GTC_NHAN_VIEN),
      fetchCsvWithTimeout(SHEET_NAMES.HOA_HONG_NGAY),
      fetchCsvWithTimeout(SHEET_NAMES.TON_DONG_GLT),
      fetchCsvWithTimeout(SHEET_NAMES.TON_DONG_LC),
      fetchCsvWithTimeout(SHEET_NAMES.NHAN_SU)
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
        return {
          nhanVienRaw: nvRaw,
          maNV: nvParts[0]?.trim() || '',
          tenNV: nvParts.slice(1).join('-').trim() || nvRaw,
          buuCucRaw: bcRaw,
          maBC: bcParts[0]?.trim() || '',
          tenBC: normalizePostOfficeName(bcParts.slice(1).join('-').trim() || bcRaw),
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
      .map(r => ({
        buuCuc: normalizePostOfficeName(r[0]),
        maBC: r[1] || '',
        maDonHang: r[2],
        loaiDon: r[3] || 'Khác',
        khachHang: r[4] || 'OTHER',
        phuongXa: r[5] || '',
        trangThai: r[6] || '',
        thoiGianTonDong: r[7] || '',
        canhBao: r[8] || ''
      }));

    // 5. Parse Tồn đọng LC
    const lcRows = parseCSV(lcText).slice(1);
    const tonDongLc: BacklogLcRecord[] = lcRows
      .filter(r => r[0] && r[2] && r[0].trim() !== '')
      .map(r => ({
        tenBC: normalizePostOfficeName(r[0]),
        maBC: r[1] || '',
        maDonHang: r[2],
        loaiDon: r[3] || 'Luân chuyển',
        khachHang: r[4] || 'OTHER',
        trangThai: r[5] || '',
        thoiGianTonDong: r[6] || '',
        canhBao: r[7] || ''
      }));

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
          buuCucRaw,
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

    return {
      data: {
        gtcBuuCuc,
        gtcNhanVien,
        hoaHongNgay,
        tyLeTraHang: [],
        tonDongGlt,
        tonDongLc,
        nhanSu
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
          .map(r => ({
            ...r,
            tenBC: normalizePostOfficeName(r.tenBC)
          })),
        tyLeTraHang: tyLeTraHangSnapshot as any[],
        tonDongGlt: (tonDongGltSnapshot as BacklogGltRecord[]).map(r => ({
          ...r,
          buuCuc: normalizePostOfficeName(r.buuCuc)
        })),
        tonDongLc: (tonDongLcSnapshot as BacklogLcRecord[]).map(r => ({
          ...r,
          tenBC: normalizePostOfficeName(r.tenBC)
        })),
        nhanSu: (nhanSuSnapshot as NhanSuRecord[]).map(r => ({
          ...r,
          buuCuc: normalizePostOfficeName(r.buuCuc)
        }))
      },
      source: 'CACHED_SNAPSHOT',
      error: `Không thể kết nối trực tiếp đến Google Sheets (${err.message}). Hệ thống đang hiển thị dữ liệu kiểm toán snapshot gần nhất.`
    };
  }
}
