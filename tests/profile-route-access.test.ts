/**
 * Profile / account routes must not be capability-gated.
 * Run: npx tsx tests/profile-route-access.test.ts
 */
import assert from "node:assert/strict";
import { pathCapabilityFromLocation } from "../src/components/ProtectedRoute";
import { hasCapability } from "../src/lib/capabilities";

const slug = "demo-school";
const teacherCaps = [
  "nav.dashboard",
  "nav.classroom",
  "nav.students",
  "nav.gradebook",
];

assert.equal(
  pathCapabilityFromLocation(`/${slug}/profile`, slug),
  null,
  "profile path is not capability-gated"
);

assert.equal(
  pathCapabilityFromLocation(`/${slug}/dashboard`, slug),
  "nav.dashboard"
);

assert.equal(
  pathCapabilityFromLocation(`/${slug}/some-unknown-page`, slug),
  null,
  "unknown segments do not invent nav caps"
);

const profileCap = pathCapabilityFromLocation(`/${slug}/profile`, slug);
assert.ok(
  profileCap === null || hasCapability(teacherCaps, profileCap),
  "teacher is not blocked from profile by missing nav.profile"
);

console.log("profile-route-access.test.ts: ok");
