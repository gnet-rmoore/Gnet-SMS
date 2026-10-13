import React from "react";
import { useTranslation } from "react-i18next";

export type AttendancePayrollRulesForm = {
  enabled: boolean;
  graceMinutes: number;
  deductionPerMissingDay: number;
  deductionPerLate: number;
  blockNonInstructionalRollCall: boolean;
  publishRollCallToCalendar: boolean;
};

type Props = {
  rules: AttendancePayrollRulesForm;
  setRules: (r: AttendancePayrollRulesForm) => void;
  saving?: boolean;
  onSave?: () => void;
};

const card =
  "rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8 space-y-5";

export function AttendancePayrollSettingsCard({
  rules,
  setRules,
  saving,
  onSave,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const a = (key: string) => t(`settings.attendancePayroll.${key}`);

  const patch = (partial: Partial<AttendancePayrollRulesForm>) =>
    setRules({ ...rules, ...partial });

  return (
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{a("title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{a("subtitle")}</p>
        </div>
        {onSave && (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? a("saving") : a("saveRules")}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
        {a("alsoOnSchoolInfo")}
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={rules.blockNonInstructionalRollCall}
          onChange={(e) =>
            patch({ blockNonInstructionalRollCall: e.target.checked })
          }
          className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          <span className="text-sm font-bold text-slate-800 block">{a("blockRollCall")}</span>
          <span className="text-xs text-slate-500">{a("blockRollCallHint")}</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={rules.publishRollCallToCalendar}
          onChange={(e) =>
            patch({ publishRollCallToCalendar: e.target.checked })
          }
          className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          <span className="text-sm font-bold text-slate-800 block">{a("publishRollCall")}</span>
          <span className="text-xs text-slate-500">{a("publishRollCallHint")}</span>
        </span>
      </label>

      <div className="border-t border-slate-100 pt-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rules.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <span className="text-sm font-bold text-slate-800 block">{a("enableDeductions")}</span>
            <span className="text-xs text-slate-500">{a("enableDeductionsHint")}</span>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">{a("lateGrace")}</label>
            <input
              type="number"
              min={0}
              value={rules.graceMinutes}
              onChange={(e) =>
                patch({ graceMinutes: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">{a("deductionMissing")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rules.deductionPerMissingDay}
              onChange={(e) =>
                patch({
                  deductionPerMissingDay: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">{a("deductionLate")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rules.deductionPerLate}
              onChange={(e) =>
                patch({
                  deductionPerLate: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
