import { test } from 'node:test';
import assert from 'node:assert/strict';

import { 
  calculateGtcPostOfficeMetrics,
  calculateGtcEmployeeMetrics,
  calculateDailySalaryMetrics,
  calculateBacklogGltMetrics,
  calculateBacklogLcMetrics,
  calculateCa2OperationsMetrics
} from '../src/utils/kpiEngine.ts';
import { safeDivide } from '../src/utils/calculation.utils.ts';

// ============================================================================
// TEST SUITE 1: GTC BƯU CỤC
// ============================================================================

test('1. GTC BƯU CỤC - Kiểm thử công thức chuẩn %GTC = SUM(GTC)/SUM(Vol) vs Sai lầm trung bình cộng', () => {
  // Case study chứng minh:
  // Dòng 1: Volume = 1000, GTC = 900 (%GTC = 90%)
  // Dòng 2: Volume = 100,  GTC = 50  (%GTC = 50%)
  // Nếu lấy trung bình cộng sai: (90% + 50%) / 2 = 70.0% (SAI LỆCH NGHIÊM TRỌNG 16.36%!)
  // Chuẩn nghiệp vụ AM Huy: SUM(GTC) = 950, SUM(Vol) = 1100 => %GTC = 950 / 1100 = 86.36%
  const records = [
    { id: '1', buuCuc: '(LAN) Cần Giuộc', ngay: '01/10/2026', loaiHang: 'Hàng Mới Ca 1', volume: 1000, sldGan: 980, sldGTC: 900, leadtime: 4.2 },
    { id: '2', buuCuc: '(LAN) Cần Giuộc', ngay: '01/10/2026', loaiHang: 'Hàng Mới Ca 2', volume: 100, sldGan: 80, sldGTC: 50, leadtime: 3.5 }
  ];

  const result = calculateGtcPostOfficeMetrics(records);
  assert.equal(result.totalVolume, 1100);
  assert.equal(result.totalSldGan, 1060);
  assert.equal(result.totalSldGTC, 950);
  assert.equal(result.totalTonDong, 150); // 1100 - 950 = 150
  assert.equal(result.tiLeGTC, 86.36, 'Phải tính chính xác 86.36%, không phải 70%');
  assert.notEqual(result.tiLeGTC, 70.0, 'Tuyệt đối không lấy trung bình cộng 70%');
});

test('2. GTC BƯU CỤC - Kiểm thử mẫu số Volume = 0 và dữ liệu thiếu (Null/NaN)', () => {
  const records = [
    { id: '1', buuCuc: '(LAN) Phước Lý', ngay: '02/10/2026', loaiHang: 'Hàng Tồn', volume: 0, sldGan: 0, sldGTC: 0 },
    { id: '2', buuCuc: '(LAN) Phước Lý', ngay: '02/10/2026', loaiHang: 'Hàng Mới Ca 1', volume: null, sldGan: undefined, sldGTC: null }
  ];

  const result = calculateGtcPostOfficeMetrics(records);
  assert.equal(result.totalVolume, 0);
  assert.equal(result.totalSldGTC, 0);
  assert.equal(result.tiLeGTC, 0, 'Volume = 0 thì %GTC an toàn = 0, không bị NaN/Infinity');
  assert.equal(result.totalTonDong, 0);
});

test('3. GTC BƯU CỤC - Kiểm thử tổng hợp đa bưu cục và đa ngày', () => {
  const multiDayPoRecords = [
    { buuCuc: '(LAN) Cần Đước 1', ngay: '01/10/2026', volume: 500, sldGan: 480, sldGTC: 420 },
    { buuCuc: '(LAN) Cần Đước 1', ngay: '02/10/2026', volume: 600, sldGan: 580, sldGTC: 510 },
    { buuCuc: '(LAN) Rạch Kiến',   ngay: '01/10/2026', volume: 800, sldGan: 750, sldGTC: 600 },
    { buuCuc: '(LAN) Tầm Vu',      ngay: '01/10/2026', volume: 400, sldGan: 390, sldGTC: 320 }
  ];

  const result = calculateGtcPostOfficeMetrics(multiDayPoRecords);
  assert.equal(result.totalVolume, 2300);
  assert.equal(result.totalSldGTC, 1850);
  assert.equal(result.totalTonDong, 450); // 2300 - 1850 = 450
  assert.equal(result.tiLeGTC, 80.43); // 1850 / 2300 = 80.43%
});

