/**
 * Pure bulk roster import helpers (Identity).
 * No Prisma/Express — unit-testable.
 */

import { isSchoolAssignableRole } from "../lib/roleChange";
import {
  DEFAULT_SECURITY_POLICY,
  type SecurityPolicy,
  validatePasswordAgainstPolicy,
} from "../lib/securityPolicy";

export const BULK_IMPORT_MAX_ROWS = 500;

export type GradeLevelRef = { id: string; name: string };

export type BulkImportRowResult = {
  index: number;
  ok: boolean;
  errors: string[];
  normalized?: Record<string, unknown>;
};

export type BulkImportPreviewResult = {
  ok: boolean;
  rowCount: number;
  validCount: number;
  errorCount: number;
  warnings: string[];
  rows: BulkImportRowResult[];
};

export type PreparedStudentRow = {
  name: string;
  email: string;
  gradeLevelId: string;
  dob: Date | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  parentName: string | null;
  parentPhone: string | null;
  feeCohort: "NEW" | "RETURNING";
  classroomCode?: string | null;
  temporaryPassword: string;
};

export type PreparedStaffRow = {
  name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  dob: Date | null;
  gender: string | null;
  joiningDate: Date;
  temporaryPassword: string;
};

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
  feecohort: "feeCohort",
  "fee cohort": "feeCohort",
  cohort: "feeCohort",
  classroomcode: "classroomCode",
  "classroom code": "classroomCode",
  classcode: "classroomCode",
  "class code": "classroomCode",
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
  return `St@${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

function cellStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function parseOptionalDate(raw: string, field: string, errors: string[]): Date | null {
  if (!raw) return null;
  // Excel serial numbers sometimes arrive as numbers
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    errors.push(`${field} is not a valid date (use YYYY-MM-DD)`);
    return null;
  }
  return d;
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
}): BulkImportPreviewResult & { prepared: PreparedStudentRow[] } {
  const warnings: string[] = [];
  const results: BulkImportRowResult[] = [];
  const prepared: PreparedStudentRow[] = [];
  const seenEmails = new Set<string>();

  if (opts.rows.length > BULK_IMPORT_MAX_ROWS) {
    return {
      ok: false,
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
    const { row, unknownKeys } = normalizeRowKeys(opts.rows[i], "student");
    if (unknownKeys.length) {
      warnings.push(`Row ${i + 1}: ignored columns ${unknownKeys.join(", ")}`);
    }
    const errors: string[] = [];
    const name = cellStr(row.name);
    const email = cellStr(row.email).toLowerCase();
    if (!name) errors.push("name is required");
    if (!email) errors.push("email is required");
    else if (!email.includes("@")) errors.push("email is invalid");

    if (email) {
      if (seenEmails.has(email)) errors.push("duplicate email in this file");
      else seenEmails.add(email);
      if (opts.existingEmails.has(email)) errors.push("email already exists");
    }

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
    let temporaryPassword = generateTempPassword();
    if (passwordRaw) {
      if (passwordRaw.length < 8) errors.push("password must be at least 8 characters");
      else temporaryPassword = passwordRaw;
    }

    if (errors.length) {
      results.push({ index: i, ok: false, errors });
      continue;
    }

    const normalized: PreparedStudentRow = {
      name,
      email,
      gradeLevelId: gradeLevelId!,
      dob,
      gender: cellStr(row.gender) || null,
      phone: cellStr(row.phone) || null,
      address: cellStr(row.address) || null,
      parentName: cellStr(row.parentName) || null,
      parentPhone: cellStr(row.parentPhone) || null,
      feeCohort,
      classroomCode: cellStr(row.classroomCode) || null,
      temporaryPassword,
    };
    prepared.push(normalized);
    results.push({
      index: i,
      ok: true,
      errors: [],
      normalized: {
        name: normalized.name,
        email: normalized.email,
        gradeLevelId: normalized.gradeLevelId,
        feeCohort: normalized.feeCohort,
        dob: normalized.dob ? normalized.dob.toISOString().slice(0, 10) : null,
        gender: normalized.gender,
        phone: normalized.phone,
        parentName: normalized.parentName,
        parentPhone: normalized.parentPhone,
      },
    });
  }

  const errorCount = results.filter((r) => !r.ok).length;
  return {
    ok: errorCount === 0 && opts.rows.length > 0,
    rowCount: opts.rows.length,
    validCount: results.filter((r) => r.ok).length,
    errorCount,
    warnings,
    rows: results,
    prepared,
  };
}

export function validateStaffRows(opts: {
  rows: Record<string, unknown>[];
  existingEmails: Set<string>;
  passwordPolicy?: SecurityPolicy;
}): BulkImportPreviewResult & { prepared: PreparedStaffRow[] } {
  const policy = opts.passwordPolicy || DEFAULT_SECURITY_POLICY;
  const warnings: string[] = [];
  const results: BulkImportRowResult[] = [];
  const prepared: PreparedStaffRow[] = [];
  const seenEmails = new Set<string>();

  if (opts.rows.length > BULK_IMPORT_MAX_ROWS) {
    return {
      ok: false,
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
    const { row, unknownKeys } = normalizeRowKeys(opts.rows[i], "staff");
    if (unknownKeys.length) {
      warnings.push(`Row ${i + 1}: ignored columns ${unknownKeys.join(", ")}`);
    }
    const errors: string[] = [];
    const name = cellStr(row.name);
    const email = cellStr(row.email).toLowerCase();
    if (!name) errors.push("name is required");
    if (!email) errors.push("email is required");
    else if (!email.includes("@")) errors.push("email is invalid");

    if (email) {
      if (seenEmails.has(email)) errors.push("duplicate email in this file");
      else seenEmails.add(email);
      if (opts.existingEmails.has(email)) errors.push("email already exists");
    }

    let role = cellStr(row.role).toUpperCase() || "TEACHER";
    if (!isSchoolAssignableRole(role) || role === "STUDENT" || role === "PARENT") {
      errors.push(`invalid staff role "${role}"`);
    }

    const dob = parseOptionalDate(cellStr(row.dob), "dob", errors);
    const joiningRaw = cellStr(row.joiningDate);
    let joiningDate = new Date();
    if (joiningRaw) {
      const jd = parseOptionalDate(joiningRaw, "joiningDate", errors);
      if (jd) joiningDate = jd;
    }

    const passwordRaw = cellStr(row.password);
    let temporaryPassword = generateTempPassword();
    if (passwordRaw) {
      const policyErr = validatePasswordAgainstPolicy(passwordRaw, policy);
      if (policyErr) errors.push(policyErr);
      else temporaryPassword = passwordRaw;
    } else {
      const policyErr = validatePasswordAgainstPolicy(temporaryPassword, policy);
      if (policyErr) {
        // Auto-generated should always pass default policy; if school requires strong, extend.
        temporaryPassword = `St@${Math.random().toString(36).slice(2, 10)}A1!`;
        const retry = validatePasswordAgainstPolicy(temporaryPassword, policy);
        if (retry) errors.push(retry);
      }
    }

    if (errors.length) {
      results.push({ index: i, ok: false, errors });
      continue;
    }

    const normalized: PreparedStaffRow = {
      name,
      email,
      role,
      phone: cellStr(row.phone) || null,
      address: cellStr(row.address) || null,
      dob,
      gender: cellStr(row.gender) || null,
      joiningDate,
      temporaryPassword,
    };
    prepared.push(normalized);
    results.push({
      index: i,
      ok: true,
      errors: [],
      normalized: {
        name: normalized.name,
        email: normalized.email,
        role: normalized.role,
        phone: normalized.phone,
        dob: normalized.dob ? normalized.dob.toISOString().slice(0, 10) : null,
        joiningDate: normalized.joiningDate.toISOString().slice(0, 10),
      },
    });
  }

  const errorCount = results.filter((r) => !r.ok).length;
  return {
    ok: errorCount === 0 && opts.rows.length > 0,
    rowCount: opts.rows.length,
    validCount: results.filter((r) => r.ok).length,
    errorCount,
    warnings,
    rows: results,
    prepared,
  };
}

export function studentImportTemplateCsv(): string {
  return [
    "name,email,gradeLevel,dob,gender,phone,address,parentName,parentPhone,feeCohort,classroomCode",
    "Ada Lovelace,ada.lovelace@example.com,Grade 7,2012-12-10,FEMALE,,,Ada Parent,+2315550001,NEW,7A",
  ].join("\n");
}

export function staffImportTemplateCsv(): string {
  return [
    "name,email,role,phone,dob,gender,address,joiningDate",
    "Grace Hopper,grace.hopper@example.com,TEACHER,+2315550002,1985-01-15,FEMALE,,2026-01-15",
  ].join("\n");
}

/** Drop blank spreadsheet rows before validation. */
export function filterNonEmptyRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return (rows || []).filter((r) =>
    Object.values(r || {}).some((v) => cellStr(v) !== "")
  );
}
