/**
 * Unit tests for audit taxonomy + UA parsing (SA System Logs wave 1).
 */
import assert from "node:assert/strict";
import {
  inferAuditCategory,
  normalizeAuditLevel,
} from "../services/identity/src/domain/auditCategories";
import { parseUserAgent, clientIpFromReq } from "../services/identity/src/utils/userAgent";

assert.equal(normalizeAuditLevel("WARN"), "WARNING");
assert.equal(normalizeAuditLevel("warning"), "WARNING");
assert.equal(normalizeAuditLevel("INFO"), "INFO");
assert.equal(normalizeAuditLevel("nope"), "INFO");

assert.equal(inferAuditCategory("AUTH", "login_success"), "AUTH");
assert.equal(inferAuditCategory("AUTH", "logout"), "SESSION");
assert.equal(inferAuditCategory("USERS", "user_created"), "USER_MGMT");
assert.equal(inferAuditCategory("ROLES", "role_assigned"), "ROLE");
assert.equal(inferAuditCategory("SECURITY", "rate_limit_exceeded"), "SECURITY");
assert.equal(inferAuditCategory("SCHOOLS", "tenant_suspended"), "SCHOOLS");
assert.equal(inferAuditCategory("SUPER_ADMIN", "impersonation_start"), "SUPER_ADMIN");
assert.equal(inferAuditCategory("SETTINGS", "api_key_added"), "SETTINGS");
assert.equal(inferAuditCategory("SUPER_ADMIN", "dsr_export"), "EXPORT");

const chromeWin = parseUserAgent(
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
);
assert.equal(chromeWin.deviceType, "Desktop");
assert.ok(chromeWin.browser?.startsWith("Chrome"));
assert.ok(chromeWin.os?.includes("Windows"));

const iphone = parseUserAgent(
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
);
assert.equal(iphone.deviceType, "Mobile");
assert.ok(iphone.browser?.startsWith("Safari"));

assert.equal(clientIpFromReq({ headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" }, ip: "9.9.9.9" }), "1.2.3.4");
assert.equal(clientIpFromReq({ ip: "10.0.0.1", headers: {} }), "10.0.0.1");

console.log("audit-system-logs: ok");
