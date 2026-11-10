/**
 * GHN Dashboard - Runtime Settings Service
 *
 * Cho phép AM chủ động cập nhật các liên kết kết nối ngay trên giao diện
 * (Google Sheets nguồn, thư mục Google Drive, URL Google Apps Script) mà không cần sửa mã nguồn.
 *
 * Nguyên tắc an toàn:
 * 1. Chỉ lưu MÃ ĐỊNH DANH (Spreadsheet ID, Folder ID) và URL Apps Script đã xác thực.
 *    Mọi đường dẫn hiển thị/mở ra đều được DỰNG LẠI từ ID, không dùng chuỗi người dùng nhập
 *    (chống chèn `javascript:` hoặc liên kết lạ vào href / window.location).
 * 2. URL Apps Script chỉ chấp nhận host script.google.com dạng /exec, vì dữ liệu vận hành
 *    và yêu cầu Telegram sẽ được gửi tới địa chỉ này.
 * 3. Dữ liệu đọc lại từ localStorage luôn được kiểm tra lại định dạng (không tin tưởng tuyệt đối).
 */

import { SPREADSHEET_ID as DEFAULT_SPREADSHEET_ID } from '../config/dashboard.config';

export { DEFAULT_SPREADSHEET_ID };

export const DEFAULT_DRIVE_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';
export const DEFAULT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}?usp=sharing`;
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxn90MNH1IukX8UMqsZDUqLhlpnsnme_MCzHdKbfkNgZ08w0O_Kpe-PHUsEobA72BUduA/exec';

export const SETTINGS_STORAGE_KEY = 'ghn_runtime_settings_v1';

// Các khóa cũ (legacy) được dọn khi khôi phục mặc định để không còn ghi đè ngầm
const LEGACY_DRIVE_WEBHOOK_KEY = 'ghn_drive_export_webhook_url';
const LEGACY_TELEGRAM_RELAY_KEY = 'ghn_telegram_relay_endpoint';

export interface RuntimeSettings {
  /** ID bảng tính Google Sheets nguồn (luôn có giá trị: tùy chỉnh hoặc mặc định) */
  spreadsheetId: string;
  /** ID thư mục Google Drive nhận file xuất (luôn có giá trị: tùy chỉnh hoặc mặc định) */
  driveFolderId: string;
  /** URL Apps Script do người dùng chỉ định; '' nghĩa là dùng mặc định / cấu hình build */
  appsScriptUrl: string;
}

const SHEET_ID_RE = /^[A-Za-z0-9_-]{20,100}$/;
const FOLDER_ID_RE = /^[A-Za-z0-9_-]{15,100}$/;
const APPS_SCRIPT_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+|macros)\/s\/[A-Za-z0-9_-]+\/exec$/;
const TELEGRAM_TOKEN_RE = /^\d{6,12}:[A-Za-z0-9_-]{30,}$/;
const CHAT_ID_RE = /^-?\d{5,20}$/;

/** Trích Spreadsheet ID từ link Google Sheets đầy đủ hoặc ID trần. */
export function extractSpreadsheetId(input: string): string | null {
  const v = (input || '').trim();
  if (!v) return null;
  const m = v.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  const id = m ? m[1] : v;
  return SHEET_ID_RE.test(id) ? id : null;
}

/** Trích Folder ID từ link thư mục Google Drive đầy đủ hoặc ID trần. */
export function extractDriveFolderId(input: string): string | null {
  const v = (input || '').trim();
  if (!v) return null;
  const m = v.match(/\/folders\/([A-Za-z0-9_-]+)/) || v.match(/[?&]id=([A-Za-z0-9_-]+)/);
  const id = m ? m[1] : v;
  return FOLDER_ID_RE.test(id) ? id : null;
}

export function isValidAppsScriptUrl(url: string): boolean {
  return APPS_SCRIPT_RE.test((url || '').trim());
}

export function isValidTelegramToken(token: string): boolean {
  return TELEGRAM_TOKEN_RE.test((token || '').trim());
}

export function isValidTelegramChatId(chatId: string): boolean {
  return CHAT_ID_RE.test((chatId || '').trim());
}

function readRaw(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Lấy cấu hình hiệu lực (đã kiểm tra lại định dạng, thiếu thì dùng mặc định). */
export function getRuntimeSettings(): RuntimeSettings {
  const raw = readRaw();
  const sheetId = typeof raw.spreadsheetId === 'string' && SHEET_ID_RE.test(raw.spreadsheetId)
    ? raw.spreadsheetId
    : DEFAULT_SPREADSHEET_ID;
  const folderId = typeof raw.driveFolderId === 'string' && FOLDER_ID_RE.test(raw.driveFolderId)
    ? raw.driveFolderId
    : DEFAULT_DRIVE_FOLDER_ID;
  const script = typeof raw.appsScriptUrl === 'string' && isValidAppsScriptUrl(raw.appsScriptUrl)
    ? raw.appsScriptUrl.trim()
    : '';
  return { spreadsheetId: sheetId, driveFolderId: folderId, appsScriptUrl: script };
}

export function getSpreadsheetId(): string {
  return getRuntimeSettings().spreadsheetId;
}

export function getSpreadsheetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${getSpreadsheetId()}/edit`;
}

