import type { IncomingMessage, ServerResponse } from 'node:http';
import { getMissingEnvVars, redactSensitive } from '../_lib/env.js';
import { HttpValidationError, readValidatedJsonBody, sendJson } from '../_lib/http.js';
import { signIncidentSessionJwt } from '../_lib/jwt.js';
import {
  acquireVerifyOtpInflightSlot,
  createSupabaseRateLimitStore,
  extractTrustedClientIp,
  guardVerifyOtpRateLimit,
  recordVerifyOtpFailure,
  releaseVerifyOtpInflightSlot,
  resetVerifyOtpFailure,
  sendRateLimited,
  type RateLimitStore
} from '../_lib/rateLimit.js';
import { resolveRbacPolicyFromDb, type ResolvedRbacPolicy } from '../_lib/rbac.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { verifyOtpWithUpstream, type UpstreamAuthResult } from '../_lib/upstreamAuth.js';

export interface VerifyOtpDeps {
  getMissingEnv: () => string[];
  getRateLimitStore?: () => RateLimitStore;
  rateLimitSecret?: string;
  verifyOtp: (params: { phone: string; otp: string }) => Promise<UpstreamAuthResult>;
  resolveRbac: (identity: { username?: string; email?: string }) => Promise<ResolvedRbacPolicy>;
  signJwt: typeof signIncidentSessionJwt;
}

const defaultDeps: VerifyOtpDeps = {
  getMissingEnv: getMissingEnvVars,
  getRateLimitStore: () => createSupabaseRateLimitStore(getSupabaseAdmin()),
  verifyOtp: verifyOtpWithUpstream,
  resolveRbac: (identity) => resolveRbacPolicyFromDb(getSupabaseAdmin(), identity),
  signJwt: signIncidentSessionJwt
};

export async function processVerifyOtpRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  deps: VerifyOtpDeps = defaultDeps
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

  if (typeof body.phone !== 'string' || typeof body.otp !== 'string') {
    sendJson(res, 400, {
      success: false,
      error: 'Trường phone và otp phải là chuỗi hợp lệ.'
    });
    return;
  }

  const phone = body.phone.trim().replace(/\s+/g, '');
  const otp = body.otp.trim();

  if (phone.length < 10 || phone.length > 20 || otp.length < 6 || otp.length > 12) {
    sendJson(res, 400, {
      success: false,
      error: 'Số điện thoại hoặc mã OTP không hợp lệ.'
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

  const useRealRateLimit = Boolean(deps.getRateLimitStore);
  const clientIp = extractTrustedClientIp(req);
  if (useRealRateLimit && !clientIp) {
    sendJson(res, 400, {
      success: false,
      error: 'Không xác minh được địa chỉ mạng hợp lệ của yêu cầu.'
    });
    return;
  }

  const store = deps.getRateLimitStore ? deps.getRateLimitStore() : null;
  const effectiveIp = clientIp || '127.0.0.1';

  try {
    // 1. Check both phone & IP failure locks BEFORE calling upstream
    let inflightAcquired = false;
    if (store) {
      const rateDecision = await guardVerifyOtpRateLimit(
        store,
        { ip: effectiveIp, phone },
        deps.rateLimitSecret
      );

      if (rateDecision.blocked) {
        sendRateLimited(res, rateDecision.retryAfterSeconds);
        return;
      }

      // 2. Acquire per-phone in-flight lease to prevent parallel burst bypass
      inflightAcquired = await acquireVerifyOtpInflightSlot(
        store,
        { phone },
        10,
        deps.rateLimitSecret
      );
      if (!inflightAcquired) {
        sendRateLimited(res, 2);
        return;
      }
    }

    let upstream: UpstreamAuthResult;
    try {
      upstream = await deps.verifyOtp({ phone, otp });
      if (!upstream.success || !upstream.user) {
        if (store && !upstream.upstreamUnavailable) {
          await recordVerifyOtpFailure(store, { ip: effectiveIp, phone }, deps.rateLimitSecret);
        }
        const status = upstream.upstreamUnavailable ? 503 : 401;
        sendJson(res, status, {
          success: false,
          error: upstream.error || 'Mã OTP không chính xác hoặc đã hết hiệu lực'
        });
        return;
      }

      // Reset phone failure counter on valid OTP
      if (store) {
        await resetVerifyOtpFailure(store, { phone }, deps.rateLimitSecret);
      }
    } finally {
      if (store && inflightAcquired) {
        await releaseVerifyOtpInflightSlot(store, { phone }, deps.rateLimitSecret).catch(() => {});
      }
    }

    const rbac = await deps.resolveRbac({
      username: upstream.user.username,
      email: upstream.user.email
    });

    if (rbac.status === 'AMBIGUOUS' || rbac.status === 'IDENTITY_MISMATCH') {
      console.warn('Auth Broker OTP RBAC conflict rejected:', redactSensitive({
        status: rbac.status,
        username: upstream.user.username
      }));
      sendJson(res, 403, {
        success: false,
        error: 'Thông tin định danh tài khoản không nhất quán hoặc bị trùng lặp.'
      });
      return;
    }

    if (!rbac.isActive || rbac.status === 'INACTIVE') {
      sendJson(res, 403, {
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa quyền truy cập Incident Center.'
      });
      return;
    }

    const canonicalUsername = rbac.canonicalUsername || upstream.user.username;
    const { token, expiresAt } = await deps.signJwt({
      sub: upstream.user.id,
      username: canonicalUsername,
      name: rbac.displayName || upstream.user.name,
      email: upstream.user.email,
      phone: upstream.user.phone || phone,
      role: rbac.role,
      permissions: rbac.permissions,
      rbacActive: rbac.isActive
    });

    sendJson(res, 200, {
      success: true,
      token,
      expiresAt,
      user: {
        id: upstream.user.id,
        username: canonicalUsername,
        name: rbac.displayName || upstream.user.name,
        email: upstream.user.email,
        phone: upstream.user.phone || phone,
        role: rbac.role,
        permissions: rbac.permissions
      }
    });
  } catch (err) {
    console.error('Auth Broker /api/auth/verify-otp error:', redactSensitive({
      phoneSuffix: phone.slice(-4),
      message: err instanceof Error ? err.message : 'Unknown error'
    }));
    sendJson(res, 500, {
      success: false,
      error: 'Lỗi hệ thống xác thực OTP nội bộ.'
    });
  }
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  return processVerifyOtpRequest(req, res);
}
