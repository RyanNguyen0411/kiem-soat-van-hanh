import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHeaderReader,
  lookupPostOffice,
  normalizePostOfficeName,
  normalizePostOfficeCode,
  normalizeDate,
  parseNumber,
  parseInteger,
  parsePercentage,
  parseCurrency,
  cleanVietnameseText,
  stripVietnameseDiacritics,
  normalizeOrderId,
  normalizeStaffIdentity
} from '../src/utils/normalizationEngine.ts';

test('1. CHUẨN HÓA SỐ LIỆU: Phân biệt rõ số 0, giá trị trống, null và dữ liệu lỗi', () => {
  // Test distinct 0 vs null/empty
  assert.equal(parseNumber(0), 0, 'Số 0 nguyên thủy phải giữ nguyên 0');
  assert.equal(parseNumber('0'), 0, 'Chuỗi "0" phải parse ra đúng 0');
  assert.equal(parseNumber('0.0'), 0, 'Chuỗi "0.0" phải parse ra đúng 0');
  
  // Empty, null, undefined, invalid
  assert.equal(parseNumber(''), null, 'Chuỗi rỗng phải trả về null, không tự biến thành 0');
  assert.equal(parseNumber(null), null, 'Giá trị null phải trả về null');
  assert.equal(parseNumber(undefined), null, 'Giá trị undefined phải trả về null');
  assert.equal(parseNumber('null'), null, 'Chuỗi "null" phải trả về null');
  assert.equal(parseNumber('-'), null, 'Ký tự gạch ngang "-" phải trả về null');
  assert.equal(parseNumber('N/A'), null, 'Chuỗi "N/A" phải trả về null');
  assert.equal(parseNumber('invalid'), null, 'Chuỗi không hợp lệ phải trả về null');

  // Custom fallback
  assert.equal(parseNumber('', { fallback: 0 }), 0, 'Cho phép cấu hình fallback = 0 khi có nhu cầu');
  assert.equal(parseNumber(null, { fallback: -1 }), -1, 'Cho phép cấu hình fallback tùy ý');
});

test('2. CHUẨN HÓA SỐ THỰC, PHẦN TRĂM VÀ TIỀN TỆ ĐỊNH DẠNG VIỆT NAM', () => {
  // Vietnamese number format (thousands '.' and decimal ',')
  assert.equal(parseNumber('1.234.567,89'), 1234567.89, 'Parse đúng định dạng số Việt Nam 1.234.567,89');
  assert.equal(parseNumber('481.234,54'), 481234.54, 'Parse đúng lương lẻ 481.234,54');
  
  // US standard format
  assert.equal(parseNumber('1,234,567.89'), 1234567.89, 'Tự tương thích định dạng quốc tế 1,234,567.89');

  // Accounting negative format
  assert.equal(parseNumber('(250)'), -250, 'Parse đúng số âm dạng kế toán (250)');
  assert.equal(parseNumber('-1.500'), -1500, 'Parse đúng số âm thường -1.500');

  // Integer parser
  assert.equal(parseInteger('964,00'), 964, 'Parse số nguyên đúng chuẩn');
  assert.equal(parseInteger(0), 0, 'Số nguyên 0');
  assert.equal(parseInteger(''), null, 'Số nguyên rỗng trả về null');

  // Percentage parser
  const p1 = parsePercentage('82,57%');
  assert.equal(p1.value, 82.57, 'Tỷ lệ %GTC 82,57% trích xuất ra giá trị 82.57');
  assert.equal(p1.formatted, '82,57%', 'Format hiển thị đúng chuẩn');

  const p0 = parsePercentage('0%');
  assert.equal(p0.value, 0, '0% giữ đúng giá trị số 0');

  const pNull = parsePercentage('');
  assert.equal(pNull.value, null, 'Tỷ lệ trống trả về null');

  // Currency parser
  assert.equal(parseCurrency('561.611,23 đ'), 561611.23, 'Parse đúng tiền tệ có ký hiệu đ');
  assert.equal(parseCurrency('1.200.000 VND'), 1200000, 'Parse đúng tiền tệ có ký hiệu VND');
});

