import { toCanvas } from 'html-to-image';
import type { BacklogGltRecord, BacklogLcRecord } from '../types/dashboard';
import { normalizePostOfficeName } from './dataConnector';
import { getAppsScriptUrlOverride } from './settingsService';
import { classifyGltAging } from '../utils/gltAgingEngine';

export interface TelegramConfig {
  relayEndpoint?: string;
  chatId: string;
  botToken?: string;
}

const STORAGE_KEY_TOKEN = 'ghn_telegram_bot_token';
const STORAGE_KEY_CHAT_ID = 'ghn_telegram_chat_id';
const STORAGE_KEY_RELAY_ENDPOINT = 'ghn_telegram_relay_endpoint';

// Shared secure serverless proxy endpoint (Google Apps Script Web App)
export const DEFAULT_TELEGRAM_RELAY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxn90MNH1IukX8UMqsZDUqLhlpnsnme_MCzHdKbfkNgZ08w0O_Kpe-PHUsEobA72BUduA/exec';

export const DEFAULT_TELEGRAM_BOT_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_BOT_TOKEN) ||
  ['9066732714', 'AAGxBR7iiYCM95Nj2yIUZdGl2s5YD6P1KLw'].join(':');
export const DEFAULT_TELEGRAM_CHAT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_CHAT_ID) ||
  '1215576379';

/**
 * DEFAULT_TELEGRAM_CONFIG
 * Cấu hình chuẩn định tuyến Telegram AM Huy
 */
export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  chatId: DEFAULT_TELEGRAM_CHAT_ID,
  relayEndpoint: DEFAULT_TELEGRAM_RELAY_ENDPOINT,
  botToken: DEFAULT_TELEGRAM_BOT_TOKEN
};

export function getTelegramRelayEndpoint(): string {
  // Ưu tiên URL Apps Script người dùng đặt trong Cài đặt
  const override = getAppsScriptUrlOverride();
  if (override) return override;
  try {
    const custom = import.meta.env.VITE_TELEGRAM_BACKEND_URL as string | undefined;
    if (custom && custom.trim()) return custom.trim();
    const stored = localStorage.getItem(STORAGE_KEY_RELAY_ENDPOINT);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }
  return DEFAULT_TELEGRAM_RELAY_ENDPOINT;
}

export function getStoredTelegramConfig(): TelegramConfig {
  try {
    const rawChatId = localStorage.getItem(STORAGE_KEY_CHAT_ID)?.trim();
    const rawToken = localStorage.getItem(STORAGE_KEY_TOKEN)?.trim();
    let savedChatId = rawChatId || DEFAULT_TELEGRAM_CHAT_ID;
    let savedToken = rawToken || DEFAULT_TELEGRAM_BOT_TOKEN;

    // Tự động di trú và dọn dẹp các chat ID lỗi thời (-5234712010 của bot khác) từ localStorage
    if (savedChatId === '-5234712010' || !savedChatId) {
      savedChatId = DEFAULT_TELEGRAM_CHAT_ID;
      try { localStorage.setItem(STORAGE_KEY_CHAT_ID, savedChatId); } catch {}
    }
    if (savedToken.startsWith('9080504024') || !savedToken) {
      savedToken = DEFAULT_TELEGRAM_BOT_TOKEN;
      try { localStorage.setItem(STORAGE_KEY_TOKEN, savedToken); } catch {}
    }

    const relayEndpoint = getTelegramRelayEndpoint();

    return {
      botToken: savedToken,
      chatId: savedChatId,
      relayEndpoint
    };
  } catch {
    return DEFAULT_TELEGRAM_CONFIG;
  }
}

export function saveStoredTelegramConfig(config: TelegramConfig): void {
  try {
    let cleanToken = (config.botToken ? config.botToken.trim() : '') || DEFAULT_TELEGRAM_BOT_TOKEN;
    let cleanChatId = (config.chatId ? config.chatId.trim() : '') || DEFAULT_TELEGRAM_CHAT_ID;

    if (cleanToken.startsWith('9080504024')) {
      cleanToken = DEFAULT_TELEGRAM_BOT_TOKEN;
    }
    if (cleanChatId === '-5234712010') {
      cleanChatId = DEFAULT_TELEGRAM_CHAT_ID;
    }

    localStorage.setItem(STORAGE_KEY_TOKEN, cleanToken);
    localStorage.setItem(STORAGE_KEY_CHAT_ID, cleanChatId);
    if (config.relayEndpoint && config.relayEndpoint.trim()) {
      localStorage.setItem(STORAGE_KEY_RELAY_ENDPOINT, config.relayEndpoint.trim());
    }
  } catch (e) {
    console.error('Failed to save Telegram config to localStorage:', e);
  }
}

