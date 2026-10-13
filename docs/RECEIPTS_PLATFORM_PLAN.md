# Unified Receipt Platform — Plan

> **Status:** Done (2026-07-30) — Phases A–D shipped (fee/payroll/expense PDFs, public verify, locale-aware chrome, per-installment receipts, void on payroll unpaid)  
> **Scope:** Server-issued, brandable, QR-verifiable receipts for money events across the SMS  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `docs/FINANCE_BILLING_PLAN.md`, `docs/STAFF_WORKFORCE_PLAN.md`, `docs/RECEIPTS_TEMPLATES_INTEGRATION_PLAN.md` (HTML template picker + HTML→PDF — **planned**)

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Ownership | Finance owns `Receipt` + issue/verify/PDF; Staff calls internal issue for payslips |
| v1 types | `FEE_PAYMENT`, `PAYSLIP`, `EXPENSE`, `TRANSACTION` |
| Storage | MinIO/S3 PDF + DB metadata |
| Anti-fraud | HMAC-signed verify code in QR → public `/verify/receipt/:code`; immutable snapshot + content hash |
| UI | Fees / Payroll / Expenses download official PDF; public verify page |

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| Receipt CRUD, PDF, verify, counters | **Finance** |
| Payslip issue trigger | **Staff** → Finance internal API |
| School branding snapshot | **Identity** (internal school GET) |
| Gateway routing | **api-gateway** |
| SPA download + verify page | **frontend-spa** |

## 2. Flows / rules

1. Money settles (fee paid/collected, payroll marked PAID, expense approved) → Finance issues receipt (idempotent per source while ISSUED).
2. Snapshot freezes parties, amounts, line items, school branding.
3. PDF stored in MinIO; QR points to public verify URL.
4. Void keeps PDF; reissue creates new number + `supersedesId`. Payroll mark-unpaid voids the ISSUED payslip for that payroll id.
5. Browser never generates the official PDF — only downloads.

## 3. Acceptance

- [x] Fee collect/pay issues ISSUED receipt with number + QR
- [x] Public verify shows Valid / Voided / Invalid
- [x] Fees UI downloads server PDF
- [x] Payroll mark-paid issues payslip receipt; download from drawer/portal
- [x] Approved expense can issue EXPENSE receipt

## 4. Change log

### 2026-07-29 — Void payslip on payroll unpaid

- **Change:** When payroll is reverted from PAID → PENDING, Staff calls Finance `POST /api/internal/receipts/void-by-source` (`PAYSLIP`) so mistake corrections invalidate the official payslip.
- **Services:** staff, finance
- **Status:** done
- **Verify:** Mark paid → mark unpaid → public verify shows Voided

### 2026-07-23 — Initial implementation

- **Change:** Receipt engine in Finance (`Receipt` + counter, PDFKit+QR, MinIO/local PDF, HMAC verify); gateway routes; public SPA verify page; auto-issue on fee PAID, payroll PAID, expense APPROVED; Fees/Payroll/Expenses/Staff Portal download official PDFs; client fee receipt jsPDF removed
- **Services:** finance, identity (internal school GET), staff, api-gateway, frontend-spa
- **UI / API:** `/verify/receipt/:code`; `/api/receipts/*`; `/api/schools/:id/receipts/*`; `/api/public/receipts/verify/:code`; `/api/internal/receipts/issue`
- **Status:** done
- **Verify:** Collect a fee → download receipt → open verify URL; mark payroll paid → download payslip; approve expense → download expense receipt

### 2026-07-30 — Locale-aware PDF chrome

- **Change:** Receipt PDF headers/labels (title, parties, line items, footer) render in the school `defaultLocale` (7 locales). Locale is snapshotted in receipt `branding` at issue; `refreshPdf` uses stored locale or current school default. Identity internal school GET exposes `defaultLocale`.
- **Services:** finance, identity
- **Status:** done
- **Verify:** Set school default to French in Settings → issue fee receipt → PDF shows French chrome; `npx tsx tests/receipt-pdf-i18n.test.ts`

### 2026-08-07 — Role-scoped receipt template buckets

- **Change:** Receipt template selections are stored **per role bucket** (`receiptTemplatesByRole` on School). Registrar/Principal configure **fee payment** only; Accountant configures **payslip, expense, transaction**; School Admin / IT Admin see all types. Saving as one role never overwrites another role’s choices. Finance issuance resolves template by receipt type using role priority (e.g. fee → Registrar → Principal → School Admin; payslip → Accountant → School Admin).
- **Who it affects:** Registrar, Principal, Accountant, School Admin, IT Admin (Settings → Receipt templates); all issued receipts.
- **Services:** identity (PATCH merges authenticated user’s role bucket), finance (issue/refresh PDF), frontend-spa (role-filtered picker)
- **Status:** done
- **Verify:** Log in as Registrar → pick Template A for fee payment → Save. Log in as Accountant → pick Template B for payslip → Save. Reload each role — selections independent. Issue fee receipt → uses Registrar choice; issue payslip → uses Accountant choice. `npx tsx tests/receipt-context.test.ts`

### 2026-08-07 — HTML receipt template integration (partial)

- **Change:** Added 5 Mustache HTML receipt layouts + kept **PDFKit default**; Finance renders HTML→PDF via Chromium (falls back to PDFKit); school **`receiptTemplatesByRole` JSON** with legacy `receiptTemplates` / `receiptTemplate` fallback; Settings picker saves each type independently within the signed-in role’s bucket; dedicated `PATCH …/receipt-template` (Identity) — gateway suffix `receipt-template` → Identity.
- **Services:** finance, identity, frontend-spa
- **Status:** partial — see `docs/RECEIPTS_TEMPLATES_INTEGRATION_PLAN.md`
- **Verify:** Settings → Receipt template → preview → Save → issue fee receipt → PDF uses selected layout; `npx tsx tests/receipt-context.test.ts`

### 2026-08-07 — HTML template integration plan

- **Change:** Added companion plan for wiring `receipt-templates/*.html` to Finance PDF issuance, school Settings picker, Mustache context, and Chromium HTML→PDF (PDFKit remains fallback).
- **Services:** finance, identity, frontend-spa (planned)
- **Status:** plan only — see `docs/RECEIPTS_TEMPLATES_INTEGRATION_PLAN.md`
- **Verify:** N/A until Phase A

### 2026-08-05 — Plan status header corrected

- **Change:** Header status aligned with shipped Phases A–D (all acceptance checks complete).
- **Status:** done (documentation)

### 2026-07-30 — Per-installment fee receipts

- **Change:** Each fee payment txn issues a `FEE_PAYMENT` receipt (`sourceType` `FEE_PAYMENT_TXN`) with line items for this payment, previous balance, and balance owing after.
- **Services:** finance, frontend-spa
- **Status:** done
- **Verify:** Record partial payment → download receipt from invoice history → verify URL Valid
