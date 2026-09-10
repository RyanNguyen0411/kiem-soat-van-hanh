import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Filter, RotateCcw } from 'lucide-react';

const GlobalFilter: React.FC = () => {
  const { operationsData, employeeData, filters, setFilters, resetFilters } = useDashboard();

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

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const isFiltered = filters.branch !== 'all' || filters.category !== 'all' || filters.employee !== 'all' || filters.dateRange !== 'all';

  return (
    <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-medium">
          <Filter className="w-4 h-4 text-primary" />
          <span>Bộ lọc:</span>
        </div>

        {/* Branch Filter */}
        <select
          value={filters.branch}
          onChange={(e) => handleFilterChange('branch', e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tất cả bưu cục ({branches.length})</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tất cả loại hàng ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Employee Filter */}
        <select
          value={filters.employee}
          onChange={(e) => handleFilterChange('employee', e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tất cả nhân viên ({employees.length})</option>
          {employees.map((emp) => (
            <option key={emp} value={emp}>{emp}</option>
          ))}
        </select>
      </div>

      {isFiltered && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
};

export default GlobalFilter;
