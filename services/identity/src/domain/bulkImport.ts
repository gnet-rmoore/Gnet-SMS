/**
 * Pure bulk roster import helpers (Identity).
 * No Prisma/Express — unit-testable.
 */

import { isSchoolAssignableRole, SCHOOL_ASSIGNABLE_ROLES } from "../lib/roleChange";
import { generateTemporaryPassword } from "../lib/tempPassword";
import {
  DEFAULT_SECURITY_POLICY,
  type SecurityPolicy,
  validatePasswordAgainstPolicy,
} from "../lib/securityPolicy";

export const BULK_IMPORT_MAX_ROWS = 1500;

const PRIVILEGED_STAFF_IMPORT_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "IT_ADMIN",
]);

export type GradeLevelRef = { id: string; name: string };

export type BulkImportRowResult = {
  index: number;
  rowNumber?: number;
  ok: boolean;
  errors: string[];
  normalized?: Record<string, unknown>;
};

export type BulkImportPreviewResult = {
  ok: boolean;
  canImport: boolean;
  importableCount?: number;
  rowCount: number;
  validCount: number;
  errorCount: number;
  warnings: string[];
  rows: BulkImportRowResult[];
};

export type JsonStringMap = Record<string, string>;

export type ImportedDocument = {
  type: string;
  url: string;
};

export type PreparedStudentRow = {
  name: string;
  email: string;
  studentIdNumber: string | null;
  gradeLevelId: string;
  dob: Date | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parent2Name: string | null;
  parent2Phone: string | null;
  parent2Email: string | null;
  feeCohort: "NEW" | "RETURNING";
  classroomCode?: string | null;
  documents: ImportedDocument[] | null;
  customFields: JsonStringMap | null;
  temporaryPassword: string;
};

export type PreparedStaffRow = {
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  designation: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  dob: Date | null;
  gender: string | null;
  joiningDate: Date;
  documents: ImportedDocument[] | null;
  customFields: JsonStringMap | null;
  temporaryPassword: string;
};

export function staffRolesAllowedForActor(actorRole?: string | null): string[] {
  const roles = SCHOOL_ASSIGNABLE_ROLES.filter(
    (role) => role !== "STUDENT" && role !== "PARENT"
  ) as string[];
  if (actorRole === "SUPER_ADMIN" || actorRole === "SCHOOL_ADMIN") return roles;
  return roles.filter((role) => !PRIVILEGED_STAFF_IMPORT_ROLES.has(role));
}

const STUDENT_ALIASES: Record<string, string> = {
  name: "name",
  fullname: "name",
  "full name": "name",
  studentname: "name",
  "student name": "name",
  email: "email",
  "e-mail": "email",
  gradelevel: "gradeLevel",
  "grade level": "gradeLevel",
  grade: "gradeLevel",
  gradelevelid: "gradeLevelId",
  "grade level id": "gradeLevelId",
  dob: "dob",
  dateofbirth: "dob",
  "date of birth": "dob",
  birthdate: "dob",
  gender: "gender",
  phone: "phone",
  mobile: "phone",
  address: "address",
  parentname: "parentName",
  "parent name": "parentName",
  parentphone: "parentPhone",
  "parent phone": "parentPhone",
  parentemail: "parentEmail",
  "parent email": "parentEmail",
  guardianemail: "parentEmail",
  "guardian email": "parentEmail",
  parent2name: "parent2Name",
  "parent 2 name": "parent2Name",
  secondparentname: "parent2Name",
  "second parent name": "parent2Name",
  guardian2name: "parent2Name",
  "guardian 2 name": "parent2Name",
  parent2phone: "parent2Phone",
  "parent 2 phone": "parent2Phone",
  secondparentphone: "parent2Phone",
  "second parent phone": "parent2Phone",
  guardian2phone: "parent2Phone",
  "guardian 2 phone": "parent2Phone",
  parent2email: "parent2Email",
  "parent 2 email": "parent2Email",
  secondparentemail: "parent2Email",
  "second parent email": "parent2Email",
  guardian2email: "parent2Email",
  "guardian 2 email": "parent2Email",
  feecohort: "feeCohort",
  "fee cohort": "feeCohort",
  cohort: "feeCohort",
  classroomcode: "classroomCode",
  "classroom code": "classroomCode",
  classcode: "classroomCode",
  "class code": "classroomCode",
  section: "classroomCode",
  sectionname: "classroomCode",
  "section name": "classroomCode",
  studentidnumber: "studentIdNumber",
  "student id number": "studentIdNumber",
  studentid: "studentIdNumber",
  "student id": "studentIdNumber",
  idnumber: "studentIdNumber",
  "id number": "studentIdNumber",
  admissionnumber: "studentIdNumber",
  "admission number": "studentIdNumber",
  documents: "documents",
  customfields: "customFields",
  "custom fields": "customFields",
  password: "password",
};

