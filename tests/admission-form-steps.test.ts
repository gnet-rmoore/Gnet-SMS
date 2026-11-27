/**
 * Admission wizard stage flow: data-entry steps stay separate from review/submit.
 * Run: npx tsx tests/admission-form-steps.test.ts
 */
import { readFileSync } from "fs";
import path from "path";
import {
  ADMISSION_FORM_STEPS,
  emptyAdmissionApplicationForm,
  firstStepWithErrors,
  hasPriorSchoolingDetails,
  validateAdmissionForm,
  validateAdmissionStep,
  type AdmissionFieldsMode,
} from "../src/features/admission-form/schema";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

console.log("=== admission-form-steps ===");

assert(
  ADMISSION_FORM_STEPS.join() === "student,guardians,schooling,review",
  "wizard has four stages: student, guardians, schooling, review"
);
assert(ADMISSION_FORM_STEPS.at(-1) === "review", "review is the final stage");

const modes: AdmissionFieldsMode[] = ["staff", "public-new", "public-returning"];
for (const mode of modes) {
  const form = emptyAdmissionApplicationForm();
  assert(
    Object.keys(validateAdmissionStep("schooling", form, mode)).length === 0,
    `${mode}: schooling is an explicit, optional-data stage`
  );
  assert(
    Object.keys(validateAdmissionStep("review", form, mode)).length === 0,
    `${mode}: review stage has no editable field errors`
  );
}

const publicForm = emptyAdmissionApplicationForm();
const results = validateAdmissionForm(publicForm, "public-new");
assert(!results.schooling && !results.review, "form validation never invents schooling/review errors");
assert(firstStepWithErrors(results) === "student", "first invalid stage is still student");

const blankSchooling = emptyAdmissionApplicationForm();
assert(!hasPriorSchoolingDetails(blankSchooling), "blank schooling needs no details");
assert(
  !hasPriorSchoolingDetails({
    ...blankSchooling,
    previousSchool: "   ",
    gradeCompleted: "\t",
    notes: "\n",
  }),
  "whitespace-only schooling still needs acknowledgement"
);
assert(
  hasPriorSchoolingDetails({ ...blankSchooling, previousSchool: "Greenwood Primary" }),
  "prior school counts as schooling details"
);
assert(
  hasPriorSchoolingDetails({ ...blankSchooling, notes: "None" }),
  "notes count as schooling details"
);

const wizard = read("src/features/admission-form/AdmissionFormWizard.tsx");
assert(
  wizard.includes("if (stepIndex !== total - 1) return;"),
  "submit is guarded to the final review stage"
);
assert(
  wizard.includes("{!isFinalStep ? (") && wizard.includes("studentPhotoSlot={studentPhotoSlot}"),
  "editable fields are not rendered on the review stage"
);
assert(wizard.includes("{isFinalStep ? finalStepExtra : null}"), "captcha moves to the review stage");
assert(
  wizard.includes("const isFinalStep = stepIndex === total - 1;"),
  "final-stage flag is derived from the step list"
);
assert(
  (wizard.match(/type="submit"/g) || []).length === 1,
  "only one submit control, shown on review"
);
assert(
  wizard.includes("if (!schoolingGateSatisfied) return;"),
  "blank stage 3 cannot advance until acknowledged"
);
assert(
  wizard.includes("disabled={submitting || !schoolingGateSatisfied}"),
  "stage 3 Next is disabled until acknowledged"
);
assert(
  wizard.includes('step === "schooling" ? (') && wizard.includes("schoolingHint"),
  "stage 3 renders its own guidance"
);
assert(
  wizard.includes("checked={schoolingAcknowledged}") &&
    wizard.includes("schoolingAcknowledgement"),
  "stage 3 renders the acknowledgement checkbox"
);

const fields = read("src/features/admission-form/AdmissionApplicationFields.tsx");
assert(
  fields.includes('const showSchooling = step === "all" || step === "schooling";'),
  "schooling inputs belong to their own stage"
);
assert(
  fields.includes(
    'sectionHeader(\n              "1",\n              t("admissions.manualAdmission.form.section.personalDetails")'
  ) &&
    fields.includes(
      'sectionHeader(\n              "2",\n              t("admissions.manualAdmission.form.section.parentsGuardians")'
    ) &&
    fields.includes(
      'sectionHeader(\n            "3",\n            t("admissions.manualAdmission.form.section.priorSchooling")'
    ),
  "section badges follow wizard stages 1-3"
);
assert(!fields.includes('sectionHeader(\n            "4",'), "no stale stage 4 section badge");

const en = read("src/i18n/catalogs/en.ts");
assert(en.includes('schooling: "Schooling"') && en.includes('review: "Review"'), "English stage labels are distinct");
assert(
  en.includes("schoolingHint:") && en.includes("schoolingAcknowledgement:"),
  "English stage 3 guidance is present"
);

const expectedLabels: Record<string, string> = {
  ar: "المراجعة",
  de: "Prüfung",
  es: "Revisión",
  fr: "Révision",
  hi: "समीक्षा",
  "zh-Hans": "审核",
};
for (const [code, label] of Object.entries(expectedLabels)) {
  const locale = read(`src/i18n/catalogs/locales/${code}.ts`);
  assert(locale.includes(`"review": "${label}"`), `${code}: review stage label is translated`);
  assert(
    locale.includes('"schoolingHint":') && locale.includes('"schoolingAcknowledgement":'),
    `${code}: stage 3 guidance is translated`
  );
}

const wizardData = read("scripts/i18n-data/common-admission-wizard.json");
assert(
  wizardData.includes('["Review",') && wizardData.includes('["Schooling",'),
  "translation memory carries both stage labels"
);
assert(
  wizardData.includes(
    '["Add any previous school, completed grade, or notes. Leave blank if not applicable.",'
  ) &&
    wizardData.includes('["I have checked this step and have no prior schooling details to add.",'),
  "translation memory carries stage 3 guidance"
);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("All admission-form-steps tests passed");
