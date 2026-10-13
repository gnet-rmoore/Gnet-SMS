# Full-app responsive UI — Implementation Plan

> **Status:** Implemented (phases 0–5) — 2026-07-30  
> **Scope:** Make **every** interactive SMS surface usable on phone, tablet, and desktop — Layout chrome, dashboards, feature pages, modals/drawers, tables, forms, and shared components. **Explicit checklist:** §7 (all App routes + every UI TSX file).  
> **Non-goals:** Redesigning print/report-card paper layouts for phone (quarantine + scroll OK); native apps; changing brand palette  
> **Companion:** `FRONTEND_GUIDELINES.md`, `docs/UI_CONSISTENCY_PLAN.md`, `docs/UI_VISUAL_BASELINES.md`, `IMPLEMENTATION_STATUS.md`  
> **Stack:** React SPA (`frontend-spa`); Tailwind breakpoints only (`sm` 640 / `md` 768 / `lg` 1024)

---

## 0. Product intent (plain English)

The app already uses Executive Slate and density primitives, but **responsiveness is uneven**. Many pages stack headers and stats correctly; the shell still opens a **288px sidebar in-flow on phones**, some grids stay multi-column on small screens, and several tables/modals lack horizontal scroll. Dense academic matrices (gradebook, timetable) will always need scroll or a stacked alternate — they must not break the rest of the app.

**Definition of done for this program:** From ~320px–1280px width, every **role-reachable interactive route** is navigable and operable without clipped primary CTAs, unreachable controls, or horizontal page scroll (except explicitly allowed table/matrix regions).

---

## 1. Current gaps (audit snapshot 2026-07-30)

| Area | Today | Gap |
| :--- | :--- | :--- |
| `Layout.tsx` sidebar | In-flow width 288↔0; **default open** | Phones lose content width; no overlay drawer / backdrop / auto-close |
| `main` padding | Always `p-8` | Too heavy on &lt;640px |
| Header | Search `w-48` always; dense right cluster | Crowds title on narrow screens |
| Page shells | Most use `max-w-6xl…`; `PageShell` sparse | Double padding with Layout; outliers (`student-records`, etc.) |
| Stat / content grids | Many `grid-cols-1 sm:…` | Some `grid-cols-2+` with **no** mobile 1-col (documents, syllabus modal, …) |
| Tables | Many wrapped in `overflow-x-auto` | Gaps: settings notifications, exam results modal, bulk-import preview, … |
| Academic matrices | Gradebook / schedule `min-w-[720–800px]` | Accept scroll **or** provide mobile alternate — document rule |
| Print / report cards | Fixed paper widths (`min-w-[900px]`, seals) | **Allowlist** — not forced to reflow like dashboards |
| CI | `test:ui-drift` / primitives | No responsive lint or viewport smoke yet |

**Inventory size (approx.):** ~79 `App.tsx` routes · ~48 nav destinations · ~34 `features/*/Page.tsx` owners.

---

## 2. Target behavior (rules)

### 2.1 Breakpoints (Tailwind)

| Token | Min width | Intent |
| :--- | :--- | :--- |
| default | 0 | Phone: single column, drawer nav, compact padding |
| `sm` | 640px | Comfortable phone landscape / small tablet |
| `md` | 768px | Tablet; side-by-side headers OK |
| `lg` | 1024px | Desktop chrome (persistent sidebar optional) |

Do **not** invent custom breakpoints unless Layout truly needs them.

### 2.2 Layout chrome (mandatory)

| Viewport | Sidebar | Main |
| :--- | :--- | :--- |
| &lt; `lg` | **Overlay drawer** (fixed), closed by default; hamburger opens; backdrop + Esc + route change closes | Full width; `p-4 sm:p-6 lg:p-8` |
| ≥ `lg` | Persistent in-flow (current expand/collapse OK); remember user preference | Existing density |

Header (&lt; `lg`): compact height; search icon-only or opens full-screen/modal (existing GlobalSearch modal is fine); hide non-essential labels.

### 2.3 Page composition

1. Prefer `<PageShell>` / `max-w-6xl mx-auto space-y-8` — **no extra horizontal padding** when Layout already pads (or reduce Layout padding and keep shell padding — pick one rule and stick to it in Phase 0).
2. Headers: `flex-col sm:flex-row` + wrap action groups (`flex-wrap gap-2`).
3. Stats: always `grid-cols-1` first, then `sm:grid-cols-2`, `lg:grid-cols-3|4`.
4. Tab strips: `overflow-x-auto` + no wrap clipping.
5. Cards: full width of shell; avoid fixed `w-[NNpx]` on interactive UI.

### 2.4 Tables & dense data

| Pattern | Rule |
| :--- | :--- |
| Standard ledger | Outer `overflow-x-auto` + `min-w-0` parent; sticky first column optional later |
| Filter toolbars | Stack on mobile (`flex-col sm:flex-row`); inputs `w-full sm:w-auto` |
| Gradebook / timetable | **Allowed** inner horizontal scroll; optional Phase 5 “card per student/day” alternate |
| Print / report templates | **Allowlist** — preview may scroll; do not rewrite paper geometry for phone |

### 2.5 Modals, drawers, forms

- Modals: `max-h-[90dvh] overflow-y-auto`; full-width on phone (`w-full sm:max-w-lg|…`).
- Drawers: already edge sheets — ensure width `w-full max-w-md` and safe-area padding.
- Forms: one column on mobile; `sm:grid-cols-2` only when labels stay readable.
- Touch: prefer ≥44px tap targets on primary actions (align with UI consistency a11y notes).

### 2.6 What “every element” means

| Must adapt | May scroll / stay fixed |
| :--- | :--- |
| Nav, dashboards, feature pages, portals | Print report cards, grade sheet print, transcript seals |
| Shared chrome (avatar, toasts, search) | Recharts — keep readable; legend wrap |
| Modals used in workflows | Decorative absolute blobs |