const STAFF_ALIASES: Record<string, string> = {
  name: "name",
  fullname: "name",
  "full name": "name",
  email: "email",
  "e-mail": "email",
  role: "role",
  staffrole: "role",
  "staff role": "role",
  phone: "phone",
  mobile: "phone",
  address: "address",
  dob: "dob",
  dateofbirth: "dob",
  "date of birth": "dob",
  gender: "gender",
  joiningdate: "joiningDate",
  "joining date": "joiningDate",
  startdate: "joiningDate",
  "start date": "joiningDate",
  employeeid: "employeeId",
  "employee id": "employeeId",
  employeenumber: "employeeId",
  "employee number": "employeeId",
  staffid: "employeeId",
  "staff id": "employeeId",
  staffidnumber: "employeeId",
  "staff id number": "employeeId",
  department: "department",
  designation: "designation",
  position: "designation",
  jobtitle: "designation",
  "job title": "designation",
  documents: "documents",
  customfields: "customFields",
  "custom fields": "customFields",
  password: "password",
};

function canonicalKey(raw: string, aliases: Record<string, string>): string | null {
  const k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const compact = k.replace(/\s+/g, "");
  return aliases[k] || aliases[compact] || null;
}

/** Map a raw spreadsheet object onto canonical field names. */
export function normalizeRowKeys(
  raw: Record<string, unknown>,
  kind: "student" | "staff"
): { row: Record<string, unknown>; unknownKeys: string[] } {
  const aliases = kind === "student" ? STUDENT_ALIASES : STAFF_ALIASES;
  const row: Record<string, unknown> = {};
  const unknownKeys: string[] = [];
  for (const [key, value] of Object.entries(raw || {})) {
    if (value === undefined || value === null) continue;
    if (String(key).startsWith("__")) continue;
    const str = typeof value === "string" ? value : String(value);
    if (!String(key).trim() && !str.trim()) continue;
    const canon = canonicalKey(key, aliases);
    if (!canon) {
      if (String(key).trim()) unknownKeys.push(String(key).trim());
      continue;
    }
    row[canon] = typeof value === "string" ? value.trim() : value;
  }
  return { row, unknownKeys };
}

export function generateTempPassword(): string {
  return generateTemporaryPassword("St");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cellStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function sourceRowNumber(raw: Record<string, unknown>, fallbackIndex: number): number {
  const value = Number(raw?.__sourceRow);
  return Number.isInteger(value) && value > 0 ? value : fallbackIndex + 1;
}

function parseEmail(raw: unknown, field: string, errors: string[]): string {
  const email = cellStr(raw).toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) errors.push(`${field} is invalid`);
  return email;
}

function parseStudentId(raw: unknown, errors: string[]): string | null {
  const value = cellStr(raw);
  if (!value) return null;
  if (!/^\d{4,20}$/.test(value)) {
    errors.push("studentIdNumber must contain 4 to 20 digits");
    return null;
  }
  return value;
}

function parseEmployeeId(raw: unknown, errors: string[]): string | null {
  const value = cellStr(raw).toUpperCase();
  if (!value) return null;
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,63}$/.test(value)) {
    errors.push("employeeId must be 2 to 64 letters, numbers, dots, slashes, dashes, or underscores");
    return null;
  }
  return value;
}

const MAX_JSON_FIELD_CHARS = 10000;
const MAX_CUSTOM_FIELDS = 50;

function parseJsonValue(raw: unknown, field: string, errors: string[]): unknown | null {
  const text = cellStr(raw);
  if (!text) return null;
  if (text.length > MAX_JSON_FIELD_CHARS) {
    errors.push(`${field} is too large (max ${MAX_JSON_FIELD_CHARS} characters)`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    errors.push(`${field} must be valid JSON`);
    return null;
  }
}

function parseCustomFields(raw: unknown, errors: string[]): JsonStringMap | null {
  const value = parseJsonValue(raw, "customFields", errors);
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    errors.push("customFields must be a JSON object");
    return null;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_CUSTOM_FIELDS) {
    errors.push(`customFields cannot contain more than ${MAX_CUSTOM_FIELDS} entries`);
    return null;
  }
  const result: JsonStringMap = {};
  for (const [key, entry] of entries) {
    if (!key.trim() || key.length > 64) {
      errors.push("customFields contains an invalid key");
      return null;
    }
    if (typeof entry !== "string" && typeof entry !== "number" && typeof entry !== "boolean") {
      errors.push(`customFields.${key} must be a string, number, or boolean`);
      return null;
    }
    const str = String(entry);
    if (str.length > 500) {
      errors.push(`customFields.${key} is too long`);
      return null;
    }
    result[key] = str;
  }
  return result;
}

function isValidDocumentUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDocuments(raw: unknown, errors: string[]): ImportedDocument[] | null {
  const value = parseJsonValue(raw, "documents", errors);
  if (value === null) return null;
  if (!Array.isArray(value)) {
    errors.push("documents must be a JSON array");
    return null;
  }
  if (value.length > 20) {
    errors.push("documents cannot contain more than 20 entries");
    return null;
  }
  const result: ImportedDocument[] = [];
  for (const entry of value) {
    const url = typeof entry === "string" ? entry : (entry as any)?.url || (entry as any)?.fileUrl;
    const type = typeof entry === "string" ? "OTHER" : (entry as any)?.type || "OTHER";
    const urlText = cellStr(url);
    const typeText = cellStr(type).toUpperCase() || "OTHER";
    if (!isValidDocumentUrl(urlText)) {
      errors.push(`documents contains an invalid URL: ${urlText || "empty"}`);
      return null;
    }
    if (typeText.length > 32) {
      errors.push("documents contains a type that is too long");
      return null;
    }
    result.push({ type: typeText, url: urlText });
  }
  return result;
}

function parseOptionalDate(raw: string, field: string, errors: string[]): Date | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    errors.push(`${field} is not a valid date (use YYYY-MM-DD)`);
    return null;
  }
  const [year, month, day] = raw.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    errors.push(`${field} is not a valid date (use YYYY-MM-DD)`);
    return null;
  }
  return d;
}

function generatedTempPassword(policy: SecurityPolicy, prefix: string): string | null {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const value = generateTemporaryPassword(prefix);
    if (!validatePasswordAgainstPolicy(value, policy)) return value;
  }
  return null;
}

function resolveGradeLevelId(
  gradeLevelId: string,
  gradeLevel: string,
  levels: GradeLevelRef[],
  errors: string[]
): string | null {
  if (gradeLevelId) {
    const byId = levels.find((g) => g.id === gradeLevelId);
    if (!byId) {
      errors.push("gradeLevelId not found for this school");
      return null;
    }
    return byId.id;
  }
  if (!gradeLevel) {
    errors.push("gradeLevel or gradeLevelId is required");
    return null;
  }
  const needle = gradeLevel.toLowerCase();
  const matches = levels.filter(
    (g) => g.name.trim().toLowerCase() === needle || g.id.toLowerCase() === needle
  );
  if (matches.length === 0) {
    errors.push(`gradeLevel "${gradeLevel}" not found`);
    return null;
  }
  if (matches.length > 1) {
    errors.push(`gradeLevel "${gradeLevel}" is ambiguous`);
    return null;
  }
  return matches[0].id;
}

