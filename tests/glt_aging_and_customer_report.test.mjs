import assert from 'node:assert/strict';
import test from 'node:test';

// Test implementation of aging engine logic directly in ESM
import {
  classifyGltAging,
  computePostOfficeAgingMatrix,
  computeCustomerAgingMatrix,
  GLT_DAY_GROUPS
} from '../src/utils/gltAgingEngine.ts';

test('1. classifyGltAging: Quy đổi chính xác các mốc giờ thành 5 cấp độ ngày', () => {
  // < 1 ngày (<24h)
  assert.equal(classifyGltAging('0_6').key, 'lt_1d');
  assert.equal(classifyGltAging('6_12').key, 'lt_1d');
  assert.equal(classifyGltAging('12_24').key, 'lt_1d');
  assert.equal(classifyGltAging('12_24').isUrgent192h, false);

  // 1 - 3 ngày (24-72h)
  assert.equal(classifyGltAging('24_36').key, '1_3d');
  assert.equal(classifyGltAging('36_48').key, '1_3d');
  assert.equal(classifyGltAging('48_72').key, '1_3d');
  assert.equal(classifyGltAging('48_72').isUrgent192h, false);

  // 3 - 5 ngày (72-120h)
  assert.equal(classifyGltAging('72_96').key, '3_5d');
  assert.equal(classifyGltAging('96_120').key, '3_5d');
  assert.equal(classifyGltAging('96_120').isUrgent192h, false);

  // 5 - 8 ngày (120-192h)
  assert.equal(classifyGltAging('120_192').key, '5_8d');
  assert.equal(classifyGltAging('120_192').isUrgent192h, false);

  // > 8 ngày (192h) - MỨC ĐỘ KHẨN CẤP NHẤT, XỬ LÝ TRIỆT ĐỂ
  const urgent192 = classifyGltAging('192');
  assert.equal(urgent192.key, 'gt_8d_192h');
  assert.equal(urgent192.isUrgent192h, true);
  assert.match(urgent192.label, /> 8 ngày/);
  assert.match(urgent192.label, /192h/);

  // Fallback qua cột cảnh báo
  const urgentByWarning = classifyGltAging('', 'đơn đã quá hạn 192h');
  assert.equal(urgentByWarning.key, 'gt_8d_192h');
  assert.equal(urgentByWarning.isUrgent192h, true);
});

test('2. computePostOfficeAgingMatrix: Tách riêng 1 cột cho nhóm 192h (>8 ngày) và đủ 5 cấp độ ngày', () => {
  const mockRecords = [
    { maDonHang: 'DH1', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '0_6', canhBao: '', khachHang: 'TTS', loaiDon: 'Giao', phuongXa: 'Xã A', trangThai: 'Chưa có chuyến' },
    { maDonHang: 'DH2', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '24_36', canhBao: '', khachHang: 'TTS', loaiDon: 'Giao', phuongXa: 'Xã A', trangThai: 'Chưa có chuyến' },
    { maDonHang: 'DH3', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '72_96', canhBao: '', khachHang: 'SHOPEE', loaiDon: 'Giao', phuongXa: 'Xã A', trangThai: 'Chưa có chuyến' },
    { maDonHang: 'DH4', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '120_192', canhBao: '', khachHang: 'OTHER', loaiDon: 'Giao', phuongXa: 'Xã A', trangThai: 'Chưa có chuyến' },
    { maDonHang: 'DH5', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '192', canhBao: 'Khẩn cấp', khachHang: 'TTS', loaiDon: 'Giao', phuongXa: 'Xã A', trangThai: 'Chưa có chuyến' },
    { maDonHang: 'DH6', buuCuc: '(LAN) Rạch Kiến', thoiGianTonDong: '192', canhBao: 'Khẩn cấp', khachHang: 'SHOPEE', loaiDon: 'Giao', phuongXa: 'Xã B', trangThai: 'Chưa có chuyến' }
  ];

  const matrix = computePostOfficeAgingMatrix(mockRecords, ['(LAN) Tầm Vu', '(LAN) Rạch Kiến']);
  
  assert.equal(matrix.rows.length, 2);
  const tamVu = matrix.rows.find(r => r.buuCuc === '(LAN) Tầm Vu');
  assert.ok(tamVu, 'Phải có bưu cục Tầm Vu');
  assert.equal(tamVu.total, 5);
  assert.equal(tamVu.lt_1d, 1);
  assert.equal(tamVu.p_1_3d, 1);
  assert.equal(tamVu.p_3_5d, 1);
  assert.equal(tamVu.p_5_8d, 1);
  assert.equal(tamVu.p_gt_8d_192h, 1, 'Cột 192h phải tách riêng và bằng 1');

  const rachKien = matrix.rows.find(r => r.buuCuc === '(LAN) Rạch Kiến');
  assert.ok(rachKien, 'Phải có bưu cục Rạch Kiến');
  assert.equal(rachKien.total, 1);
  assert.equal(rachKien.p_gt_8d_192h, 1, 'Rạch Kiến có 1 đơn 192h');

  // Totals
  assert.equal(matrix.totals.total, 6);
  assert.equal(matrix.totals.p_gt_8d_192h, 2, 'Tổng đơn 192h toàn khu vực phải bằng 2');
  assert.equal(matrix.totals.riskLevel, 'danger', 'Có đơn 192h thì mức rủi ro phải là danger');
});

