import { readRequiredServerEnv } from './env.ts';

export interface UpstreamIdentity {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface UpstreamAuthResult {
  success: boolean;
  user?: UpstreamIdentity;
  error?: string;
  upstreamUnavailable?: boolean;
}

const UPSTREAM_TIMEOUT_MS = 8000;

async function postToUpstreamAuth(payload: Record<string, unknown>): Promise<UpstreamAuthResult> {
  let endpoint: string;
  try {
    endpoint = readRequiredServerEnv('AUTH_UPSTREAM_WEBHOOK_URL');
  } catch (err) {
    return {
      success: false,
      upstreamUnavailable: true,
      error: err instanceof Error ? err.message : 'Upstream auth endpoint not configured'
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

export async function verifyCredentialsWithUpstream(params: {
  username: string;
  password?: string;
  email?: string;
}): Promise<UpstreamAuthResult> {
  return postToUpstreamAuth({
    action: 'auth_login',
    username: params.username.trim(),
    password: params.password || undefined,
    email: params.email || undefined,
    timestamp: Date.now()
  });
}

export async function verifyOtpWithUpstream(params: {
  phone: string;
  otp: string;
}): Promise<UpstreamAuthResult> {
  return postToUpstreamAuth({
    action: 'auth_verify_otp',
    phone: params.phone.trim(),
    otp: params.otp.trim(),
    timestamp: Date.now()
  });
}
