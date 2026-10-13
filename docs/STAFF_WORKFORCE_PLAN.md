# Staff workforce — Plan

> **Status:** Done for planned v1 scope (2026-08-05) — staff directory, payroll, leave approvals, staff tasks admin page, leave policies in Settings, official payslip receipts  
> **Scope:** School staff directory, add/edit staff accounts, roles, employment fields, payroll, leave approvals  
> **Companion:** `IMPLEMENTATION_STATUS.md`, attendance ↔ payroll roadmap in `docs/ATTENDANCE_INTEGRATION_PLAN.md`, bulk hire spreadsheet in `docs/BULK_IMPORT_PLAN.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Add staff | School Admin / Principal / VPA / IT Admin open **Add staff member** on Staff Management |
| Bulk import (planned) | CSV/Excel → atomic Identity batch create; same fields/roles as Add staff — see `docs/BULK_IMPORT_PLAN.md` |
| Fields | Name, email, role, phone, DOB, gender, address, joining date, active flag, password (auto or custom), require password change |
| API | `POST /api/schools/:schoolId/staff` → Identity; returns `temporaryPassword` when generated |
| Edit | `PATCH /api/users/:id` — same profile fields + active status |
| List | `GET /api/schools/:schoolId/staff` — excludes students/parents; includes contact & employment fields |
| Payroll (admin) | School Admin / Accountant: `/:slug/payroll` — period filter, create/edit/delete, mark paid, **mark unpaid (correction)**, CSV export, payslip drawer with **official PDF** download |
| Payroll (staff) | Staff Portal → payslips list from `GET /api/users/:userId/payrolls`; official payslip PDF when PAID |
| Leave approvals | School Admin / Principal / VPA: `/:slug/leave-approval` — review pending requests; approve/reject with optional comment; balances updated on Staff service |
| Leave policies | Settings → General → **Leave entitlements**; `GET/PUT …/leave-policies` — annual days per type (SICK, VACATION, PERSONAL, MATERNITY, PATERNITY, BEREAVEMENT) |
| Staff tasks (admin) | School Admin / Principal / VPA / VPI: `/:slug/staff-tasks` — assign tasks; assignee updates status in Staff Portal |
| Staff Portal tasks | Kanban (todo / in progress / done); search + priority filter; assignee-only status updates; tab badge prefetch |
| Official payslips | Mark PAID → Staff calls Finance `POST /api/internal/receipts/issue` (`PAYSLIP`); mark unpaid → voids issued payslip via `POST /api/internal/receipts/void-by-source`; see `docs/RECEIPTS_PLATFORM_PLAN.md` |

### 2026-07-29 — Accountant mark unpaid / void payslip

- **Change:** Accountant (and School Admin) can mark a paid salary **unpaid** to correct mistakes; clears `paidAt` and voids any issued PAYSLIP receipt.
- **Services:** staff, finance, frontend-spa
- **UI / API:** `/:slug/payroll` undo action; `PUT /api/payrolls/:id` with `status: PENDING`; `POST /api/internal/receipts/void-by-source`
- **Status:** done
- **Verify:**
  - [ ] Mark payroll paid → Download official payslip → Valid
  - [ ] Mark unpaid → status Pending; verify code shows voided / download blocked
  - [ ] Edit payroll status Pending → same void behavior

### 2026-07-23 — Attendance summary for payroll

- **Change:** `GET …/staff-attendance/summary` (workdays/present/leave/missing/late + suggested deduction from Identity `payrollAttendanceRules`); Payroll create/edit Apply button; school-TZ staff clock days
- **Services:** staff, identity, academic, frontend-spa
- **Status:** done
- **Verify:** Enable rules in Settings → open Add payroll → Apply suggested deduction fills deductions field

### 2026-07-23 — Official payslip receipts

- **Change:** Marking payroll PAID calls Finance internal issue (`PAYSLIP`); payslip drawer + Staff Portal download official PDF
- **Services:** staff, finance, frontend-spa
- **UI / API:** `/:slug/payroll`; Staff Portal payroll tab; `POST /api/internal/receipts/issue`
- **Status:** done
- **Verify:** Mark paid → Download official payslip → verify QR page shows Valid

### 2026-07-23 — Leave Approvals polish

- **Change:** Executive Slate leave approvals queue; staff name join; detail drawer with optional comment; confirm before approve/reject; honest pending/approved/rejected counts; business-day duration matching Staff service
- **Services:** staff (+ frontend SPA)
- **UI / API:** `/:slug/leave-approval`; `PATCH /api/leave-requests/:id`
- **Status:** done
- **Verify:**
  - [ ] Staff submits leave from Staff Portal → appears under Pending with correct name
  - [ ] Approve → status Approved; balance used increments / pending decrements
  - [ ] Reject → status Rejected; pending days released
  - [ ] Filter/search; empty state when no matches

### 2026-07-23 — Payroll add/refresh fix

- **Change:** `setAuth` no longer clears school when the third arg is omitted (Profile save was wiping tenant → `/undefined/payroll`, empty staff, silent create failure). Onboarding `setAuth` arg order fixed. Payroll refresh uses invalidate+refetch with spinner/toast; create validates school/salary and surfaces API validation details.
- **Services:** frontend SPA
- **UI / API:** `/:slug/payroll`; Profile save; auth store
- **Status:** done
- **Verify:**
  - [ ] Save profile → school name/slug still present; Payroll still loads
  - [ ] Add payroll → toast success; row appears for that month/year
  - [ ] Refresh button spins and shows “Payroll refreshed”

### 2026-07-23 — Payroll flow polish


- **Change:** Executive Slate payroll UI; default status Pending; live net preview; mark-as-paid; unique period conflict toast; `paidAt` set when status becomes Paid; staff portal payslips no longer invent allowance/deduction splits
- **Services:** staff (+ frontend SPA)
- **UI / API:** `/:slug/payroll`; Staff Portal payslips; `POST/PUT …/payrolls`
- **Status:** done
- **Verify:**
  - [ ] Add payroll for a staff member + month/year → appears in table with joined name
  - [ ] Duplicate same staff+period → clear conflict message
  - [ ] Mark pending as paid → status Paid; finance summary treats as paid outflow
  - [ ] Export CSV for filtered period
  - [ ] Staff portal shows same basic / allowances / deductions / net (no fake line items)

### 2026-07-22 — Add staff UX + full create fields

- **Change:** Professional sectioned add-staff modal; credentials shown once after create; Identity persists DOB, gender, address, joining date, mustChangePassword, isActive
- **Services:** identity (+ frontend SPA)
- **UI / API:** Staff Management → Add staff member; `POST …/staff`
- **Status:** done
- **Verify:**
  - [ ] Add staff with auto password → credentials panel → copy works
  - [ ] Add with custom password (≥8 chars)
  - [ ] New row shows role label, phone, Active status
  - [ ] Edit updates address / joining date / inactive

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| User account, role, profile fields | **Identity** |
| Leave / payroll / staff attendance | **Staff** (separate) |
| Classroom assignment after hire | **Classroom** |

## 2. Roles (create/edit)

Selectable roles on **Add Staff**: all school roles except `SUPER_ADMIN`, `STUDENT`, `PARENT`. Labels in `src/constants/roles.ts` (`STAFF_CREATE_ROLES`, `staffRoleLabel`).

**Role reassignment for any school user** (including students/parents), with feature preview and audit: School Admin **Roles & Access** — `/{slug}/roles` — see `docs/ROLE_ACCESS_PLAN.md`. Staff Management role dropdown is School Admin–only; other managers edit profile fields without changing role.

## 3. Acceptance

- [x] Required: name, email, role, joining date
- [x] Optional: phone, DOB, gender, address
- [x] Password: generate (default) or custom; default must-change-on-login
- [x] No `window.alert` for create/update errors — toast / inline error
- [ ] Invite email (not yet — credentials shared manually)
- [ ] Class assignment still separate action for teachers
- [x] Bulk CSV/Excel import (atomic batch) — see `docs/BULK_IMPORT_PLAN.md`
