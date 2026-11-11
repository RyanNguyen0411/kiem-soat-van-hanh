import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Emulate implementation from src/utils/calculation.utils.ts
function safeToFixed(value, digits = 2) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return '—';
  }
  return num.toFixed(digits);
}

function safeFormatPercent(value, digits = 1) {
  const formatted = safeToFixed(value, digits);
  if (formatted === '—') return '—';
  return `${formatted}%`;
}

function safeFormatNumber(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim().replace(/\./g, '').replace(',', '.'));
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return fallback;
  }
  return num.toLocaleString('vi-VN');
}

// Helper mimicking renderSafeCell in UnifiedDrillDownModal
function renderSafeCell(col, row) {
  try {
    if (col.render) {
      const rendered = col.render(row);
      return rendered !== undefined && rendered !== null && rendered !== '' ? rendered : '—';
    }
    const val = row[col.key];
    if (val === undefined || val === null || val === '') return '—';
    return String(val);
  } catch (err) {
    return '—';
  }
}

test('INTEGRATION: Drill-down Columns Safety across all Data Variations', () => {
  // Define column renderers from OverviewTab.tsx
  const gtcColumns = [
    { key: 'buuCuc', label: 'Bưu cục' },
    { key: 'assignedRate', label: 'Tỷ lệ phân công', render: (r) => `${safeToFixed(r.assignedRate, 1)}%` },
    { key: 'gtcRate', label: 'Tỷ lệ GTC', render: (r) => `${safeToFixed(r.gtcRate, 2)}%` },
    { key: 'sldChuyenTra', label: 'Chuyển trả', render: (r) => safeFormatNumber(r.sldChuyenTra) },
    { key: 'tongGtc', label: 'Tổng GTC', render: (r) => safeFormatNumber(r.tongGtc) }
  ];

  // 1. Scenario A: Real snapshot data from gtc_buu_cuc.json
  const rawData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/gtc_buu_cuc.json'), 'utf-8'));
  assert.ok(Array.isArray(rawData) && rawData.length > 0, 'gtc_buu_cuc.json must contain records');

  for (const record of rawData) {
    for (const col of gtcColumns) {
      assert.doesNotThrow(() => {
        const res = renderSafeCell(col, record);
        assert.ok(typeof res === 'string' && res.length > 0);
      });
    }
  }

  // 2. Scenario B: Row with missing fields (empty object) returns safe fallback without throwing
  const emptyRow = {};
  for (const col of gtcColumns) {
    assert.doesNotThrow(() => {
      const res = renderSafeCell(col, emptyRow);
      assert.ok(typeof res === 'string');
      if (col.key === 'assignedRate' || col.key === 'gtcRate') {
        assert.equal(res, '—%');
      } else {
        assert.equal(res, '—');
      }
    });
  }

  // 3. Scenario C: Explicit null and undefined fields in rows
  const nullRow = {
    buuCuc: null,
    assignedRate: null,
    gtcRate: undefined,
    sldChuyenTra: null,
    tongGtc: undefined
  };
  for (const col of gtcColumns) {
    assert.doesNotThrow(() => {
      const res = renderSafeCell(col, nullRow);
      assert.ok(typeof res === 'string');
    });
  }

  // 4. Scenario D: String numbers ("85.2", "0") are safely parsed and formatted
  const stringNumRow = {
    buuCuc: '(LAN) Bến Lức',
    assignedRate: '85.24',
    gtcRate: '98.5',
    sldChuyenTra: '1250',
    tongGtc: '45000'
  };
  assert.equal(renderSafeCell(gtcColumns[1], stringNumRow), '85.2%');
  assert.equal(renderSafeCell(gtcColumns[2], stringNumRow), '98.50%');
  assert.equal(renderSafeCell(gtcColumns[3], stringNumRow), (1250).toLocaleString('vi-VN'));
  assert.equal(renderSafeCell(gtcColumns[4], stringNumRow), (45000).toLocaleString('vi-VN'));

  // 5. Scenario E: Corrupted / Non-numeric strings ("abc", "N/A", "NaN")
  const corruptedRow = {
    buuCuc: '(LAN) Tân An',
    assignedRate: 'abc',
    gtcRate: 'N/A',
    sldChuyenTra: 'NaN',
    tongGtc: 'error'
  };
  assert.doesNotThrow(() => {
    const resRate = renderSafeCell(gtcColumns[1], corruptedRow);
    const resGtc = renderSafeCell(gtcColumns[2], corruptedRow);
    const resTra = renderSafeCell(gtcColumns[3], corruptedRow);
    assert.equal(resRate, '—%');
    assert.equal(resGtc, '—%');
    assert.equal(resTra, '—');
  });

  // 6. Scenario F: Deliberately crashing render function is caught by renderSafeCell
  const crashingCol = {
    key: 'badCol',
    label: 'Bad Col',
    render: (r) => r.nonExistentObject.deep.toFixed(2)
  };
  const dummyRow = {};
  assert.doesNotThrow(() => {
    const res = renderSafeCell(crashingCol, dummyRow);
    assert.equal(res, '—');
  });
});
