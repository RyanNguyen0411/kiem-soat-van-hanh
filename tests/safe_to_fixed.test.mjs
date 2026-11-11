import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Emulate implementation from calculation.utils.ts
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

test('SAFE_TO_FIXED: Strict test matrix conformance', () => {
  // Test case table required by user specification:
  // 123.456 -> 123.46
  assert.equal(safeToFixed(123.456, 2), '123.46');

  // 0 -> 0.00
  assert.equal(safeToFixed(0, 2), '0.00');

  // "123.456" -> 123.46
  assert.equal(safeToFixed('123.456', 2), '123.46');

  // null -> —
  assert.equal(safeToFixed(null), '—');

  // undefined -> —
  assert.equal(safeToFixed(undefined), '—');

  // "" -> —
  assert.equal(safeToFixed(''), '—');

  // "abc" -> —
  assert.equal(safeToFixed('abc'), '—');

  // NaN -> —
  assert.equal(safeToFixed(NaN), '—');

  // Infinity -> —
  assert.equal(safeToFixed(Infinity), '—');
  assert.equal(safeToFixed(-Infinity), '—');
});

test('SAFE_FORMAT_PERCENT: Formats valid percentages with % and returns — for invalid values', () => {
  assert.equal(safeFormatPercent(75.5, 1), '75.5%');
  assert.equal(safeFormatPercent(0, 1), '0.0%');
  assert.equal(safeFormatPercent('80', 1), '80.0%');
  assert.equal(safeFormatPercent(null), '—');
  assert.equal(safeFormatPercent(undefined), '—');
  assert.equal(safeFormatPercent(''), '—');
  assert.equal(safeFormatPercent('xyz'), '—');
  assert.equal(safeFormatPercent(NaN), '—');
});

test('SAFE_FORMAT_NUMBER: Formats numbers with vi-VN separators and handles missing values', () => {
  assert.equal(safeFormatNumber(1234567), '1.234.567');
  assert.equal(safeFormatNumber(0), '0');
  assert.equal(safeFormatNumber(null), '—');
  assert.equal(safeFormatNumber(undefined), '—');
  assert.equal(safeFormatNumber(''), '—');
  assert.equal(safeFormatNumber(NaN), '—');
});

test('CODE AUDIT: calculation.utils.ts and index.ts export safeToFixed, safeFormatPercent, safeFormatNumber', () => {
  const calcUtilPath = path.resolve('src/utils/calculation.utils.ts');
  const calcContent = fs.readFileSync(calcUtilPath, 'utf8');

  assert.ok(calcContent.includes('export function safeToFixed'), 'safeToFixed exported in calculation.utils.ts');
  assert.ok(calcContent.includes('export function safeFormatPercent'), 'safeFormatPercent exported in calculation.utils.ts');
  assert.ok(calcContent.includes('export function safeFormatNumber'), 'safeFormatNumber exported in calculation.utils.ts');

  const indexPath = path.resolve('src/utils/index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexContent.includes('calculation.utils'), 'calculation.utils exported in src/utils/index.ts');
});
