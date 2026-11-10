import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const overviewFile = path.resolve('src/pages/OverviewTab.tsx');
const overviewContent = fs.readFileSync(overviewFile, 'utf8');

test('1. DESIGN SYSTEM & KHÔNG GIAN ĐIỀU HÀNH EXECUTIVE AM', () => {
  // Kiểm tra bảng màu chuẩn GHN Orange, Slate/Navy
  assert.match(overviewContent, /bg-orange-600/, 'Phải sử dụng màu chủ đạo GHN Orange');
  assert.match(overviewContent, /dark:bg-slate-800/, 'Phải hỗ trợ Dark Mode Navy Slate');
  assert.doesNotMatch(overviewContent, /bg-gradient-to-br from-orange-500 to-amber-600 text-white p-3\.5 rounded-xl shadow-md text-center/, 'Đã loại bỏ lạm dụng gradient sặc sỡ');
});

test('2. CẤU TRÚC 9 PHÂN ĐOẠN OVERVIEW TAB CHUẨN SECTION B', () => {
  // 1 & 2: Header & Bộ lọc
  const idxHeaderFilter = overviewContent.indexOf('CỐ ĐỊNH & THU GỌN: HEADER ĐIỀU HÀNH');
  // 3: 12 KPI Cards Grid
  const idxKpiCards = overviewContent.indexOf('12 Executive KPI Cards Grid', idxHeaderFilter);
  // 4: Cảnh báo vận hành (tìm sau idxHeaderFilter)
  const idxAlerts = overviewContent.indexOf('CẢNH BÁO VẬN HÀNH TRỌNG YẾU DÀNH CHO AREA MANAGER (ĐỐI SOÁT ĐỘNG THEO BỘ LỌC)', idxHeaderFilter);
  // 5: So sánh hiệu suất 5 bưu cục
  const idxPoRanking = overviewContent.indexOf('Post Office Master Ranking & Inline Expansion Section', idxHeaderFilter);
  // 6: Xu hướng theo ngày & Ca 2
  const idxCa2 = overviewContent.indexOf('KHU VỰC: CHỈ SỐ & BIỂU ĐỒ HỖN HỢP VẬN HÀNH HÀNG MỚI CA 2', idxHeaderFilter);
  const idxTrends = overviewContent.indexOf('Row 1 Charts: Volume Trend', idxHeaderFilter);
  // 7: Ma trận hiệu suất và rủi ro
  const idxHealth = overviewContent.indexOf('MA TRẬN SỨC KHỎE VẬN HÀNH TOÀN DIỆN 5 BƯU CỤC', idxHeaderFilter);
  const idxAgingMatrix = overviewContent.indexOf('MA TRẬN TUỔI TỒN ĐỌNG × BƯU CỤC (BACKLOG AGING × POST OFFICE MATRIX)', idxHeaderFilter);
  const idxPeriodic = overviewContent.indexOf('PERIODIC COMPARISON SECTION', idxHeaderFilter);
  // 8: Danh sách vấn đề cần xử lý & Chỉ đạo AM
  const idxAssessment = overviewContent.indexOf('BẢNG ĐÁNH GIÁ & NHẬN ĐỊNH VẬN HÀNH SẮC BÉN CỦA AREA MANAGER', idxHeaderFilter);
  // 9: Unified Drill Down Modal
  const idxDrillDownModal = overviewContent.indexOf('SECTION 9: UNIFIED DRILL-DOWN MODAL INTERACTION', idxHeaderFilter);

  assert.ok(idxHeaderFilter !== -1, 'Section 1 & 2 Header/Filter phải tồn tại');
  assert.ok(idxKpiCards !== -1, 'Section 3 KPI Cards phải tồn tại');
  assert.ok(idxAlerts !== -1, 'Section 4 Alerts phải tồn tại');
  assert.ok(idxPoRanking !== -1, 'Section 5 PO Master Ranking phải tồn tại');
  assert.ok(idxCa2 !== -1, 'Section 6 Ca 2 phải tồn tại');
  assert.ok(idxTrends !== -1, 'Section 6 Daily Trends phải tồn tại');
  assert.ok(idxHealth !== -1, 'Section 7 Health Matrix phải tồn tại');
  assert.ok(idxAgingMatrix !== -1, 'Section 7 Backlog Aging Matrix phải tồn tại');
  assert.ok(idxPeriodic !== -1, 'Section 7 Periodic Comparison phải tồn tại');
  assert.ok(idxAssessment !== -1, 'Section 8 AM Assessment phải tồn tại');
  assert.ok(idxDrillDownModal !== -1, 'Section 9 Unified Drill Down Modal phải tồn tại');

  // Kiểm tra thứ tự tuần tự chuẩn nghiệp vụ
  assert.ok(idxHeaderFilter < idxKpiCards, 'Header/Filter phải đứng trước KPI cards');
  assert.ok(idxKpiCards < idxAlerts, 'KPI cards phải đứng trước Alerts');
  assert.ok(idxAlerts < idxPoRanking, 'Alerts phải đứng trước PO Ranking');
  assert.ok(idxPoRanking < idxCa2, 'PO Ranking phải đứng trước Ca 2 & Trends');
  assert.ok(idxCa2 < idxTrends, 'Ca 2 phải nằm cùng cụm Trends');
  assert.ok(idxTrends < idxHealth, 'Trends phải đứng trước Ma trận hiệu suất');
  assert.ok(idxHealth < idxAgingMatrix, 'Health matrix phải đứng trước Aging Matrix');
  assert.ok(idxAgingMatrix < idxAssessment, 'Aging matrix phải đứng trước AM Assessment');
  assert.ok(idxAssessment < idxDrillDownModal, 'AM Assessment phải đứng trước Drill Down Modal');
});

