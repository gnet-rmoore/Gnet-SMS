import React from "react";
import { Plus, Trash2, Edit, Layers } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { CATEGORY_BADGE, EXPENSE_CATEGORIES } from "../categoryStyles";
import { DataTable, dataTableClass } from "../../../components/ui";

export type BudgetsTabProps = {
  budgets?: any[];
  expenses?: any[];
  handleDeleteBudget?: (id: string) => void;
  isAccountantOrAdmin?: boolean;
  openEditBudgetModal?: (b: any) => void;
  setBudgetForm?: (v: any) => void;
  setEditingBudget?: (v: any) => void;
  setIsBudgetModalOpen?: (open: boolean) => void;
};

export function BudgetsTab({
  budgets = [],
  expenses = [],
  handleDeleteBudget,
  isAccountantOrAdmin,
  openEditBudgetModal,
  setBudgetForm,
  setEditingBudget,
  setIsBudgetModalOpen,
}: BudgetsTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  const spentByCategory = (cat: string) =>
    expenses
      .filter((e: any) => e.category === cat && e.status === "APPROVED")
      .reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div
        className={`flex flex-col sm:flex-row justify-between sm:items-center ${cardShell} p-6 gap-4`}
      >
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("expenses.budget.departmentBudgets")}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {t("expenses.budget.departmentBudgetsHint")}
          </p>
        </div>
        {isAccountantOrAdmin && (
          <button
            id="add-budget-btn"
            type="button"
            onClick={() => {
              setEditingBudget?.(null);
              setBudgetForm?.({
                department: "",
                category: "ACADEMIC",
                allocated: "",
                academicYear: "2026/2027",
                notes: "",
              });
              setIsBudgetModalOpen?.(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("expenses.budget.addBudget")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXPENSE_CATEGORIES.slice(0, 4).map((cat) => {
          const spent = spentByCategory(cat);
          const allocatedVal = budgets
            .filter((b: any) => b.category === cat)
            .reduce((sum: number, b: any) => sum + b.allocated, 0);
          const ratio =
            allocatedVal > 0
              ? Math.min(100, Math.round((spent / allocatedVal) * 100))
              : 0;

          return (
            <div key={cat} className={`${cardShell} p-6 space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                    CATEGORY_BADGE[cat]
                  }`}
                >
                  {t(`expenses.categories.${cat}`)}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    ratio > 90
                      ? "bg-rose-50 text-rose-600"
                      : ratio > 75
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {ratio}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    ratio > 90
                      ? "bg-rose-500"
                      : ratio > 75
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                  }`}
                  // width via Tailwind arbitrary value would need dynamic class; use style only for %
                  style={{ width: `${ratio}%` } as React.CSSProperties}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 pt-1 font-mono">
                <span>
                  {t("expenses.budget.spent", {
                    amount: `$${spent.toLocaleString()}`,
                  })}
                </span>
                <span>
                  {allocatedVal > 0
                    ? t("expenses.budget.cap", {
                        amount: `$${allocatedVal.toLocaleString()}`,
                      })
                    : t("expenses.budget.noCap")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
            {t("expenses.budget.allocations")}
          </h4>
        </div>
        {budgets.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Layers className="w-7 h-7" />
            </div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("expenses.budget.noBudgetsTitle")}
            </p>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {t("expenses.budget.noBudgetsHint")}
            </p>
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("expenses.budget.colDepartment")}</th>
                  <th className={dataTableClass.th}>{t("expenses.ledger.colCategory")}</th>
                  <th className={dataTableClass.th}>{t("expenses.budget.colAllocated")}</th>
                  <th className={dataTableClass.th}>{t("expenses.budget.colCategorySpent")}</th>
                  <th className={dataTableClass.th}>{t("expenses.budget.colRemaining")}</th>
                  <th className={dataTableClass.th}>{t("common:status")}</th>
                  <th className={dataTableClass.thEnd}>{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {budgets.map((b: any) => {
                  const spent = spentByCategory(b.category);
                  const remaining = b.allocated - spent;
                  const pct =
                    b.allocated > 0
                      ? Math.min(100, Math.round((spent / b.allocated) * 100))
                      : 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={dataTableClass.td}>
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {b.department}
                        </p>
                        {b.notes ? (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{b.notes}</p>
                        ) : null}
                      </td>
                      <td className={dataTableClass.td}>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            CATEGORY_BADGE[b.category] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t(`expenses.categories.${b.category}`, { defaultValue: b.category })}
                        </span>
                      </td>
                      <td className={`${dataTableClass.td} text-sm font-extrabold text-slate-900 font-mono`}>
                        ${b.allocated.toLocaleString()}
                      </td>
                      <td className={`${dataTableClass.td} text-sm font-medium text-slate-500 font-mono`}>
                        ${spent.toLocaleString()} ({pct}%)
                      </td>
                      <td
                        className={`${dataTableClass.td} text-sm font-bold font-mono ${
                          remaining < 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        ${remaining.toLocaleString()}
                      </td>
                      <td className={dataTableClass.td}>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            remaining < 0
                              ? "bg-rose-50 text-rose-700"
                              : remaining < b.allocated * 0.15
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {remaining < 0
                            ? t("expenses.budget.statusOver")
                            : remaining < b.allocated * 0.15
                              ? t("expenses.budget.statusLow")
                              : t("expenses.budget.statusOnTrack")}
                        </span>
                      </td>
                      <td className={dataTableClass.td}>
                        {isAccountantOrAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditBudgetModal?.(b)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title={t("common:edit")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBudget?.(b.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title={t("common:delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>
    </motion.div>
  );
}
