/**
 * Shared HTTP client for synchronous service-to-service calls (roadmap §5).
 *
 * Implemented:
 * - Request timeout (`AbortController`)
 * - Retry-with-jitter on transient failures: HTTP 429/502/503 and network
 *   errors (timeouts, connection resets, DNS failures), up to `maxAttempts`
 *   (default 3) total attempts, with exponential jittered backoff between
 *   attempts.
 *
 * Not yet implemented:
 * - Circuit breaker (e.g. opossum or hand-rolled) to avoid cascading timeouts
 * - Short-lived service JWT signing for caller identity
 */

export interface ServiceClientOptions {
  /** Request timeout in milliseconds, per attempt. Default: 5000. */
  timeoutMs?: number;
  /** Optional default headers merged into every request. */
  headers?: HeadersInit;
  /** Max total attempts (including the first try) for retryable failures. Default: 3. */
  maxAttempts?: number;
  /** Base delay (ms) for exponential jittered backoff between retries. Default: 200. */
  retryBaseDelayMs?: number;
}

export class ServiceClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "ServiceClientError";
  }
}

/** HTTP status codes considered transient and safe to retry. */
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503]);

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

/** Network-level failures (timeout, abort, DNS/connection errors) — safe to retry. */
function isRetryableNetworkError(err: unknown): boolean {
  if (err instanceof ServiceClientError) {
    // Thrown by fetchOnce() below on timeout.
    return true;
  }
  if (err instanceof TypeError) {
    // `fetch` throws a TypeError for network failures (connection refused,
    // DNS failure, etc.) in both browsers and Node's undici implementation.
    return true;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full jitter exponential backoff: random delay in [0, base * 2^(attempt-1)]. */
function jitteredDelay(attempt: number, baseMs: number): number {
  const cap = baseMs * 2 ** (attempt - 1);
  return Math.floor(Math.random() * cap);
}

async function fetchOnce(
  url: string,
  init: RequestInit,
  headers: Headers,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ServiceClientError(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch with a per-attempt timeout and retry-with-jitter on 429/502/503 and
 * network-level failures. Returns the `Response` as-is (even non-2xx) once
 * retries are exhausted or a non-retryable status is received — callers that
 * want "throw on non-2xx" semantics should use `getJson`/`postJson` below.
 */
export async function serviceFetch(
  url: string,
  init: RequestInit = {},
  options: ServiceClientOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryBaseDelayMs = options.retryBaseDelayMs ?? 200;

  const headers = new Headers(init.headers);
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isLastAttempt = attempt === maxAttempts;

    try {
      const response = await fetchOnce(url, init, headers, timeoutMs);
      if (!isLastAttempt && isRetryableStatus(response.status)) {
        await sleep(jitteredDelay(attempt, retryBaseDelayMs));
        continue;
      }
      return response;
    } catch (err) {
      if (!isLastAttempt && isRetryableNetworkError(err)) {
        await sleep(jitteredDelay(attempt, retryBaseDelayMs));
        continue;
      }
      throw err;
    }
  }

  // Unreachable — the loop above always returns or throws — but keeps
  // TypeScript happy about the function's return type.
  throw new ServiceClientError(`Request failed after ${maxAttempts} attempts: ${url}`);
}

/** Convenience helper: GET JSON with timeout + retry. */
export async function getJson<T>(
  url: string,
  options?: ServiceClientOptions,
): Promise<T> {
  const res = await serviceFetch(url, { method: "GET" }, options);
  if (!res.ok) {
    const body = await res.text().catch(() => undefined);
    throw new ServiceClientError(
      `GET ${url} failed with ${res.status}`,
      res.status,
      body,
    );
  }
  return res.json() as Promise<T>;
}

/** Convenience helper: POST a JSON body and parse a JSON response, with timeout + retry. */
export async function postJson<T>(
  url: string,
  body: unknown,
  options?: ServiceClientOptions,
): Promise<T> {
  const res = await serviceFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => undefined);
    throw new ServiceClientError(
      `POST ${url} failed with ${res.status}`,
      res.status,
      text,
    );
  }
  return res.json() as Promise<T>;
}
