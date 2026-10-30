# Implementation Plan — Enrollment, Admissions, and Teacher Workflow UX

**Status:** Implementation underway; automated test execution and manual QA remain pending.  
**Scope:** Enrollment, Public Apply, Admissions/Registrar, Class Schedule, Teacher Curriculum/Syllabus, Lesson Plans, Gradebook, Teacher Attendance, Student Attendance, Classroom Banners  
**Primary root cause running through most issues:** list APIs return a paged envelope `{ items, total, page, pageSize }`, but several clients treat the response as an array. Two additional verified causes are important: Enrollment’s filter state is not wired to its data fetch, and Attendance filters/searches after pagination instead of before it.

---

## 1. Cross-Cutting Fix: Normalize Paged API Responses

### Problem

`GET /api/schools/:schoolId/grade-levels` and `GET /api/schools/:schoolId/subjects` return:

```ts
{ items: T[], total: number, page: number, pageSize: number }
```

Several call sites do `Array.isArray(response) ? response : []`, so they receive `[]` every time. This is the main reason grade-level dropdowns are empty in Enrollment, Admissions, Curriculum tools, Lesson Plans, and Public Apply/Registrar flows.

### Confirmed server contract

- `services/academic/src/services/academicService.ts:319` — `getGradeLevels()` returns paged object.
- `services/academic/src/services/academicService.ts:371` — `getSubjects()` returns paged object.
- `services/academic/src/controllers/academicController.ts:180` — `getGradeLevels` sends the paged object unchanged.
- `services/academic/src/controllers/academicController.ts:242` — `getSubjects` sends the paged object unchanged.
- `services/academic/src/controllers/academicController.ts:374-377` — the internal grade-levels route also returns the paged object, even though internal callers expect an array.
- `services/identity/src/controllers/schoolController.ts:315-317` — public apply calls the internal grade-levels route and then does `Array.isArray(grades) ? grades : []`, which throws away the paged object and returns `[]`.
- `services/identity/src/lib/academicClient.ts:26-33` — the public-apply grade client does not unwrap the envelope either.

Classrooms are **not** paged by the classroom service (`services/classroom/src/controllers/classroomController.ts:51-94`), so only grade levels, subjects, syllabi, and other genuinely paged lists need unwrapping. The curriculum hook’s `fetchClassrooms(..., page, pageSize)` parameters are ignored by that endpoint; do not “fix” classroom scope by raising a classroom page size.

### Fix

1. Add a shared helper, for example `src/lib/apiEnvelope.ts`:

   ```ts
   export function unwrapItems<T>(value: unknown): T[] {
     if (Array.isArray(value)) return value as T[];
     const items = (value as { items?: unknown } | null)?.items;
     return Array.isArray(items) ? (items as T[]) : [];
   }

   export function unwrapTotal(value: unknown, fallback = 0): number {
     const total = (value as { total?: unknown } | null)?.total;
     return typeof total === "number" ? total : fallback;
   }
   ```

2. Apply it at every grade-level/subject fetch boundary, not only in components:
   - `src/features/enrollment/api.ts`
   - `src/features/registrar/api.ts` or `src/features/registrar/hooks/useRegistrarQuery.ts`
   - `src/features/lesson-plans/api.ts`
   - `src/features/curriculum/hooks/useCurriculumQuery.ts` (already handles it; migrate to helper for consistency)
   - `src/features/classrooms` and any other callers of `/grade-levels` or `/subjects`
   - `src/features/admission-form` public apply grade loader
   - `src/features/classroom-workspace/api.ts` where `fetchGradeLevels`/`fetchSubjects` are used
   - `src/pages/PublicApply.tsx` where the public grade list is loaded

3. Fix the server boundary as well:
   - Make `academicController.listGradeLevelsInternal` return `{ items }`’s `items` array (or add a dedicated unpaged internal method), so every internal consumer receives the array shape it already assumes.
   - Keep the authenticated public API paged contract unchanged unless a versioned contract change is approved.
   - Make `schoolController.getPublicGradeLevels` defensively accept either an array or `{ items }` while the internal contract is being corrected.
   - Update `services/finance/src/lib/academicClient.ts:45-56` and `services/lifecycle/src/lib/classroomClient.ts:77-93` to use the same unwrap rule if the internal contract stays paged.

4. Prefer `fetchAll` variants for dropdown data (request `pageSize=100`, loop only if `total > items.length`) so selectors are never silently capped at the first page.

5. Add unit tests for `unwrapItems` and integration/regression coverage:
   - Grade-level selector is non-empty when API returns `{ items, total }`.
   - Subject selector is non-empty when API returns `{ items, total }`.
   - Empty API returns `[]` without crashing.
   - Existing array-shaped responses still work.

### Acceptance criteria

- Every grade-level/subject dropdown loads real options in all affected pages.
- No `gradeLevels.map` path can receive a non-array.
- No call site uses raw `Array.isArray(response) ? response : []` for grade levels or subjects.

---

## 2. Enrollment

### Files

- `src/features/enrollment/Page.tsx`
- `src/features/enrollment/api.ts`
- `src/features/students/components/EnrollStudentModal.tsx`
- `src/features/students/Page.tsx`
- `src/features/students/hooks/useStudentsQuery.ts`
- `src/components/ui/ListFilterBar.tsx` (layout only, if the full-width filter variant is shared)
- `services/identity/src/controllers/userController.ts` / `services/identity/src/services/userService.ts` (verify existing filters; add enrollment summary/bulk support only if needed)

