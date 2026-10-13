import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";

/**
 * Dev/console Stripe stand-in. Completes checkout via finance public API.
 */
export default function MockCheckoutPage() {
  const { t, i18n } = useTranslation(["public", "common", "errors"]);
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const feeId = params.get("fee_id") || "";
  const returnTo = params.get("return_to") || "";
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState("");
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  const safeReturn =
    returnTo.startsWith("/") || returnTo.startsWith(window.location.origin)
      ? returnTo.startsWith("http")
        ? returnTo
        : returnTo
      : "";

  const pay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data) || data.error || t("public:checkout.failed"));
      }
      setDone(true);
      if (safeReturn) {
        window.setTimeout(() => {
          window.location.href = safeReturn;
        }, 800);
      }
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
          id="public-checkout-lang"
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
        className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {t("public:checkout.title")}
            </h1>
            <p className="text-sm text-slate-500">{t("public:checkout.subtitle")}</p>
          </div>
        </div>

        <p className="text-xs font-mono text-slate-400 break-all">
          {t("public:checkout.fee")}: {feeId || "—"}
        </p>
        <p className="text-xs font-mono text-slate-400 break-all">
          {t("public:checkout.session")}: {sessionId || "—"}
        </p>

        {done ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-5 h-5" /> {t("public:checkout.success")}
            </p>
            {safeReturn ? (
              <p className="text-sm text-slate-500">{t("public:checkout.returning")}</p>
            ) : (
              <Link to="/login" className="inline-block text-indigo-600 font-semibold text-sm">
                {t("public:checkout.backToLogin")}
              </Link>
            )}
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="button"
              disabled={loading || !sessionId}
              onClick={pay}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-bold disabled:opacity-40 transition-colors"
            >
              {loading ? t("public:checkout.paying") : t("public:checkout.pay")}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
