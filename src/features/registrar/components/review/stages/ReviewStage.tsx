import React from "react";
import { useTranslation } from "react-i18next";

export function ReviewStage({ evaluationData, setEvaluationData, blockedBy = [] }: { evaluationData: any; setEvaluationData?: any; blockedBy?: string[]; }) {
  const { t } = useTranslation(["pages"]);
  const interviewOptions = (["1", "2", "3", "4", "5"] as const).map((n) => ({ value: n, label: t(`admissions.review.interview.${n}`, { defaultValue: `${n} / 5` }) }));
  return (
    <div className="space-y-4">
      {blockedBy.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">{t("admissions.review.stage.waitingOn", { defaultValue: "Waiting on" })}</p>
          <p className="mt-1 text-sm text-amber-900">{blockedBy.map((b) => t(`admissions.review.blocker.${b}`, { defaultValue: b })).join(", ")}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.placementScore")}</span>
          <input type="number" min="0" max="100" value={evaluationData?.testScore ?? ""} onChange={(e) => setEvaluationData?.({ ...evaluationData, testScore: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" placeholder={t("admissions.review.scorePlaceholder")} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.interviewRating")}</span>
          <select value={evaluationData?.interviewRating ?? "3"} onChange={(e) => setEvaluationData?.({ ...evaluationData, interviewRating: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            {interviewOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("admissions.review.evaluationComments")}</span>
          <textarea rows={3} value={evaluationData?.comments ?? ""} onChange={(e) => setEvaluationData?.({ ...evaluationData, comments: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" placeholder={t("admissions.review.commentsPlaceholder")} />
        </label>
      </div>
    </div>
  );
}