### 2.1 Empty grade-level filter and non-working enrollment filters

**Verified causes:**

1. `src/features/enrollment/Page.tsx:184-185` does `Array.isArray(gradesRaw)` / `Array.isArray(subjectsRaw)` even though both APIs return `{ items, total }`. The grade filter therefore only shows “All grade levels,” and classroom subject/grade enrichment loses its catalog labels.
2. `src/features/enrollment/api.ts:4-14` accepts only `page` and `pageSize`. The backend student endpoint already supports `q`, `gradeLevelId`, and `feeCohort` (`services/identity/src/services/userService.ts:47-110`), but Enrollment never sends them.
3. `src/features/enrollment/Page.tsx:84` creates `studentFilters`, but `fetchData` (`:162-208`) depends only on page/pageSize. Typing a search or changing the grade filter does not refetch.
4. `selectedGradeFilter` (`:92`) is never set by the filter bar; the visible grade filter writes `studentFilters.values.gradeLevelId`, while `filteredStudents` (`:236-247`) reads `selectedGradeFilter`. The grade filter is effectively dead.
5. The filter bar gives primary enum fields `w-full sm:w-40 lg:w-44` (`src/components/ui/ListFilterBar.tsx:190-203`). Inside Enrollment’s `lg:col-span-5` card, the grade selector is unnecessarily narrow on small laptops.

**Fix:**

- Normalize grade levels/subjects with `unwrapItems`; build `availableGrades` from that catalog plus current-page students.
- Extend `enrollmentApi.fetchStudents(schoolId, { q, gradeLevelId, page, pageSize })` and send the values used by the filter bar.
- Make `fetchData` depend on `studentFilters.committedQ`, `studentFilters.values.gradeLevelId`, page, and pageSize. Reset `bulkIds` when the query changes.
- Remove `selectedGradeFilter` or wire it to the same source as the filter bar; never keep two competing grade filters.
- Make search/grade filtering server-side so it applies to the whole school, not just the loaded page. Keep a local fast-path only if it does not double-filter or hide server results.
- Give the filter bar a full-width layout in this card on narrow screens: search on its own row, grade select at least `w-full sm:w-56`, and counts/actions below.
- Add a visible empty state if the catalog is genuinely empty: “No grade levels configured — add them in Academics.”

**Acceptance:** Grade options appear, searching or changing grade updates the list and total across all pages, and class/subject labels enrich correctly.

### 2.2 Enrollment list only knows the current page

**Verified cause:** `fetchStudents` is paged (`Page.tsx:167`), but `classroomsByStudent`, `pendingAssignmentCount`, and `assignedCount` are computed only from current-page students and memberships (`Page.tsx:120-137, 229-255`). A student can appear “unassigned” because their membership list is not loaded, because the roster request failed silently, or because the student is on another page.

**Fix:**

- Load roster memberships only for the classrooms needed by the current result set, and do not silently convert failed membership requests into “no memberships.”
- Prefer a server-side enrollment summary endpoint so counts and the “Unassigned only” filter are accurate without client-side N+1 calls.
- If a summary endpoint is not feasible in this iteration, label all counts as “on this page” and remove/disable the global-sounding “Unassigned” filter rather than presenting misleading totals.
- Do not solve this by requesting an arbitrarily large student page; the school may exceed any hard-coded size and the filter must still work across pages.

**Acceptance:** Counts and “Unassigned” are not falsely affected by page boundaries, or are explicitly labeled as page-scoped until the server summary exists.

### 2.3 Assign selected / bulk assign

**Current state:** Code for bulk selection already exists (`bulkIds`, `bulkModalOpen`, `handleAssign`, `confirmBulkAssign` at `src/features/enrollment/Page.tsx:88-93, 263-348, 769-826`), but the workflow is effectively undiscoverable and fragile:

- The checkbox is a bare `w-4 h-4` control (`Page.tsx:496-503`) with no select-all, no visible “N selected” summary near the list, and no explanation that checking a box is the first step.
- The primary “Assign selected” button (`:384-392`) is disabled unless a classroom is already active and at least one student is checked. Disabled with no nearby explanation looks broken.
- Bulk assignment is tied to `activeClassroom`, which auto-selects only after data loads (`:199-202`). Users who open the page before that, or whose preferred classroom is not first, cannot tell what will happen.
- `handleAssign` catches every per-student failure without the reason (`:275-280`), then reports only “Assigned X, failed Y.”
- The bulk modal uses hard-coded English (`:771-796`) and finds names from the current page only.
- Membership loads silently convert failures to empty arrays (`:144-155`), so students can appear unassigned when the roster request failed.

**Fix:**

- Keep the multi-select UX; make it obvious rather than replacing it.
- Add a real selection toolbar above the list: “Select all visible,” “Clear,” and a persistent “N selected” count.
- Use at least a 20px checkbox with a 44px clickable label row/area; clicking the row should not fight with the separate “open student” action. Use an explicit “Select” checkbox column or a dedicated selection mode.
- Disable “Assign selected” only with inline helper text explaining the missing prerequisite (“Select a classroom first” / “Select at least one student”).
- Preselect the first classroom visibly and show its name in the action area so the destination is always clear.
- Add a bulk endpoint:
  - `POST /api/classrooms/:classroomId/members/bulk`
  - body `{ userIds: string[], role: "STUDENT" }`
  - server validates classroom access, school membership, duplicates, and returns per-user results.
