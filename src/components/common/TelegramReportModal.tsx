import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  PackageX, 
  Truck, 
  Settings, 
  Sparkles
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  getStoredTelegramConfig, 
  saveStoredTelegramConfig, 
  testTelegramBotConnection, 
  sendMessageToTelegram, 
  buildGltTelegramReports, 
  buildLcTelegramReports
} from '../../services/telegramService';
import type { TelegramConfig } from '../../services/telegramService';

interface TelegramReportModalProps {
  initialReportType?: 'glt' | 'lc';
}

export const TelegramReportModal: React.FC<TelegramReportModalProps> = ({ 
  initialReportType = 'glt' 
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [reportType, setReportType] = useState<'glt' | 'lc'>(initialReportType);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Telegram Config State
  const [config, setConfig] = useState<TelegramConfig>(getStoredTelegramConfig);
  const [testResult, setTestResult] = useState<{ testing: boolean; ok?: boolean; message?: string } | null>(null);

  // Expanded previews state
  const [expandedPreview, setExpandedPreview] = useState<Record<string, boolean>>({});

  // Sending status per post office: Record<branchName, 'idle' | 'sending' | 'success' | 'error'>
  const [sendStatuses, setSendStatuses] = useState<Record<string, { status: 'idle' | 'sending' | 'success' | 'error'; message?: string }>>({});
  const [isBatchSending, setIsBatchSending] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 5 });

  const { dataset } = useDashboard();

  // Listen to open event
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      if (e?.detail?.reportType) {
        setReportType(e.detail.reportType);
      }
      // Reset send status when opening modal
      setSendStatuses({});
    };

    window.addEventListener('open-telegram-report', handleOpen);
    return () => window.removeEventListener('open-telegram-report', handleOpen);
  }, []);

  // Sync config when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredTelegramConfig());
    }
  }, [isOpen]);

  // Sinh 5 báo cáo Tồn đọng GLT (120h & 192h)
  const gltReports = useMemo(() => {
    return buildGltTelegramReports(dataset.tonDongGlt || []);
  }, [dataset.tonDongGlt]);

  // Sinh 5 báo cáo Tồn đọng Luân chuyển LC
  const lcReports = useMemo(() => {
    return buildLcTelegramReports(dataset.tonDongLc || []);
  }, [dataset.tonDongLc]);

  const handleTestConnection = async () => {
    setTestResult({ testing: true });
    const res = await testTelegramBotConnection(config);
    setTestResult({ testing: false, ok: res.ok, message: res.message });
    if (res.ok) {
      saveStoredTelegramConfig(config);
    }
  };

  const handleSaveConfig = () => {
    saveStoredTelegramConfig(config);
    setShowConfig(false);
  };

  const togglePreview = (branchName: string) => {
    setExpandedPreview(prev => ({ ...prev, [branchName]: !prev[branchName] }));
  };

  // Gửi 1 tin nhắn riêng cho 1 bưu cục
  const handleSendSingle = async (branchName: string, message: string) => {
    setSendStatuses(prev => ({
      ...prev,
      [branchName]: { status: 'sending', message: 'Đang gửi...' }
    }));

    try {
      const res = await sendMessageToTelegram(message, config, 'HTML');
      if (res.ok) {
        setSendStatuses(prev => ({
          ...prev,
          [branchName]: { status: 'success', message: 'Đã gửi thành công qua Telegram!' }
        }));
      } else {
        setSendStatuses(prev => ({
          ...prev,
          [branchName]: { status: 'error', message: res.description || 'Lỗi khi gửi tin nhắn' }
        }));
      }
    } catch (err: any) {
      setSendStatuses(prev => ({
        ...prev,
        [branchName]: { status: 'error', message: err.message || 'Lỗi mạng khi liên lạc Telegram API' }
      }));
    }
  };

  // Gửi toàn bộ 5 bưu cục (5 tin nhắn riêng biệt tuần tự với khoảng nghỉ 350ms)
  const handleSendAllBatch = async () => {
    const reports = reportType === 'glt' ? gltReports : lcReports;
    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: reports.length });

    for (let i = 0; i < reports.length; i++) {
      const rep = reports[i];
      setBatchProgress({ current: i + 1, total: reports.length });

      setSendStatuses(prev => ({
        ...prev,
        [rep.buuCuc]: { status: 'sending', message: 'Đang gửi...' }
      }));

      try {
        const res = await sendMessageToTelegram(rep.message, config, 'HTML');
        if (res.ok) {
          setSendStatuses(prev => ({
            ...prev,
            [rep.buuCuc]: { status: 'success', message: 'Đã gửi thành công qua Telegram!' }
          }));
        } else {
          setSendStatuses(prev => ({
            ...prev,
            [rep.buuCuc]: { status: 'error', message: res.description || 'Lỗi khi gửi tin nhắn' }
          }));
        }
      } catch (err: any) {
        setSendStatuses(prev => ({
          ...prev,
          [rep.buuCuc]: { status: 'error', message: err.message || 'Lỗi mạng' }
        }));
      }

      // Khoảng nghỉ an toàn giữa các tin nhắn
      if (i < reports.length - 1) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    setIsBatchSending(false);
  };

  if (!isOpen) return null;

  const currentReports = reportType === 'glt' ? gltReports : lcReports;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={() => !isBatchSending && setIsOpen(false)}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* HEADER MODAL */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-[#229ED9] text-white shadow-md shrink-0">
                <Send className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wide text-white truncate">
                    BÁO CÁO TELEGRAM: TỒN ĐỌNG &amp; XỬ LÝ SLA
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#229ED9] text-white shadow-2xs">
                    Mỗi BC 1 Tin Nhắn Riêng
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-slate-300 mt-0.5">
                  <span className="text-orange-400 font-bold">AM Huy (ĐNB)</span>
                  <span>&bull;</span>
                  <span>Người nhận: <code>ID: {config.chatId}</code></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowConfig(prev => !prev)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  showConfig 
                    ? 'bg-orange-600 text-white border-orange-500' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Cấu hình Bot Token & Chat ID Telegram"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => !isBatchSending && setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TELEGRAM CONFIG PANEL (EXPANDABLE) */}
          {showConfig && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-orange-500" />
                  Cấu Hình Telegram Bot (AM Huy)
                </span>
                <span className="text-[10px] text-slate-400">Đã lưu trong trình duyệt</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-0.5">Bot Token:</label>
                  <input
                    type="text"
                    value={config.botToken}
                    onChange={e => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                    placeholder="Nhập mã Bot Token..."
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-0.5">Chat ID Người Nhận:</label>
                  <input
                    type="text"
                    value={config.chatId}
                    onChange={e => setConfig(prev => ({ ...prev, chatId: e.target.value }))}
                    placeholder="Nhập Chat ID..."
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[10.5px]">
                  {testResult?.testing && <span className="text-orange-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Đang kiểm tra kết nối...</span>}
                  {testResult && !testResult.testing && testResult.ok && <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {testResult.message}</span>}
                  {testResult && !testResult.testing && !testResult.ok && <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {testResult.message}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testResult?.testing}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Kiểm Tra Kết Nối
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    Lưu Cấu Hình
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REPORT TYPE SELECTOR TABS */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold">
              {/* Tab 1: Tồn Đọng 120h & 192h */}
              <button
                type="button"
                onClick={() => setReportType('glt')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportType === 'glt'
                    ? 'bg-[#229ED9] text-white shadow-xs font-black'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <PackageX className="w-4 h-4" />
                <span>Báo Cáo Tồn Đọng 120h &amp; 192h</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 text-white">
                  5 BC
                </span>
              </button>

              {/* Tab 2: Tồn Đọng LC */}
              <button
                type="button"
                onClick={() => setReportType('lc')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportType === 'lc'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Báo Cáo Tồn Đọng Luân Chuyển (LC)</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 text-white">
                  5 BC
                </span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 hidden sm:inline font-mono">
              Chuẩn 5 Bưu Cục Long An
            </div>
          </div>

          {/* MODAL BODY: 5 POST OFFICES CARDS */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            
            {/* Hướng Dẫn & Tóm Tắt Quy Chuẩn */}
            <div className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 text-xs text-orange-900 dark:text-orange-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                {reportType === 'glt' ? (
                  <span>
                    <strong>Quy chuẩn báo cáo GLT:</strong> Mỗi bưu cục gửi 1 tin nhắn riêng. Lọc chi tiết từng mã đơn <strong>TTS và Shopee</strong> theo nhóm cảnh báo xử lý <strong>192h trước, sau đó đến 120h</strong> (phân rõ có chuyến đi và chưa có chuyến đi, mỗi mã 1 hàng). Bưu cục không có đơn được ghi rõ "Không có".
                  </span>
                ) : (
                  <span>
                    <strong>Quy chuẩn báo cáo LC:</strong> Mỗi bưu cục gửi 1 tin nhắn riêng. Lọc các đơn từ <strong>12-24h trở đi</strong>, phân nhóm theo mốc giờ và loại LC (<strong>Giao/Trả</strong>). Cảnh báo đặc biệt đối với nhóm <strong>36-48h</strong>.
                  </span>
                )}
              </div>
            </div>

            {/* Danh sách 5 Bưu Cục */}
            <div className="space-y-2.5">
              {currentReports.map((item: any) => {
                const branchName = item.buuCuc;
                const statusInfo = sendStatuses[branchName] || { status: 'idle' };
                const isPreviewOpen = expandedPreview[branchName];

                return (
                  <div
                    key={branchName}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:shadow-xs transition-all space-y-2"
                  >
                    {/* Header Thẻ Bưu Cục */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-black">
                          {item.maBC}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {item.buuCuc}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Khu vực Long An (ĐNB)
                          </span>
                        </div>
                      </div>

                      {/* Các badge số liệu */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {reportType === 'glt' ? (
                          <>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.count192 > 0 
                                ? 'bg-rose-600 text-white animate-pulse' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              192h: {item.count192} đơn
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.count120 > 0 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              120h: {item.count120} đơn
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Tổng: {item.totalAlertOrders} đơn
                            </span>
                          </>
                        ) : (
                          <>
                            {item.count36_48 > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                36-48h: {item.count36_48} đơn
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              LC Giao: {item.countGiao} đơn
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              LC Trả: {item.countTra} đơn
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                              Số lượng đơn (≥12h): {item.totalLcOrders} đơn
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Thanh Trạng Thái Gửi & Nút Thao Tác */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5">
                        {statusInfo.status === 'idle' && (
                          <span className="text-[11px] text-slate-400">Sẵn sàng xuất báo cáo</span>
                        )}
                        {statusInfo.status === 'sending' && (
                          <span className="text-[11px] text-orange-500 font-bold flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đẩy tin nhắn sang Telegram...
                          </span>
                        )}
                        {statusInfo.status === 'success' && (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {statusInfo.message}
                          </span>
                        )}
                        {statusInfo.status === 'error' && (
                          <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {statusInfo.message}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Nút Xem Trước Nội Dung Tin Nhắn */}
                        <button
                          type="button"
                          onClick={() => togglePreview(branchName)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isPreviewOpen ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Ẩn Preview</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem Tin Nhắn</span>
                            </>
                          )}
                        </button>

                        {/* Nút Gửi Riêng Bưu Cục Này */}
                        <button
                          type="button"
                          onClick={() => handleSendSingle(branchName, item.message)}
                          disabled={statusInfo.status === 'sending' || isBatchSending}
                          className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-orange-600 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Gửi Bưu Cục Này</span>
                        </button>
                      </div>
                    </div>

                    {/* Khung Xem Trước Tin Nhắn Telegram (Preview Box) */}
                    {isPreviewOpen && (
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-60 border border-slate-800 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                          <span>NỘI DUNG GỬI TELEGRAM CHO {branchName.toUpperCase()}:</span>
                          <span>{item.message.length} ký tự</span>
                        </div>
                        <div 
                          dangerouslySetInnerHTML={{ __html: item.message.replace(/\n/g, '<br/>') }}
                          className="space-y-1"
                        />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          {/* FOOTER MODAL: NÚT BẮN TOÀN BỘ 5 BƯU CỤC */}
          <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              {isBatchSending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Đang gửi báo cáo {batchProgress.current}/{batchProgress.total} bưu cục...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px]">
                  <span>Hệ thống tự động ngắt đoạn &amp; gửi tuần tự: </span>
                  <strong className="text-slate-800 dark:text-slate-200">5 Tin Nhắn Riêng Biệt</strong>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isBatchSending}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleSendAllBatch}
                disabled={isBatchSending}
                className="px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] text-white font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs active:scale-95 disabled:opacity-50"
              >
                {isBatchSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Bắn Tin... ({batchProgress.current}/{batchProgress.total})</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Bắn Báo Cáo 5 Bưu Cục Sang Telegram</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
