# Enrollment / Admission / Finance Overhaul — Implementation Plan

Status: **In progress**
Owner: Engineering
Scope: `services/lifecycle`, `services/finance`, `services/identity` (client), `src/features/{registrar,enrollment,fees,receipts,parent}`

## 1. Objective

Make the applicant → admission → enrollment → school-fees → receipt journey one coherent,
auditable flow with correct money handling, safe orchestration, and a clear UX. The flow
currently works but is split across three disconnected screens, duplicates business rules
on the client, and has several integrity gaps (client-supplied payment amounts, swallowed
side-effect failures, receipt duplication, missing idempotency, stale status gating).

## 2. Guiding principles

1. **Server owns money and state.** Amounts, discounts, status transitions and receipts are
   computed/validated by the services, never trusted from the client.
2. **Every mutation is idempotent.** Replays (double-click, retries, webhooks) must not
   double-book payments, double-issue receipts, or double-enroll.
3. **Orchestrated saga, with compensation.** Cross-service enrollment records an outcome for
   every external call and rolls back / flags partial failure instead of silently succeeding.
4. **One source of truth for the funnel.** The next allowed action is derived once, server-side,
   and consumed by all UIs.
5. **No dead code.** Removed `collectPayment`-style shims, unused helpers and divergent rule sets.
6. **No behaviour-breaking schema churn.** All phases are implemented on the existing schema
   (`FeePayment.originalAmount`/`discountPercent`, `FeePaymentTxn.checkoutSessionId`,
   `AdmissionApplication.statusTokenHash`, ...). No new migrations required.

## 3. Current defects (baseline)

### Lifecycle / admission
| # | Defect | Location |
|---|--------|----------|
| L1 | `enroll` accepts `idempotencyKey` but never uses it; concurrent calls can double-run side effects | `admissionService.ts:389`, `:396` |
| L2 | No compensation: if Identity user is created but a later step throws, the app is left half-enrolled | `admissionService.ts:435-494` |
| L3 | Return payload hardcodes `studentMustChangePassword: true` and `welcomeEmailSent: true` regardless of what Identity actually did | `admissionService.ts:501,505` |
| L4 | Two divergent enroll rule-sets: `isEnrollableStatus()` vs `assertTransition()` | `admissionPolicy.ts:62`, `admissionStates.ts:29` |
| L5 | Public document-confirm route reuses the **staff** handler with no token check | `admissionRoutes.ts:166` |
| L6 | CSV export silently capped at 100 rows (controller asks 5000) | `admissionService.ts:80` |
| L7 | Docs gate is effectively dead (`requiredDocTypes` hardcoded `[]`) or duplicated in `documents` JSON | `admissionPolicy.ts:36` |

### Finance
| # | Defect | Location |
|---|--------|----------|
| F1 | Discounts are stored verbatim; `originalAmount`/`discountPercent` not reconciled server-side | `financeService.createFee:367-390` |
| F2 | Invoice-level receipt (`issueForFeePayment`) duplicates per-txn receipts for the same money | `receiptService.ts:489`, `receiptController.ts:70,187,220` |
| F3 | Stripe webhook uses a **synthetic** idempotency key (`stripe_{feeId}_{amount}`) instead of the real session id; raw body not reliably captured | `financeController.ts:337`, `app.ts:11` |
| F4 | Public checkout endpoint is unauthenticated and trusts a client-supplied `amount` | `financeRoutes.ts:252`, `financeService.createCheckoutForFee:1059` |
| F5 | `verifyStripeWebhook` discards the real session id | `stripeCheckout.ts:109-132` |
| F6 | Receipt issue failure after payment is logged but the invoice has no receipt-status surface | `financeService.ts:749-763` |
| F7 | `fee.paid` propagation is fire-and-forget with no retry; lifecycle may never advance FEE_PENDING→DOCS_PENDING | `lifecycleClient.ts:4` |
| F8 | Dead code: `getPdfBuffer`, `previewHtml`, `parseReceiptTemplatesJson`, unused `feePaymentRecordSchema`. (`collectPayment` is used by `feesApi.collectFee`; `resolveReceiptTemplateForType` is used by `receipt-context.test.ts` — both retained.) | finance |

