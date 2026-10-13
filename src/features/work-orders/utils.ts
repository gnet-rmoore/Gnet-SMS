import type { WorkOrderPriority, WorkOrderStatus } from "./types";

export const STATUS_OPTIONS: { key: WorkOrderStatus; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
];

export const PRIORITY_OPTIONS: { key: WorkOrderPriority; label: string }[] = [
  { key: "LOW", label: "Low" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HIGH", label: "High" },
  { key: "URGENT", label: "Urgent" },
];

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "HIGH":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "MEDIUM":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-100";
  }
}

/** Priority chip readable on dark slate banners. */
export function priorityBadgeOnDark(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-rose-500/20 text-rose-200 border border-rose-400/30";
    case "HIGH":
      return "bg-amber-500/20 text-amber-200 border border-amber-400/30";
    case "MEDIUM":
      return "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30";
    default:
      return "bg-white/10 text-slate-200 border border-white/15";
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    default:
      return "bg-amber-50 text-amber-700 border border-amber-100";
  }
}

export function statusLabel(status: string, t?: (key: string) => string): string {
  if (t) {
    const key = `workOrders.status.${status}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "OPEN":
      return "Open";
    default:
      return status;
  }
}

export function priorityLabel(priority: string, t?: (key: string) => string): string {
  if (t) {
    const key = `workOrders.priority.${priority}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return PRIORITY_OPTIONS.find((p) => p.key === priority)?.label || priority;
}

export function priorityWeight(priority: string): number {
  const weights: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return weights[priority] || 0;
}

export function formatRole(role?: string | null): string {
  if (!role) return "Staff";
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}

export function canManageWorkOrders(role?: string | null): boolean {
  return ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE", "SUPER_ADMIN"].includes(
    role || ""
  );
}

/** Staff who can be assigned to facility work. */
export function isAssignableRole(role?: string | null): boolean {
  return ["MAINTENANCE", "SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(role || "");
}
