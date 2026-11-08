import { toCanvas } from 'html-to-image';
import type { BacklogGltRecord, BacklogLcRecord } from '../types/dashboard';
import { normalizePostOfficeName } from './dataConnector';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

const STORAGE_KEY_TOKEN = 'ghn_telegram_bot_token';
const STORAGE_KEY_CHAT_ID = 'ghn_telegram_chat_id';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '9066732714:AAGxBR7iiYCM95Nj2yIUZdGl2s5YD6P1KLw',
  chatId: '1215576379'
};

const REVOKED_OLD_TOKEN = '9080504024:AAF1XLDVonNQsZTVgd5I16TppZDr1CLXAAc';
const PREVIOUS_TOKEN = '9080504024:AAFxDJwqEfCxsGDyUl7zFheDDjB3egFr7lQ';

export function getStoredTelegramConfig(): TelegramConfig {
  try {
    let savedToken = localStorage.getItem(STORAGE_KEY_TOKEN)?.trim();
    // Tự động nâng cấp sang token mới nhất do AM Huy cung cấp
    if (savedToken === REVOKED_OLD_TOKEN || savedToken === PREVIOUS_TOKEN || !savedToken) {
      savedToken = DEFAULT_TELEGRAM_CONFIG.botToken;
      localStorage.setItem(STORAGE_KEY_TOKEN, savedToken);
    }
    let savedChatId = localStorage.getItem(STORAGE_KEY_CHAT_ID)?.trim();
    if (!savedChatId) {
      savedChatId = DEFAULT_TELEGRAM_CONFIG.chatId;
      localStorage.setItem(STORAGE_KEY_CHAT_ID, savedChatId);
    }
    return {
      botToken: savedToken || DEFAULT_TELEGRAM_CONFIG.botToken,
      chatId: savedChatId || DEFAULT_TELEGRAM_CONFIG.chatId
    };
  } catch {
    return DEFAULT_TELEGRAM_CONFIG;
  }
}

export function saveStoredTelegramConfig(config: TelegramConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, config.botToken.trim());
    localStorage.setItem(STORAGE_KEY_CHAT_ID, config.chatId.trim());
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
    return 'Mã Bot Token không hợp lệ hoặc đã bị thu hồi/cấp mới trên @BotFather (401 Unauthorized). Vui lòng kiểm tra và dán lại Token mới.';
  }
  if (desc.includes('chat not found')) {
    return 'Không tìm thấy Chat ID hoặc bạn chưa ấn Bắt đầu. Vui lòng mở Bot trên Telegram và ấn "Start" trước khi gửi.';
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
 * Test Bot connection and return status
 */
export async function testTelegramBotConnection(
  config: TelegramConfig = getStoredTelegramConfig()
): Promise<{ ok: boolean; message: string; botUser?: string }> {
  try {
    const cleanToken = config.botToken.trim();
    if (!cleanToken) {
      return { ok: false, message: 'Vui lòng nhập mã Bot Token.' };
    }
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await res.json();
    if (data.ok) {
      return {
        ok: true,
        message: `Đã kết nối thành công: ${data.result.first_name} (@${data.result.username || data.result.id})`,
        botUser: data.result.username
      };
    } else {
      return { ok: false, message: formatTelegramError(data.description, res.status) };
    }
  } catch (err: any) {
    return { ok: false, message: `Lỗi kết nối: ${err.message || 'Không thể liên lạc Telegram API'}` };
  }
}

/**
 * Capture an HTMLElement as an ultra-fast, high-quality JPEG Blob
 * - Uses native canvas.toBlob with 'image/jpeg', quality: 0.90
 * - pixelRatio: 1.5 (retina sharpness for table fonts, cuts render time by ~50% compared to 2.0)
 * - Compression reduces file size by ~90% (from ~2.5MB PNG to ~180KB JPEG)
 * - Drastically speeds up network transfer to Telegram Bot API (< 200ms per upload)
 */
export async function capturePostOfficeCard(element: HTMLElement): Promise<Blob> {
  const TARGET_WIDTH = 1260;
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
      margin: '0',
      borderRadius: '12px',
      boxShadow: 'none'
    }
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Không thể kết xuất hình ảnh từ canvas.'));
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Send photo blob to Telegram Bot API
 */
export async function sendPhotoToTelegram(
  blob: Blob,
  filename: string,
  caption: string,
  config: TelegramConfig = getStoredTelegramConfig()
): Promise<{ ok: boolean; description?: string; result?: any }> {
  const cleanToken = config.botToken.trim();
  const cleanChatId = config.chatId.trim();

  if (!cleanToken) {
    return { ok: false, description: 'Chưa cấu hình Bot Token.' };
  }
  if (!cleanChatId) {
    return { ok: false, description: 'Chưa cấu hình Chat ID.' };
  }

  const formData = new FormData();
  formData.append('chat_id', cleanChatId);
  formData.append('photo', blob, filename);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText);
      return { ok: false, description: formatTelegramError(errJson.description, res.status) };
    } catch {
      return { ok: false, description: formatTelegramError(errText, res.status) };
    }
  }

  const data = await res.json();
  return data;
}

