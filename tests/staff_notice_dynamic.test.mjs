import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('CẬP NHẬT THÔNG BÁO PHÂN HỆ BƯU CỤC - KIỂM THỬ ĐỘNG & TINH GỌN', async (t) => {
  
  await t.test('1. File staffNoticeService.ts tồn tại và xuất đầy đủ hàm & cấu trúc', () => {
    const servicePath = path.join(ROOT_DIR, 'src/services/staffNoticeService.ts');
    assert.ok(fs.existsSync(servicePath), 'staffNoticeService.ts phải tồn tại');

    const content = fs.readFileSync(servicePath, 'utf8');
    assert.match(content, /export interface StaffNoticeConfig/);
    assert.match(content, /export const DEFAULT_STAFF_NOTICE_CONFIG/);
    assert.match(content, /export function getStaffNoticeConfig/);
    assert.match(content, /export function saveStaffNoticeConfig/);
    assert.match(content, /export function resetStaffNoticeToDefault/);
    assert.match(content, /export function formatNoticeDate/);
    assert.match(content, /ghn_staff_notice_updated/);
    assert.match(content, /ghn_staff_notice_config_v2/);
  });

  await t.test('2. Mẫu thông báo mặc định tinh gọn và chứa đủ các mục cốt lõi', () => {
    const serviceContent = fs.readFileSync(path.join(ROOT_DIR, 'src/services/staffNoticeService.ts'), 'utf8');
    assert.match(serviceContent, /THÔNG BÁO & HƯỚNG DẪN SỬ DỤNG DASHBOARD VẬN HÀNH/);
    assert.match(serviceContent, /1\. NGUỒN DỮ LIỆU & BẢN QUYỀN/);
    assert.match(serviceContent, /2\. THỜI GIAN CẬP NHẬT DỮ LIỆU/);
    assert.match(serviceContent, /3\. QUY ĐỊNH BẢO MẬT TÀI KHOẢN NỘI BỘ/);
    assert.match(serviceContent, /4\. MỤC TIÊU VẬN HÀNH & HÀNH ĐỘNG/);
    assert.match(serviceContent, /AM Huy – ĐNB/);
  });

  await t.test('3. StaffNoticeModal.tsx hỗ trợ nội dung động từ AM và chế độ xem trước', () => {
    const modalContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/auth/StaffNoticeModal.tsx'), 'utf8');
    assert.match(modalContent, /getStaffNoticeConfig/);
    assert.match(modalContent, /NOTICE_UPDATED_EVENT/);
    assert.match(modalContent, /STORAGE_STAFF_NOTICE_KEY/);
    assert.match(modalContent, /formatNoticeDate/);
    assert.match(modalContent, /parsedSections/);
    assert.match(modalContent, /Thời gian AM cập nhật gần nhất:/);
    assert.match(modalContent, /Đồng ý & Bắt đầu sử dụng/);
    assert.match(modalContent, /isPreview/);
    assert.match(modalContent, /previewConfig/);
  });

  await t.test('4. PostOfficeManagementTab.tsx tích hợp khu vực Quản Lý & Cập Nhật Thông Báo', () => {
    const tabContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/PostOfficeManagementTab.tsx'), 'utf8');
    assert.match(tabContent, /QUẢN LÝ & CẬP NHẬT THÔNG BÁO PHÂN HỆ BƯU CỤC/);
    assert.match(tabContent, /noticeTitle/);
    assert.match(tabContent, /noticeBannerTag/);
    assert.match(tabContent, /noticeGreeting/);
    assert.match(tabContent, /noticeContent/);
    assert.match(tabContent, /noticeClosing/);
    assert.match(tabContent, /noticeSender/);
    assert.match(tabContent, /handleSaveNotice/);
    assert.match(tabContent, /handleResetNoticeDefault/);
    assert.match(tabContent, /handleApplySaleTemplate/);
    assert.match(tabContent, /handleApplyBacklogTemplate/);
    assert.match(tabContent, /Cập Nhật Thông Báo Cho Phân Hệ/);
    assert.match(tabContent, /Xem Trước \(Preview\)/);
    assert.match(tabContent, /isPreviewNoticeOpen/);
  });

  await t.test('5. Logic đồng bộ: AM cập nhật ở dashboard nguồn thì phân hệ nhân viên nhận thông báo mới', async () => {
    const { 
      DEFAULT_STAFF_NOTICE_CONFIG, 
      saveStaffNoticeConfig, 
      getStaffNoticeConfig 
    } = await import('../src/services/staffNoticeService.ts');

    // Giả lập lưu nội dung mới từ AM
    const newCustomNotice = {
      title: 'THÔNG BÁO KHẨN: TẬP TRUNG GIAO ĐƠN SALE 15.11',
      bannerTag: 'KHẨN CẤP',
      greeting: 'Gửi anh em 5 bưu cục Long An:',
      content: `1. TIẾN ĐỘ GIAO HÀNG
• Yêu cầu hoàn thành giao 100% đơn trong ngày.
2. XỬ LÝ TỒN
• Báo cáo trực tiếp AM các ca phát sinh.`,
      closingGreeting: 'Chúc anh em hoàn thành xuất sắc ca trực!',
      sender: 'AM Huy – ĐNB'
    };

    const saveResult = saveStaffNoticeConfig(newCustomNotice);
    assert.equal(saveResult.success, true);
    assert.equal(saveResult.config.title, 'THÔNG BÁO KHẨN: TẬP TRUNG GIAO ĐƠN SALE 15.11');
    assert.equal(saveResult.config.bannerTag, 'KHẨN CẤP');
    assert.ok(saveResult.config.content.includes('TIẾN ĐỘ GIAO HÀNG'));
    assert.ok(saveResult.config.version >= 1);
  });

  await t.test('6. API serverless api/staff-notice.ts tồn tại và hỗ trợ GET / POST đồng bộ tức thì', () => {
    const apiPath = path.join(ROOT_DIR, 'api/staff-notice.ts');
    assert.ok(fs.existsSync(apiPath), 'api/staff-notice.ts phải tồn tại');

    const apiContent = fs.readFileSync(apiPath, 'utf8');
    assert.match(apiContent, /processStaffNoticeRequest/);
    assert.match(apiContent, /req\.method === 'GET'/);
    assert.match(apiContent, /req\.method === 'POST'/);
    assert.match(apiContent, /currentServerNotice/);
  });

  await t.test('7. AuthContext.tsx xóa ack và reset isNoticeAcknowledged khi nhận lệnh cập nhật từ AM', () => {
    const authContextPath = path.join(ROOT_DIR, 'src/context/AuthContext.tsx');
    const authContent = fs.readFileSync(authContextPath, 'utf8');

    assert.match(authContent, /handleNoticeRealtimeUpdate/);
    assert.match(authContent, /sessionStorage\.removeItem\(`ghn_staff_notice_ack_\$\{currentUser\.username\}`\)/);
    assert.match(authContent, /setIsNoticeAcknowledged\(false\)/);
    assert.match(authContent, /startNoticeSyncHeartbeat/);
  });

  await t.test('8. staffNoticeService.ts tích hợp BroadcastChannel và Heartbeat 3s', () => {
    const servicePath = path.join(ROOT_DIR, 'src/services/staffNoticeService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    assert.match(serviceContent, /BroadcastChannel/);
    assert.match(serviceContent, /FORCE_NOTICE_UPDATE/);
    assert.match(serviceContent, /startNoticeSyncHeartbeat/);
    assert.match(serviceContent, /checkServerNoticeUpdates/);
    assert.match(serviceContent, /fetch\('\/api\/staff-notice'/);
  });

});
