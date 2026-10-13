# Receipt HTML Templates — Integration Plan

> **Status:** Partial (2026-08-07) — Phases A–D shipped (registry, Mustache HTML templates, Finance render router, Settings picker, preview API, role access); Phase C Docker Chromium in Finance image; Phase E/F partial (5 templates, context tests)  
> **Scope:** Connect AI/designer HTML receipt templates to Finance PDF generation, school Settings picker, and preview  
> **Companion:** `docs/RECEIPTS_PLATFORM_PLAN.md`, `docs/SCHOOL_SETTINGS_PLAN.md`, `docs/DOCUMENT_SIGNATURES_PLAN.md`, `docs/I18N_PLAN.md`  
> **Prerequisite brief for external AI:** see conversation export / prompt in §9

---

## 0. Summary

| Area | Today | Target |
| :--- | :--- | :--- |
| Live PDF | PDFKit monolith in `services/finance/src/lib/receiptPdf.ts` | HTML template → PDF pipeline with PDFKit fallback |
| HTML files | 10 static mockups in `services/finance/src/receipt-templates/` (fake retail/bank data) | Mustache-driven templates bound to `ReceiptPdfInput` |
| School picker | None (`receiptTemplate` field missing on `School`) | Settings → Appearance → Receipt template (like report cards / certificates) |
| Frontend registry | `src/features/receipts/registry.ts` — 5 IDs, not used in Settings | Single source of truth shared with Finance |
| Preview | None | Settings modal + optional `GET …/receipts/preview` |
| i18n | `receiptChrome.ts` — 7 locales for labels | Injected into template context as pre-interpolated `t.*` strings |
| Verify / anti-fraud | Unchanged — QR, HMAC, payload hash | Same fields in every template |

**Honesty:** Receipt **platform** (issue, verify, store, download) is **done**. This plan covers **visual template integration only** — not new receipt types or business rules.

---

## 1. Current architecture

```
Fee paid / Payroll PAID / Expense APPROVED
        │
        ▼
receiptService.issue()
        │  snapshot branding + line items + verify code
        ▼
renderReceiptPdf(ReceiptPdfInput)   ← PDFKit only today
        │
        ▼
MinIO/S3 PDF + Receipt row
        │
        ▼
Fees / Payroll / Expenses / Staff Portal download
Public /verify/receipt/:code
```

**Key files (today):**

| Path | Role |
| :--- | :--- |
| `services/finance/src/lib/receiptPdf.ts` | Active PDF renderer (`ReceiptPdfInput`) |
| `services/finance/src/services/receiptService.ts` | Issue, void, verify, refreshPdf |
| `services/finance/src/i18n/receiptChrome.ts` | Label catalog (7 locales) |
| `services/finance/src/receipt-templates/*.html` | Design prototypes — **not imported** |
| `src/features/receipts/registry.ts` | Frontend-only template metadata (5 entries) |
| `src/features/settings/components/AppearanceSettingsTab.tsx` | No receipt picker yet |
| `services/identity/prisma/schema.prisma` | `School` has no `receiptTemplate` |

---

## 2. Goal

1. Schools pick a receipt layout in **Settings → Appearance**.
2. All newly issued receipts (fee, payslip, expense) render with that template.
3. Existing issued receipts keep immutable verify data; **refreshPdf** may re-render layout using stored snapshot + current school template preference (same rule as logo refresh today).
4. External AI (Claude, etc.) can deliver HTML files that drop into `receipt-templates/` with a documented placeholder contract.
5. **PDFKit default remains** as fallback when HTML render fails or template is `PDFKIT_DEFAULT`.

---

## 3. Data contract

### 3.1 Core input (`ReceiptPdfInput`)

