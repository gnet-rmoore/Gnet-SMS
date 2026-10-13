# Class Organization Models — Plan

> **Status:** Phases 0–5 shipped (2026-08-04) — organization models, assistants, roster fan-out, platoon quick-assign UX, guides/docs  
> **Scope:** Explicit **self-contained** vs **departmentalized / platoon** organization when creating and staffing class groups; co-teachers and assistants; roster inheritance  
> **Companion:** `docs/grade-level-vs-class-group.md`, `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/CLASS_SCHEDULE_PLAN.md`, `IMPLEMENTATION_STATUS.md`

---

## 0. Goal

Make **how a class group is taught** a first-class product concept—not only a staffing convention—so admins can:

1. Create a **self-contained** class (students stay with one specialized teacher for most/all of the day; optional co-teacher / assistant).
2. Create a **departmentalized / platoon** class (students rotate by subject to specialist teachers; assistants optional per subject).
3. Staff those models correctly at create time and when syncing subject rooms.
4. Keep enrollment, attendance, gradebook, and My Classes consistent with the chosen model.

**Owning services:** Classroom (primary), Academic (offerings / later schedule), Identity (teacher identity only), frontend-spa.

---

## 1. System analysis (current state)

### 1.1 Hierarchy already in place

```
Division → GradeLevel
              ├─ SubjectOffering (subject × grade, no teacher)
              └─ Class Group  = Classroom where subjectId is null
                     └─ Subject Classroom = Classroom with subjectId + parentClassroomId
                            + ownerTeacherId per room
```

Canonical explanation: `docs/grade-level-vs-class-group.md`.

| Concept | Storage today |
| :--- | :--- |
| Class group / homeroom | `Classroom` with `subjectId = null` |
| Subject classroom | `Classroom` with `subjectId` set, optional `parentClassroomId` → homeroom |
| Primary teacher | `Classroom.ownerTeacherId` + member role `TEACHER` |
| Co-teacher | Member role `CO_TEACHER` (create modal + People) |
| Assistant | Role string `ASSISTANT` accepted in some APIs — **not** in People role picker; no Identity platform role |
| Self-contained / specialist | **UI convention only** (Curriculum Manage Subjects fill helpers) — **no persisted field** |

### 1.2 What “self-contained” and “specialist” mean in code today

| Model | How it is expressed | Persisted? |
| :--- | :--- | :--- |
| Self-contained | Same `ownerTeacherId` on every subject room under a class group (fill helper in `ManageSubjectsModal`) | No — inferred if you look at rooms |
| Specialist / departmentalized | Different teachers per subject (or per section × subject) | No |
| Platoon | **Not modeled** | — |
| Co-teacher on class group | `teacherIds` → `CO_TEACHER` on create | Yes (members) |
| Assistant | Partial member role | Incomplete |

Product copy already uses “self-contained” and “specialist” in Curriculum i18n; Classrooms create flow does **not** ask which model the class group uses.

### 1.3 Creation flows today

| Flow | Fields | Model awareness |
| :--- | :--- | :--- |
| **Create class group** (`CreateClassroomModal`) | name, grade, homeroom teacher, optional co-teachers, banner | None |
| **Quick Assign Subjects** (`ClassroomWizardModal`) | class group(s) × subject(s) × teacher | Teacher prefilled from homeroom; no model |
| **Assign one subject** | subject + teacher | None |
| **Curriculum Manage Subjects** | offerings + teacher matrix + self-contained/specialist fill | Helpers only |

Students are **snapshot-copied** from class group → subject rooms at create/`sync-subject-rooms`. Later homeroom enrollment does **not** fan out to existing subject rooms (known gap).

### 1.4 Gaps vs the requested product behavior

| Requirement | Gap |
| :--- | :--- |
| Declare self-contained at class-group create | No `organizationType` (or equivalent) on class group |
| Co-teacher for self-contained day | Co-teachers exist, but not framed as “supports the self-contained teacher” |
| Assistants | Role incomplete in UI + permissions |
| Departmentalized / platoon (subject rotation, specialist teachers) | Achievable by creating subject rooms with different teachers, but wizard does not guide it as a model |
| Assistants on specialist rooms | Same incomplete `ASSISTANT` role |
| Platoon as **shared specialist load across sections** (e.g. one Math teacher for 10-A and 10-B who rotate) | Already possible as “same teacher on many subject rooms”; not named or guided |
| Platoon as **split cohorts / period groups** (subset of a grade moving together) | **Not supported** — subject room is 1:1 with one parent class group |
| Live roster inheritance | Missing — hurts both models after late enroll |
| Schedule alignment | Timetable plan anchors to classrooms; does not yet encode rotation blocks by organization type |

### 1.5 What we should **not** invent

