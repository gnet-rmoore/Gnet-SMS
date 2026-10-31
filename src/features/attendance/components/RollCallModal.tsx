import React, { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import { UserAvatar } from "../../../components/UserAvatar";

export type RollCallModalProps = {
  selectedRecord: any;
  setShowDetailsModal: (v: boolean) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  canViewStudentHistory: boolean;
  onViewStudentHistory: (student: { id: string; name: string }) => void;
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
  loading,
  error,
  onRetry,
  canViewStudentHistory,
  onViewStudentHistory,
}: RollCallModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [studentQuery, setStudentQuery] = useState("");
  const records = Array.isArray(selectedRecord.records) ? selectedRecord.records : [];
  const statusCounts = useMemo(
    () =>
      records.reduce(
        (counts: Record<string, number>, record: any) => {
          counts[record.status] = (counts[record.status] || 0) + 1;
          return counts;
        },
        { PRESENT: 0, ABSENT: 0, EXCUSED: 0, LATE: 0 }
      ),
    [records]
  );
  const visibleRecords = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    return records.filter((record: any) => {
      if (statusFilter !== "ALL" && record.status !== statusFilter) return false;
      if (!query) return true;
      const name = record.student?.name || "";
      const email = record.student?.email || "";
      return `${name} ${email}`.toLowerCase().includes(query);
    });
  }, [records, statusFilter, studentQuery]);
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
      {loading ? (
        <div role="status" className="py-12 text-center text-sm text-slate-500">
          Loading attendance details…
        </div>
      ) : error ? (
        <div className="py-10 text-center space-y-4">
          <p role="alert" className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Retry
          </button>
        </div>
      ) : (
      <div className="space-y-6 p-5 sm:p-7">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: "PRESENT", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
            { key: "ABSENT", tone: "border-rose-100 bg-rose-50 text-rose-700" },
            { key: "EXCUSED", tone: "border-slate-200 bg-slate-50 text-slate-700" },
            { key: "LATE", tone: "border-amber-100 bg-amber-50 text-amber-700" },
          ].map(({ key, tone }) => (
            <div key={key} className={`rounded-2xl border p-4 ${tone}`}>
              <p className="text-xs font-bold uppercase tracking-wider">
                {t(`attendance.markStatus.${key}`, { defaultValue: key })}
              </p>
              <p className="mt-1 text-2xl font-extrabold font-mono">
                {statusCounts[key] || 0}
              </p>
            </div>
          ))}
        </div>

        {selectedRecord.notes && (
          <div className="p-4 bg-white border border-slate-200 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("attendance.sessionNotes")}
            </p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              {selectedRecord.notes}
            </p>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
                {t("attendance.students")}
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                {t("attendance.history.resultCount", {
                  count: visibleRecords.length,
                  total: records.length,
                  defaultValue: `${visibleRecords.length} of ${records.length} students`,
                })}
              </p>
            </div>
            <input
              type="search"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder={t("common:search", { defaultValue: "Search students" })}
              aria-label={t("common:search", { defaultValue: "Search students" })}
              className="min-h-11 w-full sm:max-w-xs rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "ALL", label: t("common:all", { defaultValue: "All" }), count: records.length },
              ...["PRESENT", "ABSENT", "EXCUSED", "LATE"].map((key) => ({
                key,
                label: t(`attendance.markStatus.${key}`, { defaultValue: key }),
                count: statusCounts[key] || 0,
              })),
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={statusFilter === filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`shrink-0 min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  statusFilter === filter.key
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label} <span className="ml-1 font-mono">{filter.count}</span>
              </button>
            ))}
          </div>

          {visibleRecords.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              {t("attendance.history.empty", {
                defaultValue: "No attendance records match these filters.",
              })}
            </p>
          ) : (
            <div className="space-y-2">
          {visibleRecords.map((r: any) => {
            const name = r.student?.name || t("attendance.studentFallback");
            const statusKey = r.status as keyof typeof statusClass;
            const statusLabel = t(`attendance.markStatus.${r.status}`, {
              defaultValue: r.status,
            });
            return (
              <div
                key={r.id}
                className="flex flex-col p-4 bg-white rounded-2xl border border-slate-200 gap-3 hover:border-slate-300 transition-colors"
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
                {canViewStudentHistory && r.student?.id && (
                  <button
                    type="button"
                    onClick={() =>
                      onViewStudentHistory({
                        id: r.student.id,
                        name,
                      })
                    }
                    className="self-start ml-[3.25rem] min-h-9 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {t("attendance.history.open", {
                      defaultValue: "Student history",
                    })}
                  </button>
                )}
              </div>
            );
          })}
            </div>
          )}
        </section>
      </div>
      )}
    </FeatureModalShell>
  );
}
