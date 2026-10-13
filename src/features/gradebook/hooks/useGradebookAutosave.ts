import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearGradebookDraft,
  readGradebookDraft,
  writeGradebookDraft,
  type LocalGradeCell,
} from "../lib/gradebookLocalStore";

export type SyncStatus =
  | "idle"
  | "saving"
  | "saved_local"
  | "synced"
  | "offline"
  | "error";

type Scope = {
  schoolId: string;
  classId: string;
  subjectId: string;
  examId?: string | null;
  examComponentId?: string | null;
};

type UseGradebookAutosaveArgs = {
  scope: Scope | null;
  entries: LocalGradeCell[];
  enabled: boolean;
  /** Persist DRAFT to server; throw on failure */
  syncDraft: (entries: LocalGradeCell[]) => Promise<void>;
  debounceMs?: number;
};

export function useGradebookAutosave({
  scope,
  entries,
  enabled,
  syncDraft,
  debounceMs = 800,
}: UseGradebookAutosaveArgs) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef(entries);
  const syncingRef = useRef(false);
  entriesRef.current = entries;

  const persistLocal = useCallback(
    (list: LocalGradeCell[], pendingSync: boolean) => {
      if (!scope) return;
      writeGradebookDraft({
        version: 1,
        schoolId: scope.schoolId,
        examId: scope.examId,
        examComponentId: scope.examComponentId,
        classId: scope.classId,
        subjectId: scope.subjectId,
        updatedAt: new Date().toISOString(),
        entries: list,
        pendingSync,
      });
      setLastSavedAt(new Date().toISOString());
      setStatus(navigator.onLine ? "saved_local" : "offline");
    },
    [scope]
  );

  const flush = useCallback(async () => {
    if (!scope || !enabled) return;
    if (!navigator.onLine) {
      persistLocal(entriesRef.current, true);
      setStatus("offline");
      return;
    }
    if (syncingRef.current) return;
    syncingRef.current = true;
    setStatus("saving");
    setErrorMessage(null);
    try {
      await syncDraft(entriesRef.current);
      writeGradebookDraft({
        version: 1,
        schoolId: scope.schoolId,
        examId: scope.examId,
        examComponentId: scope.examComponentId,
        classId: scope.classId,
        subjectId: scope.subjectId,
        updatedAt: new Date().toISOString(),
        entries: entriesRef.current,
        pendingSync: false,
      });
      setLastSavedAt(new Date().toISOString());
      setStatus("synced");
    } catch (err: any) {
      persistLocal(entriesRef.current, true);
      setStatus(navigator.onLine ? "error" : "offline");
      setErrorMessage(err?.message || "Sync failed");
    } finally {
      syncingRef.current = false;
    }
  }, [scope, enabled, syncDraft, persistLocal]);

  const scheduleSync = useCallback(() => {
    if (!enabled || !scope) return;
    persistLocal(entriesRef.current, true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, debounceMs);
  }, [enabled, scope, persistLocal, flush, debounceMs]);

  /** Call after every cell edit. */
  const onEdit = useCallback(() => {
    scheduleSync();
  }, [scheduleSync]);

  useEffect(() => {
    const onOnline = () => {
      void flush();
    };
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush]);

  useEffect(() => {
    const flushBestEffort = () => {
      if (!scope || !enabled) return;
      persistLocal(entriesRef.current, true);
      if (navigator.onLine && !syncingRef.current) {
        void flush();
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flushBestEffort();
    };
    window.addEventListener("beforeunload", flushBestEffort);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flushBestEffort);
      document.removeEventListener("visibilitychange", onVis);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scope, enabled, persistLocal, flush]);

  const clearLocal = useCallback(() => {
    if (!scope) return;
    clearGradebookDraft(scope);
  }, [scope]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    onEdit,
    flush,
    clearLocal,
    readLocal: () => (scope ? readGradebookDraft(scope) : null),
  };
}
