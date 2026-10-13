import React from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Mail,
  Loader2,
} from "lucide-react";
import { CountryTimezoneFields } from "../components/CountryTimezoneFields";
import { DEFAULT_COUNTRY, DEFAULT_TIMEZONE } from "../lib/countryTimezones";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import { Button, TextField, TextAreaField, fieldControlClass } from "../components/ui";
import { cn } from "../lib/cn";
import { PageToast, usePageToast } from "../features/academics-shared/PageToast";
import { RegisterSchoolBackground } from "./PublicApplyBackground";
import {
  PUBLIC_PORTAL_COLUMN,
  PUBLIC_PORTAL_FORM_CARD,
  PUBLIC_PORTAL_PAGE,
  PUBLIC_PORTAL_RESULT_CARD,
} from "../lib/publicPortalLayout";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { captchaEnabledOnClient, turnstileSiteKey } from "../lib/captcha";

const PORTAL_FORM_CARD = PUBLIC_PORTAL_FORM_CARD;
const PORTAL_RESULT_CARD = PUBLIC_PORTAL_RESULT_CARD;

type FormState = {
  organizationName: string;
  requestedSlug: string;
  country: string;
  timezone: string;
  address: string;
  estimatedStudents: string;
  message: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
};

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Public school registration form (Part A Journey B).
 */
