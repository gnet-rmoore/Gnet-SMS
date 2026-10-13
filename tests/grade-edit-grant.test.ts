/**
 * Grade edit grants — CA / Incomplete matching (unit).
 */
import assert from "node:assert/strict";
import {
  clampGrantExpiry,
  defaultExpiresAt,
  findMatchingGrant,
  GRANT_DEFAULT_DAYS,
  GRANT_MAX_DAYS,
  grantMatchesContext,
  isContinuousAssessmentComponent,
  isGradeEditGrantScope,
  isGrantActive,
  isGrantorRole,
  scopeCoversCa,
  scopeCoversIncomplete,
} from "../services/academic/src/domain/gradeEditGrant";

assert.equal(isGrantorRole("SCHOOL_ADMIN"), true);
assert.equal(isGrantorRole("TEACHER"), false);
assert.equal(isGradeEditGrantScope("CA_AND_INCOMPLETE"), true);
assert.equal(scopeCoversCa("CA"), true);
assert.equal(scopeCoversIncomplete("INCOMPLETE"), true);
assert.equal(GRANT_DEFAULT_DAYS, 14);
assert.equal(GRANT_MAX_DAYS, 30);

assert.equal(isContinuousAssessmentComponent({ componentType: "CA" }), true);
assert.equal(isContinuousAssessmentComponent({ shortCode: "CASS" }), true);
assert.equal(
  isContinuousAssessmentComponent({ label: "Continuous Assessment 1" }),
  true
);
assert.equal(isContinuousAssessmentComponent({ componentType: "FINAL" }), false);

const start = new Date("2026-07-01T00:00:00Z");
const tooLong = new Date("2026-09-01T00:00:00Z");
const clamped = clampGrantExpiry(start, tooLong);
assert.ok(clamped.getTime() <= start.getTime() + GRANT_MAX_DAYS * 86400000);
assert.ok(defaultExpiresAt(start).getTime() > start.getTime());

const grant = {
  id: "g1",
  scope: "CA",
  classId: "c1",
  subjectId: null,
  academicPeriodId: null,
  examComponentId: null,
  startsAt: new Date("2026-07-01T00:00:00Z"),
  expiresAt: new Date("2026-07-20T00:00:00Z"),
  revokedAt: null,
};
assert.equal(isGrantActive(grant, new Date("2026-07-10T00:00:00Z")), true);
assert.equal(isGrantActive(grant, new Date("2026-08-01T00:00:00Z")), false);

assert.equal(
  grantMatchesContext(
    grant,
    {
      classId: "c1",
      subjectId: "s1",
      isCaComponent: true,
      isIncompleteTarget: false,
    },
    new Date("2026-07-10T00:00:00Z")
  ),
  true
);
assert.equal(
  grantMatchesContext(
    grant,
    {
      classId: "c1",
      isCaComponent: false,
      isIncompleteTarget: true,
    },
    new Date("2026-07-10T00:00:00Z")
  ),
  false
);

const incGrant = { ...grant, id: "g2", scope: "INCOMPLETE" };
assert.ok(
  findMatchingGrant(
    [grant, incGrant],
    {
      classId: "c1",
      isCaComponent: false,
      isIncompleteTarget: true,
    },
    new Date("2026-07-10T00:00:00Z")
  )?.id === "g2"
);

console.log("grade-edit-grant: ok");
