# Exam System Overhaul — Review, Fixes & Implementation Plan

> **Status:** In progress (2026-10-15) — Phases 0, 1, 2, 3, 4, 5 (core additive scope) done; Phase 6 next. See "Progress log" at the end.
> **Scope:** Consolidate and harden the whole assessment surface — Exams catalog, Exam schedule, Online Exams / Quizzes, question authoring + submission/approval, **Kiosk Mode**, **Live Proctor (with live screen view)**, and **automatic grade submission** to the gradebook.
> **Companion:** `docs/ONLINE_EXAMS_FIXES_AND_GAPS_PLAN.md` (audit precedent), `docs/ONLINE_EXAMS_PLAN.md`, `docs/EXAM_PAPER_APPROVAL_PLAN.md`, `docs/GRADEBOOK_ARCHITECTURE.md`, `docs/GRADE_REVIEW_PLAN.md`, `docs/ACADEMICS_ASSESSMENT_GAPS_PLAN.md`
> **Owners:** Academic service (backend) · Frontend SPA · Product (phase priority / live-monitoring scope)
> **Supersedes:** the "not started" phases of `ONLINE_EXAMS_FIXES_AND_GAPS_PLAN.md` (Phases 3–5) which this document re-scopes against what the repo has shipped since.

---

## 0. Executive summary

The **author → approve → sit → score** core loop is real and working. Since the last plan, the team has also shipped a **proctor console** (`ProctorPage.tsx`, live SSE stream, live-attempts endpoint) and a **manual "push to gradebook"** action. That changes the starting point.

What remains is **correctness debt** in the gradebook push, a **Kiosk Mode** that is only client-trusted, a **proctor experience with no live screen view**, and an **auto-grade pipeline that is manual, duplicated, and buggy**. This plan fixes those, unifies the business rules into one place, and delivers a seamless UX across the four personas (Admin, Teacher/Reviewer, Proctor, Student).

### Verified defects (highest priority)

| ID | Defect | Evidence | Impact |
| :- | :--- | :--- | :--- |
| **B1** | Gradebook push reads `structure.columns`, but `serializeAssessmentStructure` (assessmentStructure.ts:91) writes a **bare array** → `columns` is always `undefined` → `structureColumnId` is always `null` | onlineExamService.ts:1300, :1436; assessmentStructure.ts:36-39, 91-93 | Every pushed grade lands with a null column; breaks the unique upsert + gradebook rollup |
| **B2** | Upsert `where` uses `structureColumnId: structureColumnId ?? ""` while `create` sets `null` → never matches → **duplicate GradeEntry rows** every push | onlineExamService.ts:1322-1350, :1458-1486 | Gradebook inflation; retakes double-count |
| **B3** | `updateRetakePolicy` wraps the body again: `retakePolicy: JSON.stringify(req.body)` — the service expects the raw policy object | onlineExamController.ts:409; onlineExamService.ts:358 | Retake policy updates are double-encoded / dropped silently |
| **B4** | `pushToGradebook` and `bulkPushToGradebook` **duplicate** the entire 100+ line scoring/push logic | onlineExamService.ts:1252-1376 vs :1378-1510 | Divergent fixes; bug B1/B2 must be fixed twice |
| **B5** | `getAttemptForStudent(attemptId, studentId)` throws **403** when the caller is a teacher/proctor (compares `attempt.studentId !== studentId`) | onlineExamService.ts:1010 | Proctor detail may fail for staff; error is misleading |
| **B6** | Live events use a **process-local `EventEmitter`** | lib/liveExamEvents.ts:1-12 | SSE only works single-instance; breaks behind a load balancer |
| **B7** | No dedicated **ExamSchedule** model; schedule is inferred from `Exam.startDate/endDate` | academic schema.prisma | "Exam schedule" has no per-class/room/invigilator structure |
| **B8** | Kiosk violations are **100% client-reported**; no server-side/telemetry backstop, no config surface for which events count | TakePage.tsx; onlineExamService reportViolation | Trivially bypassable; "max violations" is advisory |
| **B9** | `ExamAttempt.score` stores **raw points** while `Exam.maxScore` is the question sum; the push uses `score` directly with a hard-coded `maxScore` mismatch risk | onlineExamService.ts push block; assessmentStructure.ts scoreToPercent | Weighted rollup mis-scales when column `maxScore` ≠ exam max |

---

## 1. Current-state map (as reviewed)

### 1.1 Backend — `services/academic`

