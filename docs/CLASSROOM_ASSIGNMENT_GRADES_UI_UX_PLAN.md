# Classroom Assignments & Grades — UI/UX, Review, and Implementation Plan

> **Status:** Draft — 2026-11-27
> **Scope:** Teacher assignment posting/review, student response/turn-in, classroom assignment marks, and teacher formal gradebook entry/view/edit formatting.
> **Owning code:** `src/features/classroom-workspace/`, `src/features/gradebook/`, `services/classroom/`, `services/academic/`, `services/gateway/`.
> **Companions:** `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/TEACHER_GRADEBOOK_PLAN.md`, `docs/gradebook-architecture.md`, `FRONTEND_GUIDELINES.md`, `IMPLEMENTATION_STATUS.md`.

---

## 0. Executive summary

The classroom workspace already supports the core lifecycle — teacher posts an assignment, student turns in work, teacher grades/returns/reopens, and marks are available in the Marks tab — but the experience is concentrated in one large `RoomPage.tsx`, uses raw status strings, lacks assignment editing/filtering, and has inconsistent save/return semantics. Several backend invariants are also weak: duplicate submissions are possible, submitted work remains student-editable, reopened resubmissions can keep stale grades, role lists disagree between gateway/controller/UI, and entitlement gating can be bypassed by an arbitrary header.

This plan keeps the two grading systems separate:

| System | Purpose | Owner |
| :--- | :--- | :--- |
| **Classroom assignment marks** | Homework/classwork submissions in a classroom room | `services/classroom` |
| **Formal Gradebook** | Weighted assessments/exams, draft/submit/admin review | `services/academic` |

Do **not** merge them. The classroom Marks tab should keep linking to `/gradebook` as a shortcut.

Recommended outcome:

1. A clear, role-aware assignment lifecycle with explicit **Save draft → Turn in → Grade draft → Return → Reopen/edit**.
2. A cleaner teacher/student UI built from small components with consistent status badges, due/points context, validation, empty/loading/error states, and i18n.
3. Hardened backend invariants: authorization, tenant scoping, one submission per student/assignment, score bounds, atomic batch writes, and predictable grade edit permissions.
4. A formatted teacher Gradebook with explicit **enter**, **view entered**, **submit**, **review status**, and **edit/reopen** paths.

---

## 1. Product intent and hard rules

### Teacher

1. Create and edit announcements, materials, and assignments from Classwork.
2. Assignment composer captures title, instructions, topic, due date, max points, and attachments with inline validation.
3. Open an assignment and review submissions in a roster-style panel: not turned in, turned in, graded draft, returned, reopened.
4. Save a grade as a draft, return it to the student later, and reopen/edit a returned grade when needed.
5. See classroom assignment marks in a readable matrix and open any cell to edit.
6. Use `/gradebook` for formal assessment grades; classroom marks link there but do not write to it.

### Student

1. See assignments in Stream and Classwork with due date, points, and status.
2. Save work as a draft, then explicitly turn it in.
3. After turn-in, work is read-only unless the teacher reopens it.
4. See score and feedback only after the teacher returns the work.
5. See classroom-only marks in the Marks tab; formal report-card grades stay in My Grades.

### Parent

1. Read-only child view via `?studentId=` only when parent-child linkage and classroom membership are verified.
2. No compose, comment, grade, return, or reopen actions.

### Hard rules

1. Students never enter class codes for normal enrollment; membership is authoritative.
2. Students may create **announcements only**; they must never be able to create/update `ASSIGNMENT` posts, points, due dates, or topics through a post endpoint.
3. Staff grade actions must derive the student from `Submission.studentId`, not from a client-supplied student ID on grade writes.
4. A student gets one submission row per assignment.
5. Raw enum values (`SUBMITTED`, `RETURNED`, `REOPENED`, `DRAFT`, `ACCEPTED`) must not be rendered directly.
6. All new UI follows the **Executive Slate** style in `FRONTEND_GUIDELINES.md`: `rounded-[32px]` shells, `rounded-2xl` children, soft surface shadow, restrained indigo/emerald accents, `motion/react` transitions, and i18n keys for every visible string.
7. Preserve the separation between classroom marks and `GradeEntry` formal grades.

---

## 2. Current implementation map

### Frontend

