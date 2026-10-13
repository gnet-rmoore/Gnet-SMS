/**
 * Family campus portal — fail-closed parent link check (mirrors grades gate).
 */
import { createAssert } from "./helpers/assert.ts";

const { assert, summary } = createAssert();

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
  assert(
    (await assertParentLinked(async () => ({ status: 204 } as Response), "p1", "s1")) === true,
    "Linked parent can view child campus summary"
  );
  assert(
    (await assertParentLinked(async () => ({ status: 403 } as Response), "p1", "s2")) === false,
    "Unlinked parent denied campus summary (IDOR closed)"
  );
  assert(
    (await assertParentLinked(async () => {
      throw new Error("down");
    }, "p1", "s1")) === false,
    "Identity unavailable → fail closed"
  );
  summary("parent-my-campus-auth");
}

run();
