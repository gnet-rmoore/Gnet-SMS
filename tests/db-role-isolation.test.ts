/**
 * Phase A DB isolation: SQL contract + optional live Postgres check.
 * Run: npm run test:db-roles
 *
 * Live check needs compose Postgres + roles applied:
 *   docker compose up -d postgres db-roles
 */
import { readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const sqlPath = join(process.cwd(), "docker/postgres/init-schemas.sql");
const sql = readFileSync(sqlPath, "utf8");

const schemas = [
  "identity",
  "lifecycle",
  "ops",
  "staff",
  "classroom",
  "academic",
  "finance",
  "comms",
] as const;

const roles = schemas.map((s) => `sms_${s}`);

console.log("=========================================");
console.log(" DB ROLE ISOLATION (Phase A) TESTS       ");
console.log("=========================================\n");

console.log("[SQL contract]");
for (const schema of schemas) {
  assert(
    sql.includes(`CREATE SCHEMA IF NOT EXISTS ${schema}`),
    `defines schema ${schema}`
  );
}
for (const role of roles) {
  assert(sql.includes(`'${role}'`), `defines role ${role}`);
}
assert(sql.includes("GRANT USAGE, CREATE ON SCHEMA"), "grants USAGE+CREATE on own schema");
assert(sql.includes("REVOKE ALL ON SCHEMA public FROM"), "revokes public schema from service roles");
assert(
  sql.includes("ONE managed Postgres") || sql.includes("same Postgres cluster"),
  "documents single-cluster posture"
);

console.log("\n[Live Postgres — optional]");
const pgCheck = spawnSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "sms",
    "-d",
    "sms_db",
    "-tAc",
    "SELECT 1 FROM pg_roles WHERE rolname = 'sms_finance'",
  ],
  { encoding: "utf8", cwd: process.cwd() }
);

if (pgCheck.status !== 0 || !pgCheck.stdout.trim().startsWith("1")) {
  console.log("SKIPPED: live role checks (start postgres + db-roles to enable)");
} else {
  assert(true, "sms_finance role exists");

  const canOwn = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "sms_finance",
      "-d",
      "sms_db",
      "-tAc",
      "SELECT has_schema_privilege('sms_finance', 'finance', 'USAGE')",
    ],
    { encoding: "utf8", cwd: process.cwd(), env: { ...process.env, PGPASSWORD: "sms_finance" } }
  );
  // Inside container, peer/password auth uses role password via connection — use sms + SET ROLE instead
  const financeUsage = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "sms",
      "-d",
      "sms_db",
      "-tAc",
      "SELECT has_schema_privilege('sms_finance', 'finance', 'USAGE') AND NOT has_schema_privilege('sms_finance', 'identity', 'USAGE')",
    ],
    { encoding: "utf8", cwd: process.cwd() }
  );
  assert(
    financeUsage.stdout.trim() === "t",
    "sms_finance can use finance schema but not identity"
  );

  const identityUsage = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "sms",
      "-d",
      "sms_db",
      "-tAc",
      "SELECT has_schema_privilege('sms_identity', 'identity', 'USAGE') AND NOT has_schema_privilege('sms_identity', 'finance', 'USAGE')",
    ],
    { encoding: "utf8", cwd: process.cwd() }
  );
  assert(
    identityUsage.stdout.trim() === "t",
    "sms_identity can use identity schema but not finance"
  );

  void canOwn;
}

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All db-role tests passed");
