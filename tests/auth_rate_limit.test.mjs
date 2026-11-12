import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  PREVIEW_RATE_LIMITS,
  computeRateLimitKeyHash,
  extractTrustedClientIp
} = await import('../api/_lib/rateLimit.ts');
const { redactSensitive, getMissingEnvVars } = await import('../api/_lib/env.ts');
const { evaluateRbacRow } = await import('../api/_lib/rbac.ts');
const { signIncidentSessionJwt } = await import('../api/_lib/jwt.ts');
const { processLoginRequest } = await import('../api/auth/login.ts');
const { processSendOtpRequest } = await import('../api/auth/send-otp.ts');
const { processVerifyOtpRequest } = await import('../api/auth/verify-otp.ts');

const TEST_HMAC_SECRET = 'rate-limit-test-only-hmac-secret-minimum-32-chars!';
const TEST_JWT_SECRET = 'jwt-test-only-signing-secret-minimum-32-chars!!';

function createMockResponse() {
  const headers = {};
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  return {
    statusCode: 200,
    headers,
    bodyText: '',
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    end(chunk) {
      if (chunk) this.bodyText += String(chunk);
      resolveDone();
    },
    get json() { return JSON.parse(this.bodyText || '{}'); },
    done
  };
}

/**
 * In-memory atomic simulation of `002_auth_rate_limits.sql` RPC semantics for local unit testing.
 * Live PostgreSQL concurrency must still be verified after migration execution on Supabase Dev.
 */
