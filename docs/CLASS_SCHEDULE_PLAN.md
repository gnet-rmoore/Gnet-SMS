# Class Schedule (Timetable) — Implementation Plan

> **Status:** Phases 1–4 complete including remaining polish (2026-07-24)  
> **Scope:** Admin builds weekly class schedules for Teacher classrooms; schedules appear on School Calendar for teachers, students, parents, and selected staff  
> **Non-goals (this plan):** Replacing Academic Calendar terms (`AcademicPeriod`); ad-hoc `ClassroomMeeting`; facilities room booking; auto roll-call from timetable  
> **Companion:** `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/CLASS_ORGANIZATION_MODELS_PLAN.md`, `docs/LESSON_PLANS_PLAN.md`, `docs/ACADEMIC_GRADING_PLAN.md`, `docs/ATTENDANCE_INTEGRATION_PLAN.md`, `docs/CLASS_SCHEDULE_SLOT_AVAILABILITY_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/schedules` (admin) · `/{slug}/my-schedule` (read-only) · Calendar overlays on `/{slug}/calendar`

### Related: class organization models

Timetable entries still anchor to existing classrooms. Prefer **subject classrooms** as schedule rows for departmentalized / platoon groups (students rotate by subject). Self-contained groups may schedule against the class teacher’s subject rooms (often the same teacher across subjects). Organization type itself is not a timetable field — it guides which classrooms and teachers you schedule.

---

## 0. Product intent

Schools need a **honest weekly timetable**: which teacher teaches which classroom/subject at which time. Admins create and maintain it; everyone who needs day-to-day orientation sees it on the **School Calendar** (and a focused “My Schedule” view).

| Concept | What it is | What it is not |
| :--- | :--- | :--- |
| **Bell period** (`SchedulePeriod`) | Named time-of-day slot (e.g. Period 1 = 08:00–08:45) | Not an `AcademicPeriod` (term/semester) |
| **Bell schedule** (`BellSchedule`) | Ordered set of periods for a school year / pattern | Not the Academic Calendar wizard |
| **Timetable entry** (`TimetableEntry`) | Recurring weekly assignment: classroom + teacher + subject + day + period | Not a one-off calendar event row |
| **School Calendar event** | Day-level custom / exam / attendance overlays | Not the source of truth for class times |
| **Lesson plan** | Instructional content for a date | Not the timetable; may later *link* to a period |

### Hard product rules

1. **Admin owns the grid.** `SCHOOL_ADMIN` / `PRINCIPAL` / `VPI` create and edit schedules. `REGISTRAR` and all other roles **view only**. Teachers do **not** invent school-wide slots.
2. **Classroom is the anchor.** Every entry points at an existing `Classroom` (homeroom or subject room). Teacher must already be owner/co-teacher (or be assigned as the entry’s teacher with membership ensured).
3. **Do not overload `AcademicPeriod`.** Naming in APIs/UI must say **Schedule period** / **Bell period**. DB model names avoid `AcademicPeriod`.
4. **Derive calendar occurrences.** Do **not** insert one `SchoolCalendarEvent` per class meeting. Merge virtual “Class” events in `calendarService` (same pattern as exams / academic windows).
5. **Scope by membership.** Teachers see their teaching load; students their rooms; parents their linked children’s rooms; leadership sees school-wide. No cross-tenant leakage.
6. **Honest UI.** Empty grids with plain copy; no fake “smart conflict AI” scores. Real conflict checks only where implemented.
7. **Executive Slate** for all schedule surfaces (`FRONTEND_GUIDELINES.md`).
8. **Instructional-day aware.** When expanding to a calendar date, skip weekends and `Holiday` / `Non-Instruction` days (reuse instructional-day helpers).

---

## 1. Current state (honest)

| Area | Reality |
| :--- | :--- |
| School Calendar | Custom events + derived academic/exam/attendance overlays — **no class timetable** |
| Academic “period” | Term/semester grading window only |
| Classroom | Rooms + `ownerTeacherId` + members — **no weekly slots** |
| Lesson plan `periodLabel` | Free text (e.g. `"P2"`) — **not** an FK to bell periods |
| Docs / role copy | Some copy mentions “class schedules” aspirationally — **not implemented** |

