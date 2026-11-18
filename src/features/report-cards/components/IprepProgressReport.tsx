import React from "react";
import { signaturesForLabels } from "../signatureSlots";
import { A4Page, SigBlock } from "./international/shared";
import { IPREP_LEGEND_SCALES } from "../iprepLegend";
import { IPREP_TERM_COLUMNS } from "../iprepTermColumns";
import type { ReportCardPayload } from "../types";

type Props = {
  payload: ReportCardPayload;
  variant: "classic" | "modern";
  preview?: boolean;
};

const CONDUCT_ROWS = [
  "Is a good listener",
  "Is kind and helpful",
  "Shares with others",
  "Shows respect to others",
  "Expresses ideas clearly verbally",
  "Expresses ideas in drawing",
  "Unexcused Absence",
  "Day(s) Late",
];

const ATTITUDE_ROWS = [
  "Tidy / properly dressed",
  "Obeys rules and regulations",
  "Shows appropriate manners",
  "Responsible",
  "Kindness / Sharing",
  "Tardiness",
];

const PROGRESS_ROWS = [
  "Demonstrates understanding and application at grade-level",
  "Engages in classroom activities",
  "Completes and turns in assignments within expected timeframe",
  "Listens attentively and follows instructions clearly",
  "Demonstrates a positive attitude towards learning",
  "Shows enthusiasm and willingness to engage",
  "Consistency, effort, and attitude towards learning",
  "Demonstrates good communication skills",
  "Behavior in classroom (disruptive)",
];

function display(value: string | number | null | undefined): string {
  return value == null || value === "" ? "—" : String(value);
}

function rounded(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? "—" : value.toFixed(1);
}

type AssessmentSection = "conduct" | "attitude" | "progress";

function assessmentValue(
  payload: ReportCardPayload,
  section: AssessmentSection,
  label: string
): string {
  return payload.assessments?.[section]?.[label] ?? "—";
}

function ratingPercent(value: string): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, (score / 4) * 100));
}

