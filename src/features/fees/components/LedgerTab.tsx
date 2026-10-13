import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Download,
  Receipt,
  Bell,
  ArrowUpDown,
  Eye,
  Clock,
  Ban,
} from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";
import { FEE_TYPES, feeBalance, feeStatusI18nKey, isFeeOpen, isFeeOverdue, type FeePayment } from "../types";
import { formatMoney } from "../../../i18n/format";
import { ListFilterBar, ListPagination, DataTable, dataTableClass, Button } from "../../../components/ui";
import type { FilterFieldDef } from "../../list-filters";

export type LedgerTabProps = {
  classrooms: { id: string; name: string }[];
  feeRecords: FeePayment[];
  filterStatus: string;
  filterType: string;
  filteredRecords: FeePayment[];
  /** Server-paged ledger total (admin). When set, shows ListPagination. */
  ledgerTotal?: number;
  ledgerPage?: number;
  ledgerPageSize?: number;
  onLedgerPageChange?: (page: number) => void;
  onLedgerPageSizeChange?: (size: number) => void;
  handleBulkCollect: () => void;
  handleBulkRemind: () => void;
  handleCollectPayment: (id: string) => void;
  handleVoidFee: (id: string) => void;
  handleDownloadReceipt: (record: FeePayment) => void | Promise<void>;
  handleSendReminder: (id: string) => void;
  handleToggleSelectAll: () => void;
  handleToggleSelectOne: (id: string) => void;
  isAdminOrAccountant: boolean;
  isStudent: boolean;
  school: any;
  searchQuery: string;
  selectedInvoices: string[];
  selectedStudentClass: string;
  setFilterStatus: (v: any) => void;
  setFilterType: (v: string) => void;
  setIsDrawerOpen: (v: boolean) => void;
  setSearchQuery: (v: string) => void;
  setSelectedFee: (fee: FeePayment) => void;
  setSelectedInvoices: (ids: string[]) => void;
  setSelectedStudentClass: (v: string) => void;
  setSortBy: (v: any) => void;
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  submitting: boolean;
};

