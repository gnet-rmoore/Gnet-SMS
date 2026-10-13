# Teacher Gradebook — Plan

> **Status:** Phases 1–4 implemented (2026-07-23)  
> **Scope:** Teacher-first grade entry — spreadsheet UX, draft/submit, durable autosave (local + server), period multi-column grid  
> **Companion:** `docs/gradebook-architecture.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/gradebook` (hub + sheet); shared sheet on Exam Details

---

## 0. Product intent

Teachers need a **fast, keyboard-first gradebook** that does not punish flaky internet. Draft/submit already existed on Exam Details; this plan makes grading effortless and durable.

| Rule | Behavior |
| :--- | :--- |
| Edit while `DRAFT` or `REJECTED` | Teachers can change scores; autosave writes `DRAFT` |
| After `SUBMITTED` / `ACCEPTED` / locked | Cells read-only until admin rejects or unlocks |
| Autosave | Local draft **immediately**; debounce ~800ms → bulk sync `DRAFT` when online |
| Offline | Local draft is source of truth; chip shows Offline; flush on `online` |
| Multi-class offline | Each class/assessment has its own localStorage draft; **background sync** uploads all pending drafts while signed in (Layout runner + on `online`) |
| Submit | Explicit confirm only — never auto-submit |
| Empty cells | Allowed in draft; Submit warns if any empty |
| Score entry | Teachers enter **points earned** per column; each column has a **max pts** (Settings → Structure, or smart defaults: HW/QZ/CW = 10, MID/FIN = 25, EXAM = 50). Total = weighted average of `(score ÷ max) × 100`. Letter from school legend on that 0–100 total. |

---

## 1. Architecture

```text
Gradebook hub → GradebookSheet
                    ├─ localStorage gb:v1:{schoolId}:{examId|component}:{classId}
                    └─ POST /api/exams/:id/grades/bulk  (DRAFT | SUBMITTED)
```

Owning service: **academic**. SPA: `src/features/gradebook/`.

---

## 2. Phases

| Phase | Deliverable |
| :--- | :--- |
| **1** | Hub route/nav + spreadsheet sheet UX; shared with Exam Details |
| **2** | Bulk grades API + `useGradebookAutosave` |
| **3** | Period multi-column grid (calendar ExamComponents) |
| **4** | Student grades API fix, status align, tests, rebuild |

---

## 3. Verify

- [x] Teacher opens Gradebook → type scores → chip Synced → refresh retains (autosave + bulk)
- [x] Offline mid-entry → local retained → online flush (localStorage + online listener)
- [x] Submit locks cells; Grade Review still works
- [x] Grade Review dual hub (staff queue + teacher My submissions) — see `docs/GRADE_REVIEW_PLAN.md`
- [x] Keyboard-only fill (Enter / ArrowDown)
- [x] Period mode shows calendar component columns

---

## 5. Phase 5 — Scoped assessment gradebook (2026-08-05)

| Deliverable | Status |
| :--- | :--- |
| `ExamComponent.gradebookStructure` + `GradeEntry.structureColumnId` | done |
| `GET …/gradebook/assessment-grades` | done |
| Calendar Step 3 structure editor per assessment | done |
| Teacher flow: class → period → **one assessment** → structure grid + Total/Letter | done |
| Executive Slate `GradebookAssessmentSheet` | done |

**Verify:** Settings → Academic Calendar → Step 3 → expand structure on Mid-Term; teacher Gradebook → pick Term 1 → Mid-Term → see HW/QZ/CW/Exam columns only.

### 2026-07-23 — Teacher Gradebook Phases 1–4

- **Change:** Dedicated Gradebook hub/sheet, `POST …/grades/bulk`, local+server autosave, period component grid, Academic `GET /api/students/:id/grades`, status `ACCEPTED` align  
- **Who:** Teachers (entry); admins (review unchanged)  
- **Services:** academic, api-gateway, frontend-spa  
- **Status:** done (MVP)  
- **Verify:** `npm run test:gradebook`; open `/{slug}/gradebook` as teacher  
