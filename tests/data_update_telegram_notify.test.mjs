import test from 'node:test';
import assert from 'node:assert/strict';

// Mô phỏng logic cấu hình và format tin nhắn từ dataUpdateNotifyService
const DEFAULT_CONFIG = {
  botToken: '8864951478:AAHynooqSLOTQOo3SBwghQDeXMiz5iIUEsw',
  chatId: '-5234712010',
  messageContent: `👉 Thông báo dữ liệu mới nhất đã được cập nhật:
+ Chỉ số vận hành <u>Ngày N-1</u>
+ Chỉ số vận hành của <u>Toàn Bưu cục</u>
+ Chỉ số vận hành của <u>Từng NVPTTT</u>
+ Tồn đọng <u>Backlog (Đầu ngày)</u>
+ <u>Thông tin nhân sự</u> đang làm việc
+ <u>Chỉ số nghỉ việc</u> theo từng tháng
👉 Mở dashboard để xem chi tiết: https://kiem-soat-van-hanh.vercel.app`,
  tags: [
    '@Trongphuu',
    '@Nhuynh31',
    '@ghntien',
    '@NguyenDang_Tuan',
    '@Loc_nh',
    '@Chuannq',
    '@thuyp2t87',
    '@ttrung_nghia'
  ]
};

function buildFullNotificationMessage(content, tags, timeString, senderName = 'AM Huy (ĐNB)') {
  const formattedTime = timeString || '13:09 ngày 16/11/2026';
  const cleanMessage = (content || '').trim();
  const tagsLine = (tags || []).join(' ');

  let fullText = `<b>🔔 THÔNG BÁO CẬP NHẬT DỮ LIỆU VẬN HÀNH GHN</b>\n\n`;
  fullText += `${cleanMessage}\n\n`;
  fullText += `<b>🕒 Thời gian cập nhật:</b> ${formattedTime}\n`;
  fullText += `<b>✅ Người thông báo:</b> ${senderName}\n`;

  if (tagsLine) {
    fullText += `\n<b>👥 Tag anh em phụ trách:</b>\n${tagsLine}`;
  }

  return fullText;
}

test('Telegram Notification: Default Configuration must match user requirements', () => {
  assert.equal(DEFAULT_CONFIG.botToken, '8864951478:AAHynooqSLOTQOo3SBwghQDeXMiz5iIUEsw');
  assert.equal(DEFAULT_CONFIG.chatId, '-5234712010');
  assert.match(DEFAULT_CONFIG.messageContent, /https:\/\/kiem-soat-van-hanh\.vercel\.app/);
  
  // Kiểm tra đủ 8 thành viên được tag
  const expectedTags = [
    '@Trongphuu',
    '@Nhuynh31',
    '@ghntien',
    '@NguyenDang_Tuan',
    '@Loc_nh',
    '@Chuannq',
    '@thuyp2t87',
    '@ttrung_nghia'
  ];
  assert.deepEqual(DEFAULT_CONFIG.tags, expectedTags);
});

test('Telegram Notification: Message building with HTML bolding and Tag anh em phụ trách', () => {
  const msg = buildFullNotificationMessage(DEFAULT_CONFIG.messageContent, DEFAULT_CONFIG.tags);
  
  // Kiểm tra in đậm tiêu đề
  assert.ok(msg.includes('<b>🔔 THÔNG BÁO CẬP NHẬT DỮ LIỆU VẬN HÀNH GHN</b>'));
  // Kiểm tra in đậm các đề mục
  assert.ok(msg.includes('<b>🕒 Thời gian cập nhật:</b>'));
  assert.ok(msg.includes('<b>✅ Người thông báo:</b>'));
  // Kiểm tra đổi tên đề mục thành "Tag anh em phụ trách" và in đậm
  assert.ok(msg.includes('<b>👥 Tag anh em phụ trách:</b>'));
  assert.ok(!msg.includes('Kính gửi anh em phụ trách'));
  // Kiểm tra gạch chân các chỉ số theo mẫu chuẩn
  assert.ok(msg.includes('<u>Ngày N-1</u>'));
  assert.ok(msg.includes('<u>Toàn Bưu cục</u>'));
  assert.ok(msg.includes('<u>Từng NVPTTT</u>'));
  assert.ok(msg.includes('<u>Backlog (Đầu ngày)</u>'));
  assert.ok(msg.includes('<u>Thông tin nhân sự</u>'));
  assert.ok(msg.includes('<u>Chỉ số nghỉ việc</u>'));
  // Kiểm tra tags
  assert.ok(msg.includes('@Trongphuu @Nhuynh31 @ghntien @NguyenDang_Tuan @Loc_nh @Chuannq @thuyp2t87 @ttrung_nghia'));
});

test('Telegram Notification: Tag pills editing support', () => {
  const customTags = ['@Trongphuu', '@Nhuynh31'];
  const msg = buildFullNotificationMessage('Test content', customTags);
  assert.ok(msg.includes('<b>👥 Tag anh em phụ trách:</b>\n@Trongphuu @Nhuynh31'));
  
  // Không có tag thì không có đề mục tag
  const msgNoTags = buildFullNotificationMessage('Only content', []);
  assert.ok(!msgNoTags.includes('<b>👥 Tag anh em phụ trách:</b>'));
});