function columnAverage(payload: ReportCardPayload, key: string): number | null {
  const scores = payload.subjects
    .map((subject) => subject.cells[key]?.score)
    .filter((score): score is number => typeof score === "number" && !Number.isNaN(score));
  if (!scores.length) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function Logo({ payload, dark = false }: { payload: ReportCardPayload; dark?: boolean }) {
  const name = payload.school.name || "School";
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (payload.school.logoUrl) {
    return (
      <img
        src={payload.school.logoUrl}
        alt=""
        style={{ width: dark ? 46 : 82, height: dark ? 46 : 82, objectFit: "contain" }}
      />
    );
  }
  return (
    <div
      style={{
        width: dark ? 46 : 82,
        height: dark ? 46 : 82,
        borderRadius: dark ? "50%" : 0,
        border: dark ? "2px solid #F2B705" : "1px solid #1F4E79",
        background: dark ? "#fff" : "#EAF1F8",
        color: dark ? "#3B1E70" : "#1F4E79",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: dark ? 14 : 20,
      }}
    >
      {initials || "—"}
    </div>
  );
}

function StudentStrip({ payload, modern }: { payload: ReportCardPayload; modern?: boolean }) {
  const items = [
    { label: "Name", value: payload.student.name },
    { label: "Gender", value: payload.student.sex || "—" },
    { label: "Grade", value: payload.student.gradeLevelLabel },
    { label: "Student ID", value: payload.student.id },
    { label: "Academic Year", value: payload.academicYear.label },
  ];
  if (!modern) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 14px", margin: "4px 0" }}>
        {items.map((item) => (
          <div key={item.label} style={{ padding: "1px 0", fontSize: 11 }}>
            <b>{item.label}:</b> {display(item.value)}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 6,
        marginBottom: 8,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "#fff",
            border: "1px solid #E4DEF2",
            borderRadius: 8,
            padding: "5px 8px",
          }}
        >
          <p style={{ margin: 0, fontSize: 6.8, color: "#6B6480", textTransform: "uppercase", letterSpacing: 0.4 }}>
            {item.label}
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 9.2, fontWeight: 600, color: "#241640" }}>
            {display(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function GradingTable({ payload, modern }: { payload: ReportCardPayload; modern?: boolean }) {
  const baseRows = payload.legend.length ? payload.legend : IPREP_LEGEND_SCALES.map((s) => ({
    letter: s.gradeLetter,
    min: s.minScore,
    max: s.maxScore,
    detail: s.remark || undefined,
    gpa: s.gpaPoints ?? undefined,
  }));
  const rows = [
    ...baseRows,
    { letter: "INC", min: 0, max: 0, detail: "Incomplete", gpa: undefined },
  ];
  if (modern) {
    return (
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 10, color: "#3B1E70" }}>Grading System</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "4px 8px" }}>
          {rows.map((row) => (
            <div
              key={row.letter}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 7.4,
                border: "1px solid #E4DEF2",
                borderRadius: 6,
                padding: "3px 5px",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background:
                    row.letter.startsWith("A") ? "#2E9E6B" : row.letter.startsWith("B") ? "#3B7FD4" : row.letter === "F" ? "#D9534F" : "#E0A426",
                }}
              />
              <b style={{ width: 16 }}>{row.letter}</b>
              <span>{row.detail}</span>
              <span style={{ color: "#6B6480", marginLeft: "auto" }}>
                {row.letter === "INC" ? "—" : `${row.min}–${row.max}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 style={{ margin: "4px 0 2px", fontSize: 12 }}>Grading System</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr>
            {["Remarks", "%", "Letter", "Points"].map((head) => (
              <th
                key={head}
                style={{
                  border: "1px solid #000",
                  background: "#fff",
                  padding: "1.8px 4px",
                  textAlign: "center",
                }}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.letter}>
              <td style={{ border: "1px solid #000", padding: "1.8px 4px" }}>{row.detail}</td>
              <td style={{ border: "1px solid #000", padding: "1.8px 4px", textAlign: "center" }}>
                {row.letter === "INC" ? "—" : row.min === row.max ? row.min : `${row.min} - ${row.max}`}
              </td>
              <td style={{ border: "1px solid #000", padding: "1.8px 4px", textAlign: "center" }}>{row.letter}</td>
              <td style={{ border: "1px solid #000", padding: "1.8px 4px", textAlign: "center" }}>
                {display(row.gpa)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatingCard({
  title,
  rows,
  values,
  modern,
}: {
  title: string;
  rows: string[];
  values?: Record<string, string>;
  modern?: boolean;
}) {
  return (
    <div
      style={
        modern
          ? { background: "#fff", border: "1px solid #E4DEF2", borderRadius: 10, padding: "9px 10px", marginBottom: 8 }
          : { marginBottom: 8 }
      }
    >
      <h3 style={{ margin: modern ? "0 0 6px" : "4px 0 2px", fontSize: modern ? 10 : 12, color: modern ? "#3B1E70" : undefined }}>
        {title}
      </h3>
      {rows.map((label) => {
        const raw = values?.[label] ?? "—";
        return (
          <div
            key={label}
            style={
              modern
                ? { display: "grid", gridTemplateColumns: "1fr 46px 22px", gap: 6, fontSize: 7.4, padding: "2.5px 0", borderBottom: "1px dashed #E4DEF2", alignItems: "center" }
                : { display: "flex", justifyContent: "space-between", border: "1px solid #000", padding: "1.8px 4px", fontSize: 11 }
            }
          >
            <span>{label}</span>
            {modern ? (
              <div style={{ height: 5, background: "#EDEAF7", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${ratingPercent(raw)}%`, height: "100%", background: "#6C4AB6", borderRadius: 5 }} />
              </div>
            ) : null}
            <span style={{ fontWeight: 700, textAlign: modern ? "right" : undefined }}>{display(raw)}</span>
          </div>
        );
      })}
    </div>
  );
}

