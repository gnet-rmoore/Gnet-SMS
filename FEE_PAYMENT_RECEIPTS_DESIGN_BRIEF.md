# Fee Payment Receipt Templates Design Brief (for AI Design/Implementation)

> **Purpose:** Give an AI agent (e.g. Claude) enough product, data-model, API, and UI-flow context to design **4 different fee payment receipt templates** for this app.
>
> **Repo:** `Gnet-SMS-2026` (School Management System)  
> **Working assumptions:** Based on code in this repository (Prisma schema, finance fee/receipt system in `services/finance`, frontend receipt selection/preview in `src/features/receipts` and `src/features/settings`, fees feature `src/features/fees`). Treat endpoint contracts and context shapes below as the integration surface.

---

## 1. Product & architecture overview

Multi-tenant, multi-role School Management System. Finance manages student fees/invoices, collections, and **official fee payment receipts** (verifiable PDF/HTML) issued within a unified receipt system shared with payslips, expenses, and transactions.

- **Frontend:** React 19 + Vite 6, Tailwind CSS 4, Zustand, React Router, i18n. Feature folders under `src/features/*`.
- **Backend:** Node.js/Express microservices under `services/` (notably `finance`, `identity`, `lifecycle`/student context, `gateway`). Prisma ORM.
- **Database:** SQLite (dev) / PostgreSQL (prod). Main schema: `prisma/schema.prisma`.
- **Tenancy/auth:** School-scoped (`schoolId`), JWT auth, RBAC. Fee receipts are sensitive (student/parent-scoped visibility) and template selection is role-bucketed (`REGISTRAR`, `PRINCIPAL`, `SCHOOL_ADMIN` priority for fee issuance).

---

## 2. Fee payment & receipt domain model

### 2.1 Fee/payment records (source for fee receipts)
- **Fee structures/templates/invoices & payments (finance schema/services):** fee setup and billing generate obligations and payment transactions. Relevant schema/service concepts include `FeeTemplate`/fee structures, invoices/fee records, and payment transactions (e.g. `FeePaymentTxn` with kinds such as `PAYMENT`, links to student/invoice/school, payer info) — inspect `prisma/schema.prisma` and `services/finance/src/services/financeService.ts`/fee libs for exact fields in use.
- **Issuance source:** fee payment receipts are issued for a **payment source** via `receiptService.issueForFeePayment(sourceId, issuedBy?, supersedesId?)` (source typically a fee payment/transaction id). Service derives payer/payee, student, amounts, balances, category/period, method, references, and line items from finance records.
- **Fees UI:** `src/features/fees/*` (e.g. `components/ReceiptsTab.tsx`, templates/setup/payments views, hooks/api) manages fee collection and receipt actions.

### 2.2 Receipt core model (shared)
- **`Receipt`**: `schoolId`, `type="FEE_PAYMENT"`, `sourceType/sourceId`, `receiptNumber`, `status` (`ISSUED/VOIDED/SUPERSEDED`), `issuedAt`, `voidedAt/voidReason`, `supersedesId`, `payeeName` (school), `payerName`, `currency`, `amount` (amount paid), `lineItems` JSON, `payloadHash`, `verifyCode`, `fileUrl`, `issuedBy`, branding snapshot.
- **`ReceiptCounter`**: per-school/year numbering.
- **Access control:** staff roles (e.g. `SCHOOL_ADMIN`, `ACCOUNTANT`, `PRINCIPAL`, `REGISTRAR`, `VPA`, `IT_ADMIN`) have broader access; **`STUDENT`/`PARENT`** may only access receipts for their own/children’s fee payments (ownership resolved via `getFeeReceiptSourceIds` using student/parent-child linkage). Download/list/get enforce scope; others receive not-found/denied behavior as implemented.

### 2.3 Template selection & rendering system
- **Template IDs/defs:** `COMPACT_GRID`, `MINIMAL_LINE` (shared registry frontend/backend).
  - `MINIMAL_LINE` recommended for `FEE_PAYMENT` (and others); `COMPACT_GRID` optimized for dense `PAYSLIP/EXPENSE` but selectable per role config.
- **Per-type, per-role config:** `receiptTemplatesByRole` (roles include `PRINCIPAL`, `REGISTRAR`, `SCHOOL_ADMIN` configuring `FEE_PAYMENT`; accountant config excludes fee type by default). **Issue-time priority for `FEE_PAYMENT`:** `REGISTRAR` → `PRINCIPAL` → `SCHOOL_ADMIN` with legacy fallbacks.
- **Rendering:** HTML Mustache templates (`services/finance/src/receipt-templates/*.html`) via `receiptHtmlBuilder`/`receiptRender` → `htmlToPdf`, fallback `receiptPdf` (PDFKit). Preview via `renderReceiptPreviewHtml` for HTML templates. Context from `buildReceiptContext` with branding, locale/timezone, QR/verify, amount-in-words, formatted details.

