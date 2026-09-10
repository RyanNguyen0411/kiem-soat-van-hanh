import React from 'react';
import { dashboardConfig } from '../config/dashboard';
import { Settings, ExternalLink, ShieldCheck } from 'lucide-react';

const SettingsTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Cài đặt & Cấu hình kết nối
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Quản lý Google Spreadsheet ID, tên trang tính và ngưỡng kiểm soát rủi ro.
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Cấu hình Google Sheets</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
              Google Spreadsheet ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={dashboardConfig.spreadsheetId}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono text-xs select-all"
              />
              <a
                href={`https://docs.google.com/spreadsheets/d/${dashboardConfig.spreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors"
                title="Mở Google Sheet trên trình duyệt"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Sheet Vận hành
              </label>
              <input
                type="text"
                readOnly
                value={dashboardConfig.sheets.operations}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
              />
            </div>

            <div>
              <label className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Sheet Nhân viên
              </label>
              <input
                type="text"
                readOnly
                value={dashboardConfig.sheets.employees}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
              />
            </div>

            <div>
              <label className="font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Sheet Lương
              </label>
              <input
                type="text"
                readOnly
                value={dashboardConfig.sheets.salary}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Ngưỡng cảnh báo & Chu kỳ tự động</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
            <span className="font-bold text-red-600 dark:text-red-400 block">Ngưỡng Critical</span>
            <span className="text-neutral-600 dark:text-neutral-400 mt-1 block">Tỷ lệ GTC &lt; {dashboardConfig.thresholds.critical * 100}%</span>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <span className="font-bold text-amber-600 dark:text-amber-400 block">Ngưỡng Warning</span>
            <span className="text-neutral-600 dark:text-neutral-400 mt-1 block">Tỷ lệ GTC &lt; {dashboardConfig.thresholds.warning * 100}%</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Chu kỳ làm mới</span>
            <span className="text-neutral-600 dark:text-neutral-400 mt-1 block">{dashboardConfig.refreshInterval / 60000} phút / lần</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