| Concern | Files |
| :--- | :--- |
| Routes | `src/App.tsx:58-64`, `src/App.tsx:361-383` |
| Thin pages | `src/pages/School/ClassroomList.tsx:1`, `src/pages/School/ClassroomFeed.tsx:1` |
| Classroom list | `src/features/classroom-workspace/Page.tsx` |
| Room, stream, classwork, marks, detail drawer | `src/features/classroom-workspace/RoomPage.tsx` |
| API wrappers | `src/features/classroom-workspace/api.ts:5-77`, upload flow `api.ts:108-175` |
| Types | `src/features/classroom-workspace/types.ts:48-109` |
| Topic/group logic | `src/features/classroom-workspace/RoomPage.tsx:312-347` |
| Compose modal | `src/features/classroom-workspace/RoomPage.tsx:1113-1259` |
| Student turn-in panel | `src/features/classroom-workspace/RoomPage.tsx:1532-1589` |
| Teacher review panel | `src/features/classroom-workspace/RoomPage.tsx:1615-1706` |
| Marks tab | `src/features/classroom-workspace/RoomPage.tsx:1023-1111` |
| Realtime refresh | `src/features/classroom-workspace/useClassroomSocket.ts`, `RoomPage.tsx:243-288` |
| Translation source | `src/i18n/catalogs/en.ts:3084-3254`; generated locales under `src/i18n/catalogs/locales/` |

### Backend

| Concern | Files |
| :--- | :--- |
| Gateway routing | `services/gateway/src/server.ts:88-103`, `:229-245`, `:288-294` |
| Classroom routes | `services/classroom/src/routes/classroomRoutes.ts:117-216`, `:261-283` |
| Classroom controller | `services/classroom/src/controllers/classroomController.ts:439-663`, `:821-880` |
| Classroom service | `services/classroom/src/services/classroomService.ts:1048-1152`, `:1169-1356`, `:1556-1573` |
| Status helpers | `services/classroom/src/lib/submissionStatus.ts:2-19` |
| Membership helpers | `services/classroom/src/lib/membershipPermissions.ts:1-46` |
| Classroom schema | `services/classroom/prisma/schema.prisma:74-149` |
| Storage signing | `services/classroom/src/lib/storage.ts:84-149`, `storageMime.ts:3-49` |
| Academic grade routes | `services/academic/src/routes/examRoutes.ts:24-53`, `:137-255` |
| Academic grade service | `services/academic/src/services/examService.ts:176-408`, `:917-1176`, `:1291-1455`, `:1722-1960` |
| Academic schema | `services/academic/prisma/schema.prisma:450-563` |
| Grade access | `services/academic/src/lib/gradeAccess.ts:15-80` |

### Current lifecycle

```text
Teacher posts ASSIGNMENT (ClassroomPost)
  -> GET /api/classrooms/:id/posts
  -> Student opens post detail
  -> POST /api/posts/:id/submissions  (or PATCH existing)
  -> Teacher opens post detail -> grade + feedback -> POST /api/submissions/:id/return
  -> Student sees returned grade/feedback
  -> Teacher may POST /api/submissions/:id/reopen
```

---

## 3. Review findings

Severity: **P0** = fix before UI work ships; **P1** = fix in same release; **P2** = follow-up hardening.

### 3.1 Classroom assignment/submission

