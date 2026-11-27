import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { fetchSchoolGradeLevelsInternal } from "../lib/academicClient";
import { parseSecurityPolicy, DEFAULT_SECURITY_POLICY } from "../lib/securityPolicy";
import { staffQuotaHeadroom, studentQuotaHeadroom } from "../lib/quotaEnforcement";
import { userService } from "./userService";
import { parentAccessService } from "./parentAccessService";
import { emailAuthService } from "./emailAuthService";
import { temporaryPasswordFields } from "../lib/credentialCrypto";
import { generateTemporaryPassword } from "../lib/tempPassword";
import { createZipArchive } from "../lib/zip";
import { allocateStudentId } from "./studentIdService";
import {
  filterNonEmptyRows,
  normalizeRowKeys,
  staffImportTemplateCsv,
  staffRolesAllowedForActor,
  studentImportKeysCsv,
  studentImportTemplateCsv,
  type StudentImportKeyRow,
  validateStaffRows,
  validateStudentRows,
  type BulkImportPreviewResult,
  type PreparedStaffRow,
  type PreparedStudentRow,
} from "../domain/bulkImport";

function extractRows(body: any): Record<string, unknown>[] {
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  return filterNonEmptyRows(rows as Record<string, unknown>[]);
}

async function existingEmailSet(emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const found = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  return new Set(found.map((u) => u.email.toLowerCase()));
}

type StudentImportFailure = {
  index: number;
  rowNumber?: number;
  email: string | null;
  errors: string[];
};

function normalizedImportEmails(rows: Record<string, unknown>[]) {
  const students: string[] = [];
  const parents = new Set<string>();
  for (const raw of rows) {
    const { row } = normalizeRowKeys(raw, "student");
    const email = String(row.email || "")
      .trim()
      .toLowerCase();
    const parentEmail = String(row.parentEmail || "")
      .trim()
      .toLowerCase();
    const parent2Email = String(row.parent2Email || "")
      .trim()
      .toLowerCase();
    if (email) students.push(email);
    if (parentEmail && parentEmail !== email) parents.add(parentEmail);
    if (parent2Email && parent2Email !== email) parents.add(parent2Email);
  }
  return { students, parents: [...parents] };
}

function normalizedImportStudentIds(rows: Record<string, unknown>[]): string[] {
  const ids = new Set<string>();
  for (const raw of rows) {
    const { row } = normalizeRowKeys(raw, "student");
    const studentIdNumber = String(row.studentIdNumber || "")
      .trim()
      .replace(/\s+/g, "");
    if (studentIdNumber) ids.add(studentIdNumber);
  }
  return [...ids];
}

function normalizedImportEmployeeIds(rows: Record<string, unknown>[]): string[] {
  const ids = new Set<string>();
  for (const raw of rows) {
    const { row } = normalizeRowKeys(raw, "staff");
    const employeeId = String(row.employeeId || "")
      .trim()
      .toUpperCase();
    if (employeeId) ids.add(employeeId);
  }
  return [...ids];
}

async function existingStudentIdSet(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const found = await prisma.user.findMany({
    where: { studentIdNumber: { in: ids } },
    select: { studentIdNumber: true },
  });
  return new Set(found.map((u) => u.studentIdNumber).filter(Boolean) as string[]);
}

async function existingEmployeeIdSet(schoolId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const found = await prisma.user.findMany({
    where: { schoolId, employeeId: { in: ids } } as any,
    select: { employeeId: true } as any,
  });
  return new Set((found as any[]).map((u) => u.employeeId).filter(Boolean) as string[]);
}

async function blockedParentEmailSet(schoolId: string, emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const found = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, role: true, schoolId: true },
  });
  return new Set(
    found
      .filter((u) => u.role !== "PARENT" || (u.schoolId && u.schoolId !== schoolId))
      .map((u) => u.email.toLowerCase())
  );
}

function failedRowsFromValidation(
  rows: Record<string, unknown>[],
  validated: { rows: Array<{ index: number; rowNumber?: number; ok: boolean; errors: string[] }> }
): StudentImportFailure[] {
  return validated.rows
    .filter((row) => !row.ok)
    .map((row) => {
      const { row: normalized } = normalizeRowKeys(rows[row.index] || {}, "student");
      return {
        index: row.index,
        rowNumber: row.rowNumber,
        email: String(normalized.email || "")
          .trim()
          .toLowerCase()
          .replace(/^$/, "") || null,
        errors: row.errors,
      };
    });
}

