/**
 * Sync all pending gradebook drafts stored in localStorage (multi-class / multi-subject).
 * Active sheet is excluded — its hook owns that draft while open.
 */
import { gradebookApi } from "../api";
import {
  readGradebookDraft,
  writeGradebookDraft,
  type LocalGradebookDraft,
} from "./gradebookLocalStore";

export type GradebookDraftScope = {
  schoolId: string;
  classId: string;
  subjectId?: string;
  examId?: string | null;
  examComponentId?: string | null;
};

export type FlushPendingResult = {
  synced: number;
  failed: number;
  errors: string[];
};

const DRAFT_KEY_PREFIX = "gb:v1:";

export function draftScopeKey(scope: GradebookDraftScope): string {
  const examPart = scope.examId
    ? `exam:${scope.examId}`
    : `comp:${scope.examComponentId || "none"}`;
  return `${DRAFT_KEY_PREFIX}${scope.schoolId}:${examPart}:${scope.classId}`;
}

export function scopesMatch(
  a: GradebookDraftScope,
  b: GradebookDraftScope | null | undefined
): boolean {
  if (!b) return false;
  return (
    a.schoolId === b.schoolId &&
    a.classId === b.classId &&
    (a.examId ?? null) === (b.examId ?? null) &&
    (a.examComponentId ?? null) === (b.examComponentId ?? null)
  );
}

/** All gradebook drafts for a school (pending or already synced locally). */
export function listGradebookDrafts(schoolId: string): LocalGradebookDraft[] {
  const drafts: LocalGradebookDraft[] = [];
  try {
    const prefix = `${DRAFT_KEY_PREFIX}${schoolId}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as LocalGradebookDraft;
      if (parsed?.version === 1 && Array.isArray(parsed.entries)) {
        drafts.push(parsed);
      }
    }
  } catch {
    /* ignore */
  }
  return drafts.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function listPendingGradebookDrafts(schoolId: string): LocalGradebookDraft[] {
  return listGradebookDrafts(schoolId).filter((d) => d.pendingSync);
}

export function countPendingGradebookDrafts(
  schoolId: string,
  excludeScope?: GradebookDraftScope | null
): number {
  return listPendingGradebookDrafts(schoolId).filter(
    (d) => !scopesMatch(d, excludeScope)
  ).length;
}

/** Push one local draft to the server as DRAFT. */
export async function syncGradebookDraftToServer(
  draft: LocalGradebookDraft
): Promise<void> {
  if (!draft.subjectId) {
    throw new Error("Draft missing subjectId");
  }

  if (draft.examId) {
    await gradebookApi.bulkExamGrades(draft.examId, {
      classId: draft.classId,
      subjectId: draft.subjectId,
      status: "DRAFT",
      examComponentId: draft.examComponentId,
      entries: draft.entries.map((e) => ({
        studentId: e.studentId,
        grade: e.grade,
      })),
    });
  } else if (draft.examComponentId) {
    await gradebookApi.bulkComponentGrades(draft.schoolId, {
      classId: draft.classId,
      subjectId: draft.subjectId,
      examComponentId: draft.examComponentId,
      status: "DRAFT",
      entries: draft.entries.map((e) => ({
        studentId: e.studentId,
        grade: e.grade,
        structureColumnId: e.structureColumnId,
        isIncomplete: e.isIncomplete,
        incompleteNote: e.incompleteNote,
      })),
    });
  } else {
    throw new Error("Draft has no exam or assessment scope");
  }

  writeGradebookDraft({
    ...draft,
    pendingSync: false,
    updatedAt: new Date().toISOString(),
  });
}

/** Sync every pending draft except the actively open gradebook (optional). */
export async function flushAllPendingGradebookDrafts(
  schoolId: string,
  opts?: { excludeScope?: GradebookDraftScope | null }
): Promise<FlushPendingResult> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const pending = listPendingGradebookDrafts(schoolId).filter(
    (d) => !scopesMatch(d, opts?.excludeScope)
  );

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const draft of pending) {
    try {
      // Re-read so we always sync the latest local copy
      const fresh =
        readGradebookDraft({
          schoolId: draft.schoolId,
          classId: draft.classId,
          examId: draft.examId,
          examComponentId: draft.examComponentId,
        }) || draft;
      if (!fresh.pendingSync) continue;
      await syncGradebookDraftToServer(fresh);
      synced++;
    } catch (err: any) {
      failed++;
      errors.push(err?.message || "Sync failed");
    }
  }

  return { synced, failed, errors };
}
