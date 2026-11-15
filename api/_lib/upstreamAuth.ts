import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readRequiredServerEnv } from './env.js';
import { createEphemeralSupabaseClient, getSupabaseAdmin } from './supabaseAdmin.js';
import {
  acquireOtpDispatchLease,
  activatePendingOtp,
  computePhoneHash,
  computeSaltedOtpHash,
  consumeOtpIfValid,
  dispatchTelegramOtp,
  failPendingOtp,
  generateCryptographicOtp,
  normalizePhoneNumber,
  resolveOtpUserIdentity
} from './telegramDispatcher.js';

export interface UpstreamIdentity {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  rbacPolicy?: any;
}

export interface UpstreamAuthResult {
  success: boolean;
  user?: UpstreamIdentity;
  error?: string;
  upstreamUnavailable?: boolean;
}

const UPSTREAM_TIMEOUT_MS = 8000;

async function postToUpstreamAuth(payload: Record<string, unknown>): Promise<UpstreamAuthResult> {
  const endpoint = process.env.AUTH_UPSTREAM_WEBHOOK_URL?.trim();

  if (!endpoint) {
    return {
      success: false,
      upstreamUnavailable: false,
      error: 'Máy chủ xác thực mật khẩu (AUTH_UPSTREAM_WEBHOOK_URL) chưa được cấu hình trên hệ thống. Vui lòng đăng nhập bằng Telegram OTP.'
    };
  }

  const upstreamSecret = process.env.UPSTREAM_AUTH_SECRET?.trim();
  const bodyPayload = upstreamSecret
    ? { ...payload, serverSecret: upstreamSecret }
    : payload;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        success: false,
        upstreamUnavailable: response.status >= 500,
        error: `Upstream authentication returned HTTP ${response.status}`
      };
    }

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      user?: {
        id?: string;
        username?: string;
        name?: string;
        email?: string;
        phone?: string;
      };
    };

    if (!data?.success || !data.user) {
      return {
        success: false,
        error: data?.error || 'Thông tin xác thực không chính xác'
      };
    }

    const username = data.user.username?.trim();
    const email = data.user.email?.trim();

    if (!username && !email) {
      return {
        success: false,
        error: 'Upstream auth did not return verifiable user identity (username/email)'
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id?.trim() || username || email!,
        username: username || email!,
        name: data.user.name?.trim() || username || email!,
        email,
        phone: data.user.phone?.trim()
      }
    };
  } catch (err) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: err instanceof Error && err.name === 'AbortError'
        ? 'Upstream authentication timed out'
        : 'Upstream authentication unreachable'
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyCredentialsWithSupabaseAuth(params: {
  username: string;
  password?: string;
  email?: string;
}): Promise<UpstreamAuthResult> {
  const normUser = params.username.trim().toLowerCase();
  const password = params.password;

  if (!password) {
    return {
      success: false,
      error: 'Vui lòng cung cấp mật khẩu.'
    };
  }

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'Supabase Admin Client chưa được cấu hình trên server.'
    };
  }

  // 1. Resolve email and RBAC policy in a single fast query
  let targetEmail = normUser.includes('@') ? normUser : (params.email?.trim().toLowerCase() || '');
  let foundRbacRow: any = null;

  try {
    const query = supabase
      .from('user_rbac_policies')
      .select('id, username, email, display_name, role, permissions, is_active')
      .limit(1);

    const { data, error } = normUser.includes('@')
      ? await query.eq('email', normUser)
      : await query.eq('username', normUser);

    if (error) {
      return {
        success: false,
        upstreamUnavailable: true,
        error: 'Lỗi truy vấn chính sách người dùng từ database.'
      };
    }

    if (data && data.length > 0) {
      foundRbacRow = data[0];
      if (!targetEmail && data[0].email) {
        targetEmail = data[0].email.trim().toLowerCase();
      }
      if (!data[0].is_active) {
        return {
          success: false,
          error: 'Tài khoản đã bị vô hiệu hóa quyền truy cập Incident Center.'
        };
      }
    } else if (!targetEmail) {
      // Return generic 401 error message to prevent account enumeration
      return {
        success: false,
        error: 'Tài khoản hoặc mật khẩu không chính xác.'
      };
    }
  } catch {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'Không thể kết nối đến cơ sở dữ liệu xác thực.'
    };
  }

  if (!targetEmail) {
    return {
      success: false,
      error: 'Tài khoản hoặc mật khẩu không chính xác.'
    };
  }

  // 2. Authenticate against Supabase Auth using targetEmail + password
  // Use an ephemeral client to ensure the user session never mutates the singleton admin client
  try {
    const authClient = createEphemeralSupabaseClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: targetEmail,
      password
    });

    if (authError || !authData?.user) {
      return {
        success: false,
        error: 'Tài khoản hoặc mật khẩu không chính xác.'
      };
    }

    const authUser = authData.user;
    return {
      success: true,
      user: {
        id: authUser.id,
        username: normUser.includes('@') ? (foundRbacRow?.username || authUser.user_metadata?.username || normUser) : normUser,
        name: foundRbacRow?.display_name || authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || normUser,
        email: authUser.email || targetEmail,
        phone: authUser.phone,
        rbacPolicy: foundRbacRow
      }
    };
  } catch {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'Lỗi kết nối đến máy chủ Supabase Auth.'
    };
  }
}

