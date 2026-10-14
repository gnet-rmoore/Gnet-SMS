/**
 * Minimal identity seed: ensures ONE platform superadmin exists.
 * No demo school, no demo users — a clean platform where the superadmin
 * registers schools and users from the UI.
 *
 * Run-once semantics: this is safe to run on EVERY boot. If any Super Admin
 * already exists it does nothing (no password reset, no duplicates), so the
 * account is created exactly once on first boot and never clobbered after.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_SUPER_ADMIN_EMAIL = "superadmin@yoursms.com";
const DEFAULT_SUPER_ADMIN_PASSWORD = "admin123";

async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { email: true },
  });
  if (existing) {
    console.log(
      `[identity-seed] Super Admin already exists (${existing.email}); skipping seeding.`
    );
    return;
  }

  const email = (process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
  const usingDefaultPassword = password === DEFAULT_SUPER_ADMIN_PASSWORD;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && usingDefaultPassword) {
    console.warn(
      "[identity-seed] WARNING: SUPER_ADMIN_PASSWORD is not set in production; " +
        `using insecure default. Log in and change the password, or set SUPER_ADMIN_PASSWORD and re-run with RUN_SEED=true.`
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Super Admin",
        role: "SUPER_ADMIN",
        platformRole: "OWNER",
        schoolId: null,
      },
    });
  } catch (e: any) {
    // Unique-constraint race (two containers starting at once): the other one won.
    if (e?.code === "P2002") {
      console.log(`[identity-seed] Super Admin already created concurrently; skipping.`);
      return;
    }
    throw e;
  }

  console.log(
    `[identity-seed] Super Admin created (email: ${email}, password: ${
      usingDefaultPassword ? DEFAULT_SUPER_ADMIN_PASSWORD : "<from SUPER_ADMIN_PASSWORD>"
    })`
  );
}

main()
  .catch((e) => {
    console.error("[identity-seed] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