async function loadGradeLevels(schoolId: string) {
  const raw = await fetchSchoolGradeLevelsInternal(schoolId);
  const list = Array.isArray(raw) ? raw : raw?.gradeLevels || raw?.data || [];
  return (list as any[])
    .map((g) => ({ id: String(g.id), name: String(g.name || "") }))
    .filter((g) => g.id && g.name);
}

async function loadClassrooms(schoolId: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  const res = await fetch(`${CLASSROOM_URL}/api/internal/schools/${schoolId}/classrooms`, {
    headers,
  });
  if (!res.ok) throw new Error(`Unable to load classrooms (${res.status})`);
  const raw = await res.json();
  const list = Array.isArray(raw) ? raw : raw?.items || raw?.classrooms || [];
  return (list as any[])
    .map((c) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      classCode: String(c.classCode || c.code || ""),
      gradeLevelId: String(c.gradeLevelId || ""),
      schoolYearId: String(c.schoolYearId || ""),
      subjectId: String(c.subjectId || ""),
    }))
    .filter((c) => c.id && (c.classCode || c.name));
}

async function sendVerificationEmailsInBatches(
  users: Array<{ id: string; email: string }>
): Promise<string[]> {
  const warnings: string[] = [];
  const concurrency = 10;
  for (let i = 0; i < users.length; i += concurrency) {
    const batch = users.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((user) => emailAuthService.sendVerificationEmail(user.id))
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        warnings.push(
          `${batch[index].email}: verification email failed — ${result.reason?.message || "unknown error"}`
        );
      }
    });
  }
  return warnings;
}

function jsonObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).filter((key) => key.trim());
}

async function loadTenantStudentImportKeys(schoolId: string): Promise<StudentImportKeyRow[]> {
  const [gradeResult, classroomResult, studentResult] = await Promise.allSettled([
    loadGradeLevels(schoolId),
    loadClassrooms(schoolId),
    prisma.user.findMany({
      where: { schoolId, role: "STUDENT" },
      select: { customFields: true, documents: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 5001,
    }),
  ]);

  const gradeLevels = gradeResult.status === "fulfilled" ? gradeResult.value : [];
  const classrooms = classroomResult.status === "fulfilled" ? classroomResult.value : [];
  const allStudents = studentResult.status === "fulfilled" ? studentResult.value : [];
  const students = allStudents.slice(0, 5000);
  const warnings: StudentImportKeyRow[] = [];
  if (gradeResult.status === "rejected") {
    warnings.push({
      key: "warning",
      value: "gradeLevels unavailable",
      details: "Grade-level keys could not be loaded; download again after the academic service recovers.",
    });
  }
  if (classroomResult.status === "rejected") {
    warnings.push({
      key: "warning",
      value: "classroomCodes unavailable",
      details: "Classroom keys could not be loaded; download again after the classroom service recovers.",
    });
  }
  if (studentResult.status === "rejected") {
    warnings.push({
      key: "warning",
      value: "customFieldKeys unavailable",
      details: "Existing custom-field keys could not be loaded.",
    });
  }
  if (allStudents.length > 5000) {
    warnings.push({
      key: "warning",
      value: "customFieldKeys capped",
      details: "Only the first 5000 student records were scanned for custom-field keys.",
    });
  }

  const customFieldKeys = new Set<string>();
  const documentTypes = new Set<string>();
  for (const student of students) {
    for (const key of jsonObjectKeys(student.customFields)) customFieldKeys.add(key);
    if (Array.isArray(student.documents)) {
      for (const document of student.documents) {
        const type = jsonObjectKeys(document).includes("type")
          ? String((document as Record<string, unknown>).type || "").trim().toUpperCase()
          : "";
        if (type) documentTypes.add(type);
      }
    }
  }

  const rows: StudentImportKeyRow[] = [];
  for (const grade of [...gradeLevels].sort((a, b) => a.name.localeCompare(b.name))) {
    rows.push({
      key: "gradeLevel",
      value: grade.name,
      label: grade.name,
      id: grade.id,
      details: "Use in the gradeLevel column",
    });
    rows.push({
      key: "gradeLevelId",
      value: grade.id,
      label: grade.name,
      details: "Alternative to gradeLevel",
    });
  }
  for (const classroom of [...classrooms].sort((a, b) =>
    (a.classCode || a.name).localeCompare(b.classCode || b.name)
  )) {
    rows.push({
      key: "classroomCode",
      value: classroom.classCode || classroom.name,
      label: classroom.name,
      id: classroom.id,
      details: [
        classroom.gradeLevelId ? `gradeLevelId:${classroom.gradeLevelId}` : "",
        classroom.schoolYearId ? `schoolYearId:${classroom.schoolYearId}` : "",
        classroom.subjectId ? "subjectRoom:true" : "classGroup:true",
      ]
        .filter(Boolean)
        .join(";"),
    });
  }
  for (const cohort of ["NEW", "RETURNING"]) {
    rows.push({
      key: "feeCohort",
      value: cohort,
      label: cohort === "NEW" ? "New student" : "Returning student",
      details: "Accepted value",
    });
  }
  for (const gender of ["MALE", "FEMALE", "OTHER"]) {
    rows.push({
      key: "gender",
      value: gender,
      label: gender.charAt(0) + gender.slice(1).toLowerCase(),
      details: "Suggested value",
    });
  }
  for (const key of [...customFieldKeys].sort((a, b) => a.localeCompare(b))) {
    rows.push({
      key: "customFields",
      value: JSON.stringify({ [key]: "" }),
      label: key,
      details: "Example customFields JSON using an existing tenant key",
    });
  }
  for (const type of [...documentTypes].sort((a, b) => a.localeCompare(b))) {
    rows.push({
      key: "documents",
      value: JSON.stringify([{ type, url: "/docs/example.pdf" }]),
      label: type,
      details: "Example documents JSON using an existing tenant type",
    });
  }
  return [...rows, ...warnings];
}

async function loadPasswordPolicy(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { securityPolicy: true },
  });
  return parseSecurityPolicy(school?.securityPolicy) || DEFAULT_SECURITY_POLICY;
}

