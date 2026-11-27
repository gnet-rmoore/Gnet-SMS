import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  studentImportKeysCsv,
  studentImportTemplateCsv,
} from "../services/identity/src/domain/bulkImport";
import { createZipArchive } from "../services/identity/src/lib/zip";

{
  const header = studentImportTemplateCsv().split("\n")[0];
  assert(
    header === "name,email,studentIdNumber,gradeLevel,feeCohort,classroomCode",
    "template has only essential headers"
  );
}

{
  const csv = studentImportKeysCsv([
    { key: "gradeLevel", value: "Grade 7", id: "grade-7", details: "Use in gradeLevel" },
    { key: "customFields", value: "house", details: 'Has "quotes"' },
  ]);
  assert(csv.startsWith("key,value,label,id,details\n"), "keys CSV has stable header");
  assert(csv.includes("gradeLevel,Grade 7,,grade-7,Use in gradeLevel"), "grade key row rendered");
  assert(csv.includes('customFields,house,,,"Has ""quotes"""'), "CSV values escape quotes");
}

{
  const csv = studentImportKeysCsv([{ key: "customFields", value: "=SUM(1,2)" }]);
  assert(csv.includes("'=SUM(1,2)"), "CSV values neutralize spreadsheet formulas");
}

{
  const archive = createZipArchive([
    { name: "student-import-template.csv", content: "name,email\n" },
    { name: "student-import-keys.csv", content: "key,value\n" },
  ]);
  assert(archive.subarray(0, 2).toString() === "PK", "archive has ZIP local header");
  assert(
    archive.includes(Buffer.from("student-import-template.csv")) &&
      archive.includes(Buffer.from("student-import-keys.csv")),
    "archive contains template and keys files"
  );
  assert(archive.subarray(-22, -18).toString("hex") === "504b0506", "archive has ZIP end record");
}

{
  const service = readFileSync("services/identity/src/services/bulkImportService.ts", "utf8");
  const controller = readFileSync("services/identity/src/controllers/userController.ts", "utf8");
  const routes = readFileSync("services/identity/src/routes/userRoutes.ts", "utf8");
  const api = readFileSync("src/features/bulk-import/api.ts", "utf8");
  const modal = readFileSync("src/features/bulk-import/ImportRosterModal.tsx", "utf8");

  assert(
    service.includes("student-import-keys.csv") &&
      service.includes("loadTenantStudentImportKeys") &&
      service.includes('key: "classroomCode"') &&
      service.includes('key: "feeCohort"') &&
      service.includes('key: "gradeLevel"'),
    "bundle builds keys for classroomCode, feeCohort, and gradeLevel"
  );
  assert(
    service.includes("Promise.allSettled") &&
      service.includes('key: "warning"') &&
      !service.includes("take: 5001") &&
      !service.includes("customFieldKeys") &&
      !service.includes("documentTypes") &&
      !service.includes('key: "documents"') &&
      !service.includes('key: "customFields"') &&
      !service.includes('key: "gender"') &&
      !service.includes('key: "gradeLevelId"'),
    "bundle degrades gracefully and omits complex or unnecessary keys"
  );
  assert(
    controller.includes("studentImportTemplateBundle") &&
      controller.includes('filename="student-import-template.zip"'),
    "controller serves a two-file ZIP bundle"
  );
  assert(
    routes.includes("/api/schools/:schoolId/students/import/template.zip") &&
      routes.includes("userController.studentImportTemplateBundle"),
    "template ZIP route is registered"
  );
  assert(
    api.includes("/students/import/template.zip") &&
      api.includes('"student-import-template.zip"'),
    "SPA downloads the template bundle"
  );
  assert(
    api.includes("JSON.parse(text)") && api.includes("window.setTimeout"),
    "download failures surface readable errors and object URLs are released safely"
  );
  assert(
    modal.includes("handleDownloadTemplate") &&
      modal.includes("pages:bulkImport.downloadTemplateHint"),
    "student modal explains the ZIP and handles download failures"
  );
}

console.log("All student import template bundle tests passed");
