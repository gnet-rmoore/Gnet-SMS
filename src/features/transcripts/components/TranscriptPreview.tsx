import React from "react";
import { Award, ShieldCheck } from "lucide-react";
import type { TranscriptCourseRow } from "../api";

export type TranscriptPreviewProps = {
  schoolName?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  studentName?: string | null;
  studentId?: string | null;
  gradeLevel?: string | null;
  academicYear?: string | null;
  templateName?: string | null;
  records?: TranscriptCourseRow[];
  gpa?: number | null;
  average?: number | null;
  honors?: string | null;
  credits?: number | null;
  preparedBy?: string | null;
  reviewedBy?: string | null;
};

export const SAMPLE_TRANSCRIPT_RECORDS: TranscriptCourseRow[] = [
  { subjectName: "Mathematics", subjectCode: "MATH-101", term: "Term 1", score: 92, letter: "A", points: 4, credits: 1 },
  { subjectName: "English Literature", subjectCode: "ENG-201", term: "Term 1", score: 88, letter: "B+", points: 3.5, credits: 1 },
  { subjectName: "Physics", subjectCode: "PHY-101", term: "Term 2", score: 76, letter: "C", points: 2, credits: 1 },
  { subjectName: "History", subjectCode: "HIS-101", term: "Term 2", score: 95, letter: "A", points: 4, credits: 1 },
];

function initialsFor(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

export function TranscriptPreview({
  schoolName,
  address,
  logoUrl,
  studentName,
  studentId,
  gradeLevel,
  academicYear,
  templateName,
  records,
  gpa,
  average,
  honors,
  credits,
  preparedBy,
  reviewedBy,
}: TranscriptPreviewProps) {
  const rows = records?.length ? records : SAMPLE_TRANSCRIPT_RECORDS;
  const scoredRows = rows.filter((row) => row.score != null) as Array<
    TranscriptCourseRow & { score: number }
  >;
  const computedAverage = scoredRows.length
    ? scoredRows.reduce((sum, row) => sum + row.score, 0) / scoredRows.length
    : 0;
  const computedGpa = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.points || 0), 0) / rows.length
    : 0;
  const computedCredits = rows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const resolvedSchool = schoolName || "Current School";
  const resolvedYear = academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.08),0_16px_44px_rgb(15,23,42,0.12)] ring-1 ring-slate-200">
      <div className="border-[3px] border-double border-slate-900 p-6 sm:p-10">
        <header className="flex flex-col gap-5 border-b-2 border-slate-900 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-contain ring-1 ring-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-lg font-black tracking-tight">
                {initialsFor(resolvedSchool)}
              </div>
            )}
            <div>
              <p className="text-lg font-black uppercase tracking-[0.18em] text-slate-900">
                {resolvedSchool}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{address || "—"}</p>
            </div>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-slate-900">
              Official Transcript
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Academic year {resolvedYear}
            </p>
            {templateName && (
              <p className="mt-1 text-[11px] font-semibold text-slate-400">{templateName}</p>
            )}
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
          {[
            ["Learner", studentName || "Sample Learner"],
            ["Learner ID", studentId || "PREVIEW-0001"],
            ["Class", gradeLevel || "Grade 10"],
            ["Status", "Preview record"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-xs font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2.5 font-black uppercase tracking-wider">Subject</th>
                <th className="px-3 py-2.5 font-black uppercase tracking-wider">Term</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-wider">Score</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-wider">Grade</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-wider">Points</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-wider">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, index) => (
                <tr key={`${row.subjectName}-${row.term}-${index}`} className="odd:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-slate-800">{row.subjectName}</p>
                    {row.subjectCode && (
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {row.subjectCode}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-500">{row.term}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                    {row.score == null ? "—" : `${row.score}%`}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-black text-slate-700">
                      {row.letter}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">
                    {Number(row.points || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">
                    {row.credits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Cumulative GPA", (gpa ?? computedGpa).toFixed(2)],
            ["Average", `${(average ?? computedAverage).toFixed(1)}%`],
            ["Credits earned", String(credits ?? computedCredits)],
            ["Academic standing", honors || "Good standing"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-700">
              {preparedBy || "Registrar"}
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Prepared by
            </p>
          </div>
          <div>
            <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-700">
              {reviewedBy || "Principal / Vice Principal"}
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Approved by
            </p>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-4 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Verification record held by the school registrar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" aria-hidden /> {resolvedSchool}
          </span>
        </footer>
      </div>
    </div>
  );
}
