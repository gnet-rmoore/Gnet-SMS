/**
 * Pure rules for the school question bank.
 *
 * Two concerns, encoded once for both the service and the UI:
 *  1. Visibility — SHARED items are scoped to the subject and/or grade level
 *     they are tagged with; a teacher sees shared items that match a subject
 *     or grade level they actually teach (from their classrooms). PRIVATE items
 *     are visible to their author only.
 *  2. Management — only the author or a school administrator may edit/delete.
 *
 * No DB access here so the rules are directly unit-testable.
 */

/** Who may edit/delete another person's item (curation). */
export const QUESTION_BANK_ADMIN_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"] as const;

export const QUESTION_BANK_VISIBILITIES = ["PRIVATE", "SHARED"] as const;
export type QuestionBankVisibility = (typeof QUESTION_BANK_VISIBILITIES)[number];

export const DEFAULT_QUESTION_BANK_VISIBILITY: QuestionBankVisibility = "SHARED";

const QUESTION_BANK_VISIBILITY_SET = new Set<string>(QUESTION_BANK_VISIBILITIES);

export function normalizeVisibility(raw: unknown): QuestionBankVisibility {
  const value = String(raw ?? "").trim().toUpperCase();
  return (QUESTION_BANK_VISIBILITY_SET.has(value)
    ? (value as QuestionBankVisibility)
    : DEFAULT_QUESTION_BANK_VISIBILITY);
}

/** A teaching room's taxonomy (subset of ClassroomRef). */
export type BankRoom = {
  subjectId?: string | null;
  gradeLevelId?: string | null;
};

export type BankItemScope = {
  schoolId: string;
  createdBy: string;
  visibility: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
};

export function isBankAdmin(role: string | undefined | null): boolean {
  return QUESTION_BANK_ADMIN_ROLES.includes(String(role || "") as any);
}

/**
 * Pure predicate: may this viewer see the item?
 *  - tenant mismatch → never
 *  - own item → always
 *  - admins → any SHARED item in the school (curation)
 *  - SHARED + untagged (no subject, no grade) → whole school
 *  - SHARED + tagged → viewer must teach that subject or grade level
 *  - PRIVATE → author only
 */
export function canViewBankItem(opts: {
  item: BankItemScope;
  userId: string;
  role: string | undefined | null;
  rooms: BankRoom[];
  schoolId: string;
}): boolean {
  const { item, userId, role, rooms, schoolId } = opts;
  if (item.schoolId !== schoolId) return false;
  if (item.createdBy === userId) return true;
  if (item.visibility !== "SHARED") return false;
  if (isBankAdmin(role)) return true;

  const subjectId = item.subjectId || null;
  const gradeLevelId = item.gradeLevelId || null;
  if (!subjectId && !gradeLevelId) return true;

  return rooms.some((room) => {
    if (subjectId && room.subjectId === subjectId) return true;
    if (gradeLevelId && room.gradeLevelId === gradeLevelId) return true;
    return false;
  });
}

/** Pure predicate: may this viewer edit/delete the item? */
export function canManageBankItem(opts: {
  item: BankItemScope;
  userId: string;
  role: string | undefined | null;
  schoolId: string;
}): boolean {
  const { item, userId, role, schoolId } = opts;
  if (item.schoolId !== schoolId) return false;
  if (item.createdBy === userId) return true;
  return isBankAdmin(role);
}

/** Unique, trimmed, order-preserving subject/grade ids from a room list. */
export function scopeIds(rooms: BankRoom[]): { subjectIds: string[]; gradeLevelIds: string[] } {
  const subjectIds: string[] = [];
  const gradeLevelIds: string[] = [];
  const seenSubject = new Set<string>();
  const seenGrade = new Set<string>();
  for (const room of rooms || []) {
    const s = room?.subjectId;
    if (s && !seenSubject.has(s)) {
      seenSubject.add(s);
      subjectIds.push(s);
    }
    const g = room?.gradeLevelId;
    if (g && !seenGrade.has(g)) {
      seenGrade.add(g);
      gradeLevelIds.push(g);
    }
  }
  return { subjectIds, gradeLevelIds };
}

/**
 * Prisma `where` fragment (as plain data) that selects every bank item the
 * viewer may see. Compose with `{ ...filter, type?, subjectId?, ... }`.
 */
export function bankVisibilityWhere(opts: {
  userId: string;
  role: string | undefined | null;
  rooms: BankRoom[];
  schoolId: string;
}): { schoolId: string; OR: Array<Record<string, unknown>> } {
  const { userId, role, rooms, schoolId } = opts;
  const OR: Array<Record<string, unknown>> = [{ createdBy: userId }];
  if (isBankAdmin(role)) {
    OR.push({ visibility: "SHARED" });
    return { schoolId, OR };
  }
  // Untagged shared items are school-wide.
  OR.push({ visibility: "SHARED", subjectId: null, gradeLevelId: null });
  const { subjectIds, gradeLevelIds } = scopeIds(rooms);
  if (subjectIds.length) {
    OR.push({ visibility: "SHARED", subjectId: { in: subjectIds } });
  }
  if (gradeLevelIds.length) {
    OR.push({ visibility: "SHARED", gradeLevelId: { in: gradeLevelIds } });
  }
  return { schoolId, OR };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export const MAX_BANK_TAGS = 20;
export const MAX_BANK_TAG_LENGTH = 40;

/** Split a stored comma string or an array into clean, unique tags. */
export function parseBankTags(raw: unknown): string[] {
  const parts = Array.isArray(raw)
    ? raw.map((t) => String(t))
    : String(raw ?? "").split(",");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const tag = part.trim().slice(0, MAX_BANK_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_BANK_TAGS) break;
  }
  return out;
}

/** Serialize tags back to the stored comma string ("" when empty). */
export function serializeBankTags(raw: unknown): string {
  return parseBankTags(raw).join(",");
}
