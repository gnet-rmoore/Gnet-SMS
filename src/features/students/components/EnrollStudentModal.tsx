import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";

export type EnrollStudentModalProps = {
  enrollError?: string;
  gradeLevels?: any[];
  handleEnroll?: (e: React.FormEvent) => void;
  isEnrolling?: boolean;
  newStudent?: any;
  setIsModalOpen?: (open: boolean) => void;
  setNewStudent?: (v: any) => void;
  /** Shown after successful enroll — one-time password panel */
  credentials?: { email: string; temporaryPassword: string; name: string } | null;
  onDone?: () => void;
  classrooms?: any[];
};

export function EnrollStudentModal({
  enrollError,
  gradeLevels = [],
  handleEnroll,
  isEnrolling,
  newStudent,
  setIsModalOpen,
  setNewStudent,
  credentials,
  onDone,
  classrooms = [],
}: EnrollStudentModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const copyText = async (text: string, key: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  if (credentials) {
    return (
      <FeatureModalShell
        eyebrow={t("pages:students.title")}
        title={t("pages:students.enrolled")}
        subtitle={t("pages:students.enrolledSubtitle")}
        onClose={() => onDone?.()}
        wide
        footer={
          <button
            type="button"
            onClick={() => onDone?.()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {t("common:done")}
          </button>
        }
      >
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold tracking-tight text-slate-900">
                {credentials.name}
              </p>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {t("pages:students.accountCreatedHint")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={fieldLabel}>{t("common:email")}</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-1 truncate">
                  {credentials.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText(credentials.email, "email")}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0"
                title={t("pages:students.copyEmail")}
              >
                {copied === "email" ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={fieldLabel}>{t("common:temporaryPassword")}</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-1">
                  {credentials.temporaryPassword}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyText(credentials.temporaryPassword, "password")
                }
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0"
                title={t("pages:students.copyPassword")}
              >
                {copied === "password" ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            {t("pages:students.assignClassroomHint")}
          </p>
        </div>
      </FeatureModalShell>
    );
  }

  const noGrades = gradeLevels.length === 0;

  return (
    <FeatureModalShell
      eyebrow={t("pages:students.title")}
      title={t("pages:students.enroll")}
      subtitle={t("pages:students.enrollSubtitle")}
      onClose={() => setIsModalOpen?.(false)}
      wide
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen?.(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="enroll-student-form"
            disabled={isEnrolling || noGrades}
            className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {isEnrolling ? t("pages:students.enrolling") : t("pages:students.enrollAction")}
          </button>
        </div>
      }
    >
      <form
        id="enroll-student-form"
        onSubmit={handleEnroll}
        className="p-6 sm:p-8 space-y-6"
      >
        {enrollError ? (
          <div className="p-4 bg-rose-50 text-rose-700 text-sm font-medium rounded-xl border border-rose-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {enrollError}
          </div>
        ) : null}

        {noGrades ? (
          <div className="p-4 bg-amber-50 text-amber-800 text-sm font-medium rounded-xl border border-amber-100">
            {t("pages:students.noGradeLevels")}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:fullName")}</label>
            <input
              type="text"
              required
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent?.({ ...newStudent, name: e.target.value })
              }
              className={fieldInput}
              placeholder="Alex Rivera"
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:email")}</label>
            <input
              type="email"
              required
              value={newStudent.email}
              onChange={(e) =>
                setNewStudent?.({ ...newStudent, email: e.target.value })
              }
              className={fieldInput}
              placeholder="alex@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:dateOfBirth")}</label>
            <input
              type="date"
              required
              value={newStudent.dob}
              onChange={(e) =>
                setNewStudent?.({ ...newStudent, dob: e.target.value })
              }
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:gender")}</label>
            <select
              required
              value={newStudent.gender}
              onChange={(e) =>
                setNewStudent?.({ ...newStudent, gender: e.target.value })
              }
              className={fieldInput}
            >
              <option value="MALE">{t("common:male")}</option>
              <option value="FEMALE">{t("common:female")}</option>
              <option value="OTHER">{t("common:other")}</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className={fieldLabel}>{t("common:gradeLevel")}</label>
            <select
              required
              value={newStudent.gradeLevelId}
              onChange={(e) =>
                setNewStudent?.({
                  ...newStudent,
                  gradeLevelId: e.target.value,
                })
              }
              className={fieldInput}
              disabled={noGrades}
            >
              <option value="">{t("pages:students.selectGradeLevel")}</option>
              {gradeLevels.map((gl: any) => (
                <option key={gl.id} value={gl.id}>
                  {gl.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className={fieldLabel}>{t("pages:students.feeCohort")}</label>
            <select
              value={newStudent.feeCohort || "NEW"}
              onChange={(e) =>
                setNewStudent?.({
                  ...newStudent,
                  feeCohort: e.target.value,
                })
              }
              className={fieldInput}
            >
              <option value="NEW">{t("pages:students.newStudent")}</option>
              <option value="RETURNING">{t("pages:students.returningStudent")}</option>
            </select>
          </div>
          {classrooms.length > 0 ? (
            <div className="space-y-1.5 md:col-span-2">
              <label className={fieldLabel}>
                {t("pages:students.classGroupOptional")}{" "}
                <span className="normal-case font-medium">({t("common:optional")})</span>
              </label>
              <select
                value={newStudent.classroomId || ""}
                onChange={(e) =>
                  setNewStudent?.({
                    ...newStudent,
                    classroomId: e.target.value,
                  })
                }
                className={fieldInput}
              >
                <option value="">{t("pages:students.assignLater")}</option>
                {classrooms
                  .filter((c: any) => !c.subjectId)
                  .map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.gradeLevel?.name ? ` (${c.gradeLevel.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("pages:students.parentGuardian")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("pages:students.parentName")}</label>
              <input
                type="text"
                required
                value={newStudent.parentName}
                onChange={(e) =>
                  setNewStudent?.({
                    ...newStudent,
                    parentName: e.target.value,
                  })
                }
                className={fieldInput}
                placeholder="Jordan Rivera"
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("pages:students.parentPhone")}</label>
              <input
                type="tel"
                required
                value={newStudent.parentPhone}
                onChange={(e) =>
                  setNewStudent?.({
                    ...newStudent,
                    parentPhone: e.target.value,
                  })
                }
                className={fieldInput}
                placeholder="+1 555 0100"
              />
            </div>
          </div>
        </div>
      </form>
    </FeatureModalShell>
  );
}
