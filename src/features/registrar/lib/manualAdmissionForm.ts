/**
 * Direct Admission form = shared admission fields + staff-only existing-student picker.
 */
import {
  emptyAdmissionApplicationForm,
  studentToAdmissionApplicationForm,
  type AdmissionApplicationForm,
} from "../../admission-form";

export type ManualAdmissionForm = AdmissionApplicationForm & {
  existingStudentId: string;
};

export function emptyManualAdmissionForm(): ManualAdmissionForm {
  return {
    ...emptyAdmissionApplicationForm(),
    existingStudentId: "",
  };
}

export {
  splitPersonName,
  formatDobForInput,
  composeStudentName,
  toggleFamilyInformation,
  buildAdmissionApiPayload,
} from "../../admission-form";

export function studentToManualAdmissionForm(
  student: any,
  base: ManualAdmissionForm = emptyManualAdmissionForm()
): ManualAdmissionForm {
  return {
    ...studentToAdmissionApplicationForm(student, base),
    existingStudentId: String(student?.id || ""),
  };
}
