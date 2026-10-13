import React from "react";
import {
  A4Page,
  A4_H,
  dash,
  formatIssued,
  type IntlReportProps,
} from "./shared";
import {
  applyTenantBrand,
  buildPeriodSubjectRows,
  fmtMark,
  isDenseSubjectList,
  overallAverage,
  periodAverage,
  resolvePeriodColumns,
  schoolInitials,
  WISTERIA_GRADE_BANDS,
  type PeriodColumn,
} from "./quarterlyHelpers";

const NAVY_BASE = {
  ink: "#1e3a5f",
  inkSoft: "#3d5a80",
  bar: "#1e3a5f",
  sage: "#e8f0e9",
  sageDeep: "#d5e4d7",
  gray: "#f1f3f5",
  rule: "#c5d0d8",
  paper: "#ffffff",
};

type NavyAccent = typeof NAVY_BASE;

function NavyBadge({
  school,
  accent,
  size = 52,
}: {
  school: IntlReportProps["school"];
  accent: NavyAccent;
  size?: number;
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
  const initials = schoolInitials(school.name).slice(0, 3);
  return (
    <div
      className="shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        background: accent.ink,
        borderRadius: "40% 40% 36% 36% / 45% 45% 40% 40%",
        fontSize: size * 0.26,
        letterSpacing: "0.06em",
        boxShadow: `inset 0 0 0 2px ${accent.sageDeep}`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/**
 * Navy bordered quarterly report — port of the blue/white/yellow bordered PDF,
 * columns from Academic Calendar periods; tenant brandColor tints chrome.
 */
export function WisteriaNavyCard(p: IntlReportProps) {
  const columns = resolvePeriodColumns(p.calendarPeriods);
  const rows = buildPeriodSubjectRows(p.grades, columns, p.examTitle);
  const dense = isDenseSubjectList(rows.length);
  const classLabel =
    p.grades.find((g) => g.classroom?.name)?.classroom?.name || "—";
  const overall = overallAverage(rows);
  const periodAvgs = Object.fromEntries(
    columns.map((c) => [c.key, periodAverage(rows, c.key)])
  ) as Record<string, number | null>;

  const tint = applyTenantBrand(NAVY_BASE, p.school.brandColor);
  const accent: NavyAccent = { ...NAVY_BASE, ink: tint.ink, inkSoft: tint.inkSoft, bar: tint.bar };

  const cellPad = dense ? "py-[3px] px-1.5" : "py-1.5 px-2";
  const nameSize = dense ? "text-[9px]" : "text-[10.5px]";
  const colCount = columns.length;
  const firstColKey = columns[0]?.key;

  return (
    <div id="report-card" className="intl-report-booklet">
      <A4Page
        className="relative font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)] overflow-visible"
        style={{ height: "auto", minHeight: `${A4_H}mm` }}
      >
        <div className="absolute inset-y-0 left-0 w-[7mm]" style={{ background: accent.bar }} />
        <div className="absolute inset-y-0 right-0 w-[7mm]" style={{ background: accent.bar }} />

        <div className={`relative ${dense ? "px-9 py-6" : "px-10 py-8"}`} style={{ marginLeft: "7mm", marginRight: "7mm" }}>
          <header className="flex items-center gap-3 mb-3">
            <NavyBadge school={p.school} accent={accent} size={dense ? 44 : 52} />
            <div className="min-w-0 flex-1">
              <h1
                className={`font-serif font-bold tracking-tight leading-tight truncate ${
                  dense ? "text-[16px]" : "text-[19px]"
                }`}
                style={{ color: accent.ink }}
              >
                {p.school.name || "School"}
              </h1>
              {p.school.address ? (
                <p className="text-[9px] mt-0.5 truncate" style={{ color: accent.inkSoft }}>
                  {p.school.address}
                </p>
              ) : null}
            </div>
          </header>

          <div
            className="w-full text-center text-white font-bold uppercase tracking-[0.28em] py-2 mb-3"
            style={{ background: accent.ink, fontSize: dense ? 11 : 13 }}
          >
            Report Card
          </div>

          <div className={`grid grid-cols-2 gap-x-8 gap-y-1.5 ${dense ? "mb-3" : "mb-4"} text-[10px]`}>
            <IdLine label="Name of Student" value={p.studentName} accent={accent} />
            <IdLine label="Grading Period" value={p.examTitle || "—"} accent={accent} />
            <IdLine label="Year and Section" value={classLabel} accent={accent} />
            <IdLine label="School Year" value={dash(p.academicYearLabel)} accent={accent} />
            <IdLine label="Student ID" value={dash(p.studentId)} accent={accent} />
            <IdLine label="Issued" value={formatIssued(p.examDate)} accent={accent} />
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "1.35fr 0.9fr" }}>
            <div className="space-y-2.5 min-w-0">
              <NavyTable title="Subjects" columns={columns} dense={dense} accent={accent}>
                {rows.length === 0 ? (
                  <tr>
                    <td className={`${cellPad} ${nameSize}`} colSpan={colCount + 1}>
                      No released subject marks for this report.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td
                        className={`${cellPad} ${nameSize} font-semibold`}
                        style={{ background: accent.sage, color: accent.ink }}
                      >
                        {r.name}
                      </td>
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={`${cellPad} text-center font-mono ${dense ? "text-[9px]" : "text-[10px]"}`}
                          style={{ background: accent.gray }}
                        >
                          {fmtMark(r.cells[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </NavyTable>

              <NavyTable title="Attendance" columns={columns} dense={dense} accent={accent}>
                {["Total Days of School", "Days Attended", "Days Absent"].map((label) => (
                  <tr key={label}>
                    <td
                      className={`${cellPad} ${nameSize} font-semibold`}
                      style={{ background: accent.sage, color: accent.ink }}
                    >
                      {label}:
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`${cellPad} text-center text-[9px] text-slate-400`}
                        style={{ background: accent.gray }}
                      >
                        {c.key === firstColKey && label === "Days Attended" && p.attendanceRate != null
                          ? `${p.attendanceRate}%`
                          : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </NavyTable>

              <NavyTable title="Grade" columns={columns} dense={dense} accent={accent}>
                <tr>
                  <td
                    className={`${cellPad} ${nameSize} font-semibold`}
                    style={{ background: accent.sage, color: accent.ink }}
                  >
                    Period Grade:
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`${cellPad} text-center font-mono font-bold text-[10px]`}
                      style={{ background: accent.gray }}
                    >
                      {fmtMark(periodAvgs[c.key])}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td
                    className={`${cellPad} ${nameSize} font-semibold`}
                    style={{ background: accent.sage, color: accent.ink }}
                  >
                    Average Grade:
                  </td>
                  <td
                    className={`${cellPad} text-center font-mono font-bold text-[10px]`}
                    colSpan={colCount}
                    style={{ background: accent.gray }}
                  >
                    {fmtMark(overall)}
                    {p.gpa != null ? ` · GPA ${p.gpa}` : ""}
                    {p.classPosition ? ` · Rank ${p.classPosition}` : ""}
                  </td>
                </tr>
              </NavyTable>
            </div>

            <div className="space-y-2.5 min-w-0 flex flex-col">
              <div className="border" style={{ borderColor: accent.ink }}>
                <div
                  className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: accent.ink }}
                >
                  Grading System
                </div>
                {WISTERIA_GRADE_BANDS.map((b) => (
                  <div
                    key={b.letter}
                    className="grid grid-cols-[40px_1fr] text-[9px] border-t"
                    style={{ borderColor: accent.rule }}
                  >
                    <div
                      className="px-1.5 py-0.5 font-bold text-center"
                      style={{ background: accent.sage, color: accent.ink }}
                    >
                      {b.letter}
                    </div>
                    <div className="px-1.5 py-0.5" style={{ background: accent.gray, color: "#475569" }}>
                      {b.range}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border flex-1 flex flex-col min-h-[120px]" style={{ borderColor: accent.ink }}>
                <div
                  className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: accent.ink }}
                >
                  Teacher&apos;s Comments and Feedback
                </div>
                <div
                  className="p-2 text-[10px] leading-relaxed flex-1"
                  style={{ background: accent.sage, minHeight: dense ? 90 : 130 }}
                >
                  {p.teacherComment?.trim() || (
                    <span className="text-slate-400 italic">No teacher comment recorded for this report.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-center mt-4" style={{ color: accent.inkSoft }}>
            Official academic record of {p.school.name || "the school"} · {formatIssued(p.examDate)}
            {p.preview ? " · Preview" : ""}
          </p>
        </div>
      </A4Page>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .intl-a4-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function IdLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: NavyAccent;
}) {
  return (
    <div className="flex gap-2 items-baseline border-b border-dotted min-w-0" style={{ borderColor: accent.rule }}>
      <span className="shrink-0 font-semibold" style={{ color: accent.inkSoft }}>
        {label}:
      </span>
      <span className="font-bold truncate" style={{ color: accent.ink }}>
        {value}
      </span>
    </div>
  );
}

function NavyTable({
  title,
  columns,
  children,
  dense,
  accent,
}: {
  title: string;
  columns: PeriodColumn[];
  children: React.ReactNode;
  dense: boolean;
  accent: NavyAccent;
}) {
  return (
    <table className="w-full border-collapse text-[10px]" style={{ border: `1px solid ${accent.ink}` }}>
      <thead>
        <tr style={{ background: accent.ink, color: "#fff" }}>
          <th
            className={`${dense ? "py-1 px-1.5" : "py-1.5 px-2"} font-bold uppercase tracking-wide text-left`}
            style={{ fontSize: dense ? 8 : 9 }}
          >
            {title}
          </th>
          {columns.map((c) => (
            <th
              key={c.key}
              className={`${dense ? "py-1 px-1" : "py-1.5 px-2"} font-bold uppercase tracking-wide text-center`}
              style={{
                fontSize: dense ? 8 : 9,
                width: `${Math.min(18, Math.floor(70 / Math.max(columns.length, 1)))}%`,
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
