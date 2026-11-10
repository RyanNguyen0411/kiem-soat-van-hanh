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
  assert.match(cardContent, /Gán:[\s\S]*?GTC:[\s\S]*?Gán lấy:[\s\S]*?Lấy TC:/, 'Hiển thị tổng chỉ số vận hành theo bưu cục');
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

test('3. BẢNG CẢNH BÁO CHUYÊN CẦN: OFF ≥ 2 NGÀY/TUẦN HOẶC OFF > 4 NGÀY/THÁNG', () => {
  const cardContent = fs.readFileSync(path.resolve('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');

  // 1. Cảnh báo đối với nhân viên 1 tuần OFF >= 2 ngày
  assert.match(cardContent, /count >= 2/, 'Ngưỡng kích hoạt cảnh báo tuần: OFF >= 2 ngày trong cùng 1 tuần');
  assert.match(cardContent, /offDates\.length > 4/, 'Ngưỡng kích hoạt cảnh báo tháng: OFF > 4 ngày trong cùng 1 tháng');
  assert.match(cardContent, /hasWeeklyOffWarning \|\| hasMonthlyOffWarning/, 'Quy chuẩn chuyên cần: vi phạm tuần hoặc tháng đều không đạt chuyên cần');

  // 2. Thể hiện dữ liệu tổng ngày OFF theo bưu cục
  assert.match(cardContent, /Tổng ngày OFF:/, 'Thể hiện tổng ngày OFF theo bưu cục');
  assert.match(cardContent, /Chuyên cần bưu cục:/, 'Tính tỷ lệ chuyên cần theo bưu cục');

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

test('4. CỐ ĐỊNH TIÊU ĐỀ (STICKY THEAD), NGẮT DÒNG TH VÀ DỮ LIỆU CÙNG 1 HÀNG (WHITESPACE-NOWRAP)', () => {
  const cardContent = fs.readFileSync(path.resolve('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');

  // Sticky thead trên các bảng
  assert.match(cardContent, /sticky top-0 z-10/, 'Tiêu đề bảng được cố định bằng sticky top-0 z-10');
  assert.match(cardContent, /whitespace-normal break-words leading-tight/, 'Chỉ tiêu đề th mới được phép ngắt dòng');
  assert.match(cardContent, /whitespace-nowrap align-middle/, 'Dữ liệu chi tiết td bắt buộc cùng 1 hàng không bị ngắt dòng');

  // Kiểm tra BaoCaoGtcBcTab cũng có sticky thead và whitespace-nowrap
  const bcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');
  assert.match(bcContent, /sticky top-0 z-10/, 'BaoCaoGtcBcTab cố định tiêu đề bảng');
  assert.match(bcContent, /whitespace-normal break-words leading-tight/, 'BaoCaoGtcBcTab cho phép th ngắt dòng');
  assert.match(bcContent, /whitespace-nowrap align-middle/, 'BaoCaoGtcBcTab cố định dữ liệu td cùng 1 hàng');
});

test('5. BỘ LỌC ĐẦY ĐỦ: TICK CHỌN BƯU CỤC, THÁNG, TUẦN & THU GỌN GIAO DIỆN', () => {
  const cardContent = fs.readFileSync(path.resolve('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');

  // 1. Bộ lọc Tick chọn Bưu Cục
  assert.match(cardContent, /handleTogglePo/, 'Hàm xử lý tick chọn bưu cục đa năng');
  assert.match(cardContent, /CheckSquare/, 'Hiển thị icon hộp tick checked khi được chọn');
  assert.match(cardContent, /Tất cả 5 bưu cục/, 'Có tùy chọn chọn tất cả 5 bưu cục');

  // 2. Bộ lọc Tick chọn Tháng & Tuần
  assert.match(cardContent, /selectedMonth/, 'Quản lý state bộ lọc Tháng');
  assert.match(cardContent, /selectedWeek/, 'Quản lý state bộ lọc Tuần');

  // 3. Hộp ghi chú / alert banner được thu gọn tối giản 1 dòng
  assert.match(cardContent, /Quy chế chuyên cần khu vực:/, 'Hộp cảnh báo chuyên cần được tối giản');
  assert.match(cardContent, /truncate/, 'Hộp ghi chú dùng truncate để luôn giữ 1 dòng tinh gọn');
});