function PromotionBlock({ payload, modern }: { payload: ReportCardPayload; modern?: boolean }) {
  const promotion = payload.promotion;
  if (!promotion) return null;
  const toGrade = promotion.toGrade || "—";
  const repeated = promotion?.outcome && promotion.outcome !== "PROMOTED" ? toGrade : "—";
  return (
    <div
      style={
        modern
          ? {
              background: "linear-gradient(120deg,#3B1E70,#6C4AB6)",
              color: "#fff",
              borderRadius: 10,
              padding: "9px 12px",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 18,
            }
          : { border: "1px solid #000", padding: "4px 8px", marginTop: 5 }
      }
    >
      <div style={{ fontSize: modern ? 9.5 : 12.5, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>
        Promotion Certificate
      </div>
      <div style={{ flex: 1, fontSize: modern ? 8 : 11, lineHeight: 1.5 }}>
        <div>Promoted to Grade {display(toGrade)}</div>
        <div>Failed: required to repeat {display(repeated)} Grade.</div>
        <div>(To attend Enrichment Classes) Deficient in {display(promotion?.conditionedSubjects)}</div>
      </div>
    </div>
  );
}

export function IprepProgressReport({ payload, variant, preview = false }: Props) {
  const modern = variant === "modern";
  const columns = payload.columns.length ? payload.columns : IPREP_TERM_COLUMNS;
  const overall = payload.aggregates.overallAverage;
  const signatureLabels = ["Vice Principal for Instruction", "General Manager / Co-Founder"];

  return (
    <div
      id="report-card"
      className={`iprep-progress-report ${modern ? "modern" : "classic"} ${preview ? "preview-mode" : ""}`}
      data-page-size="A4-portrait"
    >
      <A4Page
        className={modern ? "font-sans text-[#241640]" : "font-sans text-black"}
        style={modern ? { background: "#F3F0FA", padding: "9mm 11mm 8mm" } : { padding: "6mm 7mm", fontSize: 11 }}
      >
        <div
          style={
            modern
              ? {
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "linear-gradient(120deg,#3B1E70,#6C4AB6)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "9px 14px",
                  marginBottom: 8,
                }
              : {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  borderBottom: "1.5px solid #000",
                  paddingBottom: 3,
                  marginBottom: 4,
                }
          }
        >
          <Logo payload={payload} dark={modern} />
          <div style={{ flex: 1, textAlign: modern ? "left" : "center" }}>
            <div style={{ fontSize: modern ? 13.5 : 16, fontWeight: 800 }}>
              {payload.school.name || "School"}
            </div>
            {payload.school.motto ? (
              <div style={{ fontStyle: "italic", fontSize: modern ? 8.6 : 12, opacity: modern ? 0.9 : 1 }}>
                {payload.school.motto}
              </div>
            ) : null}
            {!modern && (
              <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2, letterSpacing: 0.3 }}>
                ACADEMIC PROGRESS REPORT
              </div>
            )}
          </div>
          {modern && (
            <div
              style={{
                background: "#F2B705",
                color: "#3B1E70",
                fontWeight: 700,
                fontSize: 8.6,
                padding: "4px 10px",
                borderRadius: 999,
                textTransform: "uppercase",
              }}
            >
              Academic Progress Report
            </div>
          )}
        </div>

        <StudentStrip payload={payload} modern={modern} />

        <div style={{ display: "grid", gridTemplateColumns: modern ? "1.62fr 1fr" : "3fr 1.4fr", gap: modern ? 8 : "0 4mm", alignItems: "start" }}>
          <div>
            <div
              style={
                modern
                  ? { background: "#fff", border: "1px solid #E4DEF2", borderRadius: 10, padding: "9px 10px", marginBottom: 8 }
                  : {}
              }
            >
              <h3
                style={{
                  margin: modern ? "0 0 6px" : "4px 0 2px",
                  fontSize: modern ? 10 : 12,
                  color: modern ? "#3B1E70" : undefined,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                Subject Performance
                <span style={{ fontSize: modern ? 8.4 : 11, fontWeight: 700 }}>
                  Overall Avg: {rounded(overall)}
                </span>
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: modern ? 8 : 11.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: modern ? "1.5px solid #E4DEF2" : "1px solid #000", background: modern ? "transparent" : "#fff", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                      Subject
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        style={{ textAlign: "center", borderBottom: modern ? "1.5px solid #E4DEF2" : "1px solid #000", background: modern ? "transparent" : "#fff", padding: modern ? "3px 4px" : "1.8px 4px" }}
                      >
                        {modern ? column.key : column.label}
                      </th>
                    ))}
                    <th style={{ textAlign: "center", borderBottom: modern ? "1.5px solid #E4DEF2" : "1px solid #000", background: modern ? "transparent" : "#fff", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                      Final Avg.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payload.subjects.map((subject) => (
                    <tr key={subject.subjectId}>
                      <td style={{ fontWeight: 600, borderBottom: modern ? "1px solid #E4DEF2" : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                        {subject.name}
                      </td>
                      {columns.map((column) => {
                        const cell = subject.cells[column.key];
                        return (
                          <td
                            key={column.key}
                            style={{ textAlign: "center", borderBottom: modern ? "1px solid #E4DEF2" : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}
                          >
                            {display(cell?.score ?? null)}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "center", fontWeight: 700, borderBottom: modern ? "1px solid #E4DEF2" : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                        {rounded(subject.average)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ border: modern ? undefined : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>Average</td>
                    {columns.map((column) => (
                      <td key={column.key} style={{ textAlign: "center", border: modern ? undefined : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                        {rounded(columnAverage(payload, column.key))}
                      </td>
                    ))}
                    <td style={{ textAlign: "center", border: modern ? undefined : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                      {rounded(overall)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ border: modern ? undefined : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>Rank</td>
                    {columns.map((column) => (
                      <td key={column.key} style={{ border: modern ? undefined : "1px solid #000", textAlign: "center", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                        —
                      </td>
                    ))}
                    <td style={{ textAlign: "center", border: modern ? undefined : "1px solid #000", padding: modern ? "3px 4px" : "1.8px 4px" }}>
                      {display(payload.aggregates.classPosition)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <GradingTable payload={payload} modern={modern} />
          </div>

          <div>
            <RatingCard
              title="Conduct"
              rows={CONDUCT_ROWS}
              values={payload.assessments?.conduct}
              modern={modern}
            />
            <RatingCard
              title="Attitude & Values"
              rows={ATTITUDE_ROWS}
              values={payload.assessments?.attitude}
              modern={modern}
            />
            <RatingCard
              title="Academic Progress"
              rows={PROGRESS_ROWS}
              values={payload.assessments?.progress}
              modern={modern}
            />
            <div style={{ fontSize: modern ? 6.6 : 10, lineHeight: 1.35, color: modern ? "#6B6480" : undefined, background: modern ? "#EDEAF7" : undefined, borderRadius: modern ? 6 : undefined, padding: modern ? "5px 6px" : undefined }}>
              Consultation is required with the homeroom and instructional team when a child receives 1–3 in conduct: 1 Not Yet, 2 Sometimes, 3 Almost Always, 4 Always.
            </div>
          </div>
        </div>

        <PromotionBlock payload={payload} modern={modern} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: modern ? 24 : 30, marginTop: modern ? 0 : 8 }}>
          <SigBlock
            labels={signatureLabels}
            signatures={signaturesForLabels(signatureLabels, payload.officialSignatures)}
            className=""
          />
        </div>
      </A4Page>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .iprep-progress-report .intl-a4-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
