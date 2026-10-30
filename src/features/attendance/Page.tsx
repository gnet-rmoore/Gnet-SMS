import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  UserCheck,
  BookOpen,
  ChevronRight,
  Percent,
  ClipboardList,
  Download,
} from "lucide-react";
import { PageShell, PageHeader, Button, ListFilterBar, StatTile, Surface } from "../../components/ui";
import { surfaceClass, SMS_SHADOW_SURFACE, typeClass } from "../../components/ui/tokens";
import { cn } from "../../lib/cn";
import { useAuthStore } from "../../store/authStore";
import { confirmAction } from "../../lib/swal";
import { useAttendanceQuery } from "./hooks/useAttendanceQuery";
import { attendanceApi } from "./api";
import {
  RollCallSheet,
  type MarkStatus,
} from "./components/RollCallSheet";
import { RollCallModal } from "./components/RollCallModal";
import { AttendanceStudentHistoryModal } from "./components/AttendanceStudentHistoryModal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";
import { useListFilters, type FilterFieldDef } from "../list-filters";

const CAN_TAKE = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "TEACHER",
]);

const CAN_STATS = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "TEACHER",
]);

export const Attendance = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const [hubClassrooms, setHubClassrooms] = useState<any[]>([]);
  const [hubError, setHubError] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const canTake = user?.role ? CAN_TAKE.has(user.role) : false;
  const showStats = user?.role ? CAN_STATS.has(user.role) : false;
  const isTeacher = user?.role === "TEACHER";
  const isViewer =
    user?.role === "STUDENT" ||
    user?.role === "PARENT" ||
    user?.role === "HOSTEL_WARDEN";

  const classroomOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of hubClassrooms) {
      if (c.id) map.set(c.id, c.name || t("attendance.classroomFallback"));
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [hubClassrooms, t]);

  const filterFields: FilterFieldDef[] = useMemo(() => {
    const fields: FilterFieldDef[] = [];
    if (classroomOptions.length > 0) {
      fields.push({
        key: "classroomId",
        label: t("attendance.classroomFallback"),
        type: "enum",
        primary: true,
        allLabel: t("common:all"),
        options: classroomOptions,
      });
    }
    fields.push({
      key: "status",
      label: "Status",
      type: "enum",
      primary: true,
      allLabel: t("common:all"),
      options: ["PRESENT", "LATE", "ABSENT", "EXCUSED"].map((value) => ({
        value,
        label: t(`attendance.markStatus.${value}`),
      })),
    });
    return fields;
  }, [classroomOptions, t]);

  const filters = useListFilters({ fields: filterFields, syncUrl: true });
  const {
    attendance: attendanceRecords,
    stats,
    total: attendanceTotal,
    loading,
    error: attendanceError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetchAll,
    invalidate: refetchAttendance,
  } = useAttendanceQuery({
    classroomId: filters.values.classroomId,
    status: filters.values.status,
    from: filterFrom,
    to: filterTo,
  });
  const { toast, showToast } = usePageToast();

  const [rollCallOpen, setRollCallOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [attendanceData, setAttendanceData] = useState<
    Record<string, MarkStatus>
  >({});
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [activeNotesField, setActiveNotesField] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [isRetake, setIsRetake] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterRetry, setRosterRetry] = useState(0);
  const [rosterWarning, setRosterWarning] = useState("");
  const [classroomsError, setClassroomsError] = useState("");
  const [classroomsRetry, setClassroomsRetry] = useState(0);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecordId, setDetailRecordId] = useState("");
  const [historyStudent, setHistoryStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const schoolYmd = () => {
    try {
      const tz = school?.timezone || "UTC";
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const toSchoolYmd = (date: string | Date) => {
    try {
      const tz = school?.timezone || "UTC";
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(date));
    } catch {
      return new Date(date).toISOString().slice(0, 10);
    }
  };

  const todayLabel = useMemo(() => {
    try {
      const tz = school?.timezone || "UTC";
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [school?.timezone]);

  const fetchRecordDetails = async (id: string, fallback: any = selectedRecord) => {
    setDetailRecordId(id);
    setDetailLoading(true);
    setDetailError("");
    setSelectedRecord({ ...fallback, id });
    setShowDetailsModal(true);
    try {
      const details = await attendanceApi.fetchAttendanceDetails(id);
      setSelectedRecord(details);
    } catch (error: any) {
      setDetailError(error?.message || t("attendance.toast.loadRollCallFailed"));
    } finally {
      setDetailLoading(false);
    }
  };

  /* Teacher hub: own classrooms for quick start + session filter */
  useEffect(() => {
    if (!school?.id || !canTake) return;
    let cancelled = false;
    setHubError("");
    (async () => {
      try {
        const data =
          user?.role === "TEACHER"
            ? await attendanceApi.fetchMyClassrooms()
            : await attendanceApi.fetchSchoolClassrooms(school.id);
        if (!cancelled) {
          setHubClassrooms(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setHubClassrooms([]);
          setHubError("Could not load classroom options. Retry to refresh your scoped classroom list.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, user?.role, canTake, classroomsRetry]);

  useEffect(() => {
    if (!rollCallOpen || !school?.id) return;
    let cancelled = false;
    setLoadingClassrooms(true);
    setClassroomsError("");
    (async () => {
      try {
        const data =
          user?.role === "TEACHER"
            ? await attendanceApi.fetchMyClassrooms()
            : await attendanceApi.fetchSchoolClassrooms(school.id);
        if (!cancelled) setClassrooms(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setClassrooms([]);
          setClassroomsError(t("attendance.toast.loadClassroomsFailed"));
        }
      } finally {
        if (!cancelled) setLoadingClassrooms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rollCallOpen, school?.id, user?.role, classroomsRetry]);

  useEffect(() => {
    if (!selectedClassroom || !rollCallOpen) {
      if (!selectedClassroom) {
        setStudents([]);
        setIsRetake(false);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRoster(true);
      setIsRetake(false);
      setRosterError("");
      setRosterWarning("");
      try {
        const data = await attendanceApi.fetchClassroomMembers(selectedClassroom);
        const list = (Array.isArray(data) ? data : [])
          .filter((m: any) => m.role === "STUDENT")
          .map((m: any) => m.user || { id: m.userId, name: "Student", email: "" })
          .filter((u: any) => u?.id)
          .sort((a: any, b: any) =>
            String(a.name || "").localeCompare(String(b.name || ""))
          );
        if (cancelled) return;
        setStudents(list);

        const ymd = schoolYmd();
        const existingSession = attendanceRecords.find(
          (r: any) =>
            r.classroomId === selectedClassroom &&
            toSchoolYmd(r.date) === ymd
        );

        const initial: Record<string, MarkStatus> = {};
        const notes: Record<string, string> = {};
        list.forEach((s: any) => {
          initial[s.id] = "PRESENT";
          notes[s.id] = "";
        });

        if (existingSession?.id) {
          setIsRetake(true);
          try {
            const details = await attendanceApi.fetchAttendanceDetails(
              existingSession.id
            );
            if (!cancelled && details?.records?.length) {
              for (const rec of details.records) {
                if (rec.studentId && initial[rec.studentId] !== undefined) {
                  const st = String(rec.status || "PRESENT").toUpperCase();
                  if (
                    st === "PRESENT" ||
                    st === "LATE" ||
                    st === "ABSENT" ||
                    st === "EXCUSED"
                  ) {
                    initial[rec.studentId] = st as MarkStatus;
                  }
                  notes[rec.studentId] = rec.notes || "";
                }
              }
              setGeneralNotes(details.notes || "");
            }
          } catch (error: any) {
            if (!cancelled) {
              setRosterWarning(
                error?.message ||
                  "Today's existing roll call could not be loaded. Retry before saving to avoid replacing unseen marks."
              );
            }
          }
        } else {
          setGeneralNotes("");
        }

        setAttendanceData(initial);
        setStudentNotes(notes);
        setActiveNotesField(null);
        setStudentSearch("");
      } catch (error: any) {
        if (!cancelled) {
          setStudents([]);
          setRosterError(
            error?.message || t("attendance.toast.loadRosterFailed")
          );
        }
      } finally {
        if (!cancelled) setLoadingRoster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassroom, rollCallOpen, rosterRetry]);

  const closeRollCall = () => {
    setRollCallOpen(false);
    setSelectedClassroom("");
    setGeneralNotes("");
    setIsRetake(false);
    setStudentSearch("");
    setActiveNotesField(null);
  };

  const handleSave = async () => {
    if (rosterError || rosterWarning) return;
    if (!selectedClassroom || !school?.id) {
      showToast(t("attendance.toast.sessionMissing"), "error");
      return;
    }
    if (students.length === 0) {
      showToast(t("attendance.toast.noStudents"), "error");
      return;
    }

    const updating = isRetake;
    if (updating) {
      const ok = await confirmAction({
        title: t("attendance.confirm.updateTitle"),
        text: t("attendance.confirm.updateText"),
        confirmText: t("attendance.confirm.updateConfirm"),
        icon: "question",
      });
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const presentCount = Object.values(attendanceData).filter(
        (v) => v === "PRESENT" || v === "LATE"
      ).length;
      const absentCount = Object.values(attendanceData).filter(
        (v) => v === "ABSENT"
      ).length;
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId,
        status,
        notes: studentNotes[studentId] || "",
      }));

      await attendanceApi.createAttendance(school.id, {
        classroomId: selectedClassroom,
        date: schoolYmd(),
        presentCount,
        absentCount,
        records,
        notes: generalNotes,
      });

      closeRollCall();
      await refetchAttendance();
      showToast(updating ? t("attendance.toast.rollCallUpdated") : t("attendance.toast.rollCallSaved"), "success");
    } catch (error: any) {
      showToast(error?.message || t("attendance.toast.saveFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const bulkMarkAll = (status: MarkStatus) => {
    const updated = { ...attendanceData };
    students.forEach((student) => {
      updated[student.id] = status;
    });
    setAttendanceData(updated);
  };

  const filteredRecords = attendanceRecords.filter((r: any) => {
    const q = filters.committedQ.toLowerCase();
    if (!q) return true;
    return (
      (r.classroom?.name || "").toLowerCase().includes(q) ||
      (r.teacher?.name || "").toLowerCase().includes(q)
    );
  });

  const filteredStudents = students.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  const title = t("attendance.title");
  const subtitle = t("attendance.subtitle");

  const openRollCall = async (classroomId?: string) => {
    if (!school?.id) {
      showToast(t("attendance.toast.sessionMissing"), "error");
      return;
    }
    const ymd = schoolYmd();
    try {
      const day = await attendanceApi.checkInstructionalDay(school.id, ymd);
      if (day && day.instructional === false) {
        const reason =
          day.reason === "weekend"
            ? t("attendance.toast.weekendBlocked")
            : day.title
              ? t("attendance.toast.nonInstructionWithTitle", { title: day.title })
              : t("attendance.toast.nonInstructionDay");
        showToast(`${reason}${t("attendance.toast.rollCallBlockedSuffix")}`, "error");
        return;
      }
    } catch {
      // Soft-fail open if Academic blips
    }
    setRollCallOpen(true);
    if (classroomId) setSelectedClassroom(classroomId);
  };

  const exportParentCsv = () => {
    const rows: string[][] = [[
      t("attendance.csvHeaders.date"),
      t("attendance.csvHeaders.classroom"),
      t("attendance.csvHeaders.student"),
      t("attendance.csvHeaders.status"),
      t("attendance.csvHeaders.notes"),
    ]];
    for (const session of filteredRecords) {
      const date = session.date
        ? toSchoolYmd(session.date)
        : "";
      for (const rec of session.records || []) {
        rows.push([
          date,
          session.classroom?.name || "",
          rec.student?.name || rec.studentId || "",
          rec.status || "",
          (rec.notes || "").replace(/\r?\n/g, " "),
        ]);
      }
    }
    if (rows.length <= 1) {
      showToast(t("attendance.toast.noRowsExport"), "error");
      return;
    }
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${schoolYmd()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("attendance.toast.csvDownloaded"), "success");
  };

  const todayYmd = schoolYmd();
  const classesTakenToday = useMemo(() => {
    const ids = new Set<string>();
    for (const r of attendanceRecords) {
      if (toSchoolYmd(r.date) === todayYmd && r.classroomId) {
        ids.add(r.classroomId);
      }
    }
    return ids;
  }, [attendanceRecords, todayYmd, school?.timezone]);

  if (rollCallOpen) {
    return (
      <PageShell width="wide">
        <PageToast toast={toast} />
        <RollCallSheet
          todayLabel={todayLabel}
          classrooms={classrooms}
          classroomsError={classroomsError}
          loadingClassrooms={loadingClassrooms}
          onRetryClassrooms={() => setClassroomsRetry((n) => n + 1)}
          selectedClassroom={selectedClassroom}
          setSelectedClassroom={setSelectedClassroom}
          students={students}
          filteredStudents={filteredStudents}
          attendanceData={attendanceData}
          setAttendanceData={setAttendanceData}
          studentNotes={studentNotes}
          setStudentNotes={setStudentNotes}
          activeNotesField={activeNotesField}
          setActiveNotesField={setActiveNotesField}
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          generalNotes={generalNotes}
          setGeneralNotes={setGeneralNotes}
          bulkMarkAll={bulkMarkAll}
          onSave={handleSave}
          onClose={closeRollCall}
          submitting={submitting}
          loadingRoster={loadingRoster}
          isRetake={isRetake}
          rosterError={rosterError}
          rosterWarning={rosterWarning}
          onRetryRoster={() => setRosterRetry((n) => n + 1)}
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageToast toast={toast} />

      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {canTake && (
              <Button type="button" variant="primary" onClick={() => openRollCall()}>
                <Plus className="w-4 h-4" />
                {t("attendance.takeRollCall")}
              </Button>
            )}
            {user?.role === "PARENT" && (
              <Button type="button" variant="secondary" onClick={exportParentCsv}>
                <Download className="w-4 h-4" />
                {t("attendance.exportCsv")}
              </Button>
            )}
          </>
        }
      />

      {canTake && hubError && (
        <Surface variant="empty" className="flex items-center justify-between gap-4">
          <p role="alert" className="text-sm text-rose-700">{hubError}</p>
          <Button type="button" variant="secondary" onClick={() => setClassroomsRetry((n) => n + 1)}>
            Retry
          </Button>
        </Surface>
      )}

      {canTake && hubClassrooms.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className={typeClass.sectionTitle}>
                {isTeacher ? t("attendance.yourClassesToday") : t("attendance.quickStart")}
              </h2>
              <p className={`${typeClass.helper} mt-1`}>{todayLabel}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hubClassrooms.slice(0, isTeacher ? 12 : 6).map((c: any) => {
              const done = classesTakenToday.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openRollCall(c.id)}
                  className={cn(
                    "text-left flex flex-col h-full min-h-[9.5rem] p-5 bg-white border border-slate-200",
                    SMS_SHADOW_SURFACE,
                    "hover:border-indigo-200 rounded-[32px] transition-colors group"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                        done
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <ClipboardList className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-lg tracking-wider uppercase shrink-0",
                        done
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-50 text-slate-500"
                      )}
                    >
                      {done ? t("attendance.taken") : t("attendance.open")}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-auto pt-2">
                    {c.subject?.name || c.classCode || t("attendance.startRollCall")}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showStats && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn(surfaceClass.banner, "flex flex-col min-h-[8.5rem]")}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                {t("attendance.today")}
              </p>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-auto pt-4">
              <p className="text-xs font-medium text-slate-400">{t("attendance.attendanceRate")}</p>
              <p className="text-2xl font-extrabold tracking-tight font-mono mt-1">
                {Number(stats.today?.rate || 0).toFixed(1)}%
              </p>
            </div>
          </div>
          <StatTile
            label={t("attendance.presentLate")}
            value={stats.today?.present ?? 0}
            icon={<CheckCircle2 className="w-5 h-5" />}
            className="min-h-[8.5rem] flex flex-col [&>p:last-of-type]:mt-auto"
          />
          <StatTile
            label={t("attendance.absentToday")}
            value={stats.today?.absent ?? 0}
            icon={<XCircle className="w-5 h-5" />}
            className="min-h-[8.5rem] flex flex-col [&>p:last-of-type]:mt-auto"
          />
          <StatTile
            label={isTeacher ? "Your classes · overall rate" : t("attendance.overallRate")}
            value={`${Number(stats.overall?.rate || 0).toFixed(1)}%`}
            icon={<UserCheck className="w-5 h-5" />}
            className="min-h-[8.5rem] flex flex-col [&>p:last-of-type]:mt-auto"
          />
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className={typeClass.sectionTitle}>{t("attendance.sessions")}</h2>
          <p className={`${typeClass.helper} mt-1`}>
            {isViewer
              ? t("attendance.sessionsViewer")
              : isTeacher
                ? t("attendance.sessionsTeacher")
                : t("attendance.sessionsAdmin")}
          </p>
        </div>
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          searchPlaceholder={t("attendance.searchPlaceholder")}
          shownCount={attendanceTotal}
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            From
            <input
              type="date"
              value={filterFrom}
              onChange={(event) => setFilterFrom(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            To
            <input
              type="date"
              value={filterTo}
              onChange={(event) => setFilterTo(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </label>
          {(filterFrom || filterTo) && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
              }}
            >
              Clear dates
            </Button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn("h-52 bg-white border border-slate-200 rounded-[32px] animate-pulse", SMS_SHADOW_SURFACE)}
            />
          ))}
        </div>
      ) : attendanceError ? (
        <Surface variant="empty" className="space-y-3">
          <p role="alert" className="text-sm text-rose-700">
            {(attendanceError as Error)?.message || "Could not load attendance sessions."}
          </p>
          <Button type="button" variant="secondary" onClick={() => refetchAll()}>
            Retry
          </Button>
        </Surface>
      ) : filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record: any, index: number) => {
            const total = record.presentCount + record.absentCount;
            const rate = total > 0 ? (record.presentCount / total) * 100 : 100;
            const isToday = toSchoolYmd(record.date) === todayYmd;
            return (
              <motion.article
                key={record.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                className={cn(
                  "bg-white rounded-[32px] border border-slate-200 overflow-hidden flex flex-col h-full",
                  SMS_SHADOW_SURFACE
                )}
              >
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {isToday && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {t("attendance.today")}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 font-mono text-xs font-bold uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(record.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">
                      {record.classroom?.name || t("attendance.classroomFallback")}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {record.teacher?.name || t("attendance.staff")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">{t("attendance.presence")}</span>
                      <span
                        className={
                          rate > 80
                            ? "text-emerald-600"
                            : rate > 60
                              ? "text-amber-600"
                              : "text-rose-600"
                        }
                      >
                        {rate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          rate > 80
                            ? "bg-emerald-500"
                            : rate > 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        )}
                        style={{ width: `${Math.min(100, rate)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-slate-200 rounded-2xl bg-slate-50 overflow-hidden mt-auto">
                    <div className="py-3 px-2 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t("attendance.present")}
                      </p>
                      <p className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                        {record.presentCount}
                      </p>
                    </div>
                    <div className="py-3 px-2 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t("attendance.absent")}
                      </p>
                      <p className="text-base font-extrabold text-rose-600 font-mono mt-0.5">
                        {record.absentCount}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 min-h-[3.25rem]">
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {String(record.id).slice(0, 8).toUpperCase()}
                  </span>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    {canTake && isToday && (
                      <button
                        type="button"
                        onClick={() => openRollCall(record.classroomId)}
                        className="text-slate-500 font-bold text-xs hover:text-indigo-600 whitespace-nowrap"
                      >
                        {t("attendance.update")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fetchRecordDetails(record.id, record)}
                      className="text-indigo-600 font-bold text-xs hover:text-indigo-800 inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      {t("attendance.viewMarks")}
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <Surface variant="empty" className="space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className={typeClass.sectionTitle}>
            {filters.hasActiveFilters || filterFrom || filterTo
              ? t("pages:listFilters.noMatches")
              : t("attendance.emptyTitle")}
          </h3>
          <p className={`${typeClass.helper} max-w-sm mx-auto`}>
            {filters.hasActiveFilters || filterFrom || filterTo
              ? t("pages:listFilters.noMatchesHint")
              : canTake
                ? t("attendance.emptyCanTake")
                : t("attendance.emptyViewer")}
          </p>
          {filters.hasActiveFilters || filterFrom || filterTo ? (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => {
                filters.clear();
                setFilterFrom("");
                setFilterTo("");
              }}
            >
              {t("pages:listFilters.clearAll")}
            </Button>
          ) : canTake ? (
            <Button type="button" variant="primary" onClick={() => openRollCall()}>
              <Plus className="w-4 h-4" />
              {t("attendance.takeRollCall")}
            </Button>
          ) : null}
        </Surface>
      )}

      {!loading && !attendanceError && hasNextPage && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? t("common:loading") : "Load more"}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showDetailsModal && selectedRecord && (
          <RollCallModal
            selectedRecord={selectedRecord}
            setShowDetailsModal={setShowDetailsModal}
            loading={detailLoading}
            error={detailError}
            onRetry={() => fetchRecordDetails(detailRecordId, selectedRecord)}
            canViewStudentHistory={canTake}
            onViewStudentHistory={(student) => {
              if (canTake) setHistoryStudent(student);
            }}
          />
        )}
      </AnimatePresence>
      {canTake && historyStudent && school?.id && (
        <AttendanceStudentHistoryModal
          student={historyStudent}
          schoolId={school.id}
          classrooms={hubClassrooms}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </PageShell>
  );
};
