import React, { useEffect, useRef, useState } from 'react';
import {
  Settings,
  X,
  FileSpreadsheet,
  FolderOpen,
  Send,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Save,
  Plug
} from 'lucide-react';
import {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_DRIVE_FOLDER_ID,
  extractSpreadsheetId,
  extractDriveFolderId,
  getRuntimeSettings,
  getSpreadsheetUrl,
  getDriveFolderUrl,
  hasCustomSettings,
  isValidAppsScriptUrl,
  isValidTelegramToken,
  isValidTelegramChatId,
  resetRuntimeSettings,
  saveRuntimeSettings,
  testAppsScriptConnection,
  testSpreadsheetConnection
} from '../../services/settingsService';
import type { ConnectionTestResult } from '../../services/settingsService';
import { getDriveWebhookUrl } from '../../services/excelExportService';
import { getStoredTelegramConfig, saveStoredTelegramConfig } from '../../services/telegramService';

type FieldErrors = Partial<Record<'sheet' | 'folder' | 'script' | 'chat' | 'token', string>>;

const inputClass =
  'w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono';

const borderFor = (err?: string) =>
  err ? 'border-rose-400 dark:border-rose-700' : 'border-slate-300 dark:border-slate-600';

const TestResult: React.FC<{ result: ConnectionTestResult | null }> = ({ result }) => {
  if (!result) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-1.5 text-[11px] leading-snug ${
        result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
      }`}
    >
      {result.ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
      )}
      <span>{result.message}</span>
    </p>
  );
};

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  ) : null;

export const SettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [sheetLink, setSheetLink] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [folderLink, setFolderLink] = useState('');
  const [folderId, setFolderId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [chatId, setChatId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [sheetTest, setSheetTest] = useState<ConnectionTestResult | null>(null);
  const [scriptTest, setScriptTest] = useState<ConnectionTestResult | null>(null);
  const [testingSheet, setTestingSheet] = useState(false);
  const [testingScript, setTestingScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const loadCurrentSettings = () => {
    const s = getRuntimeSettings();
    const tg = getStoredTelegramConfig();
    setSheetLink(getSpreadsheetUrl());
    setSheetId(s.spreadsheetId);
    setFolderLink(getDriveFolderUrl());
    setFolderId(s.driveFolderId);
    setScriptUrl(getDriveWebhookUrl());
    setChatId(tg.chatId || '');
    setBotToken(tg.botToken || '');
    setShowToken(false);
    setErrors({});
    setSheetTest(null);
    setScriptTest(null);
    setNeedConfirm(false);
    setConfirmReset(false);
    setCopied(false);
  };

  useEffect(() => {
    const handleOpen = () => {
      loadCurrentSettings();
      setIsOpen(true);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('open-settings-modal', handleOpen);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-settings-modal', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const clearError = (key: keyof FieldErrors) => {
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Dán link -> tự tách ID; sửa ID -> tự dựng lại link chuẩn. Hai ô luôn đồng bộ khi hợp lệ.
  const handleSheetLinkChange = (value: string) => {
    setSheetLink(value);
    const id = extractSpreadsheetId(value);
    if (id) setSheetId(id);
    setSheetTest(null);
    setNeedConfirm(false);
    clearError('sheet');
  };
  const handleSheetIdChange = (value: string) => {
    setSheetId(value);
    const id = extractSpreadsheetId(value);
    if (id) setSheetLink(`https://docs.google.com/spreadsheets/d/${id}/edit`);
    setSheetTest(null);
    setNeedConfirm(false);
    clearError('sheet');
  };
  const handleFolderLinkChange = (value: string) => {
    setFolderLink(value);
    const id = extractDriveFolderId(value);
    if (id) setFolderId(id);
    clearError('folder');
  };
  const handleFolderIdChange = (value: string) => {
    setFolderId(value);
    const id = extractDriveFolderId(value);
    if (id) setFolderLink(`https://drive.google.com/drive/folders/${id}`);
    clearError('folder');
  };

  const validate = () => {
    const next: FieldErrors = {};
    const sid = extractSpreadsheetId(sheetId) || extractSpreadsheetId(sheetLink);
    const fid = extractDriveFolderId(folderId) || extractDriveFolderId(folderLink);
    const script = scriptUrl.trim();
    const token = botToken.trim();
    const chat = chatId.trim();

    if (!sid) next.sheet = 'Link/ID Google Sheets không hợp lệ. Hãy dán link dạng .../spreadsheets/d/<ID>/...';
    if (!fid) next.folder = 'Link/ID thư mục Drive không hợp lệ. Hãy dán link dạng .../drive/folders/<ID>';
    if (script && !isValidAppsScriptUrl(script)) {
      next.script = 'URL phải có dạng https://script.google.com/macros/s/.../exec (bản triển khai Web App).';
    }
    if (chat && !isValidTelegramChatId(chat)) next.chat = 'Chat ID chỉ gồm chữ số (có thể bắt đầu bằng dấu -).';
    if (token && !isValidTelegramToken(token)) next.token = 'Bot Token không đúng định dạng (ví dụ 123456789:AAxxxx...).';

    setErrors(next);
    if (Object.keys(next).length > 0 || !sid || !fid) return null;
    return { spreadsheetId: sid, driveFolderId: fid, appsScriptUrl: script, token, chat };
  };

  const handleTestSheet = async () => {
    const sid = extractSpreadsheetId(sheetId) || extractSpreadsheetId(sheetLink);
    if (!sid) {
      setErrors(prev => ({ ...prev, sheet: 'Link/ID Google Sheets không hợp lệ.' }));
      return;
    }
    setTestingSheet(true);
    setSheetTest(null);
    setSheetTest(await testSpreadsheetConnection(sid));
    setTestingSheet(false);
  };

  const handleTestScript = async () => {
    const script = scriptUrl.trim();
    if (!isValidAppsScriptUrl(script)) {
      setErrors(prev => ({ ...prev, script: 'URL Apps Script không hợp lệ.' }));
      return;
    }
    setTestingScript(true);
    setScriptTest(null);
    setScriptTest(await testAppsScriptConnection(script));
    setTestingScript(false);
  };

  const handleUpdate = async () => {
    const v = validate();
    if (!v) return;

    setIsSaving(true);
    try {
      // Đổi bảng tính: kiểm tra đọc được trước, tránh tải lại rồi vẫn hiển thị dữ liệu cũ mà không biết.
      const currentSheetId = getRuntimeSettings().spreadsheetId;
      if (v.spreadsheetId !== currentSheetId && !needConfirm) {
        const result = await testSpreadsheetConnection(v.spreadsheetId);
        setSheetTest(result);
        if (!result.ok) {
          setNeedConfirm(true);
          return;
        }
      }

      saveRuntimeSettings({
        spreadsheetId: v.spreadsheetId,
        driveFolderId: v.driveFolderId,
        appsScriptUrl: v.appsScriptUrl
      });
      saveStoredTelegramConfig({ botToken: v.token, chatId: v.chat });
      window.location.reload();
    } catch (err: any) {
      setErrors(prev => ({ ...prev, sheet: err?.message || 'Không thể lưu cấu hình.' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetRuntimeSettings();
    window.location.reload();
  };

  const folderIdForScript = extractDriveFolderId(folderId) || extractDriveFolderId(folderLink) || DEFAULT_DRIVE_FOLDER_ID;
  const handleCopyFolderLine = async () => {
    try {
      await navigator.clipboard.writeText(`const TARGET_FOLDER_ID = '${folderIdForScript}';`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (!isOpen) return null;

  const isDefault = !hasCustomSettings();
  const folderPreviewUrl = extractDriveFolderId(folderId)
    ? `https://drive.google.com/drive/folders/${extractDriveFolderId(folderId)}`
    : null;
  const sheetPreviewUrl = extractSpreadsheetId(sheetId)
    ? `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(sheetId)}/edit`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs"
      onMouseDown={e => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="settings-modal-title" className="text-sm font-black uppercase tracking-wide leading-none">
                Cài đặt kết nối
              </h2>
              <p className="text-[10.5px] text-slate-400 mt-1 leading-none">
                {isDefault ? 'Đang dùng cấu hình mặc định' : 'Đang dùng cấu hình tùy chỉnh'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng cài đặt"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Dán link mới vào ô tương ứng rồi bấm <strong>Cập nhật &amp; tải lại</strong>. Hệ thống tự tách ID từ link và
            tải lại trang để áp dụng ngay.
          </p>

          {/* 1. Google Sheets */}
          <section className="space-y-2" aria-labelledby="st-sheet">
            <h3 id="st-sheet" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Link nguồn Google Sheets
            </h3>
            <div className="space-y-1">
              <label htmlFor="st-sheet-link" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Link bảng tính nguồn
              </label>
              <input
                id="st-sheet-link"
                ref={firstInputRef}
                type="text"
                value={sheetLink}
                onChange={e => handleSheetLinkChange(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                aria-invalid={Boolean(errors.sheet)}
                aria-describedby="st-sheet-err"
                className={`${inputClass} ${borderFor(errors.sheet)}`}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="st-sheet-id" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                ID bảng tính (Spreadsheet ID)
              </label>
              <input
                id="st-sheet-id"
                type="text"
                value={sheetId}
                onChange={e => handleSheetIdChange(e.target.value)}
                placeholder={DEFAULT_SPREADSHEET_ID}
                aria-invalid={Boolean(errors.sheet)}
                aria-describedby="st-sheet-err"
                className={`${inputClass} ${borderFor(errors.sheet)}`}
              />
            </div>
            <FieldError id="st-sheet-err" message={errors.sheet} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestSheet}
                disabled={testingSheet}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {testingSheet ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
                Kiểm tra kết nối
              </button>
              {sheetPreviewUrl && (
                <a
                  href={sheetPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Mở bảng tính
                </a>
              )}
            </div>
            <TestResult result={sheetTest} />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              Bảng tính cần được chia sẻ dạng <em>“Bất kỳ ai có đường liên kết đều xem được”</em> và giữ nguyên tên các sheet
              (GTC Bưu cục, GTC Nhân viên, Hoa hồng ngày, Tồn đọng GLT, Tồn đọng LC…).
            </p>
          </section>

          {/* 2. Google Drive */}
          <section className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800" aria-labelledby="st-drive">
            <h3 id="st-drive" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" /> Link thư mục Google Drive (lưu file xuất)
            </h3>
            <div className="space-y-1">
              <label htmlFor="st-folder-link" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Link thư mục Drive
              </label>
              <input
                id="st-folder-link"
                type="text"
                value={folderLink}
                onChange={e => handleFolderLinkChange(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                aria-invalid={Boolean(errors.folder)}
                aria-describedby="st-folder-err"
                className={`${inputClass} ${borderFor(errors.folder)}`}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="st-folder-id" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                ID thư mục (Folder ID)
              </label>
              <input
                id="st-folder-id"
                type="text"
                value={folderId}
                onChange={e => handleFolderIdChange(e.target.value)}
                placeholder={DEFAULT_DRIVE_FOLDER_ID}
                aria-invalid={Boolean(errors.folder)}
                aria-describedby="st-folder-err"
                className={`${inputClass} ${borderFor(errors.folder)}`}
              />
            </div>
            <FieldError id="st-folder-err" message={errors.folder} />
            <div className="flex flex-wrap items-center gap-2">
              {folderPreviewUrl && (
                <a
                  href={folderPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Mở thư mục
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyFolderLine}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Đã sao chép' : 'Sao chép dòng TARGET_FOLDER_ID'}
              </button>
            </div>
            <p className="text-[10.5px] text-amber-700 dark:text-amber-400 leading-snug">
              Lưu ý: thư mục nhận file xuất thực tế do <code>TARGET_FOLDER_ID</code> trong <code>Code.gs</code> của Apps Script
              quyết định (trình duyệt không được phép chỉ định thư mục, để đảm bảo an toàn). Khi đổi thư mục, hãy dán dòng vừa
              sao chép vào <code>Code.gs</code> rồi <strong>Deploy → New version</strong>.
            </p>
          </section>

          {/* 3. Apps Script */}
          <section className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800" aria-labelledby="st-script">
            <h3 id="st-script" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
              <Plug className="w-3.5 h-3.5 text-blue-600" /> URL Google Apps Script (Web App)
            </h3>
            <div className="space-y-1">
              <label htmlFor="st-script-url" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                URL triển khai (kết thúc bằng /exec)
              </label>
              <input
                id="st-script-url"
                type="text"
                value={scriptUrl}
                onChange={e => {
                  setScriptUrl(e.target.value);
                  setScriptTest(null);
                  clearError('script');
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                aria-invalid={Boolean(errors.script)}
                aria-describedby="st-script-err"
                className={`${inputClass} ${borderFor(errors.script)}`}
              />
            </div>
            <FieldError id="st-script-err" message={errors.script} />
            <div>
              <button
                type="button"
                onClick={handleTestScript}
                disabled={testingScript}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {testingScript ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
                Kiểm tra kết nối
              </button>
            </div>
            <TestResult result={scriptTest} />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              Dùng cho xuất file lên Drive và chuyển tiếp Telegram. Chỉ chấp nhận địa chỉ <code>script.google.com</code>. Đăng
              nhập vẫn dùng kênh xác thực riêng, không bị thay đổi bởi ô này.
            </p>
          </section>

          {/* 4. Telegram */}
          <section className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800" aria-labelledby="st-tg">
            <h3 id="st-tg" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
              <Send className="w-3.5 h-3.5 text-sky-600" /> Telegram (ID &amp; Token)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="st-chat" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Chat ID nhận báo cáo
                </label>
                <input
                  id="st-chat"
                  type="text"
                  inputMode="numeric"
                  value={chatId}
                  onChange={e => {
                    setChatId(e.target.value);
                    clearError('chat');
                  }}
                  placeholder="VD: 1215576379"
                  aria-invalid={Boolean(errors.chat)}
                  aria-describedby="st-chat-err"
                  className={`${inputClass} ${borderFor(errors.chat)}`}
                />
                <FieldError id="st-chat-err" message={errors.chat} />
              </div>
              <div className="space-y-1">
                <label htmlFor="st-token" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Bot Token
                </label>
                <div className="relative">
                  <input
                    id="st-token"
                    type={showToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={e => {
                      setBotToken(e.target.value);
                      clearError('token');
                    }}
                    placeholder="123456789:AAxxxxxxxx"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.token)}
                    aria-describedby="st-token-err"
                    className={`${inputClass} pr-9 ${borderFor(errors.token)}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(s => !s)}
                    aria-label={showToken ? 'Ẩn token' : 'Hiện token'}
                    className="absolute inset-y-0 right-0 px-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <FieldError id="st-token-err" message={errors.token} />
              </div>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              Token chỉ được lưu trong trình duyệt này (không gửi đi đâu ngoài Telegram/Apps Script của anh). Để trống Token nếu
              muốn dùng token đặt sẵn ở phía máy chủ Apps Script. Không dùng chung máy khi đã nhập token.
            </p>
          </section>

          {needConfirm && (
            <div
              role="alert"
              className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-[11.5px] text-amber-900 dark:text-amber-200 leading-snug"
            >
              Chưa đọc được bảng tính mới. Nếu cập nhật ngay, dashboard sẽ hiển thị dữ liệu kiểm toán (snapshot) cũ thay vì dữ
              liệu của bảng tính mới. Bấm <strong>Vẫn cập nhật &amp; tải lại</strong> để tiếp tục, hoặc sửa lại link.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={handleReset}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
              confirmReset
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            {confirmReset ? 'Bấm lần nữa để khôi phục & tải lại' : 'Khôi phục link mặc định'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? 'Đang kiểm tra...' : needConfirm ? 'Vẫn cập nhật & tải lại' : 'Cập nhật & tải lại'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