const CLASSROOM_URL = process.env.CLASSROOM_URL || "http://localhost:3014";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

async function assignStudentClassroomByCode(
  schoolId: string,
  userId: string,
  classroomCode: string,
  knownClassrooms?: Awaited<ReturnType<typeof loadClassrooms>> | null
): Promise<{ ok: boolean }> {
  const code = String(classroomCode || "").trim();
  if (!code) return { ok: false };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  let classrooms = knownClassrooms;
  if (!classrooms) {
    const listRes = await fetch(`${CLASSROOM_URL}/api/internal/schools/${schoolId}/classrooms`, {
      headers,
    });
    if (!listRes.ok) return { ok: false };
    const list = await listRes.json();
    classrooms = (Array.isArray(list) ? list : []).map((c: any) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      classCode: String(c.classCode || c.code || ""),
      gradeLevelId: String(c.gradeLevelId || ""),
      schoolYearId: String(c.schoolYearId || ""),
      subjectId: String(c.subjectId || ""),
    }));
  }
  const match = classrooms.find(
    (c: any) =>
      String(c.classCode || c.code || c.name || "")
        .trim()
        .toLowerCase() === code.toLowerCase()
  );
  if (!match?.id) return { ok: false };
  const memberRes = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${match.id}/members`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userId, role: "STUDENT" }),
  });
  return { ok: memberRes.ok };
}

function previewPayload(result: BulkImportPreviewResult) {
  return {
    ok: result.ok,
    canImport: result.canImport,
    importableCount: result.importableCount,
    rowCount: result.rowCount,
    validCount: result.validCount,
    errorCount: result.errorCount,
    warnings: result.warnings,
    rows: result.rows,
  };
}

export const bulkImportService = {
  studentTemplateCsv: studentImportTemplateCsv,
  staffTemplateCsv: staffImportTemplateCsv,

  async studentTemplateBundle(schoolId: string): Promise<Buffer> {
    const keys = await loadTenantStudentImportKeys(schoolId);
    return createZipArchive([
      { name: "student-import-template.csv", content: studentImportTemplateCsv() },
      { name: "student-import-keys.csv", content: studentImportKeysCsv(keys) },
    ]);
  },

  async previewStudents(schoolId: string, body: any) {
    const rows = extractRows(body);
    if (!rows.length) {
      return {
        ok: false,
        canImport: false,
        rowCount: 0,
        validCount: 0,
        errorCount: 0,
        warnings: [],
        rows: [{ index: 0, ok: false, errors: ["No data rows found"] }],
      };
    }
    let gradeLevels: { id: string; name: string }[] = [];
    try {
      gradeLevels = await loadGradeLevels(schoolId);
    } catch (err: any) {
      throw Object.assign(new Error(err?.message || "Failed to load grade levels"), {
        status: 502,
      });
    }
    const { students: normalizedEmails, parents: parentEmails } = normalizedImportEmails(rows);
    const existingAll = await existingEmailSet(normalizedEmails);
    const existingStudentIds = await existingStudentIdSet(normalizedImportStudentIds(rows));
    const blockedParentEmails = await blockedParentEmailSet(schoolId, parentEmails);
    const passwordPolicy = await loadPasswordPolicy(schoolId);

    const result = validateStudentRows({
      rows,
      gradeLevels,
      existingEmails: existingAll,
      existingStudentIds,
      blockedParentEmails,
      passwordPolicy,
    });
    const preview = previewPayload(result);
    const headroom = await studentQuotaHeadroom(schoolId);
    if (headroom) {
      preview.importableCount = Math.min(preview.validCount, headroom.remaining);
      if (preview.validCount > headroom.remaining) {
        preview.warnings = [
          ...preview.warnings,
          `Student seat limit allows ${headroom.remaining} more student(s); ${
            preview.validCount - headroom.remaining
          } valid row(s) will be skipped.`,
        ];
      }
      if (preview.importableCount === 0) preview.canImport = false;
    }
    return preview;
  },

  async importStudents(schoolId: string, body: any) {
    const rows = extractRows(body);
    if (!rows.length) {
      const err: any = new Error("No data rows found");
      err.status = 400;
      err.preview = {
        ok: false,
        canImport: false,
        rowCount: 0,
        validCount: 0,
        errorCount: 0,
        warnings: [],
        rows: [{ index: 0, ok: false, errors: ["No data rows found"] }],
      };
      throw err;
    }

    let gradeLevels: { id: string; name: string }[] = [];
    try {
      gradeLevels = await loadGradeLevels(schoolId);
    } catch (e: any) {
      throw Object.assign(new Error(e?.message || "Failed to load grade levels"), { status: 502 });
    }
    const classrooms = await loadClassrooms(schoolId).catch(() => null);

    const { students: normalizedEmails, parents: parentEmails } = normalizedImportEmails(rows);
    const existingAll = await existingEmailSet(normalizedEmails);
    const existingStudentIds = await existingStudentIdSet(normalizedImportStudentIds(rows));
    const blockedParentEmails = await blockedParentEmailSet(schoolId, parentEmails);
    const passwordPolicy = await loadPasswordPolicy(schoolId);

    const validated = validateStudentRows({
      rows,
      gradeLevels,
      existingEmails: existingAll,
      existingStudentIds,
      blockedParentEmails,
      passwordPolicy,
    });
    if (!validated.canImport) {
      const err: any = new Error("Import validation failed");
      err.status = 400;
      err.preview = previewPayload(validated);
      throw err;
    }

    const headroom = await studentQuotaHeadroom(schoolId);
    if (headroom && headroom.remaining <= 0) {
      const err: any = new Error(`Student seat limit reached (${headroom.limit})`);
      err.status = 403;
      err.code = "QUOTA_EXCEEDED";
      err.preview = {
        ...previewPayload(validated),
        canImport: false,
        importableCount: 0,
        warnings: [
          ...validated.warnings,
          `Student seat limit reached (${headroom.limit}). Upgrade your plan or free a seat.`,
        ],
      };
      err.details = { reason: "QUOTA_EXCEEDED", failedCount: validated.validCount };
      throw err;
    }

    const warnings = [...validated.warnings];
    const verifyEmails = await emailAuthService.isEmailVerificationRequired();
    const failed: StudentImportFailure[] = failedRowsFromValidation(rows, validated);
    const prepared = validated.prepared as PreparedStudentRow[];
    const validIndices = validated.rows.filter((row) => row.ok).map((row) => row.index);

    const accepted: PreparedStudentRow[] = [];
    const acceptedIndices: number[] = [];
    prepared.forEach((row, position) => {
      if (headroom && position >= headroom.remaining) {
        failed.push({
          index: validIndices[position],
          rowNumber: validated.rows[validIndices[position]]?.rowNumber,
          email: row.email,
          errors: [
            `Student seat limit allows ${headroom.remaining} more student(s); this valid row was skipped.`,
          ],
        });
        return;
      }
      accepted.push(row);
      acceptedIndices.push(validIndices[position]);
    });
    if (headroom && prepared.length > headroom.remaining) {
      warnings.push(
        `Student seat limit allows ${headroom.remaining} more student(s); ${
          prepared.length - headroom.remaining
        } valid row(s) were skipped.`
      );
    }

    type CreatedStudent = {
      id: string;
      name: string;
      email: string;
      role: string;
      studentIdNumber?: string | null;
      gradeLevelId: string | null;
      feeCohort: string | null;
      temporaryPassword: string;
      classroomCode?: string | null;
      documents: PreparedStudentRow["documents"];
      customFields: PreparedStudentRow["customFields"];
      parentName: string | null;
      parentEmail: string | null;
      parentTemporaryPassword?: string;
      parentAccessCode?: string;
      parentCreated: boolean;
      parentLinkFailed: boolean;
      parent2Name: string | null;
      parent2Email: string | null;
      parent2TemporaryPassword?: string;
      parent2AccessCode?: string;
      parent2Created: boolean;
      parent2LinkFailed: boolean;
    };

    const created: CreatedStudent[] = [];
    const verificationTargets: Array<{ id: string; email: string }> = [];
    for (let i = 0; i < accepted.length; i++) {
      const row = accepted[i];
      const index = acceptedIndices[i];
      let user: {
        id: string;
        name: string;
        email: string;
        role: string;
        studentIdNumber?: string | null;
        gradeLevelId: string | null;
      } | null = null;
      try {
        const clash = await prisma.user.findUnique({
          where: { email: row.email },
          select: { id: true },
        });
        if (clash) {
          failed.push({
            index,
            rowNumber: validated.rows[index]?.rowNumber,
            email: row.email,
            errors: ["email already exists"],
          });
          continue;
        }
        if (row.studentIdNumber) {
          const idClash = await prisma.user.findUnique({
            where: { studentIdNumber: row.studentIdNumber },
            select: { id: true },
          });
          if (idClash) {
            failed.push({
              index,
              rowNumber: validated.rows[index]?.rowNumber,
              email: row.email,
              errors: ["studentIdNumber already exists"],
            });
            continue;
          }
        }
        const passwordHash = bcrypt.hashSync(row.temporaryPassword, 10);
        user = await prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            passwordHash,
            role: "STUDENT",
            schoolId,
            studentIdNumber: row.studentIdNumber || (await allocateStudentId(schoolId)),
            dob: row.dob,
            gender: row.gender,
            phone: row.phone,
            address: row.address,
            parentName: row.parentName,
            parentPhone: row.parentPhone,
            gradeLevelId: row.gradeLevelId,
            feeCohort: row.feeCohort,
            documents: row.documents as any,
            customFields: row.customFields as any,
            ...temporaryPasswordFields(row.temporaryPassword),
            mustChangePassword: true,
            isActive: true,
          } as any,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            ...({ studentIdNumber: true } as any),
            gradeLevelId: true,
          },
        }) as any;
      } catch (err: any) {
        failed.push({
          index,
          rowNumber: validated.rows[index]?.rowNumber,
          email: row.email,
          errors: [err?.message || "Failed to create student"],
        });
        continue;
      }
      if (!user) continue;

      const record: CreatedStudent = {
        ...user,
        feeCohort: row.feeCohort,
        temporaryPassword: row.temporaryPassword,
        classroomCode: row.classroomCode,
        documents: row.documents,
        customFields: row.customFields,
        parentName: row.parentName,
        parentEmail: null,
        parentCreated: false,
        parentLinkFailed: false,
        parent2Name: row.parent2Name,
        parent2Email: null,
        parent2Created: false,
        parent2LinkFailed: false,
      };

      if (verifyEmails) {
        verificationTargets.push({ id: user.id, email: user.email });
      }

      if (row.parentEmail) {
        try {
          const parentPassword = generateTemporaryPassword("Pa");
          const parentUser = await userService.findOrCreateUser({
            email: row.parentEmail,
            name: row.parentName?.trim() || row.parentEmail,
            role: "PARENT",
            schoolId,
            password: parentPassword,
            phone: row.parentPhone,
            sendWelcomeEmail: false,
          });
          if (parentUser.role !== "PARENT") {
            warnings.push(`${row.email}: parent email belongs to a non-parent account`);
          } else {
            record.parentEmail = parentUser.email;
            record.parentCreated = parentUser.created === true;
            record.parentTemporaryPassword = parentUser.created ? parentPassword : undefined;
            await userService.createParentLink(parentUser.id, user.id);
            const accessCode = await parentAccessService.regenerateParentAccessCode(
              parentUser.id,
              schoolId
            );
            record.parentAccessCode = accessCode.accessCode;
            if (verifyEmails) {
              verificationTargets.push({ id: parentUser.id, email: parentUser.email });
            }
          }
        } catch (err: any) {
          record.parentLinkFailed = true;
          warnings.push(`${row.email}: parent account/link failed — student still created`);
        }
      }

      if (row.parent2Email) {
        try {
          const parent2Password = generateTemporaryPassword("Pa");
          const parent2User = await userService.findOrCreateUser({
            email: row.parent2Email,
            name: row.parent2Name?.trim() || row.parent2Email,
            role: "PARENT",
            schoolId,
            password: parent2Password,
            phone: row.parent2Phone,
            sendWelcomeEmail: false,
          });
          if (parent2User.role !== "PARENT") {
            warnings.push(`${row.email}: parent2 email belongs to a non-parent account`);
          } else {
            record.parent2Email = parent2User.email;
            record.parent2Created = parent2User.created === true;
            record.parent2TemporaryPassword = parent2User.created ? parent2Password : undefined;
            await userService.createParentLink(parent2User.id, user.id);
            const accessCode = await parentAccessService.regenerateParentAccessCode(
              parent2User.id,
              schoolId
            );
            record.parent2AccessCode = accessCode.accessCode;
            if (verifyEmails) {
              verificationTargets.push({ id: parent2User.id, email: parent2User.email });
            }
          }
        } catch (err: any) {
          record.parent2LinkFailed = true;
          warnings.push(`${row.email}: parent2 account/link failed — student still created`);
        }
      }

      created.push(record);
    }

    if (verifyEmails) {
      warnings.push(...(await sendVerificationEmailsInBatches(verificationTargets)));
    }

    for (const row of created) {
      if (!row.classroomCode) continue;
      try {
        const assigned = await assignStudentClassroomByCode(
          schoolId,
          row.id,
          row.classroomCode,
          classrooms
        );
        if (!assigned.ok) {
          warnings.push(
            `${row.email}: classroom "${row.classroomCode}" not found — student created without class assign`
          );
        }
      } catch {
        warnings.push(`${row.email}: classroom assign failed — student still created`);
      }
    }

    if (!created.length) {
      const err: any = new Error("No rows were imported");
      err.status = 400;
      err.code = "NO_ROWS_IMPORTED";
      err.preview = {
        ...previewPayload(validated),
        canImport: false,
        importableCount: 0,
        warnings,
        rows: validated.rows.map((row) => {
          const failure = failed.find((item) => item.index === row.index);
          return failure
            ? {
                ...row,
                ok: false,
                errors: [...new Set([...row.errors, ...failure.errors])],
              }
            : row;
        }),
      };
      err.details = { reason: "NO_ROWS_IMPORTED", failedCount: failed.length, failed, warnings };
      throw err;
    }

    return {
      ok: true,
      canImport: true,
      rowCount: rows.length,
      validCount: validated.validCount,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
      warnings,
    };
  },

  async previewStaff(schoolId: string, body: any, actorRole?: string | null) {
    const rows = extractRows(body);
    if (!rows.length) {
      return {
        ok: false,
        canImport: false,
        rowCount: 0,
        validCount: 0,
        errorCount: 0,
        warnings: [],
        rows: [{ index: 0, ok: false, errors: ["No data rows found"] }],
      };
    }
    const normalizedEmails = rows
      .map((r) => {
        const { row } = normalizeRowKeys(r, "staff");
        return String(row.email || "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean);
    const existingAll = await existingEmailSet(normalizedEmails);
    const existingEmployeeIds = await existingEmployeeIdSet(
      schoolId,
      normalizedImportEmployeeIds(rows)
    );
    const policy = await loadPasswordPolicy(schoolId);
    const result = validateStaffRows({
      rows,
      existingEmails: existingAll,
      existingEmployeeIds,
      passwordPolicy: policy,
      allowedRoles: staffRolesAllowedForActor(actorRole),
    });
    const preview = previewPayload(result);
    const headroom = await staffQuotaHeadroom(schoolId);
    if (headroom) {
      preview.importableCount = Math.min(preview.validCount, headroom.remaining);
      if (preview.validCount > headroom.remaining) {
        preview.canImport = false;
        preview.warnings = [
          ...preview.warnings,
          `Staff seat limit allows ${headroom.remaining} more staff member(s); reduce the file size or upgrade your plan.`,
        ];
      }
      if (preview.importableCount === 0) preview.canImport = false;
    }
    return preview;
  },

  async importStaff(schoolId: string, body: any, actorRole?: string | null) {
    const rows = extractRows(body);
    if (!rows.length) {
      const err: any = new Error("No data rows found");
      err.status = 400;
      err.preview = {
        ok: false,
        canImport: false,
        rowCount: 0,
        validCount: 0,
        errorCount: 0,
        warnings: [],
        rows: [{ index: 0, ok: false, errors: ["No data rows found"] }],
      };
      throw err;
    }

    const normalizedEmails = rows
      .map((r) => {
        const { row } = normalizeRowKeys(r, "staff");
        return String(row.email || "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean);
    const existingAll = await existingEmailSet(normalizedEmails);
    const existingEmployeeIds = await existingEmployeeIdSet(
      schoolId,
      normalizedImportEmployeeIds(rows)
    );
    const policy = await loadPasswordPolicy(schoolId);
    const validated = validateStaffRows({
      rows,
      existingEmails: existingAll,
      existingEmployeeIds,
      passwordPolicy: policy,
      allowedRoles: staffRolesAllowedForActor(actorRole),
    });
    if (!validated.ok) {
      const err: any = new Error("Import validation failed");
      err.status = 400;
      err.preview = previewPayload(validated);
      throw err;
    }

    const headroom = await staffQuotaHeadroom(schoolId);
    if (headroom && validated.prepared.length > headroom.remaining) {
      const err: any = new Error(`Staff seat limit allows ${headroom.remaining} more staff member(s)`);
      err.status = 403;
      err.code = "QUOTA_EXCEEDED";
      err.preview = {
        ...previewPayload(validated),
        canImport: false,
        importableCount: Math.max(0, headroom.remaining),
        warnings: [
          ...validated.warnings,
          `Staff seat limit allows ${headroom.remaining} more staff member(s); reduce the file size or upgrade your plan.`,
        ],
      };
      throw err;
    }

    const prepared = validated.prepared as PreparedStaffRow[];
    const verifyEmails = await emailAuthService.isEmailVerificationRequired();
    const created = await prisma.$transaction(
      async (tx) => {
        const out: Array<{
          id: string;
          name: string;
          email: string;
          role: string;
          temporaryPassword: string;
        }> = [];
        for (const row of prepared) {
          const clash = await tx.user.findUnique({
            where: { email: row.email },
            select: { id: true },
          });
          if (clash) {
            throw Object.assign(new Error(`email already exists: ${row.email}`), {
              status: 400,
            });
          }
          if (row.employeeId) {
            const idClash = await tx.user.findFirst({
              where: { schoolId, employeeId: row.employeeId } as any,
              select: { id: true },
            });
            if (idClash) {
              throw Object.assign(new Error(`employeeId already exists: ${row.employeeId}`), {
                status: 400,
              });
            }
          }
          const passwordHash = bcrypt.hashSync(row.temporaryPassword, 10);
          const user = await tx.user.create({
            data: {
              name: row.name,
              email: row.email,
              passwordHash,
              role: row.role,
              schoolId,
              employeeId: row.employeeId,
              department: row.department,
              designation: row.designation,
              phone: row.phone,
              address: row.address,
              dob: row.dob,
              gender: row.gender,
              joiningDate: row.joiningDate,
              documents: row.documents as any,
              customFields: row.customFields as any,
              ...temporaryPasswordFields(row.temporaryPassword),
              isActive: true,
              mustChangePassword: true,
            } as any,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          });
          out.push({ ...user, temporaryPassword: row.temporaryPassword });
        }
        return out;
      },
      { timeout: 300_000 }
    );

    const warnings = [...validated.warnings];
    if (verifyEmails) {
      warnings.push(
        ...(await sendVerificationEmailsInBatches(
          created.map((user) => ({ id: user.id, email: user.email }))
        ))
      );
    }

    return {
      ok: true,
      rowCount: rows.length,
      validCount: validated.validCount,
      createdCount: created.length,
      failedCount: 0,
      created,
      warnings,
    };
  },
};
