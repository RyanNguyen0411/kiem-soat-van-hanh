import type { IncomingMessage, ServerResponse } from 'node:http';
import { getMissingEnvVars, redactSensitive } from '../_lib/env.js';
import { HttpValidationError, readValidatedJsonBody, sendJson } from '../_lib/http.js';
import { signIncidentSessionJwt } from '../_lib/jwt.js';
import { resolveRbacPolicyFromDb, type ResolvedRbacPolicy } from '../_lib/rbac.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { verifyOtpWithUpstream, type UpstreamAuthResult } from '../_lib/upstreamAuth.js';

export interface VerifyOtpDeps {
  getMissingEnv: () => string[];
  verifyOtp: (params: { phone: string; otp: string }) => Promise<UpstreamAuthResult>;
  resolveRbac: (identity: { username?: string; email?: string }) => Promise<ResolvedRbacPolicy>;
  signJwt: typeof signIncidentSessionJwt;
}

const defaultDeps: VerifyOtpDeps = {
  getMissingEnv: getMissingEnvVars,
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

  const phone = body.phone.trim();
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

  try {
    const upstream = await deps.verifyOtp({ phone, otp });
    if (!upstream.success || !upstream.user) {
      const status = upstream.upstreamUnavailable ? 503 : 401;
      sendJson(res, status, {
        success: false,
        error: upstream.error || 'Mã OTP không chính xác hoặc đã hết hiệu lực'
      });
      return;
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
