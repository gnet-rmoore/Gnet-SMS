import React from "react";
import type { GradeSheetData } from "../types";
import { fmtNum } from "../assembleGradeSheet";
import { gradeSheetDensityClass } from "../density";
import "../styles/mastery.css";

function bandFor(p: number | null, legend: GradeSheetData["legend"]) {
  if (p == null) return undefined;
  return legend.find((b) => Math.round(p) >= b.min && Math.round(p) <= b.max);
}
function tier(p: number | null, legend: GradeSheetData["legend"]) {
  if (p == null) return "#b7bdcc";
  const L = [...legend].sort((a, b) => b.min - a.min);
  const i = L.findIndex((b) => Math.round(p) >= b.min && Math.round(p) <= b.max);
  if (i < 0 || L.length < 2) return p >= 85 ? "var(--m4)" : p >= 70 ? "var(--m3)" : p >= 50 ? "var(--m2)" : "var(--m1)";
  const r = i / (L.length - 1);
  return r === 0 ? "var(--m4)" : r <= 0.25 ? "var(--m3)" : r < 1 ? "var(--m2)" : "var(--m1)";
}

type Props = { data: GradeSheetData; compact?: boolean };
export function MasteryBarsReport({ data, compact }: Props) {
  const { school, term, student, columns, legend, subjects, summary, attendance, remarks } = data;
  const density = gradeSheetDensityClass(subjects.length);
  const avg = summary.average ?? summary.percentage;
  const R = 13.5, C = 2 * Math.PI * R, off = avg == null ? C : C * (1 - Math.min(avg, 100) / 100);
  const att: React.ReactNode = attendance && attendance.total
    ? <span>{fmtNum(attendance.present, "-")} <em>of {fmtNum(attendance.total, "-")} days</em></span>
    : "-";
  const key = legend.map((b) => <span key={b.letter}><i style={{ background: tier((b.min + b.max) / 2, legend) }} />{b.letter} {b.min}-{b.max}</span>);
  const sigs = (data.signatures?.teacher || data.signatures?.principal)
    ? [
        { role: "Class educator", name: data.signatures?.teacher?.name, imageUrl: data.signatures?.teacher?.signatureUrl },
        { role: "Principal", name: data.signatures?.principal?.name, imageUrl: data.signatures?.principal?.signatureUrl },
      ]
    : [{ role: "Class educator" }, { role: "Principal" }];

  return (
    <div className={`gs-mastery ${density}`.trim()} id="grade-sheet" data-page-size="A4">
      <div className="stage" style={compact ? { padding: 0 } : undefined}>
        <section className="sheet">
          <header className="band">
            <div className="id">
              <div className="logo">{school.logoUrl ? <img src={school.logoUrl} alt="" /> : school.crestInitials}</div>
              <div><h1>{school.name || "-"}</h1><p>{[school.address, school.phone || school.contact].filter(Boolean).join("  •  ") || "-"}</p></div>
            </div>
            <div className="rep"><h2>Learner progress report</h2><p>{term.periodLabel || term.examName || "-"}, {term.schoolYear || term.academicYear || "-"}</p></div>
          </header>
          <div className="main">
            <div className="hero">
              <div className="ring">
                <svg viewBox="0 0 30 30">
                  <circle cx="15" cy="15" r={R} fill="none" stroke="#e6e9f2" strokeWidth="2.6" />
                  <circle cx="15" cy="15" r={R} fill="none" stroke={tier(avg ?? null, legend)} strokeWidth="2.6" strokeLinecap="round" strokeDasharray={C.toFixed(2)} strokeDashoffset={off.toFixed(2)} />
                </svg>
                <div><b>{fmtNum(avg)}{avg == null ? "" : "%"}</b><small>Overall average</small></div>
              </div>
              <div className="who">
                <h3>{student.name || "-"}</h3>
                <div className="chips">
                  <span>Class <b>{student.classLabel || "-"}</b></span>
                  <span>Grade <b>{student.gradeLevel || student.classLabel || "-"}</b></span>
                  <span>ID <b>{student.id || student.admissionNo || "-"}</b></span>
                </div>
              </div>
            </div>
            <div className="stats">
              <div className="stat"><span>Position in class</span><b>{summary.rank != null ? summary.rank : "-"}{summary.rank != null && summary.classSize ? <span> <em>of {summary.classSize}</em></span> : null}</b></div>
              <div className="stat"><span>GPA</span><b>{fmtNum(summary.gpa, "-")}</b></div>
              <div className="stat"><span>Days present</span><b>{att}</b></div>
            </div>
            <div className="sec"><h4>Subject mastery</h4><span>{columns.map((c) => `${c.code} ${fmtNum(c.weightPct, "0")}%`).join("  •  ")}</span></div>
            <div>
              {subjects.length ? subjects.map((s) => {
                const b = bandFor(s.total, legend);
                const letter = s.letter ?? b?.letter ?? "-";
                const remark = s.remark ?? b?.remark ?? s.code ?? "";
                const parts = columns.filter((c) => s.scores?.[c.code] != null).map((c) => <span key={c.code}>{c.code} <b>{fmtNum(s.scores[c.code] as number, "0")}</b></span>);
                return (
                  <div className="subj" key={s.code || s.name}>
                    <div className="nm">{s.name}<small>{remark || "\u00A0"}</small></div>
                    <div><div className="bar"><i style={{ width: `${s.total == null ? 0 : Math.min(s.total, 100)}%`, background: tier(s.total, legend) }} /></div>{parts.length ? <div className="parts">{parts}</div> : null}</div>
                    <div className="sc">{fmtNum(s.total)}%</div>
                    <div className="pill" style={{ background: tier(s.total, legend) }}>{letter}</div>
                  </div>
                );
              }) : <div className="empty">No released grades for this period yet.</div>}
            </div>
            {key.length ? <div className="legend">{key}</div> : null}
            <div className="notes">
              <div className="note"><h5>Class educator</h5><p>{remarks.educator || remarks.teacher || "-"}</p></div>
              <div className="note"><h5>Principal</h5><p>{remarks.principal || "-"}</p></div>
            </div>
            <footer className="foot">
              {sigs.map((g, i) => (
                <div className="sig" key={i}><div className="ln">{g.imageUrl ? <img src={g.imageUrl} alt="" /> : null}</div>{g.name ? <b>{g.name}</b> : null}{g.role}</div>
              ))}
              <div className="issued">Issued {data.issuedOn || term.issueDate || "-"}</div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}