- Client should show per-user failure details (name/email + reason), not only “Assigned X, failed Y”.
- Disable the action while a request is in flight and prevent double-submit.
- Optimistically update the roster only after a successful response, or refetch memberships after success.
- Preserve selected IDs when a bulk operation partially fails so the user can retry.
- Ensure `addMember` endpoint permissions allow the relevant staff roles (the classroom route restricts roster management to `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`, `REGISTRAR`; confirm Enrollment is not exposed to a role that cannot call it).

**Acceptance:** Selecting multiple students and assigning them updates the roster reliably and reports partial failures.

### 2.4 Enrollment page redesign

**Goals:** clearer placement workflow, less duplicated information, better mobile behavior.

**Proposed layout:**

1. Header: title, short helper text, primary “Enroll new student,” secondary “Assign selected.”
2. Compact stats row: `Unassigned`, `Placed`, `Classrooms`; label them as current-page counts until the server-side summary exists.
3. Two-column desktop layout:
   - Left rail: full-width search and grade filter, then student list with visible selection controls.
   - Right panel: classroom picker, selected-classroom roster, and pending students.
4. On mobile: stack the classroom selector above the roster; keep “Assign selected” reachable without covering the last row or the filter controls.
5. Replace one-off modal markup with the shared `FeatureModalShell` and consistent field/card tokens where possible.
6. Make checkbox targets 44px minimum, add “select all visible,” and show selected count persistently.
7. Avoid hard-coded English strings in new or touched UI; move to i18n catalog.

**Acceptance:** Placement is understandable in one pass, works on 375px width, and no action depends on hidden state.

### 2.5 “Enroll new student” modal redesign

**File:** `src/features/students/components/EnrollStudentModal.tsx`

**Fixes:**

- Use `FeatureModalShell` or match its chrome for header/body/footer and mobile height (`max-h-[90dvh]`).
- Add sections: Student details, Grade/Class placement, Guardian contact, Account credentials.
- Make grade select load from normalized grade-level data and show a loading state instead of an empty `<select>`.
- Show inline validation, not only toast errors.
- Add explicit draft persistence:
  - `newStudent` currently survives close/reopen only because parent state is not reset on the X/cancel path (`students/Page.tsx:188-193` resets only via `closeEnrollModal`, used after success). That behavior is accidental and has no restore/discard UX.
  - Save form to `sessionStorage` keyed by `user.id + school.id + "enroll-student-draft"` with a debounce.
  - Restore on reopen and show a small “Draft restored” notice with “Start blank.”
  - Clear after successful enrollment or explicit discard.
- Add a “Discard draft” action with confirmation.
- Ensure the one-time password panel is readable, copyable, and does not disappear on accidental close before the user confirms they have saved the credentials.

**Acceptance:** Closing/reopening or refreshing preserves entered data deliberately; grade options are populated; success clears the draft.

---

## 3. Public Apply

### Files

- `src/pages/PublicApply.tsx`
- `src/pages/PublicApplyStatus.tsx`
- `src/pages/PublicApplyBackground.tsx`
- `src/lib/publicPortalLayout.ts`
- `src/features/admission-form/AdmissionFormWizard.tsx`
- `src/features/admission-form/AdmissionApplicationFields.tsx`
- `src/features/admission-form/schema.ts`

### 3.1 Responsive layout and stepper

**Problems:**

- Stepper is a single horizontal row with connected pills (`AdmissionFormWizard.tsx:206-263`). Long labels truncate or overflow on small screens.
- Outer page uses `PUBLIC_PORTAL_COLUMN` (`max-w-4xl`) but the header, returning-applicant toggle, helper text, and form are visual siblings with inconsistent widths and gaps.
- Form content padding can feel cramped on mobile and too wide on desktop.

**Fix:**

- Define a consistent page container inside `PUBLIC_PORTAL_PAGE`: header, status link, toggle, and form all aligned to the same width.
- Stepper:
  - Mobile: show compact numbered circles plus separators; show only the active step label beneath the row.
  - `sm+`: show full labels.
  - Allow horizontal scrolling only if unavoidable; do not truncate critical labels.
  - Keep progress bar under the stepper.
- Add `min-w-0`/`overflow-hidden` guards around flex children.
- Ensure the submit/footer actions remain visible and full-width on mobile.
- Add focus management when changing steps (already partially present; keep the `data-wizard-summary` focus behavior).

**Acceptance:** No horizontal overflow at 320–375px; all step labels remain understandable; progress is visible.

### 3.2 “Grade Applying For” empty/wrong options

**Verified root cause:** The public page fetches `/api/public/schools/:slug/grade-levels` (`src/pages/PublicApply.tsx:75-78`). That route calls the Academic internal grade-levels endpoint, which returns `{ items, total, page, pageSize }` (`academicController.ts:374-377`), and then runs `Array.isArray(grades) ? grades : []` (`schoolController.ts:315-317`). The result is always `[]`. This is not a UI-only bug.

**Fix:**

- Fix the internal/public server boundary per Section 1 so the route returns real grades.
- Normalize public apply grade data to `GradeLevel[]` on the client as defense in depth.
- Track loading and failure separately from “genuinely empty”: `gradesLoading`, `gradesError`, `grades`.
- Add select states:
  - “Loading grades…” while fetching.
  - “Could not load grades — retry” with a retry action on failure.
  - “No grades available for this school” only when the request succeeded with zero items.
- Preserve the existing semantics:
  - New applicant: required grade selection.
  - Returning applicant: optional, “Keep current grade.”
