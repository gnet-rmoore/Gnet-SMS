import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { CalendarClock, FileDown, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageShell, PageHeader, Surface, Button, MatrixScrollHint } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { classScheduleApi } from "./api";
import { downloadScheduleWeekPdf, entriesToPdfCells } from "./lib/schedulePdf";
import {
  cellKey,
  DAY_LABELS,
  GRID_DAYS,
  type BellScheduleDto,
  type SchedulePeriodDto,
  type TimetableEntryDto,
} from "./types";

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

/** Read-only weekly schedule for teachers, students, and parents. */
export function MySchedulePage() {
  const { t } = useTranslation(["pages", "common"]);
  const user = useAuthStore((s) => s.user);
  const school = useAuthStore((s) => s.school);
  const schoolId = school?.id || "";
  const schoolName = school?.name || "";
  const { toast, showToast } = usePageToast();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId") || undefined;

  const [loading, setLoading] = useState(true);
  const [bell, setBell] = useState<BellScheduleDto | null>(null);
  const [entries, setEntries] = useState<TimetableEntryDto[]>([]);

  useEffect(() => {
    void (async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const bells = asArray<BellScheduleDto>(
          await classScheduleApi.listBellSchedules(schoolId).catch(() => [])
        );
        const active = bells.find((b) => b.isActive) || bells[0] || null;
        setBell(active);
        const params: Record<string, string> = {};
        if (active?.id) params.bellScheduleId = active.id;
        if (user?.role === "TEACHER") params.teacherId = user.id;
        if (studentId) params.studentId = studentId;
        const rows = await classScheduleApi.listTimetable(schoolId, params);
        setEntries(Array.isArray(rows) ? rows : []);
      } catch (err: any) {
        showToast(err?.message || t("classSchedule.toast.loadMyFailed"), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId, user?.id, user?.role, studentId, showToast]);

  const periods: SchedulePeriodDto[] = bell?.periods || [];
  const byCell = useMemo(() => {
    const map = new Map<string, TimetableEntryDto[]>();
    for (const e of entries) {
      const key = cellKey(e.dayOfWeek, e.schedulePeriodId);
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const classrooms = useMemo(() => {
    const names = new Map<string, string>();
    entries.forEach((e) => names.set(e.classroomId, e.classroomName || t("classSchedule.classroom")));
    return [...names.entries()];
  }, [entries]);

  const downloadPdf = () => {
    if (!bell || periods.length === 0) {
      showToast(t("classSchedule.toast.pdfNoBell"), "info");
      return;
    }
    downloadScheduleWeekPdf({
      classroomName:
        user?.role === "TEACHER"
          ? t("classSchedule.myClassesLabel", { name: user.name || t("common:teacher") })
          : classrooms.length === 1
            ? classrooms[0][1]
            : t("classSchedule.myScheduleLabel"),
      bellName: bell.name,
      periods,
      cells: entriesToPdfCells(entries),
      schoolName,
    });
  };

  if (loading) {
    return (
      <PageShell width="wide" className="py-16 flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        {t("classSchedule.loadingSchedule")}
      </PageShell>
    );
  }

  if (!schoolId) {
    return (
      <PageShell width="wide" className="py-16">
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500 text-sm font-medium">
            {t("classSchedule.schoolContextMissing")}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <PageHeader
          title={t("classSchedule.myScheduleTitle")}
          subtitle={t("classSchedule.myScheduleSubtitle")}
          actions={
            <Button type="button" variant="secondary" size="compact" onClick={downloadPdf} disabled={entries.length === 0}>
              <FileDown className="w-4 h-4" />
              {t("classSchedule.downloadPdf")}
            </Button>
          }
        />
      </motion.div>

      <Surface as="div" className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <CalendarClock className="w-4 h-4 text-indigo-600" />
          {bell?.name || t("classSchedule.emptyNoBellSchedule")}
        </div>

        {!bell || periods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500 font-medium">
            {t("classSchedule.emptyNoTimetable")}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500 font-medium">
            {t("classSchedule.emptyNoClasses")}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <MatrixScrollHint label={t("classSchedule.swipeHint")} />
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 p-2 w-28">
                    {t("classSchedule.period")}
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
                      const cells = byCell.get(cellKey(day, period.id)) || [];
                      return (
                        <td key={`${day}-${period.id}`} className="p-1.5 align-top">
                          <div
                            className={`min-h-[72px] rounded-2xl border p-3 ${
                              cells.length
                                ? "border-indigo-100 bg-indigo-50/60"
                                : "border-slate-100 bg-slate-50/40"
                            }`}
                          >
                            {cells.map((c) => (
                              <div key={c.id} className="mb-2 last:mb-0">
                                <p className="text-sm font-bold text-slate-900 leading-snug">
                                  {c.subjectName || t("classSchedule.classFallback")}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {c.classroomName}
                                  {user?.role !== "TEACHER" && c.teacherName
                                    ? ` · ${c.teacherName}`
                                    : ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </PageShell>
  );
}