function createTestRateLimitStore() {
  const rows = new Map();

  return {
    rows,
    async check(keyHash) {
      const row = rows.get(keyHash);
      const now = Date.now();
      if (row && row.lockedUntil && row.lockedUntil > now) {
        return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((row.lockedUntil - now) / 1000)) };
      }
      return { blocked: false, retryAfterSeconds: 0 };
    },
    async consume(keyHash, rule) {
      const now = Date.now();
      const existing = rows.get(keyHash);
      if (existing && existing.lockedUntil && existing.lockedUntil > now) {
        return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((existing.lockedUntil - now) / 1000)) };
      }
      if (!existing || (existing.lockedUntil && existing.lockedUntil <= now) || (existing.windowStartedAt + rule.windowSeconds * 1000 <= now)) {
        rows.set(keyHash, { scope: rule.scope, count: 1, windowStartedAt: now, lockedUntil: null });
        return { blocked: false, retryAfterSeconds: 0 };
      }
      if (existing.count + 1 > rule.maxAttempts) {
        existing.count = rule.maxAttempts + 1;
        existing.lockedUntil = now + rule.lockSeconds * 1000;
        return { blocked: true, retryAfterSeconds: rule.lockSeconds };
      }
      existing.count += 1;
      return { blocked: false, retryAfterSeconds: 0 };
    },
    async recordFailure(keyHash, rule) {
      const now = Date.now();
      const existing = rows.get(keyHash);
      if (existing && existing.lockedUntil && existing.lockedUntil > now) {
        return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((existing.lockedUntil - now) / 1000)) };
      }
      if (!existing || (existing.lockedUntil && existing.lockedUntil <= now) || (existing.windowStartedAt + rule.windowSeconds * 1000 <= now)) {
        const lockedUntil = rule.maxAttempts <= 1 ? now + rule.lockSeconds * 1000 : null;
        rows.set(keyHash, { scope: rule.scope, count: 1, windowStartedAt: now, lockedUntil });
        return { blocked: Boolean(lockedUntil), retryAfterSeconds: lockedUntil ? rule.lockSeconds : 0 };
      }
      existing.count += 1;
      if (existing.count >= rule.maxAttempts) {
        existing.lockedUntil = now + rule.lockSeconds * 1000;
        return { blocked: true, retryAfterSeconds: rule.lockSeconds };
      }
      return { blocked: false, retryAfterSeconds: 0 };
    },
    async reset(keyHash) {
      rows.delete(keyHash);
    },
    async consumeDual(keyHash1, rule1, keyHash2, rule2) {
      const now = Date.now();
      const r1 = rows.get(keyHash1);
      const r2 = rows.get(keyHash2);

      const locked1 = Boolean(r1 && r1.lockedUntil && r1.lockedUntil > now);
      const locked2 = Boolean(r2 && r2.lockedUntil && r2.lockedUntil > now);
      const expired1 = !r1 || (r1.lockedUntil && r1.lockedUntil <= now) || (r1.windowStartedAt + rule1.windowSeconds * 1000 <= now);
      const expired2 = !r2 || (r2.lockedUntil && r2.lockedUntil <= now) || (r2.windowStartedAt + rule2.windowSeconds * 1000 <= now);

      const eff1 = expired1 ? 0 : r1.count;
      const eff2 = expired2 ? 0 : r2.count;
      const retry1 = locked1 ? Math.max(1, Math.ceil((r1.lockedUntil - now) / 1000)) : 0;
      const retry2 = locked2 ? Math.max(1, Math.ceil((r2.lockedUntil - now) / 1000)) : 0;

      if (locked1 || locked2) {
        return { blocked: true, retryAfterSeconds: Math.max(retry1, retry2) };
      }

      const block1 = eff1 >= rule1.maxAttempts;
      const block2 = eff2 >= rule2.maxAttempts;
      if (block1 || block2) {
        if (block1) {
          rows.set(keyHash1, {
            scope: rule1.scope,
            count: rule1.maxAttempts + 1,
            windowStartedAt: expired1 ? now : r1.windowStartedAt,
            lockedUntil: now + rule1.lockSeconds * 1000
          });
        }
        if (block2) {
          rows.set(keyHash2, {
            scope: rule2.scope,
            count: rule2.maxAttempts + 1,
            windowStartedAt: expired2 ? now : r2.windowStartedAt,
            lockedUntil: now + rule2.lockSeconds * 1000
          });
        }
        return {
          blocked: true,
          retryAfterSeconds: Math.max(block1 ? rule1.lockSeconds : 0, block2 ? rule2.lockSeconds : 0)
        };
      }

      rows.set(keyHash1, {
        scope: rule1.scope,
        count: eff1 + 1,
        windowStartedAt: expired1 ? now : r1.windowStartedAt,
        lockedUntil: null
      });
      rows.set(keyHash2, {
        scope: rule2.scope,
        count: eff2 + 1,
        windowStartedAt: expired2 ? now : r2.windowStartedAt,
        lockedUntil: null
      });
      return { blocked: false, retryAfterSeconds: 0 };
    },
    async acquireInflightSlot(keyHash, ttlSeconds = 10) {
      const now = Date.now();
      const existing = rows.get(keyHash);
      if (existing && existing.lockedUntil && existing.lockedUntil > now) {
        return false;
      }
      rows.set(keyHash, {
        scope: 'inflight_lock',
        count: 1,
        windowStartedAt: now,
        lockedUntil: now + ttlSeconds * 1000
      });
      return true;
    },
    async releaseInflightSlot(keyHash) {
      const existing = rows.get(keyHash);
      if (existing && existing.scope === 'inflight_lock') {
        rows.delete(keyHash);
      }
    }
  };
}

test('1. HMAC & IDENTIFIER NORMALIZATION: Zero plaintext PII stored and trusted IP extraction', () => {
  const h1 = computeRateLimitKeyHash('login_account', '  Admin_User ', TEST_HMAC_SECRET);
  const h2 = computeRateLimitKeyHash('login_account', 'admin_user', TEST_HMAC_SECRET);
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
  assert.equal(h1.includes('admin_user'), false);

  const p1 = computeRateLimitKeyHash('otp_send_phone', ' 038 585 2920 ', TEST_HMAC_SECRET);
  const p2 = computeRateLimitKeyHash('otp_send_phone', '0385852920', TEST_HMAC_SECRET);
  assert.equal(p1, p2);
  assert.equal(p1.includes('0385852920'), false);

  // Trusted Vercel IP vs spoofed headers
  assert.equal(
    extractTrustedClientIp({ headers: { 'x-vercel-forwarded-for': '203.0.113.10, 10.0.0.1' }, socket: {} }),
    '203.0.113.10'
  );
  assert.equal(
    extractTrustedClientIp({ headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} }),
    null // Untrusted x-forwarded-for without x-vercel-forwarded-for / x-real-ip fails closed
  );
});

