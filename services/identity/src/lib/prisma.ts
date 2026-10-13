import { PrismaClient } from "@prisma/client";
import { retryingPrisma } from "../../../shared/src/lib/prismaRetry";

const globalForPrisma = global as unknown as { identityPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.identityPrisma ??
  retryingPrisma(
    new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.identityPrisma = prisma;
}

export default prisma;