export function validateStudentRows(opts: {
  rows: Record<string, unknown>[];
  gradeLevels: GradeLevelRef[];
  existingEmails: Set<string>;
  existingStudentIds?: Set<string>;
  blockedParentEmails?: Set<string>;
  passwordPolicy?: SecurityPolicy;
}): BulkImportPreviewResult & { prepared: PreparedStudentRow[] } {
  const policy = opts.passwordPolicy || DEFAULT_SECURITY_POLICY;
  const warnings: string[] = [];
  const results: BulkImportRowResult[] = [];
  const prepared: PreparedStudentRow[] = [];
  const seenEmails = new Set<string>();
  const seenStudentIds = new Set<string>();
  const studentEmailsInFile = new Set(
    opts.rows
      .map((raw) => cellStr(normalizeRowKeys(raw, "student").row.email).toLowerCase())
      .filter(Boolean)
  );
  const guardianEmailsInFile = new Set(
    opts.rows.flatMap((raw) => {
      const { row } = normalizeRowKeys(raw, "student");
      return [cellStr(row.parentEmail), cellStr(row.parent2Email)]
        .map((email) => email.toLowerCase())
        .filter(Boolean);
    })
  );

  if (opts.rows.length > BULK_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      canImport: false,
      rowCount: opts.rows.length,
      validCount: 0,
      errorCount: opts.rows.length,
      warnings: [`Maximum ${BULK_IMPORT_MAX_ROWS} rows per import`],
      rows: [
        {
          index: 0,
          ok: false,
          errors: [`Too many rows (${opts.rows.length}); max is ${BULK_IMPORT_MAX_ROWS}`],
        },
      ],
      prepared: [],
    };
  }

  for (let i = 0; i < opts.rows.length; i++) {
    const raw = opts.rows[i];
    const rowNumber = sourceRowNumber(raw, i);
    const { row, unknownKeys } = normalizeRowKeys(raw, "student");
    if (unknownKeys.length) {
      warnings.push(`Row ${rowNumber}: ignored columns ${unknownKeys.join(", ")}`);
    }
    const errors: string[] = [];
    const name = cellStr(row.name);
    const email = parseEmail(row.email, "email", errors);
    if (!name) errors.push("name is required");
    if (!email) errors.push("email is required");

    if (email) {
      if (seenEmails.has(email)) errors.push("duplicate email in this file");
      else seenEmails.add(email);
      if (opts.existingEmails.has(email)) errors.push("email already exists");
    }

    const studentIdNumber = parseStudentId(row.studentIdNumber, errors);
    if (studentIdNumber) {
      if (seenStudentIds.has(studentIdNumber)) {
        errors.push("duplicate studentIdNumber in this file");
      } else {
        seenStudentIds.add(studentIdNumber);
      }
      if (opts.existingStudentIds?.has(studentIdNumber)) {
        errors.push("studentIdNumber already exists");
      }
    }

    const parentEmail = parseEmail(row.parentEmail, "parentEmail", errors);
    const parent2Email = parseEmail(row.parent2Email, "parent2Email", errors);
    const parent2Name = cellStr(row.parent2Name);
    const parent2Phone = cellStr(row.parent2Phone);
    if (parent2Name && !parent2Email) {
      errors.push("parent2Email is required when parent2Name is provided");
    }
    if (parent2Phone && !parent2Email) {
      errors.push("parent2Email is required when parent2Phone is provided");
    }
    for (const [field, guardianEmail] of [
      ["parentEmail", parentEmail],
      ["parent2Email", parent2Email],
    ] as const) {
      if (!guardianEmail) continue;
      if (email && guardianEmail === email) {
        errors.push(`${field} must be different from the student email`);
      }
      if (opts.blockedParentEmails?.has(guardianEmail)) {
        errors.push(`${field} belongs to a non-parent account or another school`);
      }
      if (studentEmailsInFile.has(guardianEmail)) {
        errors.push(`${field} cannot be a student email in this file`);
      }
    }
    if (parentEmail && parent2Email && parentEmail === parent2Email) {
      errors.push("parent2Email must be different from parentEmail");
    }
    if (guardianEmailsInFile.size > 0 && guardianEmailsInFile.has(email) && email) {
      errors.push("guardian email cannot be a student email in this file");
    }

    const documents = parseDocuments(row.documents, errors);
    const customFields = parseCustomFields(row.customFields, errors);

    const gradeLevelId = resolveGradeLevelId(
      cellStr(row.gradeLevelId),
      cellStr(row.gradeLevel),
      opts.gradeLevels,
      errors
    );

    const feeRaw = cellStr(row.feeCohort).toUpperCase();
    let feeCohort: "NEW" | "RETURNING" = "NEW";
    if (feeRaw) {
      if (feeRaw === "NEW" || feeRaw === "RETURNING") feeCohort = feeRaw;
      else errors.push("feeCohort must be NEW or RETURNING");
    }

    const dob = parseOptionalDate(cellStr(row.dob), "dob", errors);
    const passwordRaw = cellStr(row.password);
    const generatedPassword = generatedTempPassword(policy, "St");
    let temporaryPassword = generatedPassword || generateTemporaryPassword("St");
    if (!generatedPassword && !passwordRaw) {
      errors.push("Unable to generate a temporary password that satisfies the school policy");
    }
    if (passwordRaw) {
      const policyErr = validatePasswordAgainstPolicy(passwordRaw, policy);
      if (policyErr) errors.push(policyErr);
      else temporaryPassword = passwordRaw;
    }

    if (errors.length) {
      results.push({ index: i, rowNumber, ok: false, errors });
      continue;
    }

    const normalized: PreparedStudentRow = {
      name,
      email,
      studentIdNumber,
      gradeLevelId: gradeLevelId!,
      dob,
      gender: cellStr(row.gender) || null,
      phone: cellStr(row.phone) || null,
      address: cellStr(row.address) || null,
      parentName: cellStr(row.parentName) || null,
      parentPhone: cellStr(row.parentPhone) || null,
      parentEmail: parentEmail || null,
      parent2Name: parent2Name || null,
      parent2Phone: parent2Phone || null,
      parent2Email: parent2Email || null,
      feeCohort,
      classroomCode: cellStr(row.classroomCode) || null,
      documents,
      customFields,
      temporaryPassword,
    };
    prepared.push(normalized);
    results.push({
      index: i,
      rowNumber,
      ok: true,
      errors: [],
      normalized: {
        name: normalized.name,
        email: normalized.email,
        studentIdNumber: normalized.studentIdNumber,
        gradeLevelId: normalized.gradeLevelId,
        feeCohort: normalized.feeCohort,
        dob: normalized.dob ? normalized.dob.toISOString().slice(0, 10) : null,
        gender: normalized.gender,
        phone: normalized.phone,
        parentName: normalized.parentName,
        parentPhone: normalized.parentPhone,
        parentEmail: normalized.parentEmail,
        parent2Name: normalized.parent2Name,
        parent2Phone: normalized.parent2Phone,
        parent2Email: normalized.parent2Email,
        classroomCode: normalized.classroomCode,
        documents: normalized.documents,
        customFields: normalized.customFields,
      },
    });
  }

  const errorCount = results.filter((r) => !r.ok).length;
  const validCount = results.filter((r) => r.ok).length;
  return {
    ok: errorCount === 0 && opts.rows.length > 0,
    canImport: validCount > 0,
    rowCount: opts.rows.length,
    validCount,
    errorCount,
    warnings,
    rows: results,
    prepared,
  };
}

