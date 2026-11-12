import type { IncomingMessage, ServerResponse } from 'node:http';
import { getMissingEnvVars, redactSensitive } from '../_lib/env.js';
import { HttpValidationError, readValidatedJsonBody, sendJson } from '../_lib/http.js';
import { signIncidentSessionJwt } from '../_lib/jwt.js';
import {
  acquireLoginInflightSlot,
  createSupabaseRateLimitStore,
  extractTrustedClientIp,
  guardLoginRateLimit,
  recordLoginFailure,
  releaseLoginInflightSlot,
  resetLoginFailure,
  sendRateLimited,
  type RateLimitStore
} from '../_lib/rateLimit.js';
import { resolveRbacPolicyFromDb, type ResolvedRbacPolicy } from '../_lib/rbac.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { verifyCredentialsWithUpstream, type UpstreamAuthResult } from '../_lib/upstreamAuth.js';

export interface LoginDeps {
  getMissingEnv: () => string[];
  getRateLimitStore?: () => RateLimitStore;
  rateLimitSecret?: string;
  verifyUpstream: (params: { username: string; password?: string }) => Promise<UpstreamAuthResult>;
  resolveRbac: (identity: { username?: string; email?: string }) => Promise<ResolvedRbacPolicy>;
  signJwt: typeof signIncidentSessionJwt;
}

const defaultDeps: LoginDeps = {
  getMissingEnv: getMissingEnvVars,
  getRateLimitStore: () => createSupabaseRateLimitStore(getSupabaseAdmin()),
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
    // 1. Check account & IP lock + consume IP quota BEFORE calling upstream
    let inflightAcquired = false;
    if (store) {
      const rateDecision = await guardLoginRateLimit(
        store,
        { ip: effectiveIp, username },
        deps.rateLimitSecret
      );

      if (rateDecision.blocked) {
        sendRateLimited(res, rateDecision.retryAfterSeconds);
        return;
      }

      // 2. Acquire per-account in-flight lease to prevent parallel burst bypass
      inflightAcquired = await acquireLoginInflightSlot(
        store,
        { account: username },
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
      upstream = await deps.verifyUpstream({ username, password });
      if (!upstream.success || !upstream.user) {
        if (store && !upstream.upstreamUnavailable) {
          await recordLoginFailure(store, { username }, deps.rateLimitSecret);
        }
        const status = upstream.upstreamUnavailable ? 503 : 401;
        sendJson(res, status, {
          success: false,
          error: upstream.error || 'Xác thực không thành công'
        });
        return;
      }

      // Reset account failure counter upon successful upstream authentication
      if (store) {
        await resetLoginFailure(store, { username }, deps.rateLimitSecret);
      }
    } finally {
      if (store && inflightAcquired) {
        await releaseLoginInflightSlot(store, { account: username }, deps.rateLimitSecret).catch(() => {});
      }
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
