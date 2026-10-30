import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Download } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { confirmAction } from "../../lib/swal";
import { lessonPlansApi } from "./api";
import { LessonPlansChrome, LessonPlansEmpty } from "./components/LessonPlansChrome";
import { LessonPlansHelp } from "./components/LessonPlansHelp";
import { useAcademicCalendarQuery } from "../academic-calendar/hooks/useAcademicCalendarQuery";
import {
  clampWeekStartToPeriod,
  normalizeCalendarPeriods,
  periodContainingDate,
  weekStartOf as calendarWeekStartOf,
} from "../academics-shared/syllabusCalendar";
import { WeekStrip } from "./components/WeekStrip";
import { WeekBoard } from "./components/WeekBoard";
import { LessonPlanList } from "./components/LessonPlanList";
import { LessonPlanBuilder } from "./components/LessonPlanBuilder";
import { LessonPlanDetail } from "./components/LessonPlanDetail";
import { TemplatesPanel } from "./components/TemplatesPanel";
import { SyllabusUnitPicker } from "./components/SyllabusUnitPicker";
import type { LessonPlan, LessonPlanForm, LessonPlanTemplate, SyllabusWithUnits } from "./types";
import {
  addDays,
  canReviewLessonPlans,
  emptyForm,
  formFromPlan,
  formToPayload,
  formatDayLabel,
  todayIso,
  weekStartOf,
} from "./utils";
import { downloadLessonPlanPdf, downloadWeekPackPdf } from "./lib/lessonPlanPdf";
import { useTranslation } from "react-i18next";
import { ListFilterBar, ListPagination } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";

type Tab = "mine" | "pending" | "all" | "library";

