import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IncidentPermission, RbacRole } from './jwt.js';
import { sanitizeRolePermissions } from './rbac.js';

export interface TelegramSendResult {
  success: boolean;
  error?: string;
  messageId?: number;
  status?: number;
}

export interface AuthorizedOtpUser {
  id: string;
  username: string;
  displayName: string;
  role: RbacRole;
  permissions: IncidentPermission[];
  isActive: boolean;
  phone: string;
  chatId: string;
  email?: string | null;
}

export type OtpVerificationStatus = 'PENDING' | 'ACTIVE' | 'CONSUMED' | 'FAILED' | 'EXPIRED';

export interface OtpVerificationRecord {
  phone_hash: string;
  otp_hash: string;
  salt: string;
  status: OtpVerificationStatus;
  delivery_request_id: string;
  owner_token: string;
  lease_expires_at: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  created_at: string;
  activated_at?: string | null;
  consumed_at?: string | null;
}

/**
 * Standardize Vietnamese phone numbers to canonical 10-digit format starting with '0'.
 * Handles: '+84 38 585 2920' -> '0385852920', '84385852920' -> '0385852920'
 */
export function normalizePhoneNumber(rawPhone: unknown): string {
  if (typeof rawPhone !== 'string') return '';
  let clean = rawPhone.trim().replace(/[\s\-\.\(\)]/g, '');
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('84') && clean.length > 10) {
    clean = '0' + clean.slice(2);
  }
  clean = clean.replace(/\D/g, '');
  return clean;
}

/**
 * Validates whether the normalized phone string conforms to Vietnamese mobile numbering rules.
 */
export function isValidPhoneNumber(phone: string): boolean {
  const norm = normalizePhoneNumber(phone);
  return /^0[3|5|7|8|9]\d{8}$/.test(norm);
}

/**
 * Cryptographically secure 6-digit numeric OTP generator.
 * Output range: [100000, 999999].
 */
export function generateCryptographicOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Derive irreversible phone_hash for privacy-first database indexing.
 */
export function computePhoneHash(normalizedPhone: string, hmacSecret: string): string {
  return crypto
    .createHmac('sha256', hmacSecret)
    .update(`otp_phone:${normalizedPhone}`)
    .digest('hex');
}

/**
 * Derive salted OTP hash.
 */
export function computeSaltedOtpHash(
  salt: string,
  phoneHash: string,
  otp: string,
  hmacSecret: string
): string {
  return crypto
    .createHmac('sha256', hmacSecret)
    .update(`${salt}:${phoneHash}:${otp}`)
    .digest('hex');
}

/**
 * Dispatches an OTP authentication message via Telegram Bot API.
 * Never leaks bot token or secret headers in logs or error messages.
 */
