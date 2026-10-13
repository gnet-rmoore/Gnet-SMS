import React from "react";
import {
  UserCheck,
  X,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export type AddRecordModalProps = {
  addForm?: any;
  addStep?: any;
  handleAddStudent?: any;
  school?: any;
  setAddForm?: any;
  setAddStep?: any;
  setIsAddOpen?: any;
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines 982-1210. */
export function AddRecordModal({
  addForm,
  addStep,
  handleAddStudent,
  school,
  setAddForm,
  setAddStep,
  setIsAddOpen,
}: AddRecordModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const a = (key: string, opts?: Record<string, unknown>) =>
    t(`studentRecords.addModal.${key}`, opts);

  return (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{a("titleAlt")}</h3>
                        <p className="text-xs text-slate-500 font-medium">{a("stepOf", { step: addStep })}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAddOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Progress Steps Indicator */}
                  <div className="flex border-b border-slate-50">
                    <div className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      addStep === 1 ? "border-indigo-600 text-indigo-600 bg-indigo-50/10" : "border-transparent text-slate-400"
                    }`}>
                      {a("step1Label")}
                    </div>
                    <div className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      addStep === 2 ? "border-indigo-600 text-indigo-600 bg-indigo-50/10" : "border-transparent text-slate-400"
                    }`}>
                      {a("step2Label")}
                    </div>
                  </div>

                  <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                    {addStep === 1 ? (
                      /* STEP 1 FORM FIELDS */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("fullName")}</label>
                            <input 
                              type="text" 
                              required
                              placeholder={a("fullNamePlaceholder")}
                              value={addForm.name} 
                              onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("email")}</label>
                            <input 
                              type="email" 
                              required
                              placeholder={a("emailPlaceholder")}
                              value={addForm.email} 
                              onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("phone")}</label>
                            <input 
                              type="text" 
                              placeholder={a("phonePlaceholder")}
                              value={addForm.phone} 
                              onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("standing")}</label>
                            <select 
                              value={addForm.standing} 
                              onChange={(e) => setAddForm({...addForm, standing: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold bg-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="In Good Standing">{t("studentRecords.standing.good")}</option>
                              <option value="Academic Warning">{t("studentRecords.standing.warning")}</option>
                              <option value="Suspended">{t("studentRecords.standing.suspended")}</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">{a("address")}</label>
                          <input 
                            type="text" 
                            placeholder={a("addressPlaceholder")}
                            value={addForm.address} 
                            onChange={(e) => setAddForm({...addForm, address: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ) : (
                      /* STEP 2 FORM FIELDS */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("guardianName")}</label>
                            <input 
                              type="text" 
                              placeholder={a("guardianNamePlaceholder")}
                              value={addForm.parentName} 
                              onChange={(e) => setAddForm({...addForm, parentName: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("guardianTelephone")}</label>
                            <input 
                              type="text" 
                              placeholder={a("guardianPhonePlaceholder")}
                              value={addForm.parentPhone} 
                              onChange={(e) => setAddForm({...addForm, parentPhone: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("guardianEmail")}</label>
                            <input 
                              type="email" 
                              placeholder="sarah.doe@parent.com"
                              value={addForm.parentEmail} 
                              onChange={(e) => setAddForm({...addForm, parentEmail: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">{a("bloodGroup")}</label>
                            <select 
                              value={addForm.bloodType} 
                              onChange={(e) => setAddForm({...addForm, bloodType: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold bg-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="A+">A+</option>
                              <option value="B+">B+</option>
                              <option value="O+">O+</option>
                              <option value="AB+">AB+</option>
                              <option value="A-">A-</option>
                              <option value="B-">B-</option>
                              <option value="O-">O-</option>
                              <option value="AB-">AB-</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">{a("allergiesSafety")}</label>
                          <input 
                            type="text" 
                            placeholder={a("allergiesSafetyPlaceholder")}
                            value={addForm.allergies} 
                            onChange={(e) => setAddForm({...addForm, allergies: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">{a("registrarComments")}</label>
                          <textarea 
                            rows={2}
                            placeholder={a("registrarCommentsPlaceholder")}
                            value={addForm.notes} 
                            onChange={(e) => setAddForm({...addForm, notes: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons for Form */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 bg-slate-50/20 p-4 -mx-6 -mb-6 mt-6">
                      {addStep === 1 ? (
                        <>
                          <button 
                            type="button"
                            onClick={() => setIsAddOpen(false)}
                            className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                          >
                            {a("cancel")}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setAddStep(2)}
                            disabled={!addForm.name || !addForm.email}
                            className="px-6 py-2.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5"
                          >
                            {a("nextParentMedical")}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            type="button"
                            onClick={() => setAddStep(1)}
                            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                          >
                            {a("back")}
                          </button>
                          <button 
                            type="submit"
                            className="px-7 py-3 text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center gap-1.5"
                          >
                            <UserCheck className="w-4.5 h-4.5" />
                            {a("finalizeRegister")}
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </motion.div>
              </div>
  );
}
