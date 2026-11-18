/**
 * GHN Control Center - Phân Hệ Quản Trị Tài Khoản & Phân Quyền Bưu Cục
 * Quản lý tài khoản nhân viên 5 bưu cục Long An:
 * - (LAN) Rạch Kiến (22206000)
 * - (LAN) Tầm Vu (21710000)
 * - (LAN) Phước Lý (22849000)
 * - (LAN) Cần Đước 1 (23220000)
 * - (LAN) Cần Giuộc (21529000)
 */

import type { TabType } from '../types/dashboard';
import { formatVietnamDateTime } from '../utils/vietnamTime';

export interface PostOfficeAccount {
  id: string;
  username: string;
  password: string; // Mật khẩu quản trị cấp bưu cục
  postOffice: string; // Tên bưu cục đầy đủ: '(LAN) Rạch Kiến', ...
  postOfficeCode: string; // Mã bưu cục: '22206000', ...
  displayName: string;
  allowedTabs: TabType[];
  failedAttempts: number;
  isLocked: boolean;
  lockedAt?: number;
  isActive: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

export interface LoginAuditRecord {
  id: string;
  timestamp: number;
  dateStr: string; // DD/MM/YYYY
  timeStr: string; // HH:mm:ss
  lastSeenAt?: number;
  lastSeenStr?: string;
  username: string;
  postOffice: string;
  postOfficeCode: string;
  status: 'SUCCESS' | 'FAILED_PASSWORD' | 'LOCKED_MAX_ATTEMPTS';
  ipAddress?: string;
  device?: string;
  note?: string;
}

export interface UserOnlineStatus {
  username: string;
  postOffice: string;
  postOfficeCode?: string;
  displayName?: string;
  isOnline: boolean;
  lastLoginAt?: number;
  lastLoginStr?: string;
  lastSeenAt?: number;
  lastSeenStr?: string;
  device?: string;
  ip?: string;
}

// 5 Bưu cục chính thức khu vực Long An
export const OFFICIAL_POST_OFFICES = [
  { code: '22206000', name: '(LAN) Rạch Kiến', shortName: 'Rạch Kiến', defaultPass: '22206000@K' },
  { code: '21710000', name: '(LAN) Tầm Vu', shortName: 'Tầm Vu', defaultPass: '21710000@TV' },
  { code: '22849000', name: '(LAN) Phước Lý', shortName: 'Phước Lý', defaultPass: '22849000@LP' },
  { code: '23220000', name: '(LAN) Cần Đước 1', shortName: 'Cần Đước 1', defaultPass: '23220000@CDD' },
  { code: '21529000', name: '(LAN) Cần Giuộc', shortName: 'Cần Giuộc', defaultPass: '21529000@CCG' }
];

// Danh sách Tab mặc định nhân viên được cấp quyền
export const DEFAULT_STAFF_ALLOWED_TABS: TabType[] = [
  'bao_cao_gtc_bc',
  'gtc_buu_cuc',
  'gtc_nhan_vien',
  'ton_dong_glt',
  'ton_dong_lc',
  'nhan_su',
  'ns_nghi_viec'
];

// Danh sách toàn bộ tab trong hệ thống có thể phân quyền
export const ALL_ASSIGNABLE_TABS: { id: TabType; label: string; group: string; description: string }[] = [
  { id: 'bao_cao_gtc_bc', label: 'Báo Cáo Ngày', group: 'VẬN HÀNH & GTC', description: 'Chi tiết bưu cục ngày, sản lượng và phân tích ca' },
  { id: 'gtc_buu_cuc', label: 'GTC Bưu Cục', group: 'VẬN HÀNH & GTC', description: 'Hiệu suất giao thành công cấp bưu cục' },
  { id: 'gtc_nhan_vien', label: 'GTC Bưu Tá', group: 'VẬN HÀNH & GTC', description: 'Năng suất bưu tá và phân bổ ca đi' },
  { id: 'ton_dong_glt', label: 'Tồn Đọng GLT', group: 'TỒN ĐỌNG & XỬ LÝ SLA', description: 'Kiểm soát tồn Giao - Lấy - Trả và cảnh báo 120h-192h' },
  { id: 'ton_dong_lc', label: 'Tồn Đọng LC', group: 'TỒN ĐỌNG & XỬ LÝ SLA', description: 'Luân chuyển tồn kho và đơn chưa nhập ca' },
  { id: 'nhan_su', label: 'Task Nhân Sự', group: 'NHÂN SỰ & QUỸ LƯƠNG', description: 'Cơ cấu nhân sự, thâm niên và định biên' },
  { id: 'ns_nghi_viec', label: 'NS Nghỉ Việc', group: 'NHÂN SỰ & QUỸ LƯƠNG', description: 'Thực trạng nhân sự nghỉ việc và phân tích nguyên nhân' },
  { id: 'overview', label: 'Tổng Quan', group: 'VẬN HÀNH & GTC', description: 'Executive Control Center - Chỉ số điều hành tổng thể' },
  { id: 'ty_le_tra_hang', label: 'Tỷ Lệ Trả Hàng', group: 'TỒN ĐỌNG & XỬ LÝ SLA', description: 'Kiểm soát chuyển hoàn và đơn hủy' },
  { id: 'hoa_hong_ngay', label: 'Hoa Hồng Ngày', group: 'NHÂN SỰ & QUỸ LƯƠNG', description: 'Quỹ lương bưu tá và đơn tính lương' }
];

const STORAGE_ACCOUNTS_KEY = 'ghn_po_accounts_v4';
const STORAGE_AUDIT_KEY = 'ghn_po_login_audits_v3';

// Khởi tạo danh sách tài khoản theo đúng cả 2 bảng ảnh của AM Huy:
// - Đăng nhập bằng Mã Nhân Viên (3071323, 3175777, 3077715, 3020743, 3185715, 3133211, 3192264)
// - HOẶC Đăng nhập bằng Mã Bưu Cục (22206000, 21710000, 22849000, 23220000, 21529000)
function getInitialAccounts(): PostOfficeAccount[] {
  const now = Date.now();
  return [
    // 1. Nhóm tài khoản theo Mã Nhân Viên
    {
      id: 'po_user_3071323',
      username: '3071323',
      password: '22206000@K',
      postOffice: '(LAN) Rạch Kiến',
      postOfficeCode: '22206000',
      displayName: 'NV Rạch Kiến (3071323)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_user_3175777',
      username: '3175777',
      password: '21710000@TV',
      postOffice: '(LAN) Tầm Vu',
      postOfficeCode: '21710000',
      displayName: 'NV Tầm Vu (3175777)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_user_3077715',
      username: '3077715',
      password: '22849000@LP',
      postOffice: '(LAN) Phước Lý',
      postOfficeCode: '22849000',
      displayName: 'NV Phước Lý (3077715)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_user_3020743',
      username: '3020743',
      password: '23220000@CDD',
      postOffice: '(LAN) Cần Đước 1',
      postOfficeCode: '23220000',
      displayName: 'NV Cần Đước 1 (3020743)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_user_3185715',
      username: '3185715',
      password: '23220000@CDD',
      postOffice: '(LAN) Cần Đước 1',
      postOfficeCode: '23220000',
      displayName: 'NV Cần Đước 1 (3185715)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_user_3133211',
      username: '3133211',
      password: '21529000@CCG',
      postOffice: '(LAN) Cần Giuộc',
      postOfficeCode: '21529000',
      displayName: 'NV Cần Giuộc (3133211)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_user_3192264',
      username: '3192264',
      password: '21529000@CCG',
      postOffice: '(LAN) Cần Giuộc',
      postOfficeCode: '21529000',
      displayName: 'NV Cần Giuộc (3192264)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },

    // 2. Nhóm tài khoản theo Mã Bưu Cục (Đăng nhập bằng mã BC)
    {
      id: 'po_code_22206000',
      username: '22206000',
      password: '22206000@K',
      postOffice: '(LAN) Rạch Kiến',
      postOfficeCode: '22206000',
      displayName: 'Bưu Cục Rạch Kiến (22206000)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_code_21710000',
      username: '21710000',
      password: '21710000@TV',
      postOffice: '(LAN) Tầm Vu',
      postOfficeCode: '21710000',
      displayName: 'Bưu Cục Tầm Vu (21710000)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_code_22849000',
      username: '22849000',
      password: '22849000@LP',
      postOffice: '(LAN) Phước Lý',
      postOfficeCode: '22849000',
      displayName: 'Bưu Cục Phước Lý (22849000)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_code_23220000',
      username: '23220000',
      password: '23220000@CDD',
      postOffice: '(LAN) Cần Đước 1',
      postOfficeCode: '23220000',
      displayName: 'Bưu Cục Cần Đước 1 (23220000)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    },
    {
      id: 'po_code_21529000',
      username: '21529000',
      password: '21529000@CCG',
      postOffice: '(LAN) Cần Giuộc',
      postOfficeCode: '21529000',
      displayName: 'Bưu Cục Cần Giuộc (21529000)',
      allowedTabs: [...DEFAULT_STAFF_ALLOWED_TABS],
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
      createdAt: now
    }
  ];
}

// Khởi tạo nhật ký đăng nhập mẫu thực tế để AM Huy xem ngay biểu đồ & bảng kê
function getInitialAuditLogs(): LoginAuditRecord[] {
  const now = Date.now();

  const sampleUsers = [
    { username: '3071323', po: '(LAN) Rạch Kiến', code: '22206000' },
    { username: '3175777', po: '(LAN) Tầm Vu', code: '21710000' },
    { username: '3077715', po: '(LAN) Phước Lý', code: '22849000' },
    { username: '3020743', po: '(LAN) Cần Đước 1', code: '23220000' },
    { username: '3185715', po: '(LAN) Cần Đước 1', code: '23220000' },
    { username: '3133211', po: '(LAN) Cần Giuộc', code: '21529000' },
    { username: '3192264', po: '(LAN) Cần Giuộc', code: '21529000' }
  ];

  const logs: LoginAuditRecord[] = [];
  // Tạo dữ liệu mô phỏng trong 7 ngày qua theo chuẩn Múi giờ Việt Nam (UTC+07:00)
  for (let i = 0; i < 28; i++) {
    const pastMs = now - (i * 5.5 * 3600 * 1000);
    const u = sampleUsers[i % sampleUsers.length];
    const vnTime = formatVietnamDateTime(pastMs);
    logs.push({
      id: `audit_${pastMs}_${i}`,
      timestamp: pastMs,
      dateStr: vnTime.dateStr,
      timeStr: vnTime.timeStr,
      username: u.username,
      postOffice: u.po,
      postOfficeCode: u.code,
      status: i === 5 ? 'FAILED_PASSWORD' : 'SUCCESS',
      device: i % 2 === 0 ? 'Mobile (iPhone/Safari)' : 'Desktop (Windows/Chrome)',
      ipAddress: `113.161.7${i % 9}.${10 + (i * 3)}`,
      note: i === 5 ? 'Nhập sai mật khẩu lần 1' : 'Đăng nhập phân hệ thành công'
    });
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Lấy toàn bộ danh sách tài khoản bưu cục (tự động khởi tạo nếu chưa có)
 */
export function getPostOfficeAccounts(): PostOfficeAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    const initial = getInitialAccounts();
    if (!raw) {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed: PostOfficeAccount[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(initial));
      return initial;
    }
    // Tự động kiểm tra và bổ sung bất kỳ tài khoản nào trong danh mục chính thức nếu còn thiếu
    let hasChanges = false;
    const existingUsernames = new Set(parsed.map(a => a.username.toLowerCase()));
    for (const initAcc of initial) {
      if (!existingUsernames.has(initAcc.username.toLowerCase())) {
        parsed.push(initAcc);
        hasChanges = true;
      }
    }
    if (hasChanges) {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return getInitialAccounts();
  }
}

/**
 * Lưu danh sách tài khoản
 */
export function savePostOfficeAccounts(accounts: PostOfficeAccount[]): void {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent('ghn_po_accounts_updated'));
  } catch (err) {
    console.error('Lỗi lưu danh sách tài khoản bưu cục:', err);
  }
}

/**
 * Lấy toàn bộ nhật ký đăng nhập
 */
export function getLoginAudits(): LoginAuditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_KEY);
    if (!raw) {
      const initial = getInitialAuditLogs();
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = getInitialAuditLogs();
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return getInitialAuditLogs();
  }
}

