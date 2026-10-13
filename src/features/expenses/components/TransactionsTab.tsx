import React from "react";
import { ChevronRight, FileSpreadsheet } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { CATEGORY_BADGE } from "../categoryStyles";
import { ListFilterBar, DataTable, dataTableClass } from "../../../components/ui";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";

export type TransactionsTabProps = {
  setSelectedTxnDetails?: (v: any) => void;
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  unifiedTxns?: any[];
  savedViewsScope?: string;
};

export function TransactionsTab({
  setSelectedTxnDetails,
  filterFields,
  filters,
  unifiedTxns = [],
  savedViewsScope,
}: TransactionsTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  const categoryLabel = (category: string) =>
    t(`expenses.categories.${category}`, { defaultValue: category });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className={`${cardShell} p-6`}>
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          searchPlaceholder={t("expenses.transactions.searchPlaceholder")}
          shownCount={unifiedTxns.length}
          savedViewsScope={savedViewsScope}
        />
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        {unifiedTxns.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("expenses.transactions.noTxnsTitle")}
            </h3>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {filters.hasActiveFilters
                ? t("expenses.transactions.noTxnsFiltered")
                : t("expenses.transactions.noTxnsEmpty")}
            </p>
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("expenses.transactions.colRef")}</th>
                  <th className={dataTableClass.th}>{t("expenses.transactions.colDate")}</th>
                  <th className={dataTableClass.th}>{t("expenses.transactions.colParticulars")}</th>
                  <th className={dataTableClass.th}>{t("expenses.transactions.colParty")}</th>
                  <th className={dataTableClass.th}>{t("expenses.transactions.colCategory")}</th>
                  <th className={dataTableClass.th}>{t("expenses.transactions.colStatus")}</th>
                  <th className={dataTableClass.thEnd}>{t("expenses.transactions.colAmount")}</th>
                  <th className={dataTableClass.th} />
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {unifiedTxns.map((txn: any) => (
                  <tr
                    key={`${txn.type}-${txn.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className={`${dataTableClass.td} font-mono text-xs font-bold text-slate-500`}>
                      {txn.refCode}
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-medium text-slate-600`}>
                      {txn.date instanceof Date
                        ? txn.date.toLocaleDateString()
                        : "—"}
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-bold text-slate-900`}>
                      <span className="truncate block">{txn.particulars}</span>
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-medium text-slate-600`}>
                      <span className="truncate block">{txn.party || "—"}</span>
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          CATEGORY_BADGE[txn.category] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {categoryLabel(txn.category)}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          txn.status === "SETTLED"
                            ? "bg-emerald-50 text-emerald-700"
                            : txn.status === "VOID"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t(`expenses.txnStatus.${txn.status}`, { defaultValue: txn.status })}
                      </span>
                    </td>
                    <td
                      className={`${dataTableClass.td} text-end font-mono text-sm font-extrabold ${
                        txn.type === "INFLOW"
                          ? "text-emerald-600"
                          : "text-slate-900"
                      }`}
                    >
                      {txn.type === "INFLOW" ? "+" : "−"}$
                      {Number(txn.amount).toLocaleString()}
                    </td>
                    <td className={`${dataTableClass.td} text-end`}>
                      <button
                        type="button"
                        onClick={() => setSelectedTxnDetails?.(txn)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        aria-label={t("expenses.transactions.viewDetails")}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>
    </motion.div>
  );
}
