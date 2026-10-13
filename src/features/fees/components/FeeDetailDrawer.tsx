import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  CreditCard,
  Download,
  Clock,
  CheckCircle2,
  Ban,
  ExternalLink,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PAYMENT_METHODS,
  displayFeeStatus,
  feeAmountPaid,
  feeBalance,
  feeStatusI18nKey,
  isFeeOpen,
  type FeePayment,
  type FeePaymentTxn,
} from "../types";
import { feesApi } from "../api";
import { formatMoney } from "../../../i18n/format";

export type FeeDetailDrawerProps = {
  handleCollectPayment: (
    id: string,
    opts?: { amount?: number; method?: string; notes?: string; confirmStale?: boolean }
  ) => void | Promise<void>;
  handleVoidFee: (id: string) => void;
  handleWriteOffFee?: (id: string) => void;
  handleDownloadReceipt: (record: FeePayment, receiptId?: string | null) => void | Promise<void>;
  handleStudentSelfPay: (id: string, amount?: number) => void;
  isAdminOrAccountant: boolean;
  isStudent: boolean;
  isParent?: boolean;
  payingFeeId: string | null;
  selectedFee: FeePayment;
  setIsDrawerOpen: (open: boolean) => void;
  schoolName?: string;
};

export function FeeDetailDrawer({
  handleCollectPayment,
  handleVoidFee,
  handleWriteOffFee,
  handleDownloadReceipt,
  handleStudentSelfPay,
  isAdminOrAccountant,
  isStudent,
  isParent,
  payingFeeId,
  selectedFee,
  setIsDrawerOpen,
  schoolName,
}: FeeDetailDrawerProps) {
  const { t } = useTranslation(["pages", "common"]);
  const balance = feeBalance(selectedFee);
  const paid = feeAmountPaid(selectedFee);
  const statusCode = displayFeeStatus(selectedFee);
  const statusLabel = t(`fees.status.${feeStatusI18nKey(statusCode)}`);
  const open = isFeeOpen(selectedFee);
  const [payAmount, setPayAmount] = useState(String(balance || selectedFee.amount));
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [txns, setTxns] = useState<FeePaymentTxn[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(false);

  const feeTypeLabel = (type: string) =>
    t(`fees.feeTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  const paymentMethodLabel = (value: string) =>
    t(`fees.paymentMethods.${value}`, { defaultValue: value });

  useEffect(() => {
    setPayAmount(String(balance > 0 ? balance : selectedFee.amount));
    setMethod("CASH");
    setNotes("");
  }, [selectedFee.id, balance, selectedFee.amount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTxnsLoading(true);
      try {
        const rows = await feesApi.fetchFeePayments(selectedFee.id);
        if (!cancelled) setTxns(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setTxns([]);
      } finally {
        if (!cancelled) setTxnsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFee.id, selectedFee.amountPaid, selectedFee.status]);

  const submitCollect = () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    void handleCollectPayment(selectedFee.id, { amount, method, notes: notes || undefined });
  };

  const portalPay = () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    handleStudentSelfPay(selectedFee.id, amount);
  };

  const timelineStatusTitle = () => {
    if (selectedFee.status === "PAID") return t("fees.drawer.paidInFull");
    if (selectedFee.status === "WRITTEN_OFF") return t("fees.drawer.balanceWrittenOff");
    if (selectedFee.status === "VOIDED") return t("fees.drawer.invoiceVoided");
    if (selectedFee.status === "PARTIAL") return t("fees.drawer.partiallyPaid");
    return t("fees.drawer.awaitingPayment");
  };

  const timelineStatusHint = () => {
    if (selectedFee.status === "PAID" && selectedFee.paidAt) {
      return t("fees.drawer.settledOn", {
        date: new Date(selectedFee.paidAt).toLocaleDateString(),
      });
    }
    if (selectedFee.status === "WRITTEN_OFF") return t("fees.drawer.writtenOffHint");
    if (selectedFee.status === "VOIDED") return t("fees.drawer.voidedHint");
    return t("fees.drawer.dueOn", {
      date: new Date(selectedFee.dueDate).toLocaleDateString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => setIsDrawerOpen(false)}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.2 }}
        className="relative bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200"
      >
        <div className="p-6 bg-gradient-to-br from-slate-950 to-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("fees.drawer.invoiceDetail")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight mt-1 truncate">
              {feeTypeLabel(selectedFee.type)}
            </h2>
            <p className="text-sm text-slate-300 font-mono mt-1">
              INV-{selectedFee.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
            aria-label={t("fees.drawer.closeAria")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t("fees.drawer.timeline")}
            </h4>
            <div className="space-y-4 relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              <div className="relative flex gap-3 text-sm">
                <span className="absolute -left-[19px] top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white" />
                <div>
                  <p className="font-bold text-slate-800">{t("fees.drawer.invoiceCreated")}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(
                      selectedFee.createdAt || selectedFee.dueDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="relative flex gap-3 text-sm">
                <span
                  className={`absolute -left-[19px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    selectedFee.status === "PAID"
                      ? "bg-emerald-500"
                      : selectedFee.status === "VOIDED"
                        ? "bg-slate-400"
                        : selectedFee.status === "PARTIAL"
                          ? "bg-sky-500"
                          : "bg-amber-400"
                  }`}
                />
                <div>
                  <p className="font-bold text-slate-800">{timelineStatusTitle()}</p>
                  <p className="text-xs text-slate-500">{timelineStatusHint()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                  {t("fees.drawer.billedTo")}
                </p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedFee.student?.name || t("common:student")}
                </p>
                {schoolName && (
                  <p className="text-xs text-slate-500 mt-0.5">{schoolName}</p>
                )}
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  statusCode === "PAID"
                    ? "bg-emerald-50 text-emerald-600"
                    : statusCode === "WRITTEN_OFF"
                      ? "bg-violet-50 text-violet-700"
                      : statusCode === "VOIDED"
                        ? "bg-slate-100 text-slate-500"
                        : statusCode === "OVERDUE"
                          ? "bg-rose-50 text-rose-600"
                          : statusCode === "PARTIAL"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-600"
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("fees.drawer.billed")}
                </p>
                <p className="font-mono font-extrabold text-slate-900 mt-1">
                  {formatMoney(selectedFee.amount)}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-wider">
                  {t("fees.ledger.paid")}
                </p>
                <p className="font-mono font-extrabold text-emerald-700 mt-1">
                  {formatMoney(paid)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[11px] font-bold text-amber-600/80 uppercase tracking-wider">
                  {t("fees.drawer.balance")}
                </p>
                <p className="font-mono font-extrabold text-amber-700 mt-1">
                  {formatMoney(balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("fees.drawer.paymentHistory")}
            </h4>
            <p className="text-xs text-slate-500">{t("fees.drawer.paymentHistoryHint")}</p>
            {txnsLoading ? (
              <p className="text-sm text-slate-400">{t("common:loading")}</p>
            ) : txns.length === 0 ? (
              <p className="text-sm text-slate-400">{t("fees.drawer.noPaymentsYet")}</p>
            ) : (
              <div className="space-y-2">
                {txns.map((txn) => (
                  <div
                    key={txn.id}
                    className="rounded-xl border border-slate-100 p-3 text-sm space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-slate-800 font-mono">
                        {formatMoney(Number(txn.amount))}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(txn.paidAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {txn.kind && txn.kind !== "PAYMENT" && (
                        <>
                          {t(`fees.eventKinds.${txn.kind}`, {
                            defaultValue: txn.kind.replace(/_/g, " "),
                          })}{" "}
                          ·{" "}
                        </>
                      )}
                      {t("fees.drawer.txnDetailPayment", {
                        before: formatMoney(Number(txn.balanceBefore)),
                        after: formatMoney(Number(txn.balanceAfter)),
                        method: paymentMethodLabel(txn.method),
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("fees.drawer.recordedBy", {
                        name: txn.recordedByName || t("fees.drawer.staff"),
                      })}
                      {txn.payerName
                        ? t("fees.drawer.payerSuffix", { name: txn.payerName })
                        : ""}
                    </p>
                    {txn.receiptId && (
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(selectedFee, txn.receiptId)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {t("fees.drawer.receipt")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdminOrAccountant && open && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("fees.drawer.recordPayment")}
              </h4>
              <p className="text-xs text-slate-500">{t("fees.drawer.recordPaymentHint")}</p>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("common:amount")}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("fees.drawer.method")}
                </span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {paymentMethodLabel(m.value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("common:notes")}
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("fees.drawer.notesPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(String(balance))}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  {t("fees.drawer.fullBalance")}
                </button>
                <button
                  type="button"
                  onClick={submitCollect}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t("fees.drawer.record")}
                </button>
              </div>
            </div>
          )}

          {(isStudent || isParent) && open && (
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white p-5 rounded-[24px] space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    {t("fees.drawer.secureCheckout")}
                  </p>
                  <h4 className="text-sm font-extrabold tracking-tight mt-1">
                    {t("fees.drawer.payTowardInvoice")}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {t("fees.drawer.payUpToHint", { amount: formatMoney(balance) })}
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-indigo-400 shrink-0" />
              </div>
              <input
                type="number"
                min="1"
                step="0.01"
                max={balance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-mono text-white"
              />
              <button
                type="button"
                onClick={portalPay}
                disabled={payingFeeId !== null}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {payingFeeId !== null ? (
                  t("fees.drawer.openingCheckout")
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    {t("fees.drawer.payAmount", {
                      amount: formatMoney(Number(payAmount || 0)),
                    })}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-200 flex flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="flex-1 min-w-[100px] py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
          >
            {t("common:close")}
          </button>
          {(selectedFee.status === "PAID" || selectedFee.status === "PARTIAL") && (
            <button
              type="button"
              onClick={() => handleDownloadReceipt(selectedFee)}
              className="flex-1 min-w-[120px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("fees.drawer.officialReceipt")}
            </button>
          )}
          {isAdminOrAccountant && open && paid <= 0 && (
            <button
              type="button"
              onClick={() => handleVoidFee(selectedFee.id)}
              className="py-3 px-4 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 font-bold rounded-xl text-sm flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-4 h-4" />
              {t("fees.drawer.void")}
            </button>
          )}
          {isAdminOrAccountant && open && paid > 0 && handleWriteOffFee && (
            <button
              type="button"
              onClick={() => handleWriteOffFee(selectedFee.id)}
              className="py-3 px-4 border border-slate-200 text-violet-700 hover:bg-violet-50 hover:border-violet-100 font-bold rounded-xl text-sm transition-colors"
            >
              {t("fees.drawer.writeOff")}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
