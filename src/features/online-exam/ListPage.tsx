import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ClipboardCheck,
  Clock,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSelectedChild } from "../../hooks/useSelectedChild";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import { onlineExamApi } from "./api";
import { alertError } from "../../lib/swal";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function OnlineExamsListPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { user, school, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const isParent = user?.role === "PARENT";
  const isStudent = user?.role === "STUDENT";
  const isStaff = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"].includes(
    user?.role || ""
  );
  const { studentId: selectedChildId, selectChild } = useSelectedChild();
  const [children, setChildren] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);

  const studentId = isStudent ? user?.id : selectedChildId;

  React.useEffect(() => {
    if (!isParent || !user?.id) return;
    fetch(`/api/parents/${user.id}/children`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((data) => {
        const linked = Array.isArray(data)
          ? data.map((row: any) => ({ id: row.id, name: row.name }))
          : [];
        setChildren(linked);
        if (!selectedChildId && linked[0]?.id) selectChild(linked[0].id);
      })
      .catch(() => setChildren([]));
  }, [accessToken, isParent, selectChild, selectedChildId, user?.id]);

  React.useEffect(() => {
    if (!school?.id) return;
    if (isParent && !studentId) {
      setRows([]);
      setHistory([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await onlineExamApi.listOnlineExams(
          school.id,
          isParent ? studentId : undefined
        );
        if (cancelled) return;
        setRows(Array.isArray(list) ? list : []);
        if (studentId) {
          const attempts = await onlineExamApi.listStudentAttempts(studentId);
          if (!cancelled) setHistory(Array.isArray(attempts) ? attempts : []);
        }
      } catch (err: any) {
        await alertError(t("onlineExams.results.listLoadFailed"), err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, studentId, isParent]);

  const startExam = (examId: string, attempt?: any) => {
    if (attempt?.status === "IN_PROGRESS") {
      navigate(`/${school?.slug}/online-exams/${examId}/take/${attempt.id}`);
      return;
    }
    if (attempt && attempt.status !== "IN_PROGRESS") {
      navigate(`/${school?.slug}/online-exams/${examId}/results/${attempt.id}`);
      return;
    }
    navigate(`/${school?.slug}/online-exams/${examId}/take`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("onlineExams.title")}
          </h1>
          <p className="text-slate-500 font-medium">
            {t("onlineExams.subtitle")}
          </p>
        </div>
        {isParent && (
          <ChildSwitcher
            children={children}
            studentId={selectedChildId || ""}
            onChange={selectChild}
          />
        )}
        {isStaff && (
          <Link
            to={`/${school?.slug}/online-exams/sample/preview`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 shrink-0"
          >
            <Eye className="w-4 h-4" />
            {t("onlineExams.preview.trySample")}
          </Link>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          {t("onlineExams.empty")}
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((exam) => {
            const attempt = exam.attempt;
            const done = attempt && attempt.status !== "IN_PROGRESS";
            return (
              <div
                key={exam.id}
                className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold tracking-tight text-slate-900">{exam.title}</h2>
                      <p className="text-sm text-slate-500 font-mono">
                        {t("onlineExams.questionsMin", {
                          count: exam.questionCount,
                          minutes: exam.duration,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 inline-flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("onlineExams.windowEnds", {
                      date: format(new Date(exam.endDate), "MMM d, yyyy h:mm a"),
                    })}
                  </p>
                  {done && attempt.score != null && (
                    <p className="text-sm text-emerald-700 inline-flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {t("onlineExams.scoreSummary", {
                        score: attempt.score,
                        max: attempt.maxScore,
                        passed: attempt.passedCount,
                        missed: attempt.missedCount,
                      })}
                    </p>
                  )}
                  {attempt?.status === "AUTO_SUBMITTED" && (
                    <p className="text-sm text-rose-600 inline-flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> {t("onlineExams.autoSubmitted")}
                    </p>
                  )}
                </div>
                {isStaff && (
                  <Link
                    to={`/${school?.slug}/online-exams/${exam.id}/preview`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                    {t("onlineExams.preview.testThisExam")}
                  </Link>
                )}
                {isStudent && exam.canBeginOnline !== false && (
                  <>
                    {exam.retakeEligibility?.eligible && !attempt && exam.retakeEligibility.isFirstAttempt && (
                      <button
                        type="button"
                        onClick={() => startExam(exam.id, null)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shrink-0"
                      >
                        <Play className="w-4 h-4" />
                        {t("onlineExams.begin")}
                      </button>
                    )}
                    {exam.retakeEligibility?.eligible && !attempt && !exam.retakeEligibility.isFirstAttempt && (
                      <button
                        type="button"
                        onClick={() => startExam(exam.id, null)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shrink-0"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t("onlineExams.retakeExam", { attempt: exam.retakeEligibility.nextAttemptNumber })}
                      </button>
                    )}
                    {!exam.retakeEligibility?.eligible && !attempt && (
                      <button
                        type="button"
                        onClick={() => startExam(exam.id, attempt)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shrink-0"
                      >
                        <Play className="w-4 h-4" />
                        {t("onlineExams.begin")}
                      </button>
                    )}
                    {attempt && (
                      <button
                        type="button"
                        onClick={() => startExam(exam.id, attempt)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shrink-0"
                      >
                        <Play className="w-4 h-4" />
                        {done
                          ? t("onlineExams.viewResults")
                          : attempt?.status === "IN_PROGRESS"
                            ? t("onlineExams.continue")
                            : t("onlineExams.begin")}
                      </button>
                    )}
                  </>
                )}
                {isStudent && exam.canBeginOnline === false && (
                  <p className="text-sm text-slate-500 max-w-xs">
                    {exam.deliveryMode === "HYBRID"
                      ? t("onlineExams.offlineHybrid")
                      : t("onlineExams.offlineOnly")}
                  </p>
                )}
                {exam.deliveryMode && (
                  <p className="text-xs font-mono text-slate-400 w-full sm:w-auto">
                    {exam.deliveryMode}
                    {exam.sittingLeg ? ` · leg ${exam.sittingLeg}` : ""}
                  </p>
                )}
                {isParent && done && attempt?.id && (
                  <Link
                    to={`/${school?.slug}/online-exams/${exam.id}/results/${attempt.id}`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center justify-center shrink-0"
                  >
                    {t("onlineExams.viewScore")}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.recentAttempts")}</h2>
          <div className="divide-y divide-slate-100">
            {history.map((a) => (
              <Link
                key={a.id}
                to={`/${school?.slug}/online-exams/${a.examId}/results/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50 rounded-xl px-2"
              >
                <div>
                  <p className="font-medium text-slate-900">{a.exam?.title}</p>
                  <p className="text-xs text-slate-500 font-mono">{a.status}</p>
                </div>
                {a.score != null ? (
                  <p className="font-mono font-extrabold text-slate-900">
                    {a.score}/{a.maxScore}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">{t("onlineExams.scorePending")}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
