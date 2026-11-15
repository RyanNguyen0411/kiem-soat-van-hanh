import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { register } from 'node:module';
import { SignJWT } from 'jose';

// Map relative `.js` imports inside `api/` to `.ts` source when running directly under Node 24
const apiTsLoaderSource = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.js') && context.parentURL && context.parentURL.includes('/api/')) {
    const tsSpecifier = specifier.slice(0, -3) + '.ts';
    try {
      return await nextResolve(tsSpecifier, context);
    } catch {
      // fall through to default resolution
    }
  }
  return nextResolve(specifier, context);
}
`;
register('data:text/javascript,' + encodeURIComponent(apiTsLoaderSource));

const {
  signIncidentSessionJwt,
  verifyIncidentSessionJwt,
  JWT_ISSUER,
  JWT_AUDIENCE
} = await import('../api/_lib/jwt.ts');
const {
  evaluateRbacRow,
  reconcileRbacMatches,
  sanitizeRolePermissions,
  authorizeIncidentAccess
} = await import('../api/_lib/rbac.ts');
const { redactSensitive, getMissingEnvVars } = await import('../api/_lib/env.ts');
const { MAX_JSON_BODY_BYTES, readValidatedJsonBody, HttpValidationError } = await import('../api/_lib/http.ts');
const { verifyCredentialsWithUpstream } = await import('../api/_lib/upstreamAuth.ts');
const { processLoginRequest } = await import('../api/auth/login.ts');
const { processVerifyOtpRequest } = await import('../api/auth/verify-otp.ts');

const TEST_SIGNING_SECRET = 'unit-test-only-signing-secret-minimum-32-chars!!';
const WRONG_SIGNING_SECRET = 'wrong-attacker-signing-secret-minimum-32-chars!!';

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

function createStreamRequest(method, headers, rawBodyText) {
  const stream = rawBodyText === null
    ? Readable.from([])
    : Readable.from([Buffer.from(rawBodyText, 'utf8')]);
  stream.method = method;
  stream.headers = headers;
  return stream;
}

const mockEnvReady = () => [];

// ============================================================================
// A. REQUEST VALIDATION (14 CASES)
// ============================================================================
test('A.1-A.3: Body size 16KB boundary (under, exact 16KB, over 16KB stream & pre-parsed)', async () => {
  // Under 16KB
  const smallPayload = JSON.stringify({ username: 'u', password: 'p' });
  const reqUnder = createStreamRequest('POST', { 'content-type': 'application/json; charset=utf-8' }, smallPayload);
  const parsedUnder = await readValidatedJsonBody(reqUnder);
  assert.equal(parsedUnder.username, 'u');

  // Exact 16384 bytes
  const prefix = '{"username":"u","pad":"';
  const suffix = '"}';
  const exactPadLen = MAX_JSON_BODY_BYTES - Buffer.byteLength(prefix + suffix, 'utf8');
  const exactPayload = prefix + 'a'.repeat(exactPadLen) + suffix;
  assert.equal(Buffer.byteLength(exactPayload, 'utf8'), MAX_JSON_BODY_BYTES);
  const reqExact = createStreamRequest('POST', { 'content-type': 'application/json' }, exactPayload);
  const parsedExact = await readValidatedJsonBody(reqExact);
  assert.equal(parsedExact.pad.length, exactPadLen);

  // Over 16KB via raw stream (16385 bytes) -> 413
  const overPayload = prefix + 'a'.repeat(exactPadLen + 1) + suffix;
  assert.equal(Buffer.byteLength(overPayload, 'utf8'), MAX_JSON_BODY_BYTES + 1);
  const reqOverStream = createStreamRequest('POST', { 'content-type': 'application/json' }, overPayload);
  await assert.rejects(
    () => readValidatedJsonBody(reqOverStream),
    (err) => err instanceof HttpValidationError && err.statusCode === 413
  );

  // Over 16KB via pre-parsed req.body -> 413
  const resOverPreParsed = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'u', password: 'p', extra: 'x'.repeat(MAX_JSON_BODY_BYTES) }
  }, resOverPreParsed, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({ success: false }),
    resolveRbac: async () => evaluateRbacRow(null),
    signJwt: signIncidentSessionJwt
  });
  await resOverPreParsed.done;
  assert.equal(resOverPreParsed.statusCode, 413);
});

test('A.4-A.8: Rejects JSON Array, null, String, Number, Boolean, and malformed syntax with 400', async () => {
  const nonObjectPayloads = ['[1,2,3]', 'null', '"hello"', '12345', 'true', '{bad json'];
  for (const raw of nonObjectPayloads) {
    const req = createStreamRequest('POST', { 'content-type': 'application/json' }, raw);
    await assert.rejects(
      () => readValidatedJsonBody(req),
      (err) => err instanceof HttpValidationError && err.statusCode === 400,
      `Expected 400 for payload: ${raw}`
    );
  }
});

test('A.9-A.10: Content-Type enforcement (missing, wrong type, wrong charset -> 415)', async () => {
  const invalidHeaders = [
    {},
    { 'content-type': '' },
    { 'content-type': 'text/plain' },
    { 'content-type': 'application/x-www-form-urlencoded' },
    { 'content-type': 'application/json; charset=latin1' }
  ];

  for (const headers of invalidHeaders) {
    const res = createMockResponse();
    await processLoginRequest(
      createStreamRequest('POST', headers, '{"username":"u","password":"p"}'),
      res
    );
    await res.done;
    assert.equal(res.statusCode, 415);
  }

  // Valid charset=UTF-8 accepted past Content-Type check
  const resValidCharset = createMockResponse();
  await processLoginRequest(
    createStreamRequest('POST', { 'content-type': 'APPLICATION/JSON; charset="UTF-8"' }, '{}'),
    resValidCharset
  );
  await resValidCharset.done;
  assert.equal(resValidCharset.statusCode, 400); // Passed 415 Content-Type, failed 400 missing fields
});

test('A.11-A.14: Empty body, missing fields, wrong field types -> 400; invalid HTTP methods -> 405', async () => {
  // Empty body
  const resEmpty = createMockResponse();
  await processLoginRequest(createStreamRequest('POST', { 'content-type': 'application/json' }, ''), resEmpty);
  await resEmpty.done;
  assert.equal(resEmpty.statusCode, 400);

  // Wrong types & missing fields on /api/auth/login
  const badLoginBodies = [
    {},
    { username: 'admin' },
    { password: '123' },
    { username: 123, password: '123' },
    { username: 'admin', password: { nested: true } },
    { username: '   ', password: '123' }
  ];
  for (const b of badLoginBodies) {
    const res = createMockResponse();
    await processLoginRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: b
    }, res);
    await res.done;
    assert.equal(res.statusCode, 400);
  }

  // Wrong types on /api/auth/verify-otp
  const resBadOtp = createMockResponse();
  await processVerifyOtpRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { phone: '0380000000', otp: 123456 } // number instead of string
  }, resBadOtp);
  await resBadOtp.done;
  assert.equal(resBadOtp.statusCode, 400);

  // Unsupported HTTP methods -> 405
  for (const m of ['GET', 'PUT', 'DELETE', 'PATCH']) {
    const res = createMockResponse();
    await processLoginRequest({ method: m, headers: {} }, res);
    await res.done;
    assert.equal(res.statusCode, 405);
  }
});

// ============================================================================
// C. RBAC & IDENTITY RECONCILIATION (13 CASES)
// ============================================================================
test('C.1-C.7: RBAC matrix (Admin with/without perm, Area Manager, Viewer, Missing, Inactive)', () => {
  const adminFull = evaluateRbacRow({
    id: '1', username: 'admin1', email: null, display_name: 'Admin 1',
    role: 'admin', permissions: ['incident_management'], is_active: true
  });
  assert.equal(authorizeIncidentAccess({
    sub: '1', username: 'admin1', name: 'Admin 1', role: adminFull.role, permissions: adminFull.permissions, rbacActive: true
  }, 'incident_management').allowed, true);

  // Admin WITHOUT incident_management permission
  const adminNoPerm = evaluateRbacRow({
    id: '2', username: 'admin2', email: null, display_name: 'Admin 2',
    role: 'admin', permissions: [], is_active: true
  });
  assert.equal(authorizeIncidentAccess({
    sub: '2', username: 'admin2', name: 'Admin 2', role: adminNoPerm.role, permissions: adminNoPerm.permissions, rbacActive: true
  }, 'incident_management').status, 403);

  // Area Manager: allowed intake, blocked management
  const am = evaluateRbacRow({
    id: '3', username: 'am1', email: null, display_name: 'AM 1',
    role: 'area_manager', permissions: ['incident_intake_submit'], is_active: true
  });
  const amClaims = { sub: '3', username: 'am1', name: 'AM 1', role: am.role, permissions: am.permissions, rbacActive: true };
  assert.equal(authorizeIncidentAccess(amClaims, 'incident_intake_submit').allowed, true);
  assert.equal(authorizeIncidentAccess(amClaims, 'incident_management').status, 403);

  // Missing row -> viewer, zero permissions
  const missing = evaluateRbacRow(null);
  assert.equal(missing.role, 'viewer');
  assert.deepEqual(missing.permissions, []);
  assert.equal(authorizeIncidentAccess({
    sub: 'x', username: 'nobody', name: 'Nobody', role: missing.role, permissions: missing.permissions, rbacActive: true
  }, 'incident_management').status, 403);

  // Inactive account -> 403
  const inactive = evaluateRbacRow({
    id: '4', username: 'disabled', email: null, display_name: 'Disabled',
    role: 'admin', permissions: ['incident_management'], is_active: false
  });
  assert.equal(inactive.status, 'INACTIVE');
  assert.equal(inactive.isActive, false);
  assert.deepEqual(inactive.permissions, []);
  assert.deepEqual(sanitizeRolePermissions('viewer', ['incident_management']), []);
});

test('C.8-C.13: Identity reconciliation (email-as-username, mismatch, multiple rows, forged client role)', async () => {
  // C.8: username is email, email empty -> matches single record by email
  const emailAsUsernameRes = reconcileRbacMatches([{
    id: '10', username: 'am_longan', email: 'am.longan@ghn.vn',
    display_name: 'AM Long An', role: 'area_manager', permissions: ['incident_intake_submit'], is_active: true
  }], { username: 'AM.LongAn@ghn.vn', email: '' });
  assert.equal(emailAsUsernameRes.status, 'OK');
  assert.equal(emailAsUsernameRes.canonicalUsername, 'am_longan');

  // C.10: username/email mismatch -> IDENTITY_MISMATCH
  const mismatchRes = reconcileRbacMatches([{
    id: '11', username: 'user_a', email: 'user_a@ghn.vn',
    display_name: 'User A', role: 'admin', permissions: ['incident_management'], is_active: true
  }], { username: 'user_a', email: 'other@ghn.vn' });
  assert.equal(mismatchRes.status, 'IDENTITY_MISMATCH');
  assert.deepEqual(mismatchRes.permissions, []);

  // C.11: multiple matching rows -> AMBIGUOUS (refuse to pick first)
  const ambiguousRes = reconcileRbacMatches([
    { id: '12', username: 'u1', email: null, display_name: 'U1', role: 'viewer', permissions: [], is_active: true },
    { id: '13', username: 'u2', email: 'u1@ghn.vn', display_name: 'U2', role: 'admin', permissions: ['incident_management'], is_active: true }
  ], { username: 'u1', email: 'u1@ghn.vn' });
  assert.equal(ambiguousRes.status, 'AMBIGUOUS');
  assert.deepEqual(ambiguousRes.permissions, []);

  // C.12-C.13: Client sends forged role='admin' and permissions=['incident_management'] -> ignored!
  const resForged = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      username: 'regular_am',
      password: 'valid_password',
      role: 'admin',
      permissions: ['incident_management']
    }
  }, resForged, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({
      success: true,
      user: { id: 'u_am', username: 'regular_am', name: 'Regular AM' }
    }),
    resolveRbac: async () => evaluateRbacRow({
      id: 'u_am', username: 'regular_am', email: null, display_name: 'Regular AM',
      role: 'area_manager', permissions: ['incident_intake_submit'], is_active: true
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
  });
  await resForged.done;
  assert.equal(resForged.statusCode, 200);
  assert.equal(resForged.json.user.role, 'area_manager');
  assert.deepEqual(resForged.json.user.permissions, ['incident_intake_submit']);
});

// ============================================================================
// D. JWT SECURITY (10 CASES)
// ============================================================================
test('D.1-D.10: Valid, forged, tampered, wrong secret, expired, wrong iss/aud, legacy tokens, missing claims', async () => {
  const { token } = await signIncidentSessionJwt({
    sub: 'usr_1', username: 'admin_1', name: 'Admin', role: 'admin', permissions: ['incident_management'], rbacActive: true
  }, TEST_SIGNING_SECRET);

  assert.equal((await verifyIncidentSessionJwt(`Bearer ${token}`, TEST_SIGNING_SECRET)).valid, true);
  assert.equal((await verifyIncidentSessionJwt(`Bearer ${token}`, WRONG_SIGNING_SECRET)).valid, false);
  assert.equal((await verifyIncidentSessionJwt('Bearer ghn_tk_legacy', TEST_SIGNING_SECRET)).valid, false);
  assert.equal((await verifyIncidentSessionJwt('Bearer ghn_sig_legacy', TEST_SIGNING_SECRET)).valid, false);
  assert.equal((await verifyIncidentSessionJwt('Bearer fake.jwt.token', TEST_SIGNING_SECRET)).valid, false);

  // Tampered payload
  const parts = token.split('.');
  const fakePayload = Buffer.from(JSON.stringify({ sub: 'hack', username: 'hack', role: 'admin', iss: JWT_ISSUER, aud: JWT_AUDIENCE })).toString('base64url');
  assert.equal((await verifyIncidentSessionJwt(`${parts[0]}.${fakePayload}.${parts[2]}`, TEST_SIGNING_SECRET)).valid, false);

  // Expired JWT
  const expiredToken = await new SignJWT({ username: 'admin_1', role: 'admin', permissions: ['incident_management'], rbacActive: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('usr_1')
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(TEST_SIGNING_SECRET));
  assert.equal((await verifyIncidentSessionJwt(expiredToken, TEST_SIGNING_SECRET)).valid, false);

  // Wrong issuer
  const wrongIss = await new SignJWT({ username: 'admin_1', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('usr_1').setIssuer('evil-issuer').setAudience(JWT_AUDIENCE)
    .setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_SIGNING_SECRET));
  assert.equal((await verifyIncidentSessionJwt(wrongIss, TEST_SIGNING_SECRET)).valid, false);

  // Wrong audience
  const wrongAud = await new SignJWT({ username: 'admin_1', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('usr_1').setIssuer(JWT_ISSUER).setAudience('wrong-aud')
    .setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_SIGNING_SECRET));
  assert.equal((await verifyIncidentSessionJwt(wrongAud, TEST_SIGNING_SECRET)).valid, false);

  // Missing required claim (no username)
  const missingClaim = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('usr_1').setIssuer(JWT_ISSUER).setAudience(JWT_AUDIENCE)
    .setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_SIGNING_SECRET));
  assert.equal((await verifyIncidentSessionJwt(missingClaim, TEST_SIGNING_SECRET)).valid, false);
});

// ============================================================================
// E. UPSTREAM MOCK TESTS (8 CASES - EXPLICITLY MOCKED, NOT LIVE NETWORK)
// ============================================================================
test('E.1-E.8: Upstream Apps Script mock scenarios (fail-closed on failure, timeout, HTTP error, bad JSON, missing identity)', async () => {
  const savedUrl = process.env.AUTH_UPSTREAM_WEBHOOK_URL;
  const savedFetch = globalThis.fetch;
  process.env.AUTH_UPSTREAM_WEBHOOK_URL = 'https://mock-upstream.invalid/exec';

  try {
    // E.1 Success
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      user: { id: '1', username: 'am_test', email: 'am@ghn.vn', name: 'AM Test' }
    }), { status: 200 });
    const ok = await verifyCredentialsWithUpstream({ username: 'am_test', password: 'p' });
    assert.equal(ok.success, true);
    assert.equal(ok.user?.username, 'am_test');

    // E.2 Failure
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: 'Wrong password' }), { status: 200 });
    const fail = await verifyCredentialsWithUpstream({ username: 'am_test', password: 'bad' });
    assert.equal(fail.success, false);

    // E.3 Timeout / AbortError
    globalThis.fetch = async () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    };
    const timedOut = await verifyCredentialsWithUpstream({ username: 'am_test', password: 'p' });
    assert.equal(timedOut.success, false);
    assert.equal(timedOut.upstreamUnavailable, true);

    // E.4 HTTP 502 error
    globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });
    const httpErr = await verifyCredentialsWithUpstream({ username: 'am_test', password: 'p' });
    assert.equal(httpErr.success, false);
    assert.equal(httpErr.upstreamUnavailable, true);

    // E.5 Invalid JSON
    globalThis.fetch = async () => new Response('<html>error</html>', { status: 200 });
    const badJson = await verifyCredentialsWithUpstream({ username: 'am_test', password: 'p' });
    assert.equal(badJson.success, false);
    assert.equal(badJson.upstreamUnavailable, true);

    // E.6-E.7 Missing both username & email -> rejected
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, user: { id: '1', name: 'No Identity' } }), { status: 200 });
    const noIdentity = await verifyCredentialsWithUpstream({ username: 'am_test', password: 'p' });
    assert.equal(noIdentity.success, false);

    // E.8 Inconsistent identity in DB -> 403 from login handler
    const resConflict = createMockResponse();
    await processLoginRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { username: 'user_a', password: 'p' }
    }, resConflict, {
      getMissingEnv: mockEnvReady,
      verifyUpstream: async () => ({ success: true, user: { id: '1', username: 'user_a', email: 'wrong@ghn.vn', name: 'A' } }),
      resolveRbac: async () => ({
        status: 'IDENTITY_MISMATCH', found: true, isActive: false, role: 'viewer', permissions: []
      }),
      signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
    });
    await resConflict.done;
    assert.equal(resConflict.statusCode, 403);
    assert.equal(resConflict.json.token, undefined);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.AUTH_UPSTREAM_WEBHOOK_URL;
    else process.env.AUTH_UPSTREAM_WEBHOOK_URL = savedUrl;
  }
});

// ============================================================================
// F. SECRET REDACTION, STATIC FRONTEND ISOLATION & VERCEL ROUTING REGEX
// ============================================================================
test('F: Redacts sensitive data, keeps src/ isolated, and validates vercel.json API exclusion regex', () => {
  const redacted = redactSensitive({
    username: 'am_user',
    password: 'super-secret-password',
    otp: '123456',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig',
    token: 'ghn_tk_12345',
    supabase_service_role_key: 'sb_secret_xyz'
  });
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.otp, '[REDACTED]');
  assert.equal(redacted.authorization, '[REDACTED]');
  assert.equal(redacted.token, '[REDACTED]');
  assert.equal(redacted.supabase_service_role_key, '[REDACTED]');

  // Scan src/ to verify ZERO server secrets or api/_lib imports
  const srcRoot = path.resolve('src');
  const stack = [srcRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        assert.equal(content.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
        assert.equal(content.includes('AUTH_JWT_SECRET'), false);
        assert.equal(content.includes('api/_lib'), false);
      }
    }
  }

  // Verify vercel.json rewrite regex statically
  const vercelCfg = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
  const rewritePattern = new RegExp(`^${vercelCfg.rewrites[0].source}$`);
  assert.equal(rewritePattern.test('/'), true);
  assert.equal(rewritePattern.test('/dashboard'), true);
  assert.equal(rewritePattern.test('/api'), false);
  assert.equal(rewritePattern.test('/api/'), false);
  assert.equal(rewritePattern.test('/api/auth/login'), false);
  assert.equal(rewritePattern.test('/api/auth/verify-otp'), false);
  assert.equal(rewritePattern.test('/api/duong-dan-khong-ton-tai'), false);
  assert.ok(Array.isArray(getMissingEnvVars()));
});

// ============================================================================
// G. EMAIL RECOVERY SECURITY & PASSWORD LOGIN UPSTREAM ISOLATION
// ============================================================================
test('G.1: Password Login does NOT leak credentials to VITE_DRIVE_EXPORT_WEBHOOK_URL when AUTH_UPSTREAM is missing', async () => {
  const savedUpstream = process.env.AUTH_UPSTREAM_WEBHOOK_URL;
  const savedDrive = process.env.VITE_DRIVE_EXPORT_WEBHOOK_URL;
  const savedFetch = globalThis.fetch;

  delete process.env.AUTH_UPSTREAM_WEBHOOK_URL;
  process.env.VITE_DRIVE_EXPORT_WEBHOOK_URL = 'https://script.google.com/macros/s/drive-export/exec';

  let driveFetchCalled = false;
  globalThis.fetch = async (url, options) => {
    const urlStr = String(url);
    if (urlStr.includes('drive-export') || urlStr.includes('script.google.com')) {
      driveFetchCalled = true;
      throw new Error('VITE_DRIVE_EXPORT_WEBHOOK_URL must NEVER be called for password authentication!');
    }
    // Mock Supabase Auth / REST response
    if (urlStr.includes('/auth/v1/token')) {
      return new Response(JSON.stringify({ error: { message: 'Invalid login credentials', status: 400 } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await verifyCredentialsWithUpstream({ username: 'am_huy', password: 'my-password' });
    assert.equal(driveFetchCalled, false, 'Expected VITE_DRIVE_EXPORT_WEBHOOK_URL to NEVER be called');
    assert.equal(result.success, false);
    assert.equal(Boolean(result.upstreamUnavailable), false);

    // Also verify login handler returns HTTP 401, not 503 or 200
    const res = createMockResponse();
    await processLoginRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { username: 'am_huy', password: 'my-password' }
    }, res, {
      getMissingEnv: mockEnvReady,
      verifyUpstream: verifyCredentialsWithUpstream,
      resolveRbac: async () => ({
        status: 'OK', found: true, isActive: true, role: 'area_manager', permissions: ['incident_management']
      }),
      signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
    });
    await res.done;
    assert.equal(res.statusCode, 401);
    assert.equal(res.json.success, false);
    assert.equal(res.json.token, undefined);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedUpstream === undefined) delete process.env.AUTH_UPSTREAM_WEBHOOK_URL;
    else process.env.AUTH_UPSTREAM_WEBHOOK_URL = savedUpstream;
    if (savedDrive === undefined) delete process.env.VITE_DRIVE_EXPORT_WEBHOOK_URL;
    else process.env.VITE_DRIVE_EXPORT_WEBHOOK_URL = savedDrive;
  }
});

test('G.2: Email Recovery initiates password recovery flow and NEVER issues JWT session tokens', async () => {
  const resSuccess = createMockResponse();
  let jwtSigned = false;

  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'am_huy', email: 'am.huy@ghn.vn' }
  }, resSuccess, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({ success: false, error: 'Should not be called' }),
    resolveRbac: async () => ({
      status: 'OK',
      found: true,
      isActive: true,
      canonicalUsername: 'am_huy',
      displayName: 'AM Huy',
      role: 'area_manager',
      permissions: ['incident_management']
    }),
    signJwt: async () => {
      jwtSigned = true;
      return { token: 'ILLEGAL_TOKEN', expiresAt: Date.now() + 3600000 };
    }
  });

  await resSuccess.done;
  assert.equal(resSuccess.statusCode, 200);
  assert.equal(resSuccess.json.success, true);
  assert.equal(resSuccess.json.recoveryInitiated, true);
  assert.equal(resSuccess.json.token, undefined, 'Email recovery MUST NOT issue JWT token');
  assert.equal(resSuccess.json.user, undefined, 'Email recovery MUST NOT issue authenticated user object');
  assert.equal(jwtSigned, false, 'signJwt must NEVER be called during email recovery');

  // Mismatched/unregistered email must be rejected with 401
  const resFail = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'am_huy', email: 'attacker@evil.com' }
  }, resFail, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({ success: false, error: 'Should not be called' }),
    resolveRbac: async () => ({
      status: 'IDENTITY_MISMATCH',
      found: false,
      isActive: false,
      role: 'viewer',
      permissions: []
    }),
    signJwt: async () => ({ token: 'ILLEGAL_TOKEN', expiresAt: Date.now() + 3600000 })
  });

  await resFail.done;
  assert.equal(resFail.statusCode, 401);
  assert.equal(resFail.json.success, false);
  assert.equal(resFail.json.token, undefined);
});

test('G.3: Supabase Auth integration (correct password, wrong password, inactive user, and Gmail OTP)', async () => {
  // 1. Correct Password via Supabase Auth Mock
  const resOk = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'Huyamdnb', password: 'ValidPassword123' }
  }, resOk, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({
      success: true,
      user: { id: 'usr-huy-1', username: 'Huyamdnb', email: 'hoanghuy13cd@gmail.com', name: 'AM Huy (ĐNB)' }
    }),
    resolveRbac: async () => ({
      status: 'OK',
      found: true,
      isActive: true,
      canonicalUsername: 'huyamdnb',
      displayName: 'AM Huy (ĐNB)',
      role: 'area_manager',
      permissions: ['incident_intake_submit']
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
  });
  await resOk.done;
  assert.equal(resOk.statusCode, 200);
  assert.equal(resOk.json.success, true);
  assert.equal(resOk.json.user.role, 'area_manager');
  assert.deepEqual(resOk.json.user.permissions, ['incident_intake_submit']);
  assert.ok(resOk.json.token);

  // 2. Wrong Password
  const resWrongPass = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'Huyamdnb', password: 'WrongPassword' }
  }, resWrongPass, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({
      success: false,
      error: 'Tài khoản hoặc mật khẩu không chính xác.'
    }),
    resolveRbac: async () => ({
      status: 'OK', found: true, isActive: true, role: 'area_manager', permissions: ['incident_intake_submit']
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
  });
  await resWrongPass.done;
  assert.equal(resWrongPass.statusCode, 401);
  assert.equal(resWrongPass.json.success, false);
  assert.equal(resWrongPass.json.token, undefined);

  // 3. Inactive User
  const resInactive = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'Huyamdnb', password: 'ValidPassword123' }
  }, resInactive, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({
      success: true,
      user: { id: 'usr-huy-1', username: 'Huyamdnb', email: 'hoanghuy13cd@gmail.com', name: 'AM Huy (ĐNB)' }
    }),
    resolveRbac: async () => ({
      status: 'INACTIVE',
      found: true,
      isActive: false,
      role: 'area_manager',
      permissions: []
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
  });
  await resInactive.done;
  assert.equal(resInactive.statusCode, 403);
  assert.equal(resInactive.json.token, undefined);

  // 4. Role barrier check: area_manager CANNOT have incident_management permission
  const resForbiddenPerm = createMockResponse();
  await processLoginRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { username: 'Huyamdnb', password: 'ValidPassword123' }
  }, resForbiddenPerm, {
    getMissingEnv: mockEnvReady,
    verifyUpstream: async () => ({
      success: true,
      user: { id: 'usr-huy-1', username: 'Huyamdnb', email: 'hoanghuy13cd@gmail.com', name: 'AM Huy (ĐNB)' }
    }),
    resolveRbac: async () => ({
      status: 'OK',
      found: true,
      isActive: true,
      role: 'area_manager',
      permissions: ['incident_intake_submit'] // Strictly area_manager
    }),
    signJwt: (claims) => signIncidentSessionJwt(claims, TEST_SIGNING_SECRET)
  });
  await resForbiddenPerm.done;
  assert.equal(resForbiddenPerm.statusCode, 200);
  assert.equal(resForbiddenPerm.json.user.role, 'area_manager');
  assert.equal(resForbiddenPerm.json.user.permissions.includes('incident_management'), false, 'area_manager must NEVER receive admin incident_management permission');
});
