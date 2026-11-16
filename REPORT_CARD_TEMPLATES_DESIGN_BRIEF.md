# Report Card Templates Design Brief (for AI Design/Implementation)

> **Purpose:** Give an AI agent (e.g. Claude) enough product, data-model, API, and UI-flow context to design **4 different report card templates** for this app.
>
> **Repo:** `Gnet-SMS-2026` (School Management System)  
> **Working assumptions:** Based on code/docs in this repository (Prisma schema, frontend `src/features/report-cards`, `src/pages/School/ReportCard.tsx`, settings/registry, academic/finance integrations). Treat endpoint contracts and assembled payload shapes below as the integration surface; verify against `services/academic` controllers/services when implementing.

---

## 1. Product & architecture overview

Multi-tenant, multi-role School Management System (super admin, school admin, principal, teachers, students, parents, registrar, etc.).

- **Frontend:** React 19 + Vite 6, Tailwind CSS 4, Zustand, React Router, i18n (`react-i18next`), `motion`. Feature folders under `src/features/*`.
- **Backend:** Node.js/Express microservices under `services/` (`gateway`, `identity`, `academic`, `classroom`, `finance`, `campus`, `comms`, `staff`, `ops`, `lifecycle`) with shared libs. Prisma ORM.
- **Database:** SQLite (dev) / PostgreSQL (prod). Main schema: `prisma/schema.prisma`.
- **Tenancy/auth:** School-scoped data (`schoolId`), JWT/bearer auth, role-based access, slug-based UI routes `/{slug}/...`.
- **Relevant domains:** Academic calendar (periods/terms, exam components), exams, grade entries/summaries, grade legends/scales, promotion outcomes, school branding/settings, printable student report cards (distinct from gradebook entry and from one-off gradesheets, but fed by the same grading data).

---

## 2. Report card domain model & data contracts

### 2.1 School/template selection
- **`School.reportCardTemplate`** (`String?`): selected report-card template id stored in Identity/school settings (e.g. `INTL_WISTERIA_GREEN`, legacy `TEMPLATE_*` may be resolved). Chosen in **Settings → Appearance/Report card**; rendered in `src/pages/School/ReportCard.tsx` via `ReportCardTemplate`/feature components.
- **`School.gradeSheetTemplate`**, **`School.certificateTemplate`**, branding fields (`name`, `address`, `logoUrl`, `brandColor`, etc.) and **document signatories** (`documentSignatories` JSON) are related but separate.
- **Registry:** `src/features/report-cards/registry.ts`
  - `resolveReportCardTemplateKey(stored)` → canonical key (unknown/removed fall back to `INTL_WISTERIA_GREEN`).
  - `getReportCardTemplateDef`, `isLiberianReportCardTemplate`, `isInternationalReportCardTemplate`, `persistableReportCardKey`, `reportCardPickerGroups`, `REGION_LABELS`.
  - Current picker groups exposed: `LR`, `INTL`.

### 2.2 Template definition (`src/features/report-cards/types.ts`)
`ReportCardTemplateDef`:
- `key`, `region` (`LR | US | EU | AFR | AS | INTL`), `label`, `description`
- `audience` (`PRIVATE | PUBLIC | BOTH`), `calendarAffinity` (`SEMESTER | TWO_TERM | THREE_TERM | ANY`)
- `pages`: `ReportCardPageKind[]` = `COVER | GRADES | GRADING_SYSTEM | PROMOTION`
- `promotionScheme`: `A_D | A_E`
- `branding`: `SCHOOL_LOGO | SCHOOL_LOGO_PLUS_MOE | MOE_ONLY`
- optional: `legacyId`, `divisionTitle`, `documentTitle`

**Current registered template (example):**
- `INTL_WISTERIA_GREEN` — region `INTL`, audience `BOTH`, affinity `ANY`, pages `["GRADES"]`, promotion `A_D`, branding `SCHOOL_LOGO`, label "Green academic quarterly" (A4, 1st–4th subject columns, attendance, grading legend).

