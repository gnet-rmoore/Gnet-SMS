/**
 * Canonical density class recipes — keep in sync with `--sms-*` in `src/index.css`
 * and `docs/UI_CONSISTENCY_PLAN.md` / `docs/CANVAS_SURFACE_CONTRAST_PLAN.md`.
 */

/** Soft dual-layer lift so white surfaces separate from `smsCanvas`. */
export const SMS_SHADOW_SURFACE =
  "shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]" as const;

export const SMS_RADIUS_SURFACE = "rounded-[32px]" as const;
export const SMS_RADIUS_NESTED = "rounded-2xl" as const;
export const SMS_RADIUS_CONTROL = "rounded-xl" as const;

/** Page / Layout backing (Option A — one step darker than nested wells). */
export const smsCanvasClass = "bg-slate-100" as const;

/** Inner wells on a white surface — not for page chrome. */
export const smsSurfaceNestedClass = "bg-slate-50 border border-slate-100" as const;

export const pageShellClass = {
  /** Layout already applies `p-4 sm:p-6 lg:p-8` — shells must not add horizontal padding. */
  default: "max-w-6xl mx-auto space-y-8 w-full min-w-0",
  wide: "max-w-7xl mx-auto space-y-8 w-full min-w-0",
} as const;

export const surfaceClass = {
  primary: `bg-white border border-slate-200 ${SMS_RADIUS_SURFACE} p-8 ${SMS_SHADOW_SURFACE}`,
  nested: `bg-white border border-slate-200 ${SMS_RADIUS_NESTED} p-6 ${SMS_SHADOW_SURFACE}`,
  nestedCompact: `bg-white border border-slate-200 ${SMS_RADIUS_NESTED} p-4 ${SMS_SHADOW_SURFACE}`,
  empty: `${SMS_RADIUS_SURFACE} border border-dashed border-slate-200 bg-white py-16 text-center px-6`,
  banner:
    `${SMS_RADIUS_SURFACE} bg-gradient-to-br from-slate-950 to-slate-900 text-white p-8 space-y-3`,
} as const;

export const buttonClass = {
  base:
    "inline-flex items-center justify-center gap-2 font-bold transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 " +
    "focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none " +
    SMS_RADIUS_CONTROL,
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  danger: "bg-rose-600 hover:bg-rose-700 text-white",
  sizeDefault: "px-6 py-3 text-sm min-h-11",
  sizeSecondary: "px-4 py-2.5 text-sm min-h-10",
  sizeGhost: "px-3 py-2.5 text-sm min-h-10",
  sizeCompact: "px-3 py-2 text-sm min-h-6",
  sizeIcon: "p-2.5 min-h-10 min-w-10",
} as const;

export const fieldControlClass = {
  default:
    `w-full ${SMS_RADIUS_CONTROL} border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 ` +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/35 " +
    "focus:border-indigo-300 disabled:opacity-50 disabled:bg-slate-50",
  compact:
    `w-full ${SMS_RADIUS_CONTROL} border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ` +
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/35 " +
    "focus:border-indigo-300 disabled:opacity-50 disabled:bg-slate-50",
  invalid: "border-rose-300 focus:ring-rose-500/30 focus:border-rose-400",
} as const;

export const typeClass = {
  pageTitle:
    "font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900",
  sectionTitle: "font-heading text-lg font-extrabold tracking-tight text-slate-900",
  subtitle: "text-slate-500 font-medium",
  metaLabel: "text-xs font-bold uppercase tracking-wider text-slate-500",
  body: "text-sm text-slate-700",
  helper: "text-sm text-slate-500 font-medium",
  error: "text-sm text-rose-600 font-medium",
} as const;

/** List / directory tables — fixed layout, compact cells, no desktop horizontal scroll. */
export const dataTableClass = {
  wrap: "min-w-0",
  table: "w-full table-fixed text-left border-collapse",
  thead: "bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider",
  th: "px-4 py-3",
  thEnd: "px-4 py-3 text-end",
  td: "px-4 py-3 align-middle min-w-0",
  tdEmpty: "px-4 py-12 text-center text-slate-400 font-medium",
  tbody: "divide-y divide-slate-100",
} as const;
