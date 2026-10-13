import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

/**
 * Real Prisma client for the `classroom` schema.
 * Requires DATABASE_URL to point at Postgres with ?schema=classroom
 * (or multi-schema mode — see prisma/schema.prisma).
 */
const globalForPrisma = global as unknown as { classroomPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.classroomPrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.classroomPrisma = prisma;
}

export default prisma;
