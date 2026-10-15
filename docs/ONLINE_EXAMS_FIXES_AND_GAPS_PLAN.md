# Online Exams — Fixes & Missing-Feature Implementation Plan

> **Status:** Proposal (2026-10-11) — audit complete, implementation not started
> **Scope:** (A) Fix correctness / robustness issues found in the online-exam stack, and (B) close the gaps between the shipped feature set and the 10 requested requirements (setup + paper deadline, per-student papers, live proctoring, exam analytics, gradebook auto-posting, live screen monitoring).
> **Companion:** `docs/ONLINE_EXAMS_PLAN.md`, `docs/EXAM_PAPER_APPROVAL_PLAN.md`, `docs/ACADEMICS_ASSESSMENT_GAPS_PLAN.md`, `docs/GRADEBOOK_ARCHITECTURE.md`
> **Owners:** Academic service (backend) · Frontend SPA · Product (priority of Phases / scope of live monitoring)
> **Superseded (in part) by:** `docs/EXAM_SYSTEM_OVERHAUL_PLAN.md` (2026-10-15) — re-scopes and supersedes Phases 3–5 below against what has shipped since (proctor console + manual gradebook push). Fixes in Parts A0/A1 remain valid.

---

## 0. Requirements audit (what exists today)

| # | Requirement | Verdict | Evidence |
| :- | :--- | :--- | :--- |
| 1 | Admin sets exam settings, start date, paper-submission deadline; ONLINE / HYBRID (essay offline) / OFFLINE | **PARTIAL** | Exam model has `startDate`/`endDate`/`gradeSubmissionDeadline` but **no paper deadline**; `deliveryMode` exists but is **not exposed in the admin create/edit form**; HYBRID is a **per-student leg** split, not "essay offline" |
| 2 | Educators author MCQ / fill-blank / T/F / Essay; save draft or submit for review | **IMPLEMENTED** | `examPaperService.getOrCreateDraft/updateDraft/submit`; `PaperPage.tsx`; `PUT /api/exams/:id/paper` + `/questions` |
| 3 | Admin approve / reject with a note; educator redo + resubmit | **IMPLEMENTED** | `examPaperService.review` (`APPROVE` / `RETURN` with **mandatory feedback**); `ReviewPage.tsx`; re-editable `RETURNED` |
| 4 | Student sees their specific paper per schedule; reads & accepts instructions; begins | **PARTIAL** | Schedule-window + `APPROVED` gate + HYBRID leg exist; **no class/enrollment scoping** (every student sees every ONLINE/HYBRID exam); **no explicit "I accept" acknowledgement** |
| 5 | Fullscreen kiosk, max violations, warn + return, auto-submit at limit | **IMPLEMENTED** | `TakePage.tsx` listeners + `reportViolation`; `shouldAutoSubmitForViolations`; server auto-submit (`onlineExamService.ts`) |
| 6 | Student sees result automatically on completion | **IMPLEMENTED** | `finalizeAttempt` + `getResults`; `ResultsPage.tsx`; gated by `showResultsImmediately` |
| 7 | Teacher tracks progress live, sees final grade + each answer; proctor views screens live; live monitoring + cheat notifications | **NOT IMPLEMENTED** | No live channel; `GET /api/exams/:id/attempts` has **no UI** and returns only stats; `getResults` **blocks `IN_PROGRESS`**; violations are self-reported; no `PROCTOR` role |
| 8 | Staff view overall exam report: violators, pass/fail rate | **PARTIAL** | `process-results` + `ResultsModal` give average + pass rate; **no violators list, no failing-rate, no online-exam analytics** |
| 9 | Online exam grades auto-posted to teacher gradebook | **NOT IMPLEMENTED** | No `ExamAttempt`→`GradeEntry` link; `finalizeAttempt` never creates a `GradeEntry`; gradebook entry is manual |
| 10 | Proctors / staff view student screens live | **NOT IMPLEMENTED** | No `getDisplayMedia`/screencast; no real-time exam channel (Socket.IO is classroom-only); no proctor role |

