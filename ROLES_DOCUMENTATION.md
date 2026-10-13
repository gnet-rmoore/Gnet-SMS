# School Management System: Role & Access Control Documentation

Welcome to the comprehensive documentation of the **Role-Based Access Control (RBAC)** architecture and Account Type matrices implemented within this modern School Management platform.

This system utilizes a highly granular, enterprise-grade permissions model dividing school staff, students, guardians, and external nodes into **21 distinct operational roles**. This structure secures confidential records, isolates administrative scopes, and provides **role-customized dashboards** (honest KPIs + role-aligned shortcuts; specialty roles get hub cards to their tools — see `docs/ROLE_DASHBOARDS_PLAN.md`).

> **Updated:** 2026-08-05 — campus specialist honesty note refreshed (see below).

> **Honesty (2026-08-05):** Campus specialist modules (Library, Clinic, Counseling, Hostel, Cafeteria, Athletics, Transport) are **live API-backed workflows** via the `campus` microservice (+ Ops for transport fleet). v1 limits (no GPS bus tracking, no library fines/Stripe, counselor notes ACL-only) are documented in `docs/CAMPUS_SPECIALISTS_PLAN.md`. Inventory nav labels (medical/food/digital stock) reuse the shared Ops `inventory` path — not separate product modules.

---

## 🏛️ Comprehensive Role Directory

### 1. Super Administrator (`SUPER_ADMIN`)
* **Scope**: Global Multi-tenant Governance
* **Description**: The highest authorization tier in the software ecosystem, responsible for provisioning new school nodes, auditing cross-school parameters, and configuring global system integrations.
* **Key Use Cases**:
  - Creating new school instances (sub-domains/slugs) and provisioning initial database templates.
  - Auditing global system health, error logs, and multi-tenant performance.
  - Setting up system-wide billing plans, integrations (e.g., mail gateways, SMS APIs), and master lookups.
* **Sidebar Portal Access**:
  - **Global Reports**: Cross-tenant dashboards containing macro enrollment, revenue, and system load.
  - **System Logs**: Live-updating event logs capturing security warnings and API traffic.
  - **Global Settings**: Master SMTP profiles, cloud storage buckets, and license parameters.

---

### 2. School Administrator (`SCHOOL_ADMIN`)
* **Scope**: School-Level Operations and Master Control
* **Description**: The local school tenant executive who has administrative override authority over all features, configurations, and staff assignments within their specific school slug.
* **Key Use Cases**:
  - Managing academic structures: Term schedules, grading frameworks, and custom grading periods.
  - Overseeing staff recruitment, profile assignments, and **Roles & Access** (`/{slug}/roles`) — assign roles and customize what each staff role can open or approve for this school.
  - Designing local announcements and managing school-wide document directories.
* **Sidebar Portal Access**:
  - **Dashboard**: School-wide core KPI metrics (total revenue, enrollment counts, class schedules).
  - **School Calendar / Academic Calendar**: Managing terms, holidays, and scheduling core events.
  - **Roles & Access**: Role assignment + per-school capability matrix (see `docs/ROLE_ACCESS_PLAN.md`).
  - **Staff Portal & Directories**: Direct staff profile editing, credential resets, and leaves approvals.
  - **Classrooms & Students**: Structuring sections, grade cohorts, and allocating rosters.
  - **Curriculum & Exams**: Setting guidelines, verifying test periods, and reviewing grade release queues.
  - **Financial Management**: Overseeing billing schemes, local payroll, and tuition fees collection.

---

### 3. School Principal (`PRINCIPAL`)
* **Scope**: Executive Leadership & Academic Governance
* **Description**: The academic visionary and executive leader of the school. Focuses on overall educational standards, curricular compliance, personnel well-being, and macro evaluation reports.
* **Key Use Cases**:
  - Reviewing terminal school performance metrics to determine educational effectiveness.
  - Authorizing leave requests submitted by teaching staff and specialty personnel.
  - Reviewing curriculums and high-stakes grade averages prior to releasing final grade cards.
* **Sidebar Portal Access**:
  - **Executive Dashboard**: Unified visual widgets on grades, teacher status, and enrollment.
  - **Curriculum & Classrooms**: Inspecting syllabus compliance and observing course modules.
  - **Staff Directory**: Professional profiles and direct appraisal trackers.
  - **Leave Approvals**: Assessing leave schedules for continuity of instruction.
  - **Reports Panel**: Standardized evaluations on school performance.

