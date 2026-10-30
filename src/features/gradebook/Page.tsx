import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, ClipboardList, Layers } from "lucide-react";
import { motion } from "motion/react";
import { PageShell, PageHeader, Button, SelectField, Surface } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { confirmAction } from "../../lib/swal";
import { gradebookApi } from "./api";
import { api } from "../../services/api";
import { GradebookSheet, type GradebookRow } from "./components/GradebookSheet";
import {
  GradebookAssessmentSheet,
} from "./components/GradebookAssessmentSheet";
import type { AssessmentGradeRow } from "./api";
import type { AssessmentStructureColumn } from "../../lib/assessmentStructure";
import type { GradeLegendLike } from "../../lib/gradeLegend";
import { settingsApi } from "../settings/api";
import { GradebookModeSwitch } from "./components/GradebookModeSwitch";
import { PendingSyncBanner } from "./components/PendingSyncBanner";
import { gradebookHubCardClass } from "./components/gradebookUi";
import { useGradebookAutosave } from "./hooks/useGradebookAutosave";
import { useGradebookPendingCount } from "./hooks/useGradebookPendingCount";
import { flushAllPendingGradebookDrafts } from "./lib/gradebookBackgroundSync";
import {
  mergeLocalOverServer,
  type LocalGradeCell,
} from "./lib/gradebookLocalStore";
import {
  readGradebookSession,
  writeGradebookSession,
  type GradebookLastSession,
} from "./lib/gradebookSession";
import { useTranslation } from "react-i18next";
import {
  grantAllowsPeriodCell,
  type MineGrant,
} from "../../lib/gradeEditGrant";

type HubMode = "exams" | "assessment";

