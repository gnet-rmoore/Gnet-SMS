# Expense Receipt Templates Design Brief (for AI Design/Implementation)

> **Purpose:** Give an AI agent (e.g. Claude) enough product, data-model, API, and UI-flow context to design **4 different expense receipt templates** for this app.
>
> **Repo:** `Gnet-SMS-2026` (School Management System)  
> **Working assumptions:** Based on code in this repository (Prisma schema, finance receipt system in `services/finance`, frontend receipt selection/preview in `src/features/receipts` and `src/features/settings`, expenses feature `src/features/expenses`). Treat endpoint contracts and context shapes below as the integration surface.

---

## 1. Product & architecture overview

Multi-tenant, multi-role School Management System. Finance operations include fee collection, expenses/budgets, payroll, and **official receipts** (PDF/HTML, verifiable) for multiple transaction types.

- **Frontend:** React 19 + Vite 6, Tailwind CSS 4, Zustand, React Router, i18n. Feature folders under `src/features/*`.
- **Backend:** Node.js/Express microservices under `services/` (notably `finance`, `identity`, `gateway`). Prisma ORM.
- **Database:** SQLite (dev) / PostgreSQL (prod). Main schema: `prisma/schema.prisma`.
- **Tenancy/auth:** School-scoped (`schoolId`), JWT auth, role-based access. Receipt template configuration is **role-bucketed** and resolved per receipt type at issue time.

---

## 2. Expense & receipt domain model

### 2.1 Expense records (source for expense receipts)
- **`Expense`** (`prisma/schema.prisma`): finance expense entry (school-scoped). Typical fields include `schoolId`, amount, currency/category/description/reference, dates/status, creator/approver metadata as defined in schema/service (`services/finance` finance/expense flows). Expense receipts are issued against an expense **source record**.
- **Related:** `ExpenseCategory`, budgets/analytics in `src/features/expenses/*` (API, hooks, tabs/modals for overview, transactions, budgets, analytics) — receipts represent proof of an expense transaction/payment event.

### 2.2 Receipt core model (`prisma` / finance service)
- **`Receipt`** (finance DB): immutable-ish issued document snapshot.
  - Identity/scope: `id`, `schoolId`, `type`, `sourceType`, `sourceId`
  - Numbering/status: `receiptNumber`, `status` (`ISSUED` / `VOIDED` / `SUPERSEDED` etc.), `issuedAt`, `voidedAt`, `voidReason`, `supersedesId`
  - Parties/amounts: `payeeName`, `payerName`, `currency`, `amount`, `lineItems` (JSON array `{label, amount}`)
  - Integrity/verify: `payloadHash`, `verifyCode` (HMAC/signature flow), public verification
  - Output/meta: `fileUrl` (storage), `issuedBy`, branding/snapshot fields as stored
- **`ReceiptCounter`**: per-school/year sequencing for receipt numbers (e.g. `{SCHOOL_SLUG}-{YYYY}-{000001}`).
- **Receipt types (relevant):** `FEE_PAYMENT | PAYSLIP | EXPENSE | TRANSACTION` (see `receiptController`, `receiptTemplateRegistry`, frontend registry).

### 2.3 Template selection & rendering system
- **Template IDs/defs:** `COMPACT_GRID`, `MINIMAL_LINE` (shared IDs in `src/features/receipts/registry.ts` and `services/finance/src/lib/receiptTemplateRegistry.ts`). Each def: `name`, `description`, `accent`, `engine` (`html` or `pdfkit`), `slug` (HTML file), `recommendedFor` (receipt types).
  - `COMPACT_GRID`: dense grid, recommended for `PAYSLIP`, `EXPENSE`.
  - `MINIMAL_LINE`: minimal layout with thin rules/bold total, recommended for `FEE_PAYMENT`, `PAYSLIP`, `EXPENSE`, `TRANSACTION`.
- **Per-type, per-role configuration:** school stores `receiptTemplatesByRole` (and legacy `receiptTemplates`/`receiptTemplate`) in Identity/school settings. Roles: `SCHOOL_ADMIN` (+`IT_ADMIN` bucket), `PRINCIPAL`, `REGISTRAR`, `ACCOUNTANT`. Role → allowed types (frontend/finance): `ACCOUNTANT` configures `PAYSLIP, EXPENSE, TRANSACTION`; admins all types; etc.
- **Issue-time resolution:** `resolveReceiptTemplateForIssue(type, byRole, legacyFlat, legacySingle)` picks template by role priority per type (e.g. `EXPENSE`: `ACCOUNTANT` then `SCHOOL_ADMIN`) with fallbacks.
- **Rendering:** `renderReceiptDocument(templateId, input)` → HTML template (Mustache, `services/finance/src/receipt-templates/*.html`) converted to PDF via `htmlToPdf` when engine is HTML, with fallback to PDFKit (`receiptPdf.ts`). Preview renders HTML via `renderReceiptPreviewHtml` for HTML templates. Context built by `buildReceiptContext` (`receiptContext.ts`, `receiptFormat.ts`, i18n `receiptChrome.ts`, QR generation, branding, amount-in-words).

