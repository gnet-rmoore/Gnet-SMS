import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `campus` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=campus
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { campusPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.campusPrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.campusPrisma = prisma;
}

export default prisma;
