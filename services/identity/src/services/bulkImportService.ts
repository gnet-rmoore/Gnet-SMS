import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { fetchSchoolGradeLevelsInternal } from "../lib/academicClient";
import { parseSecurityPolicy, DEFAULT_SECURITY_POLICY } from "../lib/securityPolicy";
import {
  filterNonEmptyRows,
  normalizeRowKeys,
  staffImportTemplateCsv,
  studentImportTemplateCsv,
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

async function loadGradeLevels(schoolId: string) {
  const raw = await fetchSchoolGradeLevelsInternal(schoolId);
  const list = Array.isArray(raw) ? raw : raw?.gradeLevels || raw?.data || [];
  return (list as any[])
    .map((g) => ({ id: String(g.id), name: String(g.name || "") }))
    .filter((g) => g.id && g.name);
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
  classroomCode: string
): Promise<{ ok: boolean }> {
  const code = String(classroomCode || "").trim();
  if (!code) return { ok: false };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  const listRes = await fetch(`${CLASSROOM_URL}/api/internal/schools/${schoolId}/classrooms`, {
    headers,
  });
  if (!listRes.ok) return { ok: false };
  const list = await listRes.json();
  const classrooms = Array.isArray(list) ? list : [];
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

  async previewStudents(schoolId: string, body: any) {
    const rows = extractRows(body);
    if (!rows.length) {
      return {
        ok: false,
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
    const normalizedEmails = rows
      .map((r) => {
        const { row } = normalizeRowKeys(r, "student");
        return String(row.email || "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean);
    const existingAll = await existingEmailSet(normalizedEmails);

    const result = validateStudentRows({
      rows,
      gradeLevels,
      existingEmails: existingAll,
    });
    return previewPayload(result);
  },

  async importStudents(schoolId: string, body: any) {
    const rows = extractRows(body);
    if (!rows.length) {
      const err: any = new Error("No data rows found");
      err.status = 400;
      err.preview = {
        ok: false,
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

    const normalizedEmails = rows
      .map((r) => {
        const { row } = normalizeRowKeys(r, "student");
        return String(row.email || "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean);
    const existingAll = await existingEmailSet(normalizedEmails);

    const validated = validateStudentRows({
      rows,
      gradeLevels,
      existingEmails: existingAll,
    });
    if (!validated.ok) {
      const err: any = new Error("Import validation failed");
      err.status = 400;
      err.preview = previewPayload(validated);
      throw err;
    }

    const prepared = validated.prepared as PreparedStudentRow[];
    const created = await prisma.$transaction(
      async (tx) => {
        const out: Array<{
          id: string;
          name: string;
          email: string;
          role: string;
          gradeLevelId: string | null;
          feeCohort: string | null;
          temporaryPassword: string;
          classroomCode?: string | null;
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
          const passwordHash = bcrypt.hashSync(row.temporaryPassword, 10);
          const user = await tx.user.create({
            data: {
              name: row.name,
              email: row.email,
              passwordHash,
              role: "STUDENT",
              schoolId,
              dob: row.dob,
              gender: row.gender,
              phone: row.phone,
              address: row.address,
              parentName: row.parentName,
              parentPhone: row.parentPhone,
              gradeLevelId: row.gradeLevelId,
              feeCohort: row.feeCohort,
              mustChangePassword: true,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              gradeLevelId: true,
              feeCohort: true,
            },
          });
          out.push({
            ...user,
            temporaryPassword: row.temporaryPassword,
            classroomCode: row.classroomCode,
          });
        }
        return out;
      },
      { timeout: 120_000 }
    );

    const classroomWarnings: string[] = [];
    for (const row of created) {
      if (!row.classroomCode) continue;
      try {
        const assigned = await assignStudentClassroomByCode(schoolId, row.id, row.classroomCode);
        if (!assigned.ok) {
          classroomWarnings.push(
            `${row.email}: classroom "${row.classroomCode}" not found — student created without class assign`
          );
        }
      } catch {
        classroomWarnings.push(`${row.email}: classroom assign failed — student still created`);
      }
    }

    return {
      ok: true,
      createdCount: created.length,
      created,
      warnings: [...validated.warnings, ...classroomWarnings],
    };
  },

  async previewStaff(schoolId: string, body: any) {
    const rows = extractRows(body);
    if (!rows.length) {
      return {
        ok: false,
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
    const policy = await loadPasswordPolicy(schoolId);
    const result = validateStaffRows({
      rows,
      existingEmails: existingAll,
      passwordPolicy: policy,
    });
    return previewPayload(result);
  },

  async importStaff(schoolId: string, body: any) {
    const rows = extractRows(body);
    if (!rows.length) {
      const err: any = new Error("No data rows found");
      err.status = 400;
      err.preview = {
        ok: false,
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
    const policy = await loadPasswordPolicy(schoolId);
    const validated = validateStaffRows({
      rows,
      existingEmails: existingAll,
      passwordPolicy: policy,
    });
    if (!validated.ok) {
      const err: any = new Error("Import validation failed");
      err.status = 400;
      err.preview = previewPayload(validated);
      throw err;
    }

    const prepared = validated.prepared as PreparedStaffRow[];
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
          const passwordHash = bcrypt.hashSync(row.temporaryPassword, 10);
          const user = await tx.user.create({
            data: {
              name: row.name,
              email: row.email,
              passwordHash,
              role: row.role,
              schoolId,
              phone: row.phone,
              address: row.address,
              dob: row.dob,
              gender: row.gender,
              joiningDate: row.joiningDate,
              isActive: true,
              mustChangePassword: true,
            },
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
      { timeout: 120_000 }
    );

    return {
      ok: true,
      createdCount: created.length,
      created,
    };
  },
};
