import React from "react";
import { PreviewPill, PreviewShell } from "./PreviewShell";

export function AdmissionsPreview() {
  return (
    <PreviewShell title="Admissions">
      <div className="mb-3 flex flex-wrap gap-2">
        <PreviewPill active>Queue</PreviewPill>
        <PreviewPill>Waitlist</PreviewPill>
        <PreviewPill>Online link</PreviewPill>
      </div>
      <div className="space-y-2">
        {["A. Mensah — Grade 7", "J. Kollie — Grade 9", "S. Williams — Grade 5"].map((row, i) => (
          <div
            key={row}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <span className="text-xs font-semibold text-slate-800">{row}</span>
            <span
              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                i === 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {i === 0 ? "Review" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

export function ClassroomPreview() {
  return (
    <PreviewShell title="My Classes">
      <div className="mb-3 flex gap-2 text-[10px] font-semibold text-slate-400">
        {["Stream", "Classwork", "People", "Marks"].map((t, i) => (
          <span
            key={t}
            className={`rounded-lg px-2.5 py-1 ${i === 0 ? "bg-blue-600 text-white" : "bg-white text-slate-500"}`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignment</p>
          <p className="mt-1 text-xs font-semibold text-slate-800">Week 4 — Reading response</p>
          <p className="mt-1 text-[11px] text-slate-500">Due Friday · 24 students</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Announcement</p>
          <p className="mt-1 text-xs text-slate-600">Lab materials due before period 3.</p>
        </div>
      </div>
    </PreviewShell>
  );
}

export function GradebookPreview() {
  const cols = ["P1", "P2", "P3", "Exam"];
  const rows = [
    ["92", "88", "90", "—"],
    ["78", "81", "85", "—"],
    ["95", "91", "94", "—"],
  ];
  return (
    <PreviewShell title="Gradebook">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Student</th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-2 font-mono font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">Student {i + 1}</td>
                {r.map((cell, j) => (
                  <td key={j} className="px-2 py-2 font-mono">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PreviewShell>
  );
}

export function OnlineExamPreview() {
  return (
    <PreviewShell title="Online exam">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-extrabold text-slate-900">Midterm — Science</p>
          <span className="rounded-lg bg-rose-50 px-2 py-1 font-mono text-[10px] font-bold text-rose-600">
            24:18
          </span>
        </div>
        <p className="mt-4 text-[11px] font-semibold text-slate-500">Question 3 of 20</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-800">
          Which organelle is primarily responsible for photosynthesis?
        </p>
        <div className="mt-3 space-y-2">
          {["Mitochondria", "Chloroplast", "Nucleus"].map((opt, i) => (
            <div
              key={opt}
              className={`rounded-xl border px-3 py-2 text-xs ${
                i === 1 ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-100 bg-slate-50 text-slate-600"
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

export function FeesPreview() {
  return (
    <PreviewShell title="Fees">
      <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</p>
          <p className="mt-1 font-mono text-lg font-extrabold text-slate-900">$120</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid</p>
          <p className="mt-1 font-mono text-lg font-extrabold text-emerald-600">$380</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Tuition — Term 1", status: "Partial" },
          { label: "Lab fee", status: "Paid" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <span className="text-xs font-semibold text-slate-800">{row.label}</span>
            <span className="text-[10px] font-bold text-slate-500">{row.status}</span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

export function ParentPreview() {
  return (
    <PreviewShell title="My Children">
      <div className="grid gap-2 sm:grid-cols-2">
        {["Amara K.", "Daniel K."].map((name, i) => (
          <div key={name} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
              {name[0]}
            </div>
            <p className="mt-2 text-xs font-extrabold text-slate-900">{name}</p>
            <p className="text-[11px] text-slate-500">Grade {i === 0 ? "6" : "3"} · Section A</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <PreviewPill>Grades</PreviewPill>
              <PreviewPill>Fees</PreviewPill>
            </div>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

export function FacilitiesPreview() {
  return (
    <PreviewShell title="Work orders">
      <div className="space-y-2">
        {[
          { title: "AC repair — Block B", pri: "High", status: "Open" },
          { title: "Replace hallway lights", pri: "Normal", status: "Assigned" },
          { title: "Paint lab door", pri: "Low", status: "Done" },
        ].map((row) => (
          <div
            key={row.title}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{row.title}</p>
              <p className="text-[10px] text-slate-400">{row.pri}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

export function ReportCardsPreview() {
  return (
    <PreviewShell title="Report card">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Term report</p>
            <p className="mt-1 text-sm font-extrabold tracking-tight text-slate-900">Student Name</p>
            <p className="text-[11px] text-slate-500">Grade 8 · Semester 1</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-400">
            SEAL
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {[
            ["Mathematics", "A"],
            ["English", "B+"],
            ["Science", "A-"],
          ].map(([subj, grade]) => (
            <div key={subj} className="flex justify-between text-xs">
              <span className="text-slate-600">{subj}</span>
              <span className="font-mono font-bold text-slate-900">{grade}</span>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}
