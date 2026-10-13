import React from "react";
import { useTranslation } from "react-i18next";
import { Download, Trophy } from "lucide-react";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";

export type ResultsModalProps = {
  generateReportCard?: (result: any) => void;
  resultsModal?: any;
  setResultsModal?: any;
  [key: string]: any;
};

export function ResultsModal({
  generateReportCard,
  resultsModal,
  setResultsModal,
}: ResultsModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  if (!resultsModal) return null;

  const avg =
    resultsModal.length > 0
      ? resultsModal.reduce((acc: number, r: any) => acc + r.average, 0) / resultsModal.length
      : 0;
  const passRate =
    resultsModal.length > 0
      ? Math.round(
          (resultsModal.filter((r: any) => r.average >= 50).length / resultsModal.length) * 100
        )
      : 0;

  return (
    <FeatureModalShell
      title={t("examDetails.resultsModal.title")}
      subtitle={t("examDetails.resultsModal.subtitle")}
      eyebrow={t("examDetails.resultsModal.eyebrow")}
      onClose={() => setResultsModal(null)}
      maxWidthClass="max-w-4xl"
      footer={
        <button
          type="button"
          onClick={() => setResultsModal(null)}
          className="w-full px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
        >
          {t("examDetails.resultsModal.close")}
        </button>
      }
    >
      <div className="p-6 sm:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("examDetails.resultsModal.totalStudents")}
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {resultsModal.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {t("examDetails.resultsModal.avgScore")}
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-indigo-600 font-mono">
              {avg.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {t("examDetails.resultsModal.passRate")}
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-emerald-600 font-mono">
              {passRate}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <table className="w-full text-left border-collapse min-w-[36rem]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("examDetails.resultsModal.pos")}
                </th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("examDetails.resultsModal.student")}
                </th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("examDetails.resultsModal.avgPercent")}
                </th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  {t("examDetails.resultsModal.grade")}
                </th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  {t("examDetails.resultsModal.action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {resultsModal.map((res: any) => (
                <tr key={res.student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold font-mono ${
                        res.position === 1
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : res.position === 2
                            ? "bg-slate-50 text-slate-500 border border-slate-100"
                            : res.position === 3
                              ? "bg-orange-50 text-orange-600 border border-orange-100"
                              : "bg-white text-slate-400 border border-slate-100"
                      }`}
                    >
                      {res.position}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={res.student?.id || res.studentId}
                        name={res.student?.name || t("examDetails.resultsModal.studentFallback")}
                        photoUrl={res.student?.photoUrl}
                        size="sm"
                        rounded="2xl"
                      />
                      <span className="font-bold text-slate-700">
                        {res.student?.name || t("examDetails.resultsModal.studentFallback")}
                      </span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="font-extrabold text-slate-900 font-mono">
                      {res.average.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs">
                      {res.grade}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <button
                      type="button"
                      onClick={() => generateReportCard?.(res)}
                      className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors"
                      title={t("examDetails.resultsModal.downloadReport")}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FeatureModalShell>
  );
}