// ============================================================================
// TEST SUITE 2: GTC NHÂN VIÊN
// ============================================================================

test('4. GTC NHÂN VIÊN - Sử dụng độc lập Tổng đơn/Tổng GTC của bưu tá, không dùng Volume bưu cục', () => {
  const empRecords = [
    { maNV: '3123456', tenNV: 'Trần Văn A', buuCuc: '(LAN) Cần Giuộc', tongDon: 120, tongDonGTC: 108, chuyenDi: 2, leadtime: 3.8 },
    { maNV: '3123457', tenNV: 'Lê Văn B',   buuCuc: '(LAN) Cần Giuộc', tongDon: 90,  tongDonGTC: 81,  chuyenDi: 1, leadtime: 4.1 },
    { maNV: '3123458', tenNV: 'Nguyễn Văn C', buuCuc: '(LAN) Cần Giuộc', tongDon: 110, tongDonGTC: 99,  chuyenDi: 2, leadtime: 3.5 }
  ];

  const result = calculateGtcEmployeeMetrics(empRecords);
  assert.equal(result.totalDon, 320);
  assert.equal(result.totalDonGTC, 288);
  assert.equal(result.totalTonDong, 32); // 320 - 288 = 32
  assert.equal(result.tiLeGTC, 90.0);    // 288 / 320 = 90%
  assert.equal(result.totalChuyenDi, 5); // 2 + 1 + 2 = 5
  assert.equal(result.activeStaffCount, 3);
});

// ============================================================================
// TEST SUITE 3: HOA HỒNG NGÀY & KHỬ TRÙNG LẶP
// ============================================================================

test('5. HOA HỒNG NGÀY - Khử trùng lặp bản ghi theo (Mã NV + Ngày) và tính năng suất TB', () => {
  const salaryRecordsWithDuplicates = [
    { maNV: 'NV101', tenNV: 'Bưu tá 1', ngay: '10/10/2026', soNgayDiLam: 1, donGiaoTinhLuong: 80, donLayTinhLuong: 10, soDonGanLay: 12, luongHHNgay: 250000, luongDamBao: 0, tongLuong: 250000 },
    // Dòng trùng lặp do export/sheet lỗi:
    { maNV: 'NV101', tenNV: 'Bưu tá 1', ngay: '10/10/2026', soNgayDiLam: 1, donGiaoTinhLuong: 80, donLayTinhLuong: 10, soDonGanLay: 12, luongHHNgay: 250000, luongDamBao: 0, tongLuong: 250000 },
    // Bản ghi ngày khác:
    { maNV: 'NV101', tenNV: 'Bưu tá 1', ngay: '11/10/2026', soNgayDiLam: 1, donGiaoTinhLuong: 90, donLayTinhLuong: 5,  soDonGanLay: 5,  luongHHNgay: 270000, luongDamBao: 0, tongLuong: 270000 },
    // Nhân viên khác:
    { maNV: 'NV102', tenNV: 'Bưu tá 2', ngay: '10/10/2026', soNgayDiLam: 1, donGiaoTinhLuong: 40, donLayTinhLuong: 2,  soDonGanLay: 4,  luongHHNgay: 120000, luongDamBao: 50000, tongLuong: 170000 }
  ];

  const result = calculateDailySalaryMetrics(salaryRecordsWithDuplicates);
  // Sau khi khử trùng, chỉ còn 3 bản ghi hợp lệ
  assert.equal(result.rowCount, 3);
  assert.equal(result.totalNgayCong, 3); // 3 ngày công (10/10 NV1, 11/10 NV1, 10/10 NV2)
  assert.equal(result.totalGiaoTL, 210);  // 80 + 90 + 40 = 210
  assert.equal(result.totalLayTL, 17);   // 10 + 5 + 2 = 17
  assert.equal(result.totalLuong, 690000); // 250k + 270k + 170k = 690k
  assert.equal(result.totalLuongDamBao, 50000);
  
  // Năng suất TB = 690.000 / 3 = 230.000 đ/ngày
  assert.equal(result.avgSalaryPerDay, 230000);
  // Chi phí TB trên đơn = 690.000 / (210 + 17) = ~3040 đ/đơn
  assert.equal(result.avgCostPerOrder, Math.round(690000 / 227));
});

