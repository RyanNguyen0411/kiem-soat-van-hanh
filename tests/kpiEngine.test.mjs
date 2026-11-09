import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test implementation of pure formulas corresponding to kpiEngine & calculation.utils
import { 
  safeDivide, 
  parseStrictNumber, 
  formatNumberVN, 
  formatPercentVN 
} from '../src/utils/calculation.utils.ts';

test('1. safeDivide - xử lý an toàn phép chia, chống NaN và Division by Zero', () => {
  assert.equal(safeDivide(10, 2), 5);
  assert.equal(safeDivide(10, 0), 0);
  assert.equal(safeDivide(10, 0, 99), 99);
  assert.equal(safeDivide(null, 5), 0);
  assert.equal(safeDivide(5, null), 0);
  assert.equal(safeDivide(NaN, 5), 0);
  assert.equal(safeDivide(5, NaN), 0);
  assert.equal(safeDivide(1, 2, 0, true), 50); // toPercent = true
});

test('2. parseStrictNumber - xử lý chuỗi số tiếng Việt và định dạng tiền tệ', () => {
  assert.equal(parseStrictNumber(123), 123);
  assert.equal(parseStrictNumber('123.456'), 123456); // dấu chấm ngăn hàng nghìn
  assert.equal(parseStrictNumber('123,5'), 123.5); // dấu phẩy số thập phân
  assert.equal(parseStrictNumber(' 50.000 đ '), 50000);
  assert.equal(parseStrictNumber(null, 10), 10);
});

test('3. formatNumberVN & formatPercentVN - định dạng hiển thị chuẩn giao diện', () => {
  assert.equal(formatNumberVN(1234567), '1.234.567');
  assert.equal(formatNumberVN(null), '0');
  assert.equal(formatPercentVN(84.56, 1), '84.6%');
  assert.equal(formatPercentVN(null), '0.0%');
});

test('4. GIAO THÀNH CÔNG BƯU CỤC - Công thức chuẩn Volume, Gán, GTC, Tồn Đọng', () => {
  // Giả lập dữ liệu 3 loại hàng của 1 bưu cục trong 1 ngày
  const mockRecords = [
    { buuCuc: '(LAN) Cần Giuộc', ngay: '15/10/2026', loaiHang: 'Hàng Mới Ca 1', volume: 100, sldGan: 95, sldGTC: 80, tonDong: 20 },
    { buuCuc: '(LAN) Cần Giuộc', ngay: '15/10/2026', loaiHang: 'Hàng Mới Ca 2', volume: 50, sldGan: 45, sldGTC: 35, tonDong: 15 },
    { buuCuc: '(LAN) Cần Giuộc', ngay: '15/10/2026', loaiHang: 'Hàng Tồn', volume: 30, sldGan: 30, sldGTC: 20, tonDong: 10 },
  ];

  const totalVol = mockRecords.reduce((s, r) => s + r.volume, 0); // 180
  const totalGan = mockRecords.reduce((s, r) => s + r.sldGan, 0); // 170
  const totalGTC = mockRecords.reduce((s, r) => s + r.sldGTC, 0); // 135
  const tonDong = totalVol - totalGTC; // strictly Volume - SLĐ GTC

  assert.equal(totalVol, 180);
  assert.equal(totalGan, 170);
  assert.equal(totalGTC, 135);
  assert.equal(tonDong, 45); // 180 - 135 = 45

  const tiLeGan = safeDivide(totalGan, totalVol, 0, true);
  const tiLeGTC = safeDivide(totalGTC, totalVol, 0, true);

  assert.equal(Number(tiLeGan.toFixed(2)), 94.44); // 170 / 180 = 94.44%
  assert.equal(Number(tiLeGTC.toFixed(2)), 75.00); // 135 / 180 = 75.00%
});

test('5. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng Ca 2 và chênh lệch Volume vs Gán', () => {
  const couriers = [
    { maNV: 'NV01', chuyenDi: 2 }, // Đi ca 2
    { maNV: 'NV02', chuyenDi: 2 }, // Đi ca 2
    { maNV: 'NV03', chuyenDi: 1 }, // Chỉ đi ca 1
    { maNV: 'NV04', chuyenDi: 1 }, // Chỉ đi ca 1
    { maNV: 'NV05', chuyenDi: 2 }, // Đi ca 2
  ];

  const ca2Shifts = couriers.filter(c => c.chuyenDi === 2).length;
  const ca1Shifts = couriers.filter(c => c.chuyenDi === 1).length;
  const totalShifts = ca2Shifts + ca1Shifts;
  const rateCoverageCa2 = safeDivide(ca2Shifts, totalShifts, 0, true);

  assert.equal(ca2Shifts, 3);
  assert.equal(ca1Shifts, 2);
  assert.equal(totalShifts, 5);
  assert.equal(rateCoverageCa2, 60.0); // 3 / 5 = 60%

  // Kiểm tra chênh lệch Volume nhập Ca 2 vs SLĐ Gán
  const volCa2 = 500;
  const ganCa2 = 420;
  const chenhLech = volCa2 - ganCa2;
  assert.equal(chenhLech, 80); // 80 đơn dồn ứ tại sàn chia
});

test('6. LIÊN KẾT GTC BƯU TÁ VỚI HOA HỒNG NGÀY - Cột Gán Lấy, Lấy TC & %LTC', () => {
  // Test case 1: Gán lấy > 0, Lấy TC = 8 / 10 => 80%
  const ganLay1 = 10;
  const layTC1 = 8;
  const tiLeLTC1 = safeDivide(layTC1, ganLay1, 0, true);
  assert.equal(tiLeLTC1, 80.0);

  // Test case 2: Gán lấy = 0, phát sinh lấy vãng lai 2 đơn => 100%
  const ganLay2 = 0;
  const layTC2 = 2;
  const tiLeLTC2 = ganLay2 === 0 && layTC2 > 0 ? 100 : safeDivide(layTC2, ganLay2, 0, true);
  assert.equal(tiLeLTC2, 100.0);

  // Test case 3: Không gán và không lấy => 0%
  const ganLay3 = 0;
  const layTC3 = 0;
  const tiLeLTC3 = safeDivide(layTC3, ganLay3, 0, true);
  assert.equal(tiLeLTC3, 0.0);
});
