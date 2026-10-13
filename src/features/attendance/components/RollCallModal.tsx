import React from "react";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";

export type RollCallModalProps = {
  selectedRecord: any;
  setShowDetailsModal: (v: boolean) => void;
};

const statusClass = (status: string) => {
  switch (status) {
    case "PRESENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "LATE":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "EXCUSED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-rose-50 text-rose-700 border-rose-100";
  }
};

export function RollCallModal({
  selectedRecord,
  setShowDetailsModal,
}: RollCallModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const sessionDate = new Date(selectedRecord.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <FeatureModalShell
      title={selectedRecord.classroom?.name || t("attendance.rollCall")}
      subtitle={t("attendance.takenBy", {
        name: selectedRecord.teacher?.name || t("attendance.staff").toLowerCase(),
        date: sessionDate,
      })}
      eyebrow={t("attendance.sessionEyebrow")}
      onClose={() => setShowDetailsModal(false)}
      wide
      footer={
        <button
          type="button"
          onClick={() => setShowDetailsModal(false)}
          className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm"
        >
          {t("common:close")}
        </button>
      }
    >
      <div className="space-y-6 max-h-[min(70vh,560px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 text-center">
            <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">
              {t("attendance.presentLate")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-emerald-800 font-mono mt-1">
              {selectedRecord.presentCount}
            </p>
          </div>
          <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-100 text-center">
            <p className="text-rose-600 text-xs font-bold uppercase tracking-wider">
              {t("attendance.absent")}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-rose-800 font-mono mt-1">
              {selectedRecord.absentCount}
            </p>
          </div>
        </div>

        {selectedRecord.notes && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("attendance.sessionNotes")}
            </p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              {selectedRecord.notes}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("attendance.students")}
          </h4>
          {(selectedRecord.records || []).map((r: any) => {
            const name = r.student?.name || t("attendance.studentFallback");
            const statusKey = r.status as keyof typeof statusClass;
            const statusLabel = t(`attendance.markStatus.${r.status}`, {
              defaultValue: r.status,
            });
            return (
              <div
                key={r.id}
                className="flex flex-col p-3.5 bg-white rounded-2xl border border-slate-100 gap-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      name={name}
                      photoUrl={r.student?.photoUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold tracking-tight text-slate-900 text-sm truncate">
                        {name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {r.student?.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${statusClass(
                      statusKey
                    )}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                {r.notes && (
                  <div className="flex items-start gap-2 pl-[3.25rem] text-xs text-slate-500">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="min-w-0 leading-relaxed">{r.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </FeatureModalShell>
  );
}
