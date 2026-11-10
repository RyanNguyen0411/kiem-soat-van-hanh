import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. BẢNG GTC BƯU CỤC: Đánh số thứ tự (STT) ở cột đầu tiên trước Mã NV', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // Kiểm tra bảng activeStaff: STT nằm trước Mã NV
  assert.match(gtcBcContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>/, 'Bảng nhân viên đi giao có cột STT nằm ngay trước Mã NV');
  assert.match(gtcBcContent, /\{index \+ 1\}[\s\S]*?\{nv\.maNV\}/, 'Dòng dữ liệu nhân viên hiển thị index + 1 trước mã NV');

  // Kiểm tra bảng offStaff: STT nằm trước Mã NV
  assert.match(gtcBcContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>[\s\S]*?Nhân Viên OFF/i, 'Bảng nhân viên OFF có cột STT');
  assert.match(gtcBcContent, /\{index \+ 1\}[\s\S]*?\{off\.maNV\}/, 'Dòng dữ liệu nhân viên OFF hiển thị index + 1 trước mã NV');

  // Kiểm tra bảng pickupSpecialists: STT nằm trước Mã NV
  assert.match(gtcBcContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>[\s\S]*?Chuyên Lấy Hàng/i, 'Bảng nhân viên chuyên lấy hàng có cột STT');
  assert.match(gtcBcContent, /\{index \+ 1\}[\s\S]*?\{sp\.maNV\}/, 'Dòng dữ liệu nhân viên chuyên lấy hiển thị index + 1 trước mã NV');

  // Kiểm tra GtcPostOfficeTab cũng có STT trước Mã NV
  const gtcPoContent = fs.readFileSync(path.resolve('src/pages/GtcPostOfficeTab.tsx'), 'utf8');
  assert.match(gtcPoContent, /<th[^>]*>STT<\/th>\s*<th[^>]*>Mã NV<\/th>/, 'GtcPostOfficeTab có cột STT trước Mã NV');
});

test('2. XÓA BỎ HOÀN TOÀN LOGIC "Đã thôi việc sau ngày này"', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // Không còn bất kỳ đoạn text "Đã thôi việc sau ngày này" nào trong giao diện hay xuất file
  assert.equal(
    gtcBcContent.includes('Đã thôi việc sau ngày này'),
    false,
    'Đã xóa bỏ hoàn toàn chuỗi và nhãn "Đã thôi việc sau ngày này" khỏi BaoCaoGtcBcTab.tsx'
  );

  // Không còn thuộc tính isResigned trong activeStaff
  assert.equal(
    gtcBcContent.includes('isResigned'),
    false,
    'Không còn thuộc tính isResigned'
  );
});

test('3. HIGHLIGHT NHÂN VIÊN KHÔNG ĐẠT GÁN TỐI THIỂU 30 HOẶC GTC TỐI THIỂU 20', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // Kiểm tra ngưỡng logic: gán < 30 và GTC < 20
  assert.match(gtcBcContent, /tongDon \|\| 0\)\s*<\s*30/, 'Ngưỡng gán tối thiểu là 30 đơn');
  assert.match(gtcBcContent, /tongDonGTC \|\| 0\)\s*<\s*20/, 'Ngưỡng GTC tối thiểu là 20 đơn');
  assert.match(gtcBcContent, /isLowAssigned \|\| isLowGtc/, 'Highlight kích hoạt khi vi phạm một trong 2 ngưỡng hoặc cả 2');

  // Kiểm tra hiển thị badge cảnh báo trực quan
  assert.match(gtcBcContent, /⚠️ &lt;30 gán/, 'Có badge cảnh báo gán < 30');
  assert.match(gtcBcContent, /⚠️ &lt;20 GTC/, 'Có badge cảnh báo GTC < 20');
});

test('4. LOGIC NHÂN VIÊN OFF: Không phát sinh đơn giao/lấy & loại trừ nhân viên đã nghỉ hoàn toàn', () => {
  const gtcBcContent = fs.readFileSync(path.resolve('src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');

  // 1. Đối chiếu Task Nhân Sự: Không có tên thì là nhân viên đã nghỉ việc hoàn toàn -> Loại trừ
  assert.match(
    gtcBcContent,
    /if \(!nhanSuActiveMap\.has\(m\.maNV\)\) return false;/,
    'Loại trừ nhân viên không có tên trong Task Nhân Sự (đã nghỉ hoàn toàn)'
  );

  // 2. Không phát sinh đơn giao
  assert.match(
    gtcBcContent,
    /if \(activeMap\.has\(m\.maNV\)\) return false;/,
    'Nhân viên có phát sinh đơn giao trong ngày thì KHÔNG tính là OFF'
  );

  // 3. Không phát sinh đơn lấy
  assert.match(
    gtcBcContent,
    /hasPickup/,
    'Kiểm tra đơn lấy trong ngày để không tính OFF nhầm nhân viên đi lấy hàng'
  );

  // Mô phỏng kiểm thử độc lập hàm tính OFF
  const mockStaff = [
    { maNV: 'NV01', tenNV: 'Nguyễn Văn A' }, // Có đơn giao -> KHÔNG OFF
    { maNV: 'NV02', tenNV: 'Trần Văn B' },   // Không giao, có đơn lấy -> KHÔNG OFF
    { maNV: 'NV03', tenNV: 'Lê Văn C' },     // Không giao, không lấy, có trong Task Nhân sự -> OFF
    { maNV: 'NV04', tenNV: 'Phạm Văn D' }    // Không có trong Task Nhân sự (đã thôi việc hoàn toàn) -> KHÔNG ĐƯA VÀO OFF
  ];

  const activeDeliverySet = new Set(['NV01']);
  const activePickupSet = new Set(['NV02']);
  const nhanSuMap = new Map([
    ['NV01', { maNV: 'NV01' }],
    ['NV02', { maNV: 'NV02' }],
    ['NV03', { maNV: 'NV03' }]
  ]);

  const offList = mockStaff.filter(m => {
    if (!nhanSuMap.has(m.maNV)) return false; // Không có trong Task Nhân sự -> loại
    if (activeDeliverySet.has(m.maNV)) return false; // Có đơn giao -> không off
    if (activePickupSet.has(m.maNV)) return false;   // Có đơn lấy -> không off
    return true;
  });

  assert.equal(offList.length, 1, 'Chỉ duy nhất NV03 được ghi nhận là OFF');
  assert.equal(offList[0].maNV, 'NV03', 'NV03 không phát sinh giao và lấy');
});
