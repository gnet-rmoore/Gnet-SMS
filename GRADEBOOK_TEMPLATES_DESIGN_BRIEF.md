# Gradebook Templates Design Brief (for AI Design/Implementation)

> **Purpose:** Give an AI agent (e.g. Claude) enough product, data-model, API, and UI-flow context to design **4 different gradebook templates** for this app.
>
> **Repo:** `Gnet-SMS-2026` (School Management System)  
> **Working assumptions:** Based on code/docs in this repository (Prisma schema, `docs/*`, frontend `src/features/gradebook` & `src/features/gradesheets`, academic service routes/controllers). Some implementation details live in `services/academic/src/services/*` (not exhaustively inlined here); treat endpoint contracts below as the integration surface.

---

## 1. Product & architecture overview

A multi-tenant, multi-role School Management System (super admin, school admin, principal, teachers, students, parents, etc.).

- **Frontend:** React 19 + Vite 6, Tailwind CSS 4, Zustand, React Router, i18n (`react-i18next`), `motion` (framer-motion). Monorepo-style frontend in `src/` with feature folders (`src/features/*`).
- **Backend:** Node.js/Express microservices under `services/` (e.g. `gateway`, `identity`, `academic`, `classroom`, `finance`, `campus`, `comms`, `staff`, `ops`, `lifecycle`) with shared libs in `services/shared`. Prisma ORM.
- **Database:** SQLite (dev) / PostgreSQL (prod), switched via `DATABASE_PROVIDER`/`DATABASE_URL` and `prisma/setup-provider.ts`. Main schema: `prisma/schema.prisma`.
- **Tenancy/auth:** School-scoped data (`schoolId`); JWT auth; role-based access (`requireRoles`, tenant checks). Slug-based routing in UI: `/{slug}/...`.
- **Key domains relevant to gradebooks:** Academic calendar (periods/terms & exam components), exams/schedules, grade entry (draft/submit/review/release), grade summaries, grade legends/scales, classrooms/subjects/students, gradesheets/report cards/certificates.

---

## 2. Grading domain model (source of truth: `prisma/schema.prisma`)

### 2.1 School-level grading configuration
- **`School.gradebookConfig`** (`String?`, JSON): configurable weighted gradebook **structure template** / category columns (e.g. Homework, Quiz, Classwork, Midterm, Final) with weights. Drives live columns when an assessment uses the school template.
  - Default conceptual categories (per `docs/gradebook-architecture.md`): `HW` 20%, `QZ` 20%, `CW` 10%, `MID` 20%, `FIN` 30%.
  - Typical shape: array of `{ id, name, code, weightPct, isActive }`.
- **`School.gradeSheetTemplate`**: selected printable gradesheet/report template id (e.g. `TEMPLATE_1`, `TEMPLATE_2`; legacy ids may remap). **Distinct from teacher gradebook UI**.
- **`School.reportCardTemplate`**, `certificateTemplate`, etc. (out of scope except awareness).

### 2.2 Academic calendar & assessments
- **`AcademicCalendarPattern`** → **`AcademicPeriod`** (terms/semesters/periods; `periodType`, dates, `weightPct`, `orderIndex`, `isActive`).
- **`ExamComponent`** (per period, school-scoped): an assessment/graded component in the calendar.
  - Fields: `componentType`, `label`, `shortCode`, `maxScore`, `weightPct`, `examStartDate`, `examEndDate`, `gradeSubmissionDeadline`, `isGraded`, `orderIndex`.
  - **Structure resolution (important):**
    - `gradebookStructureCustom` (`Boolean`, default `false`)
    - `gradebookStructure` (`String?`, JSON snapshot when custom or last synced)
    - If `gradebookStructureCustom == false` → **live** `School.gradebookConfig` (school template) defines columns.
    - If `true` → stored `gradebookStructure` is authoritative for that assessment.
  - Relations: `period`, `gradeEntries[]`.
- **`Exam`** (scheduled exam/sitting context): `title`, `startDate`, `endDate`, `gradeSubmissionDeadline`, `duration`, `status`, `isGradesReleased`, linked `gradeEntries[]`. Exams integrate with calendar periods/components in UI/flows.

### 2.3 Grade entries & history
- **`GradeEntry`**: the atomic stored score/result.
  - Keys/links: `studentId`, `subjectId`, `classId` (Classroom), `examComponentId?`, `structureColumnId?` (activity/column within assessment structure), `examId?`, `schoolId`, `schoolYearId`.
  - Data/state: `score` (Float?), `status` (e.g. `DRAFT`, `SUBMITTED` and review states like `ACCEPTED/REJECTED` per flows), `isLocked`, `enteredBy` (teacher), timestamps, `feedback`, `notes`.
  - `GradeHistory[]` tracks changes (`score`, `status`, `feedback`, `changedBy`, `changedAt`).

