import React from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Receipt, RefreshCw } from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import {
  buildApplyStatusUrl,
  loadApplyStatusCredentials,
  parseApplyStatusUrl,
} from "../lib/publicApplyStatus";
import { Button } from "../components/ui";
import { OnboardingStepper } from "../components/OnboardingStepper";

const inputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white";
const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500";

const formatMoney = (n: number | null | undefined) =>
  `$${Number(n || 0).toFixed(2)}`;

type StatusFee = {
  id: string;
  status: string | null;
  amount: number | null;
  amountPaid: number | null;
  balance: number | null;
  paid: boolean;
};

type StatusReceipt = {
  verifyCode: string;
  receiptNumber?: string | null;
  amount?: number | null;
};

type StatusPayload = {
  id: string;
  applicationNumber?: string | null;
  status: string;
  studentName: string;
  gradeLevelName?: string | null;
  appliedAt?: string;
  feePaymentId?: string | null;
  fee?: StatusFee | null;
  receipt?: StatusReceipt | null;
};

async function fetchStatusById(id: string, token: string): Promise<StatusPayload> {
  const res = await fetch(
    `/api/public/applications/${id}/status?token=${encodeURIComponent(token)}`
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(translateApiError(json) || json.error || "Not found");
  }
  return json;
}

async function fetchStatusByReference(
  schoolId: string,
  number: string,
  token: string
): Promise<StatusPayload> {
  const params = new URLSearchParams({
    schoolId,
    number: number.trim(),
    token: token.trim(),
  });
  const res = await fetch(`/api/public/applications/lookup?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(translateApiError(json) || json.error || "Not found");
  }
  return json;
}

export default function PublicApplyStatusPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(["public", "pages", "common"]);
  const [params, setParams] = useSearchParams();
  const id = params.get("id") || "";
  const token = params.get("token") || "";

  const [school, setSchool] = React.useState<{ id: string; name: string } | null>(null);
  const [data, setData] = React.useState<StatusPayload | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [lookupMode, setLookupMode] = React.useState(!id || !token);

  const [reference, setReference] = React.useState("");
  const [accessCode, setAccessCode] = React.useState("");
  const [statusLinkPaste, setStatusLinkPaste] = React.useState("");

  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(undefined) || getStoredLocale() || "en"
  );

  const [paying, setPaying] = React.useState(false);
  const [payError, setPayError] = React.useState("");

  React.useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/schools/${slug}`);
        const json = await res.json();
        if (res.ok) setSchool({ id: json.id, name: json.name });
      } catch {
        /* optional */
      }
    })();
  }, [slug]);

  React.useEffect(() => {
    const saved = loadApplyStatusCredentials(slug);
    if (saved?.applicationNumber && !reference) {
      setReference(saved.applicationNumber || "");
    }
  }, [slug, reference]);

  const loadFromCredentials = React.useCallback(
    async (appId: string, appToken: string) => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchStatusById(appId, appToken);
        setData(json);
        setLookupMode(false);
        setParams(
          { id: appId, token: appToken },
          { replace: true }
        );
      } catch (err: any) {
        setData(null);
        setError(translateApiError(err) || err.message || t("public:applyStatus.notFound"));
        setLookupMode(true);
      } finally {
        setLoading(false);
      }
    },
    [setParams, t]
  );

  React.useEffect(() => {
    if (!id || !token) return;
    void loadFromCredentials(id, token);
  }, [id, token, loadFromCredentials]);

  const handlePayFee = async () => {
    if (!data?.fee?.id) return;
    setPaying(true);
    setPayError("");
    try {
      const returnUrl =
        slug && token
          ? `${window.location.origin}/apply/${slug}/status?id=${encodeURIComponent(
              data.id
            )}&token=${encodeURIComponent(token)}`
          : window.location.href;
      const res = await fetch(
        `/api/public/fees/${encodeURIComponent(data.fee.id)}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: data.id,
            token,
            successUrl: returnUrl,
            cancelUrl: returnUrl,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(
          translateApiError(json) ||
            json?.error ||
            t("public:applyStatus.payFeeFailed")
        );
      }
      window.location.href = json.url;
    } catch (err: any) {
      setPayError(
        translateApiError(err) || err.message || t("public:applyStatus.payFeeFailed")
      );
      setPaying(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseApplyStatusUrl(statusLinkPaste);
    if (parsed) {
      navigate(`/apply/${slug}/status?id=${encodeURIComponent(parsed.id)}&token=${encodeURIComponent(parsed.token)}`);
      return;
    }

    if (!school?.id) {
      setError(t("public:apply.schoolNotFound"));
      return;
    }
    if (!reference.trim() || !accessCode.trim()) {
      setError(t("public:applyStatus.lookupRequired"));
      return;
    }

    setLoading(true);
    try {
      const json = await fetchStatusByReference(school.id, reference, accessCode);
      setData(json);
      setLookupMode(false);
      const nextToken = accessCode.trim();
      setParams({ id: json.id, token: nextToken }, { replace: true });
    } catch (err: any) {
      setData(null);
      setError(translateApiError(err) || err.message || t("public:applyStatus.notFound"));
    } finally {
      setLoading(false);
    }
  };

  const statusUrl =
    data && slug && token
      ? buildApplyStatusUrl(slug, data.id, token)
      : id && token
        ? buildApplyStatusUrl(slug, id, token)
        : "";

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const statusLabel = (status: string) =>
    t(`pages:admissions.status.${status}`, { defaultValue: status.replace(/_/g, " ") });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-16">
      <div className="absolute top-6 end-6">
        <LanguageSelect
          id="public-apply-status-lang"
          value={locale}
          onChange={setLocale}
          applyImmediately
          hint={null}
          className="w-44 shrink-0"
        />
      </div>

      <div className="max-w-md w-full rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <div className="space-y-2">
          <Link
            to={`/apply/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("public:applyStatus.backToApply")}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t("public:applyStatus.title")}
          </h1>
          <p className="text-sm text-slate-500">
            {lookupMode && !data
              ? t("public:applyStatus.subtitleLookup")
              : t("public:applyStatus.subtitleView")}
          </p>
          {school?.name ? (
            <p className="text-xs font-semibold text-slate-400">{school.name}</p>
          ) : null}
        </div>

        {lookupMode && !loading ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-2">
              <label className={labelClass} htmlFor="status-link-paste">
                {t("public:applyStatus.pasteLink")}
              </label>
              <input
                id="status-link-paste"
                type="text"
                value={statusLinkPaste}
                onChange={(e) => setStatusLinkPaste(e.target.value)}
                placeholder={t("public:applyStatus.pasteLinkPlaceholder")}
                className={inputClass}
              />
            </div>
            <p className="text-xs font-semibold text-slate-400 text-center">
              {t("public:applyStatus.orDivider")}
            </p>
            <div className="space-y-2">
              <label className={labelClass} htmlFor="apply-ref">
                {t("public:applyStatus.reference")}
              </label>
              <input
                id="apply-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="APP-XXXX-XXXXXX"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass} htmlFor="apply-access">
                {t("public:applyStatus.accessCode")}
              </label>
              <input
                id="apply-access"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={t("public:applyStatus.accessCodePlaceholder")}
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !school?.id}>
              {t("public:applyStatus.lookup")}
            </Button>
          </form>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500 font-medium">{t("public:applyStatus.loading")}</p>
        ) : null}

        {error ? <p className="text-rose-600 text-sm font-medium">{error}</p> : null}

        {data && !lookupMode ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <OnboardingStepper status={data.status} />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">{t("public:applyStatus.number")}:</span>{" "}
                <span className="font-mono">{data.applicationNumber || data.id}</span>
              </p>
              <p>
                <span className="font-medium text-slate-900">{t("public:applyStatus.student")}:</span>{" "}
                {data.studentName}
              </p>
              {data.gradeLevelName ? (
                <p>
                  <span className="font-medium text-slate-900">{t("public:applyStatus.grade")}:</span>{" "}
                  {data.gradeLevelName}
                </p>
              ) : null}
              <p>
                <span className="font-medium text-slate-900">{t("public:applyStatus.status")}:</span>{" "}
                <span className="inline-flex rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-800">
                  {statusLabel(data.status)}
                </span>
              </p>
              {data.appliedAt ? (
                <p className="text-xs text-slate-500">
                  {t("public:applyStatus.submitted", {
                    date: new Date(data.appliedAt).toLocaleDateString(),
                  })}
                </p>
              ) : null}
            </div>

            {data.fee ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    {t("public:applyStatus.feeTitle")}
                  </p>
                  <span className="text-sm font-mono font-bold text-slate-900">
                    {formatMoney(data.fee.balance ?? data.fee.amount)}
                  </span>
                </div>
                {data.fee.paid ? (
                  <p className="text-sm font-medium text-emerald-700">
                    {t("public:applyStatus.feePaid")}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">
                      {t("public:applyStatus.feeBalance", {
                        amount: formatMoney(data.fee.balance ?? data.fee.amount),
                      })}
                    </p>
                    <p className="text-xs text-slate-500">{t("public:applyStatus.feeDueHint")}</p>
                    {payError ? (
                      <p className="text-xs font-medium text-rose-600">{payError}</p>
                    ) : null}
                    <Button
                      type="button"
                      className="w-full"
                      disabled={paying}
                      onClick={() => void handlePayFee()}
                    >
                      {paying
                        ? t("public:applyStatus.payFeeProcessing")
                        : t("public:applyStatus.payFee")}
                    </Button>
                  </>
                )}
              </div>
            ) : null}

            {data.receipt?.verifyCode ? (
              <Link
                to={`/verify/receipt/${encodeURIComponent(data.receipt.verifyCode)}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
              >
                <Receipt className="w-4 h-4" />
                {t("public:applyStatus.viewReceipt")}
              </Link>
            ) : null}

            <p className="text-xs text-slate-500 leading-relaxed">{t("public:applyStatus.statusHint")}</p>

            {statusUrl ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => void copyText(statusUrl)}
                >
                  <Copy className="w-4 h-4" />
                  {t("public:applyStatus.copyLink")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => id && token && void loadFromCredentials(id, token)}
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("public:applyStatus.refresh")}
                </Button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setLookupMode(true);
                setData(null);
                setError("");
              }}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {t("public:applyStatus.lookupAnother")}
            </button>
          </div>
        ) : null}

        <div className="border-t border-slate-100 pt-4">
          <Link to="/login" className="text-slate-500 font-semibold text-sm hover:text-slate-700">
            {t("public:applyStatus.staffLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