---

## 3. Phased delivery

```text
Phase 0 — Layout chrome + padding contract + guidelines
Phase 1 — Shared primitives & lint (grids/tables/modals)
Phase 2 — Wave: Admin / Accountant / Registrar / Super Admin hubs
Phase 3 — Wave: Teacher academic (gradebook, schedule, classrooms, exams)
Phase 4 — Wave: Parent / Student portals + public pages
Phase 5 — Dense matrices alternate UX + CI viewport smoke
```

### Phase 0 — Layout & contract (foundation)

- [x] `Layout.tsx`: mobile overlay drawer; default closed below `lg`; backdrop; close on navigate
- [x] Header / main padding scale: `p-4 sm:p-6 lg:p-8` (or equivalent)
- [x] Search: icon-first below `sm`; keep modal
- [x] Document padding contract in `FRONTEND_GUIDELINES.md` §5 (shell vs main)
- [x] Print/report **allowlist** file list in this plan (§6)

**Verify:** iPhone-width login → school admin dashboard: content uses full width; hamburger opens nav; tap outside closes.

### Phase 1 — Primitives & mechanical fixes

- [x] Ensure `PageShell` / `Surface` / table wrapper primitive (e.g. `TableScroll`) in `src/components/ui`
- [x] Mechanical pass: wrap naked `<table>` in `overflow-x-auto` where missing
- [x] Mechanical pass: `grid-cols-2` / `grid-cols-3` without `sm:`/`md:` → add `grid-cols-1`
- [x] Optional CI: ripgrep drift checks (like `test:ui-drift`) for forbidden patterns outside allowlist

**Seed offenders:**

| File | Issue |
| :--- | :--- |
| `src/features/settings/components/NotificationsSettingsTab.tsx` | Table, no overflow |
| `src/features/exam-details/components/ResultsModal.tsx` | Table, no overflow |
| `src/features/bulk-import/ImportRosterModal.tsx` | Preview table |
| `src/features/documents/Page.tsx` | `grid-cols-2` on mobile |
| `src/features/curriculum/components/SyllabusViewModal.tsx` | `grid-cols-2 lg:grid-cols-5` |

### Phase 2 — Staff / ops / finance hubs

Work **every** row in §7.3 + §7.4 Phase 2 (S01–S35) and matching §7.5 / §7.6 files. Includes ops stubs (library, clinic, hostel, …), inventory, procurement, security, calendars, documents, notifications, leave, staff portal, Super Admin (all 8 routes).

Rules: chrome from Phase 0; toolbars wrap; ledgers scroll; stats 1→2→4 cols; stubs → `stub-ok` after Layout-only verify.

### Phase 3 — Teacher / academic

Work **every** row in §7.4 Phase 3 (S40–S61) + §7.5 academic features (gradebook, exams, curriculum, classroom-*, lesson-plans, attendance, online-exam, exam-paper, …).

Special: gradebook/schedule → `matrix-scroll` (or Phase 5 alternate). Print entry routes S59–S61: chrome `ok`, paper `print-allowlist`.

### Phase 4 — Parent / Student / public

Work §7.2 (all public UI routes) + §7.4 Phase 4 (children, PTA) + parent/student dashboards already under S01 / grades / fees / classroom. Also §7.5 `admission-form`, `pta`.

Public marketing/onboarding: brand-first rules still apply; stack CTAs; no horizontal page scroll.

### Phase 5 — Hard cases + CI

- [x] Gradebook / timetable mobile alternate (cards or “focus one column”) **or** explicit “scroll sideways” empty-state tip
- [x] Contract smoke: `npm run test:responsive` (Layout drawer, padding, matrix tips, bare-grid drift)
- [x] Update `docs/UI_VISUAL_BASELINES.md` with mobile notes if baselines expand
- [x] Quarantine remaining print files so drift tests ignore them

---

## 4. Owning surfaces

| Concern | Location |
| :--- | :--- |
| Chrome / drawer | `src/components/Layout.tsx`, header children |
| Primitives | `src/components/ui/*` |
| Feature pages | `src/features/**`, `src/pages/**` |
| Guidelines | `FRONTEND_GUIDELINES.md` |
| Density program | `docs/UI_CONSISTENCY_PLAN.md` (link Wave E / this plan) |
| Deploy | `frontend-spa` only (no microservice behavior) |

---

## 5. Acceptance / verify

**Global**

- [x] ≤390px width: no horizontal **page** scroll on dashboard and Fees (table region may scroll)
- [x] Sidebar does not permanently consume width below `lg`
- [x] Primary page CTA visible without sideways pan
- [x] Forms usable with virtual keyboard (fields not under fixed chrome)

**Per role smoke (phone width)**

- [x] School Admin: Dashboard, Fees, Students, Settings  
- [x] Teacher: Gradebook, My Classes, Attendance  
- [x] Parent: Dashboard, Fees, Children  
- [x] Super Admin: Schools, Users  

**Regression**

- [x] Desktop ≥1280px still matches Executive Slate; sidebar expand/collapse works  
- [x] Print / report card PDF paths unchanged  

---

## 6. Print / fixed-layout allowlist (do not “responsive-ize”)

Keep paper geometry; allow preview scroll:

- `src/pages/School/ReportCard.tsx`, `src/components/ReportCardTemplates.tsx`
- `src/features/report-cards/**` (Liberian booklet)
- `src/pages/School/GradeSheet.tsx`, `src/components/GradeSheetTemplates.tsx`
- `src/pages/School/Transcripts.tsx`
- Other explicit print/PDF preview surfaces as discovered

Interactive **entry** screens that open these must themselves be responsive.

---

## 7. Explicit inventory checklist (complete)

