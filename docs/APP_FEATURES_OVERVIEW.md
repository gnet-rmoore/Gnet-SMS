# Gnet SMS — App features overview

> **Audience:** Product, ops, and new engineers  
> **Sources of truth:** `src/constants/navByRole.ts`, `src/App.tsx`, `IMPLEMENTATION_STATUS.md`, domain `docs/*_PLAN.md`  
> **Updated:** 2026-08-05  
> **Note:** Specialty modules (library, clinic, hostel, etc.) are **live** (Campus service) with documented v1 limits — see `docs/CAMPUS_SPECIALISTS_PLAN.md`.

This document answers: **what exists in the product**, organized by **platform layout** and **account type (role)**.

---

## 1. How the product is laid out

| Layer | URL pattern | Who |
| :--- | :--- | :--- |
| **Public** | `/` (marketing landing), `/login`, `/register-school`, `/invite/:token`, `/apply/:slug`, `/verify/receipt/:code`, checkout helpers | Anyone (unauthenticated); signed-in users hitting `/` redirect to dashboard |
| **Platform (super admin)** | `/super-admin/…` | `SUPER_ADMIN` only |
| **School tenant** | `/{schoolSlug}/…` | Users belonging to that school |
| **Shared chrome** | Layout sidebar from role nav; profile; in-app notifications bell | All authenticated school users (where enabled) |

School features live under the tenant slug. The same path (e.g. `/fees`) behaves differently for accountant vs parent.

Microservices behind the SPA: **Identity**, **Lifecycle**, **Staff**, **Classroom**, **Academic**, **Finance**, **Ops**, **Comms**, **Campus**, plus **API gateway**. Details: `IMPLEMENTATION_STATUS.md`.

---

## 2. Public & onboarding surfaces

| Feature | Path | What it does |
| :--- | :--- | :--- |
| Marketing landing | `/` | Public SMS product site: slim campus hero, 8 capability pillars, interactive product tour, filterable module catalog (live + honest stubs), role journeys, FAQ, SEO/OG; language picker (`public.landing.*`). Plan: `docs/LANDING_PAGE_OVERHAUL_PLAN.md` |
| Login | `/login` | Sign in; school context from membership |
| Register school | `/register-school` (+ confirm) | Public school registration funnel |
| Invite accept | `/invite/:token` | Staff/admin invite → account |
| Public apply | `/apply/:slug` (+ status) | Family applies online; Registrar enables link + optional returning re-registration |
| Public apply status | `/apply/:slug/status?id=&token=` | Token-based lookup for one application (not a logged-in parent hub) |
| Receipt verify | `/verify/receipt/:code` | QR/public check of Finance receipts |
| Mock checkout | `/checkout/mock` | Dev/console fee payment path |

**Deeper doc:** `ONBOARDING_AND_ADMISSION_PLAN.md`

---

## 3. Platform — Super Admin

| Nav label | Path | Purpose |
| :--- | :--- | :--- |
| Dashboard | `/super-admin` | Platform overview (honest student totals) |
| Schools | `/super-admin/schools` | Tenant schools + **student/staff counts** |
| School directory | `/super-admin/schools/:id` | Students / Staff / Parents lists; password reset |
| Registrations | `/super-admin/registrations` | School registration queue |
| Users Management | `/super-admin/users` | Cross-tenant users + **global password reset** |
| Plans & entitlements | `/super-admin/plans` | Assign SaaS plans / list prices / billing status |
| Operators | `/super-admin/operators` | SA sub-roles + dual-control deletes |
| Global Reports | `/super-admin/reports` | Ledger MRR + per-school headcount CSV |
| System Logs | `/super-admin/logs` | Operational logs (includes SA password resets) |
| Settings | `/super-admin/settings` | Credentials + **Platform ops** (maintenance, real broadcast, MailDeliveryLog) |
| Profile | `/super-admin/profile` | Own profile |

**Shipped:** Phases A–F — see `docs/SUPER_ADMIN_PLATFORM_PLAN.md`. Ledger MRR + optional Stripe/console checkout; broadcast mail + delivery log; custom domain TXT + Host resolve.

---

## 4. School features by domain (layout)

Grouped by **what the school is doing**, with primary roles. Paths are relative to `/{slug}/`.

