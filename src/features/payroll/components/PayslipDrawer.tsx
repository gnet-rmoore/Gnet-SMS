import React, { useState } from "react";
import { CreditCard, CheckCircle2, Clock, Printer, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import type { PayrollRecord } from "../types";
import {
  formatMoney,
  getCurrencySymbol,
  getMonthName,
  parsePayrollNotes,
} from "../utils";
import { receiptsApi } from "../../../services/receiptsApi";

export type PayslipDrawerProps = {
  isDetailModalOpen: boolean;
  school: { id?: string; name?: string; contactEmail?: string } | null | undefined;
  selectedRecord: PayrollRecord | null;
  setIsDetailModalOpen: (open: boolean) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
};

export function PayslipDrawer({
  isDetailModalOpen,
  school,
  selectedRecord,
  setIsDetailModalOpen,
  showToast,
}: PayslipDrawerProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadOfficial = async (record: PayrollRecord) => {
    if (record.status !== "PAID") return;
    if (!school?.id) {
      showToast?.(t("pages:payroll.toast.sessionMissing"), "error");
      return;
    }
    setDownloading(true);
    try {
      const notes = parsePayrollNotes(record.notes);
      await receiptsApi.downloadForSource(school.id, "PAYSLIP", record.id, {
        staffName: record.user?.name || "Staff",
        schoolName: school.name,
        month: record.month,
        year: record.year,
        basicSalary: record.basicSalary,
        allowances: record.allowances,
        deductions: record.deductions,
        netSalary: record.netSalary,
        currency: notes.currency || "USD",
      });
      showToast?.(t("pages:payroll.toast.payslipDownloaded"), "success");
    } catch (err: any) {
      showToast?.(
        err?.message || t("pages:payroll.toast.payslipUnavailable"),
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isDetailModalOpen && selectedRecord && (() => {
        const notes = parsePayrollNotes(selectedRecord.notes);
        const symbol = getCurrencySymbol(notes.currency);
        const isPaid = selectedRecord.status === "PAID";

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2 }}
              className="relative bg-slate-50 w-full max-w-lg h-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] flex flex-col border-l border-slate-100"
            >
              <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("pages:payroll.payslip.eyebrow")}
                  </p>
                  <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                    {getMonthName(selectedRecord.month)} {selectedRecord.year}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={t("common:close")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-3">
                    <div className="min-w-0">
                      <h4 className="font-extrabold tracking-tight text-slate-900 text-sm truncate">
                        {school?.name || t("pages:payroll.payslip.schoolFallback")}
                      </h4>
                      {school?.contactEmail && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                          {school.contactEmail}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {isPaid ? t("common:paid") : t("common:pending")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("pages:payroll.payslip.employee")}
                      </p>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {selectedRecord.user?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("pages:payroll.payslip.role")}
                      </p>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {selectedRecord.user?.role || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("pages:payroll.payslip.employment")}
                      </p>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {notes.employmentType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("pages:payroll.payslip.taxId")}
                      </p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5 text-xs">
                        {notes.taxId || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      {t("pages:payroll.payslip.earnings")}
                    </p>
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                      <span>{t("pages:payroll.payslip.basicSalary")}</span>
                      <span className="font-mono">
                        {formatMoney(selectedRecord.basicSalary, symbol)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-emerald-600">
                      <span>{t("pages:payroll.payslip.allowances")}</span>
                      <span className="font-mono">
                        +{formatMoney(selectedRecord.allowances, symbol)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      {t("pages:payroll.payslip.deductionsSection")}
                    </p>
                    <div className="flex justify-between text-sm font-medium text-rose-500">
                      <span>{t("pages:payroll.payslip.deductions")}</span>
                      <span className="font-mono">
                        −{formatMoney(selectedRecord.deductions, symbol)}
                      </span>
                    </div>
                  </div>

                  {(notes.iban || notes.swift) && (
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                        {t("pages:payroll.payslip.bankDetails")}
                      </p>
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {notes.swift && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold">
                              {t("pages:payroll.payslip.swiftBic")}
                            </p>
                            <p className="font-bold text-slate-700 font-mono text-xs">
                              {notes.swift}
                            </p>
                          </div>
                        )}
                        {notes.iban && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold">
                              {t("pages:payroll.payslip.iban")}
                            </p>
                            <p className="font-bold text-slate-700 font-mono text-xs break-all">
                              {notes.iban}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-indigo-600 text-white p-4 rounded-2xl">
                    <div>
                      <p className="text-xs text-indigo-100 font-bold uppercase tracking-wider">
                        {t("pages:payroll.payslip.netPay")}
                      </p>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        {notes.currency}
                      </p>
                    </div>
                    <span className="text-2xl font-extrabold font-mono tracking-tight">
                      {formatMoney(selectedRecord.netSalary, symbol)}
                    </span>
                  </div>

                  {notes.customNotes && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        {t("pages:payroll.payslip.notes")}
                      </p>
                      {notes.customNotes}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-3 shrink-0">
                {isPaid && (
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void handleDownloadOfficial(selectedRecord)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {downloading
                      ? t("pages:payroll.payslip.downloading")
                      : t("pages:payroll.payslip.downloadOfficial")}
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    {t("pages:payroll.payslip.printPreview")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    {t("common:close")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
}