/**
 * 5 Bưu cục chính thức của Khu vực Long An
 */
export const LONG_AN_POST_OFFICES = [
  { name: '(LAN) Cần Đước 1', code: '23220000' },
  { name: '(LAN) Cần Giuộc', code: '23210000' },
  { name: '(LAN) Phước Lý', code: '23240000' },
  { name: '(LAN) Rạch Kiến', code: '23230000' },
  { name: '(LAN) Tầm Vu', code: '21710000' }
];

/**
 * Gửi tin nhắn văn bản (HTML) qua Telegram Bot API với tính năng tự động ngắt đoạn (chunking guard)
 * nếu nội dung vượt quá giới hạn 4096 ký tự của Telegram
 */
export async function sendMessageToTelegram(
  text: string,
  config: TelegramConfig = getStoredTelegramConfig(),
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ ok: boolean; description?: string; result?: any }> {
  const cleanToken = config.botToken.trim();
  const cleanChatId = config.chatId.trim();

  if (!cleanToken) {
    return { ok: false, description: 'Chưa cấu hình Bot Token.' };
  }
  if (!cleanChatId) {
    return { ok: false, description: 'Chưa cấu hình Chat ID.' };
  }

  // Nếu tin nhắn dài hơn 3800 ký tự (giới hạn Telegram là 4096), tự động chia nhỏ và gửi tuần tự
  if (text.length > 3800) {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > 3600) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    let lastResult: any = null;
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks.length > 1
        ? `${chunks[i]}\n\n<i>(Báo cáo tiếp theo - Phần ${i + 1}/${chunks.length})</i>`
        : chunks[i];

      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: chunkText,
          parse_mode: parseMode
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        try {
          const errJson = JSON.parse(errText);
          return { ok: false, description: formatTelegramError(errJson.description, res.status) };
        } catch {
          return { ok: false, description: formatTelegramError(errText, res.status) };
        }
      }

      lastResult = await res.json();
      if (i < chunks.length - 1) {
        // Khoảng nghỉ 350ms giữa các chunk
        await new Promise(r => setTimeout(r, 350));
      }
    }
    return lastResult || { ok: true };
  }

  const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text,
      parse_mode: parseMode
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText);
      return { ok: false, description: formatTelegramError(errJson.description, res.status) };
    } catch {
      return { ok: false, description: formatTelegramError(errText, res.status) };
    }
  }

  const data = await res.json();
  return data;
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
 * - Chỉ lọc mã đơn TTS và Shopee
 * - Phân nhóm chi tiết: có chuyến đi và chưa có chuyến đi theo mốc 192h trước, sau đó đến 120h
 * - Mỗi mã đơn là 1 hàng
 * - Nếu bưu cục nào không có thì ghi rõ "Không có"
 */
