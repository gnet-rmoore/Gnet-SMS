# Academic calendar & grading setup — Plan

> **Status:** Academic calendar setup + Exams integration shipped (2026-07-23)  
> **Scope:** School academic year pattern (terms/semesters), period dates, exam component weights; scheduled exams linked to components  
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| View current | If an active calendar exists, Staff see **Current setup** (pattern, periods, exam weights) |
| First-time setup | 4-step wizard: template → period dates/weights → exam components → review → apply |
| Edit | Update existing periods/components in place |
| Replace | New template run; applying deactivates the previous active calendar |

### 2026-07-22 — Calendar setup UX + persist/view

- **Change:** Professional setup wizard; always show active calendar when present; apply stays on view (no redirect to dashboard); templates seed default dates; API returns nested periods/components
- **Services:** academic (+ frontend SPA)
- **UI / API:** `/{slug}/settings/academic-calendar`; `GET/POST /api/schools/:schoolId/calendar`
- **Status:** done
- **Verify:**
  - [ ] No calendar → setup wizard with templates
  - [ ] Apply THREE_TERM → overview shows periods & weights
  - [ ] Reload page → same current setup visible
  - [ ] Edit calendar → save changes → overview updates
  - [ ] Replace setup → apply → previous marked inactive, new active

### 2026-07-22 — Period date UX (field errors + distribute)

- **Change:** Field-level validation on period/exam forms; school-year range + “Distribute evenly”; cascading neighbor dates when one period changes; friendly date display (`Feb. 12, 2026`) via native picker overlay
- **Services:** frontend SPA only
- **UI / API:** `/{slug}/settings/academic-calendar` (steps 2–3)
- **Status:** done
- **Verify:**
  - [ ] Invalid/overlapping dates show messages under the affected fields (not only a top list)
  - [ ] Set year start/end → Distribute evenly → periods fill back-to-back
  - [ ] Change one period end → next period start updates to the following day
  - [ ] Date fields show readable labels like `Feb. 12, 2026` while storing ISO dates

### 2026-07-22 — Exam component date UX

- **Change:** Per-period exam window + “Distribute evenly” for components; cascade neighbor exam dates; friendly datetime for grade deadlines (`Feb. 12, 2026, 5:00 PM`)
- **Services:** frontend SPA only
- **UI / API:** Academic calendar setup step 3
- **Status:** done
- **Verify:**
  - [ ] Set exam window → Distribute evenly → component dates fill within the period
  - [ ] Change one component end → next component start updates
  - [ ] Grade deadline opens a picker and shows a readable date/time

### 2026-07-23 — Exams ↔ Academic Calendar integration

- **Change:** Schedule exams from period → assessment component; dates constrained to period; list enriched with period/component; School Calendar exam overlays deep-link to exam details; Exams page Executive Slate + calendar strip + period filters
- **Services:** academic (+ frontend SPA)
- **UI / API:** `/{slug}/exams`; `GET/POST /api/schools/:schoolId/exams`; school calendar overlays
- **Status:** done
- **Verify:**
  - [ ] No calendar → Exams CTA to Academic Calendar; Schedule disabled
  - [ ] Schedule exam → pick period + component → dates prefill and stay within period
  - [ ] Exam cards show period · component; period filter chips work
  - [ ] School Calendar shows scheduled exam with Open exam → details
  - [ ] Exam details header shows calendar link + status

## 1. Owning service

| Concern | Service |
| :--- | :--- |
| Calendar pattern, periods, exam components | **Academic** |

## 2. Write roles

Create/replace calendar: `SCHOOL_ADMIN`, `PRINCIPAL`, `REGISTRAR` (API). UI also allows VPI/VPA for edit actions where period/component PATCH allows academic staff.

## 3. Acceptance

- [x] Current active calendar visible after setup
- [x] Templates: semester, two-term, three-term, custom
- [x] Annual period weights ≈ 100%; component weights ≈ 100% per period
- [ ] Grade legend / scale setup (separate screen — not this flow)
