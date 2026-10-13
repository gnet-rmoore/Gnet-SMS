import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  addDays,
  clampWeekStartToPeriod,
  type CalendarPeriod,
} from "../../academics-shared/syllabusCalendar";
import { formatDayLabel, weekStartOf } from "../utils";

type Props = {
  weekStart: string;
  selectedDate: string | null;
  countsByDate: Record<string, number>;
  onWeekStartChange: (iso: string) => void;
  onSelectDate: (iso: string | null) => void;
  periods?: CalendarPeriod[];
  selectedPeriodId?: string | null;
  onPeriodChange?: (periodId: string) => void;
};

export function WeekStrip({
  weekStart,
  selectedDate,
  countsByDate,
  onWeekStartChange,
  onSelectDate,
  periods = [],
  selectedPeriodId = null,
  onPeriodChange,
}: Props) {
  const { t } = useTranslation("pages");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedPeriod =
    periods.find((p) => p.id === selectedPeriodId) ?? periods[0] ?? null;

  const shiftWeek = (delta: number) => {
    const next = addDays(weekStart, delta * 7);
    if (selectedPeriod) {
      onWeekStartChange(clampWeekStartToPeriod(next, selectedPeriod));
      return;
    }
    onWeekStartChange(next);
  };

  const canGoPrev =
    !selectedPeriod || addDays(weekStart, -7) >= selectedPeriod.startDate;
  const canGoNext =
    !selectedPeriod || addDays(weekStart, 7) <= selectedPeriod.endDate;

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
      {periods.length > 0 && onPeriodChange ? (
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => {
            const active = p.id === selectedPeriod?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => p.id && onPeriodChange(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  active
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedPeriod ? (
        <p className="text-xs font-medium text-slate-500 text-center">
          {t("lessonPlans.components.weekStrip.periodRange", {
            label: selectedPeriod.label,
            start: selectedPeriod.startDate,
            end: selectedPeriod.endDate,
          })}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          disabled={!canGoPrev}
          className="p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("lessonPlans.components.weekStrip.prevWeek")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("lessonPlans.components.weekStrip.weekOf")}
          </p>
          <p className="text-sm font-extrabold tracking-tight text-slate-900">
            {formatDayLabel(weekStart)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          disabled={!canGoNext}
          className="p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("lessonPlans.components.weekStrip.nextWeek")}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((iso) => {
          const active = selectedDate === iso;
          const count = countsByDate[iso] || 0;
          const outOfPeriod =
            selectedPeriod &&
            (iso < selectedPeriod.startDate || iso > selectedPeriod.endDate);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(active ? null : iso)}
              disabled={Boolean(outOfPeriod)}
              className={`rounded-2xl px-1 py-3 text-center transition-colors border ${
                outOfPeriod
                  ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                  : active
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wider ${active ? "text-indigo-100" : "text-slate-400"}`}>
                {new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className="text-sm font-extrabold font-mono mt-0.5">
                {new Date(`${iso}T12:00:00`).getDate()}
              </p>
              <p className={`text-xs font-bold mt-1 ${active ? "text-indigo-100" : "text-slate-400"}`}>
                {count > 0 ? count : "—"}
              </p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
          onClick={() => {
            const today = new Date();
            const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            if (selectedPeriod && onPeriodChange && selectedPeriod.id) {
              if (iso < selectedPeriod.startDate || iso > selectedPeriod.endDate) {
                const match = periods.find(
                  (p) => iso >= p.startDate && iso <= p.endDate
                );
                if (match?.id) onPeriodChange(match.id);
              }
            }
            onWeekStartChange(
              selectedPeriod
                ? clampWeekStartToPeriod(weekStartOf(iso), selectedPeriod)
                : weekStartOf(iso)
            );
            onSelectDate(iso);
          }}
        >
          {t("lessonPlans.components.weekStrip.jumpToday")}
        </button>
      </div>
    </div>
  );
}
