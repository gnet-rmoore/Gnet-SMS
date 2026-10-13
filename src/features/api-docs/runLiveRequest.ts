export type LiveRequestAuthMode = "apiKey" | "session";

export type LiveRequestResult = {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  bodyText: string;
  bodyJson: unknown | null;
  requestUrl: string;
};

function buildUrl(path: string, query: string): string {
  const q = query.trim();
  if (!q) return path;
  return `${path}${q.startsWith("?") ? q : `?${q}`}`;
}

export async function runLiveApiRequest(input: {
  path: string;
  method: string;
  query?: string;
  authMode: LiveRequestAuthMode;
  apiKey?: string | null;
  accessToken?: string | null;
}): Promise<LiveRequestResult> {
  const requestUrl = buildUrl(input.path, input.query || "");
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (input.authMode === "apiKey" && input.apiKey) {
    headers["X-API-Key"] = input.apiKey;
  } else if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`;
  }

  const started = performance.now();
  const res = await fetch(requestUrl, {
    method: input.method,
    headers,
    credentials: "same-origin",
  });
  const durationMs = Math.round(performance.now() - started);

  const bodyText = await res.text();
  let bodyJson: unknown | null = null;
  if (bodyText) {
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      bodyJson = null;
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    durationMs,
    bodyText,
    bodyJson,
    requestUrl,
  };
}

export function defaultQueryForPath(path: string): string {
  if (path.includes("/students") || path.includes("/staff") || path.includes("/users")) {
    return "limit=10&offset=0";
  }
  if (path.includes("/applications")) return "limit=20&offset=0";
  if (path.includes("/attendance") && !path.includes("stats") && !path.includes("summary")) {
    return "date=2026-01-15";
  }
  if (path.includes("/fees") || path.includes("/receipts") || path.includes("/expenses")) return "limit=10";
  if (path.includes("/fee-payment-txns")) return "limit=20";
  if (path.includes("/announcements") || path.includes("/documents")) return "limit=10";
  return "";
}

export function formatResponseBody(result: LiveRequestResult): string {
  if (result.bodyJson !== null) {
    return JSON.stringify(result.bodyJson, null, 2);
  }
  return result.bodyText || "";
}
