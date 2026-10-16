import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { api } from "../../services/api";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Shield,
  ListChecks,
  Loader2,
  Eye,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { onlineExamApi, type OnlineQuestionInput, type OnlineExamConfig } from "./api";
import { emptyQuestion, type DraftQuestion, type QuestionType } from "./types";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { alertError } from "../../lib/swal";
import { ImportQuestionsModal } from "./ImportQuestionsModal";
import { useTranslation } from "react-i18next";

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "onlineExams.author.questionTypes.MULTIPLE_CHOICE",
  TRUE_FALSE: "onlineExams.author.questionTypes.TRUE_FALSE",
  FILL_BLANK: "onlineExams.author.questionTypes.FILL_BLANK",
  ESSAY: "onlineExams.author.questionTypes.ESSAY",
};

function fromApiQuestions(rows: any[]): DraftQuestion[] {
  return (rows || []).map((q) => {
    const base = emptyQuestion(q.type as QuestionType);
    return {
      ...base,
      key: q.id || crypto.randomUUID(),
      type: q.type,
      prompt: q.prompt || "",
      points: String(q.points ?? 1),
      correctAnswer: q.correctAnswer || "",
      correctBoolean:
        q.type === "TRUE_FALSE"
          ? q.choices?.find((c: any) => c.isCorrect)?.text === "True"
            ? "true"
            : "false"
          : "",
      caseSensitive: Boolean(q.caseSensitive),
      choices:
        q.type === "MULTIPLE_CHOICE"
          ? (q.choices || []).map((c: any, i: number) => ({
              key: c.id || crypto.randomUUID(),
              label: c.label || String.fromCharCode(65 + i),
              text: c.text || "",
              isCorrect: Boolean(c.isCorrect),
            }))
          : [],
    };
  });
}

function toApiQuestions(drafts: DraftQuestion[]): OnlineQuestionInput[] {
  return drafts.map((q) => {
    const points = Number(q.points);
    if (q.type === "MULTIPLE_CHOICE") {
      return {
        type: q.type,
        prompt: q.prompt.trim(),
        points,
        choices: q.choices.map((c) => ({
          label: c.label,
          text: c.text.trim(),
          isCorrect: c.isCorrect,
        })),
      };
    }
    if (q.type === "TRUE_FALSE") {
      return {
        type: q.type,
        prompt: q.prompt.trim(),
        points,
        correctBoolean: q.correctBoolean === "true",
      };
    }
    if (q.type === "FILL_BLANK") {
      return {
        type: q.type,
        prompt: q.prompt.trim(),
        points,
        correctAnswer: q.correctAnswer.trim(),
        caseSensitive: q.caseSensitive,
      };
    }
    return {
      type: "ESSAY",
      prompt: q.prompt.trim(),
      points,
    };
  });
}

