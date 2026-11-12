import { SignJWT, jwtVerify } from 'jose';
import { readRequiredServerEnv } from './env.js';

export type RbacRole = 'admin' | 'area_manager' | 'viewer';
export type IncidentPermission = 'incident_management' | 'incident_intake_submit';

export interface IncidentJwtClaims {
  sub: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: RbacRole;
  permissions: IncidentPermission[];
  rbacActive: boolean;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}

export const JWT_ISSUER = 'ghn-executive-bi-auth-broker';
export const JWT_AUDIENCE = 'ghn-incident-center';
export const JWT_TTL_SECONDS = 8 * 60 * 60; // 8 hours (aligned with SESSION_TTL_MS)

function getSecretKey(secretOverride?: string): Uint8Array {
  const secret = (secretOverride ?? readRequiredServerEnv('AUTH_JWT_SECRET')).trim();
  if (secret.length < 32) {
    throw new Error('AUTH_JWT_SECRET must be at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Issue a signed HS256 JWT for verified users.
 */
export async function signIncidentSessionJwt(
  claims: Omit<IncidentJwtClaims, 'iss' | 'aud' | 'iat' | 'exp'>,
  secretOverride?: string
): Promise<{ token: string; expiresAt: number }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + JWT_TTL_SECONDS;
  const key = getSecretKey(secretOverride);

  const token = await new SignJWT({
    username: claims.username,
    name: claims.name,
    email: claims.email,
    phone: claims.phone,
    role: claims.role,
    permissions: claims.permissions,
    rbacActive: claims.rbacActive
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(nowSec)
    .setExpirationTime(expSec)
    .sign(key);

  return { token, expiresAt: expSec * 1000 };
}

export interface JwtVerifyResult {
  valid: boolean;
  claims?: IncidentJwtClaims;
  error?: string;
}

/**
 * Strictly verify Bearer JWT.
 * Explicitly rejects legacy `ghn_tk_*` client tokens, fallback tokens, and malformed/forged JWTs.
 */
export async function verifyIncidentSessionJwt(
  authHeaderOrToken: string | undefined,
  secretOverride?: string
): Promise<JwtVerifyResult> {
  if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') {
    return { valid: false, error: 'Missing Authorization token' };
  }

  const trimmed = authHeaderOrToken.trim();
  const token = trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed;

  if (!token) {
    return { valid: false, error: 'Empty Authorization token' };
  }

  // Explicitly reject legacy client-generated tokens
  if (token.startsWith('ghn_tk_') || token.startsWith('ghn_sig_')) {
    return { valid: false, error: 'Legacy client-side token (ghn_tk_*) is not accepted for protected APIs' };
  }

  // Basic structural guard: JWT must have 3 dot-separated base64url segments
  if (token.split('.').length !== 3) {
    return { valid: false, error: 'Malformed token format' };
  }

  try {
    const key = getSecretKey(secretOverride);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    if (
      typeof payload.sub !== 'string' || !payload.sub.trim() ||
      typeof payload.username !== 'string' || !payload.username.trim() ||
      typeof payload.role !== 'string' || !['admin', 'area_manager', 'viewer'].includes(payload.role) ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return { valid: false, error: 'JWT missing required identity or lifecycle claims' };
    }

    const permissions = Array.isArray(payload.permissions)
      ? (payload.permissions.filter((p): p is IncidentPermission =>
          p === 'incident_management' || p === 'incident_intake_submit'
        ))
      : [];

    return {
      valid: true,
      claims: {
        ...payload,
        sub: payload.sub,
        username: payload.username,
        name: typeof payload.name === 'string' ? payload.name : payload.username,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        phone: typeof payload.phone === 'string' ? payload.phone : undefined,
        role: payload.role as RbacRole,
        permissions,
        rbacActive: payload.rbacActive === true
      }
    };
  } catch {
    return { valid: false, error: 'Invalid or expired JWT signature' };
  }
}
