import React from "react";
import { Check, Plus, Trash2, Sparkles, Info } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { FriendlyDateField } from "./FriendlyDateField";
import { FriendlyDateTimeField } from "./FriendlyDateTimeField";
import {
  applyExamComponentDateChange,
  distributeExamComponentsEvenly,
  formatFriendlyDate,
  type FieldErrors,
} from "../utils";
import type { ExamComponent, Period } from "../types";
import { AssessmentStructureEditor } from "./AssessmentStructureEditor";

export type SetupStep3ExamsProps = {
  addComponent: (periodIdx: number) => void;
  config: { patternType?: string; periods: Period[] };
  isEditing: boolean;
  removeComponent: (periodIdx: number, compIdx: number) => void;
  saveComponent: (periodIdx: number, compIdx: number) => void;
  updateComponent: (periodIdx: number, compIdx: number, updates: Partial<ExamComponent>) => void;
  setPeriods: (periods: Period[]) => void;
  fieldErrors?: FieldErrors;
};

function toDateOnly(value?: string | null) {
  if (!value) return "";
  return String(value).split("T")[0].slice(0, 10);
}

export function SetupStep3Exams({
  addComponent,
  config,
  isEditing,
  removeComponent,
  saveComponent,
  updateComponent,
  setPeriods,
  fieldErrors = {},
}: SetupStep3ExamsProps) {
  const { t } = useTranslation("pages");
  const s = (key: string, opts?: Record<string, unknown>) =>
    t(`academicCalendar.setup.step3.${key}`, opts);

  const [windowByPeriod, setWindowByPeriod] = React.useState<
    Record<number, { start: string; end: string }>
  >({});
  const [notes, setNotes] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    setWindowByPeriod((prev) => {
      const next = { ...prev };
      config.periods.forEach((p, idx) => {
        if (!next[idx]) {
          next[idx] = {
            start: toDateOnly(p.startDate),
            end: toDateOnly(p.endDate),
          };
        }
      });
      return next;
    });
  }, [config.periods.length]);

  const setPeriodComponents = (pIdx: number, components: ExamComponent[]) => {
    const periods = config.periods.map((p, i) =>
      i === pIdx ? { ...p, examComponents: components } : p
    );
    setPeriods(periods);
  };

  const handleExamDateChange = (
    pIdx: number,
    cIdx: number,
    field: "examStartDate" | "examEndDate",
    value: string
  ) => {
    const comps = applyExamComponentDateChange(
      config.periods[pIdx].examComponents || [],
      cIdx,
      field,
      value
    );
    setPeriodComponents(pIdx, comps);
    setNotes((n) => ({ ...n, [pIdx]: "" }));
  };

  const handleDistribute = (pIdx: number) => {
    const period = config.periods[pIdx];
    const win = windowByPeriod[pIdx] || {
      start: toDateOnly(period.startDate),
      end: toDateOnly(period.endDate),
    };
    if (!win.start || !win.end) {
      setNotes((n) => ({ ...n, [pIdx]: s("noteSetWindowFirst") }));
      return;
    }
    if (win.start >= win.end) {
      setNotes((n) => ({ ...n, [pIdx]: s("noteWindowEndAfterStart") }));
      return;
    }
    if (!period.examComponents?.length) {
      setNotes((n) => ({ ...n, [pIdx]: s("noteAddComponentFirst") }));
      return;
    }

    const next = distributeExamComponentsEvenly(period.examComponents, win.start, win.end);
    setPeriodComponents(pIdx, next);
    setNotes((n) => ({
      ...n,
      [pIdx]: s("distributeSuccess", {
        start: formatFriendlyDate(win.start),
        end: formatFriendlyDate(win.end),
      }),
    }));
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {config.periods.map((p: Period, pIdx: number) => {
        const win = windowByPeriod[pIdx] || {
          start: toDateOnly(p.startDate),
          end: toDateOnly(p.endDate),
        };
        const comps = p.examComponents || [];

        return (
          <div
            key={p.id || pIdx}
            className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                  {s("periodExamComponents", { label: p.label })}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {s("periodRuns", {
                    start: formatFriendlyDate(p.startDate) || "—",
                    end: formatFriendlyDate(p.endDate) || "—",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addComponent(pIdx)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> {s("addComponent")}
              </button>
            </div>

            {/* Exam window → distribute (same pattern as school year range) */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-extrabold tracking-tight text-slate-900">{s("examWindow")}</h4>
                <p className="text-xs text-slate-500 mt-1">{s("examWindowHint")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <FriendlyDateField
                  id={`period-${pIdx}-exam-window-start`}
                  label={s("windowStarts")}
                  value={win.start}
                  onChange={(v) =>
                    setWindowByPeriod((prev) => ({
                      ...prev,
                      [pIdx]: { ...win, start: v },
                    }))
                  }
                  min={toDateOnly(p.startDate) || undefined}
                  max={toDateOnly(p.endDate) || undefined}
                />
                <FriendlyDateField
                  id={`period-${pIdx}-exam-window-end`}
                  label={s("windowEnds")}
                  value={win.end}
                  onChange={(v) =>
                    setWindowByPeriod((prev) => ({
                      ...prev,
                      [pIdx]: { ...win, end: v },
                    }))
                  }
                  min={win.start || toDateOnly(p.startDate) || undefined}
                  max={toDateOnly(p.endDate) || undefined}
                />
                <button
                  type="button"
                  onClick={() => handleDistribute(pIdx)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors h-[46px]"
                >
                  <Sparkles className="w-4 h-4" />
                  {s("distributeEvenly")}
                </button>
              </div>
              <div className="flex gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <p className="font-medium leading-relaxed">
                  {notes[pIdx] || s("distributeTipDefault")}
                </p>
              </div>

              {comps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {s("componentTimeline")}
                  </p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-white border border-slate-200">
                    {comps.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        title={`${c.label}: ${formatFriendlyDate(c.examStartDate)} – ${formatFriendlyDate(c.examEndDate)}`}
                        className={`h-full flex-1 ${idx % 2 === 0 ? "bg-indigo-500" : "bg-indigo-300"}`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {comps.map((c, idx) => (
                      <span key={c.id || idx} className="font-medium">
                        <span className="font-bold text-slate-700">
                          {c.label || s("componentFallback", { n: idx + 1 })}
                        </span>
                        {c.examStartDate && c.examEndDate
                          ? `: ${formatFriendlyDate(c.examStartDate)} – ${formatFriendlyDate(c.examEndDate)}`
                          : `: ${s("datesNotSet")}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {fieldErrors[`periods.${pIdx}.components`] && (
              <p className="text-sm font-semibold text-rose-600">
                {fieldErrors[`periods.${pIdx}.components`]}
              </p>
            )}

            <div className="space-y-5">
              {comps.map((c, cIdx) => {
                const key = `periods.${pIdx}.components.${cIdx}`;
                const prevEnd = cIdx > 0 ? toDateOnly(comps[cIdx - 1].examEndDate) : undefined;
                const nextStart =
                  cIdx < comps.length - 1 ? toDateOnly(comps[cIdx + 1].examStartDate) : undefined;

                return (
                  <div
                    key={c.id || cIdx}
                    className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
                      Object.keys(fieldErrors).some((k) => k.startsWith(key))
                        ? "border-rose-200 bg-rose-50/20"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {s("type")}
                        </label>
                        {config.patternType === "SEMESTER" ? (
                          <select
                            value={c.componentType}
                            onChange={(e) =>
                              updateComponent(pIdx, cIdx, { componentType: e.target.value })
                            }
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold bg-white ${
                              fieldErrors[`${key}.componentType`]
                                ? "border-rose-300"
                                : "border-slate-200"
                            }`}
                          >
                            <option value="">{s("selectType")}</option>
                            <option value="FIRST_PERIOD">{s("componentTypes.firstPeriod")}</option>
                            <option value="SECOND_PERIOD">{s("componentTypes.secondPeriod")}</option>
                            <option value="THIRD_PERIOD">{s("componentTypes.thirdPeriod")}</option>
                            <option value="FOURTH_PERIOD">{s("componentTypes.fourthPeriod")}</option>
                            <option value="FIFTH_PERIOD">{s("componentTypes.fifthPeriod")}</option>
                            <option value="SIXTH_PERIOD">{s("componentTypes.sixthPeriod")}</option>
                            <option value="FIRST_SEMESTER_EXAMS">{s("componentTypes.firstSemesterExams")}</option>
                            <option value="SECOND_SEMESTER_EXAMS">{s("componentTypes.secondSemesterExams")}</option>
                          </select>
                        ) : (
                          <select
                            value={c.componentType}
                            onChange={(e) =>
                              updateComponent(pIdx, cIdx, { componentType: e.target.value })
                            }
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold bg-white ${
                              fieldErrors[`${key}.componentType`]
                                ? "border-rose-300"
                                : "border-slate-200"
                            }`}
                          >
                            <option value="CA">{s("componentTypes.ca")}</option>
                            <option value="MID_TERM">{s("componentTypes.midTerm")}</option>
                            <option value="END_OF_TERM">{s("componentTypes.endOfTerm")}</option>
                            <option value="FINAL">{s("componentTypes.final")}</option>
                            <option value="CUSTOM">{s("componentTypes.custom")}</option>
                          </select>
                        )}
                        {fieldErrors[`${key}.componentType`] && (
                          <p className="text-xs font-semibold text-rose-600">
                            {fieldErrors[`${key}.componentType`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {s("label")}
                        </label>
                        {config.patternType === "SEMESTER" ? (
                          <select
                            value={c.label}
                            onChange={(e) => updateComponent(pIdx, cIdx, { label: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold bg-white ${
                              fieldErrors[`${key}.label`] ? "border-rose-300" : "border-slate-200"
                            }`}
                          >
                            <option value="">{s("selectLabel")}</option>
                            <option value="1st Period">1st Period</option>
                            <option value="2nd Period">2nd Period</option>
                            <option value="3rd Period">3rd Period</option>
                            <option value="4th Period">4th Period</option>
                            <option value="5th Period">5th Period</option>
                            <option value="6th Period">6th Period</option>
                            <option value="First Semester Exams">First Semester Exams</option>
                            <option value="Second Semester Exams">Second Semester Exams</option>
                            <option value="Practical & Lab Assessment">
                              Practical & Lab Assessment
                            </option>
                            <option value="Semester Final Examination">
                              Semester Final Examination
                            </option>
                            <option value="Quiz & Assignments">Quiz & Assignments</option>
                            <option value="Oral Assessment">Oral Assessment</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={c.label}
                            onChange={(e) => updateComponent(pIdx, cIdx, { label: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold ${
                              fieldErrors[`${key}.label`] ? "border-rose-300" : "border-slate-200"
                            }`}
                          />
                        )}
                        {fieldErrors[`${key}.label`] && (
                          <p className="text-xs font-semibold text-rose-600">
                            {fieldErrors[`${key}.label`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {s("shortCode")}
                        </label>
                        <input
                          type="text"
                          value={c.shortCode}
                          onChange={(e) =>
                            updateComponent(pIdx, cIdx, { shortCode: e.target.value })
                          }
                          className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold ${
                            fieldErrors[`${key}.shortCode`] ? "border-rose-300" : "border-slate-200"
                          }`}
                        />
                        {fieldErrors[`${key}.shortCode`] && (
                          <p className="text-xs font-semibold text-rose-600">
                            {fieldErrors[`${key}.shortCode`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {s("maxScore")}
                        </label>
                        <input
                          type="number"
                          value={c.maxScore}
                          onChange={(e) =>
                            updateComponent(pIdx, cIdx, {
                              maxScore: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold ${
                            fieldErrors[`${key}.maxScore`] ? "border-rose-300" : "border-slate-200"
                          }`}
                        />
                        {fieldErrors[`${key}.maxScore`] && (
                          <p className="text-xs font-semibold text-rose-600">
                            {fieldErrors[`${key}.maxScore`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {s("weightPct")}
                        </label>
                        <input
                          type="number"
                          value={c.weightPct}
                          onChange={(e) =>
                            updateComponent(pIdx, cIdx, {
                              weightPct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold ${
                            fieldErrors[`${key}.weightPct`] ||
                            fieldErrors[`periods.${pIdx}.componentWeight`]
                              ? "border-rose-300"
                              : "border-slate-200"
                          }`}
                        />
                        {fieldErrors[`${key}.weightPct`] && (
                          <p className="text-xs font-semibold text-rose-600">
                            {fieldErrors[`${key}.weightPct`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FriendlyDateField
                        id={`${key}-exam-start`}
                        label={s("examStart")}
                        value={toDateOnly(c.examStartDate)}
                        onChange={(v) => handleExamDateChange(pIdx, cIdx, "examStartDate", v)}
                        error={fieldErrors[`${key}.examStartDate`]}
                        hint={
                          prevEnd
                            ? s("usuallyAfter", { date: formatFriendlyDate(prevEnd) })
                            : undefined
                        }
                        min={toDateOnly(p.startDate) || undefined}
                        max={toDateOnly(p.endDate) || undefined}
                      />
                      <FriendlyDateField
                        id={`${key}-exam-end`}
                        label={s("examEnd")}
                        value={toDateOnly(c.examEndDate)}
                        onChange={(v) => handleExamDateChange(pIdx, cIdx, "examEndDate", v)}
                        error={fieldErrors[`${key}.examEndDate`]}
                        hint={
                          nextStart
                            ? s("nextComponentStarts", { date: formatFriendlyDate(nextStart) })
                            : s("updatesNextStart")
                        }
                        min={toDateOnly(c.examStartDate) || toDateOnly(p.startDate) || undefined}
                        max={toDateOnly(p.endDate) || undefined}
                      />
                      <FriendlyDateTimeField
                        id={`${key}-deadline`}
                        label={s("gradeDeadline")}
                        value={c.gradeSubmissionDeadline || ""}
                        onChange={(v) =>
                          updateComponent(pIdx, cIdx, { gradeSubmissionDeadline: v })
                        }
                        error={fieldErrors[`${key}.gradeSubmissionDeadline`]}
                        hint={s("deadlineHint")}
                        min={
                          toDateOnly(c.examStartDate)
                            ? `${toDateOnly(c.examStartDate)}T00:00`
                            : undefined
                        }
                      />
                    </div>

                    <AssessmentStructureEditor
                      structureJson={c.gradebookStructure}
                      structureCustom={Boolean(c.gradebookStructureCustom)}
                      onChange={(gradebookStructure) =>
                        updateComponent(pIdx, cIdx, { gradebookStructure })
                      }
                      onCustomChange={(gradebookStructureCustom) =>
                        updateComponent(pIdx, cIdx, { gradebookStructureCustom })
                      }
                    />

                    <div className="flex items-center justify-end gap-2">
                      {isEditing && c.id && (
                        <button
                          type="button"
                          onClick={() => saveComponent(pIdx, cIdx)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title={s("saveChanges")}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeComponent(pIdx, cIdx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-end gap-1 text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{s("periodWeight")}</span>
                <span
                  className={`font-mono ${
                    Math.abs(
                      comps.reduce((acc, c) => acc + (Number(c.weightPct) || 0), 0) - 100
                    ) < 0.05
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {comps.reduce((acc, c) => acc + (Number(c.weightPct) || 0), 0).toFixed(2)}%
                </span>
              </div>
              {fieldErrors[`periods.${pIdx}.componentWeight`] && (
                <p className="text-xs font-semibold text-rose-600">
                  {fieldErrors[`periods.${pIdx}.componentWeight`]}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
