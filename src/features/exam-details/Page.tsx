import React from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { 
  ArrowLeft, 
  Save, 
  Send, 
  AlertCircle,
  MessageSquare,
  History,
  Users,
  BookOpen,
  ChevronRight,
  User,
  Eye,
  EyeOff,
  BarChart3,
  CalendarDays,
  Clock,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useExamDetailsQuery } from "./hooks/useExamDetailsQuery";
import { ResultsModal } from "./components/ResultsModal";
import { HistoryModal } from "./components/HistoryModal";
import { ExamScheduleModal } from "../exams/components/ExamScheduleModal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { cardShell } from "../academics-shared/FeatureModalShell";
import { alertError, confirmAction } from "../../lib/swal";
import { DataTable, dataTableClass } from "../../components/ui";
import { ExamGradeEntryPanel } from "../gradebook/components/ExamGradeEntryPanel";
import {
  examStatusClass,
  examStatusLabel,
} from "../exams/utils";

interface GradeHistory {
  id: string;
  score: number | null;
  status: string;
  feedback: string | null;
  changedBy: string;
  user: { name: string; role: string };
  changedAt: string;
}

interface GradeEntry {
  id: string;
  studentId: string;
  student: { name: string; email: string };
  grade: number | null;
  status: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
  feedback: string | null;
  isLocked: boolean;
  history: GradeHistory[];
}

interface Exam {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  gradeSubmissionDeadline: string;
  duration?: number;
  status: string;
  displayStatus?: string;
  isGradesReleased: boolean;
  examComponentId?: string | null;
  examComponent?: {
    id: string;
    label: string;
    shortCode: string;
    period?: {
      id: string;
      label: string;
      shortCode: string;
    } | null;
  } | null;
}

interface TeacherClassroom {
  id: string;
  name: string;
  subject: { id: string; name: string };
  gradeLevel: { name: string };
  submissionStatus: string;
  _count: { members: number };
}

interface SubmissionSummary {
  classroom: { id: string; name: string; subject: { name: string }; gradeLevel: { name: string } };
  teacher: { name: string };
  teacherId: string;
  status: string;
  lastSubmitted: string;
  counts: Record<string, number>;
}

interface StudentResult {
  student: { id: string; name: string; email: string };
  totalScore: number;
  subjectCount: number;
  average: number;
  position: number;
  grade: string;
  subjects: { subjectName: string; score: number }[];
}