| Area | File | Notes |
| :--- | :--- | :--- |
| Online exam lifecycle | `services/onlineExamService.ts` (1627 l) | start / answer / submit / finalize / results / push; `updateOnlineConfig` (l.358); `pushToGradebook` (l.1252); `bulkPushToGradebook` (l.1378); `getAttemptForStudent` (l.1010) |
| Controllers | `controllers/onlineExamController.ts` | `liveStream` SSE (l.301); `updateRetakePolicy` (l.402) |
| Routes | `routes/onlineExamRoutes.ts` | role gates per endpoint |
| Scoring (pure) | `lib/onlineExamScoring.ts` | MCQ / TRUE_FALSE / FILL_BLANK / ESSAY→pending |
| Realtime | `lib/liveExamEvents.ts` | in-process `EventEmitter` (B6) |
| Paper workflow | `services/examPaperService.ts` (583 l) | DRAFT→SUBMITTED→APPROVED/RETURNED; HYBRID roster legs; `assertCanStartOnline` |
| Exam/grade owner | `services/examService.ts` (~1965 l) | grade entry / submission / review / release (NOT `academicService.ts`) |
| Assessment structure | `lib/assessmentStructure.ts` (280 l) | `parseAssessmentStructure` → `{columns}`; `serializeAssessmentStructure` → **array**; `scoreToPercent`; `computeAssessmentTotal` |
| Schema | `prisma/schema.prisma` (747 l) | `Exam`, `ExamComponent`, `ExamPaperPackage`, `ExamQuestion`, `ExamAttempt`, `ExamAnswer`, `ExamViolation`, `GradeEntry`, `GradeHistory` |
| Validation | `validation/schemas.ts` | `onlineExamConfigSchema`, retake, violation, push-gradebook |
| Tests | `tests/online-exam-scoring.test.ts`, `tests/exam-paper-rules.test.ts` | pure unit tests, node:test |

### 1.2 Frontend — `src`

| Area | Path |
| :--- | :--- |
| Online exam engine | `src/features/online-exam/` — `api.ts`, `types.ts`, `AuthorPage.tsx`, `ListPage.tsx`, `Page.tsx`, `PreviewPage.tsx`, `ProctorPage.tsx`, `ResultsPage.tsx`, `TakePage.tsx` |
| Route wrappers | `src/pages/School/OnlineExam*.tsx`, `ExamPaper.tsx`, `ExamPaperReview.tsx`, `ExamDetails.tsx`, `Exams.tsx` |
| Paper authoring | `src/features/exam-paper/` — `api.ts`, `PaperPage.tsx`, `ReviewPage.tsx` |
| Gradebook | `src/features/gradebook/`, `src/pages/School/Gradebook.tsx`, `GradeReview.tsx` |
| Routes/guards | `src/App.tsx` (exams l.422-525, gradebook l.526), `src/lib/routeEntitlements.ts` (`online-exams`→`online_exams`) |
| Existing socket pattern | `src/features/classroom-workspace/useClassroomSocket.ts`; `services/classroom/src/server.ts` + `lib/socketEvents.ts` |

### 1.3 Role model (today)

- Paper authors: `SCHOOL_ADMIN | PRINCIPAL | VPI | TEACHER`
- Paper reviewers: `VPI | PRINCIPAL | SCHOOL_ADMIN`
- Online exam author/proctor routes: `SCHOOL_ADMIN | PRINCIPAL | VPI | TEACHER`
- Take: `STUDENT`
- **No dedicated `PROCTOR` / `INVIGILATOR` role** — any teacher may proctor.

---

## 2. Business rules — the single source of truth (target)

These rules must be encoded **once** in the backend and mirrored (not re-implemented) in the UI.

