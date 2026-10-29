/**
 * Super Admin operator sub-roles (Phase E) — capability matrix.
 * platformRole on User; null / unknown → OWNER (full access).
 */

export const SA_PLATFORM_ROLES = ["OWNER", "SUPPORT", "BILLING", "ANALYST"] as const;
export type SaPlatformRole = (typeof SA_PLATFORM_ROLES)[number];

export const SA_CAPABILITIES = [
  "schools.read",
  "schools.write",
  "schools.suspend",
  "schools.delete",
  "registrations.review",
  "users.read",
  "users.write",
  "users.password_reset",
  "users.disable",
  "plans.manage",
  "credentials.manage",
  "settings.manage",
  "operators.manage",
  "impersonate",
  "export.dsr",
  "broadcast",
  "audit.read",
  "reports.read",
] as const;

export type SaCapability = (typeof SA_CAPABILITIES)[number];

/** Friendly capability names for API errors — never expose raw keys to users. */
const SA_CAPABILITY_LABELS: Record<SaCapability, string> = {
  "schools.read": "View schools",
  "schools.write": "Create and edit schools",
  "schools.suspend": "Suspend or reactivate schools",
  "schools.delete": "Delete schools",
  "registrations.review": "Review school registrations",
  "users.read": "View platform users",
  "users.write": "Create and edit platform users",
  "users.password_reset": "Reset user passwords",
  "users.disable": "Disable user accounts",
  "plans.manage": "Manage plans and entitlements",
  "credentials.manage": "Manage credentials",
  "settings.manage": "Manage platform settings",
  "operators.manage": "Manage platform operators",
  impersonate: "Impersonate school users",
  "export.dsr": "Export data subject requests",
  broadcast: "Send platform broadcasts",
  "audit.read": "View audit logs",
  "reports.read": "View platform reports",
};

function humanizeCapability(capability: string): string {
  return capability
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function saCapabilityLabel(capability: string): string {
  return SA_CAPABILITY_LABELS[capability as SaCapability] ?? humanizeCapability(capability);
}

const ALL = [...SA_CAPABILITIES];

const BY_ROLE: Record<SaPlatformRole, SaCapability[]> = {
  OWNER: ALL,
  SUPPORT: [
    "schools.read",
    "schools.write",
    "schools.suspend",
    "registrations.review",
    "users.read",
    "users.write",
    "users.password_reset",
    "users.disable",
    "impersonate",
    "export.dsr",
    "audit.read",
    "reports.read",
  ],
  BILLING: [
    "schools.read",
    "plans.manage",
    "users.read",
    "reports.read",
    "audit.read",
  ],
  ANALYST: ["schools.read", "users.read", "reports.read", "audit.read", "export.dsr"],
};

export function normalizeSaPlatformRole(role: string | null | undefined): SaPlatformRole {
  const r = String(role || "OWNER").toUpperCase();
  if ((SA_PLATFORM_ROLES as readonly string[]).includes(r)) return r as SaPlatformRole;
  return "OWNER";
}

export function capabilitiesForSaRole(role: string | null | undefined): SaCapability[] {
  return [...BY_ROLE[normalizeSaPlatformRole(role)]];
}

export function saHasCapability(
  role: string | null | undefined,
  capability: SaCapability
): boolean {
  return capabilitiesForSaRole(role).includes(capability);
}

export class SaCapabilityDeniedError extends Error {
  status = 403;
  code = "SA_CAPABILITY_DENIED";
  constructor(capability: string) {
    super(`Super Admin capability required: ${saCapabilityLabel(capability)}`);
    this.name = "SaCapabilityDeniedError";
  }
}

export function assertSaCapability(
  role: string | null | undefined,
  capability: SaCapability
): void {
  if (!saHasCapability(role, capability)) {
    throw new SaCapabilityDeniedError(capability);
  }
}