> **Generated:** 2026-07-30 from `src/App.tsx`, `src/pages/**`, `src/features/**/*.tsx`, `src/components/**/*.tsx`.  
> **Counts:** 79 route patterns · 75 page modules · 193 feature TSX · 23 shared components.  
> Mark **Status** as you fix: `pending` → `ok` (or `print-allowlist` / `stub-ok` / `matrix-scroll`).  
> A route is **done** only when its page **and** every listed child component for that feature is `ok` (or allowlisted).

### Status legend

| Status | Meaning |
| :--- | :--- |
| `pending` | Not reviewed / not fixed |
| `ok` | Usable at ≤390px; no page-level horizontal scroll |
| `matrix-scroll` | Dense grid; inner horizontal scroll allowed (+ tip in Phase 5) |
| `print-allowlist` | Paper layout; preview may scroll (do not reflow) |
| `stub-ok` | StubFeaturePage / placeholder — inherits Layout chrome only |
| `n/a` | Non-UI (redirect, auth guard only) |

### How to execute

1. Phase 0–1 first (chrome + primitives) — marks rows in §7.1.  
2. Fix routes in phase order (§7.2–7.4). When fixing a feature route, clear **all** component rows under that feature in §7.5.  
3. Rebuild `frontend-spa`; spot-check 375px + 1280px.  
4. Update this table in the same PR (status column only).

---

### 7.1 Shared chrome & primitives (Phase 0–1)

| # | Surface | Path | Phase | Status |
| :--- | :--- | :--- | :--- | :--- |
| C01 | App shell / sidebar / header | `src/components/Layout.tsx` | 0 | ok |
| C02 | Global search | `src/components/GlobalSearch.tsx` | 0 | ok — labels from `nav.labelKey` + section subtitle (2026-07-31) |
| C03 | Notification bell (root) | `src/components/NotificationBell.tsx` | 0 | ok |
| C04 | User avatar | `src/components/UserAvatar.tsx` | 0 | ok |
| C05 | Child switcher | `src/components/ChildSwitcher.tsx` | 0 | ok |
| C06 | Avatar group | `src/components/AvatarGroup.tsx` | 1 | ok |
| C07 | Page skeleton | `src/components/PageSkeleton.tsx` | 1 | ok |
| C08 | Stub feature page | `src/components/StubFeaturePage.tsx` | 1 | ok |
| C09 | Protected route (no layout) | `src/components/ProtectedRoute.tsx` | n/a | n/a |
| C10 | Country + timezone fields | `src/components/CountryTimezoneFields.tsx` | 1 | ok |
| C11 | Rich text editor | `src/components/RichTextEditor.tsx` | 1 | ok |
| C12 | Signature pad | `src/components/SignaturePadCard.tsx` | 1 | ok |
| C13 | Join classroom modal | `src/components/JoinClassroomModal.tsx` | 1 | ok |
| C14 | Create classroom modal (legacy) | `src/components/CreateClassroomModal.tsx` | 1 | ok |
| C15 | PageShell | `src/components/ui/PageShell.tsx` | 1 | ok |
| C16 | PageHeader | `src/components/ui/PageHeader.tsx` | 1 | ok |
| C17 | Surface | `src/components/ui/Surface.tsx` | 1 | ok |
| C18 | Button | `src/components/ui/Button.tsx` | 1 | ok |
| C19 | Field | `src/components/ui/Field.tsx` | 1 | ok |
| C20 | StatTile | `src/components/ui/StatTile.tsx` | 1 | ok |
| C21 | SectionTitle | `src/components/ui/SectionTitle.tsx` | 1 | ok |
| C22 | Report card templates (print) | `src/components/ReportCardTemplates.tsx` | — | print-allowlist |
| C23 | Grade sheet templates (print) | `src/components/GradeSheetTemplates.tsx` | — | print-allowlist |
| C24 | Academics ConfirmDialog | `src/features/academics-shared/ConfirmDialog.tsx` | 1 | ok |
| C25 | Academics FeatureModalShell | `src/features/academics-shared/FeatureModalShell.tsx` | 1 | ok |
| C26 | Academics PageToast | `src/features/academics-shared/PageToast.tsx` | 1 | ok |
| C27 | Academics CalendarStrip | `src/features/academics-shared/AcademicCalendarStrip.tsx` | 1 | ok |
| C28 | Bulk import roster modal | `src/features/bulk-import/ImportRosterModal.tsx` | 1 | ok |
| C29 | Staff AddStaffModal | `src/features/staff-management/components/AddStaffModal.tsx` | 2 | ok |
| C30 | Admission application fields | `src/features/admission-form/AdmissionApplicationFields.tsx` | 4 | ok |

---

### 7.2 Public & auth routes (Phase 4)

| # | Route | Owner | Phase | Status |
| :--- | :--- | :--- | :--- | :--- |
| P01 | `/login` | `src/pages/Login.tsx` | 4 | ok |
| P02 | `/logout` | redirect action | n/a | n/a |
| P03 | `/` | Navigate → login | n/a | n/a |
| P04 | `/register-school` | `src/pages/RegisterSchool.tsx` | 4 | ok |
| P05 | `/register-school/confirm` | `src/pages/RegisterSchool.tsx` | 4 | ok |
| P06 | `/invite/:token` | `src/pages/InviteAccept.tsx` | 4 | ok |
| P07 | `/apply/:slug` | `src/pages/PublicApply.tsx` + admission-form | 4 | ok |
| P08 | `/apply/:slug/status` | `src/pages/PublicApplyStatus.tsx` | 4 | ok |
| P09 | `/verify/receipt/:code` | `src/pages/PublicReceiptVerify.tsx` | 4 | ok |
| P10 | `/checkout/mock` | `src/pages/MockCheckout.tsx` | 4 | ok |

---

### 7.3 Super Admin routes (Phase 2)

