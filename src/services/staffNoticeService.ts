/**
 * GHN Control Center - Dịch Vụ Cập Nhật & Quản Trị Thông Báo Phân Hệ Nhân Viên
 * Cho phép AM Huy chủ động cập nhật nội dung thông báo từ Dashboard Nguồn,
 * và đồng bộ tức thì tới tất cả các dashboard phân hệ bưu cục.
 */

export interface StaffNoticeConfig {
  title: string;
  bannerTag: string;
  greeting: string;
  content: string;
  closingGreeting: string;
  sender: string;
  updatedAt: number;
  version: number;
}

export const STORAGE_STAFF_NOTICE_KEY = 'ghn_staff_notice_config_v2';
export const NOTICE_UPDATED_EVENT = 'ghn_staff_notice_updated';

// Mẫu thông báo tinh gọn tiêu chuẩn (Streamlined & Crisp)
export const DEFAULT_STAFF_NOTICE_CONFIG: StaffNoticeConfig = {
  title: 'THÔNG BÁO & HƯỚNG DẪN SỬ DỤNG DASHBOARD VẬN HÀNH',
  bannerTag: 'QUY ĐỊNH BẮT BUỘC',
  greeting: 'Chào mừng anh em đến với Dashboard Vận hành Bưu cục! Vui lòng lưu ý các nội dung cốt lõi dưới đây:',
  content: `1. NGUỒN DỮ LIỆU & BẢN QUYỀN
• Số liệu được tổng hợp từ nguồn kiểm soát gốc do AM Huy bảo trợ và chịu trách nhiệm.
• Dashboard thuộc quyền sở hữu & quản trị của AM Huy – ĐNB. Mọi góp ý hoặc thắc mắc vui lòng liên hệ trực tiếp AM.

2. THỜI GIAN CẬP NHẬT DỮ LIỆU
• Dữ liệu Vận hành & GTC: Cập nhật định kỳ trước 10h00 hằng ngày.
• Dữ liệu Tồn đọng (Backlog): Cập nhật 2 khung giờ chính: Sáng (08h00 – 10h00) & Chiều (14h00 – 17h00) hoặc đột xuất theo nhịp vận hành bưu cục.

3. QUY ĐỊNH BẢO MẬT TÀI KHOẢN NỘI BỘ
• Tuyệt đối bảo mật User/Pass, chỉ dùng cho nội bộ nhân sự xử lý (NVXL) tại bưu cục.
• Nghiêm cấm chia sẻ tài khoản hoặc trích xuất số liệu ra ngoài phạm vi bưu cục khi chưa được AM phê duyệt.
• Nhập sai mật khẩu quá 5 lần tài khoản sẽ tự động khóa. Liên hệ AM để mở khóa hoặc cấp lại mật khẩu.

4. MỤC TIÊU VẬN HÀNH & HÀNH ĐỘNG
• Chủ động theo dõi chỉ số, phát hiện điểm nghẽn và xử lý tồn đọng kịp thời trong ca.
• Biến chỉ số thành hành động thực tế để nâng cao chất lượng phục vụ và hoàn thành xuất sắc mục tiêu bưu cục.`,
  closingGreeting: 'Chúc toàn thể anh em vận hành thông suốt, an toàn và hiệu quả!',
  sender: 'AM Huy – ĐNB',
  updatedAt: 1763265600000, // Khởi tạo mốc thời gian chuẩn
  version: 1
};

/**
 * Lấy cấu hình thông báo hiện tại
 */
