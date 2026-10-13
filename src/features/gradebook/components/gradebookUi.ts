import { SMS_SHADOW_SURFACE, SMS_RADIUS_SURFACE } from "../../../components/ui";

/** Shared Executive Slate tokens for gradebook surfaces. */
export const gradebookPanelClass = `rounded-[32px] border border-slate-200 bg-white overflow-hidden ${SMS_SHADOW_SURFACE}`;

export const gradebookNestedPanelClass = `rounded-2xl border border-slate-200 bg-slate-50/90 ${SMS_SHADOW_SURFACE}`;

export const gradebookHubCardClass = `${SMS_RADIUS_SURFACE} border border-slate-200 bg-white p-6 sm:p-8 ${SMS_SHADOW_SURFACE}`;

export const gradebookInputClass =
  "w-full min-h-[44px] px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-base sm:text-sm text-slate-900 outline-none transition-shadow focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50 disabled:bg-slate-50";

export const gradebookInputActiveClass =
  "border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/30";

export const gradebookStickyColClass =
  "sticky left-0 z-[1] bg-white border-r border-slate-200 shadow-[4px_0_12px_-4px_rgb(15,23,42,0.08)]";

export const gradebookStickyHeadClass =
  "sticky left-0 z-20 bg-slate-50 border-r border-slate-200 shadow-[4px_0_12px_-4px_rgb(15,23,42,0.06)]";

export const gradebookMobileBarClass =
  "fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(15,23,42,0.08)]";
