import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
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
  /** Public returning apply: email + DOB required for verify. */
  mode?: "staff" | "public-new" | "public-returning";
  /** Wizard step to render. Defaults to every section (single-page form). */
  step?: AdmissionFormStep | "all";
  /** Field-level validation codes for the rendered step. */
  errors?: AdmissionFieldErrors;
  /** Tailwind classes for inputs (defaults match Direct Admission). */
  inputClassName?: string;
  labelClassName?: string;
  sectionTitleClassName?: string;
};

const DEFAULT_INPUT =
  "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500";
const DEFAULT_LABEL = "text-xs font-black text-slate-500 uppercase tracking-wider";
const DEFAULT_SECTION = "text-xs font-black uppercase tracking-widest text-slate-500";

const ERROR_INPUT =
  "border-rose-300 bg-rose-50/50 focus:ring-rose-400 focus:border-rose-400";

function FieldError({ code }: { code?: AdmissionValidationCode }) {
  const { t } = useTranslation(["common"]);
  if (!code) return null;
  return (
    <p role="alert" className="text-xs font-semibold text-rose-600 mt-1">
      {t(`admissionForm.err.${code}`)}
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
}: AdmissionApplicationFieldsProps) {
  const set = (patch: Partial<AdmissionApplicationForm>) => onChange(patch);
  const isReturningPublic = mode === "public-returning";
  const nameRequired = mode !== "public-returning";
  const gradeRequired = mode === "staff" || mode === "public-new";
  const parentRequired = mode === "public-new";

  const inputCls = (key: keyof AdmissionApplicationForm) =>
    cn(inputClassName, errors?.[key] && ERROR_INPUT);

  const showStudent = step === "all" || step === "student";
  const showGuardians = step === "all" || step === "guardians";
  const showSchooling = step === "all" || step === "schooling";

  return (
    <div className="space-y-8">
      {showStudent ? (
        <section className="space-y-4" aria-label="Student identity">
          <h4 className={sectionTitleClassName}>Student Identity</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                ["firstName", "First Name", nameRequired],
                ["middleName", "Middle Name", false],
                ["lastName", "Last Name", nameRequired],
              ] as const
            ).map(([key, label, req]) => (
              <div key={key} className="space-y-1">
                <label className={labelClassName}>
                  {label}
                  {isReturningPublic && key !== "middleName" ? " (optional)" : ""}
                </label>
                <input
                  type="text"
                  required={req}
                  aria-required={req || undefined}
                  aria-invalid={Boolean(errors?.[key])}
                  value={f[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className={inputCls(key)}
                  placeholder={
                    isReturningPublic && key === "firstName"
                      ? "Leave blank to use school record"
                      : undefined
                  }
                />
                <FieldError code={errors?.[key]} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelClassName}>
                Date of Birth{isReturningPublic ? " (required)" : ""}
              </label>
              <input
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
              <label className={labelClassName}>Gender</label>
              <select
                aria-invalid={Boolean(errors?.gender)}
                value={f.gender}
                onChange={(e) => set({ gender: e.target.value })}
                className={cn(`${inputClassName} font-bold`, errors?.gender && ERROR_INPUT)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <FieldError code={errors?.gender} />
            </div>
            <div className="space-y-1">
              <label className={labelClassName}>
                {isReturningPublic ? "Grade Applying For (optional)" : "Grade Applying For"}
              </label>
              <select
                aria-invalid={Boolean(errors?.gradeLevelId)}
                value={f.gradeLevelId}
                onChange={(e) => set({ gradeLevelId: e.target.value })}
                required={gradeRequired}
                aria-required={gradeRequired || undefined}
                className={cn(`${inputClassName} font-bold`, errors?.gradeLevelId && ERROR_INPUT)}
              >
                <option value="">
                  {isReturningPublic ? "Keep current grade" : "Select grade..."}
                </option>
                {gradeLevels.map((gl) => (
                  <option key={gl.id} value={gl.id}>
                    {gl.name}
                  </option>
                ))}
              </select>
              <FieldError code={errors?.gradeLevelId} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClassName}>
                Student email{isReturningPublic ? " (required)" : ""}
              </label>
              <input
                type="email"
                required={isReturningPublic}
                aria-required={isReturningPublic || undefined}
                aria-invalid={Boolean(errors?.studentEmail)}
                value={f.studentEmail}
                onChange={(e) => set({ studentEmail: e.target.value })}
                className={inputCls("studentEmail")}
              />
              <FieldError code={errors?.studentEmail} />
            </div>
            <div className="space-y-1">
              <label className={labelClassName}>Student phone</label>
              <input
                type="text"
                aria-invalid={Boolean(errors?.studentPhone)}
                value={f.studentPhone}
                onChange={(e) => set({ studentPhone: e.target.value })}
                className={inputCls("studentPhone")}
              />
              <FieldError code={errors?.studentPhone} />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClassName}>Home Address</label>
            <input
              type="text"
              aria-invalid={Boolean(errors?.address)}
              value={f.address}
              onChange={(e) => set({ address: e.target.value })}
              className={inputCls("address")}
            />
            <FieldError code={errors?.address} />
          </div>
        </section>
      ) : null}

      {showGuardians ? (
        <>
          <section className="space-y-4" aria-label="Parents and guardians">
            <h4 className={sectionTitleClassName}>Parents / Guardians</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <p className={`${labelClassName} mb-1`}>
                  Father / Guardian{parentRequired ? " *" : ""}
                </p>
                {(
                  [
                    ["fatherName", "Name", parentRequired],
                    ["fatherPhone", "Phone", parentRequired],
                    ["fatherEmail", "Email", false],
                  ] as const
                ).map(([key, label, req]) => (
                  <div key={key} className="space-y-1">
                    <label className={labelClassName}>{label}</label>
                    <input
                      type={key.includes("Email") ? "email" : "text"}
                      required={req}
                      aria-required={req || undefined}
                      aria-invalid={Boolean(errors?.[key])}
                      value={f[key]}
                      onChange={(e) => set({ [key]: e.target.value })}
                      className={inputCls(key)}
                    />
                    <FieldError code={errors?.[key]} />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <p className={`${labelClassName} mb-1`}>Mother</p>
                {(
                  [
                    ["motherName", "Name", false],
                    ["motherPhone", "Phone", false],
                    ["motherEmail", "Email", false],
                  ] as const
                ).map(([key, label, req]) => (
                  <div key={key} className="space-y-1">
                    <label className={labelClassName}>{label}</label>
                    <input
                      type={key.includes("Email") ? "email" : "text"}
                      required={req}
                      aria-required={req || undefined}
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
          </section>

          <section className="space-y-3" aria-label="Family information">
            <h4 className={sectionTitleClassName}>Family Information</h4>
            <div className="space-y-2">
              {FAMILY_OPTIONS.map((opt) => {
                const isChecked = (f.familyInformation || []).includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        set({
                          familyInformation: toggleFamilyInformation(f.familyInformation, opt),
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {showSchooling ? (
        <section className="space-y-4" aria-label="Prior schooling">
          <h4 className={sectionTitleClassName}>Prior Schooling</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClassName}>Previous School</label>
              <input
                type="text"
                value={f.previousSchool}
                onChange={(e) => set({ previousSchool: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClassName}>Grade Completed</label>
              <input
                type="text"
                value={f.gradeCompleted}
                onChange={(e) => set({ gradeCompleted: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClassName}>Notes</label>
            <textarea
              value={f.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={3}
              className={`${inputClassName} resize-none`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