1. **Eligibility to sit**: paper `APPROVED` **and** exam inside its schedule window **and** student in the exam audience. HYBRID additionally requires the student's leg = `ONLINE`.
2. **Grading**: objective answers auto-scored on submit; ESSAY stays `PENDING` until a teacher marks it. An attempt is `FINAL` only when `pendingCount === 0` (auto) or explicitly finalized by a teacher (manual override, audited).
3. **Grade scale**: scores are stored as **raw points** (`ExamAttempt.score`) with `maxScore` = question-point sum. Conversion to a 0–100 percentage happens **only** via `scoreToPercent(score, maxScore)`; the same `maxScore` used to compute `score` is persisted on the attempt/grade so the conversion is reproducible.
4. **Auto-post trigger**: when an attempt reaches `FINAL` (objective-only exams at submit; mixed exams when the last essay is graded/finalized), the system **upserts exactly one** `GradeEntry` linked to `ExamAttempt`. Idempotent by a stable unique key.
5. **Column mapping**: the target gradebook column is resolved by `componentType`/short-code against the **effective assessment structure** resolved with `resolveEffectiveAssessmentStructure` (never by hand-parsing JSON).
6. **Human-in-the-loop guard**: auto-posted entries respect the gradebook's review/release state. If grade review is enforced, the pushed entry is marked `PENDING_REVIEW`; otherwise it posts directly.
7. **Kiosk**: entering the exam requires explicit instruction acceptance + fullscreen; violations are counted server-side from a known allow-list of event types; warn at threshold-1, auto-submit at threshold; reconnect resumes the same attempt.
8. **Live Proctor**: a proctor sees a roster of live attempts and a **live screen view** only after the student gives **explicit, logged consent** at exam start; no capture when consent is absent.

---

## 3. Target UX (seamless, per persona)

### 3.1 Admin — set up and schedule
- One **Exam Setup** wizard (create/edit): title, subject, class(es), delivery mode (`ONLINE | OFFLINE | HYBRID`), schedule window, duration, **paper deadline**, max violations, results visibility, auto-post toggle, proctoring level.
- **Exam schedule** view listing upcoming exams by date/class/session with status chips (Draft / Awaiting review / Ready / Live / Completed).
- Clear banner when an exam cannot go live (paper not approved, no questions, deadline passed).

### 3.2 Teacher / Reviewer — author, submit, approve
- Author: rich question editor (MCQ / T/F / fill-blank / essay), autosave draft, "Submit for review"; sees feedback + resubmit loop when returned.
- Reviewer: queue with preview, **Approve** / **Return with mandatory note**; optional delivery-mode override; one-click "go live" readiness check.
- Teacher results: per-student final grade, per-question answers, pending-essay marking, and a **"Post to Gradebook"** button that becomes automatic once auto-post is enabled.

### 3.3 Proctor — Kiosk + Live screen view
- Proctor console: exam picker → live roster (student, progress, answered count, violations, connection state, elapsed/remaining) with filters (at-risk, violated, unstarted).
- Click a student → **Live view** drawer: screen thumbnail (consented), recent events, warn/kill controls.
- Configurable proctoring level per exam: `OFF | MONITOR | SCREEN_VIEW`.

### 3.4 Student — sit the exam
- Pre-flight screen: instructions, "I have read and accept", device/permission check (fullscreen + screen-share consent if `SCREEN_VIEW`), then "Enter fullscreen & begin".
- Exam screen: sticky timer, question navigator, autosave, reconnect-safe, non-blocking warnings, single clear Submit / auto-submit.
- Result screen per `showResultsImmediately`.

---

## 4. Implementation plan (phased)

Each phase is independently shippable and verifiable. Phases 0–2 are **backend/correctness** and can land without schema migrations; Phase 3 introduces new columns; Phases 4–6 add tables/services.

### Phase 0 — Correctness fixes (no migrations) ⭐ do first

**P0.1 Fix gradebook structure parsing (B1)**
- Replace all `JSON.parse(x).columns` / `structure.columns?.find(...)` in `onlineExamService.ts` (l.1290-1304, :1426-1440) with `resolveEffectiveAssessmentStructure(component.gradebookStructure, schoolConfig)`, selecting via `componentType` then short-code.
- Files: `services/academic/src/services/onlineExamService.ts`.

**P0.2 Fix upsert key + dedupe (B2)**
- Build a single stable key and use it identically in `where` and `create`: `structureColumnId` must be a non-null string (fall back to the resolved column id or a deterministic `exam-<examId>-<componentId>`), never `""` vs `null`.
- Add a data-repair migration/script to merge existing duplicate `GradeEntry` rows before enforcing the unique index.

**P0.3 Unify push logic (B4)**
- Extract one `buildGradebookPush({exam, attempt, component, structure, policy})` helper + one `upsertGradeEntry(...)`; have both `pushToGradebook` and `bulkPushToGradebook` call it. Delete the duplicate block.

**P0.4 Fix retake policy (B3)**
- Controller passes `req.body` (validated by schema) directly; service stores `JSON.stringify(policy)` exactly once. Add `retakePolicy` handling to `updateOnlineConfig` or call the dedicated service method.
- Add a `retakePolicySchema` if absent and validate.

