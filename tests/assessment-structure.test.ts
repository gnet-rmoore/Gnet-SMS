/**
 * Assessment structure helpers.
 * Run: npx tsx tests/assessment-structure.test.ts
 */
import {
  computeAssessmentTotal,
  parseAssessmentStructure,
  activeStructureWeightTotal,
  DEFAULT_ASSESSMENT_STRUCTURE,
  resolveEffectiveAssessmentStructure,
  ensureUniqueStructureColumnIds,
  structureColumnsFingerprint,
  defaultMaxScoreForColumn,
} from "../src/lib/assessmentStructure.ts";
import { DEFAULT_GRADEBOOK_CONFIG, serializeGradebookConfig } from "../src/lib/gradebookConfig.ts";
import { letterFromScore } from "../src/lib/gradeLegend.ts";

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
console.log(" ASSESSMENT STRUCTURE TESTS");
console.log("=========================================\n");

const defaults = parseAssessmentStructure(null);
assert(defaults.columns.length === 4, "default structure has 4 columns");
assert(
  Math.abs(activeStructureWeightTotal(defaults.columns) - 100) < 0.01,
  "default weights sum to 100"
);

const total = computeAssessmentTotal(
  { hw: 8, qz: 9, cw: 7, exam: 30 },
  DEFAULT_ASSESSMENT_STRUCTURE
);
assert(total !== null && total > 70 && total < 80, `weighted total plausible: ${total}`);

const partial = computeAssessmentTotal({ hw: 10, qz: null }, DEFAULT_ASSESSMENT_STRUCTURE);
assert(
  partial !== null && partial === 100,
  "renormalizes when only hw filled (10/10 = 100%)"
);

const empty = computeAssessmentTotal({}, DEFAULT_ASSESSMENT_STRUCTURE);
assert(empty === null, "empty scores → null total");

const custom = parseAssessmentStructure(
  JSON.stringify([{ id: "a", shortCode: "A", label: "A", weightPct: 100, isActive: true }])
);
assert(custom.columns[0].shortCode === "A", "parses custom JSON");

const schoolConfigRaw = serializeGradebookConfig(DEFAULT_GRADEBOOK_CONFIG);
const fromSchool = resolveEffectiveAssessmentStructure({
  schoolGradebookConfigRaw: schoolConfigRaw,
  structureCustom: false,
});
assert(fromSchool.columns.length === 5, "school template yields 5 columns");
assert(fromSchool.source === "school", "source is school when template present");

const threeHwConfig = JSON.stringify([
  { id: "hw1", code: "HW1", name: "Homework 1", weightPct: 15, isActive: true },
  { id: "hw2", code: "HW2", name: "Homework 2", weightPct: 15, isActive: true },
  { id: "hw3", code: "HW3", name: "Homework 3", weightPct: 10, isActive: true },
  { id: "qz", code: "QZ", name: "Quizzes", weightPct: 20, isActive: true },
  { id: "fin", code: "FIN", name: "Final", weightPct: 40, isActive: true },
]);

const staleStored = JSON.stringify(DEFAULT_GRADEBOOK_CONFIG.categories);
const liveSchoolWins = resolveEffectiveAssessmentStructure({
  componentStructureRaw: staleStored,
  schoolGradebookConfigRaw: threeHwConfig,
  structureCustom: false,
});
assert(liveSchoolWins.columns.length === 5, "live school template beats stale stored copy");
assert(liveSchoolWins.source === "school", "source school when not custom");

const customRaw = JSON.stringify([
  { id: "proj", shortCode: "PROJ", label: "Project", weightPct: 100, isActive: true },
]);
const customResolved = resolveEffectiveAssessmentStructure({
  componentStructureRaw: customRaw,
  schoolGradebookConfigRaw: schoolConfigRaw,
  structureCustom: true,
});
assert(customResolved.columns.length === 1, "explicit custom assessment structure wins");
assert(customResolved.source === "assessment", "source assessment for custom override");

