# Class Schedule — Slot Availability & Workload-Aware Planning

> **Status:** Implemented (2026-10-17)  
> **Scope:** Help organizers find **available slots** (bell period × weekday) and build timetables that give teachers rest, keep classrooms occupied, and respect the subjects assigned to each class/teacher  
> **Companion:** `docs/CLASS_SCHEDULE_PLAN.md`, `docs/CLASSROOM_MANAGEMENT_PLAN.md`, `docs/CURRICULUM_CLASSROOMS_PLAN.md`, `docs/CLASS_ORGANIZATION_MODELS_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/schedules` (admin/principal/VPI builder)  
> **Owner service:** `services/academic` (timetable domain) — reads Classroom + Identity for validation/context

---

## 0. Product intent

The base timetable (`CLASS_SCHEDULE_PLAN.md`) answers *“who teaches what, when”*. This plan answers the organizer’s next questions:

1. **“Which teachers are free in Period 3 on Tuesday?”** — real availability, not guesswork.
2. **“Will this assignment give the teacher back-to-back classes with no rest?”**
3. **“Which periods is this class still empty?”** — class occupancy / fill rate.
4. **“What is the best teacher + subject for this slot?”** — deterministic, explainable suggestions.
5. **“Does this slot fit the subject assigned to this class?”** — subject-aware constraints.

### Hard product rules (inherited + new)

1. **Honest UI.** Suggestions are produced by a **deterministic heuristic** (conflict-free + load balancing + rest gaps). They are **not** described as AI; every suggestion carries human-readable reasons.
2. **Advisory, never authoritative.** Suggestions never overwrite existing cells and are never auto-saved. The organizer reviews and clicks Save.
3. **Conflict checks stay real.** Availability/suggestions reuse the same time-overlap + double-book rules already enforced on save.
4. **Subject-aware.** A class with a fixed `subjectId` only suggests that subject; otherwise grade-level `SubjectOffering` rows constrain suggestions; a teacher who already teaches/owns the subject ranks higher.
5. **Rest matters.** Back-to-back streaks and overloaded days are surfaced as warnings; the planner avoids extending a streak past `maxConsecutive`.
6. **Write-gated.** All three endpoints require `action.schedules.manage` (or `SCHOOL_ADMIN` / `PRINCIPAL` / `VPI`), matching `putTimetable`.

---

## 1. Concepts

| Term | Meaning |
| :--- | :--- |
| **Slot** | One bell period on one ISO weekday (`dayOfWeek` 1=Mon … 5=Fri × `schedulePeriodId`) |
| **Availability** | For a slot: which teachers are `AVAILABLE`/`BUSY`, their day load, and rest gap before/after |
| **Rest gap** | Quiet gap between a teacher’s consecutive lessons ≥ `restGapMinutes` (default 10) |
| **Back-to-back streak** | Consecutive lessons with only short gaps (default: more than 3 in a row is flagged) |
| **Subject fit** | `OWN_CLASS` (owns this classroom) · `TEACHES_SUBJECT` (already teaches it) · `NONE` |
| **Occupancy** | Classroom lessons ÷ (periods × weekdays) → fill rate |
| **Suggestion** | Ranked teacher+subject for an empty cell, with reasons |

Tunable thresholds live in `DEFAULT_SCHEDULING_PREFS` (`services/academic/src/lib/availabilityHelpers.ts`):

| Pref | Default | Effect |
| :--- | :--- | :--- |
| `restGapMinutes` | 10 | Gap between lessons that counts as real rest |
| `maxConsecutive` | 3 | Streak length beyond which a warning fires / planner rotates teacher |
| `maxLessonsPerDay` | 6 | Lessons/day beyond which an overload warning fires |
| `maxTeacherDayLoad` | 8 | Hard cap; a teacher is not suggested beyond this in a day |

---

## 2. Architecture

### Pure logic (unit-testable, no I/O)

`services/academic/src/lib/availabilityHelpers.ts`

| Function | Purpose |
| :--- | :--- |
| `gapMinutes(aEnd, bStart)` | Rest minutes between two times (null on invalid) |
| `teacherDayProfile(entries, periods, teacherId, day)` | Lessons, longest streak, occupied periods for one day |
| `computeTeacherSlotAvailability(input)` | Per-teacher status, load, rest, subject fit, and **ranking score** for one slot |
| `freePeriodIdsForClassroom(periods, entries, classroomId, day)` | Ordered period ids with no lesson for a class |
| `computeWorkloadWarnings(entries, periods, prefs?)` | `LONG_STREAK` / `OVERLOADED` warnings per teacher/day |
| `computeClassroomOccupancy(entries, periods, classrooms, gridDays)` | Fill rate per classroom |
| `suggestAssignments(input)` | Teacher+subject for every empty cell of one class, rest- and load-aware |

### Service layer

`services/academic/src/services/scheduleService.ts`

| Method | Responsibility |
| :--- | :--- |
| `getSlotAvailability(user, query)` | Loads bell + school-wide entries, teacher roster (`Identity`), classrooms (`Classroom`); returns availability, class free periods, and applicable subjects |
| `getScheduleHealth(user, query)` | School-wide workload warnings + per-classroom occupancy for the active bell |
| `suggestClassSchedule(user, input)` | Builds suggestions for every empty cell of one classroom |

