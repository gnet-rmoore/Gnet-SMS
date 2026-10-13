import React from "react";
import { Calendar, Check, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDisplayDate, patternLabel } from "../utils";
import { DataTable, dataTableClass } from "../../../components/ui";

export type CalendarOverviewProps = {
  activeCalendar: any;
};

export function CalendarOverview({ activeCalendar }: CalendarOverviewProps) {
  const { t } = useTranslation("pages");
  const o = (key: string) => t(`academicCalendar.overview.${key}`);
  const periods = Array.isArray(activeCalendar?.periods) ? activeCalendar.periods : [];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              {o("currentSetup")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {activeCalendar.name || o("defaultName")}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">{o("activeHint")}</p>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Check className="w-4 h-4" /> {o("active")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{o("pattern")}</p>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              {patternLabel(activeCalendar.patternType)}
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{o("periods")}</p>
            <p className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">{periods.length}</p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{o("schoolYearSpan")}</p>
            <p className="text-sm font-bold text-slate-800 mt-3">
              {periods[0]
                ? `${formatDisplayDate(periods[0].startDate)} – ${formatDisplayDate(periods[periods.length - 1].endDate)}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {periods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              {o("noPeriods")}
            </div>
          ) : (
            periods.map((p: any) => (
              <div key={p.id || p.periodNumber} className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold tracking-tight text-slate-900">{p.label}</h3>
                    <p className="text-xs font-medium text-slate-500">
                      {formatDisplayDate(p.startDate)} – {formatDisplayDate(p.endDate)}
                      {p.shortCode ? ` · ${p.shortCode}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 font-mono">
                    {t("academicCalendar.overview.annualWeight", { pct: p.annualWeightPct })}
                  </span>
                </div>
                <div className="p-4 sm:p-6">
                  {(p.examComponents || []).length === 0 ? (
                    <p className="text-sm text-slate-400 italic">{o("noExamComponents")}</p>
                  ) : (
                    <DataTable>
                      <table className={dataTableClass.table}>
                        <thead className={dataTableClass.thead}>
                          <tr>
                            <th className={dataTableClass.th}>{t("academicCalendar.overview.table.component")}</th>
                            <th className={dataTableClass.th}>{t("academicCalendar.overview.table.max")}</th>
                            <th className={dataTableClass.th}>{t("academicCalendar.overview.table.examDates")}</th>
                            <th className={dataTableClass.th}>{t("academicCalendar.overview.table.gradeDeadline")}</th>
                            <th className={dataTableClass.thEnd}>{t("academicCalendar.overview.table.weight")}</th>
                          </tr>
                        </thead>
                        <tbody className={dataTableClass.tbody}>
                          {(p.examComponents || []).map((c: any) => (
                            <tr key={c.id || c.shortCode}>
                              <td className={`${dataTableClass.td} text-sm font-bold text-slate-800`}>
                                <span className="truncate block">
                                  {c.label}{" "}
                                  <span className="text-slate-400 font-mono text-xs">({c.shortCode})</span>
                                </span>
                              </td>
                              <td className={`${dataTableClass.td} text-sm font-mono text-slate-600`}>{c.maxScore}</td>
                              <td className={`${dataTableClass.td} text-sm text-slate-500`}>
                                {c.examStartDate || c.examEndDate
                                  ? `${formatDisplayDate(c.examStartDate)}${
                                      c.examEndDate ? ` – ${formatDisplayDate(c.examEndDate)}` : ""
                                    }`
                                  : "—"}
                              </td>
                              <td className={`${dataTableClass.td} text-sm text-slate-500`}>
                                {c.gradeDeadline ? formatDisplayDate(c.gradeDeadline) : "—"}
                              </td>
                              <td className={`${dataTableClass.td} text-end text-sm font-mono font-bold text-indigo-600`}>
                                {c.weightPct}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DataTable>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
