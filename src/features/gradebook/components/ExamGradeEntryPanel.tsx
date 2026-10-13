import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { gradebookApi } from "../api";
import { GradebookSheet, type GradebookRow } from "./GradebookSheet";
import { useGradebookAutosave } from "../hooks/useGradebookAutosave";
import {
  mergeLocalOverServer,
  type LocalGradeCell,
} from "../lib/gradebookLocalStore";
import { confirmAction } from "../../../lib/swal";

/** Shared exam grade entry used by Gradebook hub and Exam Details. */
export function ExamGradeEntryPanel({
  schoolId,
  examId,
  examTitle,
  examComponentId,
  classId,
  className,
  subjectId,
  subjectName,
  onBack,
  showToast,
}: {
  schoolId: string;
  examId: string;
  examTitle: string;
  examComponentId?: string | null;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  onBack?: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const [rows, setRows] = useState<GradebookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grades = await gradebookApi.fetchExamGrades(examId, classId);
      const server = (Array.isArray(grades) ? grades : []).map((g: any) => ({
        studentId: g.studentId,
        student: g.student || { name: t("gradebook.studentFallback"), email: "" },
        grade: g.grade as number | null,
        status: g.status || "DRAFT",
        isLocked: Boolean(g.isLocked),
        feedback: g.feedback,
        updatedAt: g.updatedAt,
      }));
      setRows(
        server.map((r) => ({
          studentId: r.studentId,
          student: r.student,
          grade: r.grade,
          status: r.status,
          isLocked: r.isLocked,
          feedback: r.feedback,
        }))
      );
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [examId, classId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const scope = {
    schoolId,
    examId,
    classId,
    subjectId,
    examComponentId: examComponentId || null,
  };

  const syncDraft = useCallback(
    async (entries: LocalGradeCell[]) => {
      await gradebookApi.bulkExamGrades(examId, {
        classId,
        subjectId,
        status: "DRAFT",
        examComponentId: examComponentId || null,
        entries,
      });
    },
    [examId, classId, subjectId, examComponentId]
  );

  const autosave = useGradebookAutosave({
    scope,
    entries: rows.map((r) => ({ studentId: r.studentId, grade: r.grade })),
    enabled: !loading && rows.length > 0,
    syncDraft,
  });

  useEffect(() => {
    if (loading || !rows.length) return;
    const local = autosave.readLocal();
    if (!local) return;
    const merged = mergeLocalOverServer(
      rows.map((r) => ({ studentId: r.studentId, grade: r.grade, updatedAt: null })),
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
  }, [loading, classId, examId]);

  const onChangeGrade = (studentId: string, grade: number | null) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, grade } : r))
    );
    autosave.onEdit();
  };

  const onSubmit = async () => {
    const empty = rows.filter(
      (r) =>
        !r.isLocked &&
        r.status !== "SUBMITTED" &&
        r.status !== "ACCEPTED" &&
        (r.grade === null || r.grade === undefined)
    );
    const ok = await confirmAction({
      title: empty.length
        ? t("gradebook.confirm.emptyScoresTitle")
        : t("gradebook.confirm.submitTitle"),
      text: empty.length
        ? t("gradebook.confirm.emptyScoresText", { count: empty.length })
        : t("gradebook.confirm.submitText"),
      confirmText: empty.length ? t("gradebook.confirm.emptyScoresConfirm") : t("common:submit"),
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await autosave.flush();
      const editable = rows.filter(
        (r) =>
          !r.isLocked && r.status !== "SUBMITTED" && r.status !== "ACCEPTED"
      );
      await gradebookApi.bulkExamGrades(examId, {
        classId,
        subjectId,
        status: "SUBMITTED",
        examComponentId: examComponentId || null,
        entries: editable.map((r) => ({
          studentId: r.studentId,
          grade: r.grade,
        })),
      });
      autosave.clearLocal();
      showToast(t("gradebook.toast.submitted"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("gradebook.toast.submitFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-64 rounded-[32px] bg-slate-100 animate-pulse" />;
  }

  return (
    <GradebookSheet
      title={examTitle}
      subtitle={`${className || t("gradebook.classFallback")}${subjectName ? ` · ${subjectName}` : ""}`}
      rows={rows}
      onChangeGrade={onChangeGrade}
      syncStatus={autosave.status}
      lastSavedAt={autosave.lastSavedAt}
      errorMessage={autosave.errorMessage}
      onSyncNow={() => void autosave.flush()}
      onSubmit={() => void onSubmit()}
      onBack={onBack}
      submitting={submitting}
    />
  );
}
