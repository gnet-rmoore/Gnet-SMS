/** Shared applicant fields for public apply and Registrar Direct Admission. */

export const FAMILY_OPTIONS = [
  "Both parents living together",
  "Parents divorced/separated",
  "Single parent household",
  "Guardian / relative care",
  "Other family arrangement",
] as const;

export type AdmissionApplicationForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  gradeLevelId: string;
  studentEmail: string;
  studentPhone: string;
  address: string;
  fatherName: string;
  fatherPhone: string;
  fatherEmail: string;
  motherName: string;
  motherPhone: string;
  motherEmail: string;
  familyInformation: string[];
  previousSchool: string;
  gradeCompleted: string;
  notes: string;
};

export function emptyAdmissionApplicationForm(): AdmissionApplicationForm {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    gender: "MALE",
    gradeLevelId: "",
    studentEmail: "",
    studentPhone: "",
    address: "",
    fatherName: "",
    fatherPhone: "",
    fatherEmail: "",
    motherName: "",
    motherPhone: "",
    motherEmail: "",
    familyInformation: [],
    previousSchool: "",
    gradeCompleted: "",
    notes: "",
  };
}

export function splitPersonName(name: string | null | undefined) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function formatDobForInput(dob: string | Date | null | undefined): string {
  if (!dob) return "";
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function composeStudentName(form: Pick<AdmissionApplicationForm, "firstName" | "middleName" | "lastName">) {
  return `${form.firstName} ${form.middleName} ${form.lastName}`.trim().replace(/\s+/g, " ");
}

export function toggleFamilyInformation(
  current: string[] | undefined,
  info: string
): string[] {
  const list = Array.isArray(current) ? current : [];
  return list.includes(info) ? list.filter((item) => item !== info) : [...list, info];
}

/** Prefill from an Identity student user (Direct Admission returning path). */
export function studentToAdmissionApplicationForm(
  student: any,
  base: AdmissionApplicationForm = emptyAdmissionApplicationForm()
): AdmissionApplicationForm {
  const { firstName, middleName, lastName } = splitPersonName(student?.name);
  const email = String(student?.email || "");
  const isPlaceholder = /@placeholder\./i.test(email);

  return {
    ...base,
    firstName,
    middleName,
    lastName,
    dob: formatDobForInput(student?.dob),
    gender: student?.gender || "MALE",
    address: student?.address || "",
    gradeLevelId: student?.gradeLevelId || "",
    fatherName: student?.parentName || "",
    fatherPhone: student?.parentPhone || "",
    studentEmail: isPlaceholder ? "" : email,
    studentPhone: student?.phone || "",
    notes: student?.id
      ? `Returning student (existing user ${String(student.id).slice(0, 8)}…). Review and update fields as needed.`
      : base.notes,
  };
}

export type BuildAdmissionApiPayloadOptions = {
  form: AdmissionApplicationForm;
  applicantType?: "NEW" | "RETURNING";
  existingStudentUserId?: string | null;
  gradeLevelName?: string | null;
  sourceNote?: string;
};

/** Multi-step wizard keys shared by public apply and Registrar Direct Admission. */
export type AdmissionFormStep = "student" | "guardians" | "schooling";

export const ADMISSION_FORM_STEPS: readonly AdmissionFormStep[] = [
  "student",
  "guardians",
  "schooling",
];

/** Field validation modes — mirror AdmissionApplicationFields props. */
export type AdmissionFieldsMode = "staff" | "public-new" | "public-returning";

export type AdmissionValidationCode =
  | "required"
  | "nameTooShort"
  | "invalidEmail"
  | "invalidPhone"
  | "invalidDate"
  | "dobInFuture"
  | "gradeRequired";

export type AdmissionFieldErrors = Partial<
  Record<keyof AdmissionApplicationForm, AdmissionValidationCode>
>;

export type AdmissionStepErrors = Partial<Record<AdmissionFormStep, AdmissionFieldErrors>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmail(value: string): boolean {
  return EMAIL_RE.test(String(value || "").trim());
}

function isValidPhone(value: string): boolean {
  const trimmed = String(value || "").trim();
  if (!trimmed) return true;
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) return false;
  return (trimmed.match(/\d/g) || []).length >= 7 && (trimmed.match(/\d/g) || []).length <= 15;
}

/** null = ok, otherwise a validation code. */
function dateOfBirthIssue(value: string): AdmissionValidationCode | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "invalidDate";
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed > today) return "dobInFuture";
  if (parsed.getFullYear() < 1900) return "invalidDate";
  return null;
}

function nameIssue(value: string): AdmissionValidationCode | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "required";
  if (trimmed.length < 2) return "nameTooShort";
  return null;
}

