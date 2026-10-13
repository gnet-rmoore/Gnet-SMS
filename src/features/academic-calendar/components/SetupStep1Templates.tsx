import React from "react";
import { Plus, Layout } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export type SetupStep1TemplatesProps = {
  handleSelectTemplate: (t: any) => void;
  selectedTemplate: any;
  templates: any[];
};

export function SetupStep1Templates({
  handleSelectTemplate,
  selectedTemplate,
  templates,
}: SetupStep1TemplatesProps) {
  const { t } = useTranslation("pages");

  const describePattern = (patternType: string) => {
    if (patternType === "SEMESTER") return t("academicCalendar.template.semesterDesc");
    if (patternType === "TWO_TERM") return t("academicCalendar.template.twoTermDesc");
    return t("academicCalendar.template.threeTermDesc");
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {Array.isArray(templates) &&
        templates.map((tpl) => (
          <button
            type="button"
            key={tpl.patternType}
            onClick={() => handleSelectTemplate(tpl)}
            className={`text-left p-8 rounded-[32px] border-2 transition-all group ${
              selectedTemplate?.patternType === tpl.patternType
                ? "border-indigo-600 bg-indigo-50/50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                : "border-slate-100 bg-white hover:border-indigo-200"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  selectedTemplate?.patternType === tpl.patternType
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                }`}
              >
                <Layout className="w-7 h-7" />
              </div>
              {tpl.patternType === "THREE_TERM" && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl uppercase tracking-wider border border-amber-100">
                  {t("academicCalendar.template.mostCommon")}
                </span>
              )}
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">{tpl.name}</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {describePattern(tpl.patternType)}
            </p>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t("academicCalendar.template.periodsReady", { count: (tpl.periods || []).length })}
            </p>
          </button>
        ))}

      <button
        type="button"
        onClick={() =>
          handleSelectTemplate({
            name: t("academicCalendar.template.customSetup"),
            patternType: "CUSTOM",
            periods: [
              {
                periodNumber: 1,
                label: "Term 1",
                shortCode: "T1",
                startDate: "",
                endDate: "",
                annualWeightPct: 100,
                examComponents: [],
              },
            ],
          })
        }
        className={`text-left p-8 rounded-[32px] border-2 border-dashed transition-all group ${
          selectedTemplate?.patternType === "CUSTOM"
            ? "border-indigo-600 bg-indigo-50/50"
            : "border-slate-200 bg-slate-50 hover:border-indigo-300"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200">
            <Plus className="w-7 h-7" />
          </div>
        </div>
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">
          {t("academicCalendar.setup.customBuilder")}
        </h3>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">
          {t("academicCalendar.setup.customBuilderHint")}
        </p>
      </button>
    </motion.div>
  );
}
