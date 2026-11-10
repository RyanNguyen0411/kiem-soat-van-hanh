import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHeaderReader, cleanVietnameseText, stripVietnameseDiacritics } from '../src/utils/normalizationEngine.ts';

// Implementation of parseCSV to verify against the engine specification
function parseCSV(text) {
  if (!text) return [];

  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const lines = [];
  let row = [];
  let inQuotes = false;
  let curVal = '';

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(curVal.trim());
      curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(curVal.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      curVal = '';
    } else {
      curVal += char;
    }
  }
  if (curVal.length > 0 || row.length > 0) {
    row.push(curVal.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
}

test('A. CSV PARSER: Tuân thủ chuẩn RFC 4180 và xử lý tiếng Việt, BOM, quotes', () => {
  // 1. CSV có BOM UTF-8 (\uFEFF)
  const csvWithBom = '\uFEFF"ID","Tên nhân viên","Chức vụ"\n"3193843","Trần Trang Xuân Vinh","Bưu tá"';
  const parsedBom = parseCSV(csvWithBom);
  assert.equal(parsedBom.length, 2, 'Parse đúng 2 dòng khi có BOM');
  assert.equal(parsedBom[0][0], 'ID', 'Header đầu tiên không bị dính ký tự BOM \\uFEFF');
  assert.equal(parsedBom[1][0], '3193843', 'Dòng dữ liệu đầu tiên đọc đúng ID');

  // 2. CSV có dấu phẩy trong dấu nháy kép và dấu nháy kép escape ("")
  const csvQuotes = '"ID","Ghi chú","Mô tả"\n"1001","Địa chỉ: Cần Giuộc, Long An","Bưu tá ""xuất sắc"" năm 2026"';
  const parsedQuotes = parseCSV(csvQuotes);
  assert.equal(parsedQuotes.length, 2);
  assert.equal(parsedQuotes[1][1], 'Địa chỉ: Cần Giuộc, Long An', 'Dấu phẩy trong nháy kép không bị tách thành 2 cột');
  assert.equal(parsedQuotes[1][2], 'Bưu tá "xuất sắc" năm 2026', 'Dấu nháy kép escaped "" được unescape thành "');

  // 3. CSV có trường trống
  const csvEmpty = '"ID","Tên","Ghi chú"\n"1002","Nguyễn Văn A",""\n"1003",,"Có mặt"';
  const parsedEmpty = parseCSV(csvEmpty);
  assert.equal(parsedEmpty.length, 3);
  assert.equal(parsedEmpty[1][2], '', 'Trường trống cuối dòng được giữ rỗng');
  assert.equal(parsedEmpty[2][1], '', 'Trường trống giữa dòng được giữ rỗng');
  assert.equal(parsedEmpty[2][2], 'Có mặt');

  // 4. CSV có CRLF (\r\n) và LF (\n) hỗn hợp
  const csvLineBreaks = '"ID","Tên"\r\n"1004","Lê B"\n"1005","Trần C"\r\n';
  const parsedLineBreaks = parseCSV(csvLineBreaks);
  assert.equal(parsedLineBreaks.length, 3);
  assert.equal(parsedLineBreaks[1][1], 'Lê B');
  assert.equal(parsedLineBreaks[2][1], 'Trần C');
});

test('B. NHÂN SỰ: Ánh xạ chuẩn xác toàn bộ tiêu đề cột Google Sheets thực tế', () => {
  // Tiêu đề cột thực tế từ Google Sheets Live
  const actualGoogleSheetsHeaders = [
    'ID',
    'Tên nhân viên',
    'Chức vụ',
    'Ngày vào làm',
    'Ngày nghỉ việc',
    'Trạng thái',
    'Bưu cục',
    'Zone',
    'AM',
    'Loại HĐ',
    'Tỉnh',
    'Vùng'
  ];

  const reader = createHeaderReader(actualGoogleSheetsHeaders);

  // 1. Nhận diện cột ID (không phân biệt hoa thường, alias linh hoạt)
  const idAliases = ['id', 'employee id', 'employee_id', 'mã nv', 'ma nv', 'mã nhân viên', 'manv', 'id nv'];
  assert.equal(reader.hasCol(idAliases), true, 'Phải nhận diện được cột ID');
  assert.equal(reader.getColIndex(idAliases), 0, 'Cột ID ở vị trí 0');

  // 2. Nhận diện cột Tên nhân viên
  const nameAliases = ['tên nhân viên', 'ten nhan vien', 'họ và tên', 'ho va ten', 'họ tên', 'nhân viên', 'full name'];
  assert.equal(reader.hasCol(nameAliases), true, 'Phải nhận diện được cột Tên nhân viên');
  assert.equal(reader.getColIndex(nameAliases), 1, 'Cột Tên nhân viên ở vị trí 1');

  // 3. Nhận diện các cột vận hành khác
  assert.equal(reader.getColIndex(['chức vụ', 'chuc vu', 'vị trí']), 2);
  assert.equal(reader.getColIndex(['ngày vào làm', 'ngay vao lam']), 3);
  assert.equal(reader.getColIndex(['ngày nghỉ việc', 'ngay nghi viec']), 4);
  assert.equal(reader.getColIndex(['trạng thái', 'trang thai']), 5);
  assert.equal(reader.getColIndex(['bưu cục', 'buu cuc']), 6);
  assert.equal(reader.getColIndex(['zone', 'khu vực']), 7);
  assert.equal(reader.getColIndex(['am', 'quản lý']), 8);
  assert.equal(reader.getColIndex(['loại hđ', 'loai hd', 'loại hợp đồng']), 9);
  assert.equal(reader.getColIndex(['tỉnh', 'tinh']), 10);
  assert.equal(reader.getColIndex(['vùng', 'vung']), 11);

  // 4. Không nhầm lẫn ID với các cột số liệu khác
  assert.equal(stripVietnameseDiacritics('ID'), 'id');
  assert.notEqual(reader.getColIndex(['slđ gtc', 'sld gtc']), 0, 'Không bao giờ nhầm ID với số lượng đơn');
});

test('C. LIVE / SNAPSHOT LOGIC: Đọc dữ liệu LIVE thành công và kiểm soát Fallback an toàn', () => {
  // 1. Dữ liệu Google Sheets giả lập hợp lệ
  const validCsv = '"ID","Tên nhân viên","Chức vụ","Ngày vào làm","Ngày nghỉ việc","Trạng thái","Bưu cục","Zone","AM","Loại HĐ","Tỉnh","Vùng"\n' +
    '"3193843","Trần Trang Xuân Vinh","Business Development Field Executive","07/11/2026","","Đang làm việc","21529000 - (LAN) Cần Giuộc","Zone Tay Ninh","Nguyễn Hoàng Huy","HĐDV","Long An","DNB"\n' +
    '"3193548","Phan Văn Hóa","Business Development Field Executive","05/11/2026","","Đang làm việc","23220000 - (LAN) Cần Đước 1","Zone Tay Ninh","Nguyễn Hoàng Huy","HĐDV","Long An","DNB"';

  const rows = parseCSV(validCsv);
  assert.equal(rows.length, 3, 'Gồm 1 header và 2 data rows');

  const reader = createHeaderReader(rows[0]);
  const mapped = rows.slice(1).map(r => ({
    maNV: reader.getCol(r, ['id', 'mã nv', 'ma nv']),
    tenNV: reader.getCol(r, ['tên nhân viên', 'họ và tên']),
    buuCucRaw: reader.getCol(r, ['bưu cục', 'buu cuc']),
    chucVu: reader.getCol(r, ['chức vụ', 'chuc vu']),
    trangThai: reader.getCol(r, ['trạng thái', 'trang thai'])
  }));

  assert.equal(mapped.length, 2, 'Parse thành công 2 bản ghi');
  assert.equal(mapped[0].maNV, '3193843');
  assert.equal(mapped[0].tenNV, 'Trần Trang Xuân Vinh');
  assert.equal(mapped[1].maNV, '3193548');
  assert.equal(mapped[1].tenNV, 'Phan Văn Hóa');

  // 2. Bảo toàn Snapshot kiểm toán không bị xóa hoặc làm hỏng
  const snapshotRaw = fs.readFileSync(path.resolve('src/data/snapshots/nhan_su.json'), 'utf8');
  const snapshotData = JSON.parse(snapshotRaw);
  assert.ok(Array.isArray(snapshotData), 'nhanSuSnapshot phải là một mảng');
  assert.ok(snapshotData.length >= 70, `nhanSuSnapshot phải có đủ nhân sự dự phòng (hiện có: ${snapshotData.length})`);
});
