import { useAuthStore } from "../store/authStore";

/**
 * Minimal typed fetch wrapper used by every `features/*\/api.ts` module.
 *
 * - Resolves against the current origin (dev server proxies `/api` to the gateway).
 * - Attaches the bearer token from the persisted auth store.
 * - Returns the parsed JSON body directly (not an axios-style `{ data }`).
 * - Throws {@link ApiError} on non-2xx responses, exposing `status`, `code`,
 *   `message` and a `response.data` shape for `translateApiError`.
 */

export type ApiQueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  /** Query string values; `null`/`undefined` entries are skipped. */
  params?: Record<string, ApiQueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  response: { status: number; data: any };

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.response = { status, data };
  }
}

function buildUrl(path: string, params?: Record<string, ApiQueryValue>): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  if (!qs) return path;
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
}

async function parseBody(res: Response): Promise<any> {
  if (res.status === 204 || res.status === 205) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<any> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (!headers["Content-Type"] && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    payload = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, options?.params), {
    method,
    headers,
    body: payload,
    signal: options?.signal,
  });

  const data = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401 && token) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login?expired=true");
      }
    }
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      res.statusText ||
      "Request failed";
    const code =
      data && typeof data === "object" && typeof data.code === "string"
        ? data.code
        : undefined;
    throw new ApiError(String(message), res.status, code, data);
  }

  return data;
}

export const api = {
  get: (path: string, options?: ApiRequestOptions) => request("GET", path, undefined, options),
  post: (path: string, body?: unknown, options?: ApiRequestOptions) =>
    request("POST", path, body, options),
  put: (path: string, body?: unknown, options?: ApiRequestOptions) =>
    request("PUT", path, body, options),
  patch: (path: string, body?: unknown, options?: ApiRequestOptions) =>
    request("PATCH", path, body, options),
  delete: (path: string, options?: ApiRequestOptions) =>
    request("DELETE", path, undefined, options),
};

export default api;
