import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  Check, 
  X, 
  Settings
} from 'lucide-react';

interface ExportEventDetail {
  filename: string;
  driveUrl: string;
  isUploadedToDrive: boolean;
  totalRows: number;
}

export const GoogleDriveExportToast: React.FC = () => {
  const [toastData, setToastData] = useState<ExportEventDetail | null>(null);

  useEffect(() => {
    const handleExportCompleted = (e: Event) => {
      const customEvent = e as CustomEvent<ExportEventDetail>;
      if (customEvent.detail) {
        setToastData(customEvent.detail);
      }
    };

    window.addEventListener('ghn-export-completed', handleExportCompleted);

    return () => {
      window.removeEventListener('ghn-export-completed', handleExportCompleted);
    };
  }, []);

  // Tự động đóng toast sau 12 giây
  useEffect(() => {
    if (toastData) {
      const timer = setTimeout(() => {
        setToastData(null);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [toastData]);

  // Mọi cấu hình Drive / Apps Script nay nằm trong cửa sổ Cài đặt thống nhất (biểu tượng bánh răng)
  const openSettings = () => {
    window.dispatchEvent(new CustomEvent('open-settings-modal'));
  };

  return (
    <>
      {/* Toast thông báo xuất file thành công */}
      {toastData && (
        <div className={`fixed bottom-16 lg:bottom-10 right-4 z-50 max-w-md w-full bg-slate-900/95 dark:bg-slate-850/95 text-white rounded-2xl shadow-2xl border ${toastData.isUploadedToDrive ? 'border-emerald-500/40' : 'border-amber-500/40'} p-3.5 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300`}>
          <div className="flex items-start justify-between gap-2.5">
            <div className={`p-2 rounded-xl shrink-0 ${toastData.isUploadedToDrive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {toastData.isUploadedToDrive ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  {toastData.isUploadedToDrive ? 'Đã tạo Google Sheets trên Drive' : 'Chưa xác nhận được file trên Drive'}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${toastData.isUploadedToDrive ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/30 text-amber-200 border border-amber-500/40'}`}>
                  {toastData.totalRows.toLocaleString('vi-VN')} dòng
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-orange-500/30 text-orange-300 border border-orange-500/40">
                  Đã chặn tải về máy
                </span>
              </div>

              <div className="text-[11px] font-mono text-emerald-300 truncate mt-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60" title={toastData.filename}>
                📁 {toastData.filename}
              </div>

              <p className="text-[10.5px] text-slate-300 mt-1 leading-snug">
                {toastData.isUploadedToDrive ? 'Đã nhận xác nhận tạo bảng tính Google Sheets. Bạn có thể mở file bằng liên kết bên dưới.' : 'Trình duyệt chưa nhận được xác nhận từ Apps Script. Hãy kiểm tra thư mục Drive trước khi xuất lại để tránh tạo file trùng.'}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <a
                  href={toastData.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Mở lại Drive ↗</span>
                </a>

                <button
                  type="button"
                  onClick={openSettings}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer"
                  title="Mở Cài đặt để cập nhật link Drive / URL Apps Script"
                >
                  <Settings className="w-3 h-3 text-slate-400" />
                  <span>Cài đặt Driver</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setToastData(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
