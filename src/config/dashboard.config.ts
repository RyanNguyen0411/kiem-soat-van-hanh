export const dashboardConfig = {
  spreadsheetId: "1_S5Ckl-tPJeP_SLta5a-aqXbr5Vk6So3gfV371Nxvo8",
  sheets: {
    operations: "Vận hành bưu cục",
    employees: "Chi tiết nhân viên",
    salary: "Lương theo ngày",
  },
  refreshInterval: 60 * 60 * 1000, // 60 phút
  dateFormat: "dd/MM/yyyy",
  thresholds: {
    critical: 0.70,
    warning: 0.85,
    good: 1.00,
  },
};

export type DashboardConfig = typeof dashboardConfig;
