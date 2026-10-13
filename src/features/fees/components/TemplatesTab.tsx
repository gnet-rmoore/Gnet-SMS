import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, ArrowRight, Trash2, Layers, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import type { FeeTemplate } from "../types";
import { formatMoney } from "../../../i18n/format";

export type TemplatesTabProps = {
  handleDeleteTemplate: (id: string) => void;
  openEditTemplate: (template: FeeTemplate) => void;
  setActiveTab: (tab: any) => void;
  setBatchForm: React.Dispatch<React.SetStateAction<any>>;
  setShowTemplateModal: (open: boolean) => void;
  templates: FeeTemplate[];
  templatesLoading?: boolean;
};

export function TemplatesTab({
  handleDeleteTemplate,
  openEditTemplate,
  setActiveTab,
  setBatchForm,
  setShowTemplateModal,
  templates,
  templatesLoading,
}: TemplatesTabProps) {
  const { t } = useTranslation("pages");

  const feeTypeLabel = (type: string) =>
    t(`fees.feeTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  const scopeDisplay = (templ: FeeTemplate) => {
    const mode = (templ.scopeMode || "SCHOOL").replace(/_/g, " ");
    const cohort =
      templ.cohort && templ.cohort !== "ALL"
        ? ` · ${templ.cohort === "NEW" ? t("fees.batch.cohortNew") : templ.cohort === "RETURNING" ? t("fees.batch.cohortReturning") : templ.cohort}`
        : "";
    return `${mode}${cohort}${templ.schoolYearKey ? ` · ${templ.schoolYearKey}` : ""}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("fees.templatesTab.title")}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t("fees.templatesTab.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          {t("fees.templatesTab.addTemplate")}
        </button>
      </div>

      {templatesLoading ? (
        <div className={`${cardShell} h-40 animate-pulse bg-slate-50`} />
      ) : !templates || templates.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-16 text-center px-6">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Layers className="w-7 h-7" />
          </div>
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("fees.templatesTab.emptyTitle")}
          </p>
          <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto text-sm">
            {t("fees.templatesTab.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((templ) => (
            <div
              key={templ.id}
              className={`${cardShell} p-6 flex flex-col justify-between relative group`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    {feeTypeLabel(templ.type)}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => openEditTemplate(templ)}
                      className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title={t("fees.templatesTab.editTemplate")}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(templ.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title={t("fees.templatesTab.deleteTemplate")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                    {templ.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {templ.description || t("fees.templatesTab.noDescription")}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                    {scopeDisplay(templ)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {t("fees.templatesTab.amount")}
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono">
                    {formatMoney(Number(templ.amount))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBatchForm((prev: any) => ({
                      ...prev,
                      mode: "TEMPLATE",
                      templateId: templ.id,
                      type: templ.type,
                      amount: String(templ.amount),
                      schoolYearKey: templ.schoolYearKey || "",
                    }));
                    setActiveTab("batch");
                  }}
                  className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                  title={t("fees.templatesTab.useInBatch")}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