---

### 4. Vice Principal for Instruction (`VPI`)
* **Scope**: Instructional Integrity & Academic Supervision
* **Description**: Oversees the educational delivery, curricular mapping, exam standards, and classroom audits. Ensure all grade levels strictly maintain pedagogical rigor.
* **Key Use Cases**:
  - Designing course blueprints, module structures, and setting passing thresholds.
  - Auditing active homeroom discussion feeds, rosters, and lesson execution.
  - Inspecting examination calendars, scoring rules, and test security protocols.
  - Reviewing and signing off on grade sheets submitted by teachers prior to release.
* **Sidebar Portal Access**:
  - **Instructional Dashboard**: Specialized widgets measuring average student scores against a target benchmark (e.g., 80% average distribution chart).
  - **Curriculum Map**: Structuring master syllabus maps and course sequences.
  - **Academic Supervision**: Monitoring active sections, classroom environments, and teaching feeds.
  - **Exams & Assessment Center**: Administering examination periods, scheduling final tests, and auditing rosters.
  - **Grade Review & Approval**: Conducting final evaluations, releasing report cards, and executing batch mark approvals.

---

### 5. Vice Principal for Administration (`VPA`)
* **Scope**: Operations, Logistics, & Campus Safety
* **Description**: Coordinates the physical and operational machinery of the school, including Human Resources, inventory procurement pipelines, facilities maintenance, and gate security controls.
* **Key Use Cases**:
  - Monitoring campus operational outlays and utilities expenses via dedicated spending bar charts.
  - Managing staff registries, leaves allocation, and non-teaching personnel logs.
  - Approving equipment purchase orders (POs) and coordinating supply logistics.
  - Performing security audits, evaluating incident reports, and monitoring emergency protocols.
* **Sidebar Portal Access**:
  - **Operations Dashboard**: Financial outlays for maintenance, security services, utilities, and admin overheads.
  - **HR Management**: Staff folders, roles assignments, and administrative leave.
  - **Procurement Pipeline**: Material requisition orders, supply stocks tracking, and purchase authorizations.
  - **Facilities & Maintenance**: Launching maintenance work orders, assigning technicians, and monitoring campus repair logs.
  - **Security & Surveillance**: Unified executive console displaying emergency contacts, safety compliance guides, visitor flows, and security incidents logs.

---

### 6. Registrar (`REGISTRAR`)
* **Scope**: Student Lifecycle, Admissions, & Student Records
* **Description**: Manages student intake pipelines, personal file storage, classroom allocations, transcripts generation, and overall registration compliance.
* **Key Use Cases**:
  - Processing admissions applications, reviewing student histories, and managing admissions pipelines.
  - Uploading and updating **student profile photos** on the student dossier, records drawer, and edit forms (stored on Identity `User.photoUrl`; school admins and principals have the same capability).
  - Generating certified school transcripts and records requests for external universities or transfers.
  - Handling classroom-by-classroom registrations, waitlists, and cohort shifts.
* **Sidebar Portal Access**:
  - **Registrar Dashboard**: Application funnel charts and student enrollment rates.
  - **Admissions Portal**: Interactive list of pending, approved, and rejected applicants.
  - **Student Records Directory**: Central database of verified student demographics, contacts, and parental relationships.
  - **Transcripts**: Interface for generating, signing, and releasing official academic transcripts.
  - **Enrollment**: Finalizing student rosters and classroom placement matrices.

---

### 7. Teacher (`TEACHER`)
* **Scope**: Direct Instructional Delivery & Student Mentorship
* **Description**: Operates at the front line of education, managing day-to-day lessons, capturing attendance metrics, building assessments, scoring assignments, and directly guiding students.
* **Key Use Cases**:
  - Taking daily student attendance for homeroom classes and assigned subject streams.
  - Drafting lesson planners, uploading reference material, and organizing weekly assignments.
  - Creating exams, compiling grades, and writing performance summaries for report cards.