test('2. LOGIN RATE LIMITING: 5 wrong passwords lock account (429), 20 IP limit blocks 21st, success resets', async () => {
  const store = createTestRateLimitStore();
  let upstreamCalls = 0;

  const sendLogin = async (username, password, ip = '203.0.113.50') => {
    const res = createMockResponse();
    await processLoginRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': ip },
      body: { username, password }
    }, res, {
      getMissingEnv: () => [],
      getRateLimitStore: () => store,
      rateLimitSecret: TEST_HMAC_SECRET,
      verifyUpstream: async ({ password: pw }) => {
        upstreamCalls += 1;
        if (pw === 'correct-pass') {
          return { success: true, user: { id: 'u1', username, name: 'User' } };
        }
        return { success: false, error: 'Wrong password' };
      },
      resolveRbac: async () => evaluateRbacRow(null),
      signJwt: (claims) => signIncidentSessionJwt(claims, TEST_JWT_SECRET)
    });
    await res.done;
    return res;
  };

  // 5 wrong attempts -> 401
  for (let i = 0; i < 5; i++) {
    const r = await sendLogin('target_user', 'wrong-pass');
    assert.equal(r.statusCode, 401);
  }
  assert.equal(upstreamCalls, 5);

  // 6th attempt -> 429 BEFORE calling upstream; IP counter must NOT increase while account is locked
  const ipKey = computeRateLimitKeyHash('login_ip', '203.0.113.50', TEST_HMAC_SECRET);
  const ipCountBeforeLockedAttempt = store.rows.get(ipKey).count;
  const lockedRes = await sendLogin('target_user', 'correct-pass');
  assert.equal(lockedRes.statusCode, 429);
  assert.ok(Number(lockedRes.headers['retry-after']) > 0);
  assert.equal(upstreamCalls, 5); // Upstream NOT called
  assert.equal(store.rows.get(ipKey).count, ipCountBeforeLockedAttempt);

  // Successful login on fresh account resets failure counter
  await sendLogin('user_reset', 'wrong-pass', '203.0.113.51');
  await sendLogin('user_reset', 'wrong-pass', '203.0.113.51');
  const okRes = await sendLogin('user_reset', 'correct-pass', '203.0.113.51');
  assert.equal(okRes.statusCode, 200);
  const resetKey = computeRateLimitKeyHash('login_account', 'user_reset', TEST_HMAC_SECRET);
  assert.equal(store.rows.has(resetKey), false);

  // 20 requests from single IP across distinct usernames -> 21st returns 429
  for (let i = 1; i <= 20; i++) {
    const r = await sendLogin(`user_${i}`, 'wrong-pass', '198.51.100.77');
    assert.equal(r.statusCode, 401);
  }
  const ipBlockedRes = await sendLogin('user_21', 'wrong-pass', '198.51.100.77');
  assert.equal(ipBlockedRes.statusCode, 429);
});