Already defined in `receiptPdf.ts` — templates must consume these fields only (no invented bank/cheque/tax fields):

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `title` | string | ✓ | Localized doc title |
| `receiptNumber` | string | ✓ | `{SLUG}-{YEAR}-{000001}` |
| `issuedAt` | Date | ✓ | Display UTC |
| `schoolName` | string | ✓ | |
| `schoolAddress` | string? | | |
| `schoolEmail` | string? | | |
| `schoolPhone` | string? | | |
| `schoolLogoUrl` | string? | | URL or data URL; empty → monogram |
| `brandColor` | string? | | Hex; accent only — header text black per product preference |
| `payerName` | string | ✓ | |
| `payeeName` | string | ✓ | |
| `currency` | string | ✓ | Usually `USD` |
| `amount` | number | ✓ | Grand total |
| `lineItems` | `{label, amount}[]` | ✓ | Variable length; deductions may be negative |
| `sourceRef` | string | ✓ | Human reference |
| `payloadHash` | string | ✓ | Full SHA-256; show first 16 in footer |
| `verifyUrl` | string | ✓ | Public verify link |
| `status` | string | ✓ | `ISSUED` \| `VOIDED` |
| `locale` | string? | | School default at issue |
| `authorizedSignatureUrl` | string? | | Data URL image |
| `authorizedSignerName` | string? | | |
| `authorizedSignerTitle` | string? | | |

### 3.2 Template context (builder output)

New module: `services/finance/src/lib/receiptContext.ts`

```ts
type ReceiptTemplateContext = ReceiptPdfInput & {
  templateId: string;
  issuedAtFormatted: string;       // "2026-08-06 14:30:00"
  qrDataUrl: string;               // data:image/png;base64,...
  schoolMonogram: string;          // first letter
  isVoided: boolean;
  lineItems: Array<{
    label: string;
    amount: number;
    amountFormatted: string;       // "150.00"
    amountDisplay: string;         // "USD 150.00"
  }>;
  t: Record<ReceiptChromeKey, string>; // pre-interpolated labels
  brandColor: string;              // normalized #RRGGBB
};
```

**Rules:**

- Labels come from `receiptChrome(locale)` — templates use `{{t.parties}}`, not hardcoded English.
- User content (`payerName`, line item labels) is **never translated** — it is snapshot data.
- Arabic locale: builder sets `dir="rtl"` helper flag; template wraps body in `dir="{{dir}}"` when `locale === "ar"`.

### 3.3 Receipt types & sample line items

| Type | Title key | Typical payer → payee | Line items |
| :--- | :--- | :--- | :--- |
| `FEE_PAYMENT` | `officialFeeReceipt` | Parent/student → School | This payment, previous balance, balance after, invoice total |
| `PAYSLIP` | `officialPayslip` | School → Staff | Basic salary, allowances, deductions (−), net pay |
| `EXPENSE` | `expenseReceipt` | School → Vendor/title | `{category}: {title}` |
| `TRANSACTION` | `transactionReceipt` | Context-dependent | Single or custom lines |

Use these in preview fixtures and integration tests.

---

## 4. Template registry

### 4.1 Single registry (Finance + SPA)

New: `services/finance/src/lib/receiptTemplateRegistry.ts` (or shared `packages/receipt-templates` if we want zero drift).

Each entry:

```ts
{
  id: "CLASSIC_LEDGER",           // SCREAMING_SNAKE — stored on School
  slug: "classic-ledger",         // HTML filename stem
  name: "Classic Ledger",
  description: "Serif ledger with clean totals and signature line.",
  accent: "#1a1a1a",              // picker swatch
  engine: "html",                 // "html" | "pdfkit"
  pageSize: "A4",
}
```

**Reconcile disk vs registry today:**

| HTML file | In frontend registry? | Action |
| :--- | :---: | :--- |
| `classic-ledger.html` | ✓ CLASSIC_LEDGER | Remediate placeholders |
| `crimson-statement.html` | ✓ CRIMSON_STATEMENT | Remediate |
| `vermilion-edge.html` | ✓ VERMILION_EDGE | Remediate |
| `navy-bold.html` | ✓ NAVY_BOLD | Remediate |
| `emerald-corporate.html` | ✓ EMERALD_CORPORATE | Remediate |
| `corporate-modern.html` | ✗ | Add or archive |
| `boutique-minimal.html` | ✗ | Add or archive |
| `bank-cheque.html` | ✗ | **Reject** — wrong domain (bank cheque) |
| `sunrise-bold.html` | ✗ | Add or archive |
| `emerald-ledger.html` | ✗ | Add or archive |

