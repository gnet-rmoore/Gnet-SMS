import { ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, Plus } from "lucide-react";
import type { CalendarEvent } from "../types";
import {
  getCategoryAgendaCardClass,
  getCategoryBadgeClass,
  getCategoryPillClass,
  getPriorityBadgeClass,
  LEGEND_CATEGORIES,
  getCategoryDotClass,
} from "../eventStyles";

export type CalendarMainGridProps = {
  calendarWeeks: { date: Date; currentMonth: boolean; key: string }[][];
  eventsByDateMap: Record<string, CalendarEvent[]>;
  handleNextMonth: () => void;
  handlePrevMonth: () => void;
  monthLabel: string;
  selectedDate: Date;
  selectedDateEvents: CalendarEvent[];
  setSelectedDate: (d: Date) => void;
  setSelectedEvent: (e: CalendarEvent | null) => void;
  isEligibleToCreateEvents?: boolean;
  onAddForSelected?: () => void;
};

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function shortCategory(cat: CalendarEvent["category"]) {
  if (cat === "Non-Instruction") return "Non-inst.";
  if (cat === "Administrative") return "Admin";
  return cat;
}

export function CalendarMainGrid({
  calendarWeeks,
  eventsByDateMap,
  handleNextMonth,
  handlePrevMonth,
  monthLabel,
  selectedDate,
  selectedDateEvents,
  setSelectedDate,
  setSelectedEvent,
  isEligibleToCreateEvents,
  onAddForSelected,
}: CalendarMainGridProps) {
  const todayStr = toDateStr(new Date());
  const selectedStr = toDateStr(selectedDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="overflow-hidden lg:col-span-8 rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">School calendar</p>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-white"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
          {days.map((d, i) => (
            <div
              key={d}
              className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                i === 0 ? "text-rose-600" : i === 6 ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarWeeks.flat().map((cell, index) => {
            const dateStr = toDateStr(cell.date);
            const dayEvents = eventsByDateMap[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedStr;
            const col = index % 7;
            const isSunday = col === 0;
            const isSaturday = col === 6;
            const isLastCol = isSaturday;
            const cellTone = !cell.currentMonth
              ? isSunday
                ? "bg-rose-50/30 text-rose-300"
                : isSaturday
                  ? "bg-slate-50/80 text-slate-300"
                  : "bg-slate-50/60 text-slate-300"
              : isSunday
                ? "bg-rose-50/50 text-rose-900"
                : isSaturday
                  ? "bg-slate-50 text-slate-700"
                  : "bg-white text-slate-800";
            const dayNumTone =
              isToday
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : isSelected
                  ? "bg-indigo-100 text-indigo-700"
                  : isSunday && cell.currentMonth
                    ? "text-rose-600"
                    : isSunday
                      ? "text-rose-300"
                      : isSaturday && cell.currentMonth
                        ? "text-slate-500"
                        : isSaturday
                          ? "text-slate-300"
                          : "";
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`flex min-h-[100px] flex-col items-start border-b border-slate-100 p-2 text-left transition-colors ${
                  !isLastCol ? "border-r border-slate-100" : ""
                } ${cellTone} ${isSelected ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/30" : "hover:bg-slate-50/80"}`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${dayNumTone}`}
                >
                  {cell.date.getDate()}
                </span>
                <div className="mt-1.5 w-full space-y-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-tight ${getCategoryPillClass(ev.category)}`}
                      title={`${ev.title} · ${ev.category}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${getCategoryDotClass(ev.category)}`}
                        aria-hidden
                      />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="pl-0.5 text-[11px] font-bold text-slate-500">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          {LEGEND_CATEGORIES.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <span className={`h-2 w-2 rounded-full ${getCategoryDotClass(cat)}`} aria-hidden />
              {shortCategory(cat)}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-6">
        <div className="space-y-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Agenda</p>
              <h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              {selectedDateEvents.length > 0 && (
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {isEligibleToCreateEvents && onAddForSelected && (
              <button
                type="button"
                onClick={onAddForSelected}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 transition-colors hover:bg-indigo-700"
                aria-label="Add event"
                title="Add event"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-indigo-200" />
              <p className="text-sm font-medium text-slate-500">No events on this day.</p>
              {isEligibleToCreateEvents && onAddForSelected && (
                <button
                  type="button"
                  onClick={onAddForSelected}
                  className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Add an event
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEvent(ev)}
                  className={`w-full rounded-2xl border border-slate-100/80 p-4 text-left transition-all hover:shadow-sm space-y-2 ${getCategoryAgendaCardClass(ev.category)}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-bold ${getCategoryBadgeClass(ev.category)}`}
                    >
                      {ev.category}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${getPriorityBadgeClass(ev.priority)}`}
                    >
                      {ev.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold tracking-tight text-slate-900">{ev.title}</h4>
                  <div className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {ev.time}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
