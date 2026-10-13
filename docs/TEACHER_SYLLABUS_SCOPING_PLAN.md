# Teacher Syllabus Modal Scoping — Plan

> **Status:** Phases 1–3 done (2026-08-04) — SPA scoping, API guard, teacher list filter  
> **Scope:** On Curriculum → **New syllabus plan**, Teacher accounts only see **Academic Subject** and **Target Grade Level** options derived from classrooms they teach — not the full school catalog  
> **Companion:** `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/grade-level-vs-class-group.md`, `docs/LESSON_PLANS_PLAN.md`, `docs/SYLLABUS_CALENDAR_ALIGNMENT_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Goal

Teachers opening **New syllabus plan** should only pick:

1. **Academic subjects they teach** (from their subject classrooms).
2. **Grade levels they teach** (from those same rooms).

Admins / academic leads (`SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, etc.) keep the full school catalogs (unchanged).

**Owning services:** frontend-spa (primary). No new Academic/Classroom endpoints required for Phase 1.

---

## 1. Current behavior (honest)

| Piece | Today |
| :--- | :--- |
| Modal | `SyllabusBuilderModal` (`src/features/curriculum/components/SyllabusBuilderModal.tsx`) |
| Subject / grade selects | Map **all** `subjects` and `gradeLevels` from school catalog APIs |
| Teacher open CTA | Prefills `subjects[0]` / `gradeLevels[0]` (first school-wide), not “what I teach” |
| Teacher classrooms | Already loaded via `GET /api/schools/:id/classrooms` — **server-scoped** to membership ∪ ownership |
| Gap | Modal ignores teacher classrooms when building dropdowns |

Product rule (unchanged): **teacher lives on `Classroom`**, not on `SubjectOffering`.

---

## 2. Product rules

1. **Teacher scope source of truth:** subject classrooms the teacher owns or co-teaches (`Classroom.subjectId` set).
2. **Homeroom-only rows** (`subjectId` null) do **not** contribute a subject; they may contribute a grade only if we also require a subject room for that grade (recommended: grades come **only** from subject rooms so the pair is coherent).
3. **Subject ↔ grade coupling (recommended):** after choosing a subject, grade options = grades where that teacher has a subject room for **that** subject. After choosing a grade first, subjects = subjects they teach in **that** grade. Empty other field when the pair is invalid.
4. **Assistants:** exclude `ASSISTANT`-only membership from “I teach” for syllabus authoring (owner + `TEACHER` / `CO_TEACHER` only). If the only link is ASSISTANT, they should not see that room’s subject/grade in the modal.
5. **Empty state:** if a teacher has no subject classrooms, show a short empty message + link/CTA toward Classrooms / ask admin — do not fall back to the full school catalog.
6. **Admin / canManage roles:** continue to receive full `subjects` / `gradeLevels` lists.
7. **Backend create** still accepts any subject/grade IDs today; Phase 1 is SPA honesty. Phase 2 (optional) adds Academic validation that `teacherId` teaches that pair.

---

## 3. Data derivation (Phase 1 — client)

Curriculum already has `classrooms`, `subjects`, `gradeLevels`, `user`.

```text
myTeachingRooms =
  classrooms where
    subjectId is set
    AND (ownerTeacherId === me OR member role ∈ {TEACHER, CO_TEACHER})

taughtSubjectIds  = unique subjectId from myTeachingRooms
taughtGradeIds    = unique gradeLevelId from myTeachingRooms (non-null)

teacherSubjects   = subjects.filter(id ∈ taughtSubjectIds)
teacherGrades     = gradeLevels.filter(id ∈ taughtGradeIds)

# Pair helpers
gradesForSubject(subjectId) =
  unique gradeLevelId from myTeachingRooms where subjectId matches

subjectsForGrade(gradeLevelId) =
  unique subjectId from myTeachingRooms where gradeLevelId matches
```

Prefill on open (teacher): first taught subject + a grade that pair exists for (not school catalog `[0]`).

---

## 4. UX changes

### 4.1 `SyllabusBuilderModal`

| Role | Subject select | Grade select |
| :--- | :--- | :--- |
| Teacher | `teacherSubjects` only | Filtered by selected subject (or taught grades if subject empty) |
| Admin / lead | Full catalogs (current) | Full catalogs (current) |

Copy when teacher has no teaching rooms:

- Title/hint: plain empty state (“No subject classrooms assigned yet. Ask your admin to assign you to subject rooms, then try again.”)
- Disable create until both selects have valid values from taught pairs

