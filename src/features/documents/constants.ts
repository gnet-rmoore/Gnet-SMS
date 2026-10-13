export const DOCUMENT_CATEGORIES = [
  "POLICY",
  "FORM",
  "TEACHING_MATERIAL",
  "HR",
  "ACADEMIC",
  "OTHER",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_ROLE_OPTIONS = [
  "TEACHER",
  "STUDENT",
  "PARENT",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "ACCOUNTANT",
  "REGISTRAR",
  "LIBRARIAN",
  "SECURITY",
  "MAINTENANCE",
  "IT_ADMIN",
  "NURSE",
  "COUNSELOR",
] as const;

/** Roles that can create / edit / delete school documents. */
export const DOCUMENT_MANAGE_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
]);

export const MAX_INLINE_UPLOAD_BYTES = 1.5 * 1024 * 1024;

export function formatCategory(category: string, t?: (key: string) => string) {
  if (t) {
    const key = `documents.categories.${category}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return (category || "OTHER").replace(/_/g, " ");
}

export function formatRole(role: string) {
  return role.replace(/_/g, " ");
}

export function categoryAccent(category: string) {
  switch (category) {
    case "POLICY":
      return "bg-indigo-50 text-indigo-600";
    case "FORM":
      return "bg-emerald-50 text-emerald-600";
    case "TEACHING_MATERIAL":
      return "bg-sky-50 text-sky-600";
    case "HR":
      return "bg-amber-50 text-amber-700";
    case "ACADEMIC":
      return "bg-violet-50 text-violet-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function fileTypeAccent(fileType: string) {
  const t = (fileType || "").toLowerCase();
  if (t.includes("pdf")) return "bg-rose-50 text-rose-600";
  if (t.includes("doc")) return "bg-sky-50 text-sky-600";
  if (t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("webp")) {
    return "bg-emerald-50 text-emerald-600";
  }
  return "bg-indigo-50 text-indigo-600";
}
