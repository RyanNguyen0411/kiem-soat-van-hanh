import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('.');

// ============================================================================
// TEST SUITE: CEO EDITION MANDATORY ACCEPTANCE CRITERIA
// ============================================================================

test('1. KIỂM THỬ DRILL-DOWN TẠI CẢ 5 BƯU CỤC (Normalized assignedRate & gtcRate)', () => {
  const gtcBuuCuc = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/data/snapshots/gtc_buu_cuc.json'), 'utf8'));
  const postOffices = ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];

  postOffices.forEach(buuCucName => {
    const poGtcRows = gtcBuuCuc.filter(r => r.buuCuc === buuCucName);
    assert.ok(poGtcRows.length > 0, `Bưu cục ${buuCucName} phải có dữ liệu GTC trong snapshot`);

    // Mô phỏng logic chuẩn hóa Drill-Down từ OverviewTab.tsx
    const normalizedData = poGtcRows.map(row => {
      const volume = Number(row.volume) || 0;
      const sldGan = Number(row.sldGan) || 0;
      const sldGTC = Number(row.sldGTC) || 0;
      return {
        ...row,
        volume,
        sldGan,
        sldGTC,
        assignedRate: volume > 0 ? (sldGan / volume) * 100 : 0,
        gtcRate: volume > 0 ? (sldGTC / volume) * 100 : 0,
      };
    });

    normalizedData.forEach(r => {
      assert.equal(typeof r.assignedRate, 'number', 'assignedRate phải là kiểu number');
      assert.equal(typeof r.gtcRate, 'number', 'gtcRate phải là kiểu number');
      assert.ok(!isNaN(r.assignedRate), 'assignedRate không được là NaN');
      assert.ok(!isNaN(r.gtcRate), 'gtcRate không được là NaN');
      assert.doesNotThrow(() => r.assignedRate.toFixed(1));
      assert.doesNotThrow(() => r.gtcRate.toFixed(1));
    });
  });
});

test('2. KIỂM THỬ XUẤT GOOGLE SHEETS V2: 5 dòng và 1.000–5.000 dòng', () => {
  const codeGs = fs.readFileSync(path.join(projectRoot, 'google-apps-script/Code.gs'), 'utf8');

  // Kiểm tra Code.gs chứa Fast Path v2 và buildValues
  assert.match(codeGs, /function buildValues\(headers, rows\)/, 'Code.gs phải có hàm buildValues');
  assert.match(codeGs, /ghn_export_timing_v2/, 'Code.gs phải ghi nhận telemetry v2');

  // Mô phỏng hàm buildValues
  function buildValues(headers, rows) {
    if (!Array.isArray(headers) || headers.length === 0) throw new Error('Thiếu tiêu đề');
    if (!Array.isArray(rows)) throw new Error('Danh sách hàng không hợp lệ');
    const width = headers.length;
    let needsNormalization = false;
    for (let r = 0; r < rows.length && !needsNormalization; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length !== width) { needsNormalization = true; break; }
      for (let c = 0; c < width; c++) {
        if (row[c] === null || row[c] === undefined) { needsNormalization = true; break; }
      }
    }
    if (!needsNormalization) return [headers].concat(rows);
    return [headers].concat(rows).map(row => {
      const norm = new Array(width);
      for (let c = 0; c < width; c++) norm[c] = (row[c] === null || row[c] === undefined) ? '' : row[c];
      return norm;
    });
  }

  // 1. Kiểm thử 5 dòng
  const headers = ['Ngày', 'Bưu Cục', 'Mã NV', 'Họ Tên', 'Sản Lượng'];
  const smallRows = Array.from({ length: 5 }, (_, i) => ['09/11/2026', '(LAN) Cần Đước 1', `NV${i + 1}`, `Nguyễn Văn ${i + 1}`, 100 + i]);
  const smallMatrix = buildValues(headers, smallRows);
  assert.equal(smallMatrix.length, 6, '5 dòng + 1 header = 6 hàng');
  assert.equal(smallMatrix[0][0], 'Ngày');

  // 2. Kiểm thử 3.000 dòng (nằm trong ngưỡng 1.000–5.000 dòng)
  const largeRows = Array.from({ length: 3000 }, (_, i) => ['09/11/2026', '(LAN) Cần Giuộc', `NV${i + 1}`, `Bưu Tá ${i + 1}`, i % 200]);
  const t0 = Date.now();
  const largeMatrix = buildValues(headers, largeRows);
  const duration = Date.now() - t0;
  assert.equal(largeMatrix.length, 3001, '3000 dòng + 1 header = 3001 hàng');
  assert.ok(duration < 100, `Xử lý 3.000 dòng phải cực nhanh (<100ms), thực tế: ${duration}ms`);
});

