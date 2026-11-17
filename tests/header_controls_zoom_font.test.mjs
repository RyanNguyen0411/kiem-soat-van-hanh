import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const HEADER_PATH = path.join(ROOT_DIR, 'src', 'components', 'Header.tsx');
const CONTEXT_PATH = path.join(ROOT_DIR, 'src', 'context', 'DashboardContext.tsx');
const HTML_PATH = path.join(ROOT_DIR, 'index.html');

test('Header UI & Controls Verification Test Suite', async (t) => {
  const headerContent = fs.readFileSync(HEADER_PATH, 'utf-8');
  const contextContent = fs.readFileSync(CONTEXT_PATH, 'utf-8');
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');

  await t.test('1. Kiểm tra đã xóa "AM cập nhật" khỏi Header.tsx', () => {
    assert.strictEqual(
      headerContent.includes('AM cập nhật:'),
      false,
      'Badge "AM cập nhật:" vẫn còn xuất hiện trong Header!'
    );
  });

  await t.test('2. Kiểm tra đã xóa "Báo Data (Tele)" khỏi Header.tsx', () => {
    assert.strictEqual(
      headerContent.includes('Báo Data (Tele)'),
      false,
      'Nút "Báo Data (Tele)" vẫn còn xuất hiện trong Header!'
    );
  });

  await t.test('3. Kiểm tra cụm điều khiển Zoom màn hình trên Header.tsx', () => {
    assert.match(headerContent, /zoomLevel/);
    assert.match(headerContent, /zoomIn/);
    assert.match(headerContent, /zoomOut/);
    assert.match(headerContent, /resetZoom/);
    assert.match(headerContent, /ZoomIn/);
    assert.match(headerContent, /ZoomOut/);
    assert.match(headerContent, /Phóng to \/ Thu nhỏ/);
  });

  await t.test('4. Kiểm tra cụm điều khiển Cỡ Chữ (Font Size Scale) trên Header.tsx', () => {
    assert.match(headerContent, /fontScale/);
    assert.match(headerContent, /increaseFontSize/);
    assert.match(headerContent, /decreaseFontSize/);
    assert.match(headerContent, /resetFontSize/);
    assert.match(headerContent, /A\+/);
    assert.match(headerContent, /A\-/);
    assert.match(headerContent, /Type/);
    assert.match(headerContent, /Tăng \/ Giảm kích thước chữ/);
  });

  await t.test('5. Kiểm tra DashboardContext lưu và khôi phục zoom & font scale lâu dài', () => {
    assert.match(contextContent, /ghn_display_zoom_level/);
    assert.match(contextContent, /ghn_display_font_scale/);
    assert.match(contextContent, /document\.documentElement\.style.*zoom/);
    assert.match(contextContent, /document\.documentElement\.style\.fontSize/);
    assert.match(contextContent, /zoomIn/);
    assert.match(contextContent, /zoomOut/);
    assert.match(contextContent, /resetZoom/);
    assert.match(contextContent, /increaseFontSize/);
    assert.match(contextContent, /decreaseFontSize/);
    assert.match(contextContent, /resetFontSize/);
  });

  await t.test('6. Kiểm tra index.html có inline script tải sớm zoom và font scale từ localStorage', () => {
    assert.match(htmlContent, /ghn_display_zoom_level/);
    assert.match(htmlContent, /ghn_display_font_scale/);
  });
});
