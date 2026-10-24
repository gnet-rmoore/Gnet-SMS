import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { buildSectionSubjectCode } from "../../academics-shared/sectionSubjectCode";

export type SubjectModalProps = {
  addSubjectClassTeachers?: any;
  classrooms?: any;
  gradeLevels?: any;
  handleCreateSubject?: any;
  handleNameChange?: any;
  setAddSubjectClassTeachers?: any;
  setManuallyEditedCode?: any;
  setShowSubjectModal?: any;
  setSubjectForm?: any;
  setSubjectGradeLevelId?: any;
  subjectForm?: any;
  subjectGradeLevelId?: any;
  submitting?: any;
  teachers?: any;
  [key: string]: any;
};

export function SubjectModal({
  addSubjectClassTeachers,
  classrooms,
  gradeLevels,
  handleCreateSubject,
  handleNameChange,
  setAddSubjectClassTeachers,
  setManuallyEditedCode,
  setShowSubjectModal,
  setSubjectForm,
  setSubjectGradeLevelId,
  subjectForm,
  subjectGradeLevelId,
  submitting,
  teachers,
}: SubjectModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  const close = () => {
    setShowSubjectModal(false);
    setSubjectForm({ name: "", code: "", description: "" });
    setSubjectGradeLevelId("");
    setManuallyEditedCode(false);
  };

  const gradeClassGroups = classrooms.filter(
    (c: any) => c.gradeLevelId === subjectGradeLevelId && !c.subjectId
  );

  return (
    <FeatureModalShell
      eyebrow={t("curriculum.eyebrow")}
      title={t("curriculum.subjectModal.title")}
      subtitle={t("curriculum.subjectModal.subtitle")}
      onClose={close}
    >
      <form id="subject-modal-form" onSubmit={handleCreateSubject} className="p-8 space-y-5">
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("curriculum.subjectModal.subjectName")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={subjectForm.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t("curriculum.subjectModal.namePlaceholder")}
            className={fieldInput}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("curriculum.subjectModal.subjectCode")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={subjectForm.code}
            onChange={(e) => {
              setManuallyEditedCode(true);
              setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() });
            }}
            placeholder={t("curriculum.subjectModal.codePlaceholder")}
            className={fieldInput}
            required
          />
          <p className="text-xs text-slate-500 font-medium">{t("curriculum.subjectModal.codeHint")}</p>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("curriculum.subjectModal.assignGrade")}</label>
          <select
            value={subjectGradeLevelId}
            onChange={(e) => setSubjectGradeLevelId(e.target.value)}
            className={fieldInput}
          >
            <option value="">{t("curriculum.subjectModal.doNotAssign")}</option>
            {gradeLevels.map((gl: any) => (
              <option key={gl.id} value={gl.id}>
                {gl.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 font-medium">{t("curriculum.subjectModal.assignGradeHint")}</p>
        </div>

        {subjectGradeLevelId && (
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 max-h-60 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("curriculum.subjectModal.syncNow")}
            </p>
            <p className="text-xs text-slate-500 font-medium">{t("curriculum.subjectModal.syncNowHint")}</p>

            {gradeClassGroups.length === 0 ? (
              <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                {t("curriculum.subjectModal.noClassGroupsForGrade")}
              </p>
            ) : (
              <div className="space-y-2">
                {gradeClassGroups.map((classGroup: any) => {
                  const sectionCode =
                    subjectForm.code && classGroup.name
                      ? buildSectionSubjectCode(subjectForm.code, classGroup.name)
                      : "";
                  return (
                    <div
                      key={classGroup.id}
                      className="bg-white p-3 rounded-xl border border-slate-100 space-y-2"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">
                          {classGroup.name} - {subjectForm.name || t("curriculum.subjectModal.subjectName")}
                        </span>
                        {sectionCode ? (
                          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                            {sectionCode}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          {t("curriculum.subjectModal.assignedTeacher")}
                        </span>
                        <select
                          value={addSubjectClassTeachers[classGroup.id] || ""}
                          onChange={(e) =>
                            setAddSubjectClassTeachers({
                              ...addSubjectClassTeachers,
                              [classGroup.id]: e.target.value,
                            })
                          }
                          className={`${fieldInput} py-2 text-xs`}
                          required
                        >
                          <option value="">{t("curriculum.subjectModal.selectTeacher")}</option>
                          {teachers.map((te: any) => (
                            <option key={te.id} value={te.id}>
                              {te.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("common:description")}</label>
          <textarea
            value={subjectForm.description}
            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
            placeholder={t("curriculum.subjectModal.descriptionPlaceholder")}
            className={`${fieldInput} resize-none h-24 font-medium`}
          />
          <p className="text-xs text-slate-500 font-medium">
            {t("curriculum.subjectModal.descriptionHint", { defaultValue: "Optional — add a short description to help others understand this subject." })}
          </p>
        </div>
      </form>

      <div className="px-8 pb-8 flex gap-3">
        <button
          type="button"
          onClick={close}
          className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          {t("common:cancel")}
        </button>
        <button
          type="submit"
          form="subject-modal-form"
          disabled={submitting}
          className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? t("curriculum.subjectModal.adding") : t("curriculum.header.addSubject")}
        </button>
      </div>
    </FeatureModalShell>
  );
}
