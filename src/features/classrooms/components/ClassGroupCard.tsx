import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Users,
  MoreVertical,
  ArrowRight,
  GraduationCap,
  Edit2,
  Trash2,
  Copy,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AvatarGroup } from "../../../components/AvatarGroup";
import { subjectRoomsForClassGroup } from "../../academics-shared/classGroupLinks";
import { getTeachersForClassGroup, resolveOrganizationType } from "../utils";

export type ClassGroupCardProps = {
  classGroup: any;
  index: number;
  slug: string | undefined;
  allSubjectClassrooms: any[];
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  canManageStudents: boolean;
  handleAssignSubject: (cg: any) => void;
  handleManageStudents: (cg: any) => void;
  handleEditClassroom: (cg: any) => void;
  handleDuplicateClassroom: (cg: any) => void;
  handlePropagateRoster?: (cg: any) => void;
  handleDeleteClassroom: (id: string) => void;
};

export function ClassGroupCard({
  classGroup,
  index,
  slug,
  allSubjectClassrooms,
  activeDropdown,
  setActiveDropdown,
  canManageStudents,
  handleAssignSubject,
  handleManageStudents,
  handleEditClassroom,
  handleDuplicateClassroom,
  handlePropagateRoster,
  handleDeleteClassroom,
}: ClassGroupCardProps) {
  const { t } = useTranslation(["pages", "common"]);
  const orgType = resolveOrganizationType(classGroup, allSubjectClassrooms);
  const orgLabel =
    orgType === "SELF_CONTAINED"
      ? t("classroomModals.orgSelfContained")
      : orgType === "DEPARTMENTALIZED"
        ? t("classroomModals.orgDepartmentalized")
        : t("classroomModals.orgMixed");
  return (
                  <motion.div
                    key={classGroup.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden hover:border-indigo-100 transition-all flex flex-col justify-between"
                  >
                    <div className="p-6 space-y-4">
                      {/* Header: org type + actions */}
                      <div className="flex items-start justify-between relative gap-3">
                        <span className="inline-flex text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {orgLabel}
                        </span>

                        {/* Dropdown for class group actions */}
                        <div className="relative shrink-0">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === classGroup.id ? null : classGroup.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          <AnimatePresence>
                            {activeDropdown === classGroup.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-2 overflow-hidden"
                                >
                                  <button 
                                    onClick={() => handleAssignSubject(classGroup)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                    {t("classrooms.classGroupCard.assignSubject")}
                                  </button>
                                  {canManageStudents && (
                                    <button 
                                      onClick={() => handleManageStudents(classGroup)}
                                      className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                                    >
                                      <Users className="w-4 h-4" />
                                      {t("classrooms.classGroupCard.manageStudents")}
                                    </button>
                                  )}
                                  {canManageStudents && handlePropagateRoster && (
                                    <button
                                      type="button"
                                      onClick={() => handlePropagateRoster(classGroup)}
                                      className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      {t("classrooms.classGroupCard.syncRoster")}
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleEditClassroom(classGroup)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    {t("classrooms.classGroupCard.editClassGroup")}
                                  </button>
                                  <button 
                                    onClick={() => handleDuplicateClassroom(classGroup)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                    {t("classrooms.classGroupCard.duplicateClassGroup")}
                                  </button>
                                  <div className="h-px bg-slate-50 my-1" />
                                  <button 
                                    onClick={() => handleDeleteClassroom(classGroup.id)}
                                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {t("classrooms.classGroupCard.deleteClassGroup")}
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Class Group Name and Homeroom Teacher */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                            {classGroup.name}
                          </h3>
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 font-extrabold text-[9px] uppercase tracking-wider rounded-md border border-indigo-100">
                            {t("classrooms.classGroupCard.homeroom")}
                          </span>
                        </div>
                        
                        {/* Homeroom Teacher Row with Avatar Group */}
                        {(() => {
                          const teachers = getTeachersForClassGroup(classGroup);
                          return (
                            <div className="flex items-center justify-between mt-3 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">{t("classrooms.classGroupCard.classTeachers")}</span>
                                <span className="text-xs text-slate-700 font-bold mt-1 truncate">
                                  {teachers.length > 0 
                                    ? teachers.map(teacher => teacher.name.split(" ")[0]).join(", ")
                                    : t("classrooms.classGroupCard.unassigned")
                                  }
                                </span>
                              </div>
                              <AvatarGroup items={teachers} size="sm" max={3} />
                            </div>
                          );
                        })()}
                      </div>

                      {/* Class stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">{t("classrooms.classGroupCard.studentsCount", { count: classGroup._count?.members || 0 })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">{classGroup.gradeLevel?.name || t("classrooms.classGroupCard.notAvailable")}</span>
                        </div>
                      </div>

                      {/* Assigned Subjects Sub-section */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("classrooms.classGroupCard.assignedSubjects")}</span>
                          <button
                            onClick={() => handleAssignSubject(classGroup)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> {t("classrooms.classGroupCard.add")}
                          </button>
                        </div>

                        {/* List of associated subject classrooms */}
                        {(() => {
                          const associatedSubjects = subjectRoomsForClassGroup(
                            classGroup,
                            allSubjectClassrooms
                          );
                          
                          if (associatedSubjects.length === 0) {
                            return (
                              <p className="text-xs text-amber-600/80 bg-amber-50/50 border border-amber-100/50 px-3 py-2 rounded-xl font-medium italic">
                                {t("classrooms.classGroupCard.noSubjectsAssigned")}
                              </p>
                            );
                          }

                          return (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                              {associatedSubjects.map(subClassroom => {
                                const subTeachers = getTeachersForClassGroup(subClassroom);
                                return (
                                  <div 
                                    key={subClassroom.id}
                                    className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100/60 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-xs text-slate-800 truncate">
                                        {subClassroom.subject?.name || subClassroom.name.split(" - ").slice(1).join(" - ")}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                                          {subClassroom.subject?.code || "SUB"}
                                        </span>
                                        {subTeachers.length > 0 && (
                                          <span className="text-xs text-slate-500 font-bold truncate">
                                            • {subTeachers[0].name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2.5 ml-2 shrink-0">
                                      <AvatarGroup items={subTeachers} size="xs" max={2} />
                                      <div className="flex items-center gap-1">
                                        <Link 
                                          to={`/${slug}/classroom/${subClassroom.id}`}
                                          className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-slate-200/80 hover:border-indigo-600 rounded-lg text-xs font-bold transition-all"
                                        >
                                          {t("common:view")}
                                        </Link>
                                        <button
                                          onClick={() => handleDeleteClassroom(subClassroom.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                          title={t("classrooms.classGroupCard.unassignSubject")}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* View Homeroom Button */}
                    <div className="p-6 pt-0">
                      <Link 
                        to={`/${slug}/classroom/${classGroup.id}`}
                        className="w-full py-2.5 bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        {t("classrooms.classGroupCard.viewHomeroom")}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>

  );
}
