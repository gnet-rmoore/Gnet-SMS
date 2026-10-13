import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `comms` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=comms
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { commsPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.commsPrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.commsPrisma = prisma;
}

export default prisma;
