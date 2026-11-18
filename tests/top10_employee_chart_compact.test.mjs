import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('KIỂM THỬ KHỐI TOP 10 BƯU TÁ DẪN ĐẦU: THU NHỎ KÍCH THƯỚC CHỮ, TRÌNH BÀY TÊN NHÂN VIÊN THÔNG MINH & HỖ TRỢ BẢNG KÊ', async (t) => {
  const tabPath = path.join(ROOT_DIR, 'src/pages/GtcEmployeeTab.tsx');
  const cssPath = path.join(ROOT_DIR, 'src/index.css');

  assert.ok(fs.existsSync(tabPath), 'GtcEmployeeTab.tsx phải tồn tại');
  assert.ok(fs.existsSync(cssPath), 'index.css phải tồn tại');

  const tabContent = fs.readFileSync(tabPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  await t.test('1. Kiểm tra logic phân tách tên nhân viên thông minh (Multi-line Name)', () => {
    // Phải có logic tách họ đệm và tên chính để tránh tràn ngang chữ
    assert.match(tabContent, /nameParts\s*=\s*\(payload\.value\s*\|\|\s*''\)\.trim\(\)\.split\(/);
    assert.match(tabContent, /top10-employee-name-first/);
    assert.match(tabContent, /top10-employee-name-main/);
    assert.match(tabContent, /top10-employee-bc/);
  });

  await t.test('2. Kiểm tra CSS index.css định nghĩa kích thước thu nhỏ và màu sắc tối ưu', () => {
    assert.match(cssContent, /\.top10-employee-name-first\s*\{[^}]*font-size:\s*9\.5px !important/);
    assert.match(cssContent, /\.top10-employee-name-main\s*\{[^}]*font-size:\s*10\.5px !important/);
    assert.match(cssContent, /\.top10-employee-bc\s*\{[^}]*font-size:\s*9px !important/);
    assert.match(cssContent, /\.top10-bar-num\s*\{[^}]*font-size:\s*9\.5px !important/);
  });

  await t.test('3. Kiểm tra nhãn số trên đầu cột (Bar labels) được thu nhỏ gọn gàng', () => {
    assert.match(tabContent, /top10-bar-num/);
    assert.match(tabContent, /fontSize:\s*'9\.5px'/);
    assert.match(tabContent, /fontSize:\s*'9px'/);
  });

  await t.test('4. Kiểm tra hỗ trợ 2 chế độ xem: Biểu Đồ Cột & Bảng Kê Top 10', () => {
    assert.match(tabContent, /top10ViewMode,\s*setTop10ViewMode/);
    assert.match(tabContent, /Biểu Đồ Cột/);
    assert.match(tabContent, /Bảng Kê Top 10/);
    // Bảng kê Top 10 tuân thủ Rule 6: Tiêu đề giữa
    assert.match(tabContent, /<th[^>]*text-center[^>]*>Thứ Hạng<\/th>/);
    assert.match(tabContent, /<th[^>]*text-center[^>]*>Họ Và Tên Bưu Tá<\/th>/);
  });
});