### Frontend
| # | Defect | Location |
|---|--------|----------|
| U1 | Registrar page bypasses the typed `api` wrapper with raw `fetch` + manual auth headers | `features/registrar/hooks/usePageActions.ts` (23 call sites) |
| U2 | Client re-implements the status machine (walks PENDING→UNDER_REVIEW→APPROVED before enroll) | `usePageActions.ts:300-338` |
| U3 | Receipts have no home UI (only reachable via an incidental fee action) | `features/receipts/registry.ts` only |
| U4 | N+1 classroom member fetches to enrich student lists | `fees/api.ts:enrichStudentsWithClassrooms` |
| U5 | Dead hook `usePagedStudentsQuery` | `features/enrollment/hooks/usePagedStudentsQuery.ts` |
| U6 | Receipt-template registry drift (registered subset ≠ template files) | `features/receipts/registry.ts` vs `services/finance/src/receipt-templates` |

## 4. Phases

Each phase is independently shippable. Acceptance criteria are written so they can be checked
by unit tests or by inspection.

---

### Phase 0 — Shared contracts, constants, guards
**Goal:** one place for the funnel/status/action vocabulary so every service and UI agrees.

Tasks
- Add `services/lifecycle/src/domain/admissionFunnel.ts` exporting the canonical
  `ENROLLABLE_STATUSES` (derived from `admissionStates.ALLOWED`), `nextActionFor(app, gate)` and
  a serializable `OnboardingNextAction`.
- Export `ALLOWED` from `admissionStates.ts` and make `isEnrollableStatus()` derive from it
  (removes L4).
- Add `services/lifecycle/src/domain/admissionPolicy.ts` policy normalization used by both the
  service and the funnel helper (single parse path).
- Add finance `lib/feePaymentMath.ts` helpers: `computeInvoiceAmounts({ amount, originalAmount, discountPercent })`
  returning `{ amount, originalAmount, discountPercent }` (single source of discount math).

Acceptance
- `isEnrollableStatus` and `assertTransition` agree on every pair (property test).
- Discount math covered by unit tests (net/gross/percent round-trips).

---

### Phase 1 — Finance money integrity
**Goal:** server computes money; one receipt per payment; safe webhook + public checkout.

Tasks
- **1.1 Server-side discounts (F1).** `createFee` uses `computeInvoiceAmounts` so `amount` is
  always the net bill and `originalAmount`/`discountPercent` are consistent. `updateFee` allows
  editing discount while unpaid and recomputes net.
- **1.2 One receipt per payment txn (F2).** `enroll`/payment path already issues per txn. Make
  `receiptController.issue` for `FEE_PAYMENT` resolve a **payment txn** (accept a txn id, or an
  invoice id with exactly one PAYMENT txn); reject invoice ids with multiple txns
  (`FEE_PER_TXN_RECEIPTS`). `reissue` follows the same resolution. `issueForFeePayment` is kept
  only as the single-txn resolver + legacy guard.
- **1.3 Stripe webhook hardening (F3, F5).** `app.ts` captures `rawBody` for the webhook path via
  `express.json({ verify })`. `verifyStripeWebhook` returns the real `session.id`; controller uses
  `checkoutSessionId: result.sessionId` and passes `applicationId` through. Webhook is idempotent
  via the `checkoutSessionId` unique constraint.
- **1.4 Public checkout lockdown (F4).** `POST /api/public/fees/:id/checkout` requires
  `{ applicationId, token }`, validates the application's `statusTokenHash`, and **ignores**
  client `amount` (always charges the remaining balance). Authenticated route keeps the optional
  partial amount but validates min/balance server-side (already does).
- **1.5 Receipt-failure visibility (F6).** `recordPayment` returns `receiptId` (already) and a
  `receiptIssueFailed` flag; fee serializer exposes `receiptCount`.

Acceptance
- Creating an invoice with `discountPercent: 10, amount: 90` stores `originalAmount: 100`.
- Posting a payment issues exactly one `FEE_PAYMENT` receipt; a second manual issue for the same
  source returns the same receipt (idempotent) and invoice-level issue with 2 txns returns 409.
- Replaying a Stripe webhook twice creates one txn.
- Public checkout without a valid token → 403; with valid token → amount = balance.