### 2.4 Summaries & scales
- **`PeriodGradeSummary`**: per student/subject/period (`periodTotalPct`, `subjectPosition?`, `isFinalized`).
- **`AnnualGradeSummary`**: per student/subject/school year (`annualAverage`, `gradeLetter?`, `gradeRemark?`, `gpaPoints?`, `overallPosition?`, `isEligibleForPromotion?`).
- **`GradeLegend`** (`schoolId`, `name`, `category` default `CLASS`, e.g. `CLASS`/`ASSIGNMENT`/`QUIZ`) → **`GradeScale`** (`minScore`, `maxScore`, `gradeLetter`, `gpaPoints?`, `remark`). Used to map numeric % to letter/remark/GPA; fallback default bands exist when no custom legend.

### 2.5 Related entities
- **`Classroom`** (`name`, `classCode`, `schoolId`, `subjectId?`, `gradeLevelId?`, `ownerTeacherId`, members, etc.).
- **`Subject`** (`name`, `code`, unique per school).
- **`GradeLevel`** / grade levels.
- **Users/roles:** teachers own/teach classrooms; students enrolled; parents linked; admins/principal/VPI manage/review.

---

## 3. Calculation & structure concepts (must align with backend)

1. **Assessment structure columns:** An assessment (ExamComponent) resolves to an ordered set of columns (ids/names/codes/weights/max, etc. per `AssessmentStructureColumn` in frontend). Scores can be keyed by `structureColumnId` under the assessment.
2. **Category/weighted averaging (conceptual):** Group grades by subject and map to configured categories/structure (by `shortCode`/`componentType`/column id). Average multiple entries within a category/column as needed, apply weights, normalize by weights of categories that actually have grades (do not penalize missing components unfairly). Backend service: `services/academic` grade/exam logic (e.g. `gradeService`/exam services) computes/persists summaries; frontend mirrors for consistent display/print (`assembleGradeSheet`, student views).
3. **Live vs custom template:** Non-custom assessments follow live school structure; custom assessments keep their own snapshot. Sync endpoint updates non-custom assessments when school template changes.
4. **Legends:** Lookup by category with fallback to `CLASS`, then default band if none.

---

## 4. Key API surface (integration points)

Base URL typically proxied as `/api/...` via gateway. Auth: bearer/JWT (`authenticate`), tenant/role middleware. School-scoped where noted.

### 4.1 Exams & grade entry (academic service) — `services/academic/src/routes/examRoutes.ts`
**Read (roles include admin/principal/VPI/teacher; some student/parent where applicable):**
- `GET /api/students/:studentId/grades` — student grades (role-dependent access).
- `GET /api/schools/:schoolId/exams` — list exams (paging/filter params supported).
- `GET /api/exams/:id` — exam details.
- `GET /api/exams/:id/schedule` — exam schedules.
- `GET /api/exams/:id/teacher-classrooms` — classrooms teacher can grade for exam.
- `GET /api/exams/:id/submissions-summary` — submission/review summary (staff).
- `GET /api/exams/:id/grades?classroomId=&teacherId?` — grades for exam+classroom.

**Write/entry:**
- `POST /api/exams/:id/grades` — upsert single grade entry (`gradeEntryUpsertSchema`).
- `POST /api/exams/:id/grades/bulk` — bulk upsert for exam (`{ classId, subjectId, status: DRAFT|SUBMITTED, examComponentId?, entries:[{studentId, grade}] }` per frontend usage).

**Gradebook (component/assessment-structured) — school scoped:**
- `GET /api/schools/:schoolId/gradebook/component-grades?classId=&examComponentId=&subjectId?`
- `GET /api/schools/:schoolId/gradebook/assessment-grades?classId=&examComponentId=&subjectId?` → returns `{ assessment: {id,label,shortCode,componentType,periodId,periodLabel,periodShortCode,gradebookStructure[],gradebookStructureCustom,structureSource,gradeSubmissionDeadline}, rows:[{studentId, student, cells:{[columnId]:{grade,status,isLocked,isIncomplete,incompleteNote,entryId}}}] }` (see `src/features/gradebook/api.ts`).
- `POST /api/schools/:schoolId/gradebook/component-grades/bulk` — body includes `classId, subjectId, examComponentId, status (DRAFT|SUBMITTED), entries:[{studentId, grade, structureColumnId?, isIncomplete?, incompleteNote?}]`.
- `POST /api/schools/:schoolId/gradebook/sync-structure-template` — sync live-template assessments (admin/principal/IT).