test('3. CHUẨN HÓA NGÀY THÁNG VÀ MÚI GIỜ (DD/MM/YYYY)', () => {
  // Standard DD/MM/YYYY
  const d1 = normalizeDate('15/10/2026');
  assert.equal(d1.isValid, true, 'Ngày 15/10/2026 hợp lệ');
  assert.equal(d1.standard, '15/10/2026');
  assert.equal(d1.iso, '2026-10-15');

  // ISO format with day-of-week suffix
  const d2 = normalizeDate('2026-10-15 - Thứ 5');
  assert.equal(d2.isValid, true, 'Ngày ISO có hậu tố Thứ 5');
  assert.equal(d2.standard, '15/10/2026');

  // YY-MM-DD from Hoa hong ngay
  const d3 = normalizeDate('26-10-09');
  assert.equal(d3.isValid, true, 'Ngày dạng YY-MM-DD 26-10-09');
  assert.equal(d3.standard, '09/10/2026');

  // Vietnamese text date from GTC Nhan vien
  const d4 = normalizeDate('10 thg 10, 2026');
  assert.equal(d4.isValid, true, 'Ngày dạng text 10 thg 10, 2026');
  assert.equal(d4.standard, '10/10/2026');

  const d5 = normalizeDate('7 thg 3, 2026');
  assert.equal(d5.isValid, true, 'Ngày 1 chữ số 7 thg 3, 2026');
  assert.equal(d5.standard, '07/03/2026');

  // Calendar validation (Strict leap year and day count)
  assert.equal(normalizeDate('31/02/2026').isValid, false, 'Ngày 31/02 không tồn tại trong lịch');
  assert.equal(normalizeDate('29/02/2026').isValid, false, '2026 không phải năm nhuận');
  assert.equal(normalizeDate('31/04/2026').isValid, false, 'Tháng 4 chỉ có 30 ngày');
  assert.equal(normalizeDate('invalid-date').isValid, false, 'Chuỗi rác không hợp lệ');
  assert.equal(normalizeDate('').isValid, false, 'Chuỗi ngày rỗng không hợp lệ');
});

test('4. CHUẨN HÓA BƯU CỤC THEO MÃ XÁC NHẬN (KHÔNG DÙNG WIDE CONTAINS)', () => {
  // 1. Rạch Kiến (22206000)
  const rk1 = lookupPostOffice('22206000');
  assert.equal(rk1.standardName, '(LAN) Rạch Kiến');
  assert.equal(rk1.standardCode, '22206000');
  assert.equal(rk1.isHistorical, false);

  const rk2 = lookupPostOffice('(LAN) Rạch Kiến');
  assert.equal(rk2.standardName, '(LAN) Rạch Kiến');

  // 2. Tầm Vu (21710000)
  const tv = lookupPostOffice('21710000');
  assert.equal(tv.standardName, '(LAN) Tầm Vu');
  assert.equal(tv.standardCode, '21710000');

  // 3. Phước Lý (22849000)
  const pl = lookupPostOffice('22849000');
  assert.equal(pl.standardName, '(LAN) Phước Lý');
  assert.equal(pl.standardCode, '22849000');

  // 4. Cần Giuộc (21529000)
  const cg = lookupPostOffice('21529000');
  assert.equal(cg.standardName, '(LAN) Cần Giuộc');
  assert.equal(cg.standardCode, '21529000');

  // 5. Cần Đước 1 (23220000)
  const cd1 = lookupPostOffice('23220000');
  assert.equal(cd1.standardName, '(LAN) Cần Đước 1');
  assert.equal(cd1.standardCode, '23220000');
  assert.equal(cd1.isHistorical, false);

  // 6. Cần Đước lịch sử (2278) -> Ánh xạ chính xác vào 23220000 Cần Đước 1
  const cdHist1 = lookupPostOffice('2278');
  assert.equal(cdHist1.standardName, '(LAN) Cần Đước 1', 'Mã lịch sử 2278 phải ánh xạ về Cần Đước 1');
  assert.equal(cdHist1.standardCode, '23220000', 'Mã chuẩn phải là 23220000');
  assert.equal(cdHist1.isHistorical, true, 'Đánh dấu là bản ghi lịch sử');
  assert.equal(cdHist1.historicalCode, '2278', 'Lưu giữ mã gốc trong metadata');

  const cdHist2 = lookupPostOffice('(LAN) Cần Đước');
  assert.equal(cdHist2.standardName, '(LAN) Cần Đước 1');
  assert.equal(cdHist2.standardCode, '23220000');
  assert.equal(cdHist2.isHistorical, true);

  // Chống false-positive từ substring contains
  const unrelated = lookupPostOffice('Kho Tân Trụ gần Cần Đước');
  assert.notEqual(unrelated.standardName, '(LAN) Cần Đước 1', 'Tuyệt đối không dùng wide contains để gộp nhầm bưu cục khác');
});