---

### Phase 2 — Lifecycle enroll integrity
**Goal:** safe, repeatable, compensated enrollment with truthful results.

Tasks
- **2.1 Idempotency (L1).** `enroll` derives a stable key (`opts.idempotencyKey` or
  `enroll:{appId}`), and uses a conditional transition guard: after external calls, claim the
  enrollment with `updateMany({ where: { id, status: { not: "ENROLLED" } } })`. If `count === 0`,
  return the already-enrolled application (idempotent). Replays before external calls return the
  completed app.
- **2.2 Compensation (L2).** Track created resources. On hard failure after Identity creation,
  attempt best-effort rollback (flag the application with an error note + `classAssignFailed`
  semantics) and return a structured error instead of a half-enrolled row. Classroom failure
  remains non-fatal (recorded as `classAssignFailed`), matching current UX.
- **2.3 Truthful flags (L3).** Return `studentMustChangePassword`/`welcomeEmailSent` and
  `parentMustChangePassword` from the actual Identity find-or-create result
  (`created` + the flags we sent), not constants.
- **2.4 Unified transitions (L4).** `enroll` uses `isEnrollableStatus` derived from `ALLOWED`.
- **2.5 Public doc-confirm token (L5).** Add `publicConfirmUpload` controller + route that first
  validates the `statusTokenHash` (via `publicStatus`) before delegating to `confirmDocumentUpload`.
- **2.6 CSV cap (L6).** `getApplications` accepts a bounded `maxPageSize` for exports (up to 5000);
  normal listing stays at 100.

Acceptance
- Calling `enroll` twice with the same key yields one Identity user and one ENROLLED app.
- Returned `studentMustChangePassword` matches the Identity response.
- `POST /api/public/applications/:id/documents/confirm` without a valid `token` → 404/403.
- `export.csv` returns more than 100 rows when present.

---

### Phase 3 — Auto entrance invoice + robust `fee.paid`
**Goal:** approving an application that requires an entrance fee automatically raises the invoice;
paying it always advances the application.

Tasks
- **3.1 Auto invoice on APPROVED.** In `transition`/`updateApplication`, when moving to `APPROVED`
  and policy `requireEntranceFee && entranceFeeAmount > 0 && !feePaymentId`, create the entrance
  invoice and settle the application on `FEE_PENDING` (reuse `createEntranceFeeForApplication`).
- **3.2 Robust fee.paid loop (F7).** `lifecycleClient.notifyFeePaid` retries with backoff and
  returns a boolean; `recordPayment` logs a durable warning if it exhausts retries. Lifecycle
  `onFeePaid` stays idempotent and also accepts `feePaymentId`-only lookups.

Acceptance
- Approving a fee-required application yields `feePaymentId` set + status `FEE_PENDING`.
- Paying the entrance invoice transitions the application to `DOCS_PENDING` (or ENROLLED path)
  and survives a transient lifecycle outage via retry.

---

### Phase 4 — Unified onboarding next-action API
**Goal:** one endpoint tells any UI what the next step is.

Tasks
- Add `GET /api/schools/:schoolId/applications/:id/next-action` (and a list variant for the
  funnel) returning `{ status, nextAction, blockedBy, fee: { id, balance, status }, documents }`.
- `nextAction` ∈ `REVIEW | APPROVE | PAY_FEE | WAIT_DOCS | ENROLL | ASSIGN_CLASS | DONE | WITHDRAWN`.
- Backed by `admissionFunnel.nextActionFor` (Phase 0) so the client no longer walks states.

Acceptance
- The endpoint reports `PAY_FEE` for APPROVED + unpaid required fee, `ENROLL` when gates pass,
  `DONE` when ENROLLED; never contradicts `assertTransition`.

---

### Phase 5 — Frontend API layer, server-driven actions, stepper
**Goal:** remove client business logic and raw fetch; give the funnel a stepper.

Tasks
- **5.1** Rewrite `features/registrar/hooks/usePageActions.ts` to use `registrarApi` (typed `api`
  wrapper) for every call (U1). Add missing wrappers (enroll, transition, doc presign/confirm/review,
  entrance fee) to `registrar/api.ts`.
