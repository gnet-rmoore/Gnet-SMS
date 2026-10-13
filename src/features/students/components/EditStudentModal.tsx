import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";

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
            className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("common:saving") : t("common:saveChanges")}
          </button>
        </div>
      }
    >
      <form
        id="edit-student-form"
        onSubmit={handleUpdate}
        className="p-6 sm:p-8 space-y-6"
      >
        {editStudent.id ? (
          <div className="flex justify-center pb-2">
            <StudentPhotoEditor
              userId={editStudent.id}
              name={editStudent.name}
              photoUrl={editStudent.photoUrl}
              size="lg"
              onPhotoChange={(photoUrl) =>
                setEditStudent?.({ ...editStudent, photoUrl })
              }
            />
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:fullName")}</label>
            <input
              type="text"
              value={editStudent.name}
              onChange={(e) =>
                setEditStudent?.({ ...editStudent, name: e.target.value })
              }
              className={fieldInput}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:email")}</label>
            <input
              type="email"
              value={editStudent.email}
              onChange={(e) =>
                setEditStudent?.({ ...editStudent, email: e.target.value })
              }
              className={fieldInput}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:dateOfBirth")}</label>
            <input
              type="date"
              value={editStudent.dob}
              onChange={(e) =>
                setEditStudent?.({ ...editStudent, dob: e.target.value })
              }
              className={fieldInput}
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:gender")}</label>
            <select
              value={editStudent.gender}
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
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:gradeLevel")}</label>
            <select
              value={editStudent.gradeLevelId || ""}
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
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("pages:students.feeCohort")}</label>
            <select
              value={editStudent.feeCohort || "NEW"}
              onChange={(e) =>
                setEditStudent?.({
                  ...editStudent,
                  feeCohort: e.target.value,
                })
              }
              className={fieldInput}
            >
              <option value="NEW">{t("pages:students.newStudent")}</option>
              <option value="RETURNING">{t("pages:students.returningStudent")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>{t("common:status")}</label>
            <select
              value={editStudent.isActive ? "true" : "false"}
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

        <div className="pt-2 border-t border-slate-100 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("pages:students.parentGuardian")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("pages:students.parentName")}</label>
              <input
                type="text"
                value={editStudent.parentName || ""}
                onChange={(e) =>
                  setEditStudent?.({
                    ...editStudent,
                    parentName: e.target.value,
                  })
                }
                className={fieldInput}
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel}>{t("pages:students.parentPhone")}</label>
              <input
                type="tel"
                value={editStudent.parentPhone || ""}
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
      </form>
    </FeatureModalShell>
  );
}
