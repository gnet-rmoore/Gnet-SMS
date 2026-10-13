# Exam Paper Submission & Approval — Plan

> **Status:** Complete (2026-07-24) — Phases A–D shipped  
> **Scope:** Teachers submit exam papers (structured questions and/or PDF); VPI / Principal / School Admin review & approve; only then the subject exam becomes available to students in **Online**, **Offline**, or **Hybrid** mode  
> **Companion:** `docs/ONLINE_EXAMS_PLAN.md`, `docs/GRADE_REVIEW_PLAN.md`, `IMPLEMENTATION_STATUS.md`

### 2026-07-24 — Plan drafted for review

- **Change (proposed):** Gate student-facing exams behind a staff approval workflow for teacher-authored papers (in-app questions and/or PDF).
- **Status:** superseded by implementation below

### 2026-07-24 — Phases A–D implemented

- **Change:** Exam paper package workflow (draft → submit → approve/return), PDF via MinIO, delivery modes ONLINE/OFFLINE/HYBRID, online start gated on APPROVED + leg, hybrid roster flags, review queue UI, notifications.
- **Services:** `academic`, `identity` (`examDeliveryDefault`), `comms` (event keys), `api-gateway`, `frontend-spa`
- **UI / API:** `/{slug}/exams/:examId/paper`, `/{slug}/exam-paper-review`; APIs under `/api/exams/:id/paper*`, `/api/schools/:id/exam-papers/pending`, `/api/exam-papers/:id/review`
- **Status:** done
- **Verify:**
  - Teacher: Exam details → **Exam paper** → set mode, questions and/or PDF → Submit
  - VPI/Admin: **Exam paper review** → Approve or Return with feedback
  - Student online start blocked until APPROVED; Offline has no Begin; Hybrid respects roster leg
  - `npm run test:exam-paper`

---

## Decisions (locked at implementation)

| Question | Decision |
| :--- | :--- |
| Reviewers | `VPI`, `PRINCIPAL`, `SCHOOL_ADMIN` |
| Hybrid eligibility | Per-student roster flags (`studentId,ONLINE\|OFFLINE`); unset → ONLINE |
| Existing online exams | Auto-create **APPROVED** package on first touch (legacy migration) |
| Who sets delivery mode | Teacher at draft; reviewer may override on approve |
| PDF retention | Replace on draft confirm within same package revision |
| Offline scoring | Existing gradebook / exam grades |

---

## Status machine

```text
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED
  ▲                   │
  │                   └──return (+ feedback)──► RETURNED
  │                                              │
  └──────────── teacher edits / resubmits ───────┘
```

Online kiosk requires `paperStatus === APPROVED` and mode ∈ `ONLINE` \| `HYBRID` and (hybrid) student leg `ONLINE`.

---

## Phases

| Phase | Status |
| :--- | :--- |
| A — Workflow + PDF + review queue + notify | done |
| B — Gate online exams + lock edits | done |
| C — Delivery modes | done |
| D — Hybrid roster | done |

---

## Acceptance

- [x] Teacher can draft structured questions and/or upload PDF and submit
- [x] Reviewer can approve or return with feedback; teacher is notified
- [x] Student cannot start online exam while status is DRAFT / SUBMITTED / RETURNED
- [x] After APPROVE + ONLINE: student can take kiosk exam
- [x] After APPROVE + OFFLINE: no kiosk start; PDF available to staff
- [x] After APPROVE + HYBRID: online-leg students can Begin; offline-leg cannot
- [x] Answer keys never exposed to students before attempt submit
- [x] Docs + tests updated in the same change set