Add built-in: `PDFKIT_DEFAULT` — no HTML file; uses current PDFKit renderer.

Frontend `src/features/receipts/registry.ts` becomes a thin re-export or generated mirror of Finance registry.

### 4.2 School setting

**Identity schema:**

```prisma
receiptTemplate String @default("PDFKIT_DEFAULT")
```

- PATCH `/api/schools/:id` accepts `receiptTemplate`.
- Snapshotted into receipt `branding.receiptTemplate` at issue time (for audit / refreshPdf).
- Login payload includes `school.receiptTemplate` for Settings hydrate.

---

## 5. HTML template authoring rules (for Claude / designers)

Deliver **one self-contained HTML file** per template:

1. **Placeholder syntax:** Mustache `{{field}}`, `{{#lineItems}}…{{/lineItems}}`, `{{#schoolLogoUrl}}…{{/schoolLogoUrl}}`.
2. **Page:** A4 portrait; `@media print` removes gray page background and shadows.
3. **Fonts:** Google Fonts OK; prefer widely available families (Inter, Source Serif, Poppins).
4. **Colors:** Executive Slate — ink `#0f172a`, muted `#64748b`, lines `#e2e8f0`; `brandColor` as accent only.
5. **Header:** Black text on white/light — **no** large brand-color header bands (product decision 2026-08).
6. **Total row:** Black bold text — **no** colored button/chip background.
7. **Required blocks:** header, title, receipt #, issued date, status, parties, line table, total, signature, QR + verify URL + fingerprint.
8. **Void:** `{{#isVoided}}` diagonal watermark using `{{t.voided}}`.
9. **Forbidden:** bank names, payment method, cheque fields, qty/unit price columns, amount-in-words (not in data model), interactive inputs, Print toolbar buttons.
10. **Sample data:** use Liberian school fixture (Monrovia Academy) — not US bike shops or Meridian Bank.

---

## 6. Rendering pipeline

### 6.1 Recommended approach: HTML → PDF via headless Chromium

**Why:** Matches certificate/report-card HTML-first pattern; designers work in HTML/CSS; PDFKit stays as fallback.

**New modules (Finance):**

| Module | Responsibility |
| :--- | :--- |
| `receiptContext.ts` | Build `ReceiptTemplateContext` from `ReceiptPdfInput` + QR |
| `receiptHtmlBuilder.ts` | Load template HTML, Mustache render |
| `receiptHtmlToPdf.ts` | Puppeteer (or `puppeteer-core` + system Chromium) print to PDF |
| `receiptRender.ts` | Router: registry lookup → HTML path or PDFKit fallback |

**Flow:**

```
ReceiptPdfInput + templateId
        │
        ▼
buildReceiptContext()
        │
        ▼
renderReceiptHtml(templateId, context)  → HTML string
        │
        ▼
htmlToPdf(html, { format: "A4", printBackground: true })
        │
        ▼
Buffer (PDF)
```

**Dependencies:** add `mustache` + `puppeteer-core` (or `@sparticuz/chromium` for Lambda-style; for Docker use bundled Chromium).

**Docker (Finance Dockerfile):**

- Switch runtime base from `node:20-alpine` to `node:20-bookworm-slim` **or** install Chromium deps on Alpine (`chromium`, `nss`, `freetype`, etc.).
- Env: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- Document memory: ~256–512 MB headroom for concurrent PDF jobs.

**Fallback:** On template missing, Chromium crash, or timeout (>15s) → log warning → `renderReceiptPdf()` PDFKit path. Never fail receipt issuance silently without PDF.

### 6.2 Alternative (deferred): SPA print-only templates

Browser print from React components (like early grade sheets) — **not recommended** for official receipts because:

