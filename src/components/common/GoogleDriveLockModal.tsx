import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, FolderOpen, Lock, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDriveFolderUrl } from '../../services/settingsService';

/** UI confirmation layer only. Google Drive permissions remain the authoritative access control. */
export const GoogleDriveLockModal: React.FC = () => {
  const { currentUser, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const open = () => { setConfirmed(false); setError(''); setIsOpen(true); };
    window.addEventListener('open-google-drive-lock', open);
    return () => window.removeEventListener('open-google-drive-lock', open);
  }, []);

  const close = () => { setIsOpen(false); setConfirmed(false); setError(''); };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasRole(['admin', 'area_manager'])) {
      setError('Tài khoản hiện tại không được cấp quyền mở thư mục Drive từ Dashboard.');
      return;
    }
    if (!confirmed) {
      setError('Vui lòng xác nhận bạn hiểu đây là thư mục chứa dữ liệu vận hành nội bộ.');
      return;
    }
    const targetUrl = getDriveFolderUrl();
    const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      setError('Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up rồi thử lại.');
      return;
    }
    close();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="drive-lock-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300"><FolderOpen className="h-5 w-5" /></span>
            <div><h2 id="drive-lock-title" className="text-sm font-extrabold">BẢO VỆ THƯ MỤC GOOGLE DRIVE</h2><p className="mt-1 text-[11px] text-slate-300">GHN · Kho lưu trữ báo cáo vận hành</p></div>
          </div>
          <button type="button" onClick={close} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="mb-1 flex items-center gap-2 text-xs font-extrabold text-amber-800 dark:text-amber-300"><Lock className="h-4 w-4" /> DỮ LIỆU NỘI BỘ</div>
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">Thư mục có thể chứa báo cáo sản lượng, tồn đọng, nhân sự và dữ liệu vận hành. Chỉ tiếp tục nếu tài khoản Google của bạn đã được chủ sở hữu cấp quyền phù hợp.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Kiểm tra quyền Dashboard</div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Người dùng: <strong>{currentUser?.name || 'Chưa xác định'}</strong> · Vai trò: <strong>{currentUser?.role || 'Không xác định'}</strong></p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Lớp xác nhận này không thay thế quyền chia sẻ thực tế của Google Drive.</p>
          </div>
          {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs leading-relaxed dark:border-slate-700">
            <input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setError(''); }} className="mt-0.5 h-4 w-4 accent-orange-600" />
            <span>Tôi xác nhận chỉ sử dụng dữ liệu trong phạm vi công việc và không chia sẻ liên kết/thông tin nội bộ cho người không có thẩm quyền.</span>
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button type="button" onClick={close} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><ExternalLink className="h-3.5 w-3.5" /> Xác nhận & mở Drive</button>
          </div>
        </form>
      </section>
    </div>
  );
};