test('3. SEND OTP RATE LIMITING: 3 per phone, 10 per IP, concurrent burst & no partial IP increment when phone locked', async () => {
  const store = createTestRateLimitStore();
  let upstreamOtpSent = 0;

  const callSendOtp = async (phone, ip) => {
    const res = createMockResponse();
    await processSendOtpRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': ip },
      body: { phone }
    }, res, {
      getMissingEnv: () => [],
      getRateLimitStore: () => store,
      rateLimitSecret: TEST_HMAC_SECRET,
      sendOtp: async () => {
        upstreamOtpSent += 1;
        return { success: true, message: 'Sent' };
      }
    });
    await res.done;
    return res;
  };

  // Concurrent burst of 8 requests on same phone -> strictly 3 pass, 5 blocked with 429
  const burst = await Promise.all(
    Array.from({ length: 8 }, () => callSendOtp('0380001111', '203.0.113.10'))
  );
  const okCount = burst.filter((r) => r.statusCode === 200).length;
  const blockedCount = burst.filter((r) => r.statusCode === 429).length;
  assert.equal(okCount, PREVIEW_RATE_LIMITS.otp_send_phone.maxAttempts);
  assert.equal(blockedCount, 5);
  assert.equal(upstreamOtpSent, 3);

  // Calling same locked phone from a NEW IP must return 429 WITHOUT incrementing new IP
  const newIpRes = await callSendOtp('0380001111', '203.0.113.99');
  assert.equal(newIpRes.statusCode, 429);
  const newIpKey = computeRateLimitKeyHash('otp_send_ip', '203.0.113.99', TEST_HMAC_SECRET);
  assert.equal(store.rows.has(newIpKey), false);

  // 10 OTP sends from 1 IP across 10 different phones -> 11th returns 429
  for (let i = 0; i < 10; i++) {
    const r = await callSendOtp(`038000200${i}`, '198.51.100.88');
    assert.equal(r.statusCode, 200);
  }
  const ipOverflow = await callSendOtp('0380002099', '198.51.100.88');
  assert.equal(ipOverflow.statusCode, 429);
});

test('4. VERIFY OTP RATE LIMITING: 5 wrong per phone, 15 wrong per IP, fail-closed on missing IP', async () => {
  const store = createTestRateLimitStore();
  let upstreamVerifyCalls = 0;

  const callVerify = async (phone, otp, ip) => {
    const headers = { 'content-type': 'application/json' };
    if (ip) headers['x-vercel-forwarded-for'] = ip;
    const res = createMockResponse();
    await processVerifyOtpRequest({
      method: 'POST',
      headers,
      body: { phone, otp }
    }, res, {
      getMissingEnv: () => [],
      getRateLimitStore: () => store,
      rateLimitSecret: TEST_HMAC_SECRET,
      verifyOtp: async () => {
        upstreamVerifyCalls += 1;
        return { success: false, error: 'Invalid OTP' };
      },
      resolveRbac: async () => evaluateRbacRow(null),
      signJwt: (claims) => signIncidentSessionJwt(claims, TEST_JWT_SECRET)
    });
    await res.done;
    return res;
  };

  // Missing trusted IP fails closed (400)
  const missingIp = await callVerify('0380003333', '123456', null);
  assert.equal(missingIp.statusCode, 400);

  // 5 wrong OTPs lock phone
  for (let i = 0; i < 5; i++) {
    const r = await callVerify('0380003333', '000000', '203.0.113.20');
    assert.equal(r.statusCode, 401);
  }
  const blockedPhone = await callVerify('0380003333', '111111', '203.0.113.20');
  assert.equal(blockedPhone.statusCode, 429);
  assert.equal(upstreamVerifyCalls, 5);

  // 15 wrong OTPs across 3 phones from same IP -> 16th blocked by IP limit
  for (let i = 0; i < 15; i++) {
    const phone = `038000400${Math.floor(i / 4)}`;
    const r = await callVerify(phone, '000000', '198.51.100.55');
    assert.equal(r.statusCode, 401);
  }
  const blockedIp = await callVerify('0380004099', '000000', '198.51.100.55');
  assert.equal(blockedIp.statusCode, 429);
});

test('5. SECRET & ENV ISOLATION: RATE_LIMIT_HMAC_SECRET required, redacted, and never in src/', () => {
  const redacted = redactSensitive({
    rate_limit_hmac_secret: 'secret-value',
    phone: '0385852920'
  });
  assert.equal(redacted.rate_limit_hmac_secret, '[REDACTED]');
  assert.equal(redacted.phone, '[REDACTED]');

  const saved = process.env.RATE_LIMIT_HMAC_SECRET;
  delete process.env.RATE_LIMIT_HMAC_SECRET;
  assert.ok(getMissingEnvVars().includes('RATE_LIMIT_HMAC_SECRET'));
  if (saved !== undefined) process.env.RATE_LIMIT_HMAC_SECRET = saved;

  const srcRoot = path.resolve('src');
  const stack = [srcRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const c = fs.readFileSync(full, 'utf8');
        assert.equal(c.includes('RATE_LIMIT_HMAC_SECRET'), false);
      }
    }
  }
});

