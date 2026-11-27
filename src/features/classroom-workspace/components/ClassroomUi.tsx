import React from "react";
import { CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import {
  SMS_RADIUS_CONTROL,
  SMS_RADIUS_NESTED,
  SMS_RADIUS_SURFACE,
  SMS_SHADOW_SURFACE,
} from "../../../components/ui/tokens";

export type ClassroomTone =
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "slate"
  | "sky";

const toneClass: Record<ClassroomTone, string> = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  sky: "bg-sky-50 text-sky-700 border-sky-100",
};

const accentClass: Record<ClassroomTone, string> = {
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
  sky: "bg-sky-500",
};

export function ClassroomSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white border border-slate-200 ${SMS_RADIUS_SURFACE} ${SMS_SHADOW_SURFACE} ${className}`}
    >
      {children}
    </section>
  );
}

export function ClassroomNestedSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-50 border border-slate-100 ${SMS_RADIUS_NESTED} ${className}`}
    >
      {children}
    </div>
  );
}

export function ClassroomPill({
  children,
  tone = "slate",
  icon,
  className = "",
}: {
  children: React.ReactNode;
  tone?: ClassroomTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${toneClass[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function ClassroomMetric({
  label,
  value,
  hint,
  tone = "indigo",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: ClassroomTone;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-white border border-slate-200 ${SMS_RADIUS_NESTED} p-4`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accentClass[tone]}`} />
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ClassroomFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-1.5 ${SMS_RADIUS_CONTROL} text-xs font-bold transition-colors ${
        active
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function ClassroomSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ClassroomEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`border border-dashed border-slate-200 bg-slate-50/70 ${SMS_RADIUS_SURFACE} px-6 py-12 text-center`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 border border-slate-200">
        {icon}
      </div>
      <p className="mt-4 text-sm font-extrabold tracking-tight text-slate-900">
        {title}
      </p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ClassroomField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const controlId = React.useId();
  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ id?: string }>, {
        id: controlId,
      })
    : children;
  return (
    <div>
      <label
        htmlFor={controlId}
        className="text-xs font-bold uppercase tracking-wider text-slate-600"
      >
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      <div className="mt-1.5">{control}</div>
      {hint ? (
        <p className="mt-1.5 text-xs font-medium text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmissionStatusPill({
  status,
  label,
}: {
  status?: string | null;
  label: string;
}) {
  const value = String(status || "").toUpperCase();
  if (value === "RETURNED" || value === "ACCEPTED") {
    return (
      <ClassroomPill tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
        {label}
      </ClassroomPill>
    );
  }
  if (value === "REOPENED") {
    return (
      <ClassroomPill tone="amber" icon={<RotateCcw className="h-3.5 w-3.5" />}>
        {label}
      </ClassroomPill>
    );
  }
  if (value === "SUBMITTED" || value === "TURNED_IN") {
    return (
      <ClassroomPill tone="indigo" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
        {label}
      </ClassroomPill>
    );
  }
  if (value === "DRAFT" || value === "GRADED_DRAFT") {
    return (
      <ClassroomPill tone="sky" icon={<Clock3 className="h-3.5 w-3.5" />}>
        {label}
      </ClassroomPill>
    );
  }
  return <ClassroomPill tone="slate">{label}</ClassroomPill>;
}
