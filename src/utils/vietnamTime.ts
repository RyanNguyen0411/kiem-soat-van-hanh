/**
 * vietnamTime.ts
 * Tiện ích chuẩn hóa và hiển thị thời gian chuẩn Múi Giờ Việt Nam (Hà Nội, UTC +07:00)
 * Đảm bảo 100% chuẩn xác trên mọi môi trường (Client, Serverless, LocalStorage)
 */

export interface VietnamDateTime {
  timestamp: number;
  dateStr: string;   // DD/MM/YYYY
  timeStr: string;   // HH:mm:ss
  fullStr: string;   // HH:mm:ss ngày DD/MM/YYYY
  shortStr: string;  // HH:mm DD/MM
  isoVN: string;     // YYYY-MM-DDTHH:mm:ss+07:00
}

/**
 * Định dạng thời gian theo chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+07:00)
 */
export function formatVietnamDateTime(input?: number | string | Date | null): VietnamDateTime {
  let ts: number;
  if (!input) {
    ts = Date.now();
  } else if (typeof input === 'number') {
    ts = input;
  } else if (input instanceof Date) {
    ts = input.getTime();
  } else {
    const parsed = new Date(input).getTime();
    ts = isNaN(parsed) ? Date.now() : parsed;
  }

  // Phương án 1: Dùng Intl.DateTimeFormat với timeZone Asia/Ho_Chi_Minh
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
      const shortStr = `${p.hour}:${p.minute} ${p.day}/${p.month}`;
      const isoVN = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+07:00`;
      return { timestamp: ts, dateStr, timeStr, fullStr, shortStr, isoVN };
    }
  } catch {
    // Fallback nếu môi trường không hỗ trợ Intl timezone
  }

  // Phương án 2 (Fallback toán học chính xác 100%): Timestamp UTC + 7 giờ (7 * 3600 * 1000 ms)
  const vnDate = new Date(ts + 7 * 60 * 60 * 1000);
  const day = String(vnDate.getUTCDate()).padStart(2, '0');
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const year = String(vnDate.getUTCFullYear());
  const hour = String(vnDate.getUTCHours()).padStart(2, '0');
  const minute = String(vnDate.getUTCMinutes()).padStart(2, '0');
  const second = String(vnDate.getUTCSeconds()).padStart(2, '0');

  const dateStr = `${day}/${month}/${year}`;
  const timeStr = `${hour}:${minute}:${second}`;
  const fullStr = `${timeStr} ngày ${dateStr}`;
  const shortStr = `${hour}:${minute} ${day}/${month}`;
  const isoVN = `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;

  return { timestamp: ts, dateStr, timeStr, fullStr, shortStr, isoVN };
}

/**
 * Lấy mốc thời gian hiện tại chuẩn Việt Nam (Hà Nội, UTC+07:00)
 */
export function getVietnamNow(): VietnamDateTime {
  return formatVietnamDateTime(Date.now());
}

/**
 * Hiển thị khoảng thời gian tương đối (Realtime time ago)
 */
export function formatVietnamTimeAgo(timestamp?: number | null): string {
  if (!timestamp) return 'Chưa có ghi nhận';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 15) return 'Vừa mới đây (Realtime)';
  if (diffSec < 60) return `${diffSec} giây trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}
