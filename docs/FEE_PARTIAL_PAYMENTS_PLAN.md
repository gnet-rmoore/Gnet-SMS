# Fee partial / installment payments — Plan

> **Status:** Phases A–D implemented (2026-07-30) — partial payments, transaction history, write-off, legacy backfill, min payment (installment *schedules* still deferred)  
> **Scope:** Track school fees when families pay little by little (cash desk + portal checkout); balance, per-invoice history, **school-wide transaction history log**, and per-payment receipts  
> **Companion:** `docs/FINANCE_BILLING_PLAN.md`, `docs/RECEIPTS_PLATFORM_PLAN.md`, `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **UI:** `/{slug}/fees` (Ledger, Collect, Overview, **Transaction history**); student/parent Fees portal

---

## 0. Product intent (plain English)

Today a fee invoice is **all-or-nothing**: accountant Collect or portal Pay marks the whole `FeePayment` as `PAID` for the full billed amount. Families in many Liberian (and similar) schools pay tuition and other fees **in installments** — a parent may bring $20 toward a $150 bill, then another amount later. The system must:

1. Keep one **invoice** for the obligation (what the school billed).
2. Accept **many payments** against that invoice (any amount up to the remaining balance).
3. Show **balance remaining**, **amount paid so far**, and a **payment history** for staff, students, and parents.
4. Issue an **official receipt for each payment** (not only when the invoice is fully settled).
5. Only mark the invoice **fully paid** when cumulative payments cover the billed amount.
6. Keep a **school-wide transaction history log** — every money movement is listed with who paid / who recorded it, for which student, date & time, amount, previous balance owing, and balance after the payment (immutable audit trail).

**Out of scope for this plan (later):** scheduled installment plans with fixed due dates per tranche; automatic late fees; refunds / credit notes (called out in §9).

---

## 1. Current gaps (audit)

| Area | Today | Gap |
| :--- | :--- | :--- |
| `FeePayment` | Single `amount`; status `PENDING` \| `PAID` \| `VOIDED` | No balance / amount paid; no PARTIAL |
| Collect / pay | Full settle in one step | Cannot record $20 of $150 |
| Checkout | Stripe/mock for full `fee.amount` | No “pay custom amount” |
| Receipts | One `FEE_PAYMENT` receipt when invoice becomes `PAID` | No receipt per installment |
| KPIs / Overview | “Collected” = sum of `PAID` invoice amounts | Undercounts cash already taken on open invoices |
| Portal | Pay button = full amount only | Parent cannot pay “small small” online |
| Admission entrance fee | `fee.paid` when invoice `PAID` | Policy must decide: full only vs allow partial (recommend **full only** for entrance gate) |
| Transaction log | No school-wide payment journal | Cannot answer “who paid what, when, by whom, balances before/after” across all students |

---

## 2. Target behavior

### 2.1 Mental model

| Concept | Meaning |
| :--- | :--- |
| **Invoice** (`FeePayment`) | What is owed: type, due date, billed `amount`, student, scope/template |
| **Payment** (`FeePaymentTxn`) | One money event: amount, method, when, who recorded, **balance before/after**, optional checkout session |
| **Balance** | `amount − sum(txns)` (never negative) |
| **Status** | Derived from balance + void (see §2.2) |
| **Transaction history log** | School-wide chronological journal of all `FeePaymentTxn` rows (plus invoice lifecycle events — see §2.8) |

One invoice → zero or more payments. Voiding an invoice blocks new payments; existing payment rows remain for audit (receipts stay ISSUED unless explicitly voided — see §2.5). **Txn rows are append-only** — never edit amount or balances after create (correct mistakes with a later adjusting txn / Phase D write-off, not silent edits).

### 2.2 Invoice statuses

| Status | When |
| :--- | :--- |
| `PENDING` | Balance = billed amount (no successful payments yet) |
| `PARTIAL` | `0 < amountPaid < amount` |
| `PAID` | `amountPaid >= amount` (balance 0); `paidAt` = time of **settling** payment |
| `VOIDED` | Staff voided; no further payments |

Display label **Overdue** stays UI-only: `PENDING` or `PARTIAL` and `dueDate < today`.

### 2.3 Recording a payment (cash desk)

Accountant / School Admin on a non-void, non-fully-paid invoice:

1. Opens Collect (or “Record payment”).
2. Enters **amount** (required), **method** (CASH / CHECK / TRANSFER / CARD / OTHER), optional reference/notes, optional paid-at datetime.
3. Server validates `0 < amount ≤ balance` (tolerance: round to 2 decimal places).
4. Creates `FeePaymentTxn`, updates denormalized `amountPaid` + status.
5. Issues receipt for **this payment amount** (and shows remaining balance on PDF line items).
6. If status becomes `PAID` → existing `fee.paid` / Lifecycle notify path runs **once** (idempotent).
7. In-app notify student/parents with **this payment amount** and remaining balance (not only “fully paid”).

**Full collect shortcut:** UI may still offer “Collect full balance” which posts `amount = balance`.

### 2.4 Portal / checkout (student & parent)

1. Pay opens checkout for a chosen amount defaulting to **remaining balance**, editable down to a school minimum (default **$1.00**, configurable later).
2. Checkout session metadata includes `feeId` + `paymentAmount` (not only full invoice).
3. On success → create one `FeePaymentTxn` for that amount → same status/receipt rules as cash desk.
4. Mock/console checkout must accept the partial amount (not force full invoice).

### 2.5 Receipts

| Event | Receipt |
| :--- | :--- |
| Each successful txn | New `FEE_PAYMENT` receipt; `sourceType` = `FEE_PAYMENT_TXN`, `sourceId` = txn id |
| Invoice fully paid | No second “settlement” receipt unless product later wants a summary — **MVP = per-payment only** |
| Legacy invoices already `PAID` with no txns | Keep existing receipt behavior; backfill optional (Phase D) |

PDF / verify payload should show: invoice type, this payment, billed total, previously paid, remaining after this payment.

Update `docs/RECEIPTS_PLATFORM_PLAN.md` when implementing (source type + line items).

### 2.6 Admission entrance fees

**Recommendation (MVP):** Entrance / application fees that gate enroll (`fee.paid` → Lifecycle) still require **full** payment before the gate clears. Partial payments may be recorded against the entrance invoice for tracking, but Lifecycle advances only when status becomes `PAID`. Document clearly in Registrar UI (“Entrance fee must be paid in full to enroll”).

Alternative (later policy knob): allow enroll on partial — **not** default.

### 2.7 Who can do what

| Role | Capability |
| :--- | :--- |
| SCHOOL_ADMIN, ACCOUNTANT | Record any amount ≤ balance; void invoice (only when `amountPaid = 0`); per-invoice history; **full school Transaction history log** (filter/export) |
| STUDENT / PARENT | Pay own / linked child invoices via checkout for amount ≤ balance; view **own / children’s** payment history + receipts (not school-wide log) |
| PRINCIPAL / others | Unchanged read rules; optional later: read-only Transaction history for Principal |

**Void with partials:** Prefer **block void when `amountPaid > 0`** (force admin to keep ledger honest). Optional later: “write-off remaining balance” without deleting payment history.

### 2.8 Transaction history log (school-wide page)

**Purpose:** One place for accountants/admins to see **every fee money movement** in the school — not only “open invoices.” Answers audits like: *Who paid? For which student? Recorded by whom? When? How much? What was owing before? What is owing now?*

**Route / IA (recommended):**

| Surface | Path | Notes |
| :--- | :--- | :--- |
| Fees tab | `/{slug}/fees?tab=history` (or `transactions`) | Same Fees chrome; label **Transaction history** |
| Optional deep link | `/{slug}/fees/transactions` | Alias if tab query is awkward |

Student/parent Fees stay on their scoped list; they do **not** get the school-wide log. Per-invoice history in the detail drawer remains (subset of the same txn rows).

**Each log row must show (minimum):**

| Field | Source | Example |
| :--- | :--- | :--- |
| Date & time | `paidAt` (display in school TZ); also store `createdAt` for “entered at” | 30 Jul 2026, 2:14 PM |
| Transaction id | `FeePaymentTxn.id` (short mono) | for support / receipt link |
| Student (for whom) | Invoice `studentId` → Identity name + optional admission # | Jane Doe · Grade 8 |
| Invoice / fee type | Invoice `type` + link to invoice | Tuition 2025–2026 |
| Amount paid | `amount` | $20.00 |
| Previous balance owing | `balanceBefore` | $150.00 |
| Balance owing after | `balanceAfter` | $130.00 |
| Method | `method` | CASH |
| Recorded by (who) | `recordedBy` → staff name, or “Parent (portal)” / “Student (portal)” / “System” | Alice Accountant |
| Payer (optional) | `payerUserId` or notes — who handed money / checked out | Parent: John Doe |
| Invoice status after | `invoiceStatusAfter` | PARTIAL |
| Receipt | Link/download official PDF | Verify / download |
| Notes / reference | `notes` | Check #4412 |

**Filters (staff log):** date range, student, fee type, method, recorded-by, status-after (`PARTIAL`/`PAID`), amount range. Sort default: newest first.

**Export:** CSV of current filter (columns match table). Honest empty state when no txns.

**Immutability:** Log is read-only in UI. No edit/delete of past rows. Corrections = new txn or Phase D write-off (still appears as a new log line).

**Also log (lightweight, same table or adjacent event type — MVP can be payment-only):**

| Event | In history? | MVP |
| :--- | :--- | :--- |
| Payment (cash / checkout) | Yes — primary rows | Required |
| Invoice created (billed) | Optional “INVOICE_CREATED” row with `balanceBefore=0`, `balanceAfter=amount`, `amount=0` or amount = billed as charge | Phase B+ nice-to-have |
| Invoice voided | Optional row | Phase B+ |
| Write-off / refund | Later | Phase D |

MVP ships **payment txns only**; charge/void rows can follow without changing the page layout.

---

## 3. Data model (proposed)

Finance schema only (plain UUID strings across services, same as today).

```text
FeePayment  (invoice — extend)
  … existing fields …
  amount          Float     // billed total (unchanged meaning)
  amountPaid      Float     @default(0)  // denormalized sum of successful txns
  status          String    // PENDING | PARTIAL | PAID | VOIDED
  paidAt          DateTime? // set when status → PAID (settling payment time)