// ============================================================================
// TEST SUITE 4: TỒN ĐỌNG GLT & LC (TÁCH BIỆT HOÀN TOÀN)
// ============================================================================

test('6. TỒN ĐỌNG GLT & LC - Tách biệt dữ liệu và kiểm tra nhóm cảnh báo 120h-192h và >192h', () => {
  const gltRecords = [
    { maDonHang: 'SOC01', buuCuc: '(LAN) Cần Giuộc', thoiGianTonDong: '192', khachHang: 'TTS', trangThai: 'Chưa có chuyến đi' },
    { maDonHang: 'SOC02', buuCuc: '(LAN) Cần Giuộc', thoiGianTonDong: '192', khachHang: 'SHOPEE', trangThai: 'Đã có chuyến đi' },
    { maDonHang: 'SOC03', buuCuc: '(LAN) Cần Giuộc', thoiGianTonDong: '120_192', khachHang: 'TTS', trangThai: 'Chưa có chuyến đi' },
    { maDonHang: 'SOC04', buuCuc: '(LAN) Cần Giuộc', thoiGianTonDong: '72_120', khachHang: 'OTHER', trangThai: 'Chưa có chuyến đi' }
  ];

  const lcRecords = [
    { maDonHang: 'LC01', tenBC: '(LAN) Cần Giuộc', loaiDon: 'Luân chuyển giao', thoiGianTonDong: '36-48h' },
    { maDonHang: 'LC02', tenBC: '(LAN) Cần Giuộc', loaiDon: 'Luân chuyển trả', thoiGianTonDong: '12-24h' }
  ];

  const gltResult = calculateBacklogGltMetrics(gltRecords);
  assert.equal(gltResult.totalOrders, 4);
  assert.equal(gltResult.urgentOrders192, 2, '2 đơn tồn nghiêm trọng > 192h');
  assert.equal(gltResult.urgentOrders120_192, 1, '1 đơn tồn cấp thiết 120-192h');
  assert.equal(gltResult.overdueOrdersTotal, 3, 'Tổng tồn quá hạn >= 120h là 3 đơn');

  const lcResult = calculateBacklogLcMetrics(lcRecords);
  assert.equal(lcResult.totalOrders, 2);
  assert.equal(lcResult.totalGiao, 1);
  assert.equal(lcResult.totalTra, 1);
  assert.equal(lcResult.count36_48h, 1);

  // Khẳng định quy tắc nghiệp vụ: GLT và LC không được cộng gộp
  assert.notEqual(gltResult.totalOrders + lcResult.totalOrders, gltResult.totalOrders);
});

// ============================================================================
// TEST SUITE 5: VẬN HÀNH CA 2
// ============================================================================

test('7. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng bưu tá Ca 2 và chênh lệch Volume vs Gán', () => {
  const ca2PoRecords = [
    { loaiHang: 'Hàng Mới Ca 2', volume: 600, sldGan: 480, sldGTC: 360 },
    { loaiHang: 'Hàng Mới Ca 1', volume: 1200, sldGan: 1150, sldGTC: 1000 } // Bị lọc bỏ
  ];

  const ca2EmpRecords = [
    { maNV: 'BT01', chuyenDi: 2 },
    { maNV: 'BT02', chuyenDi: 2 },
    { maNV: 'BT03', chuyenDi: 2 },
    { maNV: 'BT04', chuyenDi: 1 },
    { maNV: 'BT05', chuyenDi: 1 }
  ];

  const ca2Result = calculateCa2OperationsMetrics(ca2PoRecords, ca2EmpRecords);
  assert.equal(ca2Result.volumeCa2, 600);
  assert.equal(ca2Result.ganCa2, 480);
  assert.equal(ca2Result.gtcCa2, 360);
  assert.equal(ca2Result.gapVolGan, 120, '120 đơn tồn sàn chia chọn chưa gán');
  assert.equal(ca2Result.tonCa2, 240, '240 đơn chưa giao thành công ca 2');
  assert.equal(ca2Result.coverageCouriersCa2, 3, '3 bưu tá đi 2 chuyến');
  assert.equal(ca2Result.couriersOnlyCa1, 2, '2 bưu tá chỉ đi 1 ca');
  assert.equal(ca2Result.rateCoverageCa2, 60.0, 'Tỷ lệ phủ sóng Ca 2 là 60%');
});
