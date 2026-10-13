/**
 * Patch locale catalogs with syllabus-calendar i18n keys (English fallback).
 * Run: npx tsx scripts/patch-syllabus-calendar-i18n.ts
 */
import fs from "fs";
import path from "path";

const localesDir = path.join(process.cwd(), "src/i18n/catalogs/locales");
const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith(".ts"));

const syllabusBuilderKeys = `
        "noSubjectsConfigured": "No subjects found. Configure them under Academic subjects first.",
        "noGradesConfigured": "No grade levels found. Configure them under Grade levels first.",
        "noTeachingSubjects": "No subjects from your classrooms match this grade.",
        "noTeachingGrades": "No grade levels from your classrooms match this subject.",
        "teacherScopeHint": "Only subjects and grades from your assigned subject classrooms are listed.",
        "noTeachingRoomsTitle": "No subject classrooms assigned yet",
        "noTeachingRoomsHint": "Ask your admin to assign you to subject classrooms before submitting a syllabus plan.",
        "noTeachingRoomsCta": "Open Classrooms",
        "calendarRequired": "Set up an active academic calendar before submitting a syllabus.",
        "calendarRequiredTitle": "Academic calendar required",
        "calendarRequiredHint": "Syllabus plans must follow your school's academic calendar — terms, dates, and assessment weights.",
        "calendarRequiredCta": "Open Academic Calendar setup",
        "calendarLinked": "Linked to academic calendar",
        "calendarPeriodCount": "{{count}} terms / periods",
        "academicYearFromCalendar": "Taken from the active academic calendar.",
        "selectPeriod": "Select term / period",
        "weightsFromCalendar": "Synced from calendar",
        "customizeWeights": "Customize weights",
        "reimportWeights": "Re-import from calendar",
        "editTitle": "Edit syllabus plan",
        "resubmitForReview": "Resubmit for verification",`;

const syllabusViewKeys = `
        "calendarLink": "Academic calendar",
        "calendarLinked": "Linked to active calendar",
        "calendarNotLinked": "Not linked to calendar",
        "weightsSynced": "Weights synced from calendar",
        "editResubmit": "Edit & resubmit",`;

for (const file of localeFiles) {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('"submitForReview"')) continue;

  if (!content.includes('"calendarRequired"')) {
    content = content.replace(
      /("submitForReview":\s*"[^"]*",)\s*\n(\s*\},?\s*\n\s*"syllabusView")/,
      `$1${syllabusBuilderKeys}\n      $2`
    );
  }

  if (!content.includes('"calendarLink"')) {
    content = content.replace(
      /("reviewPlaceholder":\s*"[^"]*",)\s*\n(\s*"reject":)/,
      `$1${syllabusViewKeys}\n        $2`
    );
  }

  if (!content.includes('"editPlan"')) {
    content = content.replace(
      /("readReview":\s*"[^"]*",)\s*\n(\s*"deleteSyllabus")/,
      `$1\n        "editPlan": "Edit & resubmit",\n        $2`
    );
  }

  if (!content.includes('"syllabusResubmitted"')) {
    content = content.replace(
      /("syllabusSubmitted":\s*"[^"]*",)\s*\n(\s*"syllabusSubmitFailed")/,
      `$1\n        "syllabusResubmitted": "Syllabus updated and resubmitted for verification",\n        $2`
    );
  }

  if (!content.includes('"periodRange"')) {
    content = content.replace(
      /("jumpToday":\s*"[^"]*")\s*\n(\s*\},?\s*\n\s*"list")/,
      `$1,\n        "periodRange": "{{label}} · {{start}} – {{end}}"\n      $2`
    );
  }

  if (!content.includes('"outsideAcademicPeriod"')) {
    content = content.replace(
      /("lessonDate":\s*"[^"]*",)\s*\n(\s*"duration")/,
      `$1\n        "outsideAcademicPeriod": "This date is outside your school's academic calendar periods. You can still save — double-check the date.",\n        $2`
    );
  }

  fs.writeFileSync(filePath, content);
  console.log(`Patched ${file}`);
}

console.log("Done patching syllabus-calendar i18n keys.");