| # | Severity | Finding | Evidence | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| C1 | P0 | Entitlement gate can be bypassed with any `x-internal-token` header value. | `services/classroom/shared/src/middleware/entitlements.ts:116-117` | Validate the header against `INTERNAL_SERVICE_TOKEN`; do not treat presence as authorization. |
| C2 | P0 | Students can escalate an announcement to an assignment or change points/due date via `PATCH /api/posts/:id`. | Route allows students `classroomRoutes.ts:157-163`; controller lets author update fields `classroomController.ts:494-508`. | Restrict student post writes to `type=ANNOUNCEMENT`, title/body only; never allow `type`, `maxPoints`, `dueAt`, `topicId` changes by students. |
| C3 | P0 | Duplicate submissions are possible; no unique `(postId, studentId)` constraint. | `findFirst` then `create` in `classroomService.ts:1181-1218`; schema `schema.prisma:121-139`. | Add unique constraint, dedupe existing rows first, use `upsert`/transaction. |
| C4 | P0 | Submitted work remains editable; `SUBMITTED` is treated as editable. | `submissionStatus.ts:10-13`, `classroomService.ts:1240-1259`. | Introduce explicit `DRAFT`, `SUBMITTED`, `RETURNED`, `REOPENED` semantics; only `DRAFT`/`REOPENED` editable. |
| C5 | P1 | Reopened resubmissions can retain stale grade/feedback; update path does not clear them or emit socket event. | `reopenSubmission` `classroomService.ts:1286-1295`; `updateSubmissionAsStudent` `:1240-1259`; frontend uses PATCH `RoomPage.tsx:433-443`. | Clear grade/feedback on true resubmission, add `gradedAt`, emit `submission.updated` consistently. |
| C6 | P1 | Teacher “return” path uses `feedback ?? existing`, so explicit null cannot clear feedback; grade uses unbounded `parseFloat`. | `classroomService.ts:1269-1276`. | Use explicit payload fields; validate finite number within `0..maxPoints`; allow clearing. |
| C7 | P1 | Role lists disagree. Frontend allows `REGISTRAR`, `VPA`, `SUPER_ADMIN` to compose; backend route excludes them; return/reopen routes allow `REGISTRAR` but controller `isStaff` may exclude it. | `RoomPage.tsx:47-55`, `:185`; `classroomRoutes.ts:125-131`, `:192`, `:200`; `classroomController.ts:598-625`. | Create one shared role matrix and use it in UI, routes, and controllers. |
| C8 | P1 | Attachment upload after post creation can leave a post with missing attachments on failure; retry can duplicate. | `RoomPage.tsx:370-392`. | Create attachments transactionally or make compose retry-safe with a client request ID; show partial-failure recovery. |
| C9 | P1 | Assignment/submission file inputs omit type/size validation; dropped files bypass `accept`. | `RoomPage.tsx:1238`, `:1568`; `FileDropzone.tsx:41-45`, `:108`. | Add shared validation against `storageMime.ts`; enforce size/type in UI and presign service. |
| C10 | P1 | Realtime refresh clobbers unsaved student text and teacher grade drafts. | `applyPostDetail` `RoomPage.tsx:243-254`; socket handler `:266-285`. | Preserve dirty drafts on background refresh; merge only untouched fields; use resource version/updatedAt. |
| C11 | P1 | No due-date enforcement or late indicator; `maxPoints` is an unvalidated string. | `schema.prisma:82-85`; `RoomPage.tsx:374-375`; `classroomService.ts:1169-1225`. | Validate on compose; display `Due`, `Due soon`, `Overdue`, `Late`; optionally mark late at submit time without blocking. |
| C12 | P2 | Raw status/type strings rendered in UI. | `RoomPage.tsx:808`, `:920`, `:1055`, `:1100`, `:1537`, `:1595`, `:1641`. | Add `StatusBadge` and i18n keys, including `RETURNED` and `REOPENED`. |
| C13 | P2 | Marks payload includes `dueAt` but the UI never shows it. | `types.ts:94-109`; marks UI `RoomPage.tsx:1043-1108`. | Show due date, points, status pill, and grade in marks cards/table. |
| C14 | P2 | Assignment edit/delete APIs exist but no UI and no client `updatePost`. | `classroomRoutes.ts:157-171`; `classroomService.ts:1134-1152`; `api.ts` has `deletePost` only. | Add `updatePost` client and edit/delete actions with confirmation. |
| C15 | P2 | Dead/unused legacy components remain. | `src/components/JoinClassroomModal.tsx`, `src/components/CreateClassroomModal.tsx` unused. | Remove or route through active feature components after UI refactor. |
| C16 | P2 | Error handlers flatten service errors to 400/500 and lose status codes. | `classroomController.ts:467-469` and similar. | Introduce an error mapper that preserves `err.status`. |

### 3.2 Formal Gradebook / academic grades

