import { gatewayBaseUrl, FIXTURES, type SeededRole } from "./fixtures.ts";

export type ApiResult = {
  status: number;
  ok: boolean;
  json: unknown;
  text: string;
  headers: Headers;
};

export async function apiFetch(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResult> {
  const url = path.startsWith("http") ? path : `${gatewayBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, json, text, headers: res.headers };
}

export function expectStatus(result: ApiResult, expected: number | number[], label: string) {
  const ok = Array.isArray(expected)
    ? expected.includes(result.status)
    : result.status === expected;
  if (!ok) {
    const want = Array.isArray(expected) ? expected.join("|") : String(expected);
    throw new Error(
      `${label}: expected ${want}, got ${result.status} — ${result.text.slice(0, 240)}`
    );
  }
}

/** True when gateway answers (any HTTP status from /health or login probe). */
export async function isGatewayUp(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${gatewayBaseUrl()}/health/live`, { signal: controller.signal });
    clearTimeout(t);
    return res.status > 0;
  } catch {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${gatewayBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "x", password: "y" }),
        signal: controller.signal,
      });
      clearTimeout(t);
      return res.status > 0;
    } catch {
      return false;
    }
  }
}