export async function dispatchTelegramOtp(params: {
  token: string;
  chatId: string;
  otp: string;
  ttlSeconds?: number;
}): Promise<TelegramSendResult> {
  const { token, chatId, otp, ttlSeconds = 300 } = params;
  const cleanToken = token ? token.trim() : '';
  const cleanChatId = chatId ? chatId.trim() : '';

  if (!cleanToken) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN chưa được cấu hình trên máy chủ server.'
    };
  }

  if (!cleanChatId) {
    return {
      success: false,
      error: 'Tài khoản chưa được liên kết Telegram Chat ID hợp lệ để nhận mã OTP.'
    };
  }

  const minutes = Math.floor(ttlSeconds / 60);
  const text = [
    '🔐 <b>[GHN Control Center] Mã Xác Thực OTP</b>',
    '',
    `Mã xác thực của bạn: <code>${otp}</code>`,
    '',
    `⏱ Có hiệu lực trong <b>${minutes} phút (${ttlSeconds}s)</b>.`,
    '⚠️ <i>Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên GHN.</i>'
  ].join('\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML'
      }),
      signal: controller.signal
    });

    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
      error_code?: number;
    } | null;

    if (response.ok && data?.ok) {
      return {
        success: true,
        messageId: data.result?.message_id,
        status: response.status
      };
    }

    const desc = (data?.description || '').toLowerCase();
    let friendlyError = 'Không thể gửi mã OTP qua Telegram Bot.';
    if (response.status === 401 || desc.includes('unauthorized')) {
      friendlyError = 'Telegram Bot Token trên server không hợp lệ hoặc đã bị thu hồi (@BotFather).';
    } else if (desc.includes('chat not found')) {
      friendlyError = 'Không tìm thấy Telegram Chat ID hoặc người dùng chưa ấn Bắt đầu (/start) với Bot.';
    } else if (desc.includes('blocked by the user')) {
      friendlyError = 'Bot đã bị người dùng chặn (block) trên Telegram. Vui lòng mở khóa bot để nhận tin.';
    } else if (data?.description) {
      friendlyError = `Telegram API phản hồi: ${data.description}`;
    }

    return {
      success: false,
      error: friendlyError,
      status: response.status
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      error: isAbort
        ? 'Hết thời gian chờ phản hồi từ Telegram Bot API (Timeout > 8s).'
        : 'Không thể kết nối đến máy chủ Telegram Bot API.'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Authoritative identity & RBAC policy resolution from Supabase DB by phone.
 * STRICT IDENTITY RULE:
 * 1. Zero hardcoded phone numbers, chat IDs or roles.
 * 2. NO global/env fallback for Telegram Chat ID. Chat ID MUST exist on the specific account record.
 * 3. Fails closed if account is missing, inactive, unlinked, or ambiguous.
 */
export async function resolveOtpUserIdentity(
  supabase: SupabaseClient,
  normalizedPhone: string
): Promise<{
  success: boolean;
  user?: AuthorizedOtpUser;
  error?: string;
  statusCode?: number;
}> {
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ.',
      statusCode: 400
    };
  }

  const res = await supabase
    .from('user_rbac_policies')
    .select('*');

  if (res.error) {
    return {
      success: false,
      error: `Lỗi truy vấn chính sách người dùng từ database: ${res.error.message}`,
      statusCode: 500
    };
  }

  const rows = Array.isArray(res.data) ? res.data : [];
  const matching = rows.filter((r) => {
    const p = normalizePhoneNumber(r.phone || '');
    const u = normalizePhoneNumber(r.username || '');
    return p === normalizedPhone || u === normalizedPhone;
  });

  if (matching.length === 0) {
    return {
      success: false,
      error: 'Số điện thoại này chưa được đăng ký trong hệ thống phân quyền quản trị.',
      statusCode: 403
    };
  }

  if (matching.length > 1) {
    return {
      success: false,
      error: 'Phát hiện nhiều tài khoản trùng số điện thoại. Yêu cầu liên hệ Quản trị viên.',
      statusCode: 403
    };
  }

  const row = matching[0];
  if (!row.is_active) {
    return {
      success: false,
      error: 'Tài khoản đã bị vô hiệu hóa quyền truy cập hệ thống.',
      statusCode: 403
    };
  }

  const chatId = row.telegram_chat_id ? String(row.telegram_chat_id).trim() : '';

  if (!chatId) {
    return {
      success: false,
      error: 'Tài khoản chưa được liên kết Telegram Chat ID trong cơ sở dữ liệu phân quyền. Vui lòng liên hệ Quản trị viên để gán Chat ID.',
      statusCode: 403
    };
  }

  return {
    success: true,
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      role: row.role as RbacRole,
      permissions: sanitizeRolePermissions(row.role, row.permissions),
      isActive: Boolean(row.is_active),
      phone: normalizedPhone,
      chatId,
      email: row.email || null
    }
  };
}

/**
 * 1. Acquire Fencing Dispatch Lease (Atomic PENDING creation with lock)
 * Prevents concurrent send requests on the same phone.
 */
