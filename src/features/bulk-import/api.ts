import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import type { BulkImportCreated, BulkImportPreview } from "./ImportRosterModal";

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function postImport(
  url: string,
  rows: Record<string, unknown>[],
  sourceFileName: string
): Promise<{ ok: boolean; createdCount: number; created: BulkImportCreated[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ rows, sourceFileName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || "Import failed"), {
      status: res.status,
      preview: data.rows ? data : undefined,
    });
  }
  return data;
}

async function downloadTemplate(url: string, filename: string) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Could not download template");
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export const bulkImportApi = {
  previewStudents: (schoolId: string, rows: Record<string, unknown>[], sourceFileName: string) =>
    api.post(`/api/schools/${schoolId}/students/import/preview`, {
      rows,
      sourceFileName,
    }) as Promise<BulkImportPreview>,

  importStudents: (schoolId: string, rows: Record<string, unknown>[], sourceFileName: string) =>
    postImport(`/api/schools/${schoolId}/students/import`, rows, sourceFileName),

  downloadStudentTemplate: (schoolId: string) =>
    downloadTemplate(
      `/api/schools/${schoolId}/students/import/template.csv`,
      "student-import-template.csv"
    ),

  previewStaff: (schoolId: string, rows: Record<string, unknown>[], sourceFileName: string) =>
    api.post(`/api/schools/${schoolId}/staff/import/preview`, {
      rows,
      sourceFileName,
    }) as Promise<BulkImportPreview>,

  importStaff: (schoolId: string, rows: Record<string, unknown>[], sourceFileName: string) =>
    postImport(`/api/schools/${schoolId}/staff/import`, rows, sourceFileName),

  downloadStaffTemplate: (schoolId: string) =>
    downloadTemplate(
      `/api/schools/${schoolId}/staff/import/template.csv`,
      "staff-import-template.csv"
    ),
};
