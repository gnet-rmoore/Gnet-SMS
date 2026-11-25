import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, KeyRound, Phone, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

type Row = Record<string, any>;

export function ParentPhonePanel() {
  const { t } = useTranslation(["pages", "common"]);
  const p = (key: string) => t(`parentAccess.${key}`);
  const user = useAuthStore((state) => state.user);
  const school = useAuthStore((state) => state.school);

  const [status, setStatus] = React.useState<Row | null>(null);
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [activeRequestId, setActiveRequestId] = React.useState<string | null>(null);
  const [phoneEnabled, setPhoneEnabled] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const matchesSchool = React.useCallback(
    (row: Row) => {
      const schoolId = String(school?.id || "");
      const schoolSlug = String(school?.slug || "");
      if (!schoolId && !schoolSlug) return true;
      return row?.school?.id === schoolId || row?.school?.slug === schoolSlug;
    },
    [school?.id, school?.slug]
  );

  const load = React.useCallback(async () => {
    if (user?.role !== "PARENT") return;
    setError(null);
    try {
      const data = await api.get("/api/parents/me/phone-login-request");
      setStatus(data);
      const pending = Array.isArray(data?.requests)
        ? data.requests.find(
            (row: Row) =>
              matchesSchool(row) && ["PENDING", "VERIFIED"].includes(String(row.status))
          )
        : null;
      setActiveRequestId(pending ? String(pending.id) : null);
    } catch (err: any) {
      setError(err?.message || t("common:errorGeneric"));
    }
  }, [matchesSchool, t, user?.role]);

  React.useEffect(() => {
    void fetch("/api/public/parent-login-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (typeof data?.parentPhoneLoginEnabled === "boolean") {
          setPhoneEnabled(data.parentPhoneLoginEnabled);
        }
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (url: string, body: Row) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post(url, body);
      await load();
      return result;
    } catch (err: any) {
      setError(err?.message || t("common:errorGeneric"));
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (user?.role !== "PARENT") return null;

  const latestRequest = Array.isArray(status?.requests)
    ? status.requests.find((row: Row) => matchesSchool(row)) ?? null
    : null;
  const accessCode = Array.isArray(status?.accessCodes)
    ? status.accessCodes.find((row: Row) => matchesSchool(row)) ?? null
    : null;
  const phoneLogin = Array.isArray(status?.phoneLogins)
    ? status.phoneLogins.find((row: Row) => matchesSchool(row)) ?? null
    : null;
  const statusText = latestRequest?.status === "VERIFIED"
    ? p("selfPhoneVerified")
    : latestRequest?.status === "PENDING"
      ? p("selfPhonePending")
      : latestRequest?.status === "APPROVED"
        ? p("selfPhoneEnabled")
        : p("selfNoRequest");

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-indigo-600" aria-hidden />
        <h3 className="text-sm font-extrabold text-slate-900">{p("selfTitle")}</h3>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{p("selfSubtitle")}</p>

      {accessCode && (
        <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700">
          {p("selfCodeHint")}: <span className="font-mono">{accessCode.codeHint}</span>
        </p>
      )}

      <p className="text-xs font-bold text-slate-700">
        {p("selfStatus")}: <span className="font-medium text-slate-500">{statusText}</span>
      </p>

      {phoneLogin?.enabled && (
        <p className="text-xs font-bold text-emerald-700">{p("selfPhoneEnabled")}</p>
      )}

      {phoneEnabled && (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <label htmlFor="parent-self-phone" className="block text-xs font-bold text-slate-700">
            {p("selfPhoneNumber")}
          </label>
          <input
            id="parent-self-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={t("auth:parent.phonePlaceholder")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
          />
          {!activeRequestId && (
            <button
              type="button"
              disabled={busy || !phone.trim() || !school?.slug}
              onClick={() =>
                void runAction("/api/parents/me/phone-login-request", {
                  schoolSlug: school?.slug,
                  phone,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {p("selfRequest")}
            </button>
          )}

          {activeRequestId && (
            <div className="space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(`/api/parents/me/phone-login-request/${activeRequestId}/send-code`, {})
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                {p("selfSendCode")}
              </button>
              <input
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("auth:parent.accessCodePlaceholder")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-xs tracking-widest outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <button
                type="button"
                disabled={busy || code.length !== 6}
                onClick={() =>
                  void runAction(`/api/parents/me/phone-login-request/${activeRequestId}/verify`, {
                    code,
                  })
                }
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {p("selfVerifyCode")}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-xs font-medium text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