**P0.5 Fix proctor/staff attempt access (B5)**
- Split `getAttemptForStudent` into `getAttemptForOwner(attemptId, studentId)` (403 for students) and `getAttemptForStaff(attemptId, schoolId)` (school-scoped) used by proctor/results routes. Return 404 (not 403) for cross-school.

**P0.6 Persist scalar scoring (B9)**
- Store `scorePercent` alongside raw `score`/`maxScore` on `ExamAttempt` (or compute on read via `scoreToPercent`), and always pass the **same** `maxScore` into the push. Document that `maxScore` is the authoritative denominator.

Verify: `npm run test:online-exam`; add regression tests for (a) array-shaped structure resolves a column, (b) repeated push yields one entry, (c) retake policy round-trips.

### Phase 1 — Kiosk Mode hardening (B8)

**P1.1 Config surface** — add `Exam.kioskConfig` (JSON): `{ requireFullscreen, requireScreenShare, maxViolations, warnAt, blockedEvents: string[], allowReconnect }`. Expose in exam setup; default sane values. Validate with zod.

**P1.2 Server-authoritative violations** — define a server allow-list of `ExamViolation` types (`TAB_BLUR`, `FULLSCREEN_EXIT`, `COPY`, `PASTE`, `DEVTOOLS`, `MULTI_MONITOR`, `SCREEN_SHARE_STOPPED`). Server clamps counts, timestamps, and ignores unknown types. Client events remain but are **corroborated** (e.g., fullscreen-exit + visibility hidden within 2s).

**P1.3 Consent + pre-flight** — persist `ExamAttempt.instructionsAcceptedAt` and (if `requireScreenShare`) `screenShareConsentedAt`. Add the acceptance checkbox + permission checks to `TakePage.tsx` intro.

**P1.4 Reconnect & resume** — on reload, `GET /api/online-exams/:id/attempt` returns the in-progress attempt + remaining time (server clock based); UI resumes without restarting the timer. Auto-submit on disconnect only if `allowReconnect=false`.

**P1.5 Reliable auto-submit** — server sweeps expired attempts (scheduled job) and finalizes idempotently; `shouldAutoSubmitForViolations` uses the server config, not a client constant.

Verify: unit tests for violation clamping + carve-out; manual kiosk E2E for fullscreen/visibility/reconnect.

### Phase 2 — Live Proctor: Monitoring MVP (B6)

**P2.1 Real-time transport** — introduce a shared realtime layer. Preferred: **Socket.IO** in `services/academic` mirroring `services/classroom` (`server.ts`, `socketEvents.ts`), rooms per `examId`, auth via existing JWT/tenant middleware. Fallback: keep SSE but back it with **Redis pub/sub** so it survives multi-instance.
- Replace `lib/liveExamEvents.ts` internals with the pub/sub-backed emitter (same API surface to minimize churn).

**P2.2 Proctor roster** — extend `GET /api/exams/:id/attempts` to return per-attempt `studentName, status, answeredCount, violationCount, lastSeenAt, connectionState, elapsed/remaining, pending`. Add `src/features/online-exam/ProctorPage.tsx` filters (at-risk / violated / unstarted).

**P2.3 Event feed** — stream `attempt.started | answered | violation | submitted | disconnected | reconnected` into the console; show cheat notifications inline.

**P2.4 Proctor actions** — Warn (sends a banner to the student), Flag, Force-submit, Extend time (audited). New endpoints under `onlineExamRoutes.ts` with proctor role + school scope.

Verify: two browser sessions; events appear <1s; killing one instance shows pub/sub continuity.

### Phase 3 — Live Proctor: Live screen view (B7-adjacent, consent-gated)

**P3.1 Proctoring level** — `Exam.proctorLevel = OFF | MONITOR | SCREEN_VIEW`. Only `SCREEN_VIEW` captures screens; `MONITOR` is roster+events only.

**P3.2 Student capture agent** — in `TakePage.tsx`, when `SCREEN_VIEW`: request `getDisplayMedia` at pre-flight (consent logged), then capture **downscaled JPEG snapshots** (e.g., 1 frame / 10–20s) or short clips via `canvas.toBlob`, POST to a presigned URL. **Do not stream continuous video** in v1 (bandwidth/perf); make interval and quality configurable.

