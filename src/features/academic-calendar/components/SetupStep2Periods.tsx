import React from "react";
import { Check, Plus, Trash2, Sparkles, Info } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { FriendlyDateField } from "./FriendlyDateField";
import {
  applyPeriodDateChange,
  distributePeriodsEvenly,
  formatFriendlyDate,
  inferYearRange,
  type FieldErrors,
} from "../utils";
import type { Period } from "../types";

export type SetupStep2PeriodsProps = {
  addPeriod: () => void;
  config: { periods: Period[] };
  isEditing: boolean;
  removePeriod: (idx: number) => void;
  savePeriod: (idx: number) => void;
  updatePeriod: (idx: number, updates: Partial<Period>) => void;
  setPeriods: (periods: Period[]) => void;
  fieldErrors?: FieldErrors;
};

export function SetupStep2Periods({
  addPeriod,
  config,
  isEditing,
  removePeriod,
  savePeriod,
  updatePeriod,
  setPeriods,
  fieldErrors = {},
}: SetupStep2PeriodsProps) {
  const { t } = useTranslation("pages");
  const s = (key: string, opts?: Record<string, unknown>) =>
    t(`academicCalendar.setup.step2.${key}`, opts);
  const inferred = inferYearRange(config.periods);
  const [yearStart, setYearStart] = React.useState(inferred.start);
  const [yearEnd, setYearEnd] = React.useState(inferred.end);
  const [distributeNote, setDistributeNote] = React.useState("");

  React.useEffect(() => {
    const r = inferYearRange(config.periods);
    setYearStart(r.start);
    setYearEnd(r.end);
  }, [config.periods.length]);

  const totalWeight = config.periods.reduce(
    (acc, p) => acc + (Number(p.annualWeightPct) || 0),
    0
  );

  const handleDateChange = (idx: number, field: "startDate" | "endDate", value: string) => {
    setPeriods(applyPeriodDateChange(config.periods, idx, field, value));
    setDistributeNote("");
  };

  const handleDistribute = () => {
    if (!yearStart || !yearEnd) return;
    if (yearStart >= yearEnd) {
      setDistributeNote(s("distributeNoteEnd"));
      return;
    }
    const next = distributePeriodsEvenly(config.periods, yearStart, yearEnd);
    setPeriods(next);
    setDistributeNote(
      s("distributeNoteSuccess", {
        start: formatFriendlyDate(yearStart),
        end: formatFriendlyDate(yearEnd),
      })
    );
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* School year range → distribute */}
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-5">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{s("schoolYearRange")}</h3>
          <p className="text-sm text-slate-500 mt-1">{s("schoolYearHintLong")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <FriendlyDateField
            id="year-start"
            label={s("yearStart")}
            value={yearStart}
            onChange={setYearStart}
            required
          />
          <FriendlyDateField
            id="year-end"
            label={s("yearEnd")}
            value={yearEnd}
            onChange={setYearEnd}
            min={yearStart}
            required
          />
          <button
            type="button"
            onClick={handleDistribute}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors h-[46px]"
          >
            <Sparkles className="w-4 h-4" />
            {s("distribute")}
          </button>
        </div>

        <div className="flex gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
          <p className="font-medium leading-relaxed">
            {distributeNote || s("distributeTip")}
          </p>
        </div>

        {/* Simple timeline */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s("timelinePreview")}</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 border border-slate-100">
            {config.periods.map((p, idx) => (
              <div
                key={idx}
                title={`${p.label}: ${formatFriendlyDate(p.startDate)} – ${formatFriendlyDate(p.endDate)}`}
                className={`h-full flex-1 ${idx % 2 === 0 ? "bg-indigo-500" : "bg-indigo-300"}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {config.periods.map((p, idx) => (
              <span key={idx} className="font-medium">
                <span className="font-bold text-slate-700">{p.label || s("periodN", { n: idx + 1 })}</span>
                {p.startDate && p.endDate
                  ? `: ${formatFriendlyDate(p.startDate)} – ${formatFriendlyDate(p.endDate)}`
                  : `: ${s("datesNotSet")}`}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{s("periodDetails")}</h3>

        <div className="space-y-5">
          {config.periods.map((p, idx) => {
            const prevEnd = idx > 0 ? config.periods[idx - 1].endDate : undefined;
            const nextStart = idx < config.periods.length - 1 ? config.periods[idx + 1].startDate : undefined;
            return (
              <div
                key={p.id || idx}
                className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${
                  fieldErrors[`periods.${idx}.startDate`] ||
                  fieldErrors[`periods.${idx}.endDate`] ||
                  fieldErrors[`periods.${idx}.label`]
                    ? "border-rose-200 bg-rose-50/30"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold tracking-tight text-slate-900">
                    {p.label || s("periodN", { n: idx + 1 })}
                    <span className="ml-2 text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    {!isEditing && config.periods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePeriod(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title={s("removePeriod")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isEditing && p.id && (
                      <button
                        type="button"
                        onClick={() => savePeriod(idx)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                        title={s("savePeriod")}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {s("label")}
                    </label>
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => updatePeriod(idx, { label: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${
                        fieldErrors[`periods.${idx}.label`]
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-slate-200"
                      }`}
                    />
                    {fieldErrors[`periods.${idx}.label`] && (
                      <p className="text-xs font-semibold text-rose-600">
                        {fieldErrors[`periods.${idx}.label`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {s("shortCode")}
                    </label>
                    <input
                      type="text"
                      value={p.shortCode}
                      onChange={(e) => updatePeriod(idx, { shortCode: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${
                        fieldErrors[`periods.${idx}.shortCode`]
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-slate-200"
                      }`}
                    />
                    {fieldErrors[`periods.${idx}.shortCode`] && (
                      <p className="text-xs font-semibold text-rose-600">
                        {fieldErrors[`periods.${idx}.shortCode`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {s("annualWeight")}
                    </label>
                    <input
                      type="number"
                      value={p.annualWeightPct}
                      onChange={(e) =>
                        updatePeriod(idx, { annualWeightPct: parseFloat(e.target.value) || 0 })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500 ${
                        fieldErrors[`periods.${idx}.annualWeightPct`] || fieldErrors.annualWeight
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-slate-200"
                      }`}
                    />
                    {fieldErrors[`periods.${idx}.annualWeightPct`] && (
                      <p className="text-xs font-semibold text-rose-600">
                        {fieldErrors[`periods.${idx}.annualWeightPct`]}
                      </p>
                    )}
                  </div>

                  <FriendlyDateField
                    id={`period-${idx}-start`}
                    label={s("startDate")}
                    value={p.startDate || ""}
                    onChange={(v) => handleDateChange(idx, "startDate", v)}
                    error={fieldErrors[`periods.${idx}.startDate`]}
                    hint={
                      prevEnd
                        ? s("usuallyAfter", { date: formatFriendlyDate(prevEnd) })
                        : undefined
                    }
                    required
                  />

                  <FriendlyDateField
                    id={`period-${idx}-end`}
                    label={s("endDate")}
                    value={p.endDate || ""}
                    onChange={(v) => handleDateChange(idx, "endDate", v)}
                    error={fieldErrors[`periods.${idx}.endDate`]}
                    hint={
                      nextStart
                        ? s("nextStarts", { date: formatFriendlyDate(nextStart) })
                        : s("updatesNextStart")
                    }
                    min={p.startDate || undefined}
                    required
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {!isEditing && (
            <button
              type="button"
              onClick={addPeriod}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> {s("addPeriod")}
            </button>
          )}
          <div
            className={`flex-1 max-w-sm ml-auto p-4 rounded-2xl flex items-center justify-between border ${
              fieldErrors.annualWeight
                ? "bg-rose-50 border-rose-100"
                : "bg-indigo-50 border-indigo-100"
            }`}
          >
            <span
              className={`text-sm font-bold ${
                fieldErrors.annualWeight ? "text-rose-700" : "text-indigo-700"
              }`}
            >
              {s("totalAnnualWeight")}
            </span>
            <span
              className={`text-xl font-extrabold font-mono ${
                Math.abs(totalWeight - 100) < 0.05 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {totalWeight.toFixed(2)}%
            </span>
          </div>
        </div>
        {fieldErrors.annualWeight && (
          <p className="text-xs font-semibold text-rose-600 text-right">{fieldErrors.annualWeight}</p>
        )}
      </div>
    </motion.div>
  );
}
