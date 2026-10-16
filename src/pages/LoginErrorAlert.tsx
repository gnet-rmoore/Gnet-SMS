import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import type { LoginErrorSignal } from "../lib/loginError";

type LoginErrorInfo = { title: string; message: string; hint?: string };

/**
 * Friendly, detailed sign-in error card. Renders a human title, a plain-language
 * explanation, and an actionable next step instead of raw system/status text.
 * Re-resolves copy on language change because translation happens at render.
 */
export function LoginErrorAlert({ signal }: { signal: LoginErrorSignal | null }) {
  const { t, i18n } = useTranslation(["auth", "errors"]);

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
      {info ? (
        <motion.div
          key="login-error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          role="alert"
          aria-live="assertive"
          className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold leading-snug">{info.title}</p>
            <p className="text-sm font-medium leading-relaxed text-rose-800">{info.message}</p>
            {info.hint ? (
              <p className="text-sm leading-relaxed text-rose-700/90">{info.hint}</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
