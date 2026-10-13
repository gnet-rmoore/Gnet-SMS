import React, { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Send, RefreshCw, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { SyncStatusChip } from "./SyncStatusChip";
import type { SyncStatus } from "../hooks/useGradebookAutosave";
import { clampScore } from "../lib/gradebookLocalStore";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";
import { MatrixScrollHint } from "../../../components/ui";

export type PeriodColumn = {
  id: string;
  label: string;
  shortCode: string;
  weightPct?: number;
  componentType?: string;
};

export type PeriodCell = {
  grade: number | null;
  status: string;
  isLocked: boolean;
  isIncomplete?: boolean;
};

export type PeriodRow = {
  studentId: string;
  student: { name: string; email?: string; photoUrl?: string | null; id?: string };
  cells: Record<string, PeriodCell>;
};

export type GradebookPeriodSheetProps = {
  title: string;
  subtitle?: string;
  columns: PeriodColumn[];
  rows: PeriodRow[];
  activeColumnId: string;
  onActiveColumnChange: (id: string) => void;
  onChangeGrade: (
    studentId: string,
    componentId: string,
    grade: number | null
  ) => void;
  onToggleIncomplete?: (studentId: string, componentId: string) => void;
  cellEditable?: (studentId: string, columnId: string, cell: PeriodCell | undefined) => boolean;
  grantBanner?: string | null;
  syncStatus: SyncStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
  onSyncNow: () => void;
  onSubmitColumn: () => void;
  onBack?: () => void;
  submitting?: boolean;
};

function canEdit(cell: PeriodCell | undefined) {
  if (!cell) return true;
  if (cell.isLocked) return false;
  if (cell.status === "SUBMITTED" || cell.status === "ACCEPTED") return false;
  return true;
}

export function GradebookPeriodSheet({
  title,
  subtitle,
  columns,
  rows,
  activeColumnId,
  onActiveColumnChange,
  onChangeGrade,
  onToggleIncomplete,
  cellEditable,
  grantBanner,
  syncStatus,
  lastSavedAt,
  errorMessage,
  onSyncNow,
  onSubmitColumn,
  onBack,
  submitting,
}: GradebookPeriodSheetProps) {
  const { t } = useTranslation(["pages", "common"]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const weightedPreview = useMemo(() => {
    return rows.map((row) => {
      let wSum = 0;
      let wTot = 0;
      for (const col of columns) {
        const cell = row.cells[col.id];
        if (cell?.grade === null || cell?.grade === undefined) continue;
        const w = Number(col.weightPct) || 0;
        if (w <= 0) continue;
        wSum += Number(cell.grade) * (w / 100);
        wTot += w;
      }
      const avg = wTot > 0 ? (wSum / wTot) * 100 : null;
      return { studentId: row.studentId, avg };
    });
  }, [rows, columns]);

  const previewMap = useMemo(
    () => new Map(weightedPreview.map((p) => [p.studentId, p.avg])),
    [weightedPreview]
  );

  const moveDown = (studentId: string) => {
    const idx = rows.findIndex((r) => r.studentId === studentId);
    for (let j = idx + 1; j < rows.length; j++) {
      const next = rows[j];
      if (canEdit(next.cells[activeColumnId])) {
        const el = inputRefs.current[`${next.studentId}:${activeColumnId}`];
        el?.focus();
        el?.select();
        return;
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("common:back")}
            </button>
          )}
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
          {grantBanner && (
            <p className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
              {grantBanner}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusChip
            status={syncStatus}
            lastSavedAt={lastSavedAt}
            errorMessage={errorMessage}
            onRetry={onSyncNow}
          />
          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("common:syncNow")}
          </button>
          <button
            type="button"
            onClick={onSubmitColumn}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? t("common:submitting") : t("common:submitColumn")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {columns.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => onActiveColumnChange(col.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              activeColumnId === col.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {col.shortCode || col.label}
            {col.weightPct != null ? ` · ${col.weightPct}%` : ""}
          </button>
        ))}
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="px-4 pt-3 sm:px-6">
          <MatrixScrollHint />
        </div>
        <div className="overflow-x-auto max-h-[min(70vh,640px)] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="sticky left-0 z-20 bg-slate-50 p-3 text-xs font-extrabold text-slate-900 min-w-[10rem]">
                  {t("common:student")}
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={`p-3 text-xs font-extrabold text-center min-w-[5.5rem] ${
                      activeColumnId === col.id
                        ? "text-indigo-700 bg-indigo-50/80"
                        : "text-slate-900"
                    }`}
                  >
                    {col.shortCode}
                  </th>
                ))}
                <th className="p-3 text-xs font-extrabold text-slate-500 text-center min-w-[4.5rem]">
                  {t("common:weightedShort")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.studentId}
                  className="border-b border-slate-50 hover:bg-slate-50/50"
                >
                  <td className="sticky left-0 z-[1] bg-white p-2 sm:p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                  {columns.map((col) => {
                    const cell = row.cells[col.id] || {
                      grade: null,
                      status: "DRAFT",
                      isLocked: false,
                    };
                    const editable = cellEditable
                      ? cellEditable(row.studentId, col.id, cell)
                      : canEdit(cell);
                    const isActive = col.id === activeColumnId;
                    return (
                      <td
                        key={col.id}
                        className={`p-2 text-center ${
                          isActive ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <div className="inline-flex flex-col items-center gap-1">
                        <input
                          ref={(el) => {
                            inputRefs.current[`${row.studentId}:${col.id}`] = el;
                          }}
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={cell.grade ?? ""}
                          disabled={!editable}
                          onFocus={(e) => {
                            onActiveColumnChange(col.id);
                            e.target.select();
                          }}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              onChangeGrade(row.studentId, col.id, null);
                              return;
                            }
                            const n = clampScore(v);
                            if (n === null) return;
                            onChangeGrade(row.studentId, col.id, n);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "ArrowDown") {
                              e.preventDefault();
                              moveDown(row.studentId);
                            }
                          }}
                          className="w-16 mx-auto px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                        />
                        {onToggleIncomplete && (
                          <button
                            type="button"
                            title="Toggle Incomplete"
                            disabled={!editable && !cell.isIncomplete}
                            onClick={() => onToggleIncomplete(row.studentId, col.id)}
                            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
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
                  })}
                  <td className="p-2 text-center font-mono text-xs font-bold text-slate-500">
                    {previewMap.get(row.studentId) != null
                      ? previewMap.get(row.studentId)!.toFixed(0)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/80">
          {t("gradebook.periodFooter")}
        </div>
      </div>
    </motion.div>
  );
}
