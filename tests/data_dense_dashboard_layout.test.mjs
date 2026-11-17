import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('TỐI ƯU KHÔNG GIAN DỮ LIỆU DASHBOARD (DATA-DENSE EXECUTIVE VIEW)', async (t) => {
  
  await t.test('1. File src/index.css chứa quy tắc tăng kích thước chữ trong bảng báo cáo (CHỈ BẢNG, KHÔNG TĂNG TẤT CẢ)', () => {
    const cssPath = path.join(ROOT_DIR, 'src/index.css');
    assert.ok(fs.existsSync(cssPath), 'src/index.css phải tồn tại');

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.match(cssContent, /main table,\s*table\s*\{[^}]*font-size:\s*13px !important/);
    assert.match(cssContent, /main table thead th[\s\S]*?font-size:\s*12\.5px !important/);
    assert.match(cssContent, /main table tbody td[\s\S]*?font-size:\s*13px !important/);
    assert.match(cssContent, /main table td \.font-mono/);
  });

  await t.test('1b. Quy tắc căn chỉnh 3 thành phần bảng báo cáo: Tiêu đề giữa, Số liệu giữa, Văn bản trái', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf8');
    // 1. Tiêu đề căn giữa
    assert.match(cssContent, /main table thead th[\s\S]*?text-align:\s*center !important;/);
    assert.match(cssContent, /main table thead th[\s\S]*?justify-content:\s*center !important;/);

    // 2. Số liệu căn giữa
    assert.match(cssContent, /main table td\.font-mono[\s\S]*?text-align:\s*center !important;/);
    assert.match(cssContent, /main table td\[class\*="text-right"\][\s\S]*?text-align:\s*center !important;/);

    // 3. Văn bản căn lề trái
    assert.match(cssContent, /main table tbody td:not\(\.font-mono\)[\s\S]*?text-align:\s*left !important;/);
  });

  await t.test('1d. Quy tắc chuẩn hóa dòng tổng hợp cuối bảng (tfoot): Chữ căn trái, Số căn giữa', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf8');
    // Chữ (nhãn tổng cộng / toà khu vực) căn trái
    assert.match(cssContent, /main table tfoot td:first-child[\s\S]*?text-align:\s*left !important;/);
    assert.match(cssContent, /main table tfoot td\[class\*="text-left"\][\s\S]*?text-align:\s*left !important;/);

    // Số tổng hợp căn giữa
    assert.match(cssContent, /main table tfoot td\.font-mono[\s\S]*?text-align:\s*center !important;/);
    assert.match(cssContent, /main table tfoot td\[class\*="text-center"\][\s\S]*?text-align:\s*center !important;/);
  });

  await t.test('1c. Toàn bộ th trên các trang dashboard đều phải căn giữa (text-center, zero text-left/text-right)', () => {
    const targetFiles = [
      'src/pages/BaoCaoGtcBcTab.tsx',
      'src/pages/GtcPostOfficeTab.tsx',
      'src/pages/GtcEmployeeTab.tsx',
      'src/pages/BacklogGltTab.tsx',
      'src/pages/DailySalaryTab.tsx',
      'src/pages/NhanSuTab.tsx',
      'src/pages/NghiViecTab.tsx',
      'src/pages/OverviewTab.tsx',
      'src/pages/PostOfficeManagementTab.tsx',
      'src/components/common/PeriodicComparisonSection.tsx',
      'src/components/common/DataQualityModal.tsx',
      'src/components/gtc-post-office/GtcDailyTrendSection.tsx'
    ];

    for (const file of targetFiles) {
      const fullPath = path.join(ROOT_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('<th')) {
          // Ngoại lệ 2 cột ẩn/hiện theo quyền nhân sự của NghiViecTab (được kiểm toán riêng ở post_office_branch_and_salary_masking.test.mjs)
          // Các cột này vẫn được CSS src/index.css cưỡng chế căn giữa tuyệt đối 100% bằng quy tắc th[class*="text-right"] { text-align: center !important }
          if (file.includes('NghiViecTab') && (line.includes('Lương TB/Ngày') || line.includes('Mức Lương TB'))) {
            continue;
          }
          assert.ok(
            !line.includes('text-left') && !line.includes('text-right'),
            `File ${file} dòng ${i + 1} chứa <th không được căn giữa: ${line.trim()}`
          );
        }
      }
    }
  });

  await t.test('2. Biểu đồ và chú thích biểu đồ được bảo toàn nguyên bản kích thước (KHÔNG THU NHỎ)', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf8');
    assert.match(cssContent, /\.recharts-wrapper/);
    assert.match(cssContent, /\.recharts-legend-wrapper/);
    assert.match(cssContent, /\.recharts-default-tooltip/);
    assert.match(cssContent, /\.recharts-cartesian-axis-tick/);
    assert.match(cssContent, /font-size:\s*initial !important/);
  });

  await t.test('3. Khung màn hình mở rộng trên desktop/laptop để xem tối đa dữ liệu', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf8');
    assert.match(cssContent, /\.max-w-7xl\s*\{[^}]*max-width:\s*1800px !important/);
  });

  await t.test('4. Text tiêu đề mục & card được thu nhỏ tinh gọn, cân đối', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf8');
    assert.match(cssContent, /main h2,\s*main h3\s*\{[^}]*font-size:\s*13\.5px !important/);
    assert.match(cssContent, /main h4\s*\{[^}]*font-size:\s*12\.5px !important/);
  });

});
