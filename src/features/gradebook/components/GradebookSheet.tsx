import React, { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "lucide-react";
import { motion } from "motion/react";
import type { SyncStatus } from "../hooks/useGradebookAutosave";
import { UserAvatar } from "../../../components/UserAvatar";
import { MatrixScrollHint } from "../../../components/ui";
import { GradebookToolbar } from "./GradebookToolbar";
import { GradebookScoreInput } from "./GradebookScoreInput";
import { GradebookStatusBadge } from "./GradebookStatusBadge";
import {
  gradebookPanelClass,
  gradebookStickyColClass,
  gradebookStickyHeadClass,
} from "./gradebookUi";

export type GradebookRow = {
  studentId: string;
  student: { id?: string; name: string; email?: string; photoUrl?: string | null };
  grade: number | null;
  status: string;
  isLocked: boolean;
  feedback?: string | null;
};

export type GradebookSheetProps = {
  title: string;
  subtitle?: string;
  rows: GradebookRow[];
  onChangeGrade: (studentId: string, grade: number | null) => void;
  syncStatus: SyncStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
  onSyncNow: () => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting?: boolean;
  columnLabel?: string;
  readOnlyAll?: boolean;
};

function canEditRow(row: GradebookRow, readOnlyAll?: boolean) {
  if (readOnlyAll) return false;
  if (row.isLocked) return false;
  if (row.status === "SUBMITTED" || row.status === "ACCEPTED") return false;
  return true;
}

export function GradebookSheet({
  title,
  subtitle,
  rows,
  onChangeGrade,
  syncStatus,
  lastSavedAt,
  errorMessage,
  onSyncNow,
  onSubmit,
  onBack,
  submitting,
  columnLabel,
  readOnlyAll,
}: GradebookSheetProps) {
  const { t } = useTranslation(["pages", "common"]);
  const resolvedColumnLabel = columnLabel ?? t("common:scorePercent");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const stats = useMemo(() => {
    const entered = rows.filter((r) => r.grade !== null && r.grade !== undefined);
    const sum = entered.reduce((s, r) => s + Number(r.grade), 0);
    return {
      filled: entered.length,
      total: rows.length,
      avg: entered.length ? sum / entered.length : null,
    };
  }, [rows]);

  const editableIndexes = useMemo(
    () =>
      rows.map((r, i) => (canEditRow(r, readOnlyAll) ? i : -1)).filter((i) => i >= 0),
    [rows, readOnlyAll]
  );

  const focusIndex = (idx: number) => {
    const el = inputRefs.current[idx];
    el?.focus();
    el?.select();
  };

  const moveRelative = (fromRow: number, dir: 1 | -1) => {
    const pos = editableIndexes.indexOf(fromRow);
    if (pos < 0) return;
    const next = editableIndexes[pos + dir];
    if (next !== undefined) focusIndex(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 pb-28 md:pb-0"
    >
      <GradebookToolbar
        title={title}
        subtitle={subtitle}
        syncStatus={syncStatus}
        lastSavedAt={lastSavedAt}
        errorMessage={errorMessage}
        onSyncNow={onSyncNow}
        onSubmit={onSubmit}
        onBack={onBack}
        submitting={submitting}
        submitDisabled={readOnlyAll}
      />

      {/* Mobile cards */}
      <div className={`md:hidden space-y-3 ${gradebookPanelClass} p-4`}>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">{t("gradebook.noStudents")}</p>
        ) : (
          rows.map((row, i) => {
            const editable = canEditRow(row, readOnlyAll);
            return (
              <article
                key={row.studentId}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={row.studentId || row.student?.id}
                    name={row.student?.name}
                    photoUrl={row.student?.photoUrl}
                    size="sm"
                    rounded="2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 truncate">
                      {row.student?.name || t("common:student")}
                    </p>
                    {row.student?.email && (
                      <p className="text-xs text-slate-500 truncate">{row.student.email}</p>
                    )}
                  </div>
                  <GradebookStatusBadge status={row.status} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    {resolvedColumnLabel}
                  </label>
                  <GradebookScoreInput
                    value={row.grade}
                    disabled={!editable}
                    ariaLabel={t("gradebook.gradeForAria", {
                      name: row.student?.name || row.studentId,
                    })}
                    onChange={(v) => onChangeGrade(row.studentId, v)}
                    onMoveDown={() => moveRelative(i, 1)}
                    onMoveUp={() => moveRelative(i, -1)}
                    inputRef={(el) => {
                      inputRefs.current[i] = el;
                    }}
                  />
                </div>
                {row.feedback && (
                  <p className="text-xs text-rose-600 leading-relaxed">{row.feedback}</p>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className={`hidden md:block ${gradebookPanelClass}`}>
        <div className="px-4 pt-3 sm:px-6">
          <MatrixScrollHint />
        </div>
        <div className="overflow-x-auto max-h-[min(68vh,720px)] overflow-y-auto overscroll-x-contain">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th
                  className={`${gradebookStickyHeadClass} p-4 text-xs font-extrabold tracking-tight text-slate-900 min-w-[12rem]`}
                >
                  {t("common:student")}
                </th>
                <th className="p-4 text-xs font-extrabold tracking-tight text-slate-900 w-40 text-center">
                  {resolvedColumnLabel}
                </th>
                <th className="p-4 text-xs font-extrabold tracking-tight text-slate-900">
                  {t("common:status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const editable = canEditRow(row, readOnlyAll);
                return (
                  <tr
                    key={row.studentId}
                    className={`border-b border-slate-100 hover:bg-slate-50/70 ${
                      i % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                    }`}
                  >
                    <td className={`${gradebookStickyColClass} p-3 sm:p-4`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-slate-400 w-5 shrink-0">
                          {i + 1}
                        </span>
                        <UserAvatar
                          userId={row.studentId || row.student?.id}
                          name={row.student?.name}
                          photoUrl={row.student?.photoUrl}
                          size="sm"
                          rounded="2xl"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {row.student?.name || t("common:student")}
                          </div>
                          {row.student?.email && (
                            <div className="text-xs text-slate-500 truncate">
                              {row.student.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <GradebookScoreInput
                        value={row.grade}
                        disabled={!editable}
                        compact
                        ariaLabel={t("gradebook.gradeForAria", {
                          name: row.student?.name || row.studentId,
                        })}
                        onChange={(v) => onChangeGrade(row.studentId, v)}
                        onMoveDown={() => moveRelative(i, 1)}
                        onMoveUp={() => moveRelative(i, -1)}
                        inputRef={(el) => {
                          inputRefs.current[i] = el;
                        }}
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <GradebookStatusBadge status={row.status} />
                      {row.feedback && (
                        <p className="text-xs text-rose-600 mt-1 max-w-[14rem] leading-relaxed">
                          {row.feedback}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-sm text-slate-500">
                    {t("gradebook.noStudents")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/90 text-xs sm:text-sm">
          <div className="text-slate-500 font-medium">
            {t("gradebook.entered", { filled: stats.filled, total: stats.total })}
            {stats.avg !== null && (
              <span className="ml-3">
                {t("gradebook.avg")}{" "}
                <span className="font-mono font-bold text-slate-900">
                  {stats.avg.toFixed(1)}
                </span>
              </span>
            )}
          </div>
          <p className="inline-flex items-center gap-1.5 text-slate-500">
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            {t("gradebook.keyboardHint")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