export async function acquireOtpDispatchLease(
  supabase: SupabaseClient,
  params: {
    phoneHash: string;
    deliveryRequestId: string;
    ownerToken: string;
    leaseSeconds: number;
    otpHash: string;
    salt: string;
  }
): Promise<{ acquired: boolean; isBlocked?: boolean; error?: string }> {
  const { phoneHash, deliveryRequestId, ownerToken, leaseSeconds, otpHash, salt } = params;

  if (!phoneHash || !deliveryRequestId || !ownerToken || !otpHash || !salt) {
    return { acquired: false, error: 'Tham số yêu cầu gửi OTP không được để trống.' };
  }
  if (leaseSeconds < 5 || leaseSeconds > 60) {
    return { acquired: false, error: 'Thời hạn leaseSeconds phải nằm trong khoảng từ 5 đến 60 giây.' };
  }

  // Try calling atomic RPC if available
  const { data: rpcData, error: rpcErr } = await supabase.rpc('acquire_otp_dispatch_lease', {
    p_phone_hash: phoneHash,
    p_delivery_request_id: deliveryRequestId,
    p_owner_token: ownerToken,
    p_lease_seconds: leaseSeconds,
    p_otp_hash: otpHash,
    p_salt: salt
  });

  if (!rpcErr && rpcData !== null) {
    const res = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (res?.success) {
      return { acquired: true };
    }
    return {
      acquired: false,
      error: res?.error_message || 'Có một yêu cầu gửi OTP khác đang được xử lý cho số điện thoại này.'
    };
  }

  // Check if RPC/table missing
  const msg = rpcErr?.message || '';
  if (
    rpcErr?.code === '42P01' ||
    rpcErr?.code === 'PGRST202' ||
    msg.includes('does not exist') ||
    msg.includes('auth_otp_verifications')
  ) {
    // Direct table fallback with conditional concurrency check
    try {
      const now = new Date();
      const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
      const expiresAt = new Date(now.getTime() + 300 * 1000).toISOString();

      const { data: existing, error: selectErr } = await supabase
        .from('auth_otp_verifications')
        .select('status, owner_token, lease_expires_at')
        .eq('phone_hash', phoneHash)
        .single();

      if (selectErr && selectErr.code === '42P01') {
        return {
          acquired: false,
          isBlocked: true,
          error: 'Bảng dữ liệu auth_otp_verifications chưa được khởi tạo trên Supabase (BLOCKED – Cần chạy Migration 003).'
        };
      }

      if (existing) {
        const isLeaseActive =
          existing.status === 'PENDING' &&
          existing.lease_expires_at &&
          new Date(existing.lease_expires_at) > now;

        if (isLeaseActive && existing.owner_token !== ownerToken) {
          return {
            acquired: false,
            error: 'Có một yêu cầu gửi OTP khác đang được phát lệnh gửi. Vui lòng chờ vài giây.'
          };
        }
      }

      const { error: upsertErr } = await supabase
        .from('auth_otp_verifications')
        .upsert({
          phone_hash: phoneHash,
          otp_hash: otpHash,
          salt,
          status: 'PENDING',
          delivery_request_id: deliveryRequestId,
          owner_token: ownerToken,
          lease_expires_at: leaseExpiresAt,
          attempts: 0,
          max_attempts: 5,
          expires_at: expiresAt,
          created_at: now.toISOString()
        }, { onConflict: 'phone_hash' });

      if (upsertErr) {
        if (upsertErr.code === '42P01') {
          return {
            acquired: false,
            isBlocked: true,
            error: 'Bảng dữ liệu auth_otp_verifications chưa được khởi tạo trên Supabase (BLOCKED – Cần chạy Migration 003).'
          };
        }
        return { acquired: false, error: upsertErr.message };
      }

      return { acquired: true };
    } catch (err: unknown) {
      return { acquired: false, error: err instanceof Error ? err.message : 'Database error' };
    }
  }

  return { acquired: false, error: rpcErr?.message || 'Không thể thiết lập khóa gửi OTP.' };
}

/**
 * 2. Activate Pending OTP after Telegram API confirms HTTP 200 { ok: true }.
 * STRICT FENCING: Verifies owner_token & delivery_request_id match.
 * Also verifies lease_expires_at > clock_timestamp(). If expired or superseded, rejects!
 */
