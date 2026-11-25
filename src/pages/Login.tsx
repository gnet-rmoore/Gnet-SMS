import React from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { motion } from "motion/react";
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Languages,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  KeyRound,
  Phone,
  UserRound,
} from "lucide-react";
import { changeAppLocale, getStoredLocale, normalizeLocale, resolveEffectiveLocale } from "../i18n";
import { LanguageSelect } from "../i18n/LanguageSelect";
import type { AppLocale } from "../i18n/locales";
import { cn } from "../lib/cn";
import { LoginBackground } from "./LoginBackground";
import { LoginErrorAlert } from "./LoginErrorAlert";
import { PageToast, usePageToast } from "../features/academics-shared/PageToast";
import { getPostLoginPath } from "../lib/postLoginPath";
import {
  classifyLoginError,
  extractLoginErrorSignal,
  loginErrorSignal,
  type LoginErrorSignal,
} from "../lib/loginError";

const fieldClass =
  "w-full rounded-2xl border border-slate-200/90 bg-white py-3.5 text-base text-slate-900 shadow-[inset_0_1px_2px_rgb(15_23_42/0.04)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-[3px] focus:ring-blue-500/15 sm:text-sm";

type LoginPayload = Record<string, any>;
type LoginMode = "password" | "parent-code" | "parent-phone";

