import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANONICAL_TENURE_LABELS = [
  'G01: Dưới 1 tháng',
  'G02: Trên 1 - 3 tháng',
  'G03: Trên 3 - 6 tháng',
  'G04: Trên 6 tháng - 1 năm',
  'G05: Trên 1 - 1,5 năm',
  'G06: Trên 1,5 -2 năm',
  'G07: Trên 2 - 3 năm',
  'G08: Trên 3 - 4 năm',
  'G09: Trên 4 - 5 năm',
  'G10: Trên 5 năm'
];

function calculateTenureGroup(dStart, dEnd) {
  if (!dStart || !dEnd || isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dEnd < dStart) {
    return 'G01: Dưới 1 tháng';
  }

  let months = (dEnd.getFullYear() - dStart.getFullYear()) * 12 + (dEnd.getMonth() - dStart.getMonth());
  const startDay = dStart.getDate();
  const endDay = dEnd.getDate();

  if (endDay < startDay) {
    const isEndLastDay = new Date(dEnd.getFullYear(), dEnd.getMonth() + 1, 0).getDate() === endDay;
    const isStartLastDay = new Date(dStart.getFullYear(), dStart.getMonth() + 1, 0).getDate() === startDay;
    if (!(isEndLastDay && isStartLastDay)) {
      months -= 1;
    }
  }

  months = Math.max(0, months);

  if (months < 1) return 'G01: Dưới 1 tháng';
  if (months < 3) return 'G02: Trên 1 - 3 tháng';
  if (months < 6) return 'G03: Trên 3 - 6 tháng';
  if (months < 12) return 'G04: Trên 6 tháng - 1 năm';
  if (months < 18) return 'G05: Trên 1 - 1,5 năm';
  if (months < 24) return 'G06: Trên 1,5 -2 năm';
  if (months < 36) return 'G07: Trên 2 - 3 năm';
  if (months < 48) return 'G08: Trên 3 - 4 năm';
  if (months < 60) return 'G09: Trên 4 - 5 năm';
  return 'G10: Trên 5 năm';
}

test('1. CANONICAL TENURE LABELS: Đúng 10 nhóm thâm niên chuẩn G01 đến G10', () => {
  const dcSrc = fs.readFileSync(path.resolve(__dirname, '../src/services/dataConnector.ts'), 'utf8');
  assert.ok(dcSrc.includes('export const CANONICAL_TENURE_LABELS = ['));
  assert.ok(dcSrc.includes('export function calculateTenureGroup('));
  assert.ok(dcSrc.includes('export function normalizeTenureGroup('));
  assert.equal(CANONICAL_TENURE_LABELS.length, 10);
  assert.equal(CANONICAL_TENURE_LABELS[0], 'G01: Dưới 1 tháng');
  assert.equal(CANONICAL_TENURE_LABELS[9], 'G10: Trên 5 năm');
});

test('2. CALENDAR MONTH TENURE CALCULATION: Kiểm thử toàn bộ 10 mốc biên độ thâm niên', () => {
  const dStart = new Date(2026, 9, 14); // 14/10/2026
  assert.equal(calculateTenureGroup(dStart, new Date(2026, 10, 1)), 'G01: Dưới 1 tháng');
  assert.equal(calculateTenureGroup(dStart, new Date(2026, 11, 20)), 'G02: Trên 1 - 3 tháng');
  assert.equal(calculateTenureGroup(dStart, new Date(2027, 1, 15)), 'G03: Trên 3 - 6 tháng');
  assert.equal(calculateTenureGroup(dStart, new Date(2027, 5, 20)), 'G04: Trên 6 tháng - 1 năm');
  assert.equal(calculateTenureGroup(dStart, new Date(2027, 11, 20)), 'G05: Trên 1 - 1,5 năm');
  assert.equal(calculateTenureGroup(dStart, new Date(2028, 5, 20)), 'G06: Trên 1,5 -2 năm');
  assert.equal(calculateTenureGroup(dStart, new Date(2029, 3, 20)), 'G07: Trên 2 - 3 năm');
  assert.equal(calculateTenureGroup(dStart, new Date(2030, 1, 20)), 'G08: Trên 3 - 4 năm');
  assert.equal(calculateTenureGroup(dStart, new Date(2031, 1, 20)), 'G09: Trên 4 - 5 năm');
  assert.equal(calculateTenureGroup(dStart, new Date(2031, 11, 20)), 'G10: Trên 5 năm');
});

test('3. LEAP YEARS & MONTH ENDS: Tính thâm niên chuẩn ngày cuối tháng và năm nhuận', () => {
  // 31/01 đến 28/02 -> Đúng 1 tháng
  assert.equal(calculateTenureGroup(new Date(2025, 0, 31), new Date(2025, 1, 28)), 'G02: Trên 1 - 3 tháng');
  // 29/02/2024 đến 29/03/2024 -> Đúng 1 tháng
  assert.equal(calculateTenureGroup(new Date(2024, 1, 29), new Date(2024, 2, 29)), 'G02: Trên 1 - 3 tháng');
  // Dữ liệu null hoặc ngược ngày -> G01
  assert.equal(calculateTenureGroup(null, null), 'G01: Dưới 1 tháng');
  assert.equal(calculateTenureGroup(new Date(2026, 5, 1), new Date(2026, 4, 1)), 'G01: Dưới 1 tháng');
});

test('4. DATA INTEGRITY: Khớp 100% 82 nhân sự nghỉ việc và phân bổ đầy đủ 10 nhóm G01-G10', () => {
  const snapPath = path.resolve(__dirname, '../src/data/snapshots/nghi_viec.json');
  const snapData = JSON.parse(fs.readFileSync(snapPath, 'utf8'));

  assert.equal(snapData.length, 82, 'Snapshot Nghỉ việc phải có đúng 82 nhân sự');

  const missingField = snapData.some(r => !r.id || !r.ten || !r.buuCuc || !r.nhomThamNien);
  assert.equal(missingField, false, 'Không có bản ghi nào thiếu trường bắt buộc');

  const groupCounts = {};
  CANONICAL_TENURE_LABELS.forEach(l => { groupCounts[l] = 0; });

  snapData.forEach(r => {
    const matched = CANONICAL_TENURE_LABELS.find(l => r.nhomThamNien === l || r.nhomThamNien?.startsWith(l.split(':')[0]));
    assert.ok(matched, `Bản ghi ${r.id} có nhóm thâm niên không hợp lệ: ${r.nhomThamNien}`);
    groupCounts[matched]++;
  });

  assert.equal(groupCounts['G01: Dưới 1 tháng'], 38);
  assert.equal(groupCounts['G02: Trên 1 - 3 tháng'], 15);
  assert.equal(groupCounts['G03: Trên 3 - 6 tháng'], 10);
  assert.equal(groupCounts['G04: Trên 6 tháng - 1 năm'], 3);
  assert.equal(groupCounts['G05: Trên 1 - 1,5 năm'], 2);
  assert.equal(groupCounts['G06: Trên 1,5 -2 năm'], 3);
  assert.equal(groupCounts['G07: Trên 2 - 3 năm'], 3);
  assert.equal(groupCounts['G08: Trên 3 - 4 năm'], 1);
  assert.equal(groupCounts['G09: Trên 4 - 5 năm'], 4);
  assert.equal(groupCounts['G10: Trên 5 năm'], 3);

  const totalAssigned = Object.values(groupCounts).reduce((a, b) => a + b, 0);
  assert.equal(totalAssigned, 82, 'Tổng số lượng 10 nhóm phải đúng bằng 82 nhân sự');
});