**Review/release/admin:**
- `GET /api/schools/:schoolId/grades/pending`, `GET /api/schools/:schoolId/grades/my-submissions`
- `POST /api/schools/:schoolId/grades/review-batch`
- `PATCH /api/exams/:id/release-grades`, `POST /api/exams/:id/process-results`
- `PATCH /api/grade-entries/:id`, `POST /api/grade-entries/:id/reopen`
- Grade edit grants: `GET/POST /api/schools/:schoolId/grades/edit-grants`, `GET .../mine`, `POST .../:grantId/revoke`

**Exam management (leadership):** `POST/PUT /api/schools/:schoolId/exams`, schedules CRUD under `/api/exams/:id/schedule` and `/api/exam-schedules/:scheduleId` (restricted roles).

### 4.2 Academic calendar & components — `services/academic/src/routes/academicRoutes.ts`
- `GET/POST /api/schools/:schoolId/calendar` (pattern, periods, exam components/weights; nested response consumed by frontend).
- `POST /api/periods/:periodId/exam-components`
- `PATCH/DELETE /api/exam-components/:id` (tenant-checked). These manage assessment components and their structures/dates/weights (authoritative behavior in controller/service).

### 4.3 Other relevant surfaces (by area; consult routes/controllers as needed)
- **Settings/identity:** school settings including `gradebookConfig`, grade legends/scales, templates/signatories (`src/features/settings/api.ts`, identity/academic endpoints).
- **Classrooms/subjects/students:** classroom lists (e.g. teacher "my classrooms"), members/roster, subjects — used to scope grade entry (`GET /api/schools/:schoolId/classrooms`, `workspaceApi.fetchSubjects`, etc.).
- **Gradesheets/PDF:** frontend print/PDF generation from assembled data (`src/features/gradesheets/*`, `src/pages/School/GradeSheet.tsx`); PDF routes may exist in academic/pdf routes for server-side exports.
- **Report cards/transcripts/certificates:** separate flows/templates (`docs/gradebook-architecture.md`, `services/academic/src/routes/transcriptRoutes.ts`, certificates features) — related but not the same as gradebook entry.

---

## 5. Current frontend flows & surfaces

### 5.1 Teacher/staff gradebook hub — `src/features/gradebook/Page.tsx`, route `/{slug}/gradebook`
- **Modes (conceptual):** exam-based entry and **assessment-structured** entry (by assessment/ExamComponent with structure columns). Teachers may be directed primarily to assessment flow (see role/mode handling in page).
- **Data loaded:** exams, calendar (periods/components), teacher classrooms (+ subjects), grade legends, "my" grade-edit grants.
- **Assessment entry:** select classroom, period, assessment (ExamComponent) → `fetchAssessmentGrades` → render sheet/grid of students x structure columns; autosave/local draft + background sync; bulk submit (`bulkComponentGrades`, status DRAFT/SUBMITTED). Cells track grade, status, lock, incomplete flags/notes.
- **Exam entry:** select exam+classroom → `fetchExamGrades`/bulk exam grades.
- **Components:** `GradebookAssessmentSheet`, `GradebookSheet`, `GradebookPeriodSheet`, `GradebookScoreInput`, toolbars/status/sync banners, autosave hooks, local store/background sync (`lib/gradebook*`).
- **UX intent:** "Executive Slate" gradebook hub/sheet redesign noted in plans; supports draft/submit, locks/grants, deadlines context.

### 5.2 Printable gradesheets (output templates, already exist) — `src/features/gradesheets/*`, `src/pages/School/GradeSheet.tsx`, `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md`
- **3 logical print designs implemented as 2 active ids today:** `TEMPLATE_1` Classic ledger (A4), `TEMPLATE_2` Modern mastery (A4); Legal/official record noted in plan/docs with remapping/legacy handling. Registry resolves unknown/legacy to `TEMPLATE_1`.
- **`assembleGradeSheet.ts`:** maps released grade rows + school config/legends + assessment structure rollups into `GradeSheetData` (school/term/student/subjects/summary/attendance/remarks/signatures). Handles honest gaps (no invented rank/GPA/attendance when missing), CA/Exam splits when inferable.
- **Not the same artifact as "gradebook entry template"** but closely related for reporting/printing student results.

### 5.3 Other related pages
- `src/pages/School/GradeSheet.tsx`, `StudentGrades.tsx`, exam details/grade entry panels, grade review/edit-access pages, settings (grading structure & legends), academic calendar setup (`/{slug}/settings/academic-calendar`).

---

## 6. Design task: create **4 different Gradebook Templates**

Design **four (4) distinct gradebook templates** that fit this app's real data and flows. Treat "gradebook template" as a **teacher/admin-facing gradebook experience** (entry, tracking, and/or class assessment views) unless you explicitly propose an alternative — but any proposal must map to existing entities/APIs above.