- Disable the select during submit; never submit a stale/empty grade name silently.

**Acceptance:** New and returning applicants see configured grades, or a deliberate, accurate explanation when none exist or loading failed.

### 3.3 Home address should be a textarea

**File:** `src/features/admission-form/AdmissionApplicationFields.tsx:189-199`

**Fix:**

- Replace the single-line `input` with a `textarea` with 2–3 rows.
- Keep `aria-invalid`, error mapping, and max-length guidance.
- Ensure long addresses wrap and are readable in review step.

**Acceptance:** Multi-line address entry works and is shown correctly in review.

### 3.4 School logo border

**File:** `src/pages/PublicApply.tsx:330-341`

**Problem:** The logo uses `rounded-2xl ring-2 ring-white/20`, which reads as an unwanted border/outline against the photo background.

**Fix:**

- Remove the white ring or replace it with a subtle neutral shadow only.
- Keep a consistent size (`w-12 h-12`), `object-cover`, and rounded corners.
- Fallback icon should match the same dimensions and visual weight.
- If the logo has an opaque white background, use `object-contain` with padding instead of cropping.

**Acceptance:** Logo appears cleanly without a visible boxed border.

### 3.5 Public Apply/Status consistency

- `PublicApplyStatus.tsx:247-259` uses a fixed `max-w-md` card while Public Apply uses `PUBLIC_PORTAL_COLUMN` (`max-w-4xl`). Keep status intentionally narrower, but align background treatment, radius, typography, and language-selector placement.
- Ensure status badges and receipt-like cards wrap safely on mobile; the language selector must not overlap content at 320px.
- Keep school identity (logo/name) and back links aligned across both screens.

---

## 4. Admissions / Registrar Hub

### Files

- `src/features/registrar/Page.tsx`
- `src/features/registrar/hooks/useRegistrarQuery.ts`
- `src/features/registrar/components/RegistrarChrome.tsx`
- `src/features/registrar/components/EditStudentModal.tsx`
- `src/features/registrar/components/ManualAdmissionTab.tsx`
- `src/features/registrar/components/AdmissionsTab.tsx`
- `src/features/registrar/components/ClassroomsTab.tsx`
- `src/features/promotion-statement/components/PromotionStatementReport.tsx`

### 4.1 Grade Assignment is empty

**Root cause:** `src/features/registrar/hooks/useRegistrarQuery.ts:26` returns `gradeLevels: Array.isArray(gradeLevels) ? gradeLevels : []`. The API returns a paged object.

**Fix:**

- `gradeLevels: unwrapItems(gradeLevels)`.
- Also unwrap subjects if used anywhere in the hub.
- Guard `gradeLevels.map` in `EditStudentModal.tsx:121` so it cannot crash if data is still loading.
- Show a loading placeholder in the select and disable it while grades load.

**Acceptance:** “Grade Assignment” lists all configured grades.

### 4.2 Edit Student modal redesign

**File:** `src/features/registrar/components/EditStudentModal.tsx`

**Problems:**

- Uses a raw fixed overlay and custom indigo header instead of the shared modal shell.
- Dense two-column grid on mobile can compress fields.
- Mixed ad-hoc styles (`bg-slate-50`, uppercase labels) versus app design system.

**Fix:**

- Convert to `FeatureModalShell` with title, subtitle, close action, scrollable body, sticky footer.
- Use sections:
  - Identity (photo, name, DOB, gender)
  - Contact (email, phone, address)
  - Academic placement (grade assignment, status)
- Use shared `fieldInput`/`fieldLabel` or design tokens.
- Single column below `md`, two columns at `md+`.
- Add validation and disabled-submit behavior.
- Preserve current save flow and invalidate queries after success.

**Acceptance:** Modal matches rest of app, grade select works, and form is usable on mobile.

### 4.3 Direct admission card visibility

**File:** `src/features/registrar/components/ManualAdmissionTab.tsx:132-141`

**Problem:** The gradient is too faint (`from-indigo-50/70 via-white to-slate-100/80`) and the card can blend into the page.

**Fix:**

- Strengthen the gradient and border: e.g. `from-indigo-100/80 via-white to-sky-50`, `border-indigo-200`, stronger ring/shadow.
- Keep decorative blobs but lower their opacity if they reduce text contrast.
- Increase contrast of the header icon and title.
- Ensure the card remains within the same max width as other tabs.

**Acceptance:** Direct admission is clearly the primary action in its tab.

### 4.4 Registrar tabs design

**File:** `src/features/registrar/components/RegistrarChrome.tsx`

**Verified problem:** `RegistrarChrome.tsx:59-80` renders six pill buttons in a `flex flex-wrap` row. At laptop widths this becomes multiple uneven rows; on mobile the labels compete with the title and the queue badge. There is no tab strip or overflow affordance.

**Goals:**

- Make the hub feel like one coherent Admissions workspace.
- Tabs: `overview`, `directory`, `admissions`, `classrooms`, `promotion_statement`, `new_admission`.
- Responsive tab behavior:
  - Desktop: a real tab strip with a consistent active underline/pill and stable height.
  - Mobile: horizontally scrollable tab strip with edge fades or a compact select; never squeeze labels to illegibility.
- Put the page title on its own row and the tab strip below it; do not compete for the same horizontal space.
- Add section eyebrows and consistent spacing.
- Ensure `Direct admission` is visually distinct when active but not competing with the primary card.

