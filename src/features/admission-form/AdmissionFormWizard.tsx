import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Pencil } from "lucide-react";
import { cn } from "../../lib/cn";
import { AdmissionApplicationFields } from "./AdmissionApplicationFields";
import {
  ADMISSION_FORM_STEPS,
  composeStudentName,
  firstStepWithErrors,
  isAdmissionFormEmpty,
  validateAdmissionForm,
  validateAdmissionStep,
  type AdmissionApplicationForm,
  type AdmissionFieldErrors,
  type AdmissionFieldsMode,
  type AdmissionFormStep,
  type AdmissionStepErrors,
  type AdmissionValidationCode,
} from "./schema";

export type AdmissionFormWizardProps = {
  form: AdmissionApplicationForm;
  onChange: (patch: Partial<AdmissionApplicationForm>) => void;
  gradeLevels: Array<{ id: string; name: string }>;
  mode?: AdmissionFieldsMode;
  /** Final submit — receives the original form event (already prevented). */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitting?: boolean;
  /** Label for the final-step submit button. */
  submitLabel?: React.ReactNode;
  inputClassName?: string;
  labelClassName?: string;
  sectionTitleClassName?: string;
  /** Rendered on step 1 above the fields (e.g. returning-student picker). */
  firstStepExtra?: React.ReactNode;
  /** Rendered on the final step after the fields (e.g. CAPTCHA). */
  finalStepExtra?: React.ReactNode;
  /** Form-level error, shown on the final step. */
  error?: React.ReactNode;
  /** Rendered first inside the form, outside the steps (honeypot fields). */
  hiddenSlot?: React.ReactNode;
  className?: string;
};

/** Field key → label for the error summary and review rows (matches field labels). */
const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  dob: "Date of birth",
  gender: "Gender",
  gradeLevelId: "Grade applying for",
  studentEmail: "Student email",
  studentPhone: "Student phone",
  address: "Home address",
  fatherName: "Father / guardian name",
  fatherPhone: "Father / guardian phone",
  fatherEmail: "Father / guardian email",
  motherName: "Mother name",
  motherPhone: "Mother phone",
  motherEmail: "Mother email",
};

function humanize(value: string): string {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v === v.toUpperCase() && v.length <= 6) {
    return v.charAt(0) + v.slice(1).toLowerCase();
  }
  return v;
}

