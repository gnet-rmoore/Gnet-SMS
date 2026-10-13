import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { payrollApi } from "../api";
import { formatMoney, getCurrencySymbol } from "../utils";

export type AttendanceSummary = {
  workdays: number;
  presentDays: number;
  leaveDays: number;
  missingDays: number;
  lateCount: number;
  suggestedDeduction: number;
  rules: {
    enabled: boolean;
    graceMinutes: number;
    deductionPerMissingDay: number;
    deductionPerLate: number;
  };
};

type Props = {
  schoolId?: string;
  userId: string;
  month: number;
  year: number;
  currency: string;
  onApplyDeduction: (amount: number) => void;
};

export function AttendanceSummaryPanel({
  schoolId,
  userId,
  month,
  year,
  currency,
  onApplyDeduction,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (!schoolId || !userId || !month || !year) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await payrollApi.fetchAttendanceSummary(
          schoolId,
          userId,
          year,
          month
        );
        if (!cancelled) setSummary(data as AttendanceSummary);
      } catch (err: any) {
        if (!cancelled) {
          setSummary(null);
          setError(err?.message || t("pages:payroll.attendance.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, userId, month, year]);

  if (!userId) return null;

  const statLabels = [
    { key: "workdays", label: t("pages:payroll.attendance.workdays") },
    { key: "present", label: t("pages:payroll.attendance.present") },
    { key: "leave", label: t("pages:payroll.attendance.leave") },
    { key: "missing", label: t("pages:payroll.attendance.missing") },
    { key: "late", label: t("pages:payroll.attendance.late") },
  ] as const;

  const getStatValue = (key: (typeof statLabels)[number]["key"]) => {
    if (!summary) return 0;
    switch (key) {
      case "workdays":
        return summary.workdays;
      case "present":
        return summary.presentDays;
      case "leave":
        return summary.leaveDays;
      case "missing":
        return summary.missingDays;
      case "late":
        return summary.lateCount;
    }
  };

  const deductionBreakdown =
    summary && summary.suggestedDeduction > 0
      ? [
          t("pages:payroll.attendance.missingTimes", {
            count: summary.missingDays,
            rate: formatMoney(summary.rules.deductionPerMissingDay, symbol),
          }),
          summary.rules.deductionPerLate > 0
            ? t("pages:payroll.attendance.lateTimes", {
                count: summary.lateCount,
                rate: formatMoney(summary.rules.deductionPerLate, symbol),
              })
            : null,
        ]
          .filter(Boolean)
          .join(" + ")
      : t("pages:payroll.attendance.noneForPeriod");

  return (
    <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("pages:payroll.attendance.title")}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            {t("pages:payroll.attendance.hint")}
          </p>
        </div>
        {loading && (
          <span className="text-xs font-bold text-slate-500 uppercase">
            {t("common:loading")}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

      {summary && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-5 gap-2">
            {statLabels.map(({ key, label }) => (
              <div
                key={key}
                className="bg-white rounded-xl border border-slate-100 p-3 text-center"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="text-lg font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
                  {getStatValue(key)}
                </p>
              </div>
            ))}
          </div>

          {summary.rules.enabled ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-500">
                {t("pages:payroll.attendance.suggestedDeduction")}{" "}
                <span className="font-mono font-bold text-slate-800">
                  {formatMoney(summary.suggestedDeduction, symbol)}
                </span>
                {summary.suggestedDeduction > 0
                  ? ` (${deductionBreakdown})`
                  : deductionBreakdown}
              </p>
              <button
                type="button"
                disabled={summary.suggestedDeduction <= 0}
                onClick={() => onApplyDeduction(summary.suggestedDeduction)}
                className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                {t("pages:payroll.attendance.applyDeduction")}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {t("pages:payroll.attendance.suggestionsOff")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