### 2.4 Fee receipt render context (key fields)
`ReceiptPdfInput` / `ReceiptTemplateContext` includes:
- **Document/meta:** `title` (official fee receipt), `receiptNumber`, `issuedAt`, `paidAt`, `status`, `copyLabel`, `sourceRef` (payment/invoice refs), `verifyUrl`, `qrDataUrl`, `payloadHash/fingerprint`, `locale/dir`, `schoolTimezone`.
- **School branding:** `schoolName`, `schoolAddress`, `schoolEmail`, `schoolPhone`, `schoolLogoUrl/monogram`, `brandColor`.
- **Parties:** `payerName` (parent/payer), `payeeName` (school), `studentName`, `cashierName`, `authorizedSignerName/title/signatureUrl`.
- **Payment/financials:** `currency`, `amount` (this payment), `amountDisplay`, `amountInWords`, `lineItems[]` — finance composes lines conveying **payment amount**, **previous balance owing**, **balance after payment**, **invoice/billed totals** and/or itemized fee components as applicable; `categoryLabel` (e.g. Tuition), `periodLabel` (e.g. academic year/term), `paymentMethod` (CASH/CHECK/TRANSFER/CARD/CHECKOUT/OTHER), `balanceBefore`, `balanceAfter`.
- **Other:** `placeOfIssue`, `note`, composed `detailItems` and `has*` flags, localized chrome labels.

**Sample/preview context** (`monroviaAcademySampleInput` in `receiptContext.ts`) demonstrates a tuition fee payment with student, period, method, balances, and multi-line breakdown — useful reference for expected richness.

---

## 3. Key API surface & flows

Base `/api/...` via gateway.

### 3.1 Receipt endpoints (finance)
- `GET /api/schools/:schoolId/receipts/templates`, `GET /api/schools/:schoolId/receipts/preview?templateId=...`
- `GET /api/schools/:schoolId/receipts?type=FEE_PAYMENT&sourceId=...` — list (staff full school scope; student/parent restricted to owned fee receipts).
- `POST /api/schools/:schoolId/receipts/issue` — `{ type: "FEE_PAYMENT", sourceId: "<payment/txnId>" }` → `issueForFeePayment`.
- `GET /api/receipts/:id`, `GET /api/receipts/:id/download` (scope-checked; PDF refreshed with current template/branding when possible).
- `POST /api/receipts/:id/void`, `POST /api/receipts/:id/reissue` (reissue supported for `FEE_PAYMENT`/`EXPENSE`).
- `GET /api/public/receipts/verify/:code` — public verification (rate-limited).
- Internal fee/receipt helpers: e.g. finance internal receipt/fee endpoints (see `financeRoutes.ts`, `financeController`).

### 3.2 Settings & preview
- `src/features/receipts/registry.ts`: role/type permissions (`PRINCIPAL/REGISTRAR` can configure `FEE_PAYMENT`), parsing/merge/resolution, `receiptPreviewUrl`.
- `src/features/settings/components/ReceiptTemplatePreview.tsx`, `TemplatePreviewModal.tsx` with `previewReceiptType="FEE_PAYMENT"`.

### 3.3 Fees UI & verification
- `src/features/fees/components/ReceiptsTab.tsx` and fees flows for issuing/downloading/viewing fee receipts.
- `src/pages/PublicReceiptVerify.tsx` for QR/code verification; `src/services/receiptsApi.ts` for client calls.

---

## 4. Current frontend/backend surfaces

- **Finance:** `services/finance/src/services/receiptService.ts` (`issueForFeePayment`, ownership helpers, render/store), `controllers/receiptController.ts`, `routes/financeRoutes.ts`, `lib/receiptTemplateRegistry.ts`, `receiptContext.ts`, `receiptHtmlBuilder.ts`, `receiptRender.ts`, `receiptPdf.ts`, `receiptFormat.ts`, `receiptStorage.ts`, `i18n/receiptChrome.ts`, `receipt-templates/*.html`, fee-related libs/services/controllers.
- **Frontend:** `src/features/receipts/registry.ts`, `src/features/fees/components/ReceiptsTab.tsx`, `src/features/fees/*`, `src/features/settings/components/ReceiptTemplatePreview.tsx`, `src/pages/PublicReceiptVerify.tsx`, `src/services/receiptsApi.ts`.
- **Schema:** `prisma/schema.prisma` (`Receipt`, `ReceiptCounter`, `FeePaymentTxn`, fee/invoice/template/payment models).

---

## 5. Design task: create **4 different Fee Payment Receipt Templates**

Design **four (4) distinct fee payment receipt templates** (official printable/PDF receipts for `FEE_PAYMENT`) that fit this app’s finance data, student/parent use cases, and verification/branding requirements.

