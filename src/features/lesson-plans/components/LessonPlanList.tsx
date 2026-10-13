import React from "react";
import { motion } from "motion/react";
import { Clock, Copy, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LessonPlan } from "../types";
import { formatDayLabel, parseActivities, statusChipClass, statusLabel } from "../utils";

type Props = {
  plans: LessonPlan[];
  onOpen: (plan: LessonPlan) => void;
  onEdit: (plan: LessonPlan) => void;
  onDuplicate: (plan: LessonPlan) => void;
  onDelete: (plan: LessonPlan) => void;
  canEdit: (plan: LessonPlan) => boolean;
};

export function LessonPlanList({
  plans,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  canEdit,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <div className="space-y-3">
      {plans.map((plan, i) => {
        const steps = parseActivities(plan.activities).length;
        const editable = canEdit(plan);
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
            className="rounded-[32px] border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <button
              type="button"
              onClick={() => onOpen(plan)}
              className="flex-1 text-left min-w-0 space-y-1"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${statusChipClass(plan.status)}`}
                >
                  {statusLabel(plan.status)}
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {formatDayLabel(plan.lessonDate)}
                </span>
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">
                {plan.title}
              </h3>
              <p className="text-sm text-slate-500 font-medium truncate">
                {plan.subjectName}
                {plan.gradeLevelName ? ` · ${plan.gradeLevelName}` : ""}
                {plan.classroomName ? ` · ${plan.classroomName}` : ""}
                {" · "}
                {plan.teacherName}
              </p>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5" />
                {plan.durationMinutes} {t("lessonPlans.components.list.min")}
                {plan.periodLabel ? ` · ${plan.periodLabel}` : ""}
                {steps > 0
                  ? ` · ${steps} ${steps === 1 ? t("lessonPlans.components.list.activity") : t("lessonPlans.components.list.activities")}`
                  : ""}
              </p>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onDuplicate(plan)}
                className="p-2.5 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50"
                title={t("lessonPlans.components.list.duplicate")}
              >
                <Copy className="w-4 h-4" />
              </button>
              {editable && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(plan)}
                    className="p-2.5 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50"
                    title={t("lessonPlans.components.list.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(plan)}
                    className="p-2.5 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50"
                    title={t("lessonPlans.components.list.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