| # | Route | Owner | Phase | Status |
| :--- | :--- | :--- | :--- | :--- |
| SA01 | `/super-admin` (index) | `src/pages/SuperAdmin/Dashboard.tsx` | 2 | ok |
| SA02 | `/super-admin/profile` | `src/pages/School/Profile.tsx` | 2 | ok |
| SA03 | `/super-admin/schools` | `src/pages/SuperAdmin/Schools.tsx` | 2 | ok |
| SA03b | `/super-admin/schools/:schoolId` | `src/pages/SuperAdmin/SchoolDetail.tsx` | 2 | ok |
| SA04 | `/super-admin/registrations` | `src/pages/SuperAdmin/SchoolRegistrations.tsx` | 2 | ok |
| SA05 | `/super-admin/users` | `src/pages/SuperAdmin/Users.tsx` | 2 | ok |
| SA06 | `/super-admin/reports` | `src/pages/SuperAdmin/Reports.tsx` | 2 | ok |
| SA07 | `/super-admin/logs` | `src/pages/SuperAdmin/Logs.tsx` | 2 | ok |
| SA08 | `/super-admin/settings` | `src/pages/SuperAdmin/Settings.tsx` | 2 | ok |

---

### 7.4 School tenant routes (`/:slug/…`)

Indexed by delivery phase. Parametric siblings that share one owner are listed once with path pattern.

#### Phase 2 — Admin / finance / registrar / ops hubs

| # | Route pattern | Owner | Kind | Status |
| :--- | :--- | :--- | :--- | :--- |
| S01 | `dashboard` (also index) | `features/dashboard` | page | ok |
| S02 | `onboarding` | `pages/School/Onboarding.tsx` | page | ok |
| S03 | `profile` | `pages/School/Profile.tsx` | page | ok |
| S04 | `students` | `features/students` | page | ok |
| S05 | `fees` | `features/fees` | page | ok |
| S06 | `expenses` | `features/expenses` | page | ok |
| S07 | `payroll` | `features/payroll` | page | ok |
| S08 | `staff` | `pages/School/StaffManagement.tsx` | page | ok |
| S09 | `roles` | `features/role-access` | page | ok |
| S10 | `admissions` | `features/registrar` (alias) | page | ok |
| S11 | `enrollment` | `features/enrollment` | page | ok |
| S12 | `student-records` | `features/student-records` | page | ok |
| S13 | `reports` | `features/reports` | page | ok |
| S14 | `settings` | `features/settings` | page | ok |
| S15 | `settings/academic-calendar` | `features/academic-calendar` | page | ok |
| S16 | `announcements` | `features/announcements` | page | ok |
| S17 | `documents` | `features/documents` | page | ok |
| S18 | `notifications` | `features/notifications` | page | ok |
| S19 | `staff-portal` | `features/staff-portal` | page | ok |
| S20 | `leave-approval` | `features/leave-approval` | page | ok |
| S21 | `maintenance` | `features/maintenance` | page | ok |
| S22 | `work-orders` | `features/work-orders` | page | ok |
| S23 | `inventory` | `pages/School/Inventory.tsx` | page | ok |
| S24 | `procurement` | `pages/School/Procurement.tsx` | page | ok |
| S25 | `security` | `features/security` | page | ok |
| S26 | `bus-routes` | `pages/School/BusRoutes.tsx` | stub | stub-ok |
| S27 | `drivers` | `pages/School/Drivers.tsx` | stub | stub-ok |
| S28 | `vehicle-maintenance` | `pages/School/VehicleMaintenance.tsx` | stub | stub-ok |
| S29 | `library` | `pages/School/Library.tsx` | stub | stub-ok |
| S30 | `clinic` | `pages/School/Clinic.tsx` | stub | stub-ok |
| S31 | `counseling` | `pages/School/Counseling.tsx` | stub | stub-ok |
| S32 | `athletics` | `pages/School/Athletics.tsx` | stub | stub-ok |
| S33 | `hostel` | `pages/School/Hostel.tsx` | stub | stub-ok |
| S34 | `cafeteria` | `pages/School/Cafeteria.tsx` | stub | stub-ok |
| S35 | `calendar` | `features/calendar-page` | page | ok |

#### Phase 3 — Teacher / academic

| # | Route pattern | Owner | Kind | Status |
| :--- | :--- | :--- | :--- | :--- |
| S40 | `classroom` | `features/classroom-workspace` (list) | page | ok |
| S41 | `classroom/:id` | `features/classroom-workspace/RoomPage` | page | ok |
| S42 | `classrooms` | `features/classrooms` | page | ok |
| S43 | `curriculum` | `features/curriculum` | page | ok |
| S44 | `exams` | `features/exams` | page | ok |
| S45 | `exams/:examId` | `features/exam-details` | page | ok |
| S46 | `exams/:examId/online` | `features/online-exam` (author) | page | ok |
| S47 | `exams/:examId/paper` | `features/exam-paper` | page | ok |
| S48 | `exam-paper-review` | `features/exam-paper` (review) | page | ok |
| S49 | `online-exams` | `features/online-exam` (list) | page | ok |
| S50 | `online-exams/:examId/take` (+ `/:attemptId`) | `features/online-exam` (take) | page | ok |
| S51 | `online-exams/:examId/results/:attemptId` | `features/online-exam` (results) | page | ok |
| S52 | `gradebook` | `features/gradebook` | matrix | matrix-scroll |
| S53 | `grade-review` | `features/grade-review` | page | ok |
| S54 | `lesson-plans` | `features/lesson-plans` | page | ok |
| S55 | `schedules` | `features/class-schedule` | matrix | matrix-scroll |
| S56 | `my-schedule` | `features/class-schedule/MySchedulePage` | matrix | matrix-scroll |
| S57 | `attendance` | `features/attendance` | page | ok |
| S58 | `grades` (+ `/:studentId`) | `pages/School/StudentGrades.tsx` | page | ok |
| S59 | `gradesheet/:examId` (+ `/:studentId`) | `pages/School/GradeSheet.tsx` | print-entry | ok |
| S60 | `report-card/:examId` (+ `/:studentId`) | `pages/School/ReportCard.tsx` | print-entry | ok |
| S61 | `transcripts` | `pages/School/Transcripts.tsx` | print-entry | ok |

