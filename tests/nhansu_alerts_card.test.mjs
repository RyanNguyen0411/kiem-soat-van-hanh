import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. TASK NHÂN SỰ: Tích hợp Thẻ Trung Tâm Giám Sát & Cảnh Báo Vận Hành Nhân Sự', () => {
  const nhanSuContent = fs.readFileSync(path.resolve('src/pages/NhanSuTab.tsx'), 'utf8');

  // Đã import NhanSuOperationalAlertsCard
  assert.match(
    nhanSuContent,
    /import\s*\{\s*NhanSuOperationalAlertsCard\s*\}\s*from\s*['"]\.\.\/components\/nhan-su\/NhanSuOperationalAlertsCard['"]/,
    'NhanSuTab đã import component NhanSuOperationalAlertsCard'
  );

  // Đã render NhanSuOperationalAlertsCard trong giao diện
  assert.match(
    nhanSuContent,
    /<NhanSuOperationalAlertsCard[\s\S]*?\/>/,
    'NhanSuTab đã chèn thẻ NhanSuOperationalAlertsCard'
  );
});

test('2. BẢNG CẢNH BÁO GÁN/GIAO KHÔNG ĐẠT MỐC TỐI THIỂU (<30 Gán, <20 GTC)', () => {
  const cardContent = fs.readFileSync(path.resolve('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');

  // 1. Kiểm tra ngưỡng tối thiểu
  assert.match(cardContent, /r\.tongDon \|\| 0\)\s*<\s*30/, 'Ngưỡng kiểm tra SLĐ Gán < 30');
  assert.match(cardContent, /r\.tongDonGTC \|\| 0\)\s*<\s*20/, 'Ngưỡng kiểm tra SLĐ GTC < 20');

  // 2. Loại trừ nhân viên chuyên lấy và nhân viên đã OFF
  assert.match(cardContent, /isPickupSpecialist/, 'Có hàm loại trừ NV chuyên lấy hàng');
  assert.match(cardContent, /3178591/, 'Mã NV Võ Hoàng Phúc chuyên lấy hàng bị loại trừ');
  assert.match(cardContent, /3178527/, 'Mã NV Lương Tuấn Minh chuyên lấy hàng bị loại trừ');
  assert.match(cardContent, /r\.tongDon <= 0/, 'Loại trừ nhân viên đã OFF trong ngày (tongDon <= 0)');

  // 3. Hiển thị tổng chỉ số vận hành theo bưu cục và mở rộng chi tiết
  assert.match(cardContent, /Tổng đơn gán:[\s\S]*?GTC:[\s\S]*?Gán lấy:[\s\S]*?Lấy TC:/, 'Hiển thị tổng chỉ số vận hành theo bưu cục');
  assert.match(cardContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Ngày<\/th>\s*<th[^>]*>Mã NV<\/th>\s*<th[^>]*>Họ &amp; Tên<\/th>/, 'Bảng chi tiết mở rộng có STT - Ngày - Mã NV - Họ & Tên');
  assert.match(cardContent, /SLĐ Gán/, 'Có cột SLĐ Gán');
  assert.match(cardContent, /SLĐ GTC/, 'Có cột SLĐ GTC');
  assert.match(cardContent, /% GTC/, 'Có cột % GTC');
  assert.match(cardContent, /SLĐ Lấy/, 'Có cột SLĐ Lấy');
  assert.match(cardContent, /Lấy TC/, 'Có cột Lấy TC');
  assert.match(cardContent, /% Lấy TC/, 'Có cột % Lấy TC');
  assert.match(cardContent, /Leadtime/, 'Có cột Leadtime');
  assert.match(cardContent, /Chuyến Đi/, 'Có cột Chuyến Đi');
  assert.match(cardContent, /Tồn Đọng/, 'Có cột Tồn Đọng');
});

