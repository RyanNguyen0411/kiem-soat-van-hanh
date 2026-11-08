import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  Bot, 
  Key, 
  Copy, 
  Check, 
  HelpCircle,
  Building2,
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  buildOperationalContext, 
  askGeminiAPI, 
  generateLocalOperationalIntelligence 
} from '../../services/geminiService';
import type { ChatMessage } from '../../services/geminiService';

// =========================================================================
// BỘ RENDER MARKDOWN CHUYÊN NGHIỆP: BẢNG BIỂU, TIÊU ĐỀ, BULLET & KHÔNG LỖI KÝ TỰ
// =========================================================================
const FormattedMessage: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  if (isUser) {
    return <div className="font-sans text-xs sm:text-sm leading-relaxed">{text}</div>;
  }

  // Phân tích các khối văn bản (Tables, Headers, Lists, Paragraphs)
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (keyPrefix: string) => {
    if (tableBuffer.length < 2) {
      tableBuffer = [];
      inTable = false;
      return;
    }

    const headerLine = tableBuffer[0];
    const bodyLines = tableBuffer.slice(2); // Bỏ qua dòng header và dòng | :--- |

    const headers = headerLine.split('|').map(c => c.trim()).filter(Boolean);

    elements.push(
      <div key={`table-${keyPrefix}`} className="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold border-b border-purple-100 dark:border-slate-700">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="py-2 px-3 text-center sm:text-left font-bold">
                  {renderInlineText(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {bodyLines.map((row, rIdx) => {
              const cells = row.split('|').map(c => c.trim()).filter(Boolean);
              if (cells.length === 0) return null;
              return (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-slate-800 dark:text-slate-200">
                      {renderInlineText(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    tableBuffer = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Phát hiện dòng bảng (bắt đầu và kết thúc bằng |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable(`line-${i}`);
    }

    // Tiêu đề H3: ###
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs sm:text-sm font-black text-purple-700 dark:text-purple-300 mt-3 mb-1.5 uppercase tracking-wide flex items-center gap-1.5 border-b border-purple-100 dark:border-purple-900/60 pb-1">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <span>{renderInlineText(trimmed.replace(/^###\s+/, ''))}</span>
        </h3>
      );
      continue;
    }

    // Tiêu đề H4: ####
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className="text-xs font-extrabold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          <span>{renderInlineText(trimmed.replace(/^####\s+/, ''))}</span>
        </h4>
      );
      continue;
    }

    // Đường kẻ ngang: ---
    if (trimmed === '---') {
      elements.push(<hr key={i} className="my-2 border-slate-200 dark:border-slate-700/80" />);
      continue;
    }

    // Bullet items: - hoặc * hoặc •
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const content = trimmed.replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 pl-1 text-[11.5px] leading-relaxed">
          <span className="text-purple-500 font-bold mt-0.5 shrink-0">&bull;</span>
          <span className="text-slate-700 dark:text-slate-300">{renderInlineText(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered items: 1. 2. 3.
    const numMatch = trimmed.match(/^([0-9]+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 pl-1 text-[11.5px] leading-relaxed">
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="text-slate-700 dark:text-slate-300">{renderInlineText(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Dòng trống
    if (!trimmed) {
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    // Đoạn văn thông thường
    elements.push(
      <p key={i} className="my-1 text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInlineText(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable('end');
  }

  return <div className="space-y-0.5">{elements}</div>;
};

// Hàm xử lý bold text (**...**) và nhãn cảnh báo
function renderInlineText(raw: string): React.ReactNode {
  if (!raw) return '';

  // Tách các đoạn in đậm **text**
  const parts = raw.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {boldText}
        </strong>
      );
    }
    return part;
  });
}

export const GeminiAiDrawer: React.FC = () => {
  const { dataset } = useDashboard();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('ghn_gemini_api_key') || '';
  });
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tin nhắn mở đầu chuẩn hóa cho AM Huy (ĐNB) với 5 bưu cục chính thức
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      sender: 'gemini',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      text: `### 🎯 XIN CHÀO QUẢN LÝ AM HUY (ĐNB)
Tôi là **GHN Gemini AI Area Copilot** - Cố vấn Trưởng Vận Hành Cấp Cao của khu vực Long An.

Dữ liệu thời gian thực đã được nạp sẵn sàng:
- **5 Bưu cục chính thức:** (LAN) Cần Đước 1, (LAN) Cần Giuộc, (LAN) Phước Lý, (LAN) Rạch Kiến, (LAN) Tầm Vu.
- **81 Nhân sự:** Gồm bưu tá giao (NVPTTT), nhân viên chuyên lấy hàng tại Rạch Kiến (Võ Hoàng Phúc & Lương Tuấn Minh) và nhân viên xử lý kho tại Tầm Vu (Trần Trọng Phú).
- **10.928 Đơn tồn GLT:** Sàn TikTok Shop ~4.485 đơn (41%), Shopee ~4.082 đơn (37.4%), 167 đơn quá hạn > 120h.
- **284 Đơn tồn Luân chuyển (LC).**

AM Huy cần tôi đưa ra góc nhìn phân tích điểm nghẽn, kế hoạch giải tỏa tồn kho, hay phương án thúc đẩy Ca 2 cho bưu cục nào hôm nay?`
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      setIsOpen(true);
      if (e?.detail?.prompt) {
        setInputPrompt(e.detail.prompt);
      }
    };
    window.addEventListener('open-gemini-ai', handleCustomOpen as EventListener);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-gemini-ai', handleCustomOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSaveApiKey = (keyVal: string) => {
    setApiKey(keyVal);
    localStorage.setItem('ghn_gemini_api_key', keyVal.trim());
    setShowKeyConfig(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const operationalContext = buildOperationalContext(dataset);
      let aiResponseText = '';

      if (apiKey.trim()) {
        aiResponseText = await askGeminiAPI(text, operationalContext, apiKey);
      } else {
        await new Promise(r => setTimeout(r, 700)); // Nhịp phân tích tự nhiên
        aiResponseText = generateLocalOperationalIntelligence(text, dataset);
      }

      const geminiMsg: ChatMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, geminiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `gemini-error-${Date.now()}`,
        sender: 'gemini',
        text: `### ⚠️ THÔNG BÁO KẾT NỐI GEMINI\n\n${err.message || 'Không thể liên lạc máy chủ Gemini.'}\n\n*Hệ thống đã tự động chuyển sang Chế độ Phân tích Vận hành Chuyên Sâu Nội Bộ để phục vụ AM Huy.*`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'gemini',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        text: `### 🔄 PHIÊN TƯ VẤN ĐÃ ĐƯỢC LÀM MỚI\nTôi đã sẵn sàng đồng hành cùng **AM Huy (ĐNB)** giải quyết các bài toán vận hành tiếp theo trên 5 bưu cục Long An.`
      }
    ]);
  };

  // Gợi ý câu hỏi chuẩn Data Analyst & Vận hành
  const quickPrompts = [
    {
      title: 'Giải tỏa điểm nghẽn Rạch Kiến & Hàng Sàn TTS',
      icon: AlertTriangle,
      prompt: 'Phân tích điểm nghẽn tại bưu cục Rạch Kiến (4.428 đơn tồn GLT, 1.672 đơn TikTok Shop, 2 nhân viên chuyên lấy). Đưa ra phương án điều phối ca 2 và giảm tải áp lực SLA.'
    },
    {
      title: 'Chiến lược thúc đẩy Ca 2 bưu cục Cần Giuộc',
      icon: TrendingUp,
      prompt: 'Phân tích thực trạng bưu cục Cần Giuộc (tỷ lệ ca 2 thấp chỉ 51.5%, 227 ca chỉ đi 1 chuyến). Lập kế hoạch 24h xuất bến ca chiều để giải phóng 2.230 đơn tồn.'
    },
    {
      title: 'Xử lý 167 đơn khẩn cấp quá hạn > 120H',
      icon: Package,
      prompt: 'Quy trình tác chiến dọn dẹp dứt điểm 167 đơn khẩn cấp quá hạn lưu kho > 120h để tránh vi phạm bồi thường SLA đối tác.'
    },
    {
      title: 'Đánh giá năng suất bưu tá & Quỹ lương hoa hồng',
      icon: Building2,
      prompt: 'Phân tích tương quan giữa số chuyến đi ca 2 với tỷ lệ % GTC và mức thu nhập hoa hồng ngày của bưu tá. Đề xuất chính sách tạo động lực.'
    }
  ];

  return (
    <>
      {/* 1. Nút bấm AI Copilot Nổi ở góc dưới bên phải (Thu gọn siêu nhỏ, xếp ngay ngắn trên nút Tìm kiếm, không che menu) */}
      <div className="floating-ai-btn fixed right-3 bottom-[114px] sm:bottom-[70px] lg:right-6 lg:bottom-[70px] z-40 flex items-center group">
        <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[11px] font-bold shadow-lg backdrop-blur-md border border-purple-500/40 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-2 group-hover:translate-x-0">
          <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
          <span>Cố Vấn AI</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="floating-action-circle w-[34px] h-[34px] min-w-[34px] min-h-[34px] sm:w-[38px] sm:h-[38px] rounded-full relative bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border border-white/80 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/40 flex items-center justify-center"
          title="Mở Trợ Lý Cố Vấn AI (Ctrl+J)"
          aria-label="Mở Trợ Lý Cố Vấn AI"
        >
          <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white stroke-[2.2]" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-pink-500 to-rose-500 border border-white" />
          </span>
        </button>
      </div>

      {/* 2. Slide-Over Drawer Cố Vấn AI (Tối ưu responsive Phone, iPad, Laptop) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel: w-full on mobile, max-w-xl on desktop */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen sm:max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250">
              
              {/* Header Drawer */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white border-b border-purple-800/40 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase font-sans">
                          GHN Gemini AI Area Copilot
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                          v2.5 Live
                        </span>
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] text-purple-200/80 font-medium">
                        Phục vụ trực tiếp: <strong className="text-white underline decoration-purple-400">AM Huy (ĐNB)</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKeyConfig(prev => !prev)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        apiKey 
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900/60' 
                          : 'bg-purple-900/60 text-purple-300 border border-purple-700/60 hover:bg-purple-800/60'
                      }`}
                      title={apiKey ? 'Gemini API Key Đã Kết Nối' : 'Cấu hình Gemini API Key'}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{apiKey ? 'Đã Nối Key' : 'Nhập Key'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetChat}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Làm mới cuộc trò chuyện"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Đóng (ESC)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hộp cấu hình API Key */}
              {showKeyConfig && (
                <div className="p-3 bg-purple-50 dark:bg-slate-800/90 border-b border-purple-200 dark:border-slate-700 shrink-0 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-200">
                    <span>Cấu hình Google Gemini API Key</span>
                    <button 
                      onClick={() => setShowKeyConfig(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Dán AI Studio Gemini Key..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveApiKey(apiKey)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                    >
                      Lưu
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    * Nếu không có API Key, hệ thống tự động kích hoạt Bộ não Phân tích Vận hành Chuyên sâu Nội bộ với 100% dữ liệu thực tế.
                  </p>
                </div>
              )}

              {/* Danh Sách Tin Nhắn Hội Thoại */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 text-xs">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="font-bold text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                          {isUser ? 'AM Huy (ĐNB)' : 'GHN Gemini AI Area Copilot'}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>

                      <div className={`relative w-full sm:max-w-[94%] rounded-2xl p-3 sm:p-4 shadow-sm leading-relaxed ${
                        isUser 
                          ? 'bg-purple-600 text-white rounded-tr-xs' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
                      }`}>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Sao chép câu trả lời"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <FormattedMessage text={msg.text} isUser={isUser} />
                      </div>
                    </div>
                  );
                })}

                {/* Trạng thái Loading khi AI đang phân tích */}
                {isLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 sm:p-3.5 shadow-sm max-w-[90%] space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Gemini AI đang phân tích dữ liệu chuyên sâu...</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        Đang đối chiếu 5 bưu cục, 81 nhân sự và 10.928 vận đơn tồn để đưa ra khuyến nghị thực thi chuẩn xác.
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Gợi Ý Câu Hỏi Mẫu Nhanh */}
              <div className="p-2.5 sm:p-3 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-purple-500" />
                    Gợi Ý Phân Tích Chuyên Sâu Nhanh:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {quickPrompts.map((q, idx) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(q.prompt)}
                        className="text-left p-1.5 sm:p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all text-[10.5px] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 hover:shadow-2xs cursor-pointer group"
                      >
                        <Icon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="truncate">{q.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Form gửi câu hỏi */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Hỏi bất kỳ chỉ số, bưu cục, bưu tá hay điểm nghẽn nào..."
                    className="flex-1 max-h-24 min-h-[38px] p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />

                  <button
                    type="submit"
                    disabled={!inputPrompt.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold transition-all shadow-md shrink-0 cursor-pointer"
                    title="Gửi câu hỏi"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
