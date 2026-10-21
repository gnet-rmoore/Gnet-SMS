import React from "react";
import { Link, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Printer,
  ShieldAlert,
  X,
} from "lucide-react";
import { onlineExamApi } from "./api";
import { RichContent } from "./RichContent";
import { SchoolLogo } from "../report-cards/components/pages/BifoldChrome";
import { alertError } from "../../lib/swal";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";

type MarkedMode = "marked" | "script";

function fmtDate(value?: string | number | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtDateTime(value?: string | number | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtMinutes(value?: number | null) {
  const m = Number(value) || 0;
  return `${m} min`;
}

/**
 * Printable A4 answer script for one online-exam attempt.
 *
 * Marked paper (default): shows correctness, awarded points, expected answers,
 * an inline essay marking margin, and the violation log.
 * Student script: the student's answers only — what they would see on paper.
 */
export default function AnswerScriptPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId, attemptId } = useParams();
  const { school } = useAuthStore();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [examDetail, setExamDetail] = React.useState<any>(null);
  const [mode, setMode] = React.useState<MarkedMode>("marked");
  const [downloading, setDownloading] = React.useState(false);
  const [markDraft, setMarkDraft] = React.useState<Record<string, string>>({});
  const [savingQid, setSavingQid] = React.useState<string | null>(null);
  const [markSavedQid, setMarkSavedQid] = React.useState<string | null>(null);

  const loadResults = React.useCallback(async () => {
    const res = await onlineExamApi.getResults(attemptId as string);
    setData(res);
    return res;
  }, [attemptId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [res, exam] = await Promise.all([
          onlineExamApi.getResults(attemptId as string),
          examId ? api.get(`/api/exams/${examId}`) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setData(res);
        setExamDetail(exam);
        const drafts: Record<string, string> = {};
        for (const q of res?.questions || []) {
          if (q.answer?.pointsAwarded != null) drafts[q.id] = String(q.answer.pointsAwarded);
        }
        setMarkDraft(drafts);
      } catch (err: any) {
        if (!cancelled) await alertError(t("onlineExams.script.loadFailed"), err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, examId, t]);

  const attempt = data?.attempt || {};
  const resultExam = data?.exam || {};
  const questions: any[] = Array.isArray(data?.questions) ? data.questions : [];
  const violations: any[] = Array.isArray(data?.violations) ? data.violations : [];
  const isLive = attempt.status === "IN_PROGRESS";
  const marked = mode === "marked";

  const saveMark = async (q: any, override?: string | null) => {
    const raw = override !== undefined ? override : (markDraft[q.id] ?? "").trim();
    const max = Number(q.points) || 0;
    const value = raw === null || raw === "" ? null : Math.max(0, Math.min(max, Number(raw) || 0));
    setSavingQid(q.id);
    try {
      await onlineExamApi.markEssayAnswer(attemptId as string, q.id, value);
      await loadResults();
      setMarkSavedQid(q.id);
      window.setTimeout(() => setMarkSavedQid((cur) => (cur === q.id ? null : cur)), 2000);
    } catch (err: any) {
      await alertError(
        t("onlineExams.proctor.markFailed", { error: err?.message || "" })
      );
    } finally {
      setSavingQid(null);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("answer-script");
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const studentSlug = String(attempt.studentName || attempt.studentId || "student").replace(
        /\s+/g,
        "_"
      );
      pdf.save(`${studentSlug}_AnswerScript_${String(resultExam.title || "exam").replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 mb-6">{t("onlineExams.script.loadFailed")}</p>
        <Link
          to={`/${school?.slug}/online-exams/${examId}/proctor/${attemptId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> {t("onlineExams.script.backToAttempt")}
        </Link>
      </div>
    );
  }

  const component = examDetail?.examComponent;
  const componentLabel = component
    ? [component.label || component.shortCode, component.period?.label].filter(Boolean).join(" · ")
    : null;
  const timeUsedMin =
    attempt.startedAt && (attempt.submittedAt || attempt.endsAt)
      ? Math.max(
          0,
          Math.round(
            (new Date(attempt.submittedAt || attempt.endsAt).getTime() -
              new Date(attempt.startedAt).getTime()) /
              60000
          )
        )
      : null;

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-8 pb-4 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={`/${school?.slug}/online-exams/${examId}/proctor/${attemptId}`}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              title={t("onlineExams.script.backToAttempt")}
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-dashboard">
                {t("onlineExams.script.title")}
              </h1>
              <p className="text-slate-500 font-medium text-sm">
                {attempt.studentName || attempt.studentId} · {resultExam.title}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("marked")}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                  mode === "marked"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("onlineExams.script.markedMode")}
              </button>
              <button
                type="button"
                onClick={() => setMode("script")}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                  mode === "script"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("onlineExams.script.scriptMode")}
              </button>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              {t("onlineExams.script.print")}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPDF()}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? t("onlineExams.script.pdfGenerating") : t("onlineExams.script.downloadPdf")}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {marked ? t("onlineExams.script.modeHintMarked") : t("onlineExams.script.modeHintScript")}
        </p>
      </div>

      <div className="px-4 pb-16">
        <div
          id="answer-script"
          className="mx-auto bg-white text-slate-900 w-full max-w-[210mm] p-8 sm:p-12 shadow-[0_4px_24px_rgb(15,23,42,0.12)] print:shadow-none"
        >
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <SchoolLogo url={school?.logoUrl} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-extrabold tracking-tight text-slate-900 truncate">
                  {school?.name}
                </p>
                {school?.address && (
                  <p className="text-xs text-slate-500 truncate">{school.address}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-extrabold uppercase tracking-widest text-slate-800">
                {t("onlineExams.script.title")}
              </p>
              <p className="text-[11px] text-slate-500">
                {t("onlineExams.script.printedOn", {
                  date: fmtDate(new Date()),
                })}
              </p>
            </div>
          </div>

          {/* Exam + candidate meta */}
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs py-4 border-b border-slate-200">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400">
                {t("onlineExams.script.exam")}
              </span>
              <p className="font-semibold text-slate-900 text-sm">
                {resultExam.title}
                {componentLabel ? ` · ${componentLabel}` : ""}
              </p>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400">
                {t("onlineExams.script.candidate")}
              </span>
              <p className="font-semibold text-slate-900 text-sm">
                {attempt.studentName || attempt.studentId}
                {attempt.studentEmail ? ` · ${attempt.studentEmail}` : ""}
              </p>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400">
                {t("onlineExams.script.examWindow")}
              </span>
              <p className="text-slate-700">
                {fmtDate(examDetail?.startDate || null)} – {fmtDate(examDetail?.endDate || null)}
                {examDetail?.duration ? ` · ${fmtMinutes(examDetail.duration)}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <span className="font-bold uppercase tracking-wider text-slate-400">
                  {t("onlineExams.script.started")}
                </span>{" "}
                <span className="text-slate-700">{fmtDateTime(attempt.startedAt)}</span>
              </span>
              <span>
                <span className="font-bold uppercase tracking-wider text-slate-400">
                  {t("onlineExams.script.submitted")}
                </span>{" "}
                <span className="text-slate-700">{fmtDateTime(attempt.submittedAt)}</span>
              </span>
              {timeUsedMin != null && (
                <span>
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    {t("onlineExams.script.timeUsed")}
                  </span>{" "}
                  <span className="text-slate-700">{fmtMinutes(timeUsedMin)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Live / score banner */}
          {isLive ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4" />
              {t("onlineExams.script.liveProgress")}
            </p>
          ) : (
            marked && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-xl bg-slate-900 text-white px-3 py-2 font-bold font-mono">
                  {t("onlineExams.results.scoreSummary", {
                    score: attempt.score ?? 0,
                    max: attempt.maxScore ?? 0,
                    passed: attempt.passedCount ?? 0,
                    missed: attempt.missedCount ?? 0,
                  })}
                </span>
                {(attempt.pendingCount ?? 0) > 0 && (
                  <span className="rounded-xl bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 font-bold">
                    {t("onlineExams.results.pendingEssays")}: {attempt.pendingCount}
                  </span>
                )}
              </div>
            )
          )}

          {/* Questions */}
          <div className="mt-6 space-y-6">
            {questions.map((q: any, index: number) => {
              const ans = q.answer || {};
              const answered = Boolean(ans.answered);
              const isEssay = q.type === "ESSAY";
              const selectedId = ans.selectedChoiceId || null;
              return (
                <div key={q.id} className="answer-block break-inside-avoid border-t border-slate-200 pt-4 first:border-t-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                      <span className="font-mono text-slate-400 mr-2">Q{index + 1}</span>
                      <RichContent content={q.prompt} className="inline" />
                    </p>
                    <span className="text-xs font-mono text-slate-500 shrink-0">
                      {marked
                        ? `+${ans.pointsAwarded ?? 0} / ${q.points}`
                        : `/ ${q.points}`}
                    </span>
                  </div>

                  {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {(q.choices || []).map((c: any) => {
                        const isChosen = selectedId === c.id;
                        const isCorrect = marked && c.isCorrect === true;
                        return (
                          <li
                            key={c.id}
                            className={`flex items-start gap-2 rounded-lg px-2 py-1 ${
                              marked && isCorrect
                                ? "bg-emerald-50"
                                : isChosen
                                  ? "bg-slate-50"
                                  : ""
                            }`}
                          >
                            <span className="font-mono text-slate-400 text-xs mt-0.5 w-4 shrink-0">
                              {c.label}
                            </span>
                            <span className="text-slate-800 flex-1">
                              <RichContent content={c.text} className="inline" />
                            </span>
                            {marked && isCorrect && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-label={t("onlineExams.script.correctAnswer")} />
                            )}
                            {isChosen && !isCorrect && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 shrink-0">
                                {marked && <X className="w-4 h-4 text-rose-500" aria-label={t("onlineExams.results.yourChoice")} />}
                                {!marked && <span className="text-slate-900">●</span>}
                                <span className="hidden print:inline text-slate-500">
                                  ({t("onlineExams.results.yourChoice")})
                                </span>
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {(q.type === "FILL_BLANK" || q.type === "ESSAY") && (
                    <div
                      className={`mt-2 flex gap-4 ${q.type === "ESSAY" ? "items-stretch" : "items-start"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          {t("onlineExams.results.yourAnswer", { text: "" }).trim()}
                        </p>
                        <div className="min-h-[3rem] rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap">
                          {answered && ans.textAnswer ? (
                            <RichContent content={ans.textAnswer} className="inline" />
                          ) : (
                            <span className="italic text-slate-400">
                              {t("onlineExams.script.noAnswer")}
                            </span>
                          )}
                        </div>
                        {marked && !ans.isCorrect && q.type === "FILL_BLANK" && q.correctAnswer && (
                          <p className="mt-1.5 text-xs text-emerald-700">
                            <span className="font-bold uppercase tracking-wider text-emerald-600">
                              {t("onlineExams.script.expected")}:
                            </span>{" "}
                            <RichContent content={q.correctAnswer} className="inline" />
                          </p>
                        )}
                        {marked && isEssay && q.correctAnswer && (
                          <p className="mt-1.5 text-xs text-slate-500">
                            <span className="font-bold uppercase tracking-wider text-slate-400">
                              {t("onlineExams.script.expected")}:
                            </span>{" "}
                            <RichContent content={q.correctAnswer} className="inline" />
                          </p>
                        )}
                      </div>
                      {marked && isEssay && (
                        <div className="w-44 shrink-0 rounded-lg border border-slate-300 print:border-slate-400 p-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {t("onlineExams.proctor.awardedPoints")} / {q.points}
                          </p>
                          <input
                            type="number"
                            min={0}
                            max={Number(q.points) || 0}
                            disabled={isLive || savingQid === q.id}
                            value={markDraft[q.id] ?? ""}
                            onChange={(e) =>
                              setMarkDraft((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono disabled:bg-slate-100"
                            placeholder={String(q.points)}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isLive || savingQid === q.id}
                              onClick={() => void saveMark(q)}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-2.5 py-1.5"
                            >
                              {savingQid === q.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              {t("onlineExams.proctor.saveMark")}
                            </button>
                            {markSavedQid === q.id && (
                              <span className="text-[10px] font-bold text-emerald-600">
                                {t("onlineExams.proctor.markSaved")}
                              </span>
                            )}
                            {ans.pending && (
                              <span className="text-[10px] font-bold text-slate-400 ml-auto">
                                {t("onlineExams.script.pendingMark")}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isLive || savingQid === q.id}
                            onClick={() => {
                              setMarkDraft((prev) => ({ ...prev, [q.id]: "" }));
                              void saveMark(q, null);
                            }}
                            className="w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 disabled:opacity-40"
                          >
                            {t("common:reset")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Violations + signature */}
          {marked && (
            <div className="mt-8 border-t border-slate-200 pt-4 answer-block break-inside-avoid">
              {violations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {t("onlineExams.take.violations")}
                  </p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {violations.map((v: any) => (
                      <li key={v.id} className="flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-semibold">{v.type}</span>
                          {v.detail ? ` — ${v.detail}` : ""}
                          <span className="text-slate-400"> · {fmtDateTime(v.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-end justify-between gap-8 pt-6">
                <p className="text-[10px] text-slate-400 font-mono">
                  {t("onlineExams.script.attemptLabel")}: {attempt.id}
                </p>
                <div className="w-56 text-center">
                  <div className="border-b border-slate-400 h-8" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                    {t("onlineExams.script.marker")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #answer-script {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: auto !important;
          }
          .answer-block { break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `,
        }}
      />
    </div>
  );
}
