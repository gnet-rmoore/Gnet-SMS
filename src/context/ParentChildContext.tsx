import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export type ParentChild = {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string | null;
};

type ParentChildContextValue = {
  children: ParentChild[];
  studentId: string;
  selectedChild: ParentChild | undefined;
  selectChild: (studentId: string) => void;
  loading: boolean;
};

const ParentChildContext = createContext<ParentChildContextValue>({
  children: [],
  studentId: "",
  selectedChild: undefined,
  selectChild: () => {},
  loading: false,
});

export function ParentChildProvider({ children: childrenNodes }: { children: React.ReactNode }) {
  const { user, accessToken, school } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const isParent = user?.role === "PARENT";
  const loading = isParent ? childrenLoading : false;
  const storageKey = `gnet:selected-child:${school?.id || "school"}`;

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

  const requestedStudentId = isParent
    ? searchParams.get("studentId") || localStorage.getItem(storageKey) || ""
    : searchParams.get("studentId") || "";

  useEffect(() => {
    if (!isParent || !user?.id) {
      setChildren([]);
      setChildrenLoading(false);
      return;
    }
    let cancelled = false;
    setChildrenLoading(true);
    fetch(`/api/parents/${user.id}/children`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => (response.ok ? response.json() : []))
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows)
          ? rows
              .map((row: any) => ({
                id: String(row?.id || row?.studentId || ""),
                name: String(row?.name || "Student"),
                email: row?.email ? String(row.email) : undefined,
                photoUrl: row?.photoUrl ?? null,
              }))
              .filter((row: ParentChild) => Boolean(row.id))
          : [];
        setChildren(list);
      })
      .catch(() => {
        if (!cancelled) setChildren([]);
      })
      .finally(() => {
        if (!cancelled) setChildrenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, isParent, user?.id]);

  const studentId = useMemo(() => {
    if (!isParent) return requestedStudentId;
    if (loading || !children.length) return "";
    return children.some((child) => child.id === requestedStudentId)
      ? requestedStudentId
      : children[0].id;
  }, [children, isParent, loading, requestedStudentId]);

  useEffect(() => {
    if (!isParent || loading || !children.length) return;
    if (!children.some((child) => child.id === requestedStudentId)) {
      selectChild(children[0].id);
    }
  }, [children, isParent, loading, requestedStudentId, selectChild]);

  const value = useMemo<ParentChildContextValue>(
    () => ({
      children,
      studentId,
      selectedChild: children.find((child) => child.id === studentId),
      selectChild,
      loading,
    }),
    [children, loading, selectChild, studentId]
  );

  return <ParentChildContext.Provider value={value}>{childrenNodes}</ParentChildContext.Provider>;
}

export function useParentChild() {
  return useContext(ParentChildContext);
}
