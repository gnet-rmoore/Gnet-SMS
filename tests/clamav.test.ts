/**
 * ClamAV virus scanning tests.
 * Run: npm run test:clamav
 */
import { runVirusScan } from "../services/lifecycle/src/lib/storage.ts";
import { assertAllowedMime } from "../services/lifecycle/src/lib/storageMime.ts";
import { httpError } from "../services/lifecycle/src/lib/storage.ts";

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
console.log(" CLAMAV VIRUS SCANNING TESTS");
console.log("=========================================\n");

// Test MIME type validation
console.log("--- MIME Type Validation ---");
assert(assertAllowedMime("application/pdf") === undefined, "PDF allowed");
assert(assertAllowedMime("image/jpeg") === undefined, "JPEG allowed");
assert(assertAllowedMime("image/png") === undefined, "PNG allowed");
assert(assertAllowedMime("image/webp") === undefined, "WebP allowed");
assert(assertAllowedMime("image/gif") === undefined, "GIF allowed");

try {
  assertAllowedMime("application/exe");
  assert(false, "EXE should be rejected");
} catch (err: any) {
  assert(err.code === "INVALID_MIME", "EXE rejected with INVALID_MIME code");
}

// Test virus scanning (mock - no ClamAV running)
console.log("\n--- Virus Scan (No ClamAV) ---");
process.env.CLAMAV_URL = "";
process.env.VIRUS_SCAN_FAIL_OPEN = "true";

try {
  const result = await runVirusScan("test-key");
  assert(result === "CLEAN", "No ClamAV URL returns CLEAN (fail-open)");
} catch (err) {
  assert(false, "Should not throw with fail-open");
}

// Test fail-closed behavior
console.log("\n--- Fail-Closed Policy ---");
process.env.CLAMAV_URL = "http://invalid-clamav:8080";
process.env.VIRUS_SCAN_FAIL_OPEN = "false";

try {
  await runVirusScan("test-key");
  assert(false, "Should throw with fail-closed");
} catch (err: any) {
  assert(err.code === "SCAN_UNAVAILABLE", "Throws SCAN_UNAVAILABLE with fail-closed");
  assert(err.status === 503, "Returns 503 status");
}

// Test force infected for testing
console.log("\n--- Force Infected Test ---");
process.env.VIRUS_SCAN_FORCE_INFECTED = "true";
process.env.CLAMAV_URL = "";
process.env.VIRUS_SCAN_FAIL_OPEN = "true";

try {
  const result = await runVirusScan("test-key");
  assert(result === "INFECTED", "VIRUS_SCAN_FORCE_INFECTED returns INFECTED");
} catch (err) {
  assert(false, "Should not throw with force infected");
}

// Test MIME validation helper
console.log("\n--- MIME Validation Helper ---");
const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
for (const mime of allowed) {
  try {
    const { assertAllowedMime: testAssert } = await import("../services/lifecycle/src/lib/storageMime");
    testAssert(mime);
    console.log(`PASSED: ${mime} allowed`);
  } catch (err) {
    console.error(`FAILED: ${mime} should be allowed`);
    failed += 1;
  }
}

const disallowed = ["application/exe", "application/zip", "application/msword", "text/html"];
for (const mime of disallowed) {
  try {
    const { assertAllowedMime: testAssert } = await import("../services/lifecycle/src/lib/storageMime");
    testAssert(mime);
    console.error(`FAILED: ${mime} should be rejected`);
    failed += 1;
  } catch (err: any) {
    assert(err.code === "INVALID_MIME", `${mime} rejected with INVALID_MIME`);
  }
}

// Cleanup env
delete process.env.CLAMAV_URL;
delete process.env.VIRUS_SCAN_FAIL_OPEN;
delete process.env.VIRUS_SCAN_FORCE_INFECTED;

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All ClamAV checks passed");
console.log("=========================================");