Module-level helpers: `mergeTeacherCandidates` (staff ∪ teachers referenced by entries), `subjectsForClassroom`, `allowedSubjectIdsForClassroom`.

### HTTP layer

`services/academic/src/controllers/scheduleController.ts` + `services/academic/src/routes/scheduleRoutes.ts`

| Method | Path | Roles | Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/schools/:schoolId/timetable/availability` | write roles | Query: `bellScheduleId`, `dayOfWeek`, `schedulePeriodId`, `classroomId?`, `subjectId?` |
| `GET` | `/api/schools/:schoolId/timetable/health` | write roles | Query: `bellScheduleId` |
| `POST` | `/api/schools/:schoolId/timetable/suggest` | write roles | Body: `{ bellScheduleId, classroomId }` |

Gateway routes `timetable/*` to the academic service and the entitlement rule gates them under feature `schedules` (no gateway changes required).

### Frontend

`src/features/class-schedule/{types.ts,api.ts,Page.tsx}`

- **Cell modal:** on open, fetch availability for that slot.
  - Teacher list is ranked best-first and annotated: `✓ Free · 2 lessons today · teaches this subject · rest 30 min` or `✕ Busy (Grade 8 · Math 08:00–08:45)`.
  - Warning line when the selected teacher is busy (still overridable).
  - Chips list the class’s **free periods** for that weekday.
  - Subject dropdown is narrowed to the class subject / grade offerings.
  - **Suggest best** button picks the top available teacher + preferred subject.
- **Auto-fill** (header): calls `/timetable/suggest`, fills only **empty** cells into the draft, marks the grid dirty, and toasts the count. Never overwrites manual cells.
- **Occupancy line:** `Class occupancy this week: 12/40 slots (30%)`.
- **Workload & rest check panel:** lists `LONG_STREAK` / `OVERLOADED` warnings (or a green all-clear), refreshed after every Save.

---

## 3. Ranking model (explainable, not AI)

For one slot each candidate teacher is scored:

| Signal | Effect |
| :--- | :--- |
| Available vs busy | `+100` / `−50` |
| Owns the classroom (`OWN_CLASS`) | `+30` (+`15` owner bonus) |
| Already teaches the subject | `+20` |
| Lighter day load | `+(maxLessonsPerDay − lessons) × 4` |
| Rest before / after the slot | `+8` each |
| Already at/over the streak cap | `−15` |
| Requested subject not taught by them | `−25` |

`computeTeacherSlotAvailability` returns the components, so the UI can show *why*. `suggestAssignments` uses the same scoring plus hard filters (skip busy, skip over `maxTeacherDayLoad`, skip teachers already at `maxConsecutive`) and applies each pick to a working copy so later cells see earlier ones.

---

## 4. Acceptance

- [x] Organizer can see, per slot, which teachers are **free/busy**, their day load, and rest gaps
- [x] Availability is **conflict-accurate** (time-overlap + classroom double-book aware)
- [x] Suggestions respect the **class subject** or **grade offerings**
- [x] Suggestions prefer the **class teacher** and teachers who already teach the subject
- [x] Suggestions **balance load** and **rotate** a teacher once their streak hits the cap (rest preserved)
- [x] **Auto-fill** only fills empty cells and never auto-saves
- [x] **Workload warnings** (back-to-back streak, overloaded day) and **class occupancy** are visible to organizers
- [x] All endpoints write-gated (`action.schedules.manage` / leadership roles)
- [x] Pure helpers covered by `npm run test:schedules`

---

## 5. Verification

```bash
npm run test:schedules     # pure availability / suggestion / workload helpers
npm run lint               # SPA typecheck (tsc --noEmit)

# academic service typecheck (requires `npm run prisma:generate` in services/academic)
cd services/academic && npm run lint
```

Smoke (school admin):

1. Open `/{slug}/schedules`, pick a classroom.
2. Click an empty cell → teacher list shows Free/Busy + load + rest; free-period chips show the day.
3. Select a busy teacher → amber warning appears; **Suggest best** selects a free one.
4. Click **Auto-fill** → empty cells populate; grid shows unsaved; **Save** persists.
5. Assign several adjacent periods to one teacher → **Workload & rest check** flags the streak.
6. Check the occupancy line updates after Save.

---

## 6. Change log

### 2026-10-17 — Slot availability & workload-aware planning

- **Change:** Added slot availability, class occupancy, teacher workload/rest warnings, per-slot teacher ranking, and deterministic Auto-fill suggestions constrained by class subject / grade offerings.  
- **Services:** academic (logic + API), frontend-spa (builder UI).  
- **Files:** `services/academic/src/lib/availabilityHelpers.ts` (new), `services/academic/src/services/scheduleService.ts`, `services/academic/src/controllers/scheduleController.ts`, `services/academic/src/routes/scheduleRoutes.ts`, `src/features/class-schedule/{types.ts,api.ts,Page.tsx}`, `tests/class-schedule.test.ts`.  
- **API:** `GET /timetable/availability`, `GET /timetable/health`, `POST /timetable/suggest`.  
- **Status:** done  
- **Verify:** `npm run test:schedules`; admin availability + Auto-fill + workload panel smoke.
