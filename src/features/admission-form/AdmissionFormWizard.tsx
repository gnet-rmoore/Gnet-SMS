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
  hasPriorSchoolingDetails,
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
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitting?: boolean;
  submitLabel?: React.ReactNode;
  inputClassName?: string;
  labelClassName?: string;
  sectionTitleClassName?: string;
  firstStepExtra?: React.ReactNode;
  finalStepExtra?: React.ReactNode;
  error?: React.ReactNode;
  hiddenSlot?: React.ReactNode;
  className?: string;
  gradeLoadState?: "loading" | "error" | "empty" | "ready";
  onRetryGrades?: () => void;
  gradesStateLabels?: {
    loading: string;
    error: string;
    empty: string;
    retry: string;
  };
  changedFields?: string[];
  studentPhotoSlot?: React.ReactNode;
  applicantType?: "new" | "returning";
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  firstName: "admissions.manualAdmission.form.field.firstName",
  middleName: "admissions.manualAdmission.form.field.middleName",
  lastName: "admissions.manualAdmission.form.field.lastName",
  dob: "admissions.manualAdmission.form.field.dob",
  gender: "admissions.manualAdmission.form.field.gender",
  gradeLevelId: "admissions.manualAdmission.form.field.gradeApplyingFor",
  studentIdNumber: "admissions.manualAdmission.form.field.studentIdNumber",
  address: "admissions.manualAdmission.form.field.address",
  fatherName: "admissions.manualAdmission.form.field.fatherGuardianName",
  fatherPhone: "admissions.manualAdmission.form.field.fatherPhone",
  fatherEmail: "admissions.manualAdmission.form.field.fatherEmail",
  motherName: "admissions.manualAdmission.form.field.motherName",
  motherPhone: "admissions.manualAdmission.form.field.motherPhone",
  motherEmail: "admissions.manualAdmission.form.field.motherEmail",
  previousSchool: "admissions.manualAdmission.form.field.previousSchool",
  gradeCompleted: "admissions.manualAdmission.form.field.gradeCompleted",
  notes: "admissions.manualAdmission.form.field.notes",
};

const FAMILY_OPTION_KEYS: Record<string, string> = {
  "Both parents living together": "admissions.manualAdmission.form.familyOption.bothParents",
  "Parents divorced/separated": "admissions.manualAdmission.form.familyOption.separated",
  "Single parent household": "admissions.manualAdmission.form.familyOption.singleParent",
  "Guardian / relative care": "admissions.manualAdmission.form.familyOption.relativeCare",
  "Other family arrangement": "admissions.manualAdmission.form.familyOption.other",
};