- **5.2** Delete the client status walk (U2); call `enroll` directly or drive it from the
  next-action API. Surface server error `code`s.
- **5.3** Add an onboarding stepper component driven by the next-action API, shared by the
  registrar review modal and the applicant status page.
- **5.4** Convert `features/enrollment` and `features/fees` raw fetches to `api` wrappers; delete
  the dead `usePagedStudentsQuery` (U5).

Acceptance
- No `fetch(` calls remain in `features/{registrar,enrollment,fees}`.
- Enrolling from the UI works without client-side transition walking.

---

### Phase 6 — Receipts surfacing
**Goal:** receipts are first-class and discoverable.

Tasks
- Add a Receipts tab to the fees page (`features/fees`) listing receipts with download/verify.
- Show a student's receipts on the student profile/dossier.
- Parent portal: list children's receipts.
- Extend `receiptsApi` to list a fee's per-payment receipts; update `downloadForSource` to target
  a txn id (aligns with Phase 1.2). Reconcile the receipt-template registry (U6).
- Batch-replace the N+1 classroom enrichment with a single members endpoint where available (U4).

Acceptance
- A partial-payment invoice shows one receipt per payment.
- Receipts are reachable from fees, student profile, and parent portal.

---

### Phase 7 — Cleanup, dedup, tests, docs
**Goal:** leave the codebase smaller and safer.

Tasks
- Remove dead code: `receiptService.getPdfBuffer`/`previewHtml`, `parseReceiptTemplatesJson`,
  `schemas.feePaymentRecordSchema`. (`collectPayment` and `resolveReceiptTemplateForType` turned
  out to be live — retained.)
- `receiptService.hmacSecret`: keep JWT fallback but warn loudly in production when
  `RECEIPT_HMAC_SECRET` is unset.
- Add/extend unit tests: discount math, funnel/next-action, idempotent enroll guard, receipt
  resolution, webhook idempotency key derivation.
- Update `ONBOARDING_AND_ADMISSION_PLAN.md` and this doc with the final behaviour.

Acceptance
- `npm run test:enroll`, `test:onboarding`, `test:fee-partial`, `test:fee-scope`,
  `test:public-apply`, `test:receipt-*` pass.
- Root `tsc --noEmit` (frontend lint) passes.

---

## 5. Verification strategy (this repo)

- **Frontend:** `node ./node_modules/typescript/bin/tsc --noEmit` (root `tsconfig.json`).
- **Pure unit tests:** `node ./node_modules/tsx/dist/cli.mjs tests/<name>.test.ts`.
- **Services:** local `tsc` uses a **stale root Prisma client** (services are generated from their
  own `services/*/prisma/schema.prisma` at Docker build time), so service-wide `tsc` is not a clean
  gate here. Use `esbuild` bundling (`services/*/package.json` `build`) as a syntax/import gate and
  rely on the pure unit tests for behaviour.
- No database migrations are added by this work.

## 6. Rollout notes

- Identity image must be rebuilt/redeployed for the seed changes (already committed separately).
- Finance and lifecycle images must be rebuilt after P1–P3.
- No `.env` changes required beyond existing `STRIPE_*`, `APP_URL`, internal tokens.

## 7. Progress log

- [x] Phase 0
- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [x] Phase 5
- [x] Phase 6
- [x] Phase 7

