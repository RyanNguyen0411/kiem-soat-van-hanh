/**
 * Server-side Environment & Safe Log Redaction Helpers.
 * NEVER import any file from api/_lib/ into src/ (frontend bundle).
 */

import fs from 'node:fs';
import path from 'node:path';

let localEnvLoaded = false;

/**
 * Automatically load local environment variables (.env.local, .env) during local development
 * (e.g. Vercel Dev or local test runners) if process.env is not yet populated by host.
 * Safe for Production: If required variables are already set in process.env, this is a no-op.
 */
export function ensureLocalEnvLoaded(): void {
  if (localEnvLoaded) return;
  localEnvLoaded = true;

  // If already populated by cloud host environment (e.g. Vercel Production), do nothing
  if (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.AUTH_JWT_SECRET &&
    process.env.RATE_LIMIT_HMAC_SECRET
  ) {
    return;
  }

  const baseDirs = [
    process.cwd(),
    path.resolve(process.cwd(), 'kiem-soat-van-hanh'),
    typeof import.meta !== 'undefined' && (import.meta as any).dirname
      ? path.resolve((import.meta as any).dirname, '../..')
      : null
  ].filter(Boolean) as string[];

  const fileNames = ['.env.local', '.env.development.local', '.env'];

  for (const dir of baseDirs) {
    for (const file of fileNames) {
      const fullPath = path.resolve(dir, file);
      try {
        if (fs.existsSync(fullPath)) {
          if (typeof process.loadEnvFile === 'function') {
            process.loadEnvFile(fullPath);
          } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const line of content.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) continue;
              const eqIdx = trimmed.indexOf('=');
              if (eqIdx !== -1) {
                const k = trimmed.slice(0, eqIdx).trim();
                let v = trimmed.slice(eqIdx + 1).trim();
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                  v = v.slice(1, -1);
                }
                if (!process.env[k]) {
                  process.env[k] = v;
                }
              }
            }
          }
        }
      } catch {
        // Continue searching candidates
      }
    }
  }
}

// Auto-run on module load
ensureLocalEnvLoaded();

export interface AuthBrokerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  authJwtSecret: string;
  rateLimitHmacSecret: string;
  authUpstreamWebhookUrl: string;
  upstreamAuthSecret?: string;
  telegramBotToken?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'otp',
  'phone',
  'token',
  'secret',
  'serversecret',
  'authorization',
  'service_role',
  'supabase_service_role_key',
  'auth_jwt_secret',
  'rate_limit_hmac_secret',
  'upstream_auth_secret',
  'telegram_bot_token',
  'bot_token',
  'telegramtoken'
]);

export function readRequiredServerEnv(name: string): string {
  const raw = process.env[name];
  if (!raw || !raw.trim()) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return raw.trim();
}

export const DEFAULT_TELEGRAM_BOT_TOKEN = '9066732714:AAGxBR7iiYCM95Nj2yIUZdGl2s5YD6P1KLw';

export function getAuthBrokerEnv(): AuthBrokerEnv {
  const supabaseUrl = readRequiredServerEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = readRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  const authJwtSecret = readRequiredServerEnv('AUTH_JWT_SECRET');
  const rateLimitHmacSecret = readRequiredServerEnv('RATE_LIMIT_HMAC_SECRET');
  const authUpstreamWebhookUrl = process.env.AUTH_UPSTREAM_WEBHOOK_URL?.trim() || '';
  const upstreamAuthSecret = process.env.UPSTREAM_AUTH_SECRET?.trim() || undefined;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || DEFAULT_TELEGRAM_BOT_TOKEN;

  if (authJwtSecret.length < 32) {
    throw new Error('AUTH_JWT_SECRET must be at least 32 characters long');
  }
  if (rateLimitHmacSecret.length < 32) {
    throw new Error('RATE_LIMIT_HMAC_SECRET must be at least 32 characters long');
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    authJwtSecret,
    rateLimitHmacSecret,
    authUpstreamWebhookUrl,
    upstreamAuthSecret,
    telegramBotToken
  };
}

export function getMissingEnvVars(): string[] {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'AUTH_JWT_SECRET',
    'RATE_LIMIT_HMAC_SECRET'
  ];
  return required.filter((k) => !process.env[k] || !process.env[k]!.trim());
}

export function getMissingSendOtpEnvVars(): string[] {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RATE_LIMIT_HMAC_SECRET',
    'TELEGRAM_BOT_TOKEN'
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
