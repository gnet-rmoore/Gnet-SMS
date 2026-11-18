import React from "react";
import { isLiberianReportCardTemplate } from "../registry";
import type { ReportCardPayload } from "../types";
import {
  cellState,
  dateLabel,
  groupsOf,
  humanize,
  number,
  semesterAverage,
  semesterLabel,
  value,
} from "./IprepSemesterBooklet";

type Props = {
  payload: ReportCardPayload;
  preview?: boolean;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function compactColumn(label: string): string {
  const match = /^(\d)(?:st|nd|rd|th) Period$/.exec(label);
  if (match) return `P${match[1]}`;
  if (label === "Sem 1 Exam") return "S1E";
  if (label === "Sem 2 Exam") return "S2E";
  return label;
}

function signatureName(
  payload: ReportCardPayload,
  role: "class" | "principal" | "registrar"
): string {
  if (role === "class") return "Class Teacher";
  const signatures = payload.officialSignatures;
  if (!signatures) return role === "principal" ? "Principal" : "Registrar";
  return value(signatures[role]?.name);
}

function CoverPanel({ payload }: { payload: ReportCardPayload }) {
  const school = payload.school;
  const location = [school.district, school.county, school.country].filter(Boolean).join(", ");
  const contacts = [school.contactPhone ? `Tel ${school.contactPhone}` : null, school.contactEmail]
    .filter(Boolean)
    .join(" · ");
  const poBox = school.poBox
    ? /^p\.?\s*o\.?\s*box/i.test(school.poBox.trim())
      ? school.poBox.trim()
      : `P.O. Box ${school.poBox.trim()}`
    : null;
  const showMoe = school.branding ? school.branding !== "SCHOOL_LOGO" : school.country === "Liberia";
  const promotion = payload.promotion;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {showMoe ? (
        <div
          style={{
            textAlign: "center",
            borderBottom: "0.5mm solid #1b2f6b",
            paddingBottom: "2.2mm",
          }}
        >
          <div style={{ fontSize: "6.4pt", letterSpacing: "0.5mm", fontWeight: 700 }}>
            REPUBLIC OF LIBERIA · MINISTRY OF EDUCATION
          </div>
          <div style={{ fontSize: "5.8pt", color: "#56617d", marginTop: "1mm" }}>
            COUNTY EDUCATION OFFICE · {value(school.district || school.county)}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: "4mm", marginTop: "4mm" }}>
        {school.logoUrl ? (
          <img
            src={school.logoUrl}
            alt="School logo"
            style={{ width: "24mm", height: "24mm", objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: "24mm",
              height: "24mm",
              flexShrink: 0,
              borderRadius: "50%",
              border: "0.6mm solid #1b2f6b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11pt",
              fontWeight: 800,
              color: "#1b2f6b",
            }}
          >
            {initials(school.name)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13pt", lineHeight: 1.1, fontWeight: 800, color: "#1b2f6b" }}>
            {school.name}
          </div>
          <div style={{ fontSize: "7pt", color: "#56617d", marginTop: "1.5mm", lineHeight: 1.35 }}>
            {value(poBox || school.address)}
            <br />
            {value(contacts || location)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "6mm",
          borderTop: "1mm solid #1b2f6b",
          borderBottom: "0.5mm solid #1b2f6b",
          padding: "3.5mm 0",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "6.6pt", letterSpacing: "0.45mm", color: "#56617d" }}>
          LEARNER PROGRESS REPORT
        </div>
        <div style={{ fontSize: "17pt", fontWeight: 800, color: "#14203d", marginTop: "1.5mm" }}>
          SEMESTER RECORD
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: "2.5mm",
            padding: "1mm 4mm",
            borderRadius: "99px",
            background: "#eaf0ff",
            color: "#1b2f6b",
            fontSize: "8pt",
            fontWeight: 700,
          }}
        >
          {payload.academicYear.label}
        </div>
      </div>

      <div
        style={{
          marginTop: "5mm",
          border: "0.35mm solid #cbd3e6",
          borderRadius: "2mm",
          overflow: "hidden",
          fontSize: "7.6pt",
        }}
      >
        {[
          ["Learner", payload.student.name],
          ["Class", payload.student.classLabel],
          ["Grade level", payload.student.gradeLevelLabel],
          ["Learner ID", payload.student.id],
        ].map(([label, fieldValue]) => (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: "31mm 1fr",
              borderBottom: "0.25mm solid #e4e9f3",
            }}
          >
            <div style={{ padding: "2mm 3mm", background: "#f5f7fc", color: "#56617d" }}>
              {label}
            </div>
            <div style={{ padding: "2mm 3mm", fontWeight: 700 }}>{value(fieldValue)}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "5mm",
          border: "0.35mm solid #1b2f6b",
          borderRadius: "2mm",
          padding: "3mm 3.5mm",
          background: "#fbfcff",
        }}
      >
        <div style={{ fontSize: "6pt", letterSpacing: "0.3mm", color: "#56617d" }}>
          PROMOTION STATUS
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3mm", marginTop: "1mm" }}>
          <strong style={{ fontSize: "10pt", color: "#1b2f6b" }}>
            {promotion?.outcome ? humanize(promotion.outcome) : "Pending"}
          </strong>
          {promotion?.toGrade ? (
            <span style={{ fontSize: "7.5pt" }}>To Grade {value(promotion.toGrade)}</span>
          ) : null}
        </div>
        {promotion?.conditionedSubjects ? (
          <div style={{ fontSize: "6.8pt", marginTop: "1.5mm" }}>
            <strong>Conditioned:</strong> {promotion.conditionedSubjects}
          </div>
        ) : null}
        {promotion?.probationWeeks ? (
          <div style={{ fontSize: "6.8pt", marginTop: "1mm" }}>
            <strong>Probation:</strong> {promotion.probationWeeks} week(s)
          </div>
        ) : null}
        {promotion?.remarks ? (
          <div style={{ fontSize: "6.8pt", marginTop: "1.5mm", lineHeight: 1.35 }}>
            {promotion.remarks}
          </div>
        ) : null}
        <div style={{ fontSize: "6pt", color: "#6b748c", marginTop: "2mm" }}>
          Approved: {dateLabel(promotion?.finalizedAt)}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "3mm", fontSize: "6.2pt", color: "#6b748c" }}>
        {value(location || poBox || school.address)}
      </div>
    </div>
  );
}

