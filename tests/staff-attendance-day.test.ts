/**
 * Staff attendance day helpers.
 * Run: npx tsx tests/staff-attendance-day.test.ts
 */
import {
  dayBoundsFromYmd,
  subtractDaysFromYmd,
  ymdInTimeZone,
} from "../services/staff/src/lib/schoolDay";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const ymd = ymdInTimeZone(new Date("2026-08-05T15:00:00.000Z"), "UTC");
assert(ymd === "2026-08-05", "ymdInTimeZone UTC");

const prev = subtractDaysFromYmd("2026-08-05", 1);
assert(prev === "2026-08-04", "subtractDaysFromYmd one day");

const { start, end } = dayBoundsFromYmd("2026-08-05");
assert(start.toISOString() === "2026-08-05T00:00:00.000Z", "dayBounds start");
assert(end.toISOString() === "2026-08-06T00:00:00.000Z", "dayBounds end");

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All staff-attendance-day tests passed");
