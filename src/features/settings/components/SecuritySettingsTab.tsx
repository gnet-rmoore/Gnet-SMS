import React from "react";
import { motion } from "motion/react";
import { Shield, Save, RefreshCw, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MfaMode } from "../../../lib/securityPolicy";

export type SecurityPolicyForm = {
  passwordMinLength: number;
  requireStrongPassword: boolean;
  sessionIdleMinutes: number;
  forcePasswordChangeDays: number;
  mfaMode: MfaMode;
  mfaRequiredRoles: string[];
  allowSmsMfa: boolean;
};

const STAFF_ROLES = [
  "SCHOOL_ADMIN",
  "TEACHER",
  "REGISTRAR",
  "ACCOUNTANT",
  "PRINCIPAL",
  "VPA",
  "VPI",
  "LIBRARIAN",
  "NURSE",
  "COUNSELOR",
];

type Props = {
  policy: SecurityPolicyForm;
  setPolicy: (p: SecurityPolicyForm) => void;
  saving: boolean;
  onSave: () => void;
};

export function SecuritySettingsTab({ policy, setPolicy, saving, onSave }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const s = (key: string) => t(`settings.securityTab.${key}`);

  const patch = (partial: Partial<SecurityPolicyForm>) =>
    setPolicy({ ...policy, ...partial });

  const toggleRole = (role: string) => {
    const set = new Set(policy.mfaRequiredRoles);
    if (set.has(role)) set.delete(role);
    else set.add(role);
    patch({ mfaRequiredRoles: [...set] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          {s("title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{s("subtitle")}</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {s("minLength")}
          </label>
          <input
            type="number"
            min={6}
            max={32}
            value={policy.passwordMinLength}
            onChange={(e) =>
              patch({
                passwordMinLength: Math.min(
                  32,
                  Math.max(6, Number(e.target.value) || 6)
                ),
              })
            }
            className="mt-1.5 w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 rounded-xl outline-none text-slate-900 font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">{s("minLengthHint")}</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policy.requireStrongPassword}
            onChange={(e) => patch({ requireStrongPassword: e.target.checked })}
            className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <span className="text-sm font-bold text-slate-800 block">
              {s("requireLetterNumber")}
            </span>
            <span className="text-xs text-slate-500">{s("requireLetterNumberHint")}</span>
          </span>
        </label>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {s("sessionIdle")}
          </label>
          <input
            type="number"
            min={0}
            value={policy.sessionIdleMinutes}
            onChange={(e) =>
              patch({ sessionIdleMinutes: Math.max(0, Number(e.target.value) || 0) })
            }
            className="mt-1.5 w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 rounded-xl outline-none text-slate-900 font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">{s("sessionIdleHint")}</p>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {s("forcePasswordChange")}
          </label>
          <input
            type="number"
            min={0}
            value={policy.forcePasswordChangeDays}
            onChange={(e) =>
              patch({
                forcePasswordChangeDays: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-1.5 w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 rounded-xl outline-none text-slate-900 font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">{s("forcePasswordChangeHint")}</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-100 pt-8">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-600" />
          Two-factor authentication (TOTP)
        </h3>
        <p className="text-sm text-slate-500">
          Authenticator apps (Google Authenticator, Authy, etc.). SMS OTP is planned for a later release.
        </p>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            MFA mode
          </label>
          <select
            value={policy.mfaMode}
            onChange={(e) => patch({ mfaMode: e.target.value as MfaMode })}
            className="mt-1.5 w-full max-w-md px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          >
            <option value="OFF">Off</option>
            <option value="OPTIONAL">Optional — users may enroll</option>
            <option value="REQUIRED">Required for selected roles</option>
          </select>
        </div>
        {policy.mfaMode === "REQUIRED" && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Required roles (empty = all staff)
            </p>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map((role) => (
                <label
                  key={role}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={policy.mfaRequiredRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  {role.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>
        )}
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={policy.allowSmsMfa}
            onChange={(e) => patch({ allowSmsMfa: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600"
          />
          Allow SMS OTP (console provider sends code via email in dev)
        </label>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? s("saving") : s("savePolicy")}
        </button>
      </div>
    </motion.div>
  );
}
