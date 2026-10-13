import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BookMarked,
  Plus,
  BookOpen,
  FileText,
  Download,
  GraduationCap,
  CalendarDays,
  Pencil,
} from "lucide-react";
import { motion } from "motion/react";
import {
  parseSyllabusJsonField,
  periodLabelById,
  type ActiveCalendar,
} from "../../academics-shared/syllabusCalendar";

export type SyllabusViewModalProps = {
  canManage?: boolean;
  calendar?: ActiveCalendar | null;
  handleUpdateSyllabusStatus?: any;
  onEditSyllabus?: (plan: any) => void;
  selectedSyllabus?: any;
  setShowSyllabusViewModal?: any;
  setSyllabusFeedback?: any;
  submitting?: any;
  syllabusFeedback?: any;
  user?: { id?: string; role?: string } | null;
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines 1770-2044. */
export function SyllabusViewModal({
  canManage,
  calendar = null,
  handleUpdateSyllabusStatus,
  onEditSyllabus,
  selectedSyllabus,
  setShowSyllabusViewModal,
  setSyllabusFeedback,
  submitting,
  syllabusFeedback,
  user,
}: SyllabusViewModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const units = useMemo(
    () => parseSyllabusJsonField<any[]>(selectedSyllabus?.units, []),
    [selectedSyllabus?.units]
  );
  const gradingCriteria = useMemo(
    () => parseSyllabusJsonField<any[]>(selectedSyllabus?.gradingCriteria, []),
    [selectedSyllabus?.gradingCriteria]
  );
  const syncedFromCalendar = gradingCriteria.some((c) => c.fromCalendar);
  const canEdit =
    (selectedSyllabus?.status === "REJECTED" || selectedSyllabus?.status === "DRAFT") &&
    (user?.id === selectedSyllabus?.teacherId || canManage) &&
    Boolean(onEditSyllabus);

  return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowSyllabusViewModal(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-4xl bg-slate-50 rounded-[32px] border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-hidden my-8"
                >
                  {/* Header block */}
                  <div className="p-6 md:p-8 bg-gradient-to-br from-slate-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-0.5">Syllabus plan</span>
                        <h2 className="text-xl font-extrabold tracking-tight text-white truncate">{selectedSyllabus.title}</h2>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={() => {
                          const printContent = document.getElementById("printable-syllabus-area")?.innerHTML;
                          if (printContent) {
                            const win = window.open("", "_blank");
                            if (win) {
                              win.document.write(`
                                <html>
                                  <head>
                                    <title>${selectedSyllabus.title}</title>
                                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                                    <style>
                                      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                                      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
                                      table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
                                      th, td { border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; }
                                      th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                                      @media print {
                                        body { padding: 0; }
                                        .print-border { border: none !important; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="max-w-4xl mx-auto space-y-8">
                                      <div class="border-b-4 border-indigo-600 pb-4">
                                        <span class="text-xs font-extrabold text-indigo-600 tracking-widest uppercase">ACADEMIC CURRICULUM SYLLABUS</span>
                                        <h1 class="text-3xl font-extrabold text-slate-900 mt-1">${selectedSyllabus.title}</h1>
                                        <p class="text-slate-500 text-sm font-bold mt-1">Instructor: ${selectedSyllabus.teacherName} | Academic Year: ${selectedSyllabus.academicYear}</p>
                                      </div>
                                      ${printContent}
                                    </div>
                                  </body>
                                </html>
                              `);
                              win.document.close();
                              win.focus();
                              setTimeout(() => {
                                win.print();
                              }, 500);
                            }
                          }
                        }} 
                        className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs border border-white/10"
                        title={t("curriculum.syllabusView.printExport")}
                      >
                        <Download className="w-4 h-4" />
                        <span>Print Plan</span>
                      </button>

                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                        selectedSyllabus.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        selectedSyllabus.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-rose-50 text-rose-700 border-rose-100"
                      }`}>
                        {selectedSyllabus.status}
                      </span>
                      
                      <button onClick={() => setShowSyllabusViewModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                        <Plus className="w-6 h-6 rotate-45" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* 1. Page Body Document style card */}
                    <div id="printable-syllabus-area" className="bg-white p-6 md:p-10 rounded-[32px] shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] border border-slate-100 space-y-8 print-border">
                      {/* Subject Details Header Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pb-6 border-b border-slate-100 text-xs">
                        <div>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Course Level</span>
                          <strong className="text-slate-950 font-bold text-sm block">{selectedSyllabus.gradeLevelName}</strong>
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Subject Stream</span>
                          <strong className="text-slate-950 font-bold text-sm block">{selectedSyllabus.subjectName}</strong>
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Instructor / Teacher</span>
                          <strong className="text-slate-950 font-bold text-sm block">{selectedSyllabus.teacherName}</strong>
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Academic Session</span>
                          <strong className="text-slate-950 font-bold text-sm block">{selectedSyllabus.academicYear}</strong>
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">
                            {t("curriculum.syllabusView.calendarLink")}
                          </span>
                          <strong className="text-slate-950 font-bold text-sm block">
                            {selectedSyllabus.calendarPatternId
                              ? calendar?.name || t("curriculum.syllabusView.calendarLinked")
                              : t("curriculum.syllabusView.calendarNotLinked")}
                          </strong>
                          {syncedFromCalendar ? (
                            <span className="inline-flex mt-1 items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                              <CalendarDays className="w-3 h-3" />
                              {t("curriculum.syllabusView.weightsSynced")}
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Curriculum Alignment</span>
                          <span className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs rounded-lg block text-center truncate">
                            {selectedSyllabus.standardsFramework || "Standard Curriculum"}
                          </span>
                        </div>
                      </div>

                      {/* Core Textbook info if present */}
                      {selectedSyllabus.textbooks && (
                        <div className="text-xs font-semibold p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/55 flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div>
                            <span className="text-xs font-extrabold text-indigo-900 uppercase block mb-0.5 tracking-wider">Required Core Literature / Materials</span>
                            <p className="text-slate-800">{selectedSyllabus.textbooks}</p>
                          </div>
                        </div>
                      )}

                      {/* Inclusion & Differentiation Board Criteria */}
                      {(selectedSyllabus.differentiation || selectedSyllabus.accommodations) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-150/80 rounded-2xl text-xs">
                          {selectedSyllabus.differentiation && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block">Differentiation Methods (Support & Stretch)</span>
                              <p className="text-slate-700 font-medium leading-relaxed">{selectedSyllabus.differentiation}</p>
                            </div>
                          )}
                          {selectedSyllabus.accommodations && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-violet-600 uppercase tracking-wider block">Student Accommodations (IEPs / Access Arrangements)</span>
                              <p className="text-slate-700 font-medium leading-relaxed">{selectedSyllabus.accommodations}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Syllabus Goals */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                          Main Course Learning Objectives
                        </h4>
                        <ul className="space-y-2 text-sm leading-relaxed text-slate-700 font-medium pl-1">
                          {JSON.parse(selectedSyllabus.objectives || "[]").map((obj: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                              <BookMarked className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Syllabus units timetable */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                          Structured Lesson Schedule & Milestones
                        </h4>
                        <div className="border border-slate-100 rounded-2xl overflow-x-auto shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
                          <table className="w-full text-left border-collapse text-xs min-w-[40rem]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                                <th className="px-4 py-3 w-1/5">Time Frame</th>
                                <th className="px-4 py-3 w-1/3">Curriculum Focus Topics</th>
                                <th className="px-4 py-3">Suggested Learning Activities / Tools</th>
                                <th className="px-4 py-3 w-1/5">Unit Assessment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {units.map((unit: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3.5 text-slate-900 font-extrabold">
                                    {periodLabelById(calendar, unit.academicPeriodId) || unit.week}
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-950 font-bold leading-relaxed">{unit.topic}</td>
                                  <td className="px-4 py-3.5 leading-relaxed">{unit.activities || "Classroom lecturing & standard materials"}</td>
                                  <td className="px-4 py-3.5">
                                    <span className="px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-100 font-bold text-xs">{unit.assessment || "N/A"}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Grading Assessment weights visual block */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                          Verified Weighting & Assessment Distribution
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {gradingCriteria.map((item: any, i: number) => (
                            <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-800">{item.label}</span>
                                <span className="font-extrabold text-indigo-600">{item.weight}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${item.weight}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 2. Review audit console (at bottom of view syllabus) */}
                    <div className="bg-slate-100/50 p-6 rounded-[32px] border border-slate-200 space-y-6">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-slate-600" />
                        <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">School Authority Board Verification Panel</h4>
                      </div>
                      
                      {selectedSyllabus.feedback && (
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs leading-relaxed space-y-1">
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Active Review Remarks</span>
                          <p className="text-slate-800 font-medium italic">"{selectedSyllabus.feedback}"</p>
                        </div>
                      )}

                      {canManage ? (
                        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Provide Verification Review Notes / Action Items</label>
                            <textarea 
                              value={syllabusFeedback}
                              onChange={(e) => setSyllabusFeedback(e.target.value)}
                              placeholder={t("curriculum.syllabusView.reviewPlaceholder")}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20 text-xs font-medium"
                            />
                          </div>

                          <div className="flex gap-4">
                            <button 
                              onClick={() => handleUpdateSyllabusStatus(selectedSyllabus.id, "REJECTED", syllabusFeedback)}
                              disabled={submitting}
                              className="flex-1 px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold rounded-lg text-xs transition-colors"
                            >
                              {t("curriculum.syllabusView.reject")}
                            </button>
                            <button 
                              onClick={() => handleUpdateSyllabusStatus(selectedSyllabus.id, "APPROVED", syllabusFeedback)}
                              disabled={submitting}
                              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-colors "
                            >
                              {t("curriculum.syllabusView.approve")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500 bg-white p-4 rounded-xl border border-slate-100 text-center">
                          🔒 Review controls are locked. Only authorized validators (School Admins, Principals, Deans) can modify the verification state.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => onEditSyllabus?.(selectedSyllabus)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t("curriculum.syllabusView.editResubmit")}
                      </button>
                    ) : null}
                    <button 
                      onClick={() => setShowSyllabusViewModal(false)}
                      className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-xs"
                    >
                      {t("common:close")}
                    </button>
                  </div>
                </motion.div>
              </div>
  );
}
