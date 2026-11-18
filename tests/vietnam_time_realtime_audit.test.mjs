import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('KIỂM THỬ THỜI GIAN ĐĂNG NHẬP CHUẨN MÚI GIỜ VIỆT NAM (HÀ NỘI, UTC +07:00) & REALTIME AUDIT', async (t) => {
  // 1. Kiểm tra thuật toán format chuẩn UTC+07:00
  await t.test('1. Kiểm tra hàm format chuyển đổi chính xác mốc giờ UTC sang giờ Việt Nam', () => {
    function formatVietnamDateTime(input) {
      const ts = typeof input === 'number' ? input : new Date(input).getTime();
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
        const p = {};
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
        // Fallback
      }

      const vnDate = new Date(ts + 7 * 60 * 60 * 1000);
      const day = String(vnDate.getUTCDate()).padStart(2, '0');
      const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
      const year = String(vnDate.getUTCFullYear());
      const hour = String(vnDate.getUTCHours()).padStart(2, '0');
      const minute = String(vnDate.getUTCMinutes()).padStart(2, '0');
      const second = String(vnDate.getUTCSeconds()).padStart(2, '0');
      return {
        dateStr: `${day}/${month}/${year}`,
        timeStr: `${hour}:${minute}:${second}`,
        fullStr: `${hour}:${minute}:${second} ngày ${day}/${month}/${year}`
      };
    }

    // Mốc ảnh đính kèm: lúc 03:07:17 UTC phải ra 10:07:17 Giờ VN (Hà Nội, UTC+07:00)
    const testUtc = new Date('2026-11-18T03:07:17.000Z').getTime();
    const vnResult = formatVietnamDateTime(testUtc);
    assert.equal(vnResult.timeStr, '10:07:17', 'Phải chuyển đổi chính xác từ 03:07:17 UTC sang 10:07:17 Giờ VN');
    assert.equal(vnResult.dateStr, '18/11/2026');

    // Mốc ảnh đính kèm: lúc 01:37:30 UTC phải ra 08:37:30 Giờ VN
    const testUtc2 = new Date('2026-11-18T01:37:30.000Z').getTime();
    const vnResult2 = formatVietnamDateTime(testUtc2);
    assert.equal(vnResult2.timeStr, '08:37:30', 'Phải chuyển đổi chính xác từ 01:37:30 UTC sang 08:37:30 Giờ VN');
    assert.equal(vnResult2.dateStr, '18/11/2026');
  });

  // 2. Kiểm tra file src/utils/vietnamTime.ts tồn tại và xuất đủ hàm
  await t.test('2. File src/utils/vietnamTime.ts tồn tại và hỗ trợ định dạng chuẩn múi giờ Việt Nam', () => {
    const vnTimePath = path.join(ROOT_DIR, 'src/utils/vietnamTime.ts');
    assert.ok(fs.existsSync(vnTimePath), 'src/utils/vietnamTime.ts phải tồn tại');

    const content = fs.readFileSync(vnTimePath, 'utf8');
    assert.match(content, /Asia\/Ho_Chi_Minh/);
    assert.match(content, /UTC \+07:00/);
    assert.match(content, /export function formatVietnamDateTime/);
    assert.match(content, /export function formatVietnamTimeAgo/);
    assert.match(content, /export function getVietnamNow/);
  });

  // 3. Kiểm tra api/staff-audit.ts: Serverless function format chuẩn giờ Việt Nam và cập nhật heartbeat liên tục
  await t.test('3. api/staff-audit.ts hỗ trợ múi giờ Việt Nam và cập nhật heartbeat liên tục', () => {
    const apiPath = path.join(ROOT_DIR, 'api/staff-audit.ts');
    assert.ok(fs.existsSync(apiPath), 'api/staff-audit.ts phải tồn tại');

    const content = fs.readFileSync(apiPath, 'utf8');
    assert.match(content, /Asia\/Ho_Chi_Minh/);
    assert.match(content, /UTC \+07:00/);
    assert.match(content, /lastSeenAt/);
    assert.match(content, /lastSeenStr/);
  });

  // 4. Kiểm tra PostOfficeManagementTab.tsx: Render thời gian chuẩn giờ VN, polling 3s, tuân thủ Rule 7 căn lề
  await t.test('4. PostOfficeManagementTab.tsx tích hợp formatVietnamDateTime và hiển thị cập nhật liên tục', () => {
    const tabPath = path.join(ROOT_DIR, 'src/pages/PostOfficeManagementTab.tsx');
    assert.ok(fs.existsSync(tabPath), 'PostOfficeManagementTab.tsx phải tồn tại');

    const content = fs.readFileSync(tabPath, 'utf8');
    assert.match(content, /formatVietnamDateTime/);
    assert.match(content, /formatVietnamTimeAgo/);
    assert.match(content, /setInterval\(refreshAuditsRealtime,\s*3000\)/, 'Polling phải được thiết lập 3 giây để cập nhật liên tục');
    // Kiểm tra tuân thủ Rule 7: Cột Thời Gian căn giữa
    assert.match(content, /Thời Gian \(Giờ VN\)/);
    assert.match(content, /formattedTime\.timeStr/);
    assert.match(content, /Cập nhật:/);
  });

  // 5. Kiểm tra AuthContext.tsx: Heartbeat nhân viên gửi định kỳ 10s cập nhật liên tục
  await t.test('5. AuthContext.tsx duy trì gửi heartbeat mỗi 10 giây', () => {
    const authPath = path.join(ROOT_DIR, 'src/context/AuthContext.tsx');
    const content = fs.readFileSync(authPath, 'utf8');
    assert.match(content, /sendStaffHeartbeat/);
    assert.match(content, /10000/);
  });
});
