/**
 * Optional starter pack after school provision (Phase A3).
 * Best-effort: failures are logged, provisioning still succeeds.
 */
const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:3015";
const FINANCE_URL = process.env.FINANCE_URL || "http://localhost:3016";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export async function seedStarterPack(schoolId: string) {
  try {
    const seedRes = await fetch(`${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels/seed`, {
      method: "POST",
      headers: headers(),
    });
    if (!seedRes.ok) {
      // Fall back to one-by-one create for older academic builds
      const defaultLevels = [
        "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
        "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
      ];
      const existingRes = await fetch(`${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels`, {
        method: "GET",
        headers: headers(),
      });
      const existing = (await existingRes.json()).map((g: any) => g.name.toLowerCase());
      const toCreate = defaultLevels.filter((l) => !existing.includes(l.toLowerCase()));

      for (const name of toCreate) {
        await fetch(`${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ name }),
        });
      }
    }
  } catch (err: any) {
    console.warn("[starter-pack] grade seed skipped:", err.message);
  }

  try {
    await fetch(`${FINANCE_URL}/api/internal/fees`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        schoolId,
        studentId: `catalog:entrance:${schoolId}`,
        amount: 0,
        type: "ENTRANCE_CATALOG",
        status: "PENDING",
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      }),
    });
  } catch (err: any) {
    console.warn("[starter-pack] fee catalog seed skipped:", err.message);
  }
}