**P3.3 Storage + access** — new `lib/liveScreenStorage.ts` (S3 presign, mirrors `examPaperStorage.ts`) + `ExamProctorFrame` model (or object-key convention) with server-side truncation/retention. Proctor fetches via signed GET; frames auto-expire after N days.

**P3.4 Live view UI** — proctor detail drawer showing the latest frame + a short filmstrip, plus events. Explicit "monitoring active" indicator for the student (transparency requirement).

**P3.5 Compliance** — log consent, show a persistent student banner, document retention policy; disable entirely if `proctorLevel !== SCREEN_VIEW`.

Verify: consent absent → no capture; consent present → frames arrive; retention job purges old frames. Tests for storage-key scoping.

### Phase 4 — Automatic grade submission

**P4.1 Finalization signal** — define when an attempt is `FINAL`:
- Objective-only: at submit (existing `finalizeAttempt`).
- Mixed: when `pendingCount === 0` after essay marking **or** teacher explicitly finalizes.
Emit a `attempt.final` event on the Phase-2 bus.

**P4.2 Auto-post service** — `autoPostGrade(attempt)` reuses Phase-0 helpers; triggered from `finalizeAttempt` and the essay-marking path. Controlled by `Exam.autoPostGrades` (default true for ONLINE, opt-in for mixed). Idempotent via the stable key from P0.2.

**P4.3 Grade-review integration** — if school grade review is enforced, pushed entries enter `PENDING_REVIEW` (links to `gradeAccess.ts` / `GRADE_REVIEW_PLAN.md`); else they post straight to the gradebook. Never silently overwrite a teacher-edited grade — record provenance in `GradeHistory`.

**P4.4 Backfill & fallback** — keep `bulkPushToGradebook` as the manual/backfill path (now calling the same helper). Add a "post all final attempts for this exam" admin action with a dry-run preview.

**P4.5 Provenance** — `GradeEntry.source = ONLINE_EXAM`, `sourceRef = attemptId`, `rawScore`, `maxScore`, `scorePercent`. UI shows an "auto from online exam" chip.

Verify: objective exam → grade appears automatically; mixed exam → appears only after essays marked; re-finalize → no duplicate; grade-review enforced → lands in review queue.

### Phase 5 — Exam schedule + paper approval hardening

**P5.1 ExamSchedule model + API** — first-class schedule (`ExamSchedule`: examId, classId, room, session, invigilatorId, startAt, endAt) so `ClassSchedulePage` / `MySchedulePage` can read exams without ad-hoc joins. Backfill from existing `Exam.startDate/endDate`.

**P5.2 Audience scoping** — exams target explicit classes/enrollments (fixes "every student sees every online exam"); feed the Take eligibility check (rule 2.1).

**P5.3 Approval hardening** — enforce `paperStatus === APPROVED` everywhere an online attempt starts; add revision history (`ExamPaperRevision`) per `ONLINE_EXAMS_FIXES_AND_GAPS_PLAN.md` A1.2; convert free-form status strings to Prisma enums (A1.1).

Verify: schedule list matches; student outside audience gets 403; attempting on a non-approved paper is blocked server-side.

### Phase 6 — Analytics & quizzes

**P6.1 Exam analytics** — violators list, pass/fail rate, per-question difficulty, score distribution; online + offline unified. `ExamAnalytics` endpoints + a results dashboard.
**P6.2 Quizzes** — allow `componentType = QUIZ` online exams to flow through the same engine and auto-post to the QUIZ gradebook column; expose in continuous-assessment UI.

Verify: analytics numbers reconcile with `process-results`; a quiz auto-posts to the QUIZ column.

---

## 5. Data model changes (roll-up)

| Phase | Change | Migration |
| :- | :--- | :--- |
| 0 | Dedupe existing `GradeEntry` rows; no schema change required if key stable | data-repair script |
| 1 | `Exam.kioskConfig Json?`; `ExamAttempt.instructionsAcceptedAt`, `screenShareConsentedAt DateTime?` | additive |
| 2 | Realtime only (Redis dep + config); no schema change | infra |
| 3 | `Exam.proctorLevel enum`; `ExamProctorFrame` (or key convention) | additive + retention job |
| 4 | `Exam.autoPostGrades Boolean`; `GradeEntry.source/sourceRef/rawScore/maxScore/scorePercent` | additive |
| 5 | `ExamSchedule` table; `ExamPaperRevision`; enums for `paperStatus`/`deliveryMode`/package status | additive + backfill |
| 6 | (reads only) | — |

