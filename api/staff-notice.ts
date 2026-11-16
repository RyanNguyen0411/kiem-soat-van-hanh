import type { IncomingMessage, ServerResponse } from 'node:http';
import { readValidatedJsonBody, sendJson } from './_lib/http.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export interface ServerNoticeData {
  title: string;
  bannerTag: string;
  greeting: string;
  content: string;
  closingGreeting: string;
  sender: string;
  updatedAt: number;
  version: number;
}

// In-memory global store as primary high-speed cache
let currentServerNotice: ServerNoticeData = {
  title: 'THÔNG BÁO & HƯỚNG DẪN SỬ DỤNG DASHBOARD VẬN HÀNH',
  bannerTag: 'QUY ĐỊNH BẮT BUỘC',
  greeting: 'Chào mừng anh em đến với Dashboard Vận hành Bưu cục! Vui lòng lưu ý các nội dung cốt lõi dưới đây:',
  content: `1. NGUỒN DỮ LIỆU & BẢN QUYỀN
• Số liệu được tổng hợp từ nguồn kiểm soát gốc do AM Huy bảo trợ và chịu trách nhiệm.
• Dashboard thuộc quyền sở hữu & quản trị của AM Huy – ĐNB. Mọi góp ý hoặc thắc mắc vui lòng liên hệ trực tiếp AM.

2. THỜI GIAN CẬP NHẬT DỮ LIỆU
• Dữ liệu Vận hành & GTC: Cập nhật định kỳ trước 10h00 hằng ngày.
• Dữ liệu Tồn đọng (Backlog): Cập nhật 2 khung giờ chính: Sáng (08h00 – 10h00) & Chiều (14h00 – 17h00) hoặc đột xuất theo nhịp vận hành bưu cục.

3. QUY ĐỊNH BẢO MẬT TÀI KHOẢN NỘI BỘ
• Tuyệt đối bảo mật User/Pass, chỉ dùng cho nội bộ nhân sự xử lý (NVXL) tại bưu cục.
• Nghiêm cấm chia sẻ tài khoản hoặc trích xuất số liệu ra ngoài phạm vi bưu cục khi chưa được AM phê duyệt.
• Nhập sai mật khẩu quá 5 lần tài khoản sẽ tự động khóa. Liên hệ AM để mở khóa hoặc cấp lại mật khẩu.

4. MỤC TIÊU VẬN HÀNH & HÀNH ĐỘNG
• Chủ động theo dõi chỉ số, phát hiện điểm nghẽn và xử lý tồn đọng kịp thời trong ca.
• Biến chỉ số thành hành động thực tế để nâng cao chất lượng phục vụ và hoàn thành xuất sắc mục tiêu bưu cục.`,
  closingGreeting: 'Chúc toàn thể anh em vận hành thông suốt, an toàn và hiệu quả!',
  sender: 'AM Huy – ĐNB',
  updatedAt: 1763265600000,
  version: 1
};

export async function processStaffNoticeRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
    res.end();
    return;
  }

  // GET: Trả về thông báo mới nhất ngay lập tức (không cache)
  if (req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      notice: currentServerNotice,
      serverTime: Date.now()
    });
    return;
  }

  // POST: AM Huy cập nhật thông báo mới
  if (req.method === 'POST') {
    try {
      const body = await readValidatedJsonBody(req);
      const content = typeof body.content === 'string' ? body.content.trim() : '';

      if (!content) {
        sendJson(res, 400, {
          success: false,
          error: 'Nội dung thông báo không được để trống'
        });
        return;
      }

      const now = Date.now();
      const updatedVersion = (currentServerNotice.version || 1) + 1;

      currentServerNotice = {
        title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : currentServerNotice.title,
        bannerTag: typeof body.bannerTag === 'string' && body.bannerTag.trim() ? body.bannerTag.trim() : currentServerNotice.bannerTag,
        greeting: typeof body.greeting === 'string' ? body.greeting.trim() : currentServerNotice.greeting,
        content: content,
        closingGreeting: typeof body.closingGreeting === 'string' ? body.closingGreeting.trim() : currentServerNotice.closingGreeting,
        sender: typeof body.sender === 'string' && body.sender.trim() ? body.sender.trim() : 'AM Huy – ĐNB',
        updatedAt: now,
        version: updatedVersion
      };

      sendJson(res, 200, {
        success: true,
        message: 'Đã cập nhật thông báo phân hệ thành công!',
        notice: currentServerNotice
      });
    } catch (err: any) {
      sendJson(res, 500, {
        success: false,
        error: err?.message || 'Lỗi xử lý cập nhật thông báo server'
      });
    }
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  return processStaffNoticeRequest(req, res);
}