### 5.1 What each template should define (deliverables per template)
For each of the 4 templates provide:
1. **Name & use-case:** (e.g. parent-friendly acknowledgment, detailed statement with balances, compact cashier slip, formal official receipt) — meaningfully different; consider partial payments, arrears, multi-item fees, installments/terms.
2. **Layout/wireframe:** A4 structure, school branding/header, receipt meta (number, issue/payment date, status, copy), payer/parent and student/beneficiary blocks, payment details (method, reference, period/category, place), line-items/balance breakdown table (amount paid, previous balance, balance after, billed totals/items as available), total and amount-in-words, notes, signature/cashier/received-by, QR/verify/fingerprint/footer.
3. **Data mapping table:** fields and source from context (`title, receiptNumber, issuedAt/paidAt`, school branding, `payerName/payeeName/studentName`, `paymentMethod, sourceRef, categoryLabel, periodLabel`, `lineItems`, `currency/amount/amountInWords`, `balanceBefore/balanceAfter`, `cashierName`, `authorizedSigner*`, `placeOfIssue/note/copyLabel`, `verifyUrl/qrDataUrl/payloadHash`, status/void). Specify rendering when balances/period/student/category are null.
4. **Visual/system specs:** typography and hierarchy (amount paid & balance due clarity), tables/rules, brand-color/logo/monogram use, void watermark, locale/RTL readiness, print/PDF fidelity (A4, margins, multi-line/pagination behavior).
5. **Interaction/flow notes:** Settings selection for `FEE_PAYMENT` (registrar/principal/admin roles), preview, issuance from fee payment records, download (with re-render behavior), reissue/void, student/parent scoped access, public verification experience.
6. **States & edge cases:** missing student/period/category/balances, zero/credit balances, multiple fee line items, partial payments, voided/superseded receipts, missing signature/logo/contact, long names/refs, currency formatting.
7. **Implementation notes:** target `html` engine/slugs in `receipt-templates`, registry defs (`recommendedFor` includes `FEE_PAYMENT`), reliance on `issueForFeePayment`/`receiptContext` fields and `detailItems/lineItems` composition, and any minimal context or service extensions (clearly flagged).

### 5.2 Constraints & non-goals
- **Do not invent data:** never fabricate balances, student identity, invoice numbers, or payment status; show `—`/omit unavailable fields.
- **Financial clarity & integrity:** clearly label amount paid vs amounts owed/billed/balance; preserve receipt number, verify/QR, fingerprint, and void signaling.
- **Privacy/tenancy:** enforce school scoping and student/parent ownership rules; designs must suit both staff-issued and parent/student-viewed contexts.
- **A4 print fidelity:** reliable preview and PDF output.
- **Out of scope unless stated:** fee calculation/business rule changes, payment gateway/checkout logic, reconciliation/accounting modules beyond receipt presentation.

### 5.3 Suggested variety axes (pick distinct combinations for the 4)
- **Clarity focus:** payment confirmation-first vs full statement-of-account style.
- **Density:** compact slip vs detailed multi-line/balance table.
- **Audience tone:** parent-friendly vs formal institutional.
- **Layout:** single-column narrative vs structured grid/two-panel summary.

---

## 6. Pointers to inspect in-repo

- **Schema:** `prisma/schema.prisma` (`Receipt`, `ReceiptCounter`, `FeePaymentTxn`, `FeePayment`, fee/invoice/template/structure models).
- **Finance service:** `services/finance/src/services/receiptService.ts` (`issueForFeePayment`, scope helpers), `controllers/receiptController.ts`, `routes/financeRoutes.ts`, `lib/receiptTemplateRegistry.ts`, `receiptContext.ts` (incl. `monroviaAcademySampleInput`), `receiptHtmlBuilder.ts`, `receiptRender.ts`, `receiptPdf.ts`, `receiptFormat.ts`, `receiptStorage.ts`, `i18n/receiptChrome.ts`, `receipt-templates/*.html`, fee services/controllers/libs.
- **Frontend:** `src/features/receipts/registry.ts`, `src/features/fees/components/ReceiptsTab.tsx`, `src/features/fees/*`, `src/features/settings/components/ReceiptTemplatePreview.tsx`, `TemplatePreviewModal.tsx`, `src/pages/PublicReceiptVerify.tsx`, `src/services/receiptsApi.ts`.
- **Identity/access:** `services/finance/src/lib/identityClient.ts` (parent-child linkage), auth/role middleware behavior.

---

## 7. Acceptance checklist for the produced designs

- [ ] 4 clearly distinct, named fee payment receipt templates with full specs (§5.1).
- [ ] Each maps to real fee/receipt context fields and finance APIs/registry (or clearly labels any minimal extension).
- [ ] Clearly presents payer/student, payment details, amount paid, balances/line breakdown as available, branding, signatures, QR/verify, void states, and missing-data/overflow cases.
- [ ] Includes layout + print/PDF + access/flow + implementation notes sufficient for handoff.
- [ ] No fabricated fields; respects RBAC/tenancy, student/parent privacy, financial accuracy, and verification integrity.
