const SA_CAPABILITY_LABELS: Record<string, string> = {
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

const SA_PLATFORM_ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  SUPPORT: "Support",
  BILLING: "Billing",
  ANALYST: "Analyst",
};

function humanizeKey(key: string): string {
  return key
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function saCapabilityLabel(key: string): string {
  return SA_CAPABILITY_LABELS[key] ?? humanizeKey(key);
}

export function saPlatformRoleLabel(role: string | null | undefined): string {
  const normalized = String(role || "").toUpperCase();
  return SA_PLATFORM_ROLE_LABELS[normalized] ?? humanizeKey(normalized);
}