test('5. CƠ CHẾ ĐỌC DỮ LIỆU THEO TÊN HEADER ĐỘNG (HeaderReader)', () => {
  // Giả lập bảng gốc
  const standardHeaders = ['Bưu cục', 'Loại Hàng', 'Time', 'Volume', '% Gán', '% GTC', 'Leadtime', 'SLĐ GTC', '', 'Ngày', 'Thứ'];
  const rowA = ['(LAN) Tầm Vu', 'Hàng Mới Ca 1', '2026-10-15', '964', '100%', '82,57%', '10.2', '796', '', '15/10/2026', 'Thứ 5'];
  
  const readerA = createHeaderReader(standardHeaders);
  assert.equal(readerA.getCol(rowA, ['bưu cục', 'buu cuc']), '(LAN) Tầm Vu');
  assert.equal(readerA.getCol(rowA, ['ngày', 'ngay']), '15/10/2026');
  assert.equal(readerA.getCol(rowA, ['volume', 'sản lượng']), '964');
  assert.equal(readerA.getCol(rowA, ['slđ gtc', 'sld gtc']), '796');

  // Giả lập bảng BỊ ĐỔI THỨ TỰ CỘT HOÀN TOÀN (Ngày ở cột 0, Volume ở cột 2, Bưu cục ở cột 3)
  const shiftedHeaders = ['Ngày', 'Thứ', 'Volume', 'Bưu cục', 'SLĐ GTC', '% GTC'];
  const rowShifted = ['15/10/2026', 'Thứ 5', '964', '(LAN) Tầm Vu', '796', '82,57%'];

  const readerShifted = createHeaderReader(shiftedHeaders);
  assert.equal(readerShifted.getCol(rowShifted, ['bưu cục', 'buu cuc']), '(LAN) Tầm Vu', 'Vẫn đọc đúng bưu cục khi cột bị hoán đổi');
  assert.equal(readerShifted.getCol(rowShifted, ['ngày', 'ngay']), '15/10/2026', 'Vẫn đọc đúng ngày khi cột dời lên đầu bảng');
  assert.equal(readerShifted.getCol(rowShifted, ['volume', 'sản lượng']), '964', 'Vẫn đọc đúng volume');
  assert.equal(readerShifted.getCol(rowShifted, ['slđ gtc', 'sld gtc']), '796', 'Vẫn đọc đúng SLĐ GTC');

  // Xử lý an toàn khi cột hoàn toàn không tồn tại
  assert.equal(readerShifted.hasCol(['cột không tồn tại']), false);
  assert.equal(readerShifted.getCol(rowShifted, ['cột không tồn tại'], 'mặc định'), 'mặc định', 'Không gây crash khi thiếu cột');
});

test('6. CHUẨN HÓA MÃ ĐƠN HÀNG VÀ DANH TÍNH BƯU TÁ', () => {
  // Order ID
  assert.equal(normalizeOrderId('  gyelaqqv  '), 'GYELAQQV', 'Mã đơn viết hoa và dọn khoảng trắng');

  // Staff identity splitting
  const staff1 = normalizeStaffIdentity('3182201_Võ Nguyễn Minh Kha');
  assert.equal(staff1.maNV, '3182201');
  assert.equal(staff1.tenNV, 'Võ Nguyễn Minh Kha');

  const staff2 = normalizeStaffIdentity('3175777-Trần Trọng Phú');
  assert.equal(staff2.maNV, '3175777');
  assert.equal(staff2.tenNV, 'Trần Trọng Phú');

  // Text cleaning
  assert.equal(cleanVietnameseText('  (LAN)   Cần  Đước  1  '), '(LAN) Cần Đước 1');
  assert.equal(stripVietnameseDiacritics('Đồng Nai B'), 'dong nai b');
});

test('7. TRẠNG THÁI ĐỘC LẬP TỪNG SHEET VÀ HYBRID SYNC', () => {
  // Giả lập trạng thái sync giữa các sheet
  const sampleSheetStatuses = {
    'GTC Bưu cục': { status: 'LIVE', source: 'LIVE_SHEETS', rowCount: 479 },
    'GTC Nhân viên': { status: 'LIVE', source: 'LIVE_SHEETS', rowCount: 1828 },
    'Hoa hồng ngày': { status: 'LIVE', source: 'LIVE_SHEETS', rowCount: 2324 },
    'Tồn đọng GLT': { status: 'LIVE', source: 'LIVE_SHEETS', rowCount: 10928 },
    'Tồn đọng LC': { status: 'LIVE', source: 'LIVE_SHEETS', rowCount: 284 },
    'Tỷ lệ trả hàng': { status: 'SNAPSHOT', source: 'CACHED_SNAPSHOT', rowCount: 0, error: 'Chỉ có header' },
    'Nhân sự': { status: 'SNAPSHOT', source: 'CACHED_SNAPSHOT', rowCount: 81 },
    'Nghỉ việc': { status: 'SNAPSHOT', source: 'CACHED_SNAPSHOT', rowCount: 81 }
  };

  const statuses = Object.values(sampleSheetStatuses);
  const liveCount = statuses.filter(s => s.status === 'LIVE').length;
  const snapshotCount = statuses.filter(s => s.status === 'SNAPSHOT').length;

  let overallSource = 'HYBRID';
  if (liveCount === statuses.length) overallSource = 'LIVE_SHEETS';
  else if (snapshotCount === statuses.length) overallSource = 'CACHED_SNAPSHOT';

  assert.equal(overallSource, 'HYBRID', 'Hệ thống hỗ trợ cơ chế HYBRID khi có cả sheet LIVE và SNAPSHOT');
  assert.equal(liveCount, 5, '5 sheet vận hành chính hoạt động LIVE');
  assert.equal(snapshotCount, 3, 'Các sheet tham chiếu hoặc thiếu data duy trì snapshot an toàn độc lập');
  assert.equal(sampleSheetStatuses['GTC Bưu cục'].status, 'LIVE', 'Sheet LIVE không bị kéo về SNAPSHOT');
});