---

## 2. Target experience

### Administration (School Admin / Principal / VPI)

1. Open **Class Schedules** → pick school year (or active year) → pick / create a **Bell schedule** (period names + start/end times).
2. Open a **weekly grid** (days × periods). Click a cell → assign Classroom + Teacher + Subject (subject prefilled from classroom when present).
3. Save; optional **copy from another classroom** or **clear day**.
4. See **conflict warnings** (same teacher two places; same classroom double-booked) before save.
5. Publish / activate the schedule for the date range (effectiveFrom / effectiveTo).

### Teacher

1. **School Calendar** shows Class events for rooms they teach (time + subject + room).
2. Optional **My Schedule** week strip (read-only) under Classroom or Schedules nav.

### Student / Parent

1. Calendar shows Class events for membership rooms (parent: selected / linked child).
2. Same read-only week view filtered to that student.

### Certain staff

| Role | Access |
| :--- | :--- |
| `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI` | Full school timetable + **edit** (bell periods + grid) |
| `REGISTRAR` | School-wide timetable **view only** (enrollment context; does not edit instructional slots) |
| `VPA`, `COUNSELOR`, `IT_ADMIN` | **Read** school-wide (ops/counseling context) via My Schedule / calendar |
| `TEACHER` | Read own entries (+ calendar) |
| `STUDENT` / `PARENT` | Read membership-scoped entries |
| Other ops roles | No schedule nav unless product later expands |

---

## 3. Owning services

| Concern | Service |
| :--- | :--- |
| Bell schedule, periods, timetable entries, expand-for-range, conflict checks | **Academic** |
| Classroom / membership / teacher validation (HTTP) | **Classroom** (+ Identity name enrich) |
| Calendar merge of Class occurrences | **Academic** `calendarService` |
| School year / instructional-day gates | **Academic** (existing) |
| SPA | `src/features/class-schedule/` + calendar-page hooks |
| Gateway | `/api/schedules`, `/api/bell-schedules`, … → academic |

**Why Academic (not Classroom):** calendar merge, instructional days, and school-year context already live here; Classroom stays collaboration/roster. Timetable stores UUID refs (`classroomId`, `teacherId`, `subjectId`) with no cross-schema FKs — same as the rest of the stack.

---

## 4. Data model (Academic schema)

```text
BellSchedule
  id, schoolId, schoolYearId?, name, isActive, createdById, timestamps

SchedulePeriod          // "bell period" — NOT AcademicPeriod
  id, bellScheduleId, schoolId
  periodNumber, label, shortCode
  startTime, endTime    // "HH:mm" school-local
  orderIndex

TimetableEntry
  id, schoolId, bellScheduleId
  classroomId, teacherId, subjectId?
  dayOfWeek             // 1=Mon … 7=Sun (or 0–6; pick one and document)
  schedulePeriodId
  effectiveFrom, effectiveTo   // YYYY-MM-DD inclusive; null to = open-ended
  locationOverride?     // optional room string if physical room ≠ classroom name
  createdById, timestamps

  @@unique([bellScheduleId, classroomId, dayOfWeek, schedulePeriodId, effectiveFrom])
  // Soft uniqueness for teacher conflicts enforced in service, not only DB
```

**Naming note:** UI strings = “Period 1”, “Bell schedule”, “Timetable”. Never label these “Academic period.”

### Optional later (out of v1)

- A/B day / rotating cycle calendars  
- Physical `Room` entity in Ops  
- Link `LessonPlan.schedulePeriodId` FK (replace free-text `periodLabel`)  
- Substitute teacher / one-off cancellations table

---

## 5. APIs (target)

