import React from "react";
import type { GradeSheetData } from "../types";
import { fmtNum, masteryTier } from "../assembleGradeSheet";
import { gradeSheetDensityClass } from "../density";
import { GradeSheetSig } from "./GradeSheetSig";
import "../styles/mastery.css";

type Props = {
  data: GradeSheetData;
  compact?: boolean;
};

export function MasteryBarsReport({ data, compact }: Props) {
  const { school, term, student, subjects, summary, attendance, remarks } = data;
  const density = gradeSheetDensityClass(subjects.length);
  const attPct = attendance.percentage;
  const absentPct =
    attPct != null ? Math.max(0, Math.round((100 - attPct) * 10) / 10) : null;

  return (
    <div className={`gs-mastery ${density}`.trim()} id="grade-sheet" data-page-size="A4">
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <div className="sheet">
          <div className="topbar">
            <div className="brand">
              <div className="logo-mark">{school.crestInitials}</div>
              <div>
                <div className="school-name">{school.name}</div>
                <div className="school-meta">{school.address}</div>
              </div>
            </div>
            <div className="doc-meta">
              <span className="pill">Performance Report</span>
              <div className="term">
                {term.label.includes(term.examName)
                  ? term.label
                  : `${term.label} · ${term.examName}`}
              </div>
            </div>
          </div>

          <div className="identity">
            <div className="avatar">
              Student
              <br />
              Photo
            </div>
            <div className="identity-grid">
              <div>
                <div className="id-label">Student</div>
                <div className="id-value">{student.name}</div>
              </div>
              <div>
                <div className="id-label">Admission No.</div>
                <div className="id-value">{student.admissionNo}</div>
              </div>
              <div>
                <div className="id-label">Class</div>
                <div className="id-value">{student.classLabel}</div>
              </div>
              <div>
                <div className="id-label">Guardian</div>
                <div className="id-value">{student.guardian}</div>
              </div>
            </div>
          </div>

          <div className="kpi-row">
            <div className="kpi accent">
              <div className="k-label">Overall Average</div>
              <div className="k-value">
                {fmtNum(summary.percentage)}
                {summary.percentage != null ? <small>%</small> : null}
              </div>
              <div className="k-sub">
                Grade {summary.overallGrade}
                {summary.gpa != null ? ` · GPA ${fmtNum(summary.gpa)}` : ""}
              </div>
            </div>
            <div className="kpi">
              <div className="k-label">Class Rank</div>
              <div className="k-value" style={{ fontSize: summary.rank === "—" ? 16 : 24 }}>
                {summary.rank}
              </div>
              <div className="k-sub">Position in class</div>
            </div>
            <div className="kpi">
              <div className="k-label">Attendance</div>
              <div className="k-value">
                {fmtNum(attendance.percentage)}
                {attendance.percentage != null ? <small>%</small> : null}
              </div>
              <div className="k-sub">
                {attendance.present != null && attendance.total != null
                  ? `${attendance.present} of ${attendance.total} days`
                  : "—"}
              </div>
            </div>
            <div className="kpi">
              <div className="k-label">Conduct</div>
              <div className="k-value" style={{ fontSize: 16 }}>
                {summary.conduct}
              </div>
              <div className="k-sub">{summary.promotionStatus}</div>
            </div>
          </div>

          <div className="section-heading">
            <h2>Subject Performance ({subjects.length})</h2>
            <div className="legend">
              <span>
                <span className="dot student" />
                Student score
              </span>
              <span>
                <span className="dot avg" />
                Class average
              </span>
            </div>
          </div>

          <div className="subject-list">
            {subjects.map((s) => {
              const score = Math.min(100, Math.max(0, s.obtained));
              const avgVal = s.classAvg != null ? Math.min(100, Math.max(0, s.classAvg)) : 0;
              return (
                <div
                  key={s.name}
                  className="subject-row"
                  style={
                    {
                      ["--score" as string]: score,
                      ["--avg" as string]: avgVal,
                    } as React.CSSProperties
                  }
                >
                  <div className="subj-name">{s.name}</div>
                  <div className="subj-score">{fmtNum(s.obtained)}</div>
                  <div
                    className="bar-track"
                    style={
                      {
                        ["--score" as string]: score,
                        ["--avg" as string]: avgVal,
                      } as React.CSSProperties
                    }
                  >
                    <div className="bar-fill" />
                    {s.classAvg != null ? <div className="bar-avg-marker" /> : null}
                  </div>
                  <div className={`subj-grade ${masteryTier(s.grade)}`}>{s.grade}</div>
                  <div className="subj-remark">{s.remark || "—"}</div>
                </div>
              );
            })}
          </div>

          <div className="closing-block">
          <div className="two-col">
            <div className="panel">
              <div className="panel-title">International Grading Scale</div>
              <div className="scale-grid">
                <div className="scale-chip">
                  <div className="g" style={{ color: "var(--mint)" }}>
                    A
                  </div>
                  <div className="r">90–100</div>
                </div>
                <div className="scale-chip">
                  <div className="g" style={{ color: "var(--indigo)" }}>
                    B
                  </div>
                  <div className="r">75–89</div>
                </div>
                <div className="scale-chip">
                  <div className="g" style={{ color: "var(--indigo)" }}>
                    C
                  </div>
                  <div className="r">60–74</div>
                </div>
                <div className="scale-chip">
                  <div className="g" style={{ color: "var(--amber)" }}>
                    D
                  </div>
                  <div className="r">50–59</div>
                </div>
                <div className="scale-chip">
                  <div className="g" style={{ color: "var(--rose)" }}>
                    U
                  </div>
                  <div className="r">&lt;50</div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title">Attendance Breakdown</div>
              <div className="att-row">
                <div className="att-label" style={{ width: 60 }}>
                  Present
                </div>
                <div className="att-bar">
                  <div
                    className="att-bar-fill"
                    style={{ width: attPct != null ? `${attPct}%` : "0%" }}
                  />
                </div>
                <div className="att-value">{fmtNum(attendance.present)}</div>
              </div>
              <div className="att-row">
                <div className="att-label" style={{ width: 60 }}>
                  Absent
                </div>
                <div className="att-bar">
                  <div
                    className="att-bar-fill"
                    style={{
                      width: absentPct != null ? `${absentPct}%` : "0%",
                      background: "var(--rose)",
                    }}
                  />
                </div>
                <div className="att-value">{fmtNum(attendance.absent)}</div>
              </div>
            </div>
          </div>

          <div className="remark-cards">
            <div className="remark-card">
              <div className="who">Class Teacher</div>
              <p>{remarks.teacher || "—"}</p>
            </div>
            <div className="remark-card">
              <div className="who">Principal</div>
              <p>{remarks.principal || "—"}</p>
            </div>
          </div>

          <div className="signatures">
            <GradeSheetSig
              role="Class Teacher"
              name={data.signatures?.teacher?.name}
              signatureUrl={data.signatures?.teacher?.signatureUrl}
            />
            <GradeSheetSig
              role="Principal"
              name={data.signatures?.principal?.name}
              signatureUrl={data.signatures?.principal?.signatureUrl}
            />
            <GradeSheetSig role="Parent / Guardian" />
          </div>

          <div className="footer-note">
            Next term begins {term.nextTermStart} · Issued {term.issueDate} · {school.name}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
