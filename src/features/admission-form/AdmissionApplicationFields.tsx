import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { buildGradeOptions } from "../academics-shared/gradeSubjectLabels";
import {
  FAMILY_OPTIONS,
  type AdmissionApplicationForm,
  toggleFamilyInformation,
  type AdmissionFieldErrors,
  type AdmissionFormStep,
  type AdmissionValidationCode,
} from "./schema";

export type AdmissionApplicationFieldsProps = {
  form: AdmissionApplicationForm;
  onChange: (patch: Partial<AdmissionApplicationForm>) => void;
  gradeLevels: Array<{ id: string; name: string }>;
  /** Public returning apply: student ID + DOB required for verify. */
  mode?: "staff" | "public-new" | "public-returning";
  /** Wizard step to render. Defaults to every section (single-page form). */
  step?: AdmissionFormStep | "all";
  /** Field-level validation codes for the rendered step. */
  errors?: AdmissionFieldErrors;
  /** Tailwind classes for inputs (defaults match Direct Admission). */
  inputClassName?: string;
  labelClassName?: string;
  sectionTitleClassName?: string;
  gradeLoadState?: "loading" | "error" | "empty" | "ready";
  onRetryGrades?: () => void;
  gradesStateLabels?: {
    loading: string;
    error: string;
    empty: string;
    retry: string;
  };
  submitting?: boolean;
  /** Field keys that differ from a prefilled returning-student record. */
  changedFields?: string[];
  /** Profile-photo control rendered in the student identity card. */
  studentPhotoSlot?: React.ReactNode;
};

const DEFAULT_INPUT =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100";
const DEFAULT_LABEL = "text-xs font-black uppercase tracking-[0.12em] text-slate-500";
const DEFAULT_SECTION = "text-sm font-extrabold tracking-tight text-slate-900";

const ERROR_INPUT = "border-rose-300 bg-rose-50/50 focus:ring-rose-400 focus:border-rose-400";
const CHANGED_INPUT = "border-amber-300 bg-amber-50/40 focus:border-amber-400 focus:ring-amber-100";

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

function FieldError({ code }: { code?: AdmissionValidationCode }) {
  const { t } = useTranslation(["common"]);
  if (!code) return null;
  return (
    <p role="alert" className="text-xs font-semibold text-rose-600 mt-1">
      {t(`common:admissionForm.err.${code}`)}
    </p>
  );
}