| # | Severity | Finding | Evidence | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| G1 | P0 | Student grades endpoint lacks tenant/resource scoping; staff can query arbitrary `studentId`. | `examRoutes.ts:24-29`; `examController.ts:298-313`; `examService.ts:1722-1765`. | Add `requireTenant`/resource loader; verify staff sees only students in their school and teaching scope. |
| G2 | P0 | Teacher grade read endpoints accept arbitrary `classroomId` without verifying ownership/tenant. | `examService.ts:917-975`, `:1291-1407`, `:1410-1455`. | Use `assertTeacherClassAccess` for reads as well as writes. |
| G3 | P1 | Grade release can expose unreviewed `SUBMITTED` grades. | `examService.ts:1722-1730`, `:1922-1953`. | Student visibility should require `ACCEPTED` or an explicit policy flag; do not rely on `isGradesReleased` alone for unreviewed entries. |
| G4 | P1 | Single grade status is an arbitrary string; bulk scores lack finite/min/max checks. | `validation/schemas.ts:5-47`. | Use `z.enum([...])`, `z.number().finite().min(0).max(maxScore)` (or service-side max resolution). |
| G5 | P1 | Grade-entry lookup omits component/structure column in some paths; Postgres null uniqueness can allow duplicates and response maps can overwrite entries. | `examService.ts:1005-1007`, `:937-940`, `:1429-1432`; `schema.prisma:491`. | Use full composite lookup with explicit null-safe predicates; key response maps by all scope fields. |
| G6 | P1 | Batch creation is not atomic; partial failures leave submitted grades without batches. | `examService.ts:131-147`, `:1209-1245`, `:1683-1717`. | Wrap grade writes + batch linkage in one transaction; keep orphan recovery only as compensation. |
| G7 | P1 | Grade edit grants do not verify `teacherId` belongs to the school or has a teacher role. | `gradeEditGrantService.ts:42-87`. | Validate identity/school/role before granting. |
| G8 | P2 | Local draft key omits `subjectId`; same class/exam/component across subjects can collide. | `gradebookLocalStore.ts:23-33`; `gradebookBackgroundSync.ts:28-45`. | Include `subjectId` and bump storage version with migration. |
| G9 | P2 | Review UI labels raw points as percent. | `features/grade-review/types.ts:50-55`; points model `assessmentStructure.ts:245-255`. | Render `8 / 10` or `80%` only after conversion. |
| G10 | P2 | Default structures are inconsistent; `maxScore: 0` makes raw points act like percent. | `gradebookConfig.ts:28-35`; `assessmentStructure.ts:35-69`; `docs/gradebook-architecture.md:11-31`. | Choose one canonical default and document conversion; add a config validation warning. |
| G11 | P2 | Hardcoded English and incomplete locale leaves in gradebook/review UI. | `GradebookScoreInput.tsx:49`, `GradebookModeSwitch.tsx:22`, `locales/fr.ts:3484-3545`, `ReviewerQueue.tsx:208-302`. | Route through i18n and add the new keys to all catalogs. |

---

## 4. Target UX specification

### 4.1 Teacher classroom room

```text
Room banner: class name, subject, member count, primary action
Tabs: Stream | Classwork | People | Marks

Classwork:
  [New assignment] [New material] [New topic]
  Filters: All | Due soon | Overdue | Turned in | Returned
  Cards grouped by topic:
    Assignment title | status pill | due date | points | submissions count | Open
```

**Assignment composer**

- Use `FeatureModalShell`.
- Sections: **Details** (type, title, instructions), **Due & points** (due date/time, max points), **Organization** (topic or create topic), **Attachments**.
- Inline validation: title required, body required for assignment, points integer/decimal `>= 0`, due date must parse; no silent `new Date(...).toISOString()` throw.
- Edit action reuses the same composer with `PATCH /api/posts/:id`.
- Delete requires confirmation and tight authorization.

**Assignment detail / review drawer**

- Header: title, type pill, due date, points, topic, author/updated time.
- Student work panel with:
  - status pill: `Assigned`, `Draft`, `Turned in`, `Returned`, `Reopened`;
  - response text, attachments, submitted time, late badge;
  - teacher grade input `grade / maxPoints` and feedback;
  - actions: `Save grade draft`, `Save & return`, `Reopen`.
- Roster summary: counts for not turned in / turned in / graded draft / returned / reopened.
- Filter and search by student.
- Keyboard-friendly: Enter moves to next student; unsaved changes guard on close.

### 4.2 Student classroom room

- Stream/Classwork cards show a status pill and due context.
- Assignment detail:
  - `Assigned` or `Reopened`: editable response + attachments; buttons `Save draft` and `Turn in`.
  - `Draft`: editable; show last saved time.
  - `Turned in`: read-only; show submitted time; message that teacher has not returned it.
  - `Returned`: read-only; show score, feedback, submitted/returned times.
- `Turn in` requires confirmation that no further edits are possible until reopened.
- Late work is marked `Late` but accepted.

### 4.3 Marks tab

**Teacher matrix**

```text
Marks — Assignment scores (classroom only)          [Open Gradebook]

Student | Algebra HW1 (due Sep 4, 10 pts) | Quiz 1 (due Sep 9, 20 pts)
------- | -------------------------------- | --------------------------
Ada     | 9 / 10  Returned                 | 18 / 20 Draft
Ben     | Turned in                        | —
```

- Sticky student column and sticky header, horizontal scroll hint on small screens.
- Cells show grade draft/returned state, not raw enum.
- Click a cell opens a compact grade editor with `Save draft` / `Save & return`.
- Summary row: class average per assignment; ignore ungraded cells.
- Mobile: card list per student with assignment rows.

**Student/parent list**