### 2.3 Assembled payload (`ReportCardPayload`, `src/features/report-cards/types.ts`)
The renderer/assembler works against a normalized payload:
- **`school`**: `id?`, `name`, `address?`, `poBox?`, `logoUrl?`, `brandColor?`, `country?`, `county?`, `district?`, `contactPhone?`, `contactEmail?`
- **`student`**: `id`, `name`, `sex?`, `classLabel`, `gradeLevelLabel`
- **`academicYear`**: `{ id, label }`
- **`calendar`**: `patternType`, `periods[]` (`id,label,shortCode,orderIndex`)
- **`columns`**: `ReportCardColumn[]` (`key,label,roman?`) — period/exam/mark columns depending on region/template
- **`subjects`**: `ReportCardSubjectRow[]` — `subjectId,name,code`, `cells{[colKey]:{score,letter?,incomplete?}}`, `sem1Avg`, `sem2Avg`, `yearlyAvg`, `average`, `letter`, `remark`
- **`legend`**: `{ letter,min,max,detail? }[]`
- **`aggregates`**: `overallAverage`, `gpa`, `classPosition`, `attendanceRate` (nullable when unavailable)
- **`promotion`**: `ReportCardPromotion | null` (`outcome,toGrade,conditionedSubjects,probationWeeks,remarks,finalizedAt`)
- **`templateKey`**, **`generatedAt`**, **`officialSignatures?`** (`principal/registrar/academic` with `name,signatureUrl`)

### 2.4 Source inputs & grading concepts (align with backend)
- **`RawGradeForAssembly`** (`types.ts`): `id, score, isIncomplete?, subjectId?, subject?, examComponent?{id,label,shortCode}, examComponentId?, classroom?, classId?`
- **`AssembleReportCardInput`**: `templateKey, school, student, academicYearLabel?, grades, gradeLegends?, patternType?`
- **Legends/scales:** `GradeLegend`/`GradeScale` (`minScore,maxScore,gradeLetter,gpaPoints,remark`, categories like `CLASS`). Mapping via `src/lib/gradeLegend` (`letterFromScore`, `scaleFromScore`, `pickLegendScales`) with default/fallback bands.
- **Liberian-specific helpers** (`liberiaLegend.ts`): `LIBERIA_SENIOR_HIGH_SCALES`, `LIBERIA_FAILING_THRESHOLD`, `matchLiberiaColumnKey`, period/exam column conventions (`SEM1_P1..SEM1_EX`, `SEM2_P4..SEM2_EX`); score tone `pass/fail/empty`.
- **Assembly (client, `assembleClient.ts`):** `assembleReportCardPayload` groups released grades by subject, maps exam components/shortCodes to Liberian columns (or INTL fallback `SCORE`), computes per-cell letter/incomplete, `sem1Avg/sem2Avg/yearlyAvg/average`, overall average/GPA from legend scales, derives class label, normalizes missing data to `null`. Title helper: `liberianProgressReportTitle`.
- **Calendar/periods:** Academic calendar pattern/periods and exam components (`AcademicPeriod`, `ExamComponent`) drive period alignment in full implementations; payload carries `calendar.patternType` and period metadata.
- **Promotion:** `ReportCardPromotion` (and related academic/promotion models/flows where implemented) informs promotion/condition/probation pages for Liberian booklet-style cards.

---

## 3. Key API surface & data flow

Base proxied as `/api/...` (gateway). Auth: bearer/JWT; school/role scoped.

### 3.1 Data loaded by report card page (`src/pages/School/ReportCard.tsx`)
- `GET /api/students/:studentId/grades` — released/student grades (role-dependent). **Liberian** templates load all released grades for booklet; **international/exam-scoped** flows may filter to `examId` when present.
- `GET /api/users/:studentId` (when viewing another student) — resolve student name.
- `GET /api/schools/:schoolId/grade-legends` — legend/scale config for letter/remark/GPA mapping.
- School/template/branding/signatories from auth/store (`useAuthStore().school`, `documentSignatories`), official signatures via `useDocumentOfficialSignatures`, academic year/calendar via `useAcademicCalendarQuery` / academics-shared selectors.
- **Server PDF (attempted first):** `GET /api/exams/:examId/report-card/:studentId/pdf` — if available/OK, downloaded; otherwise client falls back to rendered DOM capture.