function RecordPanel({ payload }: { payload: ReportCardPayload }) {
  const groups = groupsOf(payload.columns);
  const attendance =
    payload.aggregates.attendanceRate == null
      ? "—"
      : `${number(payload.aggregates.attendanceRate, 1)}%`;
  const kpis = [
    ["Overall average", number(payload.aggregates.overallAverage, 1)],
    ["GPA", number(payload.aggregates.gpa, 2)],
    ["Class position", value(payload.aggregates.classPosition)],
    ["Attendance", attendance],
  ];
  const signatures: Array<{ label: string; role: "class" | "principal" | "registrar" }> = [
    { label: "Class Teacher", role: "class" },
    { label: "Principal", role: "principal" },
    { label: "Registrar", role: "registrar" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderBottom: "0.5mm solid #1b2f6b",
          paddingBottom: "2mm",
        }}
      >
        <div>
          <div style={{ fontSize: "6pt", color: "#56617d" }}>ACADEMIC RECORD</div>
          <div style={{ fontSize: "10pt", fontWeight: 800, color: "#1b2f6b" }}>
            {payload.student.name}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "6.5pt", color: "#56617d" }}>
          {payload.student.classLabel}
          <br />
          {payload.academicYear.label}
        </div>
      </div>

      <table
        style={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          marginTop: "2.5mm",
          fontSize: "6.1pt",
        }}
      >
        <thead>
          <tr>
            <th
              rowSpan={2}
              style={{
                width: "24mm",
                border: "0.25mm solid #1b2f6b",
                padding: "1.2mm 0.8mm",
                background: "#1b2f6b",
                color: "#fff",
                textAlign: "left",
                verticalAlign: "bottom",
              }}
            >
              Subject
            </th>
            {groups.map((group) => (
              <th
                key={group.key}
                colSpan={group.columns.length + 1}
                style={{
                  border: "0.25mm solid #1b2f6b",
                  padding: "1mm 0.5mm",
                  background: "#dfe7fb",
                  color: "#14203d",
                  verticalAlign: "middle",
                }}
              >
                {semesterLabel(group.key)}
              </th>
            ))}
            <th
              rowSpan={2}
              style={{
                width: "12mm",
                border: "0.25mm solid #1b2f6b",
                padding: "1mm 0.5mm",
                background: "#1b2f6b",
                color: "#fff",
              }}
            >
              Year/Avg
            </th>
            <th
              rowSpan={2}
              style={{
                width: "12mm",
                border: "0.25mm solid #1b2f6b",
                padding: "1mm 0.5mm",
                background: "#1b2f6b",
                color: "#fff",
              }}
            >
              Rank/Grade
            </th>
          </tr>
          <tr>
            {groups.map((group) => (
              <React.Fragment key={`${group.key}-columns`}>
                {group.columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      border: "0.25mm solid #cbd3e6",
                      padding: "0.9mm 0.3mm",
                      background: "#f5f7fc",
                      fontWeight: 700,
                    }}
                  >
                    {compactColumn(column.label)}
                  </th>
                ))}
                <th
                  style={{
                    border: "0.25mm solid #cbd3e6",
                    padding: "0.9mm 0.3mm",
                    background: "#eef2fb",
                  }}
                >
                  Avg
                </th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {payload.subjects.map((subject) => (
            <tr key={subject.subjectId}>
              <td
                style={{
                  border: "0.25mm solid #d8dfec",
                  padding: "1.2mm 0.8mm",
                  fontWeight: 700,
                  overflowWrap: "anywhere",
                }}
              >
                {subject.name}
                <div style={{ fontSize: "5.4pt", color: "#7b8499" }}>{subject.code}</div>
              </td>
              {groups.map((group) => (
                <React.Fragment key={`${group.key}-marks`}>
                  {group.columns.map((column) => {
                    const state = cellState(subject, column.key);
                    return (
                      <td
                        key={column.key}
                        style={{
                          border: "0.25mm solid #d8dfec",
                          padding: "1.2mm 0.3mm",
                          textAlign: "center",
                          color: state.color,
                          fontWeight: state.label === "INC" ? 700 : 500,
                        }}
                      >
                        {state.label}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      border: "0.25mm solid #d8dfec",
                      padding: "1.2mm 0.3mm",
                      textAlign: "center",
                      fontWeight: 700,
                      background: "#f8faff",
                    }}
                  >
                    {number(semesterAverage(subject, group.key), 1)}
                  </td>
                </React.Fragment>
              ))}
              <td
                style={{
                  border: "0.25mm solid #d8dfec",
                  padding: "1.2mm 0.3mm",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {number(subject.yearlyAvg ?? subject.average, 1)}
              </td>
              <td
                style={{
                  border: "0.25mm solid #d8dfec",
                  padding: "1.2mm 0.3mm",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {value(subject.letter)}
                <div style={{ fontSize: "5.4pt", color: "#6b748c" }}>{value(subject.remark)}</div>
              </td>
            </tr>
          ))}
          {payload.subjects.length === 0 ? (
            <tr>
              <td
                colSpan={3 + groups.reduce((sum, group) => sum + group.columns.length + 1, 0)}
                style={{
                  border: "0.25mm solid #d8dfec",
                  padding: "4mm",
                  textAlign: "center",
                  color: "#7b8499",
                }}
              >
                No grades recorded for this reporting period.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "1.5mm",
          marginTop: "2.5mm",
        }}
      >
        {kpis.map(([label, fieldValue]) => (
          <div
            key={label}
            style={{
              border: "0.25mm solid #d8dfec",
              borderRadius: "1.2mm",
              background: "#f8faff",
              padding: "1.3mm 1.6mm",
            }}
          >
            <div style={{ fontSize: "5.4pt", color: "#6b748c" }}>{label}</div>
            <div style={{ fontSize: "8pt", fontWeight: 800, color: "#1b2f6b" }}>{fieldValue}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: "5.8pt", color: "#7b8499", marginTop: "2mm", lineHeight: 1.35 }}>
        Scores below 70 are shown in red. INC = incomplete. Semester averages are the mean of the
        recorded periods and semester exam.
      </div>

      {payload.legend.length > 0 ? (
        <div style={{ marginTop: "3mm" }}>
          <div
            style={{
              fontSize: "6.4pt",
              fontWeight: 800,
              color: "#1b2f6b",
              borderBottom: "0.35mm solid #1b2f6b",
              paddingBottom: "1mm",
            }}
          >
            Grading system
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${payload.legend.length + 1}, minmax(0, 1fr))`,
              border: "0.25mm solid #d8dfec",
              borderTop: 0,
            }}
          >
            {payload.legend.map((row) => (
              <div
                key={row.letter}
                style={{
                  borderRight: "0.25mm solid #d8dfec",
                  padding: "1mm 0.3mm",
                  textAlign: "center",
                  overflowWrap: "anywhere",
                }}
              >
                <div style={{ fontWeight: 800 }}>{row.letter}</div>
                <div style={{ fontSize: "5pt", color: "#6b748c" }}>{row.max}</div>
              </div>
            ))}
            <div style={{ padding: "1mm 0.3mm", textAlign: "center", overflowWrap: "anywhere" }}>
              <div style={{ fontWeight: 800 }}>INC</div>
              <div style={{ fontSize: "5pt", color: "#6b748c" }}>—</div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "4mm",
          paddingTop: "3mm",
        }}
      >
        {signatures.map((signature) => (
          <div key={signature.role} style={{ textAlign: "center" }}>
            <div style={{ borderTop: "0.3mm solid #1b2f6b", paddingTop: "1.5mm" }}>
              <div style={{ fontSize: "7pt", fontWeight: 700 }}>{signatureName(payload, signature.role)}</div>
              <div style={{ fontSize: "5.8pt", color: "#6b748c" }}>{signature.label}</div>
              <div style={{ fontSize: "5.4pt", color: "#7b8499", marginTop: "3mm" }}>
                Date: ____________
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IprepSemesterBifold({ payload, preview = false }: Props) {
  if (!isLiberianReportCardTemplate(payload.templateKey)) return null;

  return (
    <div
      id="report-card"
      className={`iprep-semester-bifold a4-landscape-sheet ${preview ? "preview" : ""}`}
      data-page-size="A4-landscape"
    >
      <div
        className="bifold-sheet"
        style={{
          position: "relative",
          width: "297mm",
          height: "210mm",
          boxSizing: "border-box",
          display: "flex",
          gap: "4mm",
          padding: "6mm",
          background: "#ffffff",
          color: "#14203d",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: "8pt",
          boxShadow: preview ? "0 14px 40px rgba(19, 33, 68, 0.18)" : undefined,
        }}
      >
        <section
          className="bifold-panel cover-panel"
          style={{
            flex: 1,
            minWidth: 0,
            border: "1.2mm double #1b2f6b",
            padding: "5mm 6mm",
            boxSizing: "border-box",
          }}
        >
          <CoverPanel payload={payload} />
        </section>
        <section
          className="bifold-panel record-panel"
          style={{
            flex: 1,
            minWidth: 0,
            border: "1.2mm double #1b2f6b",
            padding: "4.5mm 5mm",
            boxSizing: "border-box",
          }}
        >
          <RecordPanel payload={payload} />
        </section>
      </div>
      <style>{`
        .iprep-semester-bifold .bifold-sheet::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          border-left: 0.3mm dashed #9aa6c4;
          pointer-events: none;
        }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .iprep-semester-bifold .bifold-sheet {
            width: 297mm !important;
            height: 210mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
