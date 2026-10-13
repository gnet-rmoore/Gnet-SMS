/**
 * Business-day helpers (aligned with Staff service leave validation).
 * Run: npx tsx tests/business-days.test.ts
 */
import { businessDaysBetween } from "../src/features/staff-portal/utils/dateHelpers";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

// Mon Aug 3 – Fri Aug 7 2026 = 5 business days
assert(
  businessDaysBetween("2026-08-03", "2026-08-07") === 5,
  "Mon–Fri same week"
);

// Sat–Sun only still counts as 1 (server minimum)
assert(
  businessDaysBetween("2026-08-08", "2026-08-09") === 1,
  "weekend minimum one day"
);

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All business-days tests passed");