### 4.1 Setup & school configuration

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Setup / onboarding checklist | `onboarding` | School Admin, IT Admin, Principal | Tenant go-live checklist |
| Settings | `settings` | School Admin, IT Admin | Profile, brand, attendance rules, security policy, notification prefs, gradebook legends |
| Academic calendar wizard | `settings/academic-calendar` | School Admin, Principal, Registrar | Terms, periods, instructional days |
| School calendar | `calendar` | Most staff + students/parents | Events; syncs with academic calendar; class overlays |

**Docs:** `docs/SCHOOL_SETTINGS_PLAN.md`, `docs/ACADEMIC_GRADING_PLAN.md`

### 4.2 Admissions, students & enrollment

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Admissions | `admissions` | Admin, Registrar, Principal | Funnel, waitlist, decisions, **online registration link + admission policy** (enable/copy, fee/doc gates) |
| Enrollment | `enrollment` | Admin, Registrar | Place admitted students into classes / enroll saga |
| Students | `students` | Admin, Registrar, Principal, VPI, VPA, Teacher | Directory, enroll/edit, credentials; **CSV/Excel bulk import** (Admin/Registrar) |
| Transcripts | `transcripts` | Registrar (+ admin/principal routes) | Transcript tooling |
| Student records | `student-records` | Admin, Registrar, Principal | Records views |

**Doc:** `ONBOARDING_AND_ADMISSION_PLAN.md`

### 4.3 Academics — curriculum, classes, schedules, lessons

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Curriculum | `curriculum` | Admin, Principal, VPI, Teacher (+ some read for student/parent) | Subjects, syllabus plans (year outline) |
| Classrooms (admin) | `classrooms` | Admin, Principal, VPI | Create rooms, enrollment/roster tooling |
| My Classes | `classroom`, `classroom/:id` | Teacher, Student, Parent (+ staff) | Stream, classwork, people, marks; assignments; TipTap; attachments; banner |
| Class schedules (admin) | `schedules` | Admin, Principal, VPI, Registrar | Bell periods + weekly grid |
| My Schedule | `my-schedule` | Teacher, Student, Parent, many staff | Personal timetable view / PDF |
| Lesson plans | `lesson-plans` | Teacher; Admin/Principal/VPI approve | Period plans, templates, share to classroom, week board |

**Docs:** `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/CLASS_SCHEDULE_PLAN.md`, `docs/LESSON_PLANS_PLAN.md`

### 4.4 Assessment — exams, grades, review

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Exams | `exams`, `exams/:id` | Admin, Principal, VPI, Teacher, Student, Parent | Exam catalog & details; paper submit |
| Exam paper (teacher) | `exams/:id/paper` | Teacher (+ academic leads) | Build/submit paper for approval |
| Exam paper review | `exam-paper-review` | Admin, Principal, VPI | Approve/return papers; delivery mode |
| Online exams | `online-exams`, take/results | Teacher setup; Student take; Parent/staff view | Timed attempts, results |
| Gradebook | `gradebook` | Teacher (+ Admin/Principal/VPI) | Spreadsheet entry, periods, autosave; Incomplete “I”; grant-aware edit |
| Grade review | `grade-review` | Teacher submit; Admin/Principal/VPI review | Batches, reopen, notifications |
| Grade edit access | `grade-access` | School Admin / Principal / VPI | Time-boxed CA / Incomplete grants for teachers |
| My Grades | `grades`, report cards | Student, Parent (+ staff) | Published grades / report cards |
| Liberian report cards | Settings Appearance + `report-card/…` | Admin picks template; all roles with grade access print | Multi-page LR cover/grades/promotion booklets |
| International report cards | Settings Appearance + `report-card/…` | Admin picks among 10 A4 packs + 2 Wisteria quarterly layouts | v1 shipped; **full 10-template visual redesign planned** — `docs/INTERNATIONAL_REPORT_CARD_TEMPLATES_PLAN.md` |
| Year transition | `year-transition` | School Admin, Principal, VPI, VPA, Registrar | Opening census, promotion runs, draft/commit decisions |
| Promotion statement | `promotion-statement` | Same leadership roles | School-wide printable promotion grid (gender / division / class / pass-fail) |
| Graduation certificates | `certificates` | Admin, Principal, VPI, Registrar | Landscape Letter print templates with tenant branding |
| Staff tasks (admin) | `staff-tasks` | School Admin, Principal, VPI, VPA | Assign tasks; assignees update in Staff Portal |

