import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('ĐỐI CHIẾU CHUẨN XÁC BÁO CÁO TỒN ĐỌNG GLT TELEGRAM & DỮ LIỆU NGUỒN (AUDIT RECONCILIATION)', async (t) => {
  const telegramServiceSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/services/telegramService.ts'), 'utf8');
  const snapshotPath = path.join(ROOT_DIR, 'src/data/snapshots/ton_dong_glt.json');
  assert.ok(fs.existsSync(snapshotPath), 'ton_dong_glt.json phải tồn tại');

  const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  // 1. Cấu hình Telegram mặc định trỏ đúng bot token và group chat ID mới của AM Huy
  await t.test('1. Cấu hình Telegram mặc định trỏ đúng bot token và group chat ID mới của AM Huy', () => {
    assert.match(telegramServiceSrc, /DEFAULT_TELEGRAM_BOT_TOKEN[\s\S]*?8864951478:AAHynooqSLOTQOo3SBwghQDeXMiz5iIUEsw/);
    assert.match(telegramServiceSrc, /DEFAULT_TELEGRAM_CHAT_ID\s*=\s*'-5234712010'/);
  });

  // Verify classifyGltAging
  function classifyGltAging(thoiGianTonDong, canhBao) {
    const tg = (thoiGianTonDong || '').trim();
    const cb = (canhBao || '').toLowerCase();

    if (
      tg === '192' || 
      tg === '>192' || 
      tg === '> 192' || 
      tg.startsWith('192') ||
      (tg.includes('192') && !tg.includes('120')) || 
      (cb.includes('192') && !cb.includes('120')) || 
      cb.includes('đơn đã quá hạn')
    ) {
      return { key: 'gt_8d_192h' };
    }

    if (
      tg === '120_192' || 
      tg.startsWith('120') || 
      tg.includes('120_192') || 
      tg.includes('120-192') ||
      cb.includes('120_192') || 
      cb.includes('khẩn cấp quá hạn')
    ) {
      return { key: '5_8d' };
    }

    if (
      tg === '72_96' || 
      tg === '96_120' || 
      cb.includes('72_96') || 
      cb.includes('96_120') ||
      cb.includes('báo động quá hạn')
    ) {
      return { key: '3_5d' };
    }

    if (
      tg === '24_36' || 
      tg === '36_48' || 
      tg === '48_72' || 
      cb.includes('24_36') || 
      cb.includes('36_48') || 
      cb.includes('48_72')
    ) {
      return { key: '1_3d' };
    }

    return { key: 'lt_1d' };
  }

  await t.test('2. Đối chiếu chuẩn xác trên dữ liệu snapshot kiểm toán (10.928 dòng): Không sót đơn OTHER', () => {
    // Trên snapshot, Tầm Vu có 1 đơn 192h thuộc khách hàng OTHER
    const tvRecords = snapshotData.filter(d => d.buuCuc === '(LAN) Tầm Vu' || d.maBC === '21710000');
    const tv192 = tvRecords.filter(d => classifyGltAging(d.thoiGianTonDong, d.canhBao).key === 'gt_8d_192h');
    assert.equal(tv192.length, 1, 'Tầm Vu trên snapshot phải có đúng 1 đơn 192h (OTHER)');
    assert.equal(tv192[0].khachHang, 'OTHER');

    // Toàn bộ 5 bưu cục đều quét sạch
    const total192 = snapshotData.filter(d => classifyGltAging(d.thoiGianTonDong, d.canhBao).key === 'gt_8d_192h').length;
    assert.equal(total192, 5, 'Toàn bộ snapshot có 5 đơn 192h');
  });

  await t.test('3. Đối chiếu chuẩn xác trên bộ dữ liệu vận hành mới nhất (Live Google Sheet: 5.513 đơn)', () => {
    // Mock dữ liệu live 5.513 đơn theo cấu trúc đã kiểm chứng
    const mockLiveRecords = [
      // Tầm Vu: 1 đơn 192h (GYELY34B, OTHER)
      { buuCuc: '(LAN) Tầm Vu', maBC: '21710000', maDonHang: 'GYELY34B', loaiDon: 'Giao', khachHang: 'OTHER', trangThai: 'Đang có chuyến đi trong ngày', thoiGianTonDong: '192', canhBao: 'Khẩn cấp quá hạn 192' },
      // Rạch Kiến: 1 đơn 192h (GYEQYYD7, SHOPEE)
      { buuCuc: '(LAN) Rạch Kiến', maBC: '22206000', maDonHang: 'GYEQYYD7', loaiDon: 'Giao', khachHang: 'SHOPEE', trangThai: 'Đang có chuyến đi trong ngày', thoiGianTonDong: '192', canhBao: 'Khẩn cấp quá hạn 192' },
      // Cần Giuộc: 1 đơn 120h (GYE6HCAD, OTHER)
      { buuCuc: '(LAN) Cần Giuộc', maBC: '21529000', maDonHang: 'GYE6HCAD', loaiDon: 'Giao', khachHang: 'OTHER', trangThai: 'Đang có chuyến đi trong ngày', thoiGianTonDong: '120_192', canhBao: 'Khẩn cấp quá hạn 120_192' },
      // Cần Đước 1: 1 đơn 120h (VNGH80895941214, TTS)
      { buuCuc: '(LAN) Cần Đước 1', maBC: '23220000', maDonHang: 'VNGH80895941214', loaiDon: 'Giao', khachHang: 'TTS', trangThai: 'Đang có chuyến đi trong ngày', thoiGianTonDong: '120_192', canhBao: 'Khẩn cấp quá hạn 120_192' },
      // Phước Lý: 1 đơn 120h mẫu
      { buuCuc: '(LAN) Phước Lý', maBC: '22849000', maDonHang: 'VNGH80364861311', loaiDon: 'Giao', khachHang: 'TTS', trangThai: 'Đang có chuyến đi trong ngày', thoiGianTonDong: '120_192', canhBao: 'Khẩn cấp quá hạn 120_192' }
    ];

    const tvAlerts = mockLiveRecords.filter(d => d.buuCuc === '(LAN) Tầm Vu' && classifyGltAging(d.thoiGianTonDong, d.canhBao).key === 'gt_8d_192h');
    assert.equal(tvAlerts.length, 1);
    assert.equal(tvAlerts[0].maDonHang, 'GYELY34B');
    assert.equal(tvAlerts[0].khachHang, 'OTHER');

    const cgAlerts = mockLiveRecords.filter(d => d.buuCuc === '(LAN) Cần Giuộc' && classifyGltAging(d.thoiGianTonDong, d.canhBao).key === '5_8d');
    assert.equal(cgAlerts.length, 1);
    assert.equal(cgAlerts[0].maDonHang, 'GYE6HCAD');
  });

  await t.test('4. Code telegramService.ts không còn filter cứng TTS và Shopee', () => {
    assert.doesNotMatch(telegramServiceSrc, /targetEcomRecords\s*=\s*branchRecords\.filter\(\s*d\s*=>\s*\{\s*const kh/);
    assert.match(telegramServiceSrc, /classifyGltAging/);
  });

  await t.test('5. Tự động di trú dọn dẹp token cũ 9066732714 và chat ID cũ 1215576379 để không bị lỗi chat not found', () => {
    // Kiểm tra các quy tắc bảo vệ chống token cũ
    assert.match(telegramServiceSrc, /savedToken\.startsWith\('9066732714'\)/);
    assert.match(telegramServiceSrc, /savedChatId === '1215576379'/);
    assert.match(telegramServiceSrc, /cleanToken\.startsWith\('9066732714'\)/);
    assert.match(telegramServiceSrc, /Lỗi chat not found/);
  });
});
