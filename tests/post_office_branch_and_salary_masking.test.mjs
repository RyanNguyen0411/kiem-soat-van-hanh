import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('PHÂN HỆ BƯU CỤC & BẢO MẬT ẨN THU NHẬP BƯU TÁ - AUDIT SUITE', async (t) => {
  
  await t.test('1. DEFAULT_STAFF_ALLOWED_TABS phải chứa nhan_su và ns_nghi_viec', () => {
    const authServiceFile = fs.readFileSync(path.join(ROOT_DIR, 'src/services/postOfficeAuthService.ts'), 'utf8');
    assert.match(authServiceFile, /'bao_cao_gtc_bc'/);
    assert.match(authServiceFile, /'gtc_buu_cuc'/);
    assert.match(authServiceFile, /'gtc_nhan_vien'/);
    assert.match(authServiceFile, /'ton_dong_glt'/);
    assert.match(authServiceFile, /'ton_dong_lc'/);
    assert.match(authServiceFile, /'nhan_su'/);
    assert.match(authServiceFile, /'ns_nghi_viec'/);
    
    // Kiểm tra nhãn 'Báo Cáo Ngày' trong ALL_ASSIGNABLE_TABS
    assert.match(authServiceFile, /id: 'bao_cao_gtc_bc',\s*label: 'Báo Cáo Ngày'/);
  });

  await t.test('2. Sidebar & Header & Breadcrumb đã cập nhật nhãn Báo Cáo Ngày', () => {
    const sidebarFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/Sidebar.tsx'), 'utf8');
    assert.match(sidebarFile, /label: 'Báo Cáo Ngày'/);

    const breadcrumbFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/common/ExecutiveBreadcrumbBar.tsx'), 'utf8');
    assert.match(breadcrumbFile, /label: 'Báo Cáo Ngày'/);
    assert.match(breadcrumbFile, /title: 'BÁO CÁO NGÀY'/);

    const baoCaoBcFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/BaoCaoGtcBcTab.tsx'), 'utf8');
    assert.match(baoCaoBcFile, /BÁO CÁO NGÀY/);
  });

  await t.test('3. GtcEmployeeTab ẩn hoàn toàn Thu Nhập Tạm Tính đối với tài khoản nhân viên', () => {
    const employeeTabFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/GtcEmployeeTab.tsx'), 'utf8');
    assert.match(employeeTabFile, /!isStaff && \(/);
    assert.match(employeeTabFile, /Thu Nhập Tạm Tính/);
    assert.match(employeeTabFile, /\$\{isStaff \? 'md:grid-cols-2' : 'md:grid-cols-3'\}/);
  });

  await t.test('4. NhanSuTab & NhanSuOperationalAlertsCard ẩn thông tin bưu cục khác và ẩn Lương/Đơn giá khi isStaff', () => {
    const nhanSuTabFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/NhanSuTab.tsx'), 'utf8');
    assert.match(nhanSuTabFile, /isStaff = currentUser\?\.role === 'post_office_staff'/);
    assert.match(nhanSuTabFile, /isStaff && assignedPo/);

    const alertsCardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');
    assert.match(alertsCardFile, /!isStaff && \(\s*<>\s*<th className="[^"]*">Lương TB\/Ngày<\/th>/);
    assert.match(alertsCardFile, /!isStaff && \(\s*<>\s*<th className="[^"]*">Lương TB\/Ngày<\/th>\s*<th className="[^"]*">Đơn Giá TB<\/th>/);
  });

  await t.test('5. NghiViecTab ẩn cột Lương TB/Ngày và Mức Lương TB khi isStaff', () => {
    const nghiViecFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/NghiViecTab.tsx'), 'utf8');
    // Table 1
    assert.match(nghiViecFile, /!isStaff && <th className="p-2 text-right w-\[18%\]">Lương TB\/Ngày<\/th>/);
    assert.match(nghiViecFile, /!isStaff && \(\s*<td className="p-2 text-right font-mono font-bold text-emerald-600">\s*\{t\.avgSalary\.toLocaleString/);
    // Table 2
    assert.match(nghiViecFile, /!isStaff && <th className="p-2.5 text-right w-\[9%\]">Mức Lương TB<\/th>/);
    assert.match(nghiViecFile, /!isStaff && \(\s*<td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">\s*\{person\.mucLuongTb\.toLocaleString/);
    // Matrix post office buttons locked
    assert.match(nghiViecFile, /Cố định theo tài khoản/);
  });

  await t.test('6. DashboardContext lọc triệt để nhanSu và nghiViec theo assignedPo khi là nhân viên', () => {
    const contextFile = fs.readFileSync(path.join(ROOT_DIR, 'src/context/DashboardContext.tsx'), 'utf8');
    assert.match(contextFile, /nhanSu: dataset\.nhanSu\.filter\(r => normalizePostOfficeName\(r\.buuCuc \|\| r\.buuCucRaw\) === stdAssigned\)/);
    assert.match(contextFile, /nghiViec: dataset\.nghiViec\.filter\(r => normalizePostOfficeName\(r\.buuCuc \|\| r\.buuCucRaw\) === stdAssigned\)/);
  });

  await t.test('7. NhanSuTab ẩn hoàn toàn Báo Cáo Nhận Xét & Đánh Giá Chuyên Sâu Tình Hình Thực Trạng Nhân Sự đối với nhân viên', () => {
    const nhanSuTabFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/NhanSuTab.tsx'), 'utf8');
    assert.match(nhanSuTabFile, /!isStaff && \(\s*<div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900/);
    assert.match(nhanSuTabFile, /Báo Cáo Nhận Xét & Đánh Giá Chuyên Sâu Tình Hình Thực Trạng Nhân Sự/);
  });

  await t.test('8. NhanSuOperationalAlertsCard tự động chọn Tháng hiện tại khi isStaff', () => {
    const alertsCardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/nhan-su/NhanSuOperationalAlertsCard.tsx'), 'utf8');
    assert.match(alertsCardFile, /isStaff && currentMonthKey && selectedMonth === 'all'/);
    assert.match(alertsCardFile, /setSelectedMonth\(currentMonthKey\)/);
  });

  await t.test('9. Bảng Chi Tiết GTC Bưu Cục trong GtcPostOfficeTab có cố định tiêu đề và cuộn dọc độc lập', () => {
    const postOfficeTabFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/GtcPostOfficeTab.tsx'), 'utf8');
    assert.match(postOfficeTabFile, /title="Bảng Chi Tiết GTC Bưu Cục"/);
    assert.match(postOfficeTabFile, /maxHeight="max-h-\[540px\]"/);
    assert.match(postOfficeTabFile, /stickyHeader=\{true\}/);
    assert.match(postOfficeTabFile, /noWrap=\{true\}/);
    assert.match(postOfficeTabFile, /key: 'buuCuc',\s*header: 'Bưu Cục',\s*sticky: 'left'/);
  });

  await t.test('10. Nút Lịch Floating không tự động thả thanh pill ra chiếm không gian thao tác', () => {
    const drawerFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/common/OperationalCalendarDrawer.tsx'), 'utf8');
    assert.doesNotMatch(drawerFile, /Lịch TMĐT &amp; Âm Dương/);
    assert.match(drawerFile, /title="Lịch TMĐT & Âm Dương"/);
  });

  await t.test('11. Lưới Lịch tăng kích thước số và nội dung text tự động xuống dòng không mất chữ', () => {
    const drawerFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/common/OperationalCalendarDrawer.tsx'), 'utf8');
    assert.match(drawerFile, /min-h-\[74px\] sm:min-h-\[84px\]/);
    assert.match(drawerFile, /text-\[13px\] sm:text-\[15px\] font-black/);
    assert.match(drawerFile, /break-words whitespace-normal leading-tight/);
    assert.doesNotMatch(drawerFile, /truncate leading-tight w-full/);
  });

  await t.test('12. Thời gian tự động khóa do không thao tác (Inactivity Auto-Lock) kéo dài thành 60 phút', () => {
    const authServiceFile = fs.readFileSync(path.join(ROOT_DIR, 'src/services/authService.ts'), 'utf8');
    assert.match(authServiceFile, /export const IDLE_TIMEOUT_MS = 60 \* 60 \* 1000;/);

    const authContextFile = fs.readFileSync(path.join(ROOT_DIR, 'src/context/AuthContext.tsx'), 'utf8');
    assert.match(authContextFile, /không có thao tác trong 60 phút/);
  });
});
