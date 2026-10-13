import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testLogin() {
  const usersToTest = [
    { email: "superadmin@yoursms.com", password: "admin123" },
    { email: "schooladmin@yoursms.com", password: "admin123" },
    { email: "principal@yoursms.com", password: "admin123" },
    { email: "teacher@yoursms.com", password: "admin123" },
    { email: "student@yoursms.com", password: "admin123" },
    { email: "parent@yoursms.com", password: "admin123" },
    { email: "accountant@yoursms.com", password: "admin123" },
    { email: "registrar@yoursms.com", password: "admin123" },
    { email: "vpi@yoursms.com", password: "admin123" },
    { email: "vpa@yoursms.com", password: "admin123" },
    { email: "transport@yoursms.com", password: "admin123" },
    { email: "maintenance@yoursms.com", password: "admin123" },
    { email: "librarian@yoursms.com", password: "admin123" },
    { email: "nurse@yoursms.com", password: "admin123" },
    { email: "counselor@yoursms.com", password: "admin123" },
    { email: "security@yoursms.com", password: "admin123" },
    { email: "itadmin@yoursms.com", password: "admin123" },
    { email: "procurement@yoursms.com", password: "admin123" },
    { email: "athletics@yoursms.com", password: "admin123" },
    { email: "hostel@yoursms.com", password: "admin123" },
    { email: "cafeteria@yoursms.com", password: "admin123" },
  ];

  for (const testUser of usersToTest) {
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: { school: true },
    });

    if (!user) {
      console.log(`User ${testUser.email} not found`);
      continue;
    }

    const isMatch = bcrypt.compareSync(testUser.password, user.passwordHash);
    console.log(`Login for ${testUser.email}: ${isMatch ? "SUCCESS" : "FAILED"} (Role: ${user.role})`);
  }
}

testLogin().finally(() => prisma.$disconnect());
