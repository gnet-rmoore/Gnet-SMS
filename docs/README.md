# School ERP Platform Documentation

Welcome to the official documentation directory for the School ERP Platform. This directory contains detailed architectural specifications, data models, feature guides, and developer workflows to help you understand and extend the system.

## 📁 Documentation Map

### 0. [Docker setup — build & run on any computer](./DOCKER_SETUP.md)
Clone the repo, build containers with Docker Compose, open the SPA, demo logins, day-to-day commands, and troubleshooting.

### 1. [Gradebook & Grading Architecture](./gradebook-architecture.md)
Detailed breakdown of the custom grading configuration system:
- JSON-based `gradebookConfig` weights.
- Multi-category Grade Legends (`CLASS`, `ASSIGNMENT`, `QUIZ`).
- Weighted average calculations (Backend + Frontend parity).
- Dynamic columns inside Grade Sheets and Student Grade views.

### 2. [Database Schema & Models](./database-schema.md)
An overview of the database layout managed via Prisma and SQLite/PostgreSQL:
- Key entities: `School`, `User`, `GradeLegend`, `GradeScale`, `Grade`, `PeriodGradeSummary`, `AnnualGradeSummary`.
- Relationships and data flow for grade capturing and summary generations.

### 3. [Development & Operations Guide](./development-guide.md)
Instructions for local environment setups, database synchronization, migrations, testing, and production builds.

### 4. [ERP Features & Future Extensions Guide](./features-guide.md)
Comprehensive breakdown of the academic, student, financial, administrative, and logistical modules, alongside plans for future iterations.

### 5. [Academics Architecture: Grade Levels vs. Class Groups](./grade-level-vs-class-group.md)
Clear definitions, structural rules, and database mapping explaining the key distinction between Grade Levels, Class Groups, and Subject-Specific Classrooms.

### 6. [Super Admin Credentials](./SUPERADMIN_CREDENTIALS.md)
Platform credential services: capability matrix, AES-256-GCM encryption at rest, email-provider secrets, per-service reference, tests, and production runbook.

### 7. [Super Admin Database Maintenance](./SA_DATABASE_MAINTENANCE.md)
Backup Database (`pg_dump` + optional off-box copy) and Optimize Tables (`VACUUM ANALYZE`): endpoints, readiness status, configuration, troubleshooting, and runbook.

---

## 🚀 Key Features Overview

The School ERP Platform is a full-stack educational management system that features:
- **School settings customization** (branding color, grade sheet/report card templates, custom grading scales).
- **Comprehensive Grade Book** that calculates dynamic averages according to customizable category weights.
- **Academic workflows** covering calendar scheduling, exams creation, grading processes, report card generation, and student records.
- **Administration modules** for Admissions, Hostel, Cafeteria, Transport/Bus Routes, Security, Clinic, Procurement, and Financial Payroll/Expenses.
