import React from "react";
import { useTranslation } from "react-i18next";

export function StageHeader({ step, total, title, description, titleRef }: { step: number | null; total: number; title: string; description: string; titleRef?: React.RefObject<HTMLHeadingElement | null>; }) {
  const { t } = useTranslation(["pages"]);
  return (
    <div className="space-y-1">
      {step ? <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{t("admissions.review.stage.stepOf", { current: step, total })}</p> : null}
      <h4 ref={titleRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-slate-900 outline-none">{title}</h4>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

export function StageHistoryBanner({ stageLabel, onReturn, headingRef }: { stageLabel: string; onReturn: () => void; headingRef?: React.RefObject<HTMLDivElement | null>; }) {
  const { t } = useTranslation(["pages"]);
  return (
    <div className="shrink-0 border-b border-indigo-100 bg-indigo-50 px-5 py-3 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-700">{t("admissions.review.stage.historyTitle", { defaultValue: "Read-only history" })}</p>
          <p className="mt-1 text-sm font-medium text-indigo-900">{t("admissions.review.stage.historyHint", { stage: stageLabel, defaultValue: "This stage is complete. Return to the current stage to make changes." })}</p>
        </div>
        <button type="button" onClick={onReturn} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          {t("admissions.review.stage.returnToCurrent", { defaultValue: "Return to current stage" })}
        </button>
      </div>
    </div>
  );
}