import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Check,
  KeyRound,
  Phone,
  RefreshCw,
  Search,
  ShieldOff,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

type Row = Record<string, any>;

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ParentAccessPage() {
  const { t } = useTranslation(["pages", "common"]);
  const p = (key: string, opts?: Record<string, unknown>) => t(`parentAccess.${key}`, opts);
  const school = useAuthStore((state) => state.school);

  const [requests, setRequests] = React.useState<Row[]>([]);
  const [parents, setParents] = React.useState<Row[]>([]);
  const [search, setSearch] = React.useState("");
  const [newCode, setNewCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!school?.id) return;
    setError(null);
    try {
      const [requestRows, parentRows] = await Promise.all([
        api.get(`/api/schools/${school.id}/parent-phone-login-requests`),
        api.get(`/api/schools/${school.id}/parent-access`, { params: { search } }),
      ]);
      setRequests(Array.isArray(requestRows) ? requestRows : []);
      setParents(Array.isArray(parentRows) ? parentRows : []);
    } catch (err: any) {
      setError(err?.message || t("common:errorGeneric"));
    }
  }, [school?.id, search, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (url: string, method: "POST" | "PATCH", body: Row = {}) => {
    setBusy(true);
    setError(null);
    try {
      return method === "PATCH" ? await api.patch(url, body) : await api.post(url, body);
    } catch (err: any) {
      setError(err?.message || t("common:errorGeneric"));
      return null;
    } finally {
      setBusy(false);
      await load();
    }
  };

  const statusLabel = (status: string) => {
    if (status === "PENDING") return t("common:pending");
    if (status === "APPROVED") return t("common:approved");
    if (status === "REJECTED") return t("common:rejected");
    return status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{p("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{p("subtitle")}</p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {newCode && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          {p("newCode", { code: newCode })}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Phone className="h-5 w-5 text-blue-600" aria-hidden />
            {p("requestsTitle")}
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("common:refresh")}
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{p("noRequests")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 text-start">{p("parent")}</th>
                  <th className="py-2 text-start">{t("common:phone")}</th>
                  <th className="py-2 text-start">{p("status")}</th>
                  <th className="py-2 text-start">{p("requestedAt")}</th>
                  <th className="py-2 text-start">{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={String(request.id)} className="border-b border-slate-100 last:border-0">
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{request.parentName}</p>
                      <p className="text-xs text-slate-500">{request.parentEmail}</p>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-600">{request.phoneHint || request.phoneE164}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {statusLabel(String(request.status))}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{formatDate(request.requestedAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || request.status !== "VERIFIED"}
                          title={request.status !== "VERIFIED" ? p("verificationRequired") : undefined}
                          onClick={() =>
                            void runAction(
                              `/api/parent-phone-login-requests/${request.id}/approve`,
                              "POST"
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          {p("approve")}
                        </button>
                        <button
                          type="button"
                          disabled={busy || !["PENDING", "VERIFIED"].includes(String(request.status))}
                          onClick={() =>
                            void runAction(
                              `/api/parent-phone-login-requests/${request.id}/reject`,
                              "POST"
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                          {p("reject")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <UserRound className="h-5 w-5 text-blue-600" aria-hidden />
            {p("directoryTitle")}
          </h2>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load();
                }}
                placeholder={p("searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 py-2 ps-9 pe-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={busy}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {t("common:search")}
            </button>
          </div>
        </div>

        {parents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{p("noParents")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 text-start">{p("parent")}</th>
                  <th className="py-2 text-start">{p("accessCode")}</th>
                  <th className="py-2 text-start">{p("phoneLogin")}</th>
                  <th className="py-2 text-start">{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((parent) => (
                  <tr key={String(parent.id)} className="border-b border-slate-100 last:border-0">
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{parent.name}</p>
                      <p className="text-xs text-slate-500">{parent.email}</p>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-600">
                      {parent.accessCode?.codeHint || "—"}
                    </td>
                    <td className="py-3">
                      <p className="text-xs font-semibold text-slate-700">
                        {parent.phoneLogin ? parent.phoneLogin.phoneHint : "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {parent.phoneLogin?.enabled ? p("enabled") : p("disabled")}
                      </p>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            const result = await runAction(
                              `/api/users/${parent.id}/parent-access-code/regenerate`,
                              "POST"
                            );
                            if (result?.accessCode) setNewCode(String(result.accessCode));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden />
                          {p("regenerate")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction(
                              `/api/users/${parent.id}/parent-login/reset-lockout`,
                              "POST"
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                          <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                          {p("resetLockout")}
                        </button>
                        <button
                          type="button"
                          disabled={busy || !parent.phoneLogin}
                          onClick={() =>
                            void runAction(`/api/users/${parent.id}/parent-login`, "PATCH", {
                              enabled: !parent.phoneLogin?.enabled,
                            })
                          }
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                          {parent.phoneLogin?.enabled ? p("phoneDisable") : p("phoneEnable")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
