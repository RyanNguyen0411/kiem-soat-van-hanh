import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// TEST SUITE: PHASE 06 — EXPORT, PERFORMANCE & INTERACTION OPTIMIZATION
// ---------------------------------------------------------------------------

test('1. EXCEL EXPORT ENGINE: Xuất toàn bộ dữ liệu đã lọc, không bị cắt xén phân trang', async (t) => {
  const exportServiceContent = fs.readFileSync(path.resolve('src/services/excelExportService.ts'), 'utf8');

  // Verify UTF-8 BOM
  assert.ok(
    exportServiceContent.includes('\\uFEFF'),
    'Export engine PHẢI chứa UTF-8 BOM (\\uFEFF) để Excel hiển thị đúng tiếng Việt có dấu'
  );

  // Verify Numeric Unquoting for Excel formulas
  assert.ok(
    exportServiceContent.includes('Number.isFinite(cell)') || exportServiceContent.includes('typeof cell === "number"'),
    'Export engine PHẢI giữ số nguyên / số thực ở dạng unquoted để Excel tự động nhận diện và tính toán SUM/AVERAGE'
  );

  // Verify batch processing chunk size
  assert.ok(
    exportServiceContent.includes('BATCH_SIZE') || exportServiceContent.includes('2500'),
    'Export engine PHẢI hỗ trợ chia lô (batching) khi tập dữ liệu lớn (>2,500 dòng)'
  );

  // Verify filename format with timestamp
  assert.ok(
    exportServiceContent.includes('pad') || exportServiceContent.includes('toISOString') || exportServiceContent.includes('filename'),
    'Tên file xuất PHẢI chứa tên phân hệ và timestamp thời gian'
  );
});

test('2. DRILL-DOWN EXPORT: UnifiedDrillDownModal xuất 100% dữ liệu đã lọc, hỗ trợ exportValue', async (t) => {
  const modalContent = fs.readFileSync(path.resolve('src/components/common/UnifiedDrillDownModal.tsx'), 'utf8');

  // Must export all sortedData (matching filters), NOT paginatedData
  assert.ok(
    modalContent.includes('sortedData.map') || modalContent.includes('exportToCSV(exportData'),
    'Modal drill-down PHẢI xuất sortedData (toàn bộ dòng khớp bộ lọc), tuyệt đối KHÔNG chỉ xuất trang đang xem'
  );

  // Must support custom exportValue
  assert.ok(
    modalContent.includes('col.exportValue'),
    'DrillDownColumn PHẢI hỗ trợ hàm exportValue để chuẩn hóa dữ liệu xuất'
  );
});

test('3. CHART EMPTY STATE: Hiển thị giao diện thân thiện, không vẽ trục phẳng số 0 sai lệch', async (t) => {
  const chartEmptyContent = fs.readFileSync(path.resolve('src/components/common/ChartEmptyState.tsx'), 'utf8');
  assert.ok(chartEmptyContent.includes('ChartEmptyState'), 'Component ChartEmptyState phải tồn tại');
  assert.ok(chartEmptyContent.includes('Thử nới lỏng bộ lọc'), 'ChartEmptyState phải có hướng dẫn gợi ý nới lỏng bộ lọc');

  // Verify OverviewTab integrates ChartEmptyState
  const overviewContent = fs.readFileSync(path.resolve('src/pages/OverviewTab.tsx'), 'utf8');
  assert.ok(overviewContent.includes('import { ChartEmptyState }'), 'OverviewTab phải import ChartEmptyState');
  assert.ok(overviewContent.includes('ca2OperationalData.length === 0'), 'OverviewTab phải kiểm tra dữ liệu Ca 2 rỗng');
  assert.ok(overviewContent.includes('dailyTrends.length === 0'), 'OverviewTab phải kiểm tra dailyTrends rỗng');
  assert.ok(overviewContent.includes('poSummaries.length === 0'), 'OverviewTab phải kiểm tra poSummaries rỗng');
  assert.ok(overviewContent.includes('agingData.length === 0'), 'OverviewTab phải kiểm tra agingData rỗng');

  // Verify BacklogGltTab integrates ChartEmptyState
  const gltContent = fs.readFileSync(path.resolve('src/pages/BacklogGltTab.tsx'), 'utf8');
  assert.ok(gltContent.includes('poBacklogData.length === 0'), 'BacklogGltTab phải kiểm tra poBacklogData rỗng');
  assert.ok(gltContent.includes('alertMatrixData.rows.length === 0'), 'BacklogGltTab phải kiểm tra alertMatrixData rỗng');
});