export function LedgerTab({
  classrooms,
  feeRecords,
  filterStatus,
  filterType,
  filteredRecords,
  ledgerTotal,
  ledgerPage,
  ledgerPageSize,
  onLedgerPageChange,
  onLedgerPageSizeChange,
  handleBulkCollect,
  handleBulkRemind,
  handleCollectPayment,
  handleVoidFee,
  handleDownloadReceipt,
  handleSendReminder,
  handleToggleSelectAll,
  handleToggleSelectOne,
  isAdminOrAccountant,
  isStudent,
  school,
  searchQuery,
  selectedInvoices,
  selectedStudentClass,
  setFilterStatus,
  setFilterType,
  setIsDrawerOpen,
  setSearchQuery,
  setSelectedFee,
  setSelectedInvoices,
  setSelectedStudentClass,
  setSortBy,
  setSortOrder,
  submitting,
}: LedgerTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  const feeTypeLabel = (type: string) =>
    t(`fees.feeTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  const statusLabel = (code: string) =>
    t(`fees.status.${feeStatusI18nKey(code)}`);

  const filterFields: FilterFieldDef[] = useMemo(() => {
    const statusOpts = [
      { value: "PAID", label: t("fees.status.paid") },
      { value: "PARTIAL", label: t("fees.status.partial") },
      { value: "PENDING", label: t("fees.status.pending") },
      { value: "OVERDUE", label: t("fees.status.overdue") },
      ...(!isStudent
        ? [
            { value: "VOIDED", label: t("fees.status.voided") },
            { value: "WRITTEN_OFF", label: t("fees.status.writtenOff") },
          ]
        : []),
    ];
    const fields: FilterFieldDef[] = [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("fees.ledger.allStatuses"),
        options: statusOpts,
      },
      {
        key: "type",
        label: t("common:type", { defaultValue: "Type" }),
        type: "enum",
        primary: true,
        allLabel: t("fees.ledger.allTypes"),
        options: FEE_TYPES.map((ft) => ({
          value: ft.value,
          label: feeTypeLabel(ft.value),
        })),
      },
    ];
    if (!isStudent) {
      fields.push({
        key: "classroomId",
        label: t("fees.ledger.allClasses"),
        type: "enum",
        primary: true,
        allLabel: t("fees.ledger.allClasses"),
        options: classrooms.map((c) => ({ value: c.id, label: c.name })),
      });
    }
    return fields;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, isStudent, classrooms]);

  const filterValues = {
    status: filterStatus === "ALL" ? "" : filterStatus,
    type: filterType === "ALL" ? "" : filterType,
    classroomId: selectedStudentClass === "ALL" ? "" : selectedStudentClass,
  };

  const onFilterValueChange = (key: string, value: string) => {
    if (key === "status") setFilterStatus((value || "ALL") as any);
    else if (key === "type") setFilterType(value || "ALL");
    else if (key === "classroomId") setSelectedStudentClass(value || "ALL");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("ALL");
    setFilterType("ALL");
    setSelectedStudentClass("ALL");
  };

  const pendingDue = feeRecords
    .filter((r) => isFeeOpen(r))
    .reduce((acc, curr) => acc + feeBalance(curr), 0);
  const paidTotal = feeRecords.reduce(
    (acc, curr) => acc + (Number(curr.amountPaid) || (curr.status === "PAID" ? curr.amount : 0)),
    0
  );
  const nextDue = feeRecords
    .filter((r) => isFeeOpen(r))
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];

  const openFee = (record: FeePayment) => {
    setSelectedFee(record);
    setIsDrawerOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {isStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${cardShell} p-6 flex items-center gap-4`}>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("fees.ledger.balanceDue")}
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
                {formatMoney(pendingDue)}
              </p>
            </div>
          </div>

          <div className={`${cardShell} p-6 flex items-center gap-4`}>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("fees.ledger.paid")}
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-0.5">
                {formatMoney(paidTotal)}
              </p>
            </div>
          </div>

          <div className={`${cardShell} p-6 flex items-center gap-4`}>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("fees.ledger.nextDue")}
              </p>
              <p className="text-sm font-extrabold tracking-tight text-indigo-600 mt-0.5 truncate">
                {nextDue
                  ? `${feeTypeLabel(nextDue.type)} · ${new Date(nextDue.dueDate).toLocaleDateString()}`
                  : t("fees.ledger.nothingDue")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`${cardShell} p-5 sm:p-6 space-y-4`}>
        <ListFilterBar
          fields={filterFields}
          q={searchQuery}
          onSearchChange={setSearchQuery}
          values={filterValues}
          onValueChange={onFilterValueChange}
          onClear={clearFilters}
          searchPlaceholder={
            isStudent ? t("fees.ledger.searchSelf") : t("fees.ledger.searchStudent")
          }
          shownCount={filteredRecords.length}
          totalCount={ledgerTotal ?? feeRecords.length}
          actions={
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              title={t("fees.ledger.toggleSort")}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          }
        />

        {!isStudent && selectedInvoices.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-2xl text-sm text-indigo-700 font-bold">
            <span>
              {t("fees.ledger.selected", { count: selectedInvoices.length })}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBulkCollect}
                disabled={submitting}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold disabled:opacity-50"
              >
                {t("fees.ledger.markPaid")}
              </button>
              <button
                type="button"
                onClick={handleBulkRemind}
                disabled={submitting}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-bold disabled:opacity-50"
              >
                {t("fees.ledger.logReminders")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoices([])}
                className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold"
              >
                {t("common:clear")}
              </button>
            </div>
          </div>
        )}
      </div>

      {filteredRecords.length > 0 ? (
        <div className={`${cardShell} overflow-hidden`}>
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  {!isStudent && (
                    <th className={`${dataTableClass.th} w-10`}>
                      <input
                        type="checkbox"
                        checked={
                          selectedInvoices.length > 0 &&
                          selectedInvoices.length ===
                            filteredRecords.filter((r) => isFeeOpen(r)).length
                        }
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 border-slate-300"
                      />
                    </th>
                  )}
                  <th className={dataTableClass.th}>
                    <button
                      type="button"
                      onClick={() => setSortBy("student")}
                      className="hover:text-slate-800 transition-colors font-bold"
                    >
                      {isStudent ? t("fees.ledger.school") : t("fees.ledger.student")}
                    </button>
                  </th>
                  <th className={dataTableClass.th}>
                    {t("fees.ledger.type")}
                  </th>
                  <th className={dataTableClass.th}>
                    <button
                      type="button"
                      onClick={() => setSortBy("amount")}
                      className="hover:text-slate-800 transition-colors font-bold"
                    >
                      {t("fees.ledger.amount")}
                    </button>
                  </th>
                  <th className={dataTableClass.th}>
                    <button
                      type="button"
                      onClick={() => setSortBy("dueDate")}
                      className="hover:text-slate-800 transition-colors font-bold"
                    >
                      {t("fees.ledger.dueDate")}
                    </button>
                  </th>
                  <th className={dataTableClass.th}>
                    {t("fees.ledger.status")}
                  </th>
                  <th className={`${dataTableClass.th} w-28`} />
                </tr>
              </thead>
              <tbody className={`${dataTableClass.tbody} text-sm font-medium text-slate-600`}>
                {filteredRecords.map((record) => {
                  const overdue = isFeeOverdue(record);
                  const open = isFeeOpen(record);
                  const selected = selectedInvoices.includes(record.id);
                  const label =
                    record.status === "PAID"
                      ? "PAID"
                      : record.status === "VOIDED"
                        ? "VOIDED"
                        : overdue
                          ? "OVERDUE"
                          : record.status === "PARTIAL"
                            ? "PARTIAL"
                            : "PENDING";
                  const name = isStudent
                    ? school?.name || t("fees.ledger.school")
                    : record.student?.name || t("common:student");
                  const bal = feeBalance(record);

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${
                        selected ? "bg-indigo-50/40" : ""
                      }`}
                      onClick={() => openFee(record)}
                    >
                      {!isStudent && (
                        <td
                          className={dataTableClass.td}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {open ? (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleToggleSelectOne(record.id)}
                              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 border-slate-300 cursor-pointer"
                            />
                          ) : (
                            <span className="w-4 h-4 inline-block" />
                          )}
                        </td>
                      )}
                      <td className={dataTableClass.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            userId={isStudent ? undefined : record.studentId}
                            name={name}
                            photoUrl={isStudent ? null : record.student?.photoUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {isStudent
                                ? record.student?.name || t("fees.ledger.yourInvoice")
                                : record.student?.classroomMembers?.[0]
                                    ?.classroom?.name || t("fees.ledger.noClass")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={dataTableClass.td}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
                          {feeTypeLabel(record.type)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          INV-{record.id.slice(0, 8).toUpperCase()}
                        </p>
                      </td>
                      <td className={`${dataTableClass.td} font-extrabold text-slate-900 font-mono`}>
                        {formatMoney(record.amount)}
                        {open && bal < record.amount && (
                          <p className="text-xs font-bold text-amber-600 mt-0.5">
                            {t("fees.ledger.owing", { amount: formatMoney(bal) })}
                          </p>
                        )}
                      </td>
                      <td className={`${dataTableClass.td} text-slate-500`}>
                        {new Date(record.dueDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className={dataTableClass.td}>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                            label === "PAID"
                              ? "bg-emerald-50 text-emerald-600"
                              : label === "VOIDED"
                                ? "bg-slate-100 text-slate-500"
                                : label === "OVERDUE"
                                  ? "bg-rose-50 text-rose-600"
                                  : label === "PARTIAL"
                                    ? "bg-sky-50 text-sky-700"
                                    : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {label === "PAID" ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : label === "VOIDED" ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          {statusLabel(label)}
                        </span>
                      </td>
                      <td
                        className={dataTableClass.td}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {open && isAdminOrAccountant && (
                              <>
                                {overdue && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendReminder(record.id)
                                    }
                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                    title={t("fees.ledger.logReminder")}
                                  >
                                    <Bell className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openFee(record)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                  {t("fees.ledger.collect")}
                                </button>
                                {(Number(record.amountPaid) || 0) <= 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleVoidFee(record.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                    title={t("fees.ledger.voidInvoice")}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          {open && isStudent && (
                            <button
                              type="button"
                              onClick={() => openFee(record)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              {t("fees.ledger.pay")}
                            </button>
                          )}
                          {(record.status === "PAID" || record.status === "PARTIAL") && (
                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(record)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title={t("fees.ledger.downloadReceipt")}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openFee(record)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            title={t("fees.ledger.viewDetails")}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
          {ledgerTotal != null &&
          ledgerPage != null &&
          ledgerPageSize != null &&
          onLedgerPageChange ? (
            <ListPagination
              total={ledgerTotal}
              page={ledgerPage}
              pageSize={ledgerPageSize}
              onPageChange={onLedgerPageChange}
              onPageSizeChange={onLedgerPageSizeChange}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-16 text-center px-6">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">
            {t("fees.ledger.noInvoicesTitle")}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm font-medium">
            {isStudent
              ? t("fees.ledger.noInvoicesHintStudent")
              : t("fees.ledger.noInvoicesHintAdmin")}
          </p>
        </div>
      )}
    </motion.div>
  );
}