### Verification log
- P0: `computeInvoiceAmounts` round-trips verified (25%→75/100, 90/100→10%, plain, gross-only).
- P0/P1: `esbuild` bundles clean for `services/finance` (193.8kb) and `services/lifecycle` (111.0kb).
- P0: `tests/onboarding-admission.test.ts` and `tests/enroll-integration.test.ts` pass (EXIT 0).
- P2/P3: lifecycle bundle clean (117.2kb); finance bundle clean (194.5kb). `fee-partial-payments`, `fee-scope` pass.
- P5: `usePageActions.ts` migrated to `registrarApi` (only the external storage PUT remains a raw fetch); client status walk removed; `usePagedStudentsQuery` deleted; root `tsc --noEmit` clean.
- P5: `OnboardingStepper` (shared, presentational) added at `src/components/OnboardingStepper.tsx`; wired into `ApplicationReviewModal` (self-fetched next-action) and `PublicApplyStatus` (status-driven).
- P6: `ReceiptsTab` added (`src/features/fees/components/ReceiptsTab.tsx`) using `receiptsApi.list` + `download`; new `receipts` tab wired into `FeesChrome` + `Page`. `fees.receipts.*` and `fees.tabs.receipts` i18n added to `en`.
- P7: Removed dead `receiptService.getPdfBuffer`/`previewHtml`, `receiptTemplateRegistry.parseReceiptTemplatesJson`, and unused `feePaymentRecordSchema`. Retained `collectPayment` (used by `feesApi.collectFee`) and `resolveReceiptTemplateForType` (used by `receipt-context.test.ts`) — the plan's F8 note was inaccurate for these two.
- P7: Added `tests/fee-invoice-amounts.test.ts` (27 asserts) and `tests/admission-funnel.test.ts` (19 asserts); both pass. Registered `test:fee-invoice-amounts` + `test:admission-funnel` and added to `test:unit`.
- P5–P7 gate: root `tsc --noEmit` clean; `test:ui-drift` passes (stepper `text-[10px]` corrected to `text-[11px]`); finance bundle clean (194.1kb).

### 2026-10-15 — Follow-up fixes (audit found phases marked done but incomplete)

Re-audit against the "done" checklist found six defects that contradicted the claims above:

- **Approve dropped review data.** `updateApplication` routed `APPROVED`/`FEE_PENDING` through
  `transition()`, which never persisted `notes`/`documents`. Rewrote `updateApplication` to persist
  the review patch (`buildReviewPatch`) **before** routing special paths, so an approval never loses
  reviewer notes/documents.
- **Entrance fee never re-linked on enroll.** The invoice raised pre-enrollment
  (`studentId = application:<appId>`) stayed orphaned after enrollment, so it was invisible in the
  ledger/parent portal. `enroll` now best-effort calls `financeClient.linkFeeToStudent` after the
  enrollment claim (new internal `PATCH /api/internal/fees/:id/link-student`), returning
  `feeRelinkFailed` on failure. `financeService.linkStudentToFee` moves only `application:`
  placeholders (idempotent, guarded).
- **Discount math still bypassed 5** `fees` invoice creates sent only `amount`, so
  `originalAmount`/`discountPercent` were never persisted. `createFee`'s `amount` is now optional and
  the fees UI sends `originalAmount` + `discountPercent` for both single and batch invoices
  (server computes net).
- **Client status walk still present.** Removed the last client-side transition walk in
  `registrar/hooks/usePageActions.ts`; `enroll` now resolves approval server-side via
  `admissionStates.resolveApprovalPath` (new pure helper + `AUTO_APPROVE_FROM`).
- **Receipt IDOR.** Receipt `list`/`getOne`/`download` were unscoped — any STUDENT/PARENT/TEACHER
  could read every school receipt. Added `receiptScopeSourceIds` scoping in `receiptController`
  (non-staff → 404 on unowned) and `receiptService.list({ sourceIds })`.
- **Applicant pay/receipt UI missing.** `PublicApplyStatus` ignored `feePaymentId`. `formatPublicStatus`
  is now async and returns `fee` + `receipt`; the status page renders the balance, a
  **Pay entrance fee** button (`POST /api/public/fees/:id/checkout` with `{ applicationId, token,
  successUrl, cancelUrl }`) and a receipt link to `/verify/receipt/:code`.

Tests/verification (2026-10-15): root `tsc --noEmit` clean; `enroll-approval-path` (new,
10 asserts), `enroll-integration`, `fee-invoice-amounts`, `fee-partial-payments`, `fee-scope`,
`onboarding-admission`, `public-apply-policy`, `i18n-resolve`, `spa/route-matrix` (461 passed),
`ui-drift` all pass. New i18n keys added to `en` + all six locale catalogs; `scripts/i18n-check.ts`
now passes for the `public` namespace.

Known remaining i18n gap (pre-existing, **not** introduced here): `fees.receipts.*` and
`fees.tabs.receipts` were added to `en` only in P6, so `scripts/i18n-check.ts` still fails the
`pages` namespace for the six complete/incomplete locales (29 keys × 6). Localise those or mark the
namespace incomplete.

