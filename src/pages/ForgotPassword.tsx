import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { KeyRound, ArrowRight, Mail } from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import { Button, TextField } from "../components/ui";

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation(["public", "common", "errors", "auth"]);
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data) || data.error || t("public:forgotPassword.failed"));
      }
      setSent(true);
    } catch (err: any) {
      setError(translateApiError(err) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="absolute top-6 end-6">
        <LanguageSelect
          id="forgot-password-lang"
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
        className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {t("public:forgotPassword.title")}
            </h1>
            <p className="text-sm text-slate-500">{t("public:forgotPassword.subtitle")}</p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {t("public:forgotPassword.sent")}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <TextField
              label={t("common:email")}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth:emailPlaceholder")}
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("common:loading") : t("public:forgotPassword.submit")}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          {t("public:forgotPassword.backToLogin")}
        </Link>
      </motion.div>
    </div>
  );
}