#### Phase 4 — Parent / student extras (beyond public)

| # | Route pattern | Owner | Kind | Status |
| :--- | :--- | :--- | :--- | :--- |
| S70 | `children` | `pages/School/Children.tsx` | page | ok |
| S71 | `pta` | `features/pta` | page | ok |

#### Print paper surfaces (allowlist — mark when entry chrome is ok)

| # | Surface | Path | Status |
| :--- | :--- | :--- | :--- |
| PR01 | Grade sheet body | `pages/School/GradeSheet.tsx` + `GradeSheetTemplates` | print-allowlist |
| PR02 | Report card body | `pages/School/ReportCard.tsx` + `ReportCardTemplates` | print-allowlist |
| PR03 | Liberian booklet | `features/report-cards/**` | print-allowlist |
| PR04 | Transcripts | `pages/School/Transcripts.tsx` | print-allowlist |

> **Note:** Routes S59–S61 entry chrome (picker/header) still must be `ok`; only the paper canvas is allowlisted.

---

### 7.5 Feature & shared UI components (explicit file list)

Mark each file when the owning feature route wave is done. Skip `bannerUtils.tsx` style-only helpers if no layout chrome (still listed for honesty).


#### `academic-calendar/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F001 | `src/features/academic-calendar/Page.tsx` | ok |
| F002 | `src/features/academic-calendar/components/CalendarOverview.tsx` | ok |
| F003 | `src/features/academic-calendar/components/FriendlyDateField.tsx` | ok |
| F004 | `src/features/academic-calendar/components/FriendlyDateTimeField.tsx` | ok |
| F005 | `src/features/academic-calendar/components/SetupStep1Templates.tsx` | ok |
| F006 | `src/features/academic-calendar/components/SetupStep2Periods.tsx` | ok |
| F007 | `src/features/academic-calendar/components/SetupStep3Exams.tsx` | ok |
| F008 | `src/features/academic-calendar/components/SetupStep4Review.tsx` | ok |

#### `announcements/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F009 | `src/features/announcements/Page.tsx` | ok |

#### `attendance/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F010 | `src/features/attendance/Page.tsx` | ok |
| F011 | `src/features/attendance/components/RollCallModal.tsx` | ok |
| F012 | `src/features/attendance/components/RollCallSheet.tsx` | ok |

#### `calendar-page/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F013 | `src/features/calendar-page/Page.tsx` | ok |
| F014 | `src/features/calendar-page/components/AddEventModal.tsx` | ok |
| F015 | `src/features/calendar-page/components/CalendarMainGrid.tsx` | ok |
| F016 | `src/features/calendar-page/components/EventDetailsModal.tsx` | ok |
| F017 | `src/features/calendar-page/components/HeaderAndFilters.tsx` | ok |

#### `class-schedule/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F018 | `src/features/class-schedule/MySchedulePage.tsx` | ok |
| F019 | `src/features/class-schedule/Page.tsx` | ok |

#### `classroom-workspace/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F020 | `src/features/classroom-workspace/ClassRoomCard.tsx` | ok |
| F021 | `src/features/classroom-workspace/FileDropzone.tsx` | ok |
| F022 | `src/features/classroom-workspace/Page.tsx` | ok |
| F023 | `src/features/classroom-workspace/RoomPage.tsx` | ok |
| F024 | `src/features/classroom-workspace/bannerUtils.tsx` | ok |

#### `classrooms/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F025 | `src/features/classrooms/Page.tsx` | ok |
| F026 | `src/features/classrooms/components/AssignSubjectModal.tsx` | ok |
| F027 | `src/features/classrooms/components/ClassGroupCard.tsx` | ok |
| F028 | `src/features/classrooms/components/ClassroomWizardModal.tsx` | ok |
| F029 | `src/features/classrooms/components/ConceptGuide.tsx` | ok |
| F030 | `src/features/classrooms/components/CreateClassroomModal.tsx` | ok |
| F031 | `src/features/classrooms/components/EditClassroomModal.tsx` | ok |
| F032 | `src/features/classrooms/components/ManageStudentsModal.tsx` | ok |
| F033 | `src/features/classrooms/components/StandaloneSubjectsSection.tsx` | ok |

#### `curriculum/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F034 | `src/features/curriculum/Page.tsx` | ok |
| F035 | `src/features/curriculum/components/ConceptGuide.tsx` | ok |
| F036 | `src/features/curriculum/components/CurriculumViews.tsx` | ok |
| F037 | `src/features/curriculum/components/DivisionsPanel.tsx` | ok |
| F038 | `src/features/curriculum/components/GradeLevelModal.tsx` | ok |
| F039 | `src/features/curriculum/components/ManageSubjectsModal.tsx` | ok |
| F040 | `src/features/curriculum/components/PageHeader.tsx` | ok |
| F041 | `src/features/curriculum/components/SubjectModal.tsx` | ok |
| F042 | `src/features/curriculum/components/SyllabusBuilderModal.tsx` | ok |
| F043 | `src/features/curriculum/components/SyllabusViewModal.tsx` | ok |
| F044 | `src/features/curriculum/components/ViewTabs.tsx` | ok |

#### `dashboard/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F045 | `src/features/dashboard/Page.tsx` | ok |
| F046 | `src/features/dashboard/components/AccountantDashboard.tsx` | ok |
| F047 | `src/features/dashboard/components/DefaultRoleDashboard.tsx` | ok |
| F048 | `src/features/dashboard/components/HelpGuidePanel.tsx` | **removed** (platform guide) |
| F049 | `src/features/dashboard/components/ParentDashboard.tsx` | ok |

#### `documents/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F050 | `src/features/documents/Page.tsx` | ok |

#### `enrollment/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F051 | `src/features/enrollment/Page.tsx` | ok |

