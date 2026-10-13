import React from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Copy,
  Key,
  Loader2,
  Play,
  Shield,
  Terminal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SMS_SHADOW_SURFACE } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { maskApiKey } from "../../../lib/schoolApiKeySession";
import type { ApiDocEndpoint } from "../catalog";
import { hasUnresolvedPathParams } from "../catalog";
import { MethodBadge } from "./MethodBadge";
import {
  defaultQueryForPath,
  formatResponseBody,
  runLiveApiRequest,
  type LiveRequestAuthMode,
  type LiveRequestResult,
} from "../runLiveRequest";

type Props = {
  slug?: string;
  schoolId: string;
  apiAccess: boolean;
  apiKey: string | null;
  apiKeyLabel?: string | null;
  accessToken: string | null;
  selected: ApiDocEndpoint | null;
  resolvedPath: string;
  /** Increment to auto-send the current GET request (e.g. after Try live). */
  autoRunToken?: number;
};

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (status >= 400 && status < 500) return "text-amber-800 bg-amber-50 border-amber-100";
  if (status >= 500) return "text-rose-700 bg-rose-50 border-rose-100";
  return "text-slate-700 bg-slate-50 border-slate-100";
}

export const LiveApiConsole = React.forwardRef<HTMLDivElement, Props>(function LiveApiConsole(
  {
    slug,
    apiAccess,
    apiKey,
    apiKeyLabel,
    accessToken,
    selected,
    resolvedPath,
    autoRunToken = 0,
  },
  ref
) {
  const { t } = useTranslation(["pages", "common"]);
  const [authMode, setAuthMode] = React.useState<LiveRequestAuthMode>(
    apiKey && apiAccess ? "apiKey" : "session"
  );
  const [query, setQuery] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<LiveRequestResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (apiKey && apiAccess) setAuthMode("apiKey");
  }, [apiKey, apiAccess]);

  React.useEffect(() => {
    if (!selected) return;
    setQuery(selected.defaultQuery ?? defaultQueryForPath(resolvedPath));
    setResult(null);
  }, [selected, resolvedPath]);

  const canUseApiKey = Boolean(apiAccess && apiKey);
  const authReady = authMode === "apiKey" ? canUseApiKey : Boolean(accessToken);
  const unresolvedParams = hasUnresolvedPathParams(resolvedPath);
  const canSend =
    authReady &&
    selected?.method === "GET" &&
    !unresolvedParams &&
    (authMode !== "apiKey" || selected.apiKeyGet);

  const requestUrl = React.useMemo(() => {
    if (!resolvedPath) return "";
    const trimmed = query.trim();
    if (!trimmed) return resolvedPath;
    const sep = resolvedPath.includes("?") ? "&" : "?";
    return `${resolvedPath}${sep}${trimmed.replace(/^\?/, "")}`;
  }, [resolvedPath, query]);

  const headerPreview = React.useMemo(() => {
    if (authMode === "apiKey" && apiKey) {
      return `X-API-Key: ${maskApiKey(apiKey)}`;
    }
    if (accessToken) {
      return "Authorization: Bearer eyJ… (your session)";
    }
    return t("apiDocs.playground.noAuth");
  }, [authMode, apiKey, accessToken, t]);

  const run = React.useCallback(async () => {
    if (!selected || !authReady || selected.method !== "GET") return;
    if (authMode === "apiKey" && !selected.apiKeyGet) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await runLiveApiRequest({
        path: resolvedPath,
        method: selected.method,
        query,
        authMode,
        apiKey: authMode === "apiKey" ? apiKey : null,
        accessToken: authMode === "session" ? accessToken : null,
      });
      setResult(res);
    } catch (err: any) {
      setResult({
        ok: false,
        status: 0,
        statusText: "Network error",
        durationMs: 0,
        bodyText: err?.message || "Request failed",
        bodyJson: null,
        requestUrl: resolvedPath,
      });
    } finally {
      setRunning(false);
    }
  }, [selected, authReady, authMode, apiKey, accessToken, resolvedPath, query]);

  React.useEffect(() => {
    if (!autoRunToken || !canSend) return;
    void run();
  }, [autoRunToken, canSend, run]);

  const copyResponse = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatResponseBody(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const authSummary =
    authMode === "apiKey" && apiKey
      ? maskApiKey(apiKey)
      : accessToken
        ? t("apiDocs.playground.sessionAuto")
        : t("apiDocs.playground.noAuth");

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white overflow-hidden flex flex-col min-w-0",
        "lg:sticky lg:top-6 lg:max-h-[calc(100vh-5rem)]",
        SMS_SHADOW_SURFACE
      )}
    >
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5 shrink-0">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-2.5 shrink-0">
              <Terminal className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {t("apiDocs.playground.eyebrow")}
              </p>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 mt-0.5">
                {t("apiDocs.playground.title")}
              </h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {t("apiDocs.playground.subtitle")}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shrink-0",
              authReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                authReady ? "bg-emerald-500" : "bg-slate-300"
              )}
            />
            {authReady ? t("apiDocs.playground.connected") : t("apiDocs.playground.awaitingAuth")}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            disabled={!canUseApiKey}
            onClick={() => setAuthMode("apiKey")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-bold border transition-colors min-h-10",
              authMode === "apiKey"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            )}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t("apiDocs.playground.authApiKey")}</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("session")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-bold border transition-colors min-h-10",
              authMode === "session"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t("apiDocs.playground.authSession")}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 sm:px-4 sm:py-3 space-y-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("apiDocs.playground.credential")}
          </p>
          <p className="text-sm font-mono text-slate-800 break-all">{authSummary}</p>
          {apiKeyLabel ? <p className="text-xs text-slate-500 truncate">{apiKeyLabel}</p> : null}
          {authMode === "apiKey" && !canUseApiKey && slug ? (
            <p className="text-xs text-amber-800 pt-1 leading-relaxed">
              {t("apiDocs.playground.createKeyHint")}{" "}
              <Link
                to={`/${slug}/settings?tab=API_KEYS`}
                className="font-bold text-indigo-600 hover:text-indigo-700"
              >
                {t("apiDocs.manageKeys")}
              </Link>
            </p>
          ) : null}
        </div>

        {!selected ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 sm:py-10 px-4 text-center">
            <p className="text-sm font-medium text-slate-500">{t("apiDocs.playground.pickEndpoint")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <MethodBadge method={selected.method} />
                {selected.apiKeyGet ? (
                  <span className="text-xs font-bold text-slate-500">{t("apiDocs.apiKeyOk")}</span>
                ) : null}
              </div>
              <p className="text-sm font-medium text-slate-800 leading-snug">
                {t(`apiDocs.endpoints.${selected.summaryKey}`)}
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950">
                <code className="block text-emerald-300 px-3 py-2.5 text-xs font-mono whitespace-pre-wrap break-all">
                  GET {requestUrl}
                </code>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("apiDocs.playground.headersPreview")}
                </p>
                <code className="block text-xs font-mono text-slate-700 break-all">{headerPreview}</code>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("apiDocs.playground.queryLabel")}
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="limit=10&offset=0"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm font-mono text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none min-h-10"
                />
              </div>
              {authMode === "apiKey" && !selected.apiKeyGet ? (
                <p className="text-xs text-amber-800 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 leading-relaxed">
                  {t("apiDocs.playground.staffOnlyWarning")}
                </p>
              ) : null}
              {unresolvedParams ? (
                <p className="text-xs text-slate-600 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 leading-relaxed">
                  {t("apiDocs.playground.replacePathParams")}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!canSend || running}
              onClick={() => void run()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold py-3 min-h-11 transition-colors"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? t("apiDocs.playground.sending") : t("apiDocs.playground.send")}
            </button>
            {selected.method !== "GET" ? (
              <p className="text-xs text-slate-500 text-center">{t("apiDocs.playground.getOnly")}</p>
            ) : null}
          </>
        )}

        {result ? (
          <div className="space-y-3 pt-2 border-t border-slate-100 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold font-mono",
                  statusTone(result.status)
                )}
              >
                {result.status || "—"} {result.statusText}
              </span>
              <span className="text-xs font-mono text-slate-500">{result.durationMs} ms</span>
            </div>
            <div className="relative min-w-0">
              <pre className="max-h-48 sm:max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 p-3 sm:p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
                {formatResponseBody(result) || t("apiDocs.playground.emptyBody")}
              </pre>
              <button
                type="button"
                onClick={() => void copyResponse()}
                className="absolute top-2 end-2 sm:top-3 sm:end-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-2.5 py-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? t("apiDocs.copied") : t("apiDocs.copy")}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});