export async function verifyCredentialsWithUpstream(params: {
  username: string;
  password?: string;
  email?: string;
}): Promise<UpstreamAuthResult> {
  const upstreamUrl = process.env.AUTH_UPSTREAM_WEBHOOK_URL?.trim();
  if (upstreamUrl) {
    return postToUpstreamAuth({
      action: 'auth_login',
      username: params.username.trim(),
      password: params.password || undefined,
      email: params.email || undefined,
      timestamp: Date.now()
    });
  }

  // Primary Authentication: Supabase Auth
  return verifyCredentialsWithSupabaseAuth(params);
}

export async function verifyOtpWithUpstream(params: {
  phone: string;
  otp: string;
}): Promise<UpstreamAuthResult> {
  const normPhone = normalizePhoneNumber(params.phone);
  if (!normPhone || normPhone.length < 10) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ.'
    };
  }

  let hmacSecret: string;
  try {
    hmacSecret = readRequiredServerEnv('RATE_LIMIT_HMAC_SECRET');
  } catch (err) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'RATE_LIMIT_HMAC_SECRET chưa được cấu hình trên server.'
    };
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'Supabase Admin Client chưa được cấu hình.'
    };
  }

  const phoneHash = computePhoneHash(normPhone, hmacSecret);

  // Verify and consume OTP atomically from authoritative auth_otp_verifications table
  const verifyResult = await consumeOtpIfValid(supabase, {
    phoneHash,
    enteredOtp: params.otp.trim(),
    hmacSecret
  });

  if (!verifyResult.valid) {
    return {
      success: false,
      upstreamUnavailable: Boolean(verifyResult.isBlocked),
      error: verifyResult.error || 'Mã OTP không chính xác hoặc đã hết hiệu lực.'
    };
  }

  // Retrieve user identity from DB
  const idResult = await resolveOtpUserIdentity(supabase, normPhone);
  if (!idResult.success || !idResult.user) {
    return {
      success: false,
      error: idResult.error || 'Không tìm thấy thông tin tài khoản hợp lệ trong hệ thống.'
    };
  }

  return {
    success: true,
    user: {
      id: idResult.user.id,
      username: idResult.user.username,
      name: idResult.user.displayName,
      email: idResult.user.email || undefined,
      phone: idResult.user.phone
    }
  };
}

export interface UpstreamOtpSendResult {
  success: boolean;
  message?: string;
  error?: string;
  upstreamUnavailable?: boolean;
}

export async function sendOtpWithUpstream(params: {
  phone: string;
}): Promise<UpstreamOtpSendResult> {
  const normPhone = normalizePhoneNumber(params.phone);
  if (!normPhone || normPhone.length < 10) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ! Vui lòng nhập tối thiểu 10 chữ số.'
    };
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!telegramToken) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'TELEGRAM_BOT_TOKEN chưa được cấu hình trên máy chủ server.'
    };
  }

  let hmacSecret: string;
  try {
    hmacSecret = readRequiredServerEnv('RATE_LIMIT_HMAC_SECRET');
  } catch (err) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'RATE_LIMIT_HMAC_SECRET chưa được cấu hình trên server.'
    };
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: 'Supabase Admin Client chưa được cấu hình.'
    };
  }

  // 1. Authoritative identity resolution from user_rbac_policies
  const identity = await resolveOtpUserIdentity(supabase, normPhone);
  if (!identity.success || !identity.user) {
    return {
      success: false,
      upstreamUnavailable: identity.statusCode === 500,
      error: identity.error || 'Số điện thoại này chưa được đăng ký trong hệ thống quản trị.'
    };
  }

  // 2. Cryptographic OTP generation & Salted Hash
  const otp = generateCryptographicOtp();
  const salt = crypto.randomBytes(16).toString('hex');
  const deliveryRequestId = crypto.randomUUID();
  const ownerToken = crypto.randomUUID();
  const phoneHash = computePhoneHash(normPhone, hmacSecret);
  const otpHash = computeSaltedOtpHash(salt, phoneHash, otp, hmacSecret);

  // 3. Acquire Fencing Lease in PENDING state (prevents concurrent burst)
  const leaseResult = await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId,
    ownerToken,
    leaseSeconds: 12,
    otpHash,
    salt
  });

  if (!leaseResult.acquired) {
    return {
      success: false,
      upstreamUnavailable: Boolean(leaseResult.isBlocked),
      error: leaseResult.error || 'Hệ thống đang phát mã OTP cho số điện thoại này. Vui lòng chờ vài giây trước khi thử lại.'
    };
  }

  // 4. Dispatch OTP via Telegram Bot API
  const dispatchResult = await dispatchTelegramOtp({
    token: telegramToken,
    chatId: identity.user.chatId,
    otp,
    ttlSeconds: 300
  });

  // 5. State machine transition: ACTIVE on success, FAILED on timeout/error
  if (!dispatchResult.success) {
    await failPendingOtp(supabase, {
      phoneHash,
      deliveryRequestId,
      ownerToken,
      reason: dispatchResult.error || 'Telegram dispatch failed'
    });

    return {
      success: false,
      upstreamUnavailable: dispatchResult.status ? dispatchResult.status >= 500 : true,
      error: dispatchResult.error || 'Không thể phát lệnh gửi tin nhắn mã OTP qua Telegram Bot.'
    };
  }

  // Activate pending OTP (Strict fencing check: verifies owner_token & delivery_request_id and unexpired lease)
  const activateResult = await activatePendingOtp(supabase, {
    phoneHash,
    deliveryRequestId,
    ownerToken,
    ttlSeconds: 300
  });

  if (!activateResult.activated) {
    return {
      success: false,
      error: activateResult.error || 'Phiên gửi OTP đã quá thời hạn lease hoặc bị ghi đè.'
    };
  }

  return {
    success: true,
    message: 'Mã OTP bảo mật đã được gửi qua Telegram Bot thành công!'
  };
}
