import React from "react";
import { useTranslation } from "react-i18next";

export function EntranceStage({
  selectedApp,
  entranceResult,
  setEntranceResult,
  entranceNotes,
  setEntranceNotes,
  blockedBy = [],
}: {
  selectedApp?: any;
  entranceResult: string;
  setEntranceResult: (v: string) => void;
  entranceNotes: string;
  setEntranceNotes: (v: string) => void;
  blockedBy?: string[];
}) {
  const { t } = useTranslation(["pages"]);
  const feeId = selectedApp?.feePaymentId;
  return (
    <div className="space-y-4">
      {blockedBy.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.waitingOn")}</p>
          <p className="mt-1 text-sm text-amber-900">{blockedBy.map((b) => t(`admissions.review.blocker.${b}`, { defaultValue: t("admissions.review.blocker.fallback") })).join(", ")}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{t("admissions.review.entranceCompletionTitle")}</p>
        <p className="text-sm text-slate-600">{t("admissions.review.stage.entrance.description", { defaultValue: "Schedule the entrance exam, then record the result before approval." })}</p>
        {selectedApp?.entranceSlotId ? (
          <p className="text-sm font-semibold text-slate-700">{t("admissions.review.stage.entrance.scheduled", { defaultValue: "Entrance slot" })}: <span className="font-mono">{selectedApp.entranceSlotId}</span></p>
        ) : null}
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.stage.enrolled.entranceTitle")}</span>
          <select value={entranceResult} onChange={(e) => setEntranceResult(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <option value="SAT">SAT</option>
            <option value="EXEMPT">EXEMPT</option>
            <option value="PASSED">PASSED</option>
            <option value="NOT_PASSED">NOT PASSED</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.entranceNotes")}</span>
          <input type="text" value={entranceNotes} onChange={(e) => setEntranceNotes(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
        </label>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-wider text-slate-600">{t("admissions.review.stage.entrance.feeTitle", { defaultValue: "Entrance fee" })}</p>
        <p className="mt-1 text-sm text-slate-600">{t("admissions.review.stage.entrance.feeHint", { defaultValue: "Finance configures entrance fees. Matching fees are applied automatically when enabled." })}</p>
        <p className="mt-2 text-xs font-semibold text-slate-700">{t("admissions.review.feePaymentId")}: <span className="font-mono">{feeId || t("admissions.review.none")}</span></p>
      </div>
    </div>
  );
}
