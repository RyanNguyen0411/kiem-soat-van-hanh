import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

test('REGRESSION: drill-down modal keeps React hooks unconditional before closed-state return', () => {
  const source = read('src/components/common/UnifiedDrillDownModal.tsx');
  const returnIndex = source.indexOf('if (!isOpen) return null;');
  const memoIndices = [...source.matchAll(/useMemo\(/g)].map((m) => m.index);
  assert.ok(returnIndex >= 0, 'Modal must still return null while closed');
  assert.ok(memoIndices.length >= 3, 'Expected filter, sort and pagination memo hooks');
  assert.ok(memoIndices.every((index) => index < returnIndex), 'All hooks must run before the closed-state return');
});

test('REGRESSION: Drive export creates a native Google Sheets file, not a CSV blob', () => {
  const gas = read('google-apps-script/Code.gs');
  const frontend = read('src/services/excelExportService.ts');
  assert.match(gas, /SpreadsheetApp\.create\(/, 'Apps Script must create a native Google spreadsheet');
  assert.match(gas, /Utilities\.parseCsv\(/, 'Apps Script must parse the dashboard CSV payload');
  assert.match(gas, /moveTo\(folder\)/, 'Native spreadsheet must be moved to the target Drive folder');
  assert.match(gas, /application\/vnd\.google-apps\.spreadsheet/, 'Response must identify native Google Sheets format');
  assert.doesNotMatch(gas, /folder\.createFile\(blob\)/, 'Do not save export as a plain CSV blob');
  assert.doesNotMatch(gas, /ANYONE_WITH_LINK/, 'Do not make exported operational data public by link');
  assert.match(frontend, /result\.success !== true/, 'Frontend must require explicit Apps Script success confirmation');
  assert.doesNotMatch(frontend, /mode:\s*'no-cors'/, 'Do not blindly retry an opaque request and create duplicate files');
});