**Bottom line:** the core author→approve→sit→score loop (2,3,5,6) is real. The gaps are **setup/deadline (1)**, **audience scoping + explicit consent (4)**, and the **entire proctoring / analytics / gradebook-automation tier (7,8,9,10)**.

---

## Part A — Current issues to fix

### A0. Preview feature (just added) defects

| ID | Issue | Fix |
| :- | :--- | :--- |
| A0.1 | `PreviewPage` has **no exit control during the exam phase** (only Submit) | Add an **Exit preview** link in the sticky header that navigates to `backTo` (with a confirm if answers exist) |
| A0.2 | Preview "exam" payload **includes answer keys before submit** (`getExamPreview` calls `getQuestions(id, true)`) | Return keys only from the **score** endpoint; strip `correctAnswer`/`isCorrect` in `getExamPreview` (use `includeKeys=false`) and reveal them from `buildPreviewResult` |
| A0.3 | No countdown in preview even when `duration` set; intro shows "N min" | Show a **non-enforcing** timer badge labelled "Preview — timer not enforced" (or hide minutes in preview) |
| A0.4 | Result phase keeps `select-none`, blocking copy | Drop `select-none` on the result phase |
| A0.5 | Unanswered MCQ renders as "Pending" (`isCorrect == null`) | Surface the server `pending` flag from `buildPreviewResult` per question and use it in the UI (also fix `ResultsPage.tsx` for parity) |
| A0.6 | `getExamPreview` loads the exam twice (`loadExamOrThrow` then `getQuestions`) | Reuse the loaded exam |

### A1. Correctness / data-integrity issues

| ID | Issue | Evidence | Fix |
| :- | :--- | :--- | :--- |
| A1.1 | **Statuses are free-form strings** — no DB constraint | `Exam.paperStatus`, `Exam.deliveryMode`, `ExamPaperPackage.status` | Introduce Prisma `enum`s (`PaperStatus`, `DeliveryMode`, `PackageStatus`); backfill + migrate |
| A1.2 | **No revision history** — resubmit edits the same package in place, `revision` never increments | `examPaperService.updateDraft` flips `RETURNED`→`DRAFT`; `submit` reuses row | Either create a **new package row per submit** (increment `revision`) or add an `ExamPaperRevision` history table capturing feedback + author + timestamp |
| A1.3 | **Two `Exam` models** may drift | root `prisma/schema.prisma` vs `services/academic/prisma/schema.prisma` | Confirm root copy is legacy/unused; document or delete to prevent divergence |
| A1.4 | `questionsMin` relies on i18next `count` with no `_one`/`_other` keys | `en.ts` `onlineExams.questionsMin` | Add plural forms or rename the placeholder (`{{n}}`) to avoid plural lookup |
| A1.5 | Preview sample routes have `authenticate`+`requireRoles` but **no `requireTenant`** | `onlineExamRoutes.ts` static routes | Confirm entitlement gate still applies; add `requireTenant` for consistency if the gate relies on tenant context |
| A1.6 | Violations are **client-reported** (trust the browser) | `TakePage.tsx` POSTs violations | Acceptable for browser lockdown; document and consider server-side heuristics (focus events cannot be trusted). No code fix required — set expectations |

### A2. Process / repo issues

| ID | Issue | Fix |
| :- | :--- | :--- |
| A2.1 | `src/i18n/catalogs/locales/*` is **untracked** and the project root is **not a git repo** (repo root is `C:\Users\IPREP`) | Initialize a repo at the project root (or ensure the build output is regenerated deterministically) and commit the generated locale catalogs |
| A2.2 | Cannot verify locally — `node_modules` absent | Add `npm ci` to the local bootstrap; CI already runs `lint` + `test` + `i18n:check` |

---