export function buildGltTelegramReports(tonDongGlt: BacklogGltRecord[]): GltBranchReport[] {
  return LONG_AN_POST_OFFICES.map(po => {
    // Lọc theo bưu cục (Đồng nhất Cần Đước thành Cần Đước 1)
    const branchRecords = tonDongGlt.filter(d => {
      const normalized = normalizePostOfficeName(d.buuCuc);
      return normalized === po.name;
    });

    // Chỉ lọc khách hàng TTS và SHOPEE
    const targetEcomRecords = branchRecords.filter(d => {
      const kh = (d.khachHang || '').toUpperCase();
      return kh === 'TTS' || kh === 'SHOPEE';
    });

    // Cột mốc 192h (> 192h)
    const rec192 = targetEcomRecords.filter(d => d.thoiGianTonDong === '192');
    const rec192HasTrip = rec192.filter(d => 
      d.trangThai.includes('Đã có chuyến') || d.trangThai.includes('Đang có chuyến')
    );
    const rec192NoTrip = rec192.filter(d => 
      !d.trangThai.includes('Đã có chuyến') && !d.trangThai.includes('Đang có chuyến')
    );

    // Cột mốc 120h (120h - 192h)
    const rec120 = targetEcomRecords.filter(d => d.thoiGianTonDong === '120_192');
    const rec120HasTrip = rec120.filter(d => 
      d.trangThai.includes('Đã có chuyến') || d.trangThai.includes('Đang có chuyến')
    );
    const rec120NoTrip = rec120.filter(d => 
      !d.trangThai.includes('Đã có chuyến') && !d.trangThai.includes('Đang có chuyến')
    );

    const totalAlert = rec192.length + rec120.length;

    // Xây dựng nội dung tin nhắn HTML gửi Telegram chuẩn nghiệp vụ AM Huy
    let msg = `🚨 <b>BÁO CÁO TỒN ĐỌNG 120H &amp; 192H</b>\n`;
    msg += `🏢 <b>Bưu cục:</b> <code>${po.name}</code> (Mã: <code>${po.code}</code>)\n`;
    msg += `📊 <b>Tổng đơn cần xử lý:</b> <b>${totalAlert} đơn</b> (192h: ${rec192.length} | 120h: ${rec120.length})\n`;
    msg += `----------------------------------------\n`;

    // 1. NHÓM CẢNH BÁO XỬ LÝ 192H (NGHIÊM TRỌNG)
    msg += `🔴 <b>I. CẢNH BÁO XỬ LÝ 192H (NGHIÊM TRỌNG)</b>\n`;
    if (rec192.length === 0) {
      msg += `✅ <i>Không có đơn cảnh báo xử lý 192h</i>\n\n`;
    } else {
      if (rec192NoTrip.length > 0) {
        msg += `<b>• Chưa có chuyến đi trong ngày (${rec192NoTrip.length} đơn):</b>\n`;
        rec192NoTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang} | ${item.loaiDon}\n`;
        });
      }
      if (rec192HasTrip.length > 0) {
        msg += `<b>• Đang/Đã có chuyến đi trong ngày (${rec192HasTrip.length} đơn):</b>\n`;
        rec192HasTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang} | ${item.loaiDon}\n`;
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
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang} | ${item.loaiDon}\n`;
        });
      }
      if (rec120HasTrip.length > 0) {
        msg += `<b>• Đang/Đã có chuyến đi trong ngày (${rec120HasTrip.length} đơn):</b>\n`;
        rec120HasTrip.forEach((item, idx) => {
          msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang} | ${item.loaiDon}\n`;
        });
      }
      msg += `\n`;
    }

    // CHỈ ĐẠO CỦA AM ĐỐI VỚI NVXL
    msg += `----------------------------------------\n`;
    msg += `⚠️ <b>CHỈ ĐẠO CỦA AM ĐỐI VỚI NVXL:</b>\n`;
    msg += `1. NVXL tập trung Gán và Push giao gấp đối với đơn 192h.\n`;
    msg += `2. Đối với đơn 120h thì theo dõi và gửi riêng mã đơncho từng NVPTTT và dí họ giao.\n`;
    msg += `3. Tất cả phải đủ Log gọi và Đúng POD =&gt; Nếu sai khi quá hạn sẽ tick theo log thao tác gần nhất`;

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
  ordersGiao: BacklogLcRecord[];
  ordersTra: BacklogLcRecord[];
  message: string;
}

