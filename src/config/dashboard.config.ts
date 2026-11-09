/**
 * GHN Area Manager Dashboard - Centralized Configuration & Single Source of Truth
 * Phase 01: Platform Hardening & Data Source Unification
 *
 * Verified Active Google Spreadsheet ID:
 * https://docs.google.com/spreadsheets/d/1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY
 */

export const SPREADSHEET_ID = '1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY';

export const dashboardConfig = {
  spreadsheetId: SPREADSHEET_ID,
  sheets: {
    operations: 'GTC Bưu cục',
    employees: 'GTC Nhân viên',
    salary: 'Hoa hồng ngày',
    backlogGlt: 'Tồn đọng GLT',
    backlogLc: 'Tồn đọng LC',
    hr: 'Nhân sự',
    resignations: 'Nghỉ việc'
  },
  refreshInterval: 60 * 60 * 1000, // 60 phút
  dateFormat: 'dd/MM/yyyy',
  thresholds: {
    critical: 0.62, // Ngưỡng cảnh báo %GTC khu vực (< 62%)
    warning: 0.67,  // Ngưỡng đạt chuẩn khu vực (67%)
    good: 0.70,     // Ngưỡng xuất sắc (>= 70%)
  },
};

export type DashboardConfig = typeof dashboardConfig;