- Server must own the official PDF (anti-fraud, immutable storage).
- Parents download from server, not client-generated files.

### 6.3 refreshPdf behavior

When school changes template in Settings:

- **New issues:** use new template immediately.
- **refreshPdf(receiptId):** re-render with **stored** line items / verify code / number; use `branding.receiptTemplate` if present, else current school setting.
- Does **not** change `payloadHash` or verify signature.

---

## 7. UI integration

### 7.1 Settings → Appearance

Mirror certificate/report-card picker pattern in `AppearanceSettingsTab.tsx`:

- New section: **Receipt template**
- Grid of cards from `RECEIPT_TEMPLATES` (name, description, accent swatch, Preview button)
- Saves `receiptTemplate` via Identity PATCH
- i18n keys: `pages:settings.receiptTemplate`, `receiptTemplateHint`

### 7.2 Template preview

Extend `TemplatePreviewRenderer.tsx`:

- New type: `"RECEIPT"`
- Renders iframe or scaled HTML from preview API with sample Monrovia Academy data + current school logo/brand

**Preview API (Finance):**

```
GET /api/schools/:schoolId/receipts/preview?templateId=CLASSIC_LEDGER
```

- Auth: School Admin, Principal, Accountant
- Returns `{ html: string }` or PDF stream — HTML preferred for Settings modal
- Uses same builder as production; no verify code persisted

### 7.3 Download UX

No change — Fees / Payroll / Expenses continue to hit existing receipt download endpoints. Template affects bytes only.

---

## 8. Phased delivery

### Phase A — Registry + schema + context (no Chromium yet)

| Work | Detail |
| :--- | :--- |
| Add `School.receiptTemplate` | Identity schema + PATCH + login DTO |
| Unified registry | Finance + mirror to `src/features/receipts/registry.ts` |
| `receiptContext.ts` | Context builder + sample fixture export |
| Remediate 5 registry HTML files | Replace fake data with Mustache; remove bank/retail fields |
| Tests | Context builder unit tests; registry resolves all slugs |

**Acceptance:** `npx tsx tests/receipt-context.test.ts` green; all 5 templates parse without Mustache errors using fixture.

**Services:** identity, finance, frontend-spa (registry import only)

---

### Phase B — HTML render + PDFKit router

| Work | Detail |
| :--- | :--- |
| `receiptHtmlBuilder.ts` | Load `receipt-templates/{slug}.html`, Mustache render |
| `receiptRender.ts` | `templateId === PDFKIT_DEFAULT` → PDFKit; else HTML string (log only in dev) |
| Wire `receiptService.issue` + `refreshPdf` | Pass `school.receiptTemplate`; snapshot in branding |
| Chromium spike | Local proof: HTML → PDF buffer matches A4 |

**Acceptance:** Issue fee receipt with `CLASSIC_LEDGER` in dev with Chromium produces valid PDF; fallback to PDFKit when `receiptTemplate=PDFKIT_DEFAULT`.

**Services:** finance

---

### Phase C — Docker Chromium + production path

| Work | Detail |
| :--- | :--- |
| Finance Dockerfile | Chromium + deps; document image size tradeoff |
| `receiptHtmlToPdf.ts` | Production Puppeteer pool (reuse browser instance) |
| Timeouts / concurrency | Queue or limit parallel renders (e.g. max 2) |
| Env flags | `RECEIPT_HTML_PDF=1` kill switch → PDFKit only |

**Acceptance:** `docker compose up --build finance` → issue receipt → downloaded PDF matches selected template; `/health/live` still passes.

**Services:** finance, docker-compose

---

### Phase D — Settings UI + preview

| Work | Detail |
| :--- | :--- |
| Appearance picker | Receipt template grid + save |
| Preview modal | `TemplatePreviewRenderer` type `RECEIPT` |
| Preview API | Finance GET preview endpoint |
| i18n | Settings labels in `pages` catalog (7 locales) |

**Acceptance:** Settings → pick Vermilion Edge → Preview shows school name/logo → Save → new fee receipt uses template.

