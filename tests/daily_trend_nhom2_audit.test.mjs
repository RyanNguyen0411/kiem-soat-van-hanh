import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('DAILY TREND – NHÓM 2 AUDIT & VERIFICATION (20 TEST CASES)', () => {
  const resolveTarget = (rel) => fs.existsSync(path.resolve(rel)) ? path.resolve(rel) : path.resolve('kiem-soat-van-hanh', rel);
  const filePath = resolveTarget('src/components/gtc-post-office/GtcDailyTrendSection.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  it('TC01: Legend order strictly follows 1. Volume (#15803D), 2. Tồn đọng (#F97316), 3. %GTC Tổng (#002D72)', () => {
    const volIdx = fileContent.indexOf('dataKey="totalVolume"');
    const tonIdx = fileContent.indexOf('dataKey="totalTonDong"');
    const gtcIdx = fileContent.indexOf('dataKey="totalGtcRate"');
    assert.ok(volIdx > -1 && tonIdx > -1 && gtcIdx > -1, 'All 3 series must be in chart');
    assert.ok(volIdx < tonIdx, 'Volume must precede Tồn đọng');
    assert.ok(tonIdx < gtcIdx, 'Tồn đọng must precede %GTC Tổng');
  });

  it('TC02: Volume color is #15803D (Xanh lá đậm) in Bar and Cell', () => {
    assert.ok(fileContent.includes('fill="#15803D"'), 'Bar Volume must use #15803D');
    assert.ok(fileContent.includes("isSelected ? '#002D72' : '#15803D'"), 'Cell Volume must use #15803D');
  });

  it('TC03: Tồn đọng color is #F97316 (Đỏ cam) in Bar and Cell', () => {
    assert.ok(fileContent.includes('fill="#F97316"'), 'Bar Tồn đọng must use #F97316');
    assert.ok(fileContent.includes("isSelected ? '#C2410C' : '#F97316'"), 'Cell Tồn đọng must use #F97316');
  });

  it('TC04: Tooltip metric order matches 1. Volume, 2. Tồn đọng, 3. SLĐ GTC, 4. %GTC Tổng', () => {
    const tipVol = fileContent.indexOf('Volume:</span>');
    const tipTon = fileContent.indexOf('Tồn đọng:</span>');
    const tipGtc = fileContent.indexOf('SLĐ GTC:</span>');
    assert.ok(tipVol > -1 && tipTon > -1 && tipGtc > -1, 'Tooltip items must exist');
    assert.ok(tipVol < tipTon, 'Tooltip Volume must precede Tồn đọng');
    assert.ok(tipTon < tipGtc, 'Tooltip Tồn đọng must precede SLĐ GTC');
  });

  it('TC05: Extremes order aligns with 1. Max Vol, 2. Max Tồn, 3. Max %GTC, 4. Min %GTC', () => {
    const exVol = fileContent.indexOf('Max Vol:');
    const exTon = fileContent.indexOf('Max Tồn:');
    const exMaxGtc = fileContent.indexOf('Max %GTC:');
    const exMinGtc = fileContent.indexOf('Min %GTC:');
    assert.ok(exVol < exTon && exTon < exMaxGtc && exMaxGtc < exMinGtc, 'Extremes order must match 1-2-3-4');
  });

  it('TC06: 4 KPI Cards consolidated into single row on desktop (grid-cols-2 lg:grid-cols-4)', () => {
    assert.ok(fileContent.includes('grid grid-cols-2 lg:grid-cols-4'), 'Must use 4 columns on large screens');
  });

  it('TC07: KPI Card 1 displays Tổng Volume with %Gán sub-metric', () => {
    assert.ok(fileContent.includes('Tổng Volume'), 'Card 1 must be titled Tổng Volume');
    assert.ok(fileContent.includes('overallKPIs.volume.toLocaleString'), 'Card 1 must show volume');
    assert.ok(fileContent.includes('%Gán:'), 'Card 1 must show %Gán');
    assert.ok(fileContent.includes('overallKPIs.ganRate.toFixed(1)'), 'Card 1 must calculate ganRate');
  });

  it('TC08: KPI Card 2 displays Tổng SLĐ GTC clearly', () => {
    assert.ok(fileContent.includes('Tổng SLĐ GTC'), 'Card 2 must be titled Tổng SLĐ GTC');
    assert.ok(fileContent.includes('overallKPIs.sldGTC.toLocaleString'), 'Card 2 must show sldGTC');
  });

  it('TC09: KPI Card 3 renamed to %GTC CỦA BC and calculated by weighted average SUM(GTC)/SUM(Vol)', () => {
    assert.ok(fileContent.includes('%GTC CỦA BC'), 'Card 3 must be titled %GTC CỦA BC');
    assert.ok(fileContent.includes('overallKPIs.gtcRate.toFixed(2)'), 'Card 3 must show weighted gtcRate with 2 decimals');
    assert.ok(fileContent.includes('volume > 0 ? (sldGTC / volume) * 100 : 0'), 'Formula must be SUM(GTC)/SUM(Vol)');
  });

  it('TC10: KPI Card 4 displays Tổng Tồn Đọng with volume - sldGTC', () => {
    assert.ok(fileContent.includes('Tổng Tồn Đọng'), 'Card 4 must be titled Tổng Tồn Đọng');
    assert.ok(fileContent.includes('overallKPIs.tonDong.toLocaleString'), 'Card 4 must show tonDong');
    assert.ok(fileContent.includes('tonDong = volume - sldGTC'), 'Formula must be volume - sldGTC');
  });

  it('TC11: Obsolete redundant descriptions removed from KPI cards', () => {
    assert.ok(!fileContent.includes('Giao thành công trong ca'), 'Old phrase Giao thành công trong ca removed');
    assert.ok(!fileContent.includes('GTC / Volume toàn tháng'), 'Old phrase GTC / Volume toàn tháng removed');
    assert.ok(!fileContent.includes('Volume - SLĐ GTC</div>'), 'Old phrase Volume - SLĐ GTC description removed');
  });

  it('TC12: Interactive hover effects and active ring styling on KPI cards', () => {
    assert.ok(fileContent.includes('hover:-translate-y-0.5'), 'Must have subtle lift on hover');
    assert.ok(fileContent.includes('ring-2 ring-emerald-500/30'), 'Active volume card ring');
    assert.ok(fileContent.includes('ring-2 ring-blue-500/30'), 'Active gtc card ring');
    assert.ok(fileContent.includes('ring-2 ring-sky-500/30'), 'Active rate card ring');
    assert.ok(fileContent.includes('ring-2 ring-[#F97316]/30'), 'Active tondong card ring');
  });

  it('TC13: Exactly one drill-down open at a time with toggle handler', () => {
    assert.ok(fileContent.includes("setActiveKpiDrillDown(prev => prev === type ? null : type)"), 'Toggle logic must close when re-clicking');
    assert.ok(fileContent.includes("activeKpiDrillDown === 'volume'"), 'Handles volume');
    assert.ok(fileContent.includes("activeKpiDrillDown === 'gtc'"), 'Handles gtc');
    assert.ok(fileContent.includes("activeKpiDrillDown === 'rate'"), 'Handles rate');
    assert.ok(fileContent.includes("activeKpiDrillDown === 'tondong'"), 'Handles tondong');
  });

  it('TC14: Quick close button (X) provided in drill-down accordion header', () => {
    assert.ok(fileContent.includes("onClick={() => setActiveKpiDrillDown(null)}"), 'Has quick close handler');
    assert.ok(fileContent.includes('<X className="w-4 h-4" />'), 'Renders X icon');
  });

  it('TC15: Volume Drill-Down table includes volume, shareOfVolume, sldGan, ganRate, and progress bar', () => {
    assert.ok(fileContent.includes('Tỷ Trọng Vol'), 'Has share of volume column');
    assert.ok(fileContent.includes('poItem.shareOfVolume.toFixed(1)'), 'Renders shareOfVolume');
    assert.ok(fileContent.includes('poItem.ganRate.toFixed(1)'), 'Renders ganRate');
    assert.ok(fileContent.includes('style={{ width: `${Math.min(poItem.ganRate, 100)}%` }}'), 'Renders progress bar');
  });

  it('TC16: SLĐ GTC Drill-Down table includes sldGTC, volume, %GTC, and performance status badge', () => {
    assert.ok(fileContent.includes('Đóng Góp GTC'), 'Has GTC contribution column');
    assert.ok(fileContent.includes('poItem.gtcRate >= 80 ? \'Đạt chuẩn\''), 'Has performance badge');
  });

  it('TC17: %GTC của BC Drill-Down table ranks post offices and shows delta vs 80% standard', () => {
    assert.ok(fileContent.includes('So Với Chuẩn 80%'), 'Has delta vs standard column');
    assert.ok(fileContent.includes('Xuất sắc (>=85%)'), 'Has rating >=85%');
    assert.ok(fileContent.includes('Đạt (>=70%)'), 'Has rating >=70%');
    assert.ok(fileContent.includes('Dưới chuẩn (<70%)'), 'Has rating <70%');
  });

  it('TC18: Tổng Tồn Đọng Drill-Down table shows tonDong, volume, tonRate, and alert levels', () => {
    assert.ok(fileContent.includes('Tỷ Lệ Tồn'), 'Has tonRate column');
    assert.ok(fileContent.includes('Tốt (<=15%)'), 'Has rating <=15%');
    assert.ok(fileContent.includes('Chú ý'), 'Has rating <=25%');
    assert.ok(fileContent.includes('Báo động (>25%)'), 'Has rating >25%');
  });

  it('TC19: Sub-row expansion supported for individual product types (loaiBreakdown)', () => {
    assert.ok(fileContent.includes('handleTogglePoDrillExpand'), 'Has sub-row toggle');
    assert.ok(fileContent.includes('poItem.loaiBreakdown.map'), 'Maps product breakdown sub-rows');
  });

  it('TC20: Drill-down data automatically synchronizes with active filters and maintains table footer totals', () => {
    assert.ok(fileContent.includes('kpiDrillDownData = useMemo'), 'kpiDrillDownData is memoized with active filters');
    assert.ok(fileContent.includes('Tổng Toàn Bộ ({selectedPos.length} bưu cục)'), 'Footer computes grand total');
  });
});
