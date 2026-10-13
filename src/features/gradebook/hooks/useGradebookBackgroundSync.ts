import { useCallback, useEffect, useRef, useState } from "react";
import {
  countPendingGradebookDrafts,
  flushAllPendingGradebookDrafts,
  type GradebookDraftScope,
} from "../lib/gradebookBackgroundSync";

type Args = {
  schoolId: string | undefined;
  /** Skip the gradebook the teacher currently has open (autosave owns it). */
  excludeScope?: GradebookDraftScope | null;
  /** Run background flush when the hook mounts (e.g. gradebook hub / app area). */
  enabled?: boolean;
};

export function useGradebookBackgroundSync({
  schoolId,
  excludeScope,
  enabled = true,
}: Args) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);
  const runningRef = useRef(false);
  const excludeRef = useRef(excludeScope);
  excludeRef.current = excludeScope;

  const refreshCount = useCallback(() => {
    if (!schoolId) {
      setPendingCount(0);
      return;
    }
    setPendingCount(countPendingGradebookDrafts(schoolId, excludeRef.current));
  }, [schoolId]);

  const syncAll = useCallback(async () => {
    if (!schoolId || !enabled || !navigator.onLine || runningRef.current) {
      return { synced: 0, failed: 0, errors: [] as string[] };
    }
    runningRef.current = true;
    setSyncing(true);
    try {
      const result = await flushAllPendingGradebookDrafts(schoolId, {
        excludeScope: excludeRef.current,
      });
      setLastResult({ synced: result.synced, failed: result.failed });
      refreshCount();
      return result;
    } finally {
      runningRef.current = false;
      setSyncing(false);
    }
  }, [schoolId, enabled, refreshCount]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount, excludeScope]);

  useEffect(() => {
    if (!enabled || !schoolId) return;

    const run = () => {
      void syncAll();
    };

    run();

    const onOnline = () => run();
    const onDraftChanged = () => refreshCount();

    window.addEventListener("online", onOnline);
    window.addEventListener("gb:draft-changed", onDraftChanged);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("gb:draft-changed", onDraftChanged);
    };
  }, [schoolId, enabled, syncAll, refreshCount]);

  return {
    pendingCount,
    syncing,
    lastResult,
    syncAll,
    refreshCount,
  };
}
