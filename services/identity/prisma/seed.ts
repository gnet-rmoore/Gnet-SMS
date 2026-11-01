/**
 * Identity seed.
 *
 * Always ensures ONE platform superadmin exists (idempotent, run-once semantics).
 *
 * Optionally seeds a demo school + demo persona users when `SEED_DEMO=true`
 * (idempotent upserts). This is used by the nightly Playwright/HTTP smoke jobs,
 * which log in as schooladmin@ / teacher@ / student@ / parent@ / librarian@.
 * It is OFF by default so production stays a clean platform.
 *
 * Run-once semantics for the super admin: safe to run on EVERY boot. If any
 * Super Admin already exists it does nothing (no password reset, no duplicates).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_SUPER_ADMIN_EMAIL = "superadmin@yoursms.com";
const DEFAULT_SUPER_ADMIN_PASSWORD = "admin123";

const DEMO_PASSWORD = "admin123";
const DEMO_SCHOOL_SLUG = "demo-school";

const DEMO_USERS = [
  { role: "SCHOOL_ADMIN", email: "schooladmin@yoursms.com", name: "School Admin" },
  { role: "PRINCIPAL", email: "principal@yoursms.com", name: "School Principal" },
  { role: "TEACHER", email: "teacher@yoursms.com", name: "Classroom Teacher" },
  { role: "STUDENT", email: "student@yoursms.com", name: "Demo Student" },
  { role: "PARENT", email: "parent@yoursms.com", name: "Demo Parent" },
  { role: "ACCOUNTANT", email: "accountant@yoursms.com", name: "School Accountant" },
  { role: "REGISTRAR", email: "registrar@yoursms.com", name: "School Registrar" },
  { role: "VPI", email: "vpi@yoursms.com", name: "VP Instruction" },
  { role: "VPA", email: "vpa@yoursms.com", name: "VP Administration" },
  { role: "TRANSPORTATION", email: "transport@yoursms.com", name: "Transport Manager" },
  { role: "MAINTENANCE", email: "maintenance@yoursms.com", name: "Maintenance Manager" },
  { role: "LIBRARIAN", email: "librarian@yoursms.com", name: "School Librarian" },
  { role: "NURSE", email: "nurse@yoursms.com", name: "School Nurse" },
  { role: "COUNSELOR", email: "counselor@yoursms.com", name: "School Counselor" },
  { role: "SECURITY", email: "security@yoursms.com", name: "Security Chief" },
  { role: "IT_ADMIN", email: "itadmin@yoursms.com", name: "IT Administrator" },
  { role: "PROCUREMENT", email: "procurement@yoursms.com", name: "Procurement Officer" },
  { role: "ATHLETICS_DIRECTOR", email: "athletics@yoursms.com", name: "Athletics Director" },
  { role: "HOSTEL_WARDEN", email: "hostel@yoursms.com", name: "Hostel Warden" },
  { role: "CAFETERIA_MANAGER", email: "cafeteria@yoursms.com", name: "Cafeteria Manager" },
];

async function seedSuperAdmin() {
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

async function seedDemo() {
  if (process.env.SEED_DEMO !== "true") return;

  console.log("[identity-seed] SEED_DEMO=true — seeding demo school + persona users.");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const school = await prisma.school.upsert({
    where: { slug: DEMO_SCHOOL_SLUG },
    update: {
      planCode: "ENTERPRISE",
      billingStatus: "COMP",
    },
    create: {
      name: "Demo International School",
      slug: DEMO_SCHOOL_SLUG,
      schoolCode: "DEMO123",
      country: "United Kingdom",
      timezone: "Europe/London",
      contactEmail: "info@demoschool.com",
      status: "ACTIVE",
      planCode: "ENTERPRISE",
      billingStatus: "COMP",
      onboardingComplete: true,
    },
  });

  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        schoolId: school.id,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        schoolId: school.id,
        isActive: true,
        mustChangePassword: false,
        photoUrl:
          u.role === "TEACHER" ? `https://i.pravatar.cc/150?u=${u.email}` : null,
      },
    });
  }

  console.log(
    `[identity-seed] demo school "${DEMO_SCHOOL_SLUG}" + ${DEMO_USERS.length} users ready (password: ${DEMO_PASSWORD}).`
  );
}

async function main() {
  await seedSuperAdmin();
  await seedDemo();
}

main()
  .catch((e) => {
    console.error("[identity-seed] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
