import React, { useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Users,
  BookOpen,
  MessageSquare,
  ArrowLeft,
  Keyboard,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
} from "lucide-react";
import { UserAvatar } from "../../../components/UserAvatar";
import { Button, Surface } from "../../../components/ui";
import { SMS_SHADOW_SURFACE, typeClass, fieldControlClass } from "../../../components/ui/tokens";
import { cn } from "../../../lib/cn";

export type MarkStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_ORDER: MarkStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

export type RollCallSheetProps = {
  todayLabel: string;
  classrooms: any[];
  classroomsError: string;
  loadingClassrooms: boolean;
  onRetryClassrooms: () => void;
  selectedClassroom: string;
  setSelectedClassroom: (id: string) => void;
  students: any[];
  filteredStudents: any[];
  attendanceData: Record<string, MarkStatus>;
  setAttendanceData: React.Dispatch<React.SetStateAction<Record<string, MarkStatus>>>;
  studentNotes: Record<string, string>;
  setStudentNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activeNotesField: string | null;
  setActiveNotesField: (id: string | null) => void;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  generalNotes: string;
  setGeneralNotes: (v: string) => void;
  bulkMarkAll: (status: MarkStatus) => void;
  onSave: () => void;
  onClose: () => void;
  submitting: boolean;
  loadingRoster: boolean;
  rosterError: string;
  rosterWarning: string;
  onRetryRoster: () => void;
  isRetake?: boolean;
};

