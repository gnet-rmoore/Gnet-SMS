/**
 * Lesson plan helpers (status labels, JSON parse, week math, syllabus units, share body).
 * Run: npm run test:lesson-plans
 */
import {
  addDays,
  formToPayload,
  parseActivities,
  parseObjectives,
  statusLabel,
  weekStartOf,
  emptyForm,
} from "../src/features/lesson-plans/utils.ts";
import { parseSyllabusUnits } from "../services/academic/src/lib/lessonShare.ts";
import { buildLessonMaterialBody } from "../services/academic/src/lib/lessonShare.ts";

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
console.log(" LESSON PLAN UTILS TESTS");
console.log("=========================================\n");

assert(statusLabel("SUBMITTED") === "In review", "status SUBMITTED label");
assert(statusLabel("APPROVED") === "Approved", "status APPROVED label");

assert(
  JSON.stringify(parseObjectives('["a","b"]')) === JSON.stringify(["a", "b"]),
  "parse objectives JSON"
);
assert(parseObjectives("one\ntwo").length === 2, "parse objectives lines");

const acts = parseActivities(
  JSON.stringify([{ title: "Do", minutes: 5, description: "x" }, { title: "" }])
);
assert(acts.length === 2 && acts[0].title === "Do", "parse activities");

assert(weekStartOf("2026-07-23") === "2026-07-20", "week start Thu → Mon");
assert(addDays("2026-07-20", 6) === "2026-07-26", "addDays week end");

const form = emptyForm("2026-07-23");
form.title = "  Fractions  ";
form.subjectId = "s1";
form.subjectName = "Math";
form.objectives = ["Compare unit fractions", ""];
form.activities = [
  { title: "Warm discuss", minutes: 10, description: "" },
  { title: "", minutes: 5, description: "skip" },
];
form.materials = ["Cards", ""];
const payload = formToPayload(form);
assert(payload.title === "Fractions", "trim title");
assert(payload.objectives.length === 1, "filter empty objectives");
assert(payload.activities.length === 1, "filter empty activities");
assert(payload.materials.length === 1, "filter empty materials");

const units = parseSyllabusUnits(
  JSON.stringify([
    { week: "1", topic: "Intro", activities: "Read; Discuss", assessment: "Quiz" },
  ])
);
assert(units.length === 1 && units[0].topic === "Intro", "parse syllabus units");

const body = buildLessonMaterialBody({
  title: "T",
  lessonDate: "2026-07-23",
  durationMinutes: 45,
  periodLabel: "P2",
  objectives: JSON.stringify(["Learn X"]),
  warmUp: "Hook",
  activities: JSON.stringify([{ title: "Do", minutes: 10, description: "desc" }]),
  materials: JSON.stringify(["Book"]),
  assessment: "Exit ticket",
  homework: null,
  differentiation: null,
});
assert(body.includes("Objectives:"), "material body has objectives");
assert(body.includes("Do"), "material body has activity");
assert(body.includes("Exit ticket"), "material body has assessment");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All lesson-plan utils tests passed");
