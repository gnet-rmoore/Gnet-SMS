/** Local durable draft store for teacher gradebook (survives refresh / brief offline). */

export type LocalGradeCell = {
  studentId: string;
  grade: number | null;
  structureColumnId?: string | null;
  isIncomplete?: boolean;
  incompleteNote?: string | null;
};

export type LocalGradebookDraft = {
  version: 1;
  schoolId: string;
  examId?: string | null;
  examComponentId?: string | null;
  classId: string;
  subjectId: string;
  updatedAt: string;
  entries: LocalGradeCell[];
  pendingSync: boolean;
};

function key(parts: {
  schoolId: string;
  classId: string;
  examId?: string | null;
  examComponentId?: string | null;
}): string {
  const scope = parts.examId
    ? `exam:${parts.examId}`
    : `comp:${parts.examComponentId || "none"}`;
  return `gb:v1:${parts.schoolId}:${scope}:${parts.classId}`;
}

export function readGradebookDraft(parts: {
  schoolId: string;
  classId: string;
  examId?: string | null;
  examComponentId?: string | null;
}): LocalGradebookDraft | null {
  try {
    const raw = localStorage.getItem(key(parts));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalGradebookDraft;
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGradebookDraft(draft: LocalGradebookDraft): void {
  try {
    localStorage.setItem(
      key({
        schoolId: draft.schoolId,
        classId: draft.classId,
        examId: draft.examId,
        examComponentId: draft.examComponentId,
      }),
      JSON.stringify({ ...draft, version: 1 })
    );
    window.dispatchEvent(new CustomEvent("gb:draft-changed"));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearGradebookDraft(parts: {
  schoolId: string;
  classId: string;
  examId?: string | null;
  examComponentId?: string | null;
}): void {
  try {
    localStorage.removeItem(key(parts));
    window.dispatchEvent(new CustomEvent("gb:draft-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * Prefer local draft when it is newer than the newest server updatedAt
 * or when pendingSync is true (unsynced offline edits).
 */
export function mergeLocalOverServer(
  serverRows: Array<{
    studentId: string;
    grade: number | null;
    updatedAt?: string | null;
  }>,
  local: LocalGradebookDraft | null
): {
  entries: Map<string, number | null>;
  usedLocal: boolean;
} {
  const map = new Map(serverRows.map((r) => [r.studentId, r.grade]));
  if (!local?.entries?.length) return { entries: map, usedLocal: false };

  const serverNewest = serverRows.reduce((max, r) => {
    const t = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    return t > max ? t : max;
  }, 0);
  const localTs = new Date(local.updatedAt).getTime();
  const preferLocal = local.pendingSync || localTs >= serverNewest;

  if (!preferLocal) return { entries: map, usedLocal: false };

  for (const e of local.entries) {
    map.set(e.studentId, e.grade);
  }
  return { entries: map, usedLocal: true };
}

export function clampScore(raw: string, max = 100): number | null {
  if (raw.trim() === "") return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(0, n));
}
