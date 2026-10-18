# School Management System (SMS)

A comprehensive, full-stack enterprise-grade School Management System designed to handle academic, administrative, and collaborative functions for educational institutions.

## Run on another computer (Docker)

**Recommended:** build and run the full stack with Docker Compose. You do not need Node.js on the host for this path. Development layers `docker-compose.dev.yml` on top of the base file (it publishes Postgres/Redis on localhost and uses localhost origins); production uses `docker-compose.prod.yml` instead.

```bash
git clone <YOUR_REPO_URL> Gnet-SMS-2026
cd Gnet-SMS-2026
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

If you have Node.js installed, the shorthand is `npm run docker:dev`.

Then open **http://localhost:8080** and sign in with a demo account (password `admin123`), e.g. `schooladmin@yoursms.com`.

Full guide (prerequisites, ports, logs, rebuilds, troubleshooting): **[`docs/DOCKER_SETUP.md`](./docs/DOCKER_SETUP.md)**. Dev vs. production run model: **[`docs/RUN_DEV_AND_PROD_PLAN.md`](./docs/RUN_DEV_AND_PROD_PLAN.md)**.

## 🚀 Overview

The SMS platform provides a centralized hub for school stakeholders including Super Admins, School Admins, Principals, Teachers, Students, and Parents. It streamlines complex processes like admissions, grading, payroll, and classroom communication in a modern, intuitive interface.

### Key Functional Areas
- **Multi-School Management**: Global control for Super Admins to manage multiple institutions.
- **Curriculum & Academics**: Define subjects, grade levels, and complex academic calendars with weighted periods.
- **Digital Classrooms**: Virtual learning spaces with real-time feeds, assignment submissions, and student-teacher interaction.
- **Advanced Grading System**: Secure grade entry, multi-level review workflows, and automated generation of official report cards and transcripts.
- **School Operations**: Automated attendance tracking, staff leave management, inventory control, and vehicle logistics.
- **Financial Suite**: Fee payment processing, payroll management, and expense requisition.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Motion (Framer Motion)](https://www.framer.com/motion/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: JWT (JSON Web Tokens) & Bcryptjs
- **Real-time**: [Socket.io](https://socket.io/)
- **Utilities**: Node-cron (Task scheduling), Nodemailer (Email)

### Database
- **Development & Testing**: [SQLite](https://www.sqlite.org/) (Local light-weight zero-config database)
- **Production**: [PostgreSQL](https://www.postgresql.org/) (High-concurrency robust cloud-hosted relational database)
- **Integration Layer**: Custom schema provider injection scripts powered by [Prisma ORM](https://www.prisma.io/)

---

## 🔑 Account Roles & Credentials

The system supports a wide range of specialized roles. Below are the primary seeded accounts for testing, followed by the complete list of available roles in the platform.

### Seeded Demo Accounts
All demo accounts share the password: `admin123`

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@yoursms.com` | Global system management, multi-school oversight. |
| **School Admin** | `schooladmin@yoursms.com` | Primary administrator for a specific school. |
| **Principal** | `principal@yoursms.com` | Head of academic operations and school leadership. |
| **Teacher** | `teacher@yoursms.com` | Classroom management, grade entry, and student interaction. |
| **Student** | `student@yoursms.com` | Learning access, assignments, and performance tracking. |
| **Parent** | `parent@yoursms.com` | Oversight of child progress and communication. |

### 📋 Full List of Supported Roles

The platform includes granular permissions for various departments:

| Category | Roles |
| :--- | :--- |
| **Administration** | `SUPER_ADMIN`, `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI` (Instruction), `VPA` (Administration), `REGISTRAR` |
| **Academic** | `TEACHER`, `STUDENT`, `PARENT`, `LIBRARIAN`, `COUNSELOR`, `ATHLETICS_DIRECTOR` |
| **Operations** | `IT_ADMIN`, `SECURITY`, `TRANSPORTATION`, `MAINTENANCE`, `PROCUREMENT`, `HOSTEL_WARDEN`, `CAFETERIA_MANAGER` |
| **Business/Finance** | `ACCOUNTANT` |
| **Health** | `NURSE` |

