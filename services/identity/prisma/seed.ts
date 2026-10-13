/**
 * Minimal identity seed: creates ONLY the default platform superadmin.
 * No demo school, no demo users — a clean platform where the superadmin
 * registers schools and users from the UI. Idempotent (upsert).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "superadmin@yoursms.com" },
    update: { passwordHash, name: "Super Admin", role: "SUPER_ADMIN", platformRole: "OWNER" },
    create: {
      email: "superadmin@yoursms.com",
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      platformRole: "OWNER",
      schoolId: null,
    },
  });

  console.log("[identity-seed] superadmin ready (email: superadmin@yoursms.com, password: admin123)");
}

main()
  .catch((e) => {
    console.error("[identity-seed] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());