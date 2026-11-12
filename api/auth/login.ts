import type { IncomingMessage, ServerResponse } from 'node:http';
import { getMissingEnvVars, redactSensitive } from '../_lib/env.ts';
import { HttpValidationError, readValidatedJsonBody, sendJson } from '../_lib/http.ts';
import { signIncidentSessionJwt } from '../_lib/jwt.ts';
import { resolveRbacPolicyFromDb, type ResolvedRbacPolicy } from '../_lib/rbac.ts';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.ts';
import { verifyCredentialsWithUpstream, type UpstreamAuthResult } from '../_lib/upstreamAuth.ts';

export interface LoginDeps {
  getMissingEnv: () => string[];
  verifyUpstream: (params: { username: string; password?: string }) => Promise<UpstreamAuthResult>;
  resolveRbac: (identity: { username?: string; email?: string }) => Promise<ResolvedRbacPolicy>;
  signJwt: typeof signIncidentSessionJwt;
}

const defaultDeps: LoginDeps = {
  getMissingEnv: getMissingEnvVars,
  verifyUpstream: verifyCredentialsWithUpstream,
  resolveRbac: (identity) => resolveRbacPolicyFromDb(getSupabaseAdmin(), identity),
  signJwt: signIncidentSessionJwt
};

export async function processLoginRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  deps: LoginDeps = defaultDeps
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

  // Strict type & non-empty checks (never accept numbers, booleans, arrays, objects, or null)
  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    sendJson(res, 400, {
      success: false,
      error: 'Trường username và password phải là chuỗi hợp lệ.'
    });
    return;
  }

  const username = body.username.trim();
  const password = body.password;

  if (!username || !password || username.length > 256 || password.length > 256) {
    sendJson(res, 400, {
      success: false,
      error: 'Vui lòng cung cấp username và password hợp lệ.'
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
    const upstream = await deps.verifyUpstream({ username, password });
    if (!upstream.success || !upstream.user) {
      const status = upstream.upstreamUnavailable ? 503 : 401;
      sendJson(res, status, {
        success: false,
        error: upstream.error || 'Xác thực không thành công'
      });
      return;
    }

    const rbac = await deps.resolveRbac({
      username: upstream.user.username,
      email: upstream.user.email
    });

    if (rbac.status === 'AMBIGUOUS' || rbac.status === 'IDENTITY_MISMATCH') {
      console.warn('Auth Broker RBAC conflict rejected:', redactSensitive({
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
      phone: upstream.user.phone,
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
        phone: upstream.user.phone,
        role: rbac.role,
        permissions: rbac.permissions
      }
    });
  } catch (err) {
    console.error('Auth Broker /api/auth/login error:', redactSensitive({
      username,
      message: err instanceof Error ? err.message : 'Unknown error'
    }));
    sendJson(res, 500, {
      success: false,
      error: 'Lỗi hệ thống xác thực nội bộ.'
    });
  }
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  return processLoginRequest(req, res);
}