- Assignment title, due date, points, status pill, score when returned, `Open` action.
- No raw status strings, no hardcoded `Open` English.

### 4.4 Formal Gradebook formatting

Teacher flow remains separate:

```text
Gradebook hub: Subject classroom → Period → Assessment
Entry sheet: columns from assessment structure
  - Enter points earned per column
  - Draft autosave (local + server)
  - Total / letter preview
  - Submit for review (explicit)
  - View entered grades (read-only when SUBMITTED/ACCEPTED/locked)
  - Edit path: admin reject, edit grant, or reopen accepted grade
```

Required UI clarity:

- Status strip: `Draft`, `Submitted`, `Accepted`, `Rejected`, `Locked`, `Offline`, `Pending sync`.
- Every score cell shows `earned / max`, never bare `8%` for raw points.
- Existing grades are visually distinct from empty cells.
- Read-only cells explain why: `Submitted for review`, `Accepted`, `Locked`, or `Outside edit window`.
- `Edit grades` action is available only when policy allows; otherwise show how to request an edit grant.
- Keep autosave, background sync, keyboard navigation, and responsive scroll hints.

---

## 5. Proposed data and API changes

### 5.1 Submission lifecycle

Add an explicit student draft stage and a teacher grade draft stage.

```text
ASSIGNED (derived: no submission row)
  -> DRAFT        student saves work
  -> SUBMITTED    student turns in; student edits locked
  -> RETURNED     teacher saved grade/feedback and returned
  -> REOPENED     teacher asks for another attempt
  -> SUBMITTED    student resubmits (old grade/feedback cleared or archived)
```

Backend changes:

1. `SUBMISSION_STATUS` becomes `DRAFT | SUBMITTED | RETURNED | REOPENED`.
2. `canStudentEditSubmission` allows `DRAFT` and `REOPENED` only.
3. Add unique constraint `@@unique([postId, studentId])` to `Submission`; dedupe before applying.
4. Add `gradedAt DateTime?` and `gradedBy String?` to distinguish saved draft grades from returned grades.
5. Add `lateAt` or derive late from `dueAt` and `submittedAt` at read time.
6. Add optional `SubmissionGradeHistory` if audit of teacher edits is required; otherwise rely on app logs initially.

### 5.2 Classroom endpoints

| Method | Path | Purpose | Authorization |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/posts/:id/submissions` | Create or replace student draft response | Authenticated student member; derives `studentId` |
| `POST` | `/api/submissions/:id/turn-in` | Lock and mark `SUBMITTED` | Owner student only |
| `PATCH` | `/api/submissions/:id` | Save student draft text/attachments | Owner student, `DRAFT`/`REOPENED` only |
| `PATCH` | `/api/submissions/:id/grade` | Save teacher grade/feedback draft | Classroom staff, no status change |
| `POST` | `/api/submissions/:id/return` | Save grade/feedback and set `RETURNED` | Classroom staff |
| `POST` | `/api/submissions/:id/reopen` | Set `REOPENED`; keep teacher draft visible to staff only | Classroom staff |
| `PATCH` | `/api/posts/:id` | Edit announcement/material/assignment | Author/staff rules; students limited to announcement body |
| `GET` | `/api/classrooms/:id/grades` | Marks matrix with due/points/status/grade state | Staff all; student/parent scoped |

Backward compatibility: keep existing submission routes as aliases during rollout where practical, but change status semantics behind them only after tests and UI are updated together.

### 5.3 Shared role matrix

Create a single source of truth, for example `services/classroom/src/lib/classroomRoles.ts` plus a frontend mirror in `tests/`:

| Action | Roles |
| :--- | :--- |
| View classroom | Staff member or student member; parent only with verified child link |
| Create assignment/material | Classroom staff (`TEACHER`, `CO_TEACHER`, `TEACHER_ASSISTANT`) and school admins |
| Create announcement | Above plus students (body/title only) |
| Edit post | Staff; student only own announcement title/body |
| Manage People | `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`, `REGISTRAR` (not teacher) |
| Grade/return/reopen | Classroom staff and school admins |
| Comment | Members except parents |

Align `App.tsx` route roles, `STAFF_ROLES` in `RoomPage.tsx:47-55`, `classroomRoutes.ts`, and controller `isStaff` checks.

### 5.4 Validation and error handling

- Use schema validation for posts and submissions; reject unknown `type` values and invalid statuses.
- Validate `maxPoints` as finite `>= 0`; return grade must be finite `0..maxPoints` when max points exist.
- Add request size/type checks for attachments using `storageMime.ts`.
- Preserve service error status codes with a shared `HttpError`/mapper.
- Never accept `studentId`, `schoolId`, `classroomId`, or `authorId` from a normal client body for identity-sensitive writes; derive from auth/resource.

---

## 6. Frontend component architecture

Split `src/features/classroom-workspace/RoomPage.tsx` without changing routes:

```text
src/features/classroom-workspace/
  components/
    ClassroomRoomHeader.tsx
    ClassroomTabs.tsx
    PostCard.tsx
    AssignmentComposerModal.tsx
    TopicCreateModal.tsx
    ClassworkList.tsx
    AssignmentDetailDrawer.tsx
    StudentWorkPanel.tsx
    TeacherSubmissionsPanel.tsx
    SubmissionGradeEditor.tsx
    MarksTab.tsx
    StatusBadge.tsx
    AttachmentLinks.tsx
    BannerEditorModal.tsx
    AddMemberModal.tsx
  hooks/
    useClassroomRoom.ts
    useAssignmentDetail.ts
    useClassroomMarks.ts
  lib/
    submissionPresentation.ts
    classroomRoles.ts
  api.ts
  types.ts
  RoomPage.tsx  (thin orchestrator)
