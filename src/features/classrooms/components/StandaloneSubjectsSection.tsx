import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Trash2
} from "lucide-react";
import { motion } from "motion/react";
import { getTeachersForClassGroup } from "../utils";

export type StandaloneSubjectsSectionProps = {
  handleDeleteClassroom: (id: string) => void;
  standaloneSubjectsToDisplay: any[];
};

export function StandaloneSubjectsSection({
  handleDeleteClassroom,
  standaloneSubjectsToDisplay,
}: StandaloneSubjectsSectionProps) {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();
  return (
    <div className="space-y-6 pt-4">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {t("classrooms.standaloneSubjects.title")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {standaloneSubjectsToDisplay.map((subClassroom, index) => {
          const teachers = getTeachersForClassGroup(subClassroom);
          return (
            <motion.div
              key={subClassroom.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="group bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden hover:border-indigo-100 transition-all flex flex-col justify-between"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between relative">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClassroom(subClassroom.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                    title={t("classrooms.standaloneSubjects.deleteClassroom")}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                    {subClassroom.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {subClassroom.subject?.name || t("classrooms.standaloneSubjects.subjectFallback")}
                    {(subClassroom.sectionSubjectCode || subClassroom.subject?.code)
                      ? ` · ${subClassroom.sectionSubjectCode || subClassroom.subject?.code}`
                      : ""}
                    {teachers[0] ? ` · ${teachers[0].name}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                      {t("classrooms.standaloneSubjects.members", { count: subClassroom._count?.members || 0 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                      {subClassroom.gradeLevel?.name || t("classrooms.standaloneSubjects.noGrade")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link
                  to={`/${slug}/classroom/${subClassroom.id}`}
                  className="w-full py-2.5 bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                >
                  {t("classrooms.standaloneSubjects.viewSubjectClassroom")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
