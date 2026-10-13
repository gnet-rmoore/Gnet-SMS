import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/** Keeps parent child context shareable in the URL and stable per school. */
export function useSelectedChild() {
  const { school } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = `gnet:selected-child:${school?.id || "school"}`;
  const studentId = searchParams.get("studentId") || localStorage.getItem(storageKey) || "";

  const selectChild = useCallback(
    (nextStudentId: string) => {
      if (!nextStudentId) return;
      localStorage.setItem(storageKey, nextStudentId);
      const next = new URLSearchParams(searchParams);
      next.set("studentId", nextStudentId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, storageKey]
  );

  return { studentId, selectChild };
}
