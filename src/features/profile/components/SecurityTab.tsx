import React from "react";
import { motion } from "motion/react";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  CheckCircle2,
  Circle,
  Clock,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  evaluatePassword,
  parseSecurityPolicy,
  passwordStrengthScore,
  validatePasswordAgainstPolicy,
  type SecurityPolicy,
} from "../../../lib/securityPolicy";
import { MfaProfilePanel } from "../../mfa/MfaProfilePanel";

type Props = {
  userId: string;
  securityPolicyRaw?: string | object | null;
  saving: boolean;
  onSubmit: (payload: {
    currentPassword: string;
    password: string;
  }) => Promise<void>;
};

const fieldClass =
  "w-full ps-11 pe-11 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 rounded-xl outline-none text-slate-900 font-medium transition-all text-sm";

function StrengthMeter({ score, labels }: { score: number; labels: string[] }) {
  const colors = [
    "bg-slate-200",
    "bg-rose-400",
    "bg-amber-400",
    "bg-blue-500",
    "bg-emerald-500",
  ];
  const label = labels[Math.min(score, labels.length - 1)] || labels[0];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              score >= i ? colors[score] : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-slate-300" />
      )}
      <span className={ok ? "font-medium text-slate-700" : "text-slate-500"}>{label}</span>
    </li>
  );
}

export function SecurityTab({ userId, securityPolicyRaw, saving, onSubmit }: Props) {
  const { t } = useTranslation(["pages", "common", "errors"]);
  const p = (key: string, opts?: Record<string, unknown>) => t(`profile.${key}`, opts);

  const policy: SecurityPolicy = React.useMemo(
    () => parseSecurityPolicy(securityPolicyRaw),
    [securityPolicyRaw]
  );

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checks = evaluatePassword(password, confirmPassword, currentPassword, policy);
  const score = passwordStrengthScore(password, policy);
  const strengthLabels = [
    p("strengthEmpty"),
    p("strengthWeak"),
    p("strengthFair"),
    p("strengthGood"),
    p("strengthStrong"),
  ];

  const allRequired =
    Boolean(currentPassword) &&
    checks.minLength &&
    checks.matchesConfirm &&
    checks.differsFromCurrent &&
    (!policy.requireStrongPassword || (checks.hasLetter && checks.hasNumber));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(p("enterCurrentPassword"));
      return;
    }
    if (!password) {
      setError(p("enterNewPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(p("passwordsMismatch"));
      return;
    }
    if (!checks.differsFromCurrent) {
      setError(p("passwordMustDiffer"));
      return;
    }
    const policyErr = validatePasswordAgainstPolicy(password, policy);
    if (policyErr) {
      setError(
        policy.requireStrongPassword && (!checks.hasLetter || !checks.hasNumber)
          ? p("passwordNeedLetterNumber")
          : p("passwordMinLengthDynamic", { count: policy.passwordMinLength })
      );
      return;
    }

    try {
      await onSubmit({ currentPassword, password });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err: any) {
      setError(err?.message || p("passwordUpdateFailed"));
    }
  };

  void userId; // reserved for future audit / device session APIs

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <motion.form
        key="security-form"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onSubmit={handleSubmit}
        className="lg:col-span-3 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {p("passwordSection")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{p("passwordHintDynamic", {
              count: policy.passwordMinLength,
            })}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {p("currentPassword")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={fieldClass}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showCurrent ? p("hidePassword") : p("showPassword")}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {p("newPassword")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showNew ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showNew ? p("hidePassword") : p("showPassword")}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password ? <StrengthMeter score={score} labels={strengthLabels} /> : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {p("confirmPasswordLabel")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showConfirm ? p("hidePassword") : p("showPassword")}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {p("requirementsTitle")}
          </p>
          <ul className="space-y-2">
            <CheckRow
              ok={checks.minLength}
              label={p("reqMinLength", { count: policy.passwordMinLength })}
            />
            {policy.requireStrongPassword ? (
              <>
                <CheckRow ok={checks.hasLetter} label={p("reqLetter")} />
                <CheckRow ok={checks.hasNumber} label={p("reqNumber")} />
              </>
            ) : null}
            <CheckRow ok={checks.matchesConfirm} label={p("reqMatch")} />
            <CheckRow ok={checks.differsFromCurrent} label={p("reqDifferent")} />
          </ul>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving || !allRequired}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            {saving ? p("updating") : p("updatePassword")}
          </button>
        </div>
      </motion.form>

      <motion.aside
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="lg:col-span-2 space-y-4"
      >
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">
              {p("accountSecurityTitle")}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-500">{p("accountSecurityBody")}</p>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-800">{p("sessionIdleTitle")}</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  {policy.sessionIdleMinutes > 0
                    ? p("sessionIdleOn", { count: policy.sessionIdleMinutes })
                    : p("sessionIdleOff")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="w-full space-y-3">
                <p className="text-sm font-bold text-slate-800">{p("mfaTitle")}</p>
                <MfaProfilePanel />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs leading-relaxed text-slate-500">
          {p("securityFooterHint")}
        </div>
      </motion.aside>
    </div>
  );
}
