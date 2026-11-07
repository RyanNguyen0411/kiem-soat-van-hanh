import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Check, Search, ChevronDown, RotateCcw } from 'lucide-react';

export interface FilterFieldOption {
  label: string;
  value: string;
}

export interface FilterFieldConfig {
  key: string;
  label: string;
  options: FilterFieldOption[];
}

interface IndependentFilterProps {
  title?: string;
  fields: FilterFieldConfig[];
  selectedValues: Record<string, string[]>;
  onApply: (values: Record<string, string[]>) => void;
  onReset: () => void;
}

export const IndependentFilter: React.FC<IndependentFilterProps> = ({
  title = 'Bộ lọc bảng',
  fields,
  selectedValues,
  onApply,
  onReset
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValues, setTempValues] = useState<Record<string, string[]>>(selectedValues);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal temp values when selectedValues prop changes
  useEffect(() => {
    setTempValues(selectedValues);
  }, [selectedValues]);

  // Click outside to auto-collapse without losing applied state!
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Revert tempValues to applied selectedValues on close
        setTempValues(selectedValues);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, selectedValues]);

  // Count active filter conditions
  const activeCount = Object.values(selectedValues).reduce((acc, arr) => acc + (arr?.length || 0), 0);

  const toggleOption = (fieldKey: string, value: string) => {
    setTempValues(prev => {
      const current = prev[fieldKey] || [];
      const exists = current.includes(value);
      const next = exists ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [fieldKey]: next };
    });
  };

  const selectAll = (fieldKey: string, options: FilterFieldOption[]) => {
    setTempValues(prev => ({
      ...prev,
      [fieldKey]: options.map(o => o.value)
    }));
  };

  const clearField = (fieldKey: string) => {
    setTempValues(prev => ({
      ...prev,
      [fieldKey]: []
    }));
  };

  const handleApply = () => {
    onApply(tempValues);
    setIsOpen(false);
  };

  const handleReset = () => {
    const empty: Record<string, string[]> = {};
    fields.forEach(f => { empty[f.key] = []; });
    setTempValues(empty);
    onReset();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
          activeCount > 0
            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm dark:bg-orange-950/40 dark:border-orange-500 dark:text-orange-300'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750'
        }`}
      >
        <Filter className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-orange-600' : 'text-slate-500'}`} />
        <span>{title}</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-orange-600 text-white rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {title}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Fields List */}
          <div className="p-4 max-h-96 overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-700">
            {fields.map(field => {
              const term = (searchTerms[field.key] || '').toLowerCase();
              const filteredOptions = field.options.filter(o => 
                o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term)
              );
              const currentSelected = tempValues[field.key] || [];

              return (
                <div key={field.key} className="pt-3 first:pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {field.label}
                    </label>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => selectAll(field.key, field.options)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                      >
                        Chọn hết
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => clearField(field.key)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Search inside field if options > 5 */}
                  {field.options.length > 5 && (
                    <div className="relative mb-2">
                      <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Tìm ${field.label.toLowerCase()}...`}
                        value={searchTerms[field.key] || ''}
                        onChange={e => setSearchTerms({ ...searchTerms, [field.key]: e.target.value })}
                        className="w-full pl-7 pr-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  {/* Options Checkboxes */}
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredOptions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-1">Không tìm thấy lựa chọn</p>
                    ) : (
                      filteredOptions.map(option => {
                        const isChecked = currentSelected.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer select-none transition-colors ${
                              isChecked
                                ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 font-medium'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOption(field.key, option.value)}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                            />
                            <span className="truncate">{option.label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa lọc</span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Áp dụng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
