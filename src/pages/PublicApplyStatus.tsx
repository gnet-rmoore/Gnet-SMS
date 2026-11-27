import React from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Receipt, RefreshCw } from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import { buildStatusUrl, loadReference, saveReference } from "../lib/publicApplyStatus";
import { Button } from "../components/ui";
import { OnboardingStepper } from "../components/OnboardingStepper";
import { canonicalGradeName } from "../features/academics-shared/gradeSubjectLabels";

const inputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white";
const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500";

const formatMoney = (n: number | null | undefined) =>
  `$${Number(n || 0).toFixed(2)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

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

type EntranceBooking = {
  slotId: string;
  startAt: string;
  endAt: string;
  location: string;
};

type EntranceAvailability = {
  from: string | null;
  to: string | null;
  weekdays: number[];
  note: string | null;
};

type StatusPayload = {
  id: string;
  applicationNumber?: string | null;
  status: string;
  studentName: string;
  gradeLevelName?: string | null;
  appliedAt?: string;
  feePaymentId?: string | null;
  accessToken?: string | null;
  fee?: StatusFee | null;
  receipt?: StatusReceipt | null;
  entranceStatus?: string | null;
  entranceAvailability?: EntranceAvailability | null;
  entranceBooking?: EntranceBooking | null;
  entranceUrl?: string | null;
};

async function fetchStatusByReference(schoolId: string, number: string): Promise<StatusPayload> {
  const params = new URLSearchParams({ schoolId, number: number.trim() });
  const res = await fetch(`/api/public/applications/lookup?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(translateApiError(json) || json.error || "Not found");
  }
  return json;
}

export default function PublicApplyStatusPage() {
  const { slug = "" } = useParams();
  const { t } = useTranslation(["public", "pages", "common"]);

  const [school, setSchool] = React.useState<{ id: string; name: string } | null>(null);
  const [data, setData] = React.useState<StatusPayload | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [reference, setReference] = React.useState("");

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
    const saved = loadReference(slug);
    if (saved) setReference(saved);
  }, [slug]);

  const loadStatus = React.useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!school?.id) {
        setError(t("public:apply.schoolNotFound"));
        return;
      }
      if (!trimmed) {
        setError(t("public:applyStatus.referenceRequired", "Enter your application reference number."));
        return;
      }
      setLoading(true);
      setError("");
      try {
        const json = await fetchStatusByReference(school.id, trimmed);
        setData(json);
        setReference(trimmed);
        saveReference(slug, trimmed);
      } catch (err: any) {
        setData(null);
        setError(translateApiError(err) || err.message || t("public:applyStatus.notFound"));
      } finally {
        setLoading(false);
      }
    },
    [school?.id, slug, t]
  );

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    void loadStatus(reference);
  };

  const handlePayFee = async () => {
    if (!data?.fee?.id) return;
    setPaying(true);
    setPayError("");
    try {
      const returnUrl = slug ? `${window.location.origin}${buildStatusUrl(slug)}` : window.location.href;
      const res = await fetch(
        `/api/public/fees/${encodeURIComponent(data.fee.id)}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: data.id,
            token: data.accessToken || "",
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
            {data
              ? t("public:applyStatus.subtitleView")
              : t("public:applyStatus.subtitleLookup", "Enter the reference number from your confirmation email.")}
          </p>
          {school?.name ? (
            <p className="text-xs font-semibold text-slate-400">{school.name}</p>
          ) : null}
        </div>

        {!data ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-2">
              <label className={labelClass} htmlFor="apply-ref">
                {t("public:applyStatus.reference", "Application reference number")}
              </label>
              <input
                id="apply-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="APP-XXXX-XXXXXX"
                autoComplete="off"
                className={`${inputClass} font-mono`}
              />
            </div>
            <p className="text-xs text-slate-500">
              {t(
                "public:applyStatus.referenceCheckHint",
                "Use the reference number from your application confirmation email."
              )}
            </p>
            <Button type="submit" className="w-full" disabled={loading || !school?.id}>
              {loading ? t("public:applyStatus.loading") : t("public:applyStatus.lookup")}
            </Button>
          </form>
        ) : null}

        {error ? <p className="text-rose-600 text-sm font-medium">{error}</p> : null}

        {data ? (
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
                  {canonicalGradeName(data.gradeLevelName)}
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

            {data.entranceStatus || data.entranceBooking ? (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 space-y-2">
                <p className="text-sm font-bold text-slate-800">
                  {t("public:applyStatus.entranceTitle", "Entrance")}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">
                    {t("public:applyStatus.entranceStatusLabel", "Status")}:
                  </span>{" "}
                  <span className="inline-flex rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-800">
                    {statusLabel(data.entranceStatus || "NOT_SCHEDULED")}
                  </span>
                </p>
                {data.entranceAvailability?.note ? (
                  <p className="text-xs leading-relaxed text-slate-600">
                    {t("public:applyStatus.entranceAvailabilityNote", "School note: {{note}}", {
                      note: data.entranceAvailability.note,
                    })}
                  </p>
                ) : null}
                {data.entranceBooking ? (
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-900">
                        {t("public:applyStatus.entranceDate", "Date & time")}:
                      </span>{" "}
                      {formatDateTime(data.entranceBooking.startAt)}
                      {data.entranceBooking.endAt ? ` – ${formatDateTime(data.entranceBooking.endAt)}` : ""}
                    </p>
                    {data.entranceBooking.location ? (
                      <p>
                        <span className="font-medium text-slate-900">
                          {t("public:applyStatus.entranceLocation", "Location")}:
                        </span>{" "}
                        {data.entranceBooking.location}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {data.entranceUrl ? (
                  <a
                    href={data.entranceUrl}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    {t("public:applyStatus.entranceChange", "Choose/change my entrance date")}
                  </a>
                ) : null}
              </div>
            ) : null}

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

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                disabled={loading}
                onClick={() => void loadStatus(reference)}
              >
                <RefreshCw className="w-4 h-4" />
                {t("public:applyStatus.refresh")}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
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
