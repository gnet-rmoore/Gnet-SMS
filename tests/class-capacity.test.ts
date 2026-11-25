/**
 * Class capacity regression checks.
 * Run: npx tsx tests/class-capacity.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

console.log("=========================================");
console.log(" CLASS CAPACITY TESTS");
console.log("=========================================\n");

const schema = read("services/classroom/prisma/schema.prisma");
assert(/capacity\s+Int\?/.test(schema), "classroom schema stores nullable capacity");
assert(/allowOverfill\s+Boolean/.test(schema), "classroom schema stores overfill policy");

const classroomService = read("services/classroom/src/services/classroomService.ts");
assert(classroomService.includes("FOR UPDATE"), "seat claim locks the classroom row");
assert(classroomService.includes('code: "CLASSROOM_FULL"'), "seat claim rejects full classes");
assert(
  classroomService.includes("await this.claimStudentSeat(a.classroomId, a.studentUserId)"),
  "bulk assignments enforce seat capacity"
);
assert(
  classroomService.includes("capacity: normalizeCapacity(group.capacity)"),
  "year group provisioning copies capacity"
);

const classroomRoutes = read("services/classroom/src/routes/classroomRoutes.ts");
assert(
  classroomRoutes.includes('"/api/classrooms/:id/capacity"') &&
    classroomRoutes.includes('"REGISTRAR"'),
  "registrar can update class capacity"
);

const admissionService = read("services/lifecycle/src/services/admissionService.ts");
assert(
  admissionService.includes("await assertClassroomAvailable(schoolId, String(data.classroomId)"),
  "application creation checks class availability"
);
assert(
  admissionService.includes('code: "CLASSROOM_FULL"'),
  "application creation rejects full classes"
);
assert(
  admissionService.includes("seatsLeft") && admissionService.includes("capacity !== null"),
  "public class list reports seats left"
);

const publicApply = read("src/pages/PublicApply.tsx");
assert(
  publicApply.includes("item.seatsLeft === 0") && publicApply.includes("disabled"),
  "public application disables full classes"
);

const promotionService = read("services/academic/src/services/promotionService.ts");
assert(
  promotionService.includes("capacityByKey"),
  "year transition carries capacity into new class groups"
);
assert(
  promotionService.includes("b.count < b.capacity"),
  "year transition auto-placement skips full classes"
);
assert(
  promotionService.includes("Class capacity blocked"),
  "year transition fails loudly when capacity blocks placement"
);

const yearTransitionPage = read("src/features/year-transition/Page.tsx");
assert(
  yearTransitionPage.includes("classroomIsFull") && yearTransitionPage.includes("disabled"),
  "year transition class selector disables full classes"
);

const settingsPage = read("src/features/class-capacity/Page.tsx");
assert(
  settingsPage.includes("classroomsApi.updateCapacity"),
  "capacity settings page saves through the capacity endpoint"
);
assert(
  settingsPage.includes("t(\"nav:items.classCapacity\")"),
  "capacity settings page uses the sidebar label"
);

const nav = read("src/constants/navByRole.ts");
assert(nav.includes('"class-capacity": ["SCHOOL_ADMIN", "REGISTRAR"]'), "route roles allow admin and registrar");
assert(
  (nav.match(/labelKey: "items\.classCapacity"/g) || []).length >= 2,
  "capacity link is present for school admin and registrar sidebars"
);

const capabilities = read("src/lib/capabilities.ts");
assert(
  capabilities.includes('if (cleaned === "class-capacity") return "nav.settings"'),
  "capacity route uses settings capability gate"
);

const app = read("src/App.tsx");
assert(app.includes('path="class-capacity"'), "capacity route is registered");

const en = read("src/i18n/catalogs/en.ts");
const translations = read("src/i18n/catalogs/translations.ts");
assert(en.includes('classCapacity: "Class capacity"'), "English sidebar label exists");
assert(
  (translations.match(/classCapacity:/g) || []).length >= 6,
  "capacity sidebar label is translated"
);

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All class-capacity tests passed");
