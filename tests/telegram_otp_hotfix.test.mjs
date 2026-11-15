import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

const apiTsLoaderSource = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.js') && context.parentURL && context.parentURL.includes('/api/')) {
    const tsSpecifier = specifier.slice(0, -3) + '.ts';
    try {
      return await nextResolve(tsSpecifier, context);
    } catch {
      // fall through
    }
  }
  return nextResolve(specifier, context);
}
`;
register('data:text/javascript,' + encodeURIComponent(apiTsLoaderSource));

const {
  normalizePhoneNumber,
  isValidPhoneNumber,
  generateCryptographicOtp,
  dispatchTelegramOtp,
  resolveOtpUserIdentity,
  acquireOtpDispatchLease,
  activatePendingOtp,
  failPendingOtp,
  consumeOtpIfValid,
  computePhoneHash,
  computeSaltedOtpHash
} = await import('../api/_lib/telegramDispatcher.ts');

test('1. PHONE NORMALIZATION: Standardizes VN mobile numbers', () => {
  assert.equal(normalizePhoneNumber('+84 38 585 2920'), '0385852920');
  assert.equal(normalizePhoneNumber('84385852920'), '0385852920');
  assert.equal(normalizePhoneNumber('038.585.2920'), '0385852920');
  assert.equal(normalizePhoneNumber('(038) 585-2920'), '0385852920');
  assert.equal(normalizePhoneNumber(' 0385852920 '), '0385852920');
  assert.equal(normalizePhoneNumber(''), '');
  assert.equal(normalizePhoneNumber(null), '');

  assert.equal(isValidPhoneNumber('0385852920'), true);
  assert.equal(isValidPhoneNumber('+84901234567'), true);
  assert.equal(isValidPhoneNumber('12345'), false);
  assert.equal(isValidPhoneNumber('0123456789'), false);
});

test('2. CRYPTOGRAPHIC OTP GENERATION: Range [100000, 999999], numeric and high entropy', () => {
  const codes = new Set();
  for (let i = 0; i < 50; i++) {
    const code = generateCryptographicOtp();
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
    const num = parseInt(code, 10);
    assert.ok(num >= 100000 && num <= 999999);
    codes.add(code);
  }
  assert.ok(codes.size >= 48, 'Generated OTP codes must have high cryptographic entropy');
});

test('3. TELEGRAM BOT DISPATCH: Token and Chat ID guards', async () => {
  const missingToken = await dispatchTelegramOtp({
    token: '',
    chatId: '123456',
    otp: '123456'
  });
  assert.equal(missingToken.success, false);
  assert.ok(missingToken.error?.includes('TELEGRAM_BOT_TOKEN'));

  const missingChat = await dispatchTelegramOtp({
    token: 'fake_bot_token',
    chatId: '',
    otp: '123456'
  });
  assert.equal(missingChat.success, false);
  assert.ok(missingChat.error?.includes('Telegram Chat ID'));
});

test('4. RBAC IDENTITY RESOLUTION: Tra cứu tài khoản hợp lệ, Chat ID gắn trực tiếp vào tài khoản, không dùng fallback chung', async () => {
  const mockRows = [
    {
      id: 'usr_active_am',
      username: 'am_dong_nai',
      display_name: 'AM Đồng Nai',
      role: 'area_manager',
      permissions: ['incident_intake_submit'],
      is_active: true,
      phone: '0385852920',
      telegram_chat_id: '99887766'
    },
    {
      id: 'usr_inactive',
      username: 'inactive_user',
      display_name: 'Inactive User',
      role: 'viewer',
      permissions: [],
      is_active: false,
      phone: '0380000001',
      telegram_chat_id: '11223344'
    },
    {
      id: 'usr_no_chat',
      username: 'no_chat_user',
      display_name: 'No Chat User',
      role: 'area_manager',
      permissions: ['incident_intake_submit'],
      is_active: true,
      phone: '0380000002',
      telegram_chat_id: null // Missing Chat ID in DB
    }
  ];

  const mockSupabase = {
    from: () => ({
      select: async () => ({ data: mockRows, error: null })
    })
  };

  // 1. Success matching
  const okResult = await resolveOtpUserIdentity(mockSupabase, '0385852920');
  assert.equal(okResult.success, true);
  assert.equal(okResult.user?.id, 'usr_active_am');
  assert.equal(okResult.user?.role, 'area_manager');
  assert.equal(okResult.user?.chatId, '99887766');

  // 2. Unregistered phone
  const notFound = await resolveOtpUserIdentity(mockSupabase, '0389999999');
  assert.equal(notFound.success, false);
  assert.equal(notFound.statusCode, 403);
  assert.ok(notFound.error?.includes('chưa được đăng ký'));

  // 3. Inactive account
  const inactive = await resolveOtpUserIdentity(mockSupabase, '0380000001');
  assert.equal(inactive.success, false);
  assert.equal(inactive.statusCode, 403);
  assert.ok(inactive.error?.includes('vô hiệu hóa'));

  // 4. Missing Chat ID in account record -> Strictly rejected, NO env fallback
  const noChat = await resolveOtpUserIdentity(mockSupabase, '0380000002');
  assert.equal(noChat.success, false);
  assert.equal(noChat.statusCode, 403);
  assert.ok(noChat.error?.includes('chưa được liên kết Telegram Chat ID trong cơ sở dữ liệu'));
});

test('5. SUPABASE AUTH_OTP_VERIFICATIONS: Salted HMAC hash, lease acquisition, activation, single-use atomic consumption, and TTL', async () => {
  const secret = 'test-secret-at-least-32-chars-long-12345';
  const phone = '0385852920';
  const validOtp = '654321';
  const wrongOtp = '111111';
  const phoneHash = computePhoneHash(phone, secret);
  const salt = 'testsalt1234567890';
  const otpHash = computeSaltedOtpHash(salt, phoneHash, validOtp, secret);
  const ownerToken = 'owner-test-token-uuid-1';
  const deliveryRequestId = 'req-test-uuid-1';

  const mockDbStore = new Map();

  const mockSupabase = {
    rpc: async (fnName, args) => {
      if (fnName === 'acquire_otp_dispatch_lease') {
        mockDbStore.set(args.p_phone_hash, {
          phone_hash: args.p_phone_hash,
          otp_hash: args.p_otp_hash,
          salt: args.p_salt,
          status: 'PENDING',
          delivery_request_id: args.p_delivery_request_id,
          owner_token: args.p_owner_token,
          lease_expires_at: new Date(Date.now() + args.p_lease_seconds * 1000).toISOString(),
          attempts: 0,
          max_attempts: 5,
          expires_at: new Date(Date.now() + 300 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          activated_at: null,
          consumed_at: null
        });
        return { data: [{ success: true }], error: null };
      }
      if (fnName === 'activate_pending_otp') {
        const row = mockDbStore.get(args.p_phone_hash);
        if (
          !row ||
          row.owner_token !== args.p_owner_token ||
          row.delivery_request_id !== args.p_delivery_request_id
        ) {
          return { data: [{ success: false, error_message: 'STALE_OR_LOST_OWNERSHIP' }], error: null };
        }
        row.status = 'ACTIVE';
        row.activated_at = new Date().toISOString();
        return { data: [{ success: true }], error: null };
      }
      if (fnName === 'consume_otp_if_valid') {
        const row = mockDbStore.get(args.p_phone_hash);
        if (!row || row.status !== 'ACTIVE') {
          return { data: [{ success: false, error_message: 'OTP_NOT_ACTIVE' }], error: null };
        }
        const expectedHash = computeSaltedOtpHash(row.salt, args.p_phone_hash, args.p_entered_otp, args.p_hmac_secret);
        if (expectedHash !== row.otp_hash) {
          row.attempts++;
          return { data: [{ success: false, error_message: 'Mã OTP không chính xác.' }], error: null };
        }
        row.status = 'CONSUMED';
        row.consumed_at = new Date().toISOString();
        return { data: [{ success: true }], error: null };
      }
      return { data: null, error: { message: 'RPC not found' } };
    },
    from: (table) => {
      assert.equal(table, 'auth_otp_verifications', 'Strictly queries auth_otp_verifications table');
      return {
        select: () => ({
          eq: (col, val) => ({
            single: async () => {
              const row = mockDbStore.get(val);
              if (!row) return { data: null, error: { message: 'Not found' } };
              return { data: row, error: null };
            }
          })
        })
      };
    }
  };

  // 1. Acquire dispatch lease in PENDING state
  const leaseRes = await acquireOtpDispatchLease(mockSupabase, {
    phoneHash,
    deliveryRequestId,
    ownerToken,
    leaseSeconds: 12,
    otpHash,
    salt
  });
  assert.equal(leaseRes.acquired, true);

  // Check stored record: must contain salt, owner_token, PENDING status, must NOT contain plaintext OTP
  const storedRow = mockDbStore.get(phoneHash);
  assert.equal(storedRow.salt, salt);
  assert.equal(storedRow.otp_hash, otpHash);
  assert.equal(storedRow.status, 'PENDING');
  assert.equal(storedRow.owner_token, ownerToken);
  assert.equal(storedRow.otp_hash.includes(validOtp), false, 'Plaintext OTP is never stored in DB');

  // 2. Activate pending OTP (Telegram dispatch success callback)
  const actRes = await activatePendingOtp(mockSupabase, {
    phoneHash,
    deliveryRequestId,
    ownerToken,
    ttlSeconds: 300
  });
  assert.equal(actRes.activated, true);
  assert.equal(storedRow.status, 'ACTIVE');

  // 3. Wrong OTP fails and increments attempt
  const wrongRes = await consumeOtpIfValid(mockSupabase, {
    phoneHash,
    enteredOtp: wrongOtp,
    hmacSecret: secret
  });
  assert.equal(wrongRes.valid, false);
  assert.ok(wrongRes.error?.includes('không chính xác'));
  assert.equal(storedRow.attempts, 1);

  // 4. Valid OTP succeeds and transitions to CONSUMED
  const validRes = await consumeOtpIfValid(mockSupabase, {
    phoneHash,
    enteredOtp: validOtp,
    hmacSecret: secret
  });
  assert.equal(validRes.valid, true);
  assert.equal(storedRow.status, 'CONSUMED');
  assert.ok(storedRow.consumed_at);

  // 5. Replay attack: OTP was already consumed -> second attempt fails (Single-Use violation)
  const replayRes = await consumeOtpIfValid(mockSupabase, {
    phoneHash,
    enteredOtp: validOtp,
    hmacSecret: secret
  });
  assert.equal(replayRes.valid, false);
  assert.ok(replayRes.error?.includes('OTP_NOT_ACTIVE') || replayRes.error?.includes('không chính xác'));
});

test('6. MISSING TABLE FAIL-CLOSED (BLOCKED STATUS): Reports BLOCKED when auth_otp_verifications is missing', async () => {
  const secret = 'test-secret-at-least-32-chars-long-12345';
  const missingTableSupabase = {
    rpc: async () => ({ data: null, error: { message: 'relation "auth_otp_verifications" does not exist', code: '42P01' } }),
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { code: '42P01', message: 'relation "auth_otp_verifications" does not exist' }
          })
        })
      }),
      upsert: async () => ({
        error: { code: '42P01', message: 'relation "auth_otp_verifications" does not exist' }
      })
    })
  };

  const leaseRes = await acquireOtpDispatchLease(missingTableSupabase, {
    phoneHash: 'test-hash',
    deliveryRequestId: 'req-1',
    ownerToken: 'owner-1',
    leaseSeconds: 12,
    otpHash: 'hash',
    salt: 'salt'
  });
  assert.equal(leaseRes.acquired, false);
  assert.equal(leaseRes.isBlocked, true);
  assert.ok(leaseRes.error?.includes('BLOCKED'));

  const verifyRes = await consumeOtpIfValid(missingTableSupabase, {
    phoneHash: 'test-hash',
    enteredOtp: '123456',
    hmacSecret: secret
  });
  assert.equal(verifyRes.valid, false);
  assert.equal(verifyRes.isBlocked, true);
  assert.ok(verifyRes.error?.includes('BLOCKED'));
});