### 3.2 Client PDF/print fallback
- Renders `ReportCardTemplate` into `#report-card`; on download captures sheet nodes (Liberian: `.a4-portrait-sheet/.grades-inside-spread/.grading-spread`, filtered; International: `.intl-a4-page/.report-card-sheet/...`) with `html2canvas` and composes `jsPDF` **A4 portrait** pages. Print uses `window.print()` and `@media print/@page` rules in components.

### 3.3 Related surfaces (inspect/align as needed)
- **Academic:** exams, exam components, grade entries/summaries/release (`services/academic/src/routes/examRoutes.ts`, academic/calendar routes & controllers), `GET /api/students/:id/grades` contract.
- **Settings/Identity:** persist/read `reportCardTemplate`, branding, signatories (`src/features/settings/*`).
- **Gradesheets/transcripts/certificates:** related printable artifacts but different templates/data contracts.

---

## 4. Current frontend flows & surfaces

### 4.1 Rendering
- **Entry page:** `src/pages/School/ReportCard.tsx` — loads grades/legends/student, resolves template (`getReportCardTemplateDef`, `isLiberianReportCardTemplate`), computes subtitle/academic year/periods/signatures, handles loading/empty states (international requires grades; Liberian can render booklet with sparse matrices), **Print** and **Download PDF** (server then client fallback).
- **Template dispatch:** `src/components/ReportCardTemplates.tsx` (re-export/bridge) and `src/features/report-cards/*`.
  - **Liberian booklet:** `LiberianReportCardBooklet` (`components/ReportCardBooklet.tsx`) composes A4 portrait sheets/pages: outer spread (Promotion | Cover), inside (First | Second semester grades matrix), optional Grading System page — using `pages/CoverPage`, `GradesMatrixPage`, `GradingSystemPage`, `PromotionPage`, `BifoldChrome` constants.
  - **International:** `InternationalReportCard` with variants/components under `components/international/*` (e.g. `WisteriaGreenCard`, `WisteriaNavyCard`, `quarterlyHelpers`, `shared`).
- **Assembly:** `assembleClient.ts` builds `ReportCardPayload` from released grades/legends/school/student/calendar hints for SPA rendering and tests.

### 4.2 Settings/preview
- Template picker/preview in settings (`src/features/settings/components/TemplatePreviewModal.tsx`, `TemplatePreviewRenderer.tsx`) renders report-card previews (Liberian booklet via assembled payload; international via `InternationalReportCard` with mock data/periods/grades) at true A4 sizing context.

### 4.3 Styling/print
- A4 portrait (210×297mm) true-size sheets, print `@page { size: A4 portrait; margin: 0 }`, page-break handling, preview vs print chrome; Liberian uses bifold/panel composition within portrait sheets.

---

## 5. Design task: create **4 different Report Card Templates**

Design **four (4) distinct report card templates** that fit this app’s real data, regional/calendar differences, and print flows. "Report card template" here means the **student-facing printable report card** (and its on-screen preview/PDF export) assembled from released grades and school/student metadata.