> Decision D2: enum conversion (A1.1) is a breaking migration — schedule behind a compat window.

---

## 6. API surface (new / changed)

| Method | Path | Phase | Purpose |
| :- | :--- | :--- | :--- |
| PUT | `/api/exams/:id/online-config` | 0/1 | config incl. `retakePolicy`, `kioskConfig`, `proctorLevel`, `autoPostGrades` |
| GET | `/api/online-exams/:id/attempt` | 1 | resume in-progress attempt + server time |
| POST | `/api/online-exams/:id/screen-frame` | 3 | presigned snapshot upload |
| GET | `/api/exams/:id/proctor/:attemptId/frames` | 3 | signed frames for proctor |
| POST | `/api/exams/:id/proctor/:attemptId/warn|flag|force-submit|extend` | 2 | proctor actions (audited) |
| POST | `/api/exams/:id/gradebook/push` | 0/4 | unified push (single or bulk, dry-run flag) |
| GET | `/api/exams/:id/analytics` | 6 | exam analytics |
| GET/POST | `/api/exams/:id/schedule` | 5 | exam schedule CRUD |

---

## 7. Testing & acceptance criteria

- **Unit:** `tests/online-exam-scoring.test.ts` extended for finalization states; new `tests/online-exam-gradebook.test.ts` (structure parse, idempotent upsert, scoreToPercent denominator); `tests/exam-paper-rules.test.ts` extended for audience scoping + approval gate.
- **Contract:** schema tests for `onlineExamConfigSchema`, `retakePolicySchema`, `kioskConfigSchema`.
- **E2E (manual, two sessions):** start → live events; violation → warn → auto-submit; submit → auto grade in gradebook; SCREEN_VIEW → consent + frames.
- **Acceptance:**
  1. A repeated push never creates a second `GradeEntry`.
  2. An objective online exam posts a correctly scaled grade automatically with no teacher action.
  3. A returned paper cannot be sat; an approved paper can.
  4. A student outside the audience cannot start.
  5. Killing an academic instance does not break the live stream (pub/sub).
  6. No screen capture occurs without recorded consent.

---

## 8. Delivery order & effort

| Phase | Priority | Effort | Depends on |
| :- | :--- | :--- | :--- |
| 0 — Correctness | **P0** | S | — |
| 1 — Kiosk hardening | P1 | M | 0 |
| 2 — Proctor monitoring | P1 | M | 0 (Redis/IO) |
| 4 — Auto grade post | P1 | M | 0 |
| 3 — Live screen view | P2 | L | 1,2 |
| 5 — Schedule + approval | P2 | M–L | 1 |
| 6 — Analytics + quizzes | P3 | M | 2,4 |

Phases 0, 1, 2, 4 deliver the most user-visible value; Phase 3 is the largest and most compliance-sensitive.

---

## 9. Risks & open decisions

- **D1 — Realtime transport:** Socket.IO (richer, matches classroom) vs Redis-backed SSE (least frontend churn). *Recommend Socket.IO with a Redis adapter.*
- **D2 — Enum migration:** timing + compat strategy for `paperStatus`/`deliveryMode`/package status.
- **D3 — Screen-capture consent/retention:** legal review required; v1 uses snapshots, not video.
- **D4 — Audience scoping:** confirm whether existing exams should be scoped to their class or left school-wide during backfill.
- **D5 — Auto-post default:** ON for pure-objective exams; opt-in for mixed (essay) exams.
- **D6 — Proctor role:** add a dedicated `PROCTOR`/`INVIGILATOR` role or continue widening `TEACHER`?
- **Risk:** client-reported violations are inherently untrusted; server corroboration (P1.2) mitigates but cannot fully prevent browser-level bypass — document expectations.
- **Risk:** multi-instance SSE is a silent production bug today (B6) — treat Phase 2.1 as a correctness fix, not a feature.

---

## 10. Progress log

### Phase 0 — Done (2026-10-15)
- New pure lib `services/academic/src/lib/onlineExamGradebook.ts` (`resolveExamGradeColumn`, `resolvePublishScore`, `scaleScoreToColumn`); `pushAttemptToGradebook` unified push (B1/B2/B3/B4/B9); `getAttemptForStaff` fixes staff 403 (B5).
- Fixed `getLiveAttempts` Map usage, `getRetakeEligibility` select, `liveExamEvents` payload; average-retention math bug.
- Tests: `tests/online-exam-gradebook.test.ts` (16).