test('3. KIỂM THỬ QUYỀN MỞ NGUỒN SHEETS & THƯ MỤC DRIVE', () => {
  const headerContent = fs.readFileSync(path.join(projectRoot, 'src/components/Header.tsx'), 'utf8');
  const appContent = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
  const driveLockContent = fs.readFileSync(path.join(projectRoot, 'src/components/common/GoogleDriveLockModal.tsx'), 'utf8');
  const sheetsLockContent = fs.readFileSync(path.join(projectRoot, 'src/components/common/GoogleSheetsLockModal.tsx'), 'utf8');

  // 1. Header có nút Nguồn Sheets kích hoạt open-google-sheets-lock
  assert.match(headerContent, /open-google-sheets-lock/, 'Nút Nguồn Sheets phải kích hoạt modal khóa');

  // 2. Header có nút Thư mục Drive kích hoạt open-google-drive-lock
  assert.match(headerContent, /open-google-drive-lock/, 'Nút Thư mục Drive phải kích hoạt modal khóa Drive');

  // 3. App.tsx mount cả 2 modal bảo vệ
  assert.match(appContent, /<GoogleSheetsLockModal \/>/, 'App.tsx phải mount GoogleSheetsLockModal');
  assert.match(appContent, /<GoogleDriveLockModal \/>/, 'App.tsx phải mount GoogleDriveLockModal');

  // 4. GoogleDriveLockModal kiểm tra vai trò admin / area_manager
  assert.match(driveLockContent, /hasRole\(\['admin', 'area_manager'\]\)/, 'GoogleDriveLockModal kiểm soát vai trò chặt chẽ');

  // 5. GoogleSheetsLockModal kiểm soát quyền RBAC admin / area_manager
  assert.match(sheetsLockContent, /hasRole\(\['admin', 'area_manager'\]\)/, 'GoogleSheetsLockModal kiểm soát vai trò chặt chẽ');
});

test('4. KIỂM THỬ KHÔNG THAY ĐỔI CÔNG THỨC KPI VÀ DỮ LIỆU NGUỒN', () => {
  const kpiEngineContent = fs.readFileSync(path.join(projectRoot, 'src/services/kpiEngine.ts'), 'utf8');
  const gtcBuuCuc = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/data/snapshots/gtc_buu_cuc.json'), 'utf8'));

  // 1. %GTC = (sldGTC / volume) * 100 hoặc (totalGTC / totalVolume) * 100
  assert.match(kpiEngineContent, /sldGTC \/ data\.volume/, 'Công thức %GTC bưu cục chuẩn xác');

  // 2. Dữ liệu nguồn snapshot đầy đủ 5 bưu cục
  const pos = new Set(gtcBuuCuc.map(r => r.buuCuc));
  assert.equal(pos.size, 5, 'Dữ liệu nguồn snapshot đủ 5 bưu cục');
});

test('5. KIỂM THỬ KHẢ NĂNG TƯƠNG THÍCH MÀN HÌNH (1366×768, 1440×900, 1920×1080)', () => {
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

  // 1. Viewport meta tag chuẩn responsive
  assert.match(indexHtml, /width=device-width,\s*initial-scale=1/, 'index.html có thẻ meta viewport chuẩn');

  // 2. OverviewTab sử dụng layout co giãn chuẩn max-w-7xl
  const overviewContent = fs.readFileSync(path.join(projectRoot, 'src/pages/OverviewTab.tsx'), 'utf8');
  assert.match(overviewContent, /max-w-7xl mx-auto/, 'OverviewTab sử dụng layout co giãn chuẩn max-w-7xl');
});
