import React, { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  Wallet,
} from "lucide-react";
import { formatSafe } from "../utils/dateHelpers";
import { parsePayrollNotes, formatMoney, getCurrencySymbol } from "../../../features/payroll/utils";
import { receiptsApi } from "../../../services/receiptsApi";
import { DataTable, dataTableClass } from "../../../components/ui";

export type PayrollTabProps = {
  payrolls: any[];
  user: any;
  school: any;
  expandedPayrollId: string | null;
  setExpandedPayrollId: (id: string | null) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
};

export function PayrollTab({
  payrolls,
  user,
  school,
  expandedPayrollId,
  setExpandedPayrollId,
  showToast,
}: PayrollTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const latest = payrolls[0];
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const money = (amount: number, notesStr?: string | null) => {
    const notes = parsePayrollNotes(notesStr);
    return formatMoney(amount, getCurrencySymbol(notes.currency));
  };

  const handleDownloadPayslip = async (payroll: any) => {
    if (payroll.status !== "PAID") {
      showToast?.(t("staffPortal.toast.payslipAfterPaid"), "info");
      return;
    }
    if (!school?.id) {
      showToast?.(t("staffPortal.toast.sessionMissing"), "error");
      return;
    }
    setDownloadingId(payroll.id);
    try {
      await receiptsApi.downloadForSource(school.id, "PAYSLIP", payroll.id);
      showToast?.(t("staffPortal.toast.payslipDownloaded"), "success");
    } catch (err: any) {
      showToast?.(err?.message || t("staffPortal.toast.payslipUnavailable"), "error");
    } finally {
      setDownloadingId(null);
    }
  };
  return (
    <motion.div
      key="payroll"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("staffPortal.payroll.latestBasic")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {latest ? money(Number(latest.basicSalary || 0), latest.notes) : "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("staffPortal.payroll.latestAllowances")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {latest ? money(Number(latest.allowances || 0), latest.notes) : "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-indigo-300 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("staffPortal.payroll.latestNet")}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {latest ? money(Number(latest.netSalary || 0), latest.notes) : "—"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("staffPortal.payroll.myPayslips")}
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {t("staffPortal.payroll.myPayslipsHint")}
          </p>
        </div>

        {payrolls.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium">
              {t("staffPortal.payroll.empty")}
            </p>
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("staffPortal.payroll.colPeriod")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.payroll.colBasic")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.payroll.colAllowances")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.payroll.colDeductions")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.payroll.colNet")}</th>
                  <th className={dataTableClass.th}>{t("staffPortal.payroll.colStatus")}</th>
                  <th className={dataTableClass.thEnd}>{t("staffPortal.payroll.colDetails")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {payrolls.map((payroll) => {
                  const isExpanded = expandedPayrollId === payroll.id;
                  return (
                    <React.Fragment key={payroll.id}>
                      <tr
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedPayrollId(isExpanded ? null : payroll.id)
                        }
                      >
                        <td className={`${dataTableClass.td} font-bold text-slate-900`}>
                          {formatSafe(
                            new Date(payroll.year, payroll.month - 1),
                            "MMMM yyyy"
                          )}
                        </td>
                        <td className={`${dataTableClass.td} font-mono text-sm text-slate-600`}>
                          {money(Number(payroll.basicSalary || 0), payroll.notes)}
                        </td>
                        <td className={`${dataTableClass.td} font-mono text-sm text-emerald-600`}>
                          +{money(Number(payroll.allowances || 0), payroll.notes)}
                        </td>
                        <td className={`${dataTableClass.td} font-mono text-sm text-rose-500`}>
                          −{money(Number(payroll.deductions || 0), payroll.notes)}
                        </td>
                        <td className={`${dataTableClass.td} font-mono text-sm font-extrabold text-slate-900`}>
                          {money(Number(payroll.netSalary || 0), payroll.notes)}
                        </td>
                        <td className={dataTableClass.td}>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                              payroll.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {payroll.status === "PAID" ? t("common:paid") : t("common:pending")}
                          </span>
                        </td>
                        <td className={`${dataTableClass.td} text-end`}>
                          <span className="inline-flex p-2 text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-5 bg-slate-50 border-t border-b border-slate-100"
                          >
                            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
                              <div className="text-center border-b border-dashed border-slate-200 pb-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  {t("staffPortal.payroll.payslip")}
                                </p>
                                <p className="text-base font-extrabold tracking-tight text-slate-900 mt-1">
                                  {school?.name || t("staffPortal.payroll.schoolFallback")}
                                </p>
                                <p className="text-xs font-mono text-slate-500 mt-1">
                                  {t("staffPortal.payroll.ref", {
                                    id: payroll.id.substring(0, 8).toUpperCase(),
                                  })}
                                </p>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-500">
                                  <span>{t("staffPortal.payroll.employee")}</span>
                                  <span className="font-bold text-slate-900">
                                    {user?.name}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                  <span>{t("staffPortal.payroll.period")}</span>
                                  <span className="font-bold text-slate-900">
                                    {formatSafe(
                                      new Date(payroll.year, payroll.month - 1),
                                      "MMMM yyyy"
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="border-t border-b border-slate-100 py-3 space-y-2.5 text-sm">
                                <div className="flex justify-between text-slate-700">
                                  <span className="font-medium">{t("staffPortal.payroll.basicSalary")}</span>
                                  <span className="font-mono font-bold">
                                    {money(Number(payroll.basicSalary || 0), payroll.notes)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                  <span className="font-medium">{t("staffPortal.payroll.allowances")}</span>
                                  <span className="font-mono font-bold">
                                    +{money(Number(payroll.allowances || 0), payroll.notes)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-rose-500">
                                  <span className="font-medium">{t("staffPortal.payroll.deductions")}</span>
                                  <span className="font-mono font-bold">
                                    −{money(Number(payroll.deductions || 0), payroll.notes)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-1">
                                <div>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {t("staffPortal.payroll.netPay")}
                                  </p>
                                  <p className="text-xl font-extrabold text-indigo-700 font-mono tracking-tight">
                                    {money(Number(payroll.netSalary || 0), payroll.notes)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={downloadingId === payroll.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleDownloadPayslip(payroll);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    {downloadingId === payroll.id ? "…" : t("staffPortal.payroll.officialPdf")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.print();
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    {t("staffPortal.payroll.print")}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
