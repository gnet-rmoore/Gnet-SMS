import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";

export type DirectoryStudent = { id: string; name: string; [key: string]: unknown };
export type DirectoryStaff = { id: string; name: string; role?: string; [key: string]: unknown };

export function useDirectory(schoolId?: string) {
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [staff, setStaff] = useState<DirectoryStaff[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.get(`/api/schools/${schoolId}/students`),
        api.get(`/api/schools/${schoolId}/staff`),
      ]);
      setStudents(Array.isArray(s) ? s : []);
      setStaff(Array.isArray(t) ? t : []);
    } catch {
      setStudents([]);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { students, staff, loading, reload };
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
