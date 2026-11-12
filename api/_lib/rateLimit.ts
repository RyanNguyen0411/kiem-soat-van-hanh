import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readRequiredServerEnv } from './env.js';
import { sendJson } from './http.js';

export type RateLimitScope =
  | 'login_account'
  | 'login_ip'
  | 'otp_send_phone'
  | 'otp_send_ip'
  | 'otp_verify_phone'
  | 'otp_verify_ip';

export type RateLimitKeyScope =
  | RateLimitScope
  | 'inflight_login'
  | 'inflight_otp_verify';

export interface RateLimitRule {
  scope: RateLimitScope;
  maxAttempts: number;
  windowSeconds: number;
  lockSeconds: number;
}

/**
 * Approved Preview Rate Limiting Thresholds (Section 2).
 */
export const PREVIEW_RATE_LIMITS: Record<RateLimitScope, RateLimitRule> = {
  login_account: { scope: 'login_account', maxAttempts: 5, windowSeconds: 15 * 60, lockSeconds: 15 * 60 },
  login_ip: { scope: 'login_ip', maxAttempts: 20, windowSeconds: 15 * 60, lockSeconds: 15 * 60 },
  otp_send_phone: { scope: 'otp_send_phone', maxAttempts: 3, windowSeconds: 15 * 60, lockSeconds: 30 * 60 },
  otp_send_ip: { scope: 'otp_send_ip', maxAttempts: 10, windowSeconds: 15 * 60, lockSeconds: 30 * 60 },
  otp_verify_phone: { scope: 'otp_verify_phone', maxAttempts: 5, windowSeconds: 10 * 60, lockSeconds: 30 * 60 },
  otp_verify_ip: { scope: 'otp_verify_ip', maxAttempts: 15, windowSeconds: 10 * 60, lockSeconds: 30 * 60 }
};

export interface RateLimitDecision {
  blocked: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  check(keyHash: string): Promise<RateLimitDecision>;
  consume(keyHash: string, rule: RateLimitRule): Promise<RateLimitDecision>;
  consumeDual(
    keyHash1: string,
    rule1: RateLimitRule,
    keyHash2: string,
    rule2: RateLimitRule
  ): Promise<RateLimitDecision>;
  recordFailure(keyHash: string, rule: RateLimitRule): Promise<RateLimitDecision>;
  reset(keyHash: string): Promise<void>;
  acquireInflightSlot(keyHash: string, ttlSeconds?: number): Promise<boolean>;
  releaseInflightSlot(keyHash: string): Promise<void>;
}

/**
 * Extract client IP strictly from Vercel platform-managed headers (never client body/arbitrary headers).
 * Returns null if IP cannot be verified (caller must fail closed).
 */
export function extractTrustedClientIp(
  req: Pick<IncomingMessage, 'headers' | 'socket'>
): string | null {
  const rawVercel = req.headers?.['x-vercel-forwarded-for'];
  const vercelHeader = Array.isArray(rawVercel) ? rawVercel[0] : rawVercel;

  const rawRealIp = req.headers?.['x-real-ip'];
  const realIpHeader = Array.isArray(rawRealIp) ? rawRealIp[0] : rawRealIp;

  const candidate =
    (typeof vercelHeader === 'string' && vercelHeader.split(',')[0]?.trim()) ||
    (typeof realIpHeader === 'string' && realIpHeader.trim()) ||
    req.socket?.remoteAddress?.trim() ||
    '';

  if (!candidate) return null;

  const normalized = candidate.replace(/^::ffff:/i, '').trim().toLowerCase();
  return normalized || null;
}

export function normalizeRateLimitIdentifier(scope: RateLimitKeyScope, rawValue: string): string {
  const trimmed = rawValue.trim();
  if (scope === 'otp_send_phone' || scope === 'otp_verify_phone' || scope === 'inflight_otp_verify') {
    return trimmed.replace(/\s+/g, '');
  }
  return trimmed.toLowerCase();
}

/**
 * Derive an irreversible HMAC-SHA256 hash using dedicated RATE_LIMIT_HMAC_SECRET.
 */
export function computeRateLimitKeyHash(
  scope: RateLimitKeyScope,
  rawIdentifier: string,
  secretOverride?: string
): string {
  const secret = (secretOverride ?? readRequiredServerEnv('RATE_LIMIT_HMAC_SECRET')).trim();
  if (secret.length < 32) {
    throw new Error('RATE_LIMIT_HMAC_SECRET must be at least 32 characters long');
  }
  const normalized = normalizeRateLimitIdentifier(scope, rawIdentifier);
  if (!normalized) {
    throw new Error(`Empty identifier for rate limit scope: ${scope}`);
  }
  return crypto.createHmac('sha256', secret).update(`${scope}:${normalized}`).digest('hex');
}

