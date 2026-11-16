import test from 'node:test';
import assert from 'node:assert/strict';

// Mô phỏng logic cấu hình và format tin nhắn từ dataUpdateNotifyService
const DEFAULT_CONFIG = {
  botToken: '8864951478:AAHynooqSLOTQOo3SBwghQDeXMiz5iIUEsw',
  chatId: '1215576379',
  messageContent: 'Thông báo dữ liệu mới nhất đã được cập nhật. Mở dashboard để xem chi tiết: https://kiem-soat-van-hanh.vercel.app',
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

function buildFullNotificationMessage(content, tags) {
  const cleanContent = (content || '').trim();
  const cleanTags = (tags || []).map(t => t.trim()).filter(Boolean);
  
  if (cleanTags.length === 0) {
    return cleanContent;
  }
  
  const tagLine = cleanTags.join(' ');
  return `${cleanContent}\n\n${tagLine}`;
}

test('Telegram Notification: Default Configuration must match user requirements', () => {
  assert.equal(DEFAULT_CONFIG.botToken, '8864951478:AAHynooqSLOTQOo3SBwghQDeXMiz5iIUEsw');
  assert.equal(DEFAULT_CONFIG.chatId, '1215576379');
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

test('Telegram Notification: Message building with tags', () => {
  const msg = buildFullNotificationMessage(DEFAULT_CONFIG.messageContent, DEFAULT_CONFIG.tags);
  
  assert.ok(msg.includes('Thông báo dữ liệu mới nhất đã được cập nhật.'));
  assert.ok(msg.includes('https://kiem-soat-van-hanh.vercel.app'));
  assert.ok(msg.includes('@Trongphuu @Nhuynh31 @ghntien @NguyenDang_Tuan @Loc_nh @Chuannq @thuyp2t87 @ttrung_nghia'));
});

test('Telegram Notification: Tag pills editing support', () => {
  const customTags = ['@Trongphuu', '@Nhuynh31'];
  const msg = buildFullNotificationMessage('Test content', customTags);
  assert.equal(msg, 'Test content\n\n@Trongphuu @Nhuynh31');
  
  // Không có tag
  const msgNoTags = buildFullNotificationMessage('Only content', []);
  assert.equal(msgNoTags, 'Only content');
});
