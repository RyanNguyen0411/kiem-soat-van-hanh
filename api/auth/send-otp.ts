import type { IncomingMessage, ServerResponse } from 'node:http';
import { getMissingEnvVars, redactSensitive } from '../_lib/env.js';
import { HttpValidationError, readValidatedJsonBody, sendJson } from '../_lib/http.js';
import {
  createSupabaseRateLimitStore,
  extractTrustedClientIp,
  guardAndConsumeSendOtpRateLimit,
  sendRateLimited,
  type RateLimitStore
} from '../_lib/rateLimit.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sendOtpWithUpstream, type UpstreamOtpSendResult } from '../_lib/upstreamAuth.js';

export interface SendOtpDeps {
  getMissingEnv: () => string[];
  getRateLimitStore: () => RateLimitStore;
  sendOtp: (params: { phone: string }) => Promise<UpstreamOtpSendResult>;
  rateLimitSecret?: string;
}

const defaultDeps: SendOtpDeps = {
  getMissingEnv: getMissingEnvVars,
  getRateLimitStore: () => createSupabaseRateLimitStore(getSupabaseAdmin()),
  sendOtp: sendOtpWithUpstream
};

export async function processSendOtpRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  deps: SendOtpDeps = defaultDeps
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readValidatedJsonBody(req);
  } catch (err) {
    if (err instanceof HttpValidationError) {
      sendJson(res, err.statusCode, { success: false, error: err.message });
      return;
    }
    sendJson(res, 400, { success: false, error: 'Invalid request payload' });
    return;
  }

  if (typeof body.phone !== 'string') {
    sendJson(res, 400, {
      success: false,
      error: 'Số điện thoại phải là chuỗi hợp lệ.'
    });
    return;
  }

  const cleanedPhone = body.phone.trim().replace(/\s+/g, '');
  if (!cleanedPhone || cleanedPhone.length < 10 || cleanedPhone.length > 20) {
    sendJson(res, 400, {
      success: false,
      error: 'Số điện thoại không hợp lệ! Vui lòng nhập tối thiểu 10 chữ số.'
    });
    return;
  }

  const missingEnv = deps.getMissingEnv();
  if (missingEnv.length > 0) {
    sendJson(res, 503, {
      success: false,
      error: 'Auth Broker chưa được cấu hình đầy đủ biến môi trường trên server.',
      missingEnv
    });
    return;
  }

  const clientIp = extractTrustedClientIp(req);
  if (!clientIp) {
    sendJson(res, 400, {
      success: false,
      error: 'Không xác minh được địa chỉ mạng hợp lệ của yêu cầu.'
    });
    return;
  }

  try {
    const store = deps.getRateLimitStore();
    const decision = await guardAndConsumeSendOtpRateLimit(
      store,
      { ip: clientIp, phone: cleanedPhone },
      deps.rateLimitSecret
    );

    if (decision.blocked) {
      sendRateLimited(res, decision.retryAfterSeconds);
      return;
    }

    const upstream = await deps.sendOtp({ phone: cleanedPhone });
    if (!upstream.success) {
      const status = upstream.upstreamUnavailable ? 503 : 400;
      sendJson(res, status, {
        success: false,
        error: upstream.error || 'Không thể phát lệnh gửi mã OTP từ máy chủ.'
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      message: upstream.message || 'Mã OTP bảo mật đã được phát lệnh gửi thành công!'
    });
  } catch (err) {
    console.error('Auth Broker /api/auth/send-otp error:', redactSensitive({
      phoneSuffix: cleanedPhone.slice(-4),
      message: err instanceof Error ? err.message : 'Unknown error'
    }));
    sendJson(res, 500, {
      success: false,
      error: 'Lỗi hệ thống gửi OTP nội bộ.'
    });
  }
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  return processSendOtpRequest(req, res);
}
