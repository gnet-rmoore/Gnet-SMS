# Payslip Receipt Templates Design Brief (for AI Design/Implementation)

> **Purpose:** Give an AI agent (e.g. Claude) enough product, data-model, API, and UI-flow context to design **4 different payslip receipt templates** for this app.
>
> **Repo:** `Gnet-SMS-2026` (School Management System)  
> **Working assumptions:** Based on code in this repository (Prisma schema, finance payroll/receipt system in `services/finance`, frontend receipt selection/preview in `src/features/receipts` and `src/features/settings`, payroll feature `src/features/payroll`). Treat endpoint contracts and context shapes below as the integration surface.

---

## 1. Product & architecture overview

Multi-tenant, multi-role School Management System. Finance includes payroll processing and **official payslip receipts** (verifiable PDF/HTML documents) issued as a receipt type within the unified receipt system.

- **Frontend:** React 19 + Vite 6, Tailwind CSS 4, Zustand, React Router, i18n. Feature folders under `src/features/*`.
- **Backend:** Node.js/Express microservices under `services/` (notably `finance`, `staff`, `identity`, `gateway`). Prisma ORM.
- **Database:** SQLite (dev) / PostgreSQL (prod). Main schema: `prisma/schema.prisma`.
- **Tenancy/auth:** School-scoped (`schoolId`), JWT auth, role-based access. Payslip receipt templates are configured/issued under finance roles (notably `ACCOUNTANT`, with `SCHOOL_ADMIN` fallback).

---

## 2. Payroll & payslip receipt domain model

### 2.1 Payroll/staff records (source for payslips)
- **`Payroll`** (`prisma/schema.prisma`): payroll run/record per staff member and period (school-scoped). Core compensation fields used by issuance include **basic salary**, **allowances**, **deductions**, **net salary**, and period identifiers (**month**, **year**), plus staff linkage/identifiers as defined in schema/service.
- **Staff context:** staff identity/name/role/department may be resolved via `services/staff`/identity clients (`finance` uses `staffClient`, `identityClient`) to populate payee/payer and labels.
- **Payroll UI:** `src/features/payroll/*` (e.g. `components/PayslipDrawer.tsx`, API/hooks/page) manages payroll records and surfaces payslip actions.

### 2.2 Receipt core model (shared)
- **`Receipt`**: issued document snapshot — `schoolId`, `type="PAYSLIP"`, `sourceType/sourceId` (payroll/source ref), `receiptNumber`, `status` (`ISSUED/VOIDED/SUPERSEDED`), timestamps, `payeeName` (staff), `payerName` (school), `currency`, `amount` (typically net pay), `lineItems` JSON, `payloadHash`, `verifyCode`, `fileUrl`, `issuedBy`, `supersedesId`, branding snapshot.
- **`ReceiptCounter`**: per-school/year sequential numbering.
- **Verification:** public verify endpoint + QR/HMAC-based integrity (`payloadHash`, verify URL/code).

### 2.3 Template selection & rendering system
- **Template IDs/defs (shared):** `COMPACT_GRID`, `MINIMAL_LINE` in `src/features/receipts/registry.ts` and `services/finance/src/lib/receiptTemplateRegistry.ts`.
  - `COMPACT_GRID`: "Dense grid for payslips and expense receipts with many line items." (`recommendedFor: ["PAYSLIP","EXPENSE"]`, `engine: "html"`)
  - `MINIMAL_LINE`: modern minimal, `recommendedFor` includes `PAYSLIP` (and others), `engine: "html"`.
- **Per-type, per-role config:** `receiptTemplatesByRole` / legacy fields on school. `ACCOUNTANT` may configure `PAYSLIP, EXPENSE, TRANSACTION` (and `SCHOOL_ADMIN` bucket fallback). **Issue-time priority for `PAYSLIP`:** `ACCOUNTANT` → `SCHOOL_ADMIN` (`RECEIPT_ISSUE_ROLE_ORDER`).
- **Rendering pipeline:** `renderReceiptDocument` / `renderReceiptPreviewHtml` using Mustache HTML templates (`services/finance/src/receipt-templates/*.html`) + `htmlToPdf` (Puppeteer/html pipeline) or PDFKit fallback; context via `buildReceiptContext` (`receiptContext.ts`) with i18n chrome (`receiptChrome.ts`), formatting (`receiptFormat.ts`), QR, branding, amount-in-words.

