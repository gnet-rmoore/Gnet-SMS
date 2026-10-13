import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";
const rawUrl = (process.env.DATABASE_URL || "").trim();

if (!rawUrl.startsWith("postgresql://") && !rawUrl.startsWith("postgres://")) {
  throw new Error(
    "FATAL: DATABASE_URL must be a PostgreSQL URL (postgresql://…). SQLite is not supported."
  );
}

const globalForPrisma = global as unknown as { prisma: PrismaClient; isVerified?: boolean };

const createClient = () =>
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: isProd ? ["warn", "error"] : ["warn", "error"],
  });

let activePrisma = globalForPrisma.prisma || createClient();

if (!isProd) {
  globalForPrisma.prisma = activePrisma;
}

let verificationPromise: Promise<boolean> | null = null;

/** Verifies DB connectivity. Does not self-heal — fail loudly if Postgres is down. */
export async function verifyAndHealDatabase(): Promise<boolean> {
  if (globalForPrisma.isVerified) {
    return true;
  }

  if (verificationPromise) {
    return verificationPromise;
  }

  verificationPromise = (async () => {
    try {
      await activePrisma.$queryRawUnsafe("SELECT 1;");
      await activePrisma.user.count();
      globalForPrisma.isVerified = true;
      return true;
    } catch (err: any) {
      console.error("[PRISMA] Database verification FAILED:", err.message);
      throw err;
    }
  })();

  try {
    return await verificationPromise;
  } finally {
    verificationPromise = null;
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const value = (activePrisma as any)[prop];
    if (typeof value === "function") {
      return value.bind(activePrisma);
    }
    return value;
  },
});

export default prisma;
