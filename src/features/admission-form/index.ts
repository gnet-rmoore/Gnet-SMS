export {
  FAMILY_OPTIONS,
  emptyAdmissionApplicationForm,
  splitPersonName,
  formatDobForInput,
  composeStudentName,
  toggleFamilyInformation,
  studentToAdmissionApplicationForm,
  buildAdmissionApiPayload,
  validateAdmissionStep,
  validateAdmissionForm,
  firstStepWithErrors,
  isAdmissionFormEmpty,
  ADMISSION_FORM_STEPS,
  type AdmissionApplicationForm,
  type AdmissionFieldsMode,
  type AdmissionFieldErrors,
  type AdmissionFormStep,
  type AdmissionStepErrors,
  type AdmissionValidationCode,
  type BuildAdmissionApiPayloadOptions,
} from "./schema";
export { AdmissionApplicationFields } from "./AdmissionApplicationFields";
export { AdmissionFormWizard, type AdmissionFormWizardProps } from "./AdmissionFormWizard";
