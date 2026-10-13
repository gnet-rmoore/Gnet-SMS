import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  User,
  Clock,
  ClipboardList,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  FeatureModalShell,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { confirmAction } from "../../../lib/swal";
import { UserAvatar } from "../../../components/UserAvatar";
import { gradeReviewApi } from "../api";
import {
  displayScore,
  groupIntoBundles,
  gradebookHref,
  type ReviewGrade,
  type SubmissionBundle,
} from "../types";
import { ListFilterBar } from "../../../components/ui";
import { useListFilters, type FilterFieldDef } from "../../list-filters";

type Props = {
  schoolId: string;
  slug: string;
  grades: ReviewGrade[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
};

export function ReviewerQueue({
  schoolId,
  slug,
  grades,
  loading,
  onRefresh,
  showToast,
}: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [rejectModal, setRejectModal] = React.useState<{
    ids: string[];
    feedback: string;
    label: string;
  } | null>(null);

  const teachers = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of grades) {
      const id = g.enteredBy || g.teacher?.id;
      if (id) map.set(id, g.teacher?.name || "Teacher");
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [grades]);

  const classrooms = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of grades) {
      if (g.classId) map.set(g.classId, g.classroom?.name || "Classroom");
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [grades]);

  const filterFields: FilterFieldDef[] = React.useMemo(
    () => [
      {
        key: "teacherId",
        label: "Teacher",
        type: "enum",
        primary: true,
        allLabel: "All teachers",
        options: teachers.map(([value, label]) => ({ value, label })),
      },
      {
        key: "classId",
        label: "Class",
        type: "enum",
        primary: true,
        allLabel: "All classes",
        options: classrooms.map(([value, label]) => ({ value, label })),
      },
    ],
    [teachers, classrooms]
  );

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const filtered = React.useMemo(() => {
    const q = filters.committedQ.toLowerCase().trim();
    return grades.filter((g) => {
      if (
        filters.values.teacherId &&
        (g.enteredBy || g.teacher?.id) !== filters.values.teacherId
      )
        return false;
      if (filters.values.classId && g.classId !== filters.values.classId) return false;
      if (!q) return true;
      return (
        (g.student?.name || "").toLowerCase().includes(q) ||
        (g.student?.email || "").toLowerCase().includes(q) ||
        (g.assessmentTitle || "").toLowerCase().includes(q) ||
        (g.exam?.title || "").toLowerCase().includes(q) ||
        (g.teacher?.name || "").toLowerCase().includes(q) ||
        (g.classroom?.name || "").toLowerCase().includes(q) ||
        (g.subject?.name || "").toLowerCase().includes(q)
      );
    });
  }, [grades, filters.committedQ, filters.values.teacherId, filters.values.classId]);

  const bundles = React.useMemo(() => groupIntoBundles(filtered), [filtered]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelect = (ids: string[], on?: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldOn = on ?? !ids.every((id) => next.has(id));
      for (const id of ids) {
        if (shouldOn) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    const ids = filtered.map((g) => g.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    toggleSelect(ids, !allOn);
  };

  const runReview = async (
    ids: string[],
    status: "ACCEPTED" | "REJECTED",
    feedback?: string
  ) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      if (ids.length === 1) {
        await gradeReviewApi.reviewEntry(ids[0], {
          status,
          feedback,
          isLocked: status === "ACCEPTED",
        });
      } else {
        const result = await gradeReviewApi.reviewBatch(schoolId, {
          ids,
          status,
          feedback,
        });
        if (result?.failed?.length) {
          showToast(
            `${result.reviewed} updated, ${result.failed.length} failed`,
            "error"
          );
        } else {
          showToast(
            status === "ACCEPTED"
              ? `Approved ${result?.reviewed ?? ids.length} grades`
              : `Returned ${result?.reviewed ?? ids.length} grades`,
            "success"
          );
        }
        setSelected(new Set());
        setRejectModal(null);
        await onRefresh();
        return;
      }
      showToast(
        status === "ACCEPTED" ? "Grade approved" : "Grade returned to teacher",
        "success"
      );
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setRejectModal(null);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || "Failed to update grade", "error");
    } finally {
      setBusy(false);
    }
  };

  const approveIds = async (ids: string[], label: string) => {
    const ok = await confirmAction({
      title: ids.length > 1 ? "Approve this submission?" : "Approve this grade?",
      text:
        ids.length > 1
          ? `${label} — ${ids.length} student marks will lock as accepted.`
          : label,
      confirmText: "Approve",
      icon: "question",
    });
    if (!ok) return;
    await runReview(ids, "ACCEPTED");
  };

  const avgScore = (bundle: SubmissionBundle) => {
    const scores = bundle.grades
      .map((g) => g.score)
      .filter((s): s is number => s != null && !Number.isNaN(s));
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-[32px] text-white sm:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Awaiting review
          </p>
          <p className="text-3xl font-extrabold tracking-tight font-mono mt-2">
            {grades.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {bundles.length} submission{bundles.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Teachers in queue</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            {teachers.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Selected</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            {selected.size}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1">
          <ListFilterBar
            fields={filterFields}
            q={filters.q}
            onSearchChange={filters.setQ}
            values={filters.values}
            onValueChange={filters.setValue}
            onClear={filters.clear}
            searchPlaceholder="Search student, assessment, class, teacher…"
            shownCount={filtered.length}
          />
        </div>
        <button
          type="button"
          onClick={selectAllVisible}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 shrink-0"
        >
          {filtered.length && filtered.every((g) => selected.has(g.id))
            ? "Clear"
            : "Select all"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <p className="text-sm font-bold text-indigo-900">
            <span className="font-mono">{selected.size}</span> selected
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                approveIds([...selected], `${selected.size} selected marks`)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve selected
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setRejectModal({
                  ids: [...selected],
                  feedback: "",
                  label: `${selected.size} selected marks`,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Return selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-white border border-slate-200 rounded-[32px] animate-pulse"
            />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            Queue is clear
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
            {filters.hasActiveFilters
              ? "No submissions match your filters."
              : "No teacher submissions waiting for review."}
          </p>
          {filters.hasActiveFilters && (
            <button
              type="button"
              onClick={filters.clear}
              className="mt-4 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle, index) => {
            const open = expanded.has(bundle.key);
            const ids = bundle.grades.map((g) => g.id);
            const allSelected = ids.every((id) => selected.has(id));
            const avg = avgScore(bundle);
            return (
              <motion.div
                key={bundle.key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleSelect(ids)}
                      className="mt-1.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label="Select submission"
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpand(bundle.key)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        {open ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Submission
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">
                        {bundle.assessmentTitle}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {bundle.classroomName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {bundle.teacherName}
                        </span>
                        {bundle.subjectName && (
                          <span>{bundle.subjectName}</span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(bundle.updatedAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:pl-0 pl-8">
                    <div className="text-right mr-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Marks
                      </p>
                      <p className="font-mono font-extrabold text-slate-900">
                        {bundle.grades.length}
                        {avg != null && (
                          <span className="text-slate-400 font-bold text-xs ml-2">
                            avg {avg.toFixed(0)}%
                          </span>
                        )}
                      </p>
                    </div>
                    <Link
                      to={gradebookHref(slug, bundle)}
                      className="px-3 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Open gradebook
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        approveIds(
                          ids,
                          `${bundle.assessmentTitle} · ${bundle.classroomName}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve all
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setRejectModal({
                          ids,
                          feedback: "",
                          label: `${bundle.assessmentTitle} · ${bundle.classroomName}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 font-bold text-sm rounded-xl hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Return all
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-50 overflow-hidden"
                    >
                      <div className="divide-y divide-slate-50">
                        {bundle.grades.map((grade) => {
                          const name = grade.student?.name || "Student";
                          return (
                            <div
                              key={grade.id}
                              className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selected.has(grade.id)}
                                  onChange={() => toggleSelect([grade.id])}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <UserAvatar
                                  name={name}
                                  userId={grade.student?.id}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <p className="font-extrabold tracking-tight text-slate-900 text-sm truncate">
                                    {name}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {grade.student?.email || "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 sm:pl-0 pl-8">
                                <span className="font-mono text-lg font-extrabold tracking-tight text-indigo-600">
                                  {displayScore(grade)}
                                </span>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    approveIds(
                                      [grade.id],
                                      `${name} — ${displayScore(grade)}`
                                    )
                                  }
                                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setRejectModal({
                                      ids: [grade.id],
                                      feedback: "",
                                      label: `${name} — ${displayScore(grade)}`,
                                    })
                                  }
                                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 rounded-xl hover:bg-rose-100 disabled:opacity-50"
                                >
                                  Return
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <FeatureModalShell
          eyebrow="Grade review"
          title="Return to teacher"
          subtitle={`${rejectModal.label} — share clear feedback so they can correct and resubmit.`}
          onClose={() => setRejectModal(null)}
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !rejectModal.feedback.trim()}
                onClick={() =>
                  runReview(
                    rejectModal.ids,
                    "REJECTED",
                    rejectModal.feedback.trim()
                  )
                }
                className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {busy ? "Returning…" : "Return with feedback"}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-2">
            <label className={fieldLabel}>Feedback for teacher</label>
            <textarea
              value={rejectModal.feedback}
              onChange={(e) =>
                setRejectModal({ ...rejectModal, feedback: e.target.value })
              }
              rows={5}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              placeholder="e.g. Recheck Question 4 scoring against the rubric…"
            />
          </div>
        </FeatureModalShell>
      )}
    </div>
  );
}