export default function RegisterSchoolPage() {
  const { t, i18n } = useTranslation(["public", "common", "errors"]);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isConfirmRoute = location.pathname.includes("/register-school/confirm");
  const [confirmState, setConfirmState] = React.useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [step, setStep] = React.useState<1 | 2>(1);
  const [loading, setLoading] = React.useState(false);
  const { toast, showToast } = usePageToast(4500);
  const [done, setDone] = React.useState<{ id: string; message: string } | null>(null);
  const [slugStatus, setSlugStatus] = React.useState<"idle" | "checking" | "available" | "taken">(
    "idle"
  );
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );
  const [form, setForm] = React.useState<FormState>({
    organizationName: "",
    requestedSlug: "",
    country: DEFAULT_COUNTRY,
    timezone: DEFAULT_TIMEZONE,
    address: "",
    estimatedStudents: "",
    message: "",
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
  });
  const [captchaToken, setCaptchaToken] = React.useState("");
  const captchaRequired = captchaEnabledOnClient();

  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }));

  const checkSlug = React.useEffectEvent(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    try {
      const res = await fetch(`/api/public/slug-available?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugStatus(data.available ? "available" : "taken");
    } catch {
      setSlugStatus("idle");
    }
  });

  React.useEffect(() => {
    if (!isConfirmRoute) return;
    const id = searchParams.get("id");
    const token = searchParams.get("token");
    if (!id || !token) {
      setConfirmState("error");
      setConfirmMessage(t("public:register.confirmMissing"));
      return;
    }
    setConfirmState("loading");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/school-registrations/${id}/confirm-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(translateApiError(data) || data.error || t("public:register.confirmFailed"));
        }
        if (!cancelled) {
          setConfirmState("ok");
          setConfirmMessage(t("public:register.confirmSuccess"));
        }
      } catch (err: any) {
        if (!cancelled) {
          setConfirmState("error");
          setConfirmMessage(translateApiError(err) || err.message || t("public:register.confirmFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConfirmRoute, searchParams, t]);

  React.useEffect(() => {
    const timer = setTimeout(() => checkSlug(form.requestedSlug), 320);
    return () => clearTimeout(timer);
  }, [form.requestedSlug]);

  const onOrgNameChange = (value: string) => {
    const next: Partial<FormState> = { organizationName: value };
    if (!slugTouched) next.requestedSlug = slugifyName(value);
    patch(next);
  };

  const canContinueStep1 =
    form.organizationName.trim().length >= 2 &&
    form.requestedSlug.trim().length >= 2 &&
    form.country &&
    form.timezone &&
    slugStatus !== "taken" &&
    slugStatus !== "checking";

  const goStep2 = () => {
    if (!form.organizationName.trim() || !form.requestedSlug.trim()) {
      showToast(t("public:register.stepOrgRequired"), "error");
      return;
    }
    if (slugStatus === "taken") {
      showToast(t("public:register.slugTakenHint"), "error");
      return;
    }
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 2) return;
    if (captchaRequired && !captchaToken) {
      showToast(t("public:register.captchaRequired", "Complete the CAPTCHA check"), "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/school-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedStudents: form.estimatedStudents ? Number(form.estimatedStudents) : undefined,
          captchaToken: captchaToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data) || data.error || t("public:register.failed"));
      }
      setDone({ id: data.id, message: data.message || t("public:register.successBody") });
    } catch (err: any) {
      showToast(translateApiError(err) || err.message || t("common:errorGeneric"), "error");
    } finally {
      setLoading(false);
    }
  };

  const langSelect = (
    <LanguageSelect
      id="public-register-lang"
      value={locale}
      onChange={setLocale}
      applyImmediately
      hint={null}
      variant="glass"
      compactOptions
      className="w-44 shrink-0"
    />
  );

  const steps = [
    { n: 1 as const, label: t("public:register.stepOrg") },
    { n: 2 as const, label: t("public:register.stepContact") },
  ];

  const portalPage = (children: React.ReactNode) => (
    <div className="relative min-h-screen overflow-hidden font-landing-sans antialiased">
      <RegisterSchoolBackground className="pointer-events-none absolute inset-0" />
      <PageToast toast={toast} />
      {children}
    </div>
  );

  const portalHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          aria-label={t("public:register.backHome")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/15"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 ring-2 ring-white/20">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/85">{t("public:register.brand")}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {t("public:register.title")}
          </h1>
        </div>
      </div>
      <div className="shrink-0 self-start">{langSelect}</div>
    </div>
  );

  if (isConfirmRoute) {
    return portalPage(
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="absolute top-6 end-6 z-20">{langSelect}</div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={PORTAL_RESULT_CARD}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:mx-0">
            {confirmState === "loading" ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Mail className="h-7 w-7" />
            )}
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {t("public:register.confirmTitle")}
          </h1>
          <p
            className={`mt-3 leading-relaxed ${
              confirmState === "error" ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {confirmMessage ||
              (confirmState === "loading"
                ? t("public:register.confirmWorking")
                : t("public:register.confirmSuccess"))}
          </p>
          {confirmState === "ok" ? (
            <Link
              to="/login"
              className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              {t("public:register.signIn")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </motion.div>
      </div>
    );
  }

  if (done) {
    return portalPage(
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="absolute top-6 end-6 z-20">{langSelect}</div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={PORTAL_RESULT_CARD}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 sm:mx-0">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {t("public:register.successTitle")}
          </h1>
          <p className="mt-3 text-slate-500 leading-relaxed">{done.message}</p>
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("public:register.reference")}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800 break-all">{done.id}</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              {t("public:register.backToLogin")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("public:register.backHome")}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return portalPage(
    <div className={PUBLIC_PORTAL_PAGE}>
      <div className={PUBLIC_PORTAL_COLUMN}>
        {portalHeader}

        <nav aria-label={t("public:register.progressLabel")}>
        <ol className="flex items-center gap-2">
          {steps.map((s, i) => {
            const active = step === s.n;
            const complete = step > s.n;
            return (
              <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                        complete && "bg-emerald-600 text-white",
                        active && "bg-indigo-600 text-white shadow-sm",
                        !active && !complete && "border border-white/20 bg-white/10 text-white/70"
                      )}
                    >
                      {complete ? <Check className="h-4 w-4" /> : s.n}
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm font-semibold",
                        active ? "text-white" : "text-white/60"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "h-1 w-full rounded-full",
                      complete || active ? "bg-indigo-500" : "bg-white/20"
                    )}
                  />
                </div>
                {i < steps.length - 1 ? <div className="hidden w-3 sm:block" /> : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="text-sm font-medium text-white/90 drop-shadow-sm">
        {step === 1 ? t("public:register.subtitleStep1") : t("public:register.subtitleStep2")}
      </p>

      <form onSubmit={submit} className={`${PORTAL_FORM_CARD} space-y-8`} noValidate>
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              <TextField
                label={t("public:register.orgName")}
                required
                autoComplete="organization"
                value={form.organizationName}
                onChange={(e) => onOrgNameChange(e.target.value)}
                placeholder={t("public:register.orgNamePlaceholder")}
              />

              <div className="space-y-1.5">
                <TextField
                  label={t("public:register.slug")}
                  required
                  hint={t("public:register.slugHint")}
                  error={
                    slugStatus === "taken"
                      ? t("public:register.slugTaken")
                      : undefined
                  }
                  className="font-mono text-sm"
                  value={form.requestedSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    patch({
                      requestedSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    });
                  }}
                  onBlur={() => setSlugTouched(true)}
                  placeholder="demo-school"
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex flex-wrap items-center gap-2 px-0.5">
                  <p className="text-xs font-medium text-slate-400">
                    {t("public:register.slugPreview")}{" "}
                    <span className="font-mono text-slate-600">
                      /{form.requestedSlug || "your-school"}
                    </span>
                  </p>
                  {slugStatus === "checking" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("public:register.slugChecking")}
                    </span>
                  ) : null}
                  {slugStatus === "available" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                      {t("public:register.slugAvailable")}
                    </span>
                  ) : null}
                </div>
              </div>

              <CountryTimezoneFields
                country={form.country}
                timezone={form.timezone}
                onCountryChange={(country) => patch({ country })}
                onTimezoneChange={(timezone) => patch({ timezone })}
                required
                countryLabel={t("public:register.country")}
                timezoneLabel={t("public:register.timezone")}
                selectClassName={fieldControlClass.default}
                labelClassName="block text-sm font-semibold text-slate-700"
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              />

              <TextField
                label={t("public:register.estimatedStudents")}
                type="number"
                min={0}
                inputMode="numeric"
                hint={t("public:register.estimatedStudentsHint")}
                value={form.estimatedStudents}
                onChange={(e) => patch({ estimatedStudents: e.target.value })}
                placeholder="e.g. 450"
              />
              <TextField
                label={t("public:register.address")}
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
                placeholder={t("public:register.addressPlaceholder")}
                autoComplete="street-address"
              />

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/login"
                  className="text-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 sm:text-start"
                >
                  {t("public:register.alreadyHaveAccount")}{" "}
                  <span className="text-indigo-600">{t("public:register.signIn")}</span>
                </Link>
                <Button type="button" disabled={!canContinueStep1} onClick={goStep2}>
                  {t("common:continue")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              {/* Compact org summary */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("public:register.reviewOrg")}
                </p>
                <p className="mt-1 font-semibold tracking-tight text-slate-900">
                  {form.organizationName}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">/{form.requestedSlug}</p>
              </div>

              <TextField
                label={t("public:register.applicantName")}
                required
                autoComplete="name"
                value={form.applicantName}
                onChange={(e) => patch({ applicantName: e.target.value })}
                placeholder={t("public:register.applicantNamePlaceholder")}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label={t("public:register.applicantEmail")}
                  required
                  type="email"
                  autoComplete="email"
                  value={form.applicantEmail}
                  onChange={(e) => patch({ applicantEmail: e.target.value })}
                  placeholder="you@school.org"
                  hint={t("public:register.applicantEmailHint")}
                />
                <TextField
                  label={t("public:register.applicantPhone")}
                  type="tel"
                  autoComplete="tel"
                  value={form.applicantPhone}
                  onChange={(e) => patch({ applicantPhone: e.target.value })}
                  placeholder={t("public:register.phonePlaceholder")}
                />
              </div>

              <TextAreaField
                label={t("public:register.message")}
                rows={3}
                hint={t("public:register.messageHint")}
                value={form.message}
                onChange={(e) => patch({ message: e.target.value })}
                placeholder={t("public:register.messagePlaceholder")}
              />

              {captchaRequired ? (
                <TurnstileWidget
                  siteKey={turnstileSiteKey()}
                  onToken={setCaptchaToken}
                  onExpire={() => setCaptchaToken("")}
                  className="flex justify-center"
                />
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("common:back")}
                </Button>
                <Button type="submit" loading={loading} disabled={loading}>
                  {!loading ? <Mail className="h-4 w-4" /> : null}
                  {loading ? t("public:register.submitting") : t("public:register.submit")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <p className="text-xs leading-relaxed text-white/70">{t("public:register.privacyNote")}</p>
      </div>
    </div>
  );
}