export async function activatePendingOtp(
  supabase: SupabaseClient,
  params: {
    phoneHash: string;
    deliveryRequestId: string;
    ownerToken: string;
    ttlSeconds?: number;
  }
): Promise<{ activated: boolean; error?: string }> {
  const { phoneHash, deliveryRequestId, ownerToken, ttlSeconds = 300 } = params;

  if (!phoneHash || !deliveryRequestId || !ownerToken) {
    return { activated: false, error: 'Tham số kích hoạt OTP không được để trống.' };
  }
  if (ttlSeconds < 60 || ttlSeconds > 600) {
    return { activated: false, error: 'Thời hạn ttlSeconds phải nằm trong khoảng từ 60 đến 600 giây.' };
  }

  // Try RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc('activate_pending_otp', {
    p_phone_hash: phoneHash,
    p_delivery_request_id: deliveryRequestId,
    p_owner_token: ownerToken,
    p_ttl_seconds: ttlSeconds
  });

  if (!rpcErr && rpcData !== null) {
    const res = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (res?.success) {
      return { activated: true };
    }
    return {
      activated: false,
      error: res?.error_message || 'Không thể kích hoạt OTP do mất quyền sở hữu lease hoặc quá hạn lease (Stale Request).'
    };
  }

  // Direct table fallback
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const { data: existing, error: selectErr } = await supabase
      .from('auth_otp_verifications')
      .select('status, owner_token, delivery_request_id, lease_expires_at')
      .eq('phone_hash', phoneHash)
      .single();

    if (selectErr || !existing) {
      return { activated: false, error: 'Không tìm thấy bản ghi OTP pending.' };
    }

    if (existing.owner_token !== ownerToken || existing.delivery_request_id !== deliveryRequestId) {
      return { activated: false, error: 'Quyền sở hữu lease đã bị thay thế bởi request khác (Stale lease lost).' };
    }

    if (existing.status !== 'PENDING') {
      return { activated: false, error: `Bản ghi không ở trạng thái PENDING (Trạng thái hiện tại: ${existing.status}).` };
    }

    if (existing.lease_expires_at && new Date(existing.lease_expires_at) <= now) {
      return { activated: false, error: 'Phiên gửi OTP đã quá thời hạn lease (Lease expired).' };
    }

    const { error: updateErr } = await supabase
      .from('auth_otp_verifications')
      .update({
        status: 'ACTIVE',
        activated_at: now.toISOString(),
        expires_at: expiresAt
      })
      .eq('phone_hash', phoneHash)
      .eq('delivery_request_id', deliveryRequestId)
      .eq('owner_token', ownerToken)
      .eq('status', 'PENDING');

    if (updateErr) {
      return { activated: false, error: updateErr.message };
    }

    return { activated: true };
  } catch (err: unknown) {
    return { activated: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

/**
 * 3. Fail Pending OTP if Telegram API throws or times out.
 * STRICT FENCING: Validates owner_token & delivery_request_id and checks status = 'PENDING'.
 * Returns success = false with STALE_OR_LOST_OWNERSHIP if row was not updated.
 */
export async function failPendingOtp(
  supabase: SupabaseClient,
  params: {
    phoneHash: string;
    deliveryRequestId: string;
    ownerToken: string;
    reason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const { phoneHash, deliveryRequestId, ownerToken, reason } = params;

  if (!phoneHash || !deliveryRequestId || !ownerToken) {
    return { success: false, error: 'Tham số fail OTP không được để trống.' };
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc('fail_pending_otp', {
    p_phone_hash: phoneHash,
    p_delivery_request_id: deliveryRequestId,
    p_owner_token: ownerToken,
    p_reason: reason || 'Telegram dispatch failed'
  });

  if (!rpcErr && rpcData !== null) {
    const res = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (res?.success) {
      return { success: true };
    }
    return {
      success: false,
      error: res?.error_message || 'STALE_OR_LOST_OWNERSHIP'
    };
  }

  // Direct table fallback
  try {
    const { data: existing } = await supabase
      .from('auth_otp_verifications')
      .select('status, owner_token, delivery_request_id, lease_expires_at')
      .eq('phone_hash', phoneHash)
      .single();

    if (
      !existing ||
      existing.owner_token !== ownerToken ||
      existing.delivery_request_id !== deliveryRequestId ||
      existing.status !== 'PENDING'
    ) {
      return { success: false, error: 'STALE_OR_LOST_OWNERSHIP' };
    }

    if (existing.lease_expires_at && new Date(existing.lease_expires_at) <= new Date()) {
      return { success: false, error: 'LEASE_EXPIRED' };
    }

    const { error: updateErr } = await supabase
      .from('auth_otp_verifications')
      .update({ status: 'FAILED' })
      .eq('phone_hash', phoneHash)
      .eq('delivery_request_id', deliveryRequestId)
      .eq('owner_token', ownerToken)
      .eq('status', 'PENDING');

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

/**
 * 4. Verify and Consume OTP atomically (Single-Use).
 * Checks status == 'ACTIVE', expires_at > now, attempts < max_attempts.
 * Marks status = 'CONSUMED' upon success.
 */
export async function consumeOtpIfValid(
  supabase: SupabaseClient,
  params: {
    phoneHash: string;
    enteredOtp: string;
    hmacSecret: string;
  }
): Promise<{ valid: boolean; isBlocked?: boolean; error?: string }> {
  const { phoneHash, enteredOtp, hmacSecret } = params;

  if (!phoneHash || !enteredOtp || !hmacSecret) {
    return { valid: false, error: 'Tham số xác thực OTP không được để trống.' };
  }

  const cleanOtp = enteredOtp.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, error: 'Mã OTP phải gồm đúng 6 chữ số.' };
  }

  // Try atomic RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc('consume_otp_if_valid', {
    p_phone_hash: phoneHash,
    p_entered_otp: cleanOtp,
    p_hmac_secret: hmacSecret
  });

  if (!rpcErr && rpcData !== null) {
    const res = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (res?.success) {
      return { valid: true };
    }
    return {
      valid: false,
      error: res?.error_message || 'Mã OTP không chính xác hoặc đã hết hiệu lực.'
    };
  }

  // Check if RPC/table missing
  const msg = rpcErr?.message || '';
  if (
    rpcErr?.code === '42P01' ||
    rpcErr?.code === 'PGRST202' ||
    msg.includes('does not exist') ||
    msg.includes('auth_otp_verifications')
  ) {
    // Direct table fallback
    try {
      const { data, error } = await supabase
        .from('auth_otp_verifications')
        .select('otp_hash, salt, status, expires_at, attempts, max_attempts')
        .eq('phone_hash', phoneHash)
        .single();

      if (error) {
        if (error.code === '42P01') {
          return {
            valid: false,
            isBlocked: true,
            error: 'Bảng dữ liệu auth_otp_verifications chưa được khởi tạo trên Supabase (BLOCKED – Cần chạy Migration 003).'
          };
        }
        return { valid: false, error: 'Mã OTP không tồn tại hoặc đã bị tiêu huỷ.' };
      }

      if (!data) {
        return { valid: false, error: 'Không tìm thấy phiên OTP hợp lệ cho tài khoản này.' };
      }

      // Check status: ONLY ACTIVE can be verified
      if (data.status !== 'ACTIVE') {
        if (data.status === 'PENDING') {
          return { valid: false, error: 'Mã OTP đang trong tiến trình gửi đi, chưa thể xác thực.' };
        }
        if (data.status === 'CONSUMED') {
          return { valid: false, error: 'Mã OTP này đã được sử dụng trước đó (Single-Use violation).' };
        }
        return { valid: false, error: 'Mã OTP không còn hiệu lực.' };
      }

      // Check TTL 300s
      if (new Date(data.expires_at) < new Date()) {
        await supabase
          .from('auth_otp_verifications')
          .update({ status: 'EXPIRED' })
          .eq('phone_hash', phoneHash)
          .catch(() => {});
        return { valid: false, error: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới.' };
      }

      // Check attempts lockout
      if (data.attempts >= (data.max_attempts || 5)) {
        return { valid: false, error: 'Mã OTP đã bị khóa do nhập sai quá 5 lần.' };
      }

      // Compute salted candidate hash
      const candidateHash = computeSaltedOtpHash(data.salt, phoneHash, enteredOtp, hmacSecret);

      if (candidateHash !== data.otp_hash) {
        const newAttempts = (data.attempts || 0) + 1;
        const willExpire = newAttempts >= (data.max_attempts || 5);
        await supabase
          .from('auth_otp_verifications')
          .update({
            attempts: newAttempts,
            status: willExpire ? 'EXPIRED' : 'ACTIVE'
          })
          .eq('phone_hash', phoneHash)
          .catch(() => {});

        const remaining = Math.max(0, (data.max_attempts || 5) - newAttempts);
        return {
          valid: false,
          error: remaining > 0
            ? `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
            : 'Mã OTP đã bị khóa do nhập sai quá 5 lần.'
        };
      }

      // VALID! Mark status = 'CONSUMED' atomically (Single-Use)
      await supabase
        .from('auth_otp_verifications')
        .update({
          status: 'CONSUMED',
          consumed_at: new Date().toISOString()
        })
        .eq('phone_hash', phoneHash)
        .eq('status', 'ACTIVE')
        .catch(() => {});

      return { valid: true };
    } catch (err: unknown) {
      return { valid: false, error: err instanceof Error ? err.message : 'Database error' };
    }
  }

  return { valid: false, error: rpcErr?.message || 'Lỗi xác minh OTP.' };
}
