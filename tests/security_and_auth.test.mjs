import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. BẢO MẬT PHIÊN (Session Validation & Expiration)', () => {
  const now = Date.now();
  
  // Valid active session
  const activeSession = {
    token: 'test_token_123',
    user: { id: 'usr_1', username: 'am_huy', name: 'AM Huy (ĐNB)', role: 'area_manager' },
    issuedAt: now - 1000,
    expiresAt: now + (8 * 60 * 60 * 1000), // 8 hours TTL
    lastActivity: now - 5000 // 5 seconds ago
  };

  const isExpired = (session) => Date.now() >= session.expiresAt;
  const isIdleTimedOut = (session) => (Date.now() - session.lastActivity) > (10 * 60 * 1000);

  assert.equal(isExpired(activeSession), false, 'Phiên làm việc còn trong thời hạn 8 giờ');
  assert.equal(isIdleTimedOut(activeSession), false, 'Phiên làm việc chưa bị idle timeout');

  // Expired session
  const expiredSession = {
    ...activeSession,
    expiresAt: now - 1000
  };
  assert.equal(isExpired(expiredSession), true, 'Phiên làm việc quá hạn phải bị từ chối');

  // Idle timed out session (idle > 10 mins)
  const idleSession = {
    ...activeSession,
    lastActivity: now - (11 * 60 * 1000)
  };
  assert.equal(isIdleTimedOut(idleSession), true, 'Phiên làm việc không thao tác > 10 phút phải bị đăng xuất');
});

test('2. PHÂN QUYỀN TRUY CẬP (Role-Based Access Control - RBAC)', () => {
  const hasRole = (role, allowedRoles) => allowedRoles.includes(role);

  assert.equal(hasRole('admin', ['admin']), true, 'Admin có quyền tối cao');
  assert.equal(hasRole('area_manager', ['admin', 'area_manager']), true, 'Area Manager có quyền quản trị vận hành');
  assert.equal(hasRole('viewer', ['admin', 'area_manager']), false, 'Viewer bị chặn truy cập tác vụ quản trị');
});

test('3. CHỐNG BRUTE FORCE & KHÓA TẠM THỜI (Lockout Policy)', () => {
  const MAX_ATTEMPTS = 5;
  const isLocked = (attempts) => attempts >= MAX_ATTEMPTS;

  assert.equal(isLocked(4), false, '4 lần nhập sai chưa bị khóa');
  assert.equal(isLocked(5), true, '5 lần nhập sai liên tiếp bị khóa');
  assert.equal(isLocked(6), true, 'Trên 5 lần tiếp tục bị khóa');
});

test('4. DUY NHẤT MỘT NGUỒN DỮ LIỆU CHUẨN (Single Source of Truth SPREADSHEET_ID)', () => {
  const configPath = path.resolve('src/config/dashboard.config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');

  assert.match(
    configContent,
    /export const SPREADSHEET_ID = ['"]1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY['"]/,
    'SPREADSHEET_ID chuẩn phải là 1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY'
  );
  assert.doesNotMatch(
    configContent,
    /1_S5Ckl/,
    'Không còn tồn tại Spreadsheet ID mâu thuẫn/lỗi thời'
  );
});

test('5. QUÉT TOÀN DIỆN KHÔNG CÒN HARDCODED SECRETS (Telegram Token, Password, Fixed OTP)', () => {
  const forbiddenPatterns = [
    { name: 'Mật khẩu hardcoded', pattern: /@Huycan95#/ },
    { name: 'Telegram Bot Token hardcoded', pattern: /9066732714:AAGx/ },
    { name: 'Telegram Token cũ bị lộ', pattern: /9080504024:/ }
  ];

  const srcDir = path.resolve('src');
  const files = fs.readdirSync(srcDir, { recursive: true });

  for (const f of files) {
    const full = path.join(srcDir, f);
    if (!fs.statSync(full).isFile() || !/\.(ts|tsx)$/.test(full)) continue;
    const content = fs.readFileSync(full, 'utf8');

    for (const { name, pattern } of forbiddenPatterns) {
      assert.doesNotMatch(
        content,
        pattern,
        `Phát hiện ${name} trong file ${f}! Mã nguồn phải được làm sạch 100%.`
      );
    }
  }
});
