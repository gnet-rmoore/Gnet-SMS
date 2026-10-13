import React from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  FileUp,
  Loader2,
  Save,
  Send,
  Trash2,
  Plus,
  Users,
  Download,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { examPaperApi } from "./api";
import {
  emptyQuestion,
  type DraftQuestion,
  type QuestionType,
} from "../online-exam/types";
import type { OnlineQuestionInput } from "../online-exam/api";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { alertError, confirmAction } from "../../lib/swal";

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the blank",
  ESSAY: "Essay",
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
    return { type: "ESSAY", prompt: q.prompt.trim(), points };
  });
}

export default function ExamPaperPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [canEdit, setCanEdit] = React.useState(true);
  const [status, setStatus] = React.useState("DRAFT");
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = React.useState("ONLINE");
  const [maxViolations, setMaxViolations] = React.useState("3");
  const [instructions, setInstructions] = React.useState("");
  const [pdfName, setPdfName] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<DraftQuestion[]>([emptyQuestion()]);
  const [rosterText, setRosterText] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const data = await examPaperApi.get(examId);
      setTitle(data.exam?.title || "Exam paper");
      setCanEdit(Boolean(data.canEdit));
      setStatus(data.package?.status || data.exam?.paperStatus || "DRAFT");
      setFeedback(data.package?.feedback || null);
      setDeliveryMode(data.package?.deliveryMode || data.exam?.deliveryMode || "ONLINE");
      setMaxViolations(String(data.exam?.maxViolations ?? 3));
      setInstructions(data.exam?.instructions || "");
      setPdfName(data.package?.pdfFileName || null);
      const q = await examPaperApi.getQuestions(examId);
      const drafts = fromApiQuestions(q.questions || []);
      setQuestions(drafts.length ? drafts : [emptyQuestion()]);
      const roster = Array.isArray(data.roster) ? data.roster : [];
      setRosterText(
        roster.map((r: any) => `${r.studentId},${r.leg}`).join("\n")
      );
    } catch (err: any) {
      await alertError("Could not load exam paper", err?.message);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
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

  const handleSaveDraft = async () => {
    if (!examId || !canEdit) return;
    setSaving(true);
    try {
      await examPaperApi.update(examId, {
        deliveryMode,
        instructions: instructions.trim() || null,
        maxViolations: Number(maxViolations) || 0,
      });
      await examPaperApi.saveQuestions(examId, toApiQuestions(questions));
      if (deliveryMode === "HYBRID" && rosterText.trim()) {
        const entries = rosterText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [studentId, leg] = line.split(",").map((s) => s.trim());
            return {
              studentId,
              leg: (leg || "ONLINE").toUpperCase(),
            };
          })
          .filter((e) => e.studentId && (e.leg === "ONLINE" || e.leg === "OFFLINE"));
        if (entries.length) await examPaperApi.setRoster(examId, entries);
      }
      showToast(t("examPaper.toast.draftSaved"));
      await load();
    } catch (err: any) {
      await alertError("Could not save draft", err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPdf = async (file: File) => {
    if (!examId || !canEdit) return;
    if (file.type !== "application/pdf") {
      await alertError("PDF only", "Please choose a PDF file.");
      return;
    }
    try {
      const presign = await examPaperApi.presignPdf(examId, file.name);
      if (presign.uploadUrl) {
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: file,
        });
        if (!put.ok) throw new Error("Upload to storage failed");
      }
      await examPaperApi.confirmPdf(examId, {
        storageKey: presign.storageKey,
        fileUrl: presign.fileUrl,
        fileName: file.name,
      });
      showToast(t("examPaper.toast.pdfAttached"));
      await load();
    } catch (err: any) {
      await alertError("PDF upload failed", err?.message);
    }
  };

  const handleSubmit = async () => {
    if (!examId) return;
    const ok = await confirmAction({
      title: t("examPaper.confirm.submitTitle"),
      text: t("examPaper.confirm.submitText"),
      confirmText: t("common:submit"),
    });
    if (!ok) return;
    setSaving(true);
    try {
      await examPaperApi.update(examId, {
        deliveryMode,
        instructions: instructions.trim() || null,
        maxViolations: Number(maxViolations) || 0,
      });
      await examPaperApi.saveQuestions(examId, toApiQuestions(questions));
      if (deliveryMode === "HYBRID" && rosterText.trim()) {
        const entries = rosterText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [studentId, leg] = line.split(",").map((s) => s.trim());
            return {
              studentId,
              leg: (leg || "ONLINE").toUpperCase(),
            };
          })
          .filter((e) => e.studentId && (e.leg === "ONLINE" || e.leg === "OFFLINE"));
        if (entries.length) await examPaperApi.setRoster(examId, entries);
      }
      await examPaperApi.submit(examId);
      showToast(t("examPaper.toast.submittedForReview"));
      await load();
    } catch (err: any) {
      await alertError("Submit failed", err?.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!examId) return;
    try {
      const data = await examPaperApi.pdfDownload(examId);
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      await alertError("Could not open PDF", err?.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading exam paper…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />
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
            <ArrowLeft className="w-4 h-4" /> Back to exam
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("examPaper.title")}
          </h1>
          <p className="text-slate-500 font-medium">
            {title} · <span className="font-mono">{status}</span>
            {deliveryMode ? ` · ${deliveryMode}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> Submit for review
              </button>
            </>
          )}
        </div>
      </motion.div>

      {feedback && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-800 text-sm">
          Returned feedback: {feedback}
        </div>
      )}

      {!canEdit && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-slate-600 text-sm">
          This paper is locked ({status}).{" "}
          {status === "APPROVED"
            ? "Students can access it according to the delivery mode."
            : "Wait for review or return."}
        </div>
      )}

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <h2 className="font-extrabold tracking-tight text-slate-900">Delivery mode</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(["ONLINE", "OFFLINE", "HYBRID"] as const).map((mode) => (
            <label
              key={mode}
              className={`rounded-2xl border p-4 cursor-pointer ${
                deliveryMode === mode
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-100"
              } ${!canEdit ? "opacity-70 pointer-events-none" : ""}`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={deliveryMode === mode}
                onChange={() => setDeliveryMode(mode)}
                disabled={!canEdit}
              />
              <p className="font-bold text-slate-900">{mode}</p>
              <p className="text-xs text-slate-500 mt-1">
                {mode === "ONLINE" && "Secure kiosk testing"}
                {mode === "OFFLINE" && "Printed PDF / in-person"}
                {mode === "HYBRID" && "Some online, some offline"}
              </p>
            </label>
          ))}
        </div>
        {(deliveryMode === "ONLINE" || deliveryMode === "HYBRID") && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Max violations (online leg)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              disabled={!canEdit}
              value={maxViolations}
              onChange={(e) => setMaxViolations(e.target.value)}
              className="mt-2 w-40 rounded-xl border border-slate-200 px-4 py-3 font-mono"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Student instructions
          </label>
          <textarea
            disabled={!canEdit}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
          />
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight text-slate-900">PDF paper</h2>
              <p className="text-sm text-slate-500">
                Required for Offline and Hybrid. Optional for Online.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {pdfName && (
              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                <Download className="w-4 h-4" /> {pdfName}
              </button>
            )}
            {canEdit && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUploadPdf(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-sm"
                >
                  Upload PDF
                </button>
                {pdfName && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!examId) return;
                      await examPaperApi.clearPdf(examId);
                      showToast(t("examPaper.toast.pdfRemoved"));
                      await load();
                    }}
                    className="text-rose-600 px-3 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-extrabold tracking-tight text-slate-900">Structured questions</h2>
            <p className="text-sm text-slate-500">
              Required for Online and Hybrid. Optional for Offline.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700"
            >
              <Plus className="w-4 h-4" /> Add question
            </button>
          )}
        </div>
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.key} className="rounded-2xl border border-slate-100 p-6 space-y-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-extrabold text-slate-900 font-mono">Q{index + 1}</p>
                <div className="flex items-center gap-2">
                  <select
                    disabled={!canEdit}
                    value={q.type}
                    onChange={(e) => changeType(q.key, e.target.value as QuestionType)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    disabled={!canEdit}
                    min={0.5}
                    step={0.5}
                    value={q.points}
                    onChange={(e) => updateQuestion(q.key, { points: e.target.value })}
                    className="w-20 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((x) => x.key !== q.key))}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                disabled={!canEdit}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
              />
              {q.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        disabled={!canEdit}
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
                        disabled={!canEdit}
                        value={c.text}
                        onChange={(e) =>
                          updateQuestion(q.key, {
                            choices: q.choices.map((x, i) =>
                              i === ci ? { ...x, text: e.target.value } : x
                            ),
                          })
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}
              {q.type === "TRUE_FALSE" && (
                <select
                  disabled={!canEdit}
                  value={q.correctBoolean}
                  onChange={(e) =>
                    updateQuestion(q.key, {
                      correctBoolean: e.target.value as "true" | "false",
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="true">Correct: True</option>
                  <option value="false">Correct: False</option>
                </select>
              )}
              {q.type === "FILL_BLANK" && (
                <input
                  disabled={!canEdit}
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(q.key, { correctAnswer: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                  placeholder="Expected answer"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {deliveryMode === "HYBRID" && (
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight text-slate-900">Hybrid roster</h2>
              <p className="text-sm text-slate-500">
                One student per line: <span className="font-mono">studentId,ONLINE</span> or{" "}
                <span className="font-mono">studentId,OFFLINE</span>. Unlisted students default to
                ONLINE.
              </p>
            </div>
          </div>
          <textarea
            disabled={!canEdit}
            value={rosterText}
            onChange={(e) => setRosterText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm"
            placeholder={"uuid-1,ONLINE\nuuid-2,OFFLINE"}
          />
        </div>
      )}
    </div>
  );
}
