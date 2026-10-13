import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "../../../lib/cn";

/** Executive Slate dashboard surface — matches Finance home cards. */
export const DASHBOARD_CARD =
  "rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]";

export type DashboardTone = "emerald" | "rose" | "amber" | "indigo" | "slate";

const TONE_ICON: Record<DashboardTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-500",
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
  slate: "bg-slate-100 text-slate-600",
};

const TONE_BADGE: Record<DashboardTone, string> = {
  emerald: "text-emerald-600 bg-emerald-50",
  rose: "text-rose-600 bg-rose-50",
  amber: "text-amber-700 bg-amber-50",
  indigo: "text-indigo-700 bg-indigo-50",
  slate: "text-slate-600 bg-slate-100",
};

const TONE_LINK: Record<DashboardTone, string> = {
  emerald: "text-emerald-600 bg-emerald-50",
  rose: "text-rose-600 bg-rose-50",
  amber: "text-amber-600 bg-amber-50",
  indigo: "text-indigo-600 bg-indigo-50",
  slate: "text-slate-600 bg-slate-100",
};

export function DashboardBodyShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("space-y-8", className)}
    >
      {children}
    </motion.div>
  );
}

export function DashboardKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              DASHBOARD_CARD,
              "h-36 animate-pulse bg-slate-50",
              i === 0 && "sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-200 to-slate-100"
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn(DASHBOARD_CARD, "lg:col-span-2 h-72 animate-pulse bg-slate-50")} />
        <div className={cn(DASHBOARD_CARD, "h-72 animate-pulse bg-slate-50")} />
      </div>
    </div>
  );
}

type DashboardHeroKpiProps = {
  icon: LucideIcon;
  badge: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
  className?: string;
};

export function DashboardHeroKpi({
  icon: Icon,
  badge,
  label,
  value,
  valueClassName,
  className,
}: DashboardHeroKpiProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-[32px] text-white",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">{badge}</span>
      </div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p
        className={cn(
          "text-2xl font-extrabold tracking-tight font-mono mt-1 text-white",
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

type DashboardKpiTileProps = {
  icon: LucideIcon;
  tone?: DashboardTone;
  badge: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  href?: string;
  className?: string;
};

export function DashboardKpiTile({
  icon: Icon,
  tone = "indigo",
  badge,
  label,
  value,
  subtext,
  href,
  className,
}: DashboardKpiTileProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            TONE_ICON[tone]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg",
            TONE_BADGE[tone]
          )}
        >
          {badge}
        </span>
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
        {value}
      </p>
      {subtext ? (
        <p className="text-xs text-slate-500 mt-2">{subtext}</p>
      ) : null}
    </>
  );

  const shell = cn(DASHBOARD_CARD, "p-6 block", href && "hover:border-indigo-100 transition-colors", className);

  if (href) {
    return (
      <Link to={href} className={shell}>
        {inner}
      </Link>
    );
  }

  return <div className={shell}>{inner}</div>;
}

type DashboardLinkTileProps = {
  to: string;
  icon: LucideIcon;
  tone?: DashboardTone;
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
};

export function DashboardLinkTile({
  to,
  icon: Icon,
  tone = "indigo",
  label,
  description,
  className,
}: DashboardLinkTileProps) {
  return (
    <Link
      to={to}
      className={cn(
        DASHBOARD_CARD,
        "p-5 flex items-center gap-4 hover:border-indigo-100 transition-colors group",
        className
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
          TONE_LINK[tone]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold tracking-tight text-slate-900 text-sm">{label}</p>
        {description ? (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        ) : null}
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 rtl:rotate-180" />
    </Link>
  );
}

type DashboardPanelProps = {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
};

export function DashboardPanel({
  title,
  hint,
  action,
  badge,
  children,
  className,
  wide,
}: DashboardPanelProps) {
  return (
    <div className={cn(DASHBOARD_CARD, "p-6 sm:p-8 space-y-4", wide && "lg:col-span-2", className)}>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
          {hint ? <p className="text-sm text-slate-500 mt-0.5">{hint}</p> : null}
        </div>
        {badge ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs uppercase tracking-wider shrink-0">
            {badge}
          </span>
        ) : null}
        {action}
      </div>
      {children}
    </div>
  );
}

type DashboardListRowProps = {
  to: string;
  label: React.ReactNode;
  trailing?: React.ReactNode;
};

export function DashboardListRow({ to, label, trailing }: DashboardListRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors gap-3"
    >
      <span className="font-bold text-sm text-slate-800 truncate">{label}</span>
      {trailing ?? (
        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 rtl:rotate-180" />
      )}
    </Link>
  );
}

export function DashboardInlineLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1",
        className
      )}
    >
      {children}
    </Link>
  );
}

/** Rotating tones for KPI rows beyond the hero tile. */
export function dashboardToneAt(index: number): DashboardTone {
  const order: DashboardTone[] = ["emerald", "indigo", "amber", "rose", "slate"];
  return order[index % order.length];
}
