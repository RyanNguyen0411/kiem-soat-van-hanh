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
import { reconcileRbacMatches, resolveRbacPolicyFromDb, type ResolvedRbacPolicy } from '../_lib/rbac.js';
import { createEphemeralSupabaseClient, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
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
  rateLimitSecret: process.env.RATE_LIMIT_HMAC_SECRET,
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

  const hasPassword = typeof body.password === 'string';
  const hasEmail = typeof body.email === 'string';

  if (typeof body.username !== 'string' || (!hasPassword && !hasEmail)) {
    sendJson(res, 400, {
      success: false,
      error: 'Trường username cùng password hoặc email phải là chuỗi hợp lệ.'
    });
    return;
  }

  const username = body.username.trim();
  const password = hasPassword ? (body.password as string) : undefined;
  const email = hasEmail ? (body.email as string).trim() : undefined;

  if (!username || (!password && !email) || username.length > 256 || (password && password.length > 256)) {
    sendJson(res, 400, {
      success: false,
      error: 'Vui lòng cung cấp username cùng password hoặc email hợp lệ.'
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

    // 2. Gmail OTP/Magic Link backup path: Strictly verified via Supabase Auth
    if (email && !password) {
      try {
        const rbac = await deps.resolveRbac({ username, email });
        if (!rbac.found || !rbac.isActive || rbac.status !== 'OK') {
          if (store) {
            await recordLoginFailure(store, { username }, deps.rateLimitSecret);
          }
          sendJson(res, 401, {
            success: false,
            error: 'Địa chỉ Email xác thực không khớp với tài khoản hoặc tài khoản đã bị vô hiệu hóa.'
          });
          return;
        }

        const otp = typeof body.otp === 'string' ? (body.otp as string).trim() : '';

        // If OTP token provided, verify with Supabase Auth
        if (otp) {
          const authClient = createEphemeralSupabaseClient();
          const { data: verifyData, error: verifyErr } = await authClient.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: otp,
            type: 'email'
          });

          if (verifyErr || !verifyData?.user) {
            if (store) {
              await recordLoginFailure(store, { username }, deps.rateLimitSecret);
            }
            sendJson(res, 401, {
              success: false,
              error: 'Mã xác thực Gmail không chính xác hoặc đã hết hiệu lực.'
            });
            return;
          }

          // OTP verified successfully by Supabase Auth: issue incident session JWT
          if (store) {
            await resetLoginFailure(store, { username }, deps.rateLimitSecret).catch((err) => {
              console.warn('Reset rate limit notice:', err);
            });
          }

          const canonicalUsername = rbac.canonicalUsername || username;
          const { token, expiresAt } = await deps.signJwt({
            sub: verifyData.user.id,
            username: canonicalUsername,
            name: rbac.displayName || canonicalUsername,
            email: verifyData.user.email || email,
            role: rbac.role,
            permissions: rbac.permissions,
            rbacActive: rbac.isActive
          });

          sendJson(res, 200, {
            success: true,
            token,
            expiresAt,
            user: {
              id: verifyData.user.id,
              username: canonicalUsername,
              name: rbac.displayName || canonicalUsername,
              email: verifyData.user.email || email,
              role: rbac.role,
              permissions: rbac.permissions
            }
          });
          return;
        }

        // If no OTP was provided, send OTP to Gmail via Supabase Auth
        try {
          const authClient = createEphemeralSupabaseClient();
          await authClient.auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: { shouldCreateUser: false }
          });
        } catch (otpSendErr) {
          console.warn('Supabase signInWithOtp notice:', otpSendErr);
        }

        // Email recovery only acknowledges recovery request, never issues login tokens/sessions
        sendJson(res, 200, {
          success: true,
          recoveryInitiated: true,
          message: 'Yêu cầu xác thực qua Gmail đã được tiếp nhận. Hướng dẫn xác thực đã được gửi đến email quản trị viên.'
        });
        return;
      } finally {
        if (store && inflightAcquired) {
          await releaseLoginInflightSlot(store, { account: username }, deps.rateLimitSecret).catch(() => {});
        }
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

      // Reset account failure counter and release lease concurrently to minimize latency
      if (store) {
        Promise.allSettled([
          resetLoginFailure(store, { username }, deps.rateLimitSecret),
          inflightAcquired ? releaseLoginInflightSlot(store, { account: username }, deps.rateLimitSecret) : Promise.resolve()
        ]).catch(() => {});
        inflightAcquired = false;
      }
    } finally {
      if (store && inflightAcquired) {
        releaseLoginInflightSlot(store, { account: username }, deps.rateLimitSecret).catch(() => {});
      }
    }

    // High performance RBAC resolution: reuse pre-verified row from upstream auth or query DB
    const rbac = upstream.user.rbacPolicy
      ? reconcileRbacMatches([upstream.user.rbacPolicy], {
          username: upstream.user.username,
          email: upstream.user.email
        })
      : await deps.resolveRbac({
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
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Auth Broker /api/auth/login error:', redactSensitive({
      username,
      message: errorMessage
    }));
    sendJson(res, 500, {
      success: false,
      error: 'Lỗi hệ thống xác thực nội bộ.',
      ...(process.env.NODE_ENV !== 'production' ? { detail: errorMessage } : {})
    });
  }
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  return processLoginRequest(req, res);
}
