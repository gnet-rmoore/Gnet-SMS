import React from "react";
import {
  FAMILY_OPTIONS,
  type AdmissionApplicationForm,
  toggleFamilyInformation,
} from "./schema";

export type AdmissionApplicationFieldsProps = {
  form: AdmissionApplicationForm;
  onChange: (patch: Partial<AdmissionApplicationForm>) => void;
  gradeLevels: Array<{ id: string; name: string }>;
  /** Public returning apply: email + DOB required for verify. */
  mode?: "staff" | "public-new" | "public-returning";
  /** Tailwind classes for inputs (defaults match Direct Admission). */
  inputClassName?: string;
  labelClassName?: string;
  sectionTitleClassName?: string;
};

const DEFAULT_INPUT =
  "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500";
const DEFAULT_LABEL = "text-xs font-black text-slate-500 uppercase tracking-wider";
const DEFAULT_SECTION = "text-xs font-black uppercase tracking-widest text-slate-500";

export function AdmissionApplicationFields({
  form: f,
  onChange,
  gradeLevels,
  mode = "staff",
  inputClassName = DEFAULT_INPUT,
  labelClassName = DEFAULT_LABEL,
  sectionTitleClassName = DEFAULT_SECTION,
}: AdmissionApplicationFieldsProps) {
  const set = (patch: Partial<AdmissionApplicationForm>) => onChange(patch);
  const isReturningPublic = mode === "public-returning";
  const nameRequired = mode !== "public-returning";
  const gradeRequired = mode === "staff" || mode === "public-new";
  const parentRequired = mode === "public-new";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
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
                value={f[key]}
                onChange={(e) => set({ [key]: e.target.value })}
                className={inputClassName}
                placeholder={
                  isReturningPublic && key === "firstName"
                    ? "Leave blank to use school record"
                    : undefined
                }
              />
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
              value={f.dob}
              onChange={(e) => set({ dob: e.target.value })}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClassName}>Gender</label>
            <select
              value={f.gender}
              onChange={(e) => set({ gender: e.target.value })}
              className={`${inputClassName} font-bold`}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelClassName}>
              {isReturningPublic ? "Grade Applying For (optional)" : "Grade Applying For"}
            </label>
            <select
              value={f.gradeLevelId}
              onChange={(e) => set({ gradeLevelId: e.target.value })}
              required={gradeRequired}
              className={`${inputClassName} font-bold`}
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
              value={f.studentEmail}
              onChange={(e) => set({ studentEmail: e.target.value })}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClassName}>Student phone</label>
            <input
              type="text"
              value={f.studentPhone}
              onChange={(e) => set({ studentPhone: e.target.value })}
              className={inputClassName}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClassName}>Home Address</label>
          <input
            type="text"
            value={f.address}
            onChange={(e) => set({ address: e.target.value })}
            className={inputClassName}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className={sectionTitleClassName}>Parents / Guardians</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-4">
            <p className={`${labelClassName} mb-1`}>Father / Guardian</p>
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
                  value={f[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className={inputClassName}
                />
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
                  value={f[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className={inputClassName}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
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

      <section className="space-y-4">
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
    </div>
  );
}