### 6.1 What each template should define (deliverables per template)
For each of the 4 templates provide:
1. **Name & persona/use-case:** (e.g. primary teacher quick-entry, standards/mastery tracker, period-summary/analytics-heavy, exam-focused roster, elementary vs secondary, etc.) — make them meaningfully different.
2. **Layout/wireframe description:** regions (header/context, filters/class-period-assessment selectors, grid/table/cards, side panels, summary/legend), information hierarchy, responsive behavior (desktop-first but usable on tablet).
3. **Data mapping table:** exact fields/objects shown and their source (e.g. `assessment.rows[].cells[columnId].grade|status|isLocked|isIncomplete`, `assessment.gradebookStructure`, `ExamComponent` meta, `PeriodGradeSummary`, legends, classroom roster/subject, deadlines).
4. **Interaction model:** selection flow, inline edit behavior, autosave/draft vs submit, bulk actions, keyboard/accessibility considerations, handling locked/reviewed/incomplete states and edit grants, empty/error states.
5. **States & edge cases:** no calendar/structure, custom vs school-template assessment, missing scores, partial weights, released/locked grades, overdue submission deadline, multi-subject or single-subject classroom contexts.
6. **Calculations/derived UI values:** any averages/totals/progress shown must specify formula consistent with §3 (and note when backend summary vs client-derived).
7. **Implementation notes:** which existing components/APIs to reuse (`gradebookApi`, assessment vs exam mode, `GradebookAssessmentSheet`, etc.), suggested new components/props, and any required but minimal API additions (flag clearly if new).

### 6.2 Constraints & non-goals
- **Do not invent data:** if rank, attendance, comments, or class averages are unavailable, show "—"/empty states (see gradesheet assembler behavior).
- **Respect roles/permissions & tenancy:** teachers grade assigned scope; review/release are admin/principal/VPI actions; honor locks and edit grants.
- **Align with structure resolution:** support live school template vs assessment-custom structures; reflect `structureSource`/custom badges where relevant.
- **Consistency:** reuse `GradeLegend/Scale` for letter/remark display; keep status vocabulary compatible (`DRAFT`, `SUBMITTED`, `ACCEPTED/REJECTED`, locks, incomplete).
- **Out of scope unless stated:** changing core grading math rules server-side, report-card/certificate redesign, payment/ops modules. (Gradesheet print templates are separate but may be referenced for output parity.)

### 6.3 Suggested variety axes (pick distinct combinations for the 4)
- **View density:** spreadsheet/grid vs card-per-student vs compact roster.
- **Primary organizing axis:** by assessment structure columns, by exam component list, by period/term rollup, or by student progress.
- **Feedback emphasis:** scores-only vs score+status+incomplete notes+feedback.
- **Summary emphasis:** per-student totals, per-column/class distribution, submission/completion progress, deadline/lock indicators.
- **Context:** single class+subject assessment sheet vs multi-assessment period overview (read-only summary where writes aren't supported).

---

## 7. Pointers to inspect in-repo

- **Docs:** `docs/gradebook-architecture.md`, `docs/GENERIC_GRADEBOOK_PLAN.md`, `docs/TEACHER_GRADEBOOK_PLAN.md` (if present), `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `docs/GRADE_REVIEW_PLAN.md`, `docs/GRADE_EDIT_ACCESS_GRANT_PLAN.md`, `docs/APP_FEATURES_OVERVIEW.md`.
- **Schema:** `prisma/schema.prisma` (`School`, `AcademicPeriod`, `ExamComponent`, `GradeEntry`, `GradeHistory`, `PeriodGradeSummary`, `AnnualGradeSummary`, `GradeLegend`, `GradeScale`, `Exam`, `Classroom`, `Subject`).
- **Frontend gradebook:** `src/features/gradebook/*` (api, Page, sheets, autosave/sync/local store).
- **Frontend gradesheets (print):** `src/features/gradesheets/*`, `src/pages/School/GradeSheet.tsx`.
- **Academic API:** `services/academic/src/routes/examRoutes.ts`, `academicRoutes.ts`, `calendarRoutes.ts`; controllers `examController.ts`, `academicController.ts`, `calendarController.ts`.
- **Sample print assets:** `Gradesheet Templates/` (HTML).

---

## 8. Acceptance checklist for the produced designs

- [ ] 4 clearly distinct, named gradebook templates with full specs (§6.1).
- [ ] Each maps to real models/endpoints in this app (or clearly labels any minimal extension).
- [ ] Handles assessment structure (columns, live vs custom), draft/submit/lock/review states, legends, and missing-data cases.
- [ ] Includes layout + interaction + calculation notes sufficient for implementation handoff.
- [ ] No fabricated metrics/fields; respects RBAC/tenancy assumptions.
