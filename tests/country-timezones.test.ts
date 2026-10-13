/**
 * Country → timezone filtering helpers.
 * Run: npx tsx tests/country-timezones.test.ts
 */
import {
  getCountryCodeByName,
  getTimezonesForCountryName,
  resolveTimezoneForCountry,
  defaultTimezoneForCountry,
  resolveCountryName,
} from "../src/lib/countryTimezones";

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
console.log(" COUNTRY / TIMEZONE UNIT TESTS");
console.log("=========================================\n");

assert(getCountryCodeByName("United Kingdom") === "GB", "UK → GB");
assert(getCountryCodeByName("United States") === "US", "US → US");
assert(getCountryCodeByName("Nigeria") === "NG", "Nigeria → NG");

const uk = getTimezonesForCountryName("United Kingdom");
assert(uk.includes("Europe/London"), "UK includes Europe/London");
assert(!uk.includes("America/New_York"), "UK excludes America/New_York");

const us = getTimezonesForCountryName("United States");
assert(us.includes("America/New_York"), "US includes America/New_York");
assert(us.includes("America/Los_Angeles"), "US includes America/Los_Angeles");
assert(!us.includes("Europe/London"), "US excludes Europe/London");

assert(
  resolveTimezoneForCountry("United States", "Europe/London") !== "Europe/London",
  "invalid TZ for US is replaced"
);
assert(
  resolveTimezoneForCountry("United States", "America/Chicago") === "America/Chicago",
  "valid TZ for US is kept"
);
assert(Boolean(defaultTimezoneForCountry("Nigeria")), "Nigeria has a default TZ");

assert(resolveCountryName("US") === "United States", "ISO US → United States");
assert(resolveCountryName("GB") === "United Kingdom", "ISO GB → United Kingdom");
assert(resolveCountryName("United States") === "United States", "name stays name");
assert(
  getTimezonesForCountryName("US").includes("America/New_York"),
  "ISO US filters timezones"
);

console.log("\n=========================================");
if (failed) {
  console.error(` ${failed} FAILED`);
  process.exit(1);
}
console.log(" ALL COUNTRY/TIMEZONE TESTS PASSED");
console.log("=========================================");
