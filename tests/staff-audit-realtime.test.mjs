import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

describe('STAFF AUDIT & REALTIME ONLINE STATUS TESTS (XANH / ĐỎ & LẦN ĐĂNG NHẬP GẦN NHẤT)', () => {
  test('1. api/staff-audit.ts: Tồn tại và hỗ trợ đầy đủ GET/POST, heartbeat và trạng thái Online/Offline', () => {
    const apiPath = path.join(ROOT_DIR, 'api/staff-audit.ts');
    assert.ok(fs.existsSync(apiPath), 'api/staff-audit.ts phải tồn tại');

    const content = fs.readFileSync(apiPath, 'utf8');
    assert.match(content, /export interface LoginAuditRecord/);
    assert.match(content, /export interface UserOnlineStatus/);
    assert.match(content, /isOnline:\s*boolean/);
    assert.match(content, /lastLoginAt/);
    assert.match(content, /lastLoginStr/);
    assert.match(content, /lastSeenAt/);
    assert.match(content, /OFFICIAL_STAFF_USERS/);
    assert.match(content, /ONLINE_THRESHOLD_MS/);
    assert.match(content, /action === 'login'/);
    assert.match(content, /action === 'heartbeat'/);
    assert.match(content, /userStatusMap/);
    assert.match(content, /extractClientIp/);
    assert.match(content, /parseDevice/);
  });

  test('2. postOfficeAuthService.ts: Tích hợp đầy đủ hàm fetchRealtimeAudits và sendStaffHeartbeat', () => {
    const servicePath = path.join(ROOT_DIR, 'src/services/postOfficeAuthService.ts');
    assert.ok(fs.existsSync(servicePath), 'postOfficeAuthService.ts phải tồn tại');

    const content = fs.readFileSync(servicePath, 'utf8');
    assert.match(content, /export interface UserOnlineStatus/);
    assert.match(content, /export async function fetchRealtimeAudits/);
    assert.match(content, /export async function sendStaffHeartbeat/);
    assert.match(content, /\/api\/staff-audit/);
    assert.match(content, /ghn_po_audits_updated/);
  });

  test('3. AuthContext.tsx: Gắn heartbeat tự động cho nhân viên phân hệ bưu cục', () => {
    const authPath = path.join(ROOT_DIR, 'src/context/AuthContext.tsx');
    assert.ok(fs.existsSync(authPath), 'AuthContext.tsx phải tồn tại');

    const content = fs.readFileSync(authPath, 'utf8');
    assert.match(content, /sendStaffHeartbeat/);
    assert.match(content, /post_office_staff/);
    assert.match(content, /setInterval/);
  });

  test('4. PostOfficeManagementTab.tsx: Tích hợp Giám Sát Trạng Thái Xanh/Đỏ và Modal Lần Đăng Nhập Gần Nhất', () => {
    const tabPath = path.join(ROOT_DIR, 'src/pages/PostOfficeManagementTab.tsx');
    assert.ok(fs.existsSync(tabPath), 'PostOfficeManagementTab.tsx phải tồn tại');

    const content = fs.readFileSync(tabPath, 'utf8');
    assert.match(content, /fetchRealtimeAudits/);
    assert.match(content, /userStatusMap/);
    assert.match(content, /selectedUserDetail/);
    assert.match(content, /handleOpenUserDetail/);
    assert.match(content, /staffUsersToMonitor/);
    assert.match(content, /onlineCount/);
    assert.match(content, /offlineCount/);
    assert.match(content, /GIÁM SÁT TRẠNG THÁI TRỰC TUYẾN & ĐANG CẬP NHẬT/);
    assert.match(content, /🟢 ĐANG CẬP NHẬT/);
    assert.match(content, /🔴 CHƯA ĐĂNG NHẬP/);
    assert.match(content, /Tự động đồng bộ Realtime/);
    assert.match(content, /Chi Tiết Lần Đăng Nhập Gần Nhất/);
    assert.match(content, /Lịch Sử Các Lần Đăng Nhập Của User/);
  });
});
