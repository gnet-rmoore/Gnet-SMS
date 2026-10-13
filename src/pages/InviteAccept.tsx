import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { KeyRound, ArrowRight } from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["public", "common", "errors"]);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [ok, setOk] = React.useState(false);
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("public:invite.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("public:invite.passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data) || data.error || t("public:invite.failed"));
      }
      setOk(true);
      setTimeout(() => navigate("/login"), 1500);
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
          id="public-invite-lang"
          value={locale}
          onChange={setLocale}
          applyImmediately
          hint={null}
          className="w-44 shrink-0"
        />
      </div>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {t("public:invite.pageTitle")}
            </h1>
            <p className="text-sm text-slate-500">{t("public:invite.pageSubtitle")}</p>
          </div>
        </div>

        {ok ? (
          <p className="text-emerald-600 font-medium">{t("public:invite.success")}</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                {t("public:invite.newPassword")}
              </span>
              <input
                type="password"
                required
                minLength={8}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                {t("public:invite.confirmPassword")}
              </span>
              <input
                type="password"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600 text-white py-3 font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              {loading ? t("public:invite.saving") : t("public:invite.accept")}{" "}
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        <Link to="/login" className="block text-center text-sm text-slate-500">
          {t("public:invite.backToLogin")}
        </Link>
      </motion.form>
    </div>
  );
}
