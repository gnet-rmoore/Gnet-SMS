import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, Copy, FileDown, Loader2, Plus, Save, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageShell, PageHeader, Surface, Button, SelectField, TextField, MatrixScrollHint } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { FeatureModalShell } from "../academics-shared/FeatureModalShell";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { classScheduleApi } from "./api";
import { canEditClassSchedule } from "./access";
import { downloadScheduleWeekPdf } from "./lib/schedulePdf";
import {
  cellKey,
  DAY_LABELS,
  GRID_DAYS,
  type BellScheduleDto,
  type ClassroomOption,
  type DraftCell,
  type SchedulePeriodDto,
  type TimetableEntryDto,
} from "./types";

type StaffRow = { id: string; name: string; role?: string };
type SubjectRow = { id: string; name: string };

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as any).data)) {
    return (value as any).data as T[];
  }
  return [];
}

export function ClassSchedulePage() {
  const { t } = useTranslation(["pages", "common"]);
  const school = useAuthStore((s) => s.school);
  const user = useAuthStore((s) => s.user);
  const capabilities = useAuthStore((s) => s.capabilities);
  const schoolId = school?.id || "";
  const schoolName = school?.name || "";
  const canEdit = canEditClassSchedule(user?.role, capabilities);
  const { toast, showToast } = usePageToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bell, setBell] = useState<BellScheduleDto | null>(null);
  const [entries, setEntries] = useState<TimetableEntryDto[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [teachers, setTeachers] = useState<StaffRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [draft, setDraft] = useState<Record<string, DraftCell>>({});
  const [dirty, setDirty] = useState(false);
  const [cellModal, setCellModal] = useState<{ day: number; periodId: string } | null>(null);
  const [bellModal, setBellModal] = useState(false);
  const [copyModal, setCopyModal] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState("");
  const [periodDraft, setPeriodDraft] = useState<
    Array<{ periodNumber: number; label: string; shortCode: string; startTime: string; endTime: string }>
  >([]);
  const [cellForm, setCellForm] = useState({
    teacherId: "",
    subjectId: "",
  });
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [yearBounds, setYearBounds] = useState<{ start: string; end: string } | null>(null);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c.id === classroomId) || null,
    [classrooms, classroomId]
  );

  useEffect(() => {
    void (async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [bellRow, roomsRaw, staffRaw, subjectsRaw, calendarRaw] = await Promise.all([
          classScheduleApi.ensureBellSchedule(schoolId),
          classScheduleApi.fetchClassrooms(schoolId),
          classScheduleApi.fetchTeachers(schoolId),
          classScheduleApi.fetchSubjects(schoolId),
          classScheduleApi.fetchAcademicCalendar(schoolId).catch(() => null),
        ]);
        setBell(bellRow);
        setYearBounds(extractYearBounds(calendarRaw));
        const rooms = asArray<ClassroomOption>(roomsRaw);
        setClassrooms(rooms);
        setTeachers(asArray<StaffRow>(staffRaw).filter((s) => !s.role || s.role === "TEACHER"));
        setSubjects(asArray<SubjectRow>(subjectsRaw));
        const firstId = rooms[0]?.id || "";
        setClassroomId(firstId);
        if (firstId) {
          const tt = await classScheduleApi.listTimetable(schoolId, {
            bellScheduleId: bellRow.id,
            classroomId: firstId,
          });
          setEntries(tt);
          setDraft(entriesToDraft(tt));
          applyEffectiveFromEntries(tt, setEffectiveFrom, setEffectiveTo);
        }
        setDirty(false);
      } catch (err: any) {
        showToast(err?.message || t("classSchedule.toast.loadSchedulesFailed"), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId, showToast]);

  const loadClassroomTimetable = useCallback(
    async (bellId: string, roomId: string) => {
      if (!schoolId || !bellId || !roomId) return;
      try {
        const tt = await classScheduleApi.listTimetable(schoolId, {
          bellScheduleId: bellId,
          classroomId: roomId,
        });
        setEntries(tt);
        setDraft(entriesToDraft(tt));
        applyEffectiveFromEntries(tt, setEffectiveFrom, setEffectiveTo);
        setDirty(false);
      } catch (err: any) {
        showToast(err?.message || t("classSchedule.toast.loadTimetableFailed"), "error");
      }
    },
    [schoolId, showToast]
  );

  const onClassroomChange = async (id: string) => {
    if (dirty) {
      showToast(t("classSchedule.toast.unsavedDiscarded"), "info");
    }
    setClassroomId(id);
    if (bell) await loadClassroomTimetable(bell.id, id);
  };

  const openCell = (day: number, periodId: string) => {
    if (!canEdit) return;
    const key = cellKey(day, periodId);
    const existing = draft[key];
    const defaultTeacher =
      existing?.teacherId ||
      selectedClassroom?.ownerTeacherId ||
      selectedClassroom?.ownerTeacher?.id ||
      "";
    const defaultSubject =
      existing?.subjectId ||
      selectedClassroom?.subjectId ||
      selectedClassroom?.subject?.id ||
      "";
    setCellForm({ teacherId: defaultTeacher, subjectId: defaultSubject || "" });
    setCellModal({ day, periodId });
  };

  const applyCell = () => {
    if (!cellModal || !classroomId) return;
    const teacher = teachers.find((t) => t.id === cellForm.teacherId);
    if (!teacher) {
      showToast(t("classSchedule.toast.selectTeacher"), "error");
      return;
    }
    const subject = subjects.find((s) => s.id === cellForm.subjectId);
    const key = cellKey(cellModal.day, cellModal.periodId);
    setDraft((prev) => ({
      ...prev,
      [key]: {
        classroomId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjectId: subject?.id || null,
        subjectName: subject?.name || null,
        dayOfWeek: cellModal.day,
        schedulePeriodId: cellModal.periodId,
      },
    }));
    setDirty(true);
    setCellModal(null);
  };

  const clearCell = () => {
    if (!cellModal) return;
    const key = cellKey(cellModal.day, cellModal.periodId);
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDirty(true);
    setCellModal(null);
  };

  const saveGrid = async () => {
    if (!canEdit || !bell || !classroomId || !schoolId) return;
    if (yearBounds) {
      const outside =
        (effectiveFrom && (effectiveFrom < yearBounds.start || effectiveFrom > yearBounds.end)) ||
        (effectiveTo && (effectiveTo < yearBounds.start || effectiveTo > yearBounds.end));
      if (outside) {
        showToast(
          `Effective dates are outside the academic year window (${yearBounds.start} → ${yearBounds.end}). Saving anyway.`,
          "info"
        );
      }
    }
    setSaving(true);
    try {
      const payloadEntries = Object.values(draft).map((d) => ({
        classroomId: d.classroomId,
        teacherId: d.teacherId,
        subjectId: d.subjectId,
        dayOfWeek: d.dayOfWeek,
        schedulePeriodId: d.schedulePeriodId,
      }));
      const saved = await classScheduleApi.putTimetable(schoolId, {
        bellScheduleId: bell.id,
        classroomId,
        effectiveFrom: effectiveFrom || undefined,
        effectiveTo: effectiveTo || undefined,
        entries: payloadEntries,
      });
      setEntries(saved);
      setDraft(entriesToDraft(saved));
      applyEffectiveFromEntries(saved, setEffectiveFrom, setEffectiveTo);
      setDirty(false);
      showToast(t("classSchedule.toast.timetableSaved"), "success");
    } catch (err: any) {
      const conflicts = err?.conflicts;
      if (Array.isArray(conflicts) && conflicts.length) {
        showToast(conflicts[0]?.message || t("classSchedule.toast.conflicts"), "error");
      } else {
        showToast(err?.message || t("classSchedule.toast.saveTimetableFailed"), "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    if (!bell || !selectedClassroom) return;
    downloadScheduleWeekPdf({
      classroomName: selectedClassroom.name,
      bellName: bell.name,
      periods: bell.periods || [],
      cells: draft,
      schoolName,
      effectiveFrom,
      effectiveTo,
    });
  };

  const openBellEditor = () => {
    if (!canEdit || !bell) return;
    setPeriodDraft(
      bell.periods.map((p) => ({
        periodNumber: p.periodNumber,
        label: p.label,
        shortCode: p.shortCode,
        startTime: p.startTime,
        endTime: p.endTime,
      }))
    );
    setBellModal(true);
  };

  const saveBellPeriods = async () => {
    if (!canEdit || !bell) return;
    setSaving(true);
    try {
      const updated = await classScheduleApi.replacePeriods(
        bell.id,
        periodDraft.map((p, i) => ({ ...p, orderIndex: i }))
      );
      setBell(updated);
      setDraft({});
      setEntries([]);
      setDirty(false);
      setBellModal(false);
      showToast(t("classSchedule.toast.bellUpdated"), "success");
      if (classroomId) await loadClassroomTimetable(updated.id, classroomId);
    } catch (err: any) {
      showToast(err?.message || t("classSchedule.toast.bellFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const copyFromCurrent = async () => {
    if (!canEdit || !bell || !classroomId || !copyTargetId || !schoolId) return;
    setSaving(true);
    try {
      await classScheduleApi.copyClassroom(schoolId, {
        bellScheduleId: bell.id,
        fromClassroomId: classroomId,
        toClassroomId: copyTargetId,
      });
      setCopyModal(false);
      showToast(t("classSchedule.toast.copiedClassroom"), "success");
    } catch (err: any) {
      showToast(err?.message || t("classSchedule.toast.copyFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell width="wide" className="py-16 flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading class schedules…
      </PageShell>
    );
  }

  if (!schoolId) {
    return (
      <PageShell width="wide" className="py-16">
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500 text-sm font-medium">
            School context is missing. Sign out and sign in again, then reopen Class Schedules.
          </p>
        </div>
      </PageShell>
    );
  }

  const periods: SchedulePeriodDto[] = bell?.periods || [];

  return (
    <PageShell width="wide" className="print:max-w-none">
      <PageToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="print:hidden"
      >
        <PageHeader
          title={t("classSchedule.title")}
          subtitle={canEdit ? t("classSchedule.subtitle") : t("classSchedule.subtitleViewOnly")}
          actions={
            <>
              {canEdit ? (
                <>
                  <Button type="button" variant="secondary" size="compact" onClick={openBellEditor}>
                    <Settings2 className="w-4 h-4" />
                    Bell periods
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setCopyTargetId("");
                      setCopyModal(true);
                    }}
                    disabled={!classroomId || Object.keys(draft).length === 0}
                  >
                    <Copy className="w-4 h-4" />
                    Copy to…
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={downloadPdf}
                disabled={!classroomId || (bell?.periods || []).length === 0}
              >
                <FileDown className="w-4 h-4" />
                PDF
              </Button>
              {canEdit ? (
                <Button
                  type="button"
                  variant="primary"
                  size="compact"
                  onClick={() => void saveGrid()}
                  disabled={(!dirty && !effectiveRangeDirty(entries, effectiveFrom, effectiveTo)) || saving || !classroomId}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              ) : null}
            </>
          }
        />
      </motion.div>

      {!canEdit ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 font-medium print:hidden">
          {t("classSchedule.viewOnlyBanner")}
        </div>
      ) : null}

      <Surface as="div" className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end print:hidden">
          <SelectField
            label={t("classSchedule.classroom")}
            density="compact"
            containerClassName="flex-1 min-w-0"
            value={classroomId}
            onChange={(e) => void onClassroomChange(e.target.value)}
          >
            {classrooms.length === 0 && <option value="">No classrooms yet</option>}
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label={t("classSchedule.effectiveFrom")}
            type="date"
            density="compact"
            className="font-mono"
            value={effectiveFrom}
            disabled={!canEdit}
            onChange={(e) => {
              if (!canEdit) return;
              setEffectiveFrom(e.target.value);
              setDirty(true);
            }}
          />
          <TextField
            label={t("classSchedule.effectiveTo")}
            type="date"
            density="compact"
            className="font-mono"
            value={effectiveTo}
            disabled={!canEdit}
            onChange={(e) => {
              if (!canEdit) return;
              setEffectiveTo(e.target.value);
              setDirty(true);
            }}
          />
          <div className="text-sm text-slate-500 font-medium flex items-center gap-2 pb-1">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            {bell?.name || t("classSchedule.modals.bellSchedule")}
            {dirty && <span className="text-amber-600 font-bold">· {t("classSchedule.modals.unsaved")}</span>}
          </div>
        </div>
        {yearBounds && (
          <p className="text-xs text-slate-500 font-medium print:hidden">
            Academic year window:{" "}
            <span className="font-mono">
              {yearBounds.start} → {yearBounds.end}
            </span>
            . Leave effective dates empty for an open-ended timetable.
          </p>
        )}

        <div className="hidden print:block mb-4">
          <h2 className="text-xl font-extrabold tracking-tight">
            {selectedClassroom?.name || t("classSchedule.classroom")} — {t("classSchedule.modals.weeklyTimetable")}
          </h2>
          <p className="text-sm text-slate-600">{bell?.name}</p>
        </div>

        {classrooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500 font-medium">
            {canEdit
              ? "Create classrooms first, then build their weekly schedule here."
              : t("classSchedule.emptyNoTimetable")}
          </div>
        ) : periods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500 font-medium">
            {canEdit ? "Define bell periods to start the grid." : t("classSchedule.emptyNoBell")}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <MatrixScrollHint label={t("classSchedule.swipeHint")} />
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 p-2 w-28">
                    Period
                  </th>
                  {GRID_DAYS.map((d) => (
                    <th
                      key={d}
                      className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 p-2"
                    >
                      {DAY_LABELS[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id} className="border-t border-slate-100">
                    <td className="p-2 align-top">
                      <div className="text-sm font-extrabold tracking-tight text-slate-900">
                        {period.shortCode}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {period.startTime}–{period.endTime}
                      </div>
                    </td>
                    {GRID_DAYS.map((day) => {
                      const key = cellKey(day, period.id);
                      const cell = draft[key];
                      const cellClass = `w-full min-h-[72px] text-left rounded-2xl border p-3 transition-colors print:cursor-default ${
                        cell
                          ? "border-indigo-100 bg-indigo-50/60"
                          : "border-dashed border-slate-200 bg-slate-50/50"
                      } ${canEdit ? (cell ? "hover:bg-indigo-50" : "hover:border-indigo-200 hover:bg-white") : "cursor-default"}`;
                      const cellBody = cell ? (
                        <>
                          <p className="text-sm font-bold text-slate-900 leading-snug">
                            {cell.subjectName || t("classSchedule.modals.class")}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{cell.teacherName}</p>
                        </>
                      ) : canEdit ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 print:hidden">
                          <Plus className="w-3.5 h-3.5" />
                          Assign
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">—</span>
                      );
                      return (
                        <td key={key} className="p-1.5 align-top">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openCell(day, period.id)}
                              className={cellClass}
                            >
                              {cellBody}
                            </button>
                          ) : (
                            <div className={cellClass}>{cellBody}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.length === 0 && !dirty && classrooms.length > 0 && periods.length > 0 && (
          <p className="text-sm text-slate-500 font-medium">
            {canEdit
              ? "No timetable cells yet for this classroom. Click a cell to assign a teacher."
              : t("classSchedule.emptyNoEntries")}
          </p>
        )}
      </Surface>

      {cellModal && (
        <FeatureModalShell
          title={t("classSchedule.modals.assignClass")}
          subtitle={`${DAY_LABELS[cellModal.day]} · ${
            periods.find((p) => p.id === cellModal.periodId)?.label || t("classSchedule.period")
          }`}
          eyebrow={t("classSchedule.modals.timetable")}
          onClose={() => setCellModal(null)}
          footer={
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={clearCell} className="text-rose-600 hover:bg-rose-50">
                Clear
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setCellModal(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={applyCell}>
                  Apply
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Teacher
              </label>
              <select
                value={cellForm.teacherId}
                onChange={(e) => setCellForm((f) => ({ ...f, teacherId: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              >
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Subject
              </label>
              <select
                value={cellForm.subjectId}
                onChange={(e) => setCellForm((f) => ({ ...f, subjectId: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              >
                <option value="">Optional</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FeatureModalShell>
      )}

      {bellModal && (
        <FeatureModalShell
          title={t("classSchedule.modals.bellPeriods")}
          subtitle={t("classSchedule.modals.bellSubtitle")}
          eyebrow={t("classSchedule.modals.bellSchedule")}
          wide
          onClose={() => setBellModal(false)}
          footer={
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setPeriodDraft((rows) => [
                    ...rows,
                    {
                      periodNumber: rows.length + 1,
                      label: `Period ${rows.length + 1}`,
                      shortCode: `P${rows.length + 1}`,
                      startTime: "08:00",
                      endTime: "08:45",
                    },
                  ])
                }
              >
                Add period
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setBellModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void saveBellPeriods()}
                  disabled={saving || periodDraft.length === 0}
                >
                  Save periods
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {periodDraft.map((p, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-6 gap-2 rounded-2xl border border-slate-100 p-3"
              >
                <input
                  value={p.label}
                  onChange={(e) =>
                    setPeriodDraft((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
                    )
                  }
                  className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder={t("classSchedule.modals.label")}
                />
                <input
                  value={p.shortCode}
                  onChange={(e) =>
                    setPeriodDraft((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, shortCode: e.target.value } : r))
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  placeholder="P1"
                />
                <input
                  type="time"
                  value={p.startTime}
                  onChange={(e) =>
                    setPeriodDraft((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, startTime: e.target.value } : r))
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                />
                <input
                  type="time"
                  value={p.endTime}
                  onChange={(e) =>
                    setPeriodDraft((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, endTime: e.target.value } : r))
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="compact"
                  onClick={() => setPeriodDraft((rows) => rows.filter((_, i) => i !== idx))}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </FeatureModalShell>
      )}

      {copyModal && (
        <FeatureModalShell
          title={t("classSchedule.modals.copySchedule")}
          subtitle={t("classSchedule.modals.copySubtitle", {
            name: selectedClassroom?.name || t("classSchedule.classroom"),
          })}
          eyebrow={t("classSchedule.modals.timetable")}
          onClose={() => setCopyModal(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCopyModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => void copyFromCurrent()}
                disabled={!copyTargetId || saving}
              >
                Copy
              </Button>
            </div>
          }
        >
          <select
            value={copyTargetId}
            onChange={(e) => setCopyTargetId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            <option value="">Select target classroom</option>
            {classrooms
              .filter((c) => c.id !== classroomId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </FeatureModalShell>
      )}
    </PageShell>
  );
}

function entriesToDraft(rows: TimetableEntryDto[]): Record<string, DraftCell> {
  const out: Record<string, DraftCell> = {};
  for (const e of rows) {
    out[cellKey(e.dayOfWeek, e.schedulePeriodId)] = {
      classroomId: e.classroomId,
      teacherId: e.teacherId,
      teacherName: e.teacherName,
      subjectId: e.subjectId,
      subjectName: e.subjectName,
      dayOfWeek: e.dayOfWeek,
      schedulePeriodId: e.schedulePeriodId,
    };
  }
  return out;
}

function applyEffectiveFromEntries(
  rows: TimetableEntryDto[],
  setFrom: (v: string) => void,
  setTo: (v: string) => void
) {
  if (!rows.length) {
    setFrom("");
    setTo("");
    return;
  }
  setFrom(rows[0].effectiveFrom || "");
  setTo(rows[0].effectiveTo || "");
}

function effectiveRangeDirty(
  rows: TimetableEntryDto[],
  from: string,
  to: string
): boolean {
  if (!rows.length) return Boolean(from || to);
  return (rows[0].effectiveFrom || "") !== from || (rows[0].effectiveTo || "") !== to;
}

function extractYearBounds(calendarRaw: unknown): { start: string; end: string } | null {
  const cal = calendarRaw as any;
  const periods = cal?.periods || cal?.academicPeriods || [];
  if (!Array.isArray(periods) || periods.length === 0) return null;
  const starts = periods
    .map((p: any) => String(p.startDate || "").slice(0, 10))
    .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const ends = periods
    .map((p: any) => String(p.endDate || "").slice(0, 10))
    .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (!starts.length || !ends.length) return null;
  return { start: starts[0], end: ends[ends.length - 1] };
}