```

Guidelines:

- Keep `RoomPage.tsx` responsible for tab state, dialog state, and data orchestration only.
- Extract status/date/points formatting into `submissionPresentation.ts` and test it.
- Reuse `FeatureModalShell`, `FileDropzone`, `TableScroll`/`MatrixScrollHint`, `PageShell`, `UserAvatar`.
- Add i18n keys under `pages.classroomWorkspace.*` and `common.submissionStatus.*`; add to `en.ts`, all generated locale files, and hand-curated overrides where needed.
- Do not add raw English fallback strings in JSX; use `defaultValue` only in tests or transitional code.

---

## 7. Phased implementation

### Phase 0 — Guardrails and test harness

**Deliverables**

- Add failing tests for the bugs in section 3 before changing behavior.
- Snapshot current endpoints and role matrix in `tests/classroom-workspace.test.ts`.
- Add source tests for no raw status strings, no `prompt()` in assignment flow, and no hardcoded `Open`/`Assignment` labels.
- Add E2E spec skeleton for teacher-post → student-turn-in → teacher-grade-return under `e2e/`.

**Files**

- `tests/classroom-workspace.test.ts`
- `tests/detail-drawers.test.ts`
- `tests/gradebook-local.test.ts`
- `tests/gradebook-background-sync.test.ts`
- `e2e/personas/smoke.spec.ts` or new `e2e/classroom-assignment.spec.ts`

**Exit criteria**

- Tests fail against current code for C1-C7 and G1-G3 where testable.
- No production behavior changed yet.

### Phase 1 — Backend correctness and security (P0/P1)

**Deliverables**

1. Validate entitlement header; remove unconditional skip.
2. Enforce role matrix in gateway, routes, and controllers.
3. Prevent student post escalation and field tampering.
4. Add unique `(postId, studentId)` with dedupe migration.
5. Implement `DRAFT`/`SUBMITTED`/`RETURNED`/`REOPENED` semantics; add `gradedAt`/`gradedBy`.
6. Add `turn-in` and teacher `grade` endpoints; make return/reopen explicit.
7. Clear or archive stale grade/feedback on student resubmission.
8. Validate grade bounds and attachment URLs/types/sizes.
9. Preserve error status codes.
10. Fix academic tenant/read scoping and batch atomicity.

**Files**

- `services/classroom/prisma/schema.prisma`
- `services/classroom/src/lib/submissionStatus.ts`
- `services/classroom/src/lib/classroomRoles.ts` (new)
- `services/classroom/src/middleware/resourceLoaders.ts`
- `services/classroom/src/routes/classroomRoutes.ts`
- `services/classroom/src/controllers/classroomController.ts`
- `services/classroom/src/services/classroomService.ts`
- `services/classroom/src/lib/storage.ts`, `storageMime.ts`
- `services/classroom/shared/src/middleware/entitlements.ts`
- `services/academic/src/routes/examRoutes.ts`
- `services/academic/src/controllers/examController.ts`
- `services/academic/src/services/examService.ts`
- `services/academic/src/validation/schemas.ts`
- `services/academic/src/lib/gradeAccess.ts`

**Exit criteria**

- No duplicate submissions under concurrent requests.
- Students cannot edit after turn-in unless reopened.
- Students cannot create/update assignments or change post type/points/due date.
- Staff cannot read grades outside school/teaching scope.
- `npm run test:classroom` and `npm run test:parent-grades` pass.

### Phase 2 — Assignment UI/UX refactor

**Deliverables**

1. Extract components listed in section 6; make `RoomPage.tsx` thin.
2. Rebuild assignment composer with validation and edit/delete actions.
3. Add classwork filters and due-state grouping.
4. Add `StatusBadge`; remove all raw status/type rendering.
5. Rebuild student work panel: save draft, turn in confirmation, locked/read-only states, late badge, returned score/feedback.
6. Rebuild teacher review panel: roster summary, filters, grade editor, return/reopen, unsaved guard.
7. Fix realtime draft preservation.
8. Add i18n keys for all new copy in every locale.

**Files**

- `src/features/classroom-workspace/RoomPage.tsx`
- new component/hook/lib files from section 6
- `src/features/classroom-workspace/api.ts`
- `src/features/classroom-workspace/types.ts`
- `src/i18n/catalogs/en.ts`
- `src/i18n/catalogs/locales/*.ts`
- `src/i18n/catalogs/translations.ts`

**Exit criteria**

- Teacher can create, edit, and delete an assignment.
- Student can save a draft and turn in; after turn-in the response is read-only.
- Teacher can return and reopen with score/feedback.
- No raw enum values or hardcoded English in assignment UI.
- `npm run lint`, `npm run test:ux-wiring`, `npm run test:detail-drawers`, `npm run test:i18n` pass.

### Phase 3 — Classroom marks and grade editing

**Deliverables**

1. Replace Marks tab with formatted teacher matrix and student/parent cards.
2. Show title, due date, max points, status, grade state (`Draft`/`Returned`), and class average.
3. Click a teacher cell to open `SubmissionGradeEditor`.
4. Support `Save draft` and `Save & return` from both drawer and marks cell.
5. Add mobile card layout and scroll hint.
6. Keep `Open Gradebook` link; do not write classroom grades into formal `GradeEntry`.

**Files**

- `src/features/classroom-workspace/components/MarksTab.tsx`
- `src/features/classroom-workspace/components/SubmissionGradeEditor.tsx`
- `src/features/classroom-workspace/components/StatusBadge.tsx`
- `src/features/classroom-workspace/lib/submissionPresentation.ts`
- `src/features/classroom-workspace/types.ts`
- `tests/classroom-workspace.test.ts`
- `tests/responsive-ui.test.ts`

**Exit criteria**

- Teacher can enter a grade, leave it as draft, return later, edit it, and see both draft and returned states distinctly.
- Student sees grade/feedback only after return.
- Marks grid is readable on desktop and mobile.
- `npm run test:responsive-ui` passes.

### Phase 4 — Formal Gradebook formatting and edit paths

**Deliverables**

1. Add clear hub → assessment → sheet hierarchy labels and status strip.
2. Show `earned / max` in every score cell; fix review percent rendering.
3. Add `View entered grades` and `Edit grades` affordances with status-aware explanations.
4. Make edit/reopen paths explicit: rejected, edit grant, or admin reopen.
5. Fix local draft key to include `subjectId` with migration.
6. Unify default structure and score conversion documentation.
7. Route hardcoded gradebook/review strings through i18n.

**Files**

- `src/features/gradebook/Page.tsx`
- `src/features/gradebook/components/GradebookAssessmentSheet.tsx`
- `src/features/gradebook/components/GradebookScoreInput.tsx`
- `src/features/gradebook/components/GradebookToolbar.tsx`
- `src/features/gradebook/components/PendingSyncBanner.tsx`
- `src/features/gradebook/lib/gradebookLocalStore.ts`
- `src/features/gradebook/lib/gradebookBackgroundSync.ts`
- `src/lib/assessmentStructure.ts`, `src/lib/gradebookConfig.ts`, `src/lib/gradeLegend.ts`
- `src/features/grade-review/types.ts`, `components/ReviewerQueue.tsx`
- `src/i18n/catalogs/en.ts`, `src/i18n/catalogs/locales/*.ts`

**Exit criteria**

- Teacher can enter, autosave, view, submit, and later edit grades only when allowed.
- Read-only grades explain why they are read-only.
- No `8%` display for raw points.
- Existing local drafts are not lost after key migration.
- `npm run test:gradebook`, `npm run test:grade-edit-grant`, `npm run test:parent-grades` pass.

### Phase 5 — E2E, docs, and rollout

**Deliverables**

- E2E: teacher creates assignment; student saves draft/turns in; teacher grades/returns; student sees returned grade; teacher reopens/edits.
- E2E: parent read-only cannot mutate.
- Update `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/TEACHER_GRADEBOOK_PLAN.md`, `IMPLEMENTATION_STATUS.md`.
- Run full verification and deploy through existing GitHub Actions.

**Exit criteria**

- All verification commands in section 8 pass.
- Rollback plan documented: feature flag or static UI fallback if backend migration fails.

---

## 8. Verification plan

Run from repo root with `& "C:\Program Files\nodejs\npm.cmd" ...` if PowerShell script execution blocks plain `npm`.

```powershell
npm run lint
npm run test:unit
npm run test:classroom
npm run test:gradebook
npm run test:grade-edit-grant
npm run test:parent-grades
npm run test:ux-wiring
npm run test:detail-drawers
npm run test:responsive-ui
npm run test:i18n
npm run i18n:check
npm run build
E2E_ENABLED=1 npm run test:e2e
```

Notes:

- `npm run i18n:check` currently has pre-existing critical-path leftovers; capture the baseline before changes and ensure no new leftovers are introduced.
- `npm run test:ui-drift` has known pre-existing failures; do not use it as a release gate until the baseline is addressed.
- Add service-level tests for classroom service directly; today most relevant tests are source-mirror tests, not HTTP integration tests.

---

## 9. Acceptance criteria

1. **Teacher posting:** Assignment can be created and edited with title, body, topic, due date, max points, and attachments; invalid input shows inline errors.
2. **Student response:** Student can save a draft, attach allowed files, and turn in with confirmation; after turn-in, edits are blocked.
3. **Teacher review:** Teacher sees every student with status, work, and grade controls; can save a grade draft, return it, and reopen/edit later.
4. **Marks:** Teacher matrix and student cards show due date, points, status, grade state, and average; no raw enums or English hardcoded labels.
5. **Formal Gradebook:** Teacher can enter/view/edit grades with clear status and lock explanations; scores display as earned/max; submitted grades are not editable without an allowed path.
6. **Security:** Role matrix is consistent; entitlement header is validated; no cross-tenant reads; no duplicate submissions; grade bounds enforced.
7. **Realtime:** Background socket refresh does not overwrite unsaved drafts.
8. **i18n:** All new visible copy has keys in English and all locale catalogs.
9. **Tests:** Section 8 verification passes or has documented baseline-only failures.
10. **Docs:** `IMPLEMENTATION_STATUS.md` and companion plans updated after release.

---

## 10. Risks and rollout

| Risk | Mitigation |
| :--- | :--- |
| Status migration changes existing rows | Backfill `SUBMITTED` rows carefully; decide whether old `SUBMITTED` means turned-in or editable; run dedupe before unique constraint. |
| Students losing draft text | Keep `DRAFT` autosave separate from turn-in; preserve dirty UI state on socket refresh. |
| Teacher accidentally returning incomplete grades | Confirm on `Save & return`; warn on empty score/feedback; allow reopen/edit. |
| Classroom marks confused with formal grades | Keep separate titles, links, and banners: `Assignment marks (classroom only)` vs `Formal Gradebook`. |
| Local gradebook draft key migration | Version key `gb:v2`, read and migrate `gb:v1` once, never overwrite newer draft blindly. |
| Role tightening breaks admins | Use one role matrix and verify with role-based smoke tests before deploy. |
| Large `RoomPage.tsx` refactor regression | Extract one component at a time behind the same props; run source and E2E tests after each slice. |

Recommended rollout:

1. Backend hardening with backward-compatible aliases.
2. UI refactor behind existing routes.
3. New status semantics enabled after frontend uses draft/turn-in explicitly.
4. Formal Gradebook formatting as a separate release slice.

---

## 11. Open questions / decisions needed

| Question | Recommended default |
| :--- | :--- |
| Should `SUBMITTED` lock student edits? | **Yes.** Add `DRAFT` for in-progress work; only `DRAFT`/`REOPENED` are editable. |
| Should draft grades be visible to students? | **No.** Only staff sees grade drafts; students see score/feedback after `RETURNED`. |
| Should late submissions be blocked? | **No.** Mark `Late`; teachers can decide. |
| Should resubmission clear old grade/feedback? | **Yes** for new attempts; optionally archive in `SubmissionGradeHistory` if audit is required. |
| Should max points be enforced server-side? | **Yes** when `maxPoints` exists; allow ungraded/null and finite numbers only. |
| Should classroom marks appear in report cards? | **No.** Only formal Gradebook `ACCEPTED` grades feed report cards. |
| Should `REGISTRAR`/`VPA` compose assignments? | **No** unless they are classroom staff; keep People management separate. |
