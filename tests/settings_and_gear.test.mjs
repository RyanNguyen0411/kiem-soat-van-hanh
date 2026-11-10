import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Helper re-implementations of settingsService logic to test independently in Node.js
function extractSpreadsheetId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function extractDriveFolderId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function isValidAppsScriptUrl(url) {
  if (!url) return false;
  const trimmed = url.trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9-_]+\/exec(\?.*)?$/.test(trimmed);
}

function isValidTelegramToken(token) {
  if (!token) return false;
  const trimmed = token.trim();
  return /^[0-9]{8,11}:[a-zA-Z0-9_-]{35}$/.test(trimmed);
}

function isValidTelegramChatId(chatId) {
  if (!chatId) return false;
  const trimmed = chatId.trim();
  return /^-?[0-9]{6,15}$/.test(trimmed);
}

test('1. SETTINGS PARSERS: Trích xuất và chuẩn hóa Google Spreadsheet ID', () => {
  const fullUrl = 'https://docs.google.com/spreadsheets/d/1wP_i2M9i7G0bMupfZuQv_rODeeFk_v3vUvW1yvF7lQk/edit?gid=0#gid=0';
  const bareId = '1wP_i2M9i7G0bMupfZuQv_rODeeFk_v3vUvW1yvF7lQk';
  const invalid = 'https://google.com/invalid';

  assert.equal(extractSpreadsheetId(fullUrl), bareId, 'Trích xuất chính xác ID từ URL Google Sheets');
  assert.equal(extractSpreadsheetId(bareId), bareId, 'Giữ nguyên bare ID hợp lệ');
  assert.equal(extractSpreadsheetId(invalid), null, 'Từ chối link không đúng cấu trúc Google Sheets');
  assert.equal(extractSpreadsheetId(''), null, 'Xử lý chuỗi rỗng an toàn');
});

test('2. SETTINGS PARSERS: Trích xuất và chuẩn hóa Google Drive Folder ID', () => {
  const folderUrl = 'https://drive.google.com/drive/folders/15g7_dFfQ2b_M4nO7p1_testFolder123?usp=sharing';
  const folderId = '15g7_dFfQ2b_M4nO7p1_testFolder123';
  const invalid = 'https://drive.google.com/file/d/123';

  assert.equal(extractDriveFolderId(folderUrl), folderId, 'Trích xuất chính xác Folder ID từ Google Drive URL');
  assert.equal(extractDriveFolderId(folderId), folderId, 'Giữ nguyên bare folder ID hợp lệ');
  assert.equal(extractDriveFolderId(invalid), null, 'Từ chối file ID thay vì folder ID');
});

test('3. SETTINGS VALIDATORS: Kiểm tra định dạng Apps Script Web App URL', () => {
  const validExec = 'https://script.google.com/macros/s/AKfycbx_test1234567890abcdefghijklmnopqrstuvwxyz/exec';
  const validWithQuery = 'https://script.google.com/macros/s/AKfycbx_test1234567890abcdefghijklmnopqrstuvwxyz/exec?action=sync';
  const invalidDev = 'https://script.google.com/macros/s/AKfycbx_test1234567890abcdefghijklmnopqrstuvwxyz/dev';
  const invalidOther = 'https://example.com/api/exec';

  assert.equal(isValidAppsScriptUrl(validExec), true, 'Chấp nhận URL Web App kết thúc bằng /exec');
  assert.equal(isValidAppsScriptUrl(validWithQuery), true, 'Chấp nhận URL Web App có query params');
  assert.equal(isValidAppsScriptUrl(invalidDev), false, 'Từ chối URL /dev chưa deploy production');
  assert.equal(isValidAppsScriptUrl(invalidOther), false, 'Từ chối domain ngoài script.google.com');
});

test('4. SETTINGS VALIDATORS: Kiểm tra định dạng Telegram Bot Token & Chat ID', () => {
  const validToken = '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789';
  const invalidToken = '12345:short';
  const validUserChat = '123456789';
  const validGroupChat = '-1001234567890';
  const invalidChat = 'not_a_number';

  assert.equal(isValidTelegramToken(validToken), true, 'Định dạng Telegram Bot Token hợp lệ');
  assert.equal(isValidTelegramToken(invalidToken), false, 'Từ chối Telegram Bot Token sai định dạng');
  assert.equal(isValidTelegramChatId(validUserChat), true, 'Định dạng User Chat ID hợp lệ');
  assert.equal(isValidTelegramChatId(validGroupChat), true, 'Định dạng Supergroup Chat ID hợp lệ (-100...)');
  assert.equal(isValidTelegramChatId(invalidChat), false, 'Từ chối Chat ID chứa ký tự chữ');
});

test('5. UI INTEGRATION: Nút bánh răng cài đặt trong Header và Component SettingsModal', () => {
  const headerContent = fs.readFileSync(path.resolve('src/components/Header.tsx'), 'utf8');
  assert.match(headerContent, /Settings/i, 'Header phải import và render icon Settings');
  assert.match(headerContent, /open-settings-modal/i, 'Header bắn event open-settings-modal khi click');
  assert.match(headerContent, /Cài đặt kết nối/i, 'Tooltip nút cài đặt rõ ràng');

  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.match(appContent, /SettingsModal/i, 'App.tsx phải import và render SettingsModal');

  const modalContent = fs.readFileSync(path.resolve('src/components/common/SettingsModal.tsx'), 'utf8');
  assert.match(modalContent, /Cập nhật & tải lại/i, 'Modal có nút Cập nhật và load lại hoàn tất');
  assert.match(modalContent, /window\.location\.reload\(\)/i, 'Modal kích hoạt reload trang để nạp lại dữ liệu');
  assert.match(modalContent, /Link nguồn/i, 'Modal hỗ trợ Link nguồn Google Sheets');
  assert.match(modalContent, /Google Drive/i, 'Modal hỗ trợ Link driver Google Drive');
  assert.match(modalContent, /Google Apps Script/i, 'Modal hỗ trợ URL APPS SCRIPT');
  assert.match(modalContent, /Telegram/i, 'Modal hỗ trợ ID và Token');
});

test('6. CONSUMER WIRING: Các phân hệ sử dụng settingsService động', () => {
  const excelExportContent = fs.readFileSync(path.resolve('src/services/excelExportService.ts'), 'utf8');
  assert.match(excelExportContent, /getAppsScriptUrlOverride/i, 'excelExportService đọc Apps Script động');
  assert.match(excelExportContent, /getDriveFolderUrl/i, 'excelExportService lấy link Drive folder động');

  const dataConnectorContent = fs.readFileSync(path.resolve('src/services/dataConnector.ts'), 'utf8');
  assert.match(dataConnectorContent, /getSpreadsheetId/i, 'dataConnector nạp Spreadsheet ID động');

  const sheetsServiceContent = fs.readFileSync(path.resolve('src/services/sheets.service.ts'), 'utf8');
  assert.match(sheetsServiceContent, /getSpreadsheetId/i, 'sheets.service nạp Spreadsheet ID động');

  const telegramServiceContent = fs.readFileSync(path.resolve('src/services/telegramService.ts'), 'utf8');
  assert.match(telegramServiceContent, /getAppsScriptUrlOverride/i, 'telegramService kiểm tra cấu hình URL Apps Script động');
});