export function createSupabaseRateLimitStore(supabase: SupabaseClient): RateLimitStore {
  return {
    async check(keyHash: string): Promise<RateLimitDecision> {
      const { data, error } = await supabase.rpc('check_auth_rate_limit', {
        p_key_hash: keyHash
      });
      if (error) throw new Error(`Rate limit check RPC error: ${error.message}`);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        blocked: Boolean(row?.blocked),
        retryAfterSeconds: Number(row?.retry_after_seconds || 0)
      };
    },

    async consume(keyHash: string, rule: RateLimitRule): Promise<RateLimitDecision> {
      const { data, error } = await supabase.rpc('consume_auth_rate_limit', {
        p_key_hash: keyHash,
        p_scope: rule.scope,
        p_window_seconds: rule.windowSeconds,
        p_max_attempts: rule.maxAttempts,
        p_lock_seconds: rule.lockSeconds
      });
      if (error) throw new Error(`Rate limit consume RPC error: ${error.message}`);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        blocked: Boolean(row?.blocked),
        retryAfterSeconds: Number(row?.retry_after_seconds || 0)
      };
    },

    async recordFailure(keyHash: string, rule: RateLimitRule): Promise<RateLimitDecision> {
      const { data, error } = await supabase.rpc('record_auth_failure', {
        p_key_hash: keyHash,
        p_scope: rule.scope,
        p_window_seconds: rule.windowSeconds,
        p_max_attempts: rule.maxAttempts,
        p_lock_seconds: rule.lockSeconds
      });
      if (error) throw new Error(`Rate limit recordFailure RPC error: ${error.message}`);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        blocked: Boolean(row?.blocked),
        retryAfterSeconds: Number(row?.retry_after_seconds || 0)
      };
    },

    async reset(keyHash: string): Promise<void> {
      const { error } = await supabase.rpc('reset_auth_rate_limit', {
        p_key_hash: keyHash
      });
      if (error) throw new Error(`Rate limit reset RPC error: ${error.message}`);
    },

    async consumeDual(
      keyHash1: string,
      rule1: RateLimitRule,
      keyHash2: string,
      rule2: RateLimitRule
    ): Promise<RateLimitDecision> {
      const { data, error } = await supabase.rpc('consume_dual_auth_rate_limit', {
        p_key_hash_1: keyHash1,
        p_scope_1: rule1.scope,
        p_window_seconds_1: rule1.windowSeconds,
        p_max_attempts_1: rule1.maxAttempts,
        p_lock_seconds_1: rule1.lockSeconds,
        p_key_hash_2: keyHash2,
        p_scope_2: rule2.scope,
        p_window_seconds_2: rule2.windowSeconds,
        p_max_attempts_2: rule2.maxAttempts,
        p_lock_seconds_2: rule2.lockSeconds
      });
      if (error) throw new Error(`Rate limit consumeDual RPC error: ${error.message}`);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        blocked: Boolean(row?.blocked),
        retryAfterSeconds: Number(row?.retry_after_seconds || 0)
      };
    },

    async acquireInflightSlot(keyHash: string, ttlSeconds = 10): Promise<boolean> {
      const { data, error } = await supabase.rpc('acquire_auth_inflight_slot', {
        p_key_hash: keyHash,
        p_ttl_seconds: ttlSeconds
      });
      if (error) throw new Error(`Rate limit acquireInflightSlot RPC error: ${error.message}`);
      return Boolean(data);
    },

    async releaseInflightSlot(keyHash: string): Promise<void> {
      const { error } = await supabase.rpc('release_auth_inflight_slot', {
        p_key_hash: keyHash
      });
      if (error) throw new Error(`Rate limit releaseInflightSlot RPC error: ${error.message}`);
    }
  };
}

export function sendRateLimited(res: ServerResponse, retryAfterSeconds: number): void {
  const retry = Math.max(1, Math.ceil(retryAfterSeconds));
  res.setHeader('Retry-After', String(retry));
  sendJson(res, 429, {
    success: false,
    error: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau.',
    retryAfterSeconds: retry
  });
}

// ----------------------------------------------------------------------------
// Endpoint Policy Helpers
// ----------------------------------------------------------------------------

export async function guardLoginRateLimit(
  store: RateLimitStore,
  params: { ip: string; username: string },
  secretOverride?: string
): Promise<RateLimitDecision> {
  const accountKey = computeRateLimitKeyHash('login_account', params.username, secretOverride);
  const ipKey = computeRateLimitKeyHash('login_ip', params.ip, secretOverride);

  // 1. Check both locks BEFORE incrementing IP or calling upstream
  const [accountCheck, ipCheck] = await Promise.all([
    store.check(accountKey),
    store.check(ipKey)
  ]);

  if (accountCheck.blocked || ipCheck.blocked) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(accountCheck.retryAfterSeconds, ipCheck.retryAfterSeconds)
    };
  }

  // 2. Consume IP request quota atomically
  return store.consume(ipKey, PREVIEW_RATE_LIMITS.login_ip);
}

