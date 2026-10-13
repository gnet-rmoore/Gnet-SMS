import i18n from "../../i18n/instance";

export function examStatusLabel(status?: string | null): string {
  const key = status || "SCHEDULED";
  return i18n.t(`common:examStatus.${key}`, {
    defaultValue: key.replace(/_/g, " ").toLowerCase(),
  });
}

export function examStatusClass(status?: string | null): string {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    case "ENDED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    default:
      return "bg-amber-50 text-amber-700 border border-amber-100";
  }
}

export function examIconTone(status?: string | null): string {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-600";
    case "ENDED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-600";
    default:
      return "bg-amber-50 text-amber-600";
  }
}
