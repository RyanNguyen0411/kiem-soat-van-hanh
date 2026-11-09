const fs = require('fs');
const path = require('path');
const {
  createHeaderReader,
  normalizePostOfficeName,
  normalizePostOfficeCode,
  normalizeDate,
  parseNumber,
  cleanVietnameseText,
  normalizeStaffIdentity
} = require('./test_norm_engine.cjs');

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let curVal = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { curVal += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      row.push(curVal.trim()); curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(curVal.trim());
      if (row.some(c => c.length > 0)) lines.push(row);
      row = []; curVal = '';
    } else {
      curVal += char;
    }
  }
  if (curVal.length > 0 || row.length > 0) {
    row.push(curVal.trim());
    if (row.some(c => c.length > 0)) lines.push(row);
  }
  return lines;
}

const dir = 'C:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY';

console.log('=== DATA RECONCILIATION TEST ===\n');

// 1. GTC Bưu cục
const bcContent = fs.readFileSync(path.join(dir, 'sheet_GTC_Bưu_cục.csv'), 'utf8');
const bcRows = parseCSV(bcContent);
const bcHeaders = bcRows[0];
const bcReader = createHeaderReader(bcHeaders);

console.log('GTC Bưu cục Total Rows:', bcRows.length - 1);
let bcValidCount = 0;
let bcTotalVolume = 0;
let bcTotalSldGtc = 0;

for (const r of bcRows.slice(1)) {
  const buuCucRaw = bcReader.getCol(r, ['bưu cục', 'buu cuc', 'tên bc']);
  if (!buuCucRaw || buuCucRaw.toLowerCase() === 'grand total') continue;
  
  const ngayRaw = bcReader.getCol(r, ['ngày', 'ngay', 'date']);
  const normDate = normalizeDate(ngayRaw);
  if (!normDate.isValid) continue;

  bcValidCount++;
  const vol = parseNumber(bcReader.getCol(r, ['volume', 'sản lượng']), { fallback: 0 });
  const sldGtc = parseNumber(bcReader.getCol(r, ['slđ gtc', 'sld gtc']), { fallback: 0 });
  bcTotalVolume += vol;
  bcTotalSldGtc += sldGtc;
}
console.log(`GTC Bưu cục Parsed: ${bcValidCount} rows, Total Volume: ${bcTotalVolume.toLocaleString('vi-VN')}, Total SLĐ GTC: ${bcTotalSldGtc.toLocaleString('vi-VN')}`);

// 2. GTC Nhân viên
const nvContent = fs.readFileSync(path.join(dir, 'sheet_GTC_Nhân_viên.csv'), 'utf8');
const nvRows = parseCSV(nvContent);
const nvHeaders = nvRows[0];
const nvReader = createHeaderReader(nvHeaders);

console.log('\nGTC Nhân viên Total Rows:', nvRows.length - 1);
let nvValidCount = 0;
let nvTotalTongDon = 0;
let nvTotalTongDonGtc = 0;

// All date indices
const nvDateIndices = nvReader.getAllIndices(['ngày', 'ngay']);
console.log('GTC Nhân viên date column indices:', nvDateIndices);

for (const r of nvRows.slice(1)) {
  const buuCuc = nvReader.getCol(r, ['bưu cục', 'buu cuc']);
  const nvRaw = nvReader.getCol(r, ['nhân viên', 'nhan vien']);
  if (!buuCuc || !nvRaw) continue;

  // Pick valid DD/MM/YYYY date
  let validDate = null;
  for (const idx of nvDateIndices) {
    const d = normalizeDate(r[idx]);
    if (d.isValid) {
      validDate = d;
      break;
    }
  }
  if (!validDate) continue;

  const staff = normalizeStaffIdentity(nvRaw);
  if (staff.tenNV.includes('Trần Trọng Phú') || staff.maNV === '3175777') continue;

  nvValidCount++;
  const tongDon = parseNumber(nvReader.getCol(r, ['tổng đơn', 'tong don']), { fallback: 0 });
  const tongDonGtc = parseNumber(nvReader.getCol(r, ['tổng đơn gtc', 'tong don gtc']), { fallback: 0 });
  nvTotalTongDon += tongDon;
  nvTotalTongDonGtc += tongDonGtc;
}
console.log(`GTC Nhân viên Parsed: ${nvValidCount} rows, Total Đơn: ${nvTotalTongDon.toLocaleString('vi-VN')}, Total GTC: ${nvTotalTongDonGtc.toLocaleString('vi-VN')}`);

// 3. Hoa hồng ngày
const hhContent = fs.readFileSync(path.join(dir, 'sheet_Hoa_hồng_ngày.csv'), 'utf8');
const hhRows = parseCSV(hhContent);
const hhHeaders = hhRows[0];
const hhReader = createHeaderReader(hhHeaders);

console.log('\nHoa hồng ngày Total Rows:', hhRows.length - 1);
let hhValidCount = 0;
let hhTotalLuong = 0;

for (const r of hhRows.slice(1)) {
  const nvRaw = hhReader.getCol(r, ['nhân viên', 'nhan vien']);
  if (!nvRaw) continue;

  const ngayRaw = hhReader.getCol(r, ['ngày', 'ngay', 'date']);
  const normDate = normalizeDate(ngayRaw);
  if (!normDate.isValid) continue;

  const staff = normalizeStaffIdentity(nvRaw);
  if (staff.tenNV.includes('Trần Trọng Phú') || staff.maNV === '3175777') continue;

  hhValidCount++;
  const luong = parseNumber(hhReader.getCol(r, ['tổng lương', 'tong luong', 'lương hh/ ngày']), { fallback: 0 });
  hhTotalLuong += luong;
}
console.log(`Hoa hồng ngày Parsed: ${hhValidCount} rows, Total Lương: ${Math.round(hhTotalLuong).toLocaleString('vi-VN')} đ`);

// 4. Tồn đọng GLT & LC
const gltContent = fs.readFileSync(path.join(dir, 'sheet_Tồn_đọng_GLT.csv'), 'utf8');
const gltRows = parseCSV(gltContent);
const gltReader = createHeaderReader(gltRows[0]);
let gltCount = 0;
for (const r of gltRows.slice(1)) {
  const bc = gltReader.getCol(r, ['bưu cục', 'buu cuc']);
  const orderId = gltReader.getCol(r, ['mã đơn hàng', 'ma don hang']);
  if (bc && orderId) gltCount++;
}
console.log(`\nTồn đọng GLT Parsed: ${gltCount} records`);

const lcContent = fs.readFileSync(path.join(dir, 'sheet_Tồn_đọng_LC.csv'), 'utf8');
const lcRows = parseCSV(lcContent);
const lcReader = createHeaderReader(lcRows[0]);
let lcCount = 0;
for (const r of lcRows.slice(1)) {
  const bc = lcReader.getCol(r, ['tên bc', 'ten bc', 'bưu cục']);
  const orderId = lcReader.getCol(r, ['mã đơn hàng', 'ma don hang']);
  if (bc && orderId) lcCount++;
}
console.log(`Tồn đọng LC Parsed: ${lcCount} records`);