test('3. computeCustomerAgingMatrix: Bảng kê chi tiết nhóm Khách Hàng và chuẩn bị dữ liệu ComposedChart', () => {
  const mockRecords = [
    { maDonHang: 'DH1', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '0_6', canhBao: '', khachHang: 'TTS', loaiDon: 'Giao', phuongXa: '', trangThai: '' },
    { maDonHang: 'DH2', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '120_192', canhBao: '', khachHang: 'TTS', loaiDon: 'Giao', phuongXa: '', trangThai: '' },
    { maDonHang: 'DH3', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '192', canhBao: '', khachHang: 'TTS', loaiDon: 'Giao', phuongXa: '', trangThai: '' },
    { maDonHang: 'DH4', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '36_48', canhBao: '', khachHang: 'SHOPEE', loaiDon: 'Giao', phuongXa: '', trangThai: '' },
    { maDonHang: 'DH5', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '192', canhBao: '', khachHang: 'SHOPEE', loaiDon: 'Giao', phuongXa: '', trangThai: '' },
    { maDonHang: 'DH6', buuCuc: '(LAN) Tầm Vu', thoiGianTonDong: '0_6', canhBao: '', khachHang: 'OTHER', loaiDon: 'Giao', phuongXa: '', trangThai: '' }
  ];

  const result = computeCustomerAgingMatrix(mockRecords, 6);

  // Rows check
  assert.ok(result.rows.length >= 3, 'Phải có tối thiểu 3 nhóm khách hàng (TTS, SHOPEE, OTHER)');
  
  const tts = result.rows.find(r => r.khachHang === 'TTS');
  assert.ok(tts);
  assert.equal(tts.total, 3);
  assert.equal(tts.lt_1d, 1);
  assert.equal(tts.p_5_8d, 1);
  assert.equal(tts.p_gt_8d_192h, 1, 'TTS phải có 1 đơn 192h');
  assert.equal(tts.overdueCount, 2); // 5_8d + 192h
  assert.equal(tts.slaPressure, 'Rất Cao (Khẩn)');

  const shopee = result.rows.find(r => r.khachHang === 'SHOPEE');
  assert.ok(shopee);
  assert.equal(shopee.total, 2);
  assert.equal(shopee.p_gt_8d_192h, 1, 'Shopee phải có 1 đơn 192h');

  // Totals check
  assert.equal(result.totals.total, 6);
  assert.equal(result.totals.p_gt_8d_192h, 2, 'Tổng đơn 192h toàn mạng phải là 2');

  // Chart data for ComposedChart check
  assert.equal(result.chartData.length, result.rows.length);
  const chartTts = result.chartData.find(c => c.khachHang === 'TTS');
  assert.ok(chartTts);
  assert.equal(chartTts.total, 3);
  assert.equal(chartTts.urgent192h, 1);
  assert.equal(typeof chartTts.overdueRate, 'number');
});
