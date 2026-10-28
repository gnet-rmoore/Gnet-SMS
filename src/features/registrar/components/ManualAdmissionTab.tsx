import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, UserPlus, UserRound } from "lucide-react";
import { AdmissionFormWizard } from "../../admission-form";
import {
  emptyManualAdmissionForm,
  studentToManualAdmissionForm,
  type ManualAdmissionForm,
} from "../lib/manualAdmissionForm";

export type ManualAdmissionTabProps = {
  gradeLevels: any[];
  students: any[];
  handleManualAdmissionSubmit: (e: React.FormEvent) => void;
  manualAdmissionForm: ManualAdmissionForm;
  setManualAdmissionForm: (v: ManualAdmissionForm) => void;
  submitting: boolean;
};

export function ManualAdmissionTab({
  gradeLevels,
  students,
  handleManualAdmissionSubmit,
  manualAdmissionForm,
  setManualAdmissionForm,
  submitting,
}: ManualAdmissionTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const f = manualAdmissionForm;
  const [studentQuery, setStudentQuery] = useState("");

  const studentOptions = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const list = Array.isArray(students) ? students : [];
    const filtered = !q
      ? list
      : list.filter((s) => {
          const hay = `${s.name || ""} ${s.email || ""} ${s.parentName || ""} ${s.phone || ""}`.toLowerCase();
          return hay.includes(q);
        });
    return filtered.slice(0, 80);
  }, [students, studentQuery]);

  const selectedStudent = useMemo(
    () => (Array.isArray(students) ? students.find((s) => s.id === f.existingStudentId) : null),
    [students, f.existingStudentId]
  );

  const applyExistingStudent = (studentId: string) => {
    if (!studentId) {
      setManualAdmissionForm(emptyManualAdmissionForm());
      setStudentQuery("");
      return;
    }
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    setManualAdmissionForm(studentToManualAdmissionForm(student, emptyManualAdmissionForm()));
    setStudentQuery("");
  };

  const applicantPicker = (
    <section className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <UserRound className="w-5 h-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
            {t("admissions.manualAdmission.applicantType")}
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            {t("admissions.manualAdmission.applicantTypeHint")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
            {t("admissions.manualAdmission.searchExisting")}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder={t("admissions.manualAdmission.searchPlaceholder")}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
            {t("admissions.manualAdmission.selectStudent")}
          </label>
          <select
            value={f.existingStudentId || ""}
            onChange={(e) => applyExistingStudent(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("admissions.manualAdmission.newApplicant")}</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || t("admissions.manualAdmission.unnamed")}
                {s.email ? ` · ${s.email}` : ""}
                {s.gradeLevel?.name || s.gradeLevelName
                  ? ` · ${s.gradeLevel?.name || s.gradeLevelName}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedStudent ? (
        <p className="text-xs font-medium text-indigo-800 bg-white/70 border border-indigo-100 rounded-xl px-3 py-2">
          {t("admissions.manualAdmission.prefillFrom")}{" "}
          <span className="font-bold">{selectedStudent.name}</span>
          {selectedStudent.email ? (
            <>
              {" "}
              (<span className="font-mono">({selectedStudent.email})</span>
            </>
          ) : null}
          . {t("admissions.manualAdmission.prefillReturning")}
        </p>
      ) : null}
    </section>
  );

  return (
    <div className="relative max-w-4xl overflow-hidden rounded-[32px] border border-indigo-100/80 bg-gradient-to-br from-indigo-50/70 via-white to-slate-100/80 p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl"
      />

      <div className="relative">
        <div className="mb-8 flex items-start gap-4 rounded-2xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
              {t("admissions.manualAdmission.title")}
            </h3>
            <p className="text-sm font-medium text-slate-500">
              {t("admissions.manualAdmission.subtitle")}
            </p>
          </div>
        </div>

        <AdmissionFormWizard
          form={f}
          onChange={(patch) => setManualAdmissionForm({ ...f, ...patch })}
          gradeLevels={gradeLevels}
          mode="staff"
          onSubmit={(e) => handleManualAdmissionSubmit(e)}
          submitting={submitting}
          submitLabel={
            submitting
              ? t("admissions.manualAdmission.submitting")
              : t("admissions.manualAdmission.submitApplication")
          }
          firstStepExtra={applicantPicker}
        />
      </div>
    </div>
  );
}