* **Sidebar Portal Access**:
  - **Teacher Dashboard**: Honest counts of assigned classrooms and roster seats; shortcuts to attendance, classes, gradebook, lesson plans, and exams (`docs/ROLE_DASHBOARDS_PLAN.md`).
  - **My Classes**: Individual student grids, syllabus trackers, and discussion forums.
  - **Curriculum Tools**: Course builders and material distribution tools.
  - **Attendance Portal**: Quick-grid for marking students present, tardy, or absent with notes.
  - **Exams & Grading**: Scoring interfaces for homework, tests, and final exams.

---

### 8. Student (`STUDENT`)
* **Scope**: Personalized Academic Journey
* **Description**: The primary consumer of the learning platform, focused on homework submissions, active testing, tracking grades, monitoring attendance, and viewing course files.
* **Key Use Cases**:
  - Accessing class materials, assignments instructions, and uploading completed work.
  - Viewing graded rubrics, test results, and tracking GPA charts.
  - Reviewing personal daily attendance statistics and class schedules.
* **Sidebar Portal Access**:
  - **Student Dashboard**: Personal classes, fees due, unread alerts; shortcuts to grades, online exams, fees, attendance, and schedule (no school-wide admin KPIs).
  - **My Classes**: Class feeds, syllabi, study libraries, and class rosters.
  - **My Grades**: Interactive lists of assignment and exam grades.
  - **My Attendance**: Graphical logs of monthly presence rates.
  - **Fees & Tuition**: View balances due, payment histories, and access online checkouts.

---

### 9. Parent / Guardian (`PARENT`)
* **Scope**: Family hub — linked children only; read-first with fee pay and PTA participation
* **Description**: Parents see attendance, classroom assignments, released grades/report cards, tuition, documents, school news, and PTA for **linked children only**. No fake metrics; no grades IDOR across families.
* **Key Use Cases**:
  - Switch child context (`?studentId=` / family hub) across Classes, Grades, Attendance, Fees.
  - Pay fees and download receipts; receive in-app alerts for absence/late, fee paid/due, grade release, announcements, PTA events.
  - Read school news; join PTA meetings (RSVP), volunteer signups, and campaign updates when the school enables PTA.
* **Sidebar Portal Access**:
  - **Family dashboard** — honest KPIs (children count, fees due, absences/late in 7d, unread alerts)
  - **My Children** — hub + child switcher + contact school (mailto/tel when configured)
  - **My Classes** — read-only classroom stream for selected child
  - **Grades** — released/accepted formal gradesheet + report card entry points
  - **Fees** — owing/paid + receipts
  - **Attendance** — scoped sessions + CSV export
  - **News** — announcements reader (`/announcements`)
  - **Documents**, **PTA**, **Notifications**, **Calendar**
* **Cannot**: edit grades, take roll call, administer other families, or manage PTA unless appointed as PTA officer.

---

### 10. Accountant (`ACCOUNTANT`)
* **Scope**: General Ledger, Accounts Receivable/Payable, & Payroll
* **Description**: Standardizing financial operations, tuition invoices, student payment processing, vendor expense logs, and staff salary processing.
* **Key Use Cases**:
  - Generating and releasing term-based tuition invoice plans for the entire student roster.
  - Logging check/cash payments, tracking overdue invoices, and issuing statements.
  - Calculating staff payroll based on hourly logs, deductions, and basic salary contracts.
* **Sidebar Portal Access**:
  - **Accountant Dashboard**: Real-time revenue trackers, aging invoice tables, and cash flows.
  - **Fee Management**: Individual invoice creation, waiver applications, and transaction registries.
  - **Expenses Ledger**: Tracking physical utility outlays, supply invoices, and school purchases.
  - **Payroll Hub**: Processing teaching and administrative staff salaries with printable payslips.

---

### 11. Transportation Officer (`TRANSPORTATION`)
* **Scope**: Bus Logistics, Route Schedules, & Driver Records
* **Description**: Coordinates student transportation networks, manages school buses, schedules student pickups, and monitors driver compliance logs.
* **Key Use Cases**:
  - Designing bus route nodes, student pickup groupings, and coordinating pickup schedules.
  - Logging vehicle inspection histories, oil changes, and fuel consumption logs.
  - Reviewing driver rosters, credentials, and work hours.