| Method | Path | Who | Purpose |
| :--- | :--- | :--- | :--- |
| GET/POST | `/api/schools/:schoolId/bell-schedules` | Admin write / broad read | List / create bell schedules |
| PATCH/DELETE | `/api/bell-schedules/:id` | Admin | Update / archive |
| PUT | `/api/bell-schedules/:id/periods` | Admin | Replace ordered period list |
| GET | `/api/schools/:schoolId/timetable` | Scoped read | Query entries (`classroomId`, `teacherId`, `studentId`, week) |
| PUT | `/api/schools/:schoolId/timetable` | Admin | Bulk upsert entries for a grid (atomic-ish) |
| POST | `/api/schools/:schoolId/timetable/validate` | Admin | Conflict report without save |
| GET | `/api/schools/:schoolId/timetable/expand?from=&to=` | Scoped read | Concrete occurrences for calendar |
| DELETE | `/api/timetable-entries/:id` | Admin | Remove one cell |

**Auth pattern:** `authenticate` + `requireRoles` + `requireSchoolMembership` / tenant checks. Expand/list apply **visibility filters** in the service (not “return all, filter in UI”).

### Calendar integration

Extend `getCalendarEvents` (and/or add query `?include=classes`):

1. Load active `TimetableEntry` rows effective in month/range.  
2. For each date in range that is instructional, if `dayOfWeek` matches, emit a derived DTO:

| Field | Value |
| :--- | :--- |
| `title` | `{subjectName} · {classroomName}` |
| `time` | `{startTime}–{endTime}` |
| `category` | `Class` (new; **not** Non-Instruction) |
| `location` | classroom name or override |
| `description` | Teacher display name |
| Deep link | `/{slug}/classroom/:id` or schedules detail |

3. **Do not** persist these as `SchoolCalendarEvent`.  
4. Respect role scope (teacher/student/parent filters).  
5. Month grid may show a compact count or first N Class chips; day/week detail lists full times.

Add `Class` to frontend category filters (distinct color token in slate/indigo family — not fake neon).

---

## 6. Frontend

| Piece | Path |
| :--- | :--- |
| Admin builder page | `src/pages/School/ClassSchedulePage.tsx` → `src/features/class-schedule/` |
| Types / API | `features/class-schedule/{types,api}.ts` |
| Grid | Days × periods matrix; cell modal for assign |
| Bell editor | Ordered periods with time inputs |
| Calendar | `features/calendar-page` — ingest `Class` category; optional week agenda |
| Nav | `navByRole.ts` + `App.tsx` → `/{slug}/schedules` |

**IA suggestion**

- Nav label **Class Schedules** near Classrooms / Academic Calendar for admin roles.  
- Teachers/students/parents: no heavy builder — Calendar + optional read-only **My Schedule** tab on Classroom hub or Calendar header.

---

## 7. Phases

| Phase | Deliverable | Status |
| :--- | :--- | :--- |
| **0 — Plan** | This document + status companion link | **Done** |
| **1 — Foundation** | Prisma models + migrations/`db push`; CRUD bell schedules + periods; empty admin page shell; gateway routes; role guards; unit tests for conflicts helpers | **Done** |
| **2 — Timetable grid** | Bulk upsert entries; classroom/teacher/subject pickers; conflict validate; active date range; Executive Slate grid | **Done** |
| **3 — Calendar + scoped views** | Derive Class events in `calendarService`; category filter; teacher/student/parent scoping; parent children union | **Done** |
| **4 — Polish** | Copy schedule between classrooms; print/PDF week; calendar deep links; Lesson Plan bell-period picker; My Schedule; effective date range UI | **Done** |

---

## 8. Flows / rules

### Create / edit timetable

```text
Admin opens Schedules
  → ensure BellSchedule (create default periods if none)
  → edit grid for classroom OR whole-school view
  → validate conflicts
  → PUT timetable
  → calendar expand uses new rows immediately
```

### Conflict rules (Phase 2+)

| Rule | Severity |
| :--- | :--- |
| Same `teacherId` + `dayOfWeek` + overlapping period times | Block save (or hard warn) |
| Same `classroomId` + `dayOfWeek` + `schedulePeriodId` | Block (unique) |
| Teacher not a member / not `TEACHER` role | Block |
| Classroom wrong `schoolId` | Block |
| Entry outside bell schedule’s school year (if set) | Warn |

