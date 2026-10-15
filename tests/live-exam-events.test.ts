/**
 * Live exam realtime event bus + room naming (Phase 2).
 * Run: npx tsx tests/live-exam-events.test.ts
 */
import {
  PROCTOR_ROLES,
  attemptRoom,
  emitLiveExamEvent,
  examRoom,
  isProctorRole,
  onLiveExamEvent,
} from "../services/academic/src/lib/liveExamEvents.ts";

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
console.log(" LIVE EXAM EVENT BUS TESTS");
console.log("=========================================\n");

// --- room naming ---
assert(examRoom("e1") === "exam:e1", "exam room name");
assert(attemptRoom("a1") === "attempt:a1", "attempt room name");

// --- role gating ---
for (const role of PROCTOR_ROLES) {
  assert(isProctorRole(role), `proctor role: ${role}`);
}
assert(!isProctorRole("STUDENT"), "student is not a proctor");
assert(!isProctorRole("SUPER_ADMIN"), "super admin is not a proctor role");

// --- onLiveExamEvent filters by examId ---
const seen: string[] = [];
const off = onLiveExamEvent("exam-1", (e) => seen.push(e.type));
emitLiveExamEvent({
  type: "attempt.started",
  payload: { examId: "exam-1", attemptId: "a1", studentId: "s1", startedAt: new Date() },
});
emitLiveExamEvent({
  type: "attempt.started",
  payload: { examId: "exam-2", attemptId: "a2", studentId: "s2", startedAt: new Date() },
});
assert(seen.length === 1 && seen[0] === "attempt.started", "only matching examId is delivered");

off();
emitLiveExamEvent({
  type: "attempt.answered",
  payload: { examId: "exam-1", attemptId: "a1", answeredCount: 3 },
});
assert(seen.length === 1, "unsubscribe stops delivery");

console.log(`\n${failed === 0 ? "All live-event checks passed" : `${failed} check(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