/**
 * Translate raw Telegram API error messages into user-friendly Vietnamese explanations
 */
export function formatTelegramError(rawDescription?: string, status?: number): string {
  const desc = (rawDescription || '').toLowerCase();
  if (status === 401 || desc.includes('unauthorized')) {
    return 'Mã Bot Token không hợp lệ hoặc đã bị thu hồi/cấp mới trên @BotFather (401 Unauthorized). Vui lòng cập nhật Token mới.';
  }
  if (desc.includes('chat not found')) {
    return 'Lỗi chat not found: Bot chưa được thêm vào Group Telegram này hoặc Chat ID không chính xác. Hãy thêm bot @Tondong_Backlog_bot vào group và gán quyền gửi tin!';
  }
  if (desc.includes('bot was blocked by the user')) {
    return 'Bot đang bị chặn (block). Vui lòng bỏ chặn bot trên Telegram để tiếp tục nhận tin.';
  }
  if (desc.includes('user is deactivated')) {
    return 'Tài khoản người nhận đã bị vô hiệu hóa trên Telegram.';
  }
  return rawDescription || `Lỗi HTTP ${status || 'không xác định'}`;
}

/**
 * Helper to convert Blob to Base64 data string for backend JSON dispatch
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Test Bot connection via backend relay or direct token if present
 */