### 2.4 Receipt render context (key fields, from `receiptContext.ts` / `receiptPdf.ts`)
Available to templates (directly or via `t` labels): 
- **Document:** `title`, `receiptNumber`, `issuedAt` (formatted, school timezone aware), `status`/void state, `copyLabel`, `sourceRef`, `verifyUrl`, `qrDataUrl`, `payloadHash/fingerprint`, `locale/dir`
- **School branding:** `schoolName`, `schoolAddress`, `schoolEmail`, `schoolPhone`, `schoolLogoUrl`, `schoolMonogram`, `brandColor`
- **Parties:** `payerName`, `payeeName`, `studentName` (when applicable), `cashierName`/received-by, `authorizedSignerName/title/signatureUrl`
- **Amounts/lines:** `currency`, `amount`, `amountDisplay`, `amountInWords`, `lineItems[]` (`label, amount, amountFormatted/amountDisplay`)
- **Details/meta:** `paymentMethod` label, `paidAt`, `categoryLabel`, `periodLabel`, `balanceBefore/After` display (when provided), `placeOfIssue`, `note`, composed `detailItems` and `has*` flags
- **i18n chrome:** localized labels (`receiptNoLabel`, `issueDateLabel`, `referenceLabel`, `parties`, `payer/payee`, `lineItems/description/amount`, `total`, `voided`, `verifyAuthenticity`, etc.)

**Expense-specific issuance (finance):** `POST /api/schools/:schoolId/receipts/issue` with `type="EXPENSE"` and `sourceId` (expense id) triggers `receiptService.issueForExpense(sourceId, issuedBy)` which derives payer/payee/amount/lines/category/refs from the expense record and school/user context.

---

## 3. Key API surface & flows

Base `/api/...` via gateway. Finance service routes (see `services/finance/src/routes/financeRoutes.ts`, `controllers/receiptController.ts`).

### 3.1 Receipt endpoints
- `GET /api/schools/:schoolId/receipts/templates` — list available template defs (auth, tenant).
- `GET /api/schools/:schoolId/receipts/preview?templateId=&logoUrl=&brandColor=&schoolName=&address=` — render preview (HTML for HTML templates, or PDF/asset as implemented) for Settings UI (auth, tenant).
- `GET /api/schools/:schoolId/receipts` — list receipts (filters `type, sourceId, status`; ownership/scope enforced for non-staff roles).
- `POST /api/schools/:schoolId/receipts/issue` — issue receipt. For expense: `{ type: "EXPENSE", sourceId: "<expenseId>" }` (roles include finance/admin as enforced).
- `GET /api/receipts/:id` — fetch receipt (tenant/resource scoped).
- `GET /api/receipts/:id/download` — download PDF (refreshes render with current template/branding where applicable; redirect/buffer).
- `POST /api/receipts/:id/void`, `POST /api/receipts/:id/reissue` — admin/accountant lifecycle actions.
- `GET /api/public/receipts/verify/:code` — public QR verification (rate-limited).
- Internal: `POST /api/internal/receipts/issue`, `POST /api/internal/receipts/void-by-source`.

### 3.2 Settings & selection
- **Frontend:** `src/features/receipts/registry.ts` (IDs/defs, per-role allowed types, parse/merge/resolve helpers, `receiptPreviewUrl`), `src/services/receiptsApi.ts`, `src/features/settings/components/ReceiptTemplatePreview.tsx` (fetches preview, A4 frame/zoom, HTML/PDF handling), `TemplatePreviewModal` supports `RECEIPT` + `previewReceiptType` (`FEE_PAYMENT|PAYSLIP|EXPENSE|TRANSACTION`).
- **Backend:** Identity/school settings persist `receiptTemplate(sByRole)`; finance reads school config to resolve template for issue/preview.

### 3.3 Expenses UI (issuance context)
- `src/features/expenses/*` (Page, `TransactionsTab`, `TransactionDetailsModal`, `ExpenseFormModal`, analytics/budgets, `api.ts`, `useExpensesQuery`) manages expense records; receipt issuance/download/verify integrates via receipts API where wired in UI.

---

## 4. Current frontend/backend surfaces

- **Finance (render/issue):** `services/finance/src/controllers/receiptController.ts`, `services/receiptService.ts`, `lib/receiptTemplateRegistry.ts`, `receiptContext.ts`, `receiptHtmlBuilder.ts`, `receiptRender.ts`, `receiptPdf.ts`, `receiptHtmlToPdf.ts`, `receiptFormat.ts`, `receiptStorage.ts`, `i18n/receiptChrome.ts`, HTML templates in `services/finance/src/receipt-templates/` (e.g. `compact-grid.html`, `minimal-line.html`, plus other template assets present).
- **Frontend:** `src/features/receipts/registry.ts`, `src/features/settings/components/ReceiptTemplatePreview.tsx`, `src/pages/PublicReceiptVerify.tsx`, `src/services/receiptsApi.ts`, expense/finance pages consuming receipts.

