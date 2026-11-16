import React from "react";
import type { GradeSheetData } from "../types";
import { fmtNum } from "../assembleGradeSheet";
import { gradeSheetDensityClass } from "../density";
import "../styles/ledger.css";

type Props = { data: GradeSheetData; compact?: boolean };

function bandFor(p: number | null, legend: GradeSheetData["legend"]) {
  if (p == null) return undefined;
  return legend.find((b) => Math.round(p) >= b.min && Math.round(p) <= b.max);
}

export function LedgerReport({ data, compact }: Props) {
  const { school, term, student, columns, legend, subjects, summary, attendance, remarks } = data;
  const density = gradeSheetDensityClass(subjects.length);
  const hasPos = subjects.some((s) => s.position != null) || summary.rank != null;
  const avg = summary.average ?? summary.percentage;
  const key = legend.map((b) => `${b.letter} ${b.min}–${b.max}`).join("  •  ");
  const attText = attendance && (attendance.present != null || attendance.total != null)
    ? `${fmtNum(attendance.present, "—")} / ${fmtNum(attendance.total, "—")} days` : "—";
  const sigs = (data.signatures?.teacher || data.signatures?.principal)
    ? [
        { role: "Class educator", name: data.signatures?.teacher?.name, imageUrl: data.signatures?.teacher?.signatureUrl },
        { role: "Principal", name: data.signatures?.principal?.name, imageUrl: data.signatures?.principal?.signatureUrl },
      ]
    : [{ role: "Class educator" }, { role: "Principal" }];

  return (
    <div className={`gs-ledger ${density}`.trim()} id="grade-sheet" data-page-size="A4">
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <section className="sheet">
          <div className="frame">
            <header className="head">
              <div className="logo">
                {school.logoUrl ? <img src={school.logoUrl} alt="" /> : school.crestInitials}
              </div>
              <h1 className="school">{school.name || "—"}</h1>
              <div className="addr">{[school.address, school.phone || school.contact, school.email].filter(Boolean).join("   |   ") || "—"}</div>
              {school.motto ? <div className="motto">{school.motto}</div> : null}
            </header>
            <div className="title">
              <h2>Learner Academic Record</h2>
              <p>{term.periodLabel || term.examName || "—"} &nbsp;—&nbsp; {term.schoolYear || term.academicYear || "—"}</p>
            </div>
            <div className="meta">
              <div><span>Learner</span><b>{student.name || "—"}</b></div>
              <div><span>Learner ID</span><b>{student.id || student.admissionNo || "—"}</b></div>
              <div><span>Class</span><b>{student.classLabel || "—"}</b></div>
              <div><span>Grade level</span><b>{student.gradeLevel || student.classLabel || "—"}</b></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  {columns.map((c) => <th key={c.code} title={c.name}>{c.code}<small>{fmtNum(c.weightPct, "0")}%</small></th>)}
                  <th>Total<small>%</small></th>
                  <th>Grade</th>
                  {hasPos ? <th>Pos.</th> : null}
                  <th style={{ textAlign: "left" }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length ? subjects.map((s) => {
                  const b = bandFor(s.total, legend);
                  const letter = s.letter ?? b?.letter ?? "—";
                  const remark = s.remark ?? b?.remark ?? "—";
                  return (
                    <tr key={s.code || s.name}>
                      <td className="sub">{s.name}{s.code ? <small>{s.code}</small> : null}</td>
                      {columns.map((c) => <td key={c.code}>{fmtNum(s.scores?.[c.code] as number | null)}</td>)}
                      <td className="tot">{fmtNum(s.total)}</td>
                      <td className="gr">{letter || "—"}</td>
                      {hasPos ? <td>{s.position ?? "—"}</td> : null}
                      <td className="rm">{remark || "—"}</td>
                    </tr>
                  );
                }) : (
                  <tr className="empty"><td colSpan={columns.length + 4 + (hasPos ? 1 : 0)}>No released grades for this period yet.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={columns.length + 1}>Overall average</td>
                  <td>{fmtNum(avg)}</td>
                  <td>{bandFor(avg ?? null, legend)?.letter || summary.overallGrade || "—"}</td>
                  {hasPos ? <td></td> : null}
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="summary">
              <div><span>Position in class</span><b>{summary.rank != null ? `${summary.rank}${summary.classSize ? ` of ${summary.classSize}` : ""}` : (summary.rankLabel && summary.rankLabel !== "—" ? summary.rankLabel : "—")}</b></div>
              <div><span>GPA</span><b>{fmtNum(summary.gpa, "—")}</b></div>
              <div><span>Attendance</span><b style={{ fontSize: "11pt" }}>{attText}</b></div>
              <div><span>Promotion</span><b style={{ fontSize: "11pt" }}>{summary.promotionStatus || "—"}</b></div>
            </div>
            {key ? <div className="key">Grading key: {key}</div> : null}
            <div className="notes">
              <div className="note"><h4>Class educator's remarks</h4><p>{remarks.educator || remarks.teacher || "—"}</p></div>
              <div className="note"><h4>Principal's remarks</h4><p>{remarks.principal || "—"}</p></div>
            </div>
            <footer className="foot">
              <div className="sigs">
                {sigs.map((g, i) => (
                  <div className="sig" key={i}>
                    <div className="ln">{g.imageUrl ? <img src={g.imageUrl} alt="" /> : null}</div>
                    {g.name ? <>{g.name}<br/></> : null}<small>{g.role}</small>
                  </div>
                ))}
                <div className="stamp">School stamp</div>
              </div>
              <div className="issued">Issued {data.issuedOn || term.issueDate || "—"}</div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
