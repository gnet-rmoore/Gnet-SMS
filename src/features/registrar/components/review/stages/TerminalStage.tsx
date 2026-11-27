import React from "react";
import { useTranslation } from "react-i18next";
import { canonicalGradeName } from "../../../../academics-shared/gradeSubjectLabels";

export function TerminalStage({ app, titleRef }: { app?: any; titleRef?: React.RefObject<HTMLHeadingElement | null>; }) {
  const { t } = useTranslation(["pages"]);
  return (
    <div className="space-y-5">
      <div>
        <h4 ref={titleRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-slate-900 outline-none">{t("admissions.review.stage.terminalTitle")}</h4>
        <p className="mt-1 text-sm text-slate-600">{t("admissions.review.stage.terminalHint")}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.stage.summary.decision")}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{app?.status || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.appliedGrade")}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{canonicalGradeName(app?.gradeLevel?.name || app?.gradeLevelName) || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.stage.summary.fee")}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{app?.feePaymentId || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">{t("admissions.review.stage.summary.documents")}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{Array.isArray(app?.admissionDocuments) ? app.admissionDocuments.length : 0}</dd></div>
        </dl>
      </div>
    </div>
  );
}