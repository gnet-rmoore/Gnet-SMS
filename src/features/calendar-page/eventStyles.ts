import type { CalendarEvent } from "./types";

export type CalendarCategory = CalendarEvent["category"];
export type CalendarPriority = CalendarEvent["priority"];

type CategoryStyle = {
  badge: string;
  pill: string;
  dot: string;
  filterActive: string;
  filterIdle: string;
  agendaCard: string;
};

const categoryStyles: Record<CalendarCategory, CategoryStyle> = {
  Academic: {
    badge: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/80",
    pill: "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100",
    dot: "bg-indigo-500",
    filterActive: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25",
    filterIdle: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ring-1 ring-indigo-100",
    agendaCard: "bg-indigo-50/40 hover:bg-indigo-50/70",
  },
  Class: {
    badge: "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80",
    pill: "bg-violet-50 text-violet-900 ring-1 ring-violet-100",
    dot: "bg-violet-500",
    filterActive: "bg-violet-600 text-white shadow-sm shadow-violet-600/25",
    filterIdle: "bg-violet-50 text-violet-700 hover:bg-violet-100 ring-1 ring-violet-100",
    agendaCard: "bg-violet-50/40 hover:bg-violet-50/70",
  },
  Sports: {
    badge: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
    pill: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100",
    dot: "bg-emerald-500",
    filterActive: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25",
    filterIdle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-100",
    agendaCard: "bg-emerald-50/40 hover:bg-emerald-50/70",
  },
  Administrative: {
    badge: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80",
    pill: "bg-amber-50 text-amber-950 ring-1 ring-amber-100",
    dot: "bg-amber-500",
    filterActive: "bg-amber-600 text-white shadow-sm shadow-amber-600/25",
    filterIdle: "bg-amber-50 text-amber-800 hover:bg-amber-100 ring-1 ring-amber-100",
    agendaCard: "bg-amber-50/40 hover:bg-amber-50/70",
  },
  Operations: {
    badge: "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80",
    pill: "bg-sky-50 text-sky-900 ring-1 ring-sky-100",
    dot: "bg-sky-500",
    filterActive: "bg-sky-600 text-white shadow-sm shadow-sky-600/25",
    filterIdle: "bg-sky-50 text-sky-700 hover:bg-sky-100 ring-1 ring-sky-100",
    agendaCard: "bg-sky-50/40 hover:bg-sky-50/70",
  },
  Health: {
    badge: "bg-rose-100 text-rose-800 ring-1 ring-rose-200/80",
    pill: "bg-rose-50 text-rose-900 ring-1 ring-rose-100",
    dot: "bg-rose-500",
    filterActive: "bg-rose-600 text-white shadow-sm shadow-rose-600/25",
    filterIdle: "bg-rose-50 text-rose-700 hover:bg-rose-100 ring-1 ring-rose-100",
    agendaCard: "bg-rose-50/40 hover:bg-rose-50/70",
  },
  Finance: {
    badge: "bg-lime-100 text-lime-900 ring-1 ring-lime-200/80",
    pill: "bg-lime-50 text-lime-950 ring-1 ring-lime-100",
    dot: "bg-lime-600",
    filterActive: "bg-lime-700 text-white shadow-sm shadow-lime-700/25",
    filterIdle: "bg-lime-50 text-lime-800 hover:bg-lime-100 ring-1 ring-lime-100",
    agendaCard: "bg-lime-50/40 hover:bg-lime-50/70",
  },
  Counseling: {
    badge: "bg-teal-100 text-teal-800 ring-1 ring-teal-200/80",
    pill: "bg-teal-50 text-teal-900 ring-1 ring-teal-100",
    dot: "bg-teal-500",
    filterActive: "bg-teal-600 text-white shadow-sm shadow-teal-600/25",
    filterIdle: "bg-teal-50 text-teal-700 hover:bg-teal-100 ring-1 ring-teal-100",
    agendaCard: "bg-teal-50/40 hover:bg-teal-50/70",
  },
  Holiday: {
    badge: "bg-fuchsia-100 text-fuchsia-800 ring-1 ring-fuchsia-200/80",
    pill: "bg-fuchsia-50 text-fuchsia-900 ring-1 ring-fuchsia-100",
    dot: "bg-fuchsia-500",
    filterActive: "bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/25",
    filterIdle: "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 ring-1 ring-fuchsia-100",
    agendaCard: "bg-fuchsia-50/40 hover:bg-fuchsia-50/70",
  },
  "Non-Instruction": {
    badge: "bg-slate-200 text-slate-800 ring-1 ring-slate-300/80",
    pill: "bg-slate-100 text-slate-800 ring-1 ring-slate-200",
    dot: "bg-slate-500",
    filterActive: "bg-slate-700 text-white shadow-sm shadow-slate-700/25",
    filterIdle: "bg-slate-100 text-slate-700 hover:bg-slate-200 ring-1 ring-slate-200",
    agendaCard: "bg-slate-50 hover:bg-slate-100/80",
  },
  Attendance: {
    badge: "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200/80",
    pill: "bg-cyan-50 text-cyan-900 ring-1 ring-cyan-100",
    dot: "bg-cyan-500",
    filterActive: "bg-cyan-600 text-white shadow-sm shadow-cyan-600/25",
    filterIdle: "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 ring-1 ring-cyan-100",
    agendaCard: "bg-cyan-50/40 hover:bg-cyan-50/70",
  },
  Other: {
    badge: "bg-stone-100 text-stone-800 ring-1 ring-stone-200/80",
    pill: "bg-stone-50 text-stone-900 ring-1 ring-stone-100",
    dot: "bg-stone-400",
    filterActive: "bg-stone-600 text-white shadow-sm shadow-stone-600/25",
    filterIdle: "bg-stone-50 text-stone-700 hover:bg-stone-100 ring-1 ring-stone-100",
    agendaCard: "bg-stone-50/60 hover:bg-stone-50",
  },
};

const priorityStyles: Record<CalendarPriority, string> = {
  high: "bg-rose-100 text-rose-800 ring-1 ring-rose-200/80",
  medium: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80",
  low: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
};

export function getCategoryStyle(cat: CalendarCategory): CategoryStyle {
  return categoryStyles[cat] ?? categoryStyles.Other;
}

export function getCategoryBadgeClass(cat: CalendarCategory): string {
  return getCategoryStyle(cat).badge;
}

export function getCategoryPillClass(cat: CalendarCategory): string {
  return getCategoryStyle(cat).pill;
}

export function getCategoryDotClass(cat: CalendarCategory): string {
  return getCategoryStyle(cat).dot;
}

export function getCategoryFilterClasses(cat: CalendarCategory, active: boolean): string {
  const s = getCategoryStyle(cat);
  return active ? s.filterActive : s.filterIdle;
}

export function getCategoryAgendaCardClass(cat: CalendarCategory): string {
  return getCategoryStyle(cat).agendaCard;
}

/** @deprecated use getCategoryBadgeClass — kept for existing call sites */
export function getCategoryLightBg(cat: CalendarCategory): string {
  return getCategoryBadgeClass(cat);
}

export function getPriorityBadgeClass(priority: CalendarPriority): string {
  return priorityStyles[priority];
}

export const LEGEND_CATEGORIES: CalendarCategory[] = [
  "Academic",
  "Class",
  "Sports",
  "Administrative",
  "Operations",
  "Health",
  "Finance",
  "Counseling",
  "Holiday",
  "Attendance",
  "Other",
];
