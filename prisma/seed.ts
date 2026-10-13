import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = bcrypt.hashSync("admin123", 10);
  
  // 1. Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@yoursms.com" },
    update: { passwordHash },
    create: {
      email: "superadmin@yoursms.com",
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  // 2. Create a Default School
  const defaultSchool = await prisma.school.upsert({
    where: { slug: "demo-school" },
    update: {},
    create: {
      id: "60b493a8-10f2-4194-b822-e2872a164b89",
      name: "Demo International School",
      slug: "demo-school",
      schoolCode: "DEMO123",
      country: "United Kingdom",
      timezone: "Europe/London",
      contactEmail: "info@demoschool.com",
      status: "ACTIVE",
    },
  });

  // 3. Create Grade Levels (Skipped: do not automatically create default grade levels)
  const createdGradeLevels: any[] = [];

  // 4. Create Subjects
  const subjectsData = [
    { name: "Mathematics", code: "MATH" },
    { name: "English Language", code: "ENG" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SOC" },
    { name: "Physical Education", code: "PE" },
    { name: "Art", code: "ART" },
    { name: "Music", code: "MUS" },
    { name: "Information Technology", code: "IT" },
  ];

  for (const sub of subjectsData) {
    await prisma.subject.upsert({
      where: { 
        schoolId_code: {
          schoolId: defaultSchool.id,
          code: sub.code
        }
      },
      update: { schoolId: defaultSchool.id },
      create: {
        ...sub,
        schoolId: defaultSchool.id,
      },
    });
  }

  // 5. Create Users for all roles
  const roles = [
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

  const createdUsers = [];
  for (const userData of roles) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { 
        schoolId: defaultSchool.id,
        passwordHash: passwordHash,
        photoUrl: userData.role === "TEACHER" ? `https://i.pravatar.cc/150?u=${userData.email}` : null,
      },
      create: {
        ...userData,
        passwordHash,
        schoolId: defaultSchool.id,
        photoUrl: userData.role === "TEACHER" ? `https://i.pravatar.cc/150?u=${userData.email}` : null,
      },
    });
    createdUsers.push(user);
  }

  console.log("Seed data created successfully:");
  console.log("- Super Admin: superadmin@yoursms.com / admin123");
  console.log("- School Admin: schooladmin@yoursms.com / admin123");
  console.log("- Principal: principal@yoursms.com / admin123");
  console.log("- Teacher: teacher@yoursms.com / admin123");
  console.log("- Student: student@yoursms.com / admin123");
  console.log("- Parent: parent@yoursms.com / admin123");
  console.log("- Accountant: accountant@yoursms.com / admin123");
  console.log("- Registrar: registrar@yoursms.com / admin123");
  console.log("- VPI: vpi@yoursms.com / admin123");
  console.log("- VPA: vpa@yoursms.com / admin123");
  console.log("- Transportation: transport@yoursms.com / admin123");
  console.log("- Maintenance: maintenance@yoursms.com / admin123");
  console.log("- Librarian: librarian@yoursms.com / admin123");
  console.log("- Nurse: nurse@yoursms.com / admin123");
  console.log("- Counselor: counselor@yoursms.com / admin123");
  console.log("- Security: security@yoursms.com / admin123");
  console.log("- IT Admin: itadmin@yoursms.com / admin123");
  console.log("- Procurement: procurement@yoursms.com / admin123");
  console.log("- Athletics: athletics@yoursms.com / admin123");
  console.log("- Hostel: hostel@yoursms.com / admin123");
  console.log("- Cafeteria: cafeteria@yoursms.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
