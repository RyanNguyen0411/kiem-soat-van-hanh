import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Truck, 
  CheckCircle2, 
  ShoppingBag, 
  Flame, 
  Moon, 
  ArrowRight
} from 'lucide-react';
import { 
  convertSolar2Lunar, 
  getEventsForDate, 
  getEventsForMonth, 
  generateGeminiMarketAnalysis
} from '../../utils/lunarCalendar';
import type { CalendarEvent, LunarDate } from '../../utils/lunarCalendar';

interface OperationalCalendarDrawerProps {
  onOpenAiWithPrompt?: (prompt: string) => void;
}

export const OperationalCalendarDrawer: React.FC<OperationalCalendarDrawerProps> = ({ onOpenAiWithPrompt }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  // Current view year & month
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  
  // Tab view: 'grid' | 'timeline' | 'gemini_advisor'
  const [activeTab, setActiveTab] = useState<'grid' | 'timeline' | 'gemini_advisor'>('grid');
  
  // Selected event for Gemini detailed analysis
  const [selectedEventForAnalysis, setSelectedEventForAnalysis] = useState<CalendarEvent | null>(null);

  // Danh sách các sự kiện trong tháng đang chọn
  const monthEvents = useMemo(() => {
    return getEventsForMonth(viewMonth, viewYear);
  }, [viewMonth, viewYear]);

  // Sự kiện của ngày đang chọn
  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedDay, viewMonth, viewYear);
  }, [selectedDay, viewMonth, viewYear]);

  // Âm lịch của ngày đang chọn
  const selectedDayLunar: LunarDate = useMemo(() => {
    return convertSolar2Lunar(selectedDay, viewMonth, viewYear);
  }, [selectedDay, viewMonth, viewYear]);

  // Sự kiện nổi bật nhất trong tháng để AI phân tích
  const primaryMonthEvent = useMemo(() => {
    if (selectedEventForAnalysis) return selectedEventForAnalysis;
    // Tìm sự kiện extreme hoặc high đầu tiên
    const extreme = monthEvents.find(e => e.impactLevel === 'extreme');
    if (extreme) return extreme;
    const high = monthEvents.find(e => e.impactLevel === 'high');
    if (high) return high;
    return monthEvents[0] || null;
  }, [monthEvents, selectedEventForAnalysis]);

  // Phân tích của Gemini AI
  const geminiAnalysis = useMemo(() => {
    if (!primaryMonthEvent) return null;
    return generateGeminiMarketAnalysis(primaryMonthEvent);
  }, [primaryMonthEvent]);

  // Chuyển tháng
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDay(1);
    setSelectedEventForAnalysis(null);
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDay(1);
    setSelectedEventForAnalysis(null);
  };

  const handleGoToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
    setSelectedEventForAnalysis(null);
  };

  // Tính toán các ngày trong lưới tháng (Bắt đầu từ Thứ 2)
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 = CN, 1 = T2
    // Chuẩn hóa sang Thứ 2 là 0, CN là 6
    const startOffset = (firstDayIndex + 6) % 7;

    const days: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      lunar: LunarDate;
      events: CalendarEvent[];
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Ngày tháng trước điền vào
    const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevY = viewMonth === 1 ? viewYear - 1 : viewYear;
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        lunar: convertSolar2Lunar(d, prevM, prevY),
        events: getEventsForDate(d, prevM, prevY),
        isToday: false,
        isSelected: false
      });
    }

    // Ngày trong tháng
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && viewMonth === (today.getMonth() + 1) && viewYear === today.getFullYear();
      const isSelected = d === selectedDay;
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        lunar: convertSolar2Lunar(d, viewMonth, viewYear),
        events: getEventsForDate(d, viewMonth, viewYear),
        isToday,
        isSelected
      });
    }

    // Ngày tháng sau điền cho đủ 35 hoặc 42 ô
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextY = viewMonth === 12 ? viewYear + 1 : viewYear;
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        lunar: convertSolar2Lunar(d, nextM, nextY),
        events: getEventsForDate(d, nextM, nextY),
        isToday: false,
        isSelected: false
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDay, today]);

  // Sự kiện đợt Mega Sale gần nhất sắp tới
  const upcomingBigSale = useMemo(() => {
    return monthEvents.find(e => e.impactLevel === 'extreme' || e.impactLevel === 'high') || null;
  }, [monthEvents]);

  const handleOpenAi = (prompt: string) => {
    if (onOpenAiWithPrompt) {
      onOpenAiWithPrompt(prompt);
    } else {
      window.dispatchEvent(new CustomEvent('open-gemini-ai', { detail: { prompt } }));
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* =========================================================================
          1. NÚT BẤM FLOATING CALENDAR ACTION BUTTON (KÍCH THƯỚC CHUẨN 34PX)
          Xếp ngay ngắn phía trên nút Cố Vấn AI, không đè chéo, không che menu đáy
          ========================================================================= */}
      <div className="fixed right-3 bottom-[160px] sm:bottom-[116px] lg:right-6 lg:bottom-[116px] z-40 flex items-center group pointer-events-auto">
        {/* Tooltip khi hover */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[11px] font-bold shadow-lg backdrop-blur-md border border-cyan-500/40 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-2 group-hover:translate-x-0 whitespace-nowrap">
          <CalendarIcon className="w-3 h-3 text-cyan-400" />
          <span>Lịch TMĐT &amp; Âm Dương</span>
          {upcomingBigSale && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
              Sale {upcomingBigSale.name.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Nút bấm tròn 34px đồng bộ với AI và Tìm kiếm */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] sm:w-[38px] sm:h-[38px] rounded-full relative bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border border-white/80 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center"
          title="Mở Lịch Vận Hành TMĐT & Âm Dương Long An"
          aria-label="Mở Lịch Vận Hành TMĐT & Âm Dương Long An"
        >
          <CalendarIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white stroke-[2.2]" />
          
          {/* Chấm thông báo Mega Sale */}
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-rose-500 to-amber-500 border border-white" />
          </span>
        </button>
      </div>

      {/* =========================================================================
          2. SLIDE-OVER DRAWER LỊCH VẬN HÀNH & TMĐT MEGA SALE
          ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop mờ */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6 lg:pl-10">
            <div className="w-screen max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 h-full">
              
              {/* HEADER DRAWER - THU GỌN GỌN GÀNG */}
              <div className="px-3 py-2 sm:px-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-xs shrink-0">
                    <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-xs font-black uppercase tracking-wide text-white truncate">
                        LỊCH VẬN HÀNH LONG AN &amp; SỰ KIỆN TMĐT
                      </h2>
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-cyan-600 text-white">
                        Âm - Dương - Shopee - TikTok
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                      <span className="text-orange-400 font-bold">AM Huy (ĐNB)</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-0.5 text-cyan-300 font-medium">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> Cố vấn Google Gemini AI
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Đóng lịch"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MONTH / YEAR NAVIGATOR BAR - THU GỌN SIÊU NHỎ */}
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-xs shrink-0">
                {/* Bộ điều hướng tháng/năm */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Tháng trước"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>

                  <div className="flex items-center gap-1">
                    <select
                      value={viewMonth}
                      onChange={e => {
                        setViewMonth(Number(e.target.value));
                        setSelectedDay(1);
                      }}
                      className="h-6 px-1.5 font-black text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>

                    <select
                      value={viewYear}
                      onChange={e => {
                        setViewYear(Number(e.target.value));
                        setSelectedDay(1);
                      }}
                      className="h-6 px-1.5 font-black text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Tháng sau"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToday}
                    className="h-6 px-1.5 rounded font-bold text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                  >
                    Hôm Nay
                  </button>
                </div>

                {/* Phím tắt Mega Sale trong tháng */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                  <span className="text-[9.5px] text-slate-400 font-bold hidden sm:inline">Event:</span>
                  {monthEvents.filter(e => e.type === 'shopee_mega' || e.type === 'tiktok_mega' || e.type === 'mid_month' || e.type === 'payday').slice(0, 4).map(ev => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        const [d] = ev.dateStr.split('/').map(Number);
                        setSelectedDay(d);
                        setSelectedEventForAnalysis(ev);
                        setActiveTab('grid');
                      }}
                      className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {ev.name.slice(0, 14)}..
                    </button>
                  ))}
                </div>
              </div>

              {/* TABS SWITCHER: LƯỚI LỊCH / TIMELINE / GEMINI AI - THU GỌN */}
              <div className="px-3 pt-1 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('grid')}
                    className={`pb-1.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'grid'
                        ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    <span>Lưới Lịch Tổng Quát</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={`pb-1.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'timeline'
                        ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Sự Kiện &amp; Dự Báo ({monthEvents.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('gemini_advisor')}
                    className={`pb-1.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'gemini_advisor'
                        ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Cố Vấn Gemini AI</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 hidden sm:inline">
                  {selectedDay}/{viewMonth}/{viewYear} &bull; <strong className="text-purple-600 dark:text-purple-400">{selectedDayLunar.lunarString}</strong> ({selectedDayLunar.canChiDay})
                </div>
              </div>

              {/* BODY NỘI DUNG TỔNG QUÁT (TỐI ƯU KHÔNG CẦN TRƯỢT TRÊN MÀN HÌNH CHUẨN) */}
              <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2.5">
                
                {/* =========================================================================
                    TAB 1: LƯỚI LỊCH THÁNG (BỐ CỤC 2 CỘT SONG SONG: LỊCH TRÁI + DỰ BÁO PHẢI)
                    GIÚP NHÌN TỔNG QUÁT NGAY MÀ KHÔNG PHẢI CUỘN TRƯỢT
                    ========================================================================= */}
                {activeTab === 'grid' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
                    
                    {/* CỘT TRÁI: LƯỚI LỊCH THÁNG THU GỌN (LG: 7 CỘT) */}
                    <div className="lg:col-span-7 xl:col-span-7 space-y-1.5">
                      <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                        {/* Tiêu đề 7 thứ */}
                        <div className="grid grid-cols-7 text-center font-extrabold text-[10px] sm:text-[10.5px] py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <span>T2</span>
                          <span>T3</span>
                          <span>T4</span>
                          <span>T5</span>
                          <span>T6</span>
                          <span className="text-amber-600">T7</span>
                          <span className="text-rose-600">CN</span>
                        </div>

                        {/* Các ô ngày thu gọn: Chiều cao chỉ 42px - 46px, vừa vặn toàn bộ 5-6 tuần */}
                        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                          {calendarGrid.map((item, idx) => {
                            const hasEvent = item.events.length > 0;
                            const hasMega = item.events.some(e => e.impactLevel === 'extreme');
                            const hasHigh = item.events.some(e => e.impactLevel === 'high');
                            const isRamOrMung1 = item.lunar.day === 1 || item.lunar.day === 15;
                            const mainEvent = item.events[0];

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (item.isCurrentMonth) {
                                    setSelectedDay(item.dayNumber);
                                    if (item.events.length > 0) {
                                      setSelectedEventForAnalysis(item.events[0]);
                                    }
                                  }
                                }}
                                className={`p-1 h-[42px] sm:h-[46px] flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                                  !item.isCurrentMonth
                                    ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-25'
                                    : item.isSelected
                                    ? 'bg-cyan-50 dark:bg-cyan-950/60 ring-2 ring-cyan-500 z-10'
                                    : item.isToday
                                    ? 'bg-amber-50/70 dark:bg-amber-950/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                }`}
                              >
                                {/* Header ngày: Số Dương bên trái, Số Âm bên phải */}
                                <div className="flex items-baseline justify-between leading-none">
                                  <span className={`text-[11px] font-black font-mono leading-none ${
                                    item.isToday
                                      ? 'w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[9.5px]'
                                      : item.isSelected
                                      ? 'text-cyan-600 dark:text-cyan-400 font-black'
                                      : 'text-slate-800 dark:text-slate-100'
                                  }`}>
                                    {item.dayNumber}
                                  </span>

                                  <span className={`text-[8px] sm:text-[8.5px] font-semibold leading-none ${
                                    isRamOrMung1
                                      ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                      : 'text-slate-400 dark:text-slate-500'
                                  }`}>
                                    {item.lunar.day === 1 ? `${item.lunar.day}/${item.lunar.month}` : item.lunar.day}
                                  </span>
                                </div>

                                {/* Event Micro-Badge hoặc nhãn Âm lịch */}
                                <div className="min-h-[14px] flex items-center">
                                  {mainEvent ? (
                                    <div
                                      className={`text-[7.5px] sm:text-[8px] font-extrabold px-1 py-0.2 rounded truncate leading-tight w-full flex items-center gap-0.5 ${
                                        mainEvent.impactLevel === 'extreme'
                                          ? 'bg-rose-600 text-white'
                                          : mainEvent.platform === 'Shopee'
                                          ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                                          : mainEvent.platform === 'TikTok Shop'
                                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                      }`}
                                      title={mainEvent.name}
                                    >
                                      {mainEvent.impactLevel === 'extreme' && <Flame className="w-2 h-2 shrink-0 animate-pulse" />}
                                      <span className="truncate">{mainEvent.name.replace(/^[^\w\s]+/, '').trim()}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between w-full text-[7.5px] text-slate-400">
                                      {isRamOrMung1 ? (
                                        <span className="text-purple-600 dark:text-purple-400 font-bold">
                                          {item.lunar.day === 1 ? 'Mùng 1' : 'Rằm'}
                                        </span>
                                      ) : (
                                        <span className="opacity-0">.</span>
                                      )}
                                      <div className="flex gap-0.5 ml-auto">
                                        {hasMega ? (
                                          <span className="w-1 h-1 rounded-full bg-rose-600" />
                                        ) : hasHigh ? (
                                          <span className="w-1 h-1 rounded-full bg-amber-500" />
                                        ) : hasEvent ? (
                                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                        ) : null}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Chấm trạng thái nhỏ ở đáy nếu có nhiều sự kiện */}
                                {mainEvent && (
                                  <div className="flex items-center justify-between leading-none -mt-0.5">
                                    <div className="flex gap-0.5">
                                      {hasMega ? (
                                        <span className="w-1 h-1 rounded-full bg-rose-600" />
                                      ) : hasHigh ? (
                                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                                      ) : (
                                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                      )}
                                      {item.events.length > 1 && (
                                        <span className="text-[7px] text-slate-400 font-bold">+{item.events.length - 1}</span>
                                      )}
                                    </div>
                                    {isRamOrMung1 && (
                                      <span className="text-[7px] text-purple-600 dark:text-purple-400 font-bold">
                                        {item.lunar.day === 1 ? 'M.1' : 'Rằm'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Chú thích màu sắc nhỏ gọn dưới lịch */}
                      <div className="flex flex-wrap items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block"></span> Mega Sale</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span> Shopee</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span> TikTok Shop</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Lễ / Nghỉ</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span> Mùng 1 / Rằm</span>
                        </div>
                        <span className="italic text-[8.5px] text-cyan-600 dark:text-cyan-400 font-medium hidden sm:inline">Nhấn ngày để xem dự báo bên phải</span>
                      </div>
                    </div>

                    {/* CỘT PHẢI: CHI TIẾT NGÀY ĐANG CHỌN & DỰ BÁO SÓNG HÀNG (LG: 5 CỘT, HIỂN THỊ SONG SONG KHÔNG CẦN TRƯỢT) */}
                    <div className="lg:col-span-5 xl:col-span-5 space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                        {/* Header Ngày */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-cyan-600 text-white font-mono font-black text-[11px]">
                              {selectedDay}/{viewMonth}
                            </div>
                            <div>
                              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                                Ngày {selectedDay}/{viewMonth}/{viewYear}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Moon className="w-2.5 h-2.5 text-purple-500" />
                                <span>Âm Lịch: <strong>{selectedDayLunar.lunarString}</strong> ({selectedDayLunar.canChiDay})</span>
                              </div>
                            </div>
                          </div>

                          {selectedDayEvents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventForAnalysis(selectedDayEvents[0]);
                                setActiveTab('gemini_advisor');
                              }}
                              className="px-2 py-0.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                              <span>Gemini Cố Vấn</span>
                            </button>
                          )}
                        </div>

                        {/* Danh sách sự kiện ngày này */}
                        {selectedDayEvents.length === 0 ? (
                          <div className="py-2.5 text-center text-[11px] text-slate-500 space-y-1">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              Ngày vận hành tiêu chuẩn
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Không có đợt Mega Sale sàn TMĐT. Duy trì nhịp giao phát ổn định, kiểm soát tỷ lệ GTC &ge; 92% tại 5 bưu cục.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {selectedDayEvents.map(ev => (
                              <div 
                                key={ev.id}
                                className={`p-2 rounded-lg border text-xs space-y-1.5 ${
                                  ev.impactLevel === 'extreme'
                                    ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1 text-slate-900 dark:text-white font-extrabold text-[11px]">
                                    {ev.impactLevel === 'extreme' && <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />}
                                    {ev.name}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                    ev.impactLevel === 'extreme'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                  }`}>
                                    {ev.impactLevel === 'extreme' ? 'MEGA SALE' : 'TẢI CAO'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-100/70 dark:bg-slate-750 p-1.5 rounded font-mono">
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Dự Báo Lấy:</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400">{ev.surgeForecast.pickupSurge}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Dự Báo Giao:</span>
                                    <strong className="text-rose-600 dark:text-rose-400">{ev.surgeForecast.deliverySurge}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Đỉnh Giao D+3:</span>
                                    <strong className="text-indigo-600 dark:text-indigo-400 truncate block">{ev.surgeForecast.peakDeliveryDate}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Điểm Nóng:</span>
                                    <strong className="text-orange-600 dark:text-orange-400 truncate block">Phước Lý, Rạch Kiến</strong>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal">
                                  <strong className="text-orange-600 font-bold">Chỉ đạo AM Huy: </strong>
                                  {ev.surgeForecast.actionPlan}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bảng mini dự báo 5 bưu cục Long An */}
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            <span className="flex items-center gap-1">
                              <Truck className="w-3 h-3 text-cyan-600" />
                              Dự Báo 5 Bưu Cục Long An:
                            </span>
                            <span className="text-slate-400 text-[9px]">Khu vực Long An</span>
                          </div>

                          <div className="grid grid-cols-5 gap-1 text-[9px] text-center">
                            <div className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                              <span className="text-slate-500 block truncate font-medium">Cần Đước 1</span>
                              <strong className="text-slate-800 dark:text-slate-200 block font-mono">1.9k</strong>
                            </div>
                            <div className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                              <span className="text-slate-500 block truncate font-medium">Cần Giuộc</span>
                              <strong className="text-slate-800 dark:text-slate-200 block font-mono">2.4k</strong>
                            </div>
                            <div className="p-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                              <span className="text-rose-600 block truncate font-bold">Phước Lý</span>
                              <strong className="text-rose-600 block font-mono">3.2k</strong>
                            </div>
                            <div className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                              <span className="text-amber-700 block truncate font-bold">Rạch Kiến</span>
                              <strong className="text-amber-700 block font-mono">2.8k</strong>
                            </div>
                            <div className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                              <span className="text-slate-500 block truncate font-medium">Tầm Vu</span>
                              <strong className="text-slate-800 dark:text-slate-200 block font-mono">1.6k</strong>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                )}

                {/* =========================================================================
                    TAB 2: DANH SÁCH SỰ KIỆN & DỰ BÁO SÓNG HÀNG (TIMELINE VIEW - THU GỌN)
                    ========================================================================= */}
                {activeTab === 'timeline' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pb-0.5">
                      <span>Tổng cộng <strong>{monthEvents.length}</strong> sự kiện &amp; kỳ sale trong Tháng {viewMonth}/{viewYear}</span>
                      <span className="text-cyan-600 font-bold">Đã đồng bộ Shopee &amp; TikTok Shop</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {monthEvents.map((ev, i) => (
                        <div 
                          key={ev.id || i}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:shadow-xs transition-all space-y-1.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-black">
                                {ev.dateStr}
                              </span>
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                                {ev.name}
                              </h4>
                            </div>

                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                              ev.impactLevel === 'extreme'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {ev.platform}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]">
                            <div>
                              <span className="text-slate-400 block text-[9px]">Sóng Lấy:</span>
                              <strong className="text-emerald-600">{ev.surgeForecast.pickupSurge}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">Sóng Giao:</span>
                              <strong className="text-rose-600">{ev.surgeForecast.deliverySurge}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px]">Quá Tải:</span>
                              <strong className="text-orange-600 truncate block">Phước Lý</strong>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                            <span className="font-bold text-slate-700 dark:text-slate-200">Chỉ đạo: </span>
                            {ev.surgeForecast.actionPlan}
                          </div>

                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventForAnalysis(ev);
                                setActiveTab('gemini_advisor');
                              }}
                              className="text-[10.5px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Cố Vấn Gemini AI</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    TAB 3: CỐ VẤN GOOGLE GEMINI AI ĐỐI CHIẾU THỊ TRƯỜNG THỰC TẾ (THU GỌN)
                    ========================================================================= */}
                {activeTab === 'gemini_advisor' && geminiAnalysis && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    
                    {/* Header phân tích sự kiện */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-orange-100 text-[11px] font-bold">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" />
                          CỐ VẤN CHIẾN LƯỢC GOOGLE GEMINI AI
                        </span>
                        <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[9px] font-black">
                          Thị Trường &amp; TMĐT
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                        {geminiAnalysis.eventTitle}
                      </h3>
                      <p className="text-[10.5px] text-orange-100/90 leading-snug">
                        {geminiAnalysis.marketContext}
                      </p>
                    </div>

                    {/* So sánh chiến lược 2 sàn Shopee vs TikTok Shop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Cột Shopee */}
                      <div className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 space-y-1">
                        <div className="font-extrabold text-orange-700 dark:text-orange-400 flex items-center gap-1 text-[11px]">
                          <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                          Chiến Lược Sàn Shopee:
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-snug text-[10.5px]">
                          {geminiAnalysis.shoPeeStrategy}
                        </p>
                      </div>

                      {/* Cột TikTok Shop */}
                      <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 space-y-1">
                        <div className="font-extrabold text-purple-700 dark:text-purple-400 flex items-center gap-1 text-[11px]">
                          <Flame className="w-3.5 h-3.5 text-pink-600" />
                          Chiến Lược TikTok Shop:
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-snug text-[10.5px]">
                          {geminiAnalysis.tikTokStrategy}
                        </p>
                      </div>
                    </div>

                    {/* Dự báo sản lượng & số lượng CTV cần thuê cho 5 bưu cục Long An */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
                        <h4 className="font-black text-xs uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-indigo-600" />
                          Dự Báo Sản Lượng &amp; Bổ Sung CTV 5 Bưu Cục Long An
                        </h4>
                        <span className="text-[9.5px] text-slate-400 font-bold">
                          Đỉnh sóng giao D+2 đến D+5
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10.5px]">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-700 dark:text-slate-200">
                            <tr>
                              <th className="p-1.5">Bưu Cục</th>
                              <th className="p-1.5 text-right">Dự Báo Đơn/Ngày</th>
                              <th className="p-1.5 text-right">Tăng Trưởng</th>
                              <th className="p-1.5 text-center">Thuê CTV</th>
                              <th className="p-1.5">Nguy Cơ Quá Tải</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10.5px]">
                            {geminiAnalysis.areaBranchForecast.map(b => (
                              <tr key={b.branch} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <td className="p-1.5 font-bold text-slate-900 dark:text-white">
                                  {b.branch}
                                </td>
                                <td className="p-1.5 text-right font-mono font-black text-rose-600">
                                  {b.expectedDailyVolume.toLocaleString('vi-VN')}
                                </td>
                                <td className="p-1.5 text-right font-mono font-bold text-indigo-600">
                                  {b.growthRate}
                                </td>
                                <td className="p-1.5 text-center">
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    +{b.recommendedStaffCTV} CTV
                                  </span>
                                </td>
                                <td className="p-1.5 text-slate-500 dark:text-slate-400 text-[10px]">
                                  {b.pressurePoint}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Kế hoạch hành động chi tiết dành cho AM Huy */}
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2">
                      <div className="font-extrabold text-[11px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Checklist 5 Chỉ Đạo Vận Hành Của AM Huy (ĐNB):
                      </div>
                      <ul className="space-y-1 text-[10.5px] text-slate-300 leading-snug">
                        {geminiAnalysis.amActionChecklist.map((act, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Nút gửi sang Gemini Copilot */}
                      <div className="pt-1.5 border-t border-slate-800 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenAi(
                              `Phân tích sâu chiến lược điều phối xe tải và nhân sự cho sự kiện ${geminiAnalysis.eventTitle} tại 5 bưu cục Long An: (LAN) Phước Lý, (LAN) Rạch Kiến, (LAN) Cần Giuộc, (LAN) Cần Đước 1, (LAN) Tầm Vu. Đưa ra kịch bản giải phóng kho Ca 2 từ 18h30 đến 21h00 và kế hoạch quản trị rủi ro dòng tiền COD.`
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-white animate-pulse" />
                          <span>Mở Gemini Copilot Thảo Luận Sâu Hơn</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* FOOTER DRAWER - THU GỌN */}
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-500 shrink-0">
                <div className="flex items-center gap-1">
                  <span>Hệ thống dự báo: </span>
                  <strong className="text-slate-800 dark:text-slate-200 font-medium">GHN Operation Forecast 2026</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer text-[10px]"
                >
                  Đóng Lịch
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
