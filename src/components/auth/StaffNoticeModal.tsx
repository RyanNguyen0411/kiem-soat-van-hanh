import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Lock, 
  HeartHandshake,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getStaffNoticeConfig, 
  formatNoticeDate, 
  NOTICE_UPDATED_EVENT, 
  STORAGE_STAFF_NOTICE_KEY,
  type StaffNoticeConfig 
} from '../../services/staffNoticeService';

interface StaffNoticeModalProps {
  isPreview?: boolean;
  previewConfig?: StaffNoticeConfig;
  onClose?: () => void;
}

export const StaffNoticeModal: React.FC<StaffNoticeModalProps> = ({
  isPreview = false,
  previewConfig,
  onClose
}) => {
  const { currentUser, isNoticeAcknowledged, acknowledgeNotice } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';

  const [manualOpen, setManualOpen] = useState<boolean>(false);
  const [noticeConfig, setNoticeConfig] = useState<StaffNoticeConfig>(() => 
    previewConfig || getStaffNoticeConfig()
  );

  // Cập nhật khi prop previewConfig thay đổi
  useEffect(() => {
    if (previewConfig) {
      setNoticeConfig(previewConfig);
    }
  }, [previewConfig]);

  // Lắng nghe sự kiện cập nhật thông báo từ AM hoặc thay đổi storage giữa các tab
  useEffect(() => {
    if (isPreview) return;

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent?.detail;
      if (detail?.config) {
        setNoticeConfig(detail.config);
      } else if (detail?.content) {
        setNoticeConfig(detail);
      } else {
        setNoticeConfig(getStaffNoticeConfig());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_STAFF_NOTICE_KEY) {
        setNoticeConfig(getStaffNoticeConfig());
      }
    };

    const handleReopen = () => setManualOpen(true);

    window.addEventListener(NOTICE_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('open-staff-notice-modal', handleReopen);

    return () => {
      window.removeEventListener(NOTICE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('open-staff-notice-modal', handleReopen);
    };
  }, [isPreview]);

  // Bắt buộc hiển thị khi là nhân viên và chưa bấm đồng ý trong lượt đăng nhập này, hoặc chủ động mở lại
  const isOpen = isPreview ? true : (isStaff && (!isNoticeAcknowledged || manualOpen));

  const handleAgree = () => {
    if (isPreview && onClose) {
      onClose();
      return;
    }
    acknowledgeNotice();
    setManualOpen(false);
  };

  // Phân tích nội dung văn bản thành các khối hiển thị tinh gọn & trực quan
  const parsedSections = useMemo(() => {
    const raw = noticeConfig.content || '';
    const lines = raw.split('\n');
    
    interface SectionBlock {
      id: number;
      title: string;
      items: string[];
      iconType: 'data' | 'clock' | 'lock' | 'goal' | 'info';
    }

    const blocks: SectionBlock[] = [];
    let currentBlock: SectionBlock | null = null;
    let blockCounter = 1;

    const getIconType = (title: string): 'data' | 'clock' | 'lock' | 'goal' | 'info' => {
      const lower = title.toLowerCase();
      if (lower.includes('nguồn') || lower.includes('dữ liệu') || lower.includes('bản quyền')) return 'data';
      if (lower.includes('thời gian') || lower.includes('giờ') || lower.includes('lịch') || lower.includes('backlog')) return 'clock';
      if (lower.includes('bảo mật') || lower.includes('mật khẩu') || lower.includes('tài khoản')) return 'lock';
      if (lower.includes('mục tiêu') || lower.includes('vận hành') || lower.includes('hành động') || lower.includes('chất lượng')) return 'goal';
      return 'info';
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Nhận diện tiêu đề mục dạng: "1. TIÊU ĐỀ", "2. ...", hoặc "[MỤC]..."
      const sectionHeaderMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (sectionHeaderMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          id: parseInt(sectionHeaderMatch[1], 10) || blockCounter++,
          title: sectionHeaderMatch[2].trim(),
          items: [],
          iconType: getIconType(sectionHeaderMatch[2])
        };
      } else if (currentBlock) {
        // Thuộc khối hiện tại
        currentBlock.items.push(trimmed);
      } else {
        // Các dòng mở đầu trước khi vào mục đầu tiên
        currentBlock = {
          id: blockCounter++,
          title: 'THÔNG TIN CHUNG',
          items: [trimmed],
          iconType: 'info'
        };
      }
    });

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }, [noticeConfig.content]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
      style={{ backdropFilter: 'blur(20px)' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Khung thông báo mở rộng tinh gọn, chuẩn giao diện (~94vw, max 1550px) */}
      <div className="w-[94vw] max-w-[1550px] max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border-orange-500/40">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 px-5 sm:px-6 py-3 text-white shrink-0 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm shadow-inner shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-black tracking-widest text-orange-200 uppercase leading-none">
                  GHN CONTROL CENTER &bull; PHÂN HỆ VẬN HÀNH BƯU CỤC
                </span>
                {noticeConfig.bannerTag && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[10px] tracking-wider uppercase">
                    {noticeConfig.bannerTag}
                  </span>
                )}
                {isPreview && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] tracking-wider uppercase animate-pulse">
                    ĐANG XEM TRƯỚC (PREVIEW)
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight uppercase leading-tight text-white mt-1">
                {noticeConfig.title}
              </h2>
            </div>
          </div>

          {(manualOpen || isPreview) && (
            <button
              onClick={() => {
                if (isPreview && onClose) onClose();
                else setManualOpen(false);
              }}
              className="text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              ✕ Đóng
            </button>
          )}
        </div>

        {/* SUB-HEADER STATUS BAR: THỜI GIAN AM CẬP NHẬT GẦN NHẤT */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-5 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Thời gian AM cập nhật gần nhất:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {formatNoticeDate(noticeConfig.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Người phê duyệt:</span>
            <span className="text-orange-400 font-bold">{noticeConfig.sender}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">Phạm vi:</span>
            <span className="text-white font-semibold">5 Bưu cục trực thuộc</span>
          </div>
        </div>

        {/* MODAL BODY (TINH GỌN, THOÁNG ĐÃNG, DỄ ĐỌC) */}
        <div className="p-4 sm:p-5 md:p-6 text-slate-200 text-xs sm:text-sm md:text-[14.5px] leading-relaxed space-y-3.5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Lời chào mở đầu */}
          {noticeConfig.greeting && (
            <div className="bg-orange-950/35 border border-orange-500/30 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-slate-200 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-orange-400 text-sm sm:text-base inline">
                  {noticeConfig.greeting.split('!')[0] ? `${noticeConfig.greeting.split('!')[0]}! ` : ''}
                </p>
                <span className="text-slate-200 font-normal">
                  {noticeConfig.greeting.split('!').slice(1).join('!') || noticeConfig.greeting}
                </span>
              </div>
            </div>
          )}

          {/* HIỂN THỊ CÁC MỤC THÔNG BÁO TINH GỌN (CHIA 2 CỘT TỰ ĐỘNG CÂN XỨNG) */}
          {parsedSections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:gap-4 flex-1">
              {parsedSections.map((sec, idx) => {
                // Phối màu và icon theo loại khối
                let iconEl = <Info className="w-4 h-4 text-orange-400 shrink-0" />;
                let titleColor = 'text-orange-400';
                let borderColor = 'border-slate-800';

                if (sec.iconType === 'data') {
                  iconEl = <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />;
                  titleColor = 'text-orange-400';
                  borderColor = 'border-slate-800 hover:border-orange-500/40';
                } else if (sec.iconType === 'clock') {
                  iconEl = <Clock className="w-4 h-4 text-emerald-400 shrink-0" />;
                  titleColor = 'text-emerald-400';
                  borderColor = 'border-slate-800 hover:border-emerald-500/40';
                } else if (sec.iconType === 'lock') {
                  iconEl = <Lock className="w-4 h-4 text-rose-400 shrink-0" />;
                  titleColor = 'text-rose-400';
                  borderColor = 'border-slate-800 hover:border-rose-500/40';
                } else if (sec.iconType === 'goal') {
                  iconEl = <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />;
                  titleColor = 'text-amber-400';
                  borderColor = 'border-amber-600/35 hover:border-amber-500/50';
                }

                return (
                  <div 
                    key={sec.id || idx}
                    className={`bg-slate-950/65 border ${borderColor} rounded-2xl p-3.5 sm:p-4 space-y-2 transition-all flex flex-col justify-between`}
                  >
                    <div>
                      <div className={`flex items-center gap-2 ${titleColor} font-black text-xs sm:text-sm md:text-[14.5px] uppercase tracking-wide`}>
                        {iconEl}
                        <span>{sec.id}. {sec.title}</span>
                      </div>
                      
                      <ul className="space-y-1.5 pt-2 pl-1 text-slate-200">
                        {sec.items.map((it, itemIdx) => {
                          const cleanItem = it.replace(/^[\•\-\*]\s*/, '');
                          return (
                            <li key={itemIdx} className="flex items-start gap-2">
                              <span className="text-orange-500 font-bold shrink-0">&bull;</span>
                              <span className="leading-relaxed">
                                {cleanItem.includes(':') ? (
                                  <>
                                    <strong className="text-slate-100">{cleanItem.split(':')[0]}:</strong>
                                    <span>{cleanItem.slice(cleanItem.indexOf(':') + 1)}</span>
                                  </>
                                ) : (
                                  cleanItem
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Nếu người dùng nhập văn bản tự do không chia số thứ tự
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
              {noticeConfig.content}
            </div>
          )}

          {/* LỜI NHẮN KẾT */}
          {noticeConfig.closingGreeting && (
            <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-950/80 border border-amber-600/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300 text-xs sm:text-sm md:text-[14px]">
                  {noticeConfig.closingGreeting}
                </span>
              </div>
              <span className="font-black text-white text-right text-xs sm:text-sm md:text-[14px] uppercase tracking-wider shrink-0">
                TRÂN TRỌNG!
              </span>
            </div>
          )}

        </div>

        {/* MODAL FOOTER WITH NÚT ĐỒNG Ý */}
        <div className="bg-slate-950/95 border-t border-slate-800 px-5 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs sm:text-sm text-slate-300 text-center sm:text-left">
            <span>Bằng việc bấm <strong>"Đồng ý"</strong>, bạn xác nhận đã đọc, hiểu và cam kết tuân thủ các quy định vận hành trên.</span>
          </div>
          <button
            type="button"
            onClick={handleAgree}
            className="w-full sm:w-auto px-7 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isPreview ? 'Đóng chế độ xem trước' : 'Đồng ý & Bắt đầu sử dụng'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default StaffNoticeModal;
