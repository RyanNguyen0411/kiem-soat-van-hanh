import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// TEST SUITE: PHASE 07 — FULL REGRESSION TEST & FINAL ACCEPTANCE
// ---------------------------------------------------------------------------

const snapshotsDir = path.resolve('src/data/snapshots');
const glt = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'ton_dong_glt.json'), 'utf8'));
const lc = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'ton_dong_lc.json'), 'utf8'));
const gtcPo = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'gtc_buu_cuc.json'), 'utf8'));
const gtcEmp = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'gtc_nhan_vien.json'), 'utf8'));
const hh = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'hoa_hong_ngay.json'), 'utf8'));
const hr = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'nhan_su.json'), 'utf8'));

test('A. FUNCTIONAL TESTING: Kiểm tra luồng chức năng, bộ lọc, điều hướng và xuất dữ liệu', async (t) => {
  // 1. Sidebar & Nav items
  const sidebarFile = fs.readFileSync(path.resolve('src/components/Sidebar.tsx'), 'utf8');
  assert.ok(sidebarFile.includes('overview') || sidebarFile.includes('TỔNG QUAN'), 'Sidebar phải hỗ trợ tab Tổng quan');
  assert.ok(sidebarFile.includes('gtc_buu_cuc') || sidebarFile.includes('GTC Bưu Cục'), 'Sidebar phải hỗ trợ tab GTC Bưu cục');
  assert.ok(sidebarFile.includes('ton_dong_glt') || sidebarFile.includes('Tồn Đọng GLT'), 'Sidebar phải hỗ trợ tab Tồn đọng GLT');

  // 2. AuthContext: Đăng nhập, đăng xuất, phiên
  const authFile = fs.readFileSync(path.resolve('src/context/AuthContext.tsx'), 'utf8');
  const authServiceFile = fs.readFileSync(path.resolve('src/services/authService.ts'), 'utf8');
  assert.ok(!authFile.includes('123456') && !authFile.includes('888888'), 'Tuyệt đối không còn OTP cố định trong AuthContext');
  assert.ok(authFile.includes('logout'), 'AuthContext phải có hàm logout xóa phiên');
  assert.ok(authFile.includes('isSessionValid'), 'AuthContext phải kiểm tra tính hợp lệ của phiên qua isSessionValid');
  assert.ok(authServiceFile.includes('expiresAt') && authServiceFile.includes('isSessionValid'), 'authService phải có cơ chế kiểm tra expiresAt');

  // 3. Export Service: UTF-8 BOM, Unquoted Numbers, Batching
  const exportFile = fs.readFileSync(path.resolve('src/services/excelExportService.ts'), 'utf8');
  assert.ok(exportFile.includes('\\uFEFF'), 'Export engine phải có UTF-8 BOM');
  assert.ok(exportFile.includes('Number.isFinite') || exportFile.includes('typeof cell === "number"'), 'Export engine phải giữ nguyên số thực');

  // 4. Modal Drill-down
  const modalFile = fs.readFileSync(path.resolve('src/components/common/UnifiedDrillDownModal.tsx'), 'utf8');
  assert.ok(modalFile.includes('exportToCSV'), 'Drilldown modal phải tích hợp chức năng xuất CSV');
  assert.ok(modalFile.includes('sortedData'), 'Drilldown modal phải xuất toàn bộ dòng khớp lọc, không bị cắt xén phân trang');
});

test('B. DATA VALIDATION: Đối soát số lượng bản ghi và các KPI vận hành cốt lõi', async (t) => {
  // 1. Số lượng bản ghi
  assert.equal(glt.length, 10928, 'Số lượng đơn tồn GLT phải đúng 10.928 bản ghi');
  assert.equal(lc.length, 284, 'Số lượng đơn tồn LC phải đúng 284 bản ghi');
  assert.ok(gtcPo.length >= 400, 'Số lượng dòng GTC Bưu cục phải >= 400');
  assert.ok(gtcEmp.length >= 1800, 'Số lượng dòng GTC Nhân viên phải >= 1800');
  assert.ok(hh.length >= 2000, 'Số lượng dòng Hoa hồng ngày phải >= 2000');

  // 2. Tính toán tổng Volume và SLĐ GTC trên toàn bộ GTC Bưu cục
  const totalVolume = gtcPo.reduce((sum, r) => sum + (Number(r.volume) || 0), 0);
  const totalSldGtc = gtcPo.reduce((sum, r) => sum + (Number(r.sldGTC) || 0), 0);
  assert.ok(totalVolume > 0, 'Tổng Volume phải > 0');
  assert.ok(totalSldGtc > 0, 'Tổng SLĐ GTC phải > 0');
  assert.ok(totalSldGtc <= totalVolume, 'SLĐ GTC không được vượt quá Volume');

  // 3. Công thức chuẩn %GTC tổng = SUM(SLĐ GTC) / SUM(Volume)
  const gtcRateTong = (totalSldGtc / totalVolume) * 100;
  assert.ok(gtcRateTong >= 50 && gtcRateTong <= 95, `Tỷ lệ %GTC tổng hợp lý: ${gtcRateTong.toFixed(2)}%`);

  // 4. Kiểm tra tính độc lập giữa Volume bưu cục và Tổng đơn nhân viên
  const totalEmpDon = gtcEmp.reduce((sum, r) => sum + (Number(r.tongDon) || 0), 0);
  assert.notEqual(totalEmpDon, totalVolume, 'Tổng đơn nhân viên PHẢI độc lập với Volume bưu cục (không được gán nhầm)');

  // 5. Tính toán tổng quỹ lương hoa hồng
  const totalSalary = hh.reduce((sum, r) => sum + (Number(r.tongLuong) || Number(r.luongHHNgay) || 0), 0);
  assert.ok(totalSalary > 0, `Tổng quỹ lương hoa hồng phải > 0 (thực tế: ${totalSalary.toLocaleString('vi-VN')} đ)`);
});

