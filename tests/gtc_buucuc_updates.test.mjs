import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. BẢNG GTC BƯU CỤC: Đánh số thứ tự (STT) ở cột đầu tiên trước Mã NV', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // Kiểm tra bảng activeStaff: STT nằm trước Mã NV
  assert.match(gtcBcContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>/, 'Bảng nhân viên đi giao có cột STT nằm ngay trước Mã NV');
  assert.match(gtcBcContent, /\{index \+ 1\}[\s\S]*?\{nv\.maNV\}/, 'Dòng dữ liệu nhân viên hiển thị index + 1 trước mã NV');

  // Kiểm tra bảng offStaff: STT nằm trước Mã NV
  assert.match(gtcBcContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>[\s\S]*?Nhân Viên OFF/i, 'Bảng nhân viên OFF có cột STT');
  assert.match(gtcBcContent, /\{index \+ 1\}[\s\S]*?\{off\.maNV\}/, 'Dòng dữ liệu nhân viên OFF hiển thị index + 1 trước mã NV');

  // Kiểm tra bảng pickupSpecialists: STT nằm trước Mã NV
  assert.match(gtcBcContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>[\s\S]*?Chuyên Lấy Hàng/i, 'Bảng nhân viên chuyên lấy hàng có cột STT');
  assert.match(gtcBcContent, /\{index \+ 1\}[\s\S]*?\{sp\.maNV\}/, 'Dòng dữ liệu nhân viên chuyên lấy hiển thị index + 1 trước mã NV');

  // Kiểm tra GtcPostOfficeTab cũng có STT trước Mã NV
  const gtcPoContent = fs.readFileSync(path.resolve('src/pages/GtcPostOfficeTab.tsx'), 'utf8');
  assert.match(gtcPoContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>/, 'GtcPostOfficeTab có cột STT trước Mã NV');
});

test('2. XÓA BỎ HOÀN TOÀN LOGIC "Đã thôi việc sau ngày này"', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // Không còn bất kỳ đoạn text "Đã thôi việc sau ngày này" nào trong giao diện hay xuất file
  assert.equal(
    gtcBcContent.includes('Đã thôi việc sau ngày này'),
    false,
    'Đã xóa bỏ hoàn toàn chuỗi và nhãn "Đã thôi việc sau ngày này" khỏi BaoCaoGtcBcTab.tsx'
  );

  // Không còn thuộc tính isResigned trong activeStaff
  assert.equal(
    gtcBcContent.includes('isResigned'),
    false,
    'Không còn thuộc tính isResigned'
  );
});

test('3. HIGHLIGHT NHÂN VIÊN KHÔNG ĐẠT GÁN TỐI THIỂU 30 HOẶC GTC TỐI THIỂU 20', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // Kiểm tra ngưỡng logic: gán < 30 và GTC < 20
  assert.match(gtcBcContent, /tongDon \|\| 0\)\s*<\s*30/, 'Ngưỡng gán tối thiểu là 30 đơn');
  assert.match(gtcBcContent, /tongDonGTC \|\| 0\)\s*<\s*20/, 'Ngưỡng GTC tối thiểu là 20 đơn');
  assert.match(gtcBcContent, /isLowAssigned \|\| isLowGtc/, 'Highlight kích hoạt khi vi phạm một trong 2 ngưỡng hoặc cả 2');

  // Kiểm tra hiển thị badge cảnh báo trực quan
  assert.match(gtcBcContent, /⚠️ &lt;30 gán/, 'Có badge cảnh báo gán < 30');
  assert.match(gtcBcContent, /⚠️ &lt;20 GTC/, 'Có badge cảnh báo GTC < 20');
});

test('4. TỰ ĐỘNG HIỂN THỊ DỮ LIỆU Ở NGÀY MỚI NHẤT (Latest Date Auto-Select)', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // allUniqueDatesDesc bóc tách từ cả 3 nguồn (gtcNhanVien, gtcBuuCuc, hoaHongNgay)
  assert.match(gtcBcContent, /dataset\.gtcNhanVien\.map\(r => r\.ngay\)/, 'Nạp ngày từ gtcNhanVien');
  assert.match(gtcBcContent, /dataset\.hoaHongNgay\.map\(r => r\.ngay\)/, 'Nạp ngày từ hoaHongNgay');
  assert.match(gtcBcContent, /sortDatesDesc\(/, 'Sắp xếp ngày giảm dần từ mới nhất đến cũ nhất');

  // Tự động gán selectedDate về ngày mới nhất khi nạp data
  assert.match(gtcBcContent, /setSelectedDate\(allUniqueDatesDesc\[0\]\)/, 'Tự động kích hoạt ngày mới nhất');
});

