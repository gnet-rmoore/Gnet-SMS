/**
 * Plan entitlement resolution + route mapping (runtime enforcement wave).
 */
import assert from "node:assert/strict";
import {
  resolveEntitlements,
  resolvePlan,
  resolveQuotas,
} from "../services/identity/src/domain/platformPlans";
import {
  entitlementForPath,
  entitlementForRouteSegment,
} from "../src/lib/routeEntitlements";
import { hasEntitlement, hasPlanAccess } from "../src/lib/entitlements";

assert.ok(!resolvePlan("FREE").features.includes("gradebook"));
assert.ok(resolvePlan("TRIAL").features.includes("gradebook"));
assert.ok(!resolvePlan("FREE").features.includes("finance"));
assert.ok(resolvePlan("STANDARD").features.includes("finance"));

const freeEnt = resolveEntitlements("FREE", null);
assert.ok(hasEntitlement(freeEnt, "core"));
assert.ok(!hasEntitlement(freeEnt, "gradebook"));
assert.ok(hasPlanAccess(freeEnt, "calendar"));
assert.ok(!hasPlanAccess(freeEnt, "finance"));

assert.equal(entitlementForRouteSegment("gradebook"), "gradebook");
assert.equal(entitlementForRouteSegment("dashboard"), "core");
assert.equal(entitlementForPath("/demo-school/gradebook", "demo-school"), "gradebook");
assert.equal(entitlementForPath("/demo-school/fees", "demo-school"), "finance");

const quotas = resolveQuotas("FREE", null);
assert.equal(quotas.maxStudents, 50);
assert.equal(quotas.maxStaff, 10);

console.log("entitlements-enforcement.test.ts OK");
