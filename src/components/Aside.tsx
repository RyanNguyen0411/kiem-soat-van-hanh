import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Filter, RotateCcw, AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react';
import { format } from 'date-fns';

const Aside: React.FC = () => {
  const { operationsData, employeeData, filters, setFilters, resetFilters, lastUpdated } = useDashboard();

  // Extract unique branches
  const branches = useMemo(() => {
    const list = new Set<string>();
    operationsData.forEach(d => { if (d.branch) list.add(d.branch); });
    employeeData.forEach(d => { if (d.branch) list.add(d.branch); });
    return Array.from(list).sort();
  }, [operationsData, employeeData]);

  // Extract unique categories
  const categories = useMemo(() => {
    const list = new Set<string>();
    operationsData.forEach(d => { if (d.category) list.add(d.category); });
    return Array.from(list).sort();
  }, [operationsData]);

  // Extract unique employees
  const employees = useMemo(() => {
    const list = new Set<string>();
    employeeData.forEach(d => { if (d.employee) list.add(d.employee); });
    return Array.from(list).sort();
  }, [employeeData]);

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const isFiltered = filters.branch !== 'all' || filters.category !== 'all' || filters.employee !== 'all';

  // List of critical / warning branches for quick notification
  const criticalItems = useMemo(() => {
    const map = new Map<string, { status: string; gtc: number; backlog: number }>();
    operationsData.forEach(d => {
      if (d.status === 'Critical' || d.status === 'Warning') {
        if (!map.has(d.branch)) {
          map.set(d.branch, { status: d.status, gtc: d.gtcRate, backlog: d.backlog });
        }
      }
    });
    return Array.from(map.entries()).slice(0, 5); // top 5
  }, [operationsData]);

  return (
    <aside className="aside flex flex-col gap-5 text-sm">
      {/* Tiêu đề mục Aside */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Bộ lọc / Thông báo
        </h3>
        {isFiltered && (
          <button
            onClick={resetFilters}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 font-medium cursor-pointer"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-3 h-3" />
            Đặt lại
          </button>
        )}
      </div>

      {/* Phần 1: Bộ lọc nhanh */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>BỘ LỌC NHANH</span>
        </div>

        {/* Bưu cục */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Bưu cục:</label>
          <select
            value={filters.branch}
            onChange={(e) => handleFilterChange('branch', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả ({branches.length} bưu cục)</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Phân loại hàng */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Phân loại hàng:</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả ({categories.length} phân loại)</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Nhân viên */}
        {employees.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Nhân viên:</label>
            <select
              value={filters.employee}
              onChange={(e) => handleFilterChange('employee', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Tất cả ({employees.length} NV)</option>
              {employees.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Phần 2: Cảnh báo & Thông báo */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>CẢNH BÁO TỒN / GTC</span>
        </div>

        {criticalItems.length === 0 ? (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Toàn hệ thống hoạt động ổn định!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {criticalItems.map(([bName, info]) => (
              <div
                key={bName}
                onClick={() => handleFilterChange('branch', bName)}
                className="p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-neutral-800 dark:text-neutral-100">
                  <span className="truncate">{bName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${info.status === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                    {info.status === 'Critical' ? 'Nguy động' : 'Cảnh báo'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span>% GTC: {(info.gtc * 100).toFixed(1)}%</span>
                  <span>Tồn: {info.backlog}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phần 3: Trạng thái đồng bộ */}
      <div className="mt-auto pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-neutral-400" />
          <span>Cập nhật: {lastUpdated ? format(lastUpdated, 'HH:mm') : '--:--'}</span>
        </div>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Trực tuyến
        </span>
      </div>
    </aside>
  );
};

export default Aside;
