/**
 * PostgreSQL-only Prisma bootstrap.
 * Regenerates the client. Rejects SQLite URLs. Uses a generate-time placeholder
 * when DATABASE_URL is unset (e.g. npm postinstall) — runtime still requires a real Postgres URL.
 */
import { execSync } from "child_process";

const GENERATE_PLACEHOLDER =
  "postgresql://build:build@127.0.0.1:5432/sms_db?schema=public";

function resolveDatabaseUrl(): string {
  const url = (process.env.DATABASE_URL || "").trim();

  if (url.startsWith("file:") || url.includes("dev.db") || process.env.DATABASE_PROVIDER === "sqlite") {
    console.error(
      "[PRISMA SETUP] FATAL: SQLite is not supported. Set DATABASE_URL to a PostgreSQL URL " +
        "(e.g. postgresql://sms:sms@localhost:5432/sms_db?schema=public)."
    );
    process.exit(1);
  }

  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return url;
  }

  console.warn(
    "[PRISMA SETUP] DATABASE_URL unset or non-Postgres — using generate placeholder. " +
      "Runtime requires a real postgresql:// URL."
  );
  process.env.DATABASE_URL = GENERATE_PLACEHOLDER;
  return GENERATE_PLACEHOLDER;
}

function setup() {
  console.log("[PRISMA SETUP] PostgreSQL-only mode");
  resolveDatabaseUrl();
  process.env.DATABASE_PROVIDER = "postgresql";

  try {
    console.log("[PRISMA SETUP] Regenerating Prisma Client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("[PRISMA SETUP] Prisma Client generated successfully!");
  } catch (err: any) {
    console.error("[PRISMA SETUP] Failed to generate Prisma Client:", err.message);
    process.exit(1);
  }
}

setup();
