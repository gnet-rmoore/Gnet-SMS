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