- A second `ClassGroup` table — keep one `Classroom` model with `subjectId` null vs set.
- Fake “department” org chart unless needed later for HR.
- Student self-join / class codes for normal placement (unchanged product rule).

---

## 2. Product definitions (target)

### 2.1 Organization types

Persist on the **class group** (homeroom) only:

| Value | Label (product) | Meaning |
| :--- | :--- | :--- |
| `SELF_CONTAINED` | Self-contained | Students remain with one primary teacher for most/all instructional subjects. Subject rooms still exist for gradebook/workspace, but **default teacher = homeroom teacher**. Optional **co-teacher(s)** and **assistant(s)** support that room. |
| `DEPARTMENTALIZED` | Departmentalized / Platoon | Students rotate by subject. Each subject classroom has its own **specialist** primary teacher (and optional co-teacher / assistant). Homeroom teacher is administrative / advisory, not assumed to teach every subject. |
| `MIXED` | Mixed | Some subjects use the homeroom teacher; others use specialists. Default after partial override of a self-contained or departmentalized setup. |

**Platoon naming:** In US elementary practice, “platoon” often means departmentalized rotation (and sometimes two classes swapping specialist blocks). In this product:

- **Phase 1–2:** treat **platoon = departmentalized subject rotation** under one class group (students walk to subject teachers).
- **Phase 4 (optional):** “shared specialist across sections” UX (one Math teacher assigned to 10-A Math and 10-B Math in one step) — already data-compatible.
- **Out of scope unless requested:** true multi-homeroom cohort subsets, ability grouping that splits a class group across different subject rooms without a parent link, or period-level “Team A / Team B” platoon without schedule support.

### 2.2 Staffing roles (per classroom room)

| Role | Meaning | Who assigns |
| :--- | :--- | :--- |
| Primary (`ownerTeacherId` + `TEACHER`) | Accountable teacher for the room | Staff |
| `CO_TEACHER` | Second certified teacher sharing the room (common in self-contained SPED / inclusion) | Staff |
| `ASSISTANT` | Classroom aide / teaching assistant — helps instruction; **not** primary grade owner | Staff |

Rules:

- Identity assignees for all three remain users with platform role `TEACHER` (or a future `TEACHING_ASSISTANT` if Identity adds it — Phase 3 decision).
- Assistants and co-teachers do **not** replace `ownerTeacherId`.
- Permissions: assistants get collaboration access similar to co-teachers for posts/stream unless we later tighten (Phase 3); roster mutations stay staff-only.

### 2.3 Behavior by organization type

```text
SELF_CONTAINED
  Create class group → pick primary teacher [+ co-teachers] [+ assistants]
  When offerings sync / quick-assign:
    Default every subject room ownerTeacherId = class group ownerTeacherId
    Optionally copy co-teachers/assistants onto subject rooms (configurable default: copy)
  Admin can override one subject to a specialist → suggest flipping type to MIXED

DEPARTMENTALIZED
  Create class group → pick homeroom/advisory teacher [+ optional co-teachers]
  Subject assignment step is required (or clearly deferred):
    For each offered subject → specialist teacher [+ optional co-teacher/assistant]
  No silent fill of all subjects with the homeroom teacher

MIXED
  Same data model; UI shows badge + matrix without forcing fill helpers
```

### 2.4 Roster rule (both models)

| Event | Target behavior |
| :--- | :--- |
| Student added to class group | Also add `STUDENT` to all active child subject classrooms (`parentClassroomId = class group`) |
| Student removed from class group | Remove from child subject classrooms (or soft-flag — prefer remove for consistency) |
| Subject room created/synced | Copy current class-group students (keep today’s behavior) |
| Student added only to one subject room | Allowed for edge cases (pull-out); does **not** add to homeroom |

This closes the current “snapshot only” gap and is required for honest self-contained and platoon operation.

---

## 3. Proposed data model

### 3.1 Classroom service (`services/classroom/prisma/schema.prisma`)

Add on `Classroom` (homerooms primarily; subject rooms may leave null or inherit display-only):

```prisma
/// SELF_CONTAINED | DEPARTMENTALIZED | MIXED — meaningful on class groups (subjectId null)
organizationType String?
```

Optional later (not required for Phase 1):

```prisma
/// When true, co-teachers/assistants on the class group are copied to new subject rooms
propagateSupportStaff Boolean @default(true)
```

No new tables for Phase 1–2.

### 3.2 Member roles (canonical strings)

| Role | Status |
| :--- | :--- |
| `STUDENT` | Keep |
| `TEACHER` | Keep (owner also in `ownerTeacherId`) |
| `CO_TEACHER` | Keep |
| `ASSISTANT` | Complete wiring (API validation list, People picker, i18n, enrichment) |

### 3.3 API surface (Classroom)

