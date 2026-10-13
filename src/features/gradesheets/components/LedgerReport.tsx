import React from "react";
import type { GradeSheetData } from "../types";
import { fmtNum, passFailClass } from "../assembleGradeSheet";
import { gradeSheetDensityClass } from "../density";
import { GradeSheetSig } from "./GradeSheetSig";
import "../styles/ledger.css";

type Props = {
  data: GradeSheetData;
  /** When true, skip outer stage padding (embedded preview). */
  compact?: boolean;
};

export function LedgerReport({ data, compact }: Props) {
  const { school, term, student, subjects, summary, attendance, remarks } = data;
  const density = gradeSheetDensityClass(subjects.length);

  return (
    <div className={`gs-ledger ${density}`.trim()} id="grade-sheet" data-page-size="A4">
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <div className="sheet">
          <div className="frame" />
          <div className="content">
            <div className="masthead">
              <div className="crest">{school.crestInitials}</div>
              <div className="school-id">
                <div className="school-name">{school.name}</div>
                <div className="school-meta">{school.address}</div>
              </div>
              <div className="doc-tag">
                Report of Achievement
                <span className="term">{term.label}</span>
              </div>
            </div>

            <div className="idstrip">
              <div className="photo-box">
                Student
                <br />
                Photo
              </div>
              <div className="id-field">
                <div className="id-label">Student Name</div>
                <div className="id-value">{student.name}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Admission No.</div>
                <div className="id-value">{student.admissionNo}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Class / Grade</div>
                <div className="id-value">{student.classLabel}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Date of Birth</div>
                <div className="id-value">{student.dob}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Guardian</div>
                <div className="id-value">{student.guardian}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Position in Class</div>
                <div className="id-value">{summary.rank}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Exam</div>
                <div className="id-value">{term.examName}</div>
              </div>
              <div className="id-field">
                <div className="id-label">Issue Date</div>
                <div className="id-value">{term.issueDate}</div>
              </div>
            </div>

            <div className="section-label">
              <div className="tick" />
              <span>Academic Performance ({subjects.length} subjects)</span>
            </div>

            <table className="ledger">
              <thead>
                <tr>
                  <th style={{ width: "34%" }}>Subject</th>
                  <th className="num">Max&nbsp;Marks</th>
                  <th className="num">Obtained</th>
                  <th className="num">Class&nbsp;Avg.</th>
                  <th className="num" style={{ width: "9%" }}>
                    Grade
                  </th>
                  <th>Teacher&apos;s Remark</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.name}>
                    <td className="subject-name">{s.name}</td>
                    <td className="num">{s.max}</td>
                    <td className="score">{fmtNum(s.obtained)}</td>
                    <td className="num">{fmtNum(s.classAvg)}</td>
                    <td className={`grade ${passFailClass(s.obtained)}`}>{s.grade}</td>
                    <td className="remark">{s.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{summary.maxTotal}</td>
                  <td className="num" style={{ fontFamily: "var(--font-data)", textAlign: "center" }}>
                    {fmtNum(summary.obtainedTotal)}
                  </td>
                  <td className="num" />
                  <td
                    className="num"
                    style={{
                      textAlign: "center",
                      color: summary.overallGrade === "—" ? undefined : "var(--pass)",
                    }}
                  >
                    {summary.overallGrade}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <div className="closing-block">
              <div className="two-col">
                <div className="stat-grid">
                  <div className="stat">
                    <div className="stat-label">Percentage</div>
                    <div className="stat-value">
                      {fmtNum(summary.percentage)}
                      {summary.percentage != null ? <small>%</small> : null}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">GPA</div>
                    <div className="stat-value">
                      {fmtNum(summary.gpa)}
                      {summary.gpa != null ? <small>/4.0</small> : null}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Overall Grade</div>
                    <div className="stat-value">{summary.overallGrade}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Conduct</div>
                    <div className="stat-value" style={{ fontSize: 16 }}>
                      {summary.conduct}
                    </div>
                  </div>
                </div>

                <div className="scale-box">
                  <div className="scale-title">International Grading Scale</div>
                  <table className="scale">
                    <tbody>
                      <tr>
                        <td className="g">A</td>
                        <td>90 – 100 · Excellent / Distinction</td>
                      </tr>
                      <tr>
                        <td className="g">B</td>
                        <td>75 – 89 · Very Good</td>
                      </tr>
                      <tr>
                        <td className="g">C</td>
                        <td>60 – 74 · Good / Satisfactory</td>
                      </tr>
                      <tr>
                        <td className="g">D</td>
                        <td>50 – 59 · Pass / Needs Improvement</td>
                      </tr>
                      <tr>
                        <td className="g">U</td>
                        <td>Below 50 · Ungraded / Fail</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="strip">
                <div className="box">
                  <div className="box-label">Attendance</div>
                  <div className="box-value">
                    {attendance.present != null && attendance.total != null
                      ? `${attendance.present}/${attendance.total} days`
                      : "—"}
                  </div>
                </div>
                <div className="box">
                  <div className="box-label">Promotion Status</div>
                  <div className="box-value">{summary.promotionStatus}</div>
                </div>
                <div className="box">
                  <div className="box-label">Next Term Begins</div>
                  <div className="box-value">{term.nextTermStart}</div>
                </div>
              </div>

              <div className="remarks">
                <div className="who">Class Teacher&apos;s Remark</div>
                <p>{remarks.teacher || "—"}</p>
              </div>
              <div className="remarks">
                <div className="who">Principal&apos;s Remark</div>
                <p>{remarks.principal || "—"}</p>
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
                This report is issued under the authority of {school.name} and conforms to the
                school&apos;s internal and national assessment standards.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
