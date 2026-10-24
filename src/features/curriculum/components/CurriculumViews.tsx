import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BookMarked,
  Plus,
  Search,
  Filter,
  BookOpen,
  Clock,
  FileText,
  MoreVertical,
  XCircle,
  GraduationCap,
  Edit2,
  Trash2,
  Settings,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type CurriculumViewsProps = {
  activeDropdown?: any;
  activeView?: any;
  canManage?: any;
  classrooms?: any;
  offerings?: any;
  filteredSubjects?: any;
  gradeLevels?: any;
  handleBackfillCurriculumLinks?: any;
  handleDeleteGradeLevel?: any;
  handleDeleteSubject?: any;
  handleDeleteSyllabus?: any;
  handleSeedGradeLevels?: any;
  handleUpdateGradeLevel?: any;
  handleUpdateSubject?: any;
  school?: any;
  searchTerm?: any;
  setActiveDropdown?: any;
  setSearchTerm?: any;
  setSelectedGradeLevel?: any;
  setSelectedSubject?: any;
  setSelectedSyllabus?: any;
  setShowGradeModal?: any;
  setShowManageSubjectsModal?: any;
  setShowSyllabusModal?: any;
  setShowSyllabusViewModal?: any;
  setSyllabusFeedback?: any;
  setSyllabusFilterStatus?: any;
  setSyllabusForm?: any;
  setSyllabusSearchTerm?: any;
  subjects?: any;
  onOpenNewSyllabusModal?: () => void;
  onEditSyllabus?: (plan: any) => void;
  submitting?: any;
  syllabi?: any;
  syllabusFilterStatus?: any;
  syllabusSearchTerm?: any;
  user?: any;
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines 920-1444. */
export function CurriculumViews({
  activeDropdown,
  activeView,
  canManage,
  classrooms = [],
  offerings = [],
  filteredSubjects = [],
  gradeLevels = [],
  handleBackfillCurriculumLinks,
  handleDeleteGradeLevel,
  handleDeleteSubject,
  handleDeleteSyllabus,
  handleSeedGradeLevels,
  handleUpdateGradeLevel,
  handleUpdateSubject,
  school,
  searchTerm,
  setActiveDropdown,
  setSearchTerm,
  setSelectedGradeLevel,
  setSelectedSubject,
  setSelectedSyllabus,
  setShowGradeModal,
  setShowManageSubjectsModal,
  setShowSyllabusModal,
  setShowSyllabusViewModal,
  setSyllabusFeedback,
  setSyllabusFilterStatus,
  setSyllabusForm,
  setSyllabusSearchTerm,
  subjects = [],
  onOpenNewSyllabusModal,
  onEditSyllabus,
  submitting,
  syllabi = [],
  syllabusFilterStatus,
  syllabusSearchTerm,
  user,
}: CurriculumViewsProps) {
  const { t } = useTranslation(["pages", "common"]);

  const visibleSyllabi = useMemo(() => {
    if (user?.role !== "TEACHER") return syllabi;
    return syllabi.filter((s) => s.teacherId === user.id);
  }, [syllabi, user?.id, user?.role]);

  return (
    <>
          {activeView === "SYLLABI" ? (
            <div className="space-y-6">
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("curriculum.syllabi.totalSubmissions")}</p>
                    <h4 className="text-2xl font-extrabold text-slate-900">{visibleSyllabi.length}</h4>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("curriculum.syllabi.approved")}</p>
                    <h4 className="text-2xl font-extrabold text-slate-900">
                      {visibleSyllabi.filter(s => s.status === "APPROVED").length}
                    </h4>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("curriculum.syllabi.pendingVerification")}</p>
                    <h4 className="text-2xl font-extrabold text-slate-900">
                      {visibleSyllabi.filter(s => s.status === "PENDING").length}
                    </h4>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("curriculum.syllabi.draftsRejected")}</p>
                    <h4 className="text-2xl font-extrabold text-slate-900">
                      {visibleSyllabi.filter(s => s.status === "DRAFT" || s.status === "REJECTED").length}
                    </h4>
                  </div>
                </div>
              </div>

              {user?.role === "TEACHER" ? (
                <p className="text-sm font-medium text-slate-500 px-1">
                  {t("curriculum.syllabi.myPlansOnly")}
                </p>
              ) : null}

              {/* Filtering and Primary Controls */}
              <div className="bg-white rounded-[32px] p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder={t("curriculum.syllabi.searchPlaceholder")}
                      value={syllabusSearchTerm}
                      onChange={(e) => setSyllabusSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <select 
                      value={syllabusFilterStatus} 
                      onChange={(e) => setSyllabusFilterStatus(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">{t("curriculum.syllabi.filterAll")}</option>
                      <option value="PENDING">{t("curriculum.syllabi.filterPending")}</option>
                      <option value="APPROVED">{t("curriculum.syllabi.filterApproved")}</option>
                      <option value="REJECTED">{t("curriculum.syllabi.filterRejected")}</option>
                      <option value="DRAFT">{t("curriculum.syllabi.filterDraft")}</option>
                    </select>
                  </div>
                </div>

                {user?.role === "TEACHER" ? (
                  <button 
                    onClick={() => onOpenNewSyllabusModal?.()}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all text-center shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t("curriculum.syllabi.fillTemplate")}
                  </button>
                ) : (
                  <div className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-2.5 text-xs font-extrabold text-amber-800 flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    {t("curriculum.syllabi.reviewerView")}
                  </div>
                )}
              </div>

              {/* Syllabus Submissions List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleSyllabi
                  .filter(s => {
                    const matchesSearch = 
                      !syllabusSearchTerm || 
                      s.title.toLowerCase().includes(syllabusSearchTerm.toLowerCase()) ||
                      s.subjectName.toLowerCase().includes(syllabusSearchTerm.toLowerCase()) ||
                      s.teacherName.toLowerCase().includes(syllabusSearchTerm.toLowerCase());
                    const matchesStatus = 
                      syllabusFilterStatus === "ALL" || 
                      s.status === syllabusFilterStatus;
                    return matchesSearch && matchesStatus;
                  })
                  .map(syllabus => {
                    let statusColor = "bg-slate-50 text-slate-600 border-slate-100";
                    if (syllabus.status === "PENDING") statusColor = "bg-amber-50 text-amber-700 border-amber-100";
                    if (syllabus.status === "APPROVED") statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    if (syllabus.status === "REJECTED") statusColor = "bg-rose-50 text-rose-700 border-rose-100";

                    let weightsSummary = "";
                    try {
                      const parsed = JSON.parse(syllabus.gradingCriteria || "[]");
                      weightsSummary = parsed.map((c: any) => `${c.label}: ${c.weight}%`).join(", ");
                    } catch {
                      weightsSummary = t("curriculum.syllabi.weightsDefined");
                    }

                    let totalUnits = 0;
                    try {
                      totalUnits = JSON.parse(syllabus.units || "[]").length;
                    } catch {}

                    return (
                      <div key={syllabus.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-indigo-100 transition-all flex flex-col justify-between gap-6 group">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                                  {syllabus.gradeLevelName}
                                </span>
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                                  {syllabus.subjectName}
                                </span>
                              </div>
                              <h3 className="font-bold text-slate-950 text-lg leading-snug group-hover:text-indigo-600 transition-colors">
                                {syllabus.title}
                              </h3>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${statusColor}`}>
                              {syllabus.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-500 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                            <div className="space-y-1">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">{t("curriculum.syllabi.authorTeacher")}</span>
                              <span className="text-slate-800 font-bold">{syllabus.teacherName}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">{t("curriculum.syllabi.academicYear")}</span>
                              <span className="text-slate-800 font-bold">{syllabus.academicYear}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">{t("curriculum.syllabi.lessonOutline")}</span>
                              <span className="text-slate-800 font-bold">{t("curriculum.syllabi.teachingBlocks", { count: totalUnits })}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">{t("curriculum.syllabi.textbooks")}</span>
                              <span className="text-slate-800 font-bold truncate block max-w-[150px]" title={syllabus.textbooks || t("curriculum.syllabi.noneSpecified")}>
                                {syllabus.textbooks || t("curriculum.syllabi.noneSpecified")}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs">
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">{t("curriculum.syllabi.assessmentDistribution")}</span>
                            <p className="text-slate-600 italic line-clamp-1">{weightsSummary || t("curriculum.syllabi.noWeights")}</p>
                          </div>

                          {syllabus.feedback && (
                            <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-2xl text-xs text-amber-900 leading-relaxed">
                              <strong className="font-extrabold block mb-0.5">{t("curriculum.syllabi.verificationNotes")}</strong>
                              {syllabus.feedback}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                          <button 
                            onClick={() => {
                              setSelectedSyllabus(syllabus);
                              setSyllabusFeedback(syllabus.feedback || "");
                              setShowSyllabusViewModal(true);
                            }}
                            className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 font-bold text-xs rounded-xl transition-all text-center"
                          >
                            {t("curriculum.syllabi.readReview")}
                          </button>

                          {(syllabus.status === "REJECTED" || syllabus.status === "DRAFT") &&
                          (user?.id === syllabus.teacherId || canManage) &&
                          onEditSyllabus ? (
                            <button
                              type="button"
                              onClick={() => onEditSyllabus(syllabus)}
                              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all"
                              title={t("curriculum.syllabi.editPlan")}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          ) : null}
                          
                          {(user?.id === syllabus.teacherId || canManage) && (
                            <button 
                              onClick={() => handleDeleteSyllabus(syllabus.id)}
                              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-bold text-xs rounded-xl transition-all"
                              title={t("curriculum.syllabi.deleteSyllabus")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {visibleSyllabi.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                    <FileText className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t("curriculum.syllabi.emptyTitle")}</h3>
                    <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                      {user?.role === "TEACHER"
                        ? t("curriculum.syllabi.emptyTeacher")
                        : t("curriculum.syllabi.emptyReviewer")
                      }
                    </p>
                    {user?.role === "TEACHER" ? (
                      <button 
                        onClick={() => onOpenNewSyllabusModal?.()}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
                      >
                        <PlusCircle className="w-5 h-5" />
                        {t("curriculum.syllabi.submitPlan")}
                      </button>
                    ) : (
                      <div className="text-indigo-600 font-extrabold text-xs tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full inline-block">
                        {t("curriculum.syllabi.awaitingSubmissions")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeView === "SUBJECTS" ? (
            <div className="bg-white rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-md:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={t("curriculum.subjects.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-100">
                {filteredSubjects.map((subject) => (
                  <div key={subject.id} className="bg-white p-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                          <BookMarked className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{subject.name}</h3>
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{subject.code}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mb-3">{subject.description || t("curriculum.subjects.noDescription")}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveDropdown(activeDropdown === subject.id ? null : subject.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {activeDropdown === subject.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 z-20 py-2"
                              >
                                <button 
                                  onClick={() => {
                                    const newName = prompt(t("curriculum.subjects.promptName"), subject.name);
                                    const newCode = prompt(t("curriculum.subjects.promptCode"), subject.code);
                                    if (newName || newCode) {
                                      handleUpdateSubject(subject.id, { 
                                        name: newName || subject.name, 
                                        code: newCode || subject.code 
                                      });
                                    }
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  {t("curriculum.subjects.editSubject")}
                                </button>
                                <button 
                                  onClick={() => {
                                    handleDeleteSubject(subject.id);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {t("curriculum.subjects.deleteSubject")}
                                </button>
                                <div className="h-px bg-slate-50 my-1" />
                                <button 
                                  onClick={() => {
                                    setSelectedSubject(subject);
                                    const related = classrooms.find((c: any) => c.subjectId === subject.id);
                                    const grade =
                                      (related &&
                                        gradeLevels.find((g: any) => g.id === related.gradeLevelId)) ||
                                      gradeLevels[0];
                                    if (grade) {
                                      setSelectedGradeLevel(grade);
                                      setShowManageSubjectsModal(true);
                                    }
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                >
                                  <Settings className="w-3 h-3" />
                                  {t("curriculum.subjects.assignToGroups")}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredSubjects.length === 0 && (
                  <div className="col-span-2 py-20 text-center bg-white">
                    <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">{t("curriculum.subjects.empty")}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {canManage && gradeLevels.length > 0 && handleBackfillCurriculumLinks && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleBackfillCurriculumLinks()}
                    disabled={submitting}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider disabled:opacity-50"
                  >
                    {t("curriculum.gradeLevels.backfillLink")}
                  </button>
                </div>
              )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {gradeLevels.map((grade) => {
                const gradeClassGroups = classrooms.filter(c => c.gradeLevelId === grade.id && !c.subjectId);
                const offeredIds = new Set(
                  (offerings || [])
                    .filter((o: any) => o.gradeLevelId === grade.id)
                    .map((o: any) => o.subjectId)
                );
                const gradeSubjects = subjects.filter(
                  (s: any) =>
                    offeredIds.has(s.id) ||
                    classrooms.some(
                      (c: any) => c.gradeLevelId === grade.id && c.subjectId === s.id
                    )
                );

                return (
                  <div key={grade.id} className="bg-white p-6 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 group hover:border-indigo-200 transition-all flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900">{grade.name}</span>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveDropdown(activeDropdown === grade.id ? null : grade.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {activeDropdown === grade.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 z-20 py-2"
                              >
                                <button 
                                  onClick={() => {
                                    const newName = prompt(t("curriculum.gradeLevels.promptName"), grade.name);
                                    if (newName && newName !== grade.name) handleUpdateGradeLevel(grade.id, newName);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  {t("curriculum.gradeLevels.editName")}
                                </button>
                                <button 
                                  onClick={() => {
                                    handleDeleteGradeLevel(grade.id);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {t("curriculum.gradeLevels.deleteLevel")}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{t("curriculum.gradeLevels.classGroups")}</span>
                        <span className="text-xs font-bold text-slate-600">{gradeClassGroups.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {gradeClassGroups.length > 0 ? (
                          gradeClassGroups.map(cg => (
                            <span key={cg.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-bold border border-indigo-100">
                              {cg.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">{t("curriculum.gradeLevels.noClassGroups")}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{t("curriculum.gradeLevels.activeSubjects")}</span>
                        {canManage && (
                          <button 
                            onClick={() => {
                              setSelectedGradeLevel(grade);
                              setShowManageSubjectsModal(true);
                            }}
                            className="text-xs text-indigo-600 font-bold hover:underline"
                          >
                            {t("curriculum.gradeLevels.manage")}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {gradeSubjects.length > 0 ? (
                          gradeSubjects.map(s => (
                            <span key={s.id} className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-xs font-bold border border-slate-100">
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">{t("curriculum.gradeLevels.noSubjects")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {gradeLevels.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                  <GraduationCap className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t("curriculum.gradeLevels.emptyTitle")}</h3>
                  <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                    {t("curriculum.gradeLevels.emptyHint")}
                  </p>
                  {canManage && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={() => setShowGradeModal(true)}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        {t("curriculum.gradeLevels.addGradeLevel")}
                      </button>
                      <button 
                        onClick={handleSeedGradeLevels}
                        disabled={submitting}
                        className="px-8 py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all flex items-center gap-2"
                      >
                        {submitting ? t("curriculum.gradeLevels.seeding") : t("curriculum.gradeLevels.seedDefaults")}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 text-center max-w-md mx-auto">
                      {t("curriculum.gradeLevels.emptyHint", { defaultValue: "Start by adding a grade level manually, or use \"Seed defaults\" to quickly add Grades 1–12." })}
                    </p>
                  )}
                </div>
              )}
            </div>
            </div>
          )}
        </>
  );
}
