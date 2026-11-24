import React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DetailDrawerShell } from "../../../components/ui";
import { CATEGORY_BADGE } from "../categoryStyles";

export type TransactionDetailsModalProps = {
  open?: boolean;
  selectedTxnDetails?: any;
  setSelectedTxnDetails?: (v: any) => void;
};

export function TransactionDetailsModal({
  open = false,
  selectedTxnDetails,
  setSelectedTxnDetails,
}: TransactionDetailsModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const txn = selectedTxnDetails;
  const badge =
    CATEGORY_BADGE[txn?.category] || "bg-slate-100 text-slate-600";

  return (
    <DetailDrawerShell
      open={open && Boolean(txn)}
      onClose={() => setSelectedTxnDetails?.(null)}
      eyebrow={t("expenses.transactions.modalEyebrow")}
      title={txn?.particulars || ""}
      subtitle={txn?.refCode}
      footer={
        <button
          type="button"
          onClick={() => setSelectedTxnDetails?.(null)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
        >
          {t("common:close")}
        </button>
      }
    >
      {txn ? (
      <div className="space-y-5">
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
      ) : null}
    </DetailDrawerShell>
  );
}
