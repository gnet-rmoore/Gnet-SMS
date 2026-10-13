# Lesson Plans — Implementation Plan

> **Status:** Phases 1–4 shipped (2026-07-24)  
> **Scope:** Per-lesson instructional plans for Teachers; Principal / VPI / School Admin approve or return  
> **Non-goals (this plan):** Replacing Curriculum **Syllabus plans** (year/course outlines); student-facing lesson views  
> **Companion:** `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/GRADE_REVIEW_PLAN.md`, `docs/NOTIFICATIONS_PLAN.md`, `docs/SYLLABUS_CALENDAR_ALIGNMENT_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/lesson-plans`

---

## 0. Product intent

Teachers need a **fast, structured lesson planner** that feels advanced (objectives → activities → assessment) without feeling like paperwork. Leadership needs the **same approval pattern** already used for leave and grades: submit → queue → approve / return with feedback → bell notify.

| Concept | What it is | What it is not |
| :--- | :--- | :--- |
| **Syllabus plan** (`SyllabusPlan`) | Year / course outline under Curriculum | Not a single class period |
| **Lesson plan** (`LessonPlan`) | One teaching session (date + subject + steps) | Not exam grades or Classroom posts |
| **Template** (`LessonPlanTemplate`) | Reusable structure in the school library | Not a scheduled lesson |

### Hard product rules

1. **Teachers own drafts.** Only the author (or admin) edits `DRAFT` / `RETURNED` plans.
2. **Explicit submit.** Saving never auto-submits; Submit confirms.
3. **Reviewers decide.** `SCHOOL_ADMIN` / `PRINCIPAL` / `VPI` approve or return with optional feedback.
4. **Honest UI.** Real pending counts; empty states with plain copy; no fake AI “quality scores.”
5. **Executive Slate** for all lesson-plan surfaces (`FRONTEND_GUIDELINES.md`).
6. **Keep Syllabus separate.** Curriculum “Syllabus plans” stay as course-level approval; lesson plans do not replace them.
7. **Share is optional.** Classroom material posts only after **Approve** + linked `classroomId`, explicit teacher/admin action.

---

## 1. Status machine

```text
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──share──► Classroom MATERIAL
   ▲                    │                      │
   │                    └──return (+ feedback)──► RETURNED
   │                                              │
   └──────────── teacher edits / resubmits ───────┘
```

| Transition | Who | Rules |
| :--- | :--- | :--- |
| Create / update | Teacher (own) or Academic admin | Only while `DRAFT` or `RETURNED` |
| Reschedule (drag) | Author / admin | Date-only; `DRAFT` / `RETURNED` |
| Submit | Teacher (own) | Requires title, subject, lesson date, ≥1 objective, ≥1 activity |
| Approve / return | Reviewer roles | Only while `SUBMITTED`; sets `reviewedById` / `reviewedAt` |
| Share to Classroom | Author / admin | Only `APPROVED` + `classroomId`; sets `classroomPostId` |
| Delete | Teacher (own) or admin | Only `DRAFT` or `RETURNED` |
| Duplicate / from template / from syllabus unit | Teacher | New `DRAFT` |

---

## 2. Target experience

### Teacher

1. Open **Lesson Plans** → week strip + **week board (drag)** + list.
2. **New lesson** → guided builder; or **Library** → template / syllabus unit.
3. **Save draft** / **Submit**; drag drafts to a new day.
4. After approval → **Share to Classroom** (material post) if a room is linked.
5. **PDF** for one plan; **week PDF pack** for the visible week.
6. **Save template** from any plan into the school library.

### Leadership (School Admin / Principal / VPI)

1. Pending review queue; Approve / Return with feedback.
2. Library + school-wide All plans; same PDF / template tools.

---

## 3. Owning services

| Concern | Service |
| :--- | :--- |
| `LessonPlan`, `LessonPlanTemplate`, status, share orchestration | **Academic** |
| MATERIAL post create (internal) | **Classroom** |
| Approver / decision notify | Academic → Identity → **Comms** |
| SPA | `src/features/lesson-plans/` |
| Gateway | `lesson-plans`, `lesson-plan-templates`, `lesson-plan-syllabus-units` → academic |