**Acceptance:** Navigation is obvious at all widths, all six tabs remain reachable, and the active state is unmistakable.

### 4.5 Admissions / Classrooms / Promotion tabs

- Bring `AdmissionsTab.tsx`, `ClassroomsTab.tsx`, and `PromotionStatementReport.tsx` onto the same card, table, empty-state, and filter patterns used elsewhere.
- Add empty states and loading skeletons.
- Ensure tables horizontally scroll on mobile rather than overflow the page.
- Keep promotion report readable/printable.

---

## 5. Class Schedule — Timetable Assign Class Modal

### File

- `src/features/class-schedule/Page.tsx:724-819+`

### Problem

The assign-class modal already uses `FeatureModalShell`, but its content and footer are cramped, especially with the availability checks and free-period badges. Padding/margins are inconsistent with other academic modals.

### Fix

- Standardize the body wrapper as `space-y-5 sm:space-y-6` and avoid nested cards that double-pad.
- Footer:
  - Mobile: stack `Cancel`/`Apply` full-width.
  - Desktop: keep left utility actions (`Clear`, `Suggest best`) and right primary actions.
  - Add gap and safe-area padding.
- Teacher selector: shared input styling, loading/empty state, and avoid layout shift when availability loads.
- Free-period chips: wrap cleanly, use consistent `rounded-lg` and text size.
- Ensure modal body scrolls while header/footer remain fixed.

**Acceptance:** Modal has comfortable spacing at 320px and desktop, and actions never overflow.

---

## 6. Teacher Curriculum / Syllabus

### Files

- `src/features/curriculum/Page.tsx`
- `src/features/curriculum/hooks/useCurriculumQuery.ts`
- `src/features/curriculum/hooks/usePageActions.ts`
- `src/features/curriculum/teacherTeachingScope.ts`
- `src/features/curriculum/components/SyllabusBuilderModal.tsx`
- `src/features/academics-shared/syllabusCalendar.ts`

### 6.1 “Submit Syllabus Plan” appears to do nothing

**Confirmed gating:**

- `usePageActions.ts:147-163` blocks teachers when `!scope.hasTeachingRooms` or when the chosen subject/grade pair is not taught.
- `usePageActions.ts:165` blocks everyone when `!hasActiveCalendar(calendar) || !syllabusForm.calendarPatternId`.

**Verified causes:**

1. Teacher scope pairs come from the classroom list and are filtered by `buildTeachingScope` (`teacherTeachingScope.ts:64-83`). The classroom endpoint itself is **not** paginated (`classroomController.ts:51-94`), so `hasTeachingRooms` should be reliable when classrooms load. The earlier suspicion that classroom pagination hides rooms is not correct.
2. The real selector risk is paged subject/grade data: `useCurriculumQuery.ts:27-29` requests subjects, grade levels, and classrooms with the **table’s** current `page`/`pageSize`; classrooms ignore the params, but subjects/grade levels do not. A teacher whose subject/grade is not on the current page gets an incomplete or empty scope selector even though the classroom pairs exist.
3. The form can have an active calendar but no `calendarPatternId` if defaults were not applied or the form was restored incorrectly. `applyCalendarToSyllabusForm` does set it when `hasActiveCalendar` is true (`syllabusCalendar.ts:112-140`), so verify every open/edit path applies this.
4. Teaching-scope pairs can be valid while the visible subject/grade options come from paged catalogs, making a valid pair look unselectable.
5. Errors are shown as a toast, which can be missed if the modal remains open; the submit button can also look enabled while the handler silently rejects.

**Fix:**

1. Keep scope pairs derived from the complete classroom list, but fetch selector catalogs independently of the table page:
   - Fetch all grade levels/subjects for selectors (`pageSize=100` plus pagination loop, or a dedicated selector endpoint).
   - Cache by `schoolId` (and `userId` for teacher-specific scope).
   - Keep table pagination only for syllabi.
2. Build `TeachingScope` from the complete room list and the complete catalogs.
3. Before allowing submit, show inline blocking explanations in the modal:
   - “You need at least one assigned subject classroom.”
   - “Select a subject/grade pair you teach.”
   - “Your school needs an active academic calendar.”
   - “This calendar is not linked to the syllabus form — reopen the builder.”
4. When the modal opens:
   - Always start from `createTeacherSyllabusFormDefaults(pairs, calendar)` / `createAdminSyllabusFormDefaults(...)`.
   - If editing, use `syllabusFormFromPlan(plan, calendar)`.
   - Assert or repair `calendarPatternId` when the calendar is active.
5. Disable submit and explain why instead of silently rejecting.
6. After submit:
   - Close modal only on success.
   - Refetch/invalidate curriculum.
   - Show success toast.
7. Add regression tests for:
   - A teacher whose subject/grade is beyond the first catalog page can still select the pair and submit.
   - A teacher with a valid classroom pair but missing `calendarPatternId` sees an inline explanation.
   - Submitting with weights totaling less than or more than 100 keeps the modal open with the exact reason.

**Acceptance:** A teacher with at least one assigned subject room and an active calendar can submit a syllabus plan; if blocked, the reason is visible in the modal.

### 6.2 Curriculum list pagination vs selector data

- Keep table pagination for syllabi.
- Do not use the table’s page/pageSize for grade-level or subject selector data. Fetch all selector data separately.
- Classroom scope can keep using the current full classroom response; its endpoint ignores paging. Do not add a fake classroom page size as a fix.
- Migrate envelope handling to `unwrapItems`.

