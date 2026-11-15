import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Lock, 
  HeartHandshake,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StaffNoticeModal: React.FC = () => {
  const { currentUser, isNoticeAcknowledged, acknowledgeNotice } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';

  const [manualOpen, setManualOpen] = useState<boolean>(false);

  useEffect(() => {
    // Lắng nghe sự kiện nếu người dùng bấm xem lại thông báo hướng dẫn từ Header
    const handleReopen = () => setManualOpen(true);
    window.addEventListener('open-staff-notice-modal', handleReopen);
    return () => window.removeEventListener('open-staff-notice-modal', handleReopen);
  }, []);

  // Bắt buộc hiển thị khi là nhân viên và chưa bấm đồng ý trong lượt đăng nhập này, hoặc chủ động mở lại
  const isOpen = isStaff && (!isNoticeAcknowledged || manualOpen);

  const handleAgree = () => {
    acknowledgeNotice();
    setManualOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
      style={{ backdropFilter: 'blur(20px)' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Khung thông báo mở rộng theo kích thước khung đỏ của AM Huy (~94vw, max 1550px) */}
      <div className="w-[94vw] max-w-[1550px] max-h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border-orange-500/40">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 px-5 sm:px-6 py-3.5 text-white shrink-0 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm shadow-inner shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-black tracking-widest text-orange-200 uppercase leading-none">
                GHN CONTROL CENTER &bull; PHÂN HỆ VẬN HÀNH BƯU CỤC
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight uppercase leading-tight text-white mt-1">
                THÔNG BÁO &bull; HƯỚNG DẪN SỬ DỤNG DASHBOARD VẬN HÀNH
              </h2>
            </div>
          </div>
          {manualOpen && isNoticeAcknowledged && (
            <button
              onClick={() => setManualOpen(false)}
              className="text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              ✕ Đóng
            </button>
          )}
        </div>

        {/* MODAL BODY (Kích thước chữ lớn hơn, phân bổ 2 cột cân đối và dễ đọc) */}
        <div className="p-4 sm:p-5 md:p-6 text-slate-200 text-xs sm:text-sm md:text-[14.5px] leading-relaxed space-y-3.5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Lời chào đầu */}
          <div className="bg-orange-950/35 border border-orange-500/30 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-slate-200">
            <p className="font-bold text-orange-400 text-sm sm:text-base inline">
              Chào mừng anh em đến với Dashboard Vận hành!{' '}
            </p>
            <span className="text-slate-200 font-normal">
              Dashboard được xây dựng nhằm hỗ trợ anh em theo dõi tình hình hoạt động, kiểm soát dữ liệu và nâng cao hiệu quả quản lý vận hành tại bưu cục. Trước khi truy cập và sử dụng Dashboard, mọi người vui lòng dành ít phút đọc và lưu ý các thông tin sau:
            </span>
          </div>

          {/* 2 Cột song song: Cột 1 (Mục 1, 2, 4) & Cột 2 (Mục 3, 5) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:gap-5 flex-1">
            
            {/* Cột 1 (Trái): Mục 1, Mục 2, Mục 4 */}
            <div className="space-y-3.5 flex flex-col justify-between">
              
              {/* 1. NGUỒN DỮ LIỆU */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-orange-400 font-black text-xs sm:text-sm md:text-[15px] uppercase">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>1. NGUỒN DỮ LIỆU</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                  <li>
                    Dữ liệu trên Dashboard được tổng hợp và cập nhật dựa trên nguồn dữ liệu gốc do <strong>AM Huy</strong> cung cấp.
                  </li>
                  <li>
                    Các chỉ số hiển thị phụ thuộc vào tính chính xác và thời điểm ghi nhận của dữ liệu nguồn.
                  </li>
                </ul>
              </div>

              {/* 2. THỜI GIAN CẬP NHẬT */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm md:text-[15px] uppercase">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>2. THỜI GIAN CẬP NHẬT</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                  <li>
                    <strong>Dữ liệu vận hành:</strong> Được cập nhật định kỳ trước <strong>10h00</strong> hằng ngày.
                  </li>
                  <li>
                    <strong>Dữ liệu tồn đọng (Backlog):</strong> Có thể được cập nhật nhiều lần trong ngày tùy theo nhu cầu quản lý và theo dõi của AM hoặc BC.
                  </li>
                  <li>
                    <strong>Khung giờ cập nhật Backlog thông thường:</strong>
                    <div className="pl-4 pt-0.5 text-slate-100 font-medium">
                      &bull; Buổi sáng: <strong>08h00 – 10h00</strong> &bull; Buổi chiều: <strong>14h00 – 17h00</strong>
                    </div>
                  </li>
                  <li className="text-amber-300/90 italic pt-0.5">
                    <strong>Lưu ý:</strong> Thời gian cập nhật có thể thay đổi tùy theo tình hình thực tế và tiến độ xử lý dữ liệu nguồn.
                  </li>
                </ul>
              </div>

              {/* 4. QUYỀN SỞ HỮU & HỖ TRỢ */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-400 font-black text-xs sm:text-sm md:text-[15px] uppercase">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>4. QUYỀN SỞ HỮU & HỖ TRỢ</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                  <li>
                    Dashboard thuộc quyền sở hữu và quản lý của <strong>AM Huy – ĐNB</strong>.
                  </li>
                  <li>
                    Mọi ý kiến đóng góp, đề xuất cải tiến, phản hồi về dữ liệu hoặc yêu cầu hỗ trợ trong quá trình sử dụng, vui lòng <strong>liên hệ trực tiếp AM</strong> để được trao đổi và giải đáp.
                  </li>
                  <li>
                    Khuyến khích anh em chủ động phản hồi những bất cập để Dashboard ngày càng hoàn thiện và đáp ứng tốt hơn nhu cầu vận hành thực tế.
                  </li>
                </ul>
              </div>

            </div>

            {/* Cột 2 (Phải): Mục 3, Mục 5 */}
            <div className="space-y-3.5 flex flex-col justify-between">
              
              {/* 3. QUY ĐỊNH BẢO MẬT TÀI KHOẢN */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400 font-black text-xs sm:text-sm md:text-[15px] uppercase">
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>3. QUY ĐỊNH BẢO MẬT TÀI KHOẢN</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                  <li>
                    Tài khoản đăng nhập (User/Password) được cấp để phục vụ công việc nội bộ tại bưu cục.
                  </li>
                  <li>
                    <strong>Tuyệt đối không chia sẻ thông tin đăng nhập</strong> cho người ngoài bưu cục hoặc cá nhân không thuộc đội ngũ nhân viên xử lý (NVXL) của bưu cục.
                  </li>
                  <li>
                    Người sử dụng có trách nhiệm bảo mật tài khoản và không tự ý cung cấp dữ liệu Dashboard cho các đối tượng không có thẩm quyền.
                  </li>
                </ul>
              </div>

              {/* 5. NHẮN GỬI */}
              <div className="bg-gradient-to-br from-amber-950/35 to-slate-950/80 border border-amber-600/35 rounded-2xl p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm md:text-[15px] uppercase">
                    <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>5. NHẮN GỬI</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-200 pt-1.5">
                    <li>
                      Dashboard không chỉ là công cụ theo dõi số liệu mà còn là công cụ hỗ trợ anh em chủ động kiểm soát công việc, nhận diện vấn đề và đưa ra phương án xử lý kịp thời.
                    </li>
                    <li>
                      Hãy sử dụng Dashboard đúng mục đích, khai thác dữ liệu hiệu quả và biến những con số thành hành động thực tế để nâng cao chất lượng vận hành tại bưu cục.
                    </li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="font-bold text-amber-300 text-xs sm:text-sm md:text-[14px]">
                    Chúc toàn thể anh em làm việc hiệu quả, vận hành thông suốt và hoàn thành tốt các mục tiêu đề ra!
                  </span>
                  <span className="font-black text-white text-right text-xs sm:text-sm md:text-[14px] uppercase tracking-wider shrink-0">
                    TRÂN TRỌNG!
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* MODAL FOOTER WITH NÚT ĐỒNG Ý */}
        <div className="bg-slate-950/95 border-t border-slate-800 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs sm:text-sm text-slate-300 text-center sm:text-left">
            <span>Bằng việc bấm <strong>"Đồng ý"</strong>, bạn xác nhận đã đọc, hiểu và cam kết tuân thủ các quy định vận hành trên.</span>
          </div>
          <button
            type="button"
            onClick={handleAgree}
            className="w-full sm:w-auto px-7 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Đồng ý & Bắt đầu sử dụng</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default StaffNoticeModal;
