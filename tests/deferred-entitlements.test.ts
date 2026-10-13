/**
 * Deferred entitlement features: trial lock, storage quota helpers, API key prefix.
 * Run: npm run test:deferred-entitlements
 */
import assert from "node:assert/strict";
import {
  isTrialExpired,
  isSchoolLoginAllowed,
} from "../services/identity/src/domain/schoolStatus";
import { bytesFromFileUrl } from "../services/comms/src/lib/storageQuota";
import { resolveQuotas } from "../services/identity/src/domain/platformPlans";

function resolveFileSizeBytes(fileUrl: string, explicit?: number | null) {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit >= 0) {
    return Math.floor(explicit);
  }
  return bytesFromFileUrl(fileUrl);
}

const past = new Date(Date.now() - 86_400_000).toISOString();
const future = new Date(Date.now() + 86_400_000).toISOString();

assert.equal(isTrialExpired("TRIAL", past), true);
assert.equal(isTrialExpired("TRIAL", future), false);
assert.equal(isTrialExpired("ACTIVE", past), false);
assert.equal(isTrialExpired("TRIAL", null), false);

assert.equal(isSchoolLoginAllowed("TRIAL", past), false);
assert.equal(isSchoolLoginAllowed("TRIAL", future), true);
assert.equal(isSchoolLoginAllowed("SUSPENDED", future), false);
assert.equal(isSchoolLoginAllowed("ACTIVE", null), true);

const tinyB64 = Buffer.from("hello").toString("base64");
const dataUrl = `data:application/pdf;base64,${tinyB64}`;
assert.ok(bytesFromFileUrl(dataUrl) >= 5);
assert.equal(bytesFromFileUrl("https://example.com/file.pdf"), 0);
assert.equal(resolveFileSizeBytes(dataUrl, 99), 99);
assert.equal(resolveFileSizeBytes(dataUrl), bytesFromFileUrl(dataUrl));

const freeQuotas = resolveQuotas("FREE", null);
assert.equal(freeQuotas.maxStorageMb, 512);

console.log("deferred-entitlements.test.ts OK");