export async function recordLoginFailure(
  store: RateLimitStore,
  params: { username: string },
  secretOverride?: string
): Promise<RateLimitDecision> {
  const accountKey = computeRateLimitKeyHash('login_account', params.username, secretOverride);
  return store.recordFailure(accountKey, PREVIEW_RATE_LIMITS.login_account);
}

export async function resetLoginFailure(
  store: RateLimitStore,
  params: { username: string },
  secretOverride?: string
): Promise<void> {
  const accountKey = computeRateLimitKeyHash('login_account', params.username, secretOverride);
  await store.reset(accountKey);
}

export async function guardAndConsumeSendOtpRateLimit(
  store: RateLimitStore,
  params: { ip: string; phone: string },
  secretOverride?: string
): Promise<RateLimitDecision> {
  const phoneKey = computeRateLimitKeyHash('otp_send_phone', params.phone, secretOverride);
  const ipKey = computeRateLimitKeyHash('otp_send_ip', params.ip, secretOverride);

  // Single atomic RPC checks and consumes both phone + IP together (never increments one if the other is blocked)
  return store.consumeDual(
    phoneKey,
    PREVIEW_RATE_LIMITS.otp_send_phone,
    ipKey,
    PREVIEW_RATE_LIMITS.otp_send_ip
  );
}

export async function guardVerifyOtpRateLimit(
  store: RateLimitStore,
  params: { ip: string; phone: string },
  secretOverride?: string
): Promise<RateLimitDecision> {
  const phoneKey = computeRateLimitKeyHash('otp_verify_phone', params.phone, secretOverride);
  const ipKey = computeRateLimitKeyHash('otp_verify_ip', params.ip, secretOverride);

  const [phoneCheck, ipCheck] = await Promise.all([
    store.check(phoneKey),
    store.check(ipKey)
  ]);

  if (phoneCheck.blocked || ipCheck.blocked) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(phoneCheck.retryAfterSeconds, ipCheck.retryAfterSeconds)
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export async function recordVerifyOtpFailure(
  store: RateLimitStore,
  params: { ip: string; phone: string },
  secretOverride?: string
): Promise<RateLimitDecision> {
  const phoneKey = computeRateLimitKeyHash('otp_verify_phone', params.phone, secretOverride);
  const ipKey = computeRateLimitKeyHash('otp_verify_ip', params.ip, secretOverride);

  const [phoneFail, ipFail] = await Promise.all([
    store.recordFailure(phoneKey, PREVIEW_RATE_LIMITS.otp_verify_phone),
    store.recordFailure(ipKey, PREVIEW_RATE_LIMITS.otp_verify_ip)
  ]);

  if (phoneFail.blocked || ipFail.blocked) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(phoneFail.retryAfterSeconds, ipFail.retryAfterSeconds)
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export async function resetVerifyOtpFailure(
  store: RateLimitStore,
  params: { phone: string },
  secretOverride?: string
): Promise<void> {
  const phoneKey = computeRateLimitKeyHash('otp_verify_phone', params.phone, secretOverride);
  await store.reset(phoneKey);
}

export async function acquireLoginInflightSlot(
  store: RateLimitStore,
  params: { account: string },
  ttlSeconds = 10,
  secretOverride?: string
): Promise<boolean> {
  const key = computeRateLimitKeyHash('inflight_login', params.account, secretOverride);
  return store.acquireInflightSlot(key, ttlSeconds);
}

export async function releaseLoginInflightSlot(
  store: RateLimitStore,
  params: { account: string },
  secretOverride?: string
): Promise<void> {
  const key = computeRateLimitKeyHash('inflight_login', params.account, secretOverride);
  await store.releaseInflightSlot(key);
}

export async function acquireVerifyOtpInflightSlot(
  store: RateLimitStore,
  params: { phone: string },
  ttlSeconds = 10,
  secretOverride?: string
): Promise<boolean> {
  const key = computeRateLimitKeyHash('inflight_otp_verify', params.phone, secretOverride);
  return store.acquireInflightSlot(key, ttlSeconds);
}

export async function releaseVerifyOtpInflightSlot(
  store: RateLimitStore,
  params: { phone: string },
  secretOverride?: string
): Promise<void> {
  const key = computeRateLimitKeyHash('inflight_otp_verify', params.phone, secretOverride);
  await store.releaseInflightSlot(key);
}