/**
 * Ghi nhận một lượt đăng nhập mới (Chuẩn Múi Giờ Việt Nam Hà Nội, UTC +07:00)
 */
export function recordLoginAudit(record: Omit<LoginAuditRecord, 'id' | 'timestamp' | 'dateStr' | 'timeStr'>): void {
  try {
    const now = Date.now();
    const vnTime = formatVietnamDateTime(now);

    const newRecord: LoginAuditRecord = {
      id: `audit_${now}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      dateStr: vnTime.dateStr,
      timeStr: vnTime.timeStr,
      lastSeenAt: now,
      lastSeenStr: vnTime.fullStr,
      ...record
    };

    const currentAudits = getLoginAudits();
    const updated = [newRecord, ...currentAudits].slice(0, 500); // Giữ tối đa 500 lượt gần nhất
    localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ghn_po_audits_updated'));

    // Gửi realtime lên serverless API để AM Huy nhận được ngay lập tức
    if (typeof window !== 'undefined') {
      fetch('/api/staff-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: record.username,
          postOffice: record.postOffice,
          postOfficeCode: record.postOfficeCode,
          status: record.status,
          device: record.device,
          note: record.note
        })
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Lỗi ghi nhận audit đăng nhập:', err);
  }
}

/**
 * Gửi heartbeat duy trì trạng thái online / đang cập nhật
 */
export async function sendStaffHeartbeat(username: string, postOffice?: string): Promise<void> {
  try {
    if (typeof window === 'undefined' || !username) return;
    await fetch('/api/staff-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        username,
        postOffice
      })
    });
  } catch {
    // ignore
  }
}

/**
 * Đồng bộ toàn bộ lịch sử đăng nhập và trạng thái user từ serverless API
 */
export async function fetchRealtimeAudits(): Promise<{
  audits: LoginAuditRecord[];
  userStatusMap: Record<string, UserOnlineStatus>;
}> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/staff-audit', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.audits)) {
          localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(data.audits));
          window.dispatchEvent(new CustomEvent('ghn_po_audits_updated', { detail: data }));
          return {
            audits: data.audits,
            userStatusMap: data.userStatusMap || {}
          };
        }
      }
    }
  } catch (err) {
    console.warn('Không thể đồng bộ audit từ server, fallback cache:', err);
  }

  return {
    audits: getLoginAudits(),
    userStatusMap: {}
  };
}

/**
 * Kiểm tra xem username có phải là tài khoản nhân viên bưu cục không
 */
export function isPostOfficeStaffUsername(username: string): boolean {
  const norm = username.trim().toLowerCase();
  const accounts = getPostOfficeAccounts();
  return accounts.some(a => a.username.toLowerCase() === norm);
}

/**
 * Xác thực đăng nhập cho nhân viên bưu cục
 */
export function authenticatePostOfficeStaff(
  username: string, 
  password: string
): { 
  success: boolean; 
  account?: PostOfficeAccount; 
  error?: string; 
  isLocked?: boolean; 
  failedAttempts?: number; 
  remainingAttempts?: number 
} {
  const norm = username.trim().toLowerCase();
  const accounts = getPostOfficeAccounts();
  const account = accounts.find(a => a.username.toLowerCase() === norm);

  if (!account) {
    return { success: false, error: 'Tài khoản không tồn tại trong hệ thống phân hệ bưu cục.' };
  }

  if (!account.isActive) {
    recordLoginAudit({
      username: account.username,
      postOffice: account.postOffice,
      postOfficeCode: account.postOfficeCode,
      status: 'FAILED_PASSWORD',
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      note: 'Tài khoản đã bị AM vô hiệu hóa/chặn truy cập'
    });
    return { 
      success: false, 
      error: 'Tài khoản này đã bị khóa quyền truy cập do nhân sự đã nghỉ việc hoặc bị chặn. Vui lòng liên hệ AM Huy.' 
    };
  }

  if (account.isLocked) {
    recordLoginAudit({
      username: account.username,
      postOffice: account.postOffice,
      postOfficeCode: account.postOfficeCode,
      status: 'LOCKED_MAX_ATTEMPTS',
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      note: 'Cố gắng đăng nhập vào tài khoản đang bị khóa do sai quá 5 lần'
    });
    return { 
      success: false, 
      isLocked: true, 
      error: 'Tài khoản của bạn đã bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng liên hệ AM Huy để được mở khóa hoặc hỗ trợ đăng nhập!' 
    };
  }

  // Kiểm tra mật khẩu (so khớp chính xác case-sensitive)
  if (account.password !== password) {
    const newFailed = account.failedAttempts + 1;
    account.failedAttempts = newFailed;

    if (newFailed >= 5) {
      account.isLocked = true;
      account.lockedAt = Date.now();
      savePostOfficeAccounts(accounts);

      recordLoginAudit({
        username: account.username,
        postOffice: account.postOffice,
        postOfficeCode: account.postOfficeCode,
        status: 'LOCKED_MAX_ATTEMPTS',
        device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        note: `Nhập sai lần thứ ${newFailed}. Hệ thống tự động khóa tài khoản.`
      });

      return {
        success: false,
        isLocked: true,
        failedAttempts: newFailed,
        error: 'Bạn đã nhập sai mật khẩu 5 lần! Tài khoản hiện đã bị khóa. Vui lòng liên hệ AM Huy để được mở khóa hỗ trợ.'
      };
    }

    savePostOfficeAccounts(accounts);
    const remaining = 5 - newFailed;

    recordLoginAudit({
      username: account.username,
      postOffice: account.postOffice,
      postOfficeCode: account.postOfficeCode,
      status: 'FAILED_PASSWORD',
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      note: `Nhập sai mật khẩu (Lần ${newFailed}/5)`
    });

    return {
      success: false,
      failedAttempts: newFailed,
      remainingAttempts: remaining,
      error: `Mật khẩu không chính xác! Bạn còn ${remaining} lần thử trước khi tài khoản bị khóa.`
    };
  }

  // Đăng nhập thành công -> Reset số lần sai và cập nhật thời gian
  account.failedAttempts = 0;
  account.lastLoginAt = Date.now();
  savePostOfficeAccounts(accounts);

  recordLoginAudit({
    username: account.username,
    postOffice: account.postOffice,
    postOfficeCode: account.postOfficeCode,
    status: 'SUCCESS',
    device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    note: 'Đăng nhập thành công vào phân hệ bưu cục'
  });

  return { success: true, account };
}

/**
 * AM Huy mở khóa cho tài khoản bị nhập sai 5 lần
 */
export function resetAccountLockout(username: string): { success: boolean; message: string } {
  const norm = username.trim().toLowerCase();
  const accounts = getPostOfficeAccounts();
  const account = accounts.find(a => a.username.toLowerCase() === norm);

  if (!account) {
    return { success: false, message: 'Không tìm thấy tài khoản cần mở khóa.' };
  }

  account.isLocked = false;
  account.failedAttempts = 0;
  delete account.lockedAt;
  savePostOfficeAccounts(accounts);

  recordLoginAudit({
    username: account.username,
    postOffice: account.postOffice,
    postOfficeCode: account.postOfficeCode,
    status: 'SUCCESS',
    note: `AM Huy đã thực hiện mở khóa và đặt lại 0 lần sai cho tài khoản ${account.username}`
  });

  return { 
    success: true, 
    message: `Đã mở khóa thành công cho tài khoản ${account.username} (${account.postOffice}). Nhân viên có thể đăng nhập lại ngay.` 
  };
}

/**
 * AM Huy đổi mật khẩu cho tài khoản bưu cục
 */
export function changePostOfficePassword(
  username: string, 
  newPass: string
): { success: boolean; message: string } {
  const norm = username.trim().toLowerCase();
  const cleanPass = newPass.trim();

  if (!cleanPass) {
    return { success: false, message: 'Mật khẩu mới không được để trống.' };
  }

  const accounts = getPostOfficeAccounts();
  const account = accounts.find(a => a.username.toLowerCase() === norm);

  if (!account) {
    return { success: false, message: 'Không tìm thấy tài khoản cần đổi mật khẩu.' };
  }

  account.password = cleanPass;
  account.failedAttempts = 0;
  account.isLocked = false;
  savePostOfficeAccounts(accounts);

  recordLoginAudit({
    username: account.username,
    postOffice: account.postOffice,
    postOfficeCode: account.postOfficeCode,
    status: 'SUCCESS',
    note: `AM Huy đã đổi mật khẩu thành công cho tài khoản ${account.username}`
  });

  return { 
    success: true, 
    message: `Đã cập nhật mật khẩu mới cho ${account.username} (${account.postOffice}) thành công!` 
  };
}

/**
 * AM Huy thêm User nhân viên mới vào bưu cục
 */
export function addPostOfficeUser(data: {
  username: string;
  password: string;
  postOffice: string;
  postOfficeCode?: string;
  displayName?: string;
  allowedTabs?: TabType[];
}): { success: boolean; message: string; account?: PostOfficeAccount } {
  const norm = data.username.trim();
  if (!norm) {
    return { success: false, message: 'Tên đăng nhập không được để trống.' };
  }
  if (!data.password.trim()) {
    return { success: false, message: 'Mật khẩu không được để trống.' };
  }

  const accounts = getPostOfficeAccounts();
  if (accounts.some(a => a.username.toLowerCase() === norm.toLowerCase())) {
    return { success: false, message: `Tài khoản ${norm} đã tồn tại trong hệ thống.` };
  }

  const poMeta = OFFICIAL_POST_OFFICES.find(p => p.name === data.postOffice || p.code === data.postOfficeCode);
  const now = Date.now();

  const newAccount: PostOfficeAccount = {
    id: `po_user_${norm}_${now}`,
    username: norm,
    password: data.password.trim(),
    postOffice: data.postOffice || poMeta?.name || '(LAN) Rạch Kiến',
    postOfficeCode: data.postOfficeCode || poMeta?.code || '22206000',
    displayName: data.displayName?.trim() || `Nhân Viên ${data.postOffice} (${norm})`,
    allowedTabs: data.allowedTabs || [...DEFAULT_STAFF_ALLOWED_TABS],
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
    createdAt: now
  };

  accounts.push(newAccount);
  savePostOfficeAccounts(accounts);

  recordLoginAudit({
    username: newAccount.username,
    postOffice: newAccount.postOffice,
    postOfficeCode: newAccount.postOfficeCode,
    status: 'SUCCESS',
    note: `AM Huy đã cấp quyền tạo mới tài khoản ${newAccount.username}`
  });

  return { 
    success: true, 
    message: `Đã thêm thành công tài khoản ${newAccount.username} cho ${newAccount.postOffice}`, 
    account: newAccount 
  };
}

/**
 * AM Huy xóa hoặc chặn User nhân viên (khi nghỉ việc)
 */
export function removePostOfficeUser(username: string): { success: boolean; message: string } {
  const norm = username.trim().toLowerCase();
  const accounts = getPostOfficeAccounts();
  const index = accounts.findIndex(a => a.username.toLowerCase() === norm);

  if (index === -1) {
    return { success: false, message: 'Không tìm thấy tài khoản cần xóa.' };
  }

  const deleted = accounts.splice(index, 1)[0];
  savePostOfficeAccounts(accounts);

  recordLoginAudit({
    username: deleted.username,
    postOffice: deleted.postOffice,
    postOfficeCode: deleted.postOfficeCode,
    status: 'SUCCESS',
    note: `AM Huy đã xóa tài khoản ${deleted.username} khỏi hệ thống phân hệ`
  });

  return { success: true, message: `Đã xóa tài khoản ${deleted.username} (${deleted.postOffice}) khỏi hệ thống.` };
}

/**
 * AM Huy bật/tắt quyền xem dữ liệu bất kỳ trên cây sơ đồ phân quyền
 */
export function updateTabPermission(
  username: string, 
  tabId: TabType, 
  isGranted: boolean
): { success: boolean; message: string } {
  const norm = username.trim().toLowerCase();
  const accounts = getPostOfficeAccounts();
  const account = accounts.find(a => a.username.toLowerCase() === norm);

  if (!account) {
    return { success: false, message: 'Không tìm thấy tài khoản.' };
  }

  const currentTabs = new Set<TabType>(account.allowedTabs || []);
  if (isGranted) {
    currentTabs.add(tabId);
  } else {
    currentTabs.delete(tabId);
  }

  account.allowedTabs = Array.from(currentTabs);
  savePostOfficeAccounts(accounts);

  return { 
    success: true, 
    message: `Đã ${isGranted ? 'cấp quyền' : 'tắt quyền'} xem tab "${tabId}" cho tài khoản ${account.username}.` 
  };
}

/**
 * Cấp hoặc tắt quyền một tab cho TOÀN BỘ tài khoản của một bưu cục
 */
export function updatePostOfficeTabPermission(
  postOfficeCode: string, 
  tabId: TabType, 
  isGranted: boolean
): { success: boolean; message: string } {
  const accounts = getPostOfficeAccounts();
  let count = 0;

  accounts.forEach(acc => {
    if (acc.postOfficeCode === postOfficeCode) {
      const set = new Set<TabType>(acc.allowedTabs || []);
      if (isGranted) set.add(tabId);
      else set.delete(tabId);
      acc.allowedTabs = Array.from(set);
      count++;
    }
  });

  if (count > 0) {
    savePostOfficeAccounts(accounts);
    return { 
      success: true, 
      message: `Đã cập nhật quyền xem "${tabId}" cho toàn bộ ${count} tài khoản của bưu cục.` 
    };
  }

  return { success: false, message: 'Không tìm thấy tài khoản thuộc bưu cục này.' };
}
