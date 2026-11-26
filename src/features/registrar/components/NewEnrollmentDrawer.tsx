import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { AlertCircle, Check, Loader2, Search, UserPlus, UserRound, X } from "lucide-react";
import { AdmissionFormWizard } from "../../admission-form";
import {
  emptyManualAdmissionForm,
  studentToManualAdmissionForm,
  type ManualAdmissionForm,
} from "../lib/manualAdmissionForm";
import { AdmissionApplicantPhoto } from "./AdmissionApplicantPhoto";
import { Button } from "../../../components/ui";
import { isAdmissionFormEmpty } from "../../admission-form";
import { confirmAction } from "../../../lib/swal";
import { cn } from "../../../lib/cn";
import { useDrawerA11y } from "../../../hooks/useDrawerA11y";

export type NewEnrollmentDrawerProps = {
  gradeLevels: any[];
  students: any[];
  studentsLoading?: boolean;
  gradeLoadState?: "loading" | "error" | "empty" | "ready";
  onRetryGrades?: () => void;
  handleManualAdmissionSubmit: (e: React.FormEvent) => void;
  manualAdmissionForm: ManualAdmissionForm;
  setManualAdmissionForm: (v: ManualAdmissionForm) => void;
  submitting: boolean;
};

const PREFILL_FIELDS: Array<keyof ManualAdmissionForm> = [
  "firstName",
  "middleName",
  "lastName",
  "dob",
  "gender",
  "gradeLevelId",
  "studentIdNumber",
  "address",
  "fatherName",
  "fatherPhone",
  "fatherEmail",
];

