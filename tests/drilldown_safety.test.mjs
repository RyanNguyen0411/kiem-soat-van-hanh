import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

test('DRILLDOWN SAFETY: UnifiedDrillDownModal contains ErrorBoundary and safe helpers', () => {
  const modalSource = read('src/components/common/UnifiedDrillDownModal.tsx');
  
  // 1. ErrorBoundary exists
  assert.ok(modalSource.includes('class DrillDownErrorBoundary'), 'DrillDownErrorBoundary class must exist');
  assert.ok(modalSource.includes('<DrillDownErrorBoundary onClose={onClose}>'), 'Modal content must be wrapped in DrillDownErrorBoundary');
  
  // 2. Escape key support
  assert.ok(modalSource.includes("e.key === 'Escape'"), 'Modal must listen for Escape key');
  
  // 3. Body scroll locking
  assert.ok(modalSource.includes("document.body.style.overflow = 'hidden'"), 'Modal must lock body scroll when open');
  
  // 4. Safe render helper
  assert.ok(modalSource.includes('function renderSafeCell'), 'renderSafeCell helper must be present');
  assert.ok(modalSource.includes('function getSafeExportValue'), 'getSafeExportValue helper must be present');
  
  // 5. Backdrop click to close & stopPropagation on card
  assert.ok(modalSource.includes('onClick={onClose}'), 'Backdrop must have onClick={onClose}');
  assert.ok(modalSource.includes('e.stopPropagation()'), 'Dialog card must stopPropagation');
  
  // 6. Regression constraint: useMemo before if (!isOpen) return null;
  const returnIdx = modalSource.indexOf('if (!isOpen) return null;');
  const memoIndices = [...modalSource.matchAll(/useMemo\(/g)].map((m) => m.index);
  assert.ok(returnIdx >= 0, 'Must return null when closed');
  assert.ok(memoIndices.every((idx) => idx < returnIdx), 'All useMemo hooks must run before if (!isOpen) return null;');
});

test('DRILLDOWN SAFETY: OverviewTab handlers never call toFixed/toLocaleString on undefined', () => {
  const overviewSource = read('src/pages/OverviewTab.tsx');
  
  // Volume handler
  assert.ok(overviewSource.includes('safeVolumeData = filteredGtcBc.map'), 'handleDrillDownVolume must map dataset safely');
  assert.ok(overviewSource.includes('assignedRate: volume > 0 ? (sldGan / volume) * 100 : 0'), 'assignedRate must be pre-calculated');
  
  // GTC handler
  assert.ok(overviewSource.includes('safeGtcData = filteredGtcBc.map'), 'handleDrillDownGtc must map dataset safely');
  assert.ok(overviewSource.includes('sldChuyenTra: chuyenTra'), 'sldChuyenTra must fallback safely');
  
  // Salary handler
  assert.ok(overviewSource.includes('safeSalaryData = filteredHh.map'), 'handleDrillDownSalary must map dataset safely');
  assert.ok(overviewSource.includes('donGTC = Number((row as any).donGiaoTinhLuong ?? (row as any).donGTC) || 0'), 'donGTC must map from donGiaoTinhLuong');
  
  // Employees handler
  assert.ok(overviewSource.includes('safeEmpData = empSummaries.map'), 'handleDrillDownEmployees must map dataset safely');
  assert.ok(overviewSource.includes('soChuyenDi = Number((row as any).chuyenDi ?? (row as any).soChuyenDi) || 1'), 'soChuyenDi must map from chuyenDi');
  assert.ok(overviewSource.includes('nangSuatTB = workDays > 0 ? Math.round(tongDon / workDays) : tongDon'), 'nangSuatTB must be computed safely');
  
  // Check no unprotected `.assignedRate.toFixed` or `.gtcRate.toFixed` without Number()
  assert.ok(!overviewSource.includes('r.assignedRate.toFixed('), 'No raw r.assignedRate.toFixed() call allowed');
  assert.ok(!overviewSource.includes('r.nangSuatTB.toFixed('), 'No raw r.nangSuatTB.toFixed() call allowed');
  assert.ok(!overviewSource.includes('r.donGTC.toLocaleString('), 'No raw r.donGTC.toLocaleString() call allowed');
  assert.ok(!overviewSource.includes('r.donLTC.toLocaleString('), 'No raw r.donLTC.toLocaleString() call allowed');
});

test('OPERATIONAL ALERTS: NhanSuOperationalAlertsCard conforms to UI and attendance policy', () => {
  const alertsSource = read('src/components/nhan-su/NhanSuOperationalAlertsCard.tsx');
  
  // Tab label
  assert.ok(alertsSource.includes('Cảnh Báo Nhân Viên OFF') && (alertsSource.includes('&gt;2 ngày/tuần') || alertsSource.includes('>2 ngày/tuần')), 'Tab 2 must display (>2 ngày/tuần)');
  
  // Notice banner
  assert.ok(alertsSource.includes('Quy chế chuyên cần khu vực:'), 'Notice banner title must match');
  assert.ok(alertsSource.includes('1 tuần OFF') && alertsSource.includes('2 ngày'), 'Notice banner text must mention weekly off limit');
  
  // Sticky header and single-line rows
  assert.ok(alertsSource.includes('sticky top-0 z-10'), 'Table headers must be sticky');
  assert.ok(alertsSource.includes('whitespace-nowrap'), 'Table body rows must be whitespace-nowrap');
});
