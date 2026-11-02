import React from "react";
import {
  CalendarClock,
  ClipboardList,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell, childCard } from "../../academics-shared/FeatureModalShell";
import type { PayrollTemplate } from "../types";
import { formatMoney, getCurrencySymbol, getMonthName } from "../utils";

export type TemplatesTabProps = {
  templates: PayrollTemplate[];
  loading: boolean;
  refreshing?: boolean;
  canManage: boolean;
  onCreate: () => void;
  onEdit: (template: PayrollTemplate) => void;
  onDelete: (template: PayrollTemplate) => void;
  onRun: (template: PayrollTemplate) => void;
  onRefresh: () => void;
};

export function TemplatesTab({
  templates,
  loading,
  refreshing,
  canManage,
  onCreate,
  onEdit,
  onDelete,
  onRun,
  onRefresh,
}: TemplatesTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const activeCount = templates.filter((template) => template.isActive).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
            {t("pages:payroll.templates.totalTemplates")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            {templates.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
            {t("pages:payroll.templates.activeTemplates")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CalendarClock className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
            {t("pages:payroll.templates.nextRun")}
          </p>
          <p className="text-sm font-bold text-slate-700 mt-2">
            {templates.find((template) => template.isActive)
              ? t("pages:payroll.templates.nextRunHint")
              : t("pages:payroll.templates.noActiveHint")}
          </p>
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {t("pages:payroll.templates.eyebrow")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {t("pages:payroll.templates.title")}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {t("pages:payroll.templates.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title={t("pages:payroll.refreshTitle")}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {canManage && (
              <button
                type="button"
                onClick={onCreate}
                className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("pages:payroll.templates.newTemplate")}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-24 ${childCard} animate-pulse`} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium">
              {t("pages:payroll.templates.emptyTitle")}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {t("pages:payroll.templates.emptyHint")}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={onCreate}
                className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("pages:payroll.templates.newTemplate")}
              </button>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((template) => {
              const symbol = getCurrencySymbol(template.currency);
              const lastRun =
                template.lastRunMonth && template.lastRunYear
                  ? `${getMonthName(template.lastRunMonth)} ${template.lastRunYear}`
                  : t("pages:payroll.templates.neverRun");
              return (
                <div
                  key={template.id}
                  className={`${childCard} p-5 flex flex-col gap-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 truncate">
                          {template.name}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            template.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {template.isActive
                            ? t("pages:payroll.templates.active")
                            : t("pages:payroll.templates.inactive")}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-slate-500 font-medium mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t("pages:payroll.templates.lines")}
                      </p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {t("pages:payroll.templates.staffCount", {
                          count: template.itemCount,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t("pages:payroll.templates.monthlyNet")}
                      </p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">
                        {formatMoney(template.monthlyNet, symbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t("pages:payroll.templates.lastRun")}
                      </p>
                      <p className="font-bold text-slate-700 mt-0.5">{lastRun}</p>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRun(template)}
                        disabled={!template.isActive || template.itemCount === 0}
                        className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {t("pages:payroll.templates.run")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(template)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        title={t("common:edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(template)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
                        title={t("common:delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