| Endpoint | Change |
| :--- | :--- |
| `POST /api/schools/:schoolId/classrooms` | Accept `organizationType`; accept `assistantIds[]` alongside `teacherIds[]` (co-teachers) |
| `PATCH /api/classrooms/:id` | Allow updating `organizationType` on class groups; validate transitions |
| `POST …/classrooms/sync-subject-rooms` | If class group is `SELF_CONTAINED` and teacher omitted, default to homeroom owner; if `DEPARTMENTALIZED`, require teacher per cell |
| `POST/DELETE …/members` | Support `ASSISTANT`; on class-group student add/remove → propagate to children |
| New (recommended): `POST …/classrooms/:id/propagate-roster` | Idempotent repair for existing schools |

### 3.4 Academic / Identity

- **Academic:** no schema change for Phase 1–2 (offerings stay teacherless).
- **Identity:** no new role required for Phase 1–2; optional Phase 3 `TEACHING_ASSISTANT` platform role + capability defaults.

---

## 4. UX plan

### 4.1 Create class group wizard (extend `CreateClassroomModal` or replace with stepped wizard)

**Step 1 — Identity:** name, grade level, banner  
**Step 2 — Organization:** choose Self-contained vs Departmentalized / Platoon (short plain-language cards, not jargon dump)  
**Step 3 — Staffing:**

| If self-contained | If departmentalized |
| :--- | :--- |
| Primary teacher (required) | Homeroom / advisory teacher (required) |
| Co-teachers (optional) | Co-teachers optional (rare) |
| Assistants (optional) | Note: subject specialists assigned next |

**Step 4 (departmentalized, optional same session):** “Assign subjects now” → deep-link / open Quick Assign or Curriculum matrix with organization pre-set; or “Do later”.

Edit class group: show organization badge; allow change with confirm when subject rooms already exist (e.g. switching to self-contained offers “re-fill all subject teachers with primary?”).

### 4.2 Curriculum Manage Subjects / Quick Assign

- Read `organizationType` and default fill behavior:
  - Self-contained → “Fill with class teacher” primary action
  - Departmentalized → no auto-fill; specialist column required
- Keep specialist-row fill (“one Math teacher across all sections”) for platoon-style shared specialists.
- Show assistants column only if we add per-room support staff in Phase 2 (otherwise assistants stay on class group until subject-room People edit).

### 4.3 Class group cards / Registrar / Enrollment

- Badge: Self-contained | Departmentalized | Mixed
- Homeroom pickers unchanged (still `subjectId` null only)
- People UI: role select includes Co-teacher and Assistant

### 4.4 Concept guide

Update `ConceptGuide` + `docs/grade-level-vs-class-group.md` with the two models and co-teacher/assistant notes.

---

## 5. Phases

### Phase 0 — Spec lock (this doc)

- [x] System analysis
- [x] Confirm definitions (platoon = departmentalized rotation for Phase 1–2)
- [x] Assistants post like co-teachers

### Phase 1 — Persist organization + create UX

**Goal:** Admins declare model at class-group create/edit; field stored and displayed.

| Work | Location |
| :--- | :--- |
| Schema + migration `organizationType` | `services/classroom` |
| Create/update/list APIs | classroom service |
| Create/Edit class group UI | `src/features/classrooms/components/*` |
| Badge on `ClassGroupCard` | classrooms feature |
| i18n (EN + leaf catalogs) | `src/i18n` |
| Backfill: null → treat as `MIXED` in UI (or infer: all subject owners equal primary → `SELF_CONTAINED`, else `DEPARTMENTALIZED` / `MIXED`) | lazy infer on read |

**Acceptance:**

- [x] Create self-contained class group → `organizationType = SELF_CONTAINED`
- [x] Create departmentalized class group → `DEPARTMENTALIZED`
- [x] Card and edit modal show the type
- [x] Existing rooms with null type still load (infer badge)

### Phase 2 — Staffing defaults + assistants + sync behavior

**Goal:** Model drives teacher defaults; assistants first-class on class groups (and optionally subject rooms).

| Work | Location |
| :--- | :--- |
| `assistantIds` on create; People role `ASSISTANT` | classroom API + People |
| Sync / Quick Assign defaults by `organizationType` | classroom service + Curriculum UI |
| Optional copy of support staff to new subject rooms | classroom service (`propagateSupportStaff`) |

**Acceptance:**

- [x] Self-contained sync without per-cell teachers uses primary teacher for all subject rooms
- [x] Departmentalized sync rejects missing specialist teachers
- [x] Can add assistant on class group / People
- [x] Co-teacher still works on self-contained create

### Phase 3 — Live roster propagation

**Goal:** Homeroom membership drives subject-room student lists.

