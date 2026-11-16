/**
 * GHN Control Center - Dịch Vụ Thông Báo Cập Nhật Dữ Liệu Qua Telegram Cho Nhân Viên
 * Cho phép AM Huy chủ động sửa nội dung thông báo, thêm/bớt tag nhân sự, và gửi tới Telegram.
 */

export interface DataUpdateNotificationConfig {
  botToken: string;
  chatId: string;
  messageText: string;
  taggedUsers: string[];
  lastSentAt?: number;
  senderName: string;
}

export const STORAGE_NOTIFY_KEY = 'ghn_data_update_notify_config_v3';

export const DEFAULT_NOTIFY_BOT_TOKEN = '8864951478:AAHynooqSLOTQOo3SBwghQDeXMiz5iIUEsw';
export const DEFAULT_NOTIFY_CHAT_ID = '-5234712010';
export const DEFAULT_NOTIFY_MESSAGE = `👉 Thông báo dữ liệu mới nhất đã được cập nhật:
+ Chỉ số vận hành <u>Ngày N-1</u>
+ Chỉ số vận hành của <u>Toàn Bưu cục</u>
+ Chỉ số vận hành của <u>Từng NVPTTT</u>
+ Tồn đọng <u>Backlog (Đầu ngày)</u>
+ <u>Thông tin nhân sự</u> đang làm việc
+ <u>Chỉ số nghỉ việc</u> theo từng tháng
👉 Mở dashboard để xem chi tiết: https://kiem-soat-van-hanh.vercel.app`;

export const DEFAULT_TAGGED_USERS: string[] = [
  '@Trongphuu',
  '@Nhuynh31',
  '@ghntien',
  '@NguyenDang_Tuan',
  '@Loc_nh',
  '@Chuannq',
  '@thuyp2t87',
  '@ttrung_nghia'
];

/**
 * Lấy cấu hình thông báo Telegram hiện tại
 */
export function getDataUpdateNotifyConfig(): DataUpdateNotificationConfig {
  const defaultConfig: DataUpdateNotificationConfig = {
    botToken: DEFAULT_NOTIFY_BOT_TOKEN,
    chatId: DEFAULT_NOTIFY_CHAT_ID,
    messageText: DEFAULT_NOTIFY_MESSAGE,
    taggedUsers: [...DEFAULT_TAGGED_USERS],
    senderName: 'AM Huy (ĐNB)'
  };

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return defaultConfig;
  }

  try {
    const raw = localStorage.getItem(STORAGE_NOTIFY_KEY);
    if (!raw) return defaultConfig;

    const parsed = JSON.parse(raw);
    const resolvedChatId = (parsed.chatId && parsed.chatId.trim() && parsed.chatId.trim() !== '1215576379')
      ? parsed.chatId.trim()
      : DEFAULT_NOTIFY_CHAT_ID;

    return {
      botToken: (parsed.botToken && parsed.botToken.trim()) || DEFAULT_NOTIFY_BOT_TOKEN,
      chatId: resolvedChatId,
      messageText: parsed.messageText !== undefined ? parsed.messageText : DEFAULT_NOTIFY_MESSAGE,
      taggedUsers: Array.isArray(parsed.taggedUsers) && parsed.taggedUsers.length > 0 
        ? parsed.taggedUsers 
        : [...DEFAULT_TAGGED_USERS],
      lastSentAt: parsed.lastSentAt,
      senderName: parsed.senderName || 'AM Huy (ĐNB)'
    };
  } catch (err) {
    console.error('Lỗi đọc cấu hình thông báo Telegram:', err);
    return defaultConfig;
  }
}

/**
 * Lưu cấu hình thông báo Telegram
 */
export function saveDataUpdateNotifyConfig(config: Partial<DataUpdateNotificationConfig>): DataUpdateNotificationConfig {
  const current = getDataUpdateNotifyConfig();
  const updated: DataUpdateNotificationConfig = {
    ...current,
    ...config,
    botToken: (config.botToken && config.botToken.trim()) || current.botToken || DEFAULT_NOTIFY_BOT_TOKEN,
    chatId: (config.chatId && config.chatId.trim()) || current.chatId || DEFAULT_NOTIFY_CHAT_ID,
    messageText: config.messageText !== undefined ? config.messageText.trim() : current.messageText,
    taggedUsers: Array.isArray(config.taggedUsers) ? config.taggedUsers : current.taggedUsers
  };

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_NOTIFY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Lỗi lưu cấu hình thông báo Telegram:', e);
    }
  }

  return updated;
}

/**
 * Lắp ráp toàn bộ tin nhắn Telegram hoàn chỉnh theo chuẩn HTML (in đậm tiêu đề & đề mục)
 */
export function buildFullNotificationMessage(
  messageText: string,
  taggedUsers: string[],
  timeString?: string,
  senderName: string = 'AM Huy (ĐNB)'
): string {
  const now = new Date();
  const formattedTime = timeString || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const cleanMessage = messageText.trim() || DEFAULT_NOTIFY_MESSAGE;
  const tagsLine = taggedUsers.length > 0 ? taggedUsers.join(' ') : '';

  let fullText = `<b>🔔 THÔNG BÁO CẬP NHẬT DỮ LIỆU VẬN HÀNH GHN</b>\n\n`;
  fullText += `${cleanMessage}\n\n`;
  fullText += `<b>🕒 Thời gian cập nhật:</b> ${formattedTime}\n`;
  fullText += `<b>✅ Người thông báo:</b> ${senderName}\n`;

  if (tagsLine) {
    fullText += `\n<b>👥 Tag anh em phụ trách:</b>\n${tagsLine}`;
  }

  return fullText;
}

/**
 * Gửi thông báo trực tiếp qua Telegram Bot API (hỗ trợ parse_mode: HTML để in đậm)
 */
export async function sendDataUpdateTelegram(
  overrideConfig?: Partial<DataUpdateNotificationConfig>
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const cfg = {
    ...getDataUpdateNotifyConfig(),
    ...overrideConfig
  };

  const cleanToken = cfg.botToken.trim() || DEFAULT_NOTIFY_BOT_TOKEN;
  // Cưỡng chế ngưng gửi tới ID cá nhân 1215576379, chỉ gửi tới group -5234712010
  const rawChatId = cfg.chatId.trim();
  const cleanChatId = (rawChatId === '1215576379' || !rawChatId) ? DEFAULT_NOTIFY_CHAT_ID : rawChatId;

  if (!cleanToken) {
    return { ok: false, error: 'Thiếu mã Bot Token Telegram' };
  }
  if (!cleanChatId) {
    return { ok: false, error: 'Thiếu Chat ID Telegram của group' };
  }

  const textToSend = buildFullNotificationMessage(
    cfg.messageText,
    cfg.taggedUsers,
    undefined,
    cfg.senderName
  );

  try {
    const response = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: textToSend,
        parse_mode: 'HTML'
      })
    });

    const resData = await response.json();

    if (resData.ok) {
      saveDataUpdateNotifyConfig({ lastSentAt: Date.now() });
      return {
        ok: true,
        messageId: resData.result?.message_id
      };
    } else {
      return {
        ok: false,
        error: resData.description || `Lỗi Telegram: mã ${resData.error_code}`
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Lỗi kết nối mạng khi gửi tin nhắn Telegram'
    };
  }
}
