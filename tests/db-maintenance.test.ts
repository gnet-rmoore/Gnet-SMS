/**
 * Super Admin database maintenance — pure helpers (no Postgres, no child_process).
 * Run: npm run test:db-maintenance
 */
import {
  parseDatabaseUrl,
  backupFileName,
  isValidBackupName,
  pruneOldest,
  formatBytes,
  buildPgArgs,
  buildPgEnv,
  buildOptimizeSql,
  summarizeMaintenanceStatus,
  DB_MAINTENANCE_SCHEMAS,
  DEFAULT_BACKUP_RETENTION,
} from "../services/identity/src/domain/dbMaintenance.ts";
import { createAssert } from "./helpers/assert.ts";

const { assert, summary } = createAssert();

console.log("=========================================");
console.log(" DATABASE BACKUP / OPTIMIZE HELPERS");
console.log("=========================================\n");

// --- parseDatabaseUrl -------------------------------------------------------
const parsed = parseDatabaseUrl("postgresql://sms:s3cret@postgres:5432/sms_db?sslmode=require");
assert(parsed !== null, "parses a valid postgres URL");
assert(parsed?.host === "postgres", "extracts host");
assert(parsed?.port === 5432, "extracts port");
assert(parsed?.database === "sms_db", "extracts database");
assert(parsed?.user === "sms", "extracts user");
assert(parsed?.password === "s3cret", "extracts password");
assert(parsed?.sslmode === "require", "extracts sslmode");

const noPort = parseDatabaseUrl("postgres://sms:sms@localhost/sms_db");
assert(noPort?.port === 5432, "defaults port to 5432");
assert(noPort?.sslmode === null, "sslmode null when absent");

assert(parseDatabaseUrl(null) === null, "null URL is null");
assert(parseDatabaseUrl("") === null, "empty URL is null");
assert(parseDatabaseUrl("mysql://x:y@h/db") === null, "non-postgres protocol is null");
assert(parseDatabaseUrl("postgresql://localhost/sms_db") === null, "missing user is null");
assert(parseDatabaseUrl("postgresql://sms:sms@localhost") === null, "missing database is null");
assert(parseDatabaseUrl("not a url") === null, "garbage is null");

// --- backupFileName ---------------------------------------------------------
const name = backupFileName(new Date("2026-10-16T12:30:45.123Z"));
assert(name.startsWith("sms_db_"), "backup name has expected prefix");
assert(name.endsWith(".sql"), "backup name has .sql extension");
assert(/^sms_db_2026-10-16T12-30-45-123Z\.sql$/.test(name), `backup name is timestamped (${name})`);
assert(
  backupFileName(new Date("2026-10-17T00:00:00.000Z")) !== name,
  "backup name changes with time"
);

// --- isValidBackupName ------------------------------------------------------
assert(isValidBackupName(name), "generated name is valid");
assert(!isValidBackupName("../../etc/passwd"), "blocks path traversal with slashes");
assert(!isValidBackupName("sms_db_2026-10-16T12-30-45-123Z.sql.bak"), "rejects wrong extension");
assert(!isValidBackupName("other_2026.sql"), "rejects wrong prefix");
assert(!isValidBackupName("../sms_db_x.sql"), "rejects leading traversal");
assert(!isValidBackupName("sms_db_x.sql "), "rejects trailing whitespace");
assert(!isValidBackupName(""), "rejects empty name");
assert(!isValidBackupName("sms_db_a..b.sql"), "rejects embedded double-dot");

// --- pruneOldest ------------------------------------------------------------
const files = [
  "sms_db_2026-10-13T00-00-00-000Z.sql",
  "sms_db_2026-10-16T00-00-00-000Z.sql",
  "sms_db_2026-10-14T00-00-00-000Z.sql",
  "sms_db_2026-10-15T00-00-00-000Z.sql",
];
const overflow = pruneOldest(files, 2);
assert(overflow.length === 2, "prune returns overflow count");
assert(overflow.includes("sms_db_2026-10-13T00-00-00-000Z.sql"), "prune removes oldest first");
assert(overflow.includes("sms_db_2026-10-14T00-00-00-000Z.sql"), "prune removes second oldest");
assert(!overflow.includes("sms_db_2026-10-16T00-00-00-000Z.sql"), "prune keeps newest");
assert(pruneOldest(files, 10).length === 0, "no overflow when under retention");
assert(pruneOldest(files, 0).length === 0, "invalid keep falls back to default (7) so 4 files are kept");
const many = Array.from({ length: 10 }, (_, i) =>
  `sms_db_2026-10-${String(i + 1).padStart(2, "0")}T00-00-00-000Z.sql`
);
assert(
  pruneOldest(many, 0).length === many.length - DEFAULT_BACKUP_RETENTION,
  "invalid keep uses default retention (7)"
);

