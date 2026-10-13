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
assert(
  typeof (enResources.pages as any).admissions?.manualAdmission?.title === "string",
  "en admissions.manualAdmission.title present"
);
assert(
  typeof (enResources.pages as any).admissions?.onlineRegistration?.copyLink === "string",
  "en admissions.onlineRegistration.copyLink present"
);
assert(
  typeof (enResources.pages as any).curriculum?.divisions?.title === "string",
  "en curriculum.divisions.title present"
);
assert(
  typeof (enResources.pages as any).classSchedule?.modals?.class === "string",
  "en classSchedule.modals.class present"
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll i18n-resolve tests passed.");