FeePaymentTxn  (new — append-only audit row)
  id                String    @id
  schoolId          String
  feePaymentId      String    // → FeePayment.id
  studentId         String    // denormalized from invoice at write (fast school-wide queries)
  /// PAYMENT | (later) INVOICE_CREATED | VOID | WRITE_OFF | REFUND
  kind              String    @default("PAYMENT")
  amount            Float     // money received this event (PAYMENT); 0 for pure status events if added later
  /// Snapshot at write time — never recompute for display
  balanceBefore     Float     // invoice balance owing immediately before this txn
  balanceAfter      Float     // invoice balance owing immediately after this txn
  billedAmount      Float?    // snapshot of invoice.amount at write (audit)
  invoiceStatusBefore String? // PENDING | PARTIAL | PAID | …
  invoiceStatusAfter  String? // PARTIAL | PAID | …
  method            String    // CASH | CHECK | TRANSFER | CARD | OTHER | CHECKOUT
  paidAt            DateTime  // business date/time of payment (staff may backdate slightly)
  recordedBy        String?   // Identity user who entered it (staff); portal self-pay → payer id
  recordedByRole    String?   // SCHOOL_ADMIN | ACCOUNTANT | PARENT | STUDENT | SYSTEM
  payerUserId       String?   // who paid (parent/student); may equal recordedBy on portal
  payerNameSnapshot String?   // frozen display name at write
  studentNameSnapshot String? // frozen student display name at write
  feeTypeSnapshot   String?   // frozen invoice type label
  notes             String?
  checkoutSessionId String?
  receiptId         String?   // Finance Receipt.id when issued
  createdAt         DateTime  // when system wrote the row (immutable clock)
  updatedAt         DateTime

  @@index([feePaymentId])
  @@index([schoolId, paidAt])
  @@index([schoolId, studentId, paidAt])
  @@index([schoolId, recordedBy, paidAt])