export function getDriveFolderId(): string {
  return getRuntimeSettings().driveFolderId;
}

export function getDriveFolderUrl(): string {
  const id = getDriveFolderId();
  return id === DEFAULT_DRIVE_FOLDER_ID
    ? DEFAULT_DRIVE_FOLDER_URL
    : `https://drive.google.com/drive/folders/${id}`;
}

/** URL Apps Script do người dùng chỉ định ('' nếu chưa tùy chỉnh). */
export function getAppsScriptUrlOverride(): string {
  return getRuntimeSettings().appsScriptUrl;
}

export function hasCustomSettings(): boolean {
  const s = getRuntimeSettings();
  return (
    s.spreadsheetId !== DEFAULT_SPREADSHEET_ID ||
    s.driveFolderId !== DEFAULT_DRIVE_FOLDER_ID ||
    s.appsScriptUrl !== ''
  );
}

/** Lưu cấu hình đã được xác thực. Ném lỗi nếu dữ liệu không hợp lệ. */
export function saveRuntimeSettings(next: RuntimeSettings): void {
  if (!SHEET_ID_RE.test(next.spreadsheetId)) throw new Error('ID bảng tính không hợp lệ');
  if (!FOLDER_ID_RE.test(next.driveFolderId)) throw new Error('ID thư mục Drive không hợp lệ');
  const script = (next.appsScriptUrl || '').trim();
  if (script && !isValidAppsScriptUrl(script)) throw new Error('URL Apps Script không hợp lệ');

  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      spreadsheetId: next.spreadsheetId,
      driveFolderId: next.driveFolderId,
      appsScriptUrl: script
    })
  );
  // Cấu hình mới thay thế mọi khóa cũ để không bị ghi đè ngầm
  localStorage.removeItem(LEGACY_DRIVE_WEBHOOK_KEY);
  localStorage.removeItem(LEGACY_TELEGRAM_RELAY_KEY);
}

/** Khôi phục toàn bộ link về mặc định. */
export function resetRuntimeSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DRIVE_WEBHOOK_KEY);
    localStorage.removeItem(LEGACY_TELEGRAM_RELAY_KEY);
  } catch {
    // ignore
  }
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kiểm tra bảng tính có đọc được hay không (dùng đúng cơ chế gviz CSV mà dashboard đang dùng).
 * Bảng tính phải được chia sẻ "Bất kỳ ai có đường liên kết đều xem được".
 */
export async function testSpreadsheetConnection(spreadsheetId: string): Promise<ConnectionTestResult> {
  if (!SHEET_ID_RE.test(spreadsheetId)) {
    return { ok: false, message: 'ID bảng tính không đúng định dạng.' };
  }
  try {
    const res = await fetchWithTimeout(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
      10000
    );
    if (!res.ok) {
      return { ok: false, message: `Google Sheets trả về HTTP ${res.status}. Kiểm tra lại ID và quyền chia sẻ.` };
    }
    const text = await res.text();
    if (/^\s*<(!doctype|html)/i.test(text)) {
      return { ok: false, message: 'Bảng tính chưa được chia sẻ công khai dạng xem (nhận về trang đăng nhập).' };
    }
    if (!text.trim()) {
      return { ok: false, message: 'Bảng tính trả về dữ liệu rỗng.' };
    }
    return { ok: true, message: 'Đọc được bảng tính thành công.' };
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      message: aborted
        ? 'Hết thời gian chờ (10 giây) khi đọc bảng tính.'
        : 'Không truy cập được bảng tính (sai ID, chưa chia sẻ hoặc mất mạng).'
    };
  }
}

/** Kiểm tra Apps Script đang chạy: doGet phải trả JSON có status = ACTIVE. */
export async function testAppsScriptConnection(url: string): Promise<ConnectionTestResult> {
  const clean = (url || '').trim();
  if (!isValidAppsScriptUrl(clean)) {
    return { ok: false, message: 'URL Apps Script phải có dạng https://script.google.com/macros/s/.../exec' };
  }
  try {
    const res = await fetchWithTimeout(clean, 12000);
    if (!res.ok) {
      return { ok: false, message: `Apps Script trả về HTTP ${res.status}. Kiểm tra lại phiên bản triển khai.` };
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data && data.status === 'ACTIVE') {
        return { ok: true, message: 'Apps Script đang hoạt động (ACTIVE).' };
      }
      return { ok: false, message: 'Apps Script phản hồi nhưng không phải phiên bản Code.gs của dashboard.' };
    } catch {
      return { ok: false, message: 'Apps Script không trả về JSON. Có thể bản triển khai đã bị xóa hoặc chưa cấp quyền.' };
    }
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      message: aborted
        ? 'Hết thời gian chờ (12 giây) khi gọi Apps Script.'
        : 'Không gọi được Apps Script (trình duyệt bị chặn CORS hoặc URL không tồn tại).'
    };
  }
}
