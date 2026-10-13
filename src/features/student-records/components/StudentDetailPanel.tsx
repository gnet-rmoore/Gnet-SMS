import React from "react";
import { Edit, Trash2, X, Save, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Button, SMS_SHADOW_SURFACE } from "../../../components/ui";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import { PageToast, usePageToast } from "../../academics-shared/PageToast";
import {
  StudentProfileView,
  type StudentProfileStudent,
} from "../../students/components/StudentProfileView";

export type StudentDetailPanelProps = {
  editForm?: Record<string, string>;
  handleDeleteStudent?: (id: string) => void;
  handleUpdateStudent?: () => void;
  isEditMode?: boolean;
  selectedStudent?: StudentProfileStudent | null;
  setEditForm?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setIsEditMode?: (v: boolean) => void;
  setSelectedStudent?: (v: StudentProfileStudent | null) => void;
};

export function StudentDetailPanel({
  editForm = {},
  handleDeleteStudent,
  handleUpdateStudent,
  isEditMode = false,
  selectedStudent,
  setEditForm,
  setIsEditMode,
  setSelectedStudent,
}: StudentDetailPanelProps) {
  const { t } = useTranslation(["pages", "common"]);
  const { toast, showToast } = usePageToast();
  const d = (key: string, opts?: Record<string, unknown>) =>
    t(`studentRecords.detail.${key}`, opts);

  if (!selectedStudent?.id) return null;

  const standingLabel = (standing?: string | null) => {
    if (standing === "In Good Standing") return t("studentRecords.standing.good");
    if (standing === "Academic Warning") return t("studentRecords.standing.warning");
    if (standing === "Suspended") return t("studentRecords.standing.suspended");
    return standing || t("studentRecords.standing.good");
  };

  const patchStudent = (patch: Partial<StudentProfileStudent>) => {
    setSelectedStudent?.({ ...selectedStudent, ...patch });
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <PageToast toast={toast} />
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedStudent?.(null)} />

      <motion.div
        initial={{ x: "100%", opacity: 0.95 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.95 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className={`relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex-shrink-0 border-b border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <StudentPhotoEditor
                userId={selectedStudent.id}
                name={isEditMode ? editForm.name : selectedStudent.name}
                photoUrl={selectedStudent.photoUrl}
                variant="dark"
                size="lg"
                onPhotoChange={(photoUrl) => patchStudent({ photoUrl })}
                onSuccess={(msg) => showToast(msg, "success")}
                onError={(msg) => showToast(msg, "error")}
              />
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-xl font-extrabold tracking-tight">
                  {selectedStudent.name}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {d("dossierId")}{" "}
                  <span className="font-mono font-bold text-slate-200">
                    #{selectedStudent.id.slice(0, 8).toUpperCase()}
                  </span>
                </p>
                <span
                  className={`mt-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    selectedStudent.isActive !== false
                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border border-rose-500/30 bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {selectedStudent.isActive !== false
                    ? t("studentProfile.active")
                    : t("studentProfile.inactive")}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode?.(!isEditMode)}
                className={
                  isEditMode
                    ? "border border-amber-400/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                }
                title={isEditMode ? d("cancelEditing") : d("editProfile")}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteStudent?.(selectedStudent.id)}
                className="border border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300"
                title={d("deleteRecord")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedStudent?.(null)}
                className="border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {isEditMode ? (
            <div className={`space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 ${SMS_SHADOW_SURFACE}`}>
              <div className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-xs font-semibold text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{d("editWarning")}</span>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {d("demographicInfo")}
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{d("studentName")}</label>
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm?.((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{d("officialEmail")}</label>
                    <input
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) =>
                        setEditForm?.((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{d("phoneContact")}</label>
                    <input
                      type="text"
                      value={editForm.phone || ""}
                      onChange={(e) =>
                        setEditForm?.((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{d("bloodType")}</label>
                    <select
                      value={editForm.bloodType || "O+"}
                      onChange={(e) =>
                        setEditForm?.((prev) => ({ ...prev, bloodType: e.target.value }))
                      }
                      className={fieldClass}
                    >
                      {["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{d("homeAddress")}</label>
                  <input
                    type="text"
                    value={editForm.address || ""}
                    onChange={(e) =>
                      setEditForm?.((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{d("academicStanding")}</label>
                  <select
                    value={editForm.standing || "In Good Standing"}
                    onChange={(e) =>
                      setEditForm?.((prev) => ({ ...prev, standing: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    <option value="In Good Standing">{t("studentRecords.standing.good")}</option>
                    <option value="Academic Warning">{t("studentRecords.standing.warning")}</option>
                    <option value="Suspended">{t("studentRecords.standing.suspended")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {d("parentEmergency")}
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{d("guardianName")}</label>
                    <input
                      type="text"
                      value={editForm.parentName || ""}
                      onChange={(e) =>
                        setEditForm?.((prev) => ({ ...prev, parentName: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{d("guardianPhone")}</label>
                    <input
                      type="text"
                      value={editForm.parentPhone || ""}
                      onChange={(e) =>
                        setEditForm?.((prev) => ({ ...prev, parentPhone: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{d("guardianEmail")}</label>
                  <input
                    type="email"
                    value={editForm.parentEmail || ""}
                    onChange={(e) =>
                      setEditForm?.((prev) => ({ ...prev, parentEmail: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {d("medicalNotes")}
                </h4>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{d("allergiesConstraints")}</label>
                  <input
                    type="text"
                    value={editForm.allergies || ""}
                    onChange={(e) =>
                      setEditForm?.((prev) => ({ ...prev, allergies: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">{d("registrarNotes")}</label>
                  <textarea
                    rows={3}
                    value={editForm.notes || ""}
                    onChange={(e) =>
                      setEditForm?.((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          ) : (
            <StudentProfileView
              student={selectedStudent}
              standingLabel={standingLabel(selectedStudent.standing)}
              showHealth
              showNotes
            />
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white p-5">
          {isEditMode ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setIsEditMode?.(false)}>
                {d("cancelEdit")}
              </Button>
              <Button type="button" variant="primary" onClick={handleUpdateStudent}>
                <Save className="mr-1.5 h-4 w-4" />
                {d("saveRecord")}
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-slate-500">{d("attestedDossier")}</span>
              <Button type="button" variant="secondary" onClick={() => setSelectedStudent?.(null)}>
                {d("closeDossier")}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