## Part B — Missing features to implement

### Phase 1 — Exam setup completeness (Feature 1, Item 4 consent)

**B1.1 Paper-submission deadline**
- Schema: add `Exam.paperDueAt DateTime?` (or extend `gradeSubmissionDeadline` semantics — prefer a distinct field).
- API: accept in `createExam`/`updateExam` and `PATCH /api/exams/:id/online-config`; validate `paperDueAt <= startDate`.
- Enforcement: in `examPaperService.submit`, block when `now > paperDueAt` (`409 PAPER_DEADLINE_PASSED`) unless reviewer override.
- Notify educators when `paperDueAt - 24h` (and `-2h`) via `comms`.
- UI: add the field to `ScheduleExamModal.tsx` and the exam-details/edit form; show a countdown chip on `PaperPage.tsx`.

**B1.2 Expose delivery mode (and paper settings) to admins**
- Add a **delivery mode picker** to the admin exam create/edit form (`src/features/exams/`), wired to `deliveryMode` in the create/update payload.
- Add a **reviewers can override delivery mode** control (already partially in `ReviewPage.tsx`).
- Resolve the HYBRID definition — see Decision D1.

**B1.3 Explicit instructions acceptance (Feature 4)**
- On the `TakePage` intro, require a checkbox "I have read and accept the instructions" before enabling "Enter fullscreen & begin".
- Persist acceptance: `ExamAttempt.instructionsAcceptedAt DateTime?` set on `startAttempt`.
- Backend: require `instructionsAcceptedAt` (or an `accepted: true` flag) in `startAttempt`.

### Phase 2 — Exam audience scoping (Feature 4)

**B2.1 Class / enrollment scoping**
- `listOnlineExamsForStudent` currently ignores `Exam.classId`. Scope exams to the student's class/enrollments (reuse the existing enrollment/teaching-scope helpers used elsewhere in `academic`).
- Add roster-based assignment option (`ExamPaperRosterFlag`) for named students.
- Guard `startAttempt` with the same scope so a deep link cannot bypass it.

**B2.2 (Optional) Per-student paper**
- Decide whether "their specific test paper" means *scoped by schedule* (default) or *uniquely generated per student* (shuffled/generated). Shuffling questions/choices is low-risk; per-student generated content is large — see Decision D2.

### Phase 3 — Proctoring & live tracking (Features 7 + 10)

> This is the largest lift. Split into a monitoring MVP and an optional screen-capture tier.

**B3.1 Live attempt monitoring MVP (no screen video)**
- Backend: new `GET /api/exams/:id/live-attempts` returning `IN_PROGRESS` attempts with `studentId`, `startedAt`, `endsAt`, **answered count**, `violationCount`, last-activity timestamp.
- Real-time: add a **Server-Sent Events** channel in `academic` (`GET /api/exams/:id/live-stream`) pushing `attempt.started`, `attempt.answered`, `attempt.violation`, `attempt.submitted`. (SSE is simpler than adding WebSocket to `academic`.)
- Frontend: new **Proctor Console** route `/{slug}/online-exams/:examId/proctor` (staff/proctor roles): live grid of students, answered progress bar, violation badges, jump-to-attempt.
- Per-question live view: extend `getResults` usage with a staff-safe method that returns a student's answers even when `IN_PROGRESS` (read-only, no correct keys until submitted), or a dedicated `GET /api/exam-attempts/:id/live`.
- Notifications: push violation events to the Proctor Console; reuse `comms` for in-app notify to proctors when a student crosses a violation threshold.

**B3.2 Proctor identity**
- Add a **`PROCTOR`** assignment model (per exam or per class): `ExamProctor { examId, userId, schoolId }`; allow `SCHOOL_ADMIN|PRINCIPAL|VPI|TEACHER` to be assigned.
- Gate the console on "assigned proctor OR admin/principal/vpi".