export function LessonPlansPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user, capabilities } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const isReviewer = canReviewLessonPlans(user?.role, capabilities);
  const isTeacher = user?.role === "TEACHER";

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "status",
        label: t("common:status"),
        type: "enum",
        primary: true,
        allLabel: t("lessonPlans.statusFilter"),
        options: [
          { value: "DRAFT", label: t("lessonPlans.status.draft") },
          { value: "SUBMITTED", label: t("lessonPlans.status.inReview") },
          { value: "APPROVED", label: t("lessonPlans.status.approved") },
          { value: "RETURNED", label: t("lessonPlans.status.returned") },
        ],
      },
    ],
    [t]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [plansTotal, setPlansTotal] = useState(0);
  const [pending, setPending] = useState<LessonPlan[]>([]);
  const [templates, setTemplates] = useState<LessonPlanTemplate[]>([]);
  const [syllabi, setSyllabi] = useState<SyllabusWithUnits[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [gradeLevels, setGradeLevels] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [schedulePeriods, setSchedulePeriods] = useState<
    Array<{ id: string; label: string; shortCode: string; startTime: string; endTime: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [lookupsError, setLookupsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [tab, setTab] = useState<Tab>(isReviewer ? "pending" : "mine");
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayIso()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { calendar } = useAcademicCalendarQuery();
  const calendarPeriods = useMemo(
    () => normalizeCalendarPeriods(calendar?.periods),
    [calendar]
  );

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  useEffect(() => {
    if (calendarPeriods.length === 0) {
      setSelectedPeriodId(null);
      return;
    }
    const today = todayIso();
    const match =
      periodContainingDate(calendarPeriods, today) ?? calendarPeriods[0];
    setSelectedPeriodId(match.id ?? null);
    if (match.id) {
      setWeekStart(clampWeekStartToPeriod(calendarWeekStartOf(today), match));
    }
  }, [calendarPeriods]);

  const selectedPeriod =
    calendarPeriods.find((p) => p.id === selectedPeriodId) ?? null;

  const handlePeriodChange = useCallback(
    (periodId: string) => {
      const period = calendarPeriods.find((p) => p.id === periodId);
      if (!period) return;
      setSelectedPeriodId(periodId);
      const anchor = periodContainingDate(calendarPeriods, todayIso())
        ? todayIso()
        : period.startDate;
      setWeekStart(clampWeekStartToPeriod(calendarWeekStartOf(anchor), period));
      setSelectedDate(null);
    },
    [calendarPeriods]
  );

  const handleWeekStartChange = useCallback(
    (next: string) => {
      if (selectedPeriod) {
        setWeekStart(clampWeekStartToPeriod(next, selectedPeriod));
        return;
      }
      setWeekStart(next);
    },
    [selectedPeriod]
  );

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonPlanForm>(() => emptyForm(todayIso()));
  const [draftRestored, setDraftRestored] = useState(false);
  const draftHydrated = React.useRef(false);
  const draftKey =
    school?.id && user?.id
      ? `gnet:lesson-plan-draft:v1:${school.id}:${user.id}`
      : null;
  const [selected, setSelected] = useState<LessonPlan | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    draftHydrated.current = false;
    setDraftRestored(false);
    if (!draftKey) return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw);
        const value = saved?.version === 1 ? saved.form : null;
        if (
          value &&
          typeof value === "object" &&
          typeof value.lessonDate === "string" &&
          typeof value.subjectId === "string" &&
          Array.isArray(value.objectives) &&
          Array.isArray(value.activities)
        ) {
          setForm(value as LessonPlanForm);
          setDraftRestored(true);
        } else {
          window.localStorage.removeItem(draftKey);
        }
      }
    } catch (err) {
      console.error("Could not restore lesson plan draft", err);
      setLookupsError(t("lessonPlans.draft.restoreFailed", {
        defaultValue: "Could not restore the saved draft from this browser.",
      }));
    } finally {
      draftHydrated.current = true;
    }
  }, [draftKey, t]);

  useEffect(() => {
    if (!builderOpen || editingId || !draftKey || !draftHydrated.current) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ version: 1, form }));
      } catch (err) {
        console.error("Could not save lesson plan draft", err);
        setLookupsError(t("lessonPlans.draft.saveFailed", {
          defaultValue: "Could not save this draft in your browser.",
        }));
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [builderOpen, editingId, draftKey, form, t]);

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLookupsLoading(true);
    setLookupsError("");
    try {
      const scope = isReviewer && tab === "all" ? "all" : "mine";
      const listParams: Record<string, string> = {
        scope: isTeacher ? "mine" : scope,
        page: String(filters.page),
        pageSize: String(filters.pageSize),
      };
      if (filters.committedQ.trim()) listParams.q = filters.committedQ.trim();
      if (filters.values.status && tab !== "pending" && tab !== "library") {
        listParams.status = filters.values.status;
      }
      if (tab !== "pending" && tab !== "library") {
        listParams.from = weekStart;
        listParams.to = addDays(weekStart, 6);
      }
      const [list, pendingList, tpl, syl, subs, grades, rooms, bells] = await Promise.all([
        lessonPlansApi.list(school.id, listParams),
        isReviewer
          ? lessonPlansApi.pending(school.id).catch(() => [])
          : Promise.resolve([]),
        lessonPlansApi.listTemplates(school.id).catch(() => []),
        lessonPlansApi.listSyllabusUnits(school.id).catch(() => []),
        lessonPlansApi.fetchSubjects(school.id).catch((err) => {
          setLookupsError(err?.message || t("lessonPlans.toast.loadFailed"));
          return [];
        }),
        lessonPlansApi.fetchGradeLevels(school.id).catch((err) => {
          setLookupsError(err?.message || t("lessonPlans.toast.loadFailed"));
          return [];
        }),
        lessonPlansApi.fetchClassrooms(school.id).catch(() => []),
        lessonPlansApi.fetchBellSchedules(school.id).catch(() => []),
      ]);
      if (list && typeof list === "object" && "items" in (list as object)) {
        const env = list as unknown as { items: LessonPlan[]; total: number };
        setPlans(Array.isArray(env.items) ? env.items : []);
        setPlansTotal(Number(env.total) || 0);
      } else {
        const rows = Array.isArray(list) ? list : [];
        setPlans(rows);
        setPlansTotal(rows.length);
      }
      setPending(Array.isArray(pendingList) ? pendingList : []);
      setTemplates(Array.isArray(tpl) ? tpl : []);
      setSyllabi(Array.isArray(syl) ? syl : []);
      setSubjects(Array.isArray(subs) ? subs : []);
      setGradeLevels(Array.isArray(grades) ? grades : []);
      setClassrooms(Array.isArray(rooms) ? rooms : []);
      const bellList = Array.isArray(bells) ? bells : [];
      const activeBell = bellList.find((b) => b.isActive) || bellList[0];
      const periods = [...(activeBell?.periods || [])].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );
      setSchedulePeriods(periods);
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.loadFailed"), "error");
      setPlans([]);
      setPending([]);
    } finally {
      setLoading(false);
      setLookupsLoading(false);
    }
  }, [
    school?.id,
    isReviewer,
    isTeacher,
    tab,
    filters.values.status,
    filters.page,
    filters.pageSize,
    filters.committedQ,
    weekStart,
    showToast,
    t,
  ]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const sourceList = tab === "pending" ? pending : plans;
  const weekEnd = addDays(weekStart, 6);

  const weekPlans = useMemo(
    () => plans.filter((p) => p.lessonDate >= weekStart && p.lessonDate <= weekEnd),
    [plans, weekStart, weekEnd]
  );

  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of weekPlans) {
      map[p.lessonDate] = (map[p.lessonDate] || 0) + 1;
    }
    return map;
  }, [weekPlans]);

  const filtered = useMemo(() => {
    const q = filters.committedQ.trim().toLowerCase();
    return sourceList.filter((p) => {
      if (selectedDate && p.lessonDate !== selectedDate) return false;
      if (!selectedDate && tab !== "pending" && tab !== "library") {
        if (p.lessonDate < weekStart || p.lessonDate > weekEnd) return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.subjectName || "").toLowerCase().includes(q) ||
        (p.teacherName || "").toLowerCase().includes(q)
      );
    });
  }, [sourceList, filters.committedQ, selectedDate, weekStart, weekEnd, tab]);

  const openNew = () => {
    setEditingId(null);
    if (!draftRestored) setForm(emptyForm(selectedDate || todayIso()));
    setBuilderOpen(true);
  };

  const openEdit = (plan: LessonPlan) => {
    setEditingId(plan.id);
    setForm(formFromPlan(plan));
    setSelected(null);
    setBuilderOpen(true);
  };

  const saveDraft = async (alsoSubmit: boolean) => {
    if (!school?.id || !user) return;
    if (!form.subjectId) {
      showToast(t("lessonPlans.toast.selectSubject"), "error");
      return;
    }
    if (!form.lessonDate) {
      showToast(t("lessonPlans.toast.selectDate", { defaultValue: "Select a lesson date before saving." }), "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = formToPayload(form);
      let row: LessonPlan;
      if (editingId) {
        row = await lessonPlansApi.update(editingId, payload);
      } else {
        row = await lessonPlansApi.create(school.id, {
          ...payload,
          teacherId: user.id,
          teacherName: user.name || "Teacher",
        });
      }
      if (alsoSubmit) {
        await lessonPlansApi.submit(row.id);
        showToast(t("lessonPlans.toast.submittedApproval"), "success");
      } else {
        showToast(t("lessonPlans.toast.draftSaved"), "success");
      }
      setBuilderOpen(false);
      setEditingId(null);
      if (!editingId && draftKey) {
        window.localStorage.removeItem(draftKey);
        setDraftRestored(false);
      }
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.saveFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan: LessonPlan) => {
    const ok = await confirmAction({
      title: t("lessonPlans.confirm.deleteTitle"),
      text: t("lessonPlans.confirm.deleteText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await lessonPlansApi.remove(plan.id);
      showToast(t("lessonPlans.toast.deleted"), "info");
      if (selected?.id === plan.id) setSelected(null);
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.deleteFailed"), "error");
    }
  };

  const handleDuplicate = async (plan: LessonPlan) => {
    try {
      const row = await lessonPlansApi.duplicate(plan.id, {
        lessonDate: selectedDate || todayIso(),
      });
      showToast(t("lessonPlans.toast.duplicated"), "success");
      openEdit(row);
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.duplicateFailed"), "error");
    }
  };

  const handleReschedule = async (planId: string, lessonDate: string) => {
    try {
      await lessonPlansApi.reschedule(planId, lessonDate);
      showToast(t("lessonPlans.toast.moved", { date: formatDayLabel(lessonDate) }), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.rescheduleFailed"), "error");
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    const ok = await confirmAction({
      title: t("lessonPlans.confirm.approveTitle"),
      text: t("lessonPlans.confirm.approveText"),
      confirmText: t("lessonPlans.components.detail.approve"),
    });
    if (!ok) return;
    setProcessing(true);
    try {
      await lessonPlansApi.review(selected.id, { status: "APPROVED" });
      showToast(t("lessonPlans.toast.approved"), "success");
      setSelected(null);
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.approveFailed"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async (feedback: string) => {
    if (!selected) return;
    if (!feedback.trim()) {
      showToast(t("lessonPlans.toast.returnFeedbackRequired"), "error");
      return;
    }
    const ok = await confirmAction({
      title: t("lessonPlans.confirm.returnTitle"),
      text: t("lessonPlans.confirm.returnText"),
      confirmText: t("lessonPlans.components.detail.return"),
      danger: true,
    });
    if (!ok) return;
    setProcessing(true);
    try {
      await lessonPlansApi.review(selected.id, {
        status: "RETURNED",
        feedback: feedback.trim(),
      });
      showToast(t("lessonPlans.toast.returnedPlan"), "info");
      setSelected(null);
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.returnFailed"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await lessonPlansApi.saveAsTemplate(selected.id);
      showToast(t("lessonPlans.toast.templateSaved"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.templateSaveFailed"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!selected) return;
    const ok = await confirmAction({
      title: t("lessonPlans.confirm.shareTitle"),
      text: t("lessonPlans.confirm.shareText"),
      confirmText: t("lessonPlans.confirm.shareConfirm"),
    });
    if (!ok) return;
    setProcessing(true);
    try {
      const row = await lessonPlansApi.shareToClassroom(selected.id);
      setSelected(row);
      showToast(t("lessonPlans.toast.sharedMaterial"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.shareFailed"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleUseTemplate = async (tpl: LessonPlanTemplate) => {
    if (!school?.id) return;
    setSubmitting(true);
    try {
      const row = await lessonPlansApi.createFromTemplate(school.id, {
        templateId: tpl.id,
        lessonDate: selectedDate || todayIso(),
      });
      showToast(t("lessonPlans.toast.templateUsed"), "success");
      setTab("mine");
      openEdit(row);
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.templateUseFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (tpl: LessonPlanTemplate) => {
    const ok = await confirmAction({
      title: t("lessonPlans.confirm.deleteTemplateTitle"),
      text: t("lessonPlans.confirm.deleteTemplateText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await lessonPlansApi.deleteTemplate(tpl.id);
      showToast(t("lessonPlans.toast.templateDeleted"), "info");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.templateDeleteFailed"), "error");
    }
  };

  const handleFromSyllabus = async (syllabusPlanId: string, unitIndex: number) => {
    if (!school?.id) return;
    setSubmitting(true);
    try {
      const row = await lessonPlansApi.createFromSyllabusUnit(school.id, {
        syllabusPlanId,
        unitIndex,
        lessonDate: selectedDate || todayIso(),
      });
      showToast(t("lessonPlans.toast.syllabusDraft"), "success");
      setTab("mine");
      openEdit(row);
      await load();
    } catch (err: any) {
      showToast(err?.message || t("lessonPlans.toast.syllabusFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const canEditPlan = (plan: LessonPlan) => {
    if (!(plan.status === "DRAFT" || plan.status === "RETURNED")) return false;
    if (isReviewer && user?.role !== "TEACHER") return true;
    return plan.teacherId === user?.id;
  };

  const canDragPlan = (plan: LessonPlan) => canEditPlan(plan);

  const stats = {
    draft: plans.filter((p) => p.status === "DRAFT").length,
    submitted: isReviewer ? pending.length : plans.filter((p) => p.status === "SUBMITTED").length,
    approved: plans.filter((p) => p.status === "APPROVED").length,
    returned: plans.filter((p) => p.status === "RETURNED").length,
  };

  const selectedFresh =
    (selected && [...plans, ...pending].find((p) => p.id === selected.id)) || selected;

  const weekLabel = `${formatDayLabel(weekStart)} – ${formatDayLabel(weekEnd)}`;

  const tabs: { id: Tab; label: string }[] = isReviewer
    ? [
        { id: "pending", label: t("lessonPlans.tabs.pending") },
        { id: "mine", label: t("lessonPlans.tabs.mine") },
        { id: "all", label: t("lessonPlans.tabs.all") },
        { id: "library", label: t("lessonPlans.tabs.library") },
      ]
    : [
        { id: "mine", label: t("lessonPlans.tabs.mine") },
        { id: "library", label: t("lessonPlans.tabs.library") },
      ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <LessonPlansChrome
        isReviewer={isReviewer}
        pendingCount={pending.length}
        loading={loading}
        onRefresh={() => {
          setLoading(true);
          void load();
        }}
        onNew={openNew}
        showNew={Boolean(user)}
        showHelp={showHelp}
        onToggleHelp={() => setShowHelp((v) => !v)}
        title={t("lessonPlans.title")}
        subtitle={t("lessonPlans.subtitle")}
      />

      <LessonPlansHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        slug={school?.slug}
        isReviewer={isReviewer}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("lessonPlans.stats.drafts"), value: stats.draft },
          { label: t("lessonPlans.stats.inReview"), value: stats.submitted },
          { label: t("lessonPlans.stats.approved"), value: stats.approved },
          { label: t("lessonPlans.stats.returned"), value: stats.returned },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2"
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {loading ? "—" : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-100 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
              tab === t.id ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"
            }`}
          >
            {t.label}
            {t.id === "pending" && pending.length > 0 ? (
              <span className="ml-2 font-mono text-xs text-amber-600">{pending.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TemplatesPanel
            templates={templates}
            onUse={(tpl) => void handleUseTemplate(tpl)}
            onDelete={(tpl) => void handleDeleteTemplate(tpl)}
            canDelete={(tpl) =>
              tpl.createdById === user?.id || Boolean(isReviewer && user?.role !== "TEACHER")
            }
          />
          <SyllabusUnitPicker
            syllabi={syllabi}
            busy={submitting}
            onCreate={(sid, idx) => void handleFromSyllabus(sid, idx)}
          />
        </div>
      ) : (
        <>
          {tab !== "pending" && (
            <>
              <WeekStrip
                weekStart={weekStart}
                selectedDate={selectedDate}
                countsByDate={countsByDate}
                onWeekStartChange={handleWeekStartChange}
                onSelectDate={setSelectedDate}
                periods={calendarPeriods}
                selectedPeriodId={selectedPeriodId}
                onPeriodChange={handlePeriodChange}
              />
              <WeekBoard
                weekStart={weekStart}
                plans={weekPlans}
                onOpen={setSelected}
                onReschedule={(id, date) => void handleReschedule(id, date)}
                canDrag={canDragPlan}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!weekPlans.length}
                  onClick={() =>
                    downloadWeekPackPdf(weekPlans, weekLabel, school?.name || undefined)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  {t("lessonPlans.downloadWeekPdf")}
                </button>
              </div>
            </>
          )}

          <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <ListFilterBar
              fields={tab !== "pending" ? filterFields : []}
              q={filters.q}
              onSearchChange={filters.setQ}
              values={filters.values}
              onValueChange={filters.setValue}
              onClear={filters.clear}
              searchPlaceholder={t("lessonPlans.searchPlaceholder")}
              shownCount={tab === "pending" ? filtered.length : plansTotal}
            />
          </div>

          {loading ? (
            <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-400 font-medium">
              {t("lessonPlans.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <LessonPlansEmpty
              title={tab === "pending" ? t("lessonPlans.empty.pendingTitle") : t("lessonPlans.empty.weekTitle")}
              body={
                tab === "pending"
                  ? t("lessonPlans.empty.pendingBody")
                  : t("lessonPlans.empty.weekBody")
              }
              actionLabel={tab === "pending" ? undefined : t("lessonPlans.chrome.newLesson")}
              onAction={tab === "pending" ? undefined : openNew}
            />
          ) : (
            <LessonPlanList
              plans={filtered}
              onOpen={setSelected}
              onEdit={openEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              canEdit={canEditPlan}
            />
          )}

          {!loading && tab !== "pending" && plansTotal > 0 ? (
            <ListPagination
              total={plansTotal}
              page={filters.page}
              pageSize={filters.pageSize}
              onPageChange={filters.setPage}
              onPageSizeChange={filters.setPageSize}
              className="rounded-2xl border border-slate-200 bg-white"
            />
          ) : null}
        </>
      )}

      <AnimatePresence>
        {builderOpen && (
          <LessonPlanBuilder
            open={builderOpen}
            form={form}
            setForm={setForm}
            subjects={subjects}
            gradeLevels={gradeLevels}
            classrooms={classrooms}
            schedulePeriods={schedulePeriods}
            calendar={calendar}
            submitting={submitting}
            editingId={editingId}
            lookupsLoading={lookupsLoading}
            lookupsError={lookupsError}
            draftRestored={draftRestored && !editingId}
            onStartBlank={() => {
              if (!draftKey) return;
              window.localStorage.removeItem(draftKey);
              setDraftRestored(false);
              setForm(emptyForm(selectedDate || todayIso()));
            }}
            onRetryLookups={() => void load()}
            onClose={() => setBuilderOpen(false)}
            onSave={() => void saveDraft(false)}
            onSaveAndSubmit={() => void saveDraft(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFresh && (
          <LessonPlanDetail
            plan={selectedFresh}
            isReviewer={isReviewer}
            processing={processing}
            onClose={() => setSelected(null)}
            onApprove={() => void handleApprove()}
            onReturn={(fb) => void handleReturn(fb)}
            onEdit={
              canEditPlan(selectedFresh) ? () => openEdit(selectedFresh) : undefined
            }
            onSaveTemplate={() => void handleSaveTemplate()}
            onShareClassroom={() => void handleShare()}
            onDownloadPdf={() =>
              downloadLessonPlanPdf(selectedFresh, school?.name || undefined)
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