**Services:** identity, finance, frontend-spa

---

### Phase E — Template pack expansion + AI onboarding

| Work | Detail |
| :--- | :--- |
| Add remaining viable HTML templates | corporate-modern, boutique-minimal, sunrise-bold, emerald-ledger |
| Remove or quarantine | `bank-cheque.html` (wrong product domain) |
| Authoring guide | §9 of this doc as `docs/RECEIPTS_TEMPLATE_AUTHORING.md` (optional split) |
| Import script | `scripts/receipt-template-validate.ts` — checks required Mustache keys |

**Acceptance:** Validate script passes on all registered templates; Claude-delivered template passes validate on first try.

---

### Phase F — Tests, docs, hardening

| Work | Detail |
| :--- | :--- |
| Integration test | Issue receipt with HTML template in test env (mock Chromium or snapshot HTML) |
| i18n test | Extend `tests/receipt-pdf-i18n.test.ts` for context `t.*` in FR/AR |
| Void watermark | Template + PDFKit both show VOIDED |
| Docs | Update `RECEIPTS_PLATFORM_PLAN.md` changelog; `IMPLEMENTATION_STATUS.md` gap → partial/done |
| Entitlements | Optional: gate premium templates by plan feature key `receipt_templates_premium` |

**Acceptance:** `npm run test` receipt tests green; manual verify checklist below complete.

---

## 9. External AI prompt package (copy-paste)

Include when asking Claude/other AI for new templates:

1. This plan §3 (data contract) + §5 (authoring rules)
2. Sample JSON fixture from `receiptContext.sampleFixture()` (to be implemented Phase A)
3. One **golden reference** remediated template (`classic-ledger.html` post-Phase A)
4. `receiptChrome.ts` English label list (for `t.*` keys)
5. Explicit output: `{ID, slug, name, description, accent, html}`

**Do not include:** internal verify HMAC secrets, production URLs, or student PII.

---

## 10. Verification checklist (manual)

- [ ] Settings → Appearance → Receipt template visible; saves and survives refresh
- [ ] Preview shows A4 layout with school logo + brand accent
- [ ] Fee partial payment receipt: 4 line items render correctly
- [ ] Payslip: negative deductions display correctly
- [ ] Expense receipt: payer/payee orientation correct (school pays vendor)
- [ ] VOIDED receipt: watermark visible in HTML template PDF
- [ ] QR scans to `/verify/receipt/:code` → Valid
- [ ] French school default → labels in French; payer names unchanged
- [ ] Missing logo → monogram or empty box gracefully
- [ ] Missing signature → blank line + signer title
- [ ] `PDFKIT_DEFAULT` still works when Chromium disabled
- [ ] refreshPdf after logo upload updates header without changing receipt number

---

## 11. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Chromium in Docker increases image size + RAM | Slim bookworm + shared browser; PDFKit fallback; env kill switch |
| Template breaks on long school names / many line items | CSS `word-break`; test fixtures with long strings; min-height footer |
| External fonts fail offline | Embed critical fonts as base64 optional phase; fallback system fonts |
| Registry drift SPA vs Finance | Single TS source imported by both, or codegen script in CI |
| AI templates use wrong fields | `receipt-template-validate.ts` required-token check in CI |
| HTML injection via payer names | Mustache HTML-escape by default; never `{!! !!}` unescaped |

---

## 12. Out of scope (this plan)

- New receipt types (refunds, donations, multi-currency conversion)
- Parent portal receipt listing (download stays on fee/payroll/expense surfaces)
- Email receipt attachments (Comms integration)
- White-label custom CSS upload per school
- Browser-only print without server PDF
- Amount-in-words generation

---

## 13. Change log

### 2026-08-07 — Plan authored

- **Change:** Document HTML template integration path from mockups → Mustache → Chromium PDF → Settings picker; phased A–F; data contract; registry reconciliation; AI authoring rules
- **Services:** finance (primary), identity, frontend-spa
- **Status:** plan only
- **Verify:** N/A until Phase A
