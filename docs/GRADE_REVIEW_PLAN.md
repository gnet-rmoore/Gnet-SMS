# Grade Review — Staff & Teacher Workflow

> **Status:** Gaps closed + in-app notifications (2026-07-23)  
> **Scope:** Formal submission batches; reviewer audit fields; reopen; pagination; deadlines; class membership; in-app bell notifications (no email)  
> **Companion:** `docs/TEACHER_GRADEBOOK_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/grade-review` · Layout notification bell

## 0. Summary

| Role | What they do |
| :--- | :--- |
| Teacher | Submit from Gradebook (creates a **submission batch**); track Returned / In review / Approved; fix via Gradebook; get **bell notifications** on return/approve/reopen |
| Admin / Principal / VPI | Batch/group review; filters; approve/return; **reopen** locked grades (Exam Details or API); review only in Grade Review (Exam Details links out) |

## 1. Status machine

```text
DRAFT ──submit──► SUBMITTED ──approve──► ACCEPTED (+ locked)
   ▲                    │                      │
   │                    └──return (+ feedback)──► REJECTED
   │                                              │
   └──────────── teacher edits / resubmits ───────┘
   └──────────── admin reopen (ACCEPTED) ─────────┘
```

- Submit creates `GradeSubmissionBatch` and attaches entries.
- Reject/approve sets `reviewedBy` / `reviewedAt` and syncs batch status.
- Reopen → `DRAFT`, unlocked, in-app notify teacher.
- Submit after deadline → `409 DEADLINE_PASSED`.
- Teacher must be class member; student must be on roster.

## 2. APIs

| Method | Path | Who |
| :--- | :--- | :--- |
| GET | `/api/schools/:id/grades/pending?page&limit` | Admin roles — `{ batches, grades, totalBatches, page }` |
| GET | `/api/schools/:id/grades/my-submissions?page&limit&status` | Teacher |
| POST | `/api/schools/:id/grades/review-batch` | Admin roles |
| PATCH | `/api/grade-entries/:id` | Admin roles — SUBMITTED only |
| POST | `/api/grade-entries/:id/reopen` | Admin roles |
| GET | `/api/notifications`, `/unread-count` | Authenticated user |
| PATCH | `/api/notifications/:id/read` | Owner |
| POST | `/api/notifications/read-all` | Authenticated |
| POST | `/api/internal/notifications` | Service token (Academic → Comms) |

Prefs: `GRADE_RETURNED`, `GRADE_APPROVED` (in-app; email not required for this flow).

## 3. Change log

### 2026-07-23 — Gap closure + notifications

- **Change:** `GradeSubmissionBatch`; `reviewedBy`/`reviewedAt`; reopen; pagination; deadline + membership guards; Comms `InAppNotification` + Layout bell badge; Exam Details inline approve/reject removed (link to Grade Review + reopen)
- **Who:** Teachers; School Admin / Principal / VPI
- **Services:** academic, comms, api-gateway, frontend-spa
- **Status:** done
- **Verify:**
  - [ ] Teacher submit → batch in pending queue
  - [ ] Admin return → teacher bell badge + My submissions Returned
  - [ ] Approve → bell + locked; Reopen from Exam Details unlocks
  - [ ] Submit after deadline blocked
  - [ ] Non-class teacher cannot write grades
