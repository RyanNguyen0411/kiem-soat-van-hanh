import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  ExternalLink, 
  X, 
  Eye, 
  EyeOff, 
  AlertCircle 
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

const ADMIN_PASSWORD = '@Huycan95#';

export const GoogleSheetsLockModal: React.FC = () => {
  const { spreadsheetId } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setPassword('');
      setErrorMessage(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    window.addEventListener('open-google-sheets-lock', handleOpen);
    return () => window.removeEventListener('open-google-sheets-lock', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setPassword('');
    setErrorMessage(null);
  };

  const handleVerifyAndOpen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu quản trị!');
      return;
    }

    if (password.trim() === ADMIN_PASSWORD) {
      // Mở link Google Sheets gốc trong tab mới an toàn
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      window.open(url, '_blank', 'noopener,noreferrer');
      handleClose();
    } else {
      setErrorMessage('Mật khẩu quản trị không chính xác! Quyền truy cập link gốc bị từ chối.');
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
              File Google Sheets gốc chứa toàn bộ dữ liệu 6 bưu cục. Bất kỳ chỉnh sửa hay xóa nhầm cấu trúc cột đều sẽ làm gián đoạn toàn bộ hệ thống Dashboard.
            </p>
            <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold italic">
              * Vui lòng nhập mật khẩu quản trị Dashboard của AM Huy để mở file gốc.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Mật Khẩu Quản Trị Viên
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Nhập mật khẩu quản trị"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Xác Nhận & Mở File Gốc</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleSheetsLockModal;
