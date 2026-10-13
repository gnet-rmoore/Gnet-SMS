import React from "react";
import type { GradeSheetData } from "../types";
import { fmtNum, officialGradeClass } from "../assembleGradeSheet";
import { gradeSheetDensityClass } from "../density";
import { GradeSheetSig } from "./GradeSheetSig";
import "../styles/official.css";

type Props = {
  data: GradeSheetData;
};

export function OfficialRecordReport({ data }: Props) {
  const { school, term, student, subjects, summary, attendance, remarks } = data;
  const density = gradeSheetDensityClass(subjects.length);

  return (
    <div className={`gs-official ${density}`.trim()} id="grade-sheet" data-page-size="legal">
      <div className="sheet">
        <div className="crest-band">
          <div className="crest">{school.crestInitials}</div>
          <div className="school-meta">
            <p className="school-name">{school.name}</p>
            <div className="school-sub">
              {school.address}
              {school.contact && school.contact !== "—" ? ` · ${school.contact}` : ""}
            </div>
          </div>
          <div className="doc-tag">Official Record</div>
        </div>

        <div className="title-row">
          <h1>
            Student Gradesheet — {term.examName}, {term.academicYear}
          </h1>
          <div className="scale-note">Reported on a 100-point scale, GPA 4.0</div>
        </div>
        <div className="gold-rule" />

        <div className="info-grid">
          <div className="info-item">
            <span className="label">Student Name</span>
            <span className="value">{student.name}</span>
          </div>
          <div className="info-item">
            <span className="label">Student ID</span>
            <span className="value">{student.admissionNo}</span>
          </div>
          <div className="info-item">
            <span className="label">Grade / Class</span>
            <span className="value">{student.classLabel}</span>
          </div>
          <div className="info-item">
            <span className="label">Section</span>
            <span className="value">{student.section}</span>
          </div>
          <div className="info-item">
            <span className="label">Date of Birth</span>
            <span className="value">{student.dob}</span>
          </div>
          <div className="info-item">
            <span className="label">Date Issued</span>
            <span className="value">{term.issueDate}</span>
          </div>
        </div>

        <div className="section-label">
          <div className="num">1</div>
          <div className="txt">Subject Performance</div>
          <div className="line" />
        </div>

        <table className="subjects">
          <thead>
            <tr>
              <th style={{ width: "26%" }}>Subject</th>
              <th className="num" style={{ width: "12%" }}>
                CA (30)
              </th>
              <th className="num" style={{ width: "12%" }}>
                Exam (70)
              </th>
              <th className="num" style={{ width: "12%" }}>
                Total
              </th>
              <th className="num" style={{ width: "10%" }}>
                Grade
              </th>
              <th style={{ width: "28%" }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.name}>
                <td className="subj">{s.name}</td>
                <td className="num">{fmtNum(s.ca)}</td>
                <td className="num">{fmtNum(s.exam)}</td>
                <td className="num">{fmtNum(s.obtained)}</td>
                <td className="num">
                  <span className={`grade-pill ${officialGradeClass(s.grade)}`}>{s.grade}</span>
                </td>
                <td>{s.remark || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="legend">
          <span>
            <i style={{ background: "#1E7A46" }} />
            A: 80–100 Excellent
          </span>
          <span>
            <i style={{ background: "#B8790A" }} />
            B: 65–79 Good
          </span>
          <span>
            <i style={{ background: "#B4232C" }} />
            C: Below 65 Needs Improvement
          </span>
        </div>

        <div className="closing-block">
        <div className="section-label">
          <div className="num">2</div>
          <div className="txt">Performance Summary</div>
          <div className="line" />
        </div>

        <div className="summary-row">
          <div className="summary-card">
            <h3>Overall Result</h3>
            <div className="stat-grid">
              <div className="stat">
                <div className="n">{fmtNum(summary.obtainedTotal)}</div>
                <div className="l">Total</div>
              </div>
              <div className="stat">
                <div className="n">
                  {fmtNum(summary.percentage)}
                  {summary.percentage != null ? "%" : ""}
                </div>
                <div className="l">Average</div>
              </div>
              <div className="stat">
                <div className="n">{fmtNum(summary.gpa)}</div>
                <div className="l">GPA</div>
              </div>
              <div className="stat">
                <div className="n" style={{ fontSize: summary.rank.length > 4 ? 16 : 22 }}>
                  {summary.rank}
                </div>
                <div className="l">Position</div>
              </div>
            </div>
          </div>
          <div className="attendance-card">
            <h3>Attendance &amp; Conduct</h3>
            <div className="att-row">
              <span className="k">Days Present</span>
              <span className="v">{fmtNum(attendance.present)}</span>
            </div>
            <div className="att-row">
              <span className="k">Days Absent</span>
              <span className="v">{fmtNum(attendance.absent)}</span>
            </div>
            <div className="att-row">
              <span className="k">Conduct Rating</span>
              <span className="v">{summary.conduct}</span>
            </div>
          </div>
        </div>

        <div className="comment-block">
          <div className="section-label" style={{ margin: "0 0 10px" }}>
            <div className="num">3</div>
            <div className="txt">Remarks</div>
            <div className="line" />
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-soft)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 5,
            }}
          >
            Class Teacher&apos;s Comment
          </div>
          <div className="comment-box">{remarks.teacher || "—"}</div>
        </div>
        <div className="comment-block" style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-soft)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 5,
            }}
          >
            Principal / Head of School&apos;s Comment
          </div>
          <div className="comment-box">{remarks.principal || "—"}</div>
        </div>

        <div className="sig-row">
          <GradeSheetSig
            role="Class Teacher"
            name={data.signatures?.teacher?.name}
            signatureUrl={data.signatures?.teacher?.signatureUrl}
          />
          <GradeSheetSig
            role="Principal / Head of School"
            name={data.signatures?.principal?.name}
            signatureUrl={data.signatures?.principal?.signatureUrl}
          />
          <GradeSheetSig role="Parent / Guardian" />
        </div>

        <div className="footer-note">
          This is an official academic record of {school.name}. Any alteration without
          authorization renders this document invalid. · Generated {term.issueDate}
        </div>
        </div>

      </div>
    </div>
  );
}