### 6.3 Calendar picker / weights UX

- If no calendar is active, show a clear call-to-action for admins and a non-actionable explanation for teachers.
- When weights come from the calendar, visually mark them as read-only/derived and explain the source.
- If manual weights do not total 100, show a running total and disable submit with an inline message.

---

## 7. Lesson Plans

### Files

- `src/features/lesson-plans/Page.tsx`
- `src/features/lesson-plans/api.ts`
- `src/features/lesson-plans/utils.ts`
- `src/features/lesson-plans/components/LessonPlanBuilder.tsx`

### 7.1 Empty dropdowns

**Root cause:** `Page.tsx:169-170` fetches subjects/grade levels and then uses `Array.isArray(...)`. Both endpoints return paged envelopes.

**Fix:**

- Normalize in `lessonPlansApi.fetchSubjects` / `fetchGradeLevels`, or at the `load()` call site with `unwrapItems`.
- Fetch all grade levels/subjects for selectors, not just the first page.
- Ensure classrooms remain raw arrays.
- Add loading states to selects.

**Acceptance:** Subject and grade selects populate; builder can save.

### 7.2 Draft persistence across close/reopen

**Current state:** The builder is controlled by parent `form`/`setForm` (`Page.tsx:141`, `LessonPlanBuilder.tsx:31-60`). Closing the builder (`Page.tsx:697`) drops nothing from memory, but a page refresh or navigation loses the draft.

**Fix:**

- Add a draft store keyed by `schoolId + userId + lessonDate?` (or a single active draft).
- Persist on `form` change with debounce (e.g. 300–500 ms) into `localStorage`.
- Restore when opening “New lesson plan.” Do not overwrite an existing plan being edited.
- Clear draft after successful save/submit, or when user explicitly discards.
- Show a small “Draft restored” notice with “Start blank” action.
- Version the draft schema so old shapes are ignored safely.

**Acceptance:** Closing/reopening or refreshing the page preserves unsaved lesson-plan content; successful save clears it.

### 7.3 Lesson Plan Builder UX

- Use consistent modal/sheet chrome and section spacing.
- Group fields into logical sections: Basics, Objectives, Activities, Materials, Assessment, Differentiation.
- Keep add/remove object/activity rows accessible and stable.
- Make the footer sticky and actions full-width on mobile.
- Validate subject/date before disabling save; show why save is disabled.
- Ensure date/period controls remain in sync with the selected academic calendar period.
- Ensure PDF actions remain available and don’t crowd mobile headers.

---

## 8. Gradebook — “Set up the academic calendar first” for Teachers

### File

- `src/features/gradebook/Page.tsx:982-997`

### Problem

The empty state is shown whenever `calendar` is falsy (`Page.tsx:753`). For teachers, this reads as an instruction to perform an admin-only setup action. The CTA also navigates to the academic calendar settings route, which teachers may not be allowed to use.

### Fix

- Differentiate by role:
  - `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`: keep setup message and CTA.
  - `TEACHER`: show “No active academic calendar — ask your school admin to publish it.” Hide/disable the settings CTA.
  - Other viewers: neutral “Grades are not available until the academic calendar is published.”
- Also handle the case where the calendar exists but has no periods/exam components:
  - Admin: “Calendar has no grading periods — finish setup.”
  - Teacher: “Ask your admin to add grading periods.”
- Ensure `calendar` failure is not silently swallowed: `loadHub` currently catches calendar errors and sets `null` (`Page.tsx:113`). Distinguish “not configured” from “failed to load” and show retry for transient errors.
- Ensure only the teacher’s own classrooms are shown if scope filtering fails; do not fall back to all rooms for teachers (`Page.tsx:123-135`). That fallback can leak other classes into the selector.

**Acceptance:** Teachers never see an actionable admin setup instruction; admins still get the setup path.

---

## 9. Teacher Attendance

### Files

- `src/features/attendance/Page.tsx`
- `src/features/attendance/components/RollCallSheet.tsx`
- `src/features/attendance/components/RollCallModal.tsx`
- `src/features/attendance/hooks/useAttendanceQuery.ts`
- `src/features/attendance/api.ts`
- `services/lifecycle/src/controllers/attendanceController.ts`
- `services/lifecycle/src/services/attendanceService.ts`
- `services/lifecycle/src/routes/attendanceRoutes.ts`

### 9.1 Roll-call status buttons “broken”

**Likely causes:**

- Status buttons are small icon+label pills inside a wrapping flex row (`RollCallSheet.tsx:488-513`). On narrow widths or with many students, they can be clipped, crowded, or misinterpreted.
- `onClick` stops propagation and updates `attendanceData`, which should work, but there is no explicit visual focus/keyboard affordance on mouse click beyond the active state.
- Bulk actions (`All present`, `All absent`, `All late`) exist, but are visually separate from per-student controls.
- `Save` can remain disabled if the roster load failed, without a clear roster error state.

**Fix:**

- Redesign per-student status control:
  - Desktop: segmented control with four options.
  - Mobile: compact segmented control with short labels/icons and a larger tap target (min 44px).
  - Ensure the active state has high contrast and `aria-pressed`.
- Make the row layout `min-w-0` safe; the controls should wrap below the student identity, not overflow.
- Add explicit “saving” and “saved” feedback.
- On roster fetch failure, show a retry button and an actionable error instead of an empty roster.
- Verify `attendanceApi.createAttendance` payload and permissions; surface server errors exactly.
- Check existing-session detection uses school timezone consistently (it does via `toSchoolYmd`, but `fetchAttendanceDetails` errors are silently swallowed at `Page.tsx:276`). Log/show a mild warning if an existing roll call cannot be loaded.
- Add tests/manual QA for all four statuses, bulk actions, notes, retake/update flow, and keyboard shortcuts.

