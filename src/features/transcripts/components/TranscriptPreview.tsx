import React from "react";
import { Award, ShieldCheck } from "lucide-react";
import {
  resolveTranscriptTemplateKey,
  type TranscriptCourseRow,
  type TranscriptTemplateKey,
} from "../api";

export type TranscriptPreviewProps = {
  schoolName?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  studentName?: string | null;
  studentId?: string | null;
  gradeLevel?: string | null;
  academicYear?: string | null;
  templateKey?: string | null;
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

type PreviewData = {
  resolvedSchool: string;
  address?: string | null;
  logoUrl?: string | null;
  studentName: string;
  studentId: string;
  gradeLevel: string;
  resolvedYear: string;
  templateLabel?: string | null;
  rows: TranscriptCourseRow[];
  gpaValue: string;
  averageValue: string;
  creditsValue: string;
  honorsValue: string;
  preparedBy: string;
  reviewedBy: string;
};

function initialsFor(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function ClassicPreview({ data }: { data: PreviewData }) {
  return (
    <div className="mx-auto w-full max-w-[820px] bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.08),0_16px_44px_rgb(15,23,42,0.12)] ring-1 ring-slate-200">
      <div className="border-[3px] border-double border-slate-900 p-6 sm:p-10">
        <header className="flex flex-col gap-5 border-b-2 border-slate-900 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-contain ring-1 ring-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-lg font-black tracking-tight">
                {initialsFor(data.resolvedSchool)}
              </div>
            )}
            <div>
              <p className="text-lg font-black uppercase tracking-[0.18em] text-slate-900">
                {data.resolvedSchool}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{data.address || "—"}</p>
            </div>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-slate-900">
              Official Transcript
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Academic year {data.resolvedYear}
            </p>
            {data.templateLabel && (
              <p className="mt-1 text-[11px] font-semibold text-slate-400">{data.templateLabel}</p>
            )}
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
          {[
            ["Learner", data.studentName],
            ["Learner ID", data.studentId],
            ["Class", data.gradeLevel],
            ["Status", "Preview record"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
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
              {data.rows.map((row, index) => (
                <tr key={`${row.subjectName}-${row.term}-${index}`} className="odd:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-slate-800">{row.subjectName}</p>
                    {row.subjectCode && (
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
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
            ["Cumulative GPA", data.gpaValue],
            ["Average", data.averageValue],
            ["Credits earned", data.creditsValue],
            ["Academic standing", data.honorsValue],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-700">
              {data.preparedBy}
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Prepared by
            </p>
          </div>
          <div>
            <div className="border-t border-slate-900 pt-2 text-xs font-bold text-slate-700">
              {data.reviewedBy}
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Approved by
            </p>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-4 text-[11px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Verification record held by the school registrar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" aria-hidden /> {data.resolvedSchool}
          </span>
        </footer>
      </div>
    </div>
  );
}

function ModernPreview({ data }: { data: PreviewData }) {
  const identity: Array<[string, string]> = [
    ["Learner", data.studentName],
    ["Learner ID", data.studentId],
    ["Class", data.gradeLevel],
    ["Academic year", data.resolvedYear],
  ];
  const summary: Array<[string, string]> = [
    ["Cumulative GPA", data.gpaValue],
    ["Average", data.averageValue],
    ["Credits earned", data.creditsValue],
    ["Academic standing", data.honorsValue],
  ];

  return (
    <div className="mx-auto w-full max-w-[820px] overflow-hidden bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.08),0_16px_44px_rgb(15,23,42,0.12)] ring-1 ring-slate-200">
      <div className="h-2 bg-[#123a63]" />
      <div className="bg-[#123a63] px-6 py-7 text-white sm:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt=""
                className="h-12 w-12 rounded-xl bg-white/10 object-contain ring-1 ring-white/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base font-black ring-1 ring-white/30">
                {initialsFor(data.resolvedSchool)}
              </div>
            )}
            <div>
              <p className="text-base font-black uppercase tracking-[0.14em] sm:text-lg">
                {data.resolvedSchool}
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-100">{data.address || "—"}</p>
            </div>
          </div>
          <div className="sm:text-end">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-blue-200">
              Academic transcript
            </p>
            <p className="mt-1 text-xs font-bold text-white">{data.resolvedYear}</p>
            {data.templateLabel && (
              <p className="mt-1 text-[11px] font-semibold text-blue-200">{data.templateLabel}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 pt-6 sm:px-10">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {identity.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-[#f7f9fc] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#56708f]">{label}</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2.5 font-black uppercase tracking-[0.12em]">Subject</th>
                <th className="px-3 py-2.5 font-black uppercase tracking-[0.12em]">Term</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Score</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Grade</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Points</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.rows.map((row, index) => (
                <tr key={`${row.subjectName}-${row.term}-${index}`} className="odd:bg-[#f8fafc]">
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-slate-800">{row.subjectName}</p>
                    {row.subjectCode && (
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {row.subjectCode}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-500">{row.term}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                    {row.score == null ? "—" : `${row.score}%`}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 font-black text-[#123a63]">
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
          {summary.map(([label, value]) => (
            <div key={label} className="rounded-xl border-t-2 border-[#123a63] bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#56708f]">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <div className="border-t-2 border-[#123a63] pt-2 text-xs font-bold text-slate-700">
              {data.preparedBy}
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
              Prepared by
            </p>
          </div>
          <div>
            <div className="border-t-2 border-[#123a63] pt-2 text-xs font-bold text-slate-700">
              {data.reviewedBy}
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
              Approved by
            </p>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-4 text-[11px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#123a63]" aria-hidden /> Verification record held by the school registrar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-[#123a63]" aria-hidden /> {data.resolvedSchool}
          </span>
        </footer>
      </div>
    </div>
  );
}

function ExecutivePreview({ data }: { data: PreviewData }) {
  const identity: Array<[string, string]> = [
    ["Learner", data.studentName],
    ["Learner ID", data.studentId],
    ["Class", data.gradeLevel],
    ["Academic year", data.resolvedYear],
  ];
  const summary: Array<[string, string]> = [
    ["Cumulative GPA", data.gpaValue],
    ["Average", data.averageValue],
    ["Credits earned", data.creditsValue],
    ["Academic standing", data.honorsValue],
  ];

  return (
    <div className="mx-auto w-full max-w-[820px] bg-[#11141c] p-2 shadow-[0_1px_2px_rgb(15,23,42,0.12),0_18px_48px_rgb(15,23,42,0.2)] ring-1 ring-[#8a7338]">
      <div className="border border-[#c8a24a] bg-[#fffdf7] p-5 text-slate-900 sm:p-9">
        <header className="text-center">
          <div className="flex justify-center">
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-contain ring-2 ring-[#c8a24a]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#11141c] text-base font-black text-[#d8c48a] ring-2 ring-[#c8a24a]">
                {initialsFor(data.resolvedSchool)}
              </div>
            )}
          </div>
          <p className="mt-3 font-serif text-lg font-black uppercase tracking-[0.2em] text-[#1e293b]">
            {data.resolvedSchool}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#7a6a43]">{data.address || "—"}</p>
          <div className="mx-auto mt-4 border-t border-[#c8a24a] pt-3">
            <p className="font-serif text-sm font-black uppercase tracking-[0.3em] text-[#11141c]">
              Official Transcript
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#8a7338]">
              Academic year {data.resolvedYear}
            </p>
            {data.templateLabel && (
              <p className="mt-1 text-[11px] font-semibold text-[#9a8657]">{data.templateLabel}</p>
            )}
          </div>
        </header>

        <div className="mt-5 rounded-md border border-[#c8a24a] bg-[#f7f0dd] px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#6f5a24]">
          {data.honorsValue}
        </div>

        <section className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#d8c48a] bg-[#d8c48a] sm:grid-cols-4">
          {identity.map(([label, value]) => (
            <div key={label} className="bg-[#fffdf7] p-3 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8a7338]">{label}</p>
              <p className="mt-1 truncate text-xs font-bold text-[#1e293b]">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-md border border-[#c8a24a]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#11141c] text-[#d8c48a]">
              <tr>
                <th className="px-3 py-2.5 font-black uppercase tracking-[0.12em]">Subject</th>
                <th className="px-3 py-2.5 font-black uppercase tracking-[0.12em]">Term</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Score</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Grade</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Points</th>
                <th className="px-3 py-2.5 text-center font-black uppercase tracking-[0.12em]">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d8c48a] bg-[#fffdf7]">
              {data.rows.map((row, index) => (
                <tr key={`${row.subjectName}-${row.term}-${index}`}>
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-[#1e293b]">{row.subjectName}</p>
                    {row.subjectCode && (
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8a7338]">
                        {row.subjectCode}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#6b6353]">{row.term}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-[#1e293b]">
                    {row.score == null ? "—" : `${row.score}%`}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex rounded-sm bg-[#f4ead1] px-2 py-0.5 font-black text-[#6f5a24]">
                      {row.letter}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-[#6b6353]">
                    {Number(row.points || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-[#6b6353]">
                    {row.credits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-[#c8a24a] sm:grid-cols-4">
          {summary.map(([label, value]) => (
            <div key={label} className="bg-[#11141c] p-3 text-center text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#d8c48a]">{label}</p>
              <p className="mt-1 text-sm font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <div className="border-t border-[#c8a24a] pt-2 font-serif text-xs font-bold text-[#1e293b]">
              {data.preparedBy}
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8a7338]">
              Prepared by
            </p>
          </div>
          <div>
            <div className="border-t border-[#c8a24a] pt-2 font-serif text-xs font-bold text-[#1e293b]">
              {data.reviewedBy}
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8a7338]">
              Approved by
            </p>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-[#c8a24a] pt-4 text-[11px] font-semibold text-[#7a6a43] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#8a7338]" aria-hidden /> Verification record held by the school registrar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-[#8a7338]" aria-hidden /> {data.resolvedSchool}
          </span>
        </footer>
      </div>
    </div>
  );
}

export function TranscriptPreview({
  schoolName,
  address,
  logoUrl,
  studentName,
  studentId,
  gradeLevel,
  academicYear,
  templateKey,
  templateName,
  records,
  gpa,
  average,
  honors,
  credits,
  preparedBy,
  reviewedBy,
}: TranscriptPreviewProps) {
  const theme: TranscriptTemplateKey = resolveTranscriptTemplateKey(templateKey);
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
  const data: PreviewData = {
    resolvedSchool: schoolName || "Current School",
    address,
    logoUrl,
    studentName: studentName || "Sample Learner",
    studentId: studentId || "PREVIEW-0001",
    gradeLevel: gradeLevel || "Grade 10",
    resolvedYear: academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
    templateLabel: templateName,
    rows,
    gpaValue: (gpa ?? computedGpa).toFixed(2),
    averageValue: `${(average ?? computedAverage).toFixed(1)}%`,
    creditsValue: String(credits ?? computedCredits),
    honorsValue: honors || "Good standing",
    preparedBy: preparedBy || "Registrar",
    reviewedBy: reviewedBy || "Principal / Vice Principal",
  };

  if (theme === "modern") return <ModernPreview data={data} />;
  if (theme === "executive") return <ExecutivePreview data={data} />;
  return <ClassicPreview data={data} />;
}
