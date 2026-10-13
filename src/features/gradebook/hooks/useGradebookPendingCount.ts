import { useCallback, useEffect, useState } from "react";
import {
  countPendingGradebookDrafts,
  type GradebookDraftScope,
} from "../lib/gradebookBackgroundSync";

/** Read-only pending draft count for hub banners (updates on local draft changes). */
export function useGradebookPendingCount(
  schoolId: string | undefined,
  excludeScope?: GradebookDraftScope | null
) {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(() => {
    if (!schoolId) {
      setPendingCount(0);
      return;
    }
    setPendingCount(countPendingGradebookDrafts(schoolId, excludeScope));
  }, [schoolId, excludeScope]);

  useEffect(() => {
    refresh();
    const onDraftChanged = () => refresh();
    window.addEventListener("gb:draft-changed", onDraftChanged);
    return () => window.removeEventListener("gb:draft-changed", onDraftChanged);
  }, [refresh]);

  return { pendingCount, refresh };
}
