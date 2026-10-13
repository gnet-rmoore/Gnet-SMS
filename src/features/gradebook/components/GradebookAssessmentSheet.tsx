import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutGrid,
  Keyboard,
  Link2,
  Sparkles,
  Users,
  CheckCircle2,
  Search,
  Filter,
} from "lucide-react";
import { motion } from "motion/react";
import type { SyncStatus } from "../hooks/useGradebookAutosave";
import { MatrixScrollHint, SMS_SHADOW_SURFACE } from "../../../components/ui";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  computeAssessmentTotal,
  defaultMaxScoreForColumn,
  type AssessmentStructureColumn,
  type AssessmentStructureSource,
} from "../../../lib/assessmentStructure";
import { letterFromScore, type GradeLegendLike } from "../../../lib/gradeLegend";
import type { AssessmentGradeCell, AssessmentGradeRow } from "../api";
import { GradebookToolbar } from "./GradebookToolbar";
import { GradebookScoreInput } from "./GradebookScoreInput";
import {
  gradebookPanelClass,
  gradebookStickyColClass,
  gradebookStickyHeadClass,
} from "./gradebookUi";

export type GradebookAssessmentSheetProps = {
  title: string;
  subtitle?: string;
  assessmentLabel: string;
  periodLabel: string;
  columns: AssessmentStructureColumn[];
  rows: AssessmentGradeRow[];
  legends?: GradeLegendLike[];
  structureSource?: AssessmentStructureSource;
  showLetterPreview?: boolean;
  onChangeGrade: (
    studentId: string,
    structureColumnId: string,
    grade: number | null
  ) => void;
  onToggleIncomplete?: (studentId: string, structureColumnId: string) => void;
  cellEditable?: (
    studentId: string,
    columnId: string,
    cell: AssessmentGradeCell | undefined
  ) => boolean;
  grantBanner?: string | null;
  syncStatus: SyncStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
  onSyncNow: () => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting?: boolean;
};

function canEdit(cell: AssessmentGradeCell | undefined) {
  if (!cell) return true;
  if (cell.isLocked) return false;
  if (cell.status === "SUBMITTED" || cell.status === "ACCEPTED") return false;
  return true;
}

