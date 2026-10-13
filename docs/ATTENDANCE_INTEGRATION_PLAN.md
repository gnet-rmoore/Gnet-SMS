# Attendance — Platform Plan & Integrations

> **Status:** Phases 0–4 + teacher roll call UX (2026-07-23)  
> **Scope:** Student attendance (Lifecycle), staff clock-in (Staff), links to School Calendar and Payroll  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/STAFF_WORKFORCE_PLAN.md`, `docs/ACADEMIC_GRADING_PLAN.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Student roll call | Lifecycle sessions + EXCUSED; school-TZ day; same-day upsert; name enrichment |
| Teacher roll call UI | Full-page sheet; keyboard marks; live tallies; preload today; own-class sessions |
| Instructional gate | Weekends + calendar `Holiday` / `Non-Instruction` block roll call (configurable) |
| Calendar publish | Saving roll call upserts an `Attendance` calendar event (idempotent `sourceKey`) |
| Staff summary | `GET …/staff-attendance/summary` — workdays, present, leave, missing, late, suggested deduction |
| Payroll UI | Create/edit show summary; **Apply suggested deduction** only when rules enabled |
| School settings | Attendance & payroll card on School info |

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| Student sessions + marks | **Lifecycle** |
| Instructional days + calendar events | **Academic** |
| Classroom roster | **Classroom** |
| Staff clock-in / leave / payroll summary | **Staff** |
| School TZ + `payrollAttendanceRules` | **Identity** |

## 2. Change log

### 2026-08-05 — Staff portal attendance history pagination

- **Change:** Staff Portal attendance log loads **31 calendar days per page** instead of 90 days at once. Today's clock widget uses `?scope=today`; history uses `?page=N` with Older/Newer controls. Legacy `?days=` capped at 31 for self-scoped requests.
- **Who:** All staff roles using Staff Portal time clock
- **Services:** staff, frontend-spa
- **UI / API:** `GET …/staff-attendance?scope=today`; `GET …/staff-attendance?page=1` → `{ items, page, pageSizeDays, hasMore }`
- **Status:** done
- **Verify:**
  - [ ] Attendance log shows at most ~31 days of rows on first load
  - [ ] Older loads previous 31-day window; Newer returns when not on page 1
  - [ ] Clock in/out still updates today's widget without loading full history

### 2026-08-05 — Staff portal clock-in persistence & photo timing

- **Change:** Staff clock-in/out now upserts by school-local day range (fixes records not found on check-out). Verification photo is captured when the user taps Clock in/out, before the confirm dialog.
- **Who:** All staff roles using Staff Portal time clock
- **Services:** staff, frontend-spa
- **UI / API:** `POST /api/schools/:id/staff-attendance` (self-scoped)
- **Status:** done
- **Verify:**
  - [ ] Clock in → refresh → today shows check-in time
  - [ ] Clock out → log row persists with both times
  - [ ] Photo taken at button tap (before confirm), not after

### 2026-07-23 — Teacher roll call UX

- **Change:** Full-page roll call sheet (replaces cramped modal): keyboard marking (↑↓, Space, 1–4 / P/L/A/E, ⌘S), live P/L/A/E tallies, sticky header + save bar, class quick-start cards, preload today’s existing marks, school-TZ save date (aligned with instructional gate), overwrite confirm on retake, teachers see only their classroom sessions
- **Who:** Teachers (+ admins who take roll call)
- **Services:** frontend-spa (Lifecycle APIs unchanged)
- **UI:** `/{slug}/attendance` → `RollCallSheet`; hub “Your classes today”
- **Status:** done
- **Verify:**
  - [ ] Teacher opens Attendance → class card starts roll call for that room
  - [ ] Mark with keyboard; tallies update; save uses school local date
  - [ ] Re-open same class today → prior marks load; confirm before overwrite
  - [ ] Teacher Sessions list only shows their classrooms

### 2026-07-23 — Phases 1–4 integration

- **Change:** Instructional-day API; school-TZ attendance days; roll-call gate; calendar Attendance events; staff attendance summary with approved leave; payroll suggestion panel; school settings for rules
- **Services:** academic, identity, lifecycle, staff, frontend-spa (+ compose `ACADEMIC_URL` for lifecycle/staff)
- **UI / API:**
  - `GET /api/schools/:id/calendar/instructional-day?date=`
  - `GET /api/schools/:id/calendar/instructional-days?from=&to=`
  - `GET /api/schools/:id/staff-attendance/summary?userId=&year=&month=`
  - Settings → Attendance & payroll; Calendar categories Holiday / Non-Instruction / Attendance
- **Status:** done
- **Verify:**
  - [ ] Add Holiday on calendar → Take roll call blocked with clear toast
  - [ ] Save roll call on a weekday → Attendance event appears on calendar (opens Attendance)
  - [ ] Payroll → select staff + month → summary counts; with rules enabled, Apply fills deductions
  - [ ] Settings toggles persist after save

### 2026-07-23 — Student roll call harden (Phase 0)

- **Change:** Post-microservices roll call works end-to-end (enrichment, EXCUSED, upsert, role views, Slate UI)
- **Status:** done

## 3. Rules (shipped)

- **Non-instruction:** Sat/Sun + events with category `Holiday` or `Non-Instruction`
- **Gate:** Default on via `blockNonInstructionalRollCall`
- **Calendar publish:** Default on via `publishRollCallToCalendar`; `sourceKey = attendance:{id}`
- **Payroll suggestions:** Off by default; never auto-writes deductions
- **Leave:** Approved leave days count toward `leaveDays`, not `missingDays`
- **Student attendance** does not affect staff payroll

## 4. Acceptance

- [x] Instructional-day check API
- [x] Roll call blocked on holiday/weekend when gate enabled
- [x] Roll call appears once on calendar when publish enabled
- [x] Staff summary includes leave + missing
- [x] Payroll Apply is explicit; settings control amounts