---

## ⚙️ Operation & Maintenance

### Dual Database Setup (SQLite & PostgreSQL)
The system is built to seamlessly switch between **SQLite** (for zero-setup local development and rapid testing) and **PostgreSQL** (for high-performance enterprise production).

#### How it Works:
1. **Dynamic Detection**: During key life-cycle stages (`postinstall`, `predev`, and `prebuild`), the automation script `prisma/setup-provider.ts` inspects the active `DATABASE_URL` and `DATABASE_PROVIDER` environment variables.
2. **Schema Adaptation**: If a PostgreSQL connection string (`postgresql://` or `postgres://`) or `DATABASE_PROVIDER=postgresql` is detected, the script updates the datasource provider in `prisma/schema.prisma` to `"postgresql"` and automatically regenerates the Prisma client. Otherwise, it defaults to `"sqlite"`.
3. **Automatic Lifecycle Hooks**: This is fully integrated into our standard `npm` commands, meaning you do not need to manually configure the schema.

#### Environment Variables (.env):
Configure the following keys in your environment or `.env` file:
```env
# For SQLite local development:
DATABASE_URL="file:./dev.db"
DATABASE_PROVIDER="sqlite"

# For PostgreSQL production deployment:
DATABASE_URL="postgresql://user:password@localhost:5432/sms_db?schema=public"
DATABASE_PROVIDER="postgresql"
```

### 📊 Dynamic Gradebook & Weighted Calculation Architecture

The platform supports a fully dynamic, configurable gradebook and legend mapping system on both the backend calculation engines and the frontend reporting templates.

#### 1. Dynamic Gradebook Configuration (`gradebookConfig`)
Each school can customize its weighted categories (e.g., Homework, Quizzes, Classwork, Exams) via a JSON config stored on the `School` entity. 

- **Default categories and weights**:
  - `HW` (Homework): 20%
  - `QZ` (Quizzes): 20%
  - `CW` (Class Work): 10%
  - `MID` (Midterm Exam): 20%
  - `FIN` (Final Exam): 30%
- **Matching Mechanism**: Grade entries are grouped by subject and mapped to specific category columns using either the `shortCode` or `componentType` of the linked `ExamComponent`.

#### 2. Weighted Averages Calculation
Weighted averages are computed consistently across:
- **Backend Service**: `src/services/gradeService.ts` computes and persists the `PeriodGradeSummary` and `AnnualGradeSummary` based on the configured category weights.
- **Frontend Views**: `StudentGrades.tsx` and `GradeSheetTemplates.tsx` dynamically calculate synchronized overall score averages from grade lists to ensure absolute user interface consistency.

#### 3. Custom Grade Legends (`gradeLegends`)
Scale mapping converts numeric percentages (0-100) to corresponding letter grades and remarks using school-specific `GradeLegend` entities:
- Supports multi-category scales (e.g. general `CLASS` scale, or category-specific scales like `QUIZ` or `ASSIGNMENT`).
- Dynamically queries active school-specific scales to render exact letter grades (e.g., `A+`, `B`, `F`) and remarks dynamically in report cards and transcript views.

### Development Environment
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Database & Seed**:
   ```bash
   npx prisma db push
   ```
   ```bash
   npx prisma db seed
   ```
3. **Start Application**:
   ```bash
   npm run dev
   ```

### Database Management
- **View Data GUI**: Run `npx prisma studio` to open a web browser for direct database browsing and editing.
- **Pushing Changes**: In development, use `npx prisma db push` to push schema changes directly to SQLite. For production PostgreSQL, use Prisma migrations or sync patterns.

### Key Maintenance Endpoints
- **Seeding**: The application includes an internal seeding service at `src/server/services/seedService.ts` to reset or populate demo data.

---

## 📂 Project Structure

- `src/server/`: Express backend (controllers, services, routes).
- `src/pages/`: React views organized by functionality.
- `src/components/`: Reusable UI components.
- `src/store/`: Global state definitions.
- `prisma/`: Database schema and seeding scripts.

---

## 📝 License
This project is licensed under the MIT License.