* **Sidebar Portal Access**:
  - **Logistics Dashboard**: Number of active routes, average occupancy rates, and vehicle status.
  - **Bus Routes**: Map coordinate grids, route sequences, and student seat assignments.
  - **Drivers Directory**: Contact indexes, license expiries, and schedule logs.
  - **Vehicle Maintenance**: Launching work orders for physical repairs of school buses.

---

### 12. Maintenance Team (`MAINTENANCE`)
* **Scope**: Facilities Operations, Repairs, & Physical Materials Inventory
* **Description**: Executes physically demanding repairs on the school infrastructure, monitors electrical/plumbing status, and tracks physical material inventory.
* **Key Use Cases**:
  - Resolving active work orders (e.g., HVAC troubleshooting, lighting repairs) opened by school staff.
  - Conducting periodic facility safety checks (e.g., fire alarm audits, chemical lab safety).
  - Managing hardware assets, tools, paint, and repair equipment stocks.
* **Sidebar Portal Access**:
  - **Maintenance Dashboard**: Pending tickets categorized by urgency levels (Low, Medium, High).
  - **Work Orders Feed**: Open work orders, progress update tools, and completion signatures.
  - **Materials Inventory**: Logs of spare parts, paint supplies, and electrical equipment.
  - **Facility Repairs**: Preventative scheduling for campus buildings and structures.

---

### 13. Librarian (`LIBRARIAN`)
* **Scope**: Information resources (nav)
* **Maturity:** Stub — Library page shows an honest empty state until catalog APIs exist.
* **Live access today**: School Calendar, Staff Portal, Inventory path (Ops) where enabled.

---

### 14. School Nurse (`NURSE`)
* **Scope**: Campus health (nav)
* **Maturity:** Stub — Clinic page is empty until health records APIs exist.
* **Live access today**: School Calendar, Staff Portal, Inventory path where enabled.

---

### 15. Counselor (`COUNSELOR`)
* **Scope**: Student well-being guidance
* **Maturity:** Counseling workspace is stub; **Student directory is live (read)** for well-being lookup.
* **Live access today**: Calendar, My Schedule, Students (read), Staff Portal.

---

### 16. Security Officer (`SECURITY`)
* **Scope**: Ground-level physical security & incident logs
* **Description**: Security logs are **live** (Ops API). Visitor gate / patrol checklist UI is session-local until a visitor API ships — no seeded fake guests.
* **Key Use Cases**:
  - Recording security incidents (type, severity, location) via the live logs API.
  - Optional local visitor check-in tooling (not persisted server-side yet).
* **Sidebar Portal Access**:
  - **Security Incidents**: Live log feed + create (Admin / Security).
  - **Staff Directory**: Staff lookup for call-downs.

---

### 17. IT Administrator (`IT_ADMIN`)
* **Scope**: Digital Infrastructure & Account Operations
* **Description**: Handles system health parameters, provisions new student/teacher account credentials, handles permissions, and reviews active database metrics.
* **Key Use Cases**:
  - Batch provisioning initial school credentials and handling user password resets.
  - Checking server nodes, network responses, and resolving integration errors.
  - Reviewing database queries and auditing application log histories.
* **Sidebar Portal Access**:
  - **IT Console**: Server performance, active connections, and latency counters.
  - **User Account Management**: Directory of all system accounts with manual override buttons.
  - **System Logs**: Comprehensive error trace logs, database telemetry, and authorization failures.

---

### 18. Procurement Specialist (`PROCUREMENT`)
* **Scope**: Central Logistics, Warehouse Stock, & Supply Purchasing
* **Description**: Reviews purchasing requests submitted by academic departments, sources vendors, logs central warehouse stocks, and monitors delivery confirmations.
* **Key Use Cases**:
  - Processing raw physical supply requests from science labs, admin staff, or teachers.
  - Sourcing pricing quotes, issuing official Purchase Orders (POs) to external suppliers.
  - Tracking central warehouse stocks (stationery, electronics, cleaning inventory).
* **Sidebar Portal Access**:
  - **Purchasing Hub**: Pipeline showing pending, approved, and fulfilled POs.
  - **Warehouse Stock Management**: Categorized view of school logistics items and replenishment thresholds.

---

### 19. Athletics Director (`ATHLETICS_DIRECTOR`)
* **Scope**: Sports programs (nav)
* **Maturity:** Stub empty state until athletics APIs exist. Calendar + Staff Portal are live.