**Acceptance:** Tapping any status reliably updates the row, tallies, and saved payload on desktop and mobile.

### 9.2 Teacher filter/detail scope

**Verified problems:**

- `attendanceService.getAttendanceBySchool` (`services/lifecycle/src/services/attendanceService.ts:72-111`) applies only `schoolId` to the database query. Teachers receive every school session; the client hides some only if `hubClassrooms` happens to load.
- The client filter fallback is unsafe: if `hubClassrooms` fails, `myClassroomIds` becomes `null` and `filteredRecords` stops filtering (`src/features/attendance/Page.tsx:372-386`).
- The list is paginated before role filtering (`attendanceService.ts:80-107`): `total` counts all school sessions, and student/parent pages can be empty even when their records exist on later pages.
- Student/parent sessions keep whole-class `presentCount`/`absentCount` after records are filtered to the viewer (`attendanceService.ts:92-107`). `getAttendanceDetails` has the same stale-count bug (`:289-313`). This is the “wrong information” students/parents see.
- Teacher stats are school-wide: `getAttendanceStats` (`attendanceService.ts:376+`) does not scope by the teacher’s classes.
- Filter options are derived only from loaded records (`Page.tsx:58-66`), so classes with no attendance yet never appear.
- Student-level attendance detail is only a per-session modal (`RollCallModal.tsx`), not a student history view.

**Fix:**

- Move scope and filters to the server before pagination:
  - Add query params: `classroomId`, `from`, `to`, `status`, `studentId` (staff only), `page`, `pageSize`.
  - For `TEACHER`, constrain sessions to their own/taught classrooms (at minimum `teacherId`; preferably classroom IDs from the classroom service for co-teaching).
  - For `STUDENT`, constrain records to `viewer.id` and compute `total` from matching sessions.
  - For `PARENT`, constrain records to linked children and compute `total` from matching sessions.
- Recompute `presentCount`/`absentCount` from the **viewer-filtered records** for student/parent responses in both list and details.
- If a teacher’s classroom scope cannot be loaded, return an explicit error/empty state; never fall back to all school records on the client.
- Build filter options from the scoped classroom list, not only from loaded attendance.
- Add a student history view:
  - Open from a student row in `RollCallModal` or from a “Student history” search.
  - Show date range, class, status, notes, and attendance rate.
  - Support filtering by class, status, and date range.
- Ensure parents/students cannot enumerate other students by changing IDs or query params.
- Add pagination/“load more” for large histories.

**Acceptance:** Teachers see only their classes, filters work before any attendance exists, student/parent counts and totals reflect only their own records, and student attendance history is reachable and scoped correctly.

### 9.3 Attendance stats and pagination

- Teachers should see stats for their scope, not campus-wide stats.
- The client currently calls `fetchAttendance(schoolId)` without pagination and the default server page size is 50. Add paging/load-more or a bounded date range so older sessions are not silently unreachable.
- Rename or annotate any “overall” rate so users know whether it is campus-wide, class-scoped, or self-scoped.

---

## 10. Classroom Banner Upload — “NetworkError when attempting to fetch resource”

### Files

- `src/features/classroom-workspace/RoomPage.tsx:449-481`
- `src/features/classroom-workspace/api.ts:100-131`
- `src/features/classroom-workspace/bannerUtils.tsx`
- `services/classroom/src/controllers/classroomController.ts:750-771`
- `services/classroom/src/lib/storage.ts`

### Problem

The banner flow does:

1. `POST /api/classrooms/:id/attachments/presign`
2. Browser `PUT` to the returned presigned URL.
3. `PATCH /api/classrooms/:id` with `bannerImageUrl`.

A `NetworkError` at step 2 usually means the browser cannot reach the S3/MinIO public endpoint. Common causes:

- `S3_PUBLIC_URL` points to an internal host (`minio:9000`) instead of a browser-reachable URL.
- MinIO/S3 CORS does not allow the app origin or `PUT` with `Content-Type`.
- TLS/certificate mismatch or mixed-content (HTTPS app → HTTP storage).
- Bucket policy does not allow public reads, so even a successful upload produces a broken image.

### Fix

1. Infrastructure:
   - Ensure `S3_PUBLIC_URL` is the browser-reachable base URL.
   - Configure bucket CORS:
     - Allowed origins: app origins.
     - Allowed methods: `PUT`, `GET`, `HEAD`.
     - Allowed headers: `Content-Type`.
     - Expose `ETag` if needed.
   - For local development, document the correct values and verify with a minimal upload.
2. Server:
   - Sign using the public endpoint (already attempted in `getBrowserSigningClient`).
   - Validate that the presign response is not `local://` when storage is expected; return a clear configuration error instead of a URL that cannot be uploaded.
3. Client:
   - Wrap the `fetch(PUT)` in a try/catch and translate network failures into a user-facing message:
     “Image storage is unreachable. Ask your admin to check file storage configuration.”
   - Validate file type/size before presigning.
   - Show upload progress and disable Save while uploading.
   - If the upload succeeds but the image fails to load, show a preview error and allow retry/remove.
4. Add a health/diagnostic endpoint or admin UI indicator for storage configuration if feasible.