### Visibility

| Actor | Sees |
| :--- | :--- |
| Admin / Principal / VPI | All active entries (**write**) |
| Registrar | All active entries (**read only**) |
| VPA / Counselor / IT Admin | All active entries (read) |
| Teacher | Entries where `teacherId = me` **or** classrooms I own/co-teach |
| Student | Entries for classrooms where I am a member |
| Parent | Union of linked children’s classroom entries (require Identity parent-link assert) |

### Changelog (2026-07-31) — Write owners

| Change | Detail |
| :--- | :--- |
| Writers | `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI` only |
| Registrar | Removed from schedule write (API + Class Schedules UI view-only) |
| Why | Timetable is academic leadership; registrar owns enrollment/placement, not period assignments |
| Verify | Registrar opens `/{slug}/schedules` → banner + no Save; Principal can still edit |

---

## 9. Acceptance

### Phase 1–2

- [x] Admin can define bell periods with real start/end times  
- [x] Admin can fill a weekly grid for a classroom + teacher + subject  
- [x] Conflicts for double-booked teacher/classroom are reported  
- [x] `AcademicPeriod` (grading) remains untouched and clearly separate in UI copy  
- [x] Tests cover service conflict helpers  

### Phase 3

- [x] School Calendar shows Class occurrences on instructional days only  
- [x] Teacher / student / parent each see only their scoped Class events  
- [x] Custom events, exams, holidays still work; Class does not mark days non-instructional  
- [x] No mass insert into `SchoolCalendarEvent` for timetable  

### Phase 4

- [x] Copy + print usable for one classroom week  
- [x] Calendar deep link opens the classroom  
- [x] `IMPLEMENTATION_STATUS` / this plan status banners updated to match shipped phases  
- [x] Effective from/to date range on admin grid (+ warn outside academic year window)  
- [x] Week PDF download (jsPDF)  
- [x] Read-only **My Schedule** for teachers/students/parents (+ selected staff)  
- [x] Lesson Plan optional `schedulePeriodId` + bell period picker (label still denormalized)  

---

## 10. Verification (when implementing)

```bash
# Scoped tests (add alongside)
npm run test   # or a new npm run test:schedule when added

docker compose up --build -d academic api-gateway frontend-spa
```

Smoke:

1. Login as school admin → `/schedules` → create bell + one Monday Period 1 entry.  
2. Login as that teacher → `/calendar` → see Class event that day/time.  
3. Login as student in that room → same.  
4. Login as unrelated teacher → must **not** see that entry.  
5. Mark a Holiday on that date → Class occurrence omitted for that day.

---

## 11. Change log

### 2026-07-24 — Initial plan

- **Change:** Documented class timetable product (bell periods + weekly entries + calendar derivation); no code yet.  
- **Services:** Academic (owner), Classroom/Identity (validation/enrichment), gateway, SPA.  
- **UI / API:** Target `/{slug}/schedules`; calendar category `Class`.  
- **Status:** draft (plan only)  
- **Verify:** N/A until Phase 1.

### 2026-07-24 — Phases 1–4 implementation

- **Change:** Admins manage bell periods + weekly classroom timetable; School Calendar shows derived `Class` events (scoped by role); copy/print supported.  
- **Services:** academic, api-gateway, frontend-spa  
- **UI / API:** `/{slug}/schedules`; `/api/schools/:id/bell-schedules`, `/timetable`, calendar merge  
- **Status:** done  
- **Verify:** `npm run test:schedules`; admin save grid → teacher calendar shows Class chip; holiday day omits Class.

### 2026-07-24 — Remaining polish

- **Change:** Effective date range UI + academic-year warn; My Schedule page; week PDF; Lesson Plan `schedulePeriodId` + bell period picker.  
- **Services:** academic, frontend-spa  
- **UI / API:** `/{slug}/my-schedule`; lesson plan builder period select  
- **Status:** done  
- **Verify:** Admin sets effective from/to; teacher opens My Schedule + PDF; lesson plan picks Period 2 from bell list.
