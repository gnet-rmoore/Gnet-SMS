import React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Plus,
  Calendar,
  Clock,
  ArrowRight,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  CalendarDays,
  Layers,
  Pencil,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { cardShell } from "../academics-shared/FeatureModalShell";
import { confirmAction } from "../../lib/swal";
import { useAcademicCalendarQuery } from "../academic-calendar/hooks/useAcademicCalendarQuery";
import { ScheduleExamModal } from "./components/ScheduleExamModal";
import { ExamScheduleModal } from "./components/ExamScheduleModal";
import { EditExamModal } from "./components/EditExamModal";
import { examsApi } from "./api";
import {
  emptyScheduleForm,
  type Exam,
  type ScheduleExamFormData,
} from "./types";
import {
  examIconTone,
  examStatusClass,
  examStatusLabel,
} from "./utils";
import { useTranslation } from "react-i18next";
import { ListFilterBar, Button, ListPagination } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

export const Exams = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const { calendar } = useAcademicCalendarQuery();
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [examsTotal, setExamsTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [formData, setFormData] = React.useState<ScheduleExamFormData>(emptyScheduleForm());
  const [submitting, setSubmitting] = React.useState(false);
  const [scheduleExam, setScheduleExam] = React.useState<Exam | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editExamForm, setEditExamForm] = React.useState<Partial<Exam>>({});
  const [editExamId, setEditExamId] = React.useState<string>("");

  const canSchedule = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || "");
  const canManageSchedules = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(
    user?.role || ""
  );
  const slug = school?.slug || "";

  const handleOpenEdit = (exam: Exam) => {
    setEditExamId(exam.id);
    setEditExamForm({
      title: exam.title,
      startDate: exam.startDate,
      endDate: exam.endDate,
      deliveryMode: exam.deliveryMode,
      paperDueAt: exam.paperDueAt,
    });
    setShowEditModal(true);
  };

  const handleEditSave = (form: Partial<Exam>) => {
    // TODO: call API to update exam
    showToast(t("exams.toast.updated"), "success");
    setShowEditModal(false);
  };
  const periods = Array.isArray(calendar?.periods) ? calendar.periods : [];

  const filterFields: FilterFieldDef[] = React.useMemo(
    () => [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("exams.allStatuses"),
        options: [
          { value: "SCHEDULED", label: t("common:examStatus.SCHEDULED") },
          { value: "IN_PROGRESS", label: t("common:examStatus.IN_PROGRESS") },
          { value: "ENDED", label: t("common:examStatus.ENDED") },
          { value: "COMPLETED", label: t("common:examStatus.COMPLETED") },
        ],
      },
      {
        key: "periodId",
        label: t("exams.periodLabel"),
        type: "enum",
        primary: true,
        allLabel: t("exams.allPeriods"),
        options: periods.map((p: any) => ({
          value: p.id,
          label: p.shortCode || p.label,
        })),
      },
    ],
    [t, periods]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const fetchExams = React.useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const raw = await examsApi.list(school.id, {
        page: String(filters.page),
        pageSize: String(filters.pageSize),
        ...(filters.committedQ.trim() ? { q: filters.committedQ.trim() } : {}),
        ...(filters.values.status ? { status: filters.values.status } : {}),
        ...(filters.values.periodId ? { periodId: filters.values.periodId } : {}),
      });
      if (raw && typeof raw === "object" && "items" in (raw as object)) {
        const env = raw as { items: Exam[]; total: number };
        setExams(Array.isArray(env.items) ? env.items : []);
        setExamsTotal(Number(env.total) || 0);
      } else {
        const list = Array.isArray(raw) ? raw : [];
        setExams(list);
        setExamsTotal(list.length);
      }
    } catch (err: any) {
      showToast(err?.message || t("exams.toast.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [
    school?.id,
    showToast,
    t,
    filters.page,
    filters.pageSize,
    filters.committedQ,
    filters.values.status,
    filters.values.periodId,
  ]);

  React.useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule || !school?.id) return;
    if (!formData.examComponentId) {
      showToast(t("exams.toast.selectPeriodComponent"), "error");
      return;
    }
    setSubmitting(true);
    try {
      await examsApi.create(school.id, {
        title: formData.title.trim(),
        // Dates are optional: the server inherits them from the linked
        // Academic Calendar component when omitted.
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        gradeSubmissionDeadline: formData.gradeSubmissionDeadline || undefined,
        duration: parseInt(formData.duration, 10) || undefined,
        examComponentId: formData.examComponentId,
        deliveryMode: formData.deliveryMode,
        paperDueAt: formData.paperDueAt || null,
      });
      setShowModal(false);
      setFormData(emptyScheduleForm());
      showToast(t("exams.toast.scheduled"), "success");
      fetchExams();
    } catch (err: any) {
      showToast(err?.message || t("exams.toast.scheduleFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRelease = async (
    examId: string,
    currentStatus: boolean,
    title: string
  ) => {
    if (!canSchedule) return;
    const releasing = !currentStatus;
    const ok = await confirmAction({
      title: releasing ? t("exams.confirm.releaseTitle") : t("exams.confirm.hideTitle"),
      text: releasing
        ? t("exams.confirm.releaseText", { title })
        : t("exams.confirm.hideText", { title }),
      confirmText: releasing ? t("exams.confirm.releaseConfirm") : t("exams.confirm.hideConfirm"),
      icon: "question",
    });
    if (!ok) return;

    try {
      await examsApi.releaseGrades(examId, releasing);
      showToast(releasing ? t("exams.toast.released") : t("exams.toast.setPrivate"));
      fetchExams();
    } catch (err: any) {
      showToast(err?.message || t("exams.toast.releaseFailed"), "error");
    }
  };

  const filteredExams = exams;

  const stats = {
    total: examsTotal,
    upcoming: exams.filter((e) => (e.displayStatus || e.status) === "SCHEDULED").length,
    active: exams.filter((e) => (e.displayStatus || e.status) === "IN_PROGRESS").length,
    pendingReview: exams.filter((e) => e.hasPendingGrades).length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 ${cardShell}`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t("common:assessmentEyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            {t("exams.title")}
          </h1>
          <p className="text-slate-500 font-medium mt-1 max-w-xl">
            {t("exams.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <Link
              to={`/${slug}/settings/academic-calendar`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {t("exams.linkAcademicCalendar")}
            </Link>
            <Link
              to={`/${slug}/calendar`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600"
            >
              <Calendar className="w-3.5 h-3.5" />
              {t("exams.linkSchoolCalendar")}
            </Link>
          </div>
        </div>

        {canSchedule && (
          <button
            type="button"
            onClick={() => {
              setFormData(emptyScheduleForm());
              setShowModal(true);
            }}
            disabled={!calendar}
            title={!calendar ? t("exams.setupCalendarFirst") : undefined}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" />
            {t("exams.scheduleExam")}
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("exams.stats.total"), value: stats.total, tone: "bg-slate-100 text-slate-600", icon: Layers },
          {
            label: t("exams.stats.upcoming"),
            value: stats.upcoming,
            tone: "bg-amber-50 text-amber-600",
            icon: Calendar,
          },
          {
            label: t("exams.stats.inProgress"),
            value: stats.active,
            tone: "bg-indigo-50 text-indigo-600",
            icon: Clock,
          },
          {
            label: t("exams.stats.pendingReview"),
            value: stats.pendingReview,
            tone: "bg-rose-50 text-rose-600",
            icon: AlertCircle,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${cardShell} p-5 space-y-2`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.tone}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className={`${cardShell} p-5 sm:p-6`}>
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          searchPlaceholder={t("exams.searchPlaceholder")}
          shownCount={examsTotal}
          savedViewsScope={school?.id ? `${school.id}:exams` : undefined}
        />
      </div>

      <AnimatePresence>
        {showModal && (
          <ScheduleExamModal
            formData={formData}
            setFormData={setFormData}
            onClose={() => {
              setShowModal(false);
              setFormData(emptyScheduleForm());
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
        {scheduleExam && (
          <ExamScheduleModal
            examId={scheduleExam.id}
            examTitle={scheduleExam.title}
            onClose={() => setScheduleExam(null)}
            onChanged={fetchExams}
          />
        )}
        {showEditModal && editExamId && (
          <EditExamModal
            examId={editExamId}
            initial={editExamForm}
            onClose={() => setShowEditModal(false)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-slate-100 animate-pulse rounded-[32px] border border-slate-200"
            />
          ))}
        </div>
      ) : filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam, index) => {
            const status = exam.displayStatus || exam.status;
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.3) }}
                className={`group ${cardShell} overflow-hidden`}
              >
                <div className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${examIconTone(
                        status
                      )}`}
                    >
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {exam.hasPendingGrades && (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-rose-100">
                          {t("exams.pendingReviewBadge")}
                        </span>
                      )}
                      {canManageSchedules && (
                        <button
                          type="button"
                          onClick={() => setScheduleExam(exam)}
                          className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-2"
                          title={t("exams.manageSchedule")}
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {t("exams.manageSchedule")}
                          </span>
                        </button>
                      )}
                      {canSchedule && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleRelease(
                              exam.id,
                              exam.isGradesReleased,
                              exam.title
                            )
                          }
                          className={`p-2 rounded-xl transition-colors flex items-center gap-2 ${
                            exam.isGradesReleased
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          }`}
                          title={
                            exam.isGradesReleased
                              ? t("exams.gradesVisible")
                              : t("exams.gradesHidden")
                          }
                        >
                          {exam.isGradesReleased ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {exam.isGradesReleased ? t("exams.released") : t("exams.private")}
                          </span>
                        </button>
                      )}
                      { ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || "") && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exam)}
                          className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2"
                          title={t("exams.editExam")}
                        >
                          <Pencil className="w-4 h-4" /> {t("exams.editExam")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {exam.title}
                    </h3>
                    {exam.examComponent?.period ? (
                      <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {exam.examComponent.period.shortCode} · {exam.examComponent.label}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-slate-400">
                        {t("exams.notLinked")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 py-4 border-y border-slate-100">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-bold">
                        {format(new Date(exam.startDate), "MMM d, yyyy · p")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-bold font-mono">
                        {t("exams.durationMin", { count: exam.duration })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">
                        {t("exams.gradesDue", {
                          date: format(new Date(exam.gradeSubmissionDeadline), "MMM d, yyyy"),
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${examStatusClass(
                        status
                      )}`}
                    >
                      {status === "COMPLETED" || status === "ENDED" ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {examStatusLabel(status)}
                    </span>
                    <Link
                      to={`/${slug}/exams/${exam.id}`}
                      className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1"
                    >
                      {t("exams.details")}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={`${cardShell} text-center py-16 px-6`}>
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-100">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {exams.length === 0 ? t("exams.emptyNone") : t("exams.emptyFiltered")}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mt-2 font-medium text-sm">
            {exams.length === 0
              ? calendar
                ? t("exams.emptyNoneHint")
                : t("exams.emptyNoCalendarHint")
              : t("exams.emptyFilteredHint")}
          </p>
          {exams.length === 0 && canSchedule && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!calendar ? (
                <Link
                  to={`/${slug}/settings/academic-calendar`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
                >
                  {t("exams.setupCalendar")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  {t("exams.scheduleExam")}
                </button>
              )}
            </div>
          )}
          {exams.length > 0 && (
            <Button type="button" variant="secondary" size="compact" className="mt-4" onClick={filters.clear}>
              {t("exams.clearFilters")}
            </Button>
          )}
        </div>
      )}

      {!loading && examsTotal > 0 ? (
        <ListPagination
          total={examsTotal}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
          className={`${cardShell} px-4`}
        />
      ) : null}
    </div>
  );
};