export function validateStaffRows(opts: {
  rows: Record<string, unknown>[];
  existingEmails: Set<string>;
  existingEmployeeIds?: Set<string>;
  passwordPolicy?: SecurityPolicy;
  allowedRoles?: string[];
}): BulkImportPreviewResult & { prepared: PreparedStaffRow[] } {
  const policy = opts.passwordPolicy || DEFAULT_SECURITY_POLICY;
  const allowedRoles = new Set(
    opts.allowedRoles || staffRolesAllowedForActor("SUPER_ADMIN")
  );
  const warnings: string[] = [];
  const results: BulkImportRowResult[] = [];
  const prepared: PreparedStaffRow[] = [];
  const seenEmails = new Set<string>();
  const seenEmployeeIds = new Set<string>();

  if (opts.rows.length > BULK_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      canImport: false,
      rowCount: opts.rows.length,
      validCount: 0,
      errorCount: opts.rows.length,
      warnings: [`Maximum ${BULK_IMPORT_MAX_ROWS} rows per import`],
      rows: [
        {
          index: 0,
          ok: false,
          errors: [`Too many rows (${opts.rows.length}); max is ${BULK_IMPORT_MAX_ROWS}`],
        },
      ],
      prepared: [],
    };
  }

  for (let i = 0; i < opts.rows.length; i++) {
    const raw = opts.rows[i];
    const rowNumber = sourceRowNumber(raw, i);
    const { row, unknownKeys } = normalizeRowKeys(raw, "staff");
    if (unknownKeys.length) {
      warnings.push(`Row ${rowNumber}: ignored columns ${unknownKeys.join(", ")}`);
    }
    const errors: string[] = [];
    const name = cellStr(row.name);
    const email = parseEmail(row.email, "email", errors);
    if (!name) errors.push("name is required");
    if (!email) errors.push("email is required");

    if (email) {
      if (seenEmails.has(email)) errors.push("duplicate email in this file");
      else seenEmails.add(email);
      if (opts.existingEmails.has(email)) errors.push("email already exists");
    }

    const employeeId = parseEmployeeId(row.employeeId, errors);
    if (employeeId) {
      if (seenEmployeeIds.has(employeeId)) errors.push("duplicate employeeId in this file");
      else seenEmployeeIds.add(employeeId);
      if (opts.existingEmployeeIds?.has(employeeId)) errors.push("employeeId already exists");
    }

    let role = cellStr(row.role).toUpperCase() || "TEACHER";
    if (!isSchoolAssignableRole(role) || !allowedRoles.has(role)) {
      errors.push(`invalid staff role "${role}"`);
    }

    const dob = parseOptionalDate(cellStr(row.dob), "dob", errors);
    const joiningRaw = cellStr(row.joiningDate);
    let joiningDate = new Date();
    if (joiningRaw) {
      const jd = parseOptionalDate(joiningRaw, "joiningDate", errors);
      if (jd) joiningDate = jd;
    }

    const documents = parseDocuments(row.documents, errors);
    const customFields = parseCustomFields(row.customFields, errors);

    const passwordRaw = cellStr(row.password);
    const generatedPassword = generatedTempPassword(policy, "St");
    let temporaryPassword = generatedPassword || generateTemporaryPassword("St");
    if (!generatedPassword && !passwordRaw) {
      errors.push("Unable to generate a temporary password that satisfies the school policy");
    }
    if (passwordRaw) {
      const policyErr = validatePasswordAgainstPolicy(passwordRaw, policy);
      if (policyErr) errors.push(policyErr);
      else temporaryPassword = passwordRaw;
    }

    if (errors.length) {
      results.push({ index: i, rowNumber, ok: false, errors });
      continue;
    }

    const normalized: PreparedStaffRow = {
      name,
      email,
      employeeId,
      department: cellStr(row.department) || null,
      designation: cellStr(row.designation) || null,
      role,
      phone: cellStr(row.phone) || null,
      address: cellStr(row.address) || null,
      dob,
      gender: cellStr(row.gender) || null,
      joiningDate,
      documents,
      customFields,
      temporaryPassword,
    };
    prepared.push(normalized);
    results.push({
      index: i,
      rowNumber,
      ok: true,
      errors: [],
      normalized: {
        name: normalized.name,
        email: normalized.email,
        employeeId: normalized.employeeId,
        department: normalized.department,
        designation: normalized.designation,
        role: normalized.role,
        phone: normalized.phone,
        dob: normalized.dob ? normalized.dob.toISOString().slice(0, 10) : null,
        joiningDate: normalized.joiningDate.toISOString().slice(0, 10),
        documents: normalized.documents,
        customFields: normalized.customFields,
      },
    });
  }

  const errorCount = results.filter((r) => !r.ok).length;
  return {
    ok: errorCount === 0 && opts.rows.length > 0,
    canImport: errorCount === 0 && opts.rows.length > 0,
    rowCount: opts.rows.length,
    validCount: results.filter((r) => r.ok).length,
    errorCount,
    warnings,
    rows: results,
    prepared,
  };
}

