import type { IncomingMessage, ServerResponse } from 'node:http';

export const MAX_JSON_BODY_BYTES = 16 * 1024; // 16 KB

export class HttpValidationError extends Error {
  readonly statusCode: 400 | 413 | 415;

  constructor(statusCode: 400 | 413 | 415, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function sendJson(res: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(body));
}

/**
 * Strictly enforce `Content-Type: application/json` (optional valid UTF-8 charset).
 * Rejects missing or non-JSON Content-Type with HTTP 415 before any body parsing.
 */
export function validateJsonContentType(headers: Record<string, string | string[] | undefined> | undefined): void {
  const rawHeader = headers?.['content-type'];
  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!headerValue || typeof headerValue !== 'string' || !headerValue.trim()) {
    throw new HttpValidationError(415, 'Content-Type header is required and must be application/json');
  }

  const parts = headerValue.split(';').map((p) => p.trim()).filter(Boolean);
  const mediaType = parts[0]?.toLowerCase();

  if (mediaType !== 'application/json') {
    throw new HttpValidationError(415, 'Unsupported Content-Type: expected application/json');
  }

  for (const param of parts.slice(1)) {
    const eqIdx = param.indexOf('=');
    if (eqIdx === -1) {
      throw new HttpValidationError(415, 'Malformed Content-Type parameter');
    }
    const key = param.slice(0, eqIdx).trim().toLowerCase();
    const val = param.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, '$1').toLowerCase();
    if (key === 'charset' && val !== 'utf-8' && val !== 'utf8') {
      throw new HttpValidationError(415, 'Unsupported charset: only UTF-8 is accepted');
    }
  }
}

function assertPlainJsonObject(parsed: unknown): Record<string, unknown> {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpValidationError(400, 'Request body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Read and validate JSON object body with strict 16KB limit.
 * Checks Content-Length first, raw stream bytes when unparsed, and pre-parsed req.body fallback.
 */
export async function readValidatedJsonBody(
  req: Pick<IncomingMessage, 'headers'> & {
    body?: unknown;
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  }
): Promise<Record<string, unknown>> {
  validateJsonContentType(req.headers);

  // 1. Check Content-Length header upfront if present
  const rawLen = req.headers?.['content-length'];
  const lenHeader = Array.isArray(rawLen) ? rawLen[0] : rawLen;
  if (lenHeader !== undefined) {
    const parsedLen = Number(lenHeader);
    if (Number.isFinite(parsedLen) && parsedLen > MAX_JSON_BODY_BYTES) {
      throw new HttpValidationError(413, 'Request body exceeds 16KB limit');
    }
  }

  // 2. Handle pre-parsed body (Vercel Node runtime may populate req.body)
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.byteLength > MAX_JSON_BODY_BYTES) {
        throw new HttpValidationError(413, 'Request body exceeds 16KB limit');
      }
      const raw = req.body.toString('utf8').trim();
      if (!raw) throw new HttpValidationError(400, 'Request body cannot be empty');
      try {
        return assertPlainJsonObject(JSON.parse(raw));
      } catch (err) {
        if (err instanceof HttpValidationError) throw err;
        throw new HttpValidationError(400, 'Invalid JSON syntax');
      }
    }

    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > MAX_JSON_BODY_BYTES) {
        throw new HttpValidationError(413, 'Request body exceeds 16KB limit');
      }
      const trimmed = req.body.trim();
      if (!trimmed) throw new HttpValidationError(400, 'Request body cannot be empty');
      try {
        return assertPlainJsonObject(JSON.parse(trimmed));
      } catch (err) {
        if (err instanceof HttpValidationError) throw err;
        throw new HttpValidationError(400, 'Invalid JSON syntax');
      }
    }

    // Pre-parsed JS value (object, null, array, number, boolean)
    const obj = assertPlainJsonObject(req.body);
    const serializedBytes = Buffer.byteLength(JSON.stringify(obj), 'utf8');
    if (serializedBytes > MAX_JSON_BODY_BYTES) {
      throw new HttpValidationError(413, 'Request body exceeds 16KB limit');
    }
    return obj;
  }

  // 3. Read raw stream directly and abort immediately if bytes > 16KB
  if (typeof req[Symbol.asyncIterator] !== 'function') {
    throw new HttpValidationError(400, 'Request body cannot be empty');
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req as AsyncIterable<unknown>) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
    totalBytes += buf.byteLength;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw new HttpValidationError(413, 'Request body exceeds 16KB limit');
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new HttpValidationError(400, 'Request body cannot be empty');
  }

  try {
    return assertPlainJsonObject(JSON.parse(raw));
  } catch (err) {
    if (err instanceof HttpValidationError) throw err;
    throw new HttpValidationError(400, 'Invalid JSON syntax');
  }
}
