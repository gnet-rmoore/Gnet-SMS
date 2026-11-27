/**
 * Bulk roster import domain (Identity).
 * Run: npx tsx tests/bulk-import.test.ts
 */
import { readFileSync } from "node:fs";
import { DEFAULT_SECURITY_POLICY } from "../services/identity/src/lib/securityPolicy.ts";
import {
  BULK_IMPORT_MAX_ROWS,
  filterNonEmptyRows,
  normalizeRowKeys,
  staffImportTemplateCsv,
  staffRolesAllowedForActor,
  studentImportTemplateCsv,
  validateStaffRows,
  validateStudentRows,
} from "../services/identity/src/domain/bulkImport.ts";
import { credentialsToCsv, parseCsvText } from "../src/features/bulk-import/parseSpreadsheet.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" BULK IMPORT UNIT TESTS");
console.log("=========================================\n");

const grades = [
  { id: "g7", name: "Grade 7" },
  { id: "g8", name: "Grade 8" },
];

{
  const { row } = normalizeRowKeys(
    { "Full Name": "Ada", Email: "ada@example.com", "Grade Level": "Grade 7" },
    "student"
  );
  assert(row.name === "Ada", "alias Full Name → name");
  assert(row.email === "ada@example.com", "alias Email → email");
  assert(row.gradeLevel === "Grade 7", "alias Grade Level → gradeLevel");
}