const dupIds = ensureUniqueStructureColumnIds([
  { id: "HW", shortCode: "HW", label: "HW 1", weightPct: 50, isActive: true },
  { id: "HW", shortCode: "HW", label: "HW 2", weightPct: 50, isActive: true },
]);
assert(dupIds[0].id !== dupIds[1].id, "duplicate ids get disambiguated");

const iprepConfig = `[{"shortCode":"HW","code":"HW1","label":"Homework 1","name":"Homework 1","weightPct":10,"id":"homework","isActive":true},{"shortCode":"NEW","code":"HW2","label":"Homework  2","name":"Homework  2","weightPct":10,"id":"col_1784743021391","isActive":true},{"shortCode":"NEW","code":"HW3","label":"Homework 3","name":"Homework 3","weightPct":0,"id":"col_1784894860196","isActive":true},{"shortCode":"NEW","code":"QZ1","label":"Quiz 1","name":"Quiz 1","weightPct":10,"id":"col_1784743081479","isActive":true},{"shortCode":"QZ","code":"QZ2","label":"Quiz 2","name":"Quiz 2","weightPct":10,"id":"quizzes","isActive":true},{"shortCode":"CW","code":"CW","label":"Class Work","name":"Class Work","weightPct":10,"id":"classwork","isActive":true},{"shortCode":"MID","code":"MID","label":"Midterm Exam","name":"Midterm Exam","weightPct":20,"id":"midterm","isActive":true},{"shortCode":"FIN","code":"FIN","label":"Final Exam","name":"Final Exam","weightPct":30,"id":"final","isActive":true}]`;

const iprepResolved = resolveEffectiveAssessmentStructure({
  componentStructureRaw: JSON.stringify(DEFAULT_ASSESSMENT_STRUCTURE),
  schoolGradebookConfigRaw: iprepConfig,
  structureCustom: false,
});
assert(iprepResolved.columns.length === 8, "iprep school template yields 8 columns");
assert(iprepResolved.source === "school", "iprep uses school source");
assert(
  iprepResolved.columns.some((c) => (c.code || c.shortCode) === "HW2"),
  "iprep includes HW2 column"
);
const fp1 = structureColumnsFingerprint(fromSchool.columns);
const fp2 = structureColumnsFingerprint(fromSchool.columns);
assert(fp1 === fp2, "structure fingerprint is stable");

// iprep screenshot: raw points → weighted % total and letter
const iprepCols = iprepResolved.columns;
const iprepScores: Record<string, number> = {
  [iprepCols.find((c) => c.code === "HW1")!.id]: 6,
  [iprepCols.find((c) => c.code === "HW2")!.id]: 5,
  [iprepCols.find((c) => c.code === "HW3")!.id]: 8,
  [iprepCols.find((c) => c.code === "QZ1")!.id]: 10,
  [iprepCols.find((c) => c.code === "QZ2")!.id]: 9,
  [iprepCols.find((c) => c.code === "CW")!.id]: 7,
  [iprepCols.find((c) => c.code === "MID")!.id]: 15,
  [iprepCols.find((c) => c.code === "FIN")!.id]: 23,
};
const iprepTotal = computeAssessmentTotal(iprepScores, iprepCols);
assert(
  iprepTotal !== null && iprepTotal >= 75 && iprepTotal <= 80,
  `iprep raw-point total ~76.6: ${iprepTotal}`
);
const iprepLetter = letterFromScore(iprepTotal!, null, "CLASS");
assert(iprepLetter === "C", `iprep letter for ~76.6 is C: ${iprepLetter}`);

assert(defaultMaxScoreForColumn({ id: "x", shortCode: "HW1", weightPct: 10 }) === 10, "HW max 10");
assert(defaultMaxScoreForColumn({ id: "x", shortCode: "FIN", weightPct: 30, componentType: "FINAL" }) === 25, "FIN max 25");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All assessment-structure tests passed");
