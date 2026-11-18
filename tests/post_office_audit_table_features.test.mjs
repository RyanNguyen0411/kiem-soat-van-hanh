import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('KIỂM THỬ TÍNH NĂNG BẢNG KÊ CHI TIẾT ĐĂNG NHẬP: 20 DÒNG, CỐ ĐỊNH TIÊU ĐỀ, CĂN GIỮA & BỘ LỌC TICK CHỌN NGÀY / BƯU CỤC', async (t) => {
  const filePath = path.join(ROOT_DIR, 'src/pages/PostOfficeManagementTab.tsx');
  assert.ok(fs.existsSync(filePath), 'PostOfficeManagementTab.tsx phải tồn tại');
  const content = fs.readFileSync(filePath, 'utf8');

  await t.test('1. Bảng kê hiển thị tối đa 20 dòng, có thanh cuộn và cố định tiêu đề sticky', () => {
    // Kiểm tra cấu hình hiển thị 20 dòng mặc định
    assert.match(content, /pageSize,\s*setPageSize\s*\]\s*=\s*useState<number>\(20\)/, 'pageSize mặc định phải là 20 dòng');
    assert.match(content, /paginatedAudits/, 'Phải sử dụng danh sách paginatedAudits để giới hạn số dòng hiển thị');
    
    // Kiểm tra cố định tiêu đề (sticky thead)
    assert.match(content, /<thead[^>]*sticky\s+top-0\s+z-20/, 'Tiêu đề thead phải cố định sticky top-0 z-20');
    
    // Kiểm tra container có thanh cuộn mượt mà
    assert.match(content, /max-h-\[720px\]\s+scrollbar-thin/, 'Container phải có chiều cao tối đa phù hợp 20 dòng và thanh cuộn scrollbar-thin');
    assert.match(content, /overflow-y-auto/, 'Container phải có overflow-y-auto để cuộn trang');
  });

  await t.test('2. Nội dung Tiêu đề bảng và tất cả tiêu đề cột phải căn giữa tuyệt đối', () => {
    // Tiêu đề card header bảng kê căn giữa
    assert.match(content, /<div[^>]*text-center\s+w-full[^>]*flex[^>]*items-center\s+justify-center/, 'Khung chứa tiêu đề bảng phải căn giữa');
    assert.match(content, /<h3[^>]*justify-center[^>]*text-center[^>]*>[\s\S]*?BẢNG KÊ CHI TIẾT LƯỢT ĐĂNG NHẬP CỦA NHÂN VIÊN THEO MỐC THỜI GIAN/, 'Tiêu đề h3 bảng kê phải căn giữa');

    // Tất cả các cột th phải căn giữa
    const theadMatch = content.match(/<thead[\s\S]*?<\/thead>/);
    assert.ok(theadMatch, 'Phải có thẻ thead trong bảng');
    const theadContent = theadMatch[0];

    const thMatches = theadContent.match(/<th[\s\S]*?<\/th>/g);
    assert.ok(thMatches && thMatches.length === 7, 'Bảng kê phải có đúng 7 cột');
    
    for (const th of thMatches) {
      assert.match(th, /text-center/, 'Mỗi thẻ th phải có text-center');
      assert.match(th, /justify-center/, 'Nội dung div con trong th phải có justify-center để căn giữa');
    }
  });

  await t.test('3. Bộ lọc tick chọn Bưu Cục', () => {
    // State và handler tick chọn Bưu Cục
    assert.match(content, /selectedPos,\s*setSelectedPos/, 'Phải có state selectedPos');
    assert.match(content, /isPoDropdownOpen/, 'Phải có popover dropdown tick chọn bưu cục');
    assert.match(content, /handleTogglePo/, 'Phải có handler handleTogglePo để tick/bỏ tick từng bưu cục');
    assert.match(content, /handleSelectAllPos/, 'Phải có nút Chọn tất cả bưu cục');
    assert.match(content, /handleDeselectAllPos/, 'Phải có nút Bỏ chọn bưu cục');
    assert.match(content, /Tick Chọn Bưu Cục/, 'Giao diện phải có tiêu đề Tick Chọn Bưu Cục');
  });

  await t.test('4. Bộ lọc tick chọn Ngày', () => {
    // State và handler tick chọn Ngày
    assert.match(content, /availableDates/, 'Phải trích xuất danh sách ngày có dữ liệu từ audits');
    assert.match(content, /selectedDates,\s*setSelectedDates/, 'Phải có state selectedDates');
    assert.match(content, /isDateDropdownOpen/, 'Phải có popover dropdown tick chọn ngày');
    assert.match(content, /handleToggleDate/, 'Phải có handler handleToggleDate để tick/bỏ tick từng ngày');
    assert.match(content, /handleSelectAllDates/, 'Phải có nút Chọn tất cả ngày');
    assert.match(content, /handleSelectToday/, 'Phải có phím tắt chọn nhanh Hôm nay');
    assert.match(content, /handleDeselectAllDates/, 'Phải có nút Bỏ chọn ngày');
    assert.match(content, /Tick Chọn Ngày/, 'Giao diện phải có tiêu đề Tick Chọn Ngày');
  });

  await t.test('5. Bộ lọc hoạt động đồng bộ với logic dữ liệu filteredAudits', () => {
    assert.match(content, /selectedPos\.some/, 'Logic filter phải kiểm tra danh sách selectedPos');
    assert.match(content, /selectedDates\.includes/, 'Logic filter phải kiểm tra danh sách selectedDates');
    assert.match(content, /formatVietnamDateTime\(item\.timestamp\)/, 'Lọc ngày phải chuẩn hóa theo múi giờ Việt Nam');
  });
});