type ReviewSectionKey = "identity" | "personal" | "guardians" | "family" | "schooling";

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
  gradeLoadState,
  onRetryGrades,
  gradesStateLabels,
  changedFields = [],
  studentPhotoSlot,
  applicantType = "new",
}: AdmissionFormWizardProps) {
  const { t } = useTranslation(["pages", "common"]);
  const total = ADMISSION_FORM_STEPS.length;
  const [stepIndex, setStepIndex] = React.useState(0);
  const [maxVisited, setMaxVisited] = React.useState(0);
  const [errors, setErrors] = React.useState<AdmissionFieldErrors>({});
  const [returnToReview, setReturnToReview] = React.useState(false);
  const [schoolingAcknowledged, setSchoolingAcknowledged] = React.useState(false);
  const containerRef = React.useRef<HTMLFormElement>(null);
  const step = ADMISSION_FORM_STEPS[Math.min(stepIndex, total - 1)];
  const isFinalStep = stepIndex === total - 1;
  const schoolingHasDetails = hasPriorSchoolingDetails(form);
  const needsSchoolingAcknowledgement = step === "schooling" && !schoolingHasDetails;
  const schoolingGateSatisfied = !needsSchoolingAcknowledgement || schoolingAcknowledged;

  const signature = JSON.stringify(form);
  const prevSignature = React.useRef(signature);
  React.useEffect(() => {
    const previous = prevSignature.current;
    prevSignature.current = signature;
    if (signature !== previous && isAdmissionFormEmpty(form)) {
      setStepIndex(0);
      setMaxVisited(0);
      setErrors({});
      setReturnToReview(false);
      setSchoolingAcknowledged(false);
    }
  }, [signature]);

  React.useEffect(() => {
    if (schoolingHasDetails) setSchoolingAcknowledged(false);
  }, [schoolingHasDetails]);

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

  const editReviewSection = (stepNumber: number) => {
    setReturnToReview(true);
    goToStep(stepNumber);
  };

  const backToReview = () => {
    setReturnToReview(false);
    goToStep(total - 1);
  };

  const handleNext = () => {
    const stepErrors = validateAdmissionStep(step, form, mode);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstProblem();
      return;
    }
    setErrors({});
    if (!schoolingGateSatisfied) return;
    if (returnToReview) {
      setReturnToReview(false);
      goToStep(total - 1);
      return;
    }
    const next = Math.min(stepIndex + 1, total - 1);
    setStepIndex(next);
    setMaxVisited((v) => Math.max(v, next));
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (stepIndex !== total - 1) return;
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

  const issueCount = React.useMemo(() => {
    const results = validateAdmissionForm(form, mode);
    return Object.values(results).reduce(
      (sum, stepErrors) => sum + Object.values(stepErrors || {}).filter(Boolean).length,
      0
    );
  }, [form, mode]);

  const stepLabel = (s: AdmissionFormStep) => t(`common:admissionForm.step.${s}`);
  const fieldLabel = (field: keyof AdmissionApplicationForm) =>
    t(FIELD_LABEL_KEYS[field] || `admissions.manualAdmission.form.field.${field}`);

  type ReviewRow = {
    field: keyof AdmissionApplicationForm;
    step: number;
    section: ReviewSectionKey;
    label: string;
    value: string;
  };

  const reviewRows: ReviewRow[] = [];
  const gradeName = gradeLevels.find((g) => g.id === form.gradeLevelId)?.name || form.gradeLevelId;
  const fullName = composeStudentName(form);
  if (fullName)
    reviewRows.push({
      field: "firstName",
      step: 0,
      section: "identity",
      label: t("common:admissionForm.review.fullName"),
      value: fullName,
    });
  if (form.dob)
    reviewRows.push({
      field: "dob",
      step: 0,
      section: "personal",
      label: t("common:admissionForm.review.dob"),
      value: form.dob,
    });
  if (form.gender)
    reviewRows.push({
      field: "gender",
      step: 0,
      section: "personal",
      label: t("common:admissionForm.review.gender"),
      value: humanize(form.gender),
    });
  if (gradeName)
    reviewRows.push({
      field: "gradeLevelId",
      step: 0,
      section: "personal",
      label: t("common:admissionForm.review.grade"),
      value: gradeName,
    });
  if (form.studentIdNumber)
    reviewRows.push({
      field: "studentIdNumber",
      step: 0,
      section: "personal",
      label: t("admissions.manualAdmission.form.field.studentIdNumber"),
      value: form.studentIdNumber,
    });
  if (form.address)
    reviewRows.push({
      field: "address",
      step: 0,
      section: "personal",
      label: t("common:admissionForm.review.address"),
      value: form.address,
    });
  const guardianValue = [form.fatherName, form.fatherPhone, form.fatherEmail].filter(Boolean).join(" · ");
  if (guardianValue)
    reviewRows.push({
      field: "fatherName",
      step: 1,
      section: "guardians",
      label: t("common:admissionForm.review.guardian"),
      value: guardianValue,
    });
  const motherValue = [form.motherName, form.motherPhone, form.motherEmail].filter(Boolean).join(" · ");
  if (motherValue)
    reviewRows.push({
      field: "motherName",
      step: 1,
      section: "guardians",
      label: t("common:admissionForm.review.mother"),
      value: motherValue,
    });
  if ((form.familyInformation || []).length > 0)
    reviewRows.push({
      field: "familyInformation",
      step: 1,
      section: "family",
      label: t("admissions.manualAdmission.review.family"),
      value: form.familyInformation
        .map((option) => t(FAMILY_OPTION_KEYS[option] || option))
        .join(" · "),
    });
  if (form.previousSchool)
    reviewRows.push({
      field: "previousSchool",
      step: 2,
      section: "schooling",
      label: fieldLabel("previousSchool"),
      value: form.previousSchool,
    });
  if (form.gradeCompleted)
    reviewRows.push({
      field: "gradeCompleted",
      step: 2,
      section: "schooling",
      label: fieldLabel("gradeCompleted"),
      value: form.gradeCompleted,
    });
  if (form.notes)
    reviewRows.push({
      field: "notes",
      step: 2,
      section: "schooling",
      label: fieldLabel("notes"),
      value: form.notes,
    });

  const reviewSections: Array<{
    key: ReviewSectionKey;
    step: number;
    title: string;
  }> = [
    {
      key: "identity",
      step: 0,
      title: t("admissions.manualAdmission.review.identity"),
    },
    {
      key: "personal",
      step: 0,
      title: t("admissions.manualAdmission.review.personal"),
    },
    {
      key: "guardians",
      step: 1,
      title: t("admissions.manualAdmission.review.guardians"),
    },
    {
      key: "family",
      step: 1,
      title: t("admissions.manualAdmission.review.family"),
    },
    {
      key: "schooling",
      step: 2,
      title: t("admissions.manualAdmission.review.schooling"),
    },
  ];

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={cn("space-y-8", className)}
      ref={containerRef}
      tabIndex={-1}
    >
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
                        "group flex min-w-0 items-center justify-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors sm:justify-start sm:px-3",
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
                      <span className="hidden truncate sm:inline">{stepLabel(s)}</span>
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
            {t("common:admissionForm.stepOf", { current: stepIndex + 1, total })}
          </span>
        </div>
        <p className="text-center text-sm font-bold text-slate-700 sm:hidden" aria-live="polite">
          {stepLabel(step)}
        </p>
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
            {t("common:admissionForm.fixErrors")}
          </p>
          <ul className="mt-2 space-y-1 text-sm font-medium">
            {errorEntries.map(([field, code]) => (
              <li key={field}>
                {fieldLabel(field)}: {t(`common:admissionForm.err.${code}`)}
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

        {!isFinalStep ? (
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
            gradeLoadState={gradeLoadState}
            onRetryGrades={onRetryGrades}
            gradesStateLabels={gradesStateLabels}
            submitting={submitting}
            changedFields={changedFields}
            studentPhotoSlot={studentPhotoSlot}
          />
        ) : null}

        {step === "schooling" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
            <p>{t("common:admissionForm.schoolingHint")}</p>
            {needsSchoolingAcknowledgement ? (
              <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-800">
                <input
                  type="checkbox"
                  checked={schoolingAcknowledged}
                  onChange={(e) => setSchoolingAcknowledged(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{t("common:admissionForm.schoolingAcknowledgement")}</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {isFinalStep ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {t("common:admissionForm.reviewTitle")}
                </h5>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {t("common:admissionForm.reviewHint")}
                </p>
              </div>
              {issueCount > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  {t("admissions.manualAdmission.form.issues", { count: issueCount })}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {reviewSections.map((section) => {
                const rows = reviewRows.filter((row) => row.section === section.key);
                return (
                  <section
                    key={section.key}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    aria-label={section.title}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <h6 className="text-sm font-extrabold text-slate-900">{section.title}</h6>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => editReviewSection(section.step)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" />
                        {t("common:edit")}
                      </button>
                    </div>
                    {section.key === "identity" && studentPhotoSlot ? (
                      <div className="mb-3">{studentPhotoSlot}</div>
                    ) : null}
                    {rows.length > 0 ? (
                      <dl className="divide-y divide-slate-100">
                        {rows.map((row) => (
                          <div key={row.label} className="flex items-start justify-between gap-3 py-2">
                            <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
                              {row.label}
                            </dt>
                            <dd className="min-w-0 text-right text-sm font-semibold text-slate-800">
                              <span className="block break-words">{row.value}</span>
                              {changedFields.includes(row.field) ? (
                                <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-700">
                                  {t("admissions.manualAdmission.form.changedFromExisting")}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-xs font-medium text-slate-500">
                        {t("common:admissionForm.reviewEmpty")}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>

            <section
              className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"
              aria-label={t("admissions.manualAdmission.review.source")}
            >
              <h6 className="text-sm font-extrabold text-indigo-900">
                {t("admissions.manualAdmission.review.source")}
              </h6>
              <p className="mt-1 text-sm font-medium text-indigo-800">
                {applicantType === "returning"
                  ? t("admissions.manualAdmission.review.returningApplication")
                  : t("admissions.manualAdmission.review.newApplication")}
              </p>
              <p className="mt-1 text-xs font-medium text-indigo-700">
                {t("admissions.manualAdmission.review.noDocuments")}
              </p>
            </section>
          </div>
        ) : null}

        {isFinalStep ? finalStepExtra : null}
        {isFinalStep && error ? <div className="text-sm font-medium text-rose-600">{error}</div> : null}
      </motion.div>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 pb-1 pt-4 backdrop-blur sm:-mx-7 sm:px-7 lg:-mx-8 lg:px-8">
        <button
          type="button"
          onClick={() => goToStep(stepIndex - 1)}
          disabled={stepIndex === 0 || submitting}
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("common:back")}
        </button>

        {returnToReview && !isFinalStep ? (
          <button
            type="button"
            onClick={backToReview}
            disabled={submitting}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
          >
            {t("admissions.manualAdmission.review.backToReview")}
          </button>
        ) : null}

        {isFinalStep && issueCount > 0 ? (
          <span className="hidden text-xs font-bold text-amber-700 sm:inline">
            {t("admissions.manualAdmission.form.issues", { count: issueCount })}
          </span>
        ) : null}

        {isFinalStep ? (
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel ?? t("common:next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting || !schoolingGateSatisfied}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40"
          >
            {t("common:next")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        )}
      </div>
    </form>
  );
}
