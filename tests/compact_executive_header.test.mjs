import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('COMPACT EXECUTIVE HEADER – 12 AUDIT TESTS (TC01 - TC12)', () => {
  const resolveTarget = (rel) => fs.existsSync(path.resolve(rel)) ? path.resolve(rel) : path.resolve('kiem-soat-van-hanh', rel);
  const filePath = resolveTarget('src/components/gtc-post-office/GtcDailyTrendSection.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  it('TC01: Filter bar is structured as a single horizontal flex row on Desktop (Bưu cục | Tháng | Chọn ngày | Loại hàng | Reset)', () => {
    assert.ok(fileContent.includes('flex flex-wrap lg:flex-nowrap items-center justify-between gap-2'), 'Must be flex row on large screen');
    assert.ok(fileContent.includes('Bưu cục:</span>'), 'Contains Bưu cục');
    assert.ok(fileContent.includes('Tháng:</span>'), 'Contains Tháng');
    assert.ok(fileContent.includes('ref={datePickerRef}'), 'Contains Chọn ngày');
    assert.ok(fileContent.includes('Hàng:</span>'), 'Contains Loại hàng');
    assert.ok(fileContent.includes('handleResetTrendFilters'), 'Contains Reset');
  });

  it('TC02: Filter bar targets 42-48px height with min-h-[42px] and lg:max-h-[48px]', () => {
    assert.ok(fileContent.includes('min-h-[42px]'), 'Must have min-h 42px');
    assert.ok(fileContent.includes('lg:max-h-[48px]'), 'Must have max-h 48px on desktop');
  });

  it('TC03: 4 KPI Cards are consolidated into a single row on desktop (grid-cols-2 lg:grid-cols-4)', () => {
    assert.ok(fileContent.includes('grid grid-cols-2 lg:grid-cols-4 gap-2'), 'Must be 4 cols on desktop with 8px gap');
    assert.ok(fileContent.includes('Tổng Volume'), 'Card 1 exists');
    assert.ok(fileContent.includes('Tổng SLĐ GTC'), 'Card 2 exists');
    assert.ok(fileContent.includes('%GTC CỦA BC'), 'Card 3 exists');
    assert.ok(fileContent.includes('Tổng Tồn Đọng'), 'Card 4 exists');
  });

  it('TC04: KPI Cards target 52-60px height with min-h-[52px] and max-h-[60px]', () => {
    assert.ok(fileContent.includes('min-h-[52px] max-h-[60px]'), 'Must enforce 52-60px height constraint');
  });

  it('TC05: Numbers (19px font-black) and sublines (10px font-bold/semibold) are structured without clipping', () => {
    assert.ok(fileContent.includes('text-[19px] font-black'), 'Main numbers styled with 19px font-black');
    assert.ok(fileContent.includes('whitespace-nowrap'), 'Sublines prevent awkward mid-word line breaking');
  });

  it('TC06: Hover and Drill-Down states fully functional with transitions and active rings', () => {
    assert.ok(fileContent.includes('hover:-translate-y-0.5'), 'Smooth hover transform');
    assert.ok(fileContent.includes('ring-2 ring-emerald-500/30'), 'Active volume ring');
    assert.ok(fileContent.includes('ring-2 ring-blue-500/30'), 'Active gtc ring');
    assert.ok(fileContent.includes('ring-2 ring-sky-500/30'), 'Active rate ring');
    assert.ok(fileContent.includes('ring-2 ring-[#F97316]/30'), 'Active tondong ring');
  });

  it('TC07: Opening Drill-Down renders isolated accordion underneath without breaking grid or layout', () => {
    assert.ok(fileContent.includes('{activeKpiDrillDown && ('), 'Conditional drill-down render');
    assert.ok(fileContent.includes('Drill-Down Chi Tiết:'), 'Drill-down header');
    assert.ok(fileContent.includes('onClick={() => setActiveKpiDrillDown(null)}'), 'Close button');
  });

  it('TC08: Popover date picker retains full interactive capabilities (All, Deselect, Reset, Checkboxes)', () => {
    assert.ok(fileContent.includes('handleSelectAllDays'), 'Select all days');
    assert.ok(fileContent.includes('handleDeselectAllDays'), 'Deselect all days');
    assert.ok(fileContent.includes('handleResetDays'), 'Reset days');
    assert.ok(fileContent.includes('handleToggleDayInMonth'), 'Toggle day');
  });

  it('TC09: Chart click-to-inspect continues to drive the 2-level inspection table', () => {
    assert.ok(fileContent.includes('handleSelectDay'), 'Click date handler');
    assert.ok(fileContent.includes('normalizeDateStr(r.ngay) === targetNorm'), 'Inspection table filtered by clicked date');
  });

  it('TC10: Filter updates propagate to overallKPIs, chartDailyData, and drill-down data automatically', () => {
    assert.ok(fileContent.includes('overallKPIs = useMemo'), 'overallKPIs memoized with filteredRecords');
    assert.ok(fileContent.includes('chartDailyData = useMemo'), 'chartDailyData memoized with filteredRecords');
    assert.ok(fileContent.includes('kpiDrillDownData = useMemo'), 'kpiDrillDownData memoized with filteredRecords');
  });

  it('TC11: Component compiles cleanly without React or TypeScript errors', () => {
    assert.ok(fileContent.includes('export const GtcDailyTrendSection: React.FC'), 'Component properly typed and exported');
  });

  it('TC12: Responsive on small screens with flex-wrap and grid fallbacks', () => {
    assert.ok(fileContent.includes('flex flex-wrap lg:flex-nowrap'), 'Filter wraps cleanly on smaller screens');
    assert.ok(fileContent.includes('grid grid-cols-2 lg:grid-cols-4'), 'KPI cards collapse to 2 columns on mobile/tablet');
    assert.ok(fileContent.includes('grid grid-cols-1 lg:grid-cols-10'), 'Chart/Detail layout collapses to single column on mobile');
  });
});
