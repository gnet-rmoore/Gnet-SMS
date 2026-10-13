import React from "react";
import { cn } from "../../../../lib/cn";
import { DASHBOARD_CARD } from "../dashboardUi";
import {
  DASHBOARD_CHART_HEIGHT_CLASS,
  type DashboardChartSize,
} from "./chartTokens";

export { DASHBOARD_CHART_TOOLTIP } from "./chartTokens";

type DashboardChartCardProps = {
  title: string;
  hint?: string;
  badge?: React.ReactNode;
  size?: DashboardChartSize;
  children: React.ReactNode;
  className?: string;
};

export function DashboardChartCard({
  title,
  hint,
  badge,
  size: _size,
  children,
  className,
}: DashboardChartCardProps) {
  return (
    <div className={cn(DASHBOARD_CARD, "p-6 sm:p-8", className)}>
      <div className={cn("mb-4", badge ? "flex items-start justify-between gap-3" : undefined)}>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
          {hint ? <p className="mt-0.5 text-sm text-slate-500">{hint}</p> : null}
        </div>
        {badge ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function DashboardChartEmpty({
  message,
  size = "grid",
}: {
  message: string;
  size?: DashboardChartSize;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-400",
        DASHBOARD_CHART_HEIGHT_CLASS[size]
      )}
    >
      {message}
    </div>
  );
}

export function DashboardChartsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">{children}</div>;
}
