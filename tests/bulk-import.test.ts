/**
 * Bulk roster import domain (Identity).
 * Run: npx tsx tests/bulk-import.test.ts
 */
import {
  BULK_IMPORT_MAX_ROWS,
  filterNonEmptyRows,
  normalizeRowKeys,
  staffImportTemplateCsv,
  studentImportTemplateCsv,
  validateStaffRows,
  validateStudentRows,
} from "../services/identity/src/domain/bulkImport.ts";

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

assert(studentImportTemplateCsv().includes("gradeLevel"), "student template has gradeLevel");
assert(staffImportTemplateCsv().includes("role"), "staff template has role");
assert(BULK_IMPORT_MAX_ROWS === 500, "max rows constant");

{
  const tooMany = validateStudentRows({
    rows: Array.from({ length: 501 }, (_, i) => ({
      name: `S${i}`,
      email: `s${i}@t.com`,
      gradeLevel: "Grade 7",
    })),
    gradeLevels: grades,
    existingEmails: new Set(),
  });
  assert(tooMany.ok === false, "over 500 rows rejected");
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll bulk-import tests passed.");
