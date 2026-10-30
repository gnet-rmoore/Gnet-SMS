import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CalendarClock,
  Copy,
  FileDown,
  Loader2,
  Plus,
  Save,
  Settings2,
  Wand2,
} from "lucide-react";
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
  type ScheduleHealthDto,
  type SchedulePeriodDto,
  type SlotAvailabilityDto,
  type TeacherSlotAvailabilityDto,
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
  const [slotInfo, setSlotInfo] = useState<SlotAvailabilityDto | null>(null);
  const [loadingSlot, setLoadingSlot] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [health, setHealth] = useState<ScheduleHealthDto | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const slotReqRef = useRef(0);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c.id === classroomId) || null,
    [classrooms, classroomId]
  );

  const loadHealth = useCallback(
    async (bellId: string) => {
      if (!schoolId || !bellId) return;
      try {
        setHealth(await classScheduleApi.getScheduleHealth(schoolId, { bellScheduleId: bellId }));
      } catch {
        setHealth(null);
      }
    },
    [schoolId]
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
        void loadHealth(bellRow.id);
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
  }, [schoolId, showToast, loadHealth]);

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
    if (!canEdit || !bell || !schoolId) return;
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
    setSlotInfo(null);
    setSlotError("");
    setLoadingSlot(true);
    const reqId = ++slotReqRef.current;
    void (async () => {
      try {
        const info = await classScheduleApi.getSlotAvailability(schoolId, {
          bellScheduleId: bell.id,
          dayOfWeek: day,
          schedulePeriodId: periodId,
          classroomId: classroomId || undefined,
          subjectId: defaultSubject || undefined,
        });
        if (slotReqRef.current === reqId) setSlotInfo(info);
      } catch (err: any) {
        if (slotReqRef.current === reqId) {
          setSlotInfo(null);
          setSlotError(err?.message || t("classSchedule.availabilityFailed", {
            defaultValue: "Could not load teacher availability.",
          }));
        }
      } finally {
        if (slotReqRef.current === reqId) setLoadingSlot(false);
      }
    })();
  };

  const pickBestTeacher = () => {
    if (!slotInfo) return;
    const best = slotInfo.teachers.find((x) => x.status === "AVAILABLE");
    if (!best) return;
    const preferredSubject =
      cellForm.subjectId ||
      slotInfo.classroom?.subjectId ||
      slotInfo.subjectsForClass[0]?.id ||
      "";
    setCellForm({ teacherId: best.teacherId, subjectId: preferredSubject });
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
      void loadHealth(bell.id);
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

  const autoFill = async () => {
    if (!canEdit || !bell || !classroomId || !schoolId) return;
    setAutoFilling(true);
    try {
      const res = await classScheduleApi.suggestClassSchedule(schoolId, {
        bellScheduleId: bell.id,
        classroomId,
      });
      const fresh = res.suggestions.filter(
        (s) => !draft[cellKey(s.dayOfWeek, s.schedulePeriodId)]
      );
      if (fresh.length === 0) {
        showToast(
          res.suggestions.length === 0
            ? "No open slots to fill — every period already has a lesson, or no free teacher was found."
            : "All suggested slots already have a lesson.",
          "info"
        );
        return;
      }
      setDraft((prev) => {
        const next = { ...prev };
        for (const s of fresh) {
          const key = cellKey(s.dayOfWeek, s.schedulePeriodId);
          next[key] = {
            classroomId,
            teacherId: s.teacherId,
            teacherName: s.teacherName,
            subjectId: s.subjectId,
            subjectName: s.subjectName,
            dayOfWeek: s.dayOfWeek,
            schedulePeriodId: s.schedulePeriodId,
          };
        }
        return next;
      });
      setDirty(true);
      showToast(`Added ${fresh.length} suggested lessons. Review, then Save.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to build schedule suggestions", "error");
    } finally {
      setAutoFilling(false);
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
      void loadHealth(updated.id);
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => void autoFill()}
                    disabled={!classroomId || autoFilling}
                  >
                    {autoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Auto-fill
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

        {canEdit && selectedClassroom && health && (() => {
          const occ = health.classroomOccupancy.find((o) => o.classroomId === selectedClassroom.id);
          if (!occ) return null;
          return (
            <p className="text-xs text-slate-500 font-medium print:hidden">
              Class occupancy this week:{" "}
              <span className="font-mono">
                {occ.lessons}/{occ.totalSlots}
              </span>{" "}
              slots ({occ.fillRate}%).{" "}
              {occ.fillRate < 100
                ? "Use Auto-fill to suggest lessons for the open periods."
                : "Every period is occupied."}
            </p>
          );
        })()}

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

        {canEdit && health && health.warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 print:hidden">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              Workload & rest check · {health.warnings.length} warning
              {health.warnings.length === 1 ? "" : "s"}
            </div>
            <ul className="mt-2 space-y-1 text-sm text-amber-900/90 font-medium">
              {health.warnings.slice(0, 8).map((w, i) => (
                <li key={`${w.teacherId}-${w.dayOfWeek}-${w.code}-${i}`} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{w.message}</span>
                </li>
              ))}
              {health.warnings.length > 8 && (
                <li className="text-amber-800/80">…and {health.warnings.length - 8} more</li>
              )}
            </ul>
          </div>
        )}

        {canEdit && health && health.warnings.length === 0 && classrooms.length > 0 && periods.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-800 print:hidden">
            Workload & rest check · no back-to-back or overload warnings. Teachers have rest gaps.
          </div>
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
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearCell}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={pickBestTeacher}
                  disabled={loadingSlot || !slotInfo || !slotInfo.teachers.some((x) => x.status === "AVAILABLE")}
                >
                  <Wand2 className="w-4 h-4" />
                  Suggest best
                </Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setCellModal(null)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={applyCell} className="w-full sm:w-auto">
                  Apply
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 sm:space-y-6 p-1 sm:p-2">
            {loadingSlot && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking teacher availability…
              </div>
            )}
            {slotError ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {slotError}
              </p>
            ) : null}
            {!loadingSlot && !slotError && !teachers.length ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {t("classSchedule.noTeachers", { defaultValue: "No teachers are available for this school." })}
              </p>
            ) : null}

            {slotInfo?.freePeriodIds && slotInfo.freePeriodIds.length > 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {DAY_LABELS[cellModal.day]} free periods for this class
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {slotInfo.freePeriodIds.map((pid) => {
                    const p = periods.find((x) => x.id === pid);
                    return (
                      <span
                        key={pid}
                        className="rounded-lg bg-white px-2 py-0.5 text-xs font-mono font-bold text-indigo-700 border border-indigo-100"
                        title={p ? `${p.startTime}–${p.endTime}` : undefined}
                      >
                        {p?.shortCode || p?.label || pid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Teacher
              </label>
              <select
                value={cellForm.teacherId}
                onChange={(e) => setCellForm((f) => ({ ...f, teacherId: e.target.value }))}
                disabled={loadingSlot}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-50"
              >
                <option value="">Select teacher</option>
                {(slotInfo?.teachers?.length
                  ? slotInfo.teachers
                  : teachers.map((t) => fallbackAvailability(t.id, t.name))
                ).map((a) => (
                  <option key={a.teacherId} value={a.teacherId}>
                    {teacherOptionLabel(a)}
                  </option>
                ))}
              </select>
              {selectedTeacherAvailability(slotInfo, cellForm.teacherId)?.status === "BUSY" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {busyTeacherMessage(selectedTeacherAvailability(slotInfo, cellForm.teacherId))}
                </p>
              )}
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
                {(slotInfo?.subjectsForClass?.length ? slotInfo.subjectsForClass : subjects).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {slotInfo?.subjectsForClass && slotInfo.subjectsForClass.length > 0 && (
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  Suggested for this class subject / grade.
                </p>
              )}
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

function fallbackAvailability(id: string, name: string): TeacherSlotAvailabilityDto {
  return {
    teacherId: id,
    teacherName: name,
    status: "AVAILABLE",
    busyWith: null,
    lessonsThatDay: 0,
    longestStreak: 0,
    gapBeforeMin: null,
    gapAfterMin: null,
    restBefore: false,
    restAfter: false,
    subjectFit: "NONE",
    subjectMismatch: false,
    ownsThisClassroom: false,
    score: 0,
  };
}

function teacherOptionLabel(a: TeacherSlotAvailabilityDto): string {
  const bits: string[] = [];
  if (a.status === "BUSY") {
    const where = a.busyWith
      ? `${a.busyWith.classroomName}${a.busyWith.subjectName ? ` · ${a.busyWith.subjectName}` : ""}`
      : "teaching";
    bits.push(`Busy (${where})`);
  } else {
    bits.push("Free");
  }
  if (a.lessonsThatDay > 0) {
    bits.push(`${a.lessonsThatDay} lesson${a.lessonsThatDay === 1 ? "" : "s"} today`);
  }
  if (a.subjectFit === "OWN_CLASS") bits.push("class teacher");
  else if (a.subjectFit === "TEACHES_SUBJECT") bits.push("teaches this subject");
  else if (a.subjectMismatch) bits.push("no subject match");
  if (a.status === "AVAILABLE" && (a.restBefore || a.restAfter)) {
    const gaps = [
      a.restBefore ? a.gapBeforeMin : null,
      a.restAfter ? a.gapAfterMin : null,
    ].filter((n): n is number => n != null);
    if (gaps.length) bits.push(`rest ${gaps.join("/")} min`);
  }
  return `${a.status === "AVAILABLE" ? "✓" : "✕"} ${a.teacherName} — ${bits.join(" · ")}`;
}

function selectedTeacherAvailability(
  info: SlotAvailabilityDto | null,
  teacherId: string
): TeacherSlotAvailabilityDto | null {
  if (!info || !teacherId) return null;
  return info.teachers.find((x) => x.teacherId === teacherId) || null;
}

function busyTeacherMessage(a: TeacherSlotAvailabilityDto | null): string {
  if (!a) return "";
  if (a.busyWith) {
    return `Already teaching ${a.busyWith.classroomName}${
      a.busyWith.subjectName ? ` (${a.busyWith.subjectName})` : ""
    } ${a.busyWith.startTime}–${a.busyWith.endTime}. Pick another teacher or period.`;
  }
  return "Already booked in this period. Pick another teacher or period.";
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
