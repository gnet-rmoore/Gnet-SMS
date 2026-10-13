import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { Button, Surface } from "../../../components/ui";

export type EnrollCredentials = {
  studentEmail?: string;
  studentPassword?: string;
  parentEmail?: string | null;
  parentPassword?: string;
  welcomeEmailSent?: boolean;
};

type Props = {
  credentials: EnrollCredentials;
  studentName?: string;
  classAssignFailed?: boolean;
  onDone: () => void;
};

export function EnrollCredentialsModal({
  credentials,
  studentName,
  classAssignFailed,
  onDone,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onDone} />
      <Surface className="relative z-10 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold tracking-tight text-slate-900">
              {t("admissions.enrollCredentials.enrolled", {
                name: studentName || t("admissions.enrollCredentials.enrolledFallback"),
              })}
            </p>
            <p className="text-sm text-slate-600 font-medium mt-0.5">
              {t("admissions.enrollCredentials.copyOnce")}
              {credentials.welcomeEmailSent ? t("admissions.enrollCredentials.welcomeEmailSent") : ""}
            </p>
            {classAssignFailed ? (
              <p className="text-sm text-amber-700 font-medium mt-2">
                {t("admissions.enrollCredentials.classAssignFailed")}
              </p>
            ) : null}
          </div>
        </div>

        {credentials.studentEmail ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("admissions.enrollCredentials.student")}</p>
            <CredRow
              label={t("admissions.enrollCredentials.email")}
              value={credentials.studentEmail}
              copied={copied === "student-email"}
              onCopy={() => copyText(credentials.studentEmail!, "student-email")}
              copyAria={t("admissions.enrollCredentials.copyLabel", { label: t("admissions.enrollCredentials.email") })}
            />
            {credentials.studentPassword ? (
              <CredRow
                label={t("admissions.enrollCredentials.tempPassword")}
                value={credentials.studentPassword}
                copied={copied === "student-pass"}
                onCopy={() => copyText(credentials.studentPassword!, "student-pass")}
                copyAria={t("admissions.enrollCredentials.copyLabel", { label: t("admissions.enrollCredentials.tempPassword") })}
              />
            ) : (
              <p className="text-sm text-slate-500 font-medium">{t("admissions.enrollCredentials.existingStudentPassword")}</p>
            )}
          </div>
        ) : null}

        {credentials.parentEmail ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("admissions.enrollCredentials.parent")}</p>
            <CredRow
              label={t("admissions.enrollCredentials.email")}
              value={credentials.parentEmail}
              copied={copied === "parent-email"}
              onCopy={() => copyText(credentials.parentEmail!, "parent-email")}
              copyAria={t("admissions.enrollCredentials.copyLabel", { label: t("admissions.enrollCredentials.email") })}
            />
            {credentials.parentPassword ? (
              <CredRow
                label={t("admissions.enrollCredentials.tempPassword")}
                value={credentials.parentPassword}
                copied={copied === "parent-pass"}
                onCopy={() => copyText(credentials.parentPassword!, "parent-pass")}
                copyAria={t("admissions.enrollCredentials.copyLabel", { label: t("admissions.enrollCredentials.tempPassword") })}
              />
            ) : (
              <p className="text-sm text-slate-500 font-medium">{t("admissions.enrollCredentials.existingParentPassword")}</p>
            )}
          </div>
        ) : null}

        <Button type="button" className="w-full" onClick={onDone}>
          {t("common:done")}
        </Button>
      </Surface>
    </div>
  );
}

function CredRow({
  label,
  value,
  copied,
  onCopy,
  copyAria,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyAria: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="font-mono text-sm text-slate-900 truncate mt-0.5">{value}</p>
      </div>
      <Button type="button" variant="secondary" size="compact" onClick={onCopy} aria-label={copyAria}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