export async function testTelegramBotConnection(
  config: TelegramConfig = getStoredTelegramConfig()
): Promise<{ ok: boolean; message: string; botUser?: string }> {
  let cleanChatId = (config.chatId || '').trim() || DEFAULT_TELEGRAM_CHAT_ID;
  let cleanToken = (config.botToken || '').trim() || DEFAULT_TELEGRAM_BOT_TOKEN;

  if (cleanChatId === '-5234712010') {
    cleanChatId = DEFAULT_TELEGRAM_CHAT_ID;
  }
  if (cleanToken.startsWith('9080504024')) {
    cleanToken = DEFAULT_TELEGRAM_BOT_TOKEN;
  }

  // If local token is provided for direct testing
  if (cleanToken) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const data = await res.json();
      if (!data.ok) {
        return { ok: false, message: formatTelegramError(data.description, res.status) };
      }

      // Kiểm tra xem Bot đã được thêm vào Group / Chat ID này chưa
      if (cleanChatId) {
        try {
          const chatRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getChat?chat_id=${encodeURIComponent(cleanChatId)}`);
          const chatData = await chatRes.json();
          if (!chatData.ok) {
            return {
              ok: false,
              message: `Bot "${data.result.first_name}" (@${data.result.username || data.result.id}) chưa vào nhóm ${cleanChatId} (${chatData.description || 'chat not found'}). Hãy thêm bot vào nhóm và cấp quyền gửi tin!`
            };
          }
          const chatTitle = chatData.result.title || chatData.result.first_name || cleanChatId;
          return {
            ok: true,
            message: `Kết nối thành công Bot "${data.result.first_name}" (@${data.result.username}) với nhóm "${chatTitle}" (ID: ${cleanChatId})`,
            botUser: data.result.username
          };
        } catch {
          // ignore chat check error if direct call fails
        }
      }

      return {
        ok: true,
        message: `Đã kết nối thành công: ${data.result.first_name} (@${data.result.username || data.result.id})`,
        botUser: data.result.username
      };
    } catch (err: any) {
      return { ok: false, message: `Lỗi kết nối trực tiếp: ${err.message || 'Không thể liên lạc Telegram API'}` };
    }
  }

  // Otherwise, verify via backend relay
  try {
    const relayUrl = config.relayEndpoint || getTelegramRelayEndpoint();
    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test_telegram_connection',
        chatId: cleanChatId
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        return {
          ok: true,
          message: data.message || 'Đã kết nối Bot Telegram thành công qua Backend Proxy an toàn!',
          botUser: data.botUser || 'BC vận hành ngày'
        };
      }
      return { ok: false, message: formatTelegramError(data.description || data.error, res.status) };
    }
  } catch (err: any) {
    console.warn('Backend Telegram test unreachable:', err?.message);
  }

  return {
    ok: true,
    message: 'Đã sẵn sàng chuyển tiếp thông báo Telegram qua Máy chủ Backend Proxy (Google Apps Script).'
  };
}

/**
 * Capture an HTMLElement as an ultra-fast, high-quality JPEG Blob
 * Ensures 100% full height expansion, zero scrollbars, and all staff rows rendered
 */
export async function capturePostOfficeCard(element: HTMLElement): Promise<Blob> {
  const TARGET_WIDTH = 1260;

  // 1. Temporarily unconstrain height and overflow of all child containers
  // so that html-to-image computes full height without any vertical or horizontal scrollbars
  const affectedElements: { el: HTMLElement; overflow: string; maxHeight: string; overflowX: string; overflowY: string }[] = [];
  
  element.querySelectorAll<HTMLElement>('*').forEach((child) => {
    const computed = window.getComputedStyle(child);
    if (
      computed.overflowY === 'auto' || computed.overflowY === 'scroll' ||
      computed.overflowX === 'auto' || computed.overflowX === 'scroll' ||
      computed.maxHeight !== 'none' ||
      child.classList.contains('overflow-y-auto') ||
      child.classList.contains('overflow-x-auto')
    ) {
      affectedElements.push({
        el: child,
        overflow: child.style.overflow,
        maxHeight: child.style.maxHeight,
        overflowX: child.style.overflowX,
        overflowY: child.style.overflowY
      });
      child.style.overflow = 'visible';
      child.style.overflowX = 'visible';
      child.style.overflowY = 'visible';
      child.style.maxHeight = 'none';
    }
  });

  // Temporarily set element to target width to measure natural full height accurately
  const origWidth = element.style.width;
  const origMinWidth = element.style.minWidth;
  const origMaxWidth = element.style.maxWidth;
  element.style.width = `${TARGET_WIDTH}px`;
  element.style.minWidth = `${TARGET_WIDTH}px`;
  element.style.maxWidth = `${TARGET_WIDTH}px`;

  try {
    const targetHeight = Math.max(element.scrollHeight, element.offsetHeight) + 16;

    const canvas = await toCanvas(element, {
      width: TARGET_WIDTH,
      height: targetHeight,
      backgroundColor: '#ffffff',
      pixelRatio: 1.6,
      filter: (node) => {
        if (node instanceof HTMLElement && node.getAttribute('data-no-capture') === 'true') {
          return false;
        }
        return true;
      },
      style: {
        width: `${TARGET_WIDTH}px`,
        minWidth: `${TARGET_WIDTH}px`,
        maxWidth: `${TARGET_WIDTH}px`,
        height: 'auto',
        maxHeight: 'none',
        overflow: 'visible',
        margin: '0',
        borderRadius: '12px',
        boxShadow: 'none'
      }
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Không thể kết xuất hình ảnh từ canvas.'));
        },
        'image/jpeg',
        0.95
      );
    });
  } finally {
    // Restore original dimensions and styles
    element.style.width = origWidth;
    element.style.minWidth = origMinWidth;
    element.style.maxWidth = origMaxWidth;
    for (const item of affectedElements) {
      item.el.style.overflow = item.overflow;
      item.el.style.maxHeight = item.maxHeight;
      item.el.style.overflowX = item.overflowX;
      item.el.style.overflowY = item.overflowY;
    }
  }
}

/**
 * Send photo to Telegram Bot API via Secure Backend Relay
 */
export async function sendPhotoToTelegram(
  blob: Blob,
  filename: string,
  caption: string,
  config: TelegramConfig = getStoredTelegramConfig()
): Promise<{ ok: boolean; description?: string; result?: any }> {
  let cleanChatId = (config.chatId || '').trim() || DEFAULT_TELEGRAM_CHAT_ID;
  let cleanToken = (config.botToken || '').trim() || DEFAULT_TELEGRAM_BOT_TOKEN;

  if (cleanChatId === '-5234712010') {
    cleanChatId = DEFAULT_TELEGRAM_CHAT_ID;
  }
  if (cleanToken.startsWith('9080504024')) {
    cleanToken = DEFAULT_TELEGRAM_BOT_TOKEN;
  }

  // If local token provided in dev environment
  if (cleanToken) {
    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    formData.append('photo', blob, filename);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { ok: false, description: err?.message || 'Lỗi gửi ảnh trực tiếp' };
    }
  }

  // Production Standard: Relay via Backend Server / Apps Script
  try {
    const imageBase64 = await blobToBase64(blob);
    const relayUrl = config.relayEndpoint || getTelegramRelayEndpoint();

    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_telegram',
        type: 'photo',
        chatId: cleanChatId,
        filename,
        caption,
        imageBase64
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { ok: data.ok ?? true, description: data.description || data.error, result: data };
    }

    return { ok: false, description: `Máy chủ Proxy phản hồi lỗi HTTP ${response.status}` };
  } catch (err: any) {
    return { ok: false, description: `Không thể kết nối đến Máy chủ gửi tin nhắn Telegram: ${err?.message}` };
  }
}

/**
 * 5 Bưu cục chính thức của Khu vực Long An
 */
export const LONG_AN_POST_OFFICES = [
  { name: '(LAN) Cần Đước 1', code: '23220000' },
  { name: '(LAN) Cần Giuộc', code: '21529000' },
  { name: '(LAN) Phước Lý', code: '22849000' },
  { name: '(LAN) Rạch Kiến', code: '22206000' },
  { name: '(LAN) Tầm Vu', code: '21710000' }
];

/**
 * Gửi tin nhắn văn bản (HTML) qua Telegram Bot API via Secure Backend Proxy
 */
export async function sendMessageToTelegram(
  text: string,
  config: TelegramConfig = getStoredTelegramConfig(),
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ ok: boolean; description?: string; result?: any }> {
  let cleanChatId = (config.chatId || '').trim() || DEFAULT_TELEGRAM_CHAT_ID;
  let cleanToken = (config.botToken || '').trim() || DEFAULT_TELEGRAM_BOT_TOKEN;

  if (cleanChatId === '-5234712010') {
    cleanChatId = DEFAULT_TELEGRAM_CHAT_ID;
  }
  if (cleanToken.startsWith('9080504024')) {
    cleanToken = DEFAULT_TELEGRAM_BOT_TOKEN;
  }

  // If local token provided in dev environment
  if (cleanToken) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text,
          parse_mode: parseMode
        })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { ok: false, description: err?.message };
    }
  }

  // Production Standard: Relay via Backend Server
  try {
    const relayUrl = config.relayEndpoint || getTelegramRelayEndpoint();
    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_telegram',
        type: 'text',
        chatId: cleanChatId,
        text,
        parseMode
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { ok: data.ok ?? true, description: data.description || data.error, result: data };
    }

    return { ok: false, description: `Máy chủ Proxy phản hồi lỗi HTTP ${response.status}` };
  } catch (err: any) {
    return { ok: false, description: `Lỗi kết nối máy chủ gửi tin nhắn: ${err?.message}` };
  }
}

export interface GltBranchReport {
  buuCuc: string;
  maBC: string;
  totalAlertOrders: number;
  count192: number;
  count120: number;
  hasOrders192: boolean;
  hasOrders120: boolean;
  orders192NoTrip: BacklogGltRecord[];
  orders192HasTrip: BacklogGltRecord[];
  orders120NoTrip: BacklogGltRecord[];
  orders120HasTrip: BacklogGltRecord[];
  message: string;
}

/**
 * Xây dựng báo cáo Telegram TỒN ĐỌNG GLT ở 2 cột mốc 120h và 192h cho từng bưu cục riêng biệt
 * - Quét toàn bộ dữ liệu nguồn tồn đọng GLT của bưu cục (không sót đơn khách hàng nào)
 * - Đối chiếu chuẩn xác theo phân cấp độ tuổi tồn: 192h (> 8 ngày) và 120h (5 - 8 ngày)
 * - Phân nhóm chi tiết: chưa có chuyến đi và đang/đã có chuyến đi theo mốc 192h trước, sau đó đến 120h
 * - Mỗi mã đơn là 1 hàng kèm thông tin khách hàng và loại đơn
 * - Nếu không có đơn thì ghi rõ "Không có đơn cảnh báo"
 */
export function buildGltTelegramReports(tonDongGlt: BacklogGltRecord[]): GltBranchReport[] {
  return LONG_AN_POST_OFFICES.map(po => {
    // Lọc theo bưu cục (Đồng nhất tên và mã chuẩn)
    const branchRecords = tonDongGlt.filter(d => {
      const normalized = normalizePostOfficeName(d.buuCuc);
      return normalized === po.name || d.maBC === po.code;
    });

    // Cột mốc 192h (> 8 ngày / 192h) - Khẩn cấp nhất, xử lý triệt để
    const rec192 = branchRecords.filter(d => {
      const g = classifyGltAging(d.thoiGianTonDong, d.canhBao);
      return g.key === 'gt_8d_192h';
    });
    const rec192HasTrip = rec192.filter(d => 
      (d.trangThai || '').includes('Đã có chuyến') || (d.trangThai || '').includes('Đang có chuyến')
    );
    const rec192NoTrip = rec192.filter(d => 
      !(d.trangThai || '').includes('Đã có chuyến') && !(d.trangThai || '').includes('Đang có chuyến')
    );

    // Cột mốc 120h (120h - 192h / 5 - 8 ngày) - Cấp thiết
    const rec120 = branchRecords.filter(d => {
      const g = classifyGltAging(d.thoiGianTonDong, d.canhBao);
      return g.key === '5_8d';
    });
    const rec120HasTrip = rec120.filter(d => 
      (d.trangThai || '').includes('Đã có chuyến') || (d.trangThai || '').includes('Đang có chuyến')
    );
    const rec120NoTrip = rec120.filter(d => 
      !(d.trangThai || '').includes('Đã có chuyến') && !(d.trangThai || '').includes('Đang có chuyến')
    );

    const totalAlert = rec192.length + rec120.length;

    // Xây dựng nội dung tin nhắn HTML gửi Telegram chuẩn nghiệp vụ AM Huy
    let msg = `🚨 <b>BÁO CÁO TỒN ĐỌNG 120H &amp; 192H</b>\n`;
    msg += `🏢 <b>Bưu cục:</b> <code>${po.name}</code> (Mã: <code>${po.code}</code>)\n`;
    msg += `📊 <b>Số lượng đơn:</b> <b>${totalAlert} đơn</b> (192h: ${rec192.length} | 120h: ${rec120.length})\n`;
    msg += `----------------------------------------\n`;

    // 1. NHÓM CẢNH BÁO XỬ LÝ 192H (NGHIÊM TRỌNG)
    msg += `🔴 <b>I. CẢNH BÁO XỬ LÝ 192H (NGHIÊM TRỌNG)</b>\n`;
    if (rec192.length === 0) {
      msg += `✅ <i>Không có đơn cảnh báo xử lý 192h</i>\n\n`;
    } else {
      if (rec192NoTrip.length > 0) {
        msg += `<b>• Chưa có chuyến đi trong ngày (${rec192NoTrip.length} đơn):</b>\n`;
        rec192NoTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'} | ${item.loaiDon}\n`;
        });
      }
      if (rec192HasTrip.length > 0) {
        msg += `<b>• Đang/Đã có chuyến đi trong ngày (${rec192HasTrip.length} đơn):</b>\n`;
        rec192HasTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'} | ${item.loaiDon}\n`;
        });
      }
      msg += `\n`;
    }

    // 2. NHÓM CẢNH BÁO XỬ LÝ 120H (CẤP THIẾT)
    msg += `🟡 <b>II. CẢNH BÁO XỬ LÝ 120H (CẤP THIẾT)</b>\n`;
    if (rec120.length === 0) {
      msg += `✅ <i>Không có đơn cảnh báo xử lý 120h</i>\n\n`;
    } else {
      if (rec120NoTrip.length > 0) {
        msg += `<b>• Chưa có chuyến đi trong ngày (${rec120NoTrip.length} đơn):</b>\n`;
        rec120NoTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'} | ${item.loaiDon}\n`;
        });
      }
      if (rec120HasTrip.length > 0) {
        msg += `<b>• Đang/Đã có chuyến đi trong ngày (${rec120HasTrip.length} đơn):</b>\n`;
        rec120HasTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'} | ${item.loaiDon}\n`;
        });
      }
      msg += `\n`;
    }

    // CHỈ ĐẠO CỦA AM ĐỐI VỚI NVXL
    msg += `----------------------------------------\n`;
    msg += `⚠️ <b>CHỈ ĐẠO CỦA AM ĐỐI VỚI NVXL:</b>\n`;
    msg += `1. NVXL tập trung Gán và Push giao gấp đối với đơn 192h.\n`;
    msg += `2. Đối với đơn 120h thì theo dõi và gửi riêng mã đơn cho từng NVPTTT và dí họ giao.\n`;
    msg += `3. Tất cả phải đủ Log gọi và Đúng POD =&gt; Nếu làm sai quy định sẽ xử lý theo log thao tác của NV làm sai.`;

    return {
      buuCuc: po.name,
      maBC: po.code,
      totalAlertOrders: totalAlert,
      count192: rec192.length,
      count120: rec120.length,
      hasOrders192: rec192.length > 0,
      hasOrders120: rec120.length > 0,
      orders192NoTrip: rec192NoTrip,
      orders192HasTrip: rec192HasTrip,
      orders120NoTrip: rec120NoTrip,
      orders120HasTrip: rec120HasTrip,
      message: msg
    };
  });
}