---

## 4. APIs (full)

| Method | Path | Who |
| :--- | :--- | :--- |
| GET | `/api/schools/:id/lesson-plans` | Staff |
| GET | `/api/schools/:id/lesson-plans/pending` | Reviewers |
| POST | `/api/schools/:id/lesson-plans` | Staff |
| POST | `/api/schools/:id/lesson-plans/from-template` | Staff |
| POST | `/api/schools/:id/lesson-plans/from-syllabus-unit` | Staff |
| GET | `/api/schools/:id/lesson-plan-templates` | Staff |
| GET | `/api/schools/:id/lesson-plan-syllabus-units` | Staff — approved syllabi + units |
| POST | `/api/lesson-plans/:id/submit` | Author |
| POST | `/api/lesson-plans/:id/review` | Reviewer |
| POST | `/api/lesson-plans/:id/duplicate` | Author |
| POST | `/api/lesson-plans/:id/reschedule` | Author — `{ lessonDate }` |
| POST | `/api/lesson-plans/:id/save-as-template` | Author |
| POST | `/api/lesson-plans/:id/share-to-classroom` | Author — approved only |
| DELETE | `/api/lesson-plans/:id` | Author |
| DELETE | `/api/lesson-plan-templates/:id` | Owner / reviewer |
| POST | `/api/internal/classrooms/:id/posts` | Academic → Classroom |

---

## 5. Phases

| Phase | Deliverable | Status |
| :--- | :--- | :--- |
| **1** | Schema + APIs + dual-hub SPA + notifications + badges + tests | **Done** |
| **2** | Templates library + duplicate-from-syllabus unit picker | **Done** |
| **3** | Optional “Share to Classroom” material post when approved | **Done** |
| **4** | Week calendar drag schedule + print/PDF pack | **Done** |

---

## 6. Acceptance

### Phase 1
- [x] Draft → submit → approve/return → bell
- [x] Duplicate; Executive Slate; syllabi unchanged

### Phase 2
- [x] Save plan as template; Use template → new draft
- [x] Library lists approved syllabus units → Draft from unit

### Phase 3
- [x] Approved + classroom → Share creates MATERIAL + `classroomPostId`
- [x] Idempotent (already shared blocked)

### Phase 4
- [x] Drag draft/returned cards between week days → reschedule API
- [x] Single PDF + week pack PDF (jsPDF)

---

## 7. Change log

### 2026-07-24 — In-app help for syllabus vs lesson plans

- **Change:** Detailed expandable help on Curriculum (syllabus) and Lesson Plans; clarified empty-state copy so “syllabus” is not called “lesson plan”
- **Who:** Teachers and academic staff
- **UI:** Curriculum “Need help?”; Lesson Plans “Need help?”
- **Status:** done
- **Verify:**
  - [ ] Curriculum → Need help? shows syllabus vs lesson comparison + role steps
  - [ ] Lesson Plans → Need help? shows status flow, library, share, roles
  - [ ] Cross-links between Curriculum and Lesson Plans work

### 2026-07-24 — Phases 2–4

- **Change:** Templates + syllabus unit seeding; Share to Classroom; week board drag reschedule; PDF export pack
- **Who:** Teachers; School Admin / Principal / VPI
- **Services:** academic, classroom, api-gateway, frontend-spa, comms (prefs unchanged)
- **Status:** done
- **Verify:**
  - [ ] Library → Use template / Draft from syllabus unit
  - [ ] Approve → Share to Classroom (needs classroom on plan)
  - [ ] Drag draft to another day; Download week PDF pack
  - [ ] `npm run test:lesson-plans`

### 2026-07-23 — Phase 1 lesson plans

- **Change:** Dedicated `LessonPlan` model and teacher/leadership dual hub with submit/approve/return, in-app notifications, and nav badges
- **Services:** academic, comms, api-gateway, frontend-spa
- **Status:** done (Phase 1)