---

## 5. Design task: create **4 different Expense Receipt Templates**

Design **four (4) distinct expense receipt templates** (official printable/PDF receipts issued for `EXPENSE` records) that fit this app’s receipt system, data, and verification/branding requirements.

### 5.1 What each template should define (deliverables per template)
For each of the 4 templates provide:
1. **Name & use-case:** (e.g. compact voucher, detailed ledger/grid, formal acknowledgment, minimal modern) — meaningfully different; state suitability for expense scenarios (single/multi-line, reimbursements, vendor payments, petty cash, etc.).
2. **Layout/wireframe:** A4 page structure, header/branding block, document meta (receipt no, issue/payment date, status, copy label), parties/reference (payer/payee/vendor, category, period, place), line-items table/rows, totals/amount-in-words, note/terms, signature/received-by, QR/verify/fingerprint/footer; responsive preview considerations.
3. **Data mapping table:** exact fields/elements and source from receipt context/payload (`title, receiptNumber, issuedAt/paidAt, sourceRef`, school branding, `payerName/payeeName/cashierName/authorizedSigner*`, `lineItems`, `currency/amount/amountInWords`, `categoryLabel/periodLabel/paymentMethod/placeOfIssue/note`, `verifyUrl/qrDataUrl/payloadHash`, status/void/copy). Note which fields may be null for expenses and required fallbacks.
4. **Visual/system specs:** typography, spacing, grid/rules, accent/brand-color usage, logo/monogram handling, void watermark/state, RTL/locale readiness, print/PDF fidelity (A4, margins, page breaks for long item lists).
5. **Interaction/flow notes:** selection in Settings (role/type = EXPENSE), preview endpoint behavior, issue/download/reissue/void lifecycle, public verification display consistency.
6. **States & edge cases:** missing logo/signature/address/contact, no category/period/note, many line items (pagination/overflow), voided/superseded receipts, long text wrapping, different currencies/amount magnitudes.
7. **Implementation notes:** target engine (`html` Mustache + `receiptHtmlBuilder`/`htmlToPdf` preferred for new designs, or `pdfkit`) and integration points (`receiptTemplateRegistry` defs/IDs, `receipt-templates/<slug>.html`, `receiptRender`/`receiptContext` field usage), plus any minimal context additions (clearly flagged).

### 5.2 Constraints & non-goals
- **Do not invent data:** render `—`/omit optional blocks when values are absent (align with `has*` flags and current context behavior).
- **Integrity/verification:** preserve display of `receiptNumber`, `verifyUrl`/QR, and payload fingerprint/hash cues as applicable; do not weaken void/superseded signaling.
- **Branding/tenancy:** school-scoped logo/name/address/brand color/timezone/locale; role-based template selection must remain compatible.
- **A4 print fidelity:** designs must render reliably to A4 PDF and in preview.
- **Out of scope unless stated:** changing expense business logic, fee/payroll calculation rules, payment processing, or non-receipt finance modules.

### 5.3 Suggested variety axes (pick distinct combinations for the 4)
- **Density:** compact voucher vs detailed multi-line ledger.
- **Hierarchy:** amount/total-first vs document/meta-first.
- **Formality:** corporate/formal vs modern minimal.
- **Structure:** table/grid-heavy vs stacked sections/cards.

---

## 6. Pointers to inspect in-repo

- **Schema:** `prisma/schema.prisma` (`Receipt`, `ReceiptCounter`, `Expense`, `ExpenseCategory`, `Payroll`/fee models for cross-type awareness).
- **Finance service:** `services/finance/src/controllers/receiptController.ts`, `services/receiptService.ts`, `routes/financeRoutes.ts`, `lib/receiptTemplateRegistry.ts`, `receiptContext.ts`, `receiptHtmlBuilder.ts`, `receiptRender.ts`, `receiptPdf.ts`, `receiptFormat.ts`, `receiptStorage.ts`, `i18n/receiptChrome.ts`, `receipt-templates/*.html`.
- **Frontend:** `src/features/receipts/registry.ts`, `src/features/settings/components/ReceiptTemplatePreview.tsx`, `TemplatePreviewModal.tsx`, `src/services/receiptsApi.ts`, `src/features/expenses/*`, `src/pages/PublicReceiptVerify.tsx`.
- **Identity/settings:** school receipt template config fields (`receiptTemplate`, `receiptTemplates`, `receiptTemplatesByRole`) and role/type permissions.

---

## 7. Acceptance checklist for the produced designs

- [ ] 4 clearly distinct, named expense receipt templates with full specs (§5.1).
- [ ] Each maps to real receipt/expense/context fields and finance APIs/registry (or clearly labels any minimal extension).
- [ ] Handles expense-appropriate metadata, line items, amounts, branding, signatures, QR/verify, void states, and missing-data/overflow cases.
- [ ] Includes layout + print/PDF + implementation notes sufficient for handoff.
- [ ] No fabricated fields; respects RBAC/tenancy, issue-time template resolution, and verification/integrity requirements.