test('6. DUAL-KEY ATOMIC SEND-OTP: Zero partial increment on blocked IP or phone under concurrency', async () => {
  const store = createTestRateLimitStore();
  let upstreamSent = 0;

  const callSendOtp = async (phone, ip) => {
    const res = createMockResponse();
    await processSendOtpRequest({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-vercel-forwarded-for': ip
      },
      body: { phone }
    }, res, {
      getMissingEnv: () => [],
      getRateLimitStore: () => store,
      rateLimitSecret: TEST_HMAC_SECRET,
      sendOtp: async () => {
        upstreamSent += 1;
        return { success: true };
      }
    });
    await res.done;
    return res;
  };

  // Exhaust IP quota (10 sends to 10 distinct phones from IP 198.51.100.77)
  for (let i = 0; i < PREVIEW_RATE_LIMITS.otp_send_ip.maxAttempts; i++) {
    const r = await callSendOtp(`039000100${i}`, '198.51.100.77');
    assert.equal(r.statusCode, 200);
  }

  // Next request from blocked IP targeting a FRESH phone must return 429 and NOT increment that phone
  const freshPhoneRes = await callSendOtp('0399998888', '198.51.100.77');
  assert.equal(freshPhoneRes.statusCode, 429);
  const freshPhoneKey = computeRateLimitKeyHash('otp_send_phone', '0399998888', TEST_HMAC_SECRET);
  assert.equal(store.rows.has(freshPhoneKey), false);

  // Use 2/3 quota for phone 0397776666, then fire 10 concurrent requests from 10 distinct fresh IPs
  await callSendOtp('0397776666', '203.0.113.1');
  await callSendOtp('0397776666', '203.0.113.2');
  const concurrentResults = await Promise.all(
    Array.from({ length: 10 }, (_, idx) => callSendOtp('0397776666', `203.0.113.${50 + idx}`))
  );
  assert.equal(concurrentResults.filter((r) => r.statusCode === 200).length, 1);
  assert.equal(concurrentResults.filter((r) => r.statusCode === 429).length, 9);
  assert.equal(upstreamSent, 13);

  // Blocked requests must not have partially incremented the remaining 9 fresh IPs
  const incrementedFreshIps = Array.from({ length: 10 }, (_, idx) =>
    store.rows.has(computeRateLimitKeyHash('otp_send_ip', `203.0.113.${50 + idx}`, TEST_HMAC_SECRET))
  ).filter(Boolean).length;
  assert.equal(incrementedFreshIps, 1);
});

