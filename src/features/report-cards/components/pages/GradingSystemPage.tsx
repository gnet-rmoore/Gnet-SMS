import React from "react";
import type { ReportCardPayload } from "../../types";
import { BifPanel } from "./BifoldChrome";
import { LIBERIA_FAILING_THRESHOLD } from "../../liberiaLegend";

type Props = {
  payload: ReportCardPayload;
};

/** Middle bifold leaf — grading chart (LR_PRIVATE_WITH_SCALE). */
export function LiberianGradingSystemPage({ payload }: Props) {
  const rows = payload.legend.length
    ? payload.legend.filter((r) => r.letter !== "F")
    : [];

  return (
    <BifPanel className="p-5">
      <h1 className="text-center text-[22px] font-bold uppercase tracking-wide mb-8">
        Grading System
      </h1>

      <table className="w-full border-collapse border border-black text-[13px] mb-6">
        <thead>
          <tr>
            <th className="border border-black py-2 px-2 font-bold w-[22%]">Letter</th>
            <th className="border border-black py-2 px-2 font-bold w-[28%]">Grade</th>
            <th className="border border-black py-2 px-2 font-bold">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.letter}-${r.min}`}>
              <td className="border border-black py-2 px-2 text-center font-bold">{r.letter}</td>
              <td className="border border-black py-2 px-2 text-center font-mono">
                {Math.round(r.min)}–
                {r.max >= 99.5 ? 99 : Math.floor(r.max)}%
              </td>
              <td className="border border-black py-2 px-2 text-center">{r.detail || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[13px] font-bold mb-1">
        Any grade below {LIBERIA_FAILING_THRESHOLD}% is a failing grade.
      </p>
      <p className="text-[13px] font-bold mb-6">Any erasure on this card makes it invalid</p>

      <p className="text-[12px] italic leading-relaxed mt-auto">
        Note: When a student's work is {LIBERIA_FAILING_THRESHOLD}% or below in any subject, the
        parent or Guardian should give special attention to see that the student does well in all
        work required by the school, otherwise the student will probably fail.
      </p>
    </BifPanel>
  );
}
