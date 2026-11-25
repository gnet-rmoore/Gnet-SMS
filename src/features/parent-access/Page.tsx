import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  KeyRound,
  Phone,
  RefreshCw,
  Search,
  ShieldOff,
  UserRound,
  X,
} from "lucide-react";
import { Button, DetailDrawerShell } from "../../components/ui";
import { canResetParentPassword } from "../../lib/passwordResetPolicy";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

type Row = Record<string, any>;

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export function ParentAccessPage() {
  const { t } = useTranslation(["pages", "common"]);
  const p = (key: string, opts?: Record<string, unknown>) => t(`parentAccess.${key}`, opts);
  const school = useAuthStore((state) => state.school);
  const user = useAuthStore((state) => state.user);

  const [requests, setRequests] = React.useState<Row[]>([]);
  const [parents, setParents] = React.useState<Row[]>([]);
  const [search, setSearch] = React.useState("");
  const [newCode, setNewCode] = React.useState<string | null>(null);
  const [codeEmailed, setCodeEmailed] = React.useState(false);
  const [revealedCode, setRevealedCode] = React.useState<string | null>(null);
  const [codeRevealUnavailable, setCodeRevealUnavailable] = React.useState(false);
  const [codeCopied, setCodeCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(null);
  const [resetInput, setResetInput] = React.useState("");
  const [mustChangePassword, setMustChangePassword] = React.useState(true);
  const [temporaryPassword, setTemporaryPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [drawerBusy, setDrawerBusy] = React.useState(false);

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

  const revealParentCode = async (userId: string) => {
    setDrawerBusy(true);
    try {
      const result = await api.post(`/api/users/${userId}/parent-access-code/reveal`);
      const accessCode = result?.accessCode ? String(result.accessCode) : null;
      setRevealedCode(accessCode);
      setCodeRevealUnavailable(!accessCode);
    } catch (err: any) {
      setRevealedCode(null);
      setCodeRevealUnavailable(false);
      setError(err?.message || t("common:errorGeneric"));
    } finally {
      setDrawerBusy(false);
    }
  };

  const regenerateAccessCode = async (userId: string) => {
    const result = await runAction(`/api/users/${userId}/parent-access-code/regenerate`, "POST");
    if (result?.accessCode) {
      const code = String(result.accessCode);
      setNewCode(code);
      setCodeEmailed(Boolean(result.emailSent));
      setRevealedCode(code);
      setCodeRevealUnavailable(false);
      setCodeCopied(false);
    }
  };

  const copyAccessCode = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError(p("copyFailed"));
    }
  };

  const selectedParent = parents.find((parent) => String(parent.id) === selectedParentId) ?? null;
  const canResetSelectedPassword = canResetParentPassword(user, {
    id: String(selectedParent?.id || ""),
    role: "PARENT",
    schoolId: school?.id,
  });

  const openParent = (parent: Row) => {
    setSelectedParentId(String(parent.id));
    setResetInput("");
    setMustChangePassword(true);
    setTemporaryPassword(null);
    setCopied(false);
    setRevealedCode(null);
    setCodeRevealUnavailable(false);
    setCodeCopied(false);
    setError(null);
    void revealParentCode(String(parent.id));
  };

  const closeParent = () => {
    setSelectedParentId(null);
    setTemporaryPassword(null);
    setRevealedCode(null);
    setCodeRevealUnavailable(false);
    setCodeCopied(false);
    setError(null);
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(p("copyFailed"));
    }
  };

  const submitPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedParent || !school?.id) return;
    setDrawerBusy(true);
    setError(null);
    try {
      const password = resetInput.trim();
      const result = await api.post(`/api/users/${selectedParent.id}/parent-password/reset`, {
        ...(password ? { password } : {}),
        mustChangePassword,
      });
      setTemporaryPassword(String(result?.tempPassword || password || ""));
      setResetInput("");
      setCopied(false);
    } catch (err: any) {
      setError(err?.message || t("common:errorGeneric"));
    } finally {
      setDrawerBusy(false);
      await load();
    }
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
          <p>{p("newCode", { code: newCode })}</p>
          {codeEmailed && <p className="mt-1 text-xs font-medium text-emerald-800">{p("codeEmailed")}</p>}
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
                      {String(parent.id) === selectedParentId && revealedCode
                        ? revealedCode
                        : parent.accessCode?.codeHint || "—"}
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
                          onClick={() => openParent(parent)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          {p("viewDetails")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void regenerateAccessCode(String(parent.id))}
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

      <DetailDrawerShell
        open={Boolean(selectedParent)}
        onClose={closeParent}
        eyebrow={p("detailsEyebrow")}
        title={selectedParent?.name || ""}
        subtitle={selectedParent?.email || undefined}
        badge={
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-indigo-100">
            {p("parent")}
          </span>
        }
      >
        {selectedParent ? (
          <div className="space-y-7">
            <section>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                {p("detailsTitle")}
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailItem label={t("common:name")} value={selectedParent.name} />
                <DetailItem label={t("common:email")} value={selectedParent.email} />
                <DetailItem
                  label={p("accessCode")}
                  value={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">
                        {revealedCode || selectedParent.accessCode?.codeHint || "—"}
                      </span>
                      {revealedCode && (
                        <Button type="button" size="compact" variant="secondary" onClick={() => void copyAccessCode()}>
                          {codeCopied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                          {codeCopied ? t("common:copied") : t("common:copy")}
                        </Button>
                      )}
                    </span>
                  }
                />
                <DetailItem label={p("issuedAt")} value={formatDate(selectedParent.accessCode?.issuedAt)} />
                <DetailItem label={p("lockedUntil")} value={formatDate(selectedParent.accessCode?.lockedUntil)} />
                <DetailItem label={p("phoneLogin")} value={selectedParent.phoneLogin?.phoneHint || "—"} />
                <DetailItem label={p("verifiedAt")} value={formatDate(selectedParent.phoneLogin?.verifiedAt)} />
                <DetailItem
                  label={p("status")}
                  value={
                    selectedParent.phoneLogin
                      ? selectedParent.phoneLogin.enabled
                        ? p("enabled")
                        : p("disabled")
                      : "—"
                  }
                />
              </dl>
              {!revealedCode && codeRevealUnavailable && (
                <p className="mt-3 text-xs text-slate-500">{p("codeRevealUnavailable")}</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                {p("accessActionsTitle")}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="compact"
                  disabled={busy || drawerBusy}
                  onClick={() => void load()}
                >
                  {t("common:refresh")}
                </Button>
                <Button
                  type="button"
                  size="compact"
                  variant="secondary"
                  disabled={busy || drawerBusy}
                  onClick={() => void regenerateAccessCode(String(selectedParent.id))}
                >
                  <KeyRound className="h-4 w-4" aria-hidden />
                  {p("regenerate")}
                </Button>
                <Button
                  type="button"
                  size="compact"
                  variant="secondary"
                  disabled={busy || drawerBusy}
                  onClick={() =>
                    void runAction(
                      `/api/users/${selectedParent.id}/parent-login/reset-lockout`,
                      "POST"
                    )
                  }
                >
                  <ShieldOff className="h-4 w-4" aria-hidden />
                  {p("resetLockout")}
                </Button>
                <Button
                  type="button"
                  size="compact"
                  variant="secondary"
                  disabled={busy || drawerBusy || !selectedParent.phoneLogin}
                  onClick={() =>
                    void runAction(`/api/users/${selectedParent.id}/parent-login`, "PATCH", {
                      enabled: !selectedParent.phoneLogin?.enabled,
                    })
                  }
                >
                  {selectedParent.phoneLogin?.enabled ? p("phoneDisable") : p("phoneEnable")}
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                {p("resetPassword")}
              </h3>
              {!canResetSelectedPassword ? (
                <p className="mt-3 text-sm text-slate-500">{p("passwordResetForbidden")}</p>
              ) : temporaryPassword ? (
                <div role="status" className="mt-3 space-y-3">
                  <p className="text-sm font-medium text-slate-600">{p("temporaryPasswordHint")}</p>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <code className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-emerald-950">
                      {temporaryPassword}
                    </code>
                    <Button type="button" size="compact" variant="secondary" onClick={copyTemporaryPassword}>
                      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      {copied ? t("common:copied") : t("common:copy")}
                    </Button>
                    <Button
                      type="button"
                      size="compact"
                      onClick={() => {
                        setTemporaryPassword(null);
                        setError(null);
                      }}
                    >
                      {t("common:done")}
                    </Button>
                  </div>
                </div>
              ) : (
                <form id="parent-password-reset-form" onSubmit={submitPasswordReset} className="mt-3 space-y-4">
                  <div>
                    <label htmlFor="parent-password-reset-input" className="block text-sm font-bold text-slate-700">
                      {t("common:temporaryPassword")}
                    </label>
                    <input
                      id="parent-password-reset-input"
                      type="text"
                      value={resetInput}
                      onChange={(event) => setResetInput(event.target.value)}
                      placeholder={p("resetPasswordPlaceholder")}
                      autoComplete="new-password"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    />
                    <p className="mt-1 text-xs text-slate-500">{p("resetPasswordHint")}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(event) => setMustChangePassword(event.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {p("mustChangePassword")}
                  </label>
                  <Button type="submit" loading={drawerBusy} disabled={busy}>
                    {p("resetPassword")}
                  </Button>
                </form>
              )}
            </section>
          </div>
        ) : null}
      </DetailDrawerShell>
    </div>
  );
}