test('7. PARALLEL BURST SERIALIZATION: In-flight slot prevents parallel bypass on login & verify-otp without locking sequential users', async () => {
  const store = createTestRateLimitStore();
  let loginUpstreamCalls = 0;
  let verifyUpstreamCalls = 0;

  // A) 10 parallel wrong login requests while upstream takes 30ms
  const loginBurst = await Promise.all(
    Array.from({ length: 10 }, () => {
      const res = createMockResponse();
      return processLoginRequest({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-vercel-forwarded-for': '203.0.113.101'
        },
        body: { username: 'parallel.user', password: 'wrong-password' }
      }, res, {
        getMissingEnv: () => [],
        getRateLimitStore: () => store,
        rateLimitSecret: TEST_HMAC_SECRET,
        verifyUpstream: async () => {
          loginUpstreamCalls += 1;
          await new Promise((r) => setTimeout(r, 30));
          return { success: false, error: 'Invalid credentials' };
        },
        resolveRbac: async () => evaluateRbacRow(null),
        signJwt: (claims) => signIncidentSessionJwt(claims, TEST_JWT_SECRET)
      }).then(() => res.done).then(() => res);
    })
  );

  assert.equal(loginBurst.filter((r) => r.statusCode === 401).length, 1);
  assert.equal(loginBurst.filter((r) => r.statusCode === 429).length, 9);
  assert.equal(loginUpstreamCalls, 1);

  // Sequential valid login immediately after burst finishes must succeed (in-flight slot released)
  const validLoginRes = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vercel-forwarded-for': '203.0.113.101'
    },
    body: { username: 'parallel.user', password: 'correct-password' }
  }, validLoginRes, {
    getMissingEnv: () => [],
    getRateLimitStore: () => store,
    rateLimitSecret: TEST_HMAC_SECRET,
    verifyUpstream: async () => ({
      success: true,
      user: { id: 'u-parallel', username: 'parallel.user', email: 'p@ghn.vn', fullName: 'Parallel User', department: 'OPS' }
    }),
    resolveRbac: async () => evaluateRbacRow({
      username: 'parallel.user',
      role: 'ops_user',
      scope_type: 'region',
      region: 'ĐNB',
      province: '',
      is_active: true
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_JWT_SECRET)
  });
  await validLoginRes.done;
  assert.equal(validLoginRes.statusCode, 200);

  // B) 10 parallel wrong verify-otp requests while upstream takes 30ms
  const verifyBurst = await Promise.all(
    Array.from({ length: 10 }, () => {
      const res = createMockResponse();
      return processVerifyOtpRequest({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-vercel-forwarded-for': '203.0.113.102'
        },
        body: { phone: '0381234567', otp: '000000' }
      }, res, {
        getMissingEnv: () => [],
        getRateLimitStore: () => store,
        rateLimitSecret: TEST_HMAC_SECRET,
        verifyOtp: async () => {
          verifyUpstreamCalls += 1;
          await new Promise((r) => setTimeout(r, 30));
          return { success: false, error: 'Invalid OTP' };
        },
        resolveRbac: async () => evaluateRbacRow(null),
        signJwt: (claims) => signIncidentSessionJwt(claims, TEST_JWT_SECRET)
      }).then(() => res.done).then(() => res);
    })
  );

  assert.equal(verifyBurst.filter((r) => r.statusCode === 401).length, 1);
  assert.equal(verifyBurst.filter((r) => r.statusCode === 429).length, 9);
  assert.equal(verifyUpstreamCalls, 1);

  // Sequential valid OTP immediately after burst finishes must succeed (in-flight slot released)
  const validVerifyRes = createMockResponse();
  await processVerifyOtpRequest({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vercel-forwarded-for': '203.0.113.102'
    },
    body: { phone: '0381234567', otp: '654321' }
  }, validVerifyRes, {
    getMissingEnv: () => [],
    getRateLimitStore: () => store,
    rateLimitSecret: TEST_HMAC_SECRET,
    verifyOtp: async () => ({
      success: true,
      user: { id: 'u-otp', username: 'otp.user', email: 'otp@ghn.vn', fullName: 'OTP User', department: 'OPS' }
    }),
    resolveRbac: async () => evaluateRbacRow({
      username: 'otp.user',
      role: 'ops_user',
      scope_type: 'region',
      region: 'ĐNB',
      province: '',
      is_active: true
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_JWT_SECRET)
  });
  await validVerifyRes.done;
  assert.equal(validVerifyRes.statusCode, 200);
});

test('8. MIGRATION SQL STATIC CHECKS: Dual-key RPC, FOR UPDATE SKIP LOCKED cleanup, and inflight lease permissions', () => {
  const sql = fs.readFileSync(path.resolve('supabase/migrations/002_auth_rate_limits.sql'), 'utf8');
  assert.match(sql, /'inflight_lock'/);
  assert.match(sql, /ORDER BY expires_at ASC\s+LIMIT 100\s+FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.consume_dual_auth_rate_limit\(/);
  assert.match(sql, /pg_advisory_xact_lock\(hashtext\(p_key_hash_1\)\)/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.acquire_auth_inflight_slot\(/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.release_auth_inflight_slot\(/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.consume_dual_auth_rate_limit\([^)]+\) FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.consume_dual_auth_rate_limit\([^)]+\) TO service_role;/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.acquire_auth_inflight_slot\(TEXT, INTEGER\) FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.acquire_auth_inflight_slot\(TEXT, INTEGER\) TO service_role;/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.release_auth_inflight_slot\(TEXT\) FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.release_auth_inflight_slot\(TEXT\) TO service_role;/);
});
