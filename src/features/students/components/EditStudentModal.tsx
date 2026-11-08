import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  cardShell,
} from "../../academics-shared/FeatureModalShell";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import { CheckCircle2, Clock } from "lucide-react";

export type EditStudentModalProps = {
  editStudent?: any;
  gradeLevels?: any[];
  handleUpdate?: (e: React.FormEvent) => void;
  setEditStudent?: (v: any) => void;
  setShowEditModal?: (open: boolean) => void;
  submitting?: boolean;
};

export function EditStudentModal({
  editStudent,
  gradeLevels = [],
  handleUpdate,
  setEditStudent,
  setShowEditModal,
  submitting,
}: EditStudentModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const studentName = editStudent?.name || "";
  const studentEmail = editStudent?.email || "";
  const studentDob = editStudent?.dob || "";
  const studentGender = editStudent?.gender || "MALE";
  const studentGradeLevel = editStudent?.gradeLevelId;
  const studentFeeCohort = editStudent?.feeCohort || "NEW";
  const studentIsActive = editStudent?.isActive;

  return (
    <FeatureModalShell
      eyebrow={t("pages:students.title")}
      title={t("pages:students.editTitle")}
      subtitle={t("pages:students.editSubtitle")}
      onClose={() => setShowEditModal?.(false)}
      wide
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowEditModal?.(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="edit-student-form"
            disabled={submitting}
            className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("common:saving") : t("common:saveChanges")}
          </button>
        </div>
      }
    >
      <form
        id="edit-student-form"
        onSubmit={handleUpdate}
        className="space-y-8"
      >
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <div className="flex items-center gap-3 mb-4">
                <StudentPhotoEditor
                  userId={editStudent?.id}
                  name={studentName}
                  photoUrl={editStudent?.photoUrl}
                  size="xl"
                />
                <div>
                  <h2 className="font-black text-slate-900 truncate">{studentName}</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {studentEmail}
                  </p>
                  {studentGradeLevel && (
                    <p className="text-xs text-slate-400">
                      {t("pages:students.gradeLevel")}: {studentGradeLevel}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {t("common:dateOfBirth")}
                  </label>
                  <input
                    type="date"
                    value={studentDob}
                    onChange={(e) =>
                      setEditStudent?.({ ...editStudent, dob: e.target.value })
                    }
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {t("common:gender")}
                  </label>
                  <select
                    value={studentGender}
                    onChange={(e) =>
                      setEditStudent?.({ ...editStudent, gender: e.target.value })
                    }
                    className={fieldInput}
                  >
                    <option value="MALE">{t("common:male")}</option>
                    <option value="FEMALE">{t("common:female")}</option>
                    <option value="OTHER">{t("common:other")}</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t("pages:students.feeCohort")}
                </label>
                <select
                  value={studentFeeCohort}
                  onChange={(e) =>
                    setEditStudent?.({ ...editStudent, feeCohort: e.target.value })
                  }
                  className={fieldInput}
                >
                  <option value="NEW">{t("pages:students.newStudent")}</option>
                  <option value="RETURNING">{t("pages:students.returningStudent")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="col-span-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {t("common:status")}
              </label>
              <select
                value={studentIsActive ? "true" : "false"}
                onChange={(e) =>
                  setEditStudent?.({
                    ...editStudent,
                    isActive: e.target.value === "true",
                  })
                }
                className={fieldInput}
              >
                <option value="true">{t("common:active")}</option>
                <option value="false">{t("common:inactive")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {t("pages:students.parentName")}
              </label>
              <input
                type="text"
                value={editStudent?.parentName || ""}
                onChange={(e) =>
                  setEditStudent?.({
                    ...editStudent,
                    parentName: e.target.value,
                  })
                }
                className={fieldInput}
              />
            </div>
          </div>

          <div className="col-span-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {t("pages:students.parentPhone")}
              </label>
              <input
                type="tel"
                value={editStudent?.parentPhone || ""}
                onChange={(e) =>
                  setEditStudent?.({
                    ...editStudent,
                    parentPhone: e.target.value,
                  })
                }
                className={fieldInput}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {t("common:gradeLevel")}
              </label>
              <select
                value={studentGradeLevel || ""}
                onChange={(e) =>
                  setEditStudent?.({
                    ...editStudent,
                    gradeLevelId: e.target.value,
                  })
                }
                className={fieldInput}
              >
                <option value="">{t("pages:students.selectGradeLevel")}</option>
                {gradeLevels.map((gl: any) => (
                  <option key={gl.id} value={gl.id}>
                    {gl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>
    </FeatureModalShell>
  );
}