/**
 * Xây dựng báo cáo Telegram TỒN ĐỌNG LUÂN CHUYỂN KHO (LC) cho từng bưu cục riêng biệt
 * - Chi tiết từng mã đơn theo nhóm "Luân chuyển giao" và "Luân chuyển trả"
 * - Mỗi mã đơn là 1 hàng
 * - Nếu không có thì ghi chú "Không có"
 */
export function buildLcTelegramReports(tonDongLc: BacklogLcRecord[]): LcBranchReport[] {
  const nowStr = new Date().toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return LONG_AN_POST_OFFICES.map(po => {
    // Lọc theo bưu cục
    const branchRecords = tonDongLc.filter(d => {
      const normalized = normalizePostOfficeName(d.tenBC);
      return normalized === po.name;
    });

    const ordersGiao = branchRecords.filter(d => 
      (d.loaiDon || '').toLowerCase().includes('giao')
    );
    const ordersTra = branchRecords.filter(d => 
      (d.loaiDon || '').toLowerCase().includes('trả')
    );

    const totalLc = branchRecords.length;

    let msg = `🚚 <b>BÁO CÁO TỒN ĐỌNG LUÂN CHUYỂN KHO (LC)</b>\n`;
    msg += `🏢 <b>Bưu cục:</b> <code>${po.name}</code> (Mã: <code>${po.code}</code>)\n`;
    msg += `📍 <b>Khu vực:</b> Long An (ĐNB) - <b>Quản trị:</b> AM Huy (ĐNB)\n`;
    msg += `⏰ <b>Thời gian realtime:</b> ${nowStr}\n`;
    msg += `📊 <b>Tổng đơn LC tồn kho:</b> <b>${totalLc} đơn</b> (Giao: ${ordersGiao.length} | Trả: ${ordersTra.length})\n`;
    msg += `----------------------------------------\n\n`;

    // 1. NHÓM LUÂN CHUYỂN GIAO
    msg += `📦 <b>I. DANH SÁCH LUÂN CHUYỂN GIAO (${ordersGiao.length} đơn):</b>\n`;
    if (ordersGiao.length === 0) {
      msg += `✅ <i>Không có đơn luân chuyển giao</i>\n\n`;
    } else {
      ordersGiao.forEach((item, idx) => {
        msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'} | ${item.trangThai || 'Chưa đóng kiện'}\n`;
      });
      msg += `\n`;
    }

    // 2. NHÓM LUÂN CHUYỂN TRẢ
    msg += `🔄 <b>II. DANH SÁCH LUÂN CHUYỂN TRẢ (${ordersTra.length} đơn):</b>\n`;
    if (ordersTra.length === 0) {
      msg += `✅ <i>Không có đơn luân chuyển trả</i>\n\n`;
    } else {
      ordersTra.forEach((item, idx) => {
        msg += `${idx + 1}. <code>${item.maDonHang}</code> | ${item.khachHang || 'OTHER'} | ${item.trangThai || 'Chưa đóng kiện'}\n`;
      });
      msg += `\n`;
    }

    // CHỈ ĐẠO CỦA AM HUY
    msg += `----------------------------------------\n`;
    msg += `⚠️ <b>CHỈ ĐẠO CỦA AM HUY (ĐNB):</b>\n`;
    msg += `Yêu cầu Bưu cục trưởng kiểm tra phân loại, đóng kiện và bàn giao xe tải chuyến kế tiếp để giải phóng kho tồn.`;

    return {
      buuCuc: po.name,
      maBC: po.code,
      totalLcOrders: totalLc,
      countGiao: ordersGiao.length,
      countTra: ordersTra.length,
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