export function AdmissionFormWizard({
  form,
  onChange,
  gradeLevels,
  mode = "staff",
  onSubmit,
  submitting = false,
  submitLabel,
  inputClassName,
  labelClassName,
  sectionTitleClassName,
  firstStepExtra,
  finalStepExtra,
  error,
  hiddenSlot,
  className,
}: AdmissionFormWizardProps) {
  const { t } = useTranslation(["common"]);
  const total = ADMISSION_FORM_STEPS.length;
  const [stepIndex, setStepIndex] = React.useState(0);
  const [maxVisited, setMaxVisited] = React.useState(0);
  const [errors, setErrors] = React.useState<AdmissionFieldErrors>({});
  const containerRef = React.useRef<HTMLFormElement>(null);
  const step = ADMISSION_FORM_STEPS[Math.min(stepIndex, total - 1)];
  const isFinalStep = stepIndex === total - 1;

  const signature = JSON.stringify(form);
  const prevSignature = React.useRef(signature);
  React.useEffect(() => {
    const previous = prevSignature.current;
    prevSignature.current = signature;
    if (signature !== previous && isAdmissionFormEmpty(form)) {
      setStepIndex(0);
      setMaxVisited(0);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature covers form contents
  }, [signature]);

  const focusFirstProblem = React.useCallback(() => {
    requestAnimationFrame(() => {
      const root = containerRef.current;
      const target =
        root?.querySelector<HTMLElement>('[aria-invalid="true"]') ||
        root?.querySelector<HTMLElement>("[data-wizard-summary]");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
        target.focus({ preventScroll: true });
        return;
      }
      target?.focus?.();
    });
  }, []);

  const goToStep = (index: number) => {
    const next = Math.max(0, Math.min(index, total - 1));
    setStepIndex(next);
    setErrors({});
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleNext = () => {
    const stepErrors = validateAdmissionStep(step, form, mode);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstProblem();
      return;
    }
    setErrors({});
    const next = Math.min(stepIndex + 1, total - 1);
    setStepIndex(next);
    setMaxVisited((v) => Math.max(v, next));
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const results: AdmissionStepErrors = validateAdmissionForm(form, mode);
    const firstBad = firstStepWithErrors(results);
    if (firstBad) {
      const index = ADMISSION_FORM_STEPS.indexOf(firstBad);
      setStepIndex(index);
      setMaxVisited((v) => Math.max(v, index));
      setErrors(results[firstBad] || {});
      focusFirstProblem();
      return;
    }
    setErrors({});
    onSubmit(e);
  };

  const handleChange = (patch: Partial<AdmissionApplicationForm>) => {
    onChange(patch);
    if (Object.keys(errors).length === 0) return;
    setErrors((prev) => {
      const next: AdmissionFieldErrors = { ...prev };
      for (const key of Object.keys(patch)) {
        delete next[key as keyof AdmissionApplicationForm];
      }
      return next;
    });
  };

  const errorEntries = Object.entries(errors).filter(([, code]) => Boolean(code)) as Array<
    [keyof AdmissionApplicationForm, AdmissionValidationCode]
  >;

  const stepLabel = (s: AdmissionFormStep) => t(`admissionForm.step.${s}`);

  const reviewRows: Array<{ field: keyof AdmissionApplicationForm; step: number; label: string; value: string }> = [];
  const gradeName = gradeLevels.find((g) => g.id === form.gradeLevelId)?.name || form.gradeLevelId;
  const fullName = composeStudentName(form);
  if (fullName) reviewRows.push({ field: "firstName", step: 0, label: t("admissionForm.review.fullName"), value: fullName });
  if (form.dob) reviewRows.push({ field: "dob", step: 0, label: t("admissionForm.review.dob"), value: form.dob });
  if (form.gender) reviewRows.push({ field: "gender", step: 0, label: t("admissionForm.review.gender"), value: humanize(form.gender) });
  if (gradeName) reviewRows.push({ field: "gradeLevelId", step: 0, label: t("admissionForm.review.grade"), value: gradeName });
  if (form.studentEmail) reviewRows.push({ field: "studentEmail", step: 0, label: t("admissionForm.review.email"), value: form.studentEmail });
  if (form.studentPhone) reviewRows.push({ field: "studentPhone", step: 0, label: t("admissionForm.review.phone"), value: form.studentPhone });
  if (form.address) reviewRows.push({ field: "address", step: 0, label: t("admissionForm.review.address"), value: form.address });
  const guardianValue = [form.fatherName, form.fatherPhone].filter(Boolean).join(" · ");
  if (guardianValue) reviewRows.push({ field: "fatherName", step: 1, label: t("admissionForm.review.guardian"), value: guardianValue });
  const motherValue = [form.motherName, form.motherPhone].filter(Boolean).join(" · ");
  if (motherValue) reviewRows.push({ field: "motherName", step: 1, label: t("admissionForm.review.mother"), value: motherValue });

  return (
    <form noValidate onSubmit={handleSubmit} className={cn("space-y-8", className)} ref={containerRef} tabIndex={-1}>
      {hiddenSlot}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <ol className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            {ADMISSION_FORM_STEPS.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              const reachable = i <= maxVisited;
              return (
                <React.Fragment key={s}>
                  <li className="min-w-0">
                    <button
                      type="button"
                      disabled={!reachable || submitting}
                      onClick={() => goToStep(i)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "group flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3",
                        active
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-slate-200 bg-white text-slate-500",
                        !reachable && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                          active
                            ? "bg-white/20 text-white"
                            : done
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {done ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className="truncate">{stepLabel(s)}</span>
                    </button>
                  </li>
                  {i < total - 1 ? (
                    <li aria-hidden className="h-px min-w-4 flex-1 bg-slate-200" />
                  ) : null}
                </React.Fragment>
              );
            })}
          </ol>
          <span className="hidden shrink-0 text-xs font-bold text-slate-400 sm:inline">
            {t("admissionForm.stepOf", { current: stepIndex + 1, total })}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {errorEntries.length > 0 ? (
        <div
          data-wizard-summary
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 outline-none"
        >
          <p className="flex items-center gap-2 text-sm font-extrabold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("admissionForm.fixErrors")}
          </p>
          <ul className="mt-2 space-y-1 text-sm font-medium">
            {errorEntries.map(([field, code]) => (
              <li key={field}>
                {FIELD_LABELS[field] || field}: {t(`admissionForm.err.${code}`)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="space-y-8"
      >
        {stepIndex === 0 && firstStepExtra ? <div className="space-y-8">{firstStepExtra}</div> : null}

        <AdmissionApplicationFields
          form={form}
          onChange={handleChange}
          gradeLevels={gradeLevels}
          mode={mode}
          step={step}
          errors={errors}
          inputClassName={inputClassName}
          labelClassName={labelClassName}
          sectionTitleClassName={sectionTitleClassName}
        />

        {isFinalStep ? (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {t("admissionForm.reviewTitle")}
                </h5>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {t("admissionForm.reviewHint")}
                </p>
              </div>
            </div>
            {reviewRows.length > 0 ? (
              <dl className="divide-y divide-slate-100">
                {reviewRows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 py-2">
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 text-right">
                      <span className="block break-words text-sm font-semibold text-slate-800">
                        {row.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToStep(row.step)}
                        disabled={submitting}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" />
                        {t("edit")}
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs font-medium text-slate-500">{t("admissionForm.reviewEmpty")}</p>
            )}
          </div>
        ) : null}

        {isFinalStep ? finalStepExtra : null}
        {isFinalStep && error ? <div className="text-sm font-medium text-rose-600">{error}</div> : null}
      </motion.div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => goToStep(stepIndex - 1)}
          disabled={stepIndex === 0 || submitting}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("common:back")}
        </button>

        {isFinalStep ? (
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel ?? t("common:next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40"
          >
            {t("common:next")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        )}
      </div>
    </form>
  );
}
