import { useGradebookBackgroundSync } from "../hooks/useGradebookBackgroundSync";

/** Headless — flushes all pending gradebook drafts while the teacher is signed in. */
export function GradebookBackgroundSyncRunner({ schoolId }: { schoolId?: string }) {
  useGradebookBackgroundSync({
    schoolId,
    excludeScope: null,
    enabled: Boolean(schoolId),
  });
  return null;
}
