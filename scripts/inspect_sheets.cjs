const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY';

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let curVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
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

const files = [
  'sheet_GTC_Bưu_cục.csv',
  'sheet_GTC_Nhân_viên.csv',
  'sheet_Hoa_hồng_ngày.csv',
  'sheet_Tồn_đọng_GLT.csv',
  'sheet_Tồn_đọng_LC.csv',
  'sheet_Tỷ_lệ_trả_hàng.csv'
];

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, 'utf8');
  const rows = parseCSV(content);
  console.log('==============================');
  console.log(f + ': totalRows = ' + rows.length);
  if (rows.length > 0) {
    console.log('Non-empty Headers:');
    rows[0].forEach((h, i) => {
      if (h.length > 0) {
        console.log(`  col [${i}]: "${h}"`);
      }
    });
  }
}
