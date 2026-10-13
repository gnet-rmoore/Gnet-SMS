import React from "react";
import { motion } from "motion/react";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRight,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { UserAvatar } from "../../../components/UserAvatar";
import {
  displayScore,
  groupIntoBundles,
  gradebookHref,
  type ReviewGrade,
} from "../types";

type Tab = "REJECTED" | "SUBMITTED" | "ACCEPTED";

type Props = {
  slug: string;
  grades: ReviewGrade[];
  loading: boolean;
};

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "REJECTED", label: "Returned", hint: "Fix and resubmit" },
  { id: "SUBMITTED", label: "In review", hint: "Awaiting approval" },
  { id: "ACCEPTED", label: "Approved", hint: "Locked marks" },
];

export function TeacherSubmissions({ slug, grades, loading }: Props) {
  const [tab, setTab] = React.useState<Tab>("REJECTED");
  const [searchQuery, setSearchQuery] = React.useState("");
  const tabInitialized = React.useRef(false);

  const counts = React.useMemo(() => {
    const c = { REJECTED: 0, SUBMITTED: 0, ACCEPTED: 0 };
    for (const g of grades) {
      if (g.status in c) c[g.status as Tab]++;
    }
    return c;
  }, [grades]);

  React.useEffect(() => {
    if (loading || tabInitialized.current) return;
    tabInitialized.current = true;
    if (counts.REJECTED > 0) setTab("REJECTED");
    else if (counts.SUBMITTED > 0) setTab("SUBMITTED");
    else setTab("ACCEPTED");
  }, [loading, counts.REJECTED, counts.SUBMITTED, counts.ACCEPTED]);

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return grades.filter((g) => {
      if (g.status !== tab) return false;
      if (!q) return true;
      return (
        (g.student?.name || "").toLowerCase().includes(q) ||
        (g.assessmentTitle || "").toLowerCase().includes(q) ||
        (g.classroom?.name || "").toLowerCase().includes(q) ||
        (g.subject?.name || "").toLowerCase().includes(q)
      );
    });
  }, [grades, tab, searchQuery]);

  const bundles = React.useMemo(() => groupIntoBundles(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-[32px] text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
            Needs action
          </p>
          <p className="text-3xl font-extrabold tracking-tight font-mono mt-2">
            {counts.REJECTED}
          </p>
          <p className="text-xs text-slate-500 mt-1">Returned for correction</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
            <Send className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">In review</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            {counts.SUBMITTED}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Approved</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono mt-1">
            {counts.ACCEPTED}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-mono text-slate-400">
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter students or assessments…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 font-medium px-1">
        {TABS.find((t) => t.id === tab)?.hint}
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-white border border-slate-200 rounded-[32px] animate-pulse"
            />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
            {tab === "REJECTED" ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : tab === "SUBMITTED" ? (
              <Send className="w-7 h-7" />
            ) : (
              <CheckCircle2 className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {tab === "REJECTED"
              ? "Nothing to fix"
              : tab === "SUBMITTED"
                ? "Nothing in review"
                : "No approved marks yet"}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
            {tab === "REJECTED"
              ? "When a reviewer returns a submission, it will show here with feedback."
              : tab === "SUBMITTED"
                ? "Submit marks from Gradebook to send them for review."
                : "Approved grades appear here after leadership signs off."}
          </p>
          {(tab === "REJECTED" || tab === "SUBMITTED") && (
            <Link
              to={`/${slug}/gradebook`}
              className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm"
            >
              Open Gradebook
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle, index) => {
            const sampleFeedback = bundle.grades.find((g) => g.feedback)?.feedback;
            return (
              <motion.div
                key={bundle.key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">
                        {bundle.assessmentTitle}
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          tab === "REJECTED"
                            ? "bg-rose-50 text-rose-700"
                            : tab === "SUBMITTED"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {tab === "REJECTED"
                          ? "Returned"
                          : tab === "SUBMITTED"
                            ? "In review"
                            : "Approved"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {bundle.classroomName}
                      </span>
                      {bundle.subjectName && <span>{bundle.subjectName}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(bundle.updatedAt), "MMM d, h:mm a")}
                      </span>
                      <span className="font-mono">
                        {bundle.grades.length} marks
                      </span>
                    </div>
                  </div>
                  {tab !== "ACCEPTED" && (
                    <Link
                      to={gradebookHref(slug, bundle)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shrink-0"
                    >
                      {tab === "REJECTED" ? "Fix in Gradebook" : "View in Gradebook"}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {tab === "REJECTED" && sampleFeedback && (
                  <div className="px-5 sm:px-6 py-3 bg-rose-50/50 border-b border-rose-50 flex gap-2">
                    <MessageSquare className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-900 font-medium leading-relaxed">
                      {sampleFeedback}
                    </p>
                  </div>
                )}

                <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {bundle.grades.map((grade) => {
                    const name = grade.student?.name || "Student";
                    return (
                      <div
                        key={grade.id}
                        className="px-5 sm:px-6 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            name={name}
                            userId={grade.student?.id}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                              {name}
                            </p>
                            {grade.feedback && tab === "REJECTED" && (
                              <p className="text-xs text-rose-600 truncate">
                                {grade.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-extrabold text-slate-900">
                            {displayScore(grade)}
                          </span>
                          {tab === "REJECTED" && (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          {tab === "SUBMITTED" && (
                            <Clock className="w-4 h-4 text-amber-400" />
                          )}
                          {tab === "ACCEPTED" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