export function AdmissionApplicationFields({
  form: f,
  onChange,
  gradeLevels,
  mode = "staff",
  step = "all",
  errors,
  inputClassName = DEFAULT_INPUT,
  labelClassName = DEFAULT_LABEL,
  sectionTitleClassName = DEFAULT_SECTION,
  gradeLoadState = "ready",
  onRetryGrades,
  gradesStateLabels,
  submitting = false,
  changedFields = [],
  studentPhotoSlot,
}: AdmissionApplicationFieldsProps) {
  const { t } = useTranslation(["pages", "common"]);
  const set = (patch: Partial<AdmissionApplicationForm>) => onChange(patch);
  const isReturningPublic = mode === "public-returning";
  const nameRequired = mode !== "public-returning";
  const gradeRequired = mode === "staff" || mode === "public-new";
  const parentRequired = mode === "public-new";
  const changedSet = React.useMemo(() => new Set(changedFields), [changedFields]);
  const gradeOptions = React.useMemo(() => buildGradeOptions(gradeLevels), [gradeLevels]);

  const fieldLabel = (key: keyof AdmissionApplicationForm) =>
    t(FIELD_LABEL_KEYS[key] || `admissions.manualAdmission.form.field.${key}`);

  const inputCls = (key: keyof AdmissionApplicationForm) =>
    cn(
      inputClassName,
      errors?.[key] && ERROR_INPUT,
      changedSet.has(key) && !errors?.[key] && CHANGED_INPUT
    );

  const label = (
    key: keyof AdmissionApplicationForm,
    options?: { required?: boolean; optional?: boolean }
  ) => (
    <label htmlFor={`admission-${key}`} className={labelClassName}>
      {fieldLabel(key)}
      {options?.required ? ` *` : ""}
      {options?.optional ? ` (${t("common:optional")})` : ""}
      {isReturningPublic && key === "dob" ? ` (${t("common:required")})` : ""}
      {changedSet.has(key) ? (
        <span className="ms-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-black normal-case tracking-normal text-amber-700">
          {t("admissions.manualAdmission.form.changedFromExisting")}
        </span>
      ) : null}
    </label>
  );

  const sectionHeader = (number: string, title: string, hint: string) => (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-700">
        {number}
      </span>
      <div>
        <h4 className={sectionTitleClassName}>{title}</h4>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{hint}</p>
      </div>
    </div>
  );

  const showStudent = step === "all" || step === "student";
  const showGuardians = step === "all" || step === "guardians";
  const showSchooling = step === "all" || step === "schooling";

  return (
    <div className="space-y-8">
      {showStudent ? (
        <>
          <section className="space-y-5" aria-label={t("admissions.manualAdmission.form.section.studentIdentity")}>
            {sectionHeader(
              "1",
              t("admissions.manualAdmission.form.section.studentIdentity"),
              t("admissions.manualAdmission.form.section.studentIdentityHint")
            )}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {studentPhotoSlot ? <div className="md:col-span-1">{studentPhotoSlot}</div> : null}
              <div
                className={cn(
                  "grid grid-cols-1 gap-4 sm:grid-cols-3",
                  studentPhotoSlot ? "md:col-span-2" : "md:col-span-3"
                )}
              >
                {(["firstName", "middleName", "lastName"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    {label(key, {
                      required: nameRequired && key !== "middleName",
                      optional: key === "middleName",
                    })}
                    <input
                      id={`admission-${key}`}
                      type="text"
                      required={nameRequired && key !== "middleName"}
                      aria-required={(nameRequired && key !== "middleName") || undefined}
                      aria-invalid={Boolean(errors?.[key])}
                      value={f[key]}
                      onChange={(e) => set({ [key]: e.target.value })}
                      className={inputCls(key)}
                      placeholder={
                        isReturningPublic && key === "firstName"
                          ? t("admissions.manualAdmission.form.placeholder.keepSchoolRecord")
                          : undefined
                      }
                    />
                    <FieldError code={errors?.[key]} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-5" aria-label={t("admissions.manualAdmission.form.section.personalDetails")}>
            {sectionHeader(
              "1",
              t("admissions.manualAdmission.form.section.personalDetails"),
              t("admissions.manualAdmission.form.section.personalDetailsHint")
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                {label("dob")}
                <input
                  id="admission-dob"
                  type="date"
                  required={isReturningPublic}
                  aria-required={isReturningPublic || undefined}
                  aria-invalid={Boolean(errors?.dob)}
                  value={f.dob}
                  onChange={(e) => set({ dob: e.target.value })}
                  className={inputCls("dob")}
                />
                <FieldError code={errors?.dob} />
              </div>
              <div className="space-y-1">
                {label("gender")}
                <select
                  id="admission-gender"
                  aria-invalid={Boolean(errors?.gender)}
                  value={f.gender}
                  onChange={(e) => set({ gender: e.target.value })}
                  className={cn(inputCls("gender"), "font-bold")}
                >
                  <option value="MALE">{t("common:male")}</option>
                  <option value="FEMALE">{t("common:female")}</option>
                  <option value="OTHER">{t("common:other")}</option>
                </select>
                <FieldError code={errors?.gender} />
              </div>
              <div className="space-y-1">
                {label("gradeLevelId")}
                <select
                  id="admission-gradeLevelId"
                  aria-invalid={Boolean(errors?.gradeLevelId)}
                  value={f.gradeLevelId}
                  onChange={(e) => set({ gradeLevelId: e.target.value })}
                  required={gradeRequired}
                  aria-required={gradeRequired || undefined}
                  disabled={submitting || gradeLoadState === "loading" || gradeLoadState === "error"}
                  className={cn(inputCls("gradeLevelId"), "font-bold")}
                >
                  <option value="">
                    {gradeLoadState === "loading"
                      ? gradesStateLabels?.loading
                      : isReturningPublic
                        ? t("admissions.manualAdmission.form.placeholder.keepCurrentGrade")
                        : gradeLoadState === "error"
                          ? gradesStateLabels?.error
                          : gradeLoadState === "empty"
                            ? gradesStateLabels?.empty
                            : t("admissions.manualAdmission.form.placeholder.selectGrade")}
                  </option>
                  {gradeOptions.map((gl) => (
                    <option key={gl.id} value={gl.id}>
                      {gl.label}
                    </option>
                  ))}
                </select>
                {gradeLoadState === "error" && onRetryGrades ? (
                  <button
                    type="button"
                    onClick={onRetryGrades}
                    className="min-h-11 text-sm font-bold text-indigo-700 underline underline-offset-2"
                  >
                    {gradesStateLabels?.retry || t("admissions.manualAdmission.gradesRetry")}
                  </button>
                ) : null}
                <FieldError code={errors?.gradeLevelId} />
              </div>
            </div>
            {isReturningPublic ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  {label("studentIdNumber", { required: true })}
                  <input
                    id="admission-studentIdNumber"
                    type="text"
                    required
                    aria-required
                    aria-invalid={Boolean(errors?.studentIdNumber)}
                    value={f.studentIdNumber}
                    onChange={(e) => set({ studentIdNumber: e.target.value })}
                    className={inputCls("studentIdNumber")}
                  />
                  <FieldError code={errors?.studentIdNumber} />
                </div>
              </div>
            ) : null}
            <div className="space-y-1">
              {label("address")}
              <textarea
                id="admission-address"
                rows={3}
                maxLength={500}
                aria-invalid={Boolean(errors?.address)}
                value={f.address}
                onChange={(e) => set({ address: e.target.value })}
                className={cn(inputCls("address"), "resize-y")}
              />
              <p className="text-xs text-slate-500">
                {t("admissions.manualAdmission.form.characterCount", { count: f.address.length, max: 500 })}
              </p>
              <FieldError code={errors?.address} />
            </div>
          </section>
        </>
      ) : null}

      {showGuardians ? (
        <>
          <section className="space-y-5" aria-label={t("admissions.manualAdmission.form.section.parentsGuardians")}>
            {sectionHeader(
              "2",
              t("admissions.manualAdmission.form.section.parentsGuardians"),
              t("admissions.manualAdmission.form.section.parentsGuardiansHint")
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className={cn(labelClassName, "mb-1")}>
                  {t("admissions.manualAdmission.form.section.fatherGuardian")}
                  {parentRequired ? " *" : ""}
                </p>
                {(["fatherName", "fatherPhone", "fatherEmail"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    {label(key, { optional: !parentRequired && key === "fatherEmail" })}
                    <input
                      id={`admission-${key}`}
                      type={key.includes("Email") ? "email" : "text"}
                      required={parentRequired}
                      aria-required={parentRequired || undefined}
                      aria-invalid={Boolean(errors?.[key])}
                      value={f[key]}
                      onChange={(e) => set({ [key]: e.target.value })}
                      className={inputCls(key)}
                    />
                    <FieldError code={errors?.[key]} />
                  </div>
                ))}
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className={cn(labelClassName, "mb-1")}>{t("admissions.manualAdmission.form.section.mother")}</p>
                {(["motherName", "motherPhone", "motherEmail"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    {label(key, { optional: true })}
                    <input
                      id={`admission-${key}`}
                      type={key.includes("Email") ? "email" : "text"}
                      aria-invalid={Boolean(errors?.[key])}
                      value={f[key]}
                      onChange={(e) => set({ [key]: e.target.value })}
                      className={inputCls(key)}
                    />
                    <FieldError code={errors?.[key]} />
                  </div>
                ))}
              </div>
            </div>
            {!f.fatherEmail && !f.motherEmail ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                {t("admissions.manualAdmission.form.noGuardianEmail")}
              </p>
            ) : null}
          </section>

          <section className="space-y-4" aria-label={t("admissions.manualAdmission.form.section.familyInformation")}>
            <h4 className={sectionTitleClassName}>{t("admissions.manualAdmission.form.section.familyInformation")}</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FAMILY_OPTIONS.map((opt) => {
                const isChecked = (f.familyInformation || []).includes(opt);
                const optionLabel = t(FAMILY_OPTION_KEYS[opt] || opt);
                return (
                  <label
                    key={opt}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition",
                      isChecked
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        set({
                          familyInformation: toggleFamilyInformation(f.familyInformation, opt),
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {optionLabel}
                  </label>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {showSchooling ? (
        <section className="space-y-5" aria-label={t("admissions.manualAdmission.form.section.priorSchooling")}>
          {sectionHeader(
            "3",
            t("admissions.manualAdmission.form.section.priorSchooling"),
            t("admissions.manualAdmission.form.section.priorSchoolingHint")
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              {label("previousSchool", { optional: true })}
              <input
                id="admission-previousSchool"
                type="text"
                value={f.previousSchool}
                onChange={(e) => set({ previousSchool: e.target.value })}
                className={inputCls("previousSchool")}
              />
              <FieldError code={errors?.previousSchool} />
            </div>
            <div className="space-y-1">
              {label("gradeCompleted", { optional: true })}
              <input
                id="admission-gradeCompleted"
                type="text"
                value={f.gradeCompleted}
                onChange={(e) => set({ gradeCompleted: e.target.value })}
                className={inputCls("gradeCompleted")}
              />
              <FieldError code={errors?.gradeCompleted} />
            </div>
          </div>
          <div className="space-y-1">
            {label("notes", { optional: true })}
            <textarea
              id="admission-notes"
              value={f.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={4}
              maxLength={500}
              className={cn(inputCls("notes"), "resize-y")}
            />
            <p className="text-xs text-slate-500">
              {t("admissions.manualAdmission.form.characterCount", { count: f.notes.length, max: 500 })}
            </p>
            <FieldError code={errors?.notes} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
