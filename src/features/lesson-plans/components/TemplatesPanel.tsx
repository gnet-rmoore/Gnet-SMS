import React from "react";
import { Library, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LessonPlanTemplate } from "../types";

type Props = {
  templates: LessonPlanTemplate[];
  onUse: (tpl: LessonPlanTemplate) => void;
  onDelete: (tpl: LessonPlanTemplate) => void;
  canDelete: (tpl: LessonPlanTemplate) => boolean;
};

export function TemplatesPanel({ templates, onUse, onDelete, canDelete }: Props) {
  const { t } = useTranslation("pages");

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Library className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("lessonPlans.components.templates.title")}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {t("lessonPlans.components.templates.hint")}
          </p>
        </div>
      </div>

      {!templates.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-medium text-sm">
          {t("lessonPlans.components.templates.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex flex-col gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                  {tpl.title}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {tpl.subjectName}
                  {tpl.gradeLevelName ? ` · ${tpl.gradeLevelName}` : ""}
                  {" · "}
                  {tpl.createdByName}
                </p>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => onUse(tpl)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("lessonPlans.components.templates.use")}
                </button>
                {canDelete(tpl) && (
                  <button
                    type="button"
                    onClick={() => onDelete(tpl)}
                    className="p-2 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50"
                    title={t("lessonPlans.components.templates.deleteTemplate")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
