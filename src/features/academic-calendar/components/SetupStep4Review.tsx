import React from "react";
import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { formatDisplayDate } from "../utils";

export type SetupStep4ReviewProps = {
  config?: any;
  school?: any;
  [key: string]: any;
};

export function SetupStep4Review({ config }: SetupStep4ReviewProps) {
  const { t } = useTranslation("pages");
  const s = (key: string, opts?: Record<string, unknown>) =>
    t(`academicCalendar.setup.step4.${key}`, opts);

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white p-8 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100"
    >
      <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-8">
        {s("reviewConfirm")}
      </h3>
      <div className="space-y-8">
        {config.periods.map((p: any, idx: number) => (
          <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h4 className="font-bold text-slate-900">{p.label}</h4>
              <span className="text-sm font-bold text-indigo-600">
                {s("annualGrade", { pct: p.annualWeightPct })}
              </span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {s("duration")}
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {formatDisplayDate(p.startDate)} – {formatDisplayDate(p.endDate)}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[28rem]">
                  <thead>
                    <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="pb-4">{s("component")}</th>
                      <th className="pb-4">{s("maxScore")}</th>
                      <th className="pb-4">{s("deadline")}</th>
                      <th className="pb-4 text-right">{s("weight")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {p.examComponents.map((c: any, cIdx: number) => (
                      <tr key={cIdx}>
                        <td className="py-3 text-sm font-bold text-slate-700">
                          {c.label} ({c.shortCode})
                        </td>
                        <td className="py-3 text-sm font-medium text-slate-500">{c.maxScore}</td>
                        <td className="py-3 text-sm font-medium text-slate-500">
                          {c.gradeSubmissionDeadline
                            ? new Date(c.gradeSubmissionDeadline).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : s("na")}
                        </td>
                        <td className="py-3 text-sm font-black text-slate-900 text-right">
                          {c.weightPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">{s("beforeApply")}</p>
          <p className="text-sm font-medium text-amber-800 leading-relaxed">{s("beforeApplyBody")}</p>
        </div>
      </div>
    </motion.div>
  );
}
