import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  BookMarked,
  CheckCircle2,
  Info,
  NotebookPen,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ConceptGuideProps = {
  setShowConceptGuide?: (v: boolean) => void;
  showConceptGuide?: boolean;
  slug?: string;
  /** When true, emphasize teacher-facing syllabus steps. */
  isTeacher?: boolean;
};

export function ConceptGuide({
  setShowConceptGuide,
  showConceptGuide,
  slug,
  isTeacher,
}: ConceptGuideProps) {
  const { t } = useTranslation(["pages", "common"]);
  const lessonPlansHref = slug ? `/${slug}/lesson-plans` : undefined;

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
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 md:p-8 space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 shrink-0">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold tracking-tight text-slate-900">
                    {t("curriculum.conceptGuide.title")}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {t("curriculum.conceptGuide.subtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConceptGuide?.(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors shrink-0"
                aria-label={t("curriculum.conceptGuide.closeHelp")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Syllabus vs Lesson */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Syllabus vs lesson plan
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm font-extrabold text-slate-900">Syllabus plan</p>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    A <span className="font-bold text-slate-800">course outline</span> for a
                    subject and grade — usually for the whole year or term. It lists units,
                    course objectives, standards, textbooks, and how grades are weighted.
                  </p>
                  <p className="text-xs text-indigo-700 font-bold">
                    Lives here on Curriculum → Syllabus plans
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-extrabold text-slate-900">Lesson plan</p>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    A plan for <span className="font-bold text-slate-800">one class period</span>{" "}
                    on a specific date — warm-up, timed activities, materials, and how you
                    check learning. Teachers submit these often for leadership review.
                  </p>
                  <p className="text-xs text-slate-500 font-bold">
                    Separate page: Lesson Plans
                    {lessonPlansHref ? (
                      <>
                        {" · "}
                        <Link
                          to={lessonPlansHref}
                          className="text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
                        >
                          Open Lesson Plans
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed font-medium text-slate-600">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold text-slate-800">Remember: </span>
                  Approving a syllabus does not approve individual lessons. After a syllabus
                  is approved, teachers can seed day-by-day lessons from its units on the
                  Lesson Plans → Library tab.
                </p>
              </div>
            </section>

            {/* Building blocks */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Building blocks on this page
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                    Catalog
                  </span>
                  <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                    Subjects
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Courses the school offers (Math, English, Science). Linked to class groups
                    to create subject classrooms.
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                    Structure
                  </span>
                  <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                    Grade levels
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Academic years of study. Class groups and syllabi hang off each grade.
                    Divisions (Elementary / Middle / High) group grades for reporting.
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
                    Course outline
                  </span>
                  <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                    Syllabus plans
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Teacher-submitted course outlines: units by week, objectives, standards
                    framework, differentiation, and grading criteria.
                  </p>
                </div>
              </div>
            </section>

            {/* Who does what */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Who does what
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <p className="text-sm font-extrabold text-slate-900">Teachers</p>
                  <ul className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      Open <span className="font-bold text-slate-800">Syllabus plans</span> and
                      create a course outline for your subject and grade.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      Include units (weeks/topics), objectives, and grading weights that add
                      up to 100%.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      Submit for review. If returned, update using feedback and resubmit.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      After approval, build day-to-day lessons on{" "}
                      <span className="font-bold text-slate-800">Lesson Plans</span> (optionally
                      from a syllabus unit).
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <p className="text-sm font-extrabold text-slate-900">
                    School Admin / Principal / VPI
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      Maintain grade levels, divisions, and subjects before teachers file
                      syllabi.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      Review pending syllabus plans — approve or return with notes.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      Keep catalogs clean so Classrooms and Lesson Plans can attach the right
                      subject/grade.
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      Day-to-day lesson approval happens on Lesson Plans, not here.
                    </li>
                  </ul>
                </div>
              </div>
              {isTeacher ? (
                <p className="text-xs text-slate-500 font-medium">
                  You are signed in as a teacher — focus on filing and revising your syllabus
                  outlines under the Syllabus plans tab.
                </p>
              ) : null}
            </section>

            <div className="flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-950 to-slate-900 px-4 py-3 text-xs leading-relaxed font-medium text-slate-300">
              <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold text-white">Setup tip: </span>
                Create subjects and grade levels first, then assign subjects to class groups
                from a grade card or the Classrooms page. Syllabus plans need a subject and
                grade to attach to.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
