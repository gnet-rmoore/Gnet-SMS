import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `ops` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=ops
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { opsPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.opsPrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.opsPrisma = prisma;
}

export default prisma;
