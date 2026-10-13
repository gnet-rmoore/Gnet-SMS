import React from "react";
import { format } from "date-fns";
import { letterFromScore, type GradeLegendLike } from "../../../../lib/gradeLegend";

export const A4_W = 210;
export const A4_H = 297;

export type IntlGradeRow = {
  id: string;
  score: number;
  status?: string;
  subject: { id?: string; name: string; code: string };
  classroom?: { name?: string };
  examComponent?: {
    shortCode?: string | null;
    componentType?: string | null;
    label?: string | null;
  } | null;
};

/** Academic Calendar period (or preview mock) for Wisteria column headers. */
export type IntlCalendarPeriod = {
  id?: string;
  label: string;
  shortCode: string;
  orderIndex?: number;
  periodNumber?: number;
  examComponents?: Array<{ shortCode?: string | null; label?: string | null }>;
};

export type IntlReportProps = {
  studentName: string;
  examTitle: string;
  examDate: string;
  grades: IntlGradeRow[];
  school: {
    name?: string;
    address?: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  };
  templateKey: string;
  gradeLegends?: GradeLegendLike[] | null;
  attendanceRate?: number | null;
  classPosition?: string | null;
  gpa?: number | null;
  teacherComment?: string | null;
  studentId?: string;
  academicYearLabel?: string;
  /** Active Academic Calendar periods — Wisteria uses these as grade columns. */
  calendarPeriods?: IntlCalendarPeriod[] | null;
  preview?: boolean;
  /** School-mapped official signatures for print (blank line when missing). */
  officialSignatures?: {
    principal?: { name?: string | null; signatureUrl?: string | null } | null;
    registrar?: { name?: string | null; signatureUrl?: string | null } | null;
    academic?: { name?: string | null; signatureUrl?: string | null } | null;
    vpa?: { name?: string | null; signatureUrl?: string | null } | null;
    vpi?: { name?: string | null; signatureUrl?: string | null } | null;
  } | null;
};

export function avgScore(grades: IntlGradeRow[]): number | null {
  if (!grades.length) return null;
  return Math.round((grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) * 10) / 10;
}

export function dash(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  return String(v);
}

export function formatIssued(examDate?: string): string {
  try {
    return format(new Date(examDate || Date.now()), "d MMMM yyyy");
  } catch {
    return "—";
  }
}

/** Cambridge A*–G from percent (indicative mapping for display). */
export function cambridgeLetter(score: number): string {
  if (score >= 90) return "A*";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  if (score >= 40) return "E";
  if (score >= 30) return "F";
  return "G";
}

/** IB 1–7 indicative band from percent. */
export function ibLevel(score: number): number {
  if (score >= 90) return 7;
  if (score >= 80) return 6;
  if (score >= 70) return 5;
  if (score >= 60) return 4;
  if (score >= 50) return 3;
  if (score >= 40) return 2;
  return 1;
}

/** Primary skill band from percent. */
export function skillBand(score: number): string {
  if (score >= 85) return "Exceeding";
  if (score >= 70) return "Meeting";
  if (score >= 55) return "Developing";
  return "Beginning";
}

export function letterOf(
  score: number,
  legends?: GradeLegendLike[] | null
): string {
  return letterFromScore(score, legends) || cambridgeLetter(score).replace("*", "");
}

export function commentText(teacherComment?: string | null): string {
  const t = teacherComment?.trim();
  return t || "No teacher comment has been recorded for this report.";
}

export function brand(school: IntlReportProps["school"], fallback = "#4f46e5"): string {
  return school.brandColor || fallback;
}

/** True A4 portrait print sheet — never squeezed. */
export function A4Page({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`intl-a4-page report-card-sheet box-border bg-white overflow-hidden ${className}`}
      style={{
        width: `${A4_W}mm`,
        height: `${A4_H}mm`,
        minWidth: `${A4_W}mm`,
        minHeight: `${A4_H}mm`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SchoolMark({
  school,
  size = 56,
  dark = false,
}: {
  school: IntlReportProps["school"];
  size?: number;
  dark?: boolean;
}) {
  if (school.logoUrl) {
    return (
      <img
        src={school.logoUrl}
        alt=""
        style={{ width: size, height: size }}
        className="object-contain shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full flex items-center justify-center text-[9px] font-bold uppercase tracking-wider shrink-0 ${
        dark ? "bg-white/15 text-white border border-white/30" : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}
    >
      Logo
    </div>
  );
}

export function SigBlock({
  labels,
  signatures,
  className = "",
}: {
  labels: string[];
  /** Parallel to labels — official signature data URLs (null = blank line) */
  signatures?: Array<{ signatureUrl?: string | null; name?: string | null } | null | undefined>;
  className?: string;
}) {
  return (
    <div className={`grid gap-8 ${className}`} style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
      {labels.map((label, i) => {
        const slot = signatures?.[i];
        const url = slot?.signatureUrl?.trim()?.startsWith("data:image/")
          ? slot.signatureUrl.trim()
          : null;
        return (
          <div key={`${label}-${i}`} className="text-center">
            <div className="min-h-[2.5rem] flex items-end justify-center">
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="h-10 max-w-[90%] object-contain object-bottom"
                />
              ) : null}
            </div>
            <div className="border-t border-slate-800 pt-1.5 mt-1">
              {slot?.name?.trim() ? (
                <p className="text-[10px] font-bold text-slate-900 truncate">{slot.name.trim()}</p>
              ) : null}
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MetaRow({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-0.5">{it.label}</p>
          <p className="text-[12px] font-bold text-slate-900 truncate">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
