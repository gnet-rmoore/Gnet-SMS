import React from "react";
import { useTranslation } from "react-i18next";
import { fieldInput, fieldLabel, fieldSelect } from "../../academics-shared/FeatureModalShell";
import { buildGradeOptions } from "../../academics-shared/gradeSubjectLabels";
import { Button, DetailDrawerShell } from "../../../components/ui";
import { StudentPhotoEditor } from "../../../components/StudentPhotoEditor";

export type EditStudentModalProps = {
  open?: boolean;
  editStudent?: any;
  gradeLevels?: any[];
  gradeLevelsLoading?: boolean;
  canEdit?: boolean;
  canEditStatus?: boolean;
  handleUpdate?: (e: React.FormEvent) => void;
  setEditStudent?: React.Dispatch<React.SetStateAction<any>>;
  setShowEditModal?: (open: boolean) => void;
  submitting?: boolean;
  onPhotoChange?: (photoUrl: string | null) => void;
};

export function EditStudentModal({
  open = false,
  editStudent,
  gradeLevels = [],
  gradeLevelsLoading = false,
  canEdit = false,
  canEditStatus = false,
  handleUpdate,
  setEditStudent,
  setShowEditModal,
  submitting = false,
  onPhotoChange,
}: EditStudentModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const gradeOptions = React.useMemo(
    () => buildGradeOptions(gradeLevels, [editStudent?.gradeLevelId]),
    [gradeLevels, editStudent?.gradeLevelId]
  );
  const sectionClass =
    "border-b border-slate-100 pb-3 text-sm font-extrabold tracking-tight text-slate-900";
  const controlClass = `${fieldInput} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`;
  const selectClass = `${fieldSelect} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`;

  const studentName = editStudent?.name || "";
  const studentEmail = editStudent?.email || "";
  const studentDob = editStudent?.dob || "";
  const studentGender = editStudent?.gender || "MALE";
  const studentGradeLevel = editStudent?.gradeLevelId || "";
  const studentFeeCohort = editStudent?.feeCohort || "NEW";
  const studentIsActive = Boolean(editStudent?.isActive);
  const statusEditable = canEdit && canEditStatus;

  const update = (field: string, value: unknown) =>
    setEditStudent?.((current: any) => ({ ...(current || {}), [field]: value }));
  const close = () => setShowEditModal?.(false);

  return (
    <DetailDrawerShell
      open={open}
      onClose={close}
      eyebrow={t("pages:students.directory")}
      title={t("pages:students.editTitle")}
      subtitle={t("pages:students.editSubtitle")}
      badge={
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            studentIsActive
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {studentIsActive ? t("common:active") : t("common:inactive")}
        </span>
      }
      headerLead={
        editStudent?.id ? (
          <StudentPhotoEditor
            userId={String(editStudent.id)}
            name={studentName}
            photoUrl={editStudent.photoUrl}
            size="lg"
            variant="dark"
            presentation="overlay"
            canEdit={canEdit}
            onPhotoChange={onPhotoChange}
            className="shrink-0"
          />
        ) : null
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close}>
            {t("common:cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-student-form"
            variant="primary"
            disabled={submitting || !canEdit}
          >
            {submitting ? t("common:saving") : t("common:saveChanges")}
          </Button>
        </div>
      }
    >
      <form id="edit-student-form" onSubmit={handleUpdate} className="space-y-8">
        <section aria-labelledby="edit-student-identity" className="space-y-4">
          <h3 id="edit-student-identity" className={sectionClass}>
            {t("profile.personalInfo")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-name">
                {t("admissions.editStudent.studentName")}
              </label>
              <input
                id="edit-student-name"
                type="text"
                value={studentName}
                onChange={(e) => update("name", e.target.value)}
                className={controlClass}
                autoComplete="name"
                disabled={!canEdit}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-email">
                {t("admissions.editStudent.emailAddress")}
              </label>
              <input
                id="edit-student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => update("email", e.target.value)}
                className={controlClass}
                autoComplete="email"
                disabled={!canEdit}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-dob">
                {t("admissions.editStudent.dateOfBirth")}
              </label>
              <input
                id="edit-student-dob"
                type="date"
                value={studentDob}
                onChange={(e) => update("dob", e.target.value)}
                className={controlClass}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-gender">
                {t("admissions.editStudent.gender")}
              </label>
              <select
                id="edit-student-gender"
                value={studentGender}
                onChange={(e) => update("gender", e.target.value)}
                className={selectClass}
                disabled={!canEdit}
              >
                <option value="MALE">{t("common:male")}</option>
                <option value="FEMALE">{t("common:female")}</option>
                <option value="OTHER">{t("common:other")}</option>
              </select>
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-student-contact" className="space-y-4">
          <h3 id="edit-student-contact" className={sectionClass}>
            {t("profile.contactInfo")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-phone">
                {t("common:phone")}
              </label>
              <input
                id="edit-student-phone"
                type="tel"
                value={editStudent?.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                className={controlClass}
                autoComplete="tel"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className={fieldLabel} htmlFor="edit-student-address">
                {t("common:address")}
              </label>
              <input
                id="edit-student-address"
                type="text"
                value={editStudent?.address || ""}
                onChange={(e) => update("address", e.target.value)}
                className={controlClass}
                autoComplete="street-address"
                disabled={!canEdit}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-student-guardian" className="space-y-4">
          <h3 id="edit-student-guardian" className={sectionClass}>
            {t("admissions.editStudent.guardianSection")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-parent-name">
                {t("pages:students.parentName")}
              </label>
              <input
                id="edit-student-parent-name"
                type="text"
                value={editStudent?.parentName || ""}
                onChange={(e) => update("parentName", e.target.value)}
                className={controlClass}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-parent-phone">
                {t("pages:students.parentPhone")}
              </label>
              <input
                id="edit-student-parent-phone"
                type="tel"
                value={editStudent?.parentPhone || ""}
                onChange={(e) => update("parentPhone", e.target.value)}
                className={controlClass}
                disabled={!canEdit}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="edit-student-placement" className="space-y-4">
          <h3 id="edit-student-placement" className={sectionClass}>
            {t("admissions.editStudent.gradeAssignment")}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-grade">
                {t("common:gradeLevel")}
              </label>
              <select
                id="edit-student-grade"
                value={studentGradeLevel}
                onChange={(e) => update("gradeLevelId", e.target.value)}
                className={selectClass}
                disabled={!canEdit || gradeLevelsLoading}
              >
                <option value="">
                  {gradeLevelsLoading
                    ? t("common:loading")
                    : t("admissions.editStudent.unassigned")}
                </option>
                {gradeOptions.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="edit-student-fee-cohort">
                {t("pages:students.feeCohort")}
              </label>
              <select
                id="edit-student-fee-cohort"
                value={studentFeeCohort}
                onChange={(e) => update("feeCohort", e.target.value)}
                className={selectClass}
                disabled={!canEdit}
              >
                <option value="NEW">{t("pages:students.newStudent")}</option>
                <option value="RETURNING">{t("pages:students.returningStudent")}</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className={fieldLabel} htmlFor="edit-student-status">
                {t("admissions.editStudent.accountStatus")}
              </label>
              <select
                id="edit-student-status"
                value={studentIsActive ? "true" : "false"}
                onChange={(e) => update("isActive", e.target.value === "true")}
                className={selectClass}
                disabled={!statusEditable}
              >
                <option value="true">{t("admissions.editStudent.activeEnrollment")}</option>
                <option value="false">{t("admissions.editStudent.inactiveSuspended")}</option>
              </select>
            </div>
          </div>
        </section>
      </form>
    </DetailDrawerShell>
  );
}
