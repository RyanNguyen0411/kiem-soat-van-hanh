import type { IncomingMessage, ServerResponse } from 'node:http';
import { readValidatedJsonBody, sendJson } from './_lib/http.js';

export interface LoginAuditRecord {
  id: string;
  username: string;
  postOffice: string;
  postOfficeCode?: string;
  status: 'SUCCESS' | 'FAILED_PASSWORD' | 'LOCKED_MAX_ATTEMPTS';
  timestamp: number;
  dateStr: string;
  timeStr: string;
  lastSeenAt?: number;
  lastSeenStr?: string;
  device: string;
  ip: string;
  ipAddress?: string;
  note: string;
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

// Danh sách user chính thức 5 bưu cục Long An
const OFFICIAL_STAFF_USERS = [
  { username: '3071323', postOffice: '(LAN) Rạch Kiến', postOfficeCode: '22206000', displayName: 'NV Rạch Kiến (3071323)' },
  { username: '3175777', postOffice: '(LAN) Tầm Vu', postOfficeCode: '21710000', displayName: 'NV Tầm Vu (3175777)' },
  { username: '3077715', postOffice: '(LAN) Phước Lý', postOfficeCode: '22849000', displayName: 'NV Phước Lý (3077715)' },
  { username: '3020743', postOffice: '(LAN) Cần Đước 1', postOfficeCode: '23220000', displayName: 'NV Cần Đước 1 (3020743)' },
  { username: '3185715', postOffice: '(LAN) Cần Đước 1', postOfficeCode: '23220000', displayName: 'NV Cần Đước 1 (3185715)' },
  { username: '3133211', postOffice: '(LAN) Cần Giuộc', postOfficeCode: '21529000', displayName: 'NV Cần Giuộc (3133211)' },
  { username: '3192264', postOffice: '(LAN) Cần Giuộc', postOfficeCode: '21529000', displayName: 'NV Cần Giuộc (3192264)' },
  // Tài khoản mã bưu cục
  { username: '22206000', postOffice: '(LAN) Rạch Kiến', postOfficeCode: '22206000', displayName: 'BC Rạch Kiến' },
  { username: '21710000', postOffice: '(LAN) Tầm Vu', postOfficeCode: '21710000', displayName: 'BC Tầm Vu' },
  { username: '22849000', postOffice: '(LAN) Phước Lý', postOfficeCode: '22849000', displayName: 'BC Phước Lý' },
  { username: '23220000', postOffice: '(LAN) Cần Đước 1', postOfficeCode: '23220000', displayName: 'BC Cần Đước 1' },
  { username: '21529000', postOffice: '(LAN) Cần Giuộc', postOfficeCode: '21529000', displayName: 'BC Cần Giuộc' }
];

function formatDateTime(ts: number): { dateStr: string; timeStr: string; fullStr: string } {
  // Chuẩn hóa 100% theo Múi Giờ Việt Nam (Hà Nội, UTC +07:00)
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(new Date(ts));
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }

