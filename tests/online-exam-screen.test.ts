/**
 * Live screen view policy helpers (Phase 3).
 * Run: npx tsx tests/online-exam-screen.test.ts
 */
import {
  capturesScreen,
  computeFrameExpiry,
  isFrameExpired,
  proctorFrameStorageKey,
  resolveFrameIntervalMs,
  resolveRetentionDays,
  shouldCaptureScreen,
} from "../services/academic/src/lib/onlineExamScreen.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" ONLINE EXAM SCREEN VIEW TESTS");
console.log("=========================================\n");

// --- capturesScreen only for SCREEN_VIEW ---
assert(capturesScreen("SCREEN_VIEW"), "SCREEN_VIEW captures");
assert(!capturesScreen("MONITOR"), "MONITOR does not capture");
assert(!capturesScreen("OFF"), "OFF does not capture");
assert(!capturesScreen(null), "null does not capture");
assert(capturesScreen("screen_view"), "case-insensitive");

// --- interval clamping ---
assert(resolveFrameIntervalMs(null) === 15000, "default interval 15s");
assert(resolveFrameIntervalMs({ screenFrameIntervalMs: 1000 }) === 5000, "clamps low to 5s");
assert(resolveFrameIntervalMs({ screenFrameIntervalMs: 999999 }) === 120000, "clamps high to 120s");
assert(resolveFrameIntervalMs({ screenFrameIntervalMs: 20000 }) === 20000, "honours in-range value");
assert(resolveFrameIntervalMs({ screenFrameIntervalMs: "abc" }) === 15000, "non-numeric → default");

// --- retention ---
assert(resolveRetentionDays(undefined) === 7, "default retention 7 days");
assert(resolveRetentionDays(0) === 7, "zero retention → default");
assert(resolveRetentionDays(999) === 90, "retention clamps to 90");
assert(resolveRetentionDays(3) === 3, "honours in-range retention");

// --- expiry math ---
const at = new Date("2026-01-01T00:00:00Z");
const exp = computeFrameExpiry(at, 7);
assert(exp.getTime() === at.getTime() + 7 * 86400000, "expiry = captured + retention");
assert(isFrameExpired(exp, new Date(exp.getTime() + 1)), "past expiry is expired");
assert(!isFrameExpired(exp, at), "before expiry is not expired");

// --- storage key ---
const key = proctorFrameStorageKey({
  schoolId: "sch1",
  examId: "ex1",
  attemptId: "at1",
  at,
  ext: "jpg",
});
assert(
  key === "proctor-frames/sch1/ex1/at1/1767225600000.jpg",
  "deterministic storage key"
);
assert(
  proctorFrameStorageKey({
    schoolId: "s",
    examId: "e",
    attemptId: "a",
    at,
    ext: "weird/.png",
  }).endsWith(".png"),
  "sanitizes extension"
);

// --- capture gating ---
assert(
  shouldCaptureScreen({ proctorLevel: "SCREEN_VIEW", consented: true, storageEnabled: true }),
  "captures when SCREEN_VIEW + consent + storage"
);
assert(
  !shouldCaptureScreen({ proctorLevel: "SCREEN_VIEW", consented: false, storageEnabled: true }),
  "no capture without consent"
);
assert(
  !shouldCaptureScreen({ proctorLevel: "MONITOR", consented: true, storageEnabled: true }),
  "no capture for MONITOR even with consent"
);
assert(
  !shouldCaptureScreen({ proctorLevel: "SCREEN_VIEW", consented: true, storageEnabled: false }),
  "no capture without storage"
);

console.log(`\n${failed === 0 ? "All screen-view checks passed" : `${failed} check(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
