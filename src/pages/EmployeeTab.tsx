import React, { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Users, Search, Award, AlertCircle, AlertTriangle } from 'lucide-react';

const EmployeeTab: React.FC = () => {
  const { employeeData, loading, errors, filters } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    return employeeData.filter((emp) => {
      if (filters.branch !== 'all' && emp.branch !== filters.branch) return false;
      if (filters.employee !== 'all' && emp.employee !== filters.employee) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = emp.employee.toLowerCase().includes(term);
        const matchesBranch = emp.branch.toLowerCase().includes(term);
        if (!matchesName && !matchesBranch) return false;
      }
      return true;
    });
  }, [employeeData, filters, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredEmployees.length;
    const totalOrders = filteredEmployees.reduce((acc, cur) => acc + cur.totalOrders, 0);
    const totalGTC = filteredEmployees.reduce((acc, cur) => acc + cur.totalGTC, 0);
    const totalBacklog = filteredEmployees.reduce((acc, cur) => acc + cur.backlog, 0);
    const avgGtcRate = totalOrders > 0 ? (totalGTC / totalOrders) * 100 : 0;

    return { total, totalOrders, totalGTC, totalBacklog, avgGtcRate };
  }, [filteredEmployees]);

  if (loading && employeeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-500">Đang tải dữ liệu nhân viên từ Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.employee && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Lỗi tải Sheet Nhân viên: {errors.employee}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Số lượng nhân sự</span>
          <div className="text-2xl font-bold mt-2 text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {stats.total} nhân viên
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tổng đơn giao</span>
          <div className="text-2xl font-bold mt-2 text-neutral-900 dark:text-neutral-100">
            {stats.totalOrders.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tỷ lệ GTC trung bình</span>
          <div className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Award className="w-5 h-5" />
            {stats.avgGtcRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tổng tồn đọng</span>
          <div className="text-2xl font-bold mt-2 text-red-500 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {stats.totalBacklog.toLocaleString('vi-VN')} đơn
          </div>
        </div>
      </div>

      {/* Table & Search */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Hiệu suất giao hàng theo nhân viên ({filteredEmployees.length})
          </h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Tìm tên hoặc bưu cục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-3">Nhân viên</th>
                <th className="p-3">Bưu cục</th>
                <th className="p-3 text-right">Tổng đơn</th>
                <th className="p-3 text-right">Giao thành công</th>
                <th className="p-3 text-right">Tồn đọng</th>
                <th className="p-3 text-right">Tỷ lệ GTC</th>
                <th className="p-3 text-center">Đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-neutral-500">
                    Không tìm thấy nhân viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100">{emp.employee}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400">{emp.branch}</td>
                    <td className="p-3 text-right font-semibold">{emp.totalOrders.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{emp.totalGTC.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-red-500 font-semibold">{emp.backlog.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold">{(emp.gtcRate * 100).toFixed(1)}%</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${
                        emp.status === 'Critical' ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400' :
                        emp.status === 'Warning' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' :
                        emp.status === 'Excellent' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' :
                        'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {emp.status}
                      </span>
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

export default EmployeeTab;
