/**
 * Parent grades authorization — fail-closed link check contract.
 * Mirrors Academic examController PARENT gate via Identity assert-link.
 */

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

/** Same fail-closed semantics as academic identityClient.assertParentLinked. */
async function assertParentLinked(
  fetchImpl: typeof fetch,
  parentId: string,
  studentId: string
): Promise<boolean> {
  try {
    const res = await fetchImpl(
      `http://identity/api/internal/parents/${encodeURIComponent(parentId)}/students/${encodeURIComponent(studentId)}/assert-link`,
      { headers: {} }
    );
    return res.status === 204;
  } catch {
    return false;
  }
}

async function run() {
  const linked = await assertParentLinked(
    async () => ({ status: 204 } as Response),
    "parent-1",
    "student-1"
  );
  assert(linked === true, "PARENT linked to student → allow grades");

  const unlinked = await assertParentLinked(
    async () => ({ status: 403 } as Response),
    "parent-1",
    "other-student"
  );
  assert(unlinked === false, "PARENT not linked → deny grades (IDOR closed)");

  const down = await assertParentLinked(
    async () => {
      throw new Error("network");
    },
    "parent-1",
    "student-1"
  );
  assert(down === false, "Identity unavailable → fail closed");

  if (failed > 0) {
    console.error(`\n${failed} parent-grades auth assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll parent-grades auth checks passed");
}

run();