#### `exam-details/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F052 | `src/features/exam-details/Page.tsx` | ok |
| F053 | `src/features/exam-details/components/HistoryModal.tsx` | ok |
| F054 | `src/features/exam-details/components/ResultsModal.tsx` | ok |

#### `exam-paper/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F055 | `src/features/exam-paper/Page.tsx` | ok |
| F056 | `src/features/exam-paper/PaperPage.tsx` | ok |
| F057 | `src/features/exam-paper/ReviewPage.tsx` | ok |

#### `exams/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F058 | `src/features/exams/Page.tsx` | ok |
| F059 | `src/features/exams/components/ScheduleExamModal.tsx` | ok |

#### `expenses/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F060 | `src/features/expenses/Page.tsx` | ok |
| F061 | `src/features/expenses/components/AnalyticsTab.tsx` | ok |
| F062 | `src/features/expenses/components/BudgetFormModal.tsx` | ok |
| F063 | `src/features/expenses/components/BudgetsTab.tsx` | ok |
| F064 | `src/features/expenses/components/ExpenseFormModal.tsx` | ok |
| F065 | `src/features/expenses/components/ExpensesChrome.tsx` | ok |
| F066 | `src/features/expenses/components/OperationalLedgerPanel.tsx` | ok |
| F067 | `src/features/expenses/components/OverviewTab.tsx` | ok |
| F068 | `src/features/expenses/components/TransactionDetailsModal.tsx` | ok |
| F069 | `src/features/expenses/components/TransactionsTab.tsx` | ok |

#### `fees/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F070 | `src/features/fees/Page.tsx` | ok |
| F071 | `src/features/fees/components/BatchBillingPanel.tsx` | ok |
| F072 | `src/features/fees/components/FeeDetailDrawer.tsx` | ok |
| F073 | `src/features/fees/components/FeesChrome.tsx` | ok |
| F074 | `src/features/fees/components/HistoryTab.tsx` | ok |
| F075 | `src/features/fees/components/InvoiceModal.tsx` | ok |
| F076 | `src/features/fees/components/LedgerTab.tsx` | ok |
| F077 | `src/features/fees/components/OverviewTab.tsx` | ok |
| F078 | `src/features/fees/components/TemplateModal.tsx` | ok |
| F079 | `src/features/fees/components/TemplatesTab.tsx` | ok |

#### `grade-review/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F080 | `src/features/grade-review/Page.tsx` | ok |
| F081 | `src/features/grade-review/components/ReviewerQueue.tsx` | ok |
| F082 | `src/features/grade-review/components/TeacherSubmissions.tsx` | ok |

#### `gradebook/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F083 | `src/features/gradebook/Page.tsx` | ok |
| F084 | `src/features/gradebook/components/ExamGradeEntryPanel.tsx` | ok |
| F085 | `src/features/gradebook/components/GradebookPeriodSheet.tsx` | ok |
| F086 | `src/features/gradebook/components/GradebookSheet.tsx` | ok |
| F087 | `src/features/gradebook/components/SyncStatusChip.tsx` | ok |

#### `leave-approval/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F088 | `src/features/leave-approval/Page.tsx` | ok |
| F089 | `src/features/leave-approval/components/LeaveApprovalChrome.tsx` | ok |
| F090 | `src/features/leave-approval/components/LeaveDetailDrawer.tsx` | ok |
| F091 | `src/features/leave-approval/components/LeaveRequestsList.tsx` | ok |

#### `lesson-plans/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F092 | `src/features/lesson-plans/Page.tsx` | ok |
| F093 | `src/features/lesson-plans/components/LessonPlanBuilder.tsx` | ok |
| F094 | `src/features/lesson-plans/components/LessonPlanDetail.tsx` | ok |
| F095 | `src/features/lesson-plans/components/LessonPlanList.tsx` | ok |
| F096 | `src/features/lesson-plans/components/LessonPlansChrome.tsx` | ok |
| F097 | `src/features/lesson-plans/components/LessonPlansHelp.tsx` | ok |
| F098 | `src/features/lesson-plans/components/SyllabusUnitPicker.tsx` | ok |
| F099 | `src/features/lesson-plans/components/TemplatesPanel.tsx` | ok |
| F100 | `src/features/lesson-plans/components/WeekBoard.tsx` | ok |
| F101 | `src/features/lesson-plans/components/WeekStrip.tsx` | ok |

#### `maintenance/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F102 | `src/features/maintenance/Page.tsx` | ok |
| F103 | `src/features/maintenance/components/DashboardTab.tsx` | ok |
| F104 | `src/features/maintenance/components/HubWorkOrderDrawer.tsx` | ok |
| F105 | `src/features/maintenance/components/InventoryModal.tsx` | ok |
| F106 | `src/features/maintenance/components/InventoryTab.tsx` | ok |
| F107 | `src/features/maintenance/components/MaintenanceChrome.tsx` | ok |
| F108 | `src/features/maintenance/components/WorkOrderModal.tsx` | ok |
| F109 | `src/features/maintenance/components/WorkOrdersTab.tsx` | ok |

#### `notifications/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F110 | `src/features/notifications/Page.tsx` | ok |
| F111 | `src/features/notifications/components/NavBadge.tsx` | ok |
| F112 | `src/features/notifications/components/NotificationBell.tsx` | ok |

#### `online-exam/` (Phase 3)

| # | File | Status |
| :--- | :--- | :--- |
| F113 | `src/features/online-exam/AuthorPage.tsx` | ok |
| F114 | `src/features/online-exam/ListPage.tsx` | ok |
| F115 | `src/features/online-exam/Page.tsx` | ok |
| F116 | `src/features/online-exam/ResultsPage.tsx` | ok |
| F117 | `src/features/online-exam/TakePage.tsx` | ok |