function letterTone(letter: string): string {
  if (letter.startsWith("A")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (letter.startsWith("B")) return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (letter.startsWith("C")) return "bg-amber-50 text-amber-800 border-amber-100";
  if (letter.startsWith("D")) return "bg-orange-50 text-orange-800 border-orange-100";
  if (letter === "F") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function StructureSourceBadge({
  source,
  t,
}: {
  source?: AssessmentStructureSource;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!source) return null;
  const isCustom = source === "assessment";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
        isCustom
          ? "bg-indigo-100 text-indigo-800"
          : "bg-white/10 text-white border border-white/20"
      }`}
    >
      {isCustom ? <Sparkles className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
      {isCustom
        ? t("gradebook.structureCustom", { defaultValue: "Custom structure" })
        : t("gradebook.structureSchool", { defaultValue: "School template" })}
    </span>
  );
}

export function GradebookAssessmentSheet({
  title,
  subtitle,
  assessmentLabel,
  periodLabel,
  columns,
  rows,
  legends,
  structureSource,
  showLetterPreview = true,
  onChangeGrade,
  onToggleIncomplete,
  cellEditable,
  grantBanner,
  syncStatus,
  lastSavedAt,
  errorMessage,
  onSyncNow,
  onSubmit,
  onBack,
  submitting,
}: GradebookAssessmentSheetProps) {
  const { t } = useTranslation(["pages", "common"]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [activeColumnId, setActiveColumnId] = useState(columns[0]?.id || "");
  const [studentQuery, setStudentQuery] = useState("");
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const activeColumns = useMemo(
    () => columns.filter((c) => c.isActive !== false),
    [columns]
  );

  const weightTotal = useMemo(
    () => activeColumns.reduce((s, c) => s + Number(c.weightPct || 0), 0),
    [activeColumns]
  );

  const rowTotals = useMemo(() => {
    return rows.map((row) => {
      const scores: Record<string, number | null> = {};
      for (const col of activeColumns) {
        scores[col.id] = row.cells[col.id]?.grade ?? null;
      }
      const total = computeAssessmentTotal(scores, activeColumns);
      const letter = total != null ? letterFromScore(total, legends, "CLASS") : "—";
      return { studentId: row.studentId, total, letter };
    });
  }, [rows, activeColumns, legends]);

  const totalsMap = useMemo(
    () => new Map(rowTotals.map((r) => [r.studentId, r])),
    [rowTotals]
  );

  const filledCount = useMemo(() => {
    let n = 0;
    for (const row of rows) {
      for (const col of activeColumns) {
        const g = row.cells[col.id]?.grade;
        if (g !== null && g !== undefined) n++;
      }
    }
    return n;
  }, [rows, activeColumns]);

  const totalCells = rows.length * activeColumns.length;
  const progressPct = totalCells > 0 ? Math.round((filledCount / totalCells) * 100) : 0;

  const columnFillCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const col of activeColumns) {
      let n = 0;
      for (const row of rows) {
        const g = row.cells[col.id]?.grade;
        if (g !== null && g !== undefined) n++;
      }
      counts.set(col.id, n);
    }
    return counts;
  }, [rows, activeColumns]);

  const visibleRows = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.student.name.toLowerCase().includes(q)) return false;
      if (!showMissingOnly) return true;
      return activeColumns.some((col) => {
        const g = row.cells[col.id]?.grade;
        return g === null || g === undefined;
      });
    });
  }, [rows, studentQuery, showMissingOnly, activeColumns]);

  const moveDown = (studentId: string, columnId: string) => {
    const idx = rows.findIndex((r) => r.studentId === studentId);
    for (let j = idx + 1; j < rows.length; j++) {
      const next = rows[j];
      const cell = next.cells[columnId];
      if (cellEditable ? cellEditable(next.studentId, columnId, cell) : canEdit(cell)) {
        inputRefs.current[`${next.studentId}:${columnId}`]?.focus();
        inputRefs.current[`${next.studentId}:${columnId}`]?.select();
        return;
      }
    }
  };

  const renderScoreCell = (
    row: AssessmentGradeRow,
    col: AssessmentStructureColumn,
    layout: "table" | "card"
  ) => {
    const cell = row.cells[col.id] || {
      grade: null,
      status: "DRAFT",
      isLocked: false,
      isIncomplete: false,
      incompleteNote: null,
      entryId: null,
    };
    const editable = cellEditable
      ? cellEditable(row.studentId, col.id, cell)
      : canEdit(cell);
    const isActive = col.id === activeColumnId;
    const locked = !editable;
    const maxScore = defaultMaxScoreForColumn(col);

    if (layout === "card") {
      return (
        <div
          key={col.id}
          className={`rounded-2xl border p-3 space-y-2 transition-colors ${
            isActive
              ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200"
              : "border-slate-200 bg-white"
          } ${locked ? "opacity-75" : ""}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-mono font-extrabold uppercase text-slate-900">
                {col.shortCode || col.code}
              </p>
              <p className="text-xs text-slate-500 truncate">{col.label || col.name}</p>
            </div>
            <span className="text-xs font-bold text-slate-400 shrink-0">
              /{maxScore} · {col.weightPct}%
            </span>
          </div>
          <GradebookScoreInput
            value={cell.grade}
            maxScore={maxScore}
            disabled={!editable}
            active={isActive}
            compact
            ariaLabel={`${row.student.name} ${col.label || col.shortCode}`}
            onFocus={() => setActiveColumnId(col.id)}
            onChange={(v) => onChangeGrade(row.studentId, col.id, v)}
            onMoveDown={() => moveDown(row.studentId, col.id)}
            inputRef={(el) => {
              inputRefs.current[`${row.studentId}:${col.id}`] = el;
            }}
          />
          {onToggleIncomplete && (
            <button
              type="button"
              disabled={!editable && !cell.isIncomplete}
              onClick={() => onToggleIncomplete(row.studentId, col.id)}
              className={`w-full min-h-[36px] text-xs font-bold uppercase tracking-wide rounded-xl ${
                cell.isIncomplete
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {cell.isIncomplete
                ? t("gradebook.markedIncomplete", { defaultValue: "Incomplete" })
                : t("gradebook.markIncomplete", { defaultValue: "Mark incomplete" })}
            </button>
          )}
        </div>
      );
    }

    return (
      <td
        key={col.id}
        className={`p-2 sm:p-2.5 text-center border-r border-slate-100/80 transition-colors ${
          isActive ? "bg-indigo-50/40" : ""
        } ${locked ? "bg-slate-50/50" : ""}`}
      >
        <div className="inline-flex flex-col items-center gap-1.5">
          <GradebookScoreInput
            value={cell.grade}
            maxScore={maxScore}
            disabled={!editable}
            active={isActive}
            compact
            ariaLabel={`${row.student.name} ${col.label || col.shortCode}`}
            onFocus={() => setActiveColumnId(col.id)}
            onChange={(v) => onChangeGrade(row.studentId, col.id, v)}
            onMoveDown={() => moveDown(row.studentId, col.id)}
            inputRef={(el) => {
              inputRefs.current[`${row.studentId}:${col.id}`] = el;
            }}
          />
          {onToggleIncomplete && (
            <button
              type="button"
              title={t("gradebook.toggleIncomplete", { defaultValue: "Mark incomplete" })}
              disabled={!editable && !cell.isIncomplete}
              onClick={() => onToggleIncomplete(row.studentId, col.id)}
              className={`min-h-[28px] px-2 text-xs font-bold uppercase tracking-wide rounded-lg ${
                cell.isIncomplete
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              I
            </button>
          )}
        </div>
      </td>
    );
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
        grantBanner={grantBanner}
        syncStatus={syncStatus}
        lastSavedAt={lastSavedAt}
        errorMessage={errorMessage}
        onSyncNow={onSyncNow}
        onSubmit={onSubmit}
        onBack={onBack}
        submitting={submitting}
        submitLabel={t("gradebook.submitAssessment", { defaultValue: "Submit assessment" })}
      />

      {/* Executive context band */}
      <div
        className={`rounded-[32px] overflow-hidden border border-slate-800 ${SMS_SHADOW_SURFACE}`}
      >
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-5 sm:px-8 py-5 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-white/10 text-indigo-300 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {periodLabel}
                </p>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-0.5 break-words">
                  {assessmentLabel}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <StructureSourceBadge source={structureSource} t={t} />
                  <span className="text-xs font-medium text-slate-400">
                    {activeColumns.length}{" "}
                    {t("gradebook.activityColumnsShort", { defaultValue: "columns" })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 min-w-[7rem]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {t("common:students", { defaultValue: "Students" })}
                </p>
                <p className="text-2xl font-extrabold font-mono text-white mt-1">{rows.length}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 min-w-[7rem]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("gradebook.progress", { defaultValue: "Progress" })}
                </p>
                <p className="text-2xl font-extrabold font-mono text-white mt-1">{progressPct}%</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 min-w-[7rem]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t("gradebook.weights", { defaultValue: "Weights" })}
                </p>
                <p
                  className={`text-2xl font-extrabold font-mono mt-1 ${
                    Math.abs(weightTotal - 100) < 0.01 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {weightTotal}%
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Column quick-nav (mobile + desktop) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex gap-2 overflow-x-auto overscroll-x-contain">
          {activeColumns.map((col) => {
            const filled = columnFillCounts.get(col.id) || 0;
            return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                setActiveColumnId(col.id);
                const first = rows.find((r) => {
                  const cell = r.cells[col.id];
                  return cellEditable
                    ? cellEditable(r.studentId, col.id, cell)
                    : canEdit(cell);
                });
                if (first) {
                  inputRefs.current[`${first.studentId}:${col.id}`]?.focus();
                }
              }}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeColumnId === col.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-200"
              }`}
            >
              <span className="font-mono">{col.shortCode || col.code}</span>
              <span className="ml-1.5 opacity-70">{col.weightPct}%</span>
              <span className="ml-1.5 font-mono opacity-80">
                {filled}/{rows.length}
              </span>
            </button>
            );
          })}
        </div>
      </div>

      {/* Student search / filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder={t("gradebook.searchStudents", { defaultValue: "Search students…" })}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowMissingOnly((v) => !v)}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border transition-colors ${
            showMissingOnly
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
          }`}
        >
          <Filter className="w-4 h-4" />
          {t("gradebook.missingScoresOnly", { defaultValue: "Missing scores" })}
        </button>
      </div>

      {/* Mobile: student cards */}
      <div className={`md:hidden space-y-3 ${gradebookPanelClass} p-4`}>
        {visibleRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {studentQuery || showMissingOnly
              ? t("gradebook.noMatchingStudents", { defaultValue: "No students match your filter." })
              : t("gradebook.noStudents")}
          </p>
        ) : (
          visibleRows.map((row, rowIdx) => {
            const rollup = totalsMap.get(row.studentId);
            return (
              <article
                key={row.studentId}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-5">{rowIdx + 1}</span>
                  <UserAvatar
                    userId={row.studentId || row.student.id}
                    name={row.student.name}
                    photoUrl={row.student.photoUrl}
                    size="sm"
                    rounded="2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 truncate">{row.student.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("gradebook.total", { defaultValue: "Total" })}
                    </p>
                    <p className="font-mono font-extrabold text-slate-900">
                      {rollup?.total != null ? rollup.total.toFixed(1) : "—"}
                    </p>
                    {showLetterPreview && rollup?.total != null && (
                      <span
                        className={`inline-flex mt-1 px-2 py-0.5 rounded-lg text-xs font-extrabold border ${letterTone(
                          rollup.letter
                        )}`}
                      >
                        {rollup.letter}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {activeColumns.map((col) => renderScoreCell(row, col, "card"))}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Desktop: spreadsheet */}
      <div className={`hidden md:block ${gradebookPanelClass}`}>
        <div className="px-4 pt-3 sm:px-6">
          <MatrixScrollHint />
        </div>
        <div className="overflow-x-auto max-h-[min(68vh,720px)] overflow-y-auto overscroll-x-contain">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th
                  className={`${gradebookStickyHeadClass} p-3 sm:p-4 text-xs font-extrabold text-slate-900 min-w-[12rem]`}
                >
                  {t("common:student")}
                </th>
                {activeColumns.map((col) => {
                  const maxScore = defaultMaxScoreForColumn(col);
                  return (
                  <th
                    key={col.id}
                    className={`p-3 text-center min-w-[6rem] border-r border-slate-100 cursor-pointer transition-colors ${
                      activeColumnId === col.id
                        ? "bg-indigo-100 text-indigo-900"
                        : "text-slate-900 bg-slate-50 hover:bg-slate-100"
                    }`}
                    onClick={() => setActiveColumnId(col.id)}
                  >
                    <div className="text-xs font-mono font-extrabold uppercase tracking-wide">
                      {col.shortCode || col.code}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate max-w-[6rem] mx-auto">
                      {col.label || col.name}
                    </div>
                    <div className="text-xs font-bold text-indigo-600 mt-0.5">
                      /{maxScore} · {col.weightPct}%
                    </div>
                  </th>
                  );
                })}
                <th className="sticky right-0 z-20 bg-slate-50 p-3 text-xs font-extrabold text-center text-slate-900 min-w-[4.5rem] border-l border-slate-200 shadow-[-4px_0_12px_-4px_rgb(15,23,42,0.06)]">
                  {t("gradebook.total", { defaultValue: "Total" })}
                </th>
                {showLetterPreview && (
                  <th className="p-3 text-xs font-extrabold text-center text-slate-900 min-w-[4rem] bg-slate-50">
                    {t("gradebook.letter", { defaultValue: "Letter" })}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIdx) => {
                const rollup = totalsMap.get(row.studentId);
                return (
                  <tr
                    key={row.studentId}
                    className={`border-b border-slate-100 hover:bg-indigo-50/20 transition-colors ${
                      rowIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <td className={`${gradebookStickyColClass} p-2.5 sm:p-3`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-slate-400 w-5 shrink-0">
                          {rowIdx + 1}
                        </span>
                        <UserAvatar
                          userId={row.studentId || row.student.id}
                          name={row.student.name}
                          photoUrl={row.student.photoUrl}
                          size="sm"
                          rounded="2xl"
                        />
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {row.student.name}
                        </div>
                      </div>
                    </td>
                    {activeColumns.map((col) => renderScoreCell(row, col, "table"))}
                    <td className="sticky right-0 z-[1] bg-white p-2.5 text-center font-mono text-sm font-extrabold text-slate-900 border-l border-slate-200 shadow-[-4px_0_12px_-4px_rgb(15,23,42,0.06)]">
                      {rollup?.total != null ? rollup.total.toFixed(1) : "—"}
                    </td>
                    {showLetterPreview && (
                      <td className="p-2.5 text-center bg-white">
                        {rollup?.total != null ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-extrabold border ${letterTone(
                              rollup.letter
                            )}`}
                          >
                            {rollup.letter}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/90 text-xs sm:text-sm text-slate-500">
          <p className="font-medium">
            {t("gradebook.cellsEntered", {
              filled: filledCount,
              total: totalCells,
              defaultValue: "{{filled}} of {{total}} scores entered",
            })}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            {t("gradebook.assessmentFooterShort", {
              defaultValue: "Enter ↓ moves to next student in column",
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