| Work | Location |
| :--- | :--- |
| On add/remove `STUDENT` on class group → fan-out | `classroomService` members |
| Repair endpoint | `POST /api/classrooms/:id/propagate-roster` |
| Tests for organization helpers | `tests/class-organization.test.ts` |

**Acceptance:**

- [x] Enroll/add student into class group → appears in child subject rooms
- [x] Remove from class group → removed from child subject rooms
- [x] Direct add to one subject room does not force homeroom membership
- [x] Repair sync endpoint available

### Phase 4 — Platoon convenience

**Goal:** Better UX for shared specialists across sections (true “platoon” staffing efficiency).

| Work | Notes |
| :--- | :--- |
| “Assign specialist to subject across selected class groups” | Quick Assign “Apply specialist” + Curriculum specialist fill |
| Surface organizationType filter | Classrooms list filter + Quick Assign org filter |
| Schedule guidance | Note in `docs/CLASS_SCHEDULE_PLAN.md` (entries still anchor to classrooms) |

**Out of scope unless separately approved:** ability-group platoons that split one class group into multiple concurrent subject cohorts.

### Phase 5 — Docs, guide, status

- [x] Update `docs/grade-level-vs-class-group.md` with organization types
- [x] This plan status → shipped Phases 0–5
- [x] Link from `IMPLEMENTATION_STATUS.md`
- [x] Platform guide / ConceptGuide polish
- [x] Features-guide wording (live roster + organization types)
- [x] Class group **Sync roster** action in UI
---

## 6. Key files

| Area | Paths |
| :--- | :--- |
| Schema | `services/classroom/prisma/schema.prisma` |
| Service | `services/classroom/src/services/classroomService.ts` |
| Routes / controller | `services/classroom/src/routes/classroomRoutes.ts`, `…/controllers/classroomController.ts` |
| Members / roles | `services/classroom/src/lib/membershipPermissions.ts` (+ validation) |
| Create / edit UI | `src/features/classrooms/components/CreateClassroomModal.tsx`, `EditClassroomModal.tsx` |
| Cards / page | `src/features/classrooms/components/ClassGroupCard.tsx`, `Page.tsx` |
| Quick assign | `src/features/classrooms/components/ClassroomWizardModal.tsx` |
| Curriculum matrix | `src/features/curriculum/components/ManageSubjectsModal.tsx` |
| Architecture doc | `docs/grade-level-vs-class-group.md` |
| Enroll clients | `services/lifecycle/src/lib/classroomClient.ts`, enrollment / registrar UIs |

---

## 7. Risks & decisions

| Topic | Recommendation |
| :--- | :--- |
| Infer vs require type for legacy data | Lazy infer on read for display; don’t rewrite DB until admin edits |
| Changing type after subject rooms exist | Confirm + optional bulk teacher rewrite |
| Assistants grading | Phase 2: treat like co-teachers for workspace; exam gradebook permissions follow existing teacher capabilities unless Identity role splits later |
| Enrollment page listing subject rooms | **Done (2026-08-05):** Enrollment page lists homeroom class groups only; subject rooms inherit on assign via roster fan-out |
| Timetable | Organization type informs UX copy only until schedule phases land |

---

## 8. Doc updates (when implementing)

| Doc | Update |
| :--- | :--- |
| This plan | Status banner → partial/done per phase |
| `docs/grade-level-vs-class-group.md` | Organization types + staffing roles + roster fan-out |
| `docs/CURRICULUM_CLASSROOMS_PLAN.md` | Changelog entry |
| `IMPLEMENTATION_STATUS.md` | Companion bullet under Curriculum & Classrooms |
| `docs/features-guide.md` | Correct dynamic membership language after Phase 3 |

---

## 9. Verification matrix (full delivery)

- [ ] Self-contained create → primary + optional co-teacher + assistant
- [ ] Sync subjects → all subject rooms owned by primary (unless overridden → Mixed)
- [ ] Departmentalized create → subject assignment requires specialists
- [ ] Specialist fill across 10-A / 10-B Math still works
- [ ] Late enroll into homeroom appears in subject rooms
- [ ] People can add/remove Co-teacher and Assistant
- [ ] Teachers remain roster view-only
- [ ] No student class-code enrollment path reintroduced
- [ ] `docker compose up --build -d classroom frontend-spa` after service/UI changes; scoped tests green

---

## 10. Decisions locked (2026-08-04)

1. **Platoon (v1)** = departmentalized subject rotation (not ability-group splits).
2. **Subject rooms** still created later via sync / quick assign (not auto on class-group create).
3. **Assistants** teach/post like co-teachers; roster stays staff-only.
4. **Legacy** class groups with null type: **auto-infer** badge from subject-room teachers.

Phases 1–3 implemented and rebuilt (`classroom` + `frontend-spa`).