**Acceptance:** Banner image upload succeeds in local and deployed environments; when misconfigured, the user sees a precise actionable error instead of a raw `NetworkError`.

---

## 11. Design and UX Standards for All Touched Screens

Apply these consistently rather than fixing each screen in isolation:

- **Containers:** one max-width and horizontal padding per page; do not mix `max-w-lg`, `max-w-4xl`, and full-width content without reason.
- **Modals:** use `FeatureModalShell` for academic/registrar modals; sticky header/footer, scrollable body, `max-h-[90dvh]`.
- **Spacing:** page sections `space-y-6`/`space-y-8`; card padding `p-5 sm:p-6`; form field gaps `space-y-1.5`/`space-y-2`.
- **Mobile:**
  - Test at 320px, 375px, 768px, and 1280px.
  - No horizontal overflow.
  - Tap targets at least 44px.
  - Tables scroll horizontally or switch to cards.
  - Sticky actions must not cover form fields.
- **Selects:**
  - Always have loading, empty, and error states.
  - Never render an empty dropdown with no explanation.
- **Feedback:**
  - Inline validation near fields.
  - Toasts for async outcomes, but not as the only explanation for blocked actions.
  - Disabled buttons must have visible reasons nearby.
- **Accessibility:**
  - Labels tied to controls.
  - `aria-invalid`, `aria-describedby`, `aria-pressed` where relevant.
  - Keyboard support for wizard, roll call, and bulk selection.
  - Sufficient contrast for gradient backgrounds.

---

## 12. Testing / Verification Checklist

### Automated

- Unit tests for `unwrapItems` / `unwrapTotal`.
- Unit tests for `buildTeachingScope` with complete classrooms and paged vs complete subject/grade catalogs.
- Unit tests for `hasActiveCalendar` + `applyCalendarToSyllabusForm` ensuring `calendarPatternId` is populated.
- Component tests:
  - Enrollment grade filter populates from paged response and changing the filter sends the server query.
  - Enrollment search sends `q` and resets to page 1.
  - Registrar Edit Student grade select populates.
  - Lesson Plan builder subject/grade selects populate.
  - Public Apply grade select shows grades from an internal `{ items }` response.
  - Gradebook empty state differs by role.
- API tests:
  - Internal/public grade-level routes return a usable array.
  - Bulk classroom member add returns per-user results.
  - Attendance create/update validates statuses and permissions.
  - Attendance list applies teacher/student/parent scope before pagination and recomputes viewer counts.
  - Presign returns browser-reachable URL or a clear configuration error.

### Manual

1. **Enrollment**
   - Grade filter shows all grades and filters across every page.
   - Search finds a student who is not on page 1.
   - Select one student and assign.
   - Select multiple students and bulk assign.
   - Verify empty-selection and no-classroom states explain why the action is disabled.
   - Partial failure scenario reports which students failed.
   - Refresh and confirm roster/counts.
2. **Public Apply**
   - 320px, 375px, 768px widths.
   - Complete new and returning applicant flows.
   - Grade select shows options from the fixed public endpoint; simulate a failed grade request and confirm retry.
   - Address wraps as a textarea and reviews correctly.
   - Logo has no unwanted border.
3. **Admissions**
   - Edit student grade assignment shows grades and saves.
   - Direct admission card is visually prominent.
   - Every registrar tab is reachable and usable on mobile.
4. **Class Schedule**
   - Open assign-class modal in a full timetable.
   - Check padding, footer layout, and teacher availability rendering.
5. **Curriculum / Syllabus**
   - Teacher with one room: submit syllabus plan successfully.
   - Teacher whose subject/grade is beyond the first catalog page still sees the pair and can submit.
   - No active calendar or missing `calendarPatternId`: blocking reason is visible in the modal.
   - Manual weights ≠ 100: submit disabled with explanation.
6. **Lesson Plans**
   - Subject/grade selects populate.
   - Fill builder, close, reopen: content remains.
   - Refresh page: draft restores.
   - Save/submit clears draft.
7. **Gradebook**
   - Teacher with no calendar sees non-actionable admin message.
   - Admin sees setup CTA.
   - Teacher classroom selector shows only their rooms.
8. **Attendance**
   - Mark present/late/absent/excused per student on mobile and desktop.
   - Bulk mark present/absent/late.
   - Add notes, save, reopen and update existing roll call.
   - Teacher sees only their classroom records even when classroom loading fails.
   - Student/parent sees only their own records, counts match their own record, and pagination totals are correct.
   - Filter by classroom/date/status before any attendance exists for that classroom.
9. **Classroom Banner**
   - Upload image, save, reload page; banner persists.
   - Misconfigured storage shows a helpful error.
   - Clear image and solid-color-only flows work.

---

## 13. Suggested Delivery Order

1. **Unblock data everywhere:** `unwrapItems` migration + internal/public grade endpoint fix + selectors + regression tests.
2. **High-impact teacher blockers:** curriculum scope/calendar gating, gradebook role messaging, lesson-plan select loading.
3. **Attendance reliability:** per-student status controls, roster error states, server-side role scoping/count fixes, stats scope.
4. **Admissions and public apply UX:** Edit Student modal, grade assignment, public stepper/layout, address, logo.
5. **Enrollment filters + bulk/redesign + draft persistence.**
6. **Class schedule modal spacing and registrar tab polish.**
7. **Banner storage configuration + client error handling.**
8. **Cross-screen design pass and manual QA at required breakpoints.**