**B3.3 Live screen view (Feature 10) — staged**
- Stage 1 (consent + periodic snapshots): student page requests `getDisplayMedia`, periodically draws a frame to `<canvas>`, uploads a low-res JPEG (e.g. every 5–15s, hard-capped) to `POST /api/exam-attempts/:id/screen`; proctors see thumbnails. Heavily privacy-gated: **explicit consent screen**, visible "You are being monitored" indicator, school policy toggle, retention limits.
- Stage 2 (optional WebRTC): live peer view via a TURN/SFU. Only if Stage 1 proves value.
- **Non-negotiable:** disclosure + consent + DPIA; honor `ONLINE_EXAM_MONITORING=1` and per-school setting; never capture audio; auto-purge snapshots after N days.

### Phase 4 — Analytics & reports (Feature 8)

**B4.1 Online exam analytics endpoint**
- `GET /api/exams/:id/online-analytics`: `participants`, `completed`, `inProgress`, `passRate`, `failRate`, `avgScore`, **`violators[]`** (student + count + reason), score distribution histogram, per-question accuracy.

**B4.2 Report UI**
- New **Online Exam Report** page (tab on exam details) rendering the analytics: KPI tiles, pass/fail donut, score distribution bars, violator table, per-question difficulty table.
- Export CSV/PDF (reuse report-card PDF infra).

### Phase 5 — Gradebook auto-posting (Feature 9)

**B5.1 Link attempts to gradebook**
- Add mapping from `Exam` → `ExamComponent` (already referenced by `GradeEntry`) and an `Exam.autoPostGrades Boolean` flag.
- On `finalizeAttempt`, if `autoPostGrades`, upsert a `GradeEntry` for `(examComponentId, studentId)` with the attempt score (idempotent; respect `pendingCount` — hold until essays graded).
- Add a manual **"Post online scores → gradebook"** action as a fallback (staff-triggered) reusing the same upsert.
- Handle re-scoring/regrade: update in place, never duplicate; emit an audit event.

**B5.2 UI**
- Exam details / gradebook: badge showing "Auto-posted from online exam", plus a manual post button and a conflict warning if a manual grade exists.

---

## Decisions needed (blockers)

| ID | Decision | Recommendation |
| :- | :--- | :--- |
| D1 | HYBRID = per-student leg split (built) **or** "essay offline / rest online" (requested) | Support **both**: keep leg split; add `hybridEssayOffline` where ESSAY questions are excluded from the online attempt and graded from the printed paper |
| D2 | "Specific test paper" = schedule-scoped vs per-student generated | Start with **schedule + class scope**; add optional question shuffling; defer generation |
| D3 | Live screen capture: in scope? privacy posture? | Ship monitoring **MVP (no video)** first; screen view only with consent + school policy + retention |
| D4 | Deadline semantics: separate `paperDueAt` vs reuse `gradeSubmissionDeadline` | **Separate** field |
| D5 | Gradebook auto-post: default on/off | Default **off** with an explicit admin toggle |

---

## Implementation status (2026-10-11)

### Done — Part A (preview fixes)
- A0.1 exit/nav, A0.2 key-stripping on preview, A0.3 timer chip, A0.4 copy, A0.5 server `pending`/`answered` parity.
- Backend `onlineExamService.ts`: `buildPreviewResult`, `getExamPreview`, `getSamplePreview`, `getResults` parity.
- Frontend `PreviewPage.tsx`, `ResultsPage.tsx`.
- i18n: new preview keys; catalogs regenerated; `en.ts`/`translations.ts` duplicate keys fixed.
- Fixes: `AuthorPage.tsx` duplicate `className`; `en.ts` `labels` dup keys; `translations.ts` `classSchedule` dup.
- A1.5 (`requireTenant` on sample routes) = intended, no change. A1.4 (`questionsMin` `{{count}}`) verified non-issue.

