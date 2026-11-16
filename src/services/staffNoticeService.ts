/**
 * GHN Control Center - Dịch Vụ Cập Nhật & Quản Trị Thông Báo Phân Hệ Nhân Viên (Real-Time Ultra Fast)
 * Đồng bộ ngay lập tức (instantaneous) qua BroadcastChannel và Serverless API Heartbeat.
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
export const NOTICE_CHANNEL_NAME = 'ghn_staff_notice_broadcast_channel_v2';

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
  updatedAt: 1763265600000,
  version: 1
};

// Singleton BroadcastChannel cho giao tiếp tức thì giữa các tab/cửa sổ
let noticeBroadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  if (!noticeBroadcastChannel) {
    try {
      noticeBroadcastChannel = new BroadcastChannel(NOTICE_CHANNEL_NAME);
      noticeBroadcastChannel.onmessage = (event) => {
        if (event?.data?.type === 'FORCE_NOTICE_UPDATE' && event.data.config) {
          const incomingConfig = event.data.config as StaffNoticeConfig;
          try {
            localStorage.setItem(STORAGE_STAFF_NOTICE_KEY, JSON.stringify(incomingConfig));
          } catch {}
          window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { 
            detail: { config: incomingConfig, forceOpen: true } 
          }));
        }
      };
    } catch (e) {
      console.warn('Lỗi khởi tạo BroadcastChannel:', e);
    }
  }
  return noticeBroadcastChannel;
}

// Khởi chạy lắng nghe BroadcastChannel nếu môi trường browser hỗ trợ
if (typeof window !== 'undefined') {
  getBroadcastChannel();
}

/**
 * Lấy cấu hình thông báo hiện tại từ bộ nhớ cache cục bộ
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
 * Bắn tín hiệu đồng bộ tức thì (<5ms) qua BroadcastChannel và gửi lên Serverless API
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

      // 1. Gửi lệnh tức thì trong tab hiện tại
      window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { 
        detail: { config: updatedConfig, forceOpen: true } 
      }));

      // 2. Gửi lệnh tức thì (<5ms) qua BroadcastChannel tới tất cả tab/cửa sổ khác
      const channel = getBroadcastChannel();
      if (channel) {
        channel.postMessage({
          type: 'FORCE_NOTICE_UPDATE',
          config: updatedConfig,
          timestamp: Date.now()
        });
      }

      // 3. Đẩy lên server API cho các thiết bị độc lập (cross-device)
      fetch('/api/staff-notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      }).catch(err => {
        console.warn('Lỗi đồng bộ thông báo lên server API (sẽ tự động đồng bộ lại qua polling):', err);
      });

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
    message: 'Đã cập nhật thông báo phân hệ thành công! Lệnh đã được phát ngay lập tức tới tất cả bưu cục.',
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

      window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { 
        detail: { config: resetConfig, forceOpen: true } 
      }));

      const channel = getBroadcastChannel();
      if (channel) {
        channel.postMessage({
          type: 'FORCE_NOTICE_UPDATE',
          config: resetConfig,
          timestamp: Date.now()
        });
      }

      fetch('/api/staff-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetConfig)
      }).catch(() => {});
    } catch (err) {
      console.error('Lỗi khôi phục thông báo mặc định:', err);
    }
  }

  return resetConfig;
}

/**
 * Kiểm tra cập nhật thông báo từ server API (Heartbeat đồng bộ đa thiết bị)
 */
export async function checkServerNoticeUpdates(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch('/api/staff-notice', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return false;

    const data = await res.json();
    if (data?.success && data?.notice) {
      const serverNotice = data.notice as StaffNoticeConfig;
      const localNotice = getStaffNoticeConfig();

      // Nếu server có phiên bản mới hơn hoặc thời gian cập nhật mới hơn
      if (
        (serverNotice.version > (localNotice.version || 0)) ||
        (serverNotice.updatedAt > (localNotice.updatedAt || 0) + 1000)
      ) {
        localStorage.setItem(STORAGE_STAFF_NOTICE_KEY, JSON.stringify(serverNotice));

        window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { 
          detail: { config: serverNotice, forceOpen: true } 
        }));

        const channel = getBroadcastChannel();
        if (channel) {
          channel.postMessage({
            type: 'FORCE_NOTICE_UPDATE',
            config: serverNotice,
            timestamp: Date.now()
          });
        }
        return true;
      }
    }
  } catch {
    // ignore network errors in polling
  }
  return false;
}

/**
 * Khởi động tiến trình Heartbeat tự động kiểm tra thông báo mới
 * Tần số quét: Mỗi 3 giây khi trang đang mở, và quét ngay khi tab được focus/visible
 */
export function startNoticeSyncHeartbeat(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Quét ngay khi khởi động
  checkServerNoticeUpdates();

  // Quét định kỳ mỗi 3.000 ms (3 giây)
  const intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      checkServerNoticeUpdates();
    }
  }, 3000);

  // Quét ngay lập tức khi người dùng click vào tab hoặc chuyển qua lại cửa sổ
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkServerNoticeUpdates();
    }
  };

  const handleFocus = () => {
    checkServerNoticeUpdates();
  };

  window.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', handleFocus);
  };
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
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${mins}:${secs} ngày ${day}/${month}/${year}`;
  } catch {
    return '10:00 hôm nay';
  }
}