#### `payroll/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F118 | `src/features/payroll/Page.tsx` | ok |
| F119 | `src/features/payroll/components/AttendanceSummaryPanel.tsx` | ok |
| F120 | `src/features/payroll/components/CreatePayrollModal.tsx` | ok |
| F121 | `src/features/payroll/components/EditPayrollModal.tsx` | ok |
| F122 | `src/features/payroll/components/PayrollChrome.tsx` | ok |
| F123 | `src/features/payroll/components/PayslipDrawer.tsx` | ok |
| F124 | `src/features/payroll/components/RecordsTab.tsx` | ok |

#### `pta/` (Phase 4)

| # | File | Status |
| :--- | :--- | :--- |
| F125 | `src/features/pta/Page.tsx` | ok |

#### `registrar/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F126 | `src/features/registrar/Page.tsx` | ok |
| F127 | `src/features/registrar/components/AdmissionsTab.tsx` | ok |
| F128 | `src/features/registrar/components/ApplicationReviewModal.tsx` | ok |
| F129 | `src/features/registrar/components/ClassroomsTab.tsx` | ok |
| F130 | `src/features/registrar/components/DirectoryTab.tsx` | ok |
| F131 | `src/features/registrar/components/EditStudentModal.tsx` | ok |
| F132 | `src/features/registrar/components/EnrollCredentialsModal.tsx` | ok |
| F133 | `src/features/registrar/components/ManualAdmissionTab.tsx` | ok |
| F134 | `src/features/registrar/components/OnlineRegistrationCard.tsx` | ok |
| F135 | `src/features/registrar/components/OverviewTab.tsx` | ok |
| F136 | `src/features/registrar/components/RegistrarChrome.tsx` | ok |
| F137 | `src/features/registrar/components/StatusBadge.tsx` | ok |
| F138 | `src/features/registrar/components/StudentDossierModal.tsx` | ok |

#### `report-cards/` (Phase print)

| # | File | Status |
| :--- | :--- | :--- |
| F139 | `src/features/report-cards/components/ReportCardBooklet.tsx` | print-allowlist |
| F140 | `src/features/report-cards/components/international/InternationalReportCard.tsx` | print-allowlist |
| F141 | `src/features/report-cards/components/international/shared.tsx` | print-allowlist |
| F142 | `src/features/report-cards/components/pages/BifoldChrome.tsx` | print-allowlist |
| F143 | `src/features/report-cards/components/pages/CoverPage.tsx` | print-allowlist |
| F144 | `src/features/report-cards/components/pages/GradesMatrixPage.tsx` | print-allowlist |
| F145 | `src/features/report-cards/components/pages/GradingSystemPage.tsx` | print-allowlist |
| F146 | `src/features/report-cards/components/pages/PromotionPage.tsx` | print-allowlist |

#### `reports/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F147 | `src/features/reports/Page.tsx` | ok |
| F148 | `src/features/reports/components/ReportsBody.tsx` | ok |
| F149 | `src/features/reports/components/ReportsChrome.tsx` | ok |

#### `role-access/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F150 | `src/features/role-access/ChangeRoleModal.tsx` | ok |
| F151 | `src/features/role-access/CustomizeRolesPanel.tsx` | ok |
| F152 | `src/features/role-access/Page.tsx` | ok |

#### `security/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F153 | `src/features/security/Page.tsx` | ok |
| F154 | `src/features/security/components/SecurityLogModal.tsx` | ok |
| F155 | `src/features/security/components/VisitorPassModal.tsx` | ok |

#### `settings/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F156 | `src/features/settings/Page.tsx` | ok |
| F157 | `src/features/settings/components/AcademicCalendarSummaryCard.tsx` | ok |
| F158 | `src/features/settings/components/AppearanceSettingsTab.tsx` | ok |
| F159 | `src/features/settings/components/AttendancePayrollSettingsCard.tsx` | ok |
| F160 | `src/features/settings/components/GradeLegendModal.tsx` | ok |
| F161 | `src/features/settings/components/GradingSettingsTab.tsx` | ok |
| F162 | `src/features/settings/components/NotificationsSettingsTab.tsx` | ok |
| F163 | `src/features/settings/components/SecuritySettingsTab.tsx` | ok |
| F164 | `src/features/settings/components/SettingsChrome.tsx` | ok |
| F165 | `src/features/settings/components/TemplatePreviewModal.tsx` | ok |
| F166 | `src/features/settings/components/TemplatePreviewRenderer.tsx` | ok |

#### `staff-portal/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F167 | `src/features/staff-portal/Page.tsx` | ok |
| F168 | `src/features/staff-portal/components/AnnouncementsTab.tsx` | ok |
| F169 | `src/features/staff-portal/components/AttendanceTab.tsx` | ok |
| F170 | `src/features/staff-portal/components/DocumentsTab.tsx` | ok |
| F171 | `src/features/staff-portal/components/LeaveRequestModal.tsx` | ok |
| F172 | `src/features/staff-portal/components/LeaveTab.tsx` | ok |
| F173 | `src/features/staff-portal/components/PayrollTab.tsx` | ok |
| F174 | `src/features/staff-portal/components/PhotoPreviewModal.tsx` | ok |
| F175 | `src/features/staff-portal/components/TasksTab.tsx` | ok |

#### `student-records/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F176 | `src/features/student-records/Page.tsx` | ok |
| F177 | `src/features/student-records/components/AddRecordModal.tsx` | ok |
| F178 | `src/features/student-records/components/StudentDetailPanel.tsx` | ok |

#### `students/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F179 | `src/features/students/Page.tsx` | ok |
| F180 | `src/features/students/components/EditStudentModal.tsx` | ok |
| F181 | `src/features/students/components/EnrollStudentModal.tsx` | ok |

#### `work-orders/` (Phase 2)

