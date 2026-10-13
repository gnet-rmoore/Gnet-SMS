import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { MailCheck, Loader2, ArrowRight } from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import { Button } from "../components/ui";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { t, i18n } = useTranslation(["public", "common", "errors"]);
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );
  const [state, setState] = React.useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(t("public:verifyEmail.missingToken"));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(translateApiError(data) || data.error || t("public:verifyEmail.failed"));
        }
        if (!cancelled) {
          setState("ok");
          setMessage(t("public:verifyEmail.success"));
        }
      } catch (err: any) {
        if (!cancelled) {
          setState("error");
          setMessage(translateApiError(err) || err.message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="absolute top-6 end-6">
        <LanguageSelect
          id="verify-email-lang"
          value={locale}
          onChange={setLocale}
          applyImmediately
          hint={null}
          className="w-44 shrink-0"
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-5 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
          {state === "loading" ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <MailCheck className="h-6 w-6 text-white" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {t("public:verifyEmail.title")}
        </h1>
        <p
          className={
            state === "error" ? "text-sm text-rose-600" : "text-sm text-slate-600"
          }
        >
          {message || t("public:verifyEmail.working")}
        </p>
        {state === "ok" ? (
          <Link to="/login">
            <Button className="w-full">
              {t("public:verifyEmail.signIn")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : null}
      </motion.div>
    </div>
  );
}