test('3. BẢNG CẢNH BÁO NHÂN VIÊN OFF TRONG THÁNG & CẢNH BÁO 1 TUẦN OFF > 2 NGÀY', () => {
  const cardContent = fs.readFileSync(path.resolve('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');

  // 1. Cảnh báo đối với nhân viên 1 tuần OFF > 2 ngày
  assert.match(cardContent, /count > 2/, 'Ngưỡng kích hoạt cảnh báo chuyên cần: 1 tuần OFF > 2 ngày');
  assert.match(cardContent, /hasWeeklyOffWarning/, 'Gắn cờ cảnh báo tuần cho nhân viên');
  assert.match(cardContent, /OFF\s*(?:>|&gt;)\s*2\s*ngày(?:\/tuần)?/i, 'Badge hiển thị cảnh báo 1 tuần OFF > 2 ngày');

  // 2. Thể hiện dữ liệu tổng ngày OFF theo bưu cục
  assert.match(cardContent, /Tổng ngày OFF lũy kế:/, 'Thể hiện tổng ngày OFF theo bưu cục');
  assert.match(cardContent, /Tỷ lệ chuyên cần bưu cục:/, 'Tính tỷ lệ chuyên cần theo bưu cục');

  // 3. Có thể mở rộng để xem chi tiết nhân viên với các cột yêu cầu
  assert.match(cardContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>\s*<th[^>]*>Họ &amp; Tên<\/th>/, 'Bảng chi tiết có STT, Mã NV, Họ Tên');
  assert.match(cardContent, /Tổng Ngày OFF/, 'Có cột Tổng Ngày OFF');
  assert.match(cardContent, /Cảnh Báo Chuyên Cần/, 'Có cột Cảnh Báo Chuyên Cần');
  assert.match(cardContent, /Lương TB\/Ngày/, 'Có cột Trung bình lương ngày làm');
  assert.match(cardContent, /Đơn Giá TB/, 'Có cột Đơn giá trung bình');

  // 4. Mở rộng xem chi tiết từng ngày của nhân viên (Ngày - Trạng thái - Gán - GTC - Lấy - Lương - Đơn giá)
  assert.match(cardContent, /Chi Tiết Lịch Sử Vận Hành:/, 'Có bảng mở rộng lịch sử từng ngày của nhân sự');
  assert.match(cardContent, /statusText/, 'Phân biệt rõ trạng thái Đi làm vs OFF Ngày');
});

test('4. BỘ LỌC ĐẦY ĐỦ: TICK CHỌN BƯU CỤC, THÁNG, TUẦN & LOẠI NHÂN VIÊN ĐÃ NGHỈ VIỆC', () => {
  const cardContent = fs.readFileSync(path.resolve('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');

  // 1. Bộ lọc Tick chọn Bưu Cục
  assert.match(cardContent, /handleTogglePo/, 'Hàm xử lý tick chọn bưu cục đa năng');
  assert.match(cardContent, /CheckSquare/, 'Hiển thị icon hộp tick checked khi được chọn');
  assert.match(cardContent, /Tất cả 5 bưu cục/, 'Có tùy chọn chọn tất cả 5 bưu cục');

  // 2. Bộ lọc Tick chọn Tháng
  assert.match(cardContent, /selectedMonth/, 'Quản lý state bộ lọc Tháng');
  assert.match(cardContent, /availableMonths/, 'Trích xuất danh sách các tháng từ dữ liệu');

  // 3. Bộ lọc Tick chọn Tuần
  assert.match(cardContent, /selectedWeek/, 'Quản lý state bộ lọc Tuần');
  assert.match(cardContent, /availableWeeks/, 'Trích xuất danh sách các tuần từ dữ liệu');

  // 4. Loại trừ nhân viên đã nghỉ việc
  assert.match(cardContent, /resignedStaffIds/, 'Tập hợp ID nhân viên đã thôi việc');
  assert.match(cardContent, /nghiViec/, 'Đối chiếu với dataset.nghiViec để loại trừ');
  assert.match(cardContent, /Đã thôi việc/, 'Loại trừ nhân sự có trạng thái Đã thôi việc');
});