| # | File | Status |
| :--- | :--- | :--- |
| F182 | `src/features/work-orders/Page.tsx` | ok |
| F183 | `src/features/work-orders/components/CreateWorkOrderModal.tsx` | ok |
| F184 | `src/features/work-orders/components/WorkOrderDetailPanel.tsx` | ok |
| F185 | `src/features/work-orders/components/WorkOrdersChrome.tsx` | ok |
| F186 | `src/features/work-orders/components/WorkOrdersList.tsx` | ok |

### 7.6 Page modules without a `features/*/Page` (must still be checked)

| # | Path | Notes | Phase | Status |
| :--- | :--- | :--- | :--- | :--- |
| PG01 | `src/pages/Login.tsx` | public | 4 | ok |
| PG02 | `src/pages/RegisterSchool.tsx` | public | 4 | ok |
| PG03 | `src/pages/InviteAccept.tsx` | public | 4 | ok |
| PG04 | `src/pages/PublicApply.tsx` | public | 4 | ok |
| PG05 | `src/pages/PublicApplyStatus.tsx` | public | 4 | ok |
| PG06 | `src/pages/PublicReceiptVerify.tsx` | public | 4 | ok |
| PG07 | `src/pages/MockCheckout.tsx` | public | 4 | ok |
| PG08 | `src/pages/School/Onboarding.tsx` | admin setup | 2 | ok |
| PG09 | `src/pages/School/Profile.tsx` | all roles | 2 | ok |
| PG10 | `src/pages/School/StaffManagement.tsx` | + AddStaff + ImportRoster | 2 | ok |
| PG11 | `src/pages/School/Children.tsx` | parent | 4 | ok |
| PG12 | `src/pages/School/StudentGrades.tsx` | student/parent grades | 3 | ok |
| PG13 | `src/pages/School/Inventory.tsx` | ops | 2 | ok |
| PG14 | `src/pages/School/Procurement.tsx` | ops | 2 | ok |
| PG15 | `src/pages/School/Transportation.tsx` | may be unused by App | 2 | ok |
| PG16 | `src/pages/School/BusRoutes.tsx` | stub | 2 | ok |
| PG17 | `src/pages/School/Drivers.tsx` | stub | 2 | ok |
| PG18 | `src/pages/School/VehicleMaintenance.tsx` | stub | 2 | ok |
| PG19 | `src/pages/School/Library.tsx` | stub | 2 | ok |
| PG20 | `src/pages/School/Clinic.tsx` | stub | 2 | ok |
| PG21 | `src/pages/School/Counseling.tsx` | stub | 2 | ok |
| PG22 | `src/pages/School/Athletics.tsx` | stub | 2 | ok |
| PG23 | `src/pages/School/Hostel.tsx` | stub | 2 | ok |
| PG24 | `src/pages/School/Cafeteria.tsx` | stub | 2 | ok |
| PG25 | `src/pages/School/GradeSheet.tsx` | print entry | 3 | ok |
| PG26 | `src/pages/School/ReportCard.tsx` | print entry | 3 | ok |
| PG27 | `src/pages/School/Transcripts.tsx` | print entry | 3 | ok |
| PG28 | `src/pages/SuperAdmin/Dashboard.tsx` | | 2 | ok |
| PG29 | `src/pages/SuperAdmin/Schools.tsx` | | 2 | ok |
| PG30 | `src/pages/SuperAdmin/SchoolRegistrations.tsx` | | 2 | ok |
| PG31 | `src/pages/SuperAdmin/Users.tsx` | | 2 | ok |
| PG32 | `src/pages/SuperAdmin/Reports.tsx` | | 2 | ok |
| PG33 | `src/pages/SuperAdmin/Logs.tsx` | | 2 | ok |
| PG34 | `src/pages/SuperAdmin/Settings.tsx` | | 2 | ok |

---

### 7.7 Progress counters (update when marking)

| Bucket | Total items | Done |
| :--- | :--- | :--- |
| Shared chrome/primitives (§7.1) | 30 | 30 |
| Public routes (§7.2) | 10 (7 UI) | 7 |
| Super Admin routes (§7.3) | 8 | 8 |
| School routes (§7.4) | 61 patterns | 61 |
| Feature component files (§7.5) | 186 (F001–F186) | 186 |
| Standalone page modules (§7.6) | 34 | 34 |

**Program complete when:** every non-`n/a` / non-`print-allowlist` row is `ok`, `stub-ok`, or `matrix-scroll`, and Phase 5 CI smoke passes.

## 8. Explicit non-goals

| Item | Notes |
| :--- | :--- |
| Native iOS/Android apps | Web responsive only |
| Redesign print report cards for phone | Allowlist + scroll |
| New breakpoint system / CSS-in-JS | Tailwind only |
| Pixel-perfect parity with desktop density on 320px | Usable & honest, not cramped clone |

---

## 9. Change log

### 2026-07-30 — Phases 0–5 implemented

- **Change:** Mobile overlay drawer Layout; responsive main padding; icon search; PageShell no double-pad; `TableScroll` / `MatrixScrollHint`; mechanical grid+table pass; seed offenders fixed; matrix swipe tips; `test:responsive`; guidelines + checklist marked done.
- **Services:** `frontend-spa`
- **Status:** done
- **Verify:** `npm run test:responsive` · rebuild `frontend-spa` · spot-check 375px dashboard + Fees + Gradebook

### 2026-07-30 — Explicit checklist

- **Change:** Expanded §7 into a complete route + page + component inventory (status columns) covering App routes, shared chrome, every `features/**/*.tsx`, and standalone pages.
- **Services:** docs only
- **Status:** draft (checklist pending)
- **Verify:** Mark rows during implementation; program complete per §7.7

### 2026-07-30 — Plan created

- **Change:** Full-app responsive implementation plan (Layout drawer, composition rules, table/grid waves by role, print allowlist, CI smoke).
- **Services:** frontend-spa (docs only at this step)
- **UI / API:** N/A until Phase 0
- **Status:** draft
- **Verify:** N/A until Phase 0 ships