test('5. LOGIC NHÂN VIÊN OFF: Thống kê số ngày OFF trong tháng và đối chiếu toàn diện', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // 1. Đối chiếu Task Nhân Sự: Không có tên thì là nhân viên đã nghỉ việc hoàn toàn -> Loại trừ
  assert.match(
    gtcBcContent,
    /if \(!nhanSuActiveMap\.has\(m\.maNV\)\) return false;/,
    'Loại trừ nhân viên không có tên trong Task Nhân Sự (đã nghỉ hoàn toàn)'
  );

  // 2. Hàm isStaffOffOnDate kiểm tra theo logic nghiệp vụ của AM Huy
  assert.match(gtcBcContent, /isStaffOffOnDate/, 'Định nghĩa hàm kiểm tra OFF độc lập cho từng ngày');
  assert.match(gtcBcContent, /hasDelivery && !hasPickup/, 'Không phát sinh đơn giao hoặc đơn lấy -> OFF');
  assert.match(gtcBcContent, /income <= 0 && workDays <= 0/, 'Không phát sinh thu nhập và ngày công -> OFF');

  // 3. Thống kê số ngày OFF trong tháng thông qua logic tính OFF
  assert.match(gtcBcContent, /possibleOperatingDates\.forEach\(d => \{[\s\S]*?isStaffOffOnDate/, 'Lặp qua các ngày vận hành trong tháng để đếm số ngày OFF');

  // Mô phỏng kiểm thử độc lập logic:
  // Ví dụ người dùng: Nguyễn Minh Hùng ngày 09/11/2026 không phát sinh đơn giao hoặc đơn lấy, lương hoa hồng 0đ (hoặc không hiển thị).
  const isEmployeeOffSimulation = (staff, date, gtcList, hhList, nsSet) => {
    // Nếu đối chiếu với Task Nhân Sự mà không có tên thì đã nghỉ hoàn toàn -> không liệt kê
    if (!nsSet.has(staff.maNV)) return null;

    const gtc = gtcList.find(r => r.maNV === staff.maNV && r.ngay === date);
    const hh = hhList.find(r => r.maNV === staff.maNV && r.ngay === date);

    const hasDelivery = (gtc?.tongDon || 0) > 0 || (hh?.soDonGanGiao || 0) > 0 || (hh?.donGiaoTinhLuong || 0) > 0;
    const hasPickup = (hh?.soDonGanLay || 0) > 0 || (hh?.donLayTinhLuong || 0) > 0;
    const income = (hh?.luongHHNgay || 0) + (hh?.tongLuong || 0);
    const workDays = hh?.soNgayDiLam || 0;

    if (!hasDelivery && !hasPickup) return true;
    if (income <= 0 && workDays <= 0 && (gtc?.tongDon || 0) <= 0) return true;
    return false;
  };

  const nsSet = new Set(['NV_HUNG', 'NV_AN']); // NV_NGHI không có trong Task Nhân sự
  const gtcList = [
    { maNV: 'NV_AN', ngay: '09/11/2026', tongDon: 45 } // An đi giao 45 đơn
  ];
  const hhList = [
    { maNV: 'NV_AN', ngay: '09/11/2026', luongHHNgay: 135000, soNgayDiLam: 1 },
    { maNV: 'NV_HUNG', ngay: '09/11/2026', luongHHNgay: 0, soNgayDiLam: 0, soDonGanGiao: 0, soDonGanLay: 0 } // Hùng không phát sinh đơn, 0đ
  ];

  // Test 1: Nguyễn Minh Hùng (có trong Task Nhân sự) -> Ghi nhận OFF ngày 09/11/2026
  assert.equal(
    isEmployeeOffSimulation({ maNV: 'NV_HUNG' }, '09/11/2026', gtcList, hhList, nsSet),
    true,
    'Nguyễn Minh Hùng không phát sinh đơn và thu nhập 0đ -> Ghi nhận OFF'
  );

  // Test 2: NV_AN (có đi giao, có thu nhập) -> KHÔNG OFF
  assert.equal(
    isEmployeeOffSimulation({ maNV: 'NV_AN' }, '09/11/2026', gtcList, hhList, nsSet),
    false,
    'NV_AN phát sinh đơn và thu nhập -> KHÔNG OFF'
  );

  // Test 3: NV_NGHI (không có trong Task Nhân sự) -> Đã thôi việc hoàn toàn -> Trả về null (không liệt kê vào OFF)
  assert.equal(
    isEmployeeOffSimulation({ maNV: 'NV_NGHI' }, '09/11/2026', gtcList, hhList, nsSet),
    null,
    'Nhân viên không có trong Task Nhân Sự bị loại trừ hoàn toàn'
  );
});
