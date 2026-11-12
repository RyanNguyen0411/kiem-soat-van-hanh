/**
 * Server-side Environment & Safe Log Redaction Helpers.
 * NEVER import any file from api/_lib/ into src/ (frontend bundle).
 */

export interface AuthBrokerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  authJwtSecret: string;
  authUpstreamWebhookUrl: string;
  upstreamAuthSecret?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'otp',
  'token',
  'secret',
  'serversecret',
  'authorization',
  'service_role',
  'supabase_service_role_key',
  'auth_jwt_secret',
  'upstream_auth_secret'
]);

export function readRequiredServerEnv(name: string): string {
  const raw = process.env[name];
  if (!raw || !raw.trim()) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return raw.trim();
}

export function getAuthBrokerEnv(): AuthBrokerEnv {
  const supabaseUrl = readRequiredServerEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = readRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  const authJwtSecret = readRequiredServerEnv('AUTH_JWT_SECRET');
  const authUpstreamWebhookUrl = readRequiredServerEnv('AUTH_UPSTREAM_WEBHOOK_URL');
  const upstreamAuthSecret = process.env.UPSTREAM_AUTH_SECRET?.trim() || undefined;

  if (authJwtSecret.length < 32) {
    throw new Error('AUTH_JWT_SECRET must be at least 32 characters long');
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    authJwtSecret,
    authUpstreamWebhookUrl,
    upstreamAuthSecret
  };
}

export function getMissingEnvVars(): string[] {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'AUTH_JWT_SECRET',
    'AUTH_UPSTREAM_WEBHOOK_URL'
  ];
  return required.filter((k) => !process.env[k] || !process.env[k]!.trim());
}

/**
 * Redact passwords, OTPs, tokens, and secrets before writing logs.
 */
export function redactSensitive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.startsWith('Bearer ')) return 'Bearer [REDACTED]';
    if (value.startsWith('ghn_tk_')) return 'ghn_tk_[REDACTED]';
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) return '[JWT_REDACTED]';
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitive(v);
      }
    }
    return out;
  }
  return value;
}
