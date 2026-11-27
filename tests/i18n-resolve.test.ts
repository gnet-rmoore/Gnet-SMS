/**
 * i18n resolve + RTL helpers.
 * Run: npx tsx tests/i18n-resolve.test.ts
 */
import {
  DEFAULT_LOCALE,
  isAppLocale,
  localeDir,
  localeMeta,
  normalizeLocale,
  resolveEffectiveLocale,
  SUPPORTED_LOCALES,
} from "../src/i18n/locales.ts";
import { enResources } from "../src/i18n/catalogs/en.ts";
import { localeResources } from "../src/i18n/catalogs/translations.ts";

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
console.log(" I18N RESOLVE UNIT TESTS");
console.log("=========================================\n");

assert(isAppLocale("fr"), "fr is supported");
assert(isAppLocale("zh-Hans"), "zh-Hans is supported");
assert(!isAppLocale("pt"), "pt not in v1");
assert(normalizeLocale("zh-CN") === "zh-Hans", "zh-CN → zh-Hans");
assert(normalizeLocale("FR") === "fr", "FR → fr");
assert(localeDir("ar") === "rtl", "Arabic is RTL");
assert(localeDir("en") === "ltr", "English is LTR");

assert(
  resolveEffectiveLocale({
    userPreferred: "fr",
    schoolDefault: "en",
    stored: "de",
  }) === "fr",
  "user preferred beats school and stored (login persistence)"
);
assert(
  resolveEffectiveLocale({
    userPreferred: "fr",
  }) === "fr",
  "saved French preferred locale resolves on its own"
);
assert(
  resolveEffectiveLocale({
    userPreferred: null,
    schoolDefault: "de",
  }) === "de",
  "school default used"
);
assert(
  resolveEffectiveLocale({
    browser: "es-MX",
  }) === "es",
  "browser language mapped"
);
assert(
  resolveEffectiveLocale({}) === DEFAULT_LOCALE,
  "fallback en"
);

assert(!!enResources.nav.items.dashboard, "en nav dashboard");
assert(!!enResources.common.logout, "en logout");
assert(!!localeResources.fr.common.save, "fr save");
assert(!!localeResources.ar.nav.sections.overview, "ar overview");
assert(!!localeResources.hi.auth.login, "hi login");
assert(!!localeResources["zh-Hans"].pages.students.title, "zh students title");

for (const loc of SUPPORTED_LOCALES) {
  assert(loc.complete === true, `${loc.code} marked production-complete`);
}
assert(localeMeta("ar").dir === "rtl", "ar meta RTL");
assert(localeMeta("zh-Hans").complete, "zh-Hans complete");
assert(localeMeta("hi").complete, "hi complete");

// Production QA: high-traffic strings must not equal English for AR / ZH / HI
assert(
  localeResources.ar.auth.login !== enResources.auth.login,
  "ar auth.login translated"
);
assert(
  localeResources["zh-Hans"].auth.login !== enResources.auth.login,
  "zh-Hans auth.login translated"
);
assert(
  localeResources.hi.auth.login !== enResources.auth.login,
  "hi auth.login translated"
);
assert(
  /[\u0600-\u06FF]/.test(String(localeResources.ar.auth.login)),
  "ar auth.login uses Arabic script"
);
assert(
  /[\u4e00-\u9fff]/.test(String(localeResources["zh-Hans"].auth.login)),
  "zh-Hans auth.login uses Han script"
);
assert(
  /[\u0900-\u097F]/.test(String(localeResources.hi.auth.login)),
  "hi auth.login uses Devanagari"
);
assert(
  localeResources.ar.pages.students.title !== enResources.pages.students.title,
  "ar students.title translated"
);
assert(
  localeResources["zh-Hans"].pages.fees.title !== enResources.pages.fees.title,
  "zh-Hans fees.title translated"
);
assert(
  localeResources.hi.pages.settings.title !== enResources.pages.settings.title,
  "hi settings.title translated"
);

// Key parity: each locale has top-level namespaces
for (const code of ["fr", "ar", "es", "de", "zh-Hans", "hi"] as const) {
  for (const ns of Object.keys(enResources)) {
    assert(
      !!(localeResources[code] as any)[ns],
      `${code} has namespace ${ns}`
    );
  }
}

