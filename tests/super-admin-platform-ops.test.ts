/**
 * Platform plans + SA operator capabilities (Phases C/E/F).
 */
import assert from "node:assert/strict";
import {
  resolveEntitlements,
  resolvePlan,
  resolveQuotas,
  isPlatformPlanCode,
  listPlatformPlans,
  computeLedgerMrrUsd,
  isBillingStatus,
  setRuntimePlansCatalog,
  sanitizePlanCode,
  normalizeFeatureKeys,
  needsFeatureCatalogExpansion,
} from "../services/identity/src/domain/platformPlans";
import {
  capabilitiesForSaRole,
  saHasCapability,
  assertSaCapability,
  SaCapabilityDeniedError,
  normalizeSaPlatformRole,
  saCapabilityLabel,
} from "../services/identity/src/domain/saCapabilities";
import {
  emptyHeadcounts,
  headcountsFromRoleGroups,
} from "../services/identity/src/domain/superAdminDirectory";
import {
  filterBroadcastRecipients,
  summarizeBroadcastFanOut,
} from "../services/identity/src/domain/broadcastFanOut";

assert.equal(isPlatformPlanCode("PREMIUM"), true);
assert.equal(isPlatformPlanCode("NOPE"), false);
assert.equal(resolvePlan("TRIAL").trialDays, 30);
assert.ok(listPlatformPlans({ activeOnly: true }).every((p) => p.isActive !== false));
assert.ok(listPlatformPlans({ activeOnly: true }).length >= 5);
assert.equal(resolvePlan("FREE").monthlyPriceUsd, 0);
assert.equal(resolvePlan("STANDARD").monthlyPriceUsd, 99);
assert.equal(resolvePlan("PREMIUM").monthlyPriceUsd, 249);
assert.equal(resolvePlan("ENTERPRISE").monthlyPriceUsd, 599);
assert.ok(resolvePlan("ENTERPRISE").features.includes("admissions"));
assert.ok(resolvePlan("ENTERPRISE").features.includes("library"));
assert.ok(resolvePlan("ENTERPRISE").features.includes("transport"));
assert.ok(resolvePlan("STANDARD").features.includes("gradebook"));
assert.ok(resolvePlan("STANDARD").features.includes("admissions"));
assert.ok(!resolvePlan("FREE").features.includes("api_access"));
assert.ok(resolvePlan("PREMIUM").features.includes("api_access"));
assert.ok(resolvePlan("PREMIUM").features.includes("library"));
assert.ok(!resolvePlan("STANDARD").features.includes("custom_domain"));
assert.ok(resolvePlan("ENTERPRISE").features.includes("custom_domain"));

assert.equal(sanitizePlanCode(" custom-pro "), "CUSTOM_PRO");
assert.deepEqual(normalizeFeatureKeys(["core", "nope", "finance", "admissions"]), [
  "core",
  "finance",
  "admissions",
]);
assert.equal(needsFeatureCatalogExpansion(["core", "finance"]), true);
assert.equal(needsFeatureCatalogExpansion(["core", "admissions", "gradebook"]), false);

setRuntimePlansCatalog([
  {
    code: "STANDARD",
    label: "Standard edited",
    description: "x",
    maxStudents: 10,
    maxStaff: 2,
    maxStorageMb: 100,
    features: ["core"],
    monthlyPriceUsd: 42,
    isActive: true,
    sortOrder: 0,
  },
]);
assert.equal(resolvePlan("STANDARD").monthlyPriceUsd, 42);
assert.equal(resolvePlan("STANDARD").label, "Standard edited");
setRuntimePlansCatalog(null);
assert.equal(resolvePlan("STANDARD").monthlyPriceUsd, 99);

assert.equal(
  computeLedgerMrrUsd([
    { planCode: "STANDARD", billingStatus: "ACTIVE_PAID" },
    { planCode: "PREMIUM", billingStatus: "ACTIVE_PAID" },
    { planCode: "ENTERPRISE", billingStatus: "COMP" },
    { planCode: "STANDARD", billingStatus: "TRIAL" },
  ]),
  99 + 249
);
assert.equal(computeLedgerMrrUsd([]), 0);
assert.equal(isBillingStatus("ACTIVE_PAID"), true);
assert.equal(isBillingStatus("NOPE"), false);

const entitlements = resolveEntitlements("FREE", null);
assert.ok(entitlements.includes("core"));
assert.ok(!entitlements.includes("api_access"));
assert.ok(resolveEntitlements("ENTERPRISE", null).includes("custom_domain"));

const overridden = resolveEntitlements("FREE", JSON.stringify(["core", "api_access"]));
assert.deepEqual(overridden.sort(), ["api_access", "core"]);

const quotas = resolveQuotas("STANDARD", JSON.stringify({ maxStudents: 10 }));
assert.equal(quotas.maxStudents, 10);
assert.equal(quotas.maxStaff, resolvePlan("STANDARD").maxStaff);

assert.equal(normalizeSaPlatformRole(null), "OWNER");
assert.equal(normalizeSaPlatformRole("support"), "SUPPORT");
assert.equal(saHasCapability("ANALYST", "plans.manage"), false);
assert.equal(saHasCapability("BILLING", "plans.manage"), true);
assert.equal(saHasCapability("SUPPORT", "impersonate"), true);
assert.equal(saHasCapability("OWNER", "schools.delete"), true);
assert.ok(capabilitiesForSaRole("OWNER").includes("operators.manage"));

assert.equal(saCapabilityLabel("schools.read"), "View schools");
assert.equal(saCapabilityLabel("unknown.key"), "Unknown Key");
assert.throws(
  () => assertSaCapability("ANALYST", "impersonate"),
  (err: unknown) =>
    err instanceof SaCapabilityDeniedError &&
    err.message.includes("Impersonate school users") &&
    !err.message.includes("impersonate")
);

const map = headcountsFromRoleGroups([
  { schoolId: "a", role: "STUDENT", _count: { _all: 3 } },
  { schoolId: "a", role: "TEACHER", _count: { _all: 1 } },
]);
assert.equal(map.get("a")!.studentCount, 3);
assert.deepEqual(emptyHeadcounts().userCount, 0);

const recipients = filterBroadcastRecipients([
  { email: "a@x.com", role: "SCHOOL_ADMIN", isActive: true, schoolId: "s1" },
  { email: "b@x.com", role: "SCHOOL_ADMIN", isActive: false, schoolId: "s1" },
  { email: "c@x.com", role: "TEACHER", isActive: true, schoolId: "s1" },
  { email: "d@x.com", role: "SCHOOL_ADMIN", isActive: true, schoolId: null },
]);
assert.deepEqual(recipients, [{ email: "a@x.com", schoolId: "s1" }]);

const fan = summarizeBroadcastFanOut([
  { email: "a@x.com", ok: true, provider: "console" },
  { email: "b@x.com", ok: false, error: "boom" },
]);
assert.equal(fan.sent, 1);
assert.equal(fan.failed, 1);
assert.equal(fan.queued, 2);

console.log("super-admin-platform-ops: ok");
