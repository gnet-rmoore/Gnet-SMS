import { ptaService } from "../services/comms/src/services/ptaService.ts";

let failed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const originalFetch = globalThis.fetch;
const requestedOffsets: number[] = [];

globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  const offset = Number(url.searchParams.get("offset"));
  const limit = Number(url.searchParams.get("limit"));
  requestedOffsets.push(offset);
  assert(
    url.pathname === "/api/internal/schools/school-1/parents",
    "fetches school-scoped parents"
  );
  assert(url.searchParams.get("roles") === null, "does not use the generic user listing");
  assert(limit === 500, "uses bounded pages");

  const count = Math.min(limit, Math.max(503 - offset, 0));
  const users = Array.from({ length: count }, (_, index) => {
    const id = `parent-${offset + index}`;
    return {
      id,
      name: `Parent ${offset + index}`,
      email: `${id}@example.test`,
      role: "PARENT",
      schoolId: offset + index === 0 ? null : "school-1",
      isActive: true,
    };
  });
  return new Response(JSON.stringify(users), { status: 200 });
};

try {
  const parents = await ptaService.listParentOptions("school-1");
  assert(parents.length === 503, "loads parents across multiple pages");
  assert(requestedOffsets.join(",") === "0,500", "requests consecutive pages");
  assert(parents[0]?.id === "parent-0", "includes parents linked through a null schoolId");
  assert(
    Object.keys(parents[0] || {}).sort().join(",") === "email,id,name",
    "returns only parent option fields"
  );
} catch (error) {
  console.error("FAILED: PTA parent options load", error);
  failed++;
} finally {
  globalThis.fetch = originalFetch;
}

if (failed > 0) {
  process.exit(1);
}
console.log("All PTA service tests passed.");
