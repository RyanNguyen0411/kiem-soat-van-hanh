import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Search, 
  Download, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { exportToCSV } from '../../services/excelExportService';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  sticky?: 'left' | 'right';
  stickyLeft?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
  exportFilename?: string;
  pageSizeDefault?: number;
  renderExpandedRow?: (row: T) => React.ReactNode;
  filterComponent?: React.ReactNode;
  filterBar?: React.ReactNode;
  extraActions?: React.ReactNode;
  searchPlaceholder?: string;
  keyExtractor?: (row: T, index: number) => string;
  maxHeight?: string;
  stickyHeader?: boolean;
  noWrap?: boolean;
  showSearch?: boolean;
  pagination?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  subtitle,
  exportFilename = 'ghn_data_export',
  pageSizeDefault = 15,
  renderExpandedRow,
  filterComponent,
  filterBar,
  extraActions,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  keyExtractor,
  maxHeight,
  stickyHeader = true,
  noWrap = false,
  showSearch = true,
  pagination = true
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(new Set());
  const [displayLimit, setDisplayLimit] = useState(150);

  // Reset display limit when data, search or sort change
  React.useEffect(() => {
    setDisplayLimit(150);
  }, [data, searchTerm, sortKey, sortDirection]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (pagination) return;
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 300) {
      setDisplayLimit(prev => Math.min(prev + 150, sortedData.length));
    }
  };

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), 'vi');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination & Progressive Scroll Limit
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData.slice(0, displayLimit);
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination, displayLimit]);

  const handleSort = (key: string, sortable = true) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleRowExpansion = (rowKey: string) => {
    setExpandedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const handleExport = () => {
    const headers = columns.map(c => c.header);
    const rows = sortedData.map(row => {
      return columns.map(c => {
        try {
          if (c.exportValue) return c.exportValue(row);
          return row[c.key] ?? '';
        } catch (err) {
          console.warn(`[DataTable] Error exporting cell for column "${c.key}":`, err, row);
          return row[c.key] ?? '';
        }
      });
    });
    exportToCSV(exportFilename, headers, rows);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
      {/* Table Header toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/60 dark:bg-slate-750/50">
        <div>
          {title && (
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          {showSearch && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 w-48 lg:w-60"
              />
            </div>
          )}

          {/* Independent Filter Component */}
          {filterComponent}

          {/* Extra Actions */}
          {extraActions}

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
            title="Xuất file Excel CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar integrated directly inside the table container */}
      {filterBar && (
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-750/50">
          {filterBar}
        </div>
      )}

      {/* Table Content */}
      <div 
        onScroll={!pagination ? handleTableScroll : undefined}
        className={`overflow-x-auto ${maxHeight ? `${maxHeight} overflow-y-auto custom-scrollbar` : ''}`}
      >
        <table className={`w-full text-left border-collapse text-xs ${noWrap ? 'whitespace-nowrap' : ''}`}>
          <thead className={stickyHeader ? 'sticky top-0 z-20 shadow-xs' : ''}>
            <tr className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              {renderExpandedRow && (
                <th className={`w-8 px-2 py-2 bg-slate-100 dark:bg-slate-750 ${stickyHeader ? 'sticky top-0 z-20' : ''} ${noWrap ? 'whitespace-nowrap' : ''}`}></th>
              )}
              {columns.map(col => {
                const isSorted = sortKey === col.key;
                const isStickyLeft = col.sticky === 'left';
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable !== false)}
                    className={`px-2.5 py-2 font-bold tracking-wider select-none ${
                      isStickyLeft
                        ? 'bg-slate-200/90 dark:bg-slate-700 shadow-[1px_0_0_0_rgba(203,213,225,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)]'
                        : 'bg-slate-100 dark:bg-slate-750'
                    } ${
                      stickyHeader
                        ? isStickyLeft
                          ? 'sticky top-0 z-30'
                          : 'sticky top-0 z-20'
                        : isStickyLeft
                        ? 'sticky z-20'
                        : ''
                    } ${noWrap ? 'whitespace-nowrap' : ''} ${
                      col.sortable !== false ? 'cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700' : ''
                    } ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.headerClassName || ''}`}
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      left: col.stickyLeft
                    }}
                  >
                    <div className={`inline-flex items-center gap-1 ${noWrap ? 'whitespace-nowrap' : ''} ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span className={noWrap ? 'whitespace-nowrap' : ''}>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-slate-400 shrink-0">
                          {isSorted ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-orange-600" /> : <ChevronDown className="w-3 h-3 text-orange-600" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70 text-slate-700 dark:text-slate-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderExpandedRow ? 1 : 0)}
                  className={`px-4 py-8 text-center text-slate-400 italic ${noWrap ? 'whitespace-nowrap' : ''}`}
                >
                  Không có dữ liệu phù hợp với điều kiện tìm kiếm/lọc
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const rowKey = keyExtractor ? keyExtractor(row, idx) : String(idx);
                const isExpanded = expandedRowKeys.has(rowKey);

                return (
                  <React.Fragment key={rowKey}>
                    <tr className={`hover:bg-orange-50/40 dark:hover:bg-slate-750/70 transition-colors ${isExpanded ? 'bg-orange-50/60 dark:bg-slate-750' : idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/40 dark:bg-slate-800/60'}`}>
                      {renderExpandedRow && (
                        <td className={`px-2 py-1.5 text-center ${noWrap ? 'whitespace-nowrap' : ''}`}>
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(rowKey)}
                            className="p-1 text-slate-400 hover:text-orange-600 transition-transform"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-orange-600' : ''}`} />
                          </button>
                        </td>
                      )}
                      {columns.map(col => {
                        const isStickyLeft = col.sticky === 'left';
                        return (
                          <td
                            key={col.key}
                            className={`px-2.5 py-1.5 ${noWrap ? 'whitespace-nowrap' : ''} ${
                              isStickyLeft
                                ? `sticky z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)] ${
                                    isExpanded
                                      ? 'bg-orange-50/95 dark:bg-slate-750'
                                      : idx % 2 === 0
                                      ? 'bg-white dark:bg-slate-800'
                                      : 'bg-slate-50 dark:bg-slate-800'
                                  }`
                                : ''
                            } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                            style={{ minWidth: col.width, left: col.stickyLeft }}
                          >
                            {(() => {
                              try {
                                if (col.render) return col.render(row, idx);
                                return row[col.key] ?? '—';
                              } catch (err) {
                                console.warn(`[DataTable] Error rendering cell for column "${col.key}":`, err, row);
                                return row[col.key] ?? '—';
                              }
                            })()}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Inline Expanded Row */}
                    {isExpanded && renderExpandedRow && (
                      <tr className="bg-slate-50/90 dark:bg-slate-850 border-y border-orange-200 dark:border-slate-700">
                        <td colSpan={columns.length + 1} className="p-2.5 sm:p-3 whitespace-normal">
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
                            {renderExpandedRow(row)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/60 dark:bg-slate-750/50">
        <div className="text-slate-500 dark:text-slate-400">
          {pagination ? (
            <>
              Hiển thị <span className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> - <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, sortedData.length)}</span> trên tổng số <span className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length.toLocaleString('vi-VN')}</span> dòng
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Hiển thị <strong className="font-bold text-slate-700 dark:text-slate-200">{paginatedData.length.toLocaleString('vi-VN')}</strong> / <strong className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length.toLocaleString('vi-VN')}</strong> dòng
              </span>
              {paginatedData.length < sortedData.length ? (
                <span className="text-[11px] text-slate-400 italic font-medium">
                  (cuộn chuột lên xuống theo tiêu đề để xem tiếp)
                </span>
              ) : (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  (đã hiển thị toàn bộ danh sách)
                </span>
              )}
            </div>
          )}
        </div>

        {pagination && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span>Dòng/trang:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium text-slate-700 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