export const ExamDetails = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { accessToken, user, school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const {
    exam: examFromQuery,
    teacherClassrooms: teacherClassroomsFromQuery,
    submissionsSummary: submissionsSummaryFromQuery,
    loading: queryLoading,
    invalidate: refetchExamDetails,
  } = useExamDetailsQuery(examId);

  const [exam, setExam] = React.useState<Exam | null>(null);
  const [grades, setGrades] = React.useState<GradeEntry[]>([]);
  const [teacherClassrooms, setTeacherClassrooms] = React.useState<TeacherClassroom[]>([]);
  const [submissionsSummary, setSubmissionsSummary] = React.useState<SubmissionSummary[]>([]);
  const [selectedClassroom, setSelectedClassroom] = React.useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string | null>(null);
  
  const [gradesLoading, setGradesLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [historyModal, setHistoryModal] = React.useState<GradeEntry | null>(null);
  const [resultsModal, setResultsModal] = React.useState<StudentResult[] | null>(null);
  const [showSchedule, setShowSchedule] = React.useState(false);

  const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || "");
  const isTeacher = user?.role === "TEACHER";
  const canManageSchedules = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(
    user?.role || ""
  );
  const loading = queryLoading || gradesLoading;

  React.useEffect(() => {
    if (examFromQuery) setExam(examFromQuery as Exam);
    if (isTeacher && teacherClassroomsFromQuery) {
      setTeacherClassrooms(Array.isArray(teacherClassroomsFromQuery) ? teacherClassroomsFromQuery : []);
    }
    if (isAdmin && submissionsSummaryFromQuery) {
      setSubmissionsSummary(Array.isArray(submissionsSummaryFromQuery) ? submissionsSummaryFromQuery : []);
    }
  }, [examFromQuery, teacherClassroomsFromQuery, submissionsSummaryFromQuery, isTeacher, isAdmin]);

  const fetchData = React.useCallback(async () => {
    await refetchExamDetails();
  }, [refetchExamDetails]);

  const fetchGrades = React.useCallback(async (classroomId: string, teacherId?: string) => {
    setGradesLoading(true);
    try {
      let url = `/api/exams/${examId}/grades?classroomId=${classroomId}`;
      if (teacherId) url += `&teacherId=${teacherId}`;
      
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.ok) {
        setGrades(await response.json());
      } else {
        showToast(t("examDetails.toast.loadGradesFailed"), "error");
      }
    } catch {
      showToast(t("examDetails.toast.loadGradesFailed"), "error");
    } finally {
      setGradesLoading(false);
    }
  }, [examId, accessToken, showToast]);

  const handleSelectClassroom = (classroomId: string, teacherId?: string) => {
    setSelectedClassroom(classroomId);
    setSelectedTeacherId(teacherId || null);
    fetchGrades(classroomId, teacherId);
  };

  const handleGradeChange = (studentId: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setGrades(prev => prev.map(g => g.studentId === studentId ? { ...g, grade: numValue } : g));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const classroom = teacherClassrooms.find(c => c.id === selectedClassroom);
      const toSave = grades.filter(g => !g.isLocked && g.status !== "SUBMITTED");
      const responses = await Promise.all(toSave.map(grade => 
        fetch(`/api/exams/${examId}/grades`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            studentId: grade.studentId,
            grade: grade.grade,
            status: "DRAFT",
            classId: selectedClassroom,
            subjectId: classroom?.subject.id
          }),
        })
      ));
      if (responses.some((r) => !r.ok)) {
        showToast(t("examDetails.toast.draftPartialFailed"), "error");
      } else {
        showToast(t("examDetails.toast.draftSaved"), "success");
      }
      if (selectedClassroom) fetchGrades(selectedClassroom);
    } catch {
      showToast(t("examDetails.toast.draftFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitGrades = async () => {
    const ok = await confirmAction({
      title: t("examDetails.confirm.submitTitle"),
      text: t("examDetails.confirm.submitText"),
      confirmText: t("common:submit"),
      icon: "question",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const classroom = teacherClassrooms.find(c => c.id === selectedClassroom);
      const toSubmit = grades.filter(g => !g.isLocked && g.status !== "SUBMITTED");
      const responses = await Promise.all(toSubmit.map(grade => 
        fetch(`/api/exams/${examId}/grades`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            studentId: grade.studentId,
            grade: grade.grade,
            status: "SUBMITTED",
            classId: selectedClassroom,
            subjectId: classroom?.subject.id
          }),
        })
      ));
      if (responses.some((r) => !r.ok)) {
        showToast(t("examDetails.toast.submitPartialFailed"), "error");
      } else {
        showToast(t("examDetails.toast.submitted"), "success");
      }
      if (selectedClassroom) fetchGrades(selectedClassroom);
    } catch {
      showToast(t("examDetails.toast.submitFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (studentId: string) => {
    const grade = grades.find((g) => g.studentId === studentId);
    if (!grade?.id) return;
    const ok = await confirmAction({
      title: t("examDetails.confirm.reopenTitle"),
      text: t("examDetails.confirm.reopenText"),
      confirmText: t("examDetails.confirm.reopenConfirm"),
      icon: "question",
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/grade-entries/${grade.id}/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: "Reopened from Exam Details for correction",
        }),
      });
      if (response.ok) {
        if (selectedClassroom)
          fetchGrades(selectedClassroom, selectedTeacherId || undefined);
        showToast(t("examDetails.toast.reopened"), "success");
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || t("examDetails.toast.reopenFailed"), "error");
      }
    } catch {
      showToast(t("examDetails.toast.reopenFailed"), "error");
    }
  };

  const handleToggleRelease = async () => {
    if (!isAdmin || !exam) return;
    const releasing = !exam.isGradesReleased;
    const ok = await confirmAction({
      title: releasing ? t("examDetails.confirm.releaseTitle") : t("examDetails.confirm.hideTitle"),
      text: releasing ? t("examDetails.confirm.releaseText") : t("examDetails.confirm.hideText"),
      confirmText: releasing ? t("examDetails.releaseGrades") : t("examDetails.confirm.hideConfirm"),
      icon: "question",
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/exams/${examId}/release-grades`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          isGradesReleased: releasing
        }),
      });

      if (response.ok) {
        const updatedExam = await response.json();
        setExam(updatedExam);
        showToast(releasing ? t("examDetails.toast.released") : t("examDetails.toast.gradesPrivate"), "success");
      } else {
        showToast(t("examDetails.toast.releaseFailed"), "error");
      }
    } catch {
      showToast(t("examDetails.toast.releaseFailed"), "error");
    }
  };

  const handleProcessResults = async () => {
    if (!isAdmin) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/exams/${examId}/process-results`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setResultsModal(data);
      } else {
        let message = t("examDetails.toast.processFailed");
        try {
          const err = await response.json();
          message = err.error || message;
        } catch {
          /* ignore */
        }
        await alertError(t("examDetails.toast.processFailed"), message);
      }
    } catch {
      await alertError(t("examDetails.toast.processFailed"), t("examDetails.toast.processErrorText"));
    } finally {
      setProcessing(false);
    }
  };

  const generateReportCard = (result: StudentResult) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(school?.name || "School Report Card", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(exam?.title || "Exam Report", 105, 30, { align: "center" });
    
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(20, 35, 190, 35);
    
    // Student Info
    doc.setFontSize(12);
    doc.text(`Student Name: ${result.student.name}`, 20, 45);
    doc.text(`Student ID: ${result.student.id.slice(-8).toUpperCase()}`, 20, 52);
    doc.text(`Date: ${format(new Date(), "PPP")}`, 140, 45);
    
    // Summary Stats
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(20, 60, 170, 25, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("AVERAGE SCORE", 35, 70);
    doc.text("CLASS POSITION", 85, 70);
    doc.text("FINAL GRADE", 145, 70);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(`${result.average.toFixed(2)}%`, 35, 80);
    doc.text(`${result.position}`, 85, 80);
    doc.text(`${result.grade}`, 145, 80);
    
    // Subjects Table
    autoTable(doc, {
      startY: 95,
      head: [["Subject", "Score (%)", "Status"]],
      body: result.subjects.map(s => [
        s.subjectName,
        s.score.toFixed(2),
        s.score >= 50 ? "PASS" : "FAIL"
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 20, right: 20 }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Principal Signature", 40, finalY + 20);
    doc.line(20, finalY + 15, 80, finalY + 15);
    
    doc.text("Class Teacher Signature", 130, finalY + 20);
    doc.line(110, finalY + 15, 170, finalY + 15);
    
    doc.save(`${result.student.name}_Report_Card.pdf`);
  };

  if (loading && !exam) return <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!exam) return <div className="text-center py-20 px-6"><h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("examDetails.notFound")}</h2></div>;

  const renderSelectionView = () => {
    if (isTeacher) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherClassrooms.map((cls) => (
              <motion.button
                key={cls.id}
                type="button"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSelectClassroom(cls.id)}
                className="text-left bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-indigo-100 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    cls.submissionStatus === "SUBMITTED" ? "bg-amber-50 text-amber-600" :
                    cls.submissionStatus === "ACCEPTED" ? "bg-emerald-50 text-emerald-600" :
                    cls.submissionStatus === "REJECTED" ? "bg-rose-50 text-rose-600" :
                    "bg-slate-50 text-slate-500"
                  }`}>
                    {cls.submissionStatus === "SUBMITTED" ? t("examDetails.pendingReview") : t(`common:gradeStatus.${cls.submissionStatus}`, { defaultValue: cls.submissionStatus.replace("_", " ") })}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900 mb-1">{cls.subject.name}</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">{cls.name} • {cls.gradeLevel.name}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono">{t("examDetails.studentsCount", { count: cls._count.members })}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
          {teacherClassrooms.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{t("examDetails.noClassrooms")}</h3>
              <p className="text-slate-500 font-medium">{t("examDetails.noClassroomsHint")}</p>
            </div>
          )}
        </div>
      );
    }

    if (isAdmin) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissionsSummary.map((sub, i) => (
              <motion.button
                key={i}
                type="button"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSelectClassroom(sub.classroom.id, sub.teacherId)}
                className="text-left bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-indigo-100 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    sub.status === "SUBMITTED" ? "bg-amber-50 text-amber-600" :
                    sub.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-600" :
                    sub.status === "REJECTED" ? "bg-rose-50 text-rose-600" :
                    "bg-slate-50 text-slate-500"
                  }`}>
                    {sub.status === "SUBMITTED" ? t("examDetails.pendingReview") : t(`common:gradeStatus.${sub.status}`, { defaultValue: sub.status })}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900 mb-1">{sub.teacher.name}</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">
                  {sub.classroom.subject.name} • {sub.classroom.name}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    {Object.entries(sub.counts).map(([status, count]) => (
                      <span key={status} className="text-xs font-bold text-slate-500 font-mono">
                        {count} {status[0]}
                      </span>
                    ))}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
          {submissionsSummary.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{t("examDetails.noSubmissions")}</h3>
              <p className="text-slate-500 font-medium">{t("examDetails.noSubmissionsHint")}</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const displayStatus = exam.displayStatus || exam.status;
  const periodLabel = exam.examComponent?.period
    ? `${exam.examComponent.period.shortCode} · ${exam.examComponent.label}`
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full min-w-0 pb-20">
      <PageToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col lg:flex-row lg:items-start justify-between gap-6 p-6 sm:p-8 ${cardShell}`}
      >
        <div className="flex items-start gap-4 min-w-0">
          <button 
            type="button"
            onClick={() => selectedClassroom ? setSelectedClassroom(null) : undefined}
            className={`p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 ${!selectedClassroom ? "hidden" : ""}`}
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          {!selectedClassroom && (
            <Link to={`/${school?.slug}/exams`} className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </Link>
          )}
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{t("examDetails.title")}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              {exam.title}
            </h1>
            <p className="text-slate-500 font-medium">
              {selectedClassroom 
                ? (isTeacher 
                    ? teacherClassrooms.find(c => c.id === selectedClassroom)?.subject.name 
                    : submissionsSummary.find(s => s.classroom.id === selectedClassroom)?.classroom.subject.name)
                : `${format(new Date(exam.startDate), "MMM d, yyyy · p")} – ${format(new Date(exam.endDate), "MMM d, yyyy · p")}`}
            </p>
            {!selectedClassroom && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${examStatusClass(
                    displayStatus
                  )}`}
                >
                  {examStatusLabel(displayStatus)}
                </span>
                {periodLabel ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {periodLabel}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">
                    {t("examDetails.notLinkedCalendar")}
                  </span>
                )}
                {typeof exam.duration === "number" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {exam.duration} min
                  </span>
                )}
              </div>
            )}
            {!selectedClassroom && (
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to={`/${school?.slug}/settings/academic-calendar`}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {t("nav:items.academicCalendar")}
                </Link>
                <Link
                  to={`/${school?.slug}/calendar`}
                  className="text-sm font-bold text-slate-500 hover:text-indigo-600"
                >
                  {t("examDetails.schoolCalendar")}
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          {canManageSchedules && !selectedClassroom && (
            <button
              type="button"
              onClick={() => setShowSchedule(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              {t("pages:exams.manageSchedule")}
            </button>
          )}
          {(isAdmin || isTeacher) && !selectedClassroom && (
            <Link
              to={`/${school?.slug}/exams/${examId}/paper`}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <Monitor className="w-4 h-4" />
              {t("examDetails.examPaper")}
            </Link>
          )}
          {isAdmin && !selectedClassroom && (
            <>
              <button 
                type="button"
                onClick={handleProcessResults}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <BarChart3 className="w-4 h-4" />
                {processing ? t("examDetails.processing") : t("examDetails.processResults")}
              </button>
              <button 
                type="button"
                onClick={handleToggleRelease}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  exam.isGradesReleased 
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {exam.isGradesReleased ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {exam.isGradesReleased ? t("examDetails.gradesReleased") : t("examDetails.releaseGrades")}
              </button>
            </>
          )}
          {selectedClassroom && isTeacher && school?.id && exam && (
            <Link
              to={`/${school.slug}/gradebook?examId=${examId}&classId=${selectedClassroom}`}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {t("examDetails.openGradebook")}
            </Link>
          )}
        </div>
      </motion.div>

      {!selectedClassroom ? (
        renderSelectionView()
      ) : isTeacher && school?.id && exam ? (
        <ExamGradeEntryPanel
          schoolId={school.id}
          examId={examId!}
          examTitle={exam.title}
          examComponentId={exam.examComponentId}
          classId={selectedClassroom}
          className={
            teacherClassrooms.find((c) => c.id === selectedClassroom)?.name
          }
          subjectId={
            teacherClassrooms.find((c) => c.id === selectedClassroom)?.subject
              ?.id || ""
          }
          subjectName={
            teacherClassrooms.find((c) => c.id === selectedClassroom)?.subject
              ?.name
          }
          onBack={() => setSelectedClassroom(null)}
          showToast={showToast}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
              <DataTable>
                <table className={dataTableClass.table}>
                  <thead className={dataTableClass.thead}>
                    <tr>
                      <th className={dataTableClass.th}>{t("examDetails.table.student")}</th>
                      <th className={dataTableClass.th}>{t("examDetails.table.gradePercent")}</th>
                      <th className={dataTableClass.th}>{t("examDetails.table.status")}</th>
                      <th className={dataTableClass.thEnd}>{t("examDetails.table.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className={dataTableClass.tbody}>
                    {grades.map((grade) => (
                      <tr key={grade.studentId} className="hover:bg-slate-50/50 transition-colors">
                        <td className={`${dataTableClass.td} font-bold text-slate-900`}>
                          <span className="truncate block">{grade.student.name}</span>
                        </td>
                        <td className={dataTableClass.td}>
                          <input 
                            type="number"
                            min="0" max="100" step="0.1"
                            value={grade.grade ?? ""}
                            disabled={grade.isLocked || (isTeacher && grade.status === "SUBMITTED")}
                            onChange={(e) => handleGradeChange(grade.studentId, e.target.value)}
                            className="w-24 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors disabled:opacity-50"
                          />
                        </td>
                        <td className={dataTableClass.td}>
                          <div className="flex flex-col gap-1">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${
                              grade.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-600" :
                              grade.status === "REJECTED" ? "bg-rose-50 text-rose-600" :
                              grade.status === "SUBMITTED" ? "bg-amber-50 text-amber-600" :
                              "bg-slate-50 text-slate-500"
                            }`}>
                              {grade.status === "SUBMITTED" ? t("examDetails.pendingReview") : t(`common:gradeStatus.${grade.status}`, { defaultValue: grade.status })}
                            </div>
                            {grade.status === "REJECTED" && grade.feedback && (
                              <div className="flex items-center gap-1 text-xs text-rose-500 font-bold italic max-w-[150px]">
                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate" title={grade.feedback}>{grade.feedback}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`${dataTableClass.td} text-end`}>
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && grade.status === "SUBMITTED" && (
                              <Link
                                to={`/${school?.slug}/grade-review`}
                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100"
                              >
                                {t("examDetails.reviewQueue")}
                              </Link>
                            )}
                            {isAdmin && grade.status === "ACCEPTED" && (
                              <button
                                type="button"
                                onClick={() => handleReopen(grade.studentId)}
                                className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100"
                              >
                                {t("examDetails.reopen")}
                              </button>
                            )}
                            {grade.id && (
                              <button type="button" onClick={() => setHistoryModal(grade)} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"><History className="w-5 h-5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t("examDetails.classInfo")}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t("examDetails.classInfoPanel.classroom")}</span>
                  <span className="font-bold text-slate-900">
                    {isTeacher 
                      ? teacherClassrooms.find(c => c.id === selectedClassroom)?.name 
                      : submissionsSummary.find(s => s.classroom.id === selectedClassroom)?.classroom.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t("examDetails.classInfoPanel.subject")}</span>
                  <span className="font-bold text-indigo-600">
                    {isTeacher 
                      ? teacherClassrooms.find(c => c.id === selectedClassroom)?.subject.name 
                      : submissionsSummary.find(s => s.classroom.id === selectedClassroom)?.classroom.subject.name}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">{t("examDetails.classInfoPanel.completion")}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {Math.round((grades.filter(g => g.status === "ACCEPTED").length / grades.length) * 100 || 0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${(grades.filter(g => g.status === "ACCEPTED").length / grades.length) * 100 || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <HistoryModal
          historyModal={historyModal}
          setHistoryModal={setHistoryModal}
          user={user}
        />
      )}

      <AnimatePresence>
        {resultsModal && (
          <ResultsModal
            generateReportCard={generateReportCard}
            resultsModal={resultsModal}
            setResultsModal={setResultsModal}
          />
        )}
        {showSchedule && exam && (
          <ExamScheduleModal
            examId={exam.id}
            examTitle={exam.title}
            onClose={() => setShowSchedule(false)}
            onChanged={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

