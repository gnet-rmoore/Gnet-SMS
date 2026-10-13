# Syllabus & Lesson Plans ↔ Academic Calendar Alignment — Plan

> **Status:** Done (2026-08-04)  
> **Scope:** Syllabus plans and lesson-plan week boards follow the tenant’s active Academic Calendar (year label, terms/periods, assessment weights)  
> **Owning services:** `frontend-spa`, `academic`  
> **Companions:** `docs/TEACHER_SYLLABUS_SCOPING_PLAN.md`, `docs/LESSON_PLANS_PLAN.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Goal

Today syllabus and lesson plans run on parallel timelines: free-text academic year, invented week ranges, and hand-entered grading weights. Academic Calendar already defines periods, dates, and exam-component weights for the school year.

**After this work:**

| Area | Behavior |
| :--- | :--- |
| **Syllabus builder** | Requires active calendar; academic year read from calendar; unit blocks tied to calendar periods; grading weights imported from calendar exam components (annualized) |
| **Lesson plans** | Week strip scoped to selected calendar period; banner shows active calendar; lesson date warns when outside any period |
| **Persistence** | `SyllabusPlan.calendarPatternId` stores which calendar the plan was authored against |

---

## 1. Phases

### Phase 1 — Shared helpers (`src/features/academics-shared/syllabusCalendar.ts`)

- `academicYearLabel(calendar)` — name or derived span (e.g. `2025-2026`)
- `gradingCriteriaFromCalendar(calendar)` — flatten period × component weights to year-level % (sum 100)
- `periodWeekLabel(period)` — human label for unit time frame
- `periodContainingDate`, `clampWeekStartToPeriod`, `normalizeCalendarPeriods`
- Unit tests: `tests/syllabus-calendar.test.ts`

### Phase 2 — Schema & API (`services/academic`)

- Add optional `calendarPatternId` on `SyllabusPlan`
- `createSyllabus` / `updateSyllabus` persist `calendarPatternId`
- Reject create when `calendarPatternId` missing (new plans must align)

### Phase 3 — Syllabus UI (`src/features/curriculum`)

- `applyCalendarToSyllabusForm` in defaults (teacher + admin open)
- `SyllabusBuilderModal`: empty-state CTA → Settings → Academic Calendar; readonly year; period picker on units; calendar-synced weights (read-only with optional “customize”)
- Submit validation: active calendar + `calendarPatternId`

### Phase 4 — Lesson plans UI (`src/features/lesson-plans`)

- `AcademicCalendarStrip` on page
- `WeekStrip`: period tabs + clamp week navigation inside period bounds
- `LessonPlanBuilder`: warn when lesson date falls outside calendar periods

### Phase 5 — Docs & verify

- Update `IMPLEMENTATION_STATUS.md`, cross-link from `TEACHER_SYLLABUS_SCOPING_PLAN.md`
- `npm run test:syllabus-calendar` + rebuild `academic`, `frontend-spa`

---

## 2. Acceptance checks

1. School **without** active calendar → syllabus modal shows setup CTA; submit blocked.
2. School **with** calendar → new syllabus shows calendar name/year, period dropdown on units, weights match calendar (annualized).
3. Saved syllabus includes `calendarPatternId` in API payload/DB.
4. Lesson plans week board shows period selector; prev/next week cannot leave selected period.
5. Lesson plan with date outside all periods shows inline warning (save still allowed — advisory).

---

## 3. Non-goals (future)

- Auto-sync syllabus weights when calendar changes after approval
- `LessonPlan.academicPeriodId` FK (derive from `lessonDate` client-side)
- Replacing bell `schedulePeriodId` with academic period

---

## 4. Follow-up (2026-08-04) — gaps closed

| Item | Status |
| :--- | :--- |
| Starter templates re-apply calendar via `mergeTemplateWithCalendar` | Done |
| Server validation of `academicPeriodId` / `examComponentId` | Done |
| Syllabus view shows calendar link + synced weights badge | Done |
| Edit/resubmit REJECTED/DRAFT plans via calendar-aware builder | Done |
| Root `prisma/schema.prisma` `calendarPatternId` | Done |
| i18n keys in all locales | Done |
| `test:syllabus-calendar` + teaching-scope in `test:unit` | Done |
| E2E smokes `e2e/syllabus-calendar.spec.ts` | Done |
