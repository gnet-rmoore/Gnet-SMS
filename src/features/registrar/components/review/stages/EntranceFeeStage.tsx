import React from "react";
import { useTranslation } from "react-i18next";

export function EntranceFeeStage({ selectedApp, entranceFeeAmount = "", setEntranceFeeAmount, waiveFee = false, setWaiveFee, waiveDocs = false, setWaiveDocs, blockedBy = [] }: { selectedApp?: any; entranceFeeAmount?: string; setEntranceFeeAmount?: (v: string) => void; waiveFee?: boolean; setWaiveFee?: (v: boolean) => void; waiveDocs?: boolean; setWaiveDocs?: (v: boolean) => void; blockedBy?: string[]; }) {
  const { t } = useTranslation(["pages"]);
  const amount = Number(entranceFeeAmount || 0);
  return (
    <div className="space-y-4">
      {blockedBy.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.waitingOn")}</p>
          <p className="mt-1 text-sm text-amber-900">{blockedBy.map((b) => t(`admissions.review.blocker.${b}`, { defaultValue: t("admissions.review.blocker.fallback") })).join(", ")}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <p className="text-xs text-slate-500 font-medium">{t("admissions.review.feePaymentId")} <span className="font-mono text-slate-700">{selectedApp?.feePaymentId || t("admissions.review.none")}</span>{" · "}{t("admissions.review.feeStatus")} {selectedApp?.status}</p>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.entranceFeeTitle")}</span>
          <input type="number" min="0" step="0.01" value={entranceFeeAmount} onChange={(e) => setEntranceFeeAmount?.(e.target.value)} placeholder={t("admissions.review.amountPlaceholder")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
        </label>
        {amount <= 0 ? <p className="text-sm font-semibold text-slate-600">{t("admissions.review.stage.feeNotRequired")}</p> : null}
        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer"><input type="checkbox" checked={waiveFee} onChange={(e) => setWaiveFee?.(e.target.checked)} className="rounded border-slate-300" />{t("admissions.review.waiveFee")}</label>
        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer"><input type="checkbox" checked={waiveDocs} onChange={(e) => setWaiveDocs?.(e.target.checked)} className="rounded border-slate-300" />{t("admissions.review.waiveDocs")}</label>
      </div>
    </div>
  );
}