### 2.4 Payslip issuance inputs & render context
**Issuance (finance service/controller):**
- `receiptService.issueForPayslip({ schoolId, payrollId, staffName, schoolName?, month, year, basicSalary, allowances, deductions, netSalary, currency?, issuedBy })`
- `POST /api/schools/:schoolId/receipts/issue` with `type="PAYSLIP"` requires `sourceId` (payrollId) and body fields such as `staffName`, `month`, `year`, `basicSalary`, `allowances`, `deductions`, `netSalary`, optional `currency`, `schoolName` (validated/assembled in controller/service).
- Internal issuance: `POST /api/internal/receipts/issue` supports `PAYSLIP`.

**Context available to templates (`ReceiptPdfInput` / `ReceiptTemplateContext`):**
- **Document/meta:** `title` (e.g. official payslip), `receiptNumber`, `issuedAt`, `status`, `copyLabel`, `sourceRef`, `verifyUrl`, `qrDataUrl`, payload fingerprint, `locale/dir`, school timezone formatting.
- **Branding:** `schoolName`, `schoolAddress`, `schoolEmail`, `schoolPhone`, `schoolLogoUrl/monogram`, `brandColor`.
- **Parties:** `payerName` (school/employer), `payeeName` (staff), `cashierName`/received-by, `authorizedSignerName/title/signatureUrl`.
- **Compensation/lines:** `currency`, `amount` (net pay), `amountDisplay`, `amountInWords`, `lineItems[]` (`label, amount`) — typically includes earnings and deductions breakdown (e.g. basic salary, allowances, deductions, net) as composed by `issueForPayslip`.
- **Details/meta:** `periodLabel` / pay period (month/year), `categoryLabel` if set, `paymentMethod`, `paidAt`, `placeOfIssue`, `note`, composed `detailItems` & `has*` flags.
- **i18n labels:** payslip/receipt chrome keys (e.g. `officialPayslip`, receipt no/issue date/reference, parties, line items/description/amount/total, amount in words, received/signature, verify, void, status/method labels).

---

## 3. Key API surface & flows

Base `/api/...` via gateway.

### 3.1 Receipt endpoints (finance)
- `GET /api/schools/:schoolId/receipts/templates` — available templates.
- `GET /api/schools/:schoolId/receipts/preview?templateId=...` — Settings preview (auth, tenant).
- `GET /api/schools/:schoolId/receipts?type=PAYSLIP&...` — list (scoped).
- `POST /api/schools/:schoolId/receipts/issue` — issue; for payslip provide `type:"PAYSLIP"`, `sourceId` (payrollId), staff/period/salary breakdown fields.
- `GET /api/receipts/:id`, `GET /api/receipts/:id/download` (re-render with current template/branding where applicable), `POST /api/receipts/:id/void`, `POST /api/receipts/:id/reissue`.
- `GET /api/public/receipts/verify/:code` — public verification.
- Internal: `POST /api/internal/receipts/issue`, `POST /api/internal/receipts/void-by-source`.

### 3.2 Settings & preview
- **Frontend:** `src/features/receipts/registry.ts` (defs, role→type permissions, parse/merge/resolve, `receiptPreviewUrl`), `src/features/settings/components/ReceiptTemplatePreview.tsx`, `TemplatePreviewModal.tsx` (`RECEIPT` preview, `previewReceiptType="PAYSLIP"`), `src/services/receiptsApi.ts`.
- **Selection:** accountants/admins choose template per receipt type; issue resolves by role priority for `PAYSLIP`.

### 3.3 Payroll UI
- `src/features/payroll/*` (page, `PayslipDrawer`, API/hooks) displays payroll data and integrates payslip receipt issuance/download/verification where implemented.

---

## 4. Current frontend/backend surfaces

- **Finance:** `services/finance/src/controllers/receiptController.ts`, `services/receiptService.ts` (`issueForPayslip`), `lib/receiptTemplateRegistry.ts`, `receiptContext.ts`, `receiptHtmlBuilder.ts`, `receiptRender.ts`, `receiptPdf.ts`, `receiptFormat.ts`, `receiptStorage.ts`, `i18n/receiptChrome.ts`, `receipt-templates/*.html`.
- **Frontend:** `src/features/receipts/registry.ts`, `src/features/settings/components/ReceiptTemplatePreview.tsx`, `src/features/payroll/components/PayslipDrawer.tsx`, `src/pages/PublicReceiptVerify.tsx`, `src/services/receiptsApi.ts`.

---

## 5. Design task: create **4 different Payslip Receipt Templates**

Design **four (4) distinct payslip receipt templates** (official printable/PDF payslips issued for `PAYSLIP`/payroll records) that fit this app’s receipt system, payroll data, and verification/branding requirements.

