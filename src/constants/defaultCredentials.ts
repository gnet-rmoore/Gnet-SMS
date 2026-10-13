/**
 * Default credentials for the School Management System.
 * This file is used for auto-seeding the database in demo/production environments.
 */
export const DEFAULT_CREDENTIALS = {
  SUPER_ADMIN: {
    email: "superadmin@yoursms.com",
    password: "admin123",
    name: "Super Admin",
  },
  SCHOOL_ADMIN: {
    email: "schooladmin@yoursms.com",
    password: "admin123",
    name: "School Admin",
  },
  PRINCIPAL: {
    email: "principal@yoursms.com",
    password: "admin123",
    name: "School Principal",
  },
  TEACHER: {
    email: "teacher@yoursms.com",
    password: "admin123",
    name: "Classroom Teacher",
  },
  STUDENT: {
    email: "student@yoursms.com",
    password: "admin123",
    name: "Demo Student",
  },
  PARENT: {
    email: "parent@yoursms.com",
    password: "admin123",
    name: "Demo Parent",
  },
  SEED_PASSWORD: "seed123", // Password for the /api/debug/seed endpoint
};

export const DEFAULT_SCHOOL = {
  id: "60b493a8-10f2-4194-b822-e2872a164b89",
  name: "Demo International School",
  slug: "demo-school",
  schoolCode: "DEMO123",
  country: "United Kingdom",
  timezone: "Europe/London",
  contactEmail: "info@demoschool.com",
  status: "ACTIVE",
};
