import React from "react";
import { A4Page } from "./international/shared";
import { liberianScoreTone } from "../assembleClient";
import { isLiberianReportCardTemplate } from "../registry";
import type { ReportCardPayload } from "../types";

type Props = {
  payload: ReportCardPayload;
  preview?: boolean;
};

function value(value: string | number | null | undefined): string {
  return value == null || value === "" ? "—" : String(value);
}

function number(value: number | null | undefined, digits = 1): string {
  return value == null || Number.isNaN(value) ? "—" : Number(value).toFixed(digits);
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function tone(score: number | null | undefined, failBand: string): string {
  if (score == null) return "#b3b9c9";
  return failBand === "fail" ? "#b5232f" : "#14203d";
}

function cellState(
  subject: ReportCardPayload["subjects"][number],
  key: string
): { label: string; color: string } {
  const cell = subject.cells[key];
  if (cell?.incomplete) return { label: "INC", color: "#b26a00" };
  const band = liberianScoreTone(cell?.score);
  return { label: cell?.score == null ? "—" : number(cell.score, 0), color: tone(cell?.score, band) };
}

function semesterLabel(key: string): string {
  if (key === "SEM1") return "First semester";
  if (key === "SEM2") return "Second semester";
  return "Marks";
}

function semesterAverage(
  subject: ReportCardPayload["subjects"][number],
  key: string
): number | null {
  if (key === "SEM1") return subject.sem1Avg;
  if (key === "SEM2") return subject.sem2Avg;
  return subject.average;
}

function groupsOf(columns: ReportCardPayload["columns"]) {
  const groups: Array<{ key: string; columns: ReportCardPayload["columns"] }> = [];
  for (const column of columns) {
    const key = /^(SEM\d)_/.exec(column.key)?.[1] || "ALL";
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, columns: [] };
      groups.push(group);
    }
    group.columns.push(column);
  }
  return groups;
}

function Frame({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: "9mm",
        border: "1.2mm double #1b2f6b",
        padding: "11mm 12mm",
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : undefined,
        textAlign: centered ? "center" : undefined,
        color: "#14203d",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: "9.5pt",
      }}
    >
      {children}
    </div>
  );
}

function CoverPage({ payload }: { payload: ReportCardPayload }) {
  const school = payload.school;
  const location = [school.district, school.county && `${school.county} County`, school.country]
    .filter(Boolean)
    .join(" · ");
  const liberiaBranding =
    isLiberianReportCardTemplate(payload.templateKey) ||
    /^(lr|liberia|republic of liberia)$/i.test((school.country || "").trim());
  const poBox = school.poBox
    ? /^p\.?\s*o\.?\s*box/i.test(school.poBox.trim())
      ? school.poBox.trim()
      : `P.O. Box ${school.poBox.trim()}`
    : null;
  const contact = [school.address, poBox, school.contactPhone, school.contactEmail]
    .filter(Boolean)
    .join(" · ");
  const initials = (school.name || "SCHOOL")
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <A4Page style={{ background: "#fff", position: "relative" }}>
      <Frame centered>
        <div style={{ color: "#b5232f", fontSize: "9pt", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
          {liberiaBranding ? "Republic of Liberia" : school.country || ""}
          <span style={{ display: "block", color: "#1b2f6b", fontSize: "8pt", letterSpacing: 1.4 }}>
            {liberiaBranding ? "Ministry of Education" : ""}
          </span>
        </div>
        {school.logoUrl ? (
          <img src={school.logoUrl} alt="" style={{ width: "38mm", height: "38mm", objectFit: "contain", margin: "14mm 0 6mm" }} />
        ) : (
          <div
            style={{
              width: "38mm",
              height: "38mm",
              margin: "14mm 0 6mm",
              border: "0.6mm solid #1b2f6b",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: "#1b2f6b",
              fontSize: "34pt",
              fontWeight: 800,
            }}
          >
            {initials || "S"}
          </div>
        )}
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "25pt", color: "#1b2f6b", lineHeight: 1.15 }}>
          {school.name}
        </h1>
        <p style={{ fontSize: "9pt", color: "#5f6a82" }}>{contact}</p>
        <h2 style={{ margin: "16mm 0 2mm", fontFamily: "Georgia, serif", fontSize: "21pt" }}>
          Learner Progress Report
        </h2>
        <div style={{ display: "inline-block", background: "#1b2f6b", color: "#fff", padding: "1.6mm 7mm", borderRadius: 999, fontWeight: 700, letterSpacing: 1 }}>
          {payload.academicYear.label}
        </div>
        <div style={{ marginTop: "14mm", width: "130mm", border: "0.4mm solid #1b2f6b", borderRadius: 2, textAlign: "left" }}>
          {[
            ["Learner", payload.student.name],
            ["Class", payload.student.classLabel],
            ["Grade level", payload.student.gradeLevelLabel],
            ["Learner ID", payload.student.id],
          ].map(([label, itemValue]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "3mm 5mm", borderBottom: "0.2mm solid #cfd5e3" }}>
              <span style={{ color: "#5f6a82" }}>{label}</span>
              <b style={{ fontSize: "11pt" }}>{value(itemValue)}</b>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", fontSize: "8pt", color: "#5f6a82" }}>{location}</div>
      </Frame>
    </A4Page>
  );
}

