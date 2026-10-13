import React from "react";
import { resolveReportCardTemplateKey } from "../../registry";
import {
  A4Page,
  MetaRow,
  SchoolMark,
  SigBlock,
  avgScore,
  brand,
  cambridgeLetter,
  commentText,
  dash,
  formatIssued,
  ibLevel,
  letterOf,
  skillBand,
  type IntlReportProps,
} from "./shared";
import { WisteriaGreenCard } from "./WisteriaGreenCard";
import { WisteriaNavyCard } from "./WisteriaNavyCard";
import { signaturesForLabels } from "../../signatureSlots";

/**
 * International A4 report cards (standard packs + Wisteria quarterly layouts).
 * Honest data only — GPA / attendance / position show "—" when not supplied.
 */
export function InternationalReportCard(props: IntlReportProps) {
  const key = resolveReportCardTemplateKey(props.templateKey);
  switch (key) {
    case "INTL_BRITISH":
      return <BritishCard {...props} />;
    case "INTL_AMERICAN":
      return <AmericanCard {...props} />;
    case "INTL_IB":
      return <IbCard {...props} />;
    case "INTL_CAMBRIDGE":
      return <CambridgeCard {...props} />;
    case "INTL_NORDIC":
      return <NordicCard {...props} />;
    case "INTL_EUROPEAN":
      return <EuropeanCard {...props} />;
    case "INTL_ASIA_PACIFIC":
      return <AsiaPacificCard {...props} />;
    case "INTL_PRIMARY":
      return <PrimaryCard {...props} />;
    case "INTL_EXECUTIVE":
      return <ExecutiveCard {...props} />;
    case "INTL_WISTERIA_GREEN":
      return <WisteriaGreenCard {...props} />;
    case "INTL_WISTERIA_NAVY":
      return <WisteriaNavyCard {...props} />;
    case "INTL_STANDARD_TERM":
    default:
      return <StandardTermCard {...props} />;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div id="report-card" className="intl-report-booklet">
      {children}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .intl-a4-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── 1. Standard Term ─────────────────────────────────────────── */
function StandardTermCard(p: IntlReportProps) {
  const avg = avgScore(p.grades);
  const accent = brand(p.school, "#0f172a");
  return (
    <Shell>
      <A4Page className="flex flex-col px-10 py-9 font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <header className="flex items-start justify-between gap-6 pb-5 border-b-2" style={{ borderColor: accent }}>
          <div className="flex items-start gap-4 min-w-0">
            <SchoolMark school={p.school} size={52} />
            <div className="min-w-0">
              <h1 className="text-[18px] font-extrabold tracking-tight leading-tight uppercase truncate">
                {p.school.name || "School"}
              </h1>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{p.school.address || "—"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Academic report</p>
            <p className="text-[15px] font-extrabold tracking-tight mt-1 max-w-[180px] leading-tight">{p.examTitle}</p>
            <p className="text-[10px] text-slate-500 mt-1">{formatIssued(p.examDate)}</p>
          </div>
        </header>

        <div className="mt-5 mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <MetaRow
            items={[
              { label: "Student", value: p.studentName },
              { label: "ID", value: dash(p.studentId) },
              { label: "Year", value: dash(p.academicYearLabel) },
              { label: "Average", value: avg != null ? `${avg}%` : "—" },
            ]}
          />
        </div>

        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr style={{ background: accent }} className="text-white">
              <th className="text-left font-bold py-2.5 px-3 first:rounded-tl-lg">Subject</th>
              <th className="text-center font-bold py-2.5 px-2 w-16">Mark</th>
              <th className="text-center font-bold py-2.5 px-2 w-14">Grade</th>
              <th className="text-right font-bold py-2.5 px-3 last:rounded-tr-lg w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {p.grades.map((g) => (
              <tr key={g.id} className="border-b border-slate-100">
                <td className="py-2.5 px-3 font-semibold">{g.subject.name}</td>
                <td className="py-2.5 px-2 text-center font-mono font-bold">{g.score}</td>
                <td className="py-2.5 px-2 text-center font-extrabold">{letterOf(g.score, p.gradeLegends)}</td>
                <td className="py-2.5 px-3 text-right text-[10px] font-bold uppercase text-slate-500">
                  {g.score >= 50 ? "Pass" : "Review"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 p-4 rounded-xl border border-slate-200 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">Teacher remarks</p>
          <p className="text-[12px] leading-relaxed text-slate-700 italic">{commentText(p.teacherComment)}</p>
        </div>

        <SigBlock
          labels={["Class teacher", "Principal", "Parent / Guardian"]}
          signatures={signaturesForLabels(
            ["Class teacher", "Principal", "Parent / Guardian"],
            p.officialSignatures
          )}
          className="mt-2"
        />
      </A4Page>
    </Shell>
  );
}

/* ─── 2. British Excellence ────────────────────────────────────── */
function BritishCard(p: IntlReportProps) {
  const avg = avgScore(p.grades);
  return (
    <Shell>
      <A4Page className="flex flex-col font-sans text-slate-900 border-[10px] border-[#0b1f3a] shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="flex-1 flex flex-col px-8 py-7">
          <div className="flex items-center justify-between gap-4">
            <SchoolMark school={p.school} size={48} />
            <div className="text-right min-w-0">
              <h1 className="text-[16px] font-extrabold uppercase tracking-tight text-[#0b1f3a] leading-tight">
                {p.school.name || "School"}
              </h1>
              <p className="text-[9px] font-bold tracking-[0.22em] text-slate-400 mt-1">
                EXCELLENCE · CHARACTER · LEADERSHIP
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#0b1f3a] mt-5 mb-5" />

          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-4 mb-5">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0b1f3a]">Student</p>
              <p className="text-[18px] font-extrabold tracking-tight mt-1">{p.studentName}</p>
              <p className="text-[10px] text-slate-500 mt-1">{dash(p.academicYearLabel)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0b1f3a]">Assessment</p>
              <p className="text-[14px] font-extrabold tracking-tight mt-1 leading-snug">{p.examTitle}</p>
              <p className="text-[10px] text-slate-500 mt-1">Issued {formatIssued(p.examDate)}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-[#0b1f3a] text-left">
                <th className="py-2.5 font-bold uppercase text-[9px] tracking-wider">Subject</th>
                <th className="py-2.5 text-center font-bold uppercase text-[9px] tracking-wider w-16">Mark</th>
                <th className="py-2.5 text-center font-bold uppercase text-[9px] tracking-wider w-20">Attainment</th>
                <th className="py-2.5 text-right font-bold uppercase text-[9px] tracking-wider w-24">Band</th>
              </tr>
            </thead>
            <tbody>
              {p.grades.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="py-3 font-semibold">{g.subject.name}</td>
                  <td className="py-3 text-center font-mono font-bold">{g.score}</td>
                  <td className="py-3 text-center font-extrabold text-[#0b1f3a] text-[16px]">
                    {letterOf(g.score, p.gradeLegends)}
                  </td>
                  <td className="py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                    {g.score >= 80 ? "Strong" : g.score >= 60 ? "Secure" : "Developing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-auto grid grid-cols-5 gap-4 pt-6">
            <div className="col-span-3 border-l-4 border-[#0b1f3a] pl-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0b1f3a] mb-2">
                Summative feedback
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 italic">{commentText(p.teacherComment)}</p>
            </div>
            <div className="col-span-2 bg-[#0b1f3a] text-white p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-70 mb-2">Overall</p>
              <p className="text-[22px] font-extrabold leading-none">
                {avg != null ? `${avg}%` : "—"}
              </p>
              <p className="text-[9px] mt-2 opacity-70">Mean mark</p>
            </div>
          </div>
        </div>
      </A4Page>
    </Shell>
  );
}

/* ─── 3. American Transcript ───────────────────────────────────── */
function AmericanCard(p: IntlReportProps) {
  const avg = avgScore(p.grades);
  return (
    <Shell>
      <A4Page className="flex flex-col px-9 py-8 font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <SchoolMark school={p.school} size={48} />
            <div className="min-w-0">
              <h1 className="text-[17px] font-extrabold tracking-tight truncate">{p.school.name || "School"}</h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-0.5">
                Official high school transcript
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[14px] font-extrabold">{p.studentName}</p>
            <p className="text-[9px] font-mono text-slate-500 mt-0.5">ID {dash(p.studentId)}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-0 my-6 border-y-2 border-slate-900 py-4">
          {[
            { label: "GPA", value: p.gpa != null ? p.gpa.toFixed(2) : "—" },
            { label: "Courses", value: String(p.grades.length || "—") },
            { label: "Average", value: avg != null ? String(avg) : "—" },
            { label: "Rank", value: dash(p.classPosition) },
          ].map((s, i) => (
            <div key={s.label} className={`text-center px-2 ${i > 0 ? "border-l border-slate-200" : ""}`}>
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1">{s.label}</p>
              <p className="text-[22px] font-extrabold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-2 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400 px-2 mb-2">
          <div className="col-span-2">Code</div>
          <div className="col-span-6">Course title</div>
          <div className="col-span-2 text-center">Mark</div>
          <div className="col-span-2 text-right">Letter</div>
        </div>
        <div className="space-y-1.5 flex-1">
          {p.grades.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-12 gap-2 items-center px-2 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
            >
              <div className="col-span-2 font-mono text-[10px] text-slate-500 truncate">{g.subject.code || "—"}</div>
              <div className="col-span-6 font-semibold truncate">{g.subject.name}</div>
              <div className="col-span-2 text-center font-mono font-bold">{g.score}</div>
              <div className="col-span-2 text-right font-extrabold text-[15px]">{letterOf(g.score, p.gradeLegends)}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-slate-900 text-white rounded-xl">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50 mb-2">Counselor notes</p>
          <p className="text-[11px] leading-relaxed italic opacity-90">{commentText(p.teacherComment)}</p>
        </div>
        <p className="text-[9px] text-slate-400 mt-3 text-center">
          {p.examTitle} · {formatIssued(p.examDate)} · Attendance {dash(p.attendanceRate != null ? `${p.attendanceRate}%` : null)}
        </p>
      </A4Page>
    </Shell>
  );
}

/* ─── 4. IB Diploma style ──────────────────────────────────────── */
function IbCard(p: IntlReportProps) {
  const levels = p.grades.map((g) => ibLevel(g.score));
  const mean = levels.length
    ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10
    : null;
  return (
    <Shell>
      <A4Page className="flex flex-col px-9 py-8 font-sans text-slate-900 border-t-[14px] border-[#1e3a5f] shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold tracking-tight leading-none">{p.school.name || "School"}</h1>
            <p className="text-[13px] font-semibold text-[#1e3a5f] mt-2 italic">Diploma Programme report</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-1">
              Inquiry · Knowledge · Care
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-5 py-4 text-center shrink-0 rounded-2xl">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400">Mean IB level</p>
            <p className="text-[32px] font-extrabold text-[#1e3a5f] leading-none mt-1">
              {mean != null ? mean : "—"}
              <span className="text-[14px] opacity-40">/7</span>
            </p>
          </div>
        </div>

        <div className="mt-5 mb-4">
          <MetaRow
            items={[
              { label: "Candidate", value: p.studentName },
              { label: "Session", value: p.examTitle },
              { label: "Issued", value: formatIssued(p.examDate) },
            ]}
          />
        </div>

        <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-[8px] font-bold uppercase tracking-[0.14em]">
          <div className="col-span-6">Subject</div>
          <div className="col-span-2 text-center">Mark %</div>
          <div className="col-span-2 text-center">Level</div>
          <div className="col-span-2 text-right">Max</div>
        </div>
        <div className="flex-1">
          {p.grades.map((g) => {
            const lvl = ibLevel(g.score);
            return (
              <div
                key={g.id}
                className="grid grid-cols-12 gap-2 items-center px-3 py-3 border-b border-slate-100 text-[11px]"
              >
                <div className="col-span-6 font-semibold">{g.subject.name}</div>
                <div className="col-span-2 text-center font-mono font-bold">{g.score}</div>
                <div className="col-span-2 text-center font-extrabold text-[20px] text-[#1e3a5f]">{lvl}</div>
                <div className="col-span-2 text-right text-slate-400 font-bold">7</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-[#eef3f8] p-4 rounded-xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#1e3a5f] mb-2">
              Learner profile focus
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Thinker", "Inquirer", "Communicator", "Reflective", "Principled"].map((a) => (
                <span
                  key={a}
                  className="px-2 py-0.5 bg-white text-[9px] font-bold text-[#1e3a5f] rounded-full border border-[#d5e0ec]"
                >
                  {a}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#1e3a5f]/70 mt-3 leading-relaxed italic">
              Levels are indicative mappings from percent marks pending official IB criterion entry.
            </p>
          </div>
          <div className="border border-slate-200 p-4 rounded-xl flex flex-col">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Coordinator notes</p>
            <p className="text-[11px] leading-relaxed text-slate-700 italic flex-1">{commentText(p.teacherComment)}</p>
            <div className="border-t border-slate-200 mt-3 pt-1 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">DP coordinator</p>
            </div>
          </div>
        </div>
      </A4Page>
    </Shell>
  );
}

/* ─── 5. Cambridge Pathway ─────────────────────────────────────── */
function CambridgeCard(p: IntlReportProps) {
  return (
    <Shell>
      <A4Page className="flex flex-col px-9 py-8 font-serif text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="text-center border-b border-slate-300 pb-5">
          <div className="flex justify-center mb-3">
            <SchoolMark school={p.school} size={44} />
          </div>
          <h1 className="text-[16px] font-bold uppercase tracking-[0.08em] leading-tight">
            {p.school.name || "School"}
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 italic">{p.school.address || "Cambridge International Pathway"}</p>
          <div className="mt-3 inline-block border border-slate-800 px-5 py-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Statement of results</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-[12px] my-5">
          <div className="space-y-1">
            <p>
              <span className="font-bold">Candidate:</span> {p.studentName}
            </p>
            <p>
              <span className="font-bold">Candidate no:</span> {dash(p.studentId)}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p>
              <span className="font-bold">Series:</span> {p.examTitle}
            </p>
            <p>
              <span className="font-bold">Date:</span> {formatIssued(p.examDate)}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse text-[11px] border border-slate-800">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 p-2 text-left font-bold">Syllabus / Subject</th>
              <th className="border border-slate-800 p-2 text-center font-bold w-16">Mark</th>
              <th className="border border-slate-800 p-2 text-center font-bold w-16">Grade</th>
            </tr>
          </thead>
          <tbody>
            {p.grades.map((g) => (
              <tr key={g.id}>
                <td className="border border-slate-800 p-2 font-semibold">
                  {g.subject.code ? `${g.subject.code} — ` : ""}
                  {g.subject.name}
                </td>
                <td className="border border-slate-800 p-2 text-center font-mono">{g.score}</td>
                <td className="border border-slate-800 p-2 text-center font-bold text-[14px]">
                  {cambridgeLetter(g.score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">
          Grades shown on the A*–G scale are indicative conversions from percentage marks for school
          reporting. Official Cambridge certificates remain the authoritative record.
        </p>

        <div className="mt-auto border border-slate-300 p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Examiner comment</p>
          <p className="text-[11px] leading-relaxed italic">{commentText(p.teacherComment)}</p>
        </div>
        <SigBlock
          labels={["Head of centre", "Exams officer"]}
          signatures={signaturesForLabels(
            ["Head of centre", "Exams officer"],
            p.officialSignatures
          )}
          className="mt-2"
        />
      </A4Page>
    </Shell>
  );
}

/* ─── 6. Nordic Competence ─────────────────────────────────────── */
function NordicCard(p: IntlReportProps) {
  return (
    <Shell>
      <A4Page className="flex flex-col px-12 py-10 font-sans text-slate-800 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-teal-700/80">Progress report</p>
        <h1 className="text-[28px] font-light tracking-tight mt-2 text-slate-900">{p.school.name || "School"}</h1>
        <div className="w-12 h-px bg-teal-700/40 mt-4 mb-8" />

        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[11px] text-slate-500">Student</p>
            <p className="text-[22px] font-medium tracking-tight text-slate-900">{p.studentName}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">{p.examTitle}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{formatIssued(p.examDate)}</p>
          </div>
        </div>

        <div className="space-y-0 flex-1">
          {p.grades.map((g) => (
            <div key={g.id} className="grid grid-cols-12 gap-3 py-4 border-b border-slate-200 items-center">
              <div className="col-span-7">
                <p className="text-[14px] font-medium text-slate-900">{g.subject.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{skillBand(g.score)}</p>
              </div>
              <div className="col-span-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700/80 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, g.score))}%` }}
                  />
                </div>
              </div>
              <div className="col-span-2 text-right font-mono text-[15px] font-medium">{g.score}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-[11px] text-slate-500 mb-2">Teacher reflection</p>
          <p className="text-[13px] leading-relaxed text-slate-700">{commentText(p.teacherComment)}</p>
        </div>
        <div className="mt-10 flex justify-between text-[10px] text-slate-400">
          <span>Class teacher</span>
          <span>Principal</span>
        </div>
      </A4Page>
    </Shell>
  );
}

/* ─── 7. European Formal ───────────────────────────────────────── */
function EuropeanCard(p: IntlReportProps) {
  const avg = avgScore(p.grades);
  return (
    <Shell>
      <A4Page className="flex flex-col px-9 py-8 font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="flex items-stretch gap-0 border border-slate-800">
          <div className="w-2 bg-[#1a365d] shrink-0" />
          <div className="flex-1 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SchoolMark school={p.school} size={44} />
              <div className="min-w-0">
                <h1 className="text-[15px] font-extrabold uppercase tracking-tight truncate">
                  {p.school.name || "School"}
                </h1>
                <p className="text-[9px] text-slate-500 mt-0.5">Bulletin scolaire · Academic bulletin</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[20px] font-extrabold font-mono leading-none">{avg != null ? avg : "—"}</p>
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400 mt-1">Moyenne</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 my-5 text-[11px]">
          <div className="border border-slate-200 p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">Élève / Student</p>
            <p className="font-bold mt-1">{p.studentName}</p>
          </div>
          <div className="border border-slate-200 p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">Période / Term</p>
            <p className="font-bold mt-1 leading-snug">{p.examTitle}</p>
          </div>
          <div className="border border-slate-200 p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">Date</p>
            <p className="font-bold mt-1">{formatIssued(p.examDate)}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-[11px] border border-slate-800 flex-1">
          <thead>
            <tr className="bg-[#1a365d] text-white">
              <th className="border border-slate-800 p-2 text-left font-bold">Matière / Subject</th>
              <th className="border border-slate-800 p-2 text-center font-bold w-16">Note</th>
              <th className="border border-slate-800 p-2 text-center font-bold w-16">Grade</th>
              <th className="border border-slate-800 p-2 text-center font-bold w-20">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {p.grades.map((g) => (
              <tr key={g.id}>
                <td className="border border-slate-800 p-2 font-semibold">{g.subject.name}</td>
                <td className="border border-slate-800 p-2 text-center font-mono font-bold">{g.score}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{letterOf(g.score, p.gradeLegends)}</td>
                <td className="border border-slate-800 p-2 text-center text-[10px] text-slate-600">
                  {g.score >= 75 ? "Très bien" : g.score >= 60 ? "Bien" : g.score >= 50 ? "Assez bien" : "À renforcer"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 border border-slate-300 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">Observations</p>
          <p className="text-[11px] leading-relaxed italic">{commentText(p.teacherComment)}</p>
        </div>
        <SigBlock
          labels={["Professeur principal", "Direction", "Parents"]}
          signatures={signaturesForLabels(
            ["Professeur principal", "Direction", "Parents"],
            p.officialSignatures
          )}
        />
      </A4Page>
    </Shell>
  );
}

/* ─── 8. Asia-Pacific Academic ─────────────────────────────────── */
function AsiaPacificCard(p: IntlReportProps) {
  const avg = avgScore(p.grades);
  const sorted = [...p.grades].sort((a, b) => b.score - a.score);
  return (
    <Shell>
      <A4Page className="flex flex-col px-8 py-7 font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <SchoolMark school={p.school} size={40} dark />
            <div className="min-w-0">
              <h1 className="text-[14px] font-extrabold uppercase tracking-tight truncate">
                {p.school.name || "School"}
              </h1>
              <p className="text-[8px] font-bold tracking-[0.18em] uppercase opacity-60 mt-0.5">
                Academic performance report
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[8px] font-bold tracking-[0.16em] uppercase opacity-50">Mean</p>
            <p className="text-[24px] font-extrabold font-mono leading-none mt-0.5">
              {avg != null ? avg.toFixed(1) : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 my-4 text-[10px]">
          {[
            { l: "Name", v: p.studentName },
            { l: "ID", v: dash(p.studentId) },
            { l: "Exam", v: p.examTitle },
            { l: "Date", v: formatIssued(p.examDate) },
          ].map((x) => (
            <div key={x.l} className="border border-slate-200 px-2 py-2 bg-slate-50">
              <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-slate-400">{x.l}</p>
              <p className="font-bold mt-0.5 truncate leading-tight">{x.v}</p>
            </div>
          ))}
        </div>

        <table className="w-full border-collapse text-[10px] flex-1">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="py-2 px-2 text-left font-bold w-8">#</th>
              <th className="py-2 px-2 text-left font-bold">Subject</th>
              <th className="py-2 px-2 text-center font-bold w-14">Score</th>
              <th className="py-2 px-2 text-center font-bold w-12">Grade</th>
              <th className="py-2 px-2 text-center font-bold w-16">vs Mean</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, i) => {
              const delta = avg != null ? Math.round((g.score - avg) * 10) / 10 : null;
              return (
                <tr key={g.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="py-2 px-2 font-mono text-slate-400">{i + 1}</td>
                  <td className="py-2 px-2 font-semibold">{g.subject.name}</td>
                  <td className="py-2 px-2 text-center font-mono font-bold">{g.score}</td>
                  <td className="py-2 px-2 text-center font-extrabold">{letterOf(g.score, p.gradeLegends)}</td>
                  <td
                    className={`py-2 px-2 text-center font-mono font-bold ${
                      delta == null ? "text-slate-400" : delta >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {delta == null ? "—" : delta >= 0 ? `+${delta}` : String(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px]">
          <div className="border border-slate-200 p-2">
            <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">Attendance</p>
            <p className="font-bold mt-0.5">{dash(p.attendanceRate != null ? `${p.attendanceRate}%` : null)}</p>
          </div>
          <div className="border border-slate-200 p-2">
            <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">Class position</p>
            <p className="font-bold mt-0.5">{dash(p.classPosition)}</p>
          </div>
          <div className="border border-slate-200 p-2">
            <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">GPA</p>
            <p className="font-bold mt-0.5">{p.gpa != null ? p.gpa.toFixed(2) : "—"}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 italic mt-3 leading-relaxed">{commentText(p.teacherComment)}</p>
        <SigBlock
          labels={["Form teacher", "Academic head"]}
          signatures={signaturesForLabels(
            ["Form teacher", "Academic head"],
            p.officialSignatures
          )}
        />
      </A4Page>
    </Shell>
  );
}

/* ─── 9. Primary Progress ──────────────────────────────────────── */
function PrimaryCard(p: IntlReportProps) {
  return (
    <Shell>
      <A4Page className="flex flex-col px-9 py-8 font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <SchoolMark school={p.school} size={48} />
            <div className="min-w-0">
              <h1 className="text-[16px] font-extrabold tracking-tight truncate">{p.school.name || "School"}</h1>
              <p className="text-[11px] font-semibold text-amber-800/80 mt-0.5">Primary progress report</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[13px] font-extrabold">{p.studentName}</p>
            <p className="text-[9px] text-amber-900/60 mt-0.5">{formatIssued(p.examDate)}</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-4 mb-3">{p.examTitle}</p>

        <div className="space-y-2.5 flex-1">
          {p.grades.map((g) => {
            const band = skillBand(g.score);
            const tone =
              band === "Exceeding"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : band === "Meeting"
                  ? "bg-sky-50 text-sky-800 border-sky-100"
                  : band === "Developing"
                    ? "bg-amber-50 text-amber-800 border-amber-100"
                    : "bg-slate-50 text-slate-600 border-slate-200";
            return (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 truncate">{g.subject.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Mark {g.score}</p>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border ${tone}`}>
                  {band}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Teacher note to family</p>
          <p className="text-[12px] leading-relaxed text-slate-700">{commentText(p.teacherComment)}</p>
        </div>
        <SigBlock
          labels={["Class teacher", "Parent / Guardian"]}
          signatures={signaturesForLabels(
            ["Class teacher", "Parent / Guardian"],
            p.officialSignatures
          )}
        />
      </A4Page>
    </Shell>
  );
}

/* ─── 10. Executive Brief ──────────────────────────────────────── */
function ExecutiveCard(p: IntlReportProps) {
  const avg = avgScore(p.grades);
  const top = [...p.grades].sort((a, b) => b.score - a.score).slice(0, 3);
  const focus = [...p.grades].sort((a, b) => a.score - b.score).slice(0, 2);
  return (
    <Shell>
      <A4Page className="flex flex-col px-9 py-8 font-sans text-slate-900 shadow-[0_4px_24px_rgb(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Executive brief</p>
            <h1 className="text-[20px] font-extrabold tracking-tight mt-1">{p.school.name || "School"}</h1>
          </div>
          <SchoolMark school={p.school} size={44} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="col-span-2 p-4 rounded-xl bg-slate-900 text-white">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-50">Student</p>
            <p className="text-[22px] font-extrabold tracking-tight mt-1">{p.studentName}</p>
            <p className="text-[11px] opacity-70 mt-2">{p.examTitle} · {formatIssued(p.examDate)}</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 flex flex-col justify-center text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400">Mean mark</p>
            <p className="text-[28px] font-extrabold tracking-tight mt-1">{avg != null ? avg : "—"}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 flex-1">
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700 mb-3">Strengths</p>
            <ul className="space-y-2">
              {top.map((g) => (
                <li key={g.id} className="flex justify-between text-[12px] gap-2">
                  <span className="font-semibold truncate">{g.subject.name}</span>
                  <span className="font-mono font-bold shrink-0">{g.score}</span>
                </li>
              ))}
              {!top.length && <li className="text-[11px] text-slate-400">—</li>}
            </ul>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700 mb-3">Focus areas</p>
            <ul className="space-y-2">
              {focus.map((g) => (
                <li key={g.id} className="flex justify-between text-[12px] gap-2">
                  <span className="font-semibold truncate">{g.subject.name}</span>
                  <span className="font-mono font-bold shrink-0">{g.score}</span>
                </li>
              ))}
              {!focus.length && <li className="text-[11px] text-slate-400">—</li>}
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Full subject list</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            {p.grades.map((g) => (
              <div key={g.id} className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="truncate pr-2">{g.subject.name}</span>
                <span className="font-mono font-bold shrink-0">
                  {g.score} · {letterOf(g.score, p.gradeLegends)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Leadership note</p>
          <p className="text-[12px] leading-relaxed text-slate-700">{commentText(p.teacherComment)}</p>
        </div>
        <SigBlock
          labels={["Academic director", "Principal"]}
          signatures={signaturesForLabels(
            ["Academic director", "Principal"],
            p.officialSignatures
          )}
        />
      </A4Page>
    </Shell>
  );
}
