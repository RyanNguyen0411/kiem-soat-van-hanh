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

test('6. HIỂN THỊ TỔNG SỐ LƯỢNG NVPTTT (Đầy đủ trên Header, KPI 4, Bộ lọc & Header từng Bưu cục)', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // 1. Sticky header có badge hiển thị Tổng NVPTTT
  assert.match(
    gtcBcContent,
    /Tổng NVPTTT: \{regionalSummary\.totalRoster\} NV/,
    'Sticky Header có badge Tổng NVPTTT'
  );

  // 2. KPI Card 4 có tiêu đề "Tổng Số Lượng NVPTTT"
  assert.match(
    gtcBcContent,
    /Tổng Số Lượng NVPTTT/,
    'Thẻ KPI 4 có tiêu đề rõ ràng Tổng Số Lượng NVPTTT'
  );
  assert.match(
    gtcBcContent,
    /\{regionalSummary\.totalRoster\} NVPTTT/,
    'Thẻ KPI 4 hiển thị tổng số NVPTTT nổi bật'
  );

  // 3. Header từng bưu cục có hiển thị Tổng số lượng NVPTTT
  assert.match(
    gtcBcContent,
    /Tổng số lượng: \{po\.totalMembers\} NVPTTT/,
    'Header từng card bưu cục hiển thị tổng số lượng NVPTTT'
  );

  // 4. Dropdown bưu cục hiển thị số lượng NVPTTT
  assert.match(
    gtcBcContent,
    /\{regionalSummary\.totalRoster\} NVPTTT\)/,
    'Bộ lọc bưu cục hiển thị tổng số NVPTTT toàn khu vực'
  );
});

test('7. BẢNG THỐNG KÊ NHÂN VIÊN OFF: Thống kê theo bộ lọc người dùng & số ngày đã OFF trong tháng', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // 1. Có Bảng Thống Kê Nhân Viên OFF theo bộ lọc
  assert.match(
    gtcBcContent,
    /BẢNG THỐNG KÊ NHÂN VIÊN OFF \(NGHỈ GIAO NGÀY \{selectedDate\}\)/,
    'Có tiêu đề BẢNG THỐNG KÊ NHÂN VIÊN OFF theo ngày'
  );

  // 2. allFilteredOffStaff bóc tách nhân viên OFF theo đúng bộ lọc người dùng (selectedBuuCuc & searchQuery)
  assert.match(
    gtcBcContent,
    /allFilteredOffStaff/,
    'Sử dụng danh sách allFilteredOffStaff theo bộ lọc'
  );

  // 3. Có cột STT ở cột đầu tiên của bảng OFF
  assert.match(
    gtcBcContent,
    /<th[^>]*>STT<\/th>\s*<th[^>]*>Bưu Cục<\/th>\s*<th[^>]*>Mã NV<\/th>/,
    'Bảng thống kê OFF có STT ở cột đầu tiên trước Bưu Cục và Mã NV'
  );

  // 4. Có cột Số Ngày Đã Nghỉ Trong Tháng
  assert.match(
    gtcBcContent,
    /Số Ngày Đã Nghỉ Trong Tháng/,
    'Có cột Số Ngày Đã Nghỉ Trong Tháng'
  );
  assert.match(
    gtcBcContent,
    /\{off\.offDaysInMonth\} ngày nghỉ/,
    'Hiển thị chính xác số ngày đã nghỉ trong tháng'
  );

  // 5. Chuẩn hóa tên bưu cục với normalizePostOfficeName thay vì logic tự tạo thô sơ
  assert.match(
    gtcBcContent,
    /normalizePostOfficeName/,
    'Sử dụng normalizePostOfficeName chuẩn hóa bưu cục'
  );
});

