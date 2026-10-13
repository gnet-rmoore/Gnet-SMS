import React from "react";
import { useTranslation } from "react-i18next";
import { X, GraduationCap, Info, School, ArrowLeftRight, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ConceptGuideProps = {
  setShowConceptGuide?: any;
  showConceptGuide?: any;
};

export function ConceptGuide({ setShowConceptGuide, showConceptGuide }: ConceptGuideProps) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <AnimatePresence>
      {showConceptGuide && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold tracking-tight text-slate-900">
                    {t("classrooms.conceptGuide.title")}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {t("classrooms.conceptGuide.subtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConceptGuide(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors shrink-0"
                aria-label={t("common:close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                  {t("classrooms.conceptGuide.level1")}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">
                  {t("classrooms.conceptGuide.gradeLevelTitle")}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {t("classrooms.conceptGuide.gradeLevelBody")}
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                  {t("classrooms.conceptGuide.level2")}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">
                  {t("classrooms.conceptGuide.classGroupTitle")}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {t("classrooms.conceptGuide.classGroupBody")}
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
                  {t("classrooms.conceptGuide.level3")}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">
                  {t("classrooms.conceptGuide.subjectTitle")}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {t("classrooms.conceptGuide.subjectBody")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-100 p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <School className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
                  {t("classroomModals.orgSelfContained")}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {t("classrooms.conceptGuide.selfContainedBody")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
                  {t("classroomModals.orgDepartmentalized")}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {t("classrooms.conceptGuide.departmentalizedBody")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
                  {t("classroomModals.orgMixed")}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {t("classrooms.conceptGuide.mixedBody")}
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed font-medium text-slate-600">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold text-slate-800">{t("classrooms.conceptGuide.tipLabel")} </span>
                {t("classrooms.conceptGuide.tipBody")}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
