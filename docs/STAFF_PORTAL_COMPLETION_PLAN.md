# Staff Portal completion — Plan

> **Status:** Done (2026-08-05)  
> **Scope:** Production-ready Leave, Tasks, Announcements, Documents, Payroll tabs + manager task assignment + leave policy settings  
> **Companion:** `docs/STAFF_WORKFORCE_PLAN.md`, `docs/COMMS_DOCUMENTS_PLAN.md`, `docs/ATTENDANCE_INTEGRATION_PLAN.md`

## Goal

Close all honest gaps in Staff Portal self-service: assignable tasks with admin UI, enriched names, secure status updates, business-day leave parity, configurable leave policies, announcement authors, tab badges on load, payroll currency from payslip notes.

## Owning services

| Area | Service |
| :--- | :--- |
| Tasks, leave policies, task auth | **staff** |
| Announcement author join | **comms** |
| Staff Tasks page, settings card, portal UX | **frontend-spa** |

## Phases

1. **Staff service** — task enrichment; assignee-only status PATCH (managers exempt); create-task notify; leave policy GET/PUT; all leave types in defaults; priority `NORMAL` canonical.
2. **Comms** — batch Identity join for announcement `author`.
3. **Staff Tasks page** — `/{slug}/staff-tasks` for School Admin / Principal / VPA / VPI — list all tasks, assign modal.
4. **Staff Portal** — badge prefetch hook; business-day helpers; payroll currency from notes.
5. **Settings** — Leave policies card on General tab (annual days per type).
6. **Docs + tests + rebuild** — this plan, `STAFF_WORKFORCE_PLAN.md` changelog; `businessDaysBetween` test; rebuild `staff`, `comms`, `frontend-spa`, `api-gateway`.

## Acceptance

- [x] Admin assigns task → assignee sees it in Staff Portal Tasks kanban with creator name
- [x] Assignee can update status; other staff cannot update tasks assigned to someone else
- [x] Tab badges show pending tasks / unread announcements before opening those tabs
- [x] Leave modal day count matches server validation (business days)
- [x] Maternity/paternity/bereavement submit succeeds with default policies
- [x] Settings → edit sick/vacation/etc. annual days → policies persist
- [x] Announcements show author name in Staff Portal and Announcements page
- [x] Payroll tab uses currency from payslip notes (not hardcoded `$`)

### 2026-08-05 — Staff Portal production completion

- **Change:** Staff Tasks admin page; task enrichment + assignee-only PATCH; leave policies API + Settings card; announcement author join; portal badge prefetch; business-day leave parity; payroll currency from notes.
- **Services:** staff, comms, frontend-spa, api-gateway
- **UI:** `/{slug}/staff-tasks`; Settings → Leave entitlements; Staff Portal tabs
- **Status:** done