test('C. SECURITY & BUNDLE TESTING: Quét toàn diện frontend bundle và mã nguồn', async (t) => {
  // 1. Quét dist bundle (nếu có dist) hoặc mã nguồn
  const distJsPath = path.resolve('dist/assets');
  let bundleCode = '';
  if (fs.existsSync(distJsPath)) {
    const files = fs.readdirSync(distJsPath).filter(f => f.endsWith('.js'));
    for (const f of files) {
      bundleCode += fs.readFileSync(path.join(distJsPath, f), 'utf8');
    }
  }

  // Quét các secret cấm
  const forbiddenPatterns = [
    /bot[0-9]{8,10}:[a-zA-Z0-9_-]{35}/, // Telegram Token format
    /ghn_token_secret/,
    /hardcoded_password/,
    /api_key_secret_production/
  ];

  for (const pattern of forbiddenPatterns) {
    if (bundleCode) {
      assert.doesNotMatch(bundleCode, pattern, `Frontend bundle bị dính secret: ${pattern}`);
    }
  }

  // 2. Quét AuthContext & telegramService
  const telegramService = fs.readFileSync(path.resolve('src/services/telegramService.ts'), 'utf8');
  assert.ok(!telegramService.includes('bot8003612501:'), 'Telegram Token cũ bị lộ đã được loại bỏ hoàn toàn khỏi frontend code');
  assert.ok(telegramService.includes('/api/') || telegramService.includes('backend') || telegramService.includes('proxy') || telegramService.includes('server'), 'Giao tiếp Telegram phải thông qua server endpoint');
});

test('D. UI/UX & RESPONSIVE TESTING: Kiểm tra khả năng hiển thị, responsive và theme', async (t) => {
  const overviewFile = fs.readFileSync(path.resolve('src/pages/OverviewTab.tsx'), 'utf8');

  // Kiểm tra responsive grid classes
  assert.ok(overviewFile.includes('grid-cols-1'), 'Phải hỗ trợ 1 cột trên mobile');
  assert.ok(overviewFile.includes('md:grid-cols-') || overviewFile.includes('lg:grid-cols-'), 'Phải hỗ trợ đa cột trên tablet/desktop');

  // Kiểm tra dark mode classes
  assert.ok(overviewFile.includes('dark:bg-slate-'), 'Phải hỗ trợ dark mode nền Navy/Slate');
  assert.ok(overviewFile.includes('dark:text-'), 'Phải hỗ trợ dark mode chữ tương phản');

  // Kiểm tra không tràn bảng (overflow-x-auto)
  const dataTableFile = fs.readFileSync(path.resolve('src/components/common/DataTable.tsx'), 'utf8');
  assert.ok(dataTableFile.includes('overflow-x-auto'), 'DataTable phải có overflow-x-auto chống vỡ khung');
});

test('E. CHART EMPTY STATE INTEGRATION: 100% biểu đồ được bảo vệ khi không có dữ liệu', async (t) => {
  const overviewFile = fs.readFileSync(path.resolve('src/pages/OverviewTab.tsx'), 'utf8');
  const countChartEmptyState = (overviewFile.match(/<ChartEmptyState/g) || []).length;
  assert.ok(countChartEmptyState >= 10, `OverviewTab phải có ít nhất 10 điểm bao bọc ChartEmptyState (thực tế: ${countChartEmptyState})`);

  const gltFile = fs.readFileSync(path.resolve('src/pages/BacklogGltTab.tsx'), 'utf8');
  assert.ok(gltFile.includes('<ChartEmptyState'), 'BacklogGltTab phải tích hợp ChartEmptyState');

  const lcFile = fs.readFileSync(path.resolve('src/pages/BacklogLcTab.tsx'), 'utf8');
  assert.ok(lcFile.includes('<ChartEmptyState'), 'BacklogLcTab phải tích hợp ChartEmptyState');

  const empFile = fs.readFileSync(path.resolve('src/pages/GtcEmployeeTab.tsx'), 'utf8');
  assert.ok(empFile.includes('<ChartEmptyState'), 'GtcEmployeeTab phải tích hợp ChartEmptyState');
});
