/** Tailwind badge classes for expense categories (no inline styles). */
export const CATEGORY_BADGE: Record<string, string> = {
  ACADEMIC: "bg-indigo-50 text-indigo-700",
  UTILITIES: "bg-rose-50 text-rose-700",
  MAINTENANCE: "bg-amber-50 text-amber-700",
  TRANSPORT: "bg-emerald-50 text-emerald-700",
  OFFICE: "bg-violet-50 text-violet-700",
  PROCUREMENT: "bg-pink-50 text-pink-700",
  SALARY: "bg-cyan-50 text-cyan-700",
  OTHER: "bg-slate-100 text-slate-600",
  "TUITION FEE": "bg-indigo-50 text-indigo-700",
};

/** Hex fills for Recharts only. */
export const CATEGORY_CHART: Record<string, string> = {
  ACADEMIC: "#6366F1",
  UTILITIES: "#EF4444",
  MAINTENANCE: "#F59E0B",
  TRANSPORT: "#10B981",
  OFFICE: "#8B5CF6",
  PROCUREMENT: "#EC4899",
  SALARY: "#06B6D4",
  OTHER: "#6B7280",
};

export const EXPENSE_CATEGORIES = [
  "ACADEMIC",
  "UTILITIES",
  "MAINTENANCE",
  "TRANSPORT",
  "OFFICE",
  "PROCUREMENT",
  "SALARY",
  "OTHER",
] as const;
