import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Plus, 
  RotateCcw, 
  Users, 
  MessageSquare,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getDataUpdateNotifyConfig,
  saveDataUpdateNotifyConfig,
  buildFullNotificationMessage,
  sendDataUpdateTelegram,
  DEFAULT_NOTIFY_MESSAGE,
  DEFAULT_TAGGED_USERS,
  type DataUpdateNotificationConfig
} from '../../services/dataUpdateNotifyService';

export const DataUpdateTelegramModal: React.FC = () => {
  const { currentUser } = useAuth();
  // Chỉ AM Huy (quản trị viên nguồn) mới có quyền sử dụng tính năng này
  const isStaff = currentUser?.role === 'post_office_staff';

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [config, setConfig] = useState<DataUpdateNotificationConfig>(() => getDataUpdateNotifyConfig());
  
  // Các state chỉnh sửa nội dung
  const [messageText, setMessageText] = useState<string>(config.messageText);
  const [taggedUsers, setTaggedUsers] = useState<string[]>(config.taggedUsers);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [botToken, setBotToken] = useState<string>(config.botToken);
  const [chatId, setChatId] = useState<string>(config.chatId);
  const [senderName, setSenderName] = useState<string>(config.senderName);
  
  // Trạng thái nâng cao và gửi tin
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusResult, setStatusResult] = useState<{ type: 'success' | 'error'; message: string; messageId?: number } | null>(null);

  // Lắng nghe sự kiện mở modal từ Header hoặc Quản lý bưu cục
  useEffect(() => {
    const handleOpen = () => {
      const latestCfg = getDataUpdateNotifyConfig();
      setConfig(latestCfg);
      setMessageText(latestCfg.messageText);
      setTaggedUsers(latestCfg.taggedUsers);
      setBotToken(latestCfg.botToken);
      setChatId(latestCfg.chatId);
      setSenderName(latestCfg.senderName);
      setStatusResult(null);
      setIsOpen(true);
    };

    window.addEventListener('open-data-update-telegram-modal', handleOpen);
    return () => window.removeEventListener('open-data-update-telegram-modal', handleOpen);
  }, []);

  // Xử lý thêm tag nhân sự
  const handleAddTag = () => {
    let clean = newTagInput.trim();
    if (!clean) return;
    if (!clean.startsWith('@')) {
      clean = '@' + clean;
    }
    if (!taggedUsers.includes(clean)) {
      const updated = [...taggedUsers, clean];
      setTaggedUsers(updated);
      saveDataUpdateNotifyConfig({ taggedUsers: updated });
    }
    setNewTagInput('');
  };

  // Xử lý xóa bớt 1 tag
  const handleRemoveTag = (tagToRemove: string) => {
    const updated = taggedUsers.filter(t => t !== tagToRemove);
    setTaggedUsers(updated);
    saveDataUpdateNotifyConfig({ taggedUsers: updated });
  };

  // Khôi phục 8 tag mặc định
  const handleResetTags = () => {
    setTaggedUsers([...DEFAULT_TAGGED_USERS]);
    saveDataUpdateNotifyConfig({ taggedUsers: [...DEFAULT_TAGGED_USERS] });
  };

  // Xóa toàn bộ tag
  const handleClearAllTags = () => {
    setTaggedUsers([]);
    saveDataUpdateNotifyConfig({ taggedUsers: [] });
  };

  // Nạp lại mẫu tin nhắn tiêu chuẩn
  const handleResetMessage = () => {
    setMessageText(DEFAULT_NOTIFY_MESSAGE);
  };

  // Sinh bản xem trước tin nhắn thời gian thực
  const previewMessage = useMemo(() => {
    return buildFullNotificationMessage(messageText, taggedUsers, undefined, senderName);
  }, [messageText, taggedUsers, senderName]);

  // Xử lý gửi tin nhắn Telegram
  const handleSendTelegram = async () => {
    setIsSending(true);
    setStatusResult(null);

    // Lưu lại cấu hình hiện thời vào localStorage
    saveDataUpdateNotifyConfig({
      botToken,
      chatId,
      messageText,
      taggedUsers,
      senderName
    });

    const res = await sendDataUpdateTelegram({
      botToken,
      chatId,
      messageText,
      taggedUsers,
      senderName
    });

    setIsSending(false);

    if (res.ok) {
      setStatusResult({
        type: 'success',
        message: `Đã gửi thông báo thành công tới Telegram! (Message ID: #${res.messageId})`,
        messageId: res.messageId
      });
    } else {
      setStatusResult({
        type: 'error',
        message: res.error || 'Gửi thất bại. Vui lòng kiểm tra lại Bot Token hoặc Chat ID.'
      });
    }
  };

  if (!isOpen || isStaff) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border-sky-500/40 animate-in zoom-in-95">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#229ED9] to-[#1778A7] px-5 sm:px-6 py-3.5 text-white shrink-0 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm shadow-inner shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10.5px] sm:text-xs font-black tracking-widest text-sky-100 uppercase leading-none">
                GHN CONTROL CENTER &bull; TELEGRAM BROADCAST
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase leading-tight text-white mt-1 flex items-center gap-2">
                <span>THÔNG BÁO CẬP NHẬT DỮ LIỆU QUA TELEGRAM</span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 md:p-6 text-slate-200 text-xs sm:text-sm space-y-4 overflow-y-auto max-h-[78vh] scrollbar-thin">
          
          {/* Thông báo kết quả gửi */}
          {statusResult && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
              statusResult.type === 'success' 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              {statusResult.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold text-xs sm:text-sm">{statusResult.message}</div>
                {statusResult.type === 'success' && (
                  <div className="text-[11px] text-emerald-400/80 mt-0.5">
                    Tất cả thành viên được tag trên Telegram đã nhận được thông báo mở Dashboard xem số liệu mới.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. KHUNG SOẠN THẢO VĂN BẢN THÔNG BÁO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Nội dung thông báo (AM chủ động chỉnh sửa):</span>
              </label>
              <button
                type="button"
                onClick={handleResetMessage}
                className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer flex items-center gap-1"
                title="Khôi phục lại nội dung thông báo tiêu chuẩn"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Mẫu Tiêu Chuẩn</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Nhập nội dung thông báo dữ liệu..."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm"
            />
          </div>

          {/* 2. KHU VỰC QUẢN LÝ TAG NHÂN SỰ */}
          <div className="space-y-2 bg-slate-950/50 border border-slate-800 rounded-xl p-3 sm:p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
              <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Danh sách Tag nhân sự ({taggedUsers.length} người):</span>
              </label>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleResetTags}
                  className="text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  title="Khôi phục danh sách 8 người mặc định"
                >
                  Khôi phục 8 tag
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={handleClearAllTags}
                  className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Xóa tất cả các tag"
                >
                  Xóa hết
                </button>
              </div>
            </div>

            {/* Danh sách Pill Tags */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
              {taggedUsers.length === 0 ? (
                <span className="text-slate-500 text-xs italic">Chưa có nhân sự nào được tag. Hãy nhập @username bên dưới để thêm.</span>
              ) : (
                taggedUsers.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/70 border border-sky-500/40 text-sky-300 font-mono text-xs font-bold shadow-2xs"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-sky-400 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                      title={`Bỏ tag ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Ô thêm tag mới */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Nhập @username mới (ví dụ: @ten_nhan_su)..."
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Tag</span>
              </button>
            </div>
          </div>

          {/* 3. XEM TRƯỚC TIN NHẮN TELEGRAM THỰC TẾ (LIVE PREVIEW) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1 text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Xem trước tin nhắn Telegram:</span>
              </span>
              <span className="text-[11px] text-slate-500">Định dạng hiển thị trực tiếp trong nhóm</span>
            </div>

            <div 
              className="bg-[#182533] border border-sky-500/25 rounded-2xl p-4 font-sans text-xs sm:text-[13.5px] text-slate-100 leading-relaxed shadow-inner [&_b]:text-white [&_b]:font-bold [&_u]:underline [&_u]:decoration-slate-300"
              dangerouslySetInnerHTML={{ 
                __html: previewMessage
                  .replace(/(@[a-zA-Z0-9_]+)/g, '<span class="text-sky-400 font-semibold">$1</span>')
                  .replace(/\n/g, '<br/>') 
              }}
            />
          </div>

          {/* 4. CẤU HÌNH NÂNG CAO (BOT TOKEN & CHAT ID) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showConfig ? 'Ẩn cài đặt Bot Token & Chat ID' : 'Tùy chỉnh Bot Token & Chat ID nhận thông báo'}</span>
            </button>

            {showConfig && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs animate-in fade-in">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Bot Token:</label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Chat ID (ID Nhóm / Người Nhận):</label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={e => setChatId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tên Người Thông Báo:</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-950/95 border-t border-slate-800 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Kênh gửi trực tiếp qua Bot <strong>CheckTicketQLRR_bot</strong> tới Chat ID <strong>{chatId}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSendTelegram}
              disabled={isSending}
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-600/30 flex items-center gap-2 cursor-pointer transition-all ${
                isSending 
                  ? 'bg-sky-800 cursor-wait' 
                  : 'bg-[#229ED9] hover:bg-[#1b88bd] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Đang bắn tin Telegram...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>BẮN THÔNG BÁO CHO NHÂN VIÊN</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DataUpdateTelegramModal;
