# School Management System - Default Credentials

This file contains the default credentials for the application. These are automatically seeded when the application starts if the database is empty.

## Super Admin
- **Email:** superadmin@yoursms.com (or `SUPER_ADMIN_EMAIL`)
- **Password:** admin123 (or `SUPER_ADMIN_PASSWORD`)
- **Portal:** Super Admin Login
- **Seeding:** the Identity seed runs automatically on every boot and is
  idempotent — it creates the Super Admin only if none exists (checked by role
  `SUPER_ADMIN`), then skips every later boot. No manual step and no password
  reset. Set `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` to control the first
  account. See `services/identity/prisma/seed.ts`.

## School Staff (Demo School)
- **School Admin:** schooladmin@yoursms.com
- **Principal:** principal@yoursms.com
- **Teacher:** teacher@yoursms.com
- **Student:** student@yoursms.com
- **Parent:** parent@yoursms.com
- **Password (All Staff):** admin123

## Configuration
- **Demo School Name:** Demo International School
- **School Code:** DEMO123
- **Slug:** demo-school

---
*Note: These credentials are intended for demo purposes and should be changed in a production environment.*
