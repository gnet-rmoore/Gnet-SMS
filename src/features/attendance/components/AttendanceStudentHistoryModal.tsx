import { useEffect, useMemo, useState } from "react";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import { Button } from "../../../components/ui";
import { attendanceApi } from "../api";
import { useTranslation } from "react-i18next";

type AttendanceSession = {
  id: string;
  date: string;
  classroom?: { name?: string };
  records?: Array<{ status: string; notes?: string | null }>;
};

type ClassroomOption = { id: string; name: string };

const PAGE_SIZE = 50;

export function AttendanceStudentHistoryModal({
  student,
  schoolId,
  classrooms,
  onClose,
}: {
  student: { id: string; name: string };
  schoolId: string;
  classrooms: ClassroomOption[];
  onClose: () => void;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const [classroomId, setClassroomId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSessions([]);
    setPage(1);
    attendanceApi
      .fetchAttendance(schoolId, {
        studentId: student.id,
        classroomId,
        status,
        from,
        to,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      .then((response: any) => {
        if (!active) return;
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
            ? response.items
            : [];
        setSessions(items);
        setTotal(Number(response?.total ?? items.length));
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : t("attendance.history.loadFailed", {
                  defaultValue: "Could not load student attendance history.",
                })
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolId, student.id, classroomId, status, from, to, retry, t]);

  const records = useMemo(
    () => sessions.flatMap((session) => session.records || []),
    [sessions]
  );
  const statusCounts = useMemo(
    () =>
      records.reduce(
        (counts: Record<string, number>, record) => {
          counts[record.status] = (counts[record.status] || 0) + 1;
          return counts;
        },
        { PRESENT: 0, ABSENT: 0, EXCUSED: 0, LATE: 0 }
      ),
    [records]
  );
  const rate = records.length
    ? (records.filter((record) =>
        ["PRESENT", "LATE"].includes(record.status)
      ).length /
        records.length) *
      100
    : 0;

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError("");
    try {
      const response: any = await attendanceApi.fetchAttendance(schoolId, {
        studentId: student.id,
        classroomId,
        status,
        from,
        to,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : [];
      setSessions((current) => [...current, ...items]);
      setTotal(Number(response?.total ?? total));
      setPage(nextPage);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("attendance.history.loadFailed", {
              defaultValue: "Could not load student attendance history.",
            })
      );
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <FeatureModalShell
      title={t("attendance.history.title", {
        defaultValue: "Student attendance history",
      })}
      subtitle={student.name}
      eyebrow={t("attendance.history.eyebrow", { defaultValue: "History" })}
      onClose={onClose}
      wide
      footer={
        <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
          {t("common:close")}
        </Button>
      }
    >
      <div className="space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {t("attendance.classroomFallback")}
            <select
              value={classroomId}
              onChange={(event) => setClassroomId(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">{t("common:all")}</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {t("attendance.history.status", { defaultValue: "Status" })}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">{t("common:all")}</option>
              {["PRESENT", "LATE", "ABSENT", "EXCUSED"].map((value) => (
                <option key={value} value={value}>
                  {t(`attendance.markStatus.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {t("attendance.history.from", { defaultValue: "From" })}
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {t("attendance.history.to", { defaultValue: "To" })}
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </label>
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: "PRESENT", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
            { key: "ABSENT", tone: "border-rose-100 bg-rose-50 text-rose-700" },
            { key: "EXCUSED", tone: "border-slate-200 bg-slate-50 text-slate-700" },
            { key: "LATE", tone: "border-amber-100 bg-amber-50 text-amber-700" },
          ].map(({ key, tone }) => (
            <div key={key} className={`rounded-2xl border p-3 ${tone}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider">
                {t(`attendance.markStatus.${key}`, { defaultValue: key })}
              </p>
              <p className="mt-1 text-xl font-extrabold font-mono">{statusCounts[key] || 0}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-800">
            <p className="text-[11px] font-bold uppercase tracking-wider">
              {t("attendance.history.rate", { defaultValue: "Attendance rate" })}
            </p>
            <p className="mt-1 text-xl font-extrabold font-mono">{rate.toFixed(1)}%</p>
            <p className="mt-1 text-[11px] text-indigo-700">
              {t("attendance.history.resultCount", {
                count: sessions.length,
                total,
                defaultValue: `Showing ${sessions.length} of ${total} sessions`,
              })}
            </p>
          </div>
        </div>

        {loading ? (
          <div role="status" className="py-10 text-center text-sm text-slate-500">
            {t("common:loading")}
          </div>
        ) : error ? (
          <div className="space-y-3 py-6 text-center">
            <p role="alert" className="text-sm text-rose-700">{error}</p>
            <Button type="button" variant="secondary" onClick={() => setRetry((n) => n + 1)}>
              {t("common:retry", { defaultValue: "Retry" })}
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {t("attendance.history.empty", {
              defaultValue: "No attendance history matches these filters.",
            })}
          </p>
        ) : (
          <div className="max-h-[min(48vh,420px)] overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("attendance.history.date", { defaultValue: "Date" })}</th>
                  <th className="px-4 py-3">{t("attendance.classroomFallback")}</th>
                  <th className="px-4 py-3">{t("attendance.history.status", { defaultValue: "Status" })}</th>
                  <th className="px-4 py-3">{t("attendance.sessionNotes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => {
                  const record = session.records?.[0];
                  return (
                    <tr key={session.id}>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(session.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{session.classroom?.name || "—"}</td>
                      <td className="px-4 py-3">
                        {record
                          ? t(`attendance.markStatus.${record.status}`, {
                              defaultValue: record.status,
                            })
                          : "—"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        {record?.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && sessions.length < total && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore
              ? t("common:loading")
              : t("attendance.history.loadMore", { defaultValue: "Load more" })}
          </Button>
        )}
      </div>
    </FeatureModalShell>
  );
}
