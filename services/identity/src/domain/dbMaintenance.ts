/**
 * Pure helpers for Super Admin database maintenance (backup + optimize).
 * No IO here so it can be unit-tested without Postgres or child processes.
 */

export const BACKUP_FILE_PREFIX = "sms_db_";
export const BACKUP_FILE_EXT = ".sql";
export const DEFAULT_BACKUP_RETENTION = 7;

/** Schemas owned by the platform (Postgres is one cluster, schema-per-service). */
export const DB_MAINTENANCE_SCHEMAS = [
  "identity",
  "academic",
  "classroom",
  "lifecycle",
  "staff",
  "finance",
  "ops",
  "comms",
  "campus",
] as const;

export type ParsedDatabaseUrl = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslmode: string | null;
};

/**
 * Parse a Postgres connection URL into discrete fields so the password can be
 * passed via the PGPASSWORD env var instead of appearing in the process argv.
 * Returns null for anything that is not a usable postgres URL.
 */
export function parseDatabaseUrl(raw: string | null | undefined): ParsedDatabaseUrl | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
    const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
    if (!u.hostname || !database || !u.username) return null;
    const sslmode = u.searchParams.get("sslmode");
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      database,
      user: decodeURIComponent(u.username),
      password: u.password ? decodeURIComponent(u.password) : "",
      sslmode,
    };
  } catch {
    return null;
  }
}

/** Timestamped, filesystem-safe dump name: sms_db_2026-10-16T12-00-00-000Z.sql */
export function backupFileName(now: Date): string {
  const iso = now.toISOString().replace(/[:.]/g, "-");
  return `${BACKUP_FILE_PREFIX}${iso}${BACKUP_FILE_EXT}`;
}

/** Strict allow-list so a path can never traverse out of the backups directory. */
export function isValidBackupName(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name !== name.trim()) return false;
  if (!name.startsWith(BACKUP_FILE_PREFIX) || !name.endsWith(BACKUP_FILE_EXT)) return false;
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}

/** Sort newest-first (names embed an ISO timestamp) and return the overflow to delete. */
export function pruneOldest(names: string[], keep: number): string[] {
  const n = Number.isFinite(keep) && keep >= 1 ? Math.floor(keep) : DEFAULT_BACKUP_RETENTION;
  const sorted = [...names].sort((a, b) => b.localeCompare(a));
  return sorted.slice(n);
}

/** Human-readable byte size for the backups list UI. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

/** CLI args (no password) for pg_dump / psql built from a parsed URL. */
export function buildPgArgs(parsed: ParsedDatabaseUrl): string[] {
  const args = [
    "-h",
    parsed.host,
    "-p",
    String(parsed.port),
    "-U",
    parsed.user,
    "-d",
    parsed.database,
  ];
  if (parsed.sslmode) args.push(`-v`, `sslmode=${parsed.sslmode}`);
  return args;
}

/** Environment for a pg client process — password never touches argv. */
export function buildPgEnv(parsed: ParsedDatabaseUrl): Record<string, string> {
  const env: Record<string, string> = {};
  if (parsed.password) env.PGPASSWORD = parsed.password;
  if (parsed.sslmode) env.PGSSLMODE = parsed.sslmode;
  return env;
}

/** SQL that vacuums + analyzes every table in every schema of the database. */
export function buildOptimizeSql(): string {
  return "VACUUM (ANALYZE);";
}

export type MaintenanceStatusInput = {
  urlConfigured: boolean;
  urlValid: boolean;
  pgDumpAvailable: boolean;
  psqlAvailable: boolean;
  s3Configured: boolean;
  backupsDir: string;
  retention: number;
};

export type MaintenanceStatus = {
  ready: boolean;
  backupReady: boolean;
  optimizeReady: boolean;
  s3Configured: boolean;
  backupsDir: string;
  retention: number;
  issues: string[];
};

/**
 * Pure readiness summary for the Database tab so the UI can explain exactly
 * what is missing instead of surfacing an opaque 503 from pg_dump/psql.
 */
export function summarizeMaintenanceStatus(input: MaintenanceStatusInput): MaintenanceStatus {
  const issues: string[] = [];
  if (!input.urlConfigured) {
    issues.push("DATABASE_MAINTENANCE_URL is not set on the identity service");
  } else if (!input.urlValid) {
    issues.push("DATABASE_MAINTENANCE_URL is not a valid postgres:// URL");
  }
  if (!input.pgDumpAvailable) issues.push("pg_dump is not installed (required for backups)");
  if (!input.psqlAvailable) issues.push("psql is not installed (required for optimize + cloud fallback)");
  const backupReady = input.urlConfigured && input.urlValid && input.pgDumpAvailable;
  const optimizeReady = input.urlConfigured && input.urlValid && input.psqlAvailable;
  return {
    ready: backupReady && optimizeReady,
    backupReady,
    optimizeReady,
    s3Configured: input.s3Configured,
    backupsDir: input.backupsDir,
    retention: input.retention,
    issues,
  };
}
