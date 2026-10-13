import React from "react";
import { Download, Plus, RefreshCw, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type PayrollChromeProps = {
  isFinanceAdmin: boolean;
  loading?: boolean;
  onAdd: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
  recordCount: number;
  title?: string;
  subtitle?: string;
};

export function PayrollChrome({
  isFinanceAdmin,
  loading,
  onAdd,
  onExportCsv,
  onRefresh,
  recordCount,
  title,
  subtitle,
}: PayrollChromeProps) {
  const { t } = useTranslation("pages");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 ${cardShell}`}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {t("payroll.financeEyebrow")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
          <Wallet className="w-7 h-7 text-indigo-600" />
          {title ?? t("payroll.title")}
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          {subtitle ?? t("payroll.subtitle")}
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          title={t("payroll.refreshTitle")}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          disabled={recordCount === 0}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {t("payroll.exportCsv")}
        </button>

        {isFinanceAdmin && (
          <button
            type="button"
            onClick={onAdd}
            className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("payroll.addPayroll")}
          </button>
        )}
      </div>
    </motion.div>
  );
}