export const Login = () => {
  const { t, i18n } = useTranslation(["auth", "common"]);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast, showToast } = usePageToast(4500);
  const [loginError, setLoginError] = React.useState<LoginErrorSignal | null>(null);
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";
  const [hostSchool, setHostSchool] = React.useState<{
    schoolSlug: string;
    schoolName: string;
  } | null>(null);
  const [mfaToken, setMfaToken] = React.useState<string | null>(null);
  const [mfaCode, setMfaCode] = React.useState("");
  const [mfaMethods, setMfaMethods] = React.useState<string[]>(["totp"]);
  const [mfaMode, setMfaMode] = React.useState<LoginMode>("password");
  const [smsSent, setSmsSent] = React.useState(false);
  const [loginTab, setLoginTab] = React.useState<"password" | "parent">("password");
  const [parentMode, setParentMode] = React.useState<"code" | "phone">("code");
  const [parentSchoolSlug, setParentSchoolSlug] = React.useState("");
  const [parentAccessCode, setParentAccessCode] = React.useState("");
  const [parentPhone, setParentPhone] = React.useState("");
  const [parentPhoneCode, setParentPhoneCode] = React.useState("");
  const [phoneCodeSent, setPhoneCodeSent] = React.useState(false);
  const [parentPhoneLoginEnabled, setParentPhoneLoginEnabled] = React.useState(false);

  React.useEffect(() => {
    void fetch("/api/public/parent-login-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (typeof data?.parentPhoneLoginEnabled === "boolean") {
          setParentPhoneLoginEnabled(data.parentPhoneLoginEnabled);
        }
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const host = window.location.hostname;
    if (!host || host === "localhost" || host === "127.0.0.1") return;
    void fetch(`/api/public/resolve-host?host=${encodeURIComponent(host)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.matched && data.schoolSlug) {
          setHostSchool({ schoolSlug: data.schoolSlug, schoolName: data.schoolName || data.schoolSlug });
          setParentSchoolSlug((current) => current || data.schoolSlug);
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const showSchoolUnavailable = async (data: LoginPayload) => {
    if (data?.code !== "SCHOOL_SUSPENDED" && data?.code !== "TRIAL_EXPIRED") return false;
    const { rememberSchoolUnavailable, buildSchoolUnavailableUrl } = await import(
      "../lib/schoolUnavailable"
    );
    const payload = {
      schoolStatus: String(data.schoolStatus || "SUSPENDED"),
      schoolName: data.schoolName || null,
      schoolSlug: data.schoolSlug || null,
    };
    rememberSchoolUnavailable(payload);
    navigate(buildSchoolUnavailableUrl(payload), { replace: true });
    return true;
  };

  const finishLogin = async (data: LoginPayload, mode: LoginMode = "password") => {
    if (data?.mfaRequired && data?.mfaToken) {
      setMfaToken(String(data.mfaToken));
      setMfaMode(mode);
      setMfaMethods(Array.isArray(data.methods) ? data.methods.map(String) : ["totp"]);
      setMfaCode("");
      setSmsSent(false);
      return;
    }

    if (data.user?.role !== "SUPER_ADMIN" && (!data.school || !data.school.slug)) {
      throw loginErrorSignal({ case: "noSchool" });
    }

    setAuth(
      data.user,
      data.accessToken,
      data.school ?? null,
      data.capabilities ?? null,
      data.entitlements ?? null,
      data.quotas ?? null
    );
    await changeAppLocale(
      resolveEffectiveLocale({
        userPreferred: data.user?.preferredLocale,
        schoolDefault: data.school?.defaultLocale,
      })
    );

    navigate(getPostLoginPath(data.user, data.school ?? null));
  };

  const postJson = async (
    endpoint: string,
    payload: LoginPayload,
    mode: LoginMode = "password",
    mfa = false
  ) => {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw loginErrorSignal({ case: "offline" });
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response received:", text);
      if (
        text.includes("Starting Server") ||
        text.includes("Please wait while your application starts") ||
        text.includes("<title>Starting Server...")
      ) {
        throw loginErrorSignal({ case: "warming" });
      }
      throw loginErrorSignal(classifyLoginError({ status: response.status, kind: "bad-response", mode, mfa }));
    }

    return { response, data: (await response.json()) as LoginPayload };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      let { response, data } = await postJson("/api/auth/login", { email, password });
      if (!response.ok && data?.code === "USE_SUPER_ADMIN_LOGIN") {
        ({ response, data } = await postJson("/api/super-admin/auth/login", { email, password }));
      }

      if (!response.ok) {
        if (await showSchoolUnavailable(data)) return;
        throw loginErrorSignal(
          classifyLoginError({
            status: response.status,
            code: data?.code,
            message: [data?.error, data?.details].filter(Boolean).join(" "),
            mode: "password",
          })
        );
      }

      await finishLogin(data);
    } catch (err: unknown) {
      setLoginError(extractLoginErrorSignal(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    setLoading(true);
    setLoginError(null);
    try {
      const { response, data } = await postJson(
        "/api/auth/mfa/verify",
        { mfaToken, code: mfaCode },
        mfaMode,
        true
      );
      if (!response.ok) {
        if (await showSchoolUnavailable(data)) return;
        throw loginErrorSignal(
          classifyLoginError({ status: response.status, code: data?.code, mfa: true, mode: mfaMode })
        );
      }
      setMfaToken(null);
      await finishLogin(data, mfaMode);
    } catch (err: unknown) {
      setLoginError(extractLoginErrorSignal(err, { mfa: true, mode: mfaMode }));
    } finally {
      setLoading(false);
    }
  };

  const handleParentAccessCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      const { response, data } = await postJson(
        "/api/auth/parent/access-code/login",
        { schoolSlug: parentSchoolSlug.trim(), code: parentAccessCode },
        "parent-code"
      );
      if (!response.ok) {
        if (await showSchoolUnavailable(data)) return;
        throw loginErrorSignal(
          classifyLoginError({
            status: response.status,
            code: data?.code,
            message: [data?.error, data?.details].filter(Boolean).join(" "),
            mode: "parent-code",
          })
        );
      }
      await finishLogin(data, "parent-code");
    } catch (err: unknown) {
      setLoginError(extractLoginErrorSignal(err, { mode: "parent-code" }));
    } finally {
      setLoading(false);
    }
  };

  const handleParentPhoneSendCode = async () => {
    setLoading(true);
    setLoginError(null);
    try {
      const { response, data } = await postJson(
        "/api/auth/parent/phone/send-code",
        { schoolSlug: parentSchoolSlug.trim(), phone: parentPhone },
        "parent-phone"
      );
      if (!response.ok) {
        throw loginErrorSignal(
          classifyLoginError({
            status: response.status,
            code: data?.code,
            message: [data?.error, data?.details].filter(Boolean).join(" "),
            mode: "parent-phone",
          })
        );
      }
      setPhoneCodeSent(true);
      showToast(t("auth:parent.codeSent"), "success");
    } catch (err: unknown) {
      setLoginError(extractLoginErrorSignal(err, { mode: "parent-phone" }));
    } finally {
      setLoading(false);
    }
  };

  const handleParentPhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      const { response, data } = await postJson(
        "/api/auth/parent/phone/login",
        { schoolSlug: parentSchoolSlug.trim(), phone: parentPhone, code: parentPhoneCode },
        "parent-phone"
      );
      if (!response.ok) {
        if (await showSchoolUnavailable(data)) return;
        throw loginErrorSignal(
          classifyLoginError({
            status: response.status,
            code: data?.code,
            message: [data?.error, data?.details].filter(Boolean).join(" "),
            mode: "parent-phone",
          })
        );
      }
      await finishLogin(data, "parent-phone");
    } catch (err: unknown) {
      setLoginError(extractLoginErrorSignal(err, { mode: "parent-phone" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-16 sm:px-6 sm:py-14">
      <PageToast toast={toast} />
      <LoginBackground className="pointer-events-none absolute inset-0" />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-5">
        <Link
          to="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] backdrop-blur-md transition-colors hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
          <span className="hidden sm:inline">{t("auth:backHome")}</span>
          <span className="sr-only sm:hidden">{t("auth:backHome")}</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 ps-2.5 pe-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] backdrop-blur-md">
          <Languages className="h-4 w-4 shrink-0 text-white/80" aria-hidden />
          <LanguageSelect
            id="login-lang"
            value={locale}
            onChange={setLocale}
            applyImmediately
            hint={null}
            variant="glass"
            compactOptions
            className="min-w-[7.5rem] sm:min-w-[8.5rem] [&_select]:border-0 [&_select]:bg-transparent [&_select]:py-1.5 [&_select]:shadow-none [&_select]:hover:bg-transparent"
          />
        </div>
      </div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[26.5rem]"
      >
        <div className="overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_32px_90px_rgba(2,6,23,0.5)] sm:rounded-[32px]">
          {/* Card header */}
          <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-500/20">
                G
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Gnet SMS</p>
                <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  {t("auth:title")}
                </h1>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{t("auth:subtitle")}</p>
            {hostSchool && (
              <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                Signing in to <span className="font-extrabold">{hostSchool.schoolName}</span>
                <span className="font-mono text-xs text-blue-600"> · /{hostSchool.schoolSlug}</span>
              </p>
            )}
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-7">
            {!mfaToken && (
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginTab === "password"}
                  onClick={() => {
                    setLoginTab("password");
                    setLoginError(null);
                  }}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
                    loginTab === "password"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <UserRound className="h-4 w-4" aria-hidden />
                  {t("auth:tabs.emailPassword")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginTab === "parent"}
                  onClick={() => {
                    setLoginTab("parent");
                    setLoginError(null);
                  }}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
                    loginTab === "parent"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <KeyRound className="h-4 w-4" aria-hidden />
                  {t("auth:tabs.parentCode")}
                </button>
              </div>
            )}
            {mfaToken ? (
              <form onSubmit={handleMfaVerify} className="space-y-5" noValidate>
                <LoginErrorAlert signal={loginError} />
                <p className="text-sm text-slate-600">
                  Enter the 6-digit code from your authenticator app.
                </p>
                <div className="space-y-2">
                  <label htmlFor="login-mfa" className="block text-sm font-semibold text-slate-700">
                    Verification code
                  </label>
                  <input
                    id="login-mfa"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => {
                      setMfaCode(e.target.value);
                      setLoginError(null);
                    }}
                    className={cn(fieldClass, "font-mono tracking-widest text-center")}
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || mfaCode.length < 6}
                  className="flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Verify and sign in
                </button>
                {mfaMethods.includes("sms") && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      setLoginError(null);
                      try {
                        const res = await fetch("/api/auth/mfa/send-sms", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mfaToken }),
                        });
                        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
                        if (!res.ok) {
                          throw loginErrorSignal(
                            classifyLoginError({ status: res.status, code: data?.code, mfa: true })
                          );
                        }
                        setSmsSent(true);
                        showToast(`Code sent to ${data.sentTo || "your phone"}`, "success");
                      } catch (err: unknown) {
                        setLoginError(extractLoginErrorSignal(err, { mfa: true }));
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {smsSent ? "Resend SMS code" : "Send SMS code instead"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMfaToken(null);
                    setMfaCode("");
                    setLoginError(null);
                  }}
                  className="w-full text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                  {t("auth:parent.backToSignIn")}
                </button>
              </form>
            ) : loginTab === "password" ? (
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <LoginErrorAlert signal={loginError} />
              {isExpired ? (
                <div
                  role="status"
                  className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 text-sm font-medium text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  <span>{t("auth:expired")}</span>
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">
                  {t("auth:email")}
                </label>
                <div className="relative group">
                  <Mail className="pointer-events-none absolute start-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLoginError(null);
                    }}
                    className={cn(fieldClass, "ps-11 pe-4")}
                    placeholder={t("auth:emailPlaceholder")}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                    {t("auth:password")}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-md"
                  >
                    {t("auth:forgotPassword")}
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="pointer-events-none absolute start-4 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError(null);
                    }}
                    className={cn(fieldClass, "ps-11 pe-12")}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute end-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    aria-label={showPassword ? t("auth:hidePassword") : t("auth:showPassword")}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-1 flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgb(37_99_235/0.55)] transition-[background-color,transform,box-shadow] hover:bg-blue-500 hover:shadow-[0_16px_32px_-8px_rgb(37_99_235/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t("auth:loggingIn")}
                  </>
                ) : (
                  <>
                    {t("auth:login")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
            ) : (
            <form
              onSubmit={parentMode === "code" ? handleParentAccessCodeLogin : handleParentPhoneLogin}
              className="space-y-5"
              noValidate
            >
              <LoginErrorAlert signal={loginError} />
              <div>
                <p className="text-sm font-bold text-slate-900">{t("auth:parent.title")}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {t("auth:parent.subtitle")}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="parent-school" className="block text-sm font-semibold text-slate-700">
                  {t("auth:parent.schoolSlug")}
                </label>
                <input
                  id="parent-school"
                  value={parentSchoolSlug}
                  onChange={(e) => {
                    setParentSchoolSlug(e.target.value);
                    setLoginError(null);
                  }}
                  className={fieldClass}
                  placeholder={t("auth:parent.schoolSlugPlaceholder")}
                  autoComplete="off"
                  required
                />
              </div>

              {parentPhoneLoginEnabled && (
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setParentMode("code");
                      setLoginError(null);
                    }}
                    className={cn(
                      "rounded-lg px-2 py-2 text-xs font-bold transition-colors",
                      parentMode === "code" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    )}
                  >
                    {t("auth:tabs.parentCode")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParentMode("phone");
                      setLoginError(null);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors",
                      parentMode === "phone" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    )}
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {t("auth:parent.phoneSignIn")}
                  </button>
                </div>
              )}

              {parentMode === "code" ? (
                <div className="space-y-2">
                  <label htmlFor="parent-code" className="block text-sm font-semibold text-slate-700">
                    {t("auth:parent.accessCode")}
                  </label>
                  <input
                    id="parent-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={parentAccessCode}
                    onChange={(e) => {
                      setParentAccessCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setLoginError(null);
                    }}
                    className={cn(fieldClass, "text-center font-mono tracking-widest")}
                    placeholder={t("auth:parent.accessCodePlaceholder")}
                    required
                    pattern="[0-9]{6}"
                  />
                  <button
                    type="submit"
                    disabled={loading || parentAccessCode.length !== 6 || !parentSchoolSlug.trim()}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    {t("auth:parent.signInWithCode")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="parent-phone" className="block text-sm font-semibold text-slate-700">
                      {t("auth:parent.phoneNumber")}
                    </label>
                    <input
                      id="parent-phone"
                      type="tel"
                      autoComplete="tel"
                      value={parentPhone}
                      onChange={(e) => {
                        setParentPhone(e.target.value);
                        setPhoneCodeSent(false);
                        setLoginError(null);
                      }}
                      className={fieldClass}
                      placeholder={t("auth:parent.phonePlaceholder")}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleParentPhoneSendCode}
                    disabled={loading || !parentPhone.trim() || !parentSchoolSlug.trim()}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
                  >
                    {t("auth:parent.sendCode")}
                  </button>
                  <div className="space-y-2">
                    <label htmlFor="parent-phone-code" className="block text-sm font-semibold text-slate-700">
                      {t("auth:parent.verificationCode")}
                    </label>
                    <input
                      id="parent-phone-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={parentPhoneCode}
                      onChange={(e) => {
                        setParentPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setLoginError(null);
                      }}
                      className={cn(fieldClass, "text-center font-mono tracking-widest")}
                      placeholder={t("auth:parent.accessCodePlaceholder")}
                      required
                      pattern="[0-9]{6}"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || parentPhoneCode.length !== 6 || !parentPhone.trim() || !parentSchoolSlug.trim()}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    {t("auth:parent.signInWithPhone")}
                  </button>
                  {phoneCodeSent && (
                    <button
                      type="button"
                      onClick={handleParentPhoneSendCode}
                      disabled={loading}
                      className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {t("auth:parent.resendCode")}
                    </button>
                  )}
                </div>
              )}
            </form>
            )}

            <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
              <p className="text-center text-sm text-slate-500">
                {t("auth:newSchoolPrompt")}{" "}
                <Link
                  to="/register-school"
                  className="font-semibold text-blue-600 underline-offset-2 transition-colors hover:text-blue-700 hover:underline"
                >
                  {t("auth:registerSchool")}
                </Link>
              </p>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-slate-400">
                <Lock className="h-3 w-3 shrink-0" aria-hidden />
                {t("auth:secureNote")}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm font-medium text-white/70 sm:mt-7">
          <Link to="/" className="transition-colors hover:text-white">
            Gnet SMS
          </Link>
          {" · "}
          &copy; 2026
        </p>
      </motion.div>
    </div>
  );
};
