import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Eye, EyeOff, Lock, LogOut, CheckCircle2, Circle } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { LoginBackground } from "./LoginBackground";
import { PageToast, usePageToast } from "../features/academics-shared/PageToast";
import { api } from "../services/api";
import { translateApiError } from "../i18n/apiErrors";
import { getPostLoginPath } from "../lib/postLoginPath";
import {
  evaluatePassword,
  parseSecurityPolicy,
  passwordStrengthScore,
  validatePasswordAgainstPolicy,
  type SecurityPolicy,
} from "../lib/securityPolicy";
import { cn } from "../lib/cn";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-10 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgb(15_23_42/0.03)] outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15";

function StrengthMeter({ score, label }: { score: number; label: string }) {
  const colors = ["bg-slate-200", "bg-rose-400", "bg-amber-400", "bg-blue-500", "bg-emerald-500"];
  const active = colors[score] || colors[0];
  return (
    <div
      className="space-y-1.5"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", score >= i ? active : "bg-slate-100")}
          />
        ))}
      </div>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
    </div>
  );
}

function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
      )}
      <span className={ok ? "font-medium text-slate-700" : "text-slate-500"}>{label}</span>
    </li>
  );
}

export const MustChangePassword = () => {
  const { t } = useTranslation(["auth", "pages", "common"]);
  const p = (key: string, opts?: Record<string, unknown>) => t(`pages:profile.${key}`, opts);
  const { user, school, accessToken, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const { toast, showToast } = usePageToast(4500);

  const [policy, setPolicy] = React.useState<SecurityPolicy>(() =>
    parseSecurityPolicy(school?.securityPolicy)
  );

  React.useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = (await api.get("/api/auth/me")) as {
          user?: { mustChangePassword?: boolean };
          school?: { securityPolicy?: string | object | null } | null;
          accessToken?: string;
          capabilities?: string[] | null;
          entitlements?: string[] | null;
          quotas?: unknown;
        };
        if (cancelled) return;
        if (session.school?.securityPolicy !== undefined) {
          setPolicy(parseSecurityPolicy(session.school.securityPolicy));
        }
      } catch {
        /* use login-time school policy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checks = evaluatePassword(password, confirmPassword, currentPassword, policy);
  const strengthScore = passwordStrengthScore(password, policy);
  const strengthLabels = [
    p("strengthEmpty"),
    p("strengthWeak"),
    p("strengthFair"),
    p("strengthGood"),
    p("strengthStrong"),
  ];
  const strengthLabel = strengthLabels[Math.min(strengthScore, strengthLabels.length - 1)] || strengthLabels[0];

  const policyHint = policy.requireStrongPassword
    ? t("auth:mustChangePasswordPolicyStrong", { count: policy.passwordMinLength })
    : t("auth:mustChangePasswordPolicyMin", { count: policy.passwordMinLength });

  React.useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }
    if (user && !user.mustChangePassword) {
      navigate(getPostLoginPath(user, school), { replace: true });
    }
  }, [accessToken, user, school, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(null);

    if (!currentPassword) {
      setError(t("pages:profile.enterCurrentPassword"));
      return;
    }
    if (!password) {
      setError(t("pages:profile.enterNewPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("pages:profile.passwordsMismatch"));
      return;
    }
    if (!checks.differsFromCurrent) {
      setError(t("pages:profile.passwordMustDiffer"));
      return;
    }
    const policyErr = validatePasswordAgainstPolicy(password, policy);
    if (policyErr) {
      setError(
        policy.requireStrongPassword && (!checks.hasLetter || !checks.hasNumber)
          ? t("pages:profile.passwordNeedLetterNumber")
          : t("pages:profile.passwordMinLengthDynamic", { count: policy.passwordMinLength })
      );
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/api/users/${user.id}`, {
        password,
        currentPassword,
      });
      updateUser({ mustChangePassword: false });
      showToast(t("pages:profile.passwordUpdated"), "success");
      navigate(getPostLoginPath({ ...user, mustChangePassword: false }, school), {
        replace: true,
      });
    } catch (err: unknown) {
      const message =
        translateApiError(err) ||
        (err instanceof Error ? err.message : t("pages:profile.passwordUpdateFailed"));
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!accessToken || !user?.mustChangePassword) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-100 text-sm text-slate-500">
        {t("common:loading")}
      </div>
    );
  }

  const fieldBlock = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggleShow: () => void,
    autoComplete: string,
    footer?: React.ReactNode
  ) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div className="relative group">
        <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={show ? t("auth:hidePassword") : t("auth:showPassword")}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {footer}
    </div>
  );

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <PageToast toast={toast} />
      <LoginBackground className="pointer-events-none absolute inset-0" />

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_24px_64px_rgba(2,6,23,0.45)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Lock className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  {t("auth:mustChangePasswordTitle")}
                </h1>
                <p className="truncate text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-snug text-slate-500">
              {t("auth:mustChangePasswordHint")}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{policyHint}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5" noValidate>
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
              >
                {error}
              </div>
            ) : null}

            {fieldBlock(
              "mcp-current",
              t("pages:profile.currentPassword"),
              currentPassword,
              setCurrentPassword,
              showCurrent,
              () => setShowCurrent((v) => !v),
              "current-password"
            )}

            {fieldBlock(
              "mcp-new",
              t("pages:profile.newPassword"),
              password,
              setPassword,
              showNew,
              () => setShowNew((v) => !v),
              "new-password",
              <StrengthMeter score={strengthScore} label={strengthLabel} />
            )}

            {fieldBlock(
              "mcp-confirm",
              t("pages:profile.confirmPasswordLabel"),
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              () => setShowConfirm((v) => !v),
              "new-password"
            )}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                {p("requirementsTitle")}
              </p>
              <ul className="space-y-2">
                <RequirementRow
                  ok={checks.minLength}
                  label={p("reqMinLength", { count: policy.passwordMinLength })}
                />
                {policy.requireStrongPassword ? (
                  <>
                    <RequirementRow ok={checks.hasLetter} label={p("reqLetter")} />
                    <RequirementRow ok={checks.hasNumber} label={p("reqNumber")} />
                  </>
                ) : null}
                <RequirementRow ok={checks.matchesConfirm} label={p("reqMatch")} />
                <RequirementRow ok={checks.differsFromCurrent} label={p("reqDifferent")} />
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "flex min-h-10 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5",
                  "text-sm font-bold text-white transition-colors hover:bg-indigo-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {saving ? t("pages:profile.updating") : t("auth:mustChangePasswordContinue")}
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="flex min-h-8 w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                {t("auth:mustChangePasswordSignOut")}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
