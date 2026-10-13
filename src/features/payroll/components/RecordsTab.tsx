import React from "react";
import {
  DollarSign,
  UserCheck,
  Clock,
  Trash2,
  Pencil,
  Eye,
  Wallet,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  cardShell,
  childCard,
} from "../../academics-shared/FeatureModalShell";
import type { PayrollRecord, StaffMember } from "../types";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  formatMoney,
  getCurrencySymbol,
  getMonthName,
  parsePayrollNotes,
  yearOptions,
} from "../utils";
import { ListFilterBar, DataTable, dataTableClass, ListPagination } from "../../../components/ui";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";

export type RecordsTabProps = {
  filteredPayrolls: PayrollRecord[];
  handleDeletePayroll: (id: string) => void;
  handleMarkPaid: (record: PayrollRecord) => void;
  handleMarkUnpaid: (record: PayrollRecord) => void;
  isFinanceAdmin: boolean;
  loading: boolean;
  openDetail: (record: PayrollRecord) => void;
  openEdit: (record: PayrollRecord) => void;
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (v: number) => void;
  setSelectedYear: (v: number) => void;
  staffList: StaffMember[];
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  savedViewsScope?: string;
  total?: number;
  page?: number;
  pageSize?: number;
};

export function RecordsTab({
  filteredPayrolls,
  handleDeletePayroll,
  handleMarkPaid,
  handleMarkUnpaid,
  isFinanceAdmin,
  loading,
  openDetail,
  openEdit,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  staffList,
  filterFields,
  filters,
  savedViewsScope,
  total = filteredPayrolls.length,
  page = 1,
  pageSize = 50,
}: RecordsTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const gross = filteredPayrolls.reduce(
    (sum, item) => sum + Number(item.basicSalary || 0) + Number(item.allowances || 0),
    0
  );
  const netTotal = filteredPayrolls.reduce(
    (sum, item) => sum + Number(item.netSalary || 0),
    0
  );
  const paidCount = filteredPayrolls.filter((p) => p.status === "PAID").length;
  const pendingCount = filteredPayrolls.filter((p) => p.status !== "PAID").length;

  const tableHeaders = [
    t("pages:payroll.records.colStaff"),
    t("pages:payroll.records.colCurrency"),
    t("pages:payroll.records.colBasic"),
    t("pages:payroll.records.colAllowances"),
    t("pages:payroll.records.colDeductions"),
    t("pages:payroll.records.colNet"),
    t("pages:payroll.records.colStatus"),
    t("pages:payroll.records.colActions"),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("pages:payroll.records.grossPay")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {formatMoney(gross)}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {getMonthName(selectedMonth)} {selectedYear}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-indigo-300 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("pages:payroll.records.netPayout")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {formatMoney(netTotal)}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {t("pages:payroll.records.afterDeductions")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("pages:payroll.records.paid")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {paidCount}
            <span className="text-base text-slate-400 font-bold">
              {" "}
              / {filteredPayrolls.length}
            </span>
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {t("pages:payroll.records.staffOnRoster", { count: staffList.length })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("pages:payroll.records.pending")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {pendingCount}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {t("pages:payroll.records.awaitingPayment")}
          </p>
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100">
          <ListFilterBar
            fields={filterFields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder={t("pages:payroll.records.searchPlaceholder")}
            shownCount={filteredPayrolls.length}
            totalCount={total}
            savedViewsScope={savedViewsScope}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {yearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-14 ${childCard} animate-pulse`}
              />
            ))}
          </div>
        ) : filteredPayrolls.length === 0 ? (
          <div className="py-16 px-6 text-center border-t border-dashed border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium">
              {t("pages:payroll.records.noRecords", {
                month: getMonthName(selectedMonth),
                year: selectedYear,
              })}
            </p>
            {isFinanceAdmin && (
              <p className="text-slate-400 text-sm mt-1">
                {t("pages:payroll.records.noRecordsHint")}
              </p>
            )}
          </div>
        ) : (
          <>
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  {tableHeaders.map((h) => (
                    <th
                      key={h}
                      className={dataTableClass.th}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {filteredPayrolls.map((rec) => {
                  const notes = parsePayrollNotes(rec.notes);
                  const symbol = getCurrencySymbol(notes.currency);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className={dataTableClass.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            userId={rec.userId || rec.user?.id}
                            name={rec.user?.name}
                            photoUrl={rec.user?.photoUrl}
                            size="sm"
                            rounded="2xl"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">
                              {rec.user?.name || t("pages:payroll.records.staffMember")}
                            </p>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {rec.user?.role || t("pages:payroll.records.staffRole")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={dataTableClass.td}>
                        <span className="inline-flex text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {notes.currency}
                        </span>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {notes.employmentType}
                        </p>
                      </td>
                      <td className={`${dataTableClass.td} text-sm font-mono font-semibold text-slate-700`}>
                        {formatMoney(rec.basicSalary, symbol)}
                      </td>
                      <td className={`${dataTableClass.td} text-sm font-mono font-semibold text-emerald-600`}>
                        +{formatMoney(rec.allowances, symbol)}
                      </td>
                      <td className={`${dataTableClass.td} text-sm font-mono font-semibold text-rose-500`}>
                        −{formatMoney(rec.deductions, symbol)}
                      </td>
                      <td className={`${dataTableClass.td} text-sm font-mono font-extrabold text-slate-900`}>
                        {formatMoney(rec.netSalary, symbol)}
                      </td>
                      <td className={dataTableClass.td}>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            rec.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          {rec.status === "PAID"
                            ? t("common:paid")
                            : t("common:pending")}
                        </span>
                      </td>
                      <td className={dataTableClass.td}>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openDetail(rec)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                            title={t("pages:payroll.records.viewPayslip")}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isFinanceAdmin && (
                            <>
                              {rec.status !== "PAID" && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(rec)}
                                  className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                                  title={t("pages:payroll.records.markAsPaid")}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {rec.status === "PAID" && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkUnpaid(rec)}
                                  className="p-2 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-700 transition-colors"
                                  title={t("pages:payroll.records.markAsUnpaid")}
                                >
                                  <Undo2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEdit(rec)}
                                className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                title={t("common:edit")}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePayroll(rec.id)}
                                className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                title={t("pages:payroll.records.remove")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
