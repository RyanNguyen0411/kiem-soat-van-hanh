import React, { useState, useMemo, useEffect } from 'react';
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

// Error Boundary isolating any column render crashes from freezing the dashboard
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DrillDownErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[UnifiedDrillDownModal] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Không thể hiển thị bảng chi tiết</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Đã phát hiện dữ liệu chưa chuẩn hóa trong một số dòng chi tiết.</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
            >
              Thử tải lại
            </button>
            <button
              type="button"
              onClick={this.props.onClose}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Đóng modal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Defensive cell render helper
function renderSafeCell<T>(col: DrillDownColumn<T>, row: T): React.ReactNode {
  try {
    if (col.render) {
      return col.render(row);
    }
    const val = (row as any)[col.key];
    if (val !== undefined && val !== null && val !== '') {
      return String(val);
    }
    return '—';
  } catch (err) {
    console.warn(`[UnifiedDrillDownModal] Error rendering cell for column "${col.key}":`, err, row);
    const fallbackVal = (row as any)[col.key];
    return fallbackVal !== undefined && fallbackVal !== null && fallbackVal !== '' ? String(fallbackVal) : '—';
  }
}

// Defensive export value helper
function getSafeExportValue<T>(col: DrillDownColumn<T>, row: T): string | number {
  try {
    if (col.exportValue) {
      return col.exportValue(row);
    }
    const val = (row as any)[col.key];
    return val !== undefined && val !== null ? val : '';
  } catch (err) {
    console.warn(`[UnifiedDrillDownModal] Error extracting export value for column "${col.key}":`, err, row);
    const fallbackVal = (row as any)[col.key];
    return fallbackVal !== undefined && fallbackVal !== null ? fallbackVal : '';
  }
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

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Always run hooks in the same order on open and closed renders.
  // Returning before these useMemo hooks causes React's Rules-of-Hooks error
  // when the modal changes from closed to open (or vice versa).

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

  if (!isOpen) return null;

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
      columns.map(col => getSafeExportValue(col, row))
    );
    exportToCSV(exportFileName, headers, rows);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <DrillDownErrorBoundary onClose={onClose}>
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
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60"
                    >
                      <strong>{f.label}:</strong> {f.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-250 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary KPIs banner */}
          {summaryKpis.length > 0 && (
            <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
              {summaryKpis.map((kpi, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{kpi.label}:</span>
                  <span className={`font-bold ${kpi.colorClass || 'text-slate-900 dark:text-white'}`}>
                    {kpi.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Toolbar: Search & Records count & Export */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tìm thấy: <strong className="text-slate-900 dark:text-white font-bold">{sortedData.length.toLocaleString('vi-VN')}</strong> bản ghi
              </span>

              <button
                onClick={handleExport}
                disabled={sortedData.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors shadow-xs cursor-pointer"
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
                          {renderSafeCell(col, row)}
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
              <span>• Trang {currentPage} / {totalPages}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </DrillDownErrorBoundary>
      </div>
    </div>
  );
}
