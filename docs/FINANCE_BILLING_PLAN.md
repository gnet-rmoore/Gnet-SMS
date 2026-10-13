# Finance & Fee Management — Plan

> **Status:** Complete for ledger ops (2026-07-23)  
> **Scope:** School admin / accountant fee management; student & parent fee portal  
> **Companion:** `IMPLEMENTATION_STATUS.md`, admission checkout in `ONBOARDING_AND_ADMISSION_PLAN.md`, fee grade/division scope in `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`, partial/installment pay in `docs/FEE_PARTIAL_PAYMENTS_PLAN.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Invoices | Create, list, filter, collect (cash/check), void pending, **server-issued** official PDF receipt + ledger export |
| Templates | Server-backed fee templates per school (create / edit / delete) |
| Batch billing | Sequential invoice create for all students or one class |
| Portal pay | Student/parent opens real checkout session (Stripe or console mock) |
| Reminders | Logged for staff follow-up; email/SMS **not** configured (honest toast) |
| Admission fees | Unchanged — entrance fees via lifecycle + checkout |
| Official receipts | Auto-issue on PAID; QR verify at `/verify/receipt/:code` — see `docs/RECEIPTS_PLATFORM_PLAN.md` |


## Follow-up: Grade / Division / eligibility (planned)

See **`docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`** — templates scoped to Grade Level + New/Returning cohort and Division (HS/MS/Elementary/Prep); batch apply; server reject + accountant toast on mismatch. **Phases A–D shipped (2026-07-23).**

## Follow-up: Partial / installment payments (planned)

See **`docs/FEE_PARTIAL_PAYMENTS_PLAN.md`** — families pay little by little against one invoice; payment history, balance, `PARTIAL` status, per-payment receipts, portal custom checkout amount, **school-wide Transaction history log**, write-off, legacy backfill, min payment. **Phases A–D shipped (2026-07-30); installment schedules deferred.**

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| FeePayment, FeeTemplate, Expense, checkout | `finance` |
| Gateway route for `/api/schools/:id/fee-templates` | `api-gateway` |
| UI `/:slug/fees` | `frontend-spa` |
| Entrance fee create / fee-paid notify | `lifecycle` → finance |

## 2. Flows / rules

### Statuses

- `PENDING` — collectible / payable
- `PAID` — settled (`paidAt` set); PDF receipt available
- `VOIDED` — no longer collectible; remains in ledger; excluded from collection KPIs

### Roles

| Role | Access |
| :--- | :--- |
| SCHOOL_ADMIN, ACCOUNTANT | Full Fee Management (overview, ledger, templates, batch) |
| STUDENT | Own fees via `/api/my-fees`; checkout pay |
| PARENT | Linked children’s fees; checkout pay |
| PRINCIPAL / REGISTRAR / VPA | API read where previously allowed; no Fees nav item |

### Templates

- Stored in Finance DB (`FeeTemplate`), not localStorage
- Used to prefill single invoice and batch forms

### Checkout

- Portal **Pay** calls `POST /api/fees/:id/checkout` then redirects to Stripe or `/checkout/mock`
- Console mock completes via `POST /api/public/checkout/complete` and can return to Fees with `?paid=1`

## 3. Change log

### 2026-07-30 — Partial / installment payments shipped

- **Change:** Families can pay fees little by little; invoices track `amountPaid`/`PARTIAL`/balance; school-wide Transaction history; per-payment receipts; portal custom checkout amount
- **Services:** finance, api-gateway, frontend-spa
- **UI / API:** `/{slug}/fees?tab=history`; see `docs/FEE_PARTIAL_PAYMENTS_PLAN.md`
- **Status:** done (Phases A–C)
- **Verify:** Collect partial → history shows before/after balance → settle → PAID

### 2026-07-30 — Partial / installment payments plan

- **Change:** Documented plan for installment (“small small”) fee payments: invoice + payment txns, balance tracking, cash desk + portal
- **Services:** finance, api-gateway, frontend-spa (planned)
- **UI / API:** see `docs/FEE_PARTIAL_PAYMENTS_PLAN.md`
- **Status:** superseded by implementation entry above
- **Verify:** N/A

### 2026-07-29 — Edit fee templates (Accountant + Admin)

- **Change:** Accountants and School Admins can **edit** existing fee templates (amount, scope, cohort, year key, description). Existing invoices are unchanged.
- **Services:** finance, frontend-spa
- **UI / API:** `/:slug/fees` → Templates → edit; `PATCH /api/schools/:schoolId/fee-templates/:id`
- **Status:** done
- **Verify:** Edit a template amount → save → card shows new amount; create invoice from that template uses updated amount

### 2026-07-23 — Accountant finance dashboard

- **Change:** Replaced JSON stub with Executive Slate finance home: KPIs from `/finance/summary`, cash-flow + expense-mix charts, shortcuts to Fees / Expenses / Payroll; soft-fail if summary missing; no fake % deltas
- **Services:** frontend-spa
- **UI / API:** `/:slug/dashboard` (ACCOUNTANT); uses existing `GET …/finance/summary`
- **Status:** done
- **Verify:** Log in as accountant → dashboard shows real totals/charts or empty states; links open fees/expenses/payroll

### 2026-07-23 — Official fee receipts (server-issued)

- **Change:** Collect/pay/checkout auto-issues Finance `FEE_PAYMENT` receipt (PDF + QR); Fees UI downloads server PDF; client jsPDF path removed for official receipts (ledger export remains labeled export)
- **Services:** finance, api-gateway, frontend-spa
- **UI / API:** Official receipt download; `/verify/receipt/:code`; see `docs/RECEIPTS_PLATFORM_PLAN.md`
- **Status:** done
- **Verify:** Collect fee → Official receipt → open verify URL → Valid

### 2026-07-23 — Fees + Expenses reliability fixes

- **Change:** Soft-fail secondary list loads; Fees classroom enrichment via Classroom members (Identity no longer embeds `classroomMembers`); school-session guards + toasts on mutations; refresh with try/finally + invalidate/refetch; invoice amount validation; finance summary soft-fails staff payrolls; expense budget localStorage parse safety; P&L export toast when summary missing
- **Services:** finance (+ frontend SPA)
- **UI / API:** `/:slug/fees`, `/:slug/expenses`
- **Status:** done
- **Verify:**
  - [ ] Fees → class filter / batch-by-class shows real classrooms after enrollments
  - [ ] Create invoice / collect / void with clear errors if session missing
  - [ ] Fees & Expenses refresh spin + toast; page still loads if payroll/summary blips
  - [ ] Expense create with invalid amount → toast; budget save without school → error toast

### 2026-07-23 — Fee management harden + Executive Slate

- **Change:** Server templates; void invoices; honest reminders; portal checkout (no fake card form); slate UI polish for Fees / Fee Management
- **Services:** finance, api-gateway, frontend-spa
- **UI / API:** `/:slug/fees`; `/api/schools/:schoolId/fee-templates`; `POST …/fees/:id/void`
- **Status:** done
- **Verify:**
  - Admin: create template → new invoice → collect → void another pending invoice
  - Portal: Pay opens checkout; after mock pay, ledger shows PAID
  - Reminder toast does **not** claim email was sent

## 4. Acceptance

- [x] Templates persist across browsers/devices (DB)
- [x] Void blocks collect/pay
- [x] No fake card fields in Fees drawer
- [x] Executive Slate tokens on Fees surfaces
- [ ] Email/SMS reminders via Comms (future)
- [x] Partial / installment payments — see `docs/FEE_PARTIAL_PAYMENTS_PLAN.md` (Phases A–C)
- [ ] Refunds / credit notes (future; after partials)

### 2026-08-06 — Production Stripe env (near-complete plan Phase 6)

- **Student fee checkout:** configure `STRIPE_SECRET_KEY`, webhook secret, and SPA `VITE_STRIPE_PUBLISHABLE_KEY` in production. Console/mock checkout remains valid for demos.
- **Payroll:** record-keeping + payslip PDFs only — **not** Stripe Connect payouts.
- **Platform SaaS:** optional Identity platform billing keys when enabling super-admin checkout.