---

### 20. Hostel Warden (`HOSTEL_WARDEN`)
* **Scope**: Boarding / hostel (nav)
* **Maturity:** Stub empty state. Related attendance routes may exist for oversight roles.

---

### 21. Cafeteria Manager (`CAFETERIA_MANAGER`)
* **Scope**: Cafeteria (nav)
* **Maturity:** Stub empty state until meal APIs exist.

---

## 🔒 Crucial Cross-Role Integrations & Operational Handshakes

The power of this RBAC design lies in its **intentional separation of concerns** which translates into streamlined workflows. Below are the key interactions between different roles:

```
[Student Application] 
       │
       ▼ (Submits)
[REGISTRAR] (Approves & Assigns Class) ──► [VPI] (Assigns Curriculum / Schedule)
       │
       ▼ (Calculates Tuition Invoice)
[ACCOUNTANT] (Generates Bill) ───────────► [PARENT] (Reviews & Processes Payment)
```

### A. Academic Lifecycle Coordination (`REGISTRAR` ⇄ `VPI` ⇄ `TEACHER`)
1. **Enrollment Phase**: The `REGISTRAR` processes incoming admissions and places the student in a grade-level cohort.
2. **Curriculum Assignment**: The `VPI` assigns the curriculum track to that cohort, automatically structuring the classes that student will attend.
3. **Execution**: The `TEACHER` gains access to the student profile, registers their daily presence, and inputs grades according to the syllabus maps designed by the `VPI`.

### B. Grade Verification & Release Cycle (`TEACHER` ⇄ `VPI` / `PRINCIPAL` / `SCHOOL_ADMIN`)
1. **Drafting**: The `TEACHER` enters marks and submits a grade-review batch.
2. **Audit / approve**: `VPI`, `PRINCIPAL`, or `SCHOOL_ADMIN` can approve or return the batch (shared authority — there is no Principal-only final gate in code).
3. **Visibility**: After approval / release workflows complete, grades are visible to `STUDENT` and `PARENT` portals as implemented in Grade Review.

### C. Financial & Procurement Pipeling (`VPA` ⇄ `PROCUREMENT` ⇄ `ACCOUNTANT`)
1. **Requisition**: Physical departments request materials (e.g., Science supplies, school books).
2. **Logistics Approval**: The `PROCUREMENT` specialist sources options and submits a PO.
3. **Executive Authorization**: The `VPA` reviews the cost metrics on the Admin console and signs off on high-value orders.
4. **Disbursement**: The `ACCOUNTANT` records the expense ledger, processes payment, and issues payment confirmation to the vendor.

### D. Campus Safety & Incident Protocol (`SECURITY` ⇄ `VPA` ⇄ `MAINTENANCE`)
1. **Observation**: A `SECURITY` officer on duty notices a broken window pane on the East Campus Wall and logs an incident report under "High Severity".
2. **Audit & Escalation**: The `VPA` views the incident on their dashboard and issues a priority maintenance request.
3. **Resolution**: The `MAINTENANCE` team receives a high-urgency work order, repairs the window, updates the status, and checks out the necessary parts from the materials inventory.

---

## 📊 Summary Authorization Grid

| Interface / Module | Super Admin | School Admin | Principal | Registrar | VPI | VPA | Teacher | Accountant | Security | Student / Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Global Multitenancy Settings** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Syllabus / Curriculum Maps** | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | 📝 | ❌ | ❌ | ❌ |
| **Student Demographics & Admissions**| ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | 👁️ | 👁️ | ❌ | ❌ |
| **Grade Review & Release Approval** | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Financial Ledgers & Payroll** | ❌ | ✅ | 👁️ | ❌ | ❌ | 👁️ | ❌ | ✅ | ❌ | ❌ |
| **Procurement & Purchase Approvals** | ❌ | ✅ | 👁️ | ❌ | ❌ | ✅ | ❌ | 👁️ | ❌ | ❌ |
| **Physical Security Logs Creation** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Physical Security Audit Console** | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | 👁️ | ❌ |
| **Confidential Clinic Medicine Files** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Legend: ✅ Full Control | 📝 Write/Edit | 👁️ Read-Only | ❌ No Access*

> Clinic medicine files are **not** implemented — the grid marks no access rather than implying Admin control of a missing module.