function statusChip(status: string, t: (key: string, options?: any) => any) {
  const map: Record<string, string> = {
    NOT_STARTED: "bg-slate-100 text-slate-500",
    DRAFT: "bg-indigo-50 text-indigo-700",
    SUBMITTED: "bg-amber-50 text-amber-700",
    REJECTED: "bg-rose-50 text-rose-700",
    ACCEPTED: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
        map[status] || map.NOT_STARTED
      }`}
    >
      {t(`gradeStatus.${status}`, { defaultValue: status })}
    </span>
  );
}

export const Gradebook = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = school?.slug;

  const [hubMode, setHubMode] = useState<HubMode>(() => {
    const m = searchParams.get("mode");
    if (m === "exam" || searchParams.get("examId")) return "exams";
    return "assessment";
  });
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [examClassrooms, setExamClassrooms] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    searchParams.get("examId")
  );
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    searchParams.get("classId")
  );
  const [examMeta, setExamMeta] = useState<any>(null);
  const [rows, setRows] = useState<GradebookRow[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Assessment mode (one calendar assessment + structure columns)
  const [myClassrooms, setMyClassrooms] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any>(null);
  const [calendarLoadError, setCalendarLoadError] = useState("");
  const [classroomLoadError, setClassroomLoadError] = useState("");
  const [legends, setLegends] = useState<GradeLegendLike[]>([]);
  const [assessmentClassId, setAssessmentClassId] = useState<string | null>(null);
  const [assessmentPeriodId, setAssessmentPeriodId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [assessmentMeta, setAssessmentMeta] = useState<any>(null);
  const [structureColumns, setStructureColumns] = useState<AssessmentStructureColumn[]>([]);
  const [assessmentRows, setAssessmentRows] = useState<AssessmentGradeRow[]>([]);
  const [assessmentSubjectId, setAssessmentSubjectId] = useState("");
  const [mineGrants, setMineGrants] = useState<MineGrant[]>([]);

  const classroomMeta = useMemo(
    () => examClassrooms.find((c) => c.id === selectedClassId),
    [examClassrooms, selectedClassId]
  );

  const loadHub = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    setCalendarLoadError("");
    setClassroomLoadError("");
    try {
      const [examList, grants, legendList] = await Promise.all([
        gradebookApi.fetchExams(school.id),
        api
          .get(`/api/schools/${school.id}/grades/edit-grants/mine`)
          .catch(() => []),
        settingsApi.fetchGradeLegends(school.id).catch(() => []),
      ]);
      const [roomsResult, calendarResult] = await Promise.allSettled([
        gradebookApi.fetchMyClassrooms(school.id),
        gradebookApi.fetchCalendar(school.id),
      ]);
      setExams(Array.isArray(examList) ? examList : []);
      setLegends(Array.isArray(legendList) ? legendList : []);
      setMineGrants(Array.isArray(grants) ? grants : []);
      const allRooms = roomsResult.status === "fulfilled" && Array.isArray(roomsResult.value)
        ? roomsResult.value
        : [];
      if (roomsResult.status === "rejected") {
        setClassroomLoadError(roomsResult.reason?.message || t("gradebook.toast.loadClassesFailed"));
      }
      const mine =
        user?.role === "TEACHER"
          ? allRooms.filter(
              (c: any) =>
                c.ownerTeacherId === user.id ||
                c.members?.some(
                  (m: any) =>
                    m.userId === user.id &&
                    ["TEACHER", "CO_TEACHER"].includes(m.role)
                )
            )
          : allRooms;
      setMyClassrooms(user?.role === "TEACHER" ? mine : allRooms);
      if (calendarResult.status === "fulfilled") {
        setCalendar(calendarResult.value);
      } else {
        setCalendar(null);
        setCalendarLoadError(calendarResult.reason?.message || t("gradebook.toast.loadFailed"));
      }
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [school?.id, user?.id, user?.role, showToast, t]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  const openExamClass = async (examId: string, classId: string) => {
    if (!school?.id) return;
    setSelectedExamId(examId);
    setSelectedClassId(classId);
    setSearchParams({ examId, classId });
    try {
      const [exam, classrooms, grades] = await Promise.all([
        gradebookApi.fetchExam(examId),
        gradebookApi.fetchTeacherClassrooms(examId),
        gradebookApi.fetchExamGrades(examId, classId),
      ]);
      setExamMeta(exam);
      setExamClassrooms(Array.isArray(classrooms) ? classrooms : []);
      const cls = (Array.isArray(classrooms) ? classrooms : []).find(
        (c: any) => c.id === classId
      );
      setSubjectId(cls?.subject?.id || "");
      const serverRows: GradebookRow[] = (Array.isArray(grades) ? grades : []).map(
        (g: any) => ({
          studentId: g.studentId,
          student: g.student || { name: t("gradebook.studentFallback"), email: "" },
          grade: g.grade,
          status: g.status || "DRAFT",
          isLocked: Boolean(g.isLocked),
          feedback: g.feedback,
        })
      );
      const local = mergeLocalOverServer(
        (Array.isArray(grades) ? grades : []).map((g: any) => ({
          studentId: g.studentId,
          grade: g.grade,
          updatedAt: g.updatedAt,
        })),
        null
      );
      // hydrate local after we know scope — done in effect via autosave.readLocal
      setRows(
        serverRows.map((r) => ({
          ...r,
          grade: local.entries.has(r.studentId)
            ? local.entries.get(r.studentId)!
            : r.grade,
        }))
      );
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.openFailed"), "error");
    }
  };

  const examScope =
    school?.id && selectedExamId && selectedClassId && subjectId
      ? {
          schoolId: school.id,
          examId: selectedExamId,
          classId: selectedClassId,
          subjectId,
          examComponentId: examMeta?.examComponentId || null,
        }
      : null;

  const syncExamDraft = useCallback(
    async (entries: LocalGradeCell[]) => {
      if (!selectedExamId || !examScope) return;
      await gradebookApi.bulkExamGrades(selectedExamId, {
        classId: examScope.classId,
        subjectId: examScope.subjectId,
        status: "DRAFT",
        examComponentId: examScope.examComponentId,
        entries,
      });
    },
    [selectedExamId, examScope]
  );

  const examAutosave = useGradebookAutosave({
    scope: examScope,
    entries: rows.map((r) => ({ studentId: r.studentId, grade: r.grade })),
    enabled: Boolean(examScope) && hubMode === "exams",
    syncDraft: syncExamDraft,
  });

  // Hydrate from local on open
  useEffect(() => {
    if (!examScope || !rows.length) return;
    const local = examAutosave.readLocal();
    if (!local) return;
    const merged = mergeLocalOverServer(
      rows.map((r) => ({
        studentId: r.studentId,
        grade: r.grade,
        updatedAt: null,
      })),
      local
    );
    if (!merged.usedLocal) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        grade: merged.entries.has(r.studentId)
          ? merged.entries.get(r.studentId)!
          : r.grade,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examScope?.examId, examScope?.classId]);

  const handleExamGradeChange = (studentId: string, grade: number | null) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, grade } : r))
    );
    examAutosave.onEdit();
  };

  const handleExamSubmit = async () => {
    if (!selectedExamId || !examScope) return;
    const empty = rows.filter(
      (r) =>
        !r.isLocked &&
        r.status !== "SUBMITTED" &&
        r.status !== "ACCEPTED" &&
        (r.grade === null || r.grade === undefined)
    );
    if (empty.length) {
      const ok = await confirmAction({
        title: t("gradebook.confirm.emptyScoresTitle"),
        text: t("gradebook.confirm.emptyScoresText", { count: empty.length }),
        confirmText: t("gradebook.confirm.emptyScoresConfirm"),
      });
      if (!ok) return;
    } else {
      const ok = await confirmAction({
        title: t("gradebook.confirm.submitTitle"),
        text: t("gradebook.confirm.submitText"),
        confirmText: t("common:submit"),
      });
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      await examAutosave.flush();
      const editable = rows.filter(
        (r) => !r.isLocked && r.status !== "SUBMITTED" && r.status !== "ACCEPTED"
      );
      await gradebookApi.bulkExamGrades(selectedExamId, {
        classId: examScope.classId,
        subjectId: examScope.subjectId,
        status: "SUBMITTED",
        examComponentId: examScope.examComponentId,
        entries: editable.map((r) => ({
          studentId: r.studentId,
          grade: r.grade,
        })),
      });
      examAutosave.clearLocal();
      showToast(t("gradebook.toast.submitted"), "success");
      await openExamClass(selectedExamId, examScope.classId);
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.submitFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Assessment mode ---
  const periods = calendar?.periods || [];
  const selectedPeriod = periods.find((p: any) => p.id === assessmentPeriodId);

  const openAssessment = async (
    classId: string,
    pId: string,
    componentId: string
  ) => {
    if (!school?.id) return;
    const room = myClassrooms.find((c) => c.id === classId);
    const period = periods.find((p: any) => p.id === pId);
    const component = period?.examComponents?.find((c: any) => c.id === componentId);
    if (!room || !period || !component) return;

    setAssessmentClassId(classId);
    setAssessmentPeriodId(pId);
    setAssessmentId(componentId);
    setAssessmentSubjectId(room.subjectId || room.subject?.id || "");
    setSearchParams({
      mode: "assessment",
      classId,
      periodId: pId,
      assessmentId: componentId,
    });

    try {
      const payload = await gradebookApi.fetchAssessmentGrades(school.id, {
        classId,
        examComponentId: componentId,
        subjectId: room.subjectId || room.subject?.id,
      });
      setAssessmentMeta(payload.assessment);
      setStructureColumns(payload.assessment.gradebookStructure || []);
      setAssessmentRows(payload.rows || []);
      writeGradebookSession({
        schoolId: school.id,
        classId,
        periodId: pId,
        assessmentId: componentId,
        className: room.name,
        periodLabel: period.label,
        assessmentLabel: component.label,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.loadPeriodFailed"), "error");
    }
  };

  const assessmentScope =
    school?.id && assessmentClassId && assessmentId && assessmentSubjectId
      ? {
          schoolId: school.id,
          classId: assessmentClassId,
          subjectId: assessmentSubjectId,
          examComponentId: assessmentId,
          examId: null as string | null,
        }
      : null;

  const syncAssessmentDraft = useCallback(
    async (entries: LocalGradeCell[]) => {
      if (!assessmentScope || !school?.id) return;
      await gradebookApi.bulkComponentGrades(school.id, {
        classId: assessmentScope.classId,
        subjectId: assessmentScope.subjectId,
        examComponentId: assessmentScope.examComponentId!,
        status: "DRAFT",
        entries: entries.map((e) => ({
          studentId: e.studentId,
          grade: e.grade,
          structureColumnId: e.structureColumnId,
          isIncomplete: e.isIncomplete,
        })),
      });
    },
    [assessmentScope, school?.id]
  );

  const assessmentEntries: LocalGradeCell[] = useMemo(
    () =>
      assessmentRows.flatMap((r) =>
        structureColumns.map((col) => ({
          studentId: r.studentId,
          structureColumnId: col.id,
          grade: r.cells[col.id]?.grade ?? null,
          isIncomplete: Boolean(r.cells[col.id]?.isIncomplete),
        }))
      ),
    [assessmentRows, structureColumns]
  );

  const assessmentAutosave = useGradebookAutosave({
    scope: assessmentScope,
    entries: assessmentEntries,
    enabled: Boolean(assessmentScope) && hubMode === "assessment",
    syncDraft: syncAssessmentDraft,
  });

  // Hydrate assessment sheet from local draft when reopening
  useEffect(() => {
    if (!assessmentScope || !assessmentRows.length || !structureColumns.length) return;
    const local = assessmentAutosave.readLocal();
    if (!local?.entries?.length || !local.pendingSync) return;
    setAssessmentRows((prev) =>
      prev.map((row) => {
        const localCells = local.entries.filter((e) => e.studentId === row.studentId);
        if (!localCells.length) return row;
        const cells = { ...row.cells };
        for (const e of localCells) {
          const colId = e.structureColumnId;
          if (!colId) continue;
          const prevCell = cells[colId] || {
            grade: null,
            status: "DRAFT",
            isLocked: false,
            isIncomplete: false,
            incompleteNote: null,
            entryId: null,
          };
          cells[colId] = {
            ...prevCell,
            grade: e.grade,
            isIncomplete: Boolean(e.isIncomplete),
            incompleteNote: e.incompleteNote ?? null,
          };
        }
        return { ...row, cells };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentScope?.examComponentId, assessmentScope?.classId, structureColumns.length]);

  const handleAssessmentGradeChange = (
    studentId: string,
    structureColumnId: string,
    grade: number | null
  ) => {
    setAssessmentRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const prevCell = r.cells[structureColumnId] || {
          grade: null,
          status: "DRAFT",
          isLocked: false,
          isIncomplete: false,
          incompleteNote: null,
          entryId: null,
        };
        return {
          ...r,
          cells: {
            ...r.cells,
            [structureColumnId]: {
              ...prevCell,
              grade,
              status: "DRAFT",
              isLocked: false,
            },
          },
        };
      })
    );
    assessmentAutosave.onEdit();
  };

  const isAdminGrader = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || "");

  const assessmentCellEditable = (
    studentId: string,
    columnId: string,
    cell: { grade: number | null; status: string; isLocked: boolean; isIncomplete?: boolean } | undefined
  ) => {
    if (isAdminGrader) return true;
    if (!cell) return true;
    if (!cell.isLocked && cell.status !== "SUBMITTED" && cell.status !== "ACCEPTED") {
      return true;
    }
    if (!assessmentClassId || !assessmentId) return false;
    const col = structureColumns.find((c) => c.id === columnId);
    if (!col) return false;
    return grantAllowsPeriodCell({
      grants: mineGrants,
      classId: assessmentClassId,
      subjectId: assessmentSubjectId,
      column: {
        id: assessmentId,
        label: assessmentMeta?.label || "",
        shortCode: assessmentMeta?.shortCode || "",
        componentType: col.componentType,
      },
      cell: cell || {},
    });
  };

  const handleAssessmentToggleIncomplete = (
    studentId: string,
    structureColumnId: string
  ) => {
    setAssessmentRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const prevCell = r.cells[structureColumnId] || {
          grade: null,
          status: "DRAFT",
          isLocked: false,
          isIncomplete: false,
          incompleteNote: null,
          entryId: null,
        };
        return {
          ...r,
          cells: {
            ...r.cells,
            [structureColumnId]: {
              ...prevCell,
              isIncomplete: !prevCell.isIncomplete,
              status: "DRAFT",
              isLocked: false,
            },
          },
        };
      })
    );
    assessmentAutosave.onEdit();
  };

  const grantBanner =
    mineGrants.length > 0
      ? `Special edit access active until ${new Date(
          Math.max(...mineGrants.map((g) => new Date(g.expiresAt).getTime()))
        ).toLocaleString()} (CA / Incomplete as granted). Edits reopen as draft for review.`
      : null;

  const handleAssessmentSubmit = async () => {
    if (!school?.id || !assessmentScope) return;

    let emptyCells = 0;
    let filledCells = 0;
    for (const row of assessmentRows) {
      for (const col of structureColumns) {
        if (col.isActive === false) continue;
        const g = row.cells[col.id]?.grade;
        if (g === null || g === undefined) emptyCells++;
        else filledCells++;
      }
    }

    const ok = await confirmAction({
      title: t("gradebook.confirm.submitTitle"),
      html: `<p>${t("gradebook.confirm.submitAssessmentIntro", {
        defaultValue: "You are about to submit this assessment for review.",
      })}</p>
      <ul style="text-align:left;margin:12px 0;padding-left:20px;line-height:1.6">
        <li><strong>${filledCells}</strong> ${t("gradebook.confirm.scoresEntered", { defaultValue: "scores entered" })}</li>
        <li><strong>${emptyCells}</strong> ${t("gradebook.confirm.scoresEmpty", { defaultValue: "cells still empty" })}</li>
        <li>${t("gradebook.confirm.submitLockHint", { defaultValue: "Submitted cells lock until an admin reviews or grants edit access." })}</li>
      </ul>`,
      confirmText: t("gradebook.submitAssessment", { defaultValue: "Submit assessment" }),
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await assessmentAutosave.flush();
      const entries = assessmentRows.flatMap((r) =>
        structureColumns.map((col) => ({
          studentId: r.studentId,
          structureColumnId: col.id,
          grade: r.cells[col.id]?.grade ?? null,
          isIncomplete: Boolean(r.cells[col.id]?.isIncomplete),
        }))
      );
      await gradebookApi.bulkComponentGrades(school.id, {
        classId: assessmentScope.classId,
        subjectId: assessmentScope.subjectId,
        examComponentId: assessmentScope.examComponentId!,
        status: "SUBMITTED",
        entries,
      });
      assessmentAutosave.clearLocal();
      showToast(t("gradebook.toast.submitted"), "success");
      if (assessmentClassId && assessmentPeriodId && assessmentId) {
        await openAssessment(assessmentClassId, assessmentPeriodId, assessmentId);
      }
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.submitFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const closeSheet = () => {
    setSelectedExamId(null);
    setSelectedClassId(null);
    setAssessmentClassId(null);
    setAssessmentPeriodId(null);
    setAssessmentId(null);
    setAssessmentMeta(null);
    setSearchParams({});
  };

  // Deep-link open
  useEffect(() => {
    const examId = searchParams.get("examId");
    const classId = searchParams.get("classId");
    const mode = searchParams.get("mode");
    if (mode === "assessment" || mode === "period") {
      setHubMode("assessment");
      const pId = searchParams.get("periodId");
      const aId = searchParams.get("assessmentId");
      if (classId && pId && aId && calendar) {
        void openAssessment(classId, pId, aId);
      }
      return;
    }
    if (examId && classId && !rows.length) {
      void openExamClass(examId, classId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar]);

  const showExamSheet = selectedExamId && selectedClassId && rows.length >= 0 && examMeta;
  const showAssessmentSheet =
    assessmentClassId && assessmentPeriodId && assessmentId && structureColumns.length > 0;

  const lastSession = school?.id ? readGradebookSession(school.id) : null;

  const activeDraftScope =
    showExamSheet && examScope
      ? examScope
      : showAssessmentSheet && assessmentScope
        ? assessmentScope
        : null;

  const [syncingAll, setSyncingAll] = useState(false);

  const { pendingCount, refresh: refreshPendingCount } = useGradebookPendingCount(
    school?.id,
    activeDraftScope
  );

  const handleSyncAllPending = async () => {
    if (!school?.id) return;
    setSyncingAll(true);
    try {
      const result = await flushAllPendingGradebookDrafts(school.id, {
        excludeScope: activeDraftScope,
      });
      refreshPendingCount();
    if (result.synced > 0 && result.failed === 0) {
      showToast(
        t("gradebook.toast.syncedAll", {
          count: result.synced,
          defaultValue: "{{count}} gradebook(s) synced",
        }),
        "success"
      );
    } else if (result.synced > 0 && result.failed > 0) {
      showToast(
        t("gradebook.toast.syncedPartial", {
          synced: result.synced,
          failed: result.failed,
          defaultValue: "{{synced}} synced, {{failed}} failed — tap Sync all to retry",
        }),
        "info"
      );
    } else if (result.failed > 0) {
      showToast(
        t("gradebook.toast.syncAllFailed", { defaultValue: "Sync failed — try again" }),
        "error"
      );
    }
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <PageShell width="wide" className="pb-16">
      <PageToast toast={toast} />

      {!showExamSheet && !showAssessmentSheet && (
        <>
          <PageHeader
            title={
              <>
                <span className="block text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
                  {t("common:assessmentEyebrow")}
                </span>
                {t("gradebook.title")}
              </>
            }
            subtitle={t("gradebook.subtitle")}
          />

          <GradebookModeSwitch
            mode={hubMode}
            onChange={setHubMode}
            examLabel={t("gradebook.modeByExam")}
            assessmentLabel={t("gradebook.modeByAssessment", { defaultValue: "By assessment" })}
          />

          <PendingSyncBanner
            pendingCount={pendingCount}
            syncing={syncingAll}
            onSyncAll={() => void handleSyncAllPending()}
          />

          {loading ? (
            <div className="h-48 rounded-[32px] bg-slate-100 animate-pulse" />
          ) : hubMode === "exams" ? (
            <ExamHub
              exams={exams}
              slug={slug}
              t={t}
              onPickExam={async (examId) => {
                try {
                  const classrooms =
                    await gradebookApi.fetchTeacherClassrooms(examId);
                  setExamClassrooms(Array.isArray(classrooms) ? classrooms : []);
                  setSelectedExamId(examId);
                  setExamMeta(exams.find((e) => e.id === examId) || null);
                } catch (err: any) {
                  showToast(err?.message || t("gradebook.toast.loadClassesFailed"), "error");
                }
              }}
              onClearExam={() => {
                setSelectedExamId(null);
                setExamClassrooms([]);
              }}
              selectedExamId={selectedExamId}
              classrooms={examClassrooms}
              onOpenClass={(classId) => {
                if (selectedExamId) void openExamClass(selectedExamId, classId);
              }}
              onBrowseExams={() => navigate(`/${slug}/exams`)}
            />
          ) : (
            <AssessmentHub
              classrooms={myClassrooms}
              periods={periods}
              hasCalendar={Boolean(calendar)}
              calendarLoadError={calendarLoadError}
              classroomLoadError={classroomLoadError}
              canManageCalendar={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(user?.role || "")}
              lastSession={lastSession}
              t={t}
              onRetry={() => void loadHub()}
              onOpen={(classId, pId, aId) =>
                void openAssessment(classId, pId, aId)
              }
              onContinue={(session) =>
                void openAssessment(session.classId, session.periodId, session.assessmentId)
              }
              onSetupCalendar={() =>
                navigate(`/${slug}/settings/academic-calendar`)
              }
            />
          )}
        </>
      )}

      {showExamSheet && (
        <GradebookSheet
          title={examMeta?.title || t("gradebook.examGradesFallback")}
          subtitle={`${classroomMeta?.name || t("gradebook.classFallback")}${
            classroomMeta?.subject?.name
              ? ` · ${classroomMeta.subject.name}`
              : ""
          }`}
          rows={rows}
          onChangeGrade={handleExamGradeChange}
          syncStatus={examAutosave.status}
          lastSavedAt={examAutosave.lastSavedAt}
          errorMessage={examAutosave.errorMessage}
          onSyncNow={() => void examAutosave.flush()}
          onSubmit={() => void handleExamSubmit()}
          onBack={closeSheet}
          submitting={submitting}
        />
      )}

      {showAssessmentSheet && (
        <GradebookAssessmentSheet
          title={
            myClassrooms.find((c) => c.id === assessmentClassId)?.name ||
            t("gradebook.periodFallback")
          }
          subtitle={selectedPeriod?.label || ""}
          assessmentLabel={assessmentMeta?.label || ""}
          periodLabel={assessmentMeta?.periodLabel || selectedPeriod?.label || ""}
          columns={structureColumns}
          rows={assessmentRows}
          legends={legends}
          structureSource={assessmentMeta?.structureSource}
          onChangeGrade={handleAssessmentGradeChange}
          onToggleIncomplete={
            isAdminGrader || mineGrants.some((g) => g.scope.includes("INCOMPLETE"))
              ? handleAssessmentToggleIncomplete
              : undefined
          }
          cellEditable={assessmentCellEditable}
          grantBanner={grantBanner}
          syncStatus={assessmentAutosave.status}
          lastSavedAt={assessmentAutosave.lastSavedAt}
          errorMessage={assessmentAutosave.errorMessage}
          onSyncNow={() => void assessmentAutosave.flush()}
          onSubmit={() => void handleAssessmentSubmit()}
          onBack={closeSheet}
          submitting={submitting}
        />
      )}
    </PageShell>
  );
};

function ExamHub({
  exams,
  slug,
  t,
  onPickExam,
  onClearExam,
  selectedExamId,
  classrooms,
  onOpenClass,
  onBrowseExams,
}: {
  exams: any[];
  slug?: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onPickExam: (id: string) => void;
  onClearExam: () => void;
  selectedExamId: string | null;
  classrooms: any[];
  onOpenClass: (classId: string) => void;
  onBrowseExams: () => void;
}) {
  if (!selectedExamId) {
    return (
      <div className="space-y-4">
        {exams.length === 0 ? (
          <Surface className="py-16 text-center px-6 border-dashed">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("gradebook.noExams")}
            </p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              {t("gradebook.noExamsHint")}
            </p>
            <Button type="button" variant="primary" onClick={onBrowseExams} className="mt-6 min-h-[48px]">
              {t("gradebook.goToExams")}
            </Button>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <motion.button
                key={exam.id}
                type="button"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onPickExam(exam.id)}
                className={`${gradebookHubCardClass} p-6 text-left hover:border-indigo-200 transition-colors min-h-[88px]`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold tracking-tight text-slate-900 truncate">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("common:deadline")}{" "}
                      {exam.gradeSubmissionDeadline
                        ? new Date(
                            exam.gradeSubmissionDeadline
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onClearExam}
        className="text-sm font-bold text-slate-500 hover:text-indigo-600 min-h-[44px] px-1 -ml-1"
      >
        {t("gradebook.allExams")}
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpenClass(c.id)}
            className={`${gradebookHubCardClass} p-5 text-left hover:border-indigo-200 transition-colors min-h-[88px]`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-extrabold tracking-tight text-slate-900 truncate">
                {c.name}
              </h3>
              {statusChip(c.submissionStatus || "NOT_STARTED", t)}
            </div>
            <p className="text-xs text-slate-500">
              {c.subject?.name || t("common:subject")} ·{" "}
              {t("common:studentsCount", { count: c._count?.members ?? "—" })}
            </p>
          </button>
        ))}
        {classrooms.length === 0 && (
          <p className="text-sm text-slate-500 col-span-full">
            {t("gradebook.noClassrooms")}
          </p>
        )}
      </div>
    </div>
  );
}

function AssessmentHub({
  classrooms,
  periods,
  hasCalendar,
  calendarLoadError,
  classroomLoadError,
  canManageCalendar,
  lastSession,
  t,
  onOpen,
  onContinue,
  onSetupCalendar,
  onRetry,
}: {
  classrooms: any[];
  periods: any[];
  hasCalendar: boolean;
  calendarLoadError: string;
  classroomLoadError: string;
  canManageCalendar: boolean;
  lastSession: GradebookLastSession | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onOpen: (classId: string, periodId: string, assessmentId: string) => void;
  onContinue: (session: GradebookLastSession) => void;
  onSetupCalendar: () => void;
  onRetry: () => void;
}) {
  const [classId, setClassId] = useState(classrooms[0]?.id || "");
  const [periodId, setPeriodId] = useState(periods[0]?.id || "");
  const [assessmentId, setAssessmentId] = useState("");

  const selectedPeriod = periods.find((p: any) => p.id === periodId);
  const assessments = selectedPeriod?.examComponents || [];
  const selectedClass = classrooms.find((c) => c.id === classId);
  const selectedAssessment = assessments.find((a: any) => a.id === assessmentId);

  useEffect(() => {
    if (!classId && classrooms[0]?.id) setClassId(classrooms[0].id);
  }, [classrooms, classId]);

  useEffect(() => {
    if (!periodId && periods[0]?.id) setPeriodId(periods[0].id);
  }, [periods, periodId]);

  useEffect(() => {
    if (assessments.length && !assessmentId) {
      setAssessmentId(assessments[0].id);
    } else if (assessments.length && !assessments.find((a: any) => a.id === assessmentId)) {
      setAssessmentId(assessments[0]?.id || "");
    }
  }, [periodId, assessments, assessmentId]);

  if (calendarLoadError || classroomLoadError) {
    return (
      <Surface className="py-12 text-center px-6 border border-amber-200 bg-amber-50/50">
        <p className="text-lg font-extrabold text-slate-900">
          {t("gradebook.loadSetupFailed", { defaultValue: "Could not load gradebook setup" })}
        </p>
        <p role="alert" className="text-sm text-slate-600 mt-2">
          {calendarLoadError || classroomLoadError}
        </p>
        <Button type="button" variant="primary" onClick={onRetry} className="mt-5 min-h-11">
          {t("common:retry", { defaultValue: "Retry" })}
        </Button>
      </Surface>
    );
  }

  if (!hasCalendar) {
    return (
      <Surface className="py-16 text-center px-6 border-dashed">
        <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-lg font-extrabold tracking-tight text-slate-900">
          {canManageCalendar
            ? t("gradebook.setupCalendarTitle")
            : t("gradebook.teacherCalendarMissing", {
                defaultValue: "No active academic calendar — ask your school admin to publish it.",
              })}
        </p>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          {canManageCalendar
            ? t("gradebook.setupCalendarHint")
            : t("gradebook.teacherCalendarMissingHint", {
                defaultValue: "Grades will be available once the academic calendar is published.",
              })}
        </p>
        {canManageCalendar ? (
          <Button type="button" variant="primary" onClick={onSetupCalendar} className="mt-6 min-h-[48px]">
            {t("gradebook.setupCalendarCta")}
          </Button>
        ) : null}
      </Surface>
    );
  }

  if (!periods.length || !periods.some((period: any) => period.examComponents?.length)) {
    return (
      <Surface className="py-16 text-center px-6 border-dashed">
        <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-lg font-extrabold tracking-tight text-slate-900">
          {canManageCalendar
            ? t("gradebook.calendarNeedsPeriods", { defaultValue: "Calendar has no grading periods — finish setup." })
            : t("gradebook.teacherCalendarNeedsPeriods", { defaultValue: "Ask your admin to add grading periods." })}
        </p>
        {canManageCalendar ? (
          <Button type="button" variant="primary" onClick={onSetupCalendar} className="mt-6 min-h-[48px]">
            {t("gradebook.setupCalendarCta")}
          </Button>
        ) : null}
      </Surface>
    );
  }

  const steps = [
    { n: 1, label: t("gradebook.stepClass", { defaultValue: "Class" }), done: Boolean(classId) },
    { n: 2, label: t("gradebook.stepPeriod", { defaultValue: "Term" }), done: Boolean(periodId) },
    {
      n: 3,
      label: t("gradebook.stepAssessment", { defaultValue: "Assessment" }),
      done: Boolean(assessmentId),
    },
  ];

  return (
    <div className="space-y-6">
      {lastSession && (
        <Surface className="p-5 sm:p-6 border-indigo-200 bg-indigo-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {t("gradebook.continueGrading", { defaultValue: "Continue grading" })}
              </p>
              <p className="font-extrabold text-slate-900 mt-1 truncate">
                {lastSession.className || t("gradebook.classFallback")} ·{" "}
                {lastSession.periodLabel || t("gradebook.periodLabel")} ·{" "}
                {lastSession.assessmentLabel || t("gradebook.assessmentLabel")}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t("gradebook.continueGradingHint", {
                  defaultValue: "Pick up where you left off.",
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => onContinue(lastSession)}
              className="shrink-0 min-h-[48px]"
            >
              {t("gradebook.continueGradingCta", { defaultValue: "Resume" })}
            </Button>
          </div>
        </Surface>
      )}

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className={`lg:col-span-2 ${gradebookHubCardClass} space-y-6`}>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("gradebook.openAssessmentTitle", { defaultValue: "Open gradebook" })}
          </h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            {t("gradebook.openAssessmentHint", {
              defaultValue: "Pick class, term, and one assessment — then enter scores column by column.",
            })}
          </p>
        </div>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.n} className="flex items-center gap-3">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold font-mono shrink-0 ${
                  step.done
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {step.n}
              </span>
              <span
                className={`text-sm font-bold ${
                  step.done ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={`lg:col-span-3 ${gradebookHubCardClass} space-y-5`}>
        <SelectField
          label={t("gradebook.classLabel")}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">{t("gradebook.selectClass")}</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.subject?.name ? ` · ${c.subject.name}` : ""}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t("gradebook.periodLabel")}
          value={periodId}
          onChange={(e) => {
            setPeriodId(e.target.value);
            setAssessmentId("");
          }}
        >
          {periods.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t("gradebook.assessmentLabel", { defaultValue: "Assessment" })}
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
          disabled={!assessments.length}
          hint={
            !assessments.length
              ? t("gradebook.noAssessmentsInPeriod", {
                  defaultValue: "No assessments in this term. Add them in Academic Calendar.",
                })
              : undefined
          }
        >
          {assessments.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.label} ({a.shortCode})
            </option>
          ))}
        </SelectField>

        {selectedClass && selectedAssessment && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {t("gradebook.readyToGrade", { defaultValue: "Ready to grade" })}
            </p>
            <p className="font-extrabold text-slate-900">
              {selectedClass.name} · {selectedPeriod?.label} · {selectedAssessment.label}
            </p>
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          disabled={!classId || !periodId || !assessmentId}
          onClick={() => onOpen(classId, periodId, assessmentId)}
          className="w-full min-h-[52px] text-base sm:text-sm"
        >
          {t("gradebook.openAssessment", { defaultValue: "Open gradebook" })}
        </Button>
      </div>
    </div>
    </div>
  );
}
