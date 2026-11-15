import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Báo Cáo GTC BC - Card Expansion & Telegram Export Verification', async (t) => {
  const resolveTarget = (rel) => fs.existsSync(path.resolve(rel)) ? path.resolve(rel) : path.resolve('kiem-soat-van-hanh', rel);
  const baoCaoPath = resolveTarget('src/pages/BaoCaoGtcBcTab.tsx');
  const telegramPath = resolveTarget('src/services/telegramService.ts');
  
  const baoCaoCode = fs.readFileSync(baoCaoPath, 'utf8');
  const telegramCode = fs.readFileSync(telegramPath, 'utf8');

  await t.test('TC-BC01: Table containers must not have max-h height limits or inner scrollbars', () => {
    assert.strictEqual(baoCaoCode.includes('max-h-[520px]'), false, 'max-h-[520px] must be removed');
    assert.strictEqual(baoCaoCode.includes('max-h-[300px]'), false, 'max-h-[300px] must be removed');
    assert.strictEqual(baoCaoCode.includes('max-h-[420px]'), false, 'max-h-[420px] must be removed');
  });

  await t.test('TC-BC02: Active staff table displays without inner vertical scroll container', () => {
    assert.ok(baoCaoCode.includes('{/* BẢNG CHI TIẾT NHÂN VIÊN HOẠT ĐỘNG (ĐI GIAO TRONG NGÀY) */}'));
    assert.ok(baoCaoCode.includes('<div className="overflow-x-auto">'));
  });

  await t.test('TC-BC03: capturePostOfficeCard forces full height and removes inner scrollbars on snapshot', () => {
    assert.ok(telegramCode.includes('capturePostOfficeCard(element: HTMLElement)'));
    assert.ok(telegramCode.includes("child.style.overflow = 'visible'"));
    assert.ok(telegramCode.includes("child.style.maxHeight = 'none'"));
    assert.ok(telegramCode.includes('TARGET_WIDTH = 1260'));
  });

  await t.test('TC-BC04: data-no-capture elements are excluded from snapshot', () => {
    assert.ok(telegramCode.includes("getAttribute('data-no-capture') === 'true'"));
  });

  await t.test('TC-BC05: Original styles restored in finally block after snapshot', () => {
    assert.ok(telegramCode.includes('finally {'));
    assert.ok(telegramCode.includes('item.el.style.overflow = item.overflow'));
    assert.ok(telegramCode.includes('item.el.style.maxHeight = item.maxHeight'));
  });
});