**Docs:** `docs/EXAM_PAPER_APPROVAL_PLAN.md`, `docs/ONLINE_EXAMS_PLAN.md`, `docs/TEACHER_GRADEBOOK_PLAN.md`, `docs/GRADE_REVIEW_PLAN.md`, `docs/GRADE_EDIT_ACCESS_GRANT_PLAN.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `docs/LIBERIAN_REPORT_CARD_TEMPLATES_PLAN.md`, `docs/YEAR_TRANSITION_PLAN.md`, `docs/GRADUATION_CERTIFICATES_PLAN.md`

### 4.5 Attendance

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Attendance | `attendance` | Teacher roll call; Admin/Principal/VPI/VPA oversee; Student/Parent view; Hostel warden | Instructional-day gate, calendar events, staff summary, payroll hooks |

**Doc:** `docs/ATTENDANCE_INTEGRATION_PLAN.md`

### 4.6 Finance

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Fees | `fees` | Admin, Accountant (manage); Student, Parent (pay/view) | Templates, invoices, checkout, scope/eligibility |
| Expenses | `expenses` | Admin, Accountant | Expense ledger |
| Payroll | `payroll` | Admin, Accountant | Runs, payslips, CSV, mark paid / unpaid |
| Receipts | issued from Finance; public verify | All payers / auditors | QR-verifiable PDFs |

**Docs:** `docs/FINANCE_BILLING_PLAN.md`, `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`, `docs/RECEIPTS_PLATFORM_PLAN.md`

### 4.7 Staff & HR

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| School Staff | `staff` | Admin, Principal, VPA, IT, Security, Athletics | Directory / workforce accounts; **CSV/Excel bulk import** (Admin/Principal/VPA) |
| Roles & Access | `roles` | School Admin | Assign user roles; customize per-role capabilities (nav + key approvals) for this school |
| Staff Portal | `staff-portal` | Most staff roles | Leave, docs, self-service |
| Leave approvals | `leave-approval` | Admin, Principal, VPA | Approve/reject leave |

**Docs:** `docs/STAFF_WORKFORCE_PLAN.md`, `docs/ROLE_ACCESS_PLAN.md`

### 4.8 Communications & engagement

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Announcements | `announcements` | Admin, Principal, Teacher, VPI, VPA publish; Parent/Student read | School news |
| Documents | `documents` | Broad role-scoped library | Upload/list school documents |
| Notifications | `notifications` (+ bell) | Authenticated users | In-app feed + nav badges |
| PTA | `pta` | Parent, Admin, Principal | Org, meetings, RSVP, volunteers, campaigns |
| My Children | `children` | Parent | Family hub |

**Docs:** `docs/COMMS_DOCUMENTS_PLAN.md`, `docs/NOTIFICATIONS_PLAN.md`, `docs/PARENT_PORTAL_AND_PTA_PLAN.md`

### 4.9 Operations & facilities

| Feature | Path | Primary roles | Summary |
| :--- | :--- | :--- | :--- |
| Work orders | `work-orders` | Admin, Principal, VPA, Maintenance | Create, assign, complete |
| Facilities Hub | `maintenance` | Same + Overview/Inventory | Facilities + inventory |
| Procurement | `procurement` | VPA, Procurement (+ admin/principal) | Purchase requests |
| Security | `security` | VPA, Security | Incidents / surveillance entry |
| Bus routes / drivers / vehicle | `bus-routes`, `drivers`, `vehicle-maintenance` | Transportation (+ leads) | Transport ops |
| Inventory (shared path) | `inventory` | Role-specific labels (stock, medical, food, digital) | Inventory views |

**Doc:** `docs/OPS_FACILITIES_PLAN.md`

### 4.10 Specialty campus modules

Present in nav for specialist roles (and sometimes Admin/Principal). **Live** — see `docs/CAMPUS_SPECIALISTS_PLAN.md`.

| Module | Path | Typical role | Status |
| :--- | :--- | :--- | :--- |
| Library | `library` | Librarian | Live — catalog + loans |
| Clinic | `clinic` | Nurse | Live — visits + health profile |
| Counseling | `counseling` | Counselor | Live — sessions (confidential ACL) |
| Athletics | `athletics` | Athletics Director | Live — teams + roster + fixtures |
| Hostel | `hostel` | Hostel Warden | Live — buildings/rooms/assignments |
| Cafeteria | `cafeteria` | Cafeteria Manager | Live — menus + meal counts |
| Transport | `bus-routes`, `drivers`, `vehicle-maintenance` | Transportation | Live — routes, fleet, maintenance |

Security **incident logs** are live; visitor/patrol extras are session-local only.

### 4.11 Reporting, transitions & identity extras

| Feature | Path / surface | Summary |
| :--- | :--- | :--- |
| School reports | `reports` | Honest roster/attendance/finance/ops summary + CSV |
| Profile | `profile` | Photo, password, official signature (eligible roles) |
| Official signatures | Profile → Identity `signatureUrl` | Mapped in Settings → document signatories; render on certificates, report cards, gradesheets, receipts |
| Family campus portal | `my-campus` | Parent/student read-only transport, library loans, clinic summary, hostel (counseling excluded) |
| School API docs | `api-docs` | In-app REST guide (School Admin + IT Admin) |

**Docs:** `docs/SCHOOL_REPORTS_PLAN.md`, `docs/USER_SIGNATURE_PLAN.md`

---

## 5. Features by account type (role)

Sidebar items from `getNavItems`. Roles without a case return empty nav.

### 5.1 Leadership & administration

**School Admin** — Full tenant: Setup, Calendar, Admissions, Enrollment, Staff Portal, Roles & Access, Curriculum, Lesson Plans, Class Schedules, Classrooms, Students, Staff, Staff Tasks, Leave Approvals, Announcements, Documents, PTA, Exams, Online exams, Gradebook, Grade Review, Grade Edit Access, Exam paper review, Attendance, Year Transition, Promotion Statement, Certificates, Work Orders, Facilities Hub, Fees, Expenses, Payroll, Reports, Academic Calendar, Settings, API docs (IT Admin overlap).

**Principal** — Similar academic/ops oversight without Enrollment, Fees/Expenses/Payroll, Setup, or Settings; includes Admissions, Classrooms, Leave, Staff Tasks, Exam paper review, Year Transition, Promotion Statement, Certificates, Reports, Academic Calendar, Grade Edit Access.

**VPI (Vice Principal – Instruction)** — Academic supervision: Curriculum, Lesson Plans, Schedules, Classrooms, Exams, Online exams, Gradebook, Grade Review, Grade Edit Access, Exam paper review, Attendance, Year Transition, Promotion Statement, Certificates, Academic Reports, Staff Tasks.

**VPA (Vice Principal – Administration)** — HR/ops: Staff, Staff Tasks, Attendance, Procurement, Work Orders, Facilities, Security, Class Schedule (read), Year Transition, Promotion Statement, Staff Portal.

**Registrar** — Admissions, Students, Transcripts, Enrollment, Class Schedules, Calendar, Year Transition, Promotion Statement, Certificates, Staff Portal.

**IT Admin** — Setup/Settings (incl. API keys when entitled), User Management (Staff), Roles & Access (read-only), Security policies, API docs, Calendar, My Schedule, Staff Portal.

### 5.2 Teaching & learning

**Teacher** — Dashboard, Calendar, My Schedule, My Classes, Curriculum, Lesson Plans, Attendance, Staff Portal, Exams, Online exams, Gradebook, Grade Review (submissions), Students.

**Student** — Dashboard, Calendar, My Schedule, My Classes, My Grades, Exams, Online exams, My Attendance, Fees.

### 5.3 Family

**Parent** — Dashboard, Calendar, My Schedule, My Children, My Campus, My Classes (read-only child context), Grades, Online exams, Fees, Attendance, News (Announcements), Documents, PTA, Notifications.

### 5.4 Finance

**Accountant** — Dashboard, Calendar, Fee Management, Expenses, Payroll, Staff Portal.

### 5.5 Operations specialists

| Role | Main modules in nav |
| :--- | :--- |
| Transportation | Bus Routes, Drivers, Vehicle Maintenance, Staff Portal |
| Maintenance | Work Orders, Facilities Hub, Staff Portal |
| Procurement | Purchase Requests, Stock Management, Staff Portal |
| Security | Security Incidents, Staff Directory, Staff Portal |
| Librarian | Library, Digital Resources, Staff Portal |
| Nurse | Clinic, Medical Inventory, Staff Portal |
| Counselor | Counseling, Student Well-being, Class Schedule, Staff Portal |
| Athletics Director | Athletics, Coaches Directory, Staff Portal |
| Hostel Warden | Hostel Management, Attendance, Staff Portal |
| Cafeteria Manager | Cafeteria, Food Inventory, Staff Portal |

### 5.6 Platform

**Super Admin** — See §3.

---

## 6. Cross-cutting behaviors (all school users)

| Behavior | Notes |
| :--- | :--- |
| Role-guarded routes | `ProtectedRoute` + `ROUTE_ROLES` / nav alignment |
| In-app notifications | Bell + `/notifications`; producers for leave, fees, announcements, grades, work orders, lesson plans, etc. |
| Profile photo | Used in Layout, directories, classroom |
| Parent child context | Classroom/marks often via `?studentId=` |
| Honest empty states | No fake KPIs or seeded telemetry. Routed school modules use live APIs or honest empty copy (`StubFeaturePage` is not used on current school routes). |

---

## 7. Companion plans (deep dive)

| Topic | Document |
| :--- | :--- |
| Onboarding & admission | `ONBOARDING_AND_ADMISSION_PLAN.md` |
| Onboarding & admissions 95→100 | `docs/ONBOARDING_ADMISSIONS_95_TO_100_PLAN.md` |
| Academics & assessment gaps | `docs/ACADEMICS_ASSESSMENT_GAPS_PLAN.md` |
| Implementation / services | `IMPLEMENTATION_STATUS.md` |
| Classroom workspace | `docs/CLASSROOM_MANAGEMENT_PLAN.md` |
| Lesson plans | `docs/LESSON_PLANS_PLAN.md` |
| Class schedule | `docs/CLASS_SCHEDULE_PLAN.md` |
| Curriculum / classrooms admin | `docs/CURRICULUM_CLASSROOMS_PLAN.md` |
| Exam paper approval | `docs/EXAM_PAPER_APPROVAL_PLAN.md` |
| Online exams | `docs/ONLINE_EXAMS_PLAN.md` |
| Gradebook / grade review | `docs/TEACHER_GRADEBOOK_PLAN.md`, `docs/GRADE_REVIEW_PLAN.md`, `docs/GRADE_EDIT_ACCESS_GRANT_PLAN.md` |
| Attendance | `docs/ATTENDANCE_INTEGRATION_PLAN.md` |
| Finance & fees | `docs/FINANCE_BILLING_PLAN.md`, `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md` |
| Receipts | `docs/RECEIPTS_PLATFORM_PLAN.md` |
| Staff / leave / payroll UI | `docs/STAFF_WORKFORCE_PLAN.md` |
| Ops / facilities | `docs/OPS_FACILITIES_PLAN.md` |
| Parent & PTA | `docs/PARENT_PORTAL_AND_PTA_PLAN.md` |
| Notifications | `docs/NOTIFICATIONS_PLAN.md` |
| Documents | `docs/COMMS_DOCUMENTS_PLAN.md` |
| Settings | `docs/SCHOOL_SETTINGS_PLAN.md` |
| Reports | `docs/SCHOOL_REPORTS_PLAN.md` |
| UI system | `FRONTEND_GUIDELINES.md` |
| Campus specialists | `docs/CAMPUS_SPECIALISTS_PLAN.md` |
| Year transition / promotion | `docs/YEAR_TRANSITION_PLAN.md` |
| Graduation certificates | `docs/GRADUATION_CERTIFICATES_PLAN.md` |
| Grade edit access | `docs/GRADE_EDIT_ACCESS_GRANT_PLAN.md` |
| Plans & entitlements | `docs/PLANS_ENTITLEMENTS_ENFORCEMENT_PLAN.md` |
| Near-complete → 100% roadmap | `docs/NEAR_COMPLETE_TO_100_PLAN.md` |
| School API keys | `docs/SCHOOL_API_KEYS_PLAN.md` |

| Public landing overhaul | `docs/LANDING_PAGE_OVERHAUL_PLAN.md` |

---

## Change log

### 2026-08-05 — Accuracy pass (implementation audit)

- **Change:** Campus specialists marked live; added year transition, promotion statement, certificates, grade access, staff tasks, my-campus, API docs; corrected admission policy location (Admissions hub, not Settings); public apply status token page; IT Admin nav; verified remaining backlog synced to `IMPLEMENTATION_STATUS.md`.
- **Status:** done (living doc)
- **Verify:** Spot-check nav against §5; cross-check gaps in `ONBOARDING_AND_ADMISSION_PLAN.md` §1.1–1.2

### 2026-07-24 — Initial overview

- **Change:** Created role- and domain-structured feature catalog for Gnet SMS.
- **Status:** done (living doc — update when nav or major modules change)
- **Verify:** Spot-check a role’s sidebar against §5; deep behavior against linked plans