/** Validate one wizard step. Returns only the fields that failed. */
export function validateAdmissionStep(
  step: AdmissionFormStep,
  form: AdmissionApplicationForm,
  mode: AdmissionFieldsMode = "staff"
): AdmissionFieldErrors {
  const errors: AdmissionFieldErrors = {};
  const isReturningPublic = mode === "public-returning";
  const nameRequired = !isReturningPublic;
  const gradeRequired = mode === "staff" || mode === "public-new";
  const parentRequired = mode === "public-new";

  if (step === "student") {
    if (nameRequired) {
      const first = nameIssue(form.firstName);
      if (first) errors.firstName = first;
      const last = nameIssue(form.lastName);
      if (last) errors.lastName = last;
    }
    if (isReturningPublic) {
      const email = String(form.studentEmail || "").trim();
      if (!email) errors.studentEmail = "required";
      else if (!isEmail(email)) errors.studentEmail = "invalidEmail";
      if (!String(form.dob || "").trim()) errors.dob = "required";
    } else if (form.studentEmail && !isEmail(form.studentEmail)) {
      errors.studentEmail = "invalidEmail";
    }
    const dobIssue = dateOfBirthIssue(form.dob);
    if (dobIssue && !errors.dob) errors.dob = dobIssue;
    if (form.studentPhone && !isValidPhone(form.studentPhone)) errors.studentPhone = "invalidPhone";
    if (gradeRequired && !String(form.gradeLevelId || "").trim()) errors.gradeLevelId = "gradeRequired";
  }

  if (step === "guardians") {
    if (parentRequired) {
      const fatherName = nameIssue(form.fatherName);
      if (fatherName) errors.fatherName = fatherName;
      const fatherPhone = String(form.fatherPhone || "").trim();
      if (!fatherPhone) errors.fatherPhone = "required";
      else if (!isValidPhone(fatherPhone)) errors.fatherPhone = "invalidPhone";
    } else {
      if (form.fatherName && nameIssue(form.fatherName)) errors.fatherName = "nameTooShort";
      if (form.fatherPhone && !isValidPhone(form.fatherPhone)) errors.fatherPhone = "invalidPhone";
    }
    if (form.fatherEmail && !isEmail(form.fatherEmail)) errors.fatherEmail = "invalidEmail";
    if (form.motherName && nameIssue(form.motherName)) errors.motherName = "nameTooShort";
    if (form.motherPhone && !isValidPhone(form.motherPhone)) errors.motherPhone = "invalidPhone";
    if (form.motherEmail && !isEmail(form.motherEmail)) errors.motherEmail = "invalidEmail";
  }

  return errors;
}

/** Validate every step — used by the wizard's final submit. */
export function validateAdmissionForm(
  form: AdmissionApplicationForm,
  mode: AdmissionFieldsMode = "staff"
): AdmissionStepErrors {
  const results: AdmissionStepErrors = {};
  for (const step of ADMISSION_FORM_STEPS) {
    const errors = validateAdmissionStep(step, form, mode);
    if (Object.keys(errors).length > 0) results[step] = errors;
  }
  return results;
}

/** First failing step (or null) so the wizard can jump back to it. */
export function firstStepWithErrors(results: AdmissionStepErrors): AdmissionFormStep | null {
  for (const step of ADMISSION_FORM_STEPS) {
    if (results[step]) return step;
  }
  return null;
}

/** True when every editable value is blank — used to reset the wizard after a submit. */
export function isAdmissionFormEmpty(form: AdmissionApplicationForm): boolean {
  const entries = Object.entries(form as unknown as Record<string, unknown>);
  return entries.every(([key, value]) => {
    if (key === "gender") return true;
    if (Array.isArray(value)) return value.length === 0;
    return typeof value === "string" && value.trim() === "";
  });
}

/** Map shared form → Lifecycle application create body (+ notes JSON). */
export function buildAdmissionApiPayload({
  form,
  applicantType = "NEW",
  existingStudentUserId = null,
  gradeLevelName = null,
  sourceNote,
}: BuildAdmissionApiPayloadOptions) {
  const existingId = existingStudentUserId && String(existingStudentUserId).trim()
    ? String(existingStudentUserId).trim()
    : null;
  const studentName = composeStudentName(form) || (applicantType === "RETURNING" ? "" : "Unnamed Student");
  const studentEmail =
    (form.studentEmail && String(form.studentEmail).trim()) ||
    (existingId
      ? null
      : form.fatherEmail
        ? `student.${form.firstName.toLowerCase() || "new"}.${form.lastName.toLowerCase() || "candidate"}@placeholder.com`
        : null);
  const studentPhone =
    (form.studentPhone && String(form.studentPhone).trim()) ||
    form.fatherPhone ||
    form.motherPhone ||
    null;
  const parentName = form.fatherName || form.motherName || (applicantType === "RETURNING" ? "" : "Not Specified");
  const parentEmail = form.fatherEmail || form.motherEmail || null;
  const parentPhone =
    form.fatherPhone || form.motherPhone || (applicantType === "RETURNING" ? "" : "Not Specified");

  const notesObj = {
    generalNotes:
      form.notes ||
      sourceNote ||
      (form.gradeCompleted || form.previousSchool
        ? `Completed ${form.gradeCompleted || "n/a"}. Previous school: ${form.previousSchool || "n/a"}.`
        : ""),
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
    gradeCompleted: form.gradeCompleted,
    fatherName: form.fatherName,
    fatherPhone: form.fatherPhone,
    fatherEmail: form.fatherEmail,
    motherName: form.motherName,
    motherPhone: form.motherPhone,
    motherEmail: form.motherEmail,
    familyInformation: form.familyInformation,
    admissionType: applicantType === "RETURNING" ? "Returning" : "New",
    ...(existingId ? { existingStudentUserId: existingId } : {}),
  };

  return {
    studentName: studentName || null,
    studentEmail,
    studentPhone,
    dob: form.dob || null,
    gender: form.gender || "MALE",
    address: form.address || null,
    parentName: parentName || null,
    parentEmail,
    parentPhone: parentPhone || null,
    gradeLevelId: form.gradeLevelId || "pending-assignment",
    gradeLevelName,
    previousSchool: form.previousSchool || null,
    applicantType,
    ...(existingId ? { existingStudentUserId: existingId } : {}),
    notes: JSON.stringify(notesObj),
  };
}
