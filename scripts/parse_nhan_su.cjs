const fs = require('fs');
const csv = fs.readFileSync('./kiem-soat-van-hanh/src/data/snapshots/nhan_su_raw.csv', 'utf8');

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let curVal = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { curVal += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      row.push(curVal.trim()); curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(curVal.trim());
      if (row.some(c => c.length > 0)) lines.push(row);
      row = []; curVal = '';
    } else {
      curVal += char;
    }
  }
  if (curVal.length > 0 || row.length > 0) {
    row.push(curVal.trim());
    if (row.some(c => c.length > 0)) lines.push(row);
  }
  return lines;
}

const parsed = parseCSV(csv);
console.log('Total rows:', parsed.length);
console.log('Headers:', parsed[0]);

const dataRows = parsed.slice(1).filter(r => r[0] && r[0].trim() !== '');
console.log('Valid data rows:', dataRows.length);

const chucVuList = [...new Set(dataRows.map(r => r[2]))];
console.log('\nDistinct Chức vụ:', chucVuList);

const buuCucList = [...new Set(dataRows.map(r => r[6]))];
console.log('\nDistinct Bưu cục:', buuCucList);

const loaiHdList = [...new Set(dataRows.map(r => r[9]))];
console.log('\nDistinct Loại HĐ:', loaiHdList);

const thamNienList = [...new Set(dataRows.map(r => r[12]))];
console.log('\nDistinct Thâm niên:', thamNienList);

const trangThaiList = [...new Set(dataRows.map(r => r[5]))];
console.log('\nDistinct Trạng thái:', trangThaiList);

const has3175777 = dataRows.some(r => r[0] === '3175777' || r[1].includes('Trần Trọng Phú'));
console.log('\nHas 3175777?', has3175777);

// Convert to json snapshot (including 3175777 as NVXL at Tam Vu)
const jsonList = dataRows
  .map(r => {
    const rawBc = r[6] || '';
    const bcClean = rawBc.includes(' - ') ? rawBc.split(' - ')[1].trim() : rawBc.trim();
    return {
      maNV: r[0]?.trim() || '',
      tenNV: r[1]?.trim() || '',
      chucVu: r[2]?.trim() || '',
      ngayVaoLamText: r[3]?.trim() || '',
      ngayNghiViecText: r[4]?.trim() || '',
      trangThai: r[5]?.trim() || 'Đang làm việc',
      buuCucRaw: rawBc,
      buuCuc: bcClean,
      zone: r[7]?.trim() || '',
      am: r[8]?.trim() || '',
      loaiHD: r[9]?.trim() || '',
      tinh: r[10]?.trim() || '',
      vung: r[11]?.trim() || '',
      nhomThamNien: r[12]?.trim() || '',
      ngayVaoLam: r[13]?.trim() || '' // dd/mm/yyyy
    };
  });

fs.writeFileSync('./kiem-soat-van-hanh/src/data/snapshots/nhan_su.json', JSON.stringify(jsonList, null, 2), 'utf8');
console.log('Successfully generated nhan_su.json with', jsonList.length, 'records.');