function GradesPage({ payload }: { payload: ReportCardPayload }) {
  const groups = groupsOf(payload.columns);
  return (
    <A4Page style={{ background: "#fff", position: "relative" }}>
      <Frame>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "0.6mm solid #1b2f6b", paddingBottom: "3mm" }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "14pt", color: "#1b2f6b" }}>
              {payload.student.name}
            </h3>
            <small style={{ color: "#5f6a82" }}>
              {payload.student.classLabel} · {payload.academicYear.label}
            </small>
          </div>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontSize: "12pt" }}>{payload.school.name}</b>
            <br />
            <small style={{ color: "#5f6a82" }}>Academic record</small>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "5mm", fontSize: "8.6pt" }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ textAlign: "left", background: "#1b2f6b", color: "#fff", border: "0.2mm solid #fff", padding: "1.6mm 0.8mm" }}>
                Subject
              </th>
              {groups.map((group, index) => (
                <th
                  key={group.key}
                  colSpan={group.columns.length + (group.key === "ALL" ? 0 : 1)}
                  style={{ background: index % 2 ? "#7a1a24" : "#223b86", color: "#fff", border: "0.2mm solid #fff", padding: "1.6mm 0.8mm" }}
                >
                  {semesterLabel(group.key)}
                </th>
              ))}
              <th rowSpan={2} style={{ background: "#1b2f6b", color: "#fff", border: "0.2mm solid #fff", padding: "1.6mm 0.8mm" }}>
                Yearly average
              </th>
              <th rowSpan={2} style={{ background: "#1b2f6b", color: "#fff", border: "0.2mm solid #fff", padding: "1.6mm 0.8mm" }}>
                Grade
              </th>
            </tr>
            <tr>
              {groups.map((group, index) => (
                <React.Fragment key={group.key}>
                  {group.columns.map((column) => (
                    <th key={column.key} style={{ background: index % 2 ? "#7a1a24" : "#223b86", color: "#fff", border: "0.2mm solid #fff", padding: "1.6mm 0.8mm" }}>
                      {column.label}
                    </th>
                  ))}
                  {group.key !== "ALL" && (
                    <th style={{ background: index % 2 ? "#7a1a24" : "#223b86", color: "#fff", border: "0.2mm solid #fff", padding: "1.6mm 0.8mm" }}>
                      Avg
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.subjects.map((subject) => (
              <tr key={subject.subjectId}>
                <td style={{ textAlign: "left", fontWeight: 600, border: "0.2mm solid #cfd5e3", padding: "2.1mm 0.8mm" }}>
                  {subject.name}
                </td>
                {groups.map((group, index) => (
                  <React.Fragment key={group.key}>
                    {group.columns.map((column) => {
                      const cell = cellState(subject, column.key);
                      return (
                        <td key={column.key} style={{ textAlign: "center", border: "0.2mm solid #cfd5e3", padding: "2.1mm 0.8mm", color: cell.color, fontWeight: cell.color === "#b5232f" ? 700 : undefined }}>
                          {cell.label}
                        </td>
                      );
                    })}
                    {group.key !== "ALL" && (
                      <td style={{ textAlign: "center", background: "#f3f5fa", fontWeight: 700, border: "0.2mm solid #cfd5e3", padding: "2.1mm 0.8mm" }}>
                        {number(semesterAverage(subject, group.key))}
                      </td>
                    )}
                  </React.Fragment>
                ))}
                <td style={{ textAlign: "center", background: "#e8ecf7", fontWeight: 800, border: "0.2mm solid #cfd5e3", padding: "2.1mm 0.8mm" }}>
                  {number(subject.yearlyAvg ?? subject.average)}
                </td>
                <td style={{ textAlign: "center", border: "0.2mm solid #cfd5e3", padding: "2.1mm 0.8mm" }}>
                  <b>{value(subject.letter)}</b>
                </td>
              </tr>
            ))}
            {payload.subjects.length === 0 && (
              <tr>
                <td colSpan={payload.columns.length + 5} style={{ textAlign: "center", padding: "12mm" }}>
                  No released grades for this period yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3mm", marginTop: "6mm" }}>
          {[
            ["Overall average", number(payload.aggregates.overallAverage)],
            ["GPA", number(payload.aggregates.gpa, 2)],
            ["Class position", value(payload.aggregates.classPosition)],
            ["Attendance", payload.aggregates.attendanceRate == null ? "—" : `${number(payload.aggregates.attendanceRate, 0)}%`],
          ].map(([label, itemValue]) => (
            <div key={label} style={{ border: "0.3mm solid #cfd5e3", borderTop: "1mm solid #1b2f6b", borderRadius: 2, padding: "2.5mm 3mm" }}>
              <span style={{ display: "block", fontSize: "7.4pt", color: "#5f6a82", textTransform: "uppercase" }}>{label}</span>
              <b style={{ fontSize: "14pt" }}>{itemValue}</b>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "4mm", fontSize: "8pt", color: "#5f6a82" }}>
          Scores shown in <b style={{ color: "#b5232f" }}>red</b> fall in the failing band of the school's grading system. — means no released score.
        </p>
      </Frame>
    </A4Page>
  );
}

function DetailsPage({ payload }: { payload: ReportCardPayload }) {
  const promotion = payload.promotion;
  const signatures = [
    ["Principal", payload.officialSignatures?.principal],
    ["Registrar", payload.officialSignatures?.registrar],
    ["Academic head", payload.officialSignatures?.academic],
  ] as const;
  return (
    <A4Page style={{ background: "#fff", position: "relative" }}>
      <Frame>
        <h4 style={{ margin: 0, fontSize: "11pt", color: "#1b2f6b", borderBottom: "0.3mm solid #cfd5e3", paddingBottom: "1mm" }}>
          Grading system
        </h4>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "3mm", fontSize: "8.6pt" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", background: "#1b2f6b", color: "#fff", padding: "1.6mm", border: "0.2mm solid #fff" }}>Grade</th>
              <th style={{ textAlign: "left", background: "#1b2f6b", color: "#fff", padding: "1.6mm", border: "0.2mm solid #fff" }}>Score range</th>
              <th style={{ textAlign: "left", background: "#1b2f6b", color: "#fff", padding: "1.6mm", border: "0.2mm solid #fff" }}>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {payload.legend.map((row) => (
              <tr key={row.letter}>
                <td style={{ fontWeight: 800, textAlign: "left", padding: "2mm 3mm", border: "0.2mm solid #cfd5e3" }}>{row.letter}</td>
                <td style={{ textAlign: "left", padding: "2mm 3mm", border: "0.2mm solid #cfd5e3" }}>{row.min} – {row.max}</td>
                <td style={{ textAlign: "left", padding: "2mm 3mm", border: "0.2mm solid #cfd5e3" }}>{value(row.detail)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {promotion && (
          <>
            <h4 style={{ margin: "6mm 0 2mm", fontSize: "11pt", color: "#1b2f6b", borderBottom: "0.3mm solid #cfd5e3", paddingBottom: "1mm" }}>
              Promotion
            </h4>
            <div style={{ border: "0.4mm solid #1b2f6b", borderRadius: 2, padding: "4mm 5mm", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5mm 8mm" }}>
              <div><span style={{ display: "block", fontSize: "7.4pt", color: "#5f6a82", textTransform: "uppercase" }}>Outcome</span><b>{promotion.outcome ? value(promotion.outcome) : "Not yet finalised"}</b></div>
              <div><span style={{ display: "block", fontSize: "7.4pt", color: "#5f6a82", textTransform: "uppercase" }}>Promoted to</span><b>{value(promotion.toGrade)}</b></div>
              <div style={{ gridColumn: "span 2" }}><span style={{ display: "block", fontSize: "7.4pt", color: "#5f6a82", textTransform: "uppercase" }}>Remarks</span><b style={{ fontWeight: 500 }}>{value(promotion.remarks)}</b></div>
              <div><span style={{ display: "block", fontSize: "7.4pt", color: "#5f6a82", textTransform: "uppercase" }}>Finalised</span><b>{dateLabel(promotion.finalizedAt)}</b></div>
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: "8mm", marginTop: "auto", paddingTop: "10mm" }}>
          {signatures.map(([label, slot]) => (
            <div key={label} style={{ flex: 1, textAlign: "center", fontSize: "8pt", color: "#5f6a82" }}>
              <div style={{ height: "13mm", borderBottom: "0.3mm solid #14203d", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {slot?.signatureUrl && <img src={slot.signatureUrl} alt="" style={{ maxHeight: "12mm" }} />}
              </div>
              <b style={{ display: "block", color: "#14203d", fontSize: "9pt" }}>{value(slot?.name)}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: "7.5pt", color: "#5f6a82", marginTop: "4mm" }}>
          Generated {dateLabel(payload.generatedAt)}
        </div>
      </Frame>
    </A4Page>
  );
}

export function IprepSemesterBooklet({ payload, preview = false }: Props) {
  return (
    <div
      id="report-card"
      className={`iprep-semester-booklet space-y-6 ${preview ? "preview-mode" : ""}`}
      data-page-size="A4-portrait"
    >
      <CoverPage payload={payload} />
      <GradesPage payload={payload} />
      <DetailsPage payload={payload} />
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .iprep-semester-booklet .intl-a4-page { margin: 0 !important; box-shadow: none !important; break-after: page; }
          .iprep-semester-booklet .intl-a4-page:last-of-type { break-after: auto; }
        }
      `}</style>
    </div>
  );
}