export function getStaffNoticeConfig(): StaffNoticeConfig {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULT_STAFF_NOTICE_CONFIG };
  }

  try {
    const raw = localStorage.getItem(STORAGE_STAFF_NOTICE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_STAFF_NOTICE_KEY, JSON.stringify(DEFAULT_STAFF_NOTICE_CONFIG));
      return { ...DEFAULT_STAFF_NOTICE_CONFIG };
    }

    const parsed = JSON.parse(raw) as Partial<StaffNoticeConfig>;
    if (!parsed || !parsed.content || typeof parsed.content !== 'string') {
      localStorage.setItem(STORAGE_STAFF_NOTICE_KEY, JSON.stringify(DEFAULT_STAFF_NOTICE_CONFIG));
      return { ...DEFAULT_STAFF_NOTICE_CONFIG };
    }

    return {
      title: parsed.title || DEFAULT_STAFF_NOTICE_CONFIG.title,
      bannerTag: parsed.bannerTag || DEFAULT_STAFF_NOTICE_CONFIG.bannerTag,
      greeting: parsed.greeting || DEFAULT_STAFF_NOTICE_CONFIG.greeting,
      content: parsed.content,
      closingGreeting: parsed.closingGreeting || DEFAULT_STAFF_NOTICE_CONFIG.closingGreeting,
      sender: parsed.sender || DEFAULT_STAFF_NOTICE_CONFIG.sender,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      version: typeof parsed.version === 'number' ? parsed.version : 1
    };
  } catch (err) {
    console.error('Lỗi đọc cấu hình thông báo phân hệ:', err);
    return { ...DEFAULT_STAFF_NOTICE_CONFIG };
  }
}

/**
 * Lưu cấu hình thông báo mới do AM Huy cập nhật
 * và phát tín hiệu đồng bộ tức thì cho các phân hệ
 */
export function saveStaffNoticeConfig(newConfig: Partial<StaffNoticeConfig>): {
  success: boolean;
  message: string;
  config: StaffNoticeConfig;
} {
  const current = getStaffNoticeConfig();

  const contentToSave = (newConfig.content !== undefined ? newConfig.content : current.content).trim();
  if (!contentToSave) {
    return {
      success: false,
      message: 'Nội dung thông báo không được để trống!',
      config: current
    };
  }

  const updatedConfig: StaffNoticeConfig = {
    title: (newConfig.title !== undefined ? newConfig.title : current.title).trim() || DEFAULT_STAFF_NOTICE_CONFIG.title,
    bannerTag: (newConfig.bannerTag !== undefined ? newConfig.bannerTag : current.bannerTag).trim() || DEFAULT_STAFF_NOTICE_CONFIG.bannerTag,
    greeting: (newConfig.greeting !== undefined ? newConfig.greeting : current.greeting).trim(),
    content: contentToSave,
    closingGreeting: (newConfig.closingGreeting !== undefined ? newConfig.closingGreeting : current.closingGreeting).trim(),
    sender: (newConfig.sender !== undefined ? newConfig.sender : current.sender).trim() || 'AM Huy – ĐNB',
    updatedAt: Date.now(),
    version: (current.version || 1) + 1
  };

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_STAFF_NOTICE_KEY, JSON.stringify(updatedConfig));
      // Bắn event đồng bộ trong tab hiện tại
      window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { detail: updatedConfig }));
    } catch (err) {
      console.error('Lỗi lưu thông báo vào localStorage:', err);
      return {
        success: false,
        message: 'Lỗi bộ nhớ trình duyệt khi lưu thông báo!',
        config: current
      };
    }
  }

  return {
    success: true,
    message: 'Đã cập nhật thông báo phân hệ thành công! Nội dung mới đã được đồng bộ tới tất cả bưu cục.',
    config: updatedConfig
  };
}

/**
 * Khôi phục về thông báo tinh gọn mặc định
 */
export function resetStaffNoticeToDefault(): StaffNoticeConfig {
  const resetConfig: StaffNoticeConfig = {
    ...DEFAULT_STAFF_NOTICE_CONFIG,
    updatedAt: Date.now(),
    version: Date.now()
  };

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_STAFF_NOTICE_KEY, JSON.stringify(resetConfig));
      window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { detail: resetConfig }));
    } catch (err) {
      console.error('Lỗi khôi phục thông báo mặc định:', err);
    }
  }

  return resetConfig;
}

/**
 * Định dạng thời gian cập nhật thông báo tiếng Việt
 */
export function formatNoticeDate(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins} ngày ${day}/${month}/${year}`;
  } catch {
    return '10:00 hôm nay';
  }
}
