import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { GraduationCap, ArrowRight, ArrowLeft, UserPlus, RefreshCw, Ban, FileQuestion, Info, Copy } from "lucide-react";
import {
  AdmissionFormWizard,
  buildAdmissionApiPayload,
  emptyAdmissionApplicationForm,
  type AdmissionApplicationForm,
} from "../features/admission-form";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { changeAppLocale, getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import { ErrorPageShell } from "../components/errors/ErrorPageShell";
import { PublicApplyBackground } from "./PublicApplyBackground";
import {
  PUBLIC_PORTAL_COLUMN,
  PUBLIC_PORTAL_FORM_CARD,
  PUBLIC_PORTAL_PAGE,
} from "../lib/publicPortalLayout";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { captchaEnabledOnClient, turnstileSiteKey } from "../lib/captcha";
import { buildApplyStatusUrl, saveApplyStatusCredentials } from "../lib/publicApplyStatus";
import { unwrapItems } from "../lib/apiEnvelope";

/**
 * Public student application portal (/apply/:slug).
 * Same applicant fields as Registrar Direct Admission.
 * Returning: verify email + DOB against an existing STUDENT.
 */
export default function PublicApplyPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation(["public", "common", "errors"]);
  const [school, setSchool] = React.useState<any>(null);
  const [error, setError] = React.useState("");
  const [gate, setGate] = React.useState<"not_found" | "disabled" | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [grades, setGrades] = React.useState<any[]>([]);
  const [gradesLoading, setGradesLoading] = React.useState(false);
  const [gradesError, setGradesError] = React.useState("");
  const [applicantType, setApplicantType] = React.useState<"NEW" | "RETURNING">("NEW");
  const [form, setForm] = React.useState<AdmissionApplicationForm>(emptyAdmissionApplicationForm);
  const [website, setWebsite] = React.useState("");
  const [captchaToken, setCaptchaToken] = React.useState("");
  const captchaRequired = captchaEnabledOnClient();
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setGate(null);
      try {
        const res = await fetch(`/api/public/schools/${slug}`);
        const data = await res.json();
        if (!res.ok) {
          setGate("not_found");
          throw new Error(translateApiError(data) || data.error || t("public:apply.schoolNotFound"));
        }
        if (!data.admissionPolicy?.publicApplyEnabled) {
          setGate("disabled");
          throw new Error(t("public:apply.applyDisabled"));
        }
        setSchool(data);
        if (data.defaultLocale) {
          const next = await changeAppLocale(data.defaultLocale);
          setLocale(next);
        }
        if (data.admissionPolicy?.returningApplyEnabled === false) {
          setApplicantType("NEW");
        }
        await loadGrades();
      } catch (err: any) {
        setError(translateApiError(err) || err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per slug; do not re-apply school locale on language switch
  }, [slug]);

  const loadGrades = React.useCallback(async () => {
    if (!slug) return;
    setGradesLoading(true);
    setGradesError("");
    try {
      const response = await fetch(`/api/public/schools/${slug}/grade-levels`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load grades");
      setGrades(unwrapItems(data));
    } catch (err: any) {
      setGrades([]);
      setGradesError(err?.message || "Could not load grades");
    } finally {
      setGradesLoading(false);
    }
  }, [slug]);

  const returningEnabled = school?.admissionPolicy?.returningApplyEnabled !== false;

  React.useEffect(() => {
    if (!result?.id || !result?.statusToken || !slug) return;
    saveApplyStatusCredentials({
      slug,
      id: result.id,
      token: result.statusToken,
      applicationNumber: result.applicationNumber,
    });
  }, [result, slug]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!school) return;
    if (
      gradesLoading ||
      gradesError ||
      (applicantType === "NEW" && (grades.length === 0 || !grades.some((grade) => grade.id === form.gradeLevelId))) ||
      (form.gradeLevelId && !grades.some((grade) => grade.id === form.gradeLevelId))
    ) {
      setError(gradesError || "Select a valid grade before submitting.");
      return;
    }
    if (captchaRequired && !captchaToken) {
      setError(t("public:apply.captchaRequired", "Complete the CAPTCHA check"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (applicantType === "RETURNING") {
        if (!form.studentEmail.trim()) throw new Error(t("public:apply.studentEmailRequired"));
        if (!form.dob) throw new Error(t("public:apply.dobRequired"));
      }
      const gradeLevelName =
        grades.find((g) => g.id === form.gradeLevelId)?.name || form.gradeLevelId || null;
      const payload = {
        ...buildAdmissionApiPayload({
          form,
          applicantType,
          gradeLevelName,
          sourceNote: "Public online registration",
        }),
        schoolId: school.id,
        website,
        captchaToken: captchaToken || undefined,
      };
      const res = await fetch("/api/public/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data) || data.error || t("public:apply.failed"));
      }
      setResult(data);
    } catch (err: any) {
      setError(translateApiError(err) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const langSelect = (
    <LanguageSelect
      id="public-apply-lang"
      value={locale}
      onChange={setLocale}
      applyImmediately
      hint={null}
      variant="glass"
      compactOptions
      className="w-44 shrink-0"
    />
  );

  const backHomeLink = (
    <Link
      to="/"
      aria-label={t("public:apply.backToHome")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/15"
    >
      <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
    </Link>
  );

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <PublicApplyBackground className="pointer-events-none absolute inset-0" imageSrc={school?.backgroundImageUrl} />
        <div className="relative z-10 flex min-h-screen items-center justify-center text-sm font-semibold text-white drop-shadow-sm">
          <div className="absolute top-6 start-6 z-20">{backHomeLink}</div>
          <div className="absolute top-6 end-6 z-20">{langSelect}</div>
          {t("public:apply.loading")}
        </div>
      </div>
    );
  }

  if (error && !school) {
    if (gate === "disabled") {
      return (
        <ErrorPageShell
          langId="public-apply-disabled-lang"
          tone="rose"
          icon={Ban}
          code="403"
          eyebrow={t("public:errorPages.forbidden.eyebrow")}
          title={t("public:apply.applyDisabled")}
          body={t("public:errorPages.forbidden.generic.body")}
          hints={[{ icon: Info, text: t("public:errorPages.forbidden.hintAsk") }]}
          secondary={{ to: "/", label: t("public:errorPages.goHome") }}
          primary={{ to: "/login", label: t("public:errorPages.signIn") }}
          footerNote={t("public:errorPages.footerNote")}
        />
      );
    }
    return (
      <ErrorPageShell
        langId="public-apply-missing-lang"
        tone="slate"
        icon={FileQuestion}
        code="404"
        eyebrow={t("public:errorPages.notFound.eyebrow")}
        title={t("public:apply.schoolNotFound")}
        body={t("public:errorPages.notFound.body")}
        secondary={{ to: "/", label: t("public:errorPages.goHome") }}
        primary={{ to: "/login", label: t("public:errorPages.signIn") }}
        footerNote={t("public:errorPages.footerNote")}
      />
    );
  }

  if (result) {
    const kind =
      result.applicantType === "RETURNING"
        ? t("public:apply.kindReturning")
        : t("public:apply.kindNew");
    const number = result.applicationNumber ? ` (${result.applicationNumber})` : "";
    const statusUrl =
      result.id && result.statusToken && slug
        ? buildApplyStatusUrl(slug, result.id, result.statusToken)
        : "";
    return (
      <div className="relative min-h-screen overflow-hidden">
        <PublicApplyBackground className="pointer-events-none absolute inset-0" imageSrc={school?.backgroundImageUrl} />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <div className="absolute top-6 end-6 z-20">{langSelect}</div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-lg w-full rounded-[32px] border border-white/20 bg-white p-8 shadow-[0_24px_64px_rgba(2,6,23,0.45)] space-y-5"
          >
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {t("public:apply.successTitle")}
            </h1>
            <p className="text-slate-500 font-medium">
              {t("public:apply.successDetail", { school: school.name, kind, number })}
            </p>
            <p className="text-sm text-slate-500">{t("public:apply.successHint")}</p>

            {result.applicationNumber ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("public:apply.reference")}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">{result.applicationNumber}</p>
                </div>
                {result.statusToken ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {t("public:apply.accessCodeLabel")}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-700 break-all">{result.statusToken}</p>
                    <p className="mt-1 text-xs text-slate-500">{t("public:apply.accessCodeHint")}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {result.applicationNumber ? (
                    <button
                      type="button"
                      onClick={() => void copyText(result.applicationNumber)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {t("public:apply.copyReference")}
                    </button>
                  ) : null}
                  {result.statusToken ? (
                    <button
                      type="button"
                      onClick={() => void copyText(result.statusToken)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {t("public:apply.copyAccessCode")}
                    </button>
                  ) : null}
                  {statusUrl ? (
                    <button
                      type="button"
                      onClick={() => void copyText(statusUrl)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {t("public:apply.copyLink")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {statusUrl ? (
              <Link
                to={`/apply/${slug}/status?id=${result.id}&token=${result.statusToken || ""}`}
                className="inline-flex items-center gap-2 text-indigo-600 font-semibold"
              >
                {t("public:apply.checkStatus")} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : null}
          </motion.div>
        </div>
      </div>
    );
  }

  const publicInput =
    "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PublicApplyBackground className="pointer-events-none absolute inset-0" imageSrc={school?.backgroundImageUrl} />
      <div className={PUBLIC_PORTAL_PAGE}>
        <div className={`${PUBLIC_PORTAL_COLUMN} space-y-4 sm:space-y-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {backHomeLink}
              {school?.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt=""
                  className="w-12 h-12 rounded-2xl object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white/85">{school?.name}</p>
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  {t("public:apply.pageTitle")}
                </h1>
              </div>
            </div>
            <div className="shrink-0 self-start">{langSelect}</div>
          </div>

          {returningEnabled ? (
            <div className="inline-flex rounded-2xl border border-white/20 bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setApplicantType("NEW");
                  setForm(emptyAdmissionApplicationForm());
                  setError("");
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  applicantType === "NEW"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {t("public:apply.newApplicant")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setApplicantType("RETURNING");
                  setForm(emptyAdmissionApplicationForm());
                  setError("");
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  applicantType === "RETURNING"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                {t("public:apply.returningApplicant")}
              </button>
            </div>
          ) : null}

          <p className="text-sm font-medium text-white/90 drop-shadow-sm">
            {applicantType === "RETURNING"
              ? t("public:apply.subtitleReturning")
              : t("public:apply.subtitleNew")}
          </p>

          <p className="text-sm text-white/80">
            <Link
              to={`/apply/${slug}/status`}
              className="font-bold text-white underline-offset-2 hover:underline"
            >
              {t("public:apply.checkStatusPage")}
            </Link>
          </p>

          <AdmissionFormWizard
            key={applicantType}
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            gradeLevels={grades}
            gradeLoadState={gradesLoading ? "loading" : gradesError ? "error" : grades.length === 0 ? "empty" : "ready"}
            onRetryGrades={() => void loadGrades()}
            gradesStateLabels={{
              loading: t("public:apply.loadingGrades", "Loading grades..."),
              error: t("public:apply.gradesLoadFailed", "Could not load grades — retry"),
              empty: t("public:apply.noGrades", "No grades available for this school"),
              retry: t("common:retry", "Retry"),
            }}
            mode={applicantType === "RETURNING" ? "public-returning" : "public-new"}
            inputClassName={publicInput}
            labelClassName="text-sm font-medium text-slate-700"
            sectionTitleClassName="text-xs font-black uppercase tracking-widest text-slate-500"
            onSubmit={submit}
            submitting={submitting}
            submitLabel={
              submitting
                ? t("public:apply.submitting")
                : applicantType === "RETURNING"
                  ? t("public:apply.submitReturning")
                  : t("public:apply.submit")
            }
            className={`${PUBLIC_PORTAL_FORM_CARD} space-y-8`}
            hiddenSlot={
              <label
                className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden"
                aria-hidden="true"
              >
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            }
            finalStepExtra={
              captchaRequired ? (
                <TurnstileWidget
                  siteKey={turnstileSiteKey()}
                  onToken={setCaptchaToken}
                  onExpire={() => setCaptchaToken("")}
                  className="flex justify-center"
                />
              ) : null
            }
            error={error ? error : null}
          />
        </div>
      </div>
    </div>
  );
}
