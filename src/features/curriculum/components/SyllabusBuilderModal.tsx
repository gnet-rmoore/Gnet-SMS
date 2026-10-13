import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  PlusCircle,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { motion } from "motion/react";
import type { TeachingScope } from "../teacherTeachingScope";
import {
  gradeIdsForSubject,
  subjectIdsForGrade,
} from "../teacherTeachingScope";
import {
  academicYearLabel,
  hasActiveCalendar,
  normalizeCalendarPeriods,
  type ActiveCalendar,
} from "../../academics-shared/syllabusCalendar";

export type SyllabusBuilderModalProps = {
  aiCustomPrompt?: any;
  format?: any;
  generatingAi?: any;
  gradeLevels?: any;
  handleAddCriteria?: any;
  handleAddObjective?: any;
  handleAddUnit?: any;
  handleCreateSyllabus?: any;
  handleCriteriaChange?: any;
  handleGenerateAiSyllabus?: any;
  handleLoadSyllabusTemplate?: any;
  handleObjectiveChange?: any;
  handleRemoveCriteria?: any;
  handleRemoveObjective?: any;
  handleRemoveUnit?: any;
  handleUnitChange?: any;
  handleUnitPeriodChange?: any;
  handleReimportCalendarWeights?: any;
  handleCustomizeWeights?: any;
  calendar?: ActiveCalendar | null;
  calendarSettingsPath?: string;
  editingSyllabusId?: string | null;
  setShowSyllabusModal?: any;
  setSyllabusForm?: any;
  subjects?: any;
  submitting?: any;
  syllabusForm?: any;
  isTeacherScoped?: boolean;
  teachingScope?: TeachingScope | null;
  classroomsPath?: string;
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines 1909-2344. */
export function SyllabusBuilderModal({
  aiCustomPrompt,
  format,
  generatingAi,
  gradeLevels,
  handleAddCriteria,
  handleAddObjective,
  handleAddUnit,
  handleCreateSyllabus,
  handleCriteriaChange,
  handleGenerateAiSyllabus,
  handleLoadSyllabusTemplate,
  handleObjectiveChange,
  handleRemoveCriteria,
  handleRemoveObjective,
  handleRemoveUnit,
  handleUnitChange,
  handleUnitPeriodChange,
  handleReimportCalendarWeights,
  handleCustomizeWeights,
  calendar = null,
  calendarSettingsPath = "",
  editingSyllabusId = null,
  setAiCustomPrompt,
  setShowSyllabusModal,
  setSyllabusForm,
  subjects,
  submitting,
  syllabusForm,
  isTeacherScoped = false,
  teachingScope = null,
  classroomsPath = "",
}: SyllabusBuilderModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const subjectOptions = useMemo(() => {
    if (!isTeacherScoped || !teachingScope) return subjects;
    let list = teachingScope.subjects;
    if (syllabusForm.gradeLevelId) {
      const allowed = new Set(
        subjectIdsForGrade(teachingScope.pairs, syllabusForm.gradeLevelId)
      );
      list = list.filter((s) => allowed.has(s.id));
    }
    return list;
  }, [
    isTeacherScoped,
    teachingScope,
    subjects,
    syllabusForm.gradeLevelId,
  ]);

  const gradeOptions = useMemo(() => {
    if (!isTeacherScoped || !teachingScope) return gradeLevels;
    let list = teachingScope.gradeLevels;
    if (syllabusForm.subjectId) {
      const allowed = new Set(
        gradeIdsForSubject(teachingScope.pairs, syllabusForm.subjectId)
      );
      list = list.filter((g) => allowed.has(g.id));
    }
    return list;
  }, [
    isTeacherScoped,
    teachingScope,
    gradeLevels,
    syllabusForm.subjectId,
  ]);

  const teacherHasNoRooms =
    isTeacherScoped && teachingScope != null && !teachingScope.hasTeachingRooms;

  const calendarReady = hasActiveCalendar(calendar);
  const calendarPeriods = useMemo(
    () => normalizeCalendarPeriods(calendar?.periods),
    [calendar]
  );
  const calendarYearLabel = academicYearLabel(calendar);
  const submitBlocked = teacherHasNoRooms || !calendarReady;

  const handleSubjectChange = (subjectId: string) => {
    if (!isTeacherScoped || !teachingScope) {
      setSyllabusForm({ ...syllabusForm, subjectId });
      return;
    }
    const allowedGrades = gradeIdsForSubject(teachingScope.pairs, subjectId);
    const nextGrade = allowedGrades.includes(syllabusForm.gradeLevelId)
      ? syllabusForm.gradeLevelId
      : allowedGrades[0] || "";
    setSyllabusForm({ ...syllabusForm, subjectId, gradeLevelId: nextGrade });
  };

  const handleGradeChange = (gradeLevelId: string) => {
    if (!isTeacherScoped || !teachingScope) {
      setSyllabusForm({ ...syllabusForm, gradeLevelId });
      return;
    }
    const allowedSubjects = subjectIdsForGrade(
      teachingScope.pairs,
      gradeLevelId
    );
    const nextSubject = allowedSubjects.includes(syllabusForm.subjectId)
      ? syllabusForm.subjectId
      : allowedSubjects[0] || "";
    setSyllabusForm({
      ...syllabusForm,
      gradeLevelId,
      subjectId: nextSubject,
    });
  };

  return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowSyllabusModal(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-4xl bg-white rounded-[32px] border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-hidden my-8"
                >
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-6 md:px-8 py-6 text-white flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("curriculum.eyebrow")}</p>
                      <h2 className="text-xl font-extrabold tracking-tight mt-0.5">
                        {editingSyllabusId
                          ? t("curriculum.syllabusBuilder.editTitle")
                          : t("curriculum.syllabusBuilder.title")}
                      </h2>
                      <p className="text-sm text-slate-300 font-medium mt-1">{t("curriculum.syllabusBuilder.subtitle")}</p>
                    </div>
                    <button type="button" onClick={() => setShowSyllabusModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label={t("common:close")}>
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateSyllabus} className="p-6 md:p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">

                    {teacherHasNoRooms && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 space-y-3">
                        <h4 className="text-sm font-extrabold text-amber-900">
                          {t("curriculum.syllabusBuilder.noTeachingRoomsTitle")}
                        </h4>
                        <p className="text-sm font-medium text-amber-800 leading-relaxed">
                          {t("curriculum.syllabusBuilder.noTeachingRoomsHint")}
                        </p>
                        {classroomsPath ? (
                          <Link
                            to={classroomsPath}
                            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-800"
                          >
                            {t("curriculum.syllabusBuilder.noTeachingRoomsCta")}
                          </Link>
                        ) : null}
                      </div>
                    )}

                    {!calendarReady && (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5 space-y-3">
                        <h4 className="text-sm font-extrabold text-rose-900 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" />
                          {t("curriculum.syllabusBuilder.calendarRequiredTitle")}
                        </h4>
                        <p className="text-sm font-medium text-rose-800 leading-relaxed">
                          {t("curriculum.syllabusBuilder.calendarRequiredHint")}
                        </p>
                        {calendarSettingsPath ? (
                          <Link
                            to={calendarSettingsPath}
                            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-800"
                          >
                            {t("curriculum.syllabusBuilder.calendarRequiredCta")}
                          </Link>
                        ) : null}
                      </div>
                    )}

                    {calendarReady && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                            {t("curriculum.syllabusBuilder.calendarLinked")}
                          </p>
                          <p className="text-sm font-extrabold text-emerald-950 mt-0.5">
                            {calendarYearLabel}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-emerald-800">
                          {t("curriculum.syllabusBuilder.calendarPeriodCount", {
                            count: calendarPeriods.length,
                          })}
                        </p>
                      </div>
                    )}

                    {/* 1-Click International Templates */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 " />
                          Starter templates
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          Load a starter outline for a common curriculum framework, then edit to fit your course.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSyllabusTemplate("CAMBRIDGE")}
                          className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl text-xs hover:bg-white hover:border-slate-300 transition-all shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-1"
                        >
                          Cambridge IGCSE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSyllabusTemplate("IB")}
                          className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl text-xs hover:bg-white hover:border-slate-300 transition-all shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-1"
                        >
                          IB Diploma
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSyllabusTemplate("COMMON_CORE")}
                          className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl text-xs hover:bg-white hover:border-slate-300 transition-all shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex items-center gap-1"
                        >
                          US Common Core
                        </button>
                      </div>
                    </div>

                    {/* Gemini AI Syllabus Assistant */}
                    <div className="bg-slate-950 text-white p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                            AI syllabus assistant
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Choose a subject and grade level below, then generate a draft outline you can edit.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text"
                          value={aiCustomPrompt}
                          onChange={(e) => setAiCustomPrompt(e.target.value)}
                          placeholder={t("curriculum.syllabusBuilder.aiPlaceholder")}
                          className="flex-1 px-4 py-2.5 bg-slate-850 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateAiSyllabus}
                          disabled={generatingAi}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 shrink-0"
                        >
                          {generatingAi ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                              <span>{t("curriculum.syllabusBuilder.structuring")}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                              <span>{t("curriculum.syllabusBuilder.generateWithGemini")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 1. Basic Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t("curriculum.syllabusBuilder.section1")}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600">Syllabus / Plan Title</label>
                          <input 
                            type="text" 
                            value={syllabusForm.title} 
                            onChange={(e) => setSyllabusForm({ ...syllabusForm, title: e.target.value })} 
                            placeholder="e.g. Grade 10 Honors Mathematics - Fall Semester" 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm" 
                            required 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600">{t("curriculum.syllabusBuilder.academicSubject")}</label>
                          <select 
                            value={syllabusForm.subjectId} 
                            onChange={(e) => handleSubjectChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                            required
                            disabled={teacherHasNoRooms}
                          >
                            <option value="" disabled>{t("curriculum.syllabusBuilder.selectSubject")}</option>
                            {subjectOptions.length === 0 ? (
                              <option value="" disabled>
                                {isTeacherScoped
                                  ? t("curriculum.syllabusBuilder.noTeachingSubjects")
                                  : t("curriculum.syllabusBuilder.noSubjectsConfigured")}
                              </option>
                            ) : (
                              subjectOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600">{t("curriculum.syllabusBuilder.targetGrade")}</label>
                          <select 
                            value={syllabusForm.gradeLevelId} 
                            onChange={(e) => handleGradeChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                            required
                            disabled={teacherHasNoRooms}
                          >
                            <option value="" disabled>{t("curriculum.syllabusBuilder.selectGrade")}</option>
                            {gradeOptions.length === 0 ? (
                              <option value="" disabled>
                                {isTeacherScoped
                                  ? t("curriculum.syllabusBuilder.noTeachingGrades")
                                  : t("curriculum.syllabusBuilder.noGradesConfigured")}
                              </option>
                            ) : (
                              gradeOptions.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))
                            )}
                          </select>
                          {isTeacherScoped && teachingScope?.hasTeachingRooms ? (
                            <p className="text-xs font-medium text-slate-500">
                              {t("curriculum.syllabusBuilder.teacherScopeHint")}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600">{t("curriculum.syllabusBuilder.academicYear")}</label>
                          <input 
                            type="text" 
                            value={syllabusForm.academicYear} 
                            onChange={(e) => setSyllabusForm({ ...syllabusForm, academicYear: e.target.value })} 
                            placeholder={t("curriculum.syllabusBuilder.academicYearPlaceholder")}
                            readOnly={calendarReady}
                            className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm ${
                              calendarReady ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-slate-50"
                            }`}
                            required 
                          />
                          {calendarReady ? (
                            <p className="text-xs font-medium text-slate-500">
                              {t("curriculum.syllabusBuilder.academicYearFromCalendar")}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600">Curriculum / Standards Alignment</label>
                          <select 
                            value={syllabusForm.standardsFramework} 
                            onChange={(e) => setSyllabusForm({ ...syllabusForm, standardsFramework: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                            required
                          >
                            <option value="Cambridge International (CIE)">Cambridge International (CIE)</option>
                            <option value="International Baccalaureate (IB)">International Baccalaureate (IB)</option>
                            <option value="US Common Core (CCSS)">US Common Core (CCSS)</option>
                            <option value="UK National Curriculum">UK National Curriculum</option>
                            <option value="National Standard Curriculum (General)">National Standard Curriculum (General)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600">Required Textbooks & Classroom Literature</label>
                          <textarea 
                            value={syllabusForm.textbooks} 
                            onChange={(e) => setSyllabusForm({ ...syllabusForm, textbooks: e.target.value })} 
                            placeholder="e.g. Pearson Advanced Calculus Vol.2, Cambridge Mathematics Coursebook. List and review all primary titles." 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm h-24 resize-y leading-relaxed" 
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Support & Stretch (Differentiation & IEPs) Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Inclusion, Differentiation & Support Strategies</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            Learning Differentiation Strategies
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded font-extrabold">Support & Stretch</span>
                          </label>
                          <textarea 
                            value={syllabusForm.differentiation}
                            onChange={(e) => setSyllabusForm({ ...syllabusForm, differentiation: e.target.value })}
                            placeholder="e.g. Extension tasks for advanced learners, scaffolding worksheets/models to support students experiencing foundational hurdles."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold h-24 resize-y leading-relaxed"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            Student Accommodations (IEPs, 504s, ESL)
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded font-extrabold">Special Education</span>
                          </label>
                          <textarea 
                            value={syllabusForm.accommodations}
                            onChange={(e) => setSyllabusForm({ ...syllabusForm, accommodations: e.target.value })}
                            placeholder="e.g. Dyslexic candidates: extra 25% reading time; visually impaired: large format papers; ESL: glossary banks."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold h-24 resize-y leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Course Goals & Objectives */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. Learning Objectives</h3>
                        <button 
                          type="button" 
                          onClick={handleAddObjective}
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Objective
                        </button>
                      </div>
                      
                      <div className="space-y-2.5">
                        {syllabusForm.objectives.map((obj, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <span className="text-xs font-extrabold text-slate-400 w-5 pt-3">{index + 1}.</span>
                            <textarea 
                              value={obj} 
                              onChange={(e) => handleObjectiveChange(index, e.target.value)} 
                              placeholder="e.g. Formulate and solve systems of linear inequalities representing real-world matrices" 
                              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-xs h-16 resize-y leading-relaxed" 
                              rows={2}
                              required 
                            />
                            <button 
                              type="button" 
                              onClick={() => handleRemoveObjective(index)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 mt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Teaching Schedule Units */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider ">4. Weekly Units & Topics</h3>
                        <button 
                          type="button" 
                          onClick={handleAddUnit}
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Weekly Block
                        </button>
                      </div>

                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-[32px] border border-slate-200">
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 px-2 max-md:hidden">
                          <div className="col-span-2">Time Frame</div>
                          <div className="col-span-4">Focus Topic(s)</div>
                          <div className="col-span-4">Activities & Resources</div>
                          <div className="col-span-2">Evaluation Method</div>
                        </div>

                        {syllabusForm.units.map((unit, index) => (
                          <div key={index} className="grid grid-cols-12 gap-3 pb-3 border-b border-slate-100/50 last:border-b-0 last:pb-0 items-start">
                            <div className="col-span-12 md:col-span-2 space-y-1 pt-0.5">
                              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest md:hidden">{t("curriculum.syllabusBuilder.week")}</label>
                              {calendarPeriods.length > 0 ? (
                                <select
                                  value={unit.academicPeriodId || ""}
                                  onChange={(e) => handleUnitPeriodChange?.(index, e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none font-semibold text-xs text-slate-800"
                                  required
                                >
                                  <option value="">{t("curriculum.syllabusBuilder.selectPeriod")}</option>
                                  {calendarPeriods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input 
                                  type="text" 
                                  value={unit.week} 
                                  onChange={(e) => handleUnitChange(index, "week", e.target.value)}
                                  placeholder="e.g. Weeks 1-4"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none font-semibold text-xs text-slate-800"
                                  required
                                />
                              )}
                              {calendarPeriods.length > 0 && unit.week ? (
                                <p className="text-xs font-medium text-slate-500 mt-1">{unit.week}</p>
                              ) : null}
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-1">
                              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest md:hidden">Topics Covered</label>
                              <textarea 
                                value={unit.topic} 
                                onChange={(e) => handleUnitChange(index, "topic", e.target.value)}
                                placeholder="e.g. Coordinate Geometry & Slopes"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-slate-800 font-semibold h-16 resize-y leading-relaxed"
                                rows={2}
                                required
                              />
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-1">
                              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest md:hidden">Activities/Materials</label>
                              <textarea 
                                value={unit.activities} 
                                onChange={(e) => handleUnitChange(index, "activities", e.target.value)}
                                placeholder="e.g. Chapter 3 exercises, graph plotting sheets"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-slate-800 font-semibold h-16 resize-y leading-relaxed"
                                rows={2}
                              />
                            </div>
                            <div className="col-span-10 md:col-span-2 space-y-1 pt-0.5">
                              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest md:hidden">Assessment</label>
                              <input 
                                type="text" 
                                value={unit.assessment} 
                                onChange={(e) => handleUnitChange(index, "assessment", e.target.value)}
                                placeholder="e.g. Quiz 1, Pop Quiz"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-slate-800"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-1 text-right self-end md:self-center pb-1">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveUnit(index)}
                                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors font-bold text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 5. Assessment Distribution */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t("curriculum.syllabusBuilder.section5")}</h3>
                        <div className="flex flex-wrap gap-2">
                          {syllabusForm.weightsFromCalendar ? (
                            <>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                {t("curriculum.syllabusBuilder.weightsFromCalendar")}
                              </span>
                              <button
                                type="button"
                                onClick={handleCustomizeWeights}
                                className="text-xs font-bold text-slate-600 hover:text-indigo-600"
                              >
                                {t("curriculum.syllabusBuilder.customizeWeights")}
                              </button>
                            </>
                          ) : (
                            <>
                              {calendarReady ? (
                                <button
                                  type="button"
                                  onClick={handleReimportCalendarWeights}
                                  className="text-xs font-bold text-indigo-600 hover:underline"
                                >
                                  {t("curriculum.syllabusBuilder.reimportWeights")}
                                </button>
                              ) : null}
                              <button 
                                type="button" 
                                onClick={handleAddCriteria}
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> {t("curriculum.syllabusBuilder.addCriteria")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {syllabusForm.gradingCriteria.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <input 
                              type="text" 
                              value={item.label} 
                              onChange={(e) => handleCriteriaChange(index, "label", e.target.value)}
                              placeholder={t("curriculum.syllabusBuilder.label")}
                              readOnly={syllabusForm.weightsFromCalendar && item.fromCalendar}
                              className={`flex-1 px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800 ${
                                syllabusForm.weightsFromCalendar && item.fromCalendar
                                  ? "bg-slate-100 cursor-not-allowed"
                                  : "bg-white"
                              }`}
                              required
                            />
                            <div className="flex items-center gap-1 w-20 shrink-0">
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={item.weight} 
                                onChange={(e) => handleCriteriaChange(index, "weight", e.target.value)}
                                readOnly={syllabusForm.weightsFromCalendar && item.fromCalendar}
                                className={`w-12 px-2 py-1.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-center font-bold text-slate-800 ${
                                  syllabusForm.weightsFromCalendar && item.fromCalendar
                                    ? "bg-slate-100 cursor-not-allowed"
                                    : "bg-white"
                                }`}
                                required
                              />
                              <span className="text-xs font-bold text-slate-500">%</span>
                            </div>
                            {!syllabusForm.weightsFromCalendar ? (
                              <button 
                                type="button" 
                                onClick={() => handleRemoveCriteria(index)}
                                className="text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mt-4">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Syllabus Sum Total Weight</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-extrabold ${
                            syllabusForm.gradingCriteria.reduce((sum, item) => sum + item.weight, 0) === 100 
                              ? "text-emerald-600" 
                              : "text-amber-600"
                          }`}>
                            {syllabusForm.gradingCriteria.reduce((sum, item) => sum + item.weight, 0)}%
                          </span>
                          {syllabusForm.gradingCriteria.reduce((sum, item) => sum + item.weight, 0) === 100 ? (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-lg border border-emerald-100 uppercase tracking-wide">Valid (100%)</span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-extrabold rounded-lg border border-amber-100 uppercase tracking-wide">Must sum to 100%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Foot buttons */}
                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => setShowSyllabusModal(false)} 
                        className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
                      >
                        Discard Draft
                      </button>
                      <button 
                        type="submit" 
                        disabled={submitting || submitBlocked} 
                        className="flex-1 px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50  text-sm"
                      >
                        {submitting
                          ? t("curriculum.syllabusBuilder.submitting")
                          : editingSyllabusId
                            ? t("curriculum.syllabusBuilder.resubmitForReview")
                            : t("curriculum.syllabusBuilder.submitForReview")}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
  );
}
