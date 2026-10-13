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
    super(`Super Admin capability required: ${capability}`);
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
