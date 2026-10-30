import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
  fieldSelect,
} from "../../academics-shared/FeatureModalShell";

export type EditStudentModalProps = {
  gradeLevels?: unknown;
  gradeLevelsLoading?: boolean;
  handleSaveStudent?: (e: React.FormEvent<HTMLFormElement>) => void;
  setShowEditStudentModal?: (show: boolean) => void;
  setStudentFormData?: (data: any) => void;
  studentFormData?: any;
  submitting?: boolean;
};

export function EditStudentModal({
  gradeLevels,
  gradeLevelsLoading = false,
  handleSaveStudent,
  setShowEditStudentModal,
  setStudentFormData,
  studentFormData = {},
  submitting = false,
}: EditStudentModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const grades = Array.isArray(gradeLevels) ? gradeLevels : [];
  const updateField = (field: string, value: unknown) =>
    setStudentFormData?.({ ...studentFormData, [field]: value });
  const close = () => setShowEditStudentModal?.(false);

  return (
    <FeatureModalShell
      title={t("admissions.editStudent.title")}
      subtitle={t("admissions.editStudent.subtitle")}
      eyebrow={t("admissions.eyebrow")}
      onClose={close}
      wide
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            {t("common:cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-registrar-student-form"
            variant="primary"
            disabled={
              submitting ||
              !String(studentFormData.name || "").trim() ||
              !String(studentFormData.email || "").trim()
            }
          >
            {submitting
              ? t("admissions.editStudent.saving")
              : t("admissions.editStudent.applyChanges")}
          </Button>
        </div>
      }
    >
      <form
        id="edit-registrar-student-form"
        onSubmit={handleSaveStudent}
        className="space-y-6 p-4 sm:p-6 md:p-8"
      >
        <section aria-labelledby="edit-student-identity" className="space-y-4">
          <h3
            id="edit-student-identity"
            className="border-b border-slate-100 pb-2 text-sm font-extrabold tracking-tight text-slate-900"
          >
            {t("profile.personalInfo")}
          </h3>
          {studentFormData.id ? (
            <div className="flex justify-center">
              <StudentPhotoEditor
                userId={studentFormData.id}
                name={studentFormData.name}
                photoUrl={studentFormData.photoUrl}
                size="lg"
                onPhotoChange={(photoUrl) => updateField("photoUrl", photoUrl)}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={fieldLabel} htmlFor="edit-student-name">
                {t("admissions.editStudent.studentName")}
              </label>
              <input
                id="edit-student-name"
                type="text"
                value={studentFormData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={fieldInput}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-1">
              <label className={fieldLabel} htmlFor="edit-student-dob">
                {t("admissions.editStudent.dateOfBirth")}
              </label>
              <input
                id="edit-student-dob"
                type="date"
                value={studentFormData.dob || ""}
                onChange={(e) => updateField("dob", e.target.value)}
                className={fieldInput}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className={fieldLabel} htmlFor="edit-student-gender">
                {t("admissions.editStudent.gender")}
              </label>
              <select
                id="edit-student-gender"
                value={studentFormData.gender || "MALE"}
                onChange={(e) => updateField("gender", e.target.value)}
                className={fieldSelect}
              >
                <option value="MALE">{t("common:male")}</option>
                <option value="FEMALE">{t("common:female")}</option>
                <option value="OTHER">{t("common:other")}</option>
              </select>
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-student-contact" className="space-y-4">
          <h3
            id="edit-student-contact"
            className="border-b border-slate-100 pb-2 text-sm font-extrabold tracking-tight text-slate-900"
          >
            {t("profile.contactInfo")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={fieldLabel} htmlFor="edit-student-email">
                {t("admissions.editStudent.emailAddress")}
              </label>
              <input
                id="edit-student-email"
                type="email"
                value={studentFormData.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className={fieldInput}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1">
              <label className={fieldLabel} htmlFor="edit-student-phone">
                {t("admissions.editStudent.mobilePhone")}
              </label>
              <input
                id="edit-student-phone"
                type="tel"
                value={studentFormData.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className={fieldInput}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className={fieldLabel} htmlFor="edit-student-address">
                {t("admissions.editStudent.residentialAddress")}
              </label>
              <input
                id="edit-student-address"
                type="text"
                value={studentFormData.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                className={fieldInput}
                autoComplete="street-address"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("admissions.editStudent.guardianSection")}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className={fieldLabel} htmlFor="edit-student-guardian-name">
                  {t("admissions.editStudent.guardianName")}
                </label>
                <input
                  id="edit-student-guardian-name"
                  type="text"
                  value={studentFormData.parentName || ""}
                  onChange={(e) => updateField("parentName", e.target.value)}
                  className={fieldInput}
                />
              </div>
              <div className="space-y-1">
                <label className={fieldLabel} htmlFor="edit-student-guardian-phone">
                  {t("admissions.editStudent.guardianPhone")}
                </label>
                <input
                  id="edit-student-guardian-phone"
                  type="tel"
                  value={studentFormData.parentPhone || ""}
                  onChange={(e) => updateField("parentPhone", e.target.value)}
                  className={fieldInput}
                />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-student-placement" className="space-y-4">
          <h3
            id="edit-student-placement"
            className="border-b border-slate-100 pb-2 text-sm font-extrabold tracking-tight text-slate-900"
          >
            {t("admissions.editStudent.gradeAssignment")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={fieldLabel} htmlFor="edit-student-grade">
                {t("common:gradeLevel")}
              </label>
              <select
                id="edit-student-grade"
                value={studentFormData.gradeLevelId || ""}
                onChange={(e) => updateField("gradeLevelId", e.target.value)}
                className={fieldSelect}
                disabled={gradeLevelsLoading}
              >
                <option value="">
                  {gradeLevelsLoading
                    ? t("common:loading")
                    : t("admissions.editStudent.unassigned")}
                </option>
                {grades.map((grade: any) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={fieldLabel} htmlFor="edit-student-status">
                {t("admissions.editStudent.accountStatus")}
              </label>
              <select
                id="edit-student-status"
                value={studentFormData.isActive ? "true" : "false"}
                onChange={(e) => updateField("isActive", e.target.value === "true")}
                className={fieldSelect}
              >
                <option value="true">{t("admissions.editStudent.activeEnrollment")}</option>
                <option value="false">{t("admissions.editStudent.inactiveSuspended")}</option>
              </select>
            </div>
          </div>
        </section>
      </form>
    </FeatureModalShell>
  );
}
