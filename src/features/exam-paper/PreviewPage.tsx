import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { alertError } from "../../lib/swal";

type PreviewQuestion = {
  key: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
  prompt: string;
  points: number;
  correctAnswer?: string;
  correctBoolean?: "true" | "false";
  choices?: { key: string; label: string; isCorrect: boolean }[];
};

const sampleQuestions: PreviewQuestion[] = [
  {
    key: "q1",
    type: "MULTIPLE_CHOICE",
    prompt: "What is the capital of France?",
    points: 2,
    choices: [
      { key: "a", label: "London", isCorrect: false },
      { key: "b", label: "Paris", isCorrect: true },
      { key: "c", label: "Berlin", isCorrect: false },
      { key: "d", label: "Madrid", isCorrect: false },
    ],
  },
  {
    key: "q2",
    type: "TRUE_FALSE",
    prompt: "The Earth revolves around the Sun.",
    points: 1,
    correctBoolean: "true",
  },
  {
    key: "q3",
    type: "FILL_BLANK",
    prompt: "The chemical symbol for water is H__.",
    points: 1,
    correctAnswer: "2O",
  },
  {
    key: "q4",
    type: "ESSAY",
    prompt: "Discuss the impact of climate change on polar ice caps.",
    points: 5,
  },
];

export default function ExamPaperPreviewPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { toast, showToast } = usePageToast();
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    // placeholder – no actual submission
    showToast(t("examPaper.toast.draftSaved"));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8">
      <PageToast toast={toast} />
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-6">
        <h2 className="font-extrabold tracking-tight text-slate-900">
          {t("examPaper.title")} – Preview
        </h2>
        <p className="text-slate-500">
          This preview shows how the exam paper will appear to students when submitted.
        </p>

        <div className="space-y-4">
          {sampleQuestions.map((q) => (
            <div key={q.key} className="rounded-2xl border border-slate-100 p-6 space-y-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-extrabold text-slate-900 font-mono">Q{String.fromCharCode(64 + sampleQuestions.indexOf(q) + 1)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {t(`questionType.${q.type}`)} – {q.points} pts
                  </span>
                </div>
              </div>
              <textarea
                readOnly
                value={q.prompt}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                rows={q.type === "ESSAY" ? 4 : 2}
              />
              {q.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  {q.choices?.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <input
                        readOnly
                        type="radio"
                        disabled
                        name={`correct-${q.key}`}
                        checked={c.isCorrect}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="font-medium">{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {q.type === "TRUE_FALSE" && (
                <select disabled className="rounded-xl border border-slate-200 px-3 py-2 bg-white">
                  <option value="true">{t("onlineExams.author.correctTrue")}</option>
                  <option value="false">{t("onlineExams.author.correctFalse")}</option>
                </select>
              )}
              {q.type === "FILL_BLANK" && (
                <input
                  readOnly
                  value={q.correctAnswer || ""}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                  placeholder="Expected answer"
                />
              )}
              {q.type === "ESSAY" && (
                <p className="text-sm text-slate-500 mt-1">
                  {t("examPaper.essayHint")}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50"
          >
            {t("common:close")}
          </button>
        </div>
      </div>
    </div>
  );
}