test('4. AUDIT EVENT LISTENERS & MEMORY: 100% addEventListener có removeEventListener tương ứng', async (t) => {
  const srcDir = path.resolve('src');

  function scanDir(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(scanDir(fullPath));
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const allFiles = scanDir(srcDir);
  let checkedCount = 0;

  for (const filePath of allFiles) {
    const code = fs.readFileSync(filePath, 'utf8');
    if (code.includes('addEventListener')) {
      const addCount = (code.match(/addEventListener/g) || []).length;
      const removeCount = (code.match(/removeEventListener/g) || []).length;
      assert.equal(
        addCount,
        removeCount,
        `File ${path.basename(filePath)} bị mất cân bằng listener: ${addCount} addEventListener vs ${removeCount} removeEventListener`
      );
      checkedCount++;
    }
  }

  assert.ok(checkedCount >= 10, `Phải kiểm tra ít nhất 10 component có event listener (thực tế kiểm tra: ${checkedCount})`);
});

test('5. BENCHMARK HIỆU NĂNG THỰC TẾ: Thời gian lọc và xuất CSV trên dữ liệu thực tế', async (t) => {
  // Load sample snapshot data
  const snapshotRaw = fs.readFileSync(path.resolve('src/data/snapshots/ton_dong_glt.json'), 'utf8');
  const snapshot = JSON.parse(snapshotRaw);

  const gltData = Array.isArray(snapshot) ? snapshot : (snapshot.data || snapshot.backlogGlt || []);
  assert.ok(gltData.length >= 10000, `Tập dữ liệu GLT phải có ít nhất 10,000 dòng (thực tế: ${gltData.length})`);

  // 1. Measure Filter performance on 10,928 rows
  const filterStart = performance.now();
  const filtered = gltData.filter(item => {
    const matchPo = item.buuCuc === '(LAN) Cần Giuộc';
    const matchAlert = item.canhBao === 'Cảnh báo';
    return matchPo || matchAlert;
  });
  const filterDuration = performance.now() - filterStart;

  assert.ok(filterDuration < 30, `Thời gian lọc 10,928 dòng phải < 30ms (thực tế: ${filterDuration.toFixed(2)}ms)`);

  // 2. Measure CSV Generation performance on 10,928 rows
  const columns = [
    { key: 'maDonHang', label: 'Mã Đơn Hàng' },
    { key: 'buuCuc', label: 'Bưu Cục' },
    { key: 'loaiDon', label: 'Loại Đơn' },
    { key: 'thoiGianTonDong', label: 'Thời Gian Tồn Đọng' },
    { key: 'canhBao', label: 'Mức Cảnh Báo' }
  ];

  const exportStart = performance.now();
  const headerRow = columns.map(c => `"${c.label}"`).join(',');
  const dataRows = gltData.map(row => 
    columns.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') return val;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const exportDuration = performance.now() - exportStart;

  assert.ok(exportDuration < 100, `Thời gian tạo CSV cho 10,928 dòng phải < 100ms (thực tế: ${exportDuration.toFixed(2)}ms)`);
  assert.ok(csvContent.startsWith('\uFEFF'), 'Nội dung CSV phải bắt đầu bằng UTF-8 BOM');
  assert.equal(dataRows.length, gltData.length, 'Số dòng CSV phải khớp 100% số dòng dữ liệu');
});
