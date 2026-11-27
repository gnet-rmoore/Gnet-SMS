import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import type { LoginErrorSignal } from "../lib/loginError";

type LoginErrorInfo = { title: string; message: string; hint?: string };

/**
 * Friendly, detailed sign-in error toast. Renders a human title, a plain-language
 * explanation, and an actionable next step instead of raw system/status text.
 * Re-resolves copy on language change because translation happens at render.
 */
export function LoginErrorAlert({ signal }: { signal: LoginErrorSignal | null }) {
  const { t, i18n } = useTranslation(["auth", "errors"]);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    setDismissed(false);
  }, [signal]);

  React.useEffect(() => {
    if (!signal || dismissed) return;
    const timeout = window.setTimeout(() => setDismissed(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [signal, dismissed]);

  let info: LoginErrorInfo | null = null;
  if (signal) {
    switch (signal.case) {
      case "invalid":
        info = {
          title: t("auth:loginError.invalidTitle"),
          message: t("auth:loginError.invalidMessage"),
          hint: t("auth:loginError.invalidHint"),
        };
        break;
      case "form":
        info = {
          title: t("auth:loginError.formTitle"),
          message: t("auth:loginError.formMessage"),
        };
        break;
      case "notVerified":
        info = {
          title: t("auth:loginError.accessTitle"),
          message: t("errors:EMAIL_NOT_VERIFIED"),
          hint: t("auth:loginError.notVerifiedHint"),
        };
        break;
      case "inactive":
        info = {
          title: t("auth:loginError.accessTitle"),
          message: t("auth:loginError.inactiveMessage"),
          hint: t("auth:loginError.inactiveHint"),
        };
        break;
      case "forbidden":
        info = {
          title: t("auth:loginError.accessTitle"),
          message: t("errors:FORBIDDEN"),
          hint: t("auth:loginError.genericHint"),
        };
        break;
      case "rateLimited":
        info = {
          title: t("auth:loginError.rateTitle"),
          message: t("errors:RATE_LIMITED"),
          hint: t("auth:loginError.rateHint"),
        };
        break;
      case "down":
        info = {
          title: t("auth:loginError.downTitle"),
          message: t("auth:loginError.downMessage"),
          hint: t("auth:loginError.downHint"),
        };
        break;
      case "notFound":
        info = {
          title: t("auth:loginError.downTitle"),
          message: t("auth:loginError.notFoundMessage"),
          hint: t("auth:loginError.notFoundHint"),
        };
        break;
      case "maintenance":
        info = {
          title: t("auth:loginError.downTitle"),
          message: t("auth:loginError.maintenanceMessage"),
          hint: t("auth:loginError.maintenanceHint"),
        };
        break;
      case "offline":
        info = {
          title: t("auth:loginError.offlineTitle"),
          message: t("auth:loginError.offlineMessage"),
        };
        break;
      case "warming":
        info = {
          title: t("auth:loginError.downTitle"),
          message: t("auth:serverWarming"),
          hint: t("auth:loginError.downHint"),
        };
        break;
      case "mfa":
        info = {
          title: t("auth:loginError.mfaTitle"),
          message: t("auth:loginError.mfaMessage"),
          hint: t("auth:loginError.mfaHint"),
        };
        break;
      case "mfaEnroll":
        info = {
          title: t("auth:loginError.accessTitle"),
          message: t("auth:loginError.mfaEnrollMessage"),
          hint: t("auth:loginError.mfaEnrollHint"),
        };
        break;
      case "parentCode":
        info = {
          title: t("auth:loginError.parentCodeTitle"),
          message: t("auth:loginError.parentCodeMessage"),
          hint: t("auth:loginError.parentCodeHint"),
        };
        break;
      case "parentPhone":
        info = {
          title: t("auth:loginError.parentPhoneTitle"),
          message: t("auth:loginError.parentPhoneMessage"),
          hint: t("auth:loginError.parentPhoneHint"),
        };
        break;
      case "parentPhoneUnavailable":
        info = {
          title: t("auth:loginError.parentPhoneUnavailableTitle"),
          message: t("auth:loginError.parentPhoneUnavailableMessage"),
          hint: t("auth:loginError.parentPhoneUnavailableHint"),
        };
        break;
      case "noSchool":
        info = {
          title: t("auth:loginError.genericTitle"),
          message: t("auth:noSchool"),
          hint: t("auth:loginError.genericHint"),
        };
        break;
      case "code": {
        const key = signal.code ? `errors:${signal.code}` : "";
        info = {
          title: t("auth:loginError.genericTitle"),
          message: key && i18n.exists(key) ? i18n.t(key) : t("errors:generic"),
          hint: t("auth:loginError.genericHint"),
        };
        break;
      }
      default:
        info = {
          title: t("auth:loginError.genericTitle"),
          message: t("errors:generic"),
          hint: t("auth:loginError.genericHint"),
        };
    }
  }

  return (
    <AnimatePresence>
      {info && !dismissed ? (
        <motion.div
          key="login-error"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          role="alert"
          aria-live="assertive"
          className="fixed inset-x-4 top-20 z-[120] mx-auto w-full max-w-sm rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-900 shadow-[0_12px_40px_rgba(15,23,42,0.18)] sm:inset-x-auto sm:right-6 sm:top-24"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-bold leading-snug">{info.title}</p>
              <p className="text-sm font-medium leading-relaxed text-rose-800">{info.message}</p>
              {info.hint ? (
                <p className="text-sm leading-relaxed text-rose-700/90">{info.hint}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label={t("common:close")}
              className="-me-1 -mt-1 rounded-lg p-1 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
