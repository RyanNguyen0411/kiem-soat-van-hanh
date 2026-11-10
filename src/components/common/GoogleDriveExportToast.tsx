import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Check, 
  X, 
  Settings, 
  Copy, 
  CheckCheck,
  FolderOpen
} from 'lucide-react';
import { 
  GOOGLE_DRIVE_EXPORT_FOLDER_URL, 
  DEFAULT_DRIVE_WEBHOOK_URL,
  getDriveWebhookUrl, 
  setDriveWebhookUrl 
} from '../../services/excelExportService';

interface ExportEventDetail {
  filename: string;
  driveUrl: string;
  isUploadedToDrive: boolean;
  totalRows: number;
}

export const GoogleDriveExportToast: React.FC = () => {
  const [toastData, setToastData] = useState<ExportEventDetail | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const handleExportCompleted = (e: Event) => {
      const customEvent = e as CustomEvent<ExportEventDetail>;
      if (customEvent.detail) {
        setToastData(customEvent.detail);
      }
    };

    const handleOpenSettings = () => {
      setWebhookInput(getDriveWebhookUrl());
      setIsSettingsOpen(true);
    };

    window.addEventListener('ghn-export-completed', handleExportCompleted);
    window.addEventListener('open-drive-export-settings', handleOpenSettings);

    return () => {
      window.removeEventListener('ghn-export-completed', handleExportCompleted);
      window.removeEventListener('open-drive-export-settings', handleOpenSettings);
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

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setDriveWebhookUrl(webhookInput.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSettingsOpen(false);
    }, 1500);
  };

  const gasScriptCode = `/** GHN Dashboard -> native Google Sheets export. Copy the full version from google-apps-script/Code.gs. */
const TARGET_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Dữ liệu gửi lên trống');
    const payload = JSON.parse(e.postData.contents);
    if (!payload.content) throw new Error('Thiếu nội dung CSV');
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const name = String(payload.filename || 'GHN_Export').replace(/\.csv$/i, '');
    const rows = Utilities.parseCsv(String(payload.content).replace(/^\uFEFF/, ''));
    if (!rows || !rows.length) throw new Error('Không có dữ liệu');
    const width = Math.max.apply(null, rows.map(function(row) { return row.length; }));
    const book = SpreadsheetApp.create(name);
    const sheet = book.getSheets()[0];
    sheet.setName('Du lieu xuat');
    const values = rows.map(function(row) { const r = row.slice(); while (r.length < width) r.push(''); return r; });
    for (let i = 0; i < values.length; i += 5000) {
      const batch = values.slice(i, i + 5000);
      sheet.getRange(i + 1, 1, batch.length, width).setValues(batch);
    }
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#f97316').setFontColor('#ffffff');
    sheet.autoResizeColumns(1, Math.min(width, 30));
    SpreadsheetApp.flush();
    DriveApp.getFileById(book.getId()).moveTo(folder);
    return jsonResponse({ success: true, fileUrl: book.getUrl(), fileId: book.getId(), filename: name });
  } catch (err) { return jsonResponse({ success: false, error: String(err) }); }
}
function doGet() { return jsonResponse({ status: 'ACTIVE', folder: TARGET_FOLDER_ID }); }`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(gasScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
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
                  onClick={() => {
                    setWebhookInput(getDriveWebhookUrl());
                    setIsSettingsOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer"
                  title="Cài đặt Google Apps Script Webhook để tự động lưu trực tiếp"
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
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Cài đặt Webhook Google Apps Script tự động lưu trực tiếp vào Drive */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 text-xs text-slate-700 dark:text-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                    Cấu Hình Lưu Trữ File Excel Trên Google Drive
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Thư mục chỉ định: <strong>1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin thư mục đích */}
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 space-y-1">
              <span className="text-[11px] font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600" />
                Vị trí lưu trữ Google Drive:
              </span>
              <a
                href={GOOGLE_DRIVE_EXPORT_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-orange-700 dark:text-orange-300 underline break-all flex items-center gap-1 font-semibold hover:text-orange-800"
              >
                <span>{GOOGLE_DRIVE_EXPORT_FOLDER_URL}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            {/* Form nhập Webhook Apps Script */}
            <form onSubmit={handleSaveWebhook} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  URL Google Apps Script Web App (Tự động tải & lưu vào Drive):
                </label>
                {webhookInput === DEFAULT_DRIVE_WEBHOOK_URL && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    ✓ Link chính thức
                  </span>
                )}
              </div>
              <input
                type="url"
                value={webhookInput}
                onChange={e => setWebhookInput(e.target.value)}
                placeholder={DEFAULT_DRIVE_WEBHOOK_URL}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Dashboard đã tích hợp sẵn Web App của AM Huy. Khi xuất Excel, hệ thống sẽ tự động đẩy file lên Google Drive và mở ngay ở tab mới.
              </p>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {saveSuccess ? 'Đã lưu cấu hình ✓' : 'Lưu Cấu Hình'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWebhookInput(DEFAULT_DRIVE_WEBHOOK_URL);
                    setDriveWebhookUrl(DEFAULT_DRIVE_WEBHOOK_URL);
                  }}
                  className="text-[10.5px] text-orange-600 dark:text-orange-400 hover:underline cursor-pointer font-medium"
                >
                  Khôi phục link mặc định
                </button>
              </div>
            </form>

            {/* Khối hướng dẫn Google Apps Script */}
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                  Mã Google Apps Script (Triển khai trong 1 phút):
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 cursor-pointer text-[10px]"
                >
                  {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Đã sao chép' : 'Sao chép mã'}</span>
                </button>
              </div>
              <ol className="list-decimal list-inside text-[10px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                <li>Mở file Google Sheet nguồn &gt; chọn <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                <li>Dán đoạn mã trên vào file <code>Code.gs</code> rồi bấm lưu (Ctrl + S).</li>
                <li>Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong> &gt; Chọn <strong>Ứng dụng web (Web app)</strong>.</li>
                <li>
                  <strong>Cấu hình bắt buộc để không bị chặn lỗi 401:</strong>
                  <br />• <em>Thực thi dưới dạng (Execute as):</em> Chọn <strong>"Tôi" (Me)</strong>
                  <br />• <em>Ai có quyền truy cập (Who has access):</em> Chọn <strong>"Bất kỳ ai" (Anyone)</strong>
                </li>
                <li>Bấm <strong>Triển khai (Deploy)</strong> và cấp quyền Google Drive khi được yêu cầu.</li>
                <li>Copy URL Web App kết thúc bằng <code>/exec</code> dán vào ô bên trên để kích hoạt.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