```

**Balance snapshot rule (on every PAYMENT write):**

```text
balanceBefore = invoice.amount − invoice.amountPaid   // before applying this txn
balanceAfter  = balanceBefore − txn.amount            // must be ≥ 0
```

Store both on the row so the Transaction history page never depends on recomputing from a mutable invoice.

**Integrity rules (server):**

1. All writes that change money go through one service method (transaction): lock invoice → compute balances → insert txn → update `amountPaid` / status → issue receipt.
2. Reject txn if invoice `VOIDED` or `PAID`, or if `amount > balanceBefore`.
3. Do not allow editing `FeePayment.amount` downward below `amountPaid` (or block amount edit once any txn exists — simpler MVP).
4. **Never UPDATE** `amount`, `balanceBefore`, `balanceAfter` on an existing txn.
5. Optional: unique `checkoutSessionId` so Stripe/mock webhook retries are idempotent.

**Migration:** Existing `PAID` rows → set `amountPaid = amount`, leave as-is (no txn required for history). Existing `PENDING` → `amountPaid = 0`. Optionally Phase D backfill a synthetic txn for old PAID rows for uniform history UI (`balanceBefore = amount`, `balanceAfter = 0`).

---

## 4. APIs (suggested)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| POST | `/api/fees/:id/payments` | Record partial/full payment (staff); body `{ amount, method, paidAt?, notes?, payerUserId? }` |
| GET | `/api/fees/:id/payments` | List txns for one invoice (drawer history) |
| GET | `/api/schools/:schoolId/fee-payment-txns` | **School-wide transaction history log** (paginated + filters) |
| GET | `/api/schools/:schoolId/fee-payment-txns/export` | CSV of same filter set |
| GET | `/api/my-fee-payment-txns` | Parent/student scoped log (own / linked children only) |
| POST | `/api/fees/:id/checkout` | Extended: optional `amount` (default = balance) |
| POST | `/api/public/checkout/complete` | Create txn for session amount, not always full invoice |
| GET | `/api/my-fees` | Include `amount`, `amountPaid`, `balance`, `status` |
| POST | `/api/fees/:id/collect` | **Deprecate or alias** → full-balance payment for backward compat |

**School-wide list query params:** `from`, `to`, `studentId`, `feeType`, `method`, `recordedBy`, `statusAfter`, `q` (student name), `page`, `pageSize`, `sort=paidAt:desc`.

Invoice list/detail response:

```json
{
  "amount": 150,
  "amountPaid": 40,
  "balance": 110,
  "status": "PARTIAL",
  "payments": [ /* optional embed or separate GET */ ]
}
```

Txn row shape (history log + per-invoice):

```json
{
  "id": "…",
  "kind": "PAYMENT",
  "paidAt": "2026-07-30T14:14:00.000Z",
  "createdAt": "2026-07-30T14:14:02.000Z",
  "studentId": "…",
  "studentName": "Jane Doe",
  "feePaymentId": "…",
  "feeType": "Tuition",
  "amount": 20,
  "balanceBefore": 150,
  "balanceAfter": 130,
  "billedAmount": 150,
  "invoiceStatusAfter": "PARTIAL",
  "method": "CASH",
  "recordedBy": "…",
  "recordedByName": "Alice Accountant",
  "recordedByRole": "ACCOUNTANT",
  "payerUserId": "…",
  "payerName": "John Doe",
  "notes": "First installment",
  "receiptId": "…"
}
```

Stable error codes:

| Code | When |
| :--- | :--- |
| `FEE_PAYMENT_EXCEEDS_BALANCE` | amount > balance |
| `FEE_ALREADY_PAID` | status PAID |
| `FEE_VOIDED` | status VOIDED |
| `FEE_PAYMENT_INVALID_AMOUNT` | ≤ 0 or bad number |

---

## 5. UI

### Fees — Ledger / detail drawer

- Show **Billed / Paid / Balance** on each row and in the drawer.
- Status chip: Pending / Partial / Paid / Voided / Overdue.
- Collect → form: amount (default = balance), method, notes; confirm.
- Payment history table on the invoice: date/time, amount, **previous balance**, **balance after**, method, recorded by, receipt download.
- Portal: “Pay” → amount field + checkout; history read-only (own / child only).

### Fees — Transaction history tab (new)

Executive Slate page under Fees chrome (`?tab=history`):

- Page header: **Transaction history** — “Every fee payment recorded for this school.”
- Filter bar: date range, student search, fee type, method, recorded by.
- Dense table (comfortable density tokens), columns as in §2.8.
- Row click → open invoice detail drawer (or side panel) with full context + receipt actions.
- **Export CSV** button (current filters).
- Empty: grey state — “No payments recorded yet. Collect a fee or wait for portal checkout.”
- Roles: SCHOOL_ADMIN + ACCOUNTANT only (nav already Fees for them).

Parent/student: optional compact “My payment history” on their Fees view (same columns that apply to them; no school-wide filters).

### Overview / finance summary

- **Collected** = sum of txn amounts (or `amountPaid` across invoices), not only fully `PAID` invoice totals.
- **Outstanding** = sum of balances on `PENDING` + `PARTIAL`.
- Charts use the same definitions so KPIs stay honest.
- Shortcut tile/link: “View transaction history.”

### Empty / copy

- Honest: “Record any amount up to the remaining balance. Full payment is not required in one visit.”
- History: “Balances shown are snapshots from when the payment was recorded.”

---

## 6. Owning services

| Concern | Service |
| :--- | :--- |
| Schema, txn create, status, balance snapshots, checkout amount | **finance** |
| School-wide txn list + CSV export | **finance** |
| Name enrichment for student / recordedBy / payer | finance → **identity** (batch resolve) |
| Receipt per txn | **finance** (`receiptService`) |
| `fee.paid` only on full settle | **finance** → **lifecycle** (existing notify) |
| Gateway routes for `/payments` + `/fee-payment-txns` | **api-gateway** |
| Fees UI (Ledger + **Transaction history** tab) + portal | **frontend-spa** |
| Admission gate copy (full entrance fee) | Registrar UI + `ONBOARDING_AND_ADMISSION_PLAN.md` note |

---

## 7. Phased delivery

```text
Phase A — Model + cash desk partials + per-invoice history + KPIs
Phase A2 — School-wide Transaction history log page + export
Phase B — Portal/checkout custom amount + receipts per txn
Phase C — Admission full-pay gate clarity + notifications with balance
Phase D — Backfill, write-off remaining, optional installment schedules / charge-void log rows
```

### Phase A — Cash desk MVP

- [x] `FeePaymentTxn` with `balanceBefore` / `balanceAfter` + `amountPaid` + `PARTIAL` status
- [x] `POST/GET …/fees/:id/payments`
- [x] Collect UI records any amount ≤ balance
- [x] Drawer shows previous / after balance per payment
- [x] Ledger/Overview use paid/balance correctly
- [x] Tests: partial → partial → settle; overpay rejected; void rules; balance snapshots correct

### Phase A2 — Transaction history log page

- [x] `GET …/schools/:id/fee-payment-txns` (+ filters, pagination)
- [x] Fees UI tab **Transaction history** with columns in §2.8
- [x] CSV export
- [x] Parent/student scoped history (`/api/my-fee-payment-txns` or filter on my-fees)
- [x] Tests: multi-student payments appear in school log; parent cannot see other families

### Phase B — Portal + receipts

- [x] Checkout accepts amount ≤ balance
- [x] Receipt issued per txn; Fees UI download per payment
- [x] Mock checkout completes partial amounts
- [x] History row links to receipt verify/download
- [x] Update receipts plan + verify page line items

### Phase C — Admission + notify

- [x] Entrance fee: Lifecycle still waits for `PAID`
- [x] In-app messages include amount paid + remaining
- [x] Registrar/Fees copy for entrance full-pay rule

### Phase D — Polish

- [x] Backfill synthetic txn for legacy PAID invoices (`POST …/fee-payment-txns/backfill-legacy`)
- [x] Write-off remaining balance (`POST …/fees/:id/write-off` → `WRITTEN_OFF` + history row)
- [x] `INVOICE_CREATED` / `VOID` rows in the same log
- [x] School minimum payment setting (`fee-billing-settings`, default $1; full balance always allowed)
- [ ] Scheduled installment plans (separate product decision — deferred)

---

## 8. Acceptance / verify

- [x] Create $150 tuition invoice → collect $20 → status `PARTIAL`, balance $130, history shows $20
- [x] Same txn shows **previous balance $150**, **balance owing $130**, recorded by accountant, student name, date/time
- [x] Collect another $50 → paid $70, balance $80; log shows second row with before $130 / after $80
- [x] Collect $80 → status `PAID`, `paidAt` set, Lifecycle/fee-paid notify once
- [x] Attempt collect $1 more → rejected
- [x] **Transaction history** tab lists both payments across filters; CSV download matches
- [x] Parent checkout $25 of remaining → txn + receipt; balance updates; appears in school log and parent’s own history
- [x] Parent cannot open or filter another student’s txns on the school-wide API
- [x] Overview “collected” includes partial cash, not only fully paid invoices
- [x] Void blocked when `amountPaid > 0` (MVP rule)
- [x] Entrance invoice: partial does **not** clear enroll gate; full pay does
- [x] Official receipt PDF per payment verifies at `/verify/receipt/:code`
- [x] Editing/deleting a past txn is not available in UI
- [x] Write-off remaining on PARTIAL → `WRITTEN_OFF` + history row
- [x] Backfill legacy PAID creates PAYMENT history rows
- [x] Amount below school minimum rejected unless paying full balance

---

## 9. Explicit non-goals (this plan)

| Item | Notes |
| :--- | :--- |
| Refunds | Separate flow; do not delete txn history |
| Multi-currency | Keep school currency as today |
| Splitting one cash payment across many invoices | Later; MVP = one payment → one invoice |
| Automatic installment schedules | Deferred (product decision) |
| Editing past transactions | Forbidden; correct with new rows only |

---

## 10. Change log

### 2026-07-30 — Phase D polish

- **Change:** Legacy PAID backfill; write-off remaining (`WRITTEN_OFF`); `INVOICE_CREATED`/`VOID` audit rows; school `minPaymentAmount` on Finance billing settings; history kind filter.
- **Services:** finance, api-gateway, frontend-spa
- **UI / API:** Transaction history settings/backfill; invoice Write off; `GET|PATCH …/fee-billing-settings`
- **Status:** done (installment schedules still deferred)
- **Verify:** Backfill → rows appear; write off partial invoice; set min $5 → $1 payment rejected unless full balance

### 2026-07-30 — Phases A–C implemented

- **Change:** Partial/installment fee payments live: `FeePaymentTxn`, `amountPaid`/`PARTIAL`, cash desk + portal custom amounts, per-payment receipts, school-wide Transaction history tab + CSV, entrance fee still full-pay for enroll gate.
- **Services:** finance, api-gateway, frontend-spa
- **UI / API:** `/{slug}/fees?tab=history`; `POST/GET /api/fees/:id/payments`; `GET /api/schools/:id/fee-payment-txns`; checkout `amount`
- **Status:** done
- **Verify:** Collect $20 of $150 → PARTIAL + history; settle → PAID; overpay rejected; Transaction history lists rows

### 2026-07-30 — Transaction history log page

- **Change:** Plan extended with school-wide **Transaction history** Fees tab; each txn stores who/for whom/when/amount/**previous balance**/**balance owing after**, method, recorder, payer snapshots; list + CSV APIs; append-only audit rules.
- **Services:** finance, api-gateway, frontend-spa (planned)
- **UI / API:** `/{slug}/fees?tab=history`; `GET /api/schools/:id/fee-payment-txns` (+ export); drawer + portal scoped history
- **Status:** done (shipped with Phases A–C)
- **Verify:** see acceptance §8

### 2026-07-30 — Plan created

- **Change:** Implementation plan for installment / “pay little by little” fee tracking (invoice + payment txns, PARTIAL status, per-payment receipts, portal custom amount).
- **Services:** finance, api-gateway, frontend-spa (lifecycle notify unchanged until full settle)
- **UI / API:** `/{slug}/fees`; `POST/GET /api/fees/:id/payments`; checkout `amount`
- **Status:** done
- **Verify:** N/A until Phase A ships