export function RollCallSheet(props: RollCallSheetProps) {
  const {
    todayLabel,
    classrooms,
    classroomsError,
    loadingClassrooms,
    onRetryClassrooms,
    selectedClassroom,
    setSelectedClassroom,
    students,
    filteredStudents,
    attendanceData,
    setAttendanceData,
    studentNotes,
    setStudentNotes,
    activeNotesField,
    setActiveNotesField,
    studentSearch,
    setStudentSearch,
    generalNotes,
    setGeneralNotes,
    bulkMarkAll,
    onSave,
    onClose,
    submitting,
    loadingRoster,
    rosterError,
    rosterWarning,
    onRetryRoster,
    isRetake,
  } = props;

  const { t } = useTranslation(["pages", "common"]);

  const STATUS_META: Record<
    MarkStatus,
    { label: string; short: string; key: string; active: string; idle: string; icon: React.ReactNode }
  > = {
    PRESENT: {
      label: t("attendance.markStatus.PRESENT"),
      short: "P",
      key: "1 / P",
      active:
        "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700",
      idle:
        "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    LATE: {
      label: t("attendance.markStatus.LATE"),
      short: "L",
      key: "2 / L",
      active:
        "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:border-amber-600",
      idle:
        "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    ABSENT: {
      label: t("attendance.markStatus.ABSENT"),
      short: "A",
      key: "3 / A",
      active:
        "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:border-rose-700",
      idle:
        "bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    EXCUSED: {
      label: t("attendance.markStatus.EXCUSED"),
      short: "E",
      key: "4 / E",
      active:
        "bg-slate-800 text-white border-slate-800 hover:bg-slate-900 hover:border-slate-900",
      idle:
        "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900",
      icon: <Shield className="w-3.5 h-3.5" />,
    },
  };

  const statusButtonClass =
    "inline-flex flex-1 sm:flex-none min-w-[44px] min-h-[44px] items-center justify-center gap-1.5 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 rounded-xl px-2.5 py-2 text-sm";

  const [focusIndex, setFocusIndex] = React.useState(0);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const tallies = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    for (const s of students) {
      const st = attendanceData[s.id] || "PRESENT";
      counts[st]++;
    }
    return counts;
  }, [students, attendanceData]);

  const classroom = classrooms.find((c) => c.id === selectedClassroom);

  const markStudent = useCallback(
    (studentId: string, status: MarkStatus) => {
      setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
    },
    [setAttendanceData]
  );

  const cycleStatus = useCallback(
    (studentId: string) => {
      const cur = attendanceData[studentId] || "PRESENT";
      const i = STATUS_ORDER.indexOf(cur);
      const next = STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
      markStudent(studentId, next);
    },
    [attendanceData, markStudent]
  );

  useEffect(() => {
    setFocusIndex(0);
  }, [selectedClassroom, studentSearch]);

  useEffect(() => {
    const el = rowRefs.current[focusIndex];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIndex]);

  useEffect(() => {
    if (!selectedClassroom) return;

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
          e.preventDefault();
        }
        return;
      }

      const list = filteredStudents;
      if (!list.length) return;
      const clamped = Math.min(focusIndex, list.length - 1);
      const student = list[clamped];
      if (!student) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, list.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        cycleStatus(student.id);
      } else if (e.key === "1" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        markStudent(student.id, "PRESENT");
        setFocusIndex((i) => Math.min(i + 1, list.length - 1));
      } else if (e.key === "2" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        markStudent(student.id, "LATE");
        setFocusIndex((i) => Math.min(i + 1, list.length - 1));
      } else if (e.key === "3" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        markStudent(student.id, "ABSENT");
        setFocusIndex((i) => Math.min(i + 1, list.length - 1));
      } else if (e.key === "4" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        markStudent(student.id, "EXCUSED");
        setFocusIndex((i) => Math.min(i + 1, list.length - 1));
      } else if ((e.key === "s" || e.key === "S") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!submitting && students.length) onSave();
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setActiveNotesField(
          activeNotesField === student.id ? null : student.id
        );
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedClassroom,
    filteredStudents,
    focusIndex,
    cycleStatus,
    markStudent,
    submitting,
    students.length,
    onSave,
    activeNotesField,
    setActiveNotesField,
  ]);

  /* Class picker */
  if (!selectedClassroom) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("attendance.sheet.sessionsBack")}
            </button>
            <h2 className={typeClass.sectionTitle}>
              {t("attendance.sheet.takeRollCall")}
            </h2>
            <p className={`${typeClass.helper} mt-1`}>
              {t("attendance.sheet.chooseClass", { date: todayLabel })}
            </p>
          </div>
        </div>

        {loadingClassrooms ? (
          <Surface variant="empty" className="space-y-3">
            <p className={typeClass.helper}>Loading classrooms…</p>
          </Surface>
        ) : classroomsError ? (
          <Surface variant="empty" className="space-y-3">
            <p role="alert" className="text-sm text-rose-700">{classroomsError}</p>
            <Button type="button" variant="secondary" onClick={onRetryClassrooms}>
              Retry
            </Button>
          </Surface>
        ) : classrooms.length === 0 ? (
          <Surface variant="empty" className="space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className={typeClass.sectionTitle}>{t("attendance.sheet.noClassrooms")}</p>
            <p className={typeClass.helper}>{t("attendance.sheet.needAssignment")}</p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassroom(c.id)}
                className={cn(
                  "text-left flex flex-col h-full min-h-[10rem] p-6 bg-white border border-slate-200",
                  SMS_SHADOW_SURFACE,
                  "hover:border-indigo-200 rounded-[32px] transition-colors group"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg tracking-wider uppercase shrink-0">
                    {c.subject?.code || c.classCode || t("attendance.sheet.classLabel")}
                  </span>
                </div>
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 truncate">
                  {c.name}
                </h3>
                <p className="text-xs text-slate-500 mt-auto pt-2 flex items-center gap-1.5 truncate">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {c._count?.members
                    ? t("attendance.sheet.members", { count: c._count.members })
                    : c.subject?.name || t("attendance.sheet.openRoster")}
                </p>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  /* Marking sheet */
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 pb-28"
    >
      <Surface variant="nestedCompact" className="sticky top-0 z-20 space-y-4 !p-4 sm:!p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setSelectedClassroom("")}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-1"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {t("attendance.sheet.changeClass")}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn(typeClass.sectionTitle, "truncate")}>
                {classroom?.name || t("attendance.classroomFallback")}
              </h2>
              {isRetake && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider shrink-0">
                  {t("attendance.sheet.updatingToday")}
                </span>
              )}
            </div>
            <p className={`${typeClass.helper} mt-0.5`}>
              {todayLabel}
              {classroom?.subject?.name ? ` · ${classroom.subject.name}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-700">
              <span className="font-mono text-emerald-900">{tallies.PRESENT}</span>
              <span className="uppercase tracking-wider">P</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-100 bg-amber-50 text-xs font-bold text-amber-700">
              <span className="font-mono text-amber-900">{tallies.LATE}</span>
              <span className="uppercase tracking-wider">L</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-100 bg-rose-50 text-xs font-bold text-rose-700">
              <span className="font-mono text-rose-900">{tallies.ABSENT}</span>
              <span className="uppercase tracking-wider">A</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <span className="font-mono text-slate-900">{tallies.EXCUSED}</span>
              <span className="uppercase tracking-wider">E</span>
            </div>
          </div>
        </div>
      </Surface>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder={t("attendance.sheet.filterStudents")}
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className={cn(fieldControlClass.default, "pl-10")}
          />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => bulkMarkAll("PRESENT")}
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300"
          >
            {t("attendance.sheet.allPresent")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => bulkMarkAll("ABSENT")}
            className="border-rose-200 text-rose-800 hover:bg-rose-50 hover:text-rose-900 hover:border-rose-300"
          >
            {t("attendance.sheet.allAbsent")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => bulkMarkAll("LATE")}
            className="border-amber-200 text-amber-800 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300"
          >
            {t("attendance.sheet.allLate")}
          </Button>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium px-1">
        <Keyboard className="w-3.5 h-3.5" />
        <span>{t("attendance.sheet.keyboardHint")}</span>
      </div>

      <div className={cn("bg-white rounded-[32px] border border-slate-200 overflow-hidden", SMS_SHADOW_SURFACE)}>
        {loadingRoster ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : rosterError ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <p role="alert" className="text-sm text-rose-700">{rosterError}</p>
            <Button type="button" variant="secondary" onClick={onRetryRoster}>
              Retry roster
            </Button>
          </div>
        ) : rosterWarning ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <p role="alert" className="text-sm text-amber-800">{rosterWarning}</p>
            <Button type="button" variant="secondary" onClick={onRetryRoster}>
              Retry loading today's roll call
            </Button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {students.length === 0
              ? t("attendance.sheet.noStudentsEnrolled")
              : t("attendance.sheet.noStudentsFilter")}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredStudents.map((student, idx) => {
              const status = attendanceData[student.id] || "PRESENT";
              const note = studentNotes[student.id] || "";
              const showNote = activeNotesField === student.id;
              const focused = idx === focusIndex;
              return (
                <div
                  key={student.id}
                  ref={(el) => {
                    rowRefs.current[idx] = el;
                  }}
                  onClick={() => setFocusIndex(idx)}
                  className={`px-4 sm:px-5 py-3.5 transition-colors ${
                    focused
                      ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-100"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 xl:items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-300 w-5 shrink-0 tabular-nums text-right">
                        {idx + 1}
                      </span>
                      <UserAvatar
                        name={student.name}
                        photoUrl={student.photoUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold tracking-tight text-slate-900 text-sm truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 xl:justify-end pl-8 xl:pl-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveNotesField(showNote ? null : student.id);
                        }}
                        className={`p-2 min-h-0 border ${
                          note
                            ? "bg-indigo-50 border-indigo-100 text-indigo-600"
                            : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                        title={t("attendance.sheet.noteTitle")}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <div
                        role="group"
                        aria-label={`Attendance status for ${student.name}`}
                        className="flex flex-1 sm:flex-none gap-1"
                      >
                        {STATUS_ORDER.map((s) => {
                          const meta = STATUS_META[s];
                          const on = status === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markStudent(student.id, s);
                              }}
                              className={cn(
                                statusButtonClass,
                                "uppercase tracking-wider border",
                                on ? meta.active : meta.idle
                              )}
                              title={`${meta.label} (${meta.key})`}
                              aria-label={`${meta.label} (${meta.key})`}
                              aria-pressed={on}
                            >
                              {meta.icon}
                              <span className="hidden xs:inline sm:inline">
                                {meta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {(showNote || note) && (
                    <div className="mt-2 flex gap-3 pl-8 xl:pl-0 xl:col-span-2">
                      <span className="w-5 shrink-0 hidden xl:block" aria-hidden />
                      <span className="w-9 shrink-0 hidden xl:block" aria-hidden />
                      <input
                        type="text"
                        autoFocus={showNote}
                        placeholder={t("attendance.sheet.noteFor", {
                          name: String(student.name || "").split(" ")[0],
                        })}
                        value={note}
                        onChange={(e) =>
                          setStudentNotes((prev) => ({
                            ...prev,
                            [student.id]: e.target.value,
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className={cn(fieldControlClass.compact, "flex-1 min-w-0")}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className={typeClass.metaLabel}>
          {t("attendance.sheet.sessionNotesOptional")}
        </label>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder={t("attendance.sheet.sessionNotesPlaceholder")}
          className={cn(
            fieldControlClass.default,
            "resize-none h-20",
            SMS_SHADOW_SURFACE
          )}
        />
      </div>

      <Surface
        variant="nestedCompact"
        className="sticky bottom-0 z-30 !p-0 overflow-hidden"
      >
        <div className="py-3 px-4 sm:px-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className={`${typeClass.helper} text-xs`}>
            <span className="font-mono font-bold text-slate-900">
              {students.length}
            </span>{" "}
            {t("attendance.sheet.onRoster")} ·{" "}
            <span className="text-emerald-600 font-bold">
              {tallies.PRESENT + tallies.LATE}
            </span>{" "}
            {t("attendance.sheet.inCount")} ·{" "}
            <span className="text-rose-600 font-bold">{tallies.ABSENT}</span>{" "}
            {t("attendance.sheet.outCount")}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
              {t("common:cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={
                submitting ||
                students.length === 0 ||
                loadingRoster ||
                Boolean(rosterError || rosterWarning)
              }
              className="flex-1 sm:flex-none"
            >
              {submitting
                ? t("common:saving")
                : isRetake
                  ? t("attendance.sheet.updateRollCall")
                  : t("attendance.sheet.saveRollCall")}
            </Button>
          </div>
        </div>
      </Surface>
    </motion.div>
  );
}
