import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { LessonPlan } from "../types";
import { addDays, statusChipClass, statusLabel } from "../utils";

type Props = {
  weekStart: string;
  plans: LessonPlan[];
  onOpen: (plan: LessonPlan) => void;
  onReschedule: (planId: string, lessonDate: string) => void;
  canDrag: (plan: LessonPlan) => boolean;
};

export function WeekBoard({ weekStart, plans, onOpen, onReschedule, canDrag }: Props) {
  const { t } = useTranslation("pages");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const onDragStart = (e: React.DragEvent, plan: LessonPlan) => {
    if (!canDrag(plan)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/lesson-plan-id", plan.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropDay = (e: React.DragEvent, iso: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/lesson-plan-id");
    if (!id) return;
    const plan = plans.find((p) => p.id === id);
    if (!plan || plan.lessonDate === iso || !canDrag(plan)) return;
    onReschedule(id, iso);
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("lessonPlans.components.weekBoard.title")}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {t("lessonPlans.components.weekBoard.hint")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 min-h-[180px]">
        {days.map((iso) => {
          const dayPlans = plans
            .filter((p) => p.lessonDate === iso)
            .sort((a, b) => a.title.localeCompare(b.title));
          return (
            <div
              key={iso}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => onDropDay(e, iso)}
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-2 min-h-[140px] space-y-2"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                {new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                })}
              </p>
              {dayPlans.map((plan) => {
                const draggable = canDrag(plan);
                return (
                  <motion.button
                    key={plan.id}
                    type="button"
                    draggable={draggable}
                    onDragStart={(e) => onDragStart(e as any, plan)}
                    onClick={() => onOpen(plan)}
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.2 }}
                    className={`w-full text-left rounded-xl border bg-white p-2.5 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] ${
                      draggable
                        ? "border-slate-100 cursor-grab active:cursor-grabbing"
                        : "border-slate-100 cursor-pointer opacity-95"
                    }`}
                  >
                    <span
                      className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border mb-1 ${statusChipClass(plan.status)}`}
                    >
                      {statusLabel(plan.status)}
                    </span>
                    <p className="text-xs font-extrabold tracking-tight text-slate-900 line-clamp-2">
                      {plan.title}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      {plan.subjectName}
                    </p>
                  </motion.button>
                );
              })}
              {!dayPlans.length && (
                <p className="text-xs text-slate-300 font-medium px-1 pt-6 text-center">
                  {t("lessonPlans.components.weekBoard.drop")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
