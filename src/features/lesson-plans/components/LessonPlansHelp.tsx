import React from "react";
import { Link } from "react-router-dom";
import {
  BookMarked,
  CheckCircle2,
  GripVertical,
  Info,
  Library,
  NotebookPen,
  Share2,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
  slug?: string;
  isReviewer?: boolean;
};

export function LessonPlansHelp({ open, onClose, slug, isReviewer }: Props) {
  const { t } = useTranslation("pages");
  const h = (key: string) => t(`lessonPlans.components.help.${key}`);
  const curriculumHref = slug ? `/${slug}/curriculum` : undefined;
  const teachersBullets = t("lessonPlans.components.help.teachersBullets", {
    returnObjects: true,
  }) as string[];
  const reviewersBullets = t("lessonPlans.components.help.reviewersBullets", {
    returnObjects: true,
  }) as string[];

  return (
    <AnimatePresence>
      {open && (
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
                  <NotebookPen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold tracking-tight text-slate-900">{h("title")}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{h("subtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors shrink-0"
                aria-label={h("close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {h("vsSyllabus")}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm font-extrabold text-slate-900">{h("planTitle")}</p>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{h("planBody")}</p>
                  <p className="text-xs text-indigo-700 font-bold">{h("youAreHere")}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-extrabold text-slate-900">{h("syllabusTitle")}</p>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{h("syllabusBody")}</p>
                  <p className="text-xs text-slate-500 font-bold">
                    {h("curriculumPath")}
                    {curriculumHref ? (
                      <>
                        {" · "}
                        <Link
                          to={curriculumHref}
                          className="text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
                        >
                          {h("openCurriculum")}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {h("statusFlow")}
              </h4>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-mono font-bold text-slate-700 text-center leading-relaxed">
                  {h("statusDiagram")}
                  <br />
                  <span className="text-slate-500 font-medium">{h("statusOr")}</span>
                </p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 font-medium">
                <li className="rounded-2xl border border-slate-100 p-4">
                  <span className="font-extrabold text-slate-900">{h("draftReturned")}</span>
                  <p className="mt-1 leading-relaxed">{h("draftReturnedBody")}</p>
                </li>
                <li className="rounded-2xl border border-slate-100 p-4">
                  <span className="font-extrabold text-slate-900">{h("inReview")}</span>
                  <p className="mt-1 leading-relaxed">{h("inReviewBody")}</p>
                </li>
                <li className="rounded-2xl border border-slate-100 p-4">
                  <span className="font-extrabold text-slate-900">{h("approved")}</span>
                  <p className="mt-1 leading-relaxed">{h("approvedBody")}</p>
                </li>
                <li className="rounded-2xl border border-slate-100 p-4">
                  <span className="font-extrabold text-slate-900">{t("lessonPlans.status.returned")}</span>
                  <p className="mt-1 leading-relaxed">{h("returnedBody")}</p>
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{h("tools")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <GripVertical className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                    {h("weekBoardTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{h("weekBoardBody")}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <Library className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                    {h("libraryTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{h("libraryBody")}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <Share2 className="w-4 h-4 text-amber-600" />
                  <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                    {h("shareTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{h("shareBody")}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                {h("whoDoesWhat")}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <p className="text-sm font-extrabold text-slate-900">{h("teachers")}</p>
                  <ul className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
                    {teachersBullets.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-100 p-5 space-y-3">
                  <p className="text-sm font-extrabold text-slate-900">{h("reviewers")}</p>
                  <ul className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
                    {reviewersBullets.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {isReviewer ? (
                <p className="text-xs text-slate-500 font-medium">{h("reviewerNote")}</p>
              ) : (
                <p className="text-xs text-slate-500 font-medium">{h("teacherNote")}</p>
              )}
            </section>

            <div className="flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-950 to-slate-900 px-4 py-3 text-xs leading-relaxed font-medium text-slate-300">
              <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold text-white">{h("tipLabel")} </span>
                {h("tip")}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
