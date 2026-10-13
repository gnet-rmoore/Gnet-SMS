import React from "react";

/** Shared decorative chrome for product tour frames — not live data. */
export function PreviewShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgb(15,23,42,0.08)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-rose-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        <span className="ms-2 truncate text-[11px] font-medium text-slate-400">{title}</span>
      </div>
      <div className="min-h-[220px] bg-slate-50 p-4 sm:min-h-[260px] sm:p-5">{children}</div>
    </div>
  );
}

export function PreviewPill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-semibold ${
        active ? "bg-blue-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-100"
      }`}
    >
      {children}
    </span>
  );
}
