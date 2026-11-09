import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ExternalLink, 
  X, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useAuth } from '../../context/AuthContext';

export const GoogleSheetsLockModal: React.FC = () => {
  const { spreadsheetId } = useDashboard();
  const { currentUser, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setConfirmationChecked(false);
      setErrorMessage(null);
      setTimeout(() => confirmBtnRef.current?.focus(), 100);
    };

    window.addEventListener('open-google-sheets-lock', handleOpen);
    return () => window.removeEventListener('open-google-sheets-lock', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setConfirmationChecked(false);
    setErrorMessage(null);
  };

  const handleVerifyAndOpen = (e: React.FormEvent) => {
    e.preventDefault();

    // Check RBAC Authorization
    if (!hasRole(['admin', 'area_manager'])) {
      setErrorMessage('Tài khoản của bạn không có quyền truy cập trực tiếp file dữ liệu gốc!');
      return;
    }

    if (!confirmationChecked) {
      setErrorMessage('Vui lòng tích xác nhận đã hiểu rủi ro thay đổi cấu trúc bảng tính!');
      return;
    }

    setIsVerifying(true);
    try {
      // Mở link Google Sheets gốc trong tab mới an toàn
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      window.open(url, '_blank', 'noopener,noreferrer');
      handleClose();
    } catch {
      setErrorMessage('Không thể mở liên kết bảng tính. Vui lòng kiểm tra quyền trình duyệt.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider leading-none">
                Bảo Vệ Link Nguồn Google Sheets
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5 font-medium">
                Khu vực Long An &bull; Quản trị Vận hành
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerifyAndOpen} className="p-5 space-y-4">
          {/* Security Warning Box */}
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>CẢNH BÁO AN TOÀN DỮ LIỆU</span>
            </div>
            <p className="text-[11px] text-red-800 dark:text-red-200/90 leading-relaxed">
              File Google Sheets gốc chứa toàn bộ dữ liệu 5 bưu cục đang quản lý. Bất kỳ chỉnh sửa hay xóa nhầm cấu trúc cột đều sẽ làm gián đoạn toàn bộ hệ thống Dashboard.
            </p>
            <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold italic">
              * Quản trị viên: <strong>{currentUser?.name || 'AM Huy (ĐNB)'}</strong> ({currentUser?.role || 'area_manager'}).
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* User Confirmation Checkbox */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(e) => {
                  setConfirmationChecked(e.target.checked);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="mt-0.5 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
              />
              <span className="leading-snug">
                Tôi xác nhận mở bảng tính gốc với quyền <strong>{currentUser?.role === 'admin' ? 'Quản trị viên cấp cao' : 'Area Manager'}</strong> và cam kết không chỉnh sửa sai tiêu chuẩn dữ liệu.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              ref={confirmBtnRef}
              type="submit"
              disabled={isVerifying}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang mở...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xác Nhận & Mở File Gốc</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleSheetsLockModal;