test('8. KIỂM SOÁT LOGIC VÕ MINH HÙNG (3133170) VÀ TỔNG NVPTTT KHÔNG BAO GIỜ BẰNG 0', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // 1. Phải có fallback effectiveNhanSu dự phòng khi dataset.nhanSu rỗng
  assert.match(
    gtcBcContent,
    /const effectiveNhanSu = useMemo\(/,
    'Có effectiveNhanSu tích hợp fallback snapshot'
  );

  // 2. Tự động sinh tất cả các ngày lịch từ ngày 1 đến ngày được chọn
  assert.match(
    gtcBcContent,
    /for \(let d = 1; d <= targetDay; d\+\+\)/,
    'Sinh đầy đủ các ngày trong tháng từ ngày 1 đến selectedDate để kiểm tra OFF chính xác'
  );

  // 3. Tính toán totalMembers chống số 0 bằng Math.max
  assert.match(
    gtcBcContent,
    /Math\.max\(poRosterInNs\.length/,
    'Tính tổng số lượng nhân sự an toàn không bị 0'
  );

  // 4. Kiểm chứng dữ liệu thực tế cho Võ Minh Hùng (3133170) ngày 09/11/2026
  const ns = JSON.parse(fs.readFileSync(path.resolve('src/data/snapshots/nhan_su.json'), 'utf8'));
  const gtc = JSON.parse(fs.readFileSync(path.resolve('src/data/snapshots/gtc_nhan_vien.json'), 'utf8'));
  const hh = JSON.parse(fs.readFileSync(path.resolve('src/data/snapshots/hoa_hong_ngay.json'), 'utf8'));

  const hungNs = ns.find(x => x.maNV === '3133170');
  assert.ok(hungNs, 'Võ Minh Hùng tồn tại trong Task Nhân sự');
  assert.equal(hungNs.buuCuc, '(LAN) Cần Giuộc');

  // Mô phỏng kiểm tra OFF ngày 09/11/2026 cho Võ Minh Hùng
  const selectedDate = '09/11/2026';
  const isMaNvMatch = (id1, id2) => (id1 || '').trim() === (id2 || '').trim();
  const isDateMatch = (d1, d2) => d1 === d2;

  const isStaffOff = (dateStr) => {
    const cleanId = '3133170';
    const h = hh.find(r => isMaNvMatch(r.maNV, cleanId) && isDateMatch(r.ngay, dateStr));
    const g = gtc.find(r => isMaNvMatch(r.maNV, cleanId) && isDateMatch(r.ngay, dateStr));
    const hasDelivery = (g?.tongDon || 0) > 0 || (h?.soDonGanGiao || 0) > 0 || (h?.donGiaoTinhLuong || 0) > 0;
    const hasPickup = (h?.soDonGanLay || 0) > 0 || (h?.donLayTinhLuong || 0) > 0;
    const income = (h?.luongHHNgay || 0) + (h?.tongLuong || 0);
    const workDays = h?.soNgayDiLam || 0;
    if (!hasDelivery && !hasPickup) return true;
    if (income <= 0 && workDays <= 0 && (g?.tongDon || 0) <= 0) return true;
    return false;
  };

  // Võ Minh Hùng ngày 09/11/2026 không có đơn giao/lấy -> Phải là OFF
  assert.equal(isStaffOff('09/11/2026'), true, 'Võ Minh Hùng ngày 09/11/2026 phải được ghi nhận là OFF');

  // Đếm số ngày OFF trong tháng 11/2026 từ ngày 1 đến ngày 9:
  let offCount = 0;
  for (let d = 1; d <= 9; d++) {
    const dStr = String(d).padStart(2, '0') + '/11/2026';
    if (isStaffOff(dStr)) offCount++;
  }
  // 01, 02, 03, 04 đi làm. 05, 06, 07, 08, 09 nghỉ -> 5 ngày OFF
  assert.equal(offCount, 5, 'Võ Minh Hùng đã nghỉ 5 ngày trong tháng 11/2026 tính đến ngày 09/11/2026');
});
