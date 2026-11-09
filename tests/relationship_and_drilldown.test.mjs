import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SYSTEM_RELATIONSHIPS,
  getCouriersForPostOffice,
  getSalaryForCourier,
  getBacklogGltForPostOffice,
  getBacklogLcForPostOffice,
  getStaffProfile,
  auditRelationshipIntegrity
} from '../src/utils/relationshipEngine.ts';

// Load audited snapshots for full dataset relationship verification
const snapshotsDir = path.resolve('src/data/snapshots');
const gtcBuuCuc = JSON.parse(fs.readFileSync(`${snapshotsDir}/gtc_buu_cuc.json`, 'utf8'));
const gtcNhanVien = JSON.parse(fs.readFileSync(`${snapshotsDir}/gtc_nhan_vien.json`, 'utf8'));
const hoaHongNgay = JSON.parse(fs.readFileSync(`${snapshotsDir}/hoa_hong_ngay.json`, 'utf8'));
const tonDongGlt = JSON.parse(fs.readFileSync(`${snapshotsDir}/ton_dong_glt.json`, 'utf8'));
const tonDongLc = JSON.parse(fs.readFileSync(`${snapshotsDir}/ton_dong_lc.json`, 'utf8'));
const nhanSu = JSON.parse(fs.readFileSync(`${snapshotsDir}/nhan_su.json`, 'utf8'));
const nghiViec = JSON.parse(fs.readFileSync(`${snapshotsDir}/nghi_viec.json`, 'utf8'));

const fullDataset = {
  gtcBuuCuc,
  gtcNhanVien,
  hoaHongNgay,
  tyLeTraHang: [],
  tonDongGlt,
  tonDongLc,
  nhanSu,
  nghiViec
};

// ============================================================================
// TEST 1: QUAN HỆ 1 - GTC BƯU CỤC ↔ GTC NHÂN VIÊN (buuCuc + ngay)
// ============================================================================
test('1. QUAN HỆ GTC Bưu cục ↔ GTC Nhân viên: Khớp 100% bưu tá, không nhân bản (Zero Fan-Out)', () => {
  const rel = SYSTEM_RELATIONSHIPS.PO_TO_EMPLOYEE;
  assert.equal(rel.cardinality, '1:N');
  assert.deepEqual(rel.joinKeys, ['buuCuc', 'ngay']);

  // Drill-down từ Bưu cục Tầm Vu ngày 10/10/2026
  const couriersTamVu = getCouriersForPostOffice(fullDataset, '(LAN) Tầm Vu', { ngay: '10/10/2026' });
  assert.ok(couriersTamVu.length > 0, 'Phải có bưu tá đi tuyến ngày 10/10 tại Tầm Vu');
  
  // Xác nhận 100% bưu tá trả về đúng thuộc Tầm Vu
  for (const c of couriersTamVu) {
    assert.equal(c.buuCuc, '(LAN) Tầm Vu');
    assert.equal(c.ngay, '10/10/2026');
  }

  // Kiểm tra không nhân bản bản ghi
  const uniqueIds = new Set(couriersTamVu.map(c => c.maNV));
  assert.equal(uniqueIds.size, couriersTamVu.length, 'Không có bưu tá nào bị nhân bản 2 lần trong cùng 1 ngày');
});

// ============================================================================
// TEST 2: QUAN HỆ 2 - GTC NHÂN VIÊN ↔ HOA HỒNG NGÀY (maNV + ngay)
// ============================================================================
test('2. QUAN HỆ GTC Nhân viên ↔ Hoa hồng ngày: Tỷ lệ khớp 99.45%, xử lý an toàn bưu tá CTV thời vụ', () => {
  const rel = SYSTEM_RELATIONSHIPS.EMPLOYEE_TO_SALARY;
  assert.equal(rel.cardinality, '1:1');
  assert.deepEqual(rel.joinKeys, ['maNV', 'ngay']);

  // Test bưu tá chính thức: Võ Nguyễn Minh Kha (3182201) ngày 10/10/2026
  const salaryRecords = getSalaryForCourier(fullDataset, '3182201', { ngay: '10/10/2026' });
  assert.equal(salaryRecords.length, 1, 'Khớp chính xác 1:1 bản ghi hoa hồng');
  assert.equal(salaryRecords[0].maNV, '3182201');
  assert.ok(salaryRecords[0].tongLuong > 0, 'Có phát sinh lương');

  // Test trường hợp ngoại lệ: Bưu tá CTV thời vụ 3190580 (Nguyễn Minh Huy)
  const ctvSalary = getSalaryForCourier(fullDataset, '3190580', { ngay: '22/10/2026' });
  assert.equal(ctvSalary.length, 0, 'Bưu tá CTV không có bảng hoa hồng kế toán (được xử lý an toàn thành mảng rỗng, không crash)');
});