### 5.1 What each template should define (deliverables per template)
For each of the 4 templates provide:
1. **Name, region & persona/use-case:** (e.g. Liberian semester booklet, international quarterly, standards-based progress, transcript-like summary) — meaningfully different; state target `region`, `audience`, `calendarAffinity`.
2. **Page structure & layout/wireframe:** which `pages` are included (`COVER|GRADES|GRADING_SYSTEM|PROMOTION` or justified extension), sheet composition (single A4, multi-page, bifold), header/identity, subject matrix/tables/cards, legends, attendance/remarks, promotion/behavior blocks, signature/seal areas, responsive preview behavior.
3. **Data mapping table:** exact fields shown and source from `ReportCardPayload` / `ReportCardTemplateDef` / inputs (e.g. `subjects[].cells[colKey]`, `sem1Avg/yearlyAvg`, `legend`, `aggregates.overallAverage|gpa|classPosition|attendanceRate`, `promotion.*`, `officialSignatures`, `school.branding/logo/address`, `calendar/patternType`).
4. **Grading & calculation presentation:** how columns map to periods/exam components/terms, how averages/letters/GPA/remarks are computed or displayed (consistent with §2.4 and `assembleClient`/legends), handling of incomplete/missing scores and failing thresholds where applicable.
5. **Interaction/flow notes:** selection/context (exam-scoped vs year/term booklet), print/PDF behavior (server vs client capture targets), empty states, preview in settings.
6. **States & edge cases:** sparse or no grades, missing components/periods, unknown template fallback, missing rank/attendance/GPA/promotion/signatures, custom vs default legends, long subject lists/multi-page overflow, RTL/locale considerations if relevant.
7. **Implementation notes:** which existing components/assemblers/registries to extend (`report-cards/registry`, `types`, `assembleClient`, booklet/international components), required `ReportCardTemplateDef` fields, and any minimal API additions (clearly flagged).

### 5.2 Constraints & non-goals
- **Do not invent data:** show `—`/empty when rank, attendance, GPA, promotion outcome, class position, signatures, or scores are unavailable.
- **Respect roles/tenancy:** only render for authorized users with released/accessible grades; school-scoped branding and settings.
- **Align with legends & calendar:** use `GradeLegend/Scale` (with fallbacks) and support configured calendar/period/component mappings; do not change core grading math server-side unless explicitly proposed.
- **Print fidelity:** designs must be producible as true-size A4 output (portrait/landscape if specified) and work with current html2canvas/jsPDF capture strategy.
- **Out of scope unless stated:** grade entry, gradesheet/certificate redesign, finance/receipts, non-academic modules.

### 5.3 Suggested variety axes (pick distinct combinations for the 4)
- **Region/calendar:** Liberian semester booklet vs international term/quarterly vs other regional conventions.
- **Page composition:** single-page summary vs multi-page booklet (cover/matrix/grading/promotion).
- **Density/layout:** matrix/table-heavy vs card/subject-block layout.
- **Emphasis:** academic marks & averages vs competency/remarks vs promotion/attendance/conduct summary.
- **Branding:** school-only vs MOE/co-branded treatments (per `branding` model).

---

## 6. Pointers to inspect in-repo

- **Frontend:** `src/features/report-cards/*` (`registry.ts`, `types.ts`, `assembleClient.ts`, `index.ts`, `liberiaLegend.ts`, `signatureSlots.ts`, `components/ReportCardBooklet.tsx`, `components/pages/*`, `components/international/*`), `src/components/ReportCardTemplates.tsx`, `src/pages/School/ReportCard.tsx`, `src/features/settings/components/TemplatePreviewRenderer.tsx`, `TemplatePreviewModal.tsx`.
- **Libs/hooks:** `src/lib/gradeLegend.ts`, `src/hooks/useDocumentOfficialSignatures.ts`, `src/features/academics-shared/calendar/*`, `src/services/api.ts`.
- **Schema/backend:** `prisma/schema.prisma` (`School.reportCardTemplate`, `GradeEntry`, `ExamComponent`, `AcademicPeriod`, `GradeLegend/Scale`, summaries/promotion-related models), `services/academic/src/routes/*`, grade/student/exam controllers and PDF routes if present.
- **Docs/assets:** `docs/APP_FEATURES_OVERVIEW.md`, `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md` (related print conventions), `Gradesheet Templates/`, `docs/New Gradesheet templates/` (print fidelity references).

---

## 7. Acceptance checklist for the produced designs

- [ ] 4 clearly distinct, named report card templates with full specs (§5.1).
- [ ] Each maps to real payload/models/endpoints in this app (or clearly labels any minimal extension).
- [ ] Handles Liberian/INTL or stated regional differences, column/period mapping, legends, averages/GPA/remarks, promotion/signatures, and missing-data cases.
- [ ] Includes layout/page composition + print/PDF behavior + interaction notes sufficient for implementation handoff.
- [ ] No fabricated metrics/fields; respects RBAC/tenancy and released-grade assumptions.
