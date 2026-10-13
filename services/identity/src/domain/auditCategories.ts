/**
 * Audit log taxonomy for Identity SystemLog (SA System Logs).
 * SMS-scoped — hotel/PMS modules from generic checklists are out of product scope.
 */

export const AUDIT_CATEGORIES = [
  "AUTH",
  "SESSION",
  "USER_MGMT",
  "ROLE",
  "SECURITY",
  "SCHOOLS",
  "BILLING",
  "SUPER_ADMIN",
  "SETTINGS",
  "COMMUNICATION",
  "FILE",
  "EXPORT",
  "SYSTEM",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_MODULES = [
  "AUTH",
  "SCHOOLS",
  "SECURITY",
  "SYSTEM",
  "SUPER_ADMIN",
  "USERS",
  "ROLES",
  "BILLING",
  "SETTINGS",
  "COMMS",
] as const;

export type AuditModule = (typeof AUDIT_MODULES)[number];

export const AUDIT_LEVELS = ["INFO", "WARNING", "ERROR", "CRITICAL"] as const;
export type AuditLevel = (typeof AUDIT_LEVELS)[number];

/** Normalize legacy WARN → WARNING for storage and filters. */
export function normalizeAuditLevel(level: string | null | undefined): AuditLevel {
  const raw = String(level || "INFO").toUpperCase();
  if (raw === "WARN") return "WARNING";
  if (raw === "WARNING" || raw === "ERROR" || raw === "CRITICAL" || raw === "INFO") {
    return raw;
  }
  return "INFO";
}

export function inferAuditCategory(module: string, action: string): AuditCategory {
  const m = String(module || "").toUpperCase();
  const a = String(action || "").toLowerCase();

  if (/logout|session|timeout|expired|revoked|idle/.test(a)) return "SESSION";
  if (m === "AUTH" || /login|password|mfa|token|oauth|sso/.test(a)) {
    return "AUTH";
  }
  if (m === "SECURITY" || /brute|blocked|suspicious|unauthorized|permission_denied|abuse|rate_limit/.test(a)) {
    return "SECURITY";
  }
  if (m === "USERS" || /user_|create_user|update_user|delete_user|profile|avatar|email_verif|phone_/.test(a)) {
    return "USER_MGMT";
  }
  if (m === "ROLES" || /role_|permission_|admin_rights/.test(a)) return "ROLE";
  if (m === "SCHOOLS" || /school_|tenant_|registration/.test(a)) return "SCHOOLS";
  if (m === "BILLING" || /billing|checkout|plan_|subscription|invoice|payment|refund/.test(a)) {
    return "BILLING";
  }
  if (m === "SETTINGS" || /settings|branding|theme|webhook|api_key/.test(a)) return "SETTINGS";
  if (m === "COMMS" || /email_|sms_|broadcast|notification/.test(a)) return "COMMUNICATION";
  if (/export|download_csv|download_pdf|dsr_export/.test(a)) return "EXPORT";
  if (/file_|upload|download|document_|pdf_|avatar/.test(a)) return "FILE";
  if (m === "SUPER_ADMIN" || /operator_|impersonation|platform_/.test(a)) return "SUPER_ADMIN";
  return "SYSTEM";
}
