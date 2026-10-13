# Curriculum & Classrooms — Plan

> **Status:** Grade-level subject offerings shipped (2026-07-29); **class organization models Phases 1–3 (2026-08-04)**  
> **Scope:** Separate Curriculum + Classrooms admin pages; calendar context; cross-service display hydration; subjects offered per grade; self-contained vs departmentalized class groups  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/grade-level-vs-class-group.md`, `docs/CLASS_ORGANIZATION_MODELS_PLAN.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Curriculum | Grade levels, subjects, **subject offerings**, syllabi (`/{slug}/curriculum`) |
| Classrooms | Class groups + subject classrooms + sync/teacher per room; **section subject codes** per class group × subject (`/{slug}/classrooms`) |
| Organization | Class group `organizationType`: SELF_CONTAINED / DEPARTMENTALIZED / MIXED; assistants + co-teachers; live roster fan-out |
| Academic calendar | Summary strip (active setup or empty CTA) on **both** pages |
| Display hydration | Client joins Classroom IDs → subject / grade level / teacher names |
| Admission / enroll | Grade Applying For = grade levels only; cohort pickers = class groups (`subjectId` null) only |

### 2026-08-04 — Teacher syllabus scoping (Phases 2–3)

- **Change:** Academic `POST …/syllabi` rejects teachers who do not teach the subject/grade pair (Classroom internal owned + member lookup); teacher syllabi tab list/stats show own plans only
- **Services:** academic, classroom, frontend-spa
- **Status:** done
- **Verify:**
  - [ ] Crafted syllabus POST with wrong subject/grade returns 403 for teachers
  - [ ] Teacher syllabi tab shows only their submissions

### 2026-08-04 — Teacher syllabus modal scoping

- **Change:** Teacher “New syllabus plan” modal filters Academic Subject and Target Grade Level to subject classrooms they own or co-teach; subject ↔ grade coupling; empty state when no subject rooms; client-side submit guard
- **Services:** frontend-spa
- **Status:** done (Phase 1)
- **Verify:**
  - [ ] Teacher with only Math G10 room sees Math + G10 only
  - [ ] Co-teacher sees paired subject/grade options
  - [ ] Teacher with no subject rooms sees guidance + disabled submit
  - [ ] Admin/principal still sees full catalogs

### 2026-08-04 — Class organization models

- **Change:** Persist `organizationType` (+ `propagateSupportStaff`) on class groups; create/edit UX for self-contained vs departmentalized/platoon; `assistantIds` / People `ASSISTANT`; sync defaults by type; student add/remove on homeroom fans out to subject rooms; `POST /api/classrooms/:id/propagate-roster`
- **Services:** classroom, frontend-spa
- **Status:** done (Phases 1–3)
- **Verify:**
  - [ ] Create self-contained class group with co-teacher + assistant
  - [ ] Create departmentalized class group; sync without specialist → skipped with reason
  - [ ] Add student to homeroom → appears in linked subject rooms
  - [ ] People can add Assistant role

### 2026-08-06 — Grade-level subject auto-inherit + section codes

- **Change:** When a subject is offered for a grade level, **every class group** under that grade automatically gets a subject room named `{Class Group} - {Subject}` (e.g. `Grade 2 A - English`) with a **unique section subject code** (e.g. `ENG-2A` vs `ENG-2B`). New class groups inherit all grade-level offerings on create. Teachers are assigned per section.
- **Services:** academic (`createSubjectOffering` → classroom provision), classroom (`sectionSubjectCode`, `syncSubjectRooms`, internal provision routes), frontend-spa (Subject modal, classrooms display)
- **Status:** done
- **Verify:**
  - [ ] Create English for Grade 2 → rooms appear for Grade 2 A and Grade 2 B with codes ENG-2A / ENG-2B
  - [ ] Create new class group Grade 2 C → inherits existing Grade 2 offerings automatically
  - [ ] Assign different teachers to Grade 2 A English vs Grade 2 B English
  - [ ] Classrooms page shows section code on subject room cards

### 2026-07-29 — Grade-level subject offerings

- **Change:** Academic `SubjectOffering` (subject × grade, no teacher). Classroom `parentClassroomId` + `sync-subject-rooms` with per-room teachers (self-contained or specialist). Admission/enroll selects filter out subject classrooms. Curriculum Manage Subjects offers subjects to a grade then syncs rooms with a teacher matrix.
- **Services:** academic, classroom, api-gateway, frontend-spa
- **UI / API:** `GET/POST /api/schools/:id/subject-offerings`, `DELETE /api/subject-offerings/:id`, `POST …/classrooms/sync-subject-rooms`, backfill helpers
- **Status:** done
- **Verify:**
  - [ ] Offer Math for Grade 10 → no teacher stored on offering
  - [ ] Sync 10-A Math (Alice) and 10-B Math (Bob) independently; or fill same teacher for all subjects in 10-A
  - [ ] Public apply / Direct Admission grade select shows only `Grade N`
  - [ ] Review enroll cohort select shows only homerooms
  - [ ] Backfill offerings from existing subject rooms works once

### 2026-07-22 — Curriculum & Classrooms polish

- **Change:** Enrich classrooms client-side; Academic Calendar summary on Curriculum + Classrooms; replace `alert`/`confirm` with toasts + confirm dialog; Executive Slate shell; Academic delete guards call Classroom internal count API
- **Services:** frontend SPA, academic, classroom
- **UI / API:** `/{slug}/curriculum`, `/{slug}/classrooms`; `GET /api/internal/classrooms/count?subjectId|gradeLevelId`
- **Status:** done
- **Known gap:** Lifecycle admission rows are not checked when deleting a grade level
- **Verify:**
  - [ ] Curriculum shows calendar summary (or empty CTA)
  - [ ] Classrooms shows subject/grade/teacher names (not blank / “N/A”)
  - [ ] Create class group → Quick assign subjects → rooms list with names
  - [ ] Delete subject/grade used by a classroom → clear error toast
  - [ ] No `window.alert` on success/error paths for these pages

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| Subjects, grade levels, subject offerings, syllabi, calendar | **Academic** |
| Classrooms / members / subject-room sync | **Classroom** |

## 2. Model reminder

Grade Level → **SubjectOffering** (curriculum) → Class Group (`subjectId` null) → Subject Classroom (`subjectId` set, `parentClassroomId`, `sectionSubjectCode`, teacher per room, students copied from group).
