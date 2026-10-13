# Online Exams (Kiosk Lockdown) — Plan

> **Status:** Complete (2026-07-24) — core authoring, student kiosk, scoring, parent visibility  
> **Scope:** Teachers author online questions + max violations; students sit exams in fullscreen kiosk mode; parents track scores  
> **Companion:** `IMPLEMENTATION_STATUS.md`

### 2026-10-11 — Staff preview / sample demo

- **Change:** Staff (`SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `TEACHER`) can dry-run the student experience without creating an attempt: preview any authored online exam, or try a built-in sample paper covering every question type.
- **Services:** `academic` (preview APIs, no `ExamAttempt` rows, no notifications), `frontend-spa` (preview page + entry points).
- **UI / API:** `/{slug}/online-exams/sample/preview`, `/{slug}/online-exams/:examId/preview`; APIs `GET /api/exams/preview/sample`, `POST /api/exams/preview/sample/score`, `GET /api/exams/:id/online-preview`, `POST /api/exams/:id/online-preview/score`.
- **Status:** done — read-only dry run; reuses the real scoring engine, reveals answer keys only after submit.
- **Verify:**
  - Staff → **Online exams** → **Try a sample exam** → answer → Submit → see per-question score with no attempt recorded
  - Staff → exam **Online exam builder** → **Test this exam** → same flow against the real questions

### 2026-07-24 — Secure online exam kiosk

- **Change:** Schools can run lockdown online exams (MCQ, T/F, fill-blank, essay) with violation auto-submit, live timer, immediate or delayed results, and parent tracking.
- **Services:** `academic` (schema + APIs), `api-gateway` (routing), `frontend-spa` (author / take / results UI), `comms` (parent notify on submit)
- **UI / API:** `/{slug}/exams/:id/online`, `/{slug}/online-exams`, `/{slug}/online-exams/:examId/take`, results routes; APIs under `/api/exams/:id/questions|attempts|online-config`, `/api/exam-attempts/:id/*`, `/api/schools/:id/online-exams`
- **Status:** done (browser best-effort lockdown — not a native OS kiosk agent)
- **Verify:**
  - Teacher opens an exam → **Online exam builder** → enable kiosk, set max violations, add questions → Save
  - Student → **Online exams** → Begin → fullscreen → answer → timer counts down → Submit → score / passed / missed
  - Exit fullscreen repeatedly until max violations → paper auto-submits
  - Parent → **Online exams** → select child → View score (after submit / release)

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Ownership | Extends Academic `Exam` (not Classroom assignments) |
| Question types | `MULTIPLE_CHOICE`, `TRUE_FALSE`, `FILL_BLANK`, `ESSAY` |
| Lockdown | Fullscreen required; blur / visibility / copy / context-menu report violations |

### Browser lockdown limitations (honest)

- SPA kiosk mode is **best-effort in the browser** — not an OS-level lockdown agent.
- Cannot block OS screenshots, screen recording, or other applications.
- Accessibility tools and browser extensions may interfere with fullscreen / visibility heuristics.
- Schools should use in-person proctoring for high-stakes sittings; optional staff email on auto-submit when `ONLINE_EXAM_PROCTOR_EMAIL=1`.
| Auto-submit | When `violationCount >= maxViolations` (maxViolations `0` = unlimited) |
| Timer | Server `endsAt = min(startedAt + duration, exam.endDate)`; client syncs via answer saves |
| Scoring | Auto for MCQ / T/F / fill-blank; essays stay pending until manual review |
| Results | Shown immediately if `showResultsImmediately`, else after `isGradesReleased` |
| Parents | List child’s open/completed online exams; in-app notification on submit |

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| Questions, attempts, violations, scoring | `academic` |
| Parent link checks / parent ids | `identity` (internal) |
| Submit notifications | `comms` (internal notify) |
| Gateway path map | `api-gateway` |
| Kiosk + authoring SPA | `frontend-spa` |

## 2. Flows / rules

1. Staff schedule a normal exam, then open **Online exam builder** on exam details.
2. Saving questions sets `isOnline=true` and stores answer keys server-side only.
3. Student starts one attempt per exam (`@@unique([examId, studentId])`).
4. During `IN_PROGRESS`, answer keys are never returned to the client.
5. Violations increment; at max, status → `AUTO_SUBMITTED`.
6. Time expiry → `EXPIRED` with scored results.
7. Parents must be linked (`assertParentLinked`) to see a child’s attempts/scores.

## 3. Acceptance

- [x] Teacher can author MCQ / T/F / fill-blank / essay with max violations
- [x] Student kiosk fullscreen + timer + cannot freely leave without violations
- [x] Auto-submit at max violations
- [x] Post-exam score, passed, missed (essays pending)
- [x] Parents can track and view scores
- [x] Staff can preview a real exam or a built-in sample with no attempt recorded
- [x] Unit tests for scoring / lockdown thresholds (`npm run test:online-exam`)
