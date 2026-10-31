import React from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { motion } from "motion/react";
import {
  cardShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
} from "../../academics-shared/FeatureModalShell";
import { MoneyInput } from "../../../components/MoneyInput";
import { FEE_TYPES, type FeeTemplate } from "../types";
import { formatMoney } from "../../../i18n/format";

export type BatchBillingPanelProps = {
  batchForm: any;
  batchProgress: { current: number; total: number; active: boolean };
  classrooms: { id: string; name: string }[];
  handleApplyTemplateToBatch: (id: string) => void;
  handleRunBatchBilling: (e: React.FormEvent) => void;
  setBatchForm: React.Dispatch<React.SetStateAction<any>>;
  students: any[];
  submitting: boolean;
  templates: FeeTemplate[];
  batchResultSummary?: string | null;
};

export function BatchBillingPanel({
  batchForm,
  batchProgress,
  classrooms,
  handleApplyTemplateToBatch,
  handleRunBatchBilling,
  setBatchForm,
  students,
  submitting,
  templates,
  batchResultSummary,
}: BatchBillingPanelProps) {
  const { t } = useTranslation(["pages", "common"]);
  const mode = batchForm.mode || "CLASSROOM";
  const perStudent =
    parseFloat(batchForm.amount || "0") *
    (1 - parseFloat(batchForm.discountPercent || "0") / 100);

  const scopeLabel = (tmpl: FeeTemplate): string => {
    const scopeMode = tmpl.scopeMode || "SCHOOL";
    const cohort =
      tmpl.cohort && tmpl.cohort !== "ALL"
        ? ` · ${tmpl.cohort === "NEW" ? t("fees.batch.cohortNew") : t("fees.batch.cohortReturning")}`
        : "";
    if (scopeMode === "GRADE") return `${t("fees.batch.scopeGrade")}${cohort}`;
    if (scopeMode === "DIVISION") return `${t("fees.batch.scopeDivision")}${cohort}`;
    return `${t("fees.batch.scopeSchool")}${cohort}`;
  };

  const feeTypeLabel = (type: string) =>
    t(`fees.feeTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`max-w-2xl mx-auto ${cardShell} p-8 space-y-6`}
    >
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs uppercase tracking-wider mb-2">
          <Users className="w-3.5 h-3.5" />
          {t("fees.batch.eyebrow")}
        </div>
        <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
          {t("fees.batch.title")}
        </h3>
        <p className="text-sm text-slate-500 mt-1">{t("fees.batch.subtitle")}</p>
      </div>

      {batchProgress.active && (
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-sm font-bold text-indigo-700">
            <span>{t("fees.batch.creatingInvoices")}</span>
            <span className="font-mono">
              {batchProgress.current} / {batchProgress.total}
            </span>
          </div>
          <div className="w-full bg-indigo-200/50 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{
                width: `${
                  batchProgress.total
                    ? (batchProgress.current / batchProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {batchResultSummary && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm text-slate-600">
          {batchResultSummary}
        </div>
      )}

      <form onSubmit={handleRunBatchBilling} className="space-y-4">
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("fees.batch.mode")}</label>
          <select
            value={mode}
            onChange={(e) =>
              setBatchForm({ ...batchForm, mode: e.target.value })
            }
            className={fieldSelect}
          >
            <option value="TEMPLATE">{t("fees.batch.modeTemplate")}</option>
            <option value="CLASSROOM">{t("fees.batch.modeClassroom")}</option>
          </select>
        </div>

        {mode === "TEMPLATE" ? (
          <>
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("fees.batch.template")}</label>
              <select
                value={batchForm.templateId}
                onChange={(e) => handleApplyTemplateToBatch(e.target.value)}
                className={fieldSelect}
                required
              >
                <option value="">{t("fees.batch.selectTemplate")}</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({formatMoney(Number(tmpl.amount))}) — {scopeLabel(tmpl)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("fees.batch.dueDate")}</label>
                <input
                  type="date"
                  value={batchForm.dueDate}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, dueDate: e.target.value })
                  }
                  className={fieldInput}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className={fieldLabel}>
                  {t("fees.batch.schoolYearOptional")}{" "}
                  <span className="normal-case font-medium">{t("fees.batch.optional")}</span>
                </label>
                <input
                  type="text"
                  value={batchForm.schoolYearKey || ""}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, schoolYearKey: e.target.value })
                  }
                  placeholder="2025-2026"
                  className={fieldInput}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("fees.batch.students")}</label>
                <select
                  value={batchForm.targetClassroom}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, targetClassroom: e.target.value })
                  }
                  className={fieldSelect}
                >
                  <option value="ALL">
                    {t("fees.batch.allStudents", { count: students.length })}
                  </option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("fees.invoice.template")} ({t("common:optional")})</label>
                <select
                  value={batchForm.templateId}
                  onChange={(e) => handleApplyTemplateToBatch(e.target.value)}
                  className={fieldSelect}
                >
                  <option value="">{t("fees.batch.none")}</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({formatMoney(Number(tmpl.amount))})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("fees.batch.type")}</label>
                <select
                  value={batchForm.type}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, type: e.target.value })
                  }
                  className={fieldSelect}
                >
                  {FEE_TYPES.filter((ft) => ft.value !== "ENTRANCE").map((ft) => (
                    <option key={ft.value} value={ft.value}>
                      {feeTypeLabel(ft.value)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("fees.amountLabel")}</label>
                <MoneyInput
                  value={batchForm.amount}
                  onValueChange={(amount) =>
                    setBatchForm({ ...batchForm, amount })
                  }
                  placeholder="0.00"
                  className={fieldInput}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel}>{t("fees.batch.discount")}</label>
                <select
                  value={batchForm.discountPercent}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, discountPercent: e.target.value })
                  }
                  className={fieldSelect}
                >
                  <option value="0">0%</option>
                  <option value="10">10%</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="100">100%</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("fees.batch.dueDate")}</label>
              <input
                type="date"
                value={batchForm.dueDate}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, dueDate: e.target.value })
                }
                className={fieldInput}
                required
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between text-sm font-medium text-slate-600 border border-slate-100">
              <span>{t("fees.batch.perStudentAmount")}</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {formatMoney(perStudent)}
              </span>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={batchProgress.active || submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {batchProgress.active
            ? t("fees.batch.creating")
            : mode === "TEMPLATE"
              ? t("fees.batch.applyTemplate")
              : t("fees.batch.createInvoices")}
        </button>
      </form>
    </motion.div>
  );
}
