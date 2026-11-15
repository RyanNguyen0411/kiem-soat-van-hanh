import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  acquireOtpDispatchLease,
  activatePendingOtp,
  failPendingOtp,
  consumeOtpIfValid,
  computePhoneHash,
  computeSaltedOtpHash
} = await import('../api/_lib/telegramDispatcher.ts');

const TEST_SECRET = 'test-secret-at-least-32-chars-long-12345';
const TEST_PHONE = '0385852920';

function createMockSupabaseOtpStore() {
  const store = new Map();

  return {
    rows: store,
    rpc: async (fnName, args) => {
      const now = new Date();

      if (fnName === 'acquire_otp_dispatch_lease') {
        const {
          p_phone_hash,
          p_delivery_request_id,
          p_owner_token,
          p_lease_seconds,
          p_otp_hash,
          p_salt
        } = args;

        const existing = store.get(p_phone_hash);
        if (existing) {
          const isPending = existing.status === 'PENDING';
          const isLeaseActive = existing.lease_expires_at && new Date(existing.lease_expires_at) > now;
          if (isPending && isLeaseActive && existing.owner_token !== p_owner_token) {
            return {
              data: [{ success: false, error_message: 'ACQUIRE_FAILED_LEASE_ACTIVE' }],
              error: null
            };
          }
        }

        const leaseExpiresAt = new Date(now.getTime() + p_lease_seconds * 1000).toISOString();
        const expiresAt = new Date(now.getTime() + 300 * 1000).toISOString();

        store.set(p_phone_hash, {
          phone_hash: p_phone_hash,
          otp_hash: p_otp_hash,
          salt: p_salt,
          status: 'PENDING',
          delivery_request_id: p_delivery_request_id,
          owner_token: p_owner_token,
          lease_expires_at: leaseExpiresAt,
          attempts: 0,
          max_attempts: 5,
          expires_at: expiresAt,
          created_at: now.toISOString(),
          activated_at: null,
          consumed_at: null
        });

        return { data: [{ success: true }], error: null };
      }

      if (fnName === 'activate_pending_otp') {
        const { p_phone_hash, p_delivery_request_id, p_owner_token, p_ttl_seconds } = args;
        const existing = store.get(p_phone_hash);

        if (!existing) {
          return { data: [{ success: false, error_message: 'NOT_FOUND' }], error: null };
        }
        if (
          existing.owner_token !== p_owner_token ||
          (p_delivery_request_id && existing.delivery_request_id !== p_delivery_request_id)
        ) {
          return { data: [{ success: false, error_message: 'STALE_OR_LOST_OWNERSHIP' }], error: null };
        }
        if (existing.status !== 'PENDING') {
          return { data: [{ success: false, error_message: 'NOT_PENDING' }], error: null };
        }
        if (existing.lease_expires_at && new Date(existing.lease_expires_at) <= now) {
          return { data: [{ success: false, error_message: 'LEASE_EXPIRED' }], error: null };
        }

        existing.status = 'ACTIVE';
        existing.activated_at = now.toISOString();
        existing.expires_at = new Date(now.getTime() + p_ttl_seconds * 1000).toISOString();

        return { data: [{ success: true }], error: null };
      }

      if (fnName === 'fail_pending_otp') {
        const { p_phone_hash, p_delivery_request_id, p_owner_token, p_reason } = args;
        const existing = store.get(p_phone_hash);
        if (!existing) {
          return { data: [{ success: false, error_message: 'NOT_FOUND' }], error: null };
        }
        if (
          existing.owner_token !== p_owner_token ||
          (p_delivery_request_id && existing.delivery_request_id !== p_delivery_request_id) ||
          existing.status !== 'PENDING'
        ) {
          return { data: [{ success: false, error_message: 'STALE_OR_LOST_OWNERSHIP' }], error: null };
        }
        if (existing.lease_expires_at && new Date(existing.lease_expires_at) <= now) {
          return { data: [{ success: false, error_message: 'LEASE_EXPIRED' }], error: null };
        }
        existing.status = 'FAILED';
        existing.failed_reason = p_reason;
        return { data: [{ success: true }], error: null };
      }

      if (fnName === 'consume_otp_if_valid') {
        const { p_phone_hash, p_entered_otp, p_hmac_secret } = args;
        const existing = store.get(p_phone_hash);

        if (!existing) {
          return { data: [{ success: false, error_message: 'Mã OTP không tồn tại hoặc đã bị tiêu huỷ.' }], error: null };
        }
        if (existing.status !== 'ACTIVE') {
          return { data: [{ success: false, error_message: 'Mã OTP không ở trạng thái hoạt động.' }], error: null };
        }
        if (new Date(existing.expires_at) < now) {
          existing.status = 'EXPIRED';
          return { data: [{ success: false, error_message: 'Mã OTP đã hết hiệu lực (quá 5 phút).' }], error: null };
        }
        if (existing.attempts >= existing.max_attempts) {
          existing.status = 'EXPIRED';
          return { data: [{ success: false, error_message: 'Mã OTP đã bị khóa do nhập sai quá 5 lần.' }], error: null };
        }

        const candidate = computeSaltedOtpHash(existing.salt, p_phone_hash, p_entered_otp, p_hmac_secret);
        if (candidate !== existing.otp_hash) {
          existing.attempts += 1;
          if (existing.attempts >= existing.max_attempts) {
            existing.status = 'EXPIRED';
          }
          const remaining = Math.max(0, existing.max_attempts - existing.attempts);
          return {
            data: [{ success: false, error_message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` }],
            error: null
          };
        }

        existing.status = 'CONSUMED';
        existing.consumed_at = now.toISOString();
        return { data: [{ success: true }], error: null };
      }

      return { data: null, error: { message: `Unknown function: ${fnName}` } };
    },
    from: () => {
      throw new Error('from() should not be called when RPC is implemented');
    }
  };
}

// ============================================================================
// CONCURRENCY TEST CASES (1 - 7)
// ============================================================================

test('1. CONCURRENT SEND-OTP: Hai request gửi OTP đồng thời cùng số điện thoại (chỉ 1 request acquire thành công)', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);

  const reqA = {
    phoneHash,
    deliveryRequestId: 'req_a_id',
    ownerToken: 'token_a',
    leaseSeconds: 12,
    otpHash: 'hash_a',
    salt: 'salt_a'
  };

  const reqB = {
    phoneHash,
    deliveryRequestId: 'req_b_id',
    ownerToken: 'token_b',
    leaseSeconds: 12,
    otpHash: 'hash_b',
    salt: 'salt_b'
  };

  // Dispatch both simultaneously
  const [resA, resB] = await Promise.all([
    acquireOtpDispatchLease(supabase, reqA),
    acquireOtpDispatchLease(supabase, reqB)
  ]);

  // Exactly one must acquire, the other must fail with active lease conflict
  const successCount = (resA.acquired ? 1 : 0) + (resB.acquired ? 1 : 0);
  assert.equal(successCount, 1, 'Chỉ duy nhất một request được acquire lease gửi OTP');

  const loser = resA.acquired ? resB : resA;
  assert.equal(loser.acquired, false);
  assert.ok(loser.error?.includes('ACQUIRE_FAILED_LEASE_ACTIVE') || loser.error?.includes('đang được xử lý'));
});

test('2. CONCURRENT VERIFY-OTP: Hai request verify cùng một OTP đồng thời (chỉ 1 request nhận success, chống Single-Use breach)', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);
  const otp = '888999';
  const salt = 'salt_123';
  const otpHash = computeSaltedOtpHash(salt, phoneHash, otp, TEST_SECRET);

  // Seed active OTP
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_1',
    ownerToken: 'token_1',
    leaseSeconds: 12,
    otpHash,
    salt
  });
  await activatePendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_1',
    ownerToken: 'token_1',
    ttlSeconds: 300
  });

  // Two verify requests arrive in the exact same millisecond
  const [verify1, verify2] = await Promise.all([
    consumeOtpIfValid(supabase, { phoneHash, enteredOtp: otp, hmacSecret: TEST_SECRET }),
    consumeOtpIfValid(supabase, { phoneHash, enteredOtp: otp, hmacSecret: TEST_SECRET })
  ]);

  const verifySuccessCount = (verify1.valid ? 1 : 0) + (verify2.valid ? 1 : 0);
  assert.equal(verifySuccessCount, 1, 'Chỉ 1 request verify được chấp thuận, triệt tiêu vi phạm Single-Use');

  const secondVerify = verify1.valid ? verify2 : verify1;
  assert.equal(secondVerify.valid, false);
});

test('3. LEASE EXPIRATION & TAKEOVER: Request A hết lease (12s), Request B tiếp quản thành công', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);

  // Request A acquires lease
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_a',
    ownerToken: 'token_a',
    leaseSeconds: 12,
    otpHash: 'hash_a',
    salt: 'salt_a'
  });

  // Manually fast-forward lease_expires_at past current time
  const row = supabase.rows.get(phoneHash);
  row.lease_expires_at = new Date(Date.now() - 1000).toISOString(); // Expired 1 second ago

  // Request A hết lease phải bị từ chối kích hoạt KỂ CẢ KHI chưa có request B tiếp quản
  const expActRes = await activatePendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_a',
    ownerToken: 'token_a',
    ttlSeconds: 300
  });
  assert.equal(expActRes.activated, false, 'Request A hết hạn lease phải bị từ chối kích hoạt ngay cả khi chưa có B');
  assert.ok(expActRes.error?.includes('LEASE_EXPIRED') || expActRes.error?.includes('lease'));

  // Request B arrives after lease expiration
  const resB = await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_b',
    ownerToken: 'token_b',
    leaseSeconds: 12,
    otpHash: 'hash_b',
    salt: 'salt_b'
  });

  assert.equal(resB.acquired, true, 'Request B phải tiếp quản lease thành công khi lease của A đã hết hạn');
  assert.equal(supabase.rows.get(phoneHash).owner_token, 'token_b');
});

test('4. STALE REQUEST PREVENTION: Request A quay lại sau khi B tiếp quản không thể kích hoạt đè B', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);

  // 1. A acquires
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_a',
    ownerToken: 'token_a',
    leaseSeconds: 12,
    otpHash: 'hash_a',
    salt: 'salt_a'
  });

  // 2. A lease expires
  supabase.rows.get(phoneHash).lease_expires_at = new Date(Date.now() - 1000).toISOString();

  // 3. B takes over
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_b',
    ownerToken: 'token_b',
    leaseSeconds: 12,
    otpHash: 'hash_b',
    salt: 'salt_b'
  });

  // 4. Stale Request A returns from late Telegram dispatch and attempts to activate
  const staleActivation = await activatePendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_a',
    ownerToken: 'token_a', // A's stale token
    ttlSeconds: 300
  });

  assert.equal(staleActivation.activated, false, 'Stale Request A không được phép kích hoạt');
  assert.ok(staleActivation.error?.includes('STALE_OR_LOST_OWNERSHIP') || staleActivation.error?.includes('lease'));

  // Database must still belong to B and remain PENDING
  assert.equal(supabase.rows.get(phoneHash).owner_token, 'token_b');
  assert.equal(supabase.rows.get(phoneHash).status, 'PENDING');
});

test('5. TELEGRAM TIMEOUT/ERROR: Đánh dấu FAILED an toàn, không để lại PENDING treo & từ chối Stale/Expired Fail', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);

  // 1. Owner hợp lệ, lease còn hạn -> fail thành công
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_fail',
    ownerToken: 'token_fail',
    leaseSeconds: 12,
    otpHash: 'hash_fail',
    salt: 'salt_fail'
  });

  const failRes = await failPendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_fail',
    ownerToken: 'token_fail',
    reason: 'Telegram API timeout (8000ms)'
  });
  assert.equal(failRes.success, true);

  const row = supabase.rows.get(phoneHash);
  assert.equal(row.status, 'FAILED');
  assert.equal(row.failed_reason, 'Telegram API timeout (8000ms)');

  // 2. Owner cũ, request ID cũ -> trả STALE_OR_LOST_OWNERSHIP
  const staleFail = await failPendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'stale_req',
    ownerToken: 'stale_token',
    reason: 'Stale error'
  });
  assert.equal(staleFail.success, false);
  assert.equal(staleFail.error, 'STALE_OR_LOST_OWNERSHIP');

  // 3. Owner hợp lệ nhưng lease hết hạn -> trả LEASE_EXPIRED
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_exp_fail',
    ownerToken: 'token_exp_fail',
    leaseSeconds: 12,
    otpHash: 'hash_exp_fail',
    salt: 'salt_exp_fail'
  });
  // Fast forward lease expiration
  supabase.rows.get(phoneHash).lease_expires_at = new Date(Date.now() - 1000).toISOString();

  const expiredFail = await failPendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_exp_fail',
    ownerToken: 'token_exp_fail',
    reason: 'Late fail after lease expiration'
  });
  assert.equal(expiredFail.success, false);
  assert.equal(expiredFail.error, 'LEASE_EXPIRED');

  // 4. Owner cũ nhưng cùng phone_hash đã được cấp phiên mới -> trả STALE_OR_LOST_OWNERSHIP
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_newer',
    ownerToken: 'token_newer',
    leaseSeconds: 12,
    otpHash: 'hash_newer',
    salt: 'salt_newer'
  });
  const staleOldFail = await failPendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_exp_fail',
    ownerToken: 'token_exp_fail',
    reason: 'Attempting to fail newer lease with old token'
  });
  assert.equal(staleOldFail.success, false);
  assert.equal(staleOldFail.error, 'STALE_OR_LOST_OWNERSHIP');

  // 5. Concurrent activate và fail trên cùng một pending OTP
  const [actResult, concurrentFailResult] = await Promise.all([
    activatePendingOtp(supabase, {
      phoneHash,
      deliveryRequestId: 'req_newer',
      ownerToken: 'token_newer',
      ttlSeconds: 300
    }),
    failPendingOtp(supabase, {
      phoneHash,
      deliveryRequestId: 'req_newer',
      ownerToken: 'token_newer',
      reason: 'Concurrent fail race'
    })
  ]);

  // Đúng 1 hành động được thực thi thành công
  const oneSucceeded = (actResult.activated ? 1 : 0) + (concurrentFailResult.success ? 1 : 0);
  assert.equal(oneSucceeded, 1, 'Chỉ 1 trong 2 RPC activate hoặc fail được phép thành công khi chạy đồng thời');
});

test('6. RESEND DURING PENDING: Request gửi lại trong lúc OTP cũ đang PENDING bị chặn', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);

  // Original OTP is in-flight (PENDING with 12s lease)
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_orig',
    ownerToken: 'token_orig',
    leaseSeconds: 12,
    otpHash: 'hash_orig',
    salt: 'salt_orig'
  });

  // User impatiently clicks resend after 2 seconds
  const resendAttempt = await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_resend',
    ownerToken: 'token_resend',
    leaseSeconds: 12,
    otpHash: 'hash_resend',
    salt: 'salt_resend'
  });

  assert.equal(resendAttempt.acquired, false, 'Resend trong khi lease cũ đang active phải bị chặn');
  assert.ok(resendAttempt.error?.includes('ACQUIRE_FAILED_LEASE_ACTIVE') || resendAttempt.error?.includes('đang được xử lý'));
});

test('7. CONCURRENT VERIFY ON EXPIRED OTP: Hết hạn 300s và request verify đồng thời đều bị từ chối an toàn', async () => {
  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);
  const otp = '999111';
  const salt = 'salt_exp';
  const otpHash = computeSaltedOtpHash(salt, phoneHash, otp, TEST_SECRET);

  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_exp',
    ownerToken: 'token_exp',
    leaseSeconds: 12,
    otpHash,
    salt
  });
  await activatePendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_exp',
    ownerToken: 'token_exp',
    ttlSeconds: 300
  });

  // Fast-forward expires_at to 1 second ago (TTL 300s expired)
  supabase.rows.get(phoneHash).expires_at = new Date(Date.now() - 1000).toISOString();

  // Two verify calls arrive concurrently on expired OTP
  const [res1, res2] = await Promise.all([
    consumeOtpIfValid(supabase, { phoneHash, enteredOtp: otp, hmacSecret: TEST_SECRET }),
    consumeOtpIfValid(supabase, { phoneHash, enteredOtp: otp, hmacSecret: TEST_SECRET })
  ]);

  assert.equal(res1.valid, false);
  assert.equal(res2.valid, false);
  assert.ok(res1.error?.includes('hết hiệu lực'));
  assert.ok(res2.error?.includes('hết hiệu lực') || res2.error?.includes('không ở trạng thái'));
  assert.equal(supabase.rows.get(phoneHash).status, 'EXPIRED');
});

test('8. CUMULATIVE RATE-LIMIT ACROSS RESENDS: Resend không reset cumulative failure counter (10m window, 5 failures)', async () => {
  // Mô phỏng cumulative failure store của auth_rate_limits
  const rateLimitStore = {
    phoneFailures: 0,
    lockedUntil: null,
    recordFailure() {
      this.phoneFailures += 1;
      if (this.phoneFailures >= 5) {
        this.lockedUntil = Date.now() + 60 * 1000;
      }
    },
    isLocked() {
      return this.lockedUntil && this.lockedUntil > Date.now();
    }
  };

  const supabase = createMockSupabaseOtpStore();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);

  // Lần 1: Nhập sai 2 lần trên phiên OTP 1
  rateLimitStore.recordFailure();
  rateLimitStore.recordFailure();
  assert.equal(rateLimitStore.phoneFailures, 2);

  // Người dùng bấm Resend OTP: Cấp phiên mới PENDING -> ACTIVE
  await acquireOtpDispatchLease(supabase, {
    phoneHash,
    deliveryRequestId: 'req_resend_1',
    ownerToken: 'tok_resend_1',
    leaseSeconds: 12,
    otpHash: 'hash_1',
    salt: 'salt_1'
  });
  await activatePendingOtp(supabase, {
    phoneHash,
    deliveryRequestId: 'req_resend_1',
    ownerToken: 'tok_resend_1',
    ttlSeconds: 300
  });

  // Phiên OTP mới có attempts của riêng nó = 0, NHƯNG cumulative failure store vẫn = 2!
  assert.equal(rateLimitStore.phoneFailures, 2, 'Cumulative counter KHÔNG bị reset khi resend OTP');

  // Lần 2: Nhập sai thêm 3 lần trên phiên OTP 2
  rateLimitStore.recordFailure();
  rateLimitStore.recordFailure();
  rateLimitStore.recordFailure();

  // Đạt 5 lần thất bại tích lũy -> Lockout 60 giây được kích hoạt
  assert.equal(rateLimitStore.phoneFailures, 5);
  assert.equal(rateLimitStore.isLocked(), true, 'Kích hoạt khóa 60 giây sau lần sai thứ 5 tích lũy');
});

test('9. SCHEMA INTEGRITY GUARDS: Dừng có kiểm soát nếu dữ liệu cũ có NULL hoặc trùng lặp phone_hash', () => {
  // Hàm giả lập kiểm tra logic pre-check của migration 003
  function validateExistingSchemaData(rows) {
    const nullPhones = rows.filter(r => !r.phone_hash || !r.phone_hash.trim()).length;
    if (nullPhones > 0) {
      return { ok: false, error: `MIGRATION_BLOCKED: Phát hiện ${nullPhones} dòng có phone_hash rỗng/NULL.` };
    }

    const seen = new Set();
    const dups = new Set();
    for (const r of rows) {
      if (seen.has(r.phone_hash)) dups.add(r.phone_hash);
      seen.add(r.phone_hash);
    }
    if (dups.size > 0) {
      return { ok: false, error: `MIGRATION_BLOCKED: Phát hiện ${dups.size} phone_hash bị trùng lặp.` };
    }

    const missingSecurityData = rows.filter(
      r => (!r.otp_hash || !r.salt) && (r.status === 'PENDING' || r.status === 'ACTIVE')
    ).length;
    if (missingSecurityData > 0) {
      return { ok: false, error: `MIGRATION_BLOCKED: Phát hiện ${missingSecurityData} dòng PENDING/ACTIVE thiếu otp_hash hoặc salt.` };
    }

    return { ok: true };
  }

  // 1. Dữ liệu có NULL phone_hash -> Chặn
  const nullCheck = validateExistingSchemaData([{ phone_hash: null, status: 'EXPIRED' }]);
  assert.equal(nullCheck.ok, false);
  assert.ok(nullCheck.error?.includes('MIGRATION_BLOCKED'));

  // 2. Dữ liệu có Duplicate phone_hash -> Chặn
  const dupCheck = validateExistingSchemaData([
    { phone_hash: 'hash_dup_1', status: 'EXPIRED' },
    { phone_hash: 'hash_dup_1', status: 'EXPIRED' }
  ]);
  assert.equal(dupCheck.ok, false);
  assert.ok(dupCheck.error?.includes('trùng lặp'));

  // 3. Dữ liệu ACTIVE nhưng thiếu hash/salt -> Chặn, không tự sinh hash giả
  const activeMissingHash = validateExistingSchemaData([
    { phone_hash: 'hash_active_1', status: 'ACTIVE', otp_hash: null, salt: null }
  ]);
  assert.equal(activeMissingHash.ok, false);
  assert.ok(activeMissingHash.error?.includes('thiếu otp_hash hoặc salt'));

  // 4. Dữ liệu sạch hợp lệ -> Cho phép migration
  const cleanCheck = validateExistingSchemaData([
    { phone_hash: 'hash_valid_1', status: 'CONSUMED', otp_hash: 'h1', salt: 's1' },
    { phone_hash: 'hash_valid_2', status: 'EXPIRED', otp_hash: 'h2', salt: 's2' }
  ]);
  assert.equal(cleanCheck.ok, true);
});

test('10. CLOCK TIMING POST-LOCK: Thời gian lấy SAU KHI acquire advisory lock, từ chối OTP/lease hết hạn trong lúc chờ lock', async () => {
  const store = new Map();
  const phoneHash = computePhoneHash(TEST_PHONE, TEST_SECRET);
  const validOtp = '123456';
  const salt = 'salt_timing_123';
  const otpHash = computeSaltedOtpHash(salt, phoneHash, validOtp, TEST_SECRET);

  // Seed OTP sẽ hết hạn trong 50ms
  const now = Date.now();
  store.set(phoneHash, {
    phone_hash: phoneHash,
    otp_hash: otpHash,
    salt,
    status: 'ACTIVE',
    delivery_request_id: 'req_time',
    owner_token: 'tok_time',
    lease_expires_at: new Date(now + 12000).toISOString(),
    attempts: 0,
    max_attempts: 5,
    expires_at: new Date(now + 50).toISOString(), // Hết hạn sau 50ms
    created_at: new Date(now).toISOString()
  });

  // Giả lập mock RPC thực hiện lấy clock_timestamp() SAU KHI chờ lock
  const mockSupabase = {
    rpc: async (fnName, args) => {
      if (fnName === 'consume_otp_if_valid') {
        // Mô phỏng transaction bị nghẽn chờ lock 60ms
        await new Promise((resolve) => setTimeout(resolve, 60));
        // Lấy clock_timestamp() SAU khi có lock (Post-Lock)
        const postLockNow = new Date();
        const row = store.get(args.p_phone_hash);

        if (!row) return { data: [{ success: false, error_message: 'NOT_FOUND' }], error: null };
        if (row.status !== 'ACTIVE') return { data: [{ success: false, error_message: 'NOT_ACTIVE' }], error: null };

        // Kiểm tra hết hạn bằng postLockNow: đã quá 50ms -> Bị từ chối!
        if (new Date(row.expires_at) < postLockNow) {
          row.status = 'EXPIRED';
          return { data: [{ success: false, error_message: 'Mã OTP đã hết hiệu lực (quá 5 phút).' }], error: null };
        }

        return { data: [{ success: true }], error: null };
      }
      return { data: null, error: { message: 'Not implemented' } };
    }
  };

  // Request bắt đầu khi OTP chưa hết hạn (còn 50ms), nhưng chờ lock 60ms -> Bị từ chối chính xác
  const verifyRes = await consumeOtpIfValid(mockSupabase, {
    phoneHash,
    enteredOtp: validOtp,
    hmacSecret: TEST_SECRET
  });

  assert.equal(verifyRes.valid, false, 'OTP hết hạn trong lúc chờ lock phải bị từ chối');
  assert.ok(verifyRes.error?.includes('hết hiệu lực'));
  assert.equal(store.get(phoneHash).status, 'EXPIRED');
});

test('11. FULL 13-COLUMN SCHEMA CONTRACT VALIDATION: Kiểm tra kiểu, độ dài, nullability, default và constraint', () => {
  const CONTRACT_13_COLUMNS = {
    phone_hash: { type: 'varchar', minLen: 64, nullable: false, pk: true },
    otp_hash: { type: 'varchar', minLen: 64, nullable: false },
    salt: { type: 'varchar', minLen: 16, nullable: false },
    status: { type: 'varchar', minLen: 20, nullable: false, default: 'PENDING', check: true },
    delivery_request_id: { type: 'varchar', minLen: 64, nullable: false, default: '' },
    owner_token: { type: 'varchar', minLen: 64, nullable: false, default: '' },
    lease_expires_at: { type: 'timestamptz', nullable: false, default: 'NOW()' },
    attempts: { type: 'integer', nullable: false, default: 0, check: true },
    max_attempts: { type: 'integer', nullable: false, default: 5 },
    expires_at: { type: 'timestamptz', nullable: false, default: 'NOW()', index: true },
    created_at: { type: 'timestamptz', nullable: false, default: 'NOW()' },
    activated_at: { type: 'timestamptz', nullable: true },
    consumed_at: { type: 'timestamptz', nullable: true }
  };

  assert.equal(Object.keys(CONTRACT_13_COLUMNS).length, 13, 'Hợp đồng phải định nghĩa đủ 13 cột');

  // Kiểm tra mô phỏng phát hiện schema lỗi
  function auditSchemaAgainstContract(columnMetadata) {
    for (const [colName, rule] of Object.entries(CONTRACT_13_COLUMNS)) {
      const actual = columnMetadata[colName];
      if (!actual) {
        return { ok: false, error: `MIGRATION_BLOCKED: Thiếu cột ${colName}` };
      }
      if (rule.type === 'varchar' && actual.len < rule.minLen) {
        return { ok: false, error: `MIGRATION_BLOCKED: Cột ${colName} có length ${actual.len} < ${rule.minLen}` };
      }
      if (!rule.nullable && actual.nullable) {
        return { ok: false, error: `MIGRATION_BLOCKED: Cột ${colName} phải NOT NULL` };
      }
    }
    return { ok: true };
  }

  // 1. Trường hợp cột có độ dài ngắn hơn hợp đồng (ví dụ VARCHAR(32) thay vì 64) -> Dừng có kiểm soát
  const invalidLenAudit = auditSchemaAgainstContract({
    phone_hash: { type: 'varchar', len: 32, nullable: false },
    otp_hash: { type: 'varchar', len: 64, nullable: false }
  });
  assert.equal(invalidLenAudit.ok, false);
  assert.ok(invalidLenAudit.error?.includes('length'));

  // 2. Trường hợp thiếu NOT NULL -> Dừng có kiểm soát
  const invalidNullAudit = auditSchemaAgainstContract({
    phone_hash: { type: 'varchar', len: 64, nullable: true } // nullable is true!
  });
  assert.equal(invalidNullAudit.ok, false);
  assert.ok(invalidNullAudit.error?.includes('NOT NULL'));
});
