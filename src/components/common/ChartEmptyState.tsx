import React from 'react';
import { Inbox, Filter } from 'lucide-react';

interface ChartEmptyStateProps {
  title?: string;
  subtitle?: string;
  heightClass?: string;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({
  title = 'Không có dữ liệu phát sinh',
  subtitle = 'Không tìm thấy dữ liệu vận hành phù hợp với bộ lọc đang chọn',
  heightClass = 'h-56'
}) => {
  return (
    <div className={`w-full ${heightClass} flex flex-col items-center justify-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/80 p-6 text-center select-none transition-all`}>
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700/70 flex items-center justify-center text-slate-400 mb-2 shadow-2xs">
        <Inbox className="w-5 h-5 text-slate-400 dark:text-slate-500" />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
        {title}
      </span>
      <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
        {subtitle}
      </p>
      <div className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        <Filter className="w-3 h-3 text-orange-500" />
        <span>Thử nới lỏng bộ lọc hoặc xóa lọc để xem dữ liệu</span>
      </div>
    </div>
  );
};