    if (p.day && p.month && p.year && p.hour && p.minute && p.second) {
      const dateStr = `${p.day}/${p.month}/${p.year}`;
      const timeStr = `${p.hour}:${p.minute}:${p.second}`;
      const fullStr = `${timeStr} ngày ${dateStr}`;
      return { dateStr, timeStr, fullStr };
    }
  } catch {
    // Fallback if Intl fails
  }

  // Fallback an toàn tuyệt đối: Timestamp UTC + 7 giờ
  const vnDate = new Date(ts + 7 * 60 * 60 * 1000);
  const day = String(vnDate.getUTCDate()).padStart(2, '0');
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const year = String(vnDate.getUTCFullYear());
  const hours = String(vnDate.getUTCHours()).padStart(2, '0');
  const minutes = String(vnDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(vnDate.getUTCSeconds()).padStart(2, '0');
  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hours}:${minutes}:${seconds}`,
    fullStr: `${hours}:${minutes}:${seconds} ngày ${day}/${month}/${year}`
  };
}

// Khởi tạo các bản ghi audit ban đầu
function createInitialAudits(): LoginAuditRecord[] {
  const baseTime = Date.now() - 3600000;
  return [
    {
      id: 'audit_init_1',
      username: '3071323',
      postOffice: '(LAN) Rạch Kiến',
      postOfficeCode: '22206000',
      status: 'SUCCESS',
      timestamp: baseTime - 600000,
      ...formatDateTime(baseTime - 600000),
      device: 'Mobile (iPhone/Safari)',
      ip: '113.161.78.10',
      note: 'Đăng nhập phân hệ thành công'
    },
    {
      id: 'audit_init_2',
      username: '3175777',
      postOffice: '(LAN) Tầm Vu',
      postOfficeCode: '21710000',
      status: 'SUCCESS',
      timestamp: baseTime - 3600000 * 5,
      ...formatDateTime(baseTime - 3600000 * 5),
      device: 'Desktop (Windows/Chrome)',
      ip: '113.161.71.13',
      note: 'Đăng nhập phân hệ thành công'
    },
    {
      id: 'audit_init_3',
      username: '3077715',
      postOffice: '(LAN) Phước Lý',
      postOfficeCode: '22849000',
      status: 'SUCCESS',
      timestamp: baseTime - 3600000 * 10,
      ...formatDateTime(baseTime - 3600000 * 10),
      device: 'Mobile (iPhone/Safari)',
      ip: '113.161.72.16',
      note: 'Đăng nhập phân hệ thành công'
    },
    {
      id: 'audit_init_4',
      username: '3020743',
      postOffice: '(LAN) Cần Đước 1',
      postOfficeCode: '23220000',
      status: 'SUCCESS',
      timestamp: baseTime - 3600000 * 16,
      ...formatDateTime(baseTime - 3600000 * 16),
      device: 'Desktop (Windows/Chrome)',
      ip: '113.161.73.19',
      note: 'Đăng nhập phân hệ thành công'
    },
    {
      id: 'audit_init_5',
      username: '3185715',
      postOffice: '(LAN) Cần Đước 1',
      postOfficeCode: '23220000',
      status: 'SUCCESS',
      timestamp: baseTime - 3600000 * 22,
      ...formatDateTime(baseTime - 3600000 * 22),
      device: 'Mobile (iPhone/Safari)',
      ip: '113.161.74.22',
      note: 'Đăng nhập phân hệ thành công'
    },
    {
      id: 'audit_init_6',
      username: '3133211',
      postOffice: '(LAN) Cần Giuộc',
      postOfficeCode: '21529000',
      status: 'FAILED_PASSWORD',
      timestamp: baseTime - 3600000 * 28,
      ...formatDateTime(baseTime - 3600000 * 28),
      device: 'Desktop (Windows/Chrome)',
      ip: '113.161.75.25',
      note: 'Nhập sai mật khẩu lần 1'
    },
    {
      id: 'audit_init_7',
      username: '3192264',
      postOffice: '(LAN) Cần Giuộc',
      postOfficeCode: '21529000',
      status: 'SUCCESS',
      timestamp: baseTime - 3600000 * 32,
      ...formatDateTime(baseTime - 3600000 * 32),
      device: 'Mobile (iPhone/Safari)',
      ip: '113.161.76.28',
      note: 'Đăng nhập phân hệ thành công'
    }
  ];
}

// In-memory global store cho serverless
let globalAudits: LoginAuditRecord[] = createInitialAudits();
let globalUserStatusMap: Record<string, UserOnlineStatus> = {};

// Khởi tạo map user với một số nhân viên đang trực tuyến cập nhật
const nowInit = Date.now();
OFFICIAL_STAFF_USERS.forEach((u, idx) => {
  // Giả định ban đầu 2 nhân viên đang trong ca làm việc để hiển thị trực quan Xanh / Đỏ
  const isInitiallyOnline = idx === 0 || idx === 1; // 3071323 (Rạch Kiến) và 3175777 (Tầm Vu)
  const initialSeen = isInitiallyOnline ? (nowInit - 25000) : undefined;

  globalUserStatusMap[u.username] = {
    username: u.username,
    postOffice: u.postOffice,
    postOfficeCode: u.postOfficeCode,
    displayName: u.displayName,
    isOnline: isInitiallyOnline,
    lastLoginAt: undefined,
    lastLoginStr: undefined,
    lastSeenAt: initialSeen,
    lastSeenStr: initialSeen ? formatDateTime(initialSeen).fullStr : undefined,
    device: undefined,
    ip: undefined
  };
});

// Seed last login từ mock audits
globalAudits.forEach(aud => {
  if (globalUserStatusMap[aud.username] && !globalUserStatusMap[aud.username].lastLoginAt) {
    globalUserStatusMap[aud.username].lastLoginAt = aud.timestamp;
    globalUserStatusMap[aud.username].lastLoginStr = `${aud.timeStr} ngày ${aud.dateStr}`;
    globalUserStatusMap[aud.username].device = aud.device;
    globalUserStatusMap[aud.username].ip = aud.ip;
  }
});

function extractClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket.remoteAddress || '113.161.78.10';
}

function parseDevice(userAgent?: string): string {
  if (!userAgent) return 'Desktop (Windows/Chrome)';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'Mobile (iPhone/Safari)';
  if (ua.includes('android')) return 'Mobile (Android/Chrome)';
  if (ua.includes('macintosh')) return 'Desktop (macOS/Safari)';
  return 'Desktop (Windows/Chrome)';
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const now = Date.now();
  // Ngưỡng tính online: có tín hiệu trong vòng 3 phút (180,000 ms)
  const ONLINE_THRESHOLD_MS = 3 * 60 * 1000;

  // GET: Lấy toàn bộ danh sách audit realtime và trạng thái online/offline của từng user
  if (req.method === 'GET') {
    // Cập nhật lại cờ isOnline theo thời gian thực
    const dynamicStatusMap: Record<string, UserOnlineStatus> = {};
    
    Object.keys(globalUserStatusMap).forEach(uname => {
      const item = globalUserStatusMap[uname];
      const isOnline = Boolean(item.lastSeenAt && (now - item.lastSeenAt < ONLINE_THRESHOLD_MS));
      dynamicStatusMap[uname] = {
        ...item,
        isOnline
      };
    });

    sendJson(res, 200, {
      success: true,
      audits: globalAudits.slice(0, 300),
      userStatusMap: dynamicStatusMap,
      onlineCount: Object.values(dynamicStatusMap).filter(u => u.isOnline).length,
      totalUsers: Object.keys(dynamicStatusMap).length,
      serverTime: now
    });
    return;
  }

  // POST: Ghi nhận đăng nhập mới hoặc heartbeat duy trì trạng thái online
  if (req.method === 'POST') {
    try {
      const body = await readValidatedJsonBody(req);
      const action = body?.action || 'login';
      const username = typeof body?.username === 'string' ? body.username.trim() : '';
      const postOffice = typeof body?.postOffice === 'string' ? body.postOffice.trim() : '';
      const postOfficeCode = typeof body?.postOfficeCode === 'string' ? body.postOfficeCode.trim() : '';
      const status = body?.status === 'FAILED_PASSWORD' || body?.status === 'LOCKED_MAX_ATTEMPTS' ? body.status : 'SUCCESS';
      const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim() : (status === 'SUCCESS' ? 'Đăng nhập phân hệ thành công' : 'Đăng nhập thất bại');
      
      const ip = extractClientIp(req);
      const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
      const device = typeof body?.device === 'string' && body.device.trim() ? body.device.trim() : parseDevice(userAgent);

      if (!username) {
        sendJson(res, 400, { success: false, error: 'Thiếu username' });
        return;
      }

      const dt = formatDateTime(now);

      // Nếu là action 'login': ghi nhận vào audit log và cập nhật online
      if (action === 'login') {
        const newRecord: LoginAuditRecord = {
          id: `audit_${now}_${Math.random().toString(36).slice(2, 7)}`,
          username,
          postOffice: postOffice || globalUserStatusMap[username]?.postOffice || 'Long An',
          postOfficeCode: postOfficeCode || globalUserStatusMap[username]?.postOfficeCode,
          status,
          timestamp: now,
          dateStr: dt.dateStr,
          timeStr: dt.timeStr,
          device,
          ip,
          note
        };

        // Chèn vào đầu danh sách
        globalAudits = [newRecord, ...globalAudits].slice(0, 500);

        // Cập nhật trạng thái user
        if (!globalUserStatusMap[username]) {
          globalUserStatusMap[username] = {
            username,
            postOffice: newRecord.postOffice,
            postOfficeCode: newRecord.postOfficeCode,
            displayName: `NV (${username})`,
            isOnline: status === 'SUCCESS',
            lastLoginAt: status === 'SUCCESS' ? now : undefined,
            lastLoginStr: status === 'SUCCESS' ? dt.fullStr : undefined,
            lastSeenAt: status === 'SUCCESS' ? now : undefined,
            lastSeenStr: status === 'SUCCESS' ? dt.fullStr : undefined,
            device,
            ip
          };
        } else {
          if (status === 'SUCCESS') {
            globalUserStatusMap[username].isOnline = true;
            globalUserStatusMap[username].lastLoginAt = now;
            globalUserStatusMap[username].lastLoginStr = dt.fullStr;
            globalUserStatusMap[username].lastSeenAt = now;
            globalUserStatusMap[username].lastSeenStr = dt.fullStr;
            globalUserStatusMap[username].device = device;
            globalUserStatusMap[username].ip = ip;
          }
        }
      } 
      // Nếu là action 'heartbeat': user đang mở dashboard cập nhật dữ liệu
      else if (action === 'heartbeat') {
        if (!globalUserStatusMap[username]) {
          globalUserStatusMap[username] = {
            username,
            postOffice: postOffice || 'Long An',
            displayName: `NV (${username})`,
            isOnline: true,
            lastSeenAt: now,
            lastSeenStr: dt.fullStr,
            device,
            ip
          };
        } else {
          globalUserStatusMap[username].isOnline = true;
          globalUserStatusMap[username].lastSeenAt = now;
          globalUserStatusMap[username].lastSeenStr = dt.fullStr;
          if (device) globalUserStatusMap[username].device = device;
          if (ip) globalUserStatusMap[username].ip = ip;
        }

        // Cập nhật mốc thời gian hoạt động liên tục cho bản ghi audit mới nhất của user
        const latestAudit = globalAudits.find(a => a.username === username && a.status === 'SUCCESS');
        if (latestAudit) {
          latestAudit.lastSeenAt = now;
          latestAudit.lastSeenStr = dt.fullStr;
        }
      }

      sendJson(res, 200, {
        success: true,
        message: 'Ghi nhận audit thành công',
        userStatus: globalUserStatusMap[username],
        serverTime: now
      });
    } catch (err: any) {
      sendJson(res, 500, {
        success: false,
        error: err?.message || 'Lỗi xử lý audit log'
      });
    }
    return;
  }

  sendJson(res, 405, { error: 'Method Not Allowed' });
}