### 4.2 Open handlers

Update teacher CTA in `CurriculumViews.tsx` (and any other open paths) to prefill from taught pairs.

### 4.3 Shared helper

Add something like `src/features/curriculum/teacherTeachingScope.ts` (pure functions + unit test) so Page / modal / open handlers share one derivation.

---

## 5. Phases

### Phase 1 — SPA filter + pair coupling (this delivery)

| Work | Location |
| :--- | :--- |
| `teacherTeachingScope` helper | `src/features/curriculum/` |
| Pass scoped lists / `isTeacher` into modal | `Page.tsx`, `SyllabusBuilderModal.tsx` |
| Prefill from taught pairs | `CurriculumViews.tsx` (+ other open sites if any) |
| Empty state when no rooms | modal |
| Unit tests for helper | `tests/` |
| i18n for empty/hint strings | `en.ts` + locale leaves |
| Doc status | this plan + `CURRICULUM_CLASSROOMS_PLAN.md` changelog |

**Acceptance:**

- [x] Teacher with Math@10-A and Science@10-B only sees Math + Science and grades 10 (as applicable) — not unrelated school subjects
- [x] Selecting Math only offers grades where they teach Math
- [x] Teacher with zero subject rooms sees empty guidance; cannot submit junk catalog picks
- [x] Admin modal still lists full school subjects/grades
- [x] Co-teacher of a subject room can select that subject/grade; assistant-only cannot

### Phase 2 — Optional API guard (recommended follow-up)

| Work | Notes |
| :--- | :--- |
| On `POST /api/schools/:id/syllabi`, if role is `TEACHER`, verify teacher has a subject classroom for `(subjectId, gradeLevelId)` via Classroom internal API | Prevents crafted API bypass |
| Services | academic + classroom internal |

**Status:** done (2026-08-04) — `assertTeacherTeachesSyllabusPair` + `GET /api/internal/schools/:schoolId/classrooms/owned`

### Phase 3 — Optional list polish (out of scope unless requested)

| Work | Notes |
| :--- | :--- |
| Teacher syllabi tab defaults to “my plans” | Separate UX; not required for modal scoping |

**Status:** done (2026-08-04) — teacher syllabi list + stats scoped to `teacherId === user.id`

---

## 6. Key files

| Area | Path |
| :--- | :--- |
| Modal | `src/features/curriculum/components/SyllabusBuilderModal.tsx` |
| Page | `src/features/curriculum/Page.tsx` |
| Open CTA | `src/features/curriculum/components/CurriculumViews.tsx` |
| Query (already loads classrooms) | `src/features/curriculum/hooks/useCurriculumQuery.ts` |
| Create payload | `src/features/curriculum/hooks/usePageActions.ts` |
| Classroom scope (server, already done) | `services/classroom/src/controllers/classroomController.ts` |

---

## 7. Risks & decisions

| Topic | Recommendation |
| :--- | :--- |
| Self-contained teacher (same person, many subjects) | Subject rooms still exist after sync — they appear in taught lists. If admin never synced subject rooms, teacher correctly sees empty until rooms exist. |
| Teacher only has homeroom, no subject rooms | Empty state (do not invent subjects from homeroom). |
| Stale syllabus with subject they no longer teach | Edit flows: keep existing values visible even if not in taught set (read-only display) **or** allow keep-on-edit; create path stays strict. Prefer: create = strict; edit existing = show current subject/grade even if unassigned later. |
| New API vs client filter | Phase 1 client-only; classrooms already teacher-scoped. |

---

## 8. Doc updates (when implementing)

| Doc | Update |
| :--- | :--- |
| This plan | Status → done / partial |
| `docs/CURRICULUM_CLASSROOMS_PLAN.md` | Changelog: teacher syllabus selects scoped to teaching rooms |
| `IMPLEMENTATION_STATUS.md` | Companion bullet under Curriculum |

---

## 9. Verification

- [x] Teacher A teaches only 10-A Math → modal subject = Math, grade = Grade 10 only
- [x] Teacher A also co-teaches 11-B English → both subjects/grades appear with correct pairing
- [x] Teacher with no subject rooms → empty guidance
- [x] SCHOOL_ADMIN → full catalogs unchanged
- [x] `npm run test:teacher-teaching-scope`; rebuild `frontend-spa`
- [x] `npm run test:syllabus-teaching-scope`; rebuild `academic` + `classroom`

---

*All planned phases complete.*
