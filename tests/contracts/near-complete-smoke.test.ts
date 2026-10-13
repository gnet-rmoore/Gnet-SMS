/**
 * Near-complete plan smoke — automates manual checklist from NEAR_COMPLETE_TO_100_PLAN §5.
 * Run: npm run test:near-complete-smoke (compose gateway on :8081)
 */
import { createAssert } from "../helpers/assert.ts";
import { loginAs, clearAuthCache } from "../helpers/auth.ts";
import { apiFetch, isGatewayUp } from "../helpers/http.ts";
import { gatewayBaseUrl } from "../helpers/fixtures.ts";

const { assert, summary } = createAssert();

function isListEnvelope(json: unknown): json is {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
} {
  return (
    Boolean(json) &&
    typeof json === "object" &&
    "items" in (json as object) &&
    Array.isArray((json as { items: unknown }).items) &&
    "total" in (json as object)
  );
}

console.log("=========================================");
console.log(" NEAR-COMPLETE SMOKE (gateway)");
console.log(` base: ${gatewayBaseUrl()}`);
console.log("=========================================\n");

const up = await isGatewayUp();
if (!up) {
  console.log("SKIPPED: gateway not reachable — start compose (api-gateway on :8081)");
  process.exit(0);
}

clearAuthCache();

try {
  await loginAs("schoolAdmin");
} catch (err: any) {
  console.log(`SKIPPED: seed login failed (${err?.message || err})`);
  process.exit(0);
}

// S3 — Students / Staff page-2 server pagination envelope
try {
  const admin = await loginAs("schoolAdmin");
  const sid = admin.school!.id;

  for (const path of [
    `/api/schools/${sid}/students?page=2&pageSize=1`,
    `/api/schools/${sid}/staff?page=2&pageSize=1`,
    `/api/schools/${sid}/expenses?page=1&pageSize=5`,
    `/api/schools/${sid}/payrolls?page=1&pageSize=5`,
  ]) {
    const res = await apiFetch(path, { token: admin.accessToken });
    assert(res.status === 200, `${path} → ${res.status}`);
    assert(isListEnvelope(res.json), `${path} returns { items, total, page, pageSize }`);
    const env = res.json as { items: unknown[]; page: number; pageSize: number };
    assert(env.items.length <= env.pageSize, `${path} items.length ≤ pageSize`);
    if (path.includes("page=2")) {
      assert(env.page === 2, `${path} page=2 in response`);
    }
  }
} catch (err: any) {
  assert(false, `pagination envelope: ${err?.message || err}`);
}

// S2 — Parent my-applications
try {
  const parent = await loginAs("parent");
  const sid = parent.school!.id;
  const res = await apiFetch(`/api/schools/${sid}/my-applications`, {
    token: parent.accessToken,
  });
  assert(res.status === 200, `parent my-applications → ${res.status}`);
  const body = res.json as { items?: unknown[] } | unknown[];
  const items = Array.isArray(body) ? body : body?.items;
  assert(Array.isArray(items), "my-applications returns items array");
} catch (err: any) {
  assert(false, `parent my-applications: ${err?.message || err}`);
}

// SA paginated lists
try {
  const sa = await loginAs("superAdmin");
  for (const path of [
    "/api/super-admin/schools?page=1&pageSize=10",
    "/api/super-admin/users?page=1&pageSize=10",
  ]) {
    const res = await apiFetch(path, { token: sa.accessToken });
    assert(res.status === 200, `${path} → ${res.status}`);
    assert(isListEnvelope(res.json), `${path} returns paginated envelope`);
  }
} catch (err: any) {
  assert(false, `SA pagination: ${err?.message || err}`);
}

// S4 — End impersonation audit row
try {
  const sa = await loginAs("superAdmin");
  const endRes = await apiFetch("/api/super-admin/impersonation/end", {
    method: "POST",
    token: sa.accessToken,
  });
  assert(endRes.status === 200, `impersonation/end → ${endRes.status}`);

  const logsRes = await apiFetch(
    `/api/super-admin/logs?action=impersonation_end&pageSize=5`,
    { token: sa.accessToken }
  );
  assert(logsRes.status === 200, `logs after impersonation/end → ${logsRes.status}`);
  const logsBody = logsRes.json as { items?: { action?: string }[] } | { action?: string }[];
  const rows = Array.isArray(logsBody) ? logsBody : logsBody?.items || [];
  const hit = rows.some((r) => String(r.action || "").toLowerCase() === "impersonation_end");
  assert(hit, "impersonation_end appears in System Logs");
} catch (err: any) {
  assert(false, `impersonation end audit: ${err?.message || err}`);
}

// S1 — CAPTCHA gate when secret configured (skip when unset in dev)
if (process.env.CAPTCHA_SECRET?.trim()) {
  try {
    const res = await apiFetch("/api/public/school-registrations", {
      method: "POST",
      body: {
        schoolName: "Captcha Test School",
        slug: `captcha-test-${Date.now()}`,
        contactEmail: "captcha-test@example.com",
        country: "LR",
        timezone: "Africa/Monrovia",
      },
    });
    assert(res.status === 400, `register-school without captcha → 400 (got ${res.status})`);
    const err = (res.json as { code?: string })?.code;
    assert(err === "CAPTCHA_REQUIRED" || /captcha/i.test(String((res.json as any)?.error || "")), "CAPTCHA_REQUIRED when secret set");
  } catch (err: any) {
    assert(false, `CAPTCHA gate: ${err?.message || err}`);
  }
} else {
  console.log("SKIPPED: CAPTCHA_SECRET unset — CAPTCHA gate not enforced in this environment");
}

summary("near-complete-smoke");