### 5.1 What each template should define (deliverables per template)
For each of the 4 templates provide:
1. **Name & use-case:** (e.g. detailed earnings/deductions statement, compact payslip, formal HR letter style, modern minimal) — meaningfully different; consider monthly payroll, allowances/deductions complexity, and staff-facing clarity.
2. **Layout/wireframe:** A4 structure, school/employer header & branding, payslip meta (payslip/receipt no, issue/pay date, pay period month-year, status/copy), employee/payee and employer/payer blocks, earnings/deductions/net breakdown (table or structured sections), amount-in-words, notes, signature/authorization and received-by, QR/verify/fingerprint/footer.
3. **Data mapping table:** fields and source from receipt/payslip context (`title, receiptNumber, issuedAt/paidAt`, `periodLabel`/month-year, `school*` branding, `payerName/payeeName/staffName`, `lineItems` for basic/allowances/deductions/net, `currency/amount/net/amountInWords`, `paymentMethod`, `cashierName`, `authorizedSigner*`, `sourceRef`, `verifyUrl/qrDataUrl/payloadHash`, status/void/copy). Specify fallbacks when optional fields absent.
4. **Visual/system specs:** typography, hierarchy (net pay prominence vs breakdown), grid/rules, brand-color use, logo/monogram, void watermark, locale/RTL readiness, print/PDF fidelity (A4, margins, pagination for extended breakdowns if applicable).
5. **Interaction/flow notes:** Settings selection for `PAYSLIP` (role-allowed), preview, issuance from payroll context (`issueForPayslip`/API), download/reissue/void, public verification.
6. **States & edge cases:** missing signature/logo/contact, zero allowances or deductions, many earning/deduction lines, voided/superseded, long staff/school names, varying currencies/amount formats.
7. **Implementation notes:** target `html` engine/slugs for `receipt-templates`, registry defs (`recommendedFor` includes `PAYSLIP`), context/line-item composition in `receiptService.issueForPayslip` and `receiptContext`, and any minimal extensions (clearly flagged).

### 5.2 Constraints & non-goals
- **Do not invent data:** only display values provided/derivable from payroll & receipt context; show `—`/omit when missing.
- **Accuracy & integrity:** clearly distinguish gross components vs deductions vs net; preserve receipt number, verify/QR, fingerprint, and void signaling.
- **Confidentiality/tenancy:** school-scoped, role-appropriate access; do not expose unrelated staff/finance data.
- **A4 print fidelity:** must render correctly in preview and PDF.
- **Out of scope unless stated:** payroll calculation/tax logic changes, bank disbursement, non-receipt HR modules.

### 5.3 Suggested variety axes (pick distinct combinations for the 4)
- **Breakdown style:** detailed tabular grid vs summarized sections.
- **Emphasis:** net-pay hero vs full statement of earnings/deductions.
- **Formality:** corporate/HR formal vs compact voucher vs modern minimal.
- **Density/layout:** single-column vs two-column/meta+table compositions.

---

## 6. Pointers to inspect in-repo

- **Schema:** `prisma/schema.prisma` (`Payroll`, `Receipt`, `ReceiptCounter`, staff-related models).
- **Finance service:** `services/finance/src/services/receiptService.ts` (`issueForPayslip`), `controllers/receiptController.ts`, `routes/financeRoutes.ts`, `lib/receiptTemplateRegistry.ts`, `receiptContext.ts`, `receiptHtmlBuilder.ts`, `receiptRender.ts`, `receiptPdf.ts`, `receiptFormat.ts`, `receiptStorage.ts`, `i18n/receiptChrome.ts`, `receipt-templates/*.html`.
- **Frontend:** `src/features/receipts/registry.ts`, `src/features/settings/components/ReceiptTemplatePreview.tsx`, `TemplatePreviewModal.tsx`, `src/features/payroll/components/PayslipDrawer.tsx`, `src/features/payroll/*`, `src/pages/PublicReceiptVerify.tsx`, `src/services/receiptsApi.ts`.
- **Identity/staff:** `services/finance/src/lib/identityClient.ts`, `staffClient.ts` for resolved names/branding context.

---

## 7. Acceptance checklist for the produced designs

- [ ] 4 clearly distinct, named payslip receipt templates with full specs (§5.1).
- [ ] Each maps to real payroll/receipt context fields and finance APIs/registry (or clearly labels any minimal extension).
- [ ] Clearly presents pay period, earnings/deductions/net, parties, branding, signatures, QR/verify, void states, and missing-data/overflow cases.
- [ ] Includes layout + print/PDF + implementation notes sufficient for handoff.
- [ ] No fabricated fields; respects RBAC/tenancy, payroll integrity, and receipt verification requirements.
