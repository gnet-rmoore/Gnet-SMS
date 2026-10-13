import React, { useState } from "react";
import { Check, Download, Library, RotateCcw, Share2, X } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { LessonPlan } from "../types";
import {
  formatDayLabel,
  parseActivities,
  parseMaterials,
  parseObjectives,
  statusChipClass,
  statusLabel,
} from "../utils";

type Props = {
  plan: LessonPlan;
  isReviewer: boolean;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReturn: (feedback: string) => void;
  onEdit?: () => void;
  onSaveTemplate?: () => void;
  onShareClassroom?: () => void;
  onDownloadPdf?: () => void;
};

export function LessonPlanDetail({
  plan,
  isReviewer,
  processing,
  onClose,
  onApprove,
  onReturn,
  onEdit,
  onSaveTemplate,
  onShareClassroom,
  onDownloadPdf,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const d = (key: string) => t(`lessonPlans.components.detail.${key}`);
  const [feedback, setFeedback] = useState("");
  const objectives = parseObjectives(plan.objectives);
  const activities = parseActivities(plan.activities);
  const materials = parseMaterials(plan.materials);
  const canDecide = isReviewer && plan.status === "SUBMITTED";
  const editable = plan.status === "DRAFT" || plan.status === "RETURNED";
  const canShare =
    plan.status === "APPROVED" && Boolean(plan.classroomId) && !plan.classroomPostId;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg h-full bg-white shadow-xl border-l border-slate-100 flex flex-col"
      >
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white px-6 py-5 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {d("eyebrow")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight mt-0.5 truncate">{plan.title}</h2>
            <p className="text-sm text-slate-300 font-medium mt-1">
              {formatDayLabel(plan.lessonDate)} · {plan.subjectName} · {plan.teacherName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            aria-label={d("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${statusChipClass(plan.status)}`}
            >
              {statusLabel(plan.status)}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {plan.durationMinutes} {t("lessonPlans.components.list.min")}
              {plan.periodLabel ? ` · ${plan.periodLabel}` : ""}
            </span>
          </div>

          {plan.feedback && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                {d("reviewerFeedback")}
              </p>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{plan.feedback}</p>
            </div>
          )}

          <Section title={d("objectives")}>
            <ul className="space-y-2">
              {objectives.map((o, i) => (
                <li key={i} className="text-sm text-slate-700 font-medium flex gap-2">
                  <span className="font-mono text-slate-400 shrink-0">{i + 1}.</span>
                  {o}
                </li>
              ))}
              {!objectives.length && <Empty label={d("notProvided")} />}
            </ul>
          </Section>

          {plan.standards && (
            <Section title={d("standards")}>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{plan.standards}</p>
            </Section>
          )}

          {plan.warmUp && (
            <Section title={d("warmUp")}>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{plan.warmUp}</p>
            </Section>
          )}

          <Section title={d("activities")}>
            <div className="space-y-3">
              {activities.map((a, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-extrabold text-slate-900">{a.title}</p>
                    {a.minutes != null && (
                      <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                        {a.minutes}m
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap">{a.description}</p>
                  )}
                </div>
              ))}
              {!activities.length && <Empty label={d("notProvided")} />}
            </div>
          </Section>

          {materials.length > 0 && (
            <Section title={d("materials")}>
              <ul className="list-disc pl-5 space-y-1">
                {materials.map((m, i) => (
                  <li key={i} className="text-sm text-slate-700 font-medium">
                    {m}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {plan.assessment && (
            <Section title={d("assessment")}>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{plan.assessment}</p>
            </Section>
          )}
          {plan.differentiation && (
            <Section title={d("differentiation")}>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">
                {plan.differentiation}
              </p>
            </Section>
          )}
          {plan.homework && (
            <Section title={d("homework")}>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{plan.homework}</p>
            </Section>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 sm:p-5 space-y-3 shrink-0 bg-white">
          <div className="flex flex-wrap gap-2">
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" />
                {d("pdf")}
              </button>
            )}
            {onSaveTemplate && (
              <button
                type="button"
                disabled={processing}
                onClick={onSaveTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
              >
                <Library className="w-3.5 h-3.5" />
                {d("saveTemplate")}
              </button>
            )}
            {canShare && onShareClassroom && (
              <button
                type="button"
                disabled={processing}
                onClick={onShareClassroom}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50 disabled:opacity-50"
              >
                <Share2 className="w-3.5 h-3.5" />
                {d("shareClassroom")}
              </button>
            )}
            {plan.classroomPostId && (
              <span className="inline-flex items-center px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                {d("sharedClassroom")}
              </span>
            )}
            {plan.status === "APPROVED" && !plan.classroomId && (
              <span className="text-xs text-slate-500 font-medium self-center">
                {d("addClassroomHint")}
              </span>
            )}
          </div>

          {canDecide && (
            <>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                rows={2}
                placeholder={d("returnNote")}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => onReturn(feedback)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-200 text-rose-700 font-bold text-sm hover:bg-rose-50 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {d("return")}
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={onApprove}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {d("approve")}
                </button>
              </div>
            </>
          )}
          {editable && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
            >
              {d("editPlan")}
            </button>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-slate-400 font-medium">{label}</p>;
}