// --- formatBytes ------------------------------------------------------------
assert(formatBytes(0) === "0 B", "0 bytes");
assert(formatBytes(512) === "512 B", "bytes under 1KB");
assert(formatBytes(1024) === "1.0 KB", "1KB");
assert(formatBytes(1536) === "1.5 KB", "1.5KB");
assert(formatBytes(1048576) === "1.0 MB", "1MB");
assert(formatBytes(-5) === "0 B", "negative is clamped");

// --- buildPgArgs / buildPgEnv ----------------------------------------------
const pgArgs = buildPgArgs(noPort!);
assert(pgArgs[0] === "-h" && pgArgs[1] === "localhost", "pg args include host");
assert(pgArgs.includes("-U") && pgArgs.includes("sms"), "pg args include user");
assert(pgArgs.includes("-d") && pgArgs.includes("sms_db"), "pg args include database");
assert(!pgArgs.some((a) => a.includes("sms") && a.includes("@")), "password never appears in args");

const sslArgs = buildPgArgs(parsed!);
assert(sslArgs.includes("sslmode=require"), "sslmode appended when present");

const env = buildPgEnv(parsed!);
assert(env.PGPASSWORD === "s3cret", "password passed via PGPASSWORD env");
assert(env.PGSSLMODE === "require", "sslmode passed via PGSSLMODE env");
assert(buildPgEnv(noPort!).PGPASSWORD === "sms", "env carries parsed password");

// --- buildOptimizeSql / schemas --------------------------------------------
assert(buildOptimizeSql() === "VACUUM (ANALYZE);", "optimize runs VACUUM (ANALYZE)");
for (const s of ["identity", "academic", "finance", "ops", "campus"]) {
  assert((DB_MAINTENANCE_SCHEMAS as readonly string[]).includes(s), `schema ${s} is maintained`);
}

// --- summarizeMaintenanceStatus ---------------------------------------------
const ready = summarizeMaintenanceStatus({
  urlConfigured: true,
  urlValid: true,
  pgDumpAvailable: true,
  psqlAvailable: true,
  s3Configured: true,
  backupsDir: "/app/backups",
  retention: 7,
});
assert(ready.ready, "fully provisioned status is ready");
assert(ready.backupReady && ready.optimizeReady, "both actions ready when fully provisioned");
assert(ready.issues.length === 0, "no issues when fully provisioned");
assert(ready.s3Configured && ready.retention === 7 && ready.backupsDir === "/app/backups", "status carries config through");

const notConfigured = summarizeMaintenanceStatus({
  urlConfigured: false,
  urlValid: false,
  pgDumpAvailable: true,
  psqlAvailable: true,
  s3Configured: false,
  backupsDir: "/app/backups",
  retention: 7,
});
assert(!notConfigured.ready, "missing URL is not ready");
assert(!notConfigured.backupReady && !notConfigured.optimizeReady, "missing URL blocks both actions");
assert(
  notConfigured.issues.some((i) => i.includes("DATABASE_MAINTENANCE_URL")),
  "missing URL is called out in issues"
);

const badUrl = summarizeMaintenanceStatus({
  urlConfigured: true,
  urlValid: false,
  pgDumpAvailable: true,
  psqlAvailable: true,
  s3Configured: false,
  backupsDir: "/app/backups",
  retention: 7,
});
assert(!badUrl.ready, "invalid URL is not ready");
assert(
  badUrl.issues.some((i) => i.includes("not a valid")),
  "invalid URL is called out in issues"
);

const missingTools = summarizeMaintenanceStatus({
  urlConfigured: true,
  urlValid: true,
  pgDumpAvailable: false,
  psqlAvailable: false,
  s3Configured: false,
  backupsDir: "/app/backups",
  retention: 7,
});
assert(!missingTools.ready, "missing pg tools is not ready");
assert(!missingTools.backupReady, "missing pg_dump blocks backup");
assert(!missingTools.optimizeReady, "missing psql blocks optimize");
assert(
  missingTools.issues.some((i) => i.includes("pg_dump")) &&
    missingTools.issues.some((i) => i.includes("psql")),
  "both missing tools are called out"
);

const partial = summarizeMaintenanceStatus({
  urlConfigured: true,
  urlValid: true,
  pgDumpAvailable: true,
  psqlAvailable: false,
  s3Configured: false,
  backupsDir: "/app/backups",
  retention: 7,
});
assert(partial.backupReady, "backup stays ready when only psql is missing");
assert(!partial.optimizeReady, "optimize is blocked when psql is missing");
assert(!partial.ready, "overall not ready when optimize is blocked");

summary("db-maintenance");