### Phase 1 — Done (2026-10-15)
- Migration `docker/postgres/migrations/20261015_online_exam_overhaul.sql`: `Exam.proctorLevel/kioskConfig/autoPostGrades`, `ExamAttempt.screenShareConsentedAt/lastSeenAt`, `GradeEntry.source/sourceRef/rawScore/maxScore/scorePercent`; duplicate-push repair.
- New pure lib `services/academic/src/lib/onlineExamKiosk.ts` (config parse/clamp, violation allow-list, `evaluateViolation`); server-authoritative `reportViolation` with counted violations + warn; `heartbeat`; `sweepExpiredAttempts` + 60s scheduler in `server.ts`; `getActiveAttempt` resume; screen-share consent in `startAttempt`.
- Routes: `GET /api/exams/:id/attempt`, `POST /api/exam-attempts/:attemptId/heartbeat`, `POST /api/exams/sweep-expired`.
- Frontend: `TakePage` kiosk-aware pre-flight (fullscreen + screen-share consent), resume on load, heartbeat, warn banner, screen-share capture/indicator; `AuthorPage` kiosk/proctor config; `api.ts` types/endpoints.
- Tests: `tests/online-exam-kiosk.test.ts` (29). `test:online-exam` now runs scoring + gradebook + kiosk.
- i18n: new English strings in `src/i18n/catalogs/en.ts` (other locales fall back to English pending translation).

### Phase 2 — Done (2026-10-15)
- Realtime transport migrated from single-instance SSE to **Socket.IO + Redis adapter** (`server.ts`): JWT handshake auth, rooms `exam:{id}` / `attempt:{id}`, Redis adapter when `REDIS_URL` set, room-authorization (school-scoped proctors; students only their own attempt).
- New socket path `/exam-socket` (classroom keeps `/socket.io`); wired `nginx.conf`, `vite.config.ts`, `k8s/base/ingress.yaml`.
- `liveExamEvents.ts`: extended events (`attempt.final/disconnected/reconnected/warning/flagged/extended/force_submitted/screen.frame`), `setExamIo`, room helpers, `PROCTOR_ROLES`; SSE `onLiveExamEvent` retained.
- Service: `emitAttemptConnection`, `warnStudent`, `flagAttempt`, `forceSubmitAttempt`, `extendAttemptTime`, `getAttemptAccess`/`getExamAccess`; `getLiveAttempts` now returns connection state, elapsed/remaining, total questions, last-seen.
- Routes: `POST /api/exam-attempts/:attemptId/{warn,flag,force-submit,extend}` (role + tenant gated; validation schemas added).
- Frontend: `useExamSocket` hook; `ProctorPage` rewritten (live dashboard, filters all/at-risk/flagged/unsubmitted, connection state, per-student warn/extend/force-submit/flag actions, live event feed); `api.ts` proctor methods; new i18n keys.
- Tests: `tests/live-exam-events.test.ts`; `test:online-exam` now also runs it.

### Phase 4 — Done (2026-10-15)
- `pushAttemptToGradebook` now writes provenance (`source=ONLINE_EXAM`, `sourceRef=attemptId`, `rawScore`, `maxScore`, `scorePercent`) and guards human-entered grades (`shouldSkipManualEntry`, `computeScorePercent` pure helpers in `onlineExamGradebook.ts`).
- New `autoPostGradeForAttempt` triggered from `finalizeAttempt` (objective exams) and from new `markEssayAnswer` (mixed exams once `pendingCount === 0`); honours `Exam.autoPostGrades`, idempotent, failure-isolated.
- New `markEssayAnswer` service + `recomputeAttemptTotals` + `PATCH /api/exam-attempts/:attemptId/answers/:questionId/grade` (staff, `essayGradeSchema`, `null` resets to pending).
- `bulkPushToGradebook` supports `dryRun` + `force`; skips+reports human-entered grades; controller returns `{pushed, skipped, failed, dryRun}`.
- Frontend: essay marking inline in `OnlineExamProctorDetail`; proctor bulk-push toast shows pushed/skipped/failed; `api.ts` `markEssayAnswer`, push `dryRun/force`.
- Tests: `tests/online-exam-gradebook.test.ts` extended (score-percent + manual-entry guard).