{
  const ok = validateStudentRows({
    rows: [
      { name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7" },
      { name: "Bob", email: "bob@school.test", gradeLevelId: "g8" },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(ok.ok === true, "valid student batch ok");
  assert(ok.validCount === 2, "two valid students");
  assert(ok.prepared[0].gradeLevelId === "g7", "resolve grade by name");
  assert(ok.prepared[1].gradeLevelId === "g8", "resolve grade by id");
}

{
  const parent = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        "parent email": "Parent.Example@school.test",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(parent.ok === true, "optional parentEmail accepted");
  assert(
    parent.prepared[0].parentEmail === "parent.example@school.test",
    "parentEmail normalized and prepared"
  );
}

{
  const sameEmail = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        parentEmail: "ada@school.test",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(sameEmail.ok === false, "parentEmail equal to student email rejected");
}

{
  const blocked = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        parentEmail: "teacher@school.test",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
    blockedParentEmails: new Set(["teacher@school.test"]),
  });
  assert(blocked.ok === false, "parentEmail belonging to non-parent account rejected");
}

{
  const inFileStudent = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        parentEmail: "bob@school.test",
      },
      { name: "Bob", email: "bob@school.test", gradeLevel: "Grade 7" },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(inFileStudent.ok === false, "parentEmail matching another student in file rejected");
  assert(
    inFileStudent.rows[0].errors.some((e) => e.includes("student email in this file")),
    "in-file parentEmail collision error message"
  );
}

{
  const partial = validateStudentRows({
    rows: [
      { name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7" },
      { name: "Bad", email: "bad@school.test", gradeLevel: "Unknown" },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(partial.ok === false, "partial student batch is not fully ok");
  assert(partial.canImport === true, "partial student batch can still import valid rows");
  assert(partial.validCount === 1, "partial student batch counts valid rows");
}

{
  const bad = validateStudentRows({
    rows: [
      { name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7" },
      { name: "Dup", email: "ada@school.test", gradeLevel: "Grade 7" },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(bad.ok === false, "duplicate email in file fails");
  assert(bad.rows[1].errors.some((e) => e.includes("duplicate")), "duplicate error message");
}

{
  const exists = validateStudentRows({
    rows: [{ name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7" }],
    gradeLevels: grades,
    existingEmails: new Set(["ada@school.test"]),
  });
  assert(exists.ok === false, "existing email fails");
}

{
  const missing = validateStudentRows({
    rows: [{ name: "Ada", email: "ada@school.test", gradeLevel: "Unknown" }],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(missing.ok === false, "unknown grade fails");
}

{
  const staffOk = validateStaffRows({
    rows: [
      { name: "Grace", email: "grace@school.test", role: "teacher" },
      { name: "Alan", email: "alan@school.test" },
    ],
    existingEmails: new Set(),
  });
  assert(staffOk.ok === true, "valid staff batch");
  assert(staffOk.prepared[0].role === "TEACHER", "role normalized");
  assert(staffOk.prepared[1].role === "TEACHER", "default TEACHER");
}

{
  const badRole = validateStaffRows({
    rows: [{ name: "Kid", email: "kid@school.test", role: "STUDENT" }],
    existingEmails: new Set(),
  });
  assert(badRole.ok === false, "STUDENT role rejected for staff");
}

{
  const empty = filterNonEmptyRows([
    { name: "", email: "" },
    { name: "A", email: "a@b.c" },
  ]);
  assert(empty.length === 1, "blank rows filtered");
}

assert(
  studentImportTemplateCsv().split("\n")[0] ===
    "name,email,studentIdNumber,gradeLevel,feeCohort,classroomCode",
  "student template uses only essential headers"
);
assert(
  !studentImportTemplateCsv().includes("parentEmail") &&
    !studentImportTemplateCsv().includes("documents") &&
    !studentImportTemplateCsv().includes("customFields"),
  "student template omits complex manual-only fields"
);
assert(staffImportTemplateCsv().includes("role"), "staff template has role");
assert(BULK_IMPORT_MAX_ROWS === 1500, "max rows constant");

{
  const csv = credentialsToCsv([
    {
      name: "Ada",
      email: "ada@school.test",
      role: "STUDENT",
      studentIdNumber: "STU-001",
      temporaryPassword: "Stu@12345",
      parentName: "Ada Parent",
      parentEmail: "parent@school.test",
      parentTemporaryPassword: "Par@12345",
      parentAccessCode: "123456",
      parentCreated: true,
    },
  ]);
  const lines = csv.split("\n");
  assert(lines.length === 3, "credentials CSV includes a parent row");
  assert(lines[0].includes("studentIdNumber") && lines[0].includes("parentAccessCode"), "credentials CSV has ID and access code columns");
  assert(lines[1].includes("STU-001"), "credentials CSV includes student ID");
  assert(
    lines[2].includes("parent@school.test") &&
      lines[2].includes("PARENT") &&
      lines[2].includes("123456"),
    "parent credentials include role and access code"
  );
}

{
  const atLimit = validateStudentRows({
    rows: Array.from({ length: BULK_IMPORT_MAX_ROWS }, (_, i) => ({
      name: `S${i}`,
      email: `s${i}@t.com`,
      gradeLevel: "Grade 7",
    })),
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(atLimit.ok === true, "1500 rows accepted");
  assert(atLimit.validCount === BULK_IMPORT_MAX_ROWS, "1500 rows all valid");
}

{
  const tooMany = validateStudentRows({
    rows: Array.from({ length: BULK_IMPORT_MAX_ROWS + 1 }, (_, i) => ({
      name: `S${i}`,
      email: `s${i}@t.com`,
      gradeLevel: "Grade 7",
    })),
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(tooMany.ok === false, "over 1500 rows rejected");
}

{
  const parsed = parseCsvText(
    "name,email,gradeLevel\nAda,ada@school.test,Grade 7\n\nBob,bob@school.test,Grade 8"
  );
  assert(parsed[0].__sourceRow === 2, "CSV parser records first source row");
  assert(parsed[1].__sourceRow === 4, "CSV parser preserves row number across blank rows");
}

{
  const invalid = validateStudentRows({
    rows: [
      {
        __sourceRow: 9,
        name: "Ada",
        email: "not-an-email",
        gradeLevel: "Grade 7",
        dob: "01/02/2026",
        password: "short",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
    passwordPolicy: { ...DEFAULT_SECURITY_POLICY, passwordMinLength: 10, requireStrongPassword: true },
  });
  assert(invalid.rows[0].rowNumber === 9, "validation preserves source row number");
  assert(invalid.rows[0].errors.some((e) => e.includes("email is invalid")), "invalid email rejected");
  assert(invalid.rows[0].errors.some((e) => e.includes("dob is not a valid date")), "non-ISO date rejected");
  assert(invalid.rows[0].errors.some((e) => e.includes("Password must be at least 10")), "student password policy enforced");
}

{
  const generated = validateStudentRows({
    rows: [{ name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7" }],
    gradeLevels: grades,
    existingEmails: new Set(),
    passwordPolicy: { ...DEFAULT_SECURITY_POLICY, passwordMinLength: 12, requireStrongPassword: true },
  });
  assert(generated.ok === true, "generated student password satisfies policy");
}

{
  const supplied = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        password: "Abcdefghijklmnopqrstuvwxyz123456",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
    passwordPolicy: { ...DEFAULT_SECURITY_POLICY, passwordMinLength: 32 },
  });
  assert(supplied.ok === true, "supplied password accepted even when generated password cannot satisfy policy");
}

{
  const principalRoles = staffRolesAllowedForActor("PRINCIPAL");
  const adminRoles = staffRolesAllowedForActor("SCHOOL_ADMIN");
  const blocked = validateStaffRows({
    rows: [{ name: "Kid", email: "kid@school.test", role: "SCHOOL_ADMIN" }],
    existingEmails: new Set(),
    allowedRoles: principalRoles,
  });
  const allowed = validateStaffRows({
    rows: [{ name: "Admin", email: "admin@school.test", role: "SCHOOL_ADMIN" }],
    existingEmails: new Set(),
    allowedRoles: adminRoles,
  });
  assert(blocked.ok === false, "principal cannot bulk-import SCHOOL_ADMIN");
  assert(allowed.ok === true, "school admin can bulk-import SCHOOL_ADMIN");
}

{
  const enriched = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        "Student ID": "100456",
        Section: "7A",
        parent2Name: "Second Parent",
        parent2Phone: "+2315550002",
        "parent 2 email": "second.ada@example.com",
        documents: '[{"type":"ID","url":"/docs/ada-id.pdf"}]',
        customFields: '{"house":"Blue","grade":7}',
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
    blockedParentEmails: new Set(),
  });
  assert(enriched.ok === true, "schema-backed student fields accepted");
  assert(enriched.prepared[0].studentIdNumber === "100456", "studentIdNumber prepared");
  assert(enriched.prepared[0].classroomCode === "7A", "section alias maps to classroomCode");
  assert(enriched.prepared[0].parent2Email === "second.ada@example.com", "parent2Email prepared");
  assert(enriched.prepared[0].documents?.[0]?.url === "/docs/ada-id.pdf", "documents JSON prepared");
  assert(enriched.prepared[0].customFields?.house === "Blue", "customFields JSON prepared");
}

{
  const duplicateId = validateStudentRows({
    rows: [
      { name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7", studentIdNumber: "100456" },
      { name: "Bob", email: "bob@school.test", gradeLevel: "Grade 7", studentIdNumber: "100456" },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(
    duplicateId.rows.some((r) => r.errors.includes("duplicate studentIdNumber in this file")),
    "duplicate studentIdNumber in file rejected"
  );

  const existingId = validateStudentRows({
    rows: [
      { name: "Ada", email: "ada@school.test", gradeLevel: "Grade 7", studentIdNumber: "100456" },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
    existingStudentIds: new Set(["100456"]),
  });
  assert(
    existingId.rows[0].errors.includes("studentIdNumber already exists"),
    "existing studentIdNumber rejected"
  );
}

{
  const badJson = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        documents: "not-json",
        customFields: "[]",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(
    badJson.rows[0].errors.some((e) => e.includes("documents must be valid JSON")),
    "invalid documents JSON rejected"
  );
  assert(
    badJson.rows[0].errors.some((e) => e.includes("customFields must be a JSON object")),
    "non-object customFields rejected"
  );
}

{
  const parent2Conflict = validateStudentRows({
    rows: [
      {
        name: "Ada",
        email: "ada@school.test",
        gradeLevel: "Grade 7",
        parentEmail: "parent.ada@example.com",
        parent2Email: "parent.ada@example.com",
      },
    ],
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(
    parent2Conflict.rows[0].errors.includes("parent2Email must be different from parentEmail"),
    "duplicate guardian emails rejected"
  );
}

{
  const staff = validateStaffRows({
    rows: [
      {
        name: "Grace",
        email: "grace@school.test",
        role: "TEACHER",
        employeeId: "emp-1001",
        department: "Science",
        position: "Head of Science",
        documents: '[{"type":"CV","url":"/docs/grace-cv.pdf"}]',
        customFields: '{"emergencyContact":"+2315550004"}',
      },
    ],
    existingEmails: new Set(),
  });
  assert(staff.ok === true, "schema-backed staff fields accepted");
  assert(staff.prepared[0].employeeId === "EMP-1001", "employeeId normalized and prepared");
  assert(staff.prepared[0].department === "Science", "department prepared");
  assert(staff.prepared[0].designation === "Head of Science", "position maps to designation");
  assert(staff.prepared[0].documents?.[0]?.type === "CV", "staff documents JSON prepared");

  const duplicateEmployee = validateStaffRows({
    rows: [
      { name: "A", email: "a@school.test", role: "TEACHER", employeeId: "EMP-1001" },
      { name: "B", email: "b@school.test", role: "TEACHER", employeeId: "EMP-1001" },
    ],
    existingEmails: new Set(),
  });
  assert(
    duplicateEmployee.rows.some((r) => r.errors.includes("duplicate employeeId in this file")),
    "duplicate employeeId in file rejected"
  );

  const existingEmployee = validateStaffRows({
    rows: [{ name: "A", email: "a@school.test", role: "TEACHER", employeeId: "EMP-1001" }],
    existingEmails: new Set(),
    existingEmployeeIds: new Set(["EMP-1001"]),
  });
  assert(
    existingEmployee.rows[0].errors.includes("employeeId already exists"),
    "existing employeeId rejected"
  );
}

{
  const studentHeader = studentImportTemplateCsv().split("\n")[0];
  const staffHeader = staffImportTemplateCsv().split("\n")[0];
  assert(
    ["name", "email", "studentIdNumber", "gradeLevel", "feeCohort", "classroomCode"].every(
      (field) => studentHeader.includes(field)
    ),
    "student template includes only import-ready fields"
  );
  assert(
    ["employeeId", "department", "designation", "documents", "customFields"].every((field) =>
      staffHeader.includes(field)
    ),
    "staff template includes schema-backed fields"
  );

  const studentTemplate = validateStudentRows({
    rows: parseCsvText(studentImportTemplateCsv()),
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(studentTemplate.ok === true, "student template row validates");

  const staffTemplate = validateStaffRows({
    rows: parseCsvText(staffImportTemplateCsv()),
    existingEmails: new Set(),
  });
  assert(staffTemplate.ok === true, "staff template row validates");
}

{
  const csv = credentialsToCsv([
    {
      name: "Ada",
      email: "ada@school.test",
      role: "STUDENT",
      studentIdNumber: "100456",
      temporaryPassword: "StudentPass1!",
      parent2Name: "Second Parent",
      parent2Email: "second.ada@example.com",
      parent2Created: true,
      parent2TemporaryPassword: "ParentPass1!",
      parent2AccessCode: "ABC123",
    },
  ]);
  const header = csv.split("\n")[0];
  assert(header.includes("parent2Email") && header.includes("parent2AccessCode"), "credentials CSV includes parent2 columns");
  assert(csv.includes("second.ada@example.com") && csv.includes("ABC123"), "credentials CSV includes parent2 credentials");
}

{
  const schema = readFileSync("services/identity/prisma/schema.prisma", "utf8");
  const migration = readFileSync(
    "services/identity/prisma/migrations/20261126130000_add_bulk_import_profile_fields/migration.sql",
    "utf8"
  );
  const service = readFileSync("services/identity/src/services/bulkImportService.ts", "utf8");
  assert(
    ["employeeId", "department", "designation", "documents", "customFields"].every((field) =>
      schema.includes(field)
    ),
    "identity schema includes import profile fields"
  );
  assert(
    migration.includes("employeeId") &&
      migration.includes("documents") &&
      migration.includes("customFields"),
    "migration adds import profile columns"
  );
  assert(
    service.includes("studentIdNumber: row.studentIdNumber") &&
      service.includes("employeeId: row.employeeId") &&
      service.includes("parent2Email"),
    "service persists schema-backed import fields"
  );
}

{
  const routes = readFileSync("services/identity/src/routes/userRoutes.ts", "utf8");
  const staffRoutesStart = routes.indexOf("/api/schools/:schoolId/staff/import/template.csv");
  const staffRoutes = routes.slice(staffRoutesStart, staffRoutesStart + 1400);
  assert(
    staffRoutes.includes('requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SUPER_ADMIN"])') &&
      !staffRoutes.includes('requireCapability("action.bulk_import.roster"'),
    "staff import uses dedicated role gate with super-admin bypass"
  );

  const staffPage = readFileSync("src/pages/School/StaffManagement.tsx", "utf8");
  assert(
    staffPage.includes('user?.role === "SUPER_ADMIN"') &&
      staffPage.includes("canImportStaff"),
    "staff import UI allows super admin"
  );

  const service = readFileSync("services/identity/src/services/bulkImportService.ts", "utf8");
  assert(service.includes("staffQuotaHeadroom(schoolId)"), "staff import checks staff quota");
  assert(
    service.includes("reduce the file size or upgrade your plan"),
    "staff quota preview matches import all-or-nothing behavior"
  );
  assert(
    service.includes("emailAuthService.sendVerificationEmail"),
    "bulk import sends verification emails when required"
  );

  const controller = readFileSync("services/identity/src/controllers/userController.ts", "utf8");
  assert(
    controller.includes("bulk_staff_imported") && controller.includes("bulk_staff_import_failed"),
    "staff import writes audit events"
  );
}

{
  const appSrc = readFileSync("services/identity/src/app.ts", "utf8");
  assert(
    appSrc.includes('express.json({ limit: "20mb" })') &&
      appSrc.includes('express.urlencoded({ extended: true, limit: "20mb" })'),
    "identity accepts full-size roster payloads"
  );

  const gateway = readFileSync("services/gateway/src/server.ts", "utf8");
  assert(
    gateway.includes("createApiProxy(300_000)") &&
      gateway.includes("IMPORT_PATH.test(pathnameOf(req))") &&
      gateway.includes('IMPORT_PATH = /^\\/api\\/schools\\/[^/]+\\/(?:students|staff)\\/import(?:\\/|$)/'),
    "bulk imports get a longer proxy timeout"
  );

  const service = readFileSync("services/identity/src/services/bulkImportService.ts", "utf8");
  assert(
    service.includes("sendVerificationEmailsInBatches") &&
      service.includes("Promise.allSettled"),
    "verification emails are sent in parallel batches"
  );
  assert(
    service.includes("row.classroomCode,\n          classrooms"),
    "classrooms are loaded once per student import"
  );

  const modal = readFileSync("src/features/bulk-import/ImportRosterModal.tsx", "utf8");
  assert(
    modal.includes("onImported?.(result)") && modal.includes("setRowCount(result.rowCount"),
    "import modal reports the full result to callers"
  );
  assert(
    !modal.includes("failures.slice(0, 8)") && !modal.includes("importWarnings.slice(0, 5)"),
    "import modal shows every skipped row and warning"
  );

  const studentsPage = readFileSync("src/features/students/Page.tsx", "utf8");
  const staffPage = readFileSync("src/pages/School/StaffManagement.tsx", "utf8");
  const registrarPage = readFileSync("src/features/registrar/Page.tsx", "utf8");
  assert(
    [studentsPage, staffPage, registrarPage].every((src) =>
      src.includes("result.createdCount ?? result.created.length")
    ),
    "import success messages include the created record count"
  );
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll bulk-import tests passed.");
