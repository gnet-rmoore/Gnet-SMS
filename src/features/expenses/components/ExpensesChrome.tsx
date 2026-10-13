import React from "react";
import { useTranslation } from "react-i18next";
import {
  Receipt,
  Plus,
  Wallet,
  TrendingUp,
  RefreshCw,
  BarChart3,
  FileSpreadsheet,
  Layers,
  Printer,
} from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type ExpensesChromeProps = {
  activeTab?: string;
  handleExportTransactionsPDF?: () => void;
  handleRefresh?: () => void;
  isAccountantOrAdmin?: boolean;
  refreshing?: boolean;
  setActiveTab?: (tab: any) => void;
  setEditingExpense?: (v: any) => void;
  setFormData?: (v: any) => void;
  setIsModalOpen?: (open: boolean) => void;
  title?: string;
  subtitle?: string;
};

export function ExpensesChrome({
  activeTab,
  handleExportTransactionsPDF,
  handleRefresh,
  isAccountantOrAdmin,
  refreshing,
  setActiveTab,
  setEditingExpense,
  setFormData,
  setIsModalOpen,
  title,
  subtitle,
}: ExpensesChromeProps) {
  const { t } = useTranslation(["pages", "common"]);

  const tabs = [
    { id: "ledger", label: t("expenses.tabs.ledger"), icon: Receipt },
    { id: "overview", label: t("expenses.tabs.overview"), icon: BarChart3 },
    { id: "budgets", label: t("expenses.tabs.budgets"), icon: Layers },
    { id: "analytics", label: t("expenses.tabs.analytics"), icon: TrendingUp },
    { id: "transactions", label: t("expenses.tabs.transactions"), icon: FileSpreadsheet },
  ] as const;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 ${cardShell}`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t("expenses.financeEyebrow")}
          </p>
          <h1
            id="bursar-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2"
          >
            <Wallet className="w-7 h-7 text-indigo-600" />
            {title ?? t("expenses.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1">{subtitle ?? t("expenses.subtitle")}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            id="refresh-ledger-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title={t("expenses.refreshTitle")}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          <button
            type="button"
            id="export-ledger-btn"
            onClick={handleExportTransactionsPDF}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            {t("expenses.exportPdf")}
          </button>

          {isAccountantOrAdmin && (
            <button
              type="button"
              id="file-expense-btn"
              onClick={() => {
                setEditingExpense?.(null);
                setFormData?.({
                  title: "",
                  amount: "",
                  category: "ACADEMIC",
                  date: new Date().toISOString().split("T")[0],
                  status: "PENDING",
                  notes: "",
                  receiptUrl: "",
                });
                setIsModalOpen?.(true);
              }}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("expenses.newExpense")}
            </button>
          )}
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab?.(tab.id)}
              className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
                active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
