import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `lifecycle` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=lifecycle
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { lifecyclePrisma?: PrismaClient };

export const prisma =
  globalForPrisma.lifecyclePrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.lifecyclePrisma = prisma;
}

export default prisma;
