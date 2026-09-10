import React, { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { DollarSign, Truck, PackagePlus, Calendar, AlertTriangle, UserCheck } from 'lucide-react';

const SalaryTab: React.FC = () => {
  const { salaryData, loading, errors, filters } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSalary = useMemo(() => {
    return salaryData.filter((row) => {
      if (filters.branch !== 'all' && row.branch !== filters.branch) return false;
      if (filters.employee !== 'all' && row.employee !== filters.employee) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = row.employee.toLowerCase().includes(term);
        const matchesBranch = row.branch.toLowerCase().includes(term);
        if (!matchesName && !matchesBranch) return false;
      }
      return true;
    });
  }, [salaryData, filters, searchTerm]);

  const kpis = useMemo(() => {
    const totalSalary = filteredSalary.reduce((acc, cur) => acc + cur.estimatedSalary, 0);
    const totalDelivery = filteredSalary.reduce((acc, cur) => acc + cur.deliveryOrders, 0);
    const totalPickup = filteredSalary.reduce((acc, cur) => acc + cur.pickupOrders, 0);
    const avgWorkDays = filteredSalary.length > 0
      ? filteredSalary.reduce((acc, cur) => acc + cur.workDays, 0) / filteredSalary.length
      : 0;

    return { totalSalary, totalDelivery, totalPickup, avgWorkDays };
  }, [filteredSalary]);

  if (loading && salaryData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-500">Đang tải dữ liệu lương từ Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.salary && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Lỗi tải Sheet Lương: {errors.salary}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tổng lương tạm tính</span>
          <div className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <DollarSign className="w-5 h-5" />
            {kpis.totalSalary.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tổng đơn giao tính lương</span>
          <div className="text-2xl font-bold mt-2 text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            {kpis.totalDelivery.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tổng đơn lấy tính lương</span>
          <div className="text-2xl font-bold mt-2 text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-amber-500" />
            {kpis.totalPickup.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Ngày công trung bình</span>
          <div className="text-2xl font-bold mt-2 text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            {kpis.avgWorkDays.toFixed(1)} ngày
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Chi tiết bảng lương theo nhân sự ({filteredSalary.length})
          </h2>
          <input
            type="text"
            placeholder="Tìm tên nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-3">Nhân viên</th>
                <th className="p-3">Bưu cục</th>
                <th className="p-3 text-right">Đơn giao</th>
                <th className="p-3 text-right">Đơn lấy</th>
                <th className="p-3 text-right">Ngày công</th>
                <th className="p-3 text-right">Lương tạm tính</th>
                <th className="p-3 text-right">Thâm niên (ngày)</th>
                <th className="p-3 text-center">Phân loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredSalary.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-neutral-500">
                    Không có thông tin bảng lương phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSalary.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100">{row.employee}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400">{row.branch}</td>
                    <td className="p-3 text-right font-semibold">{row.deliveryOrders.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-semibold">{row.pickupOrders.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right">{row.workDays}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {row.estimatedSalary.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-3 text-right">{row.seniorityDays}</td>
                    <td className="p-3 text-center">
                      {row.isNewEmployee ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                          <UserCheck className="w-3 h-3" />
                          Mới
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-500">Chính thức</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalaryTab;
