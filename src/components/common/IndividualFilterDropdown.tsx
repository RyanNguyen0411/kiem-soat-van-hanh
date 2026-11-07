import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface IndividualFilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (newValues: string[]) => void;
  searchPlaceholder?: string;
  minWidth?: string;
  compact?: boolean;
}

export const IndividualFilterDropdown: React.FC<IndividualFilterDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  searchPlaceholder = 'Tìm kiếm...',
  minWidth = 'w-64',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;
  const isSomeSelected = selectedValues.length > 0;

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return compact ? label : `Tất cả ${label}`;
    if (selectedValues.length === 1) {
      const found = options.find(o => o.value === selectedValues[0]);
      return found ? found.label.replace('(LAN) ', '') : selectedValues[0];
    }
    return `${label} (${selectedValues.length})`;
  }, [selectedValues, options, label, compact]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`inline-flex items-center transition-all ${
          compact
            ? 'gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md'
            : 'gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg'
        } border ${
          isSomeSelected
            ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 shadow-xs'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
        }`}
      >
        <span className={`${isSomeSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} shrink-0`}>
          {icon}
        </span>
        <span className={`truncate ${compact ? 'max-w-[95px]' : 'max-w-[125px]'}`}>{displayText}</span>
        {isSomeSelected && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white shrink-0">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute right-0 mt-1.5 ${minWidth} max-w-[320px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2.5 space-y-2 text-xs`}>
          {/* Header & Quick Action */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1">
              {icon}
              <span>Lọc {label}</span>
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
              >
                {isAllSelected ? 'Bỏ chọn' : 'Chọn hết'}
              </button>
              {isSomeSelected && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Search Box (if more than 5 options) */}
          {options.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Option list scrollable */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-slate-400 italic text-[11px]">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map(opt => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[11.5px] ${
                      checked
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10.5px] text-slate-400">
            <span>Đã chọn: <strong className="text-rose-600 font-bold">{selectedValues.length}</strong> / {options.length}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
