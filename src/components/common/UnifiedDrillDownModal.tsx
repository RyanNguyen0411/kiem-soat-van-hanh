import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Layers,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { exportToCSV } from '../../services/excelExportService';

export interface DrillDownColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DrillDownSummaryKpi {
  label: string;
  value: string | number;
  colorClass?: string;
}

interface UnifiedDrillDownModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  appliedFilters?: { label: string; value: string }[];
  data: T[];
  columns: DrillDownColumn<T>[];
  summaryKpis?: DrillDownSummaryKpi[];
  exportFileName?: string;
  searchPlaceholder?: string;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export function UnifiedDrillDownModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  subtitle,
  appliedFilters = [],
  data,
  columns,
  summaryKpis = [],
  exportFileName = 'GHN_Chi_Tiet_Drilldown',
  searchPlaceholder = 'Tìm kiếm trong chi tiết...',
  defaultSortKey,
  defaultSortDir = 'desc'
}: UnifiedDrillDownModalProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>(defaultSortKey || (columns[0]?.key || ''));
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  if (!isOpen) return null;

  // Filter by search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = columns.map(c => c.header);
    const rows = sortedData.map(row => 
      columns.map(col => {
        if (col.exportValue) return col.exportValue(row);
        const val = row[col.key];
        return val !== undefined && val !== null ? val : '';
      })
    );
    exportToCSV(exportFileName, headers, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-850/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <Layers className="w-5 h-5" />
              </span>
              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}

            {/* Applied Filter Chips */}
            {appliedFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Đang lọc:
                </span>
                {appliedFilters.map((f, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100/70 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                  >
                    <span className="text-orange-500">{f.label}:</span>
                    <span>{f.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Đóng chi tiết"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPIs Banner (if provided) */}
        {summaryKpis.length > 0 && (
          <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaryKpis.map((kpi, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className={`text-base font-extrabold mt-0.5 ${kpi.colorClass || 'text-slate-900 dark:text-white'}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar (Search & Export) */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tìm thấy: <strong className="text-slate-900 dark:text-white font-bold">{sortedData.length.toLocaleString('vi-VN')}</strong> bản ghi
            </span>

            <button
              onClick={handleExport}
              disabled={sortedData.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors shadow-xs"
              title="Xuất dữ liệu chi tiết ra file CSV/Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {sortedData.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-500/70 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Không có dữ liệu phù hợp với điều kiện tìm kiếm</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold z-10 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">STT</th>
                  {columns.map(col => (
                    <th 
                      key={col.key} 
                      className={`py-2.5 px-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer select-none hover:text-orange-600 dark:hover:text-orange-400' : ''}`}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        <span>{col.header}</span>
                        {col.sortable !== false && (
                          sortKey === col.key ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-600" /> : <ArrowDown className="w-3 h-3 text-orange-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedData.map((row, idx) => (
                  <tr 
                    key={idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    {columns.map(col => (
                      <td 
                        key={col.key} 
                        className={`py-2.5 px-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {col.render ? col.render(row) : (row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Hiển thị mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 font-semibold text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
