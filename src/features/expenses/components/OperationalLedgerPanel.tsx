import { Trash2, Edit, Check, X, Receipt, Download } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { CATEGORY_BADGE } from "../categoryStyles";
import { ListFilterBar, DataTable, dataTableClass, ListPagination } from "../../../components/ui";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";

export type OperationalLedgerPanelProps = {
  filteredExpenses?: any[];
  handleDeleteExpense?: (id: string) => void;
  handleUpdateStatus?: (id: string, status: "APPROVED" | "REJECTED" | "PENDING") => void;
  handleDownloadOfficialReceipt?: (exp: any) => void;
  isAccountantOrAdmin?: boolean;
  openEditModal?: (exp: any) => void;
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  savedViewsScope?: string;
  total?: number;
  page?: number;
  pageSize?: number;
};

export function OperationalLedgerPanel({
  filteredExpenses = [],
  handleDeleteExpense,
  handleUpdateStatus,
  handleDownloadOfficialReceipt,
  isAccountantOrAdmin,
  openEditModal,
  filterFields,
  filters,
  savedViewsScope,
  total = filteredExpenses.length,
  page = 1,
  pageSize = 50,
}: OperationalLedgerPanelProps) {
  const { t } = useTranslation(["pages", "common"]);

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
          searchPlaceholder={t("expenses.ledger.searchPlaceholder")}
          shownCount={filteredExpenses.length}
          totalCount={total}
          savedViewsScope={savedViewsScope}
        />
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        {filteredExpenses.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("expenses.ledger.noExpensesTitle")}
            </h3>
            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
              {filters.hasActiveFilters
                ? t("expenses.ledger.noExpensesFiltered")
                : t("expenses.ledger.noExpensesEmpty")}
            </p>
          </div>
        ) : (
          <>
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("expenses.ledger.colTitle")}</th>
                  <th className={dataTableClass.th}>{t("expenses.ledger.colCategory")}</th>
                  <th className={dataTableClass.th}>{t("expenses.ledger.colDate")}</th>
                  <th className={dataTableClass.th}>{t("expenses.ledger.colAmount")}</th>
                  <th className={dataTableClass.th}>{t("expenses.ledger.colStatus")}</th>
                  <th className={dataTableClass.thEnd}>{t("expenses.ledger.colActions")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filteredExpenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className={dataTableClass.td}>
                      <p className="font-bold text-slate-900 text-sm truncate">{exp.title}</p>
                      {exp.notes ? (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {exp.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          CATEGORY_BADGE[exp.category] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t(`expenses.categories.${exp.category}`, { defaultValue: exp.category })}
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-medium text-slate-600`}>
                      {exp.date
                        ? new Date(exp.date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className={`${dataTableClass.td} font-mono text-sm font-extrabold text-slate-900`}>
                      ${Number(exp.amount).toLocaleString()}
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          exp.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : exp.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t(`expenses.status.${exp.status}`, { defaultValue: exp.status })}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      {isAccountantOrAdmin ? (
                        <div className="flex items-center justify-end gap-1">
                          {exp.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleDownloadOfficialReceipt?.(exp)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title={t("expenses.ledger.downloadReceipt")}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {exp.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus?.(exp.id, "APPROVED")
                                }
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                title={t("expenses.ledger.approve")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus?.(exp.id, "REJECTED")
                                }
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                title={t("expenses.ledger.reject")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal?.(exp)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            title={t("common:edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense?.(exp.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title={t("common:delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
          <ListPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={filters.setPage}
            onPageSizeChange={filters.setPageSize}
          />
          </>
        )}
      </div>
    </motion.div>
  );
}
