import type { LeaveStatus } from "./types";

export const STATUS_FILTERS: { key: "ALL" | LeaveStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

export function formatLeaveType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Match staff service: weekdays only, min 1. */
export function businessDaysBetween(start: string | Date, end: string | Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  let days = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(days, 1);
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    default:
      return "bg-amber-50 text-amber-700 border border-amber-100";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "PENDING":
      return "Pending";
    default:
      return status;
  }
}

export function canApproveLeave(role?: string | null): boolean {
  return ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SUPER_ADMIN"].includes(role || "");
}