### Phase 5 — Done (2026-10-15) (core additive scope)
- Added `ExamSchedule` model + `ExamPaperRevision` model to `services/academic/prisma/schema.prisma`; migration `docker/postgres/migrations/20261015_exam_schedule_and_revisions.sql` creates tables, indexes, and backfills a schedule row for existing exams (classId preserved).
- New pure helpers `services/academic/src/lib/examSchedule.ts` (`validateScheduleWindow`, `computeExamEnvelope`, `synthesizeScheduleFromExam`) and `services/academic/src/lib/paperApproval.ts` (`evaluatePaperStart`) with unit tests (`tests/exam-schedule.test.ts`).
- Service: `services/academic/src/services/examScheduleService.ts` (list/create/update/delete, auto-syncs Exam.window from schedules). Paper workflow: `examPaperService` records immutable revisions on CREATE/UPDATE/SUBMIT/APPROVE/RETURN and enforces strict approval gate at start (checks latest package status + denorm).
- Controllers/routes: `examController` CRUD for exam schedules (`GET/POST /api/exams/:id/schedule`, `PATCH/DELETE /api/exam-schedules/:scheduleId`); `examPaperController` + route `GET /api/exams/:id/paper/revisions`; added `examSchedule` to `resourceLoaders`.
- Audience scoping: `examService.createExam/updateExam` persist `classId`/`subjectId` and seed a default schedule; `onlineExamService` enforces class membership via Exam.classId and ExamSchedule rows (in listOnlineExams and `startAttempt`).
- Validation: added `examScheduleCreateSchema`/`examScheduleUpdateSchema`; API clients extended in `src/features/exams/api.ts`. Frontend types updated for `classId`/`subjectId`.
- Tests: `tests/exam-schedule.test.ts` added; all online-exam suites still pass. Noted enum conversion (D2) deferred (breaking change, needs compat window).

### Phase 3 — Done (2026-10-15)
- Storage decision: reuse existing S3 bucket under `proctor-frames/` prefix; interval and retention configurable (`PROCTOR_FRAME_INTERVAL_MS` 5–120s default 15s; `PROCTOR_FRAME_RETENTION_DAYS` 1–90 default 7).
- New pure lib `services/academic/src/lib/onlineExamScreen.ts` (`capturesScreen`, `resolveFrameIntervalMs`, `resolveRetentionDays`, `computeFrameExpiry`, `proctorFrameStorageKey`, `shouldCaptureScreen`, `isFrameExpired`).
- New `services/academic/src/lib/liveScreenStorage.ts` (presigned PUT/GET/DELETE, `proctorScreenStorageEnabled`, `assertScreenFrameMime`), mirroring `examPaperStorage.ts`; pinned `@aws-sdk/s3-request-presigner` to match `@aws-sdk/client-s3` to fix a type mismatch.
- Migration `docker/postgres/migrations/20261015_exam_proctor_frames.sql` + `ExamProctorFrame` model (`attemptId/examId/schoolId/storageKey/contentType/capturedAt/uploadedAt/byteSize/expiresAt`).
- Service: `getScreenCaptureConfig`, `createScreenFrameUpload`, `markScreenFrameUploaded` (emits `screen.frame`), `listProctorFrames` (signed URLs), `purgeExpiredProctorFrames`; `server.ts` sweep purges expired frames.
- Routes: `GET /api/exam-attempts/:attemptId/screen-config`, `POST /api/exam-attempts/:attemptId/screen-frame`, `POST /api/exam-attempts/:attemptId/screen-frame/:frameId/uploaded`, `GET /api/exam-attempts/:attemptId/frames`.
- Consent: `startAttempt` now requires/records screen-share consent whenever `kiosk.requireScreenShare` **or** `proctorLevel === SCREEN_VIEW`.
- Staff attempt detail: `getResults` allows staff to view IN_PROGRESS attempts (live, no score) and returns `studentName/email`, `exam.proctorLevel/showResultsImmediately/isGradesReleased` so the proctor detail page works during a live exam.
- Frontend: `TakePage` capture agent (hidden video → downscaled JPEG via `canvas.toBlob` @0.6 → presigned PUT → confirm), interval driven by `screen-config`, gated by consent/level/storage; `OnlineExamProctorDetail` live-screen panel (latest frame + filmstrip, 12s poll + `screen.frame` socket refresh) and `useExamSocket` attempt subscription; `api.ts` screen methods; new i18n keys.
- Tests: `tests/online-exam-screen.test.ts` (23); `test:online-exam` now runs it too.
- Verified: academic + frontend `tsc --noEmit` clean; all `test:online-exam` suites pass.