export function NewEnrollmentDrawer({
  gradeLevels,
  students,
  studentsLoading = false,
  gradeLoadState = "ready",
  onRetryGrades,
  handleManualAdmissionSubmit,
  manualAdmissionForm,
  setManualAdmissionForm,
  submitting,
}: NewEnrollmentDrawerProps) {
  const { t } = useTranslation(["pages", "common"]);
  const form = manualAdmissionForm;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [showStudentList, setShowStudentList] = useState(false);
  const [linkedPhotoUrl, setLinkedPhotoUrl] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const secondaryTriggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const wasSubmitting = useRef(false);
  const focusSearchRef = useRef(false);
  const restoreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const requestCloseRef = useRef<() => Promise<void>>(async () => undefined);

  const isDirty =
    Boolean(form.existingStudentId) ||
    Boolean(form.pendingPhotoUrl) ||
    !isAdmissionFormEmpty(form);

  const requestClose = useCallback(async () => {
    if (submitting) return;
    if (!isDirty) {
      setDrawerOpen(false);
      return;
    }
    const confirmed = await confirmAction({
      title: t("admissions.manualAdmission.discardTitle"),
      text: t("admissions.manualAdmission.discardText"),
      confirmText: t("admissions.manualAdmission.discard"),
      danger: true,
    });
    if (confirmed) {
      setManualAdmissionForm(emptyManualAdmissionForm());
      setStudentQuery("");
      setShowStudentList(false);
      setLinkedPhotoUrl(null);
      setDrawerOpen(false);
    }
  }, [isDirty, submitting, t]);

  requestCloseRef.current = requestClose;

  const openDrawer = (returning = false) => {
    focusSearchRef.current = returning;
    restoreTriggerRef.current = returning ? secondaryTriggerRef.current : triggerRef.current;
    setShowStudentList(returning);
    setDrawerOpen(true);
  };

  useDrawerA11y({
    open: drawerOpen,
    panelRef,
    initialFocusRef: focusSearchRef.current ? searchRef : closeRef,
    restoreTriggerRef,
    onRequestClose: () => { void requestCloseRef.current(); },
  });

  useEffect(() => {
    if (wasSubmitting.current && !submitting && !form.existingStudentId && isAdmissionFormEmpty(form)) {
      setDrawerOpen(false);
    }
    wasSubmitting.current = submitting;
  }, [form, submitting]);

  useEffect(() => {
    setLinkedPhotoUrl(null);
  }, [form.existingStudentId]);

  const studentOptions = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    const list = Array.isArray(students) ? students : [];
    const filtered = !query
      ? list
      : list.filter((student) => {
          const haystack = [
            student.name,
            student.email,
            student.parentName,
            student.phone,
            student.studentId,
            student.admissionNumber,
            student.id,
            student.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
    return filtered.slice(0, 80);
  }, [students, studentQuery]);

  const selectedStudent = useMemo(
    () =>
      Array.isArray(students)
        ? students.find((student) => student.id === form.existingStudentId) || null
        : null,
    [students, form.existingStudentId]
  );

  const changedFields = useMemo(() => {
    if (!selectedStudent) return [] as string[];
    const prefilled = studentToManualAdmissionForm(selectedStudent, emptyManualAdmissionForm());
    return PREFILL_FIELDS.filter(
      (key) => String(form[key] ?? "") !== String(prefilled[key] ?? "")
    );
  }, [form, selectedStudent]);

  const selectNewApplicant = () => {
    setManualAdmissionForm({ ...form, existingStudentId: "" });
    setStudentQuery("");
    setShowStudentList(false);
    setLinkedPhotoUrl(null);
  };

  const applyExistingStudent = (studentId: string) => {
    if (!studentId) {
      setManualAdmissionForm(emptyManualAdmissionForm());
      setStudentQuery("");
      setShowStudentList(false);
      setLinkedPhotoUrl(null);
      return;
    }
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    setManualAdmissionForm(studentToManualAdmissionForm(student, emptyManualAdmissionForm()));
    setStudentQuery("");
    setShowStudentList(false);
    setLinkedPhotoUrl(null);
  };

  const gradesStateLabels = {
    loading: t("admissions.manualAdmission.gradesLoading"),
    error: t("admissions.manualAdmission.gradesError"),
    empty: t("admissions.manualAdmission.gradesEmpty"),
    retry: t("admissions.manualAdmission.gradesRetry"),
  };

  const studentPhotoSlot = (
    <div
      className="flex h-full min-h-64 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4"
      aria-label={t("admissions.manualAdmission.profilePhoto")}
    >
      <AdmissionApplicantPhoto
        studentName={
          selectedStudent?.name ||
          [form.firstName, form.lastName].filter(Boolean).join(" ") ||
          t("admissions.manualAdmission.newApplicant")
        }
        linkedUserId={selectedStudent?.id}
        linkedPhotoUrl={linkedPhotoUrl ?? selectedStudent?.photoUrl}
        pendingPhotoUrl={form.pendingPhotoUrl}
        onPendingPhotoChange={(pendingPhotoUrl) =>
          setManualAdmissionForm({ ...form, pendingPhotoUrl })
        }
        onLinkedPhotoChange={setLinkedPhotoUrl}
        presentation="stacked"
        size="xl"
        confirmRemoval
      />
    </div>
  );

  const applicantPicker = (
    <section className="space-y-5" aria-labelledby="new-enrollment-applicant-type">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
            {t("admissions.manualAdmission.applicantType")}
          </p>
          <h3
            id="new-enrollment-applicant-type"
            className="mt-1 text-lg font-extrabold tracking-tight text-slate-900"
          >
            {t("admissions.manualAdmission.applicantTypeHint")}
          </h3>
        </div>
        {isDirty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            {t("admissions.manualAdmission.unsavedChanges")}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={selectNewApplicant}
          aria-pressed={!form.existingStudentId}
          className={cn(
            "flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-all",
            !form.existingStudentId
              ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
              : "border-slate-200 bg-white hover:border-indigo-200"
          )}
        >
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              !form.existingStudentId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
            )}
          >
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">
              {t("admissions.manualAdmission.newApplicant")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t("admissions.manualAdmission.newApplicantHint")}
            </p>
          </div>
          {!form.existingStudentId ? <Check className="ml-auto h-4 w-4 text-indigo-600" /> : null}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowStudentList(true);
            searchRef.current?.focus();
          }}
          aria-pressed={Boolean(form.existingStudentId)}
          className={cn(
            "flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-all",
            form.existingStudentId
              ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
              : "border-slate-200 bg-white hover:border-indigo-200"
          )}
        >
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              form.existingStudentId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
            )}
          >
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">
              {t("admissions.manualAdmission.prefillReturning")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t("admissions.manualAdmission.returningHint")}
            </p>
          </div>
          {form.existingStudentId ? <Check className="ml-auto h-4 w-4 text-indigo-600" /> : null}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
        <div className="space-y-2">
          <label
            htmlFor="existing-student-search"
            className="text-xs font-black uppercase tracking-wider text-slate-500"
          >
            {t("admissions.manualAdmission.searchExisting")}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              id="existing-student-search"
              type="search"
              value={studentQuery}
              onChange={(event) => {
                setStudentQuery(event.target.value);
                setShowStudentList(true);
              }}
              onFocus={() => setShowStudentList(true)}
              placeholder={t("admissions.manualAdmission.searchPlaceholder")}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {studentQuery.trim() || form.existingStudentId || showStudentList ? (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5">
              {studentOptions.map((student) => {
                const status = student.status
                  ? t(`admissions.status.${student.status}`, { defaultValue: student.status })
                  : "";
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => applyExistingStudent(student.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      form.existingStudentId === student.id ? "bg-indigo-50" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-black text-white">
                      {String(student.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {student.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {student.email || student.phone || t("admissions.manualAdmission.unnamed")}
                        {student.gradeLevel?.name ? ` · ${student.gradeLevel.name}` : ""}
                        {status ? ` · ${status}` : ""}
                      </span>
                    </span>
                    {form.existingStudentId === student.id ? (
                      <Check className="ml-auto h-4 w-4 text-indigo-600" />
                    ) : null}
                  </button>
                );
              })}
              {studentsLoading ? (
                <p className="flex items-center justify-center gap-2 px-3 py-5 text-xs font-semibold text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("admissions.manualAdmission.studentsLoading")}
                </p>
              ) : studentOptions.length === 0 ? (
                <p className="px-3 py-5 text-center text-xs font-medium text-slate-400">
                  {t("admissions.manualAdmission.noSearchMatches")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {selectedStudent ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {t("admissions.manualAdmission.selectedStudent")}
                </p>
                <button
                  type="button"
                  onClick={() => applyExistingStudent("")}
                  className="min-h-8 rounded-lg px-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  {t("admissions.manualAdmission.clearSelected")}
                </button>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-sm font-extrabold text-slate-900">{selectedStudent.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedStudent.email ||
                    selectedStudent.phone ||
                    t("admissions.manualAdmission.noContactDetails")}
                </p>
                <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700">
                  {changedFields.length === 0
                    ? t("admissions.manualAdmission.prefilledClean")
                    : t("admissions.manualAdmission.prefilledChanged", {
                        count: changedFields.length,
                      })}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-6 text-center">
              <UserPlus className="mx-auto h-8 w-8 text-indigo-300" />
              <p className="text-sm font-extrabold text-slate-700">
                {t("admissions.manualAdmission.newApplicant")}
              </p>
              <p className="mx-auto max-w-[18rem] text-xs leading-relaxed text-slate-500">
                {t("admissions.manualAdmission.newApplicantHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <>
      {!drawerOpen ? (
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_12px_32px_rgb(15,23,42,0.06)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-10 text-white sm:px-10">
            <div aria-hidden className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">
                  {t("admissions.manualAdmission.drawerEyebrow")}
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                  {t("admissions.manualAdmission.title")}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                  {t("admissions.manualAdmission.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  ref={triggerRef}
                  type="button"
                  onClick={() => openDrawer(false)}
                  className="min-h-12 shrink-0 rounded-xl bg-white px-5 text-sm font-extrabold text-slate-950 hover:bg-indigo-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("admissions.manualAdmission.startEnrollment")}
                </Button>
                <Button
                  ref={secondaryTriggerRef}
                  type="button"
                  variant="secondary"
                  onClick={() => openDrawer(true)}
                  className="min-h-12 shrink-0 rounded-xl border-white/20 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/20"
                >
                  <UserRound className="h-4 w-4" />
                  {t("admissions.manualAdmission.returningQuickStart")}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-3">
            {[
              [
                "1",
                t("admissions.manualAdmission.stepChooseApplicant"),
                t("admissions.manualAdmission.applicantTypeHint"),
              ],
              [
                "2",
                t("admissions.manualAdmission.stepCompleteDetails"),
                t("admissions.manualAdmission.stepCompleteDetailsHint"),
              ],
              [
                "3",
                t("admissions.manualAdmission.stepReviewSubmit"),
                t("admissions.manualAdmission.stepReviewSubmitHint"),
              ],
            ].map(([number, title, hint]) => (
              <div key={number} className="bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700">
                    {number}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-end">
          <motion.button
            type="button"
            aria-label={t("common:close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => void requestClose()}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-enrollment-drawer-title"
            aria-describedby="new-enrollment-drawer-subtitle"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="relative z-10 flex h-[100dvh] w-full max-w-[960px] flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-[-20px_0_60px_rgb(15,23,42,0.18)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 px-5 py-5 text-white sm:px-8 sm:py-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">
                    {t("admissions.manualAdmission.drawerEyebrow")}
                  </p>
                  {isDirty ? (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                      {t("admissions.manualAdmission.unsavedChanges")}
                    </span>
                  ) : null}
                </div>
                <h2 id="new-enrollment-drawer-title" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                  {t("admissions.manualAdmission.drawerTitle")}
                </h2>
                <p id="new-enrollment-drawer-subtitle" className="mt-1 text-sm font-medium text-slate-400">
                  {t("admissions.manualAdmission.drawerSubtitle")}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => void requestClose()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label={t("common:close")}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
                <AdmissionFormWizard
                  form={form}
                  onChange={(patch) => setManualAdmissionForm({ ...form, ...patch })}
                  gradeLevels={gradeLevels}
                  mode="staff"
                  onSubmit={handleManualAdmissionSubmit}
                  submitting={submitting}
                  submitLabel={
                    submitting
                      ? t("admissions.manualAdmission.submitting")
                      : t("admissions.manualAdmission.submitApplication")
                  }
                  firstStepExtra={applicantPicker}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_8px_32px_rgb(15,23,42,0.07)] sm:p-7 lg:p-8"
                  gradeLoadState={gradeLoadState}
                  onRetryGrades={onRetryGrades}
                  gradesStateLabels={gradesStateLabels}
                  changedFields={changedFields}
                  studentPhotoSlot={studentPhotoSlot}
                  applicantType={selectedStudent ? "returning" : "new"}
                />
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </>
  );
}
