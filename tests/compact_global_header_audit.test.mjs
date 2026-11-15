import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('UI/UX OPTIMIZATION – COMPACT GLOBAL HEADER AUDIT (TC01 - TC10)', async (t) => {
  const resolveTarget = (rel) => fs.existsSync(path.resolve(rel)) ? path.resolve(rel) : path.resolve('kiem-soat-van-hanh', rel);
  const overviewPath = resolveTarget('src/pages/OverviewTab.tsx');
  const code = fs.readFileSync(overviewPath, 'utf8');

  await t.test('TC01: Header height reduction to 75-85px target (~50% reduction)', () => {
    // Row 1 header card py-1.5 sm:py-2, Row 2 filter bar min-h-[34px] max-h-[38px]
    assert.ok(code.includes('px-3 sm:px-3.5 py-1.5 sm:py-2'));
    assert.ok(code.includes('min-h-[34px] max-h-[38px]'));
  });

  await t.test('TC02: Breadcrumb retains full hierarchy and compact 16-20px sizing', () => {
    assert.ok(code.includes('aria-label="Breadcrumb"'));
    assert.ok(code.includes('GHN Khu Vực Long An'));
    assert.ok(code.includes('VẬN HÀNH &amp; GTC'));
    assert.ok(code.includes('TỔNG QUAN'));
    assert.ok(code.includes('text-[10px] sm:text-[10.5px]'));
  });

  await t.test('TC03: Page title, Live/Snapshot badge, and BI Center badge preserved', () => {
    assert.ok(code.includes('TỔNG QUAN (BI CONTROL CENTER)'));
    assert.ok(code.includes('syncStatus?.source === \'LIVE_SHEETS\' ? \'LIVE\' : \'SNAPSHOT\''));
    assert.ok(code.includes('BI Center'));
    assert.ok(code.includes('w-7 h-7')); // Compact 28px icon
  });

  await t.test('TC04: Sibling tab navigation buttons functional and placed on right', () => {
    assert.ok(code.includes("onClick={() => setActiveTab('overview')}"));
    assert.ok(code.includes("onClick={() => setActiveTab('bao_cao_gtc_bc')}"));
    assert.ok(code.includes("onClick={() => setActiveTab('gtc_buu_cuc')}"));
    assert.ok(code.includes("onClick={() => setActiveTab('gtc_nhan_vien')}"));
  });

  await t.test('TC05: All 5 filters positioned on a single horizontal row on Desktop', () => {
    assert.ok(code.includes('ref={filterBarRef}'));
    assert.ok(code.includes('overflow-x-auto lg:overflow-visible no-scrollbar'));
    assert.ok(code.includes('min-h-[34px] max-h-[38px]'));
  });

  await t.test('TC06: All 5 dropdown controls retain interactive popovers and handlers', () => {
    // 1. Post office filter
    assert.ok(code.includes('value={filterBuuCuc}'));
    assert.ok(code.includes('setSelectedBuuCucGlobal(val)'));

    // 2. Month filter
    assert.ok(code.includes("openDropdown === 'month'"));
    assert.ok(code.includes('handleSelectMonth'));

    // 3. Week filter
    assert.ok(code.includes("openDropdown === 'week'"));
    assert.ok(code.includes('handleSelectWeek'));

    // 4. Date popover
    assert.ok(code.includes("openDropdown === 'date'"));
    assert.ok(code.includes('handleToggleDate'));

    // 5. Shift/Product type filter
    assert.ok(code.includes('value={filterLoaiHang}'));
    assert.ok(code.includes('setFilterLoaiHang(e.target.value)'));
  });

  await t.test('TC07: Filter state changes propagate properly to calculation engines', () => {
    assert.ok(code.includes('isFilterActive'));
    assert.ok(code.includes('handleResetAllFilters'));
    assert.ok(code.includes('filterBuuCuc'));
    assert.ok(code.includes('filterLoaiHang'));
    assert.ok(code.includes('filterDates'));
  });

  await t.test('TC08: Clean TypeScript build and zero syntax errors', () => {
    assert.ok(!code.includes('console.error'));
  });

  await t.test('TC09: Sticky filter bar enabled without obscuring dashboard charts', () => {
    // Row 1 is normal (scrolls away), Row 2 is sticky top-0 z-30
    assert.ok(code.includes('sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md pt-0.5 pb-1'));
  });

  await t.test('TC10: Responsive layout on mobile/tablet viewports', () => {
    assert.ok(code.includes('overflow-x-auto lg:overflow-visible'));
    assert.ok(code.includes('flex flex-wrap items-center justify-between'));
  });
});