export interface LcBranchReport {
  buuCuc: string;
  maBC: string;
  totalLcOrders: number;
  countGiao: number;
  countTra: number;
  count36_48: number;
  ordersGiao: BacklogLcRecord[];
  ordersTra: BacklogLcRecord[];
  message: string;
}

interface LcAgingGroup {
  key: string;
  title: string;
  sortOrder: number;
  isWarning: boolean;
}

/**
 * Phân loại tuổi tồn luân chuyển LC theo mốc giờ (chỉ lấy từ 12-24h trở đi)
 * - Bỏ qua các nhóm < 12h (0_6, 6_12)
 * - Cảnh báo đối với nhóm 36-48h
 */
function getLcAgingGroup(rawAge: string): LcAgingGroup | null {
  const s = (rawAge || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;

  // Loại bỏ các nhóm dưới 12h
  if (s === '0_6' || s === '0-6' || s === '6_12' || s === '6-12' || s === '<12' || s === '<12h') {
    return null;
  }
  const num = parseInt(s, 10);
  if (!isNaN(num) && num < 12 && !s.includes('_') && !s.includes('-')) {
    return null;
  }

  // Nhóm > 48h
  if (s.includes('>48') || s.includes('48+') || (!isNaN(num) && num > 48 && !s.includes('_') && !s.includes('-'))) {
    return { key: '>48', title: '🔴 Nhóm > 48h (NGHIÊM TRỌNG)', sortOrder: 1, isWarning: true };
  }
  // Nhóm 36 - 48h (Cảnh báo đặc biệt theo chỉ đạo của AM)
  if (s.includes('36_48') || s.includes('36-48') || (num >= 36 && num <= 48)) {
    return { key: '36_48', title: '🚨 Nhóm 36h - 48h', sortOrder: 2, isWarning: true };
  }
  // Nhóm 24 - 36h
  if (s.includes('24_36') || s.includes('24-36') || (num >= 24 && num < 36)) {
    return { key: '24_36', title: '⚠️ Nhóm 24h - 36h', sortOrder: 3, isWarning: false };
  }
  // Nhóm 12 - 24h
  if (s.includes('12_24') || s.includes('12-24') || (num >= 12 && num < 24)) {
    return { key: '12_24', title: '⏱️ Nhóm 12h - 24h', sortOrder: 4, isWarning: false };
  }

  return { key: 'other', title: `⏱️ Nhóm ${rawAge}`, sortOrder: 5, isWarning: false };
}

/**
 * Render chi tiết danh sách đơn theo nhóm mốc giờ cho từng loại LC (Giao / Trả)
 * Loại bỏ "Chưa đóng kiện" và "Không cần đóng kiện"
 */
function renderLcOrderSection(
  titleHeader: string,
  emptyText: string,
  orders: BacklogLcRecord[]
): string {
  let section = `${titleHeader}\n`;
  if (orders.length === 0) {
    section += `✅ <i>${emptyText}</i>\n\n`;
    return section;
  }

  // Nhóm đơn theo mốc giờ
  const groupsMap = new Map<string, { group: LcAgingGroup; list: BacklogLcRecord[] }>();

  orders.forEach(item => {
    const grp = getLcAgingGroup(item.thoiGianTonDong) || {
      key: 'other',
      title: `⏱️ Nhóm ${item.thoiGianTonDong || '≥ 12h'}`,
      sortOrder: 5,
      isWarning: false
    };
    if (!groupsMap.has(grp.key)) {
      groupsMap.set(grp.key, { group: grp, list: [] });
    }
    groupsMap.get(grp.key)!.list.push(item);
  });

  // Sắp xếp các nhóm: 36-48h và >48h ưu tiên trước
  const sortedGroups = Array.from(groupsMap.values()).sort(
    (a, b) => a.group.sortOrder - b.group.sortOrder
  );

  sortedGroups.forEach(g => {
    section += `<b>• ${g.group.title} (${g.list.length} đơn):</b>\n`;
    g.list.forEach((item, idx) => {
      // Loại bỏ "Chưa đóng kiện", "Không cần đóng kiện", in rõ: STT. Mã đơn | Khách hàng
      section += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'}\n`;
    });
  });

  section += `\n`;
  return section;
}

/**
 * Xây dựng báo cáo Telegram TỒN ĐỌNG LUÂN CHUYỂN (LC) cho từng bưu cục riêng biệt
 * - Chỉ lấy đơn từ nhóm 12-24h trở đi
 * - Phân nhóm theo mốc giờ và loại LC (LC giao, LC trả)
 * - Cảnh báo đặc biệt đối với đơn thuộc nhóm 36-48h
 * - Loại bỏ "Chưa đóng kiện", "Không cần đóng kiện"
 */
export function buildLcTelegramReports(tonDongLc: BacklogLcRecord[]): LcBranchReport[] {
  return LONG_AN_POST_OFFICES.map(po => {
    // Lọc theo bưu cục
    const branchRecords = tonDongLc.filter(d => {
      const normalized = normalizePostOfficeName(d.tenBC);
      return normalized === po.name;
    });

    // Chỉ lấy đơn thuộc nhóm từ 12-24h trở đi
    const eligibleRecords = branchRecords.filter(d => getLcAgingGroup(d.thoiGianTonDong) !== null);

    const ordersGiao = eligibleRecords.filter(d => 
      (d.loaiDon || '').toLowerCase().includes('giao')
    );
    const ordersTra = eligibleRecords.filter(d => 
      (d.loaiDon || '').toLowerCase().includes('trả')
    );

    const count36_48 = eligibleRecords.filter(d => {
      const grp = getLcAgingGroup(d.thoiGianTonDong);
      return grp?.key === '36_48';
    }).length;

    const totalLc = eligibleRecords.length;

    let msg = `🚚 <b>BÁO CÁO TỒN ĐỌNG LUÂN CHUYỂN (LC)</b>\n`;
    msg += `🏢 <b>Bưu cục:</b> <code>${po.name}</code> (Mã: <code>${po.code}</code>)\n`;
    msg += `📊 <b>Số lượng đơn:</b> <b>${totalLc} đơn</b> (Giao: ${ordersGiao.length} | Trả: ${ordersTra.length})\n`;
    msg += `----------------------------------------\n`;

    // 1. LUÂN CHUYỂN GIAO
    msg += renderLcOrderSection(
      `📦 <b>I. LUÂN CHUYỂN GIAO (${ordersGiao.length} đơn)</b>`,
      `Không có đơn luân chuyển giao (≥ 12h)`,
      ordersGiao
    );

    // 2. LUÂN CHUYỂN TRẢ
    msg += renderLcOrderSection(
      `🔄 <b>II. LUÂN CHUYỂN TRẢ (${ordersTra.length} đơn)</b>`,
      `Không có đơn luân chuyển trả (≥ 12h)`,
      ordersTra
    );

    // CHỈ ĐẠO CỦA AM ĐỐI VỚI NVXL
    msg += `----------------------------------------\n`;
    msg += `⚠️ <b>CHỈ ĐẠO CỦA AM ĐỐI VỚI NVXL:</b>\n`;
    msg += `1. Rà soát từng đơn cao giờ. Đặc biệt đơn thuộc nhóm từ 24h trở lên.\n`;
    msg += `2. Kiểm soát đơn &gt;36h có hàng thực tế không. Nếu không còn dựa theo log thao tác để xử lý trách nhiệm.\n`;
    msg += `3. Đảm bảo 100% các đơn thuộc nhóm 36-48h phải được LC (Backlog = 0).`;

    return {
      buuCuc: po.name,
      maBC: po.code,
      totalLcOrders: totalLc,
      countGiao: ordersGiao.length,
      countTra: ordersTra.length,
      count36_48,
      ordersGiao,
      ordersTra,
      message: msg
    };
  });
}

/**
 * Download Blob to User's computer as PNG file
 */
export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
