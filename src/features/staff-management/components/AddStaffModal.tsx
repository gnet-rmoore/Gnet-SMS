import React, { useMemo, useState } from "react";
import {
  X,
  UserPlus,
  Briefcase,
  UserRound,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { STAFF_CREATE_ROLES, staffRoleLabel } from "../../../constants/roles";

export type AddStaffFormValues = {
  name: string;
  email: string;
  role: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  joiningDate: string;
  passwordMode: "auto" | "custom";
  password: string;
  mustChangePassword: boolean;
  isActive: boolean;
};

const emptyForm = (): AddStaffFormValues => ({
  name: "",
  email: "",
  role: "TEACHER",
  phone: "",
  dob: "",
  gender: "",
  address: "",
  joiningDate: new Date().toISOString().split("T")[0],
  passwordMode: "auto",
  password: "",
  mustChangePassword: true,
  isActive: true,
});

const fieldClass =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

type Props = {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<{ temporaryPassword?: string } | void>;
};

export function AddStaffModal({ open, submitting, onClose, onSubmit }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [form, setForm] = useState<AddStaffFormValues>(emptyForm);
  const [error, setError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const roleGroups = useMemo(
    () => [
      {
        label: t("pages:staff.roleGroupLeadership"),
        roles: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"] as const,
      },
      {
        label: t("pages:staff.roleGroupAcademic"),
        roles: ["TEACHER", "REGISTRAR", "COUNSELOR", "LIBRARIAN", "NURSE"] as const,
      },
      {
        label: t("pages:staff.roleGroupOperations"),
        roles: [
          "ACCOUNTANT",
          "IT_ADMIN",
          "PROCUREMENT",
          "TRANSPORTATION",
          "MAINTENANCE",
          "SECURITY",
          "ATHLETICS_DIRECTOR",
          "HOSTEL_WARDEN",
          "CAFETERIA_MANAGER",
        ] as const,
      },
    ],
    [t]
  );

  if (!open) return null;

  const set =
    <K extends keyof AddStaffFormValues>(key: K, value: AddStaffFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setForm(emptyForm());
    setError("");
    setCreatedCreds(null);
    setCopied(false);
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.passwordMode === "custom" && form.password.trim().length < 8) {
      setError(t("pages:staff.passwordMinLength"));
      return;
    }

    try {
      const result = await onSubmit({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        address: form.address.trim() || undefined,
        joiningDate: form.joiningDate || undefined,
        password: form.passwordMode === "custom" ? form.password.trim() : undefined,
        mustChangePassword: form.mustChangePassword,
        isActive: form.isActive,
      });

      const temp =
        (result as any)?.temporaryPassword ||
        (form.passwordMode === "custom" ? form.password.trim() : undefined);

      if (temp) {
        setCreatedCreds({ email: form.email.trim().toLowerCase(), password: temp });
      } else {
        handleClose();
      }
    } catch (err: any) {
      setError(err?.message || t("pages:staff.addFailed"));
    }
  };

  const copyCredentials = async () => {
    if (!createdCreds) return;
    const text = `${t("common:email")}: ${createdCreds.email}\n${t("common:temporaryPassword")}: ${createdCreds.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("pages:staff.copyFailed"));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden"
        role="dialog"
        aria-labelledby="add-staff-title"
      >
        <div className="shrink-0 px-8 py-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-br from-slate-950 to-slate-900 text-white">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
              {createdCreds ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <UserPlus className="w-5 h-5 text-indigo-300" />}
            </div>
            <div>
              <h2 id="add-staff-title" className="text-xl font-extrabold tracking-tight">
                {createdCreds ? t("pages:staff.added") : t("pages:staff.add")}
              </h2>
              <p className="text-sm text-slate-300 font-medium mt-0.5">
                {createdCreds
                  ? t("pages:staff.addedSubtitle")
                  : t("pages:staff.addSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdCreds ? (
          <div className="p-8 space-y-6 overflow-y-auto">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 space-y-3">
              <p className="text-sm font-semibold text-emerald-900">
                {t("pages:staff.tempCredsHint")}
              </p>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between gap-3 rounded-xl bg-white border border-emerald-100 px-4 py-3">
                  <span className="text-slate-500">{t("common:email")}</span>
                  <span className="text-slate-900 font-semibold break-all text-end">{createdCreds.email}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-xl bg-white border border-emerald-100 px-4 py-3">
                  <span className="text-slate-500">{t("common:password")}</span>
                  <span className="text-slate-900 font-semibold">{createdCreds.password}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t("common:copied") : t("pages:staff.copyCredentials")}
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
            >
              {t("common:done")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="p-8 space-y-8 overflow-y-auto">
              {error && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold tracking-tight">{t("pages:staff.accountSection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="staff-name">{t("common:fullName")}</label>
                    <input
                      id="staff-name"
                      className={fieldClass}
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Jane Smith"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="staff-email">{t("pages:staff.workEmail")}</label>
                    <input
                      id="staff-email"
                      type="email"
                      className={fieldClass}
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="jane@school.edu"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="staff-phone">{t("common:phone")}</label>
                    <input
                      id="staff-phone"
                      type="tel"
                      className={fieldClass}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+1 555 0100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="staff-role">{t("common:role")}</label>
                    <select
                      id="staff-role"
                      className={fieldClass}
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
                      required
                    >
                      {roleGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.roles
                            .filter((r) => (STAFF_CREATE_ROLES as readonly string[]).includes(r))
                            .map((r) => (
                              <option key={r} value={r}>
                                {staffRoleLabel(r)}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <UserRound className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold tracking-tight">{t("pages:staff.personalSection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="staff-dob">{t("common:dateOfBirth")}</label>
                    <input
                      id="staff-dob"
                      type="date"
                      className={fieldClass}
                      value={form.dob}
                      onChange={(e) => set("dob", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="staff-gender">{t("common:gender")}</label>
                    <select
                      id="staff-gender"
                      className={fieldClass}
                      value={form.gender}
                      onChange={(e) => set("gender", e.target.value)}
                    >
                      <option value="">{t("pages:staff.preferNotToSay")}</option>
                      <option value="MALE">{t("common:male")}</option>
                      <option value="FEMALE">{t("common:female")}</option>
                      <option value="OTHER">{t("common:other")}</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="staff-address">{t("common:address")}</label>
                    <textarea
                      id="staff-address"
                      className={`${fieldClass} min-h-[88px] resize-y`}
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Street, city, postal code"
                      rows={3}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold tracking-tight">{t("pages:staff.employmentSection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="staff-join">{t("pages:staff.dateOfJoining")}</label>
                    <input
                      id="staff-join"
                      type="date"
                      className={fieldClass}
                      value={form.joiningDate}
                      onChange={(e) => set("joiningDate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => set("isActive", e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-semibold text-slate-800">{t("pages:staff.activeAccount")}</span>
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold tracking-tight">{t("pages:staff.loginAccess")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set("passwordMode", "auto")}
                    className={`text-start px-4 py-3 rounded-2xl border transition-colors ${
                      form.passwordMode === "auto"
                        ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-bold">{t("pages:staff.generatePassword")}</p>
                    <p className="text-xs mt-1 opacity-80">{t("pages:staff.generatePasswordHint")}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("passwordMode", "custom")}
                    className={`text-start px-4 py-3 rounded-2xl border transition-colors ${
                      form.passwordMode === "custom"
                        ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-bold">{t("pages:staff.setPassword")}</p>
                    <p className="text-xs mt-1 opacity-80">{t("pages:staff.setPasswordHint")}</p>
                  </button>
                </div>
                {form.passwordMode === "custom" && (
                  <div className="relative">
                    <label className={labelClass} htmlFor="staff-password">{t("common:password")}</label>
                    <input
                      id="staff-password"
                      type={showPassword ? "text" : "password"}
                      className={`${fieldClass} pe-12`}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute end-3 bottom-3 p-1.5 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? t("pages:staff.hidePassword") : t("pages:staff.showPassword")}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                <label className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.mustChangePassword}
                    onChange={(e) => set("mustChangePassword", e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{t("pages:staff.requirePasswordChange")}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{t("pages:staff.requirePasswordChangeHint")}</span>
                  </span>
                </label>
              </section>
            </div>

            <div className="shrink-0 px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-white transition-colors"
              >
                {t("common:cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {submitting ? t("pages:staff.adding") : t("pages:staff.add")}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
