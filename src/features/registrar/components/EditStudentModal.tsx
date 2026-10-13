import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "../../../components/ui";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";

export type EditStudentModalProps = {
  gradeLevels?: any;
  handleSaveStudent?: any;
  setShowEditStudentModal?: any;
  setStudentFormData?: any;
  studentFormData?: any;
  submitting?: any;
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines 2149-2294. */
export function EditStudentModal({
  gradeLevels,
  handleSaveStudent,
  setShowEditStudentModal,
  setStudentFormData,
  studentFormData,
  submitting,
}: EditStudentModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditStudentModal(false)} />
              <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white flex-shrink-0">
                  <div>
                    <h3 className="font-extrabold text-lg">{t("admissions.editStudent.title")}</h3>
                    <p className="text-xs text-indigo-100">{t("admissions.editStudent.subtitle")}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEditStudentModal(false)}
                    className="text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSaveStudent} className="p-6 space-y-6 overflow-y-auto flex-1">
                  {studentFormData.id ? (
                    <div className="flex justify-center pb-2">
                      <StudentPhotoEditor
                        userId={studentFormData.id}
                        name={studentFormData.name}
                        photoUrl={studentFormData.photoUrl}
                        size="lg"
                        onPhotoChange={(photoUrl) =>
                          setStudentFormData({ ...studentFormData, photoUrl })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.studentName")}</label>
                      <input 
                        type="text" 
                        value={studentFormData.name} 
                        onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.emailAddress")}</label>
                      <input 
                        type="email" 
                        value={studentFormData.email} 
                        onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.mobilePhone")}</label>
                      <input 
                        type="text" 
                        value={studentFormData.phone} 
                        onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.dateOfBirth")}</label>
                      <input 
                        type="date" 
                        value={studentFormData.dob} 
                        onChange={(e) => setStudentFormData({ ...studentFormData, dob: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.gender")}</label>
                      <select 
                        value={studentFormData.gender} 
                        onChange={(e) => setStudentFormData({ ...studentFormData, gender: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      >
                        <option value="MALE">{t("common:male")}</option>
                        <option value="FEMALE">{t("common:female")}</option>
                        <option value="OTHER">{t("common:other")}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.gradeAssignment")}</label>
                      <select 
                        value={studentFormData.gradeLevelId} 
                        onChange={(e) => setStudentFormData({ ...studentFormData, gradeLevelId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      >
                        <option value="">{t("admissions.editStudent.unassigned")}</option>
                        {gradeLevels.map(gl => (
                          <option key={gl.id} value={gl.id}>{gl.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.residentialAddress")}</label>
                    <input 
                      type="text" 
                      value={studentFormData.address} 
                      onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                    <p className="text-xs font-black uppercase text-indigo-600 tracking-wider">{t("admissions.editStudent.guardianSection")}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.guardianName")}</label>
                        <input 
                          type="text" 
                          value={studentFormData.parentName} 
                          onChange={(e) => setStudentFormData({ ...studentFormData, parentName: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.guardianPhone")}</label>
                        <input 
                          type="text" 
                          value={studentFormData.parentPhone} 
                          onChange={(e) => setStudentFormData({ ...studentFormData, parentPhone: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("admissions.editStudent.accountStatus")}</label>
                    <select 
                      value={studentFormData.isActive ? "true" : "false"} 
                      onChange={(e) => setStudentFormData({ ...studentFormData, isActive: e.target.value === "true" })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    >
                      <option value="true">{t("admissions.editStudent.activeEnrollment")}</option>
                      <option value="false">{t("admissions.editStudent.inactiveSuspended")}</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowEditStudentModal(false)}
                      className="text-xs"
                    >
                      {t("common:cancel")}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submitting}
                      className="text-xs shadow-md shadow-indigo-100"
                    >
                      {submitting ? t("admissions.editStudent.saving") : t("admissions.editStudent.applyChanges")}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
  );
}
