import prisma from "../lib/prisma";

const START = 100000;

/**
 * Allocate the next permanent, digit-only student ID for a school.
 * Uses a per-school monotonic counter (StudentIdCounter) so numbers are
 * unique, sequential and never reused. No school prefix; pure digits.
 * Retries on advisory-lock conflicts to avoid duplicate allocation.
 */
export async function allocateStudentId(schoolId: string): Promise<string> {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    if (attempts > 5) {
      throw Object.assign(new Error("Could not allocate a student ID, try again"), {
        status: 503,
      });
    }
    try {
      // Reserve the counter row first (serial point of allocation).
      let counter = await prisma.studentIdCounter.findUnique({
        where: { schoolId },
      });
      if (!counter) {
        counter = await prisma.studentIdCounter.create({
          data: { schoolId, next: START },
        });
      }
      const value = counter.next;
      // Bump the counter before assigning so the number is not handed out twice.
      const updated = await prisma.studentIdCounter.update({
        where: { schoolId },
        data: { next: value + 1 },
      });
      if (updated.next !== value + 1) continue;
      const candidate = String(value);
      const exists = await prisma.user.findUnique({
        where: { studentIdNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      // Collision only possible if backfill pre-consumed a value; bump and retry.
    } catch (err: any) {
      if (err?.meta?.target && String(err.meta.target).includes("schoolId")) {
        // Concurrent create of the counter row — re-read and retry.
        continue;
      }
      throw err;
    }
  }
}

/** Assign permanent IDs to any students that are missing one (idempotent backfill). */
export async function backfillStudentIds(schoolId?: string): Promise<number> {
  const existing = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      studentIdNumber: null,
      ...(schoolId ? { schoolId } : {}),
    },
    select: { id: true, schoolId: true },
  });
  let assigned = 0;
  for (const student of existing) {
    if (!student.schoolId) continue;
    try {
      const idNumber = await allocateStudentId(student.schoolId);
      await prisma.user.update({
        where: { id: student.id },
        data: { studentIdNumber: idNumber },
      });
      assigned += 1;
    } catch (err: any) {
      console.warn(`[identity] backfill student id failed for ${student.id}:`, err?.message || err);
    }
  }
  return assigned;
}
