import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, Ban, ShieldCheck } from "lucide-react";
import { receiptsApi } from "../services/receiptsApi";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";

type VerifyState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "result"; data: any };

function statusVisual(
  data: any,
  t: (key: string) => string
): {
  icon: typeof XCircle;
  label: string;
  tone: string;
  detail: string;
} {
  if (!data?.signatureValid || data.status === "NOT_FOUND") {
    return {
      icon: XCircle,
      label: t("public:receipt.invalid"),
      tone: "text-rose-700 bg-rose-50 border-rose-100",
      detail: t("public:receipt.invalidDetail"),
    };
  }
  if (data.status === "VOIDED" || data.status === "SUPERSEDED") {
    return {
      icon: Ban,
      label:
        data.status === "VOIDED" ? t("public:receipt.voided") : t("public:receipt.superseded"),
      tone: "text-amber-800 bg-amber-50 border-amber-100",
      detail: t("public:receipt.voidedDetail"),
    };
  }
  if (data.valid && data.status === "ISSUED") {
    return {
      icon: CheckCircle2,
      label: t("public:receipt.valid"),
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
      detail: t("public:receipt.validDetail"),
    };
  }
  return {
    icon: XCircle,
    label: t("public:receipt.invalid"),
    tone: "text-rose-700 bg-rose-50 border-rose-100",
    detail: t("public:receipt.invalidConfirm"),
  };
}

export default function PublicReceiptVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const { t, i18n } = useTranslation(["public", "common", "errors"]);
  const [state, setState] = React.useState<VerifyState>({ kind: "loading" });
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  React.useEffect(() => {
    if (!code) {
      setState({ kind: "error", message: t("public:receipt.missingCode") });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await receiptsApi.verifyPublic(code);
        if (!cancelled) setState({ kind: "result", data });
      } catch (err: any) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: translateApiError(err) || err.message || t("public:receipt.failed"),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  const visual = state.kind === "result" ? statusVisual(state.data, t) : null;
  const Icon = visual?.icon || ShieldCheck;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <div className="absolute top-6 end-6">
        <LanguageSelect
          id="public-receipt-lang"
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
        className="max-w-lg w-full rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6"
      >
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("public:receipt.eyebrow")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t("public:receipt.authenticity")}
          </h1>
          <p className="text-sm text-slate-500">{t("public:receipt.subtitleDetail")}</p>
        </div>

        {state.kind === "loading" && (
          <p className="text-sm text-slate-500">{t("public:receipt.checking")}</p>
        )}

        {state.kind === "error" && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            {state.message}
          </div>
        )}

        {state.kind === "result" && visual && (
          <div className="space-y-4">
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold ${visual.tone}`}
            >
              <Icon className="w-4 h-4" />
              {visual.label}
            </div>
            <p className="text-sm text-slate-600">{visual.detail}</p>

            {state.data.status !== "NOT_FOUND" && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-900">{t("public:receipt.number")}:</span>{" "}
                  <span className="font-mono">{state.data.receiptNumber || "—"}</span>
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t("public:receipt.type")}:</span>{" "}
                  <span className="font-mono">{state.data.type || "—"}</span>
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t("public:receipt.amount")}:</span>{" "}
                  <span className="font-mono">
                    {state.data.currency || "USD"}{" "}
                    {Number(state.data.amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t("public:receipt.payer")}:</span>{" "}
                  {state.data.payerName || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t("public:receipt.payee")}:</span>{" "}
                  {state.data.payeeName || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">
                    {t("public:receipt.fingerprint")}:
                  </span>{" "}
                  <span className="font-mono text-xs break-all">
                    {(state.data.payloadHash || "").slice(0, 16)}…
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <Link to="/login" className="text-indigo-600 font-semibold text-sm inline-block">
          {t("public:receipt.staffLogin")}
        </Link>
      </motion.div>
    </div>
  );
}