export type StudentImportKeyRow = {
  key: string;
  value: string;
  label?: string;
  id?: string;
  details?: string;
};

function csvField(value: string | undefined | null): string {
  const raw = String(value ?? "");
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function studentImportTemplateCsv(): string {
  return [
    "name,email,studentIdNumber,gradeLevel,dob,gender,phone,address,parentName,parentPhone,parentEmail,parent2Name,parent2Phone,parent2Email,feeCohort,classroomCode,documents,customFields",
    "Ada Lovelace,ada.lovelace@example.com,100456,Grade 7,2012-12-10,FEMALE,,,Ada Parent,+2315550001,parent.ada@example.com,Second Parent,+2315550002,second.ada@example.com,NEW,7A,\"[\"\"/docs/ada-id.pdf\"\"]\",\"{\"\"house\"\":\"\"Blue\"\"}\"",
  ].join("\n");
}

export function studentImportKeysCsv(rows: StudentImportKeyRow[]): string {
  return [
    "key,value,label,id,details",
    ...rows.map((row) =>
      [row.key, row.value, row.label, row.id, row.details].map(csvField).join(",")
    ),
  ].join("\n");
}

export function staffImportTemplateCsv(): string {
  return [
    "name,email,employeeId,role,department,designation,phone,dob,gender,address,joiningDate,documents,customFields",
    "Grace Hopper,grace.hopper@example.com,EMP-1001,TEACHER,SCIENCE,HEAD OF IT,+2315550003,1985-01-15,FEMALE,,2026-01-15,\"[\"\"/docs/grace-cv.pdf\"\"]\",\"{\"\"emergencyContact\"\":\"\"+2315550004\"\"}\"",
  ].join("\n");
}

/** Drop blank spreadsheet rows before validation. */
export function filterNonEmptyRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return (rows || []).filter((r) =>
    Object.entries(r || {}).some(([key, value]) => !key.startsWith("__") && cellStr(value) !== "")
  );
}
