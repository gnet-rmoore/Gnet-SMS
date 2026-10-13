/**
 * Live HTTP smoke against api-gateway (compose). Skips when gateway is down.
 * Run: npm run test:http-smoke
 * Env: GATEWAY_URL=http://localhost:8081 (default)
 */
import { createAssert } from "../helpers/assert.ts";
import { loginAs, clearAuthCache } from "../helpers/auth.ts";
import { apiFetch, expectStatus, isGatewayUp } from "../helpers/http.ts";
import { gatewayBaseUrl } from "../helpers/fixtures.ts";
import { SMOKE_POLICIES, type Policy } from "./policies.ts";

const { assert, summary } = createAssert();

function statusMatches(got: number, expect: Policy["expect"]): boolean {
  return Array.isArray(expect) ? expect.includes(got) : got === expect;
}

async function resolvePath(policy: Policy): Promise<{ path: string; token: string | null }> {
  let path = policy.path;
  let token: string | null = null;
  let schoolId = "unknown";

  if (policy.asRole !== "anon") {
    const session = await loginAs(policy.asRole);
    token = session.accessToken;
    schoolId = session.school?.id || schoolId;
  } else if (path.includes(":schoolId")) {
    // Need a real school id for path shape; borrow from admin login.
    const session = await loginAs("schoolAdmin");
    schoolId = session.school!.id;
  }

  path = path.replace(":schoolId", schoolId);
  if (policy.query) path += (path.includes("?") ? "&" : "?") + policy.query;
  return { path, token: policy.asRole === "anon" ? null : token };
}

console.log("=========================================");
console.log(" HTTP SMOKE (gateway)");
console.log(` base: ${gatewayBaseUrl()}`);
console.log("=========================================\n");

const up = await isGatewayUp();
if (!up) {
  console.log("SKIPPED: gateway not reachable — start compose (api-gateway on :8081)");
  process.exit(0);
}

clearAuthCache();

// Probe seed login once — skip suite if demo users are missing
try {
  await loginAs("schoolAdmin");
} catch (err: any) {
  console.log(
    `SKIPPED: seed login failed (${err?.message || err}). ` +
      "Ensure identity seed users exist (schooladmin@yoursms.com / admin123)."
  );
  process.exit(0);
}

for (const policy of SMOKE_POLICIES) {
  try {
    const { path, token } = await resolvePath(policy);
    const res = await apiFetch(path, {
      method: policy.method,
      token,
      body: policy.body,
    });
    const ok = statusMatches(res.status, policy.expect);
    assert(
      ok,
      `${policy.id} ${policy.method} ${path} → ${res.status} (want ${JSON.stringify(policy.expect)})`
    );
    if (!ok) {
      console.error(`  body: ${res.text.slice(0, 200)}`);
    }
  } catch (err: any) {
    assert(false, `${policy.id} threw: ${err?.message || err}`);
  }
}

// P0: leave spoof — teacher list must not include foreign userId filter effect
try {
  const teacher = await loginAs("teacher");
  const admin = await loginAs("schoolAdmin");
  const sid = teacher.school!.id;
  const res = await apiFetch(
    `/api/schools/${sid}/leave-requests?userId=${admin.user.id}`,
    { token: teacher.accessToken }
  );
  expectStatus(res, 200, "teacher leave spoof status");
  const rows = Array.isArray(res.json) ? res.json : (res.json as any)?.data || [];
  const foreign = rows.filter((r: any) => r.userId && r.userId === admin.user.id);
  assert(
    foreign.length === 0 || rows.every((r: any) => r.userId === teacher.user.id),
    "teacher leave list ignores spoofed userId (self-scoped)"
  );
} catch (err: any) {
  assert(false, `leave spoof check: ${err?.message || err}`);
}

summary("http-smoke");