export default function OnlineExamAuthorPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { school, user } = useAuthStore();
  const navigate = useNavigate();
  const { toast, showToast } = usePageToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState("Online exam");
  const [isOnline, setIsOnline] = React.useState(true);
  const [isQuiz, setIsQuiz] = React.useState(false);
  const [maxViolations, setMaxViolations] = React.useState("3");
  const [showResultsImmediately, setShowResultsImmediately] = React.useState(true);
  const [proctorLevel, setProctorLevel] = React.useState<"OFF" | "MONITOR" | "SCREEN_VIEW">("MONITOR");
  const [kioskFullscreen, setKioskFullscreen] = React.useState(true);
  const [kioskScreenShare, setKioskScreenShare] = React.useState(false);
  const [kioskAllowReconnect, setKioskAllowReconnect] = React.useState(true);
  const [kioskWarnAt, setKioskWarnAt] = React.useState("1");
  const [autoPostGrades, setAutoPostGrades] = React.useState(true);
  const [instructions, setInstructions] = React.useState("");
  const [questions, setQuestions] = React.useState<DraftQuestion[]>([emptyQuestion()]);
  const [classId, setClassId] = React.useState("");
  const [showImport, setShowImport] = React.useState(false);
  const [classrooms, setClassrooms] = React.useState<Array<{ id: string; name: string; grade?: string; subject?: string }>>([]);
  // Retake policy state
  const [retakeEnabled, setRetakeEnabled] = React.useState(false);
  const [maxRetakes, setMaxRetakes] = React.useState("1");
  const [waitingPeriodHours, setWaitingPeriodHours] = React.useState("0");
  const [scoreRetention, setScoreRetention] = React.useState<"best" | "last" | "average">("last");

  // Duration / max-violations / kiosk lockdown / retake policy are school
  // administration settings for exams; teachers may set them for quizzes only.
  const isSettingsAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user?.role || "");
  const canEditSettings = isSettingsAdmin || isQuiz;

  React.useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await onlineExamApi.getQuestions(examId);
        if (cancelled) return;
        setTitle(data.exam?.title || "Online exam");
        setIsOnline(Boolean(data.exam?.isOnline));
        setIsQuiz(Boolean(data.exam?.isQuiz));
        setMaxViolations(String(data.exam?.maxViolations ?? 3));
        setShowResultsImmediately(data.exam?.showResultsImmediately !== false);
        setInstructions(data.exam?.instructions || "");
        setClassId(data.exam?.classId || "");
        setProctorLevel(data.exam?.proctorLevel ?? "MONITOR");
        setAutoPostGrades(data.exam?.autoPostGrades !== false);
        const kiosk = data.exam?.kioskConfig;
        if (kiosk) {
          setKioskFullscreen(kiosk.requireFullscreen !== false);
          setKioskScreenShare(Boolean(kiosk.requireScreenShare));
          setKioskAllowReconnect(kiosk.allowReconnect !== false);
          setKioskWarnAt(String(kiosk.warnAt ?? 1));
        }
        // Load retake policy
        const policy = data.exam?.retakePolicy;
        if (policy) {
          setRetakeEnabled(true);
          setMaxRetakes(String(policy.maxRetakes ?? 1));
          setWaitingPeriodHours(String(policy.waitingPeriodHours ?? 0));
          setScoreRetention(policy.scoreRetention ?? "last");
        }
        const drafts = fromApiQuestions(data.questions || []);
        setQuestions(drafts.length ? drafts : [emptyQuestion()]);
        // Load school classrooms for audience selector
        try {
          const cls = await api.get(`/api/schools/${school?.id}/classrooms`);
          setClassrooms(cls);
        } catch {
          // ignore
        }
      } catch (err: any) {
        await alertError(t("onlineExams.author.loadFailed"), err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  const refreshQuestions = async () => {
    if (!examId) return;
    try {
      const data = await onlineExamApi.getQuestions(examId);
      const drafts = fromApiQuestions(data.questions || []);
      setQuestions(drafts.length ? drafts : [emptyQuestion()]);
    } catch (err: any) {
      await alertError(t("onlineExams.author.loadFailed"), err?.message);
    }
  };

  const changeType = (key: string, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key) return q;
        const next = emptyQuestion(type);
        return { ...next, key: q.key, prompt: q.prompt, points: q.points };
      })
    );
  };

  const handleSave = async () => {
    if (!examId) return;
    setSaving(true);
    try {
      const config: OnlineExamConfig = {
        isOnline,
        showResultsImmediately,
        instructions: instructions.trim() || null,
        classId: classId || null,
        proctorLevel,
        autoPostGrades,
      };
      if (canEditSettings) {
        const blockedEvents: string[] = ["TAB_BLUR", "VISIBILITY_HIDDEN", "COPY_ATTEMPT"];
        if (kioskFullscreen) blockedEvents.push("EXIT_FULLSCREEN");
        if (kioskScreenShare) blockedEvents.push("SCREEN_SHARE_STOPPED");
        config.maxViolations = Number(maxViolations) || 0;
        config.kioskConfig = {
          requireFullscreen: kioskFullscreen,
          requireScreenShare: kioskScreenShare,
          allowReconnect: kioskAllowReconnect,
          warnAt: Number(kioskWarnAt) || 0,
          maxViolations: Number(maxViolations) || 0,
          blockedEvents: blockedEvents as any,
        };
        config.retakePolicy = retakeEnabled
          ? {
              maxRetakes: Number(maxRetakes) || 0,
              waitingPeriodHours: Number(waitingPeriodHours) || 0,
              scoreRetention,
            }
          : null;
      }
      await onlineExamApi.updateConfig(examId, config);
      await onlineExamApi.saveQuestions(examId, toApiQuestions(questions));
      showToast(t("onlineExams.author.saved"));
      navigate(`/${school?.slug}/exams/${examId}`);
    } catch (err: any) {
      await alertError(t("onlineExams.author.saveFailed"), err?.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 flex items-center justify-center text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.loadingOnline")}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <PageToast toast={toast} />
      {examId ? (
        <ImportQuestionsModal
          examId={examId}
          open={showImport}
          onClose={() => setShowImport(false)}
          existingCount={questions.filter((q) => q.prompt.trim()).length}
          onImported={refreshQuestions}
        />
      ) : null}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <Link
            to={`/${school?.slug}/exams/${examId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onlineExams.backToExam")}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("onlineExams.author.title")}
          </h1>
          <p className="text-slate-500 font-medium">{title}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/${school?.slug}/online-exams/${examId}/preview`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" />
            {t("onlineExams.preview.testThisExam")}
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("onlineExams.author.save")}
          </button>
        </div>
      </motion.div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.author.kioskLockdown")}</h2>
            <p className="text-sm text-slate-500">{t("onlineExams.author.kioskHint")}</p>
          </div>
        </div>
        {!canEditSettings && (
          <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("onlineExams.author.settingsAdminOnly")}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.enableKiosk")}</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={showResultsImmediately}
              onChange={(e) => setShowResultsImmediately(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.showScoreAfter")}</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={kioskFullscreen}
              disabled={!canEditSettings}
              onChange={(e) => setKioskFullscreen(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.requireFullscreen")}</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={kioskScreenShare}
              disabled={!canEditSettings}
              onChange={(e) => {
                setKioskScreenShare(e.target.checked);
                if (e.target.checked && proctorLevel === "OFF") setProctorLevel("SCREEN_VIEW");
              }}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.requireScreenShare")}</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={kioskAllowReconnect}
              disabled={!canEditSettings}
              onChange={(e) => setKioskAllowReconnect(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.allowReconnect")}</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={autoPostGrades}
              onChange={(e) => setAutoPostGrades(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.autoPostGrades")}</span>
          </label>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("onlineExams.author.proctorLevel")}
            </label>
            <select
              value={proctorLevel}
              onChange={(e) => setProctorLevel(e.target.value as "OFF" | "MONITOR" | "SCREEN_VIEW")}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="OFF">{t("onlineExams.author.proctorLevelOptions.off")}</option>
              <option value="MONITOR">{t("onlineExams.author.proctorLevelOptions.monitor")}</option>
              <option value="SCREEN_VIEW">{t("onlineExams.author.proctorLevelOptions.screenView")}</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.proctorLevelHint")}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("onlineExams.author.warnAt")}
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={kioskWarnAt}
              disabled={!canEditSettings}
              onChange={(e) => setKioskWarnAt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.warnAtHint")}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("onlineExams.author.audience")}
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="">{t("onlineExams.author.audienceAll")}</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.grade ? `(${c.grade})` : ""} {c.subject ? `— ${c.subject}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.audienceHint")}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("onlineExams.author.maxViolations")}
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={maxViolations}
              disabled={!canEditSettings}
              onChange={(e) => setMaxViolations(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.maxViolationsHint")}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("onlineExams.author.studentInstructions")}
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder={t("onlineExams.author.instructionsPlaceholder")}
            />
          </div>
        </div>
      </div>

      {/* Retake Policy Section */}
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.author.retakePolicy")}</h2>
            <p className="text-sm text-slate-500">{t("onlineExams.author.retakePolicyHint")}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <input
              type="checkbox"
              checked={retakeEnabled}
              disabled={!canEditSettings}
              onChange={(e) => setRetakeEnabled(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
            />
            <span className="font-medium text-slate-800">{t("onlineExams.author.enableRetakes")}</span>
          </label>
          <div className="flex items-center">
            {!canEditSettings && (
              <p className="text-xs text-slate-500">{t("onlineExams.author.settingsAdminOnly")}</p>
            )}
          </div>
          {retakeEnabled && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("onlineExams.author.maxRetakes")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={maxRetakes}
                  disabled={!canEditSettings}
                  onChange={(e) => setMaxRetakes(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono disabled:opacity-60"
                />
                <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.maxRetakesHint")}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("onlineExams.author.waitingPeriodHours")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={waitingPeriodHours}
                  disabled={!canEditSettings}
                  onChange={(e) => setWaitingPeriodHours(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono disabled:opacity-60"
                />
                <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.waitingPeriodHoursHint")}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("onlineExams.author.scoreRetention")}
                </label>
                <select
                  value={scoreRetention}
                  disabled={!canEditSettings}
                  onChange={(e) => setScoreRetention(e.target.value as "best" | "last" | "average")}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 disabled:opacity-60"
                >
                  <option value="last">{t("onlineExams.author.scoreRetention.last")}</option>
                  <option value="best">{t("onlineExams.author.scoreRetention.best")}</option>
                  <option value="average">{t("onlineExams.author.scoreRetention.average")}</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">{t("onlineExams.author.scoreRetentionHint")}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.author.questions")}</h2>
              <p className="text-sm text-slate-500 font-mono">
                {t("onlineExams.author.questionsCount", { count: questions.length })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="w-4 h-4" /> {t("common:import")}
            </button>
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4" /> {t("onlineExams.author.addQuestion")}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.key} className="rounded-2xl border border-slate-100 p-6 space-y-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-extrabold text-slate-900 font-mono">Q{index + 1}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) => changeType(q.key, e.target.value as QuestionType)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((typeKey) => (
                      <option key={typeKey} value={typeKey}>
                        {t(TYPE_LABELS[typeKey])}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={q.points}
                    onChange={(e) => updateQuestion(q.key, { points: e.target.value })}
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
                    title={t("onlineExams.author.points")}
                  />
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((x) => x.key !== q.key))}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
                    aria-label={t("onlineExams.author.removeQuestion")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <textarea
                value={q.prompt}
                onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
                rows={2}
                placeholder={t("onlineExams.author.questionPrompt")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
              />

              {q.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.key}`}
                        checked={c.isCorrect}
                        onChange={() =>
                          updateQuestion(q.key, {
                            choices: q.choices.map((x, i) => ({
                              ...x,
                              isCorrect: i === ci,
                            })),
                          })
                        }
                      />
                      <span className="font-mono text-sm text-slate-500 w-6">{c.label}</span>
                      <input
                        value={c.text}
                        onChange={(e) =>
                          updateQuestion(q.key, {
                            choices: q.choices.map((x, i) =>
                              i === ci ? { ...x, text: e.target.value } : x
                            ),
                          })
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 bg-white"
                        placeholder={t("onlineExams.author.choiceText")}
                      />
                    </div>
                  ))}
                </div>
              )}

              {q.type === "TRUE_FALSE" && (
                <select
                  value={q.correctBoolean}
                  onChange={(e) =>
                    updateQuestion(q.key, {
                      correctBoolean: e.target.value as "true" | "false",
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="true">{t("onlineExams.author.correctTrue")}</option>
                  <option value="false">{t("onlineExams.author.correctFalse")}</option>
                </select>
              )}

              {q.type === "FILL_BLANK" && (
                <div className="space-y-2">
                  <input
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                    placeholder={t("onlineExams.author.expectedAnswer")}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={q.caseSensitive}
                      onChange={(e) => updateQuestion(q.key, { caseSensitive: e.target.checked })}
                    />
                    {t("onlineExams.author.caseSensitive")}
                  </label>
                </div>
              )}

              {q.type === "ESSAY" && (
                <p className="text-sm text-slate-500">
                  {t("onlineExams.author.essayHint")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
