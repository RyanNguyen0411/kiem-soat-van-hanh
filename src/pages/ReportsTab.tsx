import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

const ReportsTab: React.FC = () => {
  const { operationsData, employeeData, salaryData } = useDashboard();

  const exportCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Trung tâm báo cáo & Xuất dữ liệu
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Xuất dữ liệu sạch đã qua chuẩn hóa sang file CSV để lưu trữ hoặc nộp báo cáo vận hành.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Export Operations */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Báo cáo Vận hành</h3>
                <p className="text-xs text-neutral-500">{operationsData.length} bản ghi</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">
              Bao gồm sản lượng, tỷ lệ gán, tỷ lệ GTC và tồn đọng theo ngày/bưu cục.
            </p>
          </div>
          <button
            onClick={() => exportCSV(operationsData, 'Bao_Cao_Van_Hanh')}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 transition-colors"
          >
            <Download className="w-4 h-4" />
            Tải file CSV
          </button>
        </div>

        {/* Export Employees */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Báo cáo Nhân viên</h3>
                <p className="text-xs text-neutral-500">{employeeData.length} bản ghi</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">
              Thống kê tổng đơn giao, đơn thành công và tỷ lệ hoàn thành theo từng shipper.
            </p>
          </div>
          <button
            onClick={() => exportCSV(employeeData, 'Bao_Cao_Nhan_Vien')}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 transition-colors"
          >
            <Download className="w-4 h-4" />
            Tải file CSV
          </button>
        </div>

        {/* Export Salary */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Báo cáo Lương</h3>
                <p className="text-xs text-neutral-500">{salaryData.length} bản ghi</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">
              Chi tiết công chuẩn, số đơn giao/lấy tính lương và mức lương tạm tính.
            </p>
          </div>
          <button
            onClick={() => exportCSV(salaryData, 'Bao_Cao_Luong')}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 transition-colors"
          >
            <Download className="w-4 h-4" />
            Tải file CSV
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Tất cả dữ liệu xuất ra đều được mã hóa UTF-8 with BOM để mở trực tiếp trong Excel mà không bị lỗi font tiếng Việt.</span>
      </div>
    </div>
  );
};

export default ReportsTab;