### Done — Phase 1 (paper deadline + delivery mode + consent)
- Schema (`services/academic/prisma/schema.prisma`): `Exam.paperDueAt`, `ExamAttempt.instructionsAcceptedAt`.
- Backend: `examService.createExam/updateExam` accept & validate `paperDueAt` (`<= startDate`); `onlineExamConfigSchema` + `updateOnlineConfig` accept `paperDueAt`; `examPaperService.submit` enforces deadline (409 `PAPER_DEADLINE_PASSED`); `startAttempt` requires `accepted`, persists `instructionsAcceptedAt`.
- Frontend: exam form `deliveryMode` + `paperDueAt` (`exams/types.ts`, `ScheduleExamModal.tsx`, `exams/Page.tsx`); student consent gate in `TakePage.tsx` (attempt now starts only after explicit acceptance — also fixes the timer starting before the kiosk); `online-exam/api.ts` sends `accepted`.
- i18n keys added to `en.ts` + catalogs regenerated.

### Done — Phase 2 (exam audience scoping)
- Backend: `listOnlineExamsForStudent` filters by `Exam.classId` using `getClassroomsByMember(studentId, ["STUDENT"], schoolId)`; out-of-scope exams hidden (fail-closed if classroom service unreachable).
- Backend: `startAttempt` guards with `assertStudentInClass(exam.classId, studentId)` for class-scoped exams.
- Frontend: `AuthorPage.tsx` adds **Audience** selector (class dropdown) to the online config form, fetches classrooms via `/api/schools/:id/classrooms`, and sends `classId` to backend.
- i18n: new `audience`, `audienceAll`, `audienceHint` keys in `en.ts` + catalogs regenerated.

### Verification
- Root `lint` (frontend graph): 378 errors, unchanged from pre-Phase-2 baseline.
- Academic service `tsc` (own generated client): 7 pre-existing errors, 0 in touched files.
- `test:online-exam`, `test:exam-paper`, `test:i18n`: all pass.

### Known issues / follow-ups
- **Migrations**: `paperDueAt`/`instructionsAcceptedAt` require `prisma db push` in `services/academic` (Docker/DB unavailable here).
- **Shared Prisma client**: `services/academic` generate writes to the shared root `@prisma/client`, replacing the umbrella client and breaking other services' typecheck. Pre-existing (A1.3); restored to umbrella after verification.
- Fixed broken `services/academic/tsconfig.json` (`exclude: ["../../services"]` excluded its own `src`).
- 2 academic deps missing locally (`@aws-sdk/s3-request-presigner`, `date-holidays`) — install blocked by disk space.
- i18n: 6 pre-existing critical-path English leftovers remain; new Phase 1 keys fall back to English until translated.

Phases 2–5 and Plan 2 are not started.

## Acceptance criteria

- [ ] Admin can set start/end, **paper deadline**, and delivery mode from the exam form; deadline is enforced on submit.
- [ ] Student intro requires **explicit instruction acceptance**; acceptance is persisted.
- [ ] Students only see exams for their class/roster; deep-link start is blocked outside scope.
- [ ] Proctor Console shows live `IN_PROGRESS` attempts, progress, and violations, updating without refresh.
- [ ] Exam report shows pass/fail rate and a **violators** list, exportable.
- [ ] Online scores post to the gradebook (auto when enabled, or via a manual action), idempotently.
- [ ] Live screen view (if enabled) requires consent, shows a monitoring indicator, and purges automatically.
- [ ] `npm run test:online-exam`, `test:exam-paper`, `test:gradebook`, `i18n:check`, and `lint` pass.

## Test plan (new)

- Unit: deadline enforcement, scope filtering, auto-post idempotency, analytics aggregation, preview key-stripping (A0.2), pending-flag correctness (A0.5).
- Contract: new endpoints (`live-stream`, `online-analytics`, `screen`, auto-post).
- E2E: author → approve → sit → proctor monitors → auto-submit → analytics → gradebook.