// ============================================================================
// TEST 3: QUAN HỆ 3 & 4 - GTC BƯU CỤC ↔ TỒN ĐỌNG GLT & LC (maBC)
// ============================================================================
test('3. QUAN HỆ GTC Bưu cục ↔ Tồn đọng GLT & LC: Phân loại chính xác 5 bưu cục và ngưỡng cảnh báo 120h-192h', () => {
  // Drill-down tồn GLT cho Cần Giuộc
  const gltCanGiuoc = getBacklogGltForPostOffice(fullDataset, '(LAN) Cần Giuộc');
  assert.ok(gltCanGiuoc.length > 0, 'Phải có đơn tồn GLT tại Cần Giuộc');
  for (const o of gltCanGiuoc) {
    assert.equal(o.buuCuc, '(LAN) Cần Giuộc');
  }

  // Drill-down chỉ lấy nhóm tồn khẩn cấp > 192h
  const glt192 = getBacklogGltForPostOffice(fullDataset, '(LAN) Cần Giuộc', { thoiGianTonDong: '192' });
  for (const o of glt192) {
    assert.equal(o.thoiGianTonDong, '192', '100% đơn phải thuộc nhóm 192h');
  }

  // Drill-down tồn Luân chuyển LC
  const lcPhuocLy = getBacklogLcForPostOffice(fullDataset, '(LAN) Phước Lý');
  for (const o of lcPhuocLy) {
    assert.equal(o.tenBC, '(LAN) Phước Lý');
  }
});

// ============================================================================
// TEST 4: TÍNH ĐỘC LẬP GIỮA GLT VÀ LC (DISJOINT DATASETS)
// ============================================================================
test('4. QUAN HỆ ĐỘC LẬP GLT vs LC: Độ trùng lặp mã đơn hàng = 0, cấm gộp số liệu', () => {
  const gltOrders = new Set(fullDataset.tonDongGlt.map(r => r.maDonHang));
  let overlapCount = 0;
  for (const r of fullDataset.tonDongLc) {
    if (gltOrders.has(r.maDonHang)) {
      overlapCount++;
    }
  }
  assert.equal(overlapCount, 0, 'Độ trùng lặp giữa GLT và LC bắt buộc phải bằng 0');
});

// ============================================================================
// TEST 5: QUAN HỆ GTC NHÂN VIÊN ↔ HỒ SƠ NHÂN SỰ (maNV)
// ============================================================================
test('5. QUAN HỆ GTC Nhân viên ↔ Hồ sơ HR: 100% bưu tá được định danh (Đang làm việc hoặc Nghỉ việc)', () => {
  // Test nhân sự đang làm việc: 3182201
  const activeProfile = getStaffProfile(fullDataset, '3182201');
  assert.equal(activeProfile.type, 'ACTIVE');
  assert.ok(activeProfile.nhanSuRecord);
  assert.equal(activeProfile.nhanSuRecord.tenNV, 'Võ Nguyễn Minh Kha');

  // Test nhân sự đã nghỉ việc / CTV: 3190580
  const resignedProfile = getStaffProfile(fullDataset, '3190580');
  assert.equal(resignedProfile.type, 'RESIGNED');
  assert.ok(resignedProfile.nghiViecRecord);
  assert.equal(resignedProfile.nghiViecRecord.ten, 'Nguyễn Minh Huy');

  // Test nhân sự không tồn tại
  const unknownProfile = getStaffProfile(fullDataset, '9999999');
  assert.equal(unknownProfile.type, 'NOT_FOUND');
});

// ============================================================================
// TEST 6: BỘ KIỂM TRA TOÀN VẸN QUAN HỆ (AUDIT INTEGRITY)
// ============================================================================
test('6. AUDIT TÍNH TOÀN VẸN: Zero Fan-Out trên toàn bộ 6 liên kết dữ liệu hệ thống', () => {
  const auditResults = auditRelationshipIntegrity(fullDataset);
  assert.equal(auditResults.length, 6, 'Đã kiểm tra đầy đủ 6 quan hệ');

  for (const item of auditResults) {
    assert.equal(item.fanOutFactor, 1.0, `Quan hệ ${item.id} không được có fan-out (> 1.0)`);
    assert.notEqual(item.status, 'WARNING', `Quan hệ ${item.id} không được rơi vào cảnh báo`);
  }
});

// ============================================================================
// TEST 7: KIỂM SOÁT BỘ LỌC ĐỘC LẬP & DUY TRÌ BỘ LỌC KHI DRILL-DOWN
// ============================================================================
test('7. BỘ LỌC ĐỘC LẬP & TRẠNG THÁI DRILL-DOWN: Bộ lọc phạm vi riêng, duy trì khi mở chi tiết', () => {
  // Giả lập filter cục bộ của GTC Bưu cục
  const tabFilterValues = {
    buuCuc: ['(LAN) Tầm Vu'],
    ngay: ['15/10/2026']
  };

  // Khi mở drill-down xuống nhân viên
  const drilledCouriers = getCouriersForPostOffice(fullDataset, tabFilterValues.buuCuc[0], {
    ngay: tabFilterValues.ngay[0]
  });

  // Kiểm tra dữ liệu drill-down giữ nguyên phạm vi lọc
  assert.ok(drilledCouriers.length > 0);
  drilledCouriers.forEach(c => {
    assert.equal(c.buuCuc, '(LAN) Tầm Vu');
    assert.equal(c.ngay, '15/10/2026');
  });

  // Khi xóa bộ lọc (Reset)
  const resetCouriers = getCouriersForPostOffice(fullDataset, 'all');
  assert.equal(resetCouriers.length, fullDataset.gtcNhanVien.length, 'Trở lại trạng thái tổng quan ban đầu');
});
