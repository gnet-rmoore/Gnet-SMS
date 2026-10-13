import React from "react";
import type { ReportCardPayload, ReportCardSubjectRow, ReportCardTemplateDef } from "../../types";
import { LIBERIA_FAILING_THRESHOLD } from "../../liberiaLegend";
import { liberianScoreTone } from "../../assembleClient";

type Props = {
  payload: ReportCardPayload;
  def: ReportCardTemplateDef;
};

const SEM1_COLS = [
  { key: "SEM1_P1", label: "1st PD" },
  { key: "SEM1_P2", label: "2nd PD" },
  { key: "SEM1_P3", label: "3rd PD" },
  { key: "SEM1_EX", label: "Sem Exam" },
] as const;

const SEM2_COLS = [
  { key: "SEM2_P4", label: "4th PD" },
  { key: "SEM2_P5", label: "5th PD" },
  { key: "SEM2_P6", label: "6th PD" },
  { key: "SEM2_EX", label: "Sem Exam" },
] as const;

function cellDisplay(score: number | null | undefined, incomplete?: boolean): string {
  if (incomplete) return "I";
  if (score == null || Number.isNaN(score)) return "";
  const n = Math.round(score * 10) / 10;
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Subject scores: red if failing; black otherwise. Average row: blue when present. */
function ScoreCell({
  score,
  averageRow = false,
  incomplete = false,
}: {
  score: number | null | undefined;
  averageRow?: boolean;
  incomplete?: boolean;
}) {
  if (incomplete) {
    return (
      <td className="border border-black px-1 py-0.5 text-center font-bold text-amber-900 bg-amber-50">
        I
      </td>
    );
  }
  const tone = liberianScoreTone(score);
  let color = "text-black";
  if (tone === "fail") color = "text-[#c00000]";
  else if (averageRow && tone === "pass") color = "text-[#1f3fa0]";
  return (
    <td className={`border border-black px-1 py-0.5 text-center font-bold ${color}`}>
      {cellDisplay(score)}
    </td>
  );
}

function padSubjects(subjects: ReportCardSubjectRow[], minRows = 12): ReportCardSubjectRow[] {
  if (subjects.length >= minRows) return subjects;
  const blanks: ReportCardSubjectRow[] = Array.from(
    { length: minRows - subjects.length },
    (_, i) => ({
      subjectId: `__blank_${i}`,
      name: "",
      code: "",
      cells: {},
      sem1Avg: null,
      sem2Avg: null,
      yearlyAvg: null,
      average: null,
      letter: null,
      remark: null,
    })
  );
  return [...subjects, ...blanks];
}

function columnAvg(
  subjects: ReportCardSubjectRow[],
  pick: (s: ReportCardSubjectRow) => number | null | undefined
): number | null {
  const vals = subjects
    .map(pick)
    .filter((a): a is number => typeof a === "number" && !Number.isNaN(a));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/**
 * Inside A4 page — First Semester | Second Semester (same design each side).
 * Matches `k-2_report_card_bifold (2).html` Kleme-style panels.
 */
export function LiberianGradesMatrixPage({ payload }: Props) {
  const realSubjects = payload.subjects;
  const rows = padSubjects(realSubjects, Math.max(12, realSubjects.length));

  const sem1ColAvgs = SEM1_COLS.map((c) =>
    columnAvg(realSubjects, (s) => s.cells[c.key]?.score)
  );
  const sem1AvgAvg = columnAvg(realSubjects, (s) => s.sem1Avg);
  const sem2ColAvgs = SEM2_COLS.map((c) =>
    columnAvg(realSubjects, (s) => s.cells[c.key]?.score)
  );
  const sem2AvgAvg = columnAvg(realSubjects, (s) => s.sem2Avg);
  const ylyAvgAvg = columnAvg(realSubjects, (s) => s.yearlyAvg);

  return (
    <div
      className="grades-inside-spread bg-white font-serif text-black flex gap-[0.3in] overflow-hidden h-full"
      style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
    >
      {/* LEFT — First Semester (identical panel chrome as Second) */}
      <div className="sem-box w-1/2 box-border border-[3px] border-black p-2 flex flex-col min-w-0">
        <table className="w-full border-collapse text-[9px] leading-tight">
          <thead>
            <tr>
              <td
                rowSpan={2}
                className="border border-black px-1 py-1 align-middle text-center font-bold text-[12px] w-[22%]"
              >
                SUBJECTS
              </td>
              <td colSpan={5} className="border border-black px-1 py-1 font-bold text-center text-[10px]">
                FIRST SEMESTER
              </td>
            </tr>
            <tr>
              {SEM1_COLS.map((c) => (
                <th key={c.key} className="border border-black px-0.5 py-0.5 font-bold whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="border border-black px-0.5 py-0.5 font-bold whitespace-nowrap">
                Sem Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`s1-${row.subjectId}`}>
                <td className="border border-black px-1 py-0.5 text-left font-bold">{row.name}</td>
                {SEM1_COLS.map((c) => (
                  <ScoreCell
                    key={c.key}
                    score={row.cells[c.key]?.score}
                    incomplete={Boolean(row.cells[c.key]?.incomplete)}
                  />
                ))}
                <ScoreCell score={row.sem1Avg} />
              </tr>
            ))}
            <tr>
              <td className="border border-black px-1 py-0.5 font-bold">Average</td>
              {sem1ColAvgs.map((v, i) => (
                <ScoreCell key={SEM1_COLS[i].key} score={v} averageRow />
              ))}
              <ScoreCell score={sem1AvgAvg} averageRow />
            </tr>
          </tbody>
        </table>

        <div className="grading-system border border-black px-2.5 py-1.5 text-[8.5px] mt-2">
          <div className="text-center font-bold mb-0.5">Grading System</div>
          <div className="flex justify-between gap-2">
            <span>A = 90 - 100 --------- Excellent</span>
            <span>E = 60 - 69 ----------- Failed</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>B = 80 - 89 ----------- Good</span>
            <span>C = 75 - 79 ----- Satisfactory</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Second Semester (same design) */}
      <div className="sem-box w-1/2 box-border border-[3px] border-black p-2 flex flex-col min-w-0">
        <table className="w-full border-collapse text-[9px] leading-tight">
          <thead>
            <tr>
              <td
                rowSpan={2}
                className="border border-black px-1 py-1 align-middle text-center font-bold text-[12px] w-[16%]"
              >
                &nbsp;
              </td>
              <td colSpan={6} className="border border-black px-1 py-1 font-bold text-center text-[10px]">
                SECOND SEMESTER
              </td>
            </tr>
            <tr>
              {SEM2_COLS.map((c) => (
                <th key={c.key} className="border border-black px-0.5 py-0.5 font-bold whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="border border-black px-0.5 py-0.5 font-bold whitespace-nowrap">
                Sem Avg
              </th>
              <th className="border border-black px-0.5 py-0.5 font-bold whitespace-nowrap">
                Yly Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`s2-${row.subjectId}`}>
                <td className="border border-black px-1 py-0.5 text-left font-bold">{row.name}</td>
                {SEM2_COLS.map((c) => (
                  <ScoreCell
                    key={c.key}
                    score={row.cells[c.key]?.score}
                    incomplete={Boolean(row.cells[c.key]?.incomplete)}
                  />
                ))}
                <ScoreCell score={row.sem2Avg} />
                <ScoreCell score={row.yearlyAvg} />
              </tr>
            ))}
            <tr>
              <td className="border border-black px-1 py-0.5 font-bold">Average</td>
              {sem2ColAvgs.map((v, i) => (
                <ScoreCell key={SEM2_COLS[i].key} score={v} averageRow />
              ))}
              <ScoreCell score={sem2AvgAvg} averageRow />
              <ScoreCell score={ylyAvgAvg} averageRow />
            </tr>
          </tbody>
        </table>

        <div className="pass-note border border-black px-2.5 py-1.5 text-[8.5px] mt-2 flex-1 flex items-center">
          Note: To Make a pass, the student is expected to score {LIBERIA_FAILING_THRESHOLD}% or
          above in all subjects
        </div>
      </div>
    </div>
  );
}
