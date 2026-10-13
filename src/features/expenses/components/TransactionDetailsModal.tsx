import React from "react";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { CATEGORY_BADGE } from "../categoryStyles";

export type TransactionDetailsModalProps = {
  selectedTxnDetails?: any;
  setSelectedTxnDetails?: (v: any) => void;
};

export function TransactionDetailsModal({
  selectedTxnDetails,
  setSelectedTxnDetails,
}: TransactionDetailsModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const txn = selectedTxnDetails;
  if (!txn) return null;

  const badge =
    CATEGORY_BADGE[txn.category] || "bg-slate-100 text-slate-600";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-slate-900/40"
          onClick={() => setSelectedTxnDetails?.(null)}
        />
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[32px] border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] flex flex-col overflow-hidden"
        >
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-6 py-5 text-white flex items-start justify-between gap-3 shrink-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("expenses.transactions.modalEyebrow")}
              </p>
              <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                {txn.particulars}
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-1">
                {txn.refCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTxnDetails?.(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t("common:close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${badge}`}
              >
                {t(`expenses.categories.${txn.category}`, { defaultValue: txn.category })}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  txn.type === "INFLOW"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {t(`expenses.txnType.${txn.type}`, { defaultValue: txn.type })}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  txn.status === "SETTLED"
                    ? "bg-emerald-50 text-emerald-700"
                    : txn.status === "VOID"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {t(`expenses.txnStatus.${txn.status}`, { defaultValue: txn.status })}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("expenses.transactions.colAmount")}
              </p>
              <p
                className={`text-3xl font-extrabold tracking-tight font-mono mt-1 ${
                  txn.type === "INFLOW" ? "text-emerald-600" : "text-slate-900"
                }`}
              >
                {txn.type === "INFLOW" ? "+" : "−"}$
                {Number(txn.amount).toLocaleString()}
              </p>
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("common:date")}
                </dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {txn.date instanceof Date
                    ? txn.date.toLocaleDateString()
                    : String(txn.date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("expenses.transactions.colParty")}
                </dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {txn.party || "—"}
                </dd>
              </div>
              {txn.notes ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("common:notes")}
                  </dt>
                  <dd className="font-medium text-slate-600 mt-0.5">
                    {txn.notes}
                  </dd>
                </div>
              ) : null}
            </dl>

            {txn.receipt ? (
              <a
                href={txn.receipt}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                {t("expenses.transactions.openReceipt")}
              </a>
            ) : null}
          </div>

          <div className="p-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedTxnDetails?.(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
            >
              {t("common:close")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
