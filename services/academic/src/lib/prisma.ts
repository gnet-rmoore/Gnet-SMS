import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `academic` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=academic
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { academicPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.academicPrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.academicPrisma = prisma;
}

export default prisma;
