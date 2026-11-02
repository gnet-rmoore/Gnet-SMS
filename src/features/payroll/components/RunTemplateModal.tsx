import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { payrollApi } from "../api";
import type {
  PayrollTemplate,
  PayrollTemplatePreview,
  StaffMember,
} from "../types";
import { formatMoney, getCurrencySymbol, getMonthName, yearOptions } from "../utils";

export type RunTemplateModalProps = {
  template: PayrollTemplate;
  staffList: StaffMember[];
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onComplete: (month: number, year: number) => void;
};

export function RunTemplateModal({
  template,
  staffList,
  defaultMonth,
  defaultYear,
  onClose,
  onComplete,
}: RunTemplateModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [preview, setPreview] = useState<PayrollTemplatePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async (m = month, y = year) => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await payrollApi.previewPayrollTemplate(template.id, m, y);
      setPreview(data);
    } catch (err: any) {
      setError(err?.message || t("pages:payroll.templates.previewFailed"));
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadPreview(defaultMonth, defaultYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, defaultMonth, defaultYear]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      await payrollApi.runPayrollTemplate(template.id, month, year);
      onComplete(month, year);
      onClose();
    } catch (err: any) {
      setError(err?.message || t("pages:payroll.templates.runFailed"));
    } finally {
      setRunning(false);
    }
  };

  const symbol = getCurrencySymbol(template.currency);
  const staffById = new Map(staffList.map((member) => [member.id, member]));
  const canRun = preview && preview.wouldCreate > 0 && !running;

  return (
    <FeatureModalShell
      wide
      eyebrow={t("pages:payroll.templates.runEyebrow")}
      title={t("pages:payroll.templates.runTitle", { name: template.name })}
      subtitle={t("pages:payroll.templates.runSubtitle")}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {running
              ? t("pages:payroll.templates.running")
              : t("pages:payroll.templates.createRecords", { count: preview?.wouldCreate || 0 })}
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:payroll.form.month")}</label>
            <select
              value={month}
              onChange={(e) => {
                const m = Number(e.target.value);
                setMonth(m);
                loadPreview(m, year);
              }}
              className={fieldInput}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:payroll.form.year")}</label>
            <select
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                setYear(y);
                loadPreview(month, y);
              }}
              className={fieldInput}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loadingPreview ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("pages:payroll.templates.willCreate")}
                </p>
                <p className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
                  {preview.wouldCreate}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("pages:payroll.templates.alreadyExists")}
                </p>
                <p className="text-xl font-extrabold text-amber-600 font-mono mt-1">
                  {preview.wouldSkip}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("pages:payroll.templates.totalNet")}
                </p>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                  {formatMoney(preview.totalNet, symbol)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-sm font-bold text-slate-900">
                  {t("pages:payroll.templates.previewFor", {
                    month: getMonthName(month),
                    year,
                  })}
                </p>
              </div>
              <div className="max-h-[320px] overflow-auto divide-y divide-slate-100">
                {preview.items.map((item) => (
                  <div
                    key={item.userId}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {staffById.get(item.userId)?.name ||
                          t("pages:payroll.templates.unknownStaff")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatMoney(item.netSalary, symbol)}
                      </p>
                    </div>
                    {item.exists ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t("pages:payroll.templates.skipExisting")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t("pages:payroll.templates.create")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {preview.wouldCreate === 0 && (
              <p className="text-sm text-slate-500 font-medium text-center">
                {t("pages:payroll.templates.allExist")}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </FeatureModalShell>
  );
}
