import React, { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SyllabusWithUnits } from "../types";

type Props = {
  syllabi: SyllabusWithUnits[];
  onCreate: (syllabusPlanId: string, unitIndex: number) => void;
  busy?: boolean;
};

export function SyllabusUnitPicker({ syllabi, onCreate, busy }: Props) {
  const { t } = useTranslation("pages");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("lessonPlans.components.syllabus.title")}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {t("lessonPlans.components.syllabus.hint")}
          </p>
        </div>
      </div>

      {!syllabi.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 font-medium text-sm">
          {t("lessonPlans.components.syllabus.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {syllabi.map((s) => {
            const open = openId === s.id;
            const unitLabel =
              s.units.length === 1
                ? t("lessonPlans.components.syllabus.unit")
                : t("lessonPlans.components.syllabus.units");
            return (
              <div key={s.id} className="rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{s.title}</p>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {s.subjectName} · {s.gradeLevelName} · {s.units.length} {unitLabel}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 shrink-0">
                    {open
                      ? t("lessonPlans.components.syllabus.hide")
                      : t("lessonPlans.components.syllabus.unitsBtn")}
                  </span>
                </button>
                {open && (
                  <div className="p-3 space-y-2 bg-white">
                    {s.units.length === 0 ? (
                      <p className="text-xs text-slate-500 font-medium px-1">
                        {t("lessonPlans.components.syllabus.noUnits")}
                      </p>
                    ) : (
                      s.units.map((u, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              {u.week || t("lessonPlans.components.syllabus.unitFallback", { n: idx + 1 })}
                            </p>
                            <p className="text-sm font-extrabold text-slate-900 truncate">
                              {u.topic || t("lessonPlans.components.syllabus.untitledTopic")}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onCreate(s.id, idx)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t("lessonPlans.components.syllabus.draft")}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