assert(
  typeof (enResources.pages as any).facilities?.chromeEyebrow === "string" &&
    !(enResources.pages as any).facilities.chromeEyebrow.includes("."),
  "en facilities.chromeEyebrow is human copy"
);
assert(
  typeof (enResources.pages as any).workOrders?.list?.ordersTitle === "string",
  "en workOrders.list.ordersTitle present"
);
const manualAdmission = (enResources.pages as any).admissions?.manualAdmission;
assert(
  typeof manualAdmission?.title === "string",
  "en admissions.manualAdmission.title present"
);
assert(
  typeof manualAdmission?.drawerTitle === "string" &&
    typeof manualAdmission?.applicantType === "string" &&
    typeof manualAdmission?.form?.changedFromExisting === "string",
  "enrollment drawer and changed-field copy present"
);
assert(
  typeof (enResources.pages as any).studentPhoto?.requirements === "string" &&
    typeof (enResources.pages as any).studentPhoto?.invalidType === "string" &&
    typeof (enResources.pages as any).studentPhoto?.tooLargeAfterCompression === "string",
  "student photo validation copy present"
);
assert(
  typeof (enResources.pages as any).admissions?.onlineRegistration?.copyLink === "string",
  "en admissions.onlineRegistration.copyLink present"
);
assert(
  typeof (enResources.pages as any).curriculum?.divisions?.title === "string",
  "en curriculum.divisions.title present"
);
for (const code of ["fr", "ar", "es", "de", "zh-Hans", "hi"] as const) {
  const curriculum = (localeResources[code] as any).pages?.curriculum;
  assert(
    typeof curriculum?.gradeLevelModal?.noSectionNames === "string" &&
      typeof curriculum?.gradeLevelModal?.noComposedNames === "string" &&
      typeof curriculum?.subjectModal?.noComposedNames === "string",
    `${code} curriculum validation copy present`
  );
}
assert(
  typeof (enResources.pages as any).classSchedule?.modals?.class === "string",
  "en classSchedule.modals.class present"
);
assert(
  (enResources.pages as any).apiDocs?.modeSandbox === "Sandbox",
  "en apiDocs.modeSandbox label present"
);
assert(
  (enResources.pages as any).apiDocs?.modeProduction === "Production",
  "en apiDocs.modeProduction label present"
);
for (const code of ["fr", "ar", "es", "de", "zh-Hans", "hi"] as const) {
  const apiDocs = (localeResources[code] as any).pages?.apiDocs;
  assert(typeof apiDocs?.modeSandbox === "string", `${code} apiDocs.modeSandbox label present`);
  assert(typeof apiDocs?.modeProduction === "string", `${code} apiDocs.modeProduction label present`);
}

const review = (enResources.pages as any).admissions?.review;
assert(typeof review?.stage?.stepOf === "string", "en admissions.review.stage.stepOf present");
assert(typeof review?.stage?.historyTitle === "string", "en admissions.review.stage.historyTitle present");
assert(typeof review?.stage?.returnToCurrent === "string", "en admissions.review.stage.returnToCurrent present");
assert(typeof review?.stage?.browsePrevious === "string", "en admissions.review.stage.browsePrevious present");
assert(typeof review?.stage?.saveAndClose === "string", "en admissions.review.stage.saveAndClose present");
assert(typeof review?.stage?.feeNotRequired === "string", "en admissions.review.stage.feeNotRequired present");
assert(typeof review?.stage?.submitted?.primary === "string", "en admissions.review.stage.submitted.primary present");
assert(typeof review?.stage?.review?.returnToReview === "string", "en admissions.review.stage.review.returnToReview present");
assert(typeof review?.stage?.approved?.approve === "string", "en admissions.review.stage.approved.approve present");
assert(typeof review?.stage?.enrolled?.confirmPlacement === "string", "en admissions.review.stage.enrolled.confirmPlacement present");
assert(typeof review?.blocker?.FEE_REQUIRED === "string", "en admissions.review.blocker.FEE_REQUIRED present");
assert(typeof review?.blocker?.CLASSROOM_REQUIRED === "string", "en admissions.review.blocker.CLASSROOM_REQUIRED present");
assert(typeof review?.blocker?.fallback === "string", "en admissions.review.blocker.fallback present");
for (const reason of ["NOT_ENROLLED", "ENTRANCE_NOT_COMPLETED", "STUDENT_RECORD_MISSING", "STUDENT_INACTIVE", "STUDENT_SCHOOL_MISMATCH", "fallback"]) {
  assert(typeof review?.documentReason?.[reason] === "string", `en admissions.review.documentReason.${reason} present`);
}
assert(typeof review?.confirm?.reject?.confirm === "string", "en admissions.review.confirm.reject.confirm present");
assert(typeof review?.confirm?.dirtyClose?.save === "string", "en admissions.review.confirm.dirtyClose.save present");
assert(typeof review?.confirm?.dirtyClose?.discard === "string", "en admissions.review.confirm.dirtyClose.discard present");
assert(typeof review?.confirm?.dirtyClose?.cancel === "string", "en admissions.review.confirm.dirtyClose.cancel present");
assert(typeof review?.entranceCompletionTitle === "string", "en admissions.review.entranceCompletionTitle present");
assert(typeof review?.markEntranceComplete === "string", "en admissions.review.markEntranceComplete present");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll i18n-resolve tests passed.");
