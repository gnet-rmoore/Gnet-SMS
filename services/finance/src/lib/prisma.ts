import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `finance` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=finance
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { financePrisma?: PrismaClient };

export const prisma =
  globalForPrisma.financePrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.financePrisma = prisma;
}

export default prisma;