test('3. KHẢ NĂNG DRILL-DOWN TƯƠNG TÁC TỪNG KPI CARD VÀ TỪNG BƯU CỤC', () => {
  assert.match(overviewContent, /onClick=\{handleDrillDownVolume\}/, 'KPI Volume phải có sự kiện drill-down');
  assert.match(overviewContent, /onClick=\{handleDrillDownGtc\}/, 'KPI GTC phải có sự kiện drill-down');
  assert.match(overviewContent, /onClick=\{handleDrillDownGltBacklog\}/, 'KPI Tồn GLT phải có sự kiện drill-down');
  assert.match(overviewContent, /onClick=\{handleDrillDownLcBacklog\}/, 'KPI Tồn LC phải có sự kiện drill-down');
  assert.match(overviewContent, /onClick=\{handleDrillDownOverdue\}/, 'KPI Quá hạn >120h phải có sự kiện drill-down');
  assert.match(overviewContent, /onClick=\{handleDrillDownSalary\}/, 'KPI Lương phải có sự kiện drill-down');
  assert.match(overviewContent, /onClick=\{handleDrillDownEmployees\}/, 'KPI Nhân viên phải có sự kiện drill-down');
  assert.match(overviewContent, /handleDrillDownPostOffice\(po\.buuCuc\)/, 'Từng bưu cục phải có nút drill-down độc lập');
});

test('4. MA TRẬN CHUYÊN NGHIỆP: TUỔI TỒN ĐỌNG × 5 BƯU CỤC (AGING BACKLOG MATRIX)', () => {
  assert.match(overviewContent, /const backlogAgingMatrix = useMemo/, 'Phải có logic tính toán ma trận tuổi tồn đọng');
  assert.match(overviewContent, /Ma Trận Tuổi Tồn Đọng × 5 Bưu Cục \(Aging Backlog Matrix\)/, 'Phải hiển thị tiêu đề ma trận tuổi tồn');
  assert.match(overviewContent, /&lt; 72h \(Trong SLA\)/, 'Phải có cột < 72h');
  assert.match(overviewContent, /72h - 120h \(Cận hạn\)/, 'Phải có cột 72h-120h');
  assert.match(overviewContent, /120h - 192h \(Trễ SLA\)/, 'Phải có cột 120h-192h');
  assert.match(overviewContent, /&gt; 192h \(Nguy cấp\)/, 'Phải có cột > 192h');
  assert.match(overviewContent, /Tồn LC/, 'Phải có cột tồn LC');
});
