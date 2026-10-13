import React from "react";
import { useTranslation } from "react-i18next";
import { History, Clock } from "lucide-react";
import { format } from "date-fns";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";

export type HistoryModalProps = {
  historyModal?: any;
  setHistoryModal?: any;
  user?: any;
  [key: string]: any;
};

export function HistoryModal({ historyModal, setHistoryModal }: HistoryModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  if (!historyModal) return null;

  return (
    <FeatureModalShell
      title={t("examDetails.historyModal.title")}
      subtitle={t("examDetails.historyModal.subtitle", { name: historyModal.student.name })}
      eyebrow={t("examDetails.historyModal.eyebrow")}
      onClose={() => setHistoryModal(null)}
      maxWidthClass="max-w-lg"
      footer={
        <button
          type="button"
          onClick={() => setHistoryModal(null)}
          className="w-full px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
        >
          {t("examDetails.historyModal.close")}
        </button>
      }
    >
      <div className="p-6 sm:p-8 space-y-6">
        {historyModal.history.length > 0 ? (
          historyModal.history.map((entry: any) => (
            <div key={entry.id} className="relative pl-8 border-l-2 border-slate-100 pb-8 last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-600" />
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${
                      entry.status === "ACCEPTED"
                        ? "bg-emerald-50 text-emerald-600"
                        : entry.status === "REJECTED"
                          ? "bg-rose-50 text-rose-600"
                          : entry.status === "SUBMITTED"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t(`common:gradeStatus.${entry.status}`, { defaultValue: entry.status })}
                  </span>
                  <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3" />
                    {format(new Date(entry.changedAt), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">
                    {t("examDetails.historyModal.score")}:{" "}
                    <span className="text-indigo-600 text-lg ml-1 font-mono">
                      {entry.score !== null ? `${entry.score}%` : t("examDetails.historyModal.scoreNa")}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                    <UserAvatar
                      userId={entry.user?.id || entry.changedBy}
                      name={entry.user?.name}
                      photoUrl={entry.user?.photoUrl}
                      size="xs"
                      rounded="2xl"
                    />
                    <p className="text-xs text-slate-600 font-bold">
                      {entry.user?.name || t("examDetails.historyModal.staffFallback")}
                    </p>
                  </div>
                </div>
                {entry.feedback && (
                  <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 italic leading-relaxed">
                    &ldquo;{entry.feedback}&rdquo;
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-lg font-extrabold tracking-tight text-slate-900">
              {t("examDetails.historyModal.noHistory")}
            </h4>
            <p className="text-slate-500 font-medium mt-2">
              {t("examDetails.historyModal.noHistoryHint")}
            </p>
          </div>
        )}
      </div>
    </FeatureModalShell>